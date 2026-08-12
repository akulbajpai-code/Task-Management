import { documentMimeType, extractDocumentText, safeFilename, validateDocument } from './lib/documentText.js';
import { requireSupabase, isHostedGuidedAIEnabled, isSupabaseConfigured } from './lib/supabase.js';

function throwIfError(error) {
  if (error) throw new Error(error.message || 'Something went wrong.');
}

async function currentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  throwIfError(error);
  if (!data.user) throw new Error('Please log in to continue.');
  return data.user;
}

function guideToLegacyText(guide) {
  if (!guide?.guided_steps?.length) return null;
  const steps = [...guide.guided_steps]
    .sort((a, b) => a.step_number - b.step_number)
    .map((step) => `${step.step_number}. ${step.title}${step.goal ? ` — ${step.goal}` : ''}`);
  const first = guide.guided_steps.find((step) => step.step_number === 1);
  return [...steps, '', `First action (do this now): ${first?.instructions?.[0] || first?.goal || 'Open Guided Mode and begin Step 1.'}`].join('\n');
}

function normalizeGuide(rawGuide) {
  if (!rawGuide) return null;
  // PostgREST returns a one-to-one embedded guided_plan as an object, while
  // other embedded relationships arrive as arrays. Support both shapes.
  const rawSteps = Array.isArray(rawGuide.guided_steps)
    ? rawGuide.guided_steps
    : (rawGuide.guided_steps ? [rawGuide.guided_steps] : []);
  const steps = [...rawSteps]
    .sort((a, b) => a.step_number - b.step_number)
    .map((step) => {
      const rawCheckpoints = Array.isArray(step.step_checkpoints)
        ? step.step_checkpoints
        : (step.step_checkpoints ? [step.step_checkpoints] : []);
      const rawMessages = Array.isArray(step.step_messages)
        ? step.step_messages
        : (step.step_messages ? [step.step_messages] : []);
      return {
        ...step,
        checkpoints: [...rawCheckpoints].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
        messages: [...rawMessages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      };
    });
  return { ...rawGuide, guided_steps: steps };
}

function normalizeTask(rawTask) {
  const rawGuide = Array.isArray(rawTask.guided_plans)
    ? rawTask.guided_plans[0]
    : rawTask.guided_plans;
  const rawDocuments = Array.isArray(rawTask.task_documents)
    ? rawTask.task_documents
    : (rawTask.task_documents ? [rawTask.task_documents] : []);
  const guide = normalizeGuide(rawGuide);
  return {
    ...rawTask,
    totalMinutes: rawTask.total_minutes || 0,
    total_minutes: rawTask.total_minutes || 0,
    documents: rawDocuments,
    guide,
    plan: guideToLegacyText(guide),
  };
}

function starterGuideFor(task) {
  const hasDocuments = task.documents?.length > 0;
  const context = task.description ? `Use this context: ${task.description}` : 'Read the task title and define what a successful outcome looks like.';
  return [
    {
      step_number: 1,
      title: `Clarify the finish line for “${task.title}”`,
      goal: 'Turn the task into one specific, realistic outcome before starting the work.',
      instructions: [
        context,
        'Write one sentence describing what “done” looks like for this task.',
        'Choose the smallest action you can complete in the next 15 minutes.',
      ],
      success_criteria: ['You can describe the finished outcome in one sentence.', 'You have chosen one small action to start now.'],
      estimated_minutes: 15,
    },
    {
      step_number: 2,
      title: hasDocuments ? 'Pull out the useful context' : 'Gather the materials you need',
      goal: 'Put the information, tools, and requirements for this task in one place.',
      instructions: hasDocuments
        ? ['Open the attached document or documents.', 'Highlight the requirements, facts, examples, or directions you will need.', 'Write down the three most useful pieces of context.']
        : ['List the materials, links, or tools you need.', 'Open only the resources relevant to this task.', 'Remove distractions before beginning the work block.'],
      success_criteria: ['Your materials are ready in one place.', 'You know what information you will use next.'],
      estimated_minutes: 20,
    },
    {
      step_number: 3,
      title: 'Complete the first focused work block',
      goal: 'Create visible progress instead of trying to finish everything at once.',
      instructions: ['Set a 25-minute focus block.', 'Work only on the smallest meaningful piece of the task.', 'Save a checkpoint describing what you completed and what remains.'],
      success_criteria: ['You completed one concrete piece of work.', 'You saved a note that makes the next session easy to start.'],
      estimated_minutes: 25,
    },
    {
      step_number: 4,
      title: 'Review, improve, and decide the next move',
      goal: 'Check your work against the finish line and identify what still matters.',
      instructions: ['Compare your progress with the outcome you wrote in Step 1.', 'Fix the most important gap or mistake first.', 'Either mark the task complete or schedule one more focused block.'],
      success_criteria: ['You know whether the task is complete.', 'You have a clear next move if more work remains.'],
      estimated_minutes: 20,
    },
  ];
}

const TASK_SELECT = `
  *,
  task_documents (*),
  guided_plans (
    *,
    guided_steps (
      *,
      step_checkpoints (*),
      step_messages (*)
    )
  )
`;

async function fetchTask(id) {
  const client = requireSupabase();
  const { data, error } = await client.from('tasks').select(TASK_SELECT).eq('id', id).single();
  throwIfError(error);
  return normalizeTask(data);
}

async function uploadDocument(task, file) {
  const client = requireSupabase();
  const user = await currentUser();
  validateDocument(file);
  const extractedText = await extractDocumentText(file);
  const mimeType = documentMimeType(file);
  const path = `${user.id}/${task.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;

  const { error: storageError } = await client.storage
    .from('task-documents')
    .upload(path, file, { contentType: mimeType, upsert: false });
  throwIfError(storageError);

  const { data, error } = await client
    .from('task_documents')
    .insert({
      task_id: task.id,
      user_id: user.id,
      file_name: file.name,
      storage_path: path,
      mime_type: mimeType,
      size_bytes: file.size,
      extracted_text: extractedText,
    })
    .select()
    .single();

  if (error) {
    await client.storage.from('task-documents').remove([path]);
    throwIfError(error);
  }
  return data;
}

async function invokeGuidedAI(body) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('guided-ai', { body });
  if (error) {
    const message = error.context?.error || error.message || 'Could not reach the guided AI service.';
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const api = {
  isConfigured: isSupabaseConfigured,
  guidedAIEnabled: isHostedGuidedAIEnabled,

  async health() {
    return { ok: true, ollama: { ok: isHostedGuidedAIEnabled } };
  },

  async signup({ name, email, password }) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    throwIfError(error);
    return { user: data.user, needsEmailConfirmation: !data.session };
  },

  async login({ email, password }) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    throwIfError(error);
    return { user: data.user };
  },

  async logout() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    throwIfError(error);
  },

  async profile(authUser) {
    const client = requireSupabase();
    let { data, error } = await client.from('profiles').select('*').eq('id', authUser.id).single();
    // The auth trigger may take a moment to insert a brand-new profile.
    if (error?.code === 'PGRST116') {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      ({ data, error } = await client.from('profiles').select('*').eq('id', authUser.id).single());
    }
    if (error && error.code !== 'PGRST116') throwIfError(error);
    return {
      id: authUser.id,
      email: authUser.email,
      name: data?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'TaskFlow user',
      isOwner: Boolean(data?.is_owner),
    };
  },

  async updateProfile({ name }) {
    const client = requireSupabase();
    const user = await currentUser();
    const { data, error } = await client
      .from('profiles')
      .update({ name: String(name || '').trim() })
      .eq('id', user.id)
      .select()
      .single();
    throwIfError(error);
    return { id: user.id, email: user.email, name: data.name, isOwner: Boolean(data.is_owner) };
  },

  async listTasks() {
    const client = requireSupabase();
    const { data, error } = await client
      .from('tasks')
      .select(TASK_SELECT)
      .order('created_at', { ascending: false });
    throwIfError(error);
    return (data || []).map(normalizeTask);
  },

  async getTask(id) {
    return fetchTask(id);
  },

  async createTask({ title, description = '', category = 'General', dueDate = null }, files = []) {
    const client = requireSupabase();
    const user = await currentUser();
    const { data, error } = await client
      .from('tasks')
      .insert({
        user_id: user.id,
        title: String(title || '').trim(),
        description: String(description || '').trim(),
        category: String(category || 'General').trim(),
        due_date: dueDate || null,
      })
      .select()
      .single();
    throwIfError(error);

    const task = normalizeTask({ ...data, task_documents: [], guided_plans: [] });
    for (const file of files) await uploadDocument(task, file);
    return fetchTask(task.id);
  },

  async updateTask(id, patch) {
    const client = requireSupabase();
    const updates = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.category !== undefined) updates.category = patch.category;
    if (patch.dueDate !== undefined) updates.due_date = patch.dueDate;
    const { error } = await client.from('tasks').update(updates).eq('id', id);
    throwIfError(error);
    return fetchTask(id);
  },

  async deleteTask(id) {
    const client = requireSupabase();
    const task = await fetchTask(id);
    const paths = task.documents.map((document) => document.storage_path).filter(Boolean);
    if (paths.length) await client.storage.from('task-documents').remove(paths);
    const { error } = await client.from('tasks').delete().eq('id', id);
    throwIfError(error);
    return { ok: true };
  },

  async addSession(id, { minutes, note = '' }) {
    const client = requireSupabase();
    const task = await fetchTask(id);
    const user = await currentUser();
    const mins = Number(minutes);
    if (!Number.isFinite(mins) || mins <= 0) throw new Error('Enter a valid number of minutes.');

    const { error: sessionError } = await client.from('focus_sessions').insert({
      task_id: id,
      user_id: user.id,
      minutes: mins,
      note: String(note || '').trim(),
    });
    throwIfError(sessionError);
    // A database trigger also maintains this value. This update keeps the UI
    // responsive for the local MVP and is safe because RLS scopes it to owner.
    const { error: taskError } = await client.from('tasks').update({ total_minutes: (task.totalMinutes || 0) + mins }).eq('id', id);
    throwIfError(taskError);
    return fetchTask(id);
  },

  async uploadDocuments(task, files) {
    for (const file of files) await uploadDocument(task, file);
    return fetchTask(task.id);
  },

  async createStarterGuide(task) {
    const client = requireSupabase();
    const user = await currentUser();
    const steps = starterGuideFor(task);
    const { error: deleteError } = await client.from('guided_plans').delete().eq('task_id', task.id);
    throwIfError(deleteError);
    const { data: guide, error: guideError } = await client
      .from('guided_plans')
      .insert({
        task_id: task.id,
        user_id: user.id,
        source_summary: task.documents?.length ? 'A private starter guide built around the task and its attached context.' : 'A private starter guide built around the task details.',
        current_step_number: 1,
        status: 'in_progress',
      })
      .select()
      .single();
    throwIfError(guideError);
    const { error: stepsError } = await client
      .from('guided_steps')
      .insert(steps.map((step) => ({ ...step, plan_id: guide.id, user_id: user.id })));
    throwIfError(stepsError);
    return fetchTask(task.id);
  },

  async generateGuide(task) {
    if (isHostedGuidedAIEnabled) return this.generateHostedGuide(task);
    // The private starter-guide beta does not send documents to an external provider.
    return this.createStarterGuide(task);
  },

  async generateHostedGuide(task) {
    await invokeGuidedAI({ action: 'generate_plan', taskId: task.id });
    return fetchTask(task.id);
  },

  async saveCheckpoint(stepId, note) {
    const text = String(note || '').trim();
    if (!text) throw new Error('Write a short note before saving progress.');
    const client = requireSupabase();
    const user = await currentUser();
    const { error: checkpointError } = await client.from('step_checkpoints').insert({ step_id: stepId, user_id: user.id, note: text });
    throwIfError(checkpointError);
    const { error: statusError } = await client.from('guided_steps').update({ status: 'in_progress' }).eq('id', stepId).eq('status', 'not_started');
    // Updating a step that is already in progress is fine; ignore that no rows changed.
    if (statusError) throwIfError(statusError);
  },

  async completeStep(step, guide) {
    const client = requireSupabase();
    const { error } = await client
      .from('guided_steps')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', step.id);
    throwIfError(error);

    const ordered = [...(guide.guided_steps || [])].sort((a, b) => a.step_number - b.step_number);
    const next = ordered.find((candidate) => candidate.step_number > step.step_number && candidate.status !== 'completed');
    const updates = next
      ? { current_step_number: next.step_number, status: 'in_progress' }
      : { current_step_number: step.step_number, status: 'completed', completed_at: new Date().toISOString() };
    const { error: guideError } = await client.from('guided_plans').update(updates).eq('id', guide.id);
    throwIfError(guideError);
  },

  async sendStepMessage({ taskId, step, message }) {
    const text = String(message || '').trim();
    if (!text) throw new Error('Write a message before sending it.');
    const client = requireSupabase();
    const user = await currentUser();
    const { data: userMessage, error: userError } = await client
      .from('step_messages')
      .insert({ step_id: step.id, user_id: user.id, role: 'user', content: text })
      .select()
      .single();
    throwIfError(userError);

    try {
      const history = [...(step.messages || []), userMessage]
        .slice(-10)
        .map((item) => ({ role: item.role, content: item.content }));
      const data = await invokeGuidedAI({ action: 'clarify_step', taskId, stepId: step.id, question: text, history });
      const { error: assistantError } = await client
        .from('step_messages')
        .insert({ step_id: step.id, user_id: user.id, role: 'assistant', content: data.answer })
        .select()
        .single();
      throwIfError(assistantError);
      return data.answer;
    } catch (error) {
      // Keep the user's message so their question is not lost if the provider
      // is temporarily unavailable.
      throw error;
    }
  },

  async clarifyStep({ taskId, stepId, question }) {
    const data = await invokeGuidedAI({ action: 'clarify_step', taskId, stepId, question });
    return data.answer;
  },

  async dashboard() {
    const tasks = await this.listTasks();
    const totalMinutes = tasks.reduce((sum, task) => sum + (task.totalMinutes || 0), 0);
    const byCategory = {};
    const byTask = [];
    tasks.forEach((task) => {
      const minutes = task.totalMinutes || 0;
      byCategory[task.category] = (byCategory[task.category] || 0) + minutes;
      if (minutes > 0) byTask.push({ name: task.title, minutes, category: task.category });
    });
    byTask.sort((a, b) => b.minutes - a.minutes);
    return {
      totalMinutes,
      taskCount: tasks.length,
      byCategory: Object.entries(byCategory).map(([name, minutes]) => ({ name, minutes })),
      byTask,
    };
  },

  async trackVisit(visitorId) {
    const client = requireSupabase();
    const { error } = await client.from('analytics_events').insert({ event_type: 'visit', visitor_id: visitorId });
    // Analytics is optional and must never block a visit if a privacy policy or
    // RLS setting has not been deployed yet.
    if (error) return null;
    return true;
  },

  async siteAnalytics() {
    const client = requireSupabase();
    const { data, error } = await client.rpc('creator_metrics');
    throwIfError(error);
    const metrics = Array.isArray(data) ? data[0] : data;
    return {
      totalVisits: Number(metrics?.total_visits || 0),
      uniqueVisitors: Number(metrics?.unique_visitors || 0),
      totalUsers: Number(metrics?.total_users || 0),
      totalTasks: Number(metrics?.total_tasks || 0),
      totalSessions: Number(metrics?.total_sessions || 0),
      totalFocusMinutes: Number(metrics?.total_focus_minutes || 0),
    };
  },
};

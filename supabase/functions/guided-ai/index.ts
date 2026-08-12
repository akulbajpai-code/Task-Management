import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GUIDE_LIMIT_PER_DAY = 3;
const HELP_LIMIT_PER_DAY = 20;

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanArray(value: unknown, max = 8) {
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max);
}

function stripCodeFence(value: string) {
  return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

async function callHostedAI(system: string, prompt: string) {
  const apiKey = Deno.env.get('AI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('Guided AI is not configured yet. Add AI_API_KEY to Supabase Edge Function secrets.');

  const baseUrl = (Deno.env.get('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = Deno.env.get('AI_MODEL') || 'gpt-4o-mini';
  const result = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      // The prompt enforces JSON. Avoid provider-specific JSON-mode fields so
      // the function works with OpenAI-compatible hosted models, including Gemini.
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!result.ok) {
    const detail = await result.text();
    throw new Error(`AI provider error (${result.status}): ${detail.slice(0, 180)}`);
  }
  const data = await result.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('The AI provider returned an empty response.');
  return String(content);
}

function normalizedGuide(raw: Record<string, unknown>) {
  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .slice(0, 8)
    .map((step: Record<string, unknown>, index: number) => ({
      step_number: index + 1,
      title: String(step.title || `Step ${index + 1}`).trim().slice(0, 140),
      goal: String(step.goal || '').trim().slice(0, 600),
      instructions: cleanArray(step.instructions, 8),
      success_criteria: cleanArray(step.success_criteria, 5),
      estimated_minutes: Math.max(5, Math.min(180, Number(step.estimated_minutes) || 25)),
    }))
    .filter((step) => step.title && step.instructions.length);

  if (!steps.length) throw new Error('The AI did not return usable guided steps. Please try again.');
  return {
    source_summary: String(raw.source_summary || '').trim().slice(0, 1200),
    steps,
  };
}

async function consumeUsage(admin: ReturnType<typeof createClient>, userId: string, field: 'guide_generations' | 'help_requests', limit: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error } = await admin
    .from('ai_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();
  if (error) throw error;

  const current = Number(existing?.[field] || 0);
  if (current >= limit) throw new Error(`You have reached today’s guided AI limit (${limit}). Try again tomorrow.`);

  if (existing) {
    const { error: updateError } = await admin
      .from('ai_usage')
      .update({ [field]: current + 1 })
      .eq('user_id', userId)
      .eq('usage_date', today);
    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await admin
      .from('ai_usage')
      .insert({ user_id: userId, usage_date: today, [field]: 1 });
    if (insertError) throw insertError;
  }
}

async function documentContext(admin: ReturnType<typeof createClient>, taskId: string) {
  const { data, error } = await admin
    .from('task_documents')
    .select('file_name, extracted_text')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const chunks = (data || []).map((document) => `DOCUMENT: ${document.file_name}\n${String(document.extracted_text || '').slice(0, 6500)}`);
  return chunks.join('\n\n').slice(0, 18000) || 'No document was attached.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, serviceRoleKey);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return response({ error: 'Please sign in to use Guided AI.' }, 401);

    const user = authData.user;
    const body = await req.json();
    const action = body.action;
    const taskId = String(body.taskId || '');
    if (!taskId) return response({ error: 'Task ID is required.' }, 400);

    const { data: task, error: taskError } = await admin
      .from('tasks')
      .select('id, title, description, category, user_id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();
    if (taskError || !task) return response({ error: 'Task not found.' }, 404);

    if (action === 'generate_plan') {
      await consumeUsage(admin, user.id, 'guide_generations', GUIDE_LIMIT_PER_DAY);
      const docs = await documentContext(admin, task.id);
      const system = `You are TaskFlow Guided AI. Turn a user's task into a practical, supportive sequence they can complete one step at a time. Return ONLY valid JSON with this exact shape: {"source_summary":"string","steps":[{"title":"string","goal":"string","instructions":["string"],"success_criteria":["string"],"estimated_minutes":25}]}. Use 3 to 8 steps. The first step must be doable in 15 minutes or less. Give detailed, concrete instructions, never vague advice. Do not claim to have read a document beyond the text provided.`;
      const prompt = `TASK: ${task.title}\nCATEGORY: ${task.category}\nUSER CONTEXT: ${task.description || 'None'}\n\nOPTIONAL ATTACHED DOCUMENT EXCERPTS:\n${docs}\n\nCreate a guided plan now.`;
      const raw = await callHostedAI(system, prompt);
      const guide = normalizedGuide(JSON.parse(stripCodeFence(raw)));

      const { error: deleteError } = await admin.from('guided_plans').delete().eq('task_id', task.id);
      if (deleteError) throw deleteError;
      const { data: plan, error: planError } = await admin
        .from('guided_plans')
        .insert({ task_id: task.id, user_id: user.id, source_summary: guide.source_summary, current_step_number: 1, status: 'in_progress' })
        .select()
        .single();
      if (planError) throw planError;
      const { error: stepsError } = await admin.from('guided_steps').insert(
        guide.steps.map((step) => ({ ...step, plan_id: plan.id, user_id: user.id })),
      );
      if (stepsError) throw stepsError;
      return response({ ok: true, planId: plan.id, stepCount: guide.steps.length });
    }

    if (action === 'clarify_step') {
      const stepId = String(body.stepId || '');
      const question = String(body.question || '').trim().slice(0, 1200);
      if (!stepId || !question) return response({ error: 'A step and question are required.' }, 400);
      await consumeUsage(admin, user.id, 'help_requests', HELP_LIMIT_PER_DAY);
      const { data: step, error: stepError } = await admin
        .from('guided_steps')
        .select('*')
        .eq('id', stepId)
        .eq('user_id', user.id)
        .single();
      if (stepError || !step) return response({ error: 'Guided step not found.' }, 404);
      const docs = await documentContext(admin, task.id);
      const history = Array.isArray(body.history)
        ? body.history
          .slice(-10)
          .map((message: { role?: unknown; content?: unknown }) => `${message.role === 'assistant' ? 'TASKFLOW AI' : 'USER'}: ${String(message.content || '').slice(0, 1800)}`)
          .join('\n')
        : '';
      const system = 'You are TaskFlow Guided AI in a direct-message conversation. Help the user complete only the current step. Be encouraging, specific, and concise. Use the task and attached document excerpts when relevant. Give a concrete next action, not a replacement full plan. Never pretend you completed work for the user.';
      const prompt = `TASK: ${task.title}\nCURRENT STEP: ${step.title}\nGOAL: ${step.goal}\nINSTRUCTIONS: ${JSON.stringify(step.instructions)}\n\nRECENT CONVERSATION:\n${history || 'No previous messages.'}\n\nLATEST USER MESSAGE: ${question}\n\nDOCUMENT EXCERPTS:\n${docs}`;
      const answer = await callHostedAI(system, prompt);
      return response({ ok: true, answer: answer.slice(0, 4000) });
    }

    return response({ error: 'Unknown Guided AI action.' }, 400);
  } catch (error) {
    console.error(error);
    return response({ error: error instanceof Error ? error.message : 'Guided AI failed unexpectedly.' }, 500);
  }
});

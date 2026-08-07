const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

/**
 * Check whether an Ollama server is reachable and has the model.
 * Returns { ok, model, error }.
 */
export async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return { ok: false, error: `Ollama responded with status ${res.status}` };
    const data = await res.json();
    const hasModel = (data.models || []).some((m) => m.name.startsWith(MODEL));
    if (!hasModel) {
      return { ok: false, error: `Model "${MODEL}" not found. Run: ollama pull ${MODEL}` };
    }
    return { ok: true, model: MODEL };
  } catch (err) {
    return { ok: false, error: `Cannot reach Ollama at ${OLLAMA_URL}. Is it running?` };
  }
}

/**
 * Ask the local LLM to break a task down into a clear action plan.
 * Returns the raw text reply.
 */
export async function planTask({ title, description, category }) {
  const systemPrompt = [
    'You are a meticulous productivity coach. Your ONLY job is to break the user\'s task down into a clear, numbered, actionable step-by-step plan.',
    'Rules:',
    '1. Always output a numbered list of concrete actions.',
    '2. The FIRST step must be the single most important starting action (the absolute "where do I begin" step), kept small and doable in under ~15 minutes.',
    '3. Order steps logically and keep each step specific and measurable, not vague.',
    '4. At the end, include a one-line "Time estimate" and a one-line "First action (do this now)".',
    '5. Use plain text. No markdown headers, no code fences, no bullet glyphs other than "1.", "2.", etc.',
  ].join('\n');

  const userPrompt = [
    `Task: "${title}"`,
    category ? `Category: ${category}` : '',
    description ? `Details: ${description}` : '',
    '\nBreak this down into a step-by-step plan.',
  ]
    .filter(Boolean)
    .join('\n');

  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: { temperature: 0.4 },
      }),
    });
  } catch {
    throw new Error(
      `Cannot reach Ollama at ${OLLAMA_URL}. Start it with: ollama serve`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = (data.response || '').trim();
  if (!text) throw new Error('Ollama returned an empty response.');
  return text;
}

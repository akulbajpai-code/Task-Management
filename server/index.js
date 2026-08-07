import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  addSession,
  deleteTask,
} from './store.js';
import { checkOllama, planTask } from './ollama.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// Health + Ollama status -------------------------------------------------
app.get('/api/health', async (_req, res) => {
  const ollama = await checkOllama();
  res.json({ ok: true, ollama });
});

// Tasks ------------------------------------------------------------------
app.get('/api/tasks', (_req, res) => {
  res.json(listTasks());
});

app.get('/api/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, category, dueDate } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const task = createTask({ title, description, category, dueDate });
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = updateTask(req.params.id, req.body || {});
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const ok = deleteTask(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Task not found' });
  res.json({ ok: true });
});

// Time sessions ----------------------------------------------------------
app.post('/api/tasks/:id/sessions', (req, res) => {
  const { minutes, note } = req.body || {};
  const result = addSession(req.params.id, { minutes, note });
  if (!result) return res.status(400).json({ error: 'Invalid session' });
  res.status(201).json(result);
});

// AI breakdown -----------------------------------------------------------
app.post('/api/plan', async (req, res) => {
  const { title, description, category } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const plan = await planTask({ title, description, category });
    res.json({ plan });
  } catch (err) {
    res.status(502).json({
      error: err.message,
      hint: 'Check that Ollama is running (ollama serve) and the model is pulled (ollama pull llama3.2).',
    });
  }
});

// Dashboard aggregates ---------------------------------------------------
app.get('/api/dashboard', (_req, res) => {
  const tasks = listTasks();
  const totalMinutes = tasks.reduce((sum, t) => sum + (t.totalMinutes || 0), 0);

  const byCategory = {};
  const byTask = [];
  for (const t of tasks) {
    const mins = t.totalMinutes || 0;
    byCategory[t.category] = (byCategory[t.category] || 0) + mins;
    if (mins > 0) byTask.push({ name: t.title, minutes: mins, category: t.category });
  }
  byTask.sort((a, b) => b.minutes - a.minutes);

  res.json({
    totalMinutes,
    taskCount: tasks.length,
    byCategory: Object.entries(byCategory).map(([name, minutes]) => ({ name, minutes })),
    byTask,
  });
});

// Serve built client (production) ----------------------------------------
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

app.listen(PORT, () => {
  console.log(`✅ TaskFlow API running on http://localhost:${PORT}`);
});

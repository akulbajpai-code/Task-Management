import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addSession,
  createTask,
  createUser,
  deleteTask,
  findUserByEmail,
  getTask,
  getUserById,
  listTasks,
  publicUser,
  updateTask,
  updateUser,
} from './store.js';
import { checkOllama, planTask } from './ollama.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
// Set JWT_SECRET in production. This development fallback makes the local MVP
// easy to run while keeping sessions signed.
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-local-development-secret-change-me';
const TOKEN_TTL = '7d';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function tokenFor(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function validEmail(email) {
  return /^\S+@\S+\.\S+$/.test(String(email || '').trim());
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Your session is no longer valid. Please log in again.' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session expired. Please log in again.' });
  }
}

// Health + Ollama status -------------------------------------------------
app.get('/api/health', async (_req, res) => {
  const ollama = await checkOllama();
  res.json({ ok: true, ollama });
});

// Authentication ---------------------------------------------------------
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }
  if (!validEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (String(password || '').length < 6) {
    return res.status(400).json({ error: 'Use a password with at least 6 characters.' });
  }
  if (findUserByEmail(cleanEmail)) {
    return res.status(409).json({ error: 'An account with that email already exists. Try logging in.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = createUser({ name: cleanName, email: cleanEmail, passwordHash });
  if (!user) return res.status(409).json({ error: 'An account with that email already exists.' });

  return res.status(201).json({ user, token: tokenFor(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = findUserByEmail(email);
  const isMatch = user && await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  return res.json({ user: publicUser(user), token: tokenFor(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.patch('/api/auth/me', requireAuth, (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Please enter a name with at least 2 characters.' });
  const user = updateUser(req.user.id, { name });
  if (!user) return res.status(400).json({ error: 'Could not update your profile.' });
  return res.json({ user });
});

// Tasks ------------------------------------------------------------------
app.get('/api/tasks', requireAuth, (req, res) => {
  res.json(listTasks(req.user.id));
});

app.get('/api/tasks/:id', requireAuth, (req, res) => {
  const task = getTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  return res.json(task);
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, category, dueDate } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const task = createTask(req.user.id, { title, description, category, dueDate });
  return res.status(201).json(task);
});

app.patch('/api/tasks/:id', requireAuth, (req, res) => {
  const task = updateTask(req.params.id, req.user.id, req.body || {});
  if (!task) return res.status(404).json({ error: 'Task not found' });
  return res.json(task);
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const ok = deleteTask(req.params.id, req.user.id);
  if (!ok) return res.status(404).json({ error: 'Task not found' });
  return res.json({ ok: true });
});

// Time sessions ----------------------------------------------------------
app.post('/api/tasks/:id/sessions', requireAuth, (req, res) => {
  const { minutes, note } = req.body || {};
  const result = addSession(req.params.id, req.user.id, { minutes, note });
  if (!result) return res.status(400).json({ error: 'Enter a valid number of minutes.' });
  return res.status(201).json(result);
});

// AI breakdown -----------------------------------------------------------
app.post('/api/plan', requireAuth, async (req, res) => {
  const { title, description, category } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const plan = await planTask({ title, description, category });
    return res.json({ plan });
  } catch (err) {
    return res.status(502).json({
      error: err.message,
      hint: 'Check that Ollama is running (ollama serve) and the model is pulled (ollama pull llama3.2).',
    });
  }
});

// Dashboard aggregates ---------------------------------------------------
app.get('/api/dashboard', requireAuth, (req, res) => {
  const tasks = listTasks(req.user.id);
  const totalMinutes = tasks.reduce((sum, task) => sum + (task.totalMinutes || 0), 0);
  const byCategory = {};
  const byTask = [];

  for (const task of tasks) {
    const minutes = task.totalMinutes || 0;
    byCategory[task.category] = (byCategory[task.category] || 0) + minutes;
    if (minutes > 0) byTask.push({ name: task.title, minutes, category: task.category });
  }
  byTask.sort((a, b) => b.minutes - a.minutes);

  return res.json({
    totalMinutes,
    taskCount: tasks.length,
    byCategory: Object.entries(byCategory).map(([name, minutes]) => ({ name, minutes })),
    byTask,
  });
});

// Serve built client (production) ----------------------------------------
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  // BrowserRouter routes such as /login and /tasks should load the React app
  // directly when TaskFlow is deployed behind Express.
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅ TaskFlow API running on http://localhost:${PORT}`);
});

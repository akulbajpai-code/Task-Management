import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = { tasks: [], nextId: 1 };

/** Load the JSON database (creating it if missing). */
export function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) return structuredClone(EMPTY);
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.tasks || !Array.isArray(data.tasks)) return structuredClone(EMPTY);
    return data;
  } catch (err) {
    console.error('Could not read DB, starting fresh:', err.message);
    return structuredClone(EMPTY);
  }
}

/** Persist the JSON database. */
export function saveDB(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

/** Create a new task. */
export function createTask({ title, description = '', category = 'General', dueDate = null }) {
  const db = loadDB();
  const task = {
    id: db.nextId,
    title: (title || '').trim(),
    description: (description || '').trim(),
    category: (category || 'General').trim(),
    dueDate: dueDate || null,
    plan: null, // AI-generated breakdown
    sessions: [], // logged time sessions
    totalMinutes: 0,
    createdAt: new Date().toISOString(),
  };
  db.nextId += 1;
  db.tasks.push(task);
  saveDB(db);
  return task;
}

/** Get all tasks. */
export function listTasks() {
  return loadDB().tasks;
}

/** Get a single task by id. */
export function getTask(id) {
  const db = loadDB();
  return db.tasks.find((t) => t.id === Number(id)) || null;
}

/** Update editable fields of a task. */
export function updateTask(id, patch) {
  const db = loadDB();
  const task = db.tasks.find((t) => t.id === Number(id));
  if (!task) return null;
  const allowed = ['title', 'description', 'category', 'dueDate', 'plan'];
  for (const key of allowed) {
    if (patch[key] !== undefined) task[key] = patch[key];
  }
  saveDB(db);
  return task;
}

/** Log a time session against a task (minutes). */
export function addSession(id, { minutes, note = '' }) {
  const db = loadDB();
  const task = db.tasks.find((t) => t.id === Number(id));
  if (!task) return null;
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  const session = {
    id: Date.now() + Math.random(),
    minutes: mins,
    note: note || '',
    createdAt: new Date().toISOString(),
  };
  task.sessions.push(session);
  task.totalMinutes += mins;
  saveDB(db);
  return { task, session };
}

/** Delete a task. */
export function deleteTask(id) {
  const db = loadDB();
  const idx = db.tasks.findIndex((t) => t.id === Number(id));
  if (idx === -1) return false;
  db.tasks.splice(idx, 1);
  saveDB(db);
  return true;
}

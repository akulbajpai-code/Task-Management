import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = {
  users: [],
  tasks: [],
  nextId: 1,
  nextUserId: 1,
  analytics: { totalVisits: 0, visitorIds: {}, ownerUserId: null },
};

function asPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function asNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizeAnalytics(rawAnalytics, users) {
  const rawVisitors = rawAnalytics?.visitorIds;
  const visitorIds = rawVisitors && typeof rawVisitors === 'object' && !Array.isArray(rawVisitors)
    ? rawVisitors
    : {};
  const requestedOwnerId = Number(rawAnalytics?.ownerUserId);
  const ownerExists = users.some((user) => user.id === requestedOwnerId);

  return {
    totalVisits: asNonNegativeInteger(rawAnalytics?.totalVisits),
    visitorIds,
    // Existing TaskFlow files did not have analytics. Their first existing
    // account becomes the private creator account automatically.
    ownerUserId: ownerExists ? requestedOwnerId : (users[0]?.id || null),
  };
}

function normalizeDB(data = {}) {
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const users = Array.isArray(data.users) ? data.users : [];
  const maxTaskId = tasks.reduce((max, task) => Math.max(max, Number(task.id) || 0), 0);
  const maxUserId = users.reduce((max, user) => Math.max(max, Number(user.id) || 0), 0);

  return {
    users,
    tasks,
    nextId: asPositiveInteger(data.nextId, maxTaskId + 1),
    nextUserId: asPositiveInteger(data.nextUserId, maxUserId + 1),
    analytics: normalizeAnalytics(data.analytics, users),
  };
}

/** Load the JSON database, upgrading older single-user files as needed. */
export function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) return structuredClone(EMPTY);
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return normalizeDB(JSON.parse(raw));
  } catch (err) {
    console.error('Could not read DB, starting fresh:', err.message);
    return structuredClone(EMPTY);
  }
}

/** Persist the JSON database. */
export function saveDB(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalizeDB(db), null, 2));
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function findUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;
  return loadDB().users.find((user) => user.email === normalizedEmail) || null;
}

export function getUserById(id) {
  return loadDB().users.find((item) => item.id === Number(id)) || null;
}

export function isSiteOwner(userId) {
  const db = loadDB();
  return db.analytics.ownerUserId === Number(userId);
}

/**
 * Count an anonymous browser visit. The browser ID is random and contains no
 * email, IP address, or task data. It lets the creator distinguish repeat
 * visits from new browsers in this local MVP.
 */
export function recordVisit(visitorId) {
  const id = String(visitorId || '').trim();
  const db = loadDB();
  const validId = /^[a-zA-Z0-9_-]{16,128}$/.test(id);

  if (validId) {
    db.analytics.totalVisits += 1;
    if (!db.analytics.visitorIds[id]) {
      db.analytics.visitorIds[id] = new Date().toISOString();
    }
    saveDB(db);
  }

  return {
    totalVisits: db.analytics.totalVisits,
    uniqueVisitors: Object.keys(db.analytics.visitorIds).length,
    totalUsers: db.users.length,
  };
}

/** Creator-only aggregate statistics — no other user's task details are exposed. */
export function getSiteAnalytics(userId) {
  const db = loadDB();
  if (db.analytics.ownerUserId !== Number(userId)) return null;

  const totalSessions = db.tasks.reduce((sum, task) => sum + (task.sessions?.length || 0), 0);
  const totalFocusMinutes = db.tasks.reduce((sum, task) => sum + (task.totalMinutes || 0), 0);
  return {
    totalVisits: db.analytics.totalVisits,
    uniqueVisitors: Object.keys(db.analytics.visitorIds).length,
    totalUsers: db.users.length,
    totalTasks: db.tasks.length,
    totalSessions,
    totalFocusMinutes,
  };
}

/** Create a user. Existing unowned tasks are claimed by the first account. */
export function createUser({ name, email, passwordHash }) {
  const db = loadDB();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (db.users.some((user) => user.email === normalizedEmail)) return null;

  const user = {
    id: db.nextUserId,
    name: String(name || '').trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.nextUserId += 1;

  // Smooth migration for the original single-user TaskFlow project: the first
  // account keeps any tasks that were made before accounts existed.
  if (db.users.length === 0) {
    db.tasks.forEach((task) => {
      if (!task.userId) task.userId = user.id;
    });
    db.analytics.ownerUserId = user.id;
  }

  db.users.push(user);
  saveDB(db);
  return publicUser(user);
}

export function updateUser(id, patch) {
  const db = loadDB();
  const user = db.users.find((item) => item.id === Number(id));
  if (!user) return null;

  if (patch.name !== undefined) {
    const name = String(patch.name || '').trim();
    if (!name) return null;
    user.name = name;
  }

  saveDB(db);
  return publicUser(user);
}

/** Create a task owned by a specific user. */
export function createTask(userId, { title, description = '', category = 'General', dueDate = null }) {
  const db = loadDB();
  const task = {
    id: db.nextId,
    userId: Number(userId),
    title: (title || '').trim(),
    description: (description || '').trim(),
    category: (category || 'General').trim(),
    dueDate: dueDate || null,
    plan: null,
    sessions: [],
    totalMinutes: 0,
    createdAt: new Date().toISOString(),
  };
  db.nextId += 1;
  db.tasks.push(task);
  saveDB(db);
  return task;
}

/** Get all tasks for one user. */
export function listTasks(userId) {
  return loadDB().tasks.filter((task) => task.userId === Number(userId));
}

/** Get a single task only if it belongs to the current user. */
export function getTask(id, userId) {
  const db = loadDB();
  return db.tasks.find((task) => task.id === Number(id) && task.userId === Number(userId)) || null;
}

/** Update editable fields of an owned task. */
export function updateTask(id, userId, patch) {
  const db = loadDB();
  const task = db.tasks.find((item) => item.id === Number(id) && item.userId === Number(userId));
  if (!task) return null;
  const allowed = ['title', 'description', 'category', 'dueDate', 'plan'];
  for (const key of allowed) {
    if (patch[key] !== undefined) task[key] = patch[key];
  }
  saveDB(db);
  return task;
}

/** Log a time session against an owned task. */
export function addSession(id, userId, { minutes, note = '' }) {
  const db = loadDB();
  const task = db.tasks.find((item) => item.id === Number(id) && item.userId === Number(userId));
  if (!task) return null;
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins <= 0) return null;

  const session = {
    id: Date.now() + Math.random(),
    minutes: mins,
    note: String(note || '').trim(),
    createdAt: new Date().toISOString(),
  };
  task.sessions.push(session);
  task.totalMinutes = (task.totalMinutes || 0) + mins;
  saveDB(db);
  return { task, session };
}

/** Delete a task owned by the current user. */
export function deleteTask(id, userId) {
  const db = loadDB();
  const index = db.tasks.findIndex((task) => task.id === Number(id) && task.userId === Number(userId));
  if (index === -1) return false;
  db.tasks.splice(index, 1);
  saveDB(db);
  return true;
}

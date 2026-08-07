async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  health: () => request('/health'),
  listTasks: () => request('/tasks'),
  createTask: (data) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) =>
    request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  addSession: (id, data) =>
    request(`/tasks/${id}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
  planTask: (data) =>
    request('/plan', { method: 'POST', body: JSON.stringify(data) }),
  dashboard: () => request('/dashboard'),
};

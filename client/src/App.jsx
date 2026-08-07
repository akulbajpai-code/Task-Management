import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import TaskForm from './components/TaskForm.jsx';
import TaskList from './components/TaskList.jsx';
import TaskDetail from './components/TaskDetail.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [ollama, setOllama] = useState(null); // { ok } | null

  const refresh = useCallback(async () => {
    const [t, d] = await Promise.all([api.listTasks(), api.dashboard()]);
    setTasks(t);
    setDashboard(d);
  }, []);

  useEffect(() => {
    refresh();
    api.health().then((h) => setOllama(h.ollama)).catch(() => setOllama({ ok: false }));
  }, [refresh]);

  const selected = tasks.find((t) => t.id === selectedId) || null;

  const createTask = async (data) => {
    await api.createTask(data);
    await refresh();
  };

  const deleteTask = async (id) => {
    await api.deleteTask(id);
    if (selectedId === id) setSelectedId(null);
    await refresh();
  };

  const planTask = async (task) => {
    const res = await api.planTask({
      title: task.title,
      category: task.category,
      description: task.description,
    });
    await api.updateTask(task.id, { plan: res.plan });
    await refresh();
  };

  const logTime = async (id, minutes, note) => {
    await api.addSession(id, { minutes, note });
    await refresh();
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="logo">⏱</div>
          <div>
            <h1>TaskFlow</h1>
            <p>Track your time · Let AI show you where to start</p>
          </div>
        </div>
        <div className="ollama-status">
          <span
            className={`dot ${ollama === null ? '' : ollama.ok ? 'on' : 'off'}`}
          />
          {ollama === null
            ? 'Checking Ollama…'
            : ollama.ok
              ? 'AI ready (local Ollama)'
              : 'Ollama not detected'}
        </div>
      </div>

      <Dashboard data={dashboard} />

      <div className="layout">
        <div>
          <TaskForm onCreate={createTask} />
          <div style={{ marginTop: 16 }}>
            <TaskList
              tasks={tasks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDelete={deleteTask}
            />
          </div>
        </div>
        <TaskDetail
          task={selected}
          onPlan={planTask}
          onLogTime={logTime}
          onDelete={deleteTask}
        />
      </div>
    </div>
  );
}

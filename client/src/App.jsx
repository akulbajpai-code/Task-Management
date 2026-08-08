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
  const [ollama, setOllama] = useState(null);

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
      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden="true">⏱</div>
          <div>
            <div className="brand-name">TaskFlow</div>
            <p>Turn big tasks into a clear next step.</p>
          </div>
        </div>
        <div className="ollama-status" title="TaskFlow uses your local Ollama model">
          <span className={`dot ${ollama === null ? '' : ollama.ok ? 'on' : 'off'}`} />
          {ollama === null
            ? 'Checking AI planner…'
            : ollama.ok
              ? 'AI planner ready'
              : 'Ollama not detected'}
        </div>
      </header>

      <Dashboard data={dashboard} />

      <main className="workspace">
        <aside className="sidebar">
          <TaskForm onCreate={createTask} />
          <TaskList
            tasks={tasks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={deleteTask}
          />
        </aside>
        <TaskDetail
          task={selected}
          onPlan={planTask}
          onLogTime={logTime}
          onDelete={deleteTask}
        />
      </main>
    </div>
  );
}

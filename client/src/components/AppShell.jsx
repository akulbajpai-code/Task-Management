import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/app', label: 'Overview', icon: 'overview', end: true },
  { to: '/tasks', label: 'Tasks', icon: 'tasks' },
  { to: '/focus', label: 'Focus', icon: 'focus' },
  { to: '/insights', label: 'Insights', icon: 'insights' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

function NavIcon({ type }) {
  if (type === 'overview') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
  if (type === 'tasks') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h11M8 12h11M8 18h11" /><path d="m4 6 .01 0M4 12l.01 0M4 18l.01 0" /></svg>;
  if (type === 'focus') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><path d="M12 8v4l2.8 1.8M9 3h6" /></svg>;
  if (type === 'insights') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V10M12 19V5M19 19v-7" /><path d="M3 19h18" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.2 2.2-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.1h-3.1v-.1A1.7 1.7 0 0 0 10.5 18.7a1.7 1.7 0 0 0-1.88.34l-.06.06-2.2-2.2.06-.06A1.7 1.7 0 0 0 6.76 15 1.7 1.7 0 0 0 5.2 14H5.1v-3.1h.1a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.2-2.2.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.1h3.1v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.2 2.2-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.1V14h-.1A1.7 1.7 0 0 0 19.4 15Z" /></svg>;
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function RightRail({ user, onLogout }) {
  return (
    <aside className="right-rail">
      <div className="rail-label">Navigate</div>
      <nav className="rail-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}
          >
            <span className="rail-icon"><NavIcon type={item.icon} /></span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="rail-bottom">
        <div className="rail-account">
          <div className="rail-avatar">{initials(user?.name)}</div>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
        <button className="rail-logout" onClick={onLogout}><span aria-hidden="true">↗</span> Log out</button>
      </div>
    </aside>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [ollama, setOllama] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setDataError('');
    try {
      const [nextTasks, nextDashboard] = await Promise.all([api.listTasks(), api.dashboard()]);
      setTasks(nextTasks);
      setDashboard(nextDashboard);
      setSelectedId((current) => nextTasks.some((task) => task.id === current) ? current : (nextTasks[0]?.id || null));
    } catch (err) {
      if (err.status === 401) {
        logout();
        return;
      }
      setDataError(err.message || 'Could not load your workspace.');
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refresh();
    api.health().then((health) => setOllama(health.ollama)).catch(() => setOllama({ ok: false }));
  }, [refresh]);

  const createTask = async (data, files = []) => {
    const task = await api.createTask(data, files);
    await refresh();
    setSelectedId(task.id);
    return task;
  };

  const deleteTask = async (id) => {
    await api.deleteTask(id);
    await refresh();
  };

  const planTask = async (task) => {
    await api.generateGuide(task);
    await refresh();
  };

  const logTime = async (id, minutes, note) => {
    await api.addSession(id, { minutes, note });
    await refresh();
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const outletContext = useMemo(() => ({
    user,
    tasks,
    dashboard,
    selectedId,
    setSelectedId,
    loading,
    dataError,
    refresh,
    createTask,
    deleteTask,
    planTask,
    logTime,
    updateProfile,
  }), [user, tasks, dashboard, selectedId, loading, dataError, refresh, updateProfile]);

  return (
    <div className="app application-shell">
      <header className="app-topbar">
        <div className="brand">
          <div className="logo" aria-hidden="true">⏱</div>
          <div>
            <div className="brand-name">TaskFlow</div>
            <p>Your personal focus workspace</p>
          </div>
        </div>
        <div className="topbar-right">
          <div className="ollama-status" title="TaskFlow keeps documents private and uses starter guides during the first public beta">
            <span className={`dot ${ollama === null ? '' : ollama.ok ? 'on' : 'off'}`} />
            {ollama === null ? 'Loading Guided Mode…' : ollama.ok ? 'Guided AI beta' : 'Guided Mode ready'}
          </div>
          <div className="header-avatar" title={user?.name}>{initials(user?.name)}</div>
        </div>
      </header>

      <div className="app-frame">
        <main className="app-content">
          {dataError ? (
            <section className="card workspace-error">
              <p className="eyebrow">Something went wrong</p>
              <h2>We could not load your workspace.</h2>
              <p>{dataError}</p>
              <button className="btn" onClick={refresh}>Try again</button>
            </section>
          ) : <Outlet context={outletContext} />}
        </main>
        <RightRail user={user} onLogout={handleLogout} />
      </div>
    </div>
  );
}

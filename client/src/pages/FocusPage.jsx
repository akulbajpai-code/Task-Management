import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import PageLoading from './PageLoading.jsx';

const DURATIONS = [15, 25, 45, 60];

function getFirstAction(plan) {
  if (!plan) return null;
  const explicit = plan.match(/^First action(?:\s*\([^)]*\))?\s*:\s*(.+)$/im);
  if (explicit) return explicit[1];
  const firstStep = plan.match(/^\s*1\s*[.)]\s*(.+)$/im);
  return firstStep ? firstStep[1] : null;
}

export default function FocusPage() {
  const { tasks, logTime, loading } = useOutletContext();
  const [taskId, setTaskId] = useState('');
  const [minutes, setMinutes] = useState(25);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId && tasks.length) setTaskId(String(tasks[0].id));
    if (taskId && !tasks.some((task) => String(task.id) === taskId)) {
      setTaskId(tasks[0] ? String(tasks[0].id) : '');
    }
  }, [taskId, tasks]);

  if (loading) return <PageLoading label="Loading your focus space…" />;

  if (!tasks.length) {
    return (
      <div className="page focus-page">
        <div className="page-heading">
          <p className="eyebrow">Focus sessions</p>
          <h1>Give one task your full attention.</h1>
          <p>Create a task first, then come back here to log the time you spend making progress.</p>
        </div>
        <section className="card focus-empty-card">
          <div className="focus-empty-icon" aria-hidden="true">◷</div>
          <h2>No tasks to focus on yet.</h2>
          <p>Your focus history will begin as soon as you create a task and log your first session.</p>
          <Link to="/tasks" className="page-primary-link">Create a task <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    );
  }

  const activeTask = tasks.find((task) => String(task.id) === taskId) || tasks[0];
  const firstAction = getFirstAction(activeTask?.plan);

  const submit = async (event) => {
    event.preventDefault();
    if (!activeTask || !minutes || Number(minutes) <= 0) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await logTime(activeTask.id, Number(minutes), note);
      setSuccess(`${minutes} focused minutes logged for “${activeTask.title}.”`);
      setNote('');
    } catch (err) {
      setError(err.message || 'Could not log that session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page focus-page">
      <div className="page-heading">
        <p className="eyebrow">Focus sessions</p>
        <h1>Give one task your full attention.</h1>
        <p>Choose a task, set a realistic amount of time, and make one clear piece of progress.</p>
      </div>

      <div className="focus-grid">
        <section className="card focus-session-card">
          <div className="focus-card-heading">
            <div>
              <p className="eyebrow">Start a session</p>
              <h2>What are you working on?</h2>
            </div>
            <span className="focus-pulse"><span /> Ready</span>
          </div>

          <form onSubmit={submit}>
            <label htmlFor="focus-task">Task</label>
            <select id="focus-task" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>

            <label>Choose a focus length</label>
            <div className="duration-grid">
              {DURATIONS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  className={`duration-button ${Number(minutes) === duration ? 'selected' : ''}`}
                  onClick={() => setMinutes(duration)}
                >
                  <strong>{duration}</strong><span>min</span>
                </button>
              ))}
            </div>

            <label htmlFor="custom-minutes">Or set your own minutes</label>
            <input id="custom-minutes" type="number" min="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} />

            <label htmlFor="focus-note">Session intention <span>(optional)</span></label>
            <textarea id="focus-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What will you try to finish or make progress on?" />

            {error && <p className="error">{error}</p>}
            {success && <p className="success-message" role="status">✓ {success}</p>}

            <button className="btn focus-submit" type="submit" disabled={saving}>
              <span aria-hidden="true">◷</span> {saving ? 'Logging session…' : `Log ${minutes || 0} focused minutes`}
            </button>
          </form>
        </section>

        <aside className="focus-side-stack">
          <section className="card intention-card">
            <p className="eyebrow">Your selected task</p>
            <h2>{activeTask.title}</h2>
            <div className="detail-meta">
              <span className="category-tag">{activeTask.category}</span>
              <span className="detail-time">◷ {activeTask.totalMinutes || 0} minutes logged</span>
            </div>
            {firstAction ? (
              <div className="focus-next-action">
                <span>Start here</span>
                <p>{firstAction}</p>
              </div>
            ) : (
              <div className="focus-next-action muted-action">
                <span>Need a starting point?</span>
                <p>Create an AI plan from the Tasks page before you begin.</p>
                <Link to="/tasks">Open task workspace →</Link>
              </div>
            )}
          </section>

          <section className="card focus-tip-card">
            <p className="eyebrow">A tiny focus rule</p>
            <h3>Make the first five minutes easy.</h3>
            <p>Before you start, put only the materials for this task in front of you. A smaller starting barrier makes it much easier to keep going.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

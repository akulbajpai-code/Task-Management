import { useState } from 'react';

export default function TaskDetail({ task, onPlan, onLogTime, onDelete }) {
  const [minutes, setMinutes] = useState('');
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  if (!task) {
    return (
      <div className="card">
        <h2>Task Details</h2>
        <p className="empty">Select a task to see its AI breakdown and log time.</p>
      </div>
    );
  }

  const runPlan = async () => {
    setPlanning(true);
    setError('');
    try {
      await onPlan(task);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlanning(false);
    }
  };

  const logTime = async (e) => {
    e.preventDefault();
    const mins = Number(minutes);
    if (!mins || mins <= 0) return;
    try {
      await onLogTime(task.id, mins, note);
      setMinutes('');
      setNote('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Task Details</h2>
      <p className="detail-title">{task.title}</p>
      <p className="detail-desc">
        {task.category}
        {task.description ? ` · ${task.description}` : ''} · ⏱ {task.totalMinutes || 0} min logged
      </p>

      <div className="detail-actions">
        <button className="btn" onClick={runPlan} disabled={planning}>
          {planning ? 'Thinking…' : task.plan ? '↻ Re-plan' : '✦ Plan it with AI'}
        </button>
        <button className="btn ghost" onClick={() => onDelete(task.id)}>Delete</button>
      </div>

      {error && <p className="error">{error}</p>}
      {!error && <p className="hint">The plan runs on your free local Ollama model — private and no API cost.</p>}

      {task.plan && (
        <div className="plan">{task.plan}</div>
      )}

      <form onSubmit={logTime} className="log-time">
        <input
          type="number"
          min="1"
          placeholder="Minutes worked"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <button className="btn small" type="submit" disabled={!minutes}>Log</button>
      </form>
      <input
        style={{ marginTop: '8px' }}
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </div>
  );
}

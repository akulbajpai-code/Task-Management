export default function TaskList({ tasks, selectedId, onSelect, onDelete }) {
  if (!tasks.length) {
    return (
      <div className="card">
        <h2>Your Tasks</h2>
        <p className="empty">No tasks yet. Add one on the left, then hit “Plan it” to get your step-by-step breakdown.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Your Tasks ({tasks.length})</h2>
      <div className="task-list">
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`task ${t.id === selectedId ? 'selected' : ''}`}
            onClick={() => onSelect(t.id)}
          >
            <div className="task-top">
              <div className={`task-title ${t.totalMinutes > 0 ? 'done' : ''}`}>
                {t.title}
              </div>
              <button
                className="btn danger small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(t.id);
                }}
                title="Delete task"
              >
                ✕
              </button>
            </div>
            <div className="task-meta">
              <span className="tag">{t.category}</span>
              <span className="tag min">⏱ {t.totalMinutes || 0} min</span>
              {t.plan && <span className="tag" style={{ color: 'var(--green)' }}>✓ planned</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

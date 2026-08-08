function categoryClass(category) {
  return String(category || 'General').toLowerCase().replace(/[^a-z]+/g, '-');
}

export default function TaskList({ tasks, selectedId, onSelect, onDelete }) {
  if (!tasks.length) {
    return (
      <section className="card task-list-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your queue</p>
            <h2>Tasks</h2>
          </div>
          <span className="task-count">0</span>
        </div>
        <div className="empty-tasks">
          <div className="empty-tasks-icon" aria-hidden="true">✓</div>
          <strong>Your task list is clear.</strong>
          <p>Add your first task above and TaskFlow will help you find the best place to begin.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card task-list-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your queue</p>
          <h2>Tasks</h2>
        </div>
        <span className="task-count">{tasks.length}</span>
      </div>

      <div className="task-list">
        {tasks.map((t) => (
          <article
            key={t.id}
            className={`task ${t.id === selectedId ? 'selected' : ''}`}
            onClick={() => onSelect(t.id)}
            tabIndex="0"
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(t.id);
            }}
          >
            <span className={`task-color ${categoryClass(t.category)}`} aria-hidden="true" />
            <div className="task-content">
              <div className="task-top">
                <div className="task-title">{t.title}</div>
                <button
                  className="delete-task"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                  }}
                  title={`Delete ${t.title}`}
                  aria-label={`Delete ${t.title}`}
                >
                  ×
                </button>
              </div>
              <div className="task-meta">
                <span className="category-tag">{t.category}</span>
                <span className="time-tag">{t.totalMinutes || 0} min</span>
                {t.plan && <span className="planned-tag">AI plan ready</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

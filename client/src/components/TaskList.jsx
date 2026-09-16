import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 6;

function categoryClass(category) {
  return String(category || 'General').toLowerCase().replace(/[^a-z]+/g, '-');
}

export default function TaskList({ tasks, selectedId, onSelect, onDelete }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const visibleTasks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tasks.slice(start, start + PAGE_SIZE);
  }, [page, tasks]);

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

  const firstVisible = (page - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(page * PAGE_SIZE, tasks.length);

  return (
    <section className="card task-list-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your queue</p>
          <h2>Tasks</h2>
        </div>
        <span className="task-count">{tasks.length}</span>
      </div>

      <div className="task-list" aria-live="polite">
        {visibleTasks.map((t) => (
          <article
            key={t.id}
            className={`task ${t.id === selectedId ? 'selected' : ''}`}
            onClick={() => onSelect(t.id)}
            tabIndex="0"
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(t.id);
              }
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
                {t.plan && <span className="planned-tag">Guide ready</span>}
              </div>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="task-pagination">
          <span>Showing {firstVisible}–{lastVisible} of {tasks.length}</span>
          <div>
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>←</button>
            <span>{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>→</button>
          </div>
        </div>
      )}
    </section>
  );
}

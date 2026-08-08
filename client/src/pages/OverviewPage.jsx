import { Link, useOutletContext } from 'react-router-dom';
import Dashboard from '../components/Dashboard.jsx';
import PageLoading from './PageLoading.jsx';

function firstName(name) {
  return String(name || 'there').trim().split(/\s+/)[0] || 'there';
}

function nextAction(task) {
  if (!task?.plan) return 'Add a little context, then let AI turn this into a doable first step.';
  const explicit = task.plan.match(/^First action(?:\s*\([^)]*\))?\s*:\s*(.+)$/im);
  if (explicit) return explicit[1];
  const firstStep = task.plan.match(/^\s*1\s*[.)]\s*(.+)$/im);
  return firstStep ? firstStep[1] : 'Open your plan and choose the smallest next action.';
}

export default function OverviewPage() {
  const { tasks, dashboard, loading, user } = useOutletContext();
  if (loading) return <PageLoading />;

  const primaryTask = tasks.find((task) => task.plan) || tasks[0];
  const plannedCount = tasks.filter((task) => task.plan).length;

  return (
    <div className="page overview-page">
      <div className="page-heading page-heading-with-action">
        <div>
          <p className="eyebrow">Your personal workspace</p>
          <h1>Good to see you, {firstName(user?.name)}.</h1>
          <p>Choose one meaningful next step, give it your attention, and let the momentum build.</p>
        </div>
        <Link to="/tasks" className="page-primary-link"><span aria-hidden="true">+</span> New task</Link>
      </div>

      <Dashboard data={dashboard} showHeading={false} showCharts={false} />

      <div className="overview-panels">
        <section className="card next-step-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Your next best action</p>
              <h3>{primaryTask ? primaryTask.title : 'Start with one task'}</h3>
            </div>
            {primaryTask && <span className="category-tag">{primaryTask.category}</span>}
          </div>
          {primaryTask ? (
            <>
              <p className="next-action-copy">{nextAction(primaryTask)}</p>
              <Link to="/tasks" className="quiet-link">Open task workspace <span aria-hidden="true">→</span></Link>
            </>
          ) : (
            <>
              <p className="next-action-copy">Capture the one thing that feels most important today. You can create a step-by-step plan whenever you are ready.</p>
              <Link to="/tasks" className="quiet-link">Create your first task <span aria-hidden="true">→</span></Link>
            </>
          )}
        </section>

        <section className="card momentum-card">
          <p className="eyebrow">Your momentum</p>
          <h3>{plannedCount ? `${plannedCount} task${plannedCount === 1 ? '' : 's'} mapped out` : 'Your plan starts here'}</h3>
          <p>{plannedCount ? 'Your AI plans are ready whenever you need a little direction.' : 'Break down a task to replace uncertainty with a clear place to begin.'}</p>
          <div className="momentum-actions">
            <Link to="/focus">Log focus time</Link>
            <Link to="/insights">View insights</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

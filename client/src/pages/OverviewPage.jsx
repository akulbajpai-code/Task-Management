import { Link, useOutletContext } from 'react-router-dom';
import Dashboard from '../components/Dashboard.jsx';
import PageLoading from './PageLoading.jsx';

function firstName(name) {
  return String(name || 'there').trim().split(/\s+/)[0] || 'there';
}

function displayTitle(title) {
  const text = String(title || '').trim();
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : 'Untitled task';
}

function nextAction(task) {
  if (!task?.plan) return 'Add a little context, then let AI turn this into a doable first step.';
  const explicit = task.plan.match(/^First action(?:\s*\([^)]*\))?\s*:\s*(.+)$/im);
  if (explicit) return explicit[1];
  const firstStep = task.plan.match(/^\s*1\s*[.)]\s*(.+)$/im);
  return firstStep ? firstStep[1] : 'Open your plan and choose the smallest next action.';
}

function hoursLabel(minutes) {
  const hours = Math.round((Number(minutes || 0) / 60) * 10) / 10;
  return hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'} focused` : 'No focus time logged yet';
}

export default function OverviewPage() {
  const { tasks, dashboard, loading, user } = useOutletContext();
  if (loading) return <PageLoading />;

  const primaryTask = tasks.find((task) => task.plan) || tasks[0];
  const plannedCount = tasks.filter((task) => task.plan).length;
  const totalMinutes = dashboard?.totalMinutes || 0;

  return (
    <div className="page overview-page">
      <div className="page-heading page-heading-with-action">
        <div>
          <p className="eyebrow">Your personal workspace</p>
          <h1>Good to see you,{' '}{firstName(user?.name)}.</h1>
          <p>Pick one meaningful next step and give it your attention. Small focused sessions create real momentum.</p>
        </div>
        <Link to="/tasks" className="page-primary-link"><span aria-hidden="true">+</span> Add a task</Link>
      </div>

      <Dashboard
        data={dashboard}
        showHeading={false}
        showCharts={false}
        statLinks={{ focus: '/insights', tasks: '/tasks', categories: '/insights' }}
      />

      <div className="overview-primary-grid">
        <Link to="/tasks" className="card next-step-card home-card-link" aria-label="Open your task workspace">
          <div className="card-heading">
            <div className="next-step-title-block">
              <p className="eyebrow">Your next best action</p>
              <h3 title={primaryTask?.title}>{primaryTask ? displayTitle(primaryTask.title) : 'Start with one task'}</h3>
            </div>
            {primaryTask && <span className="category-tag">{primaryTask.category}</span>}
          </div>
          {primaryTask ? (
            <>
              <p className="next-action-copy">{nextAction(primaryTask)}</p>
              <div className="overview-card-footer">
                <span className="quiet-link">Open task workspace <span aria-hidden="true">→</span></span>
                <span>◷ {primaryTask.totalMinutes || 0} minutes logged</span>
              </div>
            </>
          ) : (
            <>
              <p className="next-action-copy">Capture the one thing that feels most important today. When you are ready, TaskFlow can turn it into a clear place to begin.</p>
              <div className="overview-card-footer"><span className="quiet-link">Create your first task <span aria-hidden="true">→</span></span></div>
            </>
          )}
        </Link>

        <Link to="/focus" className="card focus-cta-card home-card-link" aria-label="Start a focus session">
          <p className="eyebrow">Make space to focus</p>
          <h3>Ready for a focused session?</h3>
          <p>Choose a task, set a realistic time block, and record one small win.</p>
          <span className="focus-cta-link">Start a focus session <span aria-hidden="true">→</span></span>
        </Link>
      </div>

      <section className="card overview-summary-bar" aria-label="Workspace summary">
        <Link to="/tasks" className="overview-summary-item summary-card-link">
          <span className="summary-icon purple" aria-hidden="true">✦</span>
          <div><strong>{plannedCount ? `${plannedCount} AI plan${plannedCount === 1 ? '' : 's'} ready` : 'No AI plans yet'}</strong><span>{plannedCount ? 'Your next steps are mapped out.' : 'Create a plan from the Tasks page.'}</span></div>
        </Link>
        <Link to="/focus" className="overview-summary-item summary-card-link">
          <span className="summary-icon blue" aria-hidden="true">◷</span>
          <div><strong>{hoursLabel(totalMinutes)}</strong><span>Every session adds to your picture.</span></div>
        </Link>
        <Link to="/insights" className="summary-insights-link">View insights <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  );
}

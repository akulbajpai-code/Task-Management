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
    <div className="page overview-page editorial-overview">
      <div className="page-heading page-heading-with-action">
        <div>
          <p className="eyebrow">Your personal workspace</p>
          <h1>Good to see you,{' '}{firstName(user?.name)}.</h1>
          <p>Choose one meaningful next step, make space for it, and let the momentum build.</p>
        </div>
        <Link to="/tasks" className="page-primary-link"><span aria-hidden="true">+</span> Add a task</Link>
      </div>

      <Dashboard data={dashboard} showHeading={false} showCharts={false} minimalStats />

      <div className="editorial-dashboard-grid">
        <section className="next-action-editorial">
          <div className="editorial-section-heading">
            <p className="eyebrow">Your next best action</p>
            {primaryTask && <span className="category-tag">{primaryTask.category}</span>}
          </div>
          {primaryTask ? (
            <>
              <h2 title={primaryTask.title}>{displayTitle(primaryTask.title)}</h2>
              <p className="editorial-next-copy">{nextAction(primaryTask)}</p>
              <div className="editorial-action-footer">
                <div className="editorial-meta"><span>◷ {primaryTask.totalMinutes || 0} minutes logged</span><span>✦ {primaryTask.plan ? 'AI plan ready' : 'No plan yet'}</span></div>
                <Link to="/tasks" className="editorial-link">Open task workspace <span aria-hidden="true">→</span></Link>
              </div>
            </>
          ) : (
            <>
              <h2>Start with one task.</h2>
              <p className="editorial-next-copy">Capture the one thing that matters most today. When you are ready, TaskFlow can turn it into a clear place to begin.</p>
              <Link to="/tasks" className="editorial-link">Create your first task <span aria-hidden="true">→</span></Link>
            </>
          )}
        </section>

        <section className="focus-editorial">
          <p className="eyebrow">Focus window</p>
          <h2>Make the next 25 minutes count.</h2>
          <p>Choose a task, set a small time block, and come back with one thing moved forward.</p>
          <Link to="/focus" className="focus-editorial-link">Start a focus session <span aria-hidden="true">→</span></Link>
        </section>
      </div>

      <div className="overview-insight-row" aria-label="Workspace summary">
        <div className="insight-row-item">
          <span>Plans</span>
          <strong>{plannedCount ? `${plannedCount} AI plan${plannedCount === 1 ? '' : 's'} ready` : 'No AI plans yet'}</strong>
        </div>
        <div className="insight-row-item">
          <span>Focus history</span>
          <strong>{hoursLabel(totalMinutes)}</strong>
        </div>
        <Link to="/insights" className="insight-row-link">View insights <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  );
}

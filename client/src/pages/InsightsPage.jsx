import { useOutletContext } from 'react-router-dom';
import Dashboard from '../components/Dashboard.jsx';
import PageLoading from './PageLoading.jsx';

export default function InsightsPage() {
  const { dashboard, loading } = useOutletContext();
  if (loading) return <PageLoading label="Loading your insights…" />;

  const minutes = dashboard?.totalMinutes || 0;
  const summary = minutes
    ? `You have logged ${Math.round(minutes / 60 * 10) / 10} focused hours so far. Keep using short sessions to build a reliable picture of where your time goes.`
    : 'Once you log your first focus session, TaskFlow will turn your activity into a clear picture of where your time goes.';

  return (
    <div className="page insights-page">
      <div className="page-heading">
        <p className="eyebrow">Your patterns</p>
        <h1>See where your focus is going.</h1>
        <p>Use the patterns below to notice what is getting your attention and where you want to make room for more progress.</p>
      </div>

      <Dashboard data={dashboard} showHeading={false} showStats={false} />

      <section className="card insight-summary-card">
        <div className="insight-summary-icon" aria-hidden="true">↗</div>
        <div>
          <p className="eyebrow">A quick read</p>
          <h2>{minutes ? 'Your progress is becoming visible.' : 'Your first session is the beginning of the story.'}</h2>
          <p>{summary}</p>
        </div>
      </section>
    </div>
  );
}

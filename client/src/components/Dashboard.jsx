import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#8b7cff', '#47c5ff', '#42d6a4', '#f7be55', '#fb7b92', '#5ed7d2', '#b78cff'];

function StatIcon({ type }) {
  if (type === 'clock') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3.4 2" /></svg>;
  }
  if (type === 'check') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.1 4L19 6.5" /><path d="M21 12a9 9 0 1 1-4.2-7.6" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 4v2M20 12h-2M12 20v-2M4 12h2" /></svg>;
}

function StatCard({ tone, icon, value, unit, label, to, ariaLabel }) {
  const content = (
    <>
      <div className="stat-icon"><StatIcon type={icon} /></div>
      <div>
        <div className="num">{value}{unit && <span>{unit}</span>}</div>
        <div className="lbl">{label}</div>
      </div>
      {to && <span className="stat-arrow" aria-hidden="true">↗</span>}
    </>
  );

  const className = `stat stat-${tone}${to ? ' stat-link' : ''}`;
  return to ? <Link to={to} className={className} aria-label={ariaLabel}>{content}</Link> : <article className={className}>{content}</article>;
}

function EmptyChart({ kind }) {
  return (
    <div className="chart-empty">
      <div className={`chart-empty-icon ${kind}`} aria-hidden="true">
        {kind === 'task' ? '↗' : '◌'}
      </div>
      <strong>No focus time yet</strong>
      <span>Log a session below and your {kind === 'task' ? 'task' : 'category'} insights will appear here.</span>
    </div>
  );
}

export default function Dashboard({ data, showHeading = true, showStats = true, showCharts = true, statLinks = {} }) {
  const allCategories = data?.byCategory || [];
  const byCategory = allCategories
    .filter((d) => d.minutes > 0)
    .map((d) => ({ ...d, hours: Math.round((d.minutes / 60) * 10) / 10 }));
  const byTask = (data?.byTask || [])
    .filter((d) => d.minutes > 0)
    .map((d) => ({ ...d, hours: Math.round((d.minutes / 60) * 10) / 10 }));
  const totalHours = Math.round(((data?.totalMinutes || 0) / 60) * 10) / 10;

  return (
    <section className={`dashboard ${!showHeading ? 'dashboard-no-heading' : ''}`} aria-label="Focus overview">
      {showHeading && (
        <div className="overview-heading">
          <div>
            <p className="eyebrow">Focus overview</p>
            <h2>Make today count.</h2>
            <p className="overview-copy">Small focused sessions add up to meaningful progress.</p>
          </div>
          <span className="overview-badge">Local-first workspace</span>
        </div>
      )}

      {showStats && (
        <div className="stats">
          <StatCard
            tone="purple"
            icon="clock"
            value={totalHours}
            unit="h"
            label="Focus time logged"
            to={statLinks.focus}
            ariaLabel="View focus insights"
          />
          <StatCard
            tone="blue"
            icon="check"
            value={data?.taskCount || 0}
            label="Tasks in your flow"
            to={statLinks.tasks}
            ariaLabel="Open your tasks"
          />
          <StatCard
            tone="green"
            icon="target"
            value={allCategories.length}
            label="Active categories"
            to={statLinks.categories}
            ariaLabel="View category insights"
          />
        </div>
      )}

      {showCharts && <div className="charts">
        <article className="card chart-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Activity</p>
              <h3>Time by task</h3>
            </div>
            <span className="chart-unit">Hours</span>
          </div>
          {byTask.length ? (
            <ResponsiveContainer width="100%" height={218}>
              <BarChart data={byTask} layout="vertical" margin={{ top: 6, left: 0, right: 18, bottom: 0 }}>
                <CartesianGrid stroke="#2a3350" strokeDasharray="3 5" horizontal={false} />
                <XAxis type="number" stroke="#72809e" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={112} stroke="#aeb9d5" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(139, 124, 255, .08)' }}
                  contentStyle={{ background: '#171d31', border: '1px solid #34405f', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,.24)' }}
                  labelStyle={{ color: '#eef1ff', fontWeight: 700 }}
                  itemStyle={{ color: '#cdd5ef' }}
                  formatter={(value) => [`${value} h`, 'Focus time']}
                />
                <Bar dataKey="hours" fill="#8b7cff" radius={[0, 7, 7, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart kind="task" />}
        </article>

        <article className="card chart-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Balance</p>
              <h3>Time by category</h3>
            </div>
            <span className="chart-unit">Hours</span>
          </div>
          {byCategory.length ? (
            <ResponsiveContainer width="100%" height={218}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="hours"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={47}
                  outerRadius={76}
                  paddingAngle={4}
                  stroke="none"
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} h`, 'Focus time']}
                  contentStyle={{ background: '#171d31', border: '1px solid #34405f', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,.24)' }}
                  itemStyle={{ color: '#cdd5ef' }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ color: '#c8d0e8', fontSize: 12, paddingTop: 4 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart kind="category" />}
        </article>
      </div>}
    </section>
  );
}

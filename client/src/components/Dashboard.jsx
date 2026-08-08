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

const COLORS = ['#6d7cff', '#9a5cff', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#a78bfa'];

export default function Dashboard({ data }) {
  const byCategory = (data?.byCategory || []).map((d) => ({
    ...d,
    hours: Math.round((d.minutes / 60) * 10) / 10,
  }));
  const byTask = (data?.byTask || []).map((d) => ({
    ...d,
    hours: Math.round((d.minutes / 60) * 10) / 10,
  }));
  const totalHours = Math.round((data?.totalMinutes || 0) / 60 * 10) / 10;

  return (
    <div>
      <div className="stats">
        <div className="stat"><div className="num">{totalHours}</div><div className="lbl">Hours logged</div></div>
        <div className="stat"><div className="num">{data?.taskCount || 0}</div><div className="lbl">Tasks</div></div>
        <div className="stat"><div className="num">{byCategory.length}</div><div className="lbl">Categories</div></div>
      </div>

      <div className="charts">
        <div className="card">
          <h2>Time by Task</h2>
          {byTask.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byTask} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid stroke="#2c3350" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#9aa3bf" />
                <YAxis type="category" dataKey="name" width={120} stroke="#9aa3bf" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1f33', border: '1px solid #2c3350', borderRadius: 10 }}
                  labelStyle={{ color: '#e7ebf6' }}
                />
                <Bar dataKey="hours" fill="#6d7cff" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty">Log some time to see the breakdown.</p>}
        </div>

        <div className="card">
          <h2>Time by Category</h2>
          {byCategory.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="hours"
                  nameKey="name"
                  outerRadius={90}
                  paddingAngle={2}
                  labelLine={false}
                  label={(entry) =>
                    `${entry.name} ${Math.round(entry.hours * 10) / 10}h`
                  }
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} h`, 'Time']}
                  contentStyle={{ background: '#1a1f33', border: '1px solid #2c3350', borderRadius: 10 }}
                  itemStyle={{ color: '#e7ebf6' }}
                />
                <Legend wrapperStyle={{ color: '#e7ebf6', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="empty">Log some time to see the breakdown.</p>}
        </div>
      </div>
    </div>
  );
}

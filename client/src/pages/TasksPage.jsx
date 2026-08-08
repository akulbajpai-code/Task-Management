import { useOutletContext } from 'react-router-dom';
import TaskForm from '../components/TaskForm.jsx';
import TaskList from '../components/TaskList.jsx';
import TaskDetail from '../components/TaskDetail.jsx';
import PageLoading from './PageLoading.jsx';

export default function TasksPage() {
  const {
    tasks,
    selectedId,
    setSelectedId,
    createTask,
    deleteTask,
    planTask,
    logTime,
    loading,
  } = useOutletContext();

  if (loading) return <PageLoading label="Loading your tasks…" />;
  const selected = tasks.find((task) => task.id === selectedId) || null;

  return (
    <div className="page tasks-page">
      <div className="page-heading">
        <p className="eyebrow">Your task space</p>
        <h1>Turn the big picture into the next move.</h1>
        <p>Capture tasks, build a private AI breakdown, and log the time you give your work.</p>
      </div>

      <div className="workspace tasks-workspace">
        <aside className="sidebar">
          <TaskForm onCreate={createTask} />
          <TaskList
            tasks={tasks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={deleteTask}
          />
        </aside>
        <TaskDetail
          task={selected}
          onPlan={planTask}
          onLogTime={logTime}
          onDelete={deleteTask}
        />
      </div>
    </div>
  );
}

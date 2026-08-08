export default function PageLoading({ label = 'Loading your workspace…' }) {
  return (
    <div className="page-loading">
      <span className="loading-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

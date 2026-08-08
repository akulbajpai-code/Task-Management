import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageLoading from './PageLoading.jsx';

export default function SettingsPage() {
  const { user, updateProfile, loading } = useOutletContext();
  const [name, setName] = useState(user?.name || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  if (loading) return <PageLoading label="Loading your account…" />;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateProfile({ name });
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message || 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page settings-page">
      <div className="page-heading">
        <p className="eyebrow">Account settings</p>
        <h1>Your workspace, your preferences.</h1>
        <p>Manage the profile connected to this TaskFlow account. Your tasks and focus history are private to this login.</p>
      </div>

      <div className="settings-grid">
        <section className="card settings-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Profile</p>
              <h3>How TaskFlow greets you</h3>
            </div>
            <span className="settings-avatar">{String(user?.name || '?').trim().slice(0, 1).toUpperCase()}</span>
          </div>

          <form className="settings-form" onSubmit={submit}>
            <label htmlFor="settings-name">Name</label>
            <input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} minLength="2" required />
            <label htmlFor="settings-email">Email address</label>
            <input id="settings-email" value={user?.email || ''} disabled />
            <p className="field-help">Your email is used to identify your local account. Email changes are not part of this MVP yet.</p>
            {error && <p className="error">{error}</p>}
            {message && <p className="success-message" role="status">✓ {message}</p>}
            <button className="btn" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save profile'}</button>
          </form>
        </section>

        <aside className="settings-side-stack">
          <section className="card privacy-card">
            <div className="privacy-icon" aria-hidden="true">⌁</div>
            <p className="eyebrow">Privacy by design</p>
            <h3>Your AI plans stay local.</h3>
            <p>TaskFlow sends planning requests to Ollama running on this computer. There is no paid cloud AI API in this setup.</p>
          </section>
          <section className="card account-note-card">
            <p className="eyebrow">Multi-user MVP</p>
            <h3>Each account sees only its own work.</h3>
            <p>Tasks, logged sessions, and AI plans are separated by account in the TaskFlow data store.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

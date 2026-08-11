import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

const benefits = [
  'A private task space for every account',
  'Guided AI plans built one step at a time',
  'Focus history and insights that stay yours',
];

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      if (isSignup) {
        const result = await signup(form);
        if (result.needsEmailConfirmation) {
          setNotice('Check your email to confirm your account, then come back here and sign in.');
          return;
        }
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-brand">
          <div className="logo" aria-hidden="true">⏱</div>
          <div>
            <div className="brand-name">TaskFlow</div>
            <p>Make progress, one focused step at a time.</p>
          </div>
        </div>

        <div className="auth-story-copy">
          <p className="eyebrow">A calmer way to move forward</p>
          <h1>Turn overwhelming tasks into a clear next move.</h1>
          <p>TaskFlow gives every person their own focused workspace, private guided plans, and a simple view of what they are accomplishing.</p>
        </div>

        <div className="auth-benefits">
          {benefits.map((benefit) => (
            <div key={benefit} className="auth-benefit">
              <span aria-hidden="true">✓</span>
              <p>{benefit}</p>
            </div>
          ))}
        </div>

        <div className="auth-orb auth-orb-one" aria-hidden="true" />
        <div className="auth-orb auth-orb-two" aria-hidden="true" />
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form-card">
          <div className="auth-form-heading">
            <p className="eyebrow">{isSignup ? 'Create your workspace' : 'Welcome back'}</p>
            <h2>{isSignup ? 'Start your TaskFlow account' : 'Sign in to TaskFlow'}</h2>
            <p>{isSignup ? 'Your tasks, documents, and focus history will stay separate from every other user.' : 'Pick up exactly where you left off.'}</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            {isSignup && (
              <div>
                <label htmlFor="name">Name</label>
                <input id="name" value={form.name} onChange={update('name')} placeholder="Your name" autoComplete="name" required minLength="2" />
              </div>
            )}
            <div>
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div>
              <div className="password-label"><label htmlFor="password">Password</label>{isSignup && <span>At least 6 characters</span>}</div>
              <input id="password" type="password" value={form.password} onChange={update('password')} placeholder="••••••••" autoComplete={isSignup ? 'new-password' : 'current-password'} required minLength="6" />
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-notice" role="status">✓ {notice}</p>}

            <button className="btn auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'} <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to TaskFlow?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link>
          </p>
          <p className="auth-footnote">Documents remain private to your account. Guided AI is rate-limited to keep the beta reliable for everyone.</p>
        </div>
      </section>
    </main>
  );
}

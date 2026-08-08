import { Link } from 'react-router-dom';

function MiniIcon({ type }) {
  if (type === 'spark') return <span aria-hidden="true">✦</span>;
  if (type === 'clock') return <span aria-hidden="true">◷</span>;
  return <span aria-hidden="true">↗</span>;
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="TaskFlow home">
          <span className="logo" aria-hidden="true">⏱</span>
          <span>
            <strong>TaskFlow</strong>
            <small>Plan clearly. Focus deeply.</small>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Landing navigation">
          <a href="#how-it-works">How it works</a>
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="landing-nav-cta">Create free account</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">A calmer way to make progress</p>
          <h1>Know your next step. Then make it count.</h1>
          <p className="landing-lede">TaskFlow turns overwhelming work into a clear plan, protects your focus time, and gives you a private space to see your progress grow.</p>
          <div className="landing-hero-actions">
            <Link to="/signup" className="landing-primary-cta">Start free <span aria-hidden="true">→</span></Link>
            <a href="#how-it-works" className="landing-secondary-cta">See how it works</a>
          </div>
          <p className="landing-reassurance"><span aria-hidden="true">✓</span> No paid AI API key. Your plans run with local Ollama.</p>
        </div>

        <div className="landing-product-preview" aria-label="TaskFlow product preview">
          <div className="preview-topline"><span>Today’s focus</span><span className="preview-live"><i /> In progress</span></div>
          <div className="preview-task">
            <span className="preview-label">Your next best action</span>
            <h2>Finish the research outline</h2>
            <p>Review the three strongest sources and write a one-sentence takeaway from each.</p>
            <div className="preview-task-footer"><span>School · 25 min</span><span>Open workspace →</span></div>
          </div>
          <div className="preview-metrics">
            <div><span>Focus time</span><strong>2.5h</strong></div>
            <div><span>Tasks planned</span><strong>4</strong></div>
            <div><span>Categories</span><strong>3</strong></div>
          </div>
        </div>
      </section>

      <section className="landing-benefits" aria-label="TaskFlow benefits">
        <article>
          <div className="landing-benefit-icon purple"><MiniIcon type="spark" /></div>
          <h2>Find a real place to begin</h2>
          <p>Turn a big, vague task into concrete next actions you can actually start.</p>
        </article>
        <article>
          <div className="landing-benefit-icon blue"><MiniIcon type="clock" /></div>
          <h2>Make focus visible</h2>
          <p>Log short sessions and see the work that is quietly adding up over time.</p>
        </article>
        <article>
          <div className="landing-benefit-icon green"><MiniIcon type="arrow" /></div>
          <h2>Keep your work private</h2>
          <p>Every account has its own tasks, plans, sessions, and focused workspace.</p>
        </article>
      </section>

      <section id="how-it-works" className="landing-how">
        <div>
          <p className="eyebrow">Simple by design</p>
          <h2>A better flow for every task.</h2>
          <p>TaskFlow is built around a small loop: make the work clear, focus on it, and learn from the progress.</p>
        </div>
        <ol>
          <li><span>01</span><div><strong>Capture what matters</strong><p>Add a task and the context that makes it yours.</p></div></li>
          <li><span>02</span><div><strong>Get a clear plan</strong><p>Use private local AI to turn uncertainty into steps.</p></div></li>
          <li><span>03</span><div><strong>Focus and reflect</strong><p>Log time, notice patterns, and keep moving forward.</p></div></li>
        </ol>
      </section>

      <section className="landing-final-cta">
        <p className="eyebrow">Start with one step</p>
        <h2>Make room for the work that matters.</h2>
        <p>Create your TaskFlow account and build a calmer way to get things done.</p>
        <Link to="/signup" className="landing-primary-cta">Create free account <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="landing-footer">
        <span>TaskFlow · Local-first focus planning</span>
        <Link to="/login">Log in</Link>
      </footer>
    </main>
  );
}

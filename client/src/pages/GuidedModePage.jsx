import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import PageLoading from './PageLoading.jsx';

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [String(value)];
}

function readableStatus(step) {
  if (step.status === 'completed') return 'Complete';
  if (step.status === 'in_progress') return 'In progress';
  return 'Ready to begin';
}

export default function GuidedModePage() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTask(await api.getTask(taskId));
    } catch (err) {
      setError(err.message || 'Could not load this guided task.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const guide = task?.guide;
  const steps = useMemo(() => [...(guide?.guided_steps || [])].sort((a, b) => a.step_number - b.step_number), [guide]);
  const currentStep = steps.find((step) => step.step_number === guide?.current_step_number)
    || steps.find((step) => step.status !== 'completed')
    || steps[steps.length - 1];
  const completeCount = steps.filter((step) => step.status === 'completed').length;
  const progress = steps.length ? Math.round((completeCount / steps.length) * 100) : 0;
  const hostedGuidedAI = api.guidedAIEnabled;

  const saveProgress = async () => {
    if (!checkpoint.trim() || !currentStep) return;
    setSaving(true);
    setError('');
    try {
      await api.saveCheckpoint(currentStep.id, checkpoint);
      setCheckpoint('');
      await load();
    } catch (err) {
      setError(err.message || 'Could not save progress.');
    } finally {
      setSaving(false);
    }
  };

  const completeCurrentStep = async () => {
    if (!currentStep || !guide) return;
    setSaving(true);
    setError('');
    try {
      await api.completeStep(currentStep, guide);
      setCheckpoint('');
      await load();
    } catch (err) {
      setError(err.message || 'Could not complete this step.');
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!message.trim() || !currentStep) return;
    setSendingMessage(true);
    setError('');
    try {
      await api.sendStepMessage({ taskId, step: currentStep, message });
      setMessage('');
      await load();
    } catch (err) {
      setError(err.message || 'Could not send that message right now.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return <PageLoading label="Opening Guided Mode…" />;
  if (error && !task) {
    return <div className="guided-error"><p className="eyebrow">Guided Mode</p><h1>We could not open this task.</h1><p>{error}</p><Link to="/tasks" className="page-primary-link">Back to tasks</Link></div>;
  }
  if (!guide || !steps.length) {
    return (
      <div className="guided-empty">
        <p className="eyebrow">Guided Mode</p>
        <h1>This task needs a guided plan first.</h1>
        <p>Go back to the task workspace, add any helpful document, and choose <strong>Build guided plan</strong>.</p>
        <Link to="/tasks" className="page-primary-link">Open task workspace <span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  const isFinished = guide.status === 'completed' || completeCount === steps.length;

  return (
    <div className="guided-page">
      <div className="guided-topline">
        <Link to="/tasks" className="back-link">← Back to task workspace</Link>
        <span>{completeCount} of {steps.length} steps complete</span>
      </div>

      <header className="guided-task-header">
        <p className="eyebrow">Guided Mode · {task.category}</p>
        <h1>{task.title}</h1>
        <div className="guided-progress-track" aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }} /></div>
      </header>

      {isFinished ? (
        <section className="card guided-complete-card">
          <div className="guided-complete-icon">✓</div>
          <p className="eyebrow">You finished the guided plan</p>
          <h2>Nice work moving this forward.</h2>
          <p>You completed all {steps.length} steps. Your checkpoints are saved below so you can remember what you accomplished.</p>
          <Link to="/tasks" className="page-primary-link">Return to task workspace</Link>
        </section>
      ) : (
        <div className="guided-layout">
          <main className="card guided-step-card">
            <div className="guided-step-heading">
              <div>
                <span className="guided-step-number">Step {currentStep.step_number}</span>
                <span className={`guided-status ${currentStep.status}`}>{readableStatus(currentStep)}</span>
              </div>
              {currentStep.estimated_minutes && <span className="guided-estimate">◷ ~{currentStep.estimated_minutes} min</span>}
            </div>

            <h2>{currentStep.title}</h2>
            {currentStep.goal && <p className="guided-goal">{currentStep.goal}</p>}

            <section className="guided-instructions">
              <h3>How to do this</h3>
              <ol>
                {asList(currentStep.instructions).map((instruction, index) => <li key={index}>{instruction}</li>)}
              </ol>
            </section>

            {asList(currentStep.success_criteria).length > 0 && (
              <section className="guided-success">
                <h3>You are ready to continue when…</h3>
                <ul>{asList(currentStep.success_criteria).map((item, index) => <li key={index}>✓ {item}</li>)}</ul>
              </section>
            )}

            {task.documents?.length > 0 && (
              <p className="guided-source-note">Using context from: {task.documents.map((document) => document.file_name).join(', ')}</p>
            )}

            <div className="guided-step-actions">
              <button className="btn" onClick={completeCurrentStep} disabled={saving}>
                {saving ? 'Saving…' : `Complete Step ${currentStep.step_number} →`}
              </button>
              <span>Your progress is saved to this task.</span>
            </div>
          </main>

          <aside className="guided-side-stack">
            <section className="card checkpoint-card">
              <p className="eyebrow">Save a checkpoint</p>
              <h3>What part are you working on?</h3>
              <p>Pause any time and leave a note for your future self.</p>
              <textarea value={checkpoint} onChange={(event) => setCheckpoint(event.target.value)} placeholder="e.g. I chose the three sources and highlighted the methodology..." />
              <button className="btn ghost checkpoint-button" onClick={saveProgress} disabled={saving || !checkpoint.trim()}>
                {saving ? 'Saving…' : 'Save progress'}
              </button>
              {currentStep.checkpoints?.length > 0 && (
                <div className="checkpoint-history">
                  {currentStep.checkpoints.slice(-3).reverse().map((item) => <p key={item.id}><span>Saved</span>{item.note}</p>)}
                </div>
              )}
            </section>

            {hostedGuidedAI ? (
              <section className="card step-chat-card">
                <div className="step-chat-heading">
                  <div>
                    <p className="eyebrow">TaskFlow AI</p>
                    <h3>Ask about this step</h3>
                  </div>
                  <span className="chat-online"><i /> Online</span>
                </div>
                <p className="step-chat-context">It knows this task, the current step, and the document context you attached.</p>
                <div className="step-chat-thread" aria-live="polite">
                  {!currentStep.messages?.length && (
                    <div className="chat-message assistant"><span>TaskFlow AI</span><p>What is getting in your way with this step? Ask me anything and I’ll help you make the next move smaller and clearer.</p></div>
                  )}
                  {currentStep.messages?.map((item) => (
                    <div key={item.id} className={`chat-message ${item.role}`}>
                      <span>{item.role === 'assistant' ? 'TaskFlow AI' : 'You'}</span>
                      <p>{item.content}</p>
                    </div>
                  ))}
                  {sendingMessage && <div className="chat-message assistant thinking"><span>TaskFlow AI</span><p>Thinking through your step…</p></div>}
                </div>
                <form className="step-chat-compose" onSubmit={sendMessage}>
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="e.g. I’m not sure how to choose the right journal. What should I do first?" />
                  <button className="btn" type="submit" disabled={sendingMessage || !message.trim()}>{sendingMessage ? 'Sending…' : 'Send message'} <span aria-hidden="true">→</span></button>
                </form>
              </section>
            ) : (
              <section className="card clarify-card">
                <p className="eyebrow">Make it smaller</p>
                <h3>Stuck on this step?</h3>
                <p className="starter-help-copy">Write one checkpoint describing the smallest part you can do next. A clear next action is more useful than trying to finish the whole step at once.</p>
                <Link to="/tasks" className="starter-help-link">Review task context →</Link>
              </section>
            )}
          </aside>
        </div>
      )}

      {error && <p className="error guided-page-error">{error}</p>}

      <section className="guided-plan-map" aria-label="Plan steps">
        {steps.map((step) => (
          <div key={step.id} className={`guided-map-step ${step.id === currentStep?.id && !isFinished ? 'current' : ''} ${step.status}`}>
            <span>{step.status === 'completed' ? '✓' : step.step_number}</span>
            <div><strong>{step.title}</strong><small>{readableStatus(step)}</small></div>
          </div>
        ))}
      </section>
    </div>
  );
}

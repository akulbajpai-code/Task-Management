import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function unpackPlan(plan) {
  const steps = [];
  const notes = [];
  let currentStep = null;

  for (const rawLine of String(plan || '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^(?:step\s*)?(\d+)\s*[.)]\s*(.+)$/i);
    if (match) {
      currentStep = { number: Number(match[1]), text: match[2].trim() };
      steps.push(currentStep);
      continue;
    }

    if (/^time estimate\s*:/i.test(line) || /^first action(?:\s*\([^)]*\))?\s*:/i.test(line)) {
      notes.push(line);
      currentStep = null;
      continue;
    }

    if (currentStep) {
      currentStep.text += ` ${line}`;
    } else {
      notes.push(line);
    }
  }

  if (!steps.length && plan) {
    steps.push({ number: 1, text: String(plan).trim() });
  }

  const firstAction = notes.find((note) => /^first action(?:\s*\([^)]*\))?\s*:/i.test(note));
  const timeEstimate = notes.find((note) => /^time estimate\s*:/i.test(note));
  const otherNotes = notes.filter((note) => note !== firstAction && note !== timeEstimate);

  return { steps, firstAction, timeEstimate, otherNotes };
}

export default function TaskDetail({ task, onPlan, onLogTime, onDelete }) {
  const [minutes, setMinutes] = useState('');
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setMinutes('');
    setNote('');
    setError('');
  }, [task?.id]);

  const planData = useMemo(() => unpackPlan(task?.plan), [task?.plan]);
  const hostedGuidedAI = api.guidedAIEnabled;

  if (!task) {
    return (
      <section className="card detail-card detail-empty">
        <div className="empty-detail-icon" aria-hidden="true">✦</div>
        <p className="eyebrow">Task workspace</p>
        <h2>Choose a task to begin</h2>
        <p>Select one from your queue to generate an AI breakdown and log focused time.</p>
      </section>
    );
  }

  const runPlan = async () => {
    setPlanning(true);
    setError('');
    try {
      await onPlan(task);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlanning(false);
    }
  };

  const logTime = async (e) => {
    e.preventDefault();
    const mins = Number(minutes);
    if (!mins || mins <= 0) return;
    try {
      await onLogTime(task.id, mins, note);
      setMinutes('');
      setNote('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const firstActionText = planData.firstAction?.replace(/^first action(?:\s*\([^)]*\))?\s*:\s*/i, '');
  const estimateText = planData.timeEstimate?.replace(/^time estimate\s*:\s*/i, '');

  return (
    <section className="card detail-card">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Task workspace</p>
          <h2>{task.title}</h2>
          <div className="detail-meta">
            <span className="category-tag">{task.category}</span>
            <span className="detail-time"><span aria-hidden="true">◷</span> {task.totalMinutes || 0} minutes logged</span>
          </div>
        </div>
        <button className="icon-button" onClick={() => onDelete(task.id)} title="Delete task" aria-label="Delete task">×</button>
      </div>

      {task.description && <p className="task-description">{task.description}</p>}

      {task.documents?.length > 0 && (
        <div className="attached-documents">
          <span className="eyebrow">Attached context</span>
          <div>
            {task.documents.map((document) => <span key={document.id}>▣ {document.file_name}</span>)}
          </div>
        </div>
      )}

      {hostedGuidedAI && task.documents?.length > 0 && (
        <p className="ai-document-disclosure">By building an AI guide, extracted text from the attached documents will be sent to the configured hosted AI provider for this request.</p>
      )}

      <div className="planner-toolbar">
        <div>
          <p className="eyebrow">{hostedGuidedAI ? 'Document-aware AI guide' : 'Guided plan'}</p>
          <h3>{task.guide ? 'Your next step is ready' : 'Break the task into steps'}</h3>
        </div>
        <button className="btn plan-button" onClick={runPlan} disabled={planning}>
          <span aria-hidden="true">✦</span> {planning ? 'Building guide…' : task.guide ? (hostedGuidedAI ? 'Refresh AI guide' : 'Reset guide') : (hostedGuidedAI ? 'Build AI guide' : 'Create starter guide')}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {task.plan ? (
        <div className="plan-panel">
          {firstActionText && (
            <div className="first-action">
              <div className="first-action-icon" aria-hidden="true">→</div>
              <div>
                <span>Start here</span>
                <strong>{firstActionText}</strong>
              </div>
            </div>
          )}

          <div className="plan-panel-heading">
            <span>Step-by-step plan</span>
            <span>{planData.steps.length} {planData.steps.length === 1 ? 'step' : 'steps'}</span>
          </div>
          <ol className="plan-steps">
            {planData.steps.map((step, index) => (
              <li key={`${step.number}-${index}`}>
                <span className="step-number">{step.number}</span>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          {(estimateText || planData.otherNotes.length > 0) && (
            <div className="plan-notes">
              {estimateText && <p><strong>Estimated time:</strong> {estimateText}</p>}
              {planData.otherNotes.map((item, index) => <p key={index}>{item}</p>)}
            </div>
          )}
        </div>
      ) : (
        <div className="plan-placeholder">
          <div className="plan-placeholder-icon" aria-hidden="true">✦</div>
          <div>
            <strong>Feeling stuck? Start smaller.</strong>
            <p>Add optional context or a document, then create a guided plan with one clear step at a time.</p>
          </div>
        </div>
      )}

      {task.guide && (
        <Link to={`/guide/${task.id}`} className="guided-mode-link">
          <span>▶</span>
          <span><strong>Start Guided Mode</strong><small>Work through one detailed step at a time</small></span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <div className="log-panel">
        <div className="log-heading">
          <div>
            <p className="eyebrow">Focus session</p>
            <h3>Log your progress</h3>
          </div>
          <span>Every minute counts</span>
        </div>
        <form onSubmit={logTime} className="log-time">
          <input
            aria-label="Minutes worked"
            type="number"
            min="1"
            placeholder="Minutes worked"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!minutes}>Log time</button>
        </form>
        <input
          className="session-note"
          aria-label="Session note"
          placeholder="What did you make progress on? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {!error && <p className="privacy-hint">{hostedGuidedAI ? 'Hosted AI is enabled for this beta. Only the task context and documents you choose are sent for guide generation.' : 'Starter guides are private to this task. Hosted AI can be enabled later after you choose a document privacy policy.'}</p>}
    </section>
  );
}

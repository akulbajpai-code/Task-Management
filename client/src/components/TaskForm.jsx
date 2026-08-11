import { useState } from 'react';
import { DOCUMENT_ACCEPT, MAX_DOCUMENT_BYTES, validateDocument } from '../lib/documentText.js';

export default function TaskForm({ onCreate }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectFiles = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    try {
      nextFiles.forEach(validateDocument);
      setFiles(nextFiles);
      setFileError('');
    } catch (error) {
      setFiles([]);
      event.target.value = '';
      setFileError(error.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setSubmitError('');
    try {
      await onCreate({ title, category, description }, files);
      setTitle('');
      setCategory('General');
      setDescription('');
      setFiles([]);
      setFileError('');
      const input = document.getElementById('task-documents');
      if (input) input.value = '';
    } catch (error) {
      setSubmitError(error.message || 'Could not add this task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card create-task-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Task inbox</p>
          <h2>Create a task</h2>
        </div>
        <span className="heading-icon" aria-hidden="true">+</span>
      </div>
      <p className="section-copy">Capture what matters, add context, then turn it into a manageable next step.</p>

      <form onSubmit={submit} className="task-form">
        <label htmlFor="title">What do you need to do?</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Finish AP Bio research paper"
          autoComplete="off"
        />

        <div className="form-row">
          <div>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {['General', 'School', 'Work', 'Project', 'Health', 'Personal'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="description">Helpful context <span>(optional)</span></label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deadline, requirements, or anything the planner should know..."
        />

        <label htmlFor="task-documents">Add a document <span>(optional)</span></label>
        <div className="document-upload-field">
          <input
            id="task-documents"
            type="file"
            accept={DOCUMENT_ACCEPT}
            multiple
            onChange={selectFiles}
          />
          <div className="document-upload-copy">
            <strong>PDF, Word, or text</strong>
            <span>Up to {Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024)} MB each · private to this task</span>
            <span>Attached text is used only when you choose Build guided plan.</span>
          </div>
        </div>
        {files.length > 0 && (
          <div className="selected-files" aria-live="polite">
            {files.map((file) => <span key={`${file.name}-${file.size}`}>✓ {file.name}</span>)}
          </div>
        )}
        {fileError && <p className="error">{fileError}</p>}
        {submitError && <p className="error">{submitError}</p>}

        <button className="btn block" type="submit" disabled={saving || !title.trim()}>
          <span aria-hidden="true">+</span> {saving ? 'Adding task…' : 'Add to task list'}
        </button>
      </form>
    </section>
  );
}

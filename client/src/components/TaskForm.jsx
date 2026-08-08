import { useState } from 'react';

export default function TaskForm({ onCreate }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onCreate({ title, category, description });
      setTitle('');
      setCategory('General');
      setDescription('');
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
      <p className="section-copy">Capture what matters, then turn it into a manageable next step.</p>

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

        <button className="btn block" type="submit" disabled={saving || !title.trim()}>
          <span aria-hidden="true">+</span> {saving ? 'Adding task…' : 'Add to task list'}
        </button>
      </form>
    </section>
  );
}

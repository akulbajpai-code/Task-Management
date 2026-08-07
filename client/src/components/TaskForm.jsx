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
    <div className="card">
      <h2>New Task</h2>
      <form onSubmit={submit}>
        <label htmlFor="title">Task title</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Finish AP Bio research paper"
        />

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

        <label htmlFor="description">Details (optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any extra context the AI planner can use..."
        />

        <button className="btn block" type="submit" disabled={saving || !title.trim()}>
          {saving ? 'Adding…' : '+ Add Task'}
        </button>
      </form>
    </div>
  );
}

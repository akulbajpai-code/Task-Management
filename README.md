# ⏱️ TaskFlow

**Track where your time goes — and let AI break your tasks down into "exactly where to start."**

TaskFlow is a personal time-tracking dashboard with an AI task-planning engine. You log the work you're doing, see beautiful charts of how your time is spent, and when a task feels overwhelming, TaskFlow's AI (via a **free, local** [Ollama](https://ollama.com) model) turns it into a clear step-by-step action plan.

---

## ✨ Features (MVP)

- **Task log** — add tasks with a title, description, and category.
- **Time tracking** — log sessions against any task (or use the built-in timer).
- **AI breakdown** — one button turns any task into a numbered "where to start" plan using a local LLM.
- **Dashboard** — visualize your time by category and by task with interactive charts.

---

## 🧱 Tech Stack

| Layer    | Choice                              |
|----------|-------------------------------------|
| Frontend | React + Vite + Recharts             |
| Backend  | Node.js + Express                   |
| Storage  | JSON file (simple, zero-DB setup)   |
| AI       | Ollama (local, free, private)       |

---

## 🚀 Getting Started

### Prerequisites
- Node.js **18+** and npm
- [Ollama](https://ollama.com) installed, with a model pulled (e.g. `ollama pull llama3.2`)

### 1. Install everything
```bash
npm install
npm run install:all
```

### 2. Make sure Ollama is running
```bash
ollama pull llama3.2      # first time only
ollama serve              # or just launch the Ollama app
```

### 3. Start the dev servers
```bash
npm run dev
```
- Frontend: http://localhost:5173
- API server: http://localhost:4000

The frontend proxies `/api` requests to the backend automatically.

---

## 🤖 About the AI breakdown

The `/api/plan` endpoint talks to Ollama at `http://localhost:11434`. It uses a system prompt that forces the model to output a **numbered, actionable step-by-step plan** — starting with a concrete first action — so you're never staring at a blank page wondering where to begin.

Model is configurable via the `OLLAMA_MODEL` environment variable (default: `llama3.2`).

---

## 📁 Project Structure

```
taskflow/
├── README.md
├── client/                 # React frontend (Vite)
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       └── components/
└── server/                 # Express backend
    ├── index.js            # API routes
    ├── store.js            # JSON file data store
    └── ollama.js           # Ollama client
```

---

## 🗺️ Roadmap (stretch goals)
- [ ] Charts by day/week/month
- [ ] Pomodoro-style built-in timer
- [ ] Export / shareable time reports
- [ ] Auth + cloud sync
- [ ] Mobile-friendly polish

---

Made as a personal project. Built with ❤️ and a local LLM.

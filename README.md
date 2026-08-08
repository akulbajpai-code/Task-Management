# ⏱️ TaskFlow

**A private, multi-user focus workspace that turns overwhelming tasks into clear next steps.**

TaskFlow helps students and independent learners capture tasks, choose a realistic focus session, and see where their time is going. When a task feels too big, its local AI planner (powered by **free, on-device [Ollama](https://ollama.com)**) creates a concrete, step-by-step place to start.

---

## ✨ What it does

- **Public landing page** — a clear, mobile-friendly introduction explains TaskFlow’s value and gives visitors a simple route to sign up.
- **Personal accounts** — create an email/password account; each user only sees their own tasks, sessions, plans, and insights.
- **Focused pages** — separate Overview, Tasks, Focus, Insights, and Settings pages with a right-side navigation rail.
- **Clickable overview** — every dashboard card has an intentional destination, so users can move from a metric or next action directly into the relevant workspace.
- **Task workspace** — add a task, include useful context, and keep a clear task queue.
- **AI task breakdown** — turn any task into a numbered plan with a highlighted “Start here” action.
- **Focus sessions** — choose a task, select a realistic time block, add an intention, and log progress.
- **Insights** — visual charts show time by task and category.
- **Creator analytics** — the creator account can view private aggregate counts for browser sessions, unique browsers, accounts, tasks, and focus time.
- **Local-first AI** — plans run through Ollama on the computer running TaskFlow; no paid AI API key is required.

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, React Router, Recharts |
| Backend | Node.js, Express |
| Authentication | bcrypt password hashes + signed JWT sessions |
| Development storage | JSON file with per-user task ownership and anonymous session counts |
| AI | Ollama (local, free, private) |

> **MVP storage note:** JSON storage keeps setup very simple for a local demo. For a public deployment or real multi-user beta, move users and tasks to a hosted SQL database (for example Supabase/Postgres) and set a strong `JWT_SECRET` environment variable. JSON files are not safe for many simultaneous writes and many hosts erase local files after deployment.

---

## 🚀 Run locally

### Prerequisites

- Node.js **18+** and npm
- [Ollama](https://ollama.com) installed
- A local model pulled, for example:

```bash
ollama pull llama3.2
```

### 1. Install dependencies

```bash
npm install
npm run install:all
```

### 2. Start Ollama

```bash
ollama serve
```

Or simply open the Ollama desktop app if it starts the local server automatically.

### 3. Start TaskFlow

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The first screen is the account sign-up page.

- React app: `http://localhost:5173`
- Express API: `http://localhost:4000`

The Vite development server proxies `/api` requests to Express automatically.

---

## 🔐 Accounts and data privacy

- Passwords are hashed with `bcryptjs`; TaskFlow never stores a plain-text password.
- A signed token keeps a user logged in locally for seven days.
- Every task API route verifies the signed user and filters data by its owner.
- If upgrading an older single-user TaskFlow data file, the **first account created** safely claims the existing tasks.
- AI plans are sent to the configured local Ollama server, not to a paid cloud AI provider.
- Visit counts use a random browser ID stored locally in the browser—no email, task content, or IP address is recorded by this MVP metric. The creator account alone can see the aggregate count in Settings.

For public deployment, connect a dedicated consent-aware analytics platform such as Google Analytics 4 or Plausible for richer traffic sources, retention, and conversion reports.

For deployment, set a long random secret before starting the server:

```bash
export JWT_SECRET="replace-this-with-a-long-random-secret"
npm run dev
```

---

## 🤖 About the AI breakdown

The `/api/plan` route communicates with Ollama at `http://localhost:11434`. Its system prompt asks for a plain-text numbered plan that:

1. begins with a small, concrete first action,
2. keeps every step actionable and measurable,
3. includes a time estimate, and
4. ends with a “First action (do this now)” reminder.

The model can be changed with `OLLAMA_MODEL` (default: `llama3.2`).

---

## 📁 Project structure

```text
taskflow/
├── client/
│   └── src/
│       ├── auth/              # auth context and session restoration
│       ├── components/        # login, app shell, task UI, charts
│       ├── pages/             # landing, overview, tasks, focus, insights, settings
│       ├── App.jsx            # public landing, visit tracking, and protected routes
│       └── api.js             # authenticated API client
└── server/
    ├── index.js               # Express API + auth middleware
    ├── store.js               # JSON store and per-user ownership rules
    └── ollama.js              # local Ollama client
```

---

## 🗺️ Next ideas

- [ ] Pomodoro countdown with pause/resume
- [ ] Due dates and a backward planner
- [ ] Weekly/monthly insight ranges
- [ ] Cloud database + secure deployment
- [ ] Google sign-in and email verification
- [ ] Shareable progress reports

Built as a personal project with React, Express, and a local LLM.

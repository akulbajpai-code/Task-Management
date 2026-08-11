# ⏱️ TaskFlow

**A guided focus workspace that turns overwhelming work into a clear, achievable next step.**

TaskFlow is a multi-user productivity app for students and independent learners. Users can capture a task, attach optional PDF/Word/text context, receive a structured AI guide, work through one detailed step at a time, save checkpoints, and see their focus history grow.

---

## ✨ Core experience

- **Public landing page** — communicates the product clearly and gives visitors a low-friction route to create an account.
- **Private accounts** — Supabase Auth separates every user’s tasks, documents, guided plans, sessions, and progress.
- **Rounded-card dashboard** — every Overview metric and card has a purposeful destination: Tasks, Focus, or Insights.
- **Document-aware planning** — attach private `.pdf`, `.docx`, or `.txt` files up to 10 MB each.
- **Guided Mode** — instead of a static list, users see one detailed step at a time, with instructions, a goal, success criteria, and an estimate.
- **Checkpoints** — users can pause midway through a step, save a note about exactly where they are, and resume later.
- **Focus sessions and insights** — log time, inspect categories, and understand where progress is happening.
- **Creator analytics** — the first TaskFlow account can view privacy-conscious aggregate visits, unique browsers, accounts, tasks, and focus time.

---

## 🧱 Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, React Router, Recharts |
| Authentication | Supabase Auth |
| Database | Supabase Postgres + Row Level Security |
| Private file storage | Supabase Storage (`task-documents`) |
| Guided AI | Supabase Edge Function + rate-limited OpenAI-compatible model |
| Document parsing | `pdfjs-dist`, `mammoth`, browser text extraction |
| Deployment target | Cloudflare Pages |
| Analytics | Private aggregate metrics + optional Google Analytics 4 |

---

## 🔐 Privacy and security principles

- Every user-owned table is protected with **Row Level Security**.
- Document storage is private; users can only access files in their own Storage folder.
- The browser only receives a Supabase **Publishable** key. Never put a Supabase `service_role` key or an AI provider key in frontend code.
- Guided AI is rate limited to **3 new guides/day** and **20 step-help requests/day** per user by default.
- The built-in visit counter uses a random browser ID, not task content, email, or IP address.

---

## 🚀 Local setup

### Prerequisites

- Node.js 18+
- A Supabase project
- Optional hosted AI provider key for the Guided AI Edge Function

### 1. Install packages

```bash
npm install
npm run install:all
```

### 2. Add local environment values

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### 3. Set up Supabase

1. Create a private Storage bucket named `task-documents`.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. Follow [`supabase/README.md`](supabase/README.md) to deploy the `guided-ai` Edge Function and set its hosted AI secret.

### 4. Run TaskFlow

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> The Vite configuration intentionally loads `.env.local` from the repository root. Do not commit this file.

---

## 🗺️ Guided Mode flow

```text
Create a task
  → Attach optional document context
  → Build guided plan
  → Open Guided Mode
  → Work through Step 1
  → Save checkpoint notes at any point
  → Complete and advance to the next step
  → Finish with a saved progress history
```

The Edge Function asks the AI for structured JSON, not a vague checklist. Each generated step has:

- title and goal
- concrete instructions
- success criteria
- estimated minutes
- persistent status and checkpoints

---

## 📁 Project layout

```text
taskflow/
├── client/
│   └── src/
│       ├── auth/                # Supabase session management
│       ├── components/          # UI and dashboard components
│       ├── lib/                 # Supabase client + local document extraction
│       ├── pages/               # Landing, app pages, Guided Mode
│       ├── api.js               # Supabase data/storage/function client
│       └── App.jsx              # public + protected routes
├── supabase/
│   ├── schema.sql               # database, RLS, Storage, analytics schema
│   └── functions/guided-ai/     # rate-limited hosted AI function
├── .env.example
└── server/                       # legacy local Express/Ollama development server
```

---

## 🌐 Public deployment roadmap

1. Push the project to GitHub.
2. Connect the repository to Cloudflare Pages.
3. Add the two `VITE_SUPABASE_*` environment variables in Cloudflare Pages.
4. Deploy the Supabase schema and Guided AI Edge Function.
5. Add a hosted AI key only as a Supabase secret.
6. Add Google Analytics 4 after receiving a public `pages.dev` URL.
7. Recruit a small beta group, measure activation, and improve the first-session flow.

---

## ⚠️ Before a public launch

- Add a simple Privacy Policy and Terms page.
- Do not let users upload sensitive school records or personally identifying documents.
- Configure an email sender/confirmation flow in Supabase Auth.
- Use a real hosted AI key with strict spend limits and monitor usage.
- Test document upload, sign-up, Guided Mode, and checkpoint recovery with several people before public promotion.

Built as a student project with React, Supabase, structured AI guidance, and a focus on thoughtful product design.

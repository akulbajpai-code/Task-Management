# TaskFlow Supabase deployment notes

## 1. Create the database and security rules

In the Supabase dashboard, open **SQL Editor** → **New query**, paste the contents of `schema.sql`, then click **Run**.

This creates:

- private user profiles, tasks, focus sessions, documents, guided plans, steps, and checkpoints
- Row Level Security policies so users only see their own data
- Storage policies for the private `task-documents` bucket
- private creator analytics

## 2. Deploy Guided AI

The `guided-ai` Edge Function uses an OpenAI-compatible hosted model. It intentionally has daily limits: 3 new guided plans and 20 step-help requests per user per day.

Install the Supabase CLI if needed, then run from the repository root:

```bash
npx supabase login
npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
npx supabase secrets set OPENAI_API_KEY=YOUR_HOSTED_AI_KEY
npx supabase secrets set AI_MODEL=gpt-4o-mini
npx supabase functions deploy guided-ai
```

If you use an OpenAI-compatible provider with a different API endpoint, add:

```bash
npx supabase secrets set AI_BASE_URL=https://your-provider.example/v1
```

Do not put `OPENAI_API_KEY` in `.env.local`, client-side code, GitHub, or a screenshot. It belongs only in Supabase Edge Function secrets.

## 3. Local frontend configuration

Create `.env.local` at the repository root:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use only a Supabase **Publishable** key here. Never use a `service_role` or secret key in the browser.

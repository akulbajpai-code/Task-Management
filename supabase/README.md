# TaskFlow Supabase deployment notes

## 1. Create the database and security rules

In the Supabase dashboard, open **SQL Editor** → **New query**, paste the contents of `schema.sql`, then click **Run**.

This creates:

- private user profiles, tasks, focus sessions, documents, guided plans, steps, and checkpoints
- Row Level Security policies so users only see their own data
- Storage policies for the private `task-documents` bucket
- private creator analytics

## 2. Private starter-guide beta

The app launches with private starter guides by default. They do not send attached document text to any hosted AI provider.

## 3. Optional Gemini test AI

For non-sensitive personal test documents only, you can enable Gemini through Google AI Studio. Google’s free tier may use prompts to improve its products, so do not enable this mode for real users’ private records without a clear consent flow and a privacy policy.

The `guided-ai` Edge Function uses an OpenAI-compatible HTTP format. Gemini supports this compatibility endpoint.

Install the Supabase CLI if needed, then run from the repository root:

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
```

Create a Gemini API key in Google AI Studio, then set secrets. Never put this key in `.env.local`, browser code, GitHub, or a screenshot.

```bash
npx supabase secrets set AI_API_KEY=YOUR_GEMINI_API_KEY
npx supabase secrets set AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
npx supabase secrets set AI_MODEL=gemini-3.5-flash-lite
npx supabase functions deploy guided-ai
```

Then enable the browser-side switch in `.env.local` and Cloudflare Pages environment variables:

```text
VITE_GUIDED_AI_ENABLED=true
```

The deployed function has daily limits: 3 new AI guides and 20 step-help requests per user.

## 4. Local frontend configuration

Create `.env.local` at the repository root:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Leave false for the private starter-guide beta.
VITE_GUIDED_AI_ENABLED=false
```

Use only a Supabase **Publishable** key here. Never use a `service_role` or secret key in the browser.

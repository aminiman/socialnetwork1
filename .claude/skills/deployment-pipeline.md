# Skill: deployment-pipeline
> How to set up and maintain the Vercel + GitHub + Supabase deploy pipeline.
> Read this during Phase 0. The goal: something live within the first 10 minutes.

---

## Core Principle: Deploy Shell First

**The most common interview mistake is deploying last.**
Deployment issues (env vars, build errors, CORS) eat 20-30 minutes if you hit them at minute 90.
Deploy a blank app at minute 5. Every commit after that auto-deploys.

---

## Phase 0 Deploy Sequence

Execute in this exact order:

```bash
# 1. Scaffold
npx create-next-app@latest loan-intake-portal \
  --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd loan-intake-portal

# 2. Drop your config files
# Copy CLAUDE.md, plan.md, and .claude/ folder into project root

# 3. Install Supabase deps
npm install @supabase/supabase-js @supabase/ssr

# 4. Create .env.local (fill in from Supabase dashboard → Settings → API)
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
EOF

# 5. Verify .env.local is gitignored (create-next-app adds this, but verify)
grep ".env.local" .gitignore

# 6. Init git and push
git init
git add .
git commit -m "chore: initial scaffold with supabase deps"
git remote add origin https://github.com/[your-username]/loan-intake-portal.git
git push -u origin main

# 7. Deploy to Vercel
# Go to vercel.com → New Project → Import from GitHub → select repo
# Vercel auto-detects Next.js — no config needed
# Add env vars in Vercel dashboard before clicking Deploy:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY

# 8. Verify public URL loads (should show Next.js default page)
# Commit: "chore: vercel deploy shell live — [public-url]"
```

**Target: public URL live within 10 minutes of first commit.**

---

## Environment Variables — Complete Reference

### Required variables
| Variable | Scope | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase dashboard → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase dashboard → Settings → API → service_role secret |

### Where to set them
| Environment | Location |
|---|---|
| Local dev | `.env.local` (never commit) |
| Vercel production | Vercel dashboard → Project → Settings → Environment Variables |
| Vercel preview | Same place — set for "Preview" environment too |

### Critical rules
- `NEXT_PUBLIC_*` prefix = exposed to the browser. Only use for non-sensitive values.
- `SUPABASE_SERVICE_ROLE_KEY` has NO `NEXT_PUBLIC_` prefix — server only.
- If you reference `SUPABASE_SERVICE_ROLE_KEY` in a file with `'use client'`, it will be `undefined` in production and your build will silently break.

### Verification check
```typescript
// Add this to a Route Handler temporarily to verify env vars are set in Vercel
// DELETE before the review session
export async function GET() {
  return Response.json({
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
// Expected: { url: true, anon: true, service: true }
```

---

## Continuous Deploy — How It Works

Once Vercel is connected to GitHub:
- Every push to `main` → auto-deploys to production URL
- Every push to other branches → creates a preview URL

**You never need to manually redeploy.** Just `git push` and Vercel handles it.

```bash
# Standard commit flow after each phase
git add .
git commit -m "feat: borrower document upload flow"
git push

# Vercel deploys automatically — check status at vercel.com/[your-project]
# Production URL stays the same across all deploys
```

---

## Supabase CORS Configuration

If you see CORS errors after deploying to Vercel:

1. Go to Supabase dashboard → Authentication → URL Configuration
2. Add your Vercel URL to **Site URL**: `https://loan-intake-portal.vercel.app`
3. Add to **Redirect URLs**: `https://loan-intake-portal.vercel.app/**`
4. For Storage CORS: Supabase Storage → Policies → CORS policy (usually not needed for signed URLs)

**Do this immediately after getting your Vercel URL in Phase 0.**
Forgetting this causes auth redirects to fail in production even when localhost works.

---

## Commit Strategy

Small, frequent commits protect you. One commit at the end means one giant
debugging session if deploy breaks.

```bash
# Phase 0
git commit -m "chore: initial scaffold with supabase deps"
git commit -m "chore: vercel deploy shell live"

# Phase 1
git commit -m "feat: database schema and RLS policies"
git commit -m "feat: auth pages — login and register with role selection"
git commit -m "feat: middleware route protection"

# Phase 2
git commit -m "feat: borrower document upload to supabase storage"
git commit -m "feat: officer review queue with approve and flag actions"

# Phase 3
git commit -m "feat: realtime document status updates for borrower"
git commit -m "fix: loading states and empty states across all views"
git commit -m "chore: remove console.logs, pre-review cleanup"
```

---

## Pre-Review Deploy Verification

Run through this checklist on the **production URL** (not localhost) before the review:

- [ ] `/login` loads and accepts credentials
- [ ] Register as a borrower → redirects to `/dashboard`
- [ ] Register as a loan officer → redirects to `/officer`
- [ ] Borrower can upload a file → appears in document list with `pending` status
- [ ] Loan officer can see the uploaded document in the queue
- [ ] Loan officer can approve → borrower status badge updates (realtime)
- [ ] Loan officer can flag with a note → borrower sees `flagged` status
- [ ] Unauthorized access to `/officer` as a borrower → redirects to `/dashboard`
- [ ] Unauthenticated access to any protected route → redirects to `/login`

**If any of these fail on the production URL but work on localhost:**
→ Almost always an env var issue. Check Vercel dashboard → Functions logs for the error.

---

## Common Deployment Failures and Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails with `Module not found` | Missing npm install or wrong import path | Check `@/*` alias in tsconfig, run `npm install` |
| Auth redirects loop on production | Supabase site URL not set | Add Vercel URL to Supabase Auth → URL Configuration |
| `undefined` service role key | Used `SUPABASE_SERVICE_ROLE_KEY` in client component | Move to Route Handler |
| Storage uploads work locally, fail in prod | CORS or missing env var | Check Vercel env vars, check Storage bucket policies |
| 500 on Route Handler | Unhandled error or missing env var | Check Vercel → Functions → Logs for stack trace |
| Realtime not firing in prod | Supabase Realtime not enabled for table | Supabase dashboard → Database → Replication → enable for `documents` table |
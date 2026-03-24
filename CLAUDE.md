# CLAUDE.md — Social Network 1.0
> Cadre AI  Project | Read this file before every task.
> Think: Facebook circa 2004. Auth, profiles, posts, feed.

---

## Project Overview

A minimal social network where:
- **Users** sign up, create a profile, and post status updates
- **Feed** shows all posts from all users sorted by newest first (global feed)
- **Stretch** — follow users, like posts, comments

**Build plan:** See `plan.md` — follow phases in order. Do not skip ahead.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (avatar images — stretch) |
| Deploy | Vercel (auto-deploy on push to main) |

---

## File Structure Conventions

```
/app
  /login          — public route
  /register       — public route
  /feed           — global feed (protected)
  /profile
    /[username]   — public profile page
    /edit         — edit own profile (protected)
/components
  /ui             — generic reusable (Button, Avatar, Card)
  /posts          — PostCard, PostComposer, PostFeed
  /profile        — ProfileHeader, ProfileInfo
/lib
  supabase.ts         — browser client
  supabase-server.ts  — server client
  types.ts            — all TypeScript interfaces
  utils.ts            — shared helpers (formatDate, etc.)
/reports              — milestone reports per phase
middleware.ts         — route protection
```

---

## Coding Standards

### TypeScript
- No `any` types. Use types from `lib/types.ts`
- All async functions must have explicit return types
- Always destructure `{ data, error }` from Supabase and check `error` first

### Components
- Server Components by default
- Add `'use client'` only for: event handlers, useState, useEffect
- Props typed with a named interface, never inline

### Naming
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Database columns: `snake_case`

### Error Handling
- All DB operations wrapped in try/catch or error-checked
- User-facing errors shown as toast or inline message
- Never expose raw Supabase error messages in the UI

---

## What NOT To Do

- Do not use `getServerSideProps` — App Router only
- Do not leave `console.log` in production code
- Do not build features outside the current phase
- Do not skip RLS — every table must have it enabled
- Do not generate signed URLs on the client — use Route Handlers

---

## Subagent Protocol

Read `.claude/skills/agent-prompting.md` for exact invocation syntax.

| Agent | Run after |
|---|---|
| `architect-reviewer` | Phase 0, Phase 2 |
| `security-auditor` | Phase 1 |
| `code-reviewer` | Phase 3 |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Plan Mode Instructions

1. Read `plan.md` fully before writing any code
2. Work one phase at a time — meet exit criteria before moving on
3. Run subagent checkpoint at end of each phase
4. Generate milestone report before starting next phase
5. Commit to GitHub after each phase
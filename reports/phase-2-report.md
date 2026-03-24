# Phase 2 Report — Core MVP Features

**Completed:** 2026-03-24 12:20 PDT
**Time taken:** ~50 min of 45 min budgeted
**Status:** SLIGHTLY OVER BUDGET (+5 min for architect review fixes)

---

## What Was Built

Users can now write and submit text posts (up to 280 characters) from the feed page, with posts appearing instantly via optimistic UI and rolling back on failure. A global feed displays all posts from all users newest-first, joined with author profiles in a single query, and clicking an author's name navigates to their profile page. Profile pages show display name, username, bio, join date, post count, and all posts by that user, with an Edit Profile button visible only to the profile owner.

---

## Architecture Decisions

| Decision | Choice Made | Alternatives Considered | Reason |
|---|---|---|---|
| Feed component type | Client Component (useEffect fetch) | Server Component | Feed needs optimistic UI state for post composer — full Client Component was simpler than splitting composer out separately |
| Post join pattern | `select('*, profiles(*)')` single query | Separate profile fetch per post (N+1) | Avoids N+1, single Postgres round-trip |
| Profile page component type | Server Component | Client Component | No interactivity needed — Server Component gives better perf and simpler auth via `createServerSupabaseClient` |
| Optimistic UI | Prepend post immediately, rollback on error | No optimistic UI / server-confirm first | Perceived performance — Supabase insert is fast but latency is visible |
| Facebook 2004 layout | Blue navbar + left sidebar + grey bg | Minimal clean layout | User request — matches project "Facebook circa 2004" brief |

---

## Claude-Generated vs. Manually Modified

| Component | File | Source | Modification |
|---|---|---|---|
| Utility helpers | `lib/utils.ts` | Claude-generated | Accepted as-is |
| PostCard | `components/posts/post-card.tsx` | Claude-generated | Accepted as-is; updated styling after FB2004 layout request |
| PostComposer | `components/posts/post-composer.tsx` | Claude-generated | Modified: added `username` prop, implemented rollback callback after architect review |
| Feed page | `app/feed/page.tsx` | Claude-generated | Modified: added error handling and rollback handler after architect review |
| Profile page | `app/profile/[username]/page.tsx` | Claude-generated | Modified: added error handling, eliminated redundant query after architect review |
| Navbar | `components/ui/navbar.tsx` | Claude-generated | Accepted as-is |
| Root layout | `app/layout.tsx` | Claude + modified | Updated metadata and background color for FB2004 theme |

**Pattern summary:** Claude generated correct structure and join patterns but missed error handling on all Supabase queries — caught and fixed after architect-reviewer checkpoint. Optimistic UI was implemented but rollback was missing — also caught by architect-reviewer and fixed immediately.

---

## Subagent Findings

### Architect Review
**Verdict: PASS with fixes required**

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | Critical | Feed page doesn't check Supabase query errors | Fixed |
| 2 | Critical | Profile page doesn't check Supabase query errors | Fixed |
| 3 | Warning | Optimistic post not removed from UI on insert failure | Fixed |
| 4 | Warning | Profile page makes 3 queries — third redundant for own-profile view | Fixed |
| 5 | Suggestion | Empty `username` in optimistic post causes missing @username until refresh | Fixed |
| 6 | Pass | Join pattern `select('*, profiles(*)')` — no N+1 queries | N/A |

### Security Audit
Not run this phase — ran in Phase 1. No new auth or RLS changes introduced.

### Code Review
Not run this phase — scheduled for Phase 3.

**Issues resolved this phase:** All 5 architect-reviewer findings fixed before end of phase.
**Issues carried forward:** None.

---

## Scope Cuts This Phase

| Feature | Why Cut | When to Add |
|---|---|---|
| Edit profile page | Phase 3 scope per plan.md | Phase 3 |
| Delete post | Phase 3 scope per plan.md | Phase 3 |
| Loading skeletons | Phase 3 scope per plan.md | Phase 3 |
| Pagination | Explicitly deferred — 50 post limit sufficient for demo | Post-launch |
| Real-time feed | Explicitly deferred — manual refresh sufficient | Post-launch |

---

## Commit Hash
```
70520ec fix: error handling, optimistic rollback, and query optimization
```

---

## Next Phase
**Starting:** Phase 3 — Polish + Edge Cases
**First task:** Loading skeletons on feed and profile page
**Risk:** Edit profile page requires a new route (`/profile/edit`) and a protected form — if this runs long, cut it first per plan.md instructions.

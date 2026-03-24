# Build Plan — Social Network 1.0
> Cadre AI Interview | Next.js + Supabase + Vercel
> Think: Facebook circa 2004. Auth, profiles, posts, feed.
> Clock starts on first `git commit`. Target: deployed MVP in 90 min.

---

## Scope Decision (pre-code, 5 min)

**What "social network 1.0" means for this MVP:**
- Users sign up with email/password and pick a username
- Profile page: display name, bio, username, post count
- Post composer: text-only status updates (max 280 chars)
- Feed: all posts from all users, newest first, with author name + username
- Clicking an author name goes to their profile

**Explicit stretch (only if Phase 3 finishes early):**
- Follow/unfollow users
- Like posts (heart button + count)
- Comments on posts

**Explicitly deferred — say these out loud in the review:**
- Photo/video uploads
- Real-time feed updates
- Notifications
- Search
- Privacy settings
- Direct messages

> Clarify with interviewer before coding: "Is the feed global (all users) or
> follow-based?" Assume global unless told otherwise.

---

## Phase 0: Setup + Deploy Shell (10 min)
> Goal: Public URL live before any features exist.

- [ ] Confirm Next.js scaffold is in place (`npx create-next-app` already done)
- [ ] Create `lib/supabase.ts` (browser client)
- [ ] Create `lib/supabase-server.ts` (server client)
- [ ] Add `.env.local` with Supabase credentials
- [ ] Deploy blank app to Vercel, add env vars in Vercel dashboard
- [ ] Verify public URL returns 200
- [ ] First commit: `"chore: scaffold and deploy shell live"`

**Exit criteria:** Public URL loads. Supabase client connects.

---

### Subagent Checkpoint — Phase 0

```
/subagent architect-reviewer
Task: Verify scaffold and Supabase SSR client setup before Phase 1.
Scope: lib/supabase.ts, lib/supabase-server.ts, middleware.ts
Context: Using @supabase/ssr with createBrowserClient and createServerClient.
Middleware will protect all routes except /login and /register.
Skip: Data model and features — not built yet.
Output: Pass/fail on SSR client setup + anything to fix before Phase 1.
```

---

## Phase 1: Data Model + Auth (15 min)
> Goal: Schema live in Supabase, RLS locked down, auth working end-to-end.

### Database Tables

```sql
-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users(id) primary key,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Posts
create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  content text not null check (char_length(content) <= 280),
  created_at timestamptz default now()
);

-- Follows (stretch)
create table follows (
  follower_id uuid references profiles(id) not null,
  following_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Likes (stretch)
create table likes (
  user_id uuid references profiles(id) not null,
  post_id uuid references posts(id) not null,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
```

### RLS Policies

```sql
-- Profiles: public read, owner write
alter table profiles enable row level security;
create policy "profiles_public_read" on profiles for select using (true);
create policy "profiles_owner_update" on profiles for update using (auth.uid() = id);

-- Posts: public read, owner insert/delete
alter table posts enable row level security;
create policy "posts_public_read" on posts for select using (true);
create policy "posts_owner_insert" on posts for insert with check (auth.uid() = user_id);
create policy "posts_owner_delete" on posts for delete using (auth.uid() = user_id);

-- Follows (stretch)
alter table follows enable row level security;
create policy "follows_public_read" on follows for select using (true);
create policy "follows_owner_insert" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_owner_delete" on follows for delete using (auth.uid() = follower_id);

-- Likes (stretch)
alter table likes enable row level security;
create policy "likes_public_read" on likes for select using (true);
create policy "likes_owner_insert" on likes for insert with check (auth.uid() = user_id);
create policy "likes_owner_delete" on likes for delete using (auth.uid() = user_id);
```

### TypeScript Types (`lib/types.ts`)

```typescript
export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile  // joined
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface Like {
  user_id: string
  post_id: string
  created_at: string
}
```

### Auth Pages
- [ ] `/app/login/page.tsx` — email/password login form
- [ ] `/app/register/page.tsx` — signup with username + display name
- [ ] Auto-create profile row on signup (client-side after `signUp` succeeds)
- [ ] `middleware.ts` — protect all routes except `/login` and `/register`

**Exit criteria:** Can register with username. Profile row created. Session persists.
RLS blocks unauthenticated writes.

---

### Subagent Checkpoint — Phase 1

```
/subagent security-auditor
Task: Audit RLS policies and auth configuration created in Phase 1.
Scope: All SQL run in Supabase dashboard, middleware.ts, app/register/page.tsx
Context: Two tables in MVP: profiles and posts. Profiles are public read.
Posts are public read but only owner can insert/delete. No role system —
all users are equal. Follows and likes tables created but not wired up yet.
Skip: Follow/like features (stretch), upload flow (deferred).
Output: Pass/fail per RLS check. Flag any policy that allows
unauthenticated writes or cross-user data modification.
```

---

## Phase 2: Core MVP Features (45 min)
> Goal: Auth user can post, anyone can see the feed, profiles are viewable.

### Feature 1 — Post Composer (15 min)

**Location:** Top of `/app/feed/page.tsx` or extracted to `components/posts/post-composer.tsx`

- [ ] Textarea with 280 char limit + live character counter
- [ ] Submit button — disabled when empty or over limit
- [ ] On submit: insert to `posts` table, clear textarea, prepend post to feed
- [ ] Optimistic UI — post appears immediately, rolls back on error
- [ ] Show author's display name + username + relative timestamp on each post

### Feature 2 — Global Feed (15 min)

**Route:** `/app/feed/page.tsx` (Server Component, fetches on load)

- [ ] Query posts joined with profiles, ordered by `created_at desc`
- [ ] Render `PostCard` per post: avatar placeholder, display name, @username, content, timestamp
- [ ] Clicking display name → `/profile/[username]`
- [ ] Empty state: "No posts yet — be the first to post"
- [ ] Limit to 50 posts (no pagination needed for MVP)

### Feature 3 — Profile Page (15 min)

**Route:** `/app/profile/[username]/page.tsx` (Server Component)

- [ ] Fetch profile by username
- [ ] Show: display name, @username, bio, joined date, post count
- [ ] Show all posts by this user, newest first
- [ ] 404 if username not found (`notFound()`)
- [ ] Edit profile button — only visible to profile owner

**Exit criteria:** Post composer works. Feed shows all posts with author info.
Profile page loads by username. Clicking author name in feed goes to their profile.

---

### Subagent Checkpoint — Phase 2

```
/subagent architect-reviewer
Task: Review post composer, feed query, and profile page architecture.
Scope: app/feed/page.tsx, app/profile/[username]/page.tsx,
components/posts/, lib/types.ts
Context: Feed is a Server Component that fetches posts joined with profiles.
Post composer is a Client Component with optimistic UI — inserts to Supabase
directly from client using anon key (RLS allows authenticated insert).
Profile page uses dynamic route [username], fetches by username column.
Skip: Follow/like features, edit profile (stretch), notifications (deferred).
Output: Flag any N+1 queries in feed, check join is done correctly,
verify optimistic UI has rollback. Scale assessment required.
```

---

## Phase 3: Polish + Edge Cases (20 min)

- [ ] Loading skeletons on feed and profile page
- [ ] Error states on post submit failure
- [ ] Empty state on profile with no posts: "No posts yet"
- [ ] Character counter turns red at 260+ chars
- [ ] Relative timestamps ("2 minutes ago" not raw ISO string)
- [ ] Basic responsive layout — readable on mobile
- [ ] Delete own post (trash icon on PostCard, only visible to owner)
- [ ] Edit profile page (`/profile/edit`) — update display name and bio

---

### Subagent Checkpoint — Phase 3

```
/subagent code-reviewer
Task: Full code quality pass before final deploy.
Scope: All files in app/ and components/. Focus on async error handling,
TypeScript types, optimistic UI rollback, debug artifacts.
Context: Post composer uses optimistic UI. Feed is Server Component.
Profile page uses dynamic routing. Delete post is client-side with
immediate UI removal.
Skip: Stretch features not yet built.
Output: Grade (A/B/C/D) + top 3 issues to fix before review session
+ AI-generated code patterns detected.
```

---

## Phase 4: Stretch Goals (remaining time only)

- [ ] **Follow/unfollow** — follow button on profile page, follower/following counts
- [ ] **Likes** — heart button on PostCard with count, toggles on click
- [ ] **Comments** — comment count on PostCard, expand to show/add comments
- [ ] **Follow-based feed** — toggle between "Everyone" and "Following" on feed page
- [ ] **Avatar upload** — Supabase Storage, displayed in PostCard and profile

---

## Scope Cuts (say these out loud in the review)

| Cut | Why | When |
|---|---|---|
| Real-time feed | Adds complexity, polling or manual refresh is fine for demo | Post-launch |
| Photo uploads | Storage setup takes 20+ min, text posts sufficient | Stretch |
| Notifications | Out of scope for 1.0 | Never for this build |
| Search | Requires full-text index setup | Post-launch |
| Privacy settings | All posts public — fine for Facebook 2004 model | Post-launch |
| Direct messages | Separate product surface | Never for this build |
| Pagination | 50 post limit is fine for demo | Post-launch |

---

## Time Budget

| Phase | Budget | Hard stop |
|---|---|---|
| Phase 0: Setup + Deploy | 10 min | 0:10 |
| Phase 1: Data Model + Auth | 15 min | 0:25 |
| Phase 2: Core Features | 45 min | 1:10 |
| Phase 3: Polish | 20 min | 1:30 |
| Phase 4: Stretch | Remaining | 2:00 |

> If Phase 2 runs long, cut edit profile from Phase 3 first.
> Never cut the feed or post composer — those are the core demo.

---

## Review Talking Points

1. **Why global feed vs follow-based?** — Simpler data model, faster to ship,
   follows the actual Facebook 2004 model where the feed was everyone
2. **Why optimistic UI on post composer?** — Perceived performance,
   Supabase insert is fast but latency is visible without it
3. **Why public read RLS on posts?** — Profiles are a social product,
   public by default matches user expectation and simplifies queries
4. **What breaks first at scale?** — Feed query does a full table scan on posts
   joined with profiles — fix with index on `posts.created_at desc` and pagination
5. **Demo to production gap?** — Add Sentry for error monitoring, rate limit
   the post insert endpoint, add content moderation for public posts
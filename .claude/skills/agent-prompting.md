# Skill: agent-prompting
> How to invoke subagents, pass context, and consume their output correctly.
> Read this before invoking any agent in this project.

---

## The Mental Model

Skills = knowledge. Agents = reviewers who use that knowledge.
The quality of an agent run is determined entirely by how well you brief it.
A vague invocation gets vague output. A scoped invocation with full context gets actionable findings.

---

## How to Invoke an Agent

### Basic syntax
```
/subagent [agent-name]
Task: [one sentence — what specifically to check]
Scope: [which files, phase, or feature to focus on]
Context: [any decisions made this phase the agent should know about]
Skip: [anything explicitly out of scope]
Output: [what format you want back]
```

### Full invocation template (copy-paste this)
```
/subagent architect-reviewer
Task: Review the document upload flow and officer review queue built in Phase 2.
Scope: app/dashboard/page.tsx, app/officer/page.tsx, lib/supabase.ts, any Route Handlers created this phase.
Context: Files go to Supabase Storage at {user_id}/{application_id}/{filename}. Metadata in postgres documents table. Signed URLs generated via Route Handler. Optimistic UI used on officer status updates.
Skip: Auth flow (reviewed Phase 1), notifications (Phase 3 scope), anything in plan.md marked as deferred.
Output: Severity-rated findings (critical / warning / suggestion) + scale assessment + overall verdict.
```

---

## Agent Invocation by Phase

Use these exact invocations at each checkpoint in plan.md:

### Phase 0 checkpoint → architect-reviewer
```
/subagent architect-reviewer
Task: Verify project scaffold and Supabase connection are set up correctly for SSR.
Scope: lib/supabase.ts, lib/supabase-server.ts, middleware.ts, next.config.ts
Context: Using @supabase/ssr with createBrowserClient and createServerClient. Middleware protects all routes except /login and /register.
Skip: Data model (not built yet), features (not built yet).
Output: Pass/fail on SSR client setup + any structural issues to fix before Phase 1.
```

### Phase 1 checkpoint → security-auditor
```
/subagent security-auditor
Task: Audit all RLS policies and auth configuration created in Phase 1.
Scope: All SQL migration files, supabase/migrations/, any seed files. Also middleware.ts.
Context: Three tables: profiles, loan_applications, documents. Two roles: borrower and loan_officer stored in profiles.role. Borrowers see only their own rows. Loan officers see all rows. Storage bucket loan-documents is private.
Skip: Upload flow (Phase 2), notifications (Phase 3).
Output: Pass/fail per RLS check using the security-auditor checklist. Flag any policy that allows cross-user data access or role self-promotion.
```

### Phase 2 checkpoint → architect-reviewer (second pass)
```
/subagent architect-reviewer
Task: Review upload flow atomicity, signed URL generation, and officer queue query patterns.
Scope: app/dashboard/, app/officer/, app/api/ (any Route Handlers), components/documents/
Context: Upload writes to Storage first then inserts to documents table — not atomic. Signed URLs generated in Route Handler using service role. Officer queue uses optimistic UI — status updates locally before server confirms.
Skip: RLS (audited Phase 1), notifications (Phase 3), anything in scope cuts.
Output: Flag the non-atomic upload as a known trade-off or recommend a fix. Check for N+1s in officer queue. Scale assessment required.
```

### Phase 3 checkpoint → code-reviewer
```
/subagent code-reviewer
Task: Full code quality pass across all files touched in Phases 1-3 before final deploy.
Scope: All files in app/, components/, lib/. Focus on async error handling, useEffect cleanup, TypeScript types, debug artifacts.
Context: Realtime subscription added in Phase 3 on documents table filtered by borrower_id. Must be unsubscribed on unmount. Optimistic UI on officer actions must roll back on error.
Skip: Test files, config files (next.config, tailwind, tsconfig).
Output: Grade (A/B/C/D) + top 3 issues to fix before the review session + AI-generated code patterns detected.
```

---

## How to Pass Context Between Agents

When one agent's output affects the next agent's scope, carry findings forward explicitly:

```
/subagent code-reviewer
Task: [your task]
Scope: [your scope]
Context: [your context]
Carry-forward from security-auditor: RLS policies passed all checks. One warning flagged — profiles.role is not blocked from self-update via RLS. This is a known gap, do not re-flag it.
Carry-forward from architect-reviewer: N+1 query found in officer queue — fixed by joining documents with profiles in single query. Verify the fix is in place.
Output: [your output format]
```

This prevents agents from re-flagging resolved issues and keeps reports non-redundant.

---

## How to Consume Agent Output

### What to do with Critical findings
Fix immediately before moving to the next phase. Do not defer criticals.

### What to do with Warnings
Fix if < 10 minutes. Defer to scope cuts if > 10 minutes — document the trade-off in the milestone report.

### What to do with Suggestions
Log in milestone report under "Scope Cuts This Phase." Do not act on them during the build.

### What NOT to do
- Do not ask an agent to "review everything" — they will produce low-signal output
- Do not invoke the same agent twice on the same scope without changed context
- Do not skip the carry-forward step when chaining agents — redundant findings waste time

---

## Agent Output → Milestone Report Pipeline

After each agent run, immediately pipe findings into the milestone report:

```
/milestone-report [N] "[phase name]"
```

The milestone-report command will pull the agent outputs from this session automatically.
If it misses any findings, paste them manually into the Subagent Findings section.

---

## Decision Rules: Which Agent for What

| Situation | Use |
|---|---|
| About to start a new phase, want to verify the scaffold is sound | `architect-reviewer` |
| Just wrote schema + RLS, want to verify no data leaks | `security-auditor` |
| Just built a feature, want to check query patterns and data flow | `architect-reviewer` |
| About to deploy, want a final code quality pass | `code-reviewer` |
| Something feels off about auth or storage permissions | `security-auditor` |
| Unsure if you introduced a regression | `code-reviewer` scoped to changed files |

---

## Common Mistakes to Avoid

- **Too broad a scope**: "review the whole app" → agent output is shallow and unfocused
- **No context on decisions**: agent will flag intentional trade-offs as bugs
- **Forgetting to carry forward**: agent re-flags already-resolved issues, wastes time reading
- **Acting on suggestions during the build**: suggestions are post-launch improvements, not blockers
- **Invoking agents before the phase is complete**: partial code produces noisy findings
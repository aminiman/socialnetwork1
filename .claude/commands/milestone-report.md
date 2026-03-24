# Command: /milestone-report

## Usage
```
/milestone-report [phase-number] [phase-name]
```

Example:
```
/milestone-report 2 "Core MVP Features"
```

## What This Command Does
Generates a structured milestone report and writes it to `/reports/phase-{N}-report.md`.

## Instructions for Claude Code

When this command is invoked, do the following:

1. **Read the current state of the codebase** — scan files modified in this phase
2. **Read the subagent outputs** — look for any findings already logged in this session
3. **Generate the report** using the template below
4. **Write it to** `/reports/phase-{N}-report.md` where N is the phase number provided
5. **Confirm** the file was written and show the path

## Report Template

```markdown
# Phase [N] Report — [Phase Name]

**Completed:** [current timestamp]
**Time taken:** [estimated X min] of [budgeted Y min per plan.md]
**Status:** [ON TRACK / OVER BUDGET / UNDER BUDGET]

---

## What Was Built

[2-3 sentence narrative of what was implemented this phase. Be specific about
features, not just files. "Borrowers can now upload PDFs to Supabase Storage
and see their document status update in real time" — not "built upload component."]

---

## Architecture Decisions

| Decision | Choice Made | Alternatives Considered | Reason |
|---|---|---|---|
| [decision] | [what was built] | [what else could have been done] | [why this way] |

---

## Claude-Generated vs. Manually Modified

| Component | File | Source | Modification |
|---|---|---|---|
| [component name] | [file path] | Claude-generated / Manual / Claude + modified | [what was changed and why, or "accepted as-is"] |

**Pattern summary:** [e.g. "Claude generated correct structure but missed error handling on all async calls — added manually throughout"]

---

## Subagent Findings

### Architect Review
[Paste architect-reviewer output here, or "Not run this phase"]

### Security Audit
[Paste security-auditor output here, or "Not run this phase"]

### Code Review
[Paste code-reviewer output here, or "Not run this phase"]

**Issues resolved this phase:** [list any findings that were immediately fixed]
**Issues carried forward:** [list any findings deferred to next phase or scope cuts]

---

## Scope Cuts This Phase

| Feature | Why Cut | When to Add |
|---|---|---|
| [feature] | [time / complexity / out of scope] | [stretch goal / never / next phase] |

---

## Commit Hash
[git log --oneline -1 output here]

---

## Next Phase
**Starting:** Phase [N+1] — [name]
**First task:** [first checklist item from plan.md for next phase]
**Risk:** [anything from this phase that could slow down the next one]
```

## Notes
- Be honest about time. If Phase 2 took 60 min instead of 45, say so.
- The "Claude-Generated vs. Manually Modified" table is the most important section for the interview review — interviewers will ask about it directly.
- If a subagent wasn't run, write "Not run this phase" — don't skip the section.
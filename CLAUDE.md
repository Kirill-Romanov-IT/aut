# CLAUDE.md — Project Instructions (CRM + AI Calling Bot)

## 0) TL;DR (What to do when there is no конкретной задачи)
When I say “доделать / улучшить / не знаю что дальше”:
1) Read repo structure and current TODOs.
2) Propose 3–7 next best tasks with impact/effort.
3) Pick the smallest “walking skeleton” improvement first.
4) Implement in small, reviewable commits with tests where possible.

---

## 1) Product context
We are building a CRM system connected to an AI voice-calling bot:
- CRM manages companies/leads, pipeline/kanban stages, tasks, notes, call schedules.
- Bot/AI makes outbound calls, logs results, updates CRM status and next actions.

Primary goal: reliable lead pipeline + automation of outbound calling + clear operator UI.

---

## 2) Core principles
- **Stability first:** no breaking changes without migration plan.
- **Small diffs:** prefer incremental PRs, minimal risk.
- **Traceability:** every behavior change must be tied to a reason and a test or manual check steps.
- **Consistency:** follow existing conventions in the repo.

---

## 3) Operating mode (Claude Code workflow)
### Before you change anything
1) Identify stack, entry points, and data flow.
2) Locate “source of truth” for entities (Company, Lead, Call, Task, Stage).
3) Confirm how frontend talks to backend (REST/GraphQL), auth, and env config.

### When implementing
- Make a short plan (3–6 steps).
- Touch the smallest number of files.
- Keep functions small and name things clearly.
- Add logs/telemetry where it helps debug calling flows.

### After implementing
- Provide:
  - What changed (files + summary)
  - How to run/test (commands)
  - Edge cases / limitations
  - Rollback note (if relevant)

---

## 4) Repository conventions (fill as you discover)
When you inspect the repo, maintain this section by updating it:
- Backend language/framework:
- Frontend framework:
- DB:
- Queue/worker:
- AI provider(s):
- Deployment:
- Local dev commands:

If you don’t know yet, discover by reading:
- README / Makefile / package.json / pyproject / docker-compose / .env.example

---

## 5) Data model expectations (conceptual)
### Entities
- Company (name, domain, location, size, tags, status)
- Contact (name, role, phone, email)
- Lead/Opportunity (company_id, stage_id, value, owner, priority)
- Stage (kanban/pipeline)
- Call (scheduled_at, attempt_no, outcome, transcript, recording_url, bot_run_id)
- Task (type, due_at, status, assigned_to)
- Note / Activity log

### Rules (expected behaviors)
- A company should exist once in the master list; kanban items reference it, not duplicate it.
- Calls must be idempotent: same bot_run_id must not create duplicates.
- Status changes must write an activity log entry.
- Any automatic movement across stages must be explainable (reason + timestamp).

---

## 6) AI / Bot integration rules
- Treat AI calls as **external dependency**:
  - wrap in a client module/service
  - timeouts + retries
  - clear error mapping to user-friendly messages
- Log:
  - prompt version
  - model name
  - tokens/cost if available
  - correlation id / bot_run_id
- Store outputs with safe limits:
  - transcripts can be large → truncate in UI, full text in DB/storage
- Never hardcode API keys; always use env vars.

---

## 7) Security & privacy
- Do not log PII in plain text unless required (phones/emails).
- Redact secrets in logs.
- Validate and sanitize all user input.
- Server must enforce permissions (UI is not security).

---

## 8) Testing strategy (pragmatic)
Minimum per change:
- Backend: unit tests for core logic or at least API smoke test instructions.
- Frontend: basic UI sanity steps + state transitions check.
- If tests are hard due to env: provide a manual test checklist.

---

## 9) UI/UX rules
- Keep actions predictable: right-click and browser menus should be disabled only if it improves UX.
- Confirm destructive actions.
- Show loading + error states for AI calls.
- Prefer “operator friendly”: clear labels, timestamps, next action suggestions.

---

## 10) Output format expectations (what I want from Claude Code)
When you respond:
- Start with a concise plan.
- Then implement.
- End with:
  - ✅ What to verify locally
  - 🧪 Tests run / not run (and why)
  - 📌 Follow-up suggestions (max 5)

---

## 11) Quick checklist for “agentic” tasks
If the task involves pipelines/kanban/calls:
- [ ] No duplicate rows/entities
- [ ] Idempotency in bot callbacks
- [ ] Activity log updated
- [ ] Next call scheduling logic consistent
- [ ] UI reflects backend truth (refresh + optimistic updates safe)

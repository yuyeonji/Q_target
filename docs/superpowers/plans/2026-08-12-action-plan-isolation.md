# Action Plan Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save each management target's current action plan and tasks independently, only when the approval-save button is pressed.

**Architecture:** Keep `action_plans` as history records and make the latest selected plan editable through a validated PATCH endpoint. The UI opens a target with an empty task draft or that target's latest plan; only the approval-save action writes the entire draft to the selected plan.

**Tech Stack:** React/Vinext, TypeScript, Neon PostgreSQL, Drizzle ORM, Node test runner.

## Global Constraints

- `+ 신규 과제 추가` must not issue a write request; `저장 및 승인 요청` is the only write action.
- A plan update must verify both UUID plan ID and the selected target/alarm relation.
- Plan content and tasks must be updated atomically with an audit event.
- No connection string or `.dev.vars` content may be exposed or committed.
- F5 must render only the selected target's stored plan and tasks.

---

### Task 1: Persisted action-plan update API

**Files:**
- Modify: `lib/quality-repository.ts`
- Modify: `lib/route-handlers.mjs`
- Modify: `app/api/action-plans/route.ts`
- Modify: `lib/client-api.ts`
- Modify: `tests/api-routes.test.mjs`
- Modify: `tests/client-api.test.mjs`

- [ ] **Step 1: Write failing API tests**

```js
const response = await route.PATCH(new Request("http://app.local/api/action-plans/plan-1", {
  method: "PATCH", body: JSON.stringify({ targetId, tasks: [{ description: "TRG-8925 과제", owner: "담당자" }] }),
}), { params: Promise.resolve({ id: "plan-1" }) });
assert.equal(response.status, 200);
assert.equal(repository.createdPlans.length, 0);
assert.equal(repository.updatedPlans[0].tasks[0].description, "TRG-8925 과제");
```

- [ ] **Step 2: Run RED tests**

Run: `node --test tests/api-routes.test.mjs tests/client-api.test.mjs`

Expected: FAIL because action-plan PATCH and its client helper do not exist.

- [ ] **Step 3: Implement atomic update**

Implement `updateActionPlanWithAudit(id, relation, input, audit)` using a single `db.batch()` to update plan fields, delete only tasks belonging to the plan, insert replacement tasks, and create one audit event. Add `PATCH /api/action-plans/[id]` validation for UUID IDs and matching relation. Add `updateActionPlan` client helper.

- [ ] **Step 4: Run GREEN tests**

Run: `node --test tests/api-routes.test.mjs tests/client-api.test.mjs`

Expected: PASS for target isolation, malformed IDs, mismatched relation, and update-without-new-plan behavior.

### Task 2: Isolated action-plan UI flow

**Files:**
- Modify: `app/page.tsx`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Write failing UI contract tests**

```js
assert.match(pageSource, /const \[tasks, setTasks\] = useState<Task\[\]>\(\[\]\)/);
assert.match(pageSource, /persistedActionPlan \? await updateActionPlan\(/);
assert.doesNotMatch(addTaskBody, /saveActionPlan\(/);
```

- [ ] **Step 2: Run RED tests**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL because global example tasks are preloaded and saving always creates a plan.

- [ ] **Step 3: Implement selected-target-only state**

Initialize task drafts as empty. On target open, set task draft only from that target's latest API plan; retain no task state from the prior target. On approval save, call PATCH when a current plan exists and POST only when creating a new plan. Add an explicit new-plan action that clears selected-plan state; do not create plans from the task-add button.

- [ ] **Step 4: Run GREEN tests and build**

Run: `node --test tests/rendered-html.test.mjs tests/client-api.test.mjs`

Expected: PASS.

Run: `node_modules\\.bin\\vinext.cmd build`

Expected: exit code 0.

### Task 3: End-to-end regression verification

**Files:**
- Modify: `tests/final-review.test.mjs`

- [ ] **Step 1: Write target-isolation regression test**

```js
assert.match(pageSource, /reloadActionPlan\(\{ targetId: target.id \}\)/);
assert.match(pageSource, /persistedActionPlan \? await updateActionPlan/);
assert.doesNotMatch(pageSource, /const \[tasks, setTasks\] = useState<Task\[\]>\(\[\s*\{/);
```

- [ ] **Step 2: Run complete verification**

Run: `node --test tests/*.test.mjs`

Run: `node_modules\\.bin\\vinext.cmd build`

Run: `git diff --check`

Expected: all tests pass, build exits 0, diff check has no output.

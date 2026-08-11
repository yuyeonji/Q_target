# Full Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every create and update action in Q-Target to Neon PostgreSQL so a browser refresh always shows the saved value.

**Architecture:** Extend the existing Drizzle PostgreSQL schema and repository boundary with master-rule, master-code, and alarm-update support. Keep browser code as a client of typed JSON APIs: it waits for a successful write, then reloads the affected DB list instead of mutating only React state.

**Tech Stack:** React/Vinext, TypeScript, Cloudflare Workers runtime, Neon PostgreSQL, Drizzle ORM, Node test runner.

## Global Constraints

- Keep UUID primary keys and existing alarm/target/action-plan relationships intact.
- Use `DATABASE_URL` only through the existing Cloudflare worker environment binding; never expose a URL or secret to browser code or API responses.
- API validation returns 400 for invalid input, 404 for missing rows, and a generic 500 error without connection details for database failures.
- Every write records an audit event in the same `db.batch()` operation as its database mutation.
- Seed values are deterministic and conflict-safe; re-running the seed must not duplicate or overwrite arbitrary user-created rows.
- A browser list changes only after its API write succeeds, then reloads from the API.

---

## File Structure

- `db/schema.ts` — Drizzle definitions for `master_rules`, `master_codes`, and editable alarm fields.
- `drizzle/0004_full_persistence.sql` and `drizzle/meta/*` — PostgreSQL migration and Drizzle journal/snapshot metadata.
- `lib/seed.ts` — deterministic rule/code seed records and idempotent insert statements.
- `lib/quality-repository.ts` — database list/create/update operations using injectable DB/schema dependencies.
- `lib/route-handlers.mjs` — validated route handlers for alarms, targets, action plans, rules, and codes.
- `app/api/alarms/[id]/route.ts`, `app/api/master/rules/route.ts`, `app/api/master/rules/[id]/route.ts`, `app/api/master/codes/route.ts`, `app/api/master/codes/[id]/route.ts` — Cloudflare-bound API entrypoints.
- `lib/client-api.ts` — typed browser fetch helpers.
- `app/page.tsx` — invokes APIs for every saved action and reloads changed datasets after success.
- `tests/api-routes.test.mjs`, `tests/client-api.test.mjs`, `tests/neon-schema.test.mjs`, `tests/rendered-html.test.mjs` — runtime and source-level regression coverage.

## Task 1: Schema, seed data, and repository persistence

**Files:**
- Modify: `db/schema.ts`
- Create: `drizzle/0004_full_persistence.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `drizzle/meta/0004_snapshot.json`
- Modify: `lib/seed.ts`
- Modify: `lib/quality-repository.ts`
- Modify: `tests/neon-schema.test.mjs`
- Modify: `tests/api-routes.test.mjs`

**Interfaces:**
- Produces `masterRules` with `{ id, ruleCode, kind, name, scope, threshold, active }`.
- Produces `masterCodes` with `{ id, code, name, category, active }`.
- Produces repository methods `listMasterRules(kind)`, `createMasterRuleWithAudit(input, audit)`, `updateMasterRuleWithAudit(id, changes, audit)`, `listMasterCodes()`, `createMasterCodeWithAudit(input, audit)`, `updateMasterCodeWithAudit(id, changes, audit)`, and `updateAlarmWithAudit(id, changes, audit)`.

- [ ] **Step 1: Write failing schema and repository tests**

```js
assert.match(schemaSource, /export const masterRules = pgTable\("master_rules"/);
assert.match(schemaSource, /export const masterCodes = pgTable\("master_codes"/);
assert.match(schemaSource, /uniqueIndex\("master_rules_rule_code_unique"/);
assert.match(schemaSource, /uniqueIndex\("master_codes_code_unique"/);
await repository.updateAlarmWithAudit("alarm-1", { status: "종결", reviewer: "품질 검토팀" }, audit);
assert.equal(fakeDb.batches.at(-1).length, 2);
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test tests/neon-schema.test.mjs tests/api-routes.test.mjs`

Expected: FAIL because the master table exports and alarm repository mutation do not exist.

- [ ] **Step 3: Define schema, migration, seed, and atomic repository methods**

```ts
export const masterRules = pgTable("master_rules", {
  id: id(), ruleCode: text("rule_code").notNull(), kind: text("kind").notNull(),
  name: text("name").notNull(), scope: text("scope").notNull(),
  threshold: text("threshold").notNull(), active: boolean("active").notNull().default(true), createdAt: createdAt(),
}, (table) => [uniqueIndex("master_rules_rule_code_unique").on(table.ruleCode)]);

export const masterCodes = pgTable("master_codes", {
  id: id(), code: text("code").notNull(), name: text("name").notNull(),
  category: text("category").notNull(), active: boolean("active").notNull().default(true), createdAt: createdAt(),
}, (table) => [uniqueIndex("master_codes_code_unique").on(table.code)]);
```

Implement each repository write with `await db.batch([mutation, auditInsert])`; for updates use an `INSERT ... SELECT ... WHERE EXISTS` audit statement so a missing row does not create an orphan audit event. Seed only the deterministic screen examples with conflict targets on `rule_code` or `code`.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --test tests/neon-schema.test.mjs tests/api-routes.test.mjs`

Expected: PASS and fake DB assertions confirm every new write awaits one batch containing mutation and audit statements.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts drizzle lib/seed.ts lib/quality-repository.ts tests/neon-schema.test.mjs tests/api-routes.test.mjs
git commit -m "feat: persist master data and alarm updates"
```

## Task 2: Validated APIs and typed client helpers

**Files:**
- Modify: `lib/route-handlers.mjs`
- Modify: `app/api/alarms/[id]/route.ts`
- Create: `app/api/master/rules/route.ts`
- Create: `app/api/master/rules/[id]/route.ts`
- Create: `app/api/master/codes/route.ts`
- Create: `app/api/master/codes/[id]/route.ts`
- Modify: `lib/client-api.ts`
- Modify: `tests/api-routes.test.mjs`
- Modify: `tests/client-api.test.mjs`

**Interfaces:**
- Consumes Task 1 repository methods.
- Produces `createAlarmDetailRouteHandlers(repository).PATCH(request, context)`.
- Produces rule and code GET/POST/PATCH handlers.
- Produces client functions `createTarget`, `updateAlarm`, `listMasterRules`, `createMasterRule`, `updateMasterRule`, `listMasterCodes`, `createMasterCode`, and `updateMasterCode`.

- [ ] **Step 1: Write failing route and client tests**

```js
const response = await createAlarmDetailRouteHandlers(fakeRepository).PATCH(
  new Request("http://app.local/api/alarms/a-1", { method: "PATCH", body: JSON.stringify({ status: "종결", reviewer: "품질 검토팀" }) }),
  { params: Promise.resolve({ id: "a-1" }) },
);
assert.equal(response.status, 200);
await client.createTarget({ name: "신규 항목", status: "대기", owner: "담당자 미지정", priority: "중간" });
assert.equal(calls[0][0], "/api/targets");
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `node --test tests/api-routes.test.mjs tests/client-api.test.mjs`

Expected: FAIL because route handlers and typed client helpers are absent.

- [ ] **Step 3: Add validated handlers and safe typed fetch helpers**

```js
// PATCH accepts only non-empty status/reviewer fields.
const changes = parseAlarmChanges(await readJson(request));
if (!changes) return json({ error: "수정할 알람 값이 필요합니다." }, { status: 400 });
const alarm = await repository.updateAlarmWithAudit(id, changes, audit);
if (!alarm) return json({ error: "알람을 찾을 수 없습니다." }, { status: 404 });
return json({ alarm });
```

Use `jsonRequest("POST", input)` and `jsonRequest("PATCH", input)` in `lib/client-api.ts`; keep generic user-safe errors and encode route IDs with `encodeURIComponent`.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --test tests/api-routes.test.mjs tests/client-api.test.mjs`

Expected: PASS for success, malformed request 400, missing rows 404, and generic 500 response behavior.

- [ ] **Step 5: Commit**

```bash
git add app/api lib/route-handlers.mjs lib/client-api.ts tests/api-routes.test.mjs tests/client-api.test.mjs
git commit -m "feat: add persistence APIs for all editable data"
```

## Task 3: Connect every UI save path to persisted data

**Files:**
- Modify: `app/page.tsx`
- Modify: `tests/client-api.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes Task 2 client functions.
- Produces one `reloadPersistedData()` callback that fetches alarms, targets, rules, and codes together.
- Produces API-backed New Case, alarm status, action-plan, rule, and code save flows.

- [ ] **Step 1: Write failing UI contract tests**

```js
assert.match(pageSource, /await createTarget\(/);
assert.match(pageSource, /await updateAlarm\(/);
assert.match(pageSource, /await createMasterRule\(/);
assert.match(pageSource, /await updateMasterCode\(/);
assert.doesNotMatch(pageSource, /id: `TRG-\$\{Date\.now/);
```

- [ ] **Step 2: Run UI contract tests to verify they fail**

Run: `node --test tests/client-api.test.mjs tests/rendered-html.test.mjs`

Expected: FAIL because New Case and master controls currently mutate only React state.

- [ ] **Step 3: Replace local-only writes with API-success-then-reload flows**

```ts
const createNewCase = async (name: string, priority: string) => {
  try {
    await createTarget({ name, priority, status: "대기", owner: "담당자 미지정" });
    await reloadPersistedData();
    setNewCase(false);
    setView("targets");
    showNotice("관리대상 항목을 저장했습니다.");
  } catch {
    showNotice("저장에 실패했습니다. 다시 시도해 주세요.");
  }
};
```

Apply the same sequence to alarm action buttons, action-plan save, rule create/edit/active toggle, and code create/edit/active toggle. Preserve modal values on errors and do not call local list setters before a successful API call.

- [ ] **Step 4: Run UI contract tests to verify they pass**

Run: `node --test tests/client-api.test.mjs tests/rendered-html.test.mjs`

Expected: PASS and source contracts show all formerly local-only save paths invoke typed APIs.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx tests/client-api.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: persist all Q-Target save actions"
```

## Task 4: Full verification and migration handoff

**Files:**
- Modify: `tests/final-review.test.mjs`

**Interfaces:**
- Consumes all implementation from Tasks 1–3.
- Produces test coverage that asserts no local-only New Case ID generation and confirms all master/alarm persistence surfaces exist.

- [ ] **Step 1: Write final regression assertions**

```js
assert.match(schemaSource, /master_rules/);
assert.match(schemaSource, /master_codes/);
assert.match(pageSource, /await reloadPersistedData\(\)/);
assert.match(routeSource, /createAlarmDetailRouteHandlers/);
```

- [ ] **Step 2: Run assertions to verify they fail before missing coverage is added**

Run: `node --test tests/final-review.test.mjs`

Expected: FAIL until the final persistence contract is represented in the test file.

- [ ] **Step 3: Add only the missing regression assertions**

Keep tests independent of a real Neon connection. Check real route-handler calls with fake repositories and assert client helpers use the intended method and path.

- [ ] **Step 4: Run the complete verification suite**

Run: `node --test tests/*.test.mjs`

Expected: PASS.

Run: `node_modules\\.bin\\vinext.cmd build`

Expected: exit code 0.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add tests/final-review.test.mjs
git commit -m "test: cover full persistence workflow"
```

## Deployment Handoff

After merge, configure the current Neon connection in `.dev.vars` for local worker development, then run:

```powershell
npx drizzle-kit migrate
npm run db:seed
node_modules\.bin\vinext.cmd dev --port 4177
```

Create a new case, update an alarm, change a rule, and change a code. Reload after each action to confirm the API lists return the saved Neon values.

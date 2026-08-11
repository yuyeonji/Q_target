# Persist Demo Identifiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every existing demo alarm and management target after refresh by persisting the full set in Neon with its familiar display numbers.

**Architecture:** Retain UUID primary keys for relations, then add unique `alarmCode` and `targetCode` columns for screen-facing `AL-...` and `TRG-...` identifiers. Expand the idempotent development seed to all current screen records. Return the display codes through APIs and render them while retaining UUIDs for detail, update, and foreign-key calls.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL/Neon, Vinext/Cloudflare Workers, Node test runner.

## Global Constraints

- Do not reset, delete, or connect to the real Neon database during automated work.
- Do not log, store, or test with a filled `DATABASE_URL`.
- Preserve UUID relationships and the existing Sample Delay stages/action-plan data.
- Preserve current loading, fallback, filtering, pagination, drawer, and save behavior.
- Seed inserts must be rerun-safe and must not duplicate data.

---

### Task 1: Add display-code schema and complete deterministic seed data

**Files:**
- Modify: `db/schema.ts`, `lib/seed.ts`, `tests/neon-schema.test.mjs`, `tests/final-review.test.mjs`
- Create: a generated Drizzle migration and matching `drizzle/meta` snapshot

**Interfaces:**
- Produces `alarms.alarmCode` and `targets.targetCode` as non-null unique text columns.
- Produces a `developmentSeed` with four alarms and five targets, each carrying a deterministic UUID and display code.

- [ ] **Step 1: Write failing schema and seed tests**

Add assertions requiring `alarmCode: text("alarm_code").notNull()` and `targetCode: text("target_code").notNull()`, unique indexes for each code, and seed counts/codes.

```js
assert.match(schema, /alarmCode:\s*text\("alarm_code"\)\.notNull\(\)/);
assert.match(schema, /targetCode:\s*text\("target_code"\)\.notNull\(\)/);
assert.deepEqual(seed.developmentSeed.alarms.map((alarm) => alarm.alarmCode), ["AL-99198", "AL-99201", "AL-99202", "AL-99203"]);
assert.deepEqual(seed.developmentSeed.targets.map((target) => target.targetCode), ["TRG-8921", "TRG-8922", "TRG-8915", "TRG-8925", "TRG-8910"]);
```

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test tests/neon-schema.test.mjs tests/final-review.test.mjs`

Expected: FAIL because the two columns and complete seed codes do not exist.

- [ ] **Step 3: Implement the schema, migration, and seed**

Add the code columns and unique indexes to the Drizzle schema. Generate a migration that adds nullable columns, fills deterministic display codes for current seeded UUIDs, then makes columns non-null and unique so the existing Neon data remains intact. Extend `developmentSeed` with four alarms/five targets matching the existing page arrays; keep `AL-99198` connected to the Sample Delay stages and the existing action plan. Insert every seeded table with conflict-safe statements keyed by their primary IDs or stage composite key.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/neon-schema.test.mjs tests/final-review.test.mjs`

Expected: PASS. Run `npm run db:generate` to generate the migration; inspect that it contains display-code additions and unique indexes without a connection string.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- db/schema.ts lib/seed.ts drizzle tests/neon-schema.test.mjs tests/final-review.test.mjs
git commit -m "feat: persist complete demo records"
```

### Task 2: Return and render persisted display codes

**Files:**
- Modify: `lib/client-api.ts`, `app/page.tsx`, `tests/client-api.test.mjs`, `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes API records with `{ id: string, alarmCode: string }` and `{ id: string, targetCode: string }`.
- Produces UI `Alarm` / `Target` records that retain UUID IDs for actions and use display codes in all visible number fields.

- [ ] **Step 1: Write failing client-mapping tests**

Add mocked API data containing a UUID plus display codes. Assert the client types declare both fields and the page mapping assigns visible codes while keeping the UUID as `id`.

```js
assert.match(clientApi, /alarmCode:\s*string/);
assert.match(clientApi, /targetCode:\s*string/);
assert.match(page, /code:\s*item\.alarmCode/);
assert.match(page, /code:\s*item\.targetCode/);
```

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test tests/client-api.test.mjs tests/rendered-html.test.mjs`

Expected: FAIL because persisted display-code fields are not modeled or mapped.

- [ ] **Step 3: Implement API typing and UI mapping**

Add `alarmCode` / `targetCode` to persisted client types. Add an optional `code` field to UI alarm/target types. When loading from the API, store `id` as the UUID and `code` as the display code. Update visible table, drawer, and label render points that currently use the internal ID to prefer `code ?? id`. Do not change update/detail calls: they continue using the UUID `id`.

- [ ] **Step 4: Verify GREEN and full regression**

Run: `node --test tests/*.test.mjs`

Expected: PASS. Run: `node_modules\\.bin\\vinext.cmd build` and `git diff --check`.

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- lib/client-api.ts app/page.tsx tests/client-api.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: show persisted demo identifiers"
```

## Self-Review

- Schema and seed coverage: Task 1 adds display fields, migrations, all visible demo rows, and rerun-safe inserts.
- UI coverage: Task 2 maps and renders display values without changing UUID relations or save paths.
- Security coverage: all tasks forbid filled connection strings and real database actions.
- Placeholder scan: no unfinished items or unbounded implementation directions.

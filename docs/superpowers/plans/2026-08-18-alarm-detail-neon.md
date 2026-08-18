# Alarm Detail Neon Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store every alarm drawer's detail content in Neon and render it from the selected alarm's database record.

**Architecture:** Add normalized Neon tables for per-alarm detail, measured trend points, and attachment metadata. Extend the existing repository/route-handler boundary with a read-only detail aggregate, then fetch that aggregate from the alarm drawer instead of using hard-coded display values.

**Tech Stack:** TypeScript, Vinext route handlers, React, Drizzle ORM, Neon Postgres, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-18-alarm-detail-neon-design.md`

## Global Constraints

- The detail drawer is read-only; no form or mutation API is added.
- Every aggregate is scoped to the requested alarm UUID.
- Missing detail data renders an explicit empty state, never a fabricated example.
- Seed every existing demo alarm with distinct, plausible detail values based on its code/type/process/line.
- Create migrations but do not apply them to the Neon production branch without separate user approval.

---

### Task 1: Add alarm-detail schema, migration, and realistic demo records

**Files:**
- Modify: `db/schema.ts`
- Create: `drizzle/0008_alarm_detail_data.sql`
- Modify: `lib/seed.ts`
- Modify: `tests/neon-schema.test.mjs`

**Interfaces:**
- Produces: `alarmDetails`, `alarmMeasurements`, and `alarmAttachments` Drizzle table exports.
- Produces: `developmentSeed.alarmDetails`, `developmentSeed.alarmMeasurements`, and `developmentSeed.alarmAttachments`.

- [ ] **Step 1: Write failing schema/seed tests**

Add assertions that `db/schema.ts` exports all three tables, each has an
`alarmId` foreign key, `alarmDetails.alarmId` is unique, and the seed defines
one detail record plus multiple measurement records for each seeded alarm ID.

```js
assert.match(schema, /export const alarmDetails = pgTable\("alarm_details"/);
assert.match(schema, /uniqueIndex\("alarm_details_alarm_id_unique"/);
assert.match(seed, /alarmMeasurements:/);
assert.equal((seed.match(/alarmId:/g) ?? []).length >= 16, true);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/neon-schema.test.mjs`

Expected: FAIL because the three tables and their seed entries do not exist.

- [ ] **Step 3: Implement the schema and migration**

Define these columns in `db/schema.ts`:

```ts
export const alarmDetails = pgTable("alarm_details", {
  id: id(),
  alarmId: uuid("alarm_id").notNull().references(() => alarms.id),
  equipment: text("equipment"),
  productionLot: text("production_lot"),
  measurementSummary: text("measurement_summary"),
  currentValue: numeric("current_value", { precision: 12, scale: 4 }),
  thresholdValue: numeric("threshold_value", { precision: 12, scale: 4 }),
  affectedProductsCustomers: text("affected_products_customers"),
  producedQuantity: integer("produced_quantity"),
  inspectedQuantity: integer("inspected_quantity"),
  nonconformingQuantity: integer("nonconforming_quantity"),
  shippingStatus: text("shipping_status"),
  inventoryQuantity: integer("inventory_quantity"),
  relatedCtq: text("related_ctq"),
  processFactor: text("process_factor"),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("alarm_details_alarm_id_unique").on(table.alarmId)]);
```

Add `alarm_measurements` with `metricName`, decimal `metricValue`, decimal
`thresholdValue`, and `measuredAt`; add `alarm_attachments` with `fileName`,
nullable `fileUrl`, nullable `fileSizeBytes`, and `createdAt`. The SQL
migration creates only these tables, foreign keys, and lookup indexes.

- [ ] **Step 4: Add deterministic, per-alarm seed data**

Extend `developmentSeed` and `SeedTables`; upsert details by `alarm_id`,
measurements by a unique `(alarm_id, metric_name, measured_at)` index, and
attachments by `(alarm_id, file_name)`. Use distinct records for `AL-99198`
(sample-delay/SLA), `AL-99201` (machining CPK), `AL-99202` (assembly defect
rate), and `AL-99203` (testing trend). Include 30 dated trend points per
alarm and attachment metadata without a real file upload.

- [ ] **Step 5: Run focused tests to verify they pass**

Run: `node --test tests/neon-schema.test.mjs`

Expected: PASS, including schema, migration, and distinct seed assertions.

- [ ] **Step 6: Commit schema work**

```bash
git add db/schema.ts drizzle/0008_alarm_detail_data.sql lib/seed.ts tests/neon-schema.test.mjs
git commit -m "feat: add Neon alarm detail records"
```

### Task 2: Expose an alarm-scoped detail aggregate through the API

**Files:**
- Modify: `lib/quality-repository.ts`
- Modify: `lib/route-handlers.mjs`
- Modify: `app/api/alarms/[id]/route.ts`
- Modify: `tests/api-routes.test.mjs`

**Interfaces:**
- Consumes: `alarmDetails`, `alarmMeasurements`, `alarmAttachments` from Task 1.
- Produces: `repository.getAlarmDetail(id)` and `GET /api/alarms/:id` response
  `{ alarm, detail, measurements, attachments, related }`.

- [ ] **Step 1: Write failing route-handler tests**

Create a repository stub whose `getAlarmDetail` returns a record only for one
UUID. Assert success returns every aggregate key, a missing alarm returns 404,
and a repository exception returns 500.

```js
const response = await handlers.GET(new Request("http://test/api/alarms/a"), { params: Promise.resolve({ id: alarmId }) });
const body = await response.json();
assert.equal(response.status, 200);
assert.equal(body.detail.equipment, "CNC-M-04");
assert.deepEqual(body.measurements.map((point) => point.alarmId), [alarmId]);
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `node --test tests/api-routes.test.mjs`

Expected: FAIL because the route returns only `sampleDelayStages`.

- [ ] **Step 3: Implement repository aggregate methods**

Expand `QualityTables` and `QualityRepository` with `getAlarmDetail(id)`.
Query the base alarm, its optional one-to-one detail row, measurements sorted
by `measuredAt`, and attachments. Query related items with explicit limits:

- similar alarms: same `type` and `process`, excluding the selected ID, most
  recent three;
- targets: selected alarm's source target and prior targets that share the
  selected alarm's process through their source alarm;
- action outcomes: completed action plans joined to their action tasks,
  limited to the five most recent.

Return arrays even when no related records exist. Never query another alarm's
detail or measurement data without an `alarmId = id` condition.

- [ ] **Step 4: Update the route and production entry point**

Make `createAlarmDetailRouteHandlers.GET` validate the UUID before querying,
call `repository.getAlarmDetail(id)`, return 404 for null, and retain the
existing guarded 500 response. Update `app/api/alarms/[id]/route.ts` to pass
the three new schema tables into `createQualityRepository`.

- [ ] **Step 5: Run focused tests to verify they pass**

Run: `node --test tests/api-routes.test.mjs`

Expected: PASS for success, missing UUID, absent alarm, and repository error.

- [ ] **Step 6: Commit API work**

```bash
git add lib/quality-repository.ts lib/route-handlers.mjs app/api/alarms/[id]/route.ts tests/api-routes.test.mjs
git commit -m "feat: serve Neon alarm detail data"
```

### Task 3: Render the selected alarm's Neon detail in the drawer

**Files:**
- Modify: `lib/client-api.ts`
- Modify: `app/page.tsx`
- Modify: `tests/client-api.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `GET /api/alarms/:id` aggregate from Task 2.
- Produces: `getAlarmDetail(id): Promise<AlarmDetailResponse>` and a
  data-backed `AlarmDrawer`.

- [ ] **Step 1: Write failing client and rendered-drawer tests**

Update the mocked API response to the new aggregate and assert the client
returns `detail`, `measurements`, `attachments`, and `related`. Add rendered
HTML checks for the loading message, no-detail message, and a dynamic
equipment/LOT value instead of hard-coded `CNC-M-04` and `LOT-231012-001`.

```js
assert.match(page, /상세 데이터를 불러오는 중/);
assert.match(page, /등록된 상세 데이터가 없습니다/);
assert.doesNotMatch(page, /<strong>CNC-M-04<\/strong>/);
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `node --test tests/client-api.test.mjs tests/rendered-html.test.mjs`

Expected: FAIL because the client type and drawer still use the old response
and hard-coded display values.

- [ ] **Step 3: Add client response types and request function**

Define `AlarmDetail`, `AlarmMeasurement`, `AlarmAttachment`, and
`AlarmDetailResponse` in `lib/client-api.ts`. Make `getAlarmDetail` return
the aggregate response from `/api/alarms/${id}` while preserving the existing
API error behavior.

- [ ] **Step 4: Replace drawer placeholders with scoped state**

In `app/page.tsx`, add `alarmDetail`, `alarmDetailLoading`, and
`alarmDetailError` state that resets before each selected alarm request.
Request the detail only when an alarm drawer is opened, cancel/ignore stale
responses for a previously selected ID, and render all drawer sections from
the matching response. Derive the summary periods and chart bars from that
response's measurements. Render explicit empty states for missing detail,
empty attachments, and empty related lists.

- [ ] **Step 5: Run focused tests to verify they pass**

Run: `node --test tests/client-api.test.mjs tests/rendered-html.test.mjs`

Expected: PASS with no hard-coded detail values and with empty/error states.

- [ ] **Step 6: Commit UI work**

```bash
git add lib/client-api.ts app/page.tsx tests/client-api.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: render alarm details from Neon"
```

### Task 4: Validate the complete change and prepare migration handoff

**Files:**
- Modify: `tests/final-review.test.mjs`
- Modify: `docs/superpowers/specs/2026-08-18-alarm-detail-neon-design.md`

**Interfaces:**
- Consumes: all schema, API, and UI contracts from Tasks 1-3.
- Produces: verified migration handoff instructions; no production DB change.

- [ ] **Step 1: Write a failing end-to-end static review assertion**

Assert the migration exists, the route references the new repository method,
and the drawer does not contain any formerly hard-coded CPK/impact/related
content.

```js
assert.ok(fs.existsSync("drizzle/0008_alarm_detail_data.sql"));
assert.match(routeHandlers, /getAlarmDetail/);
assert.doesNotMatch(page, /제품 A, B \/ 주요 고객사 X/);
```

- [ ] **Step 2: Run the review test to verify it fails before final cleanup**

Run: `node --test tests/final-review.test.mjs`

Expected: FAIL until all Task 1-3 interfaces are connected.

- [ ] **Step 3: Finalize migration handoff documentation**

Document the exact local validation command and the user-owned migration
command. State that applying `drizzle/0008_alarm_detail_data.sql` to Neon is
not performed by automated tests or Render deployment.

- [ ] **Step 4: Run complete verification**

Run: `node --test tests/*.test.mjs && npx vinext build`

Expected: all tests PASS and production build succeeds.

- [ ] **Step 5: Commit verification and documentation**

```bash
git add tests/final-review.test.mjs docs/superpowers/specs/2026-08-18-alarm-detail-neon-design.md
git commit -m "test: verify Neon alarm detail integration"
```

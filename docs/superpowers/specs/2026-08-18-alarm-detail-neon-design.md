# Alarm Detail Neon Data Design

## Goal

Replace the hard-coded example values in the alarm-detail drawer with data
stored in Neon. The drawer is read-only: operators manage the source data in
external systems or Neon, and Q-Target displays the record for the selected
alarm only.

## Scope

The following hard-coded drawer sections become database-backed:

- measurement summary and CPK trend;
- equipment, production LOT, and review deadline;
- impact assessment;
- attachment metadata;
- recent similar alarms, prior targets, and prior action outcomes.

No upload form or in-product editing screen is included.

## Data Model

`alarm_details` has a one-to-one relationship with `alarms` and stores the
current, non-repeating detail values:

- `alarm_id` (unique foreign key), `equipment`, `production_lot`;
- `measurement_summary`, `current_value`, `threshold_value`;
- `affected_products_customers`, `produced_quantity`, `inspected_quantity`,
  `nonconforming_quantity`, `shipping_status`, `inventory_quantity`;
- `related_ctq`, `process_factor`.

`alarm_measurements` has a many-to-one relationship with `alarms` and stores
the historical trend points:

- `alarm_id`, `measured_at`, `metric_name`, `metric_value`, `threshold_value`.

The drawer derives its 30-day, 3-month, and 3-year values from these dated
points. The most recent 30 points provide the bar chart.

`alarm_attachments` has a many-to-one relationship with `alarms` and stores
display-only attachment metadata:

- `alarm_id`, `file_name`, `file_url`, `file_size_bytes`, `created_at`.

The existing `alarms`, `targets`, `action_plans`, and `action_tasks` tables
remain the source of recent similar alarms, historic target records, and
action outcomes. No duplicated history table is added.

## API

Add `GET /api/alarms/:id/detail`.

The handler validates the UUID, returns 404 when the alarm is absent, and
uses the existing Neon/Drizzle database helper with the existing guarded
error handling. The response contains:

- base alarm information;
- `detail` (or `null` when no detail record exists);
- ordered measurements and attachments;
- related alarm, target, and action-plan summaries.

The response must be derived from the requested alarm ID. It must not use
shared client-side values from another drawer selection.

## UI Behavior

When the user opens an alarm drawer, the UI requests the new detail endpoint
for that selected alarm. It shows a loading state while awaiting the result.

When a detail record is absent, each affected section states that no detail
data is registered; it must not display a fabricated example. When a network
or database error occurs, the drawer continues to show base alarm data and a
visible retry message for detail data.

## Seed and Migration

Drizzle migrations add the three new tables and their foreign keys/indexes.
Every seeded alarm receives a distinct, plausible detail record based on its
alarm code, type, process, and line. CPK-drop records receive CPK trends,
defect-rate records receive defect-oriented measurement trends, sample-delay
records receive SLA-oriented measurements, and trend-alert records receive
their own relevant process trend. Each gets distinct equipment, LOT, impact,
and attachment metadata. This avoids one alarm's example data appearing in
another alarm's drawer.

The migration only creates new tables and constraints; it does not alter or
delete existing production records. Applying it to the Neon production branch
remains a separate user-approved operation.

## Verification

Tests cover schema constraints, endpoint response and missing-data behavior,
and rendered drawer behavior. Verification also includes a production build
and the existing test suite.

## Local Validation and Migration Handoff

Run the complete local verification from the repository root:

```powershell
node --test tests/*.test.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npx vinext build
```

**User-owned Neon migration:** after separately approving the target Neon
branch and supplying its connection string only through the local environment,
run this command from the repository root:

```powershell
$env:DATABASE_URL = "<approved Neon connection string>"; npx drizzle-kit migrate
```

This applies the journaled `drizzle/0008_alarm_detail_data.sql` migration along
with any earlier pending migrations. Automated tests and Render deployment do
not apply this migration, and no automated workflow changes the Neon database.

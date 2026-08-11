# Persist demo identifiers and complete seed data

## Goal

Keep the Q-Target screen visually consistent after a refresh by persisting every existing demo alarm and management target in Neon. Store the familiar `AL-...` and `TRG-...` numbers in the database and render those values in the UI.

## Data model

- Keep UUID primary keys and foreign keys for stable relations.
- Add required, unique display-code columns: `alarms.alarm_code` and `targets.target_code`.
- Add a versioned Drizzle migration for both columns and indexes.
- Preserve existing rows by assigning their known codes in the seed data. Do not reset or delete the Neon database.

## Seed behavior

- Expand deterministic development seed data to contain the four current screen alarms and five current screen targets, including the existing Sample Delay stages and action-plan data.
- Use fixed UUIDs and conflict-safe inserts so re-running `db:seed` adds missing seed data without duplicating records.
- The existing `AL-99198` / `TRG-...` records are represented with their display codes and UUID relations.

## UI and API behavior

- Alarm and target API responses include `alarmCode` / `targetCode`.
- The UI stores UUIDs for updates and relations, but renders the display codes where it previously rendered `AL-...` and `TRG-...` values.
- Existing loading, error, filtering, pagination, and save behavior are retained.

## Verification

- Add tests for code-column exports/migration, full seed record counts/codes, and API-to-UI mapping that preserves display codes.
- Run focused tests, the full Node test suite, direct Vinext build, and diff check.
- Do not use or log a real `DATABASE_URL` in tests.

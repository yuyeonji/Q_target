import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const schemaUrl = new URL("../db/schema.ts", import.meta.url);
const dbUrl = new URL("../db/index.ts", import.meta.url);
const workerDbUrl = new URL("../db/worker.ts", import.meta.url);
const journalUrl = new URL("../drizzle/meta/_journal.json", import.meta.url);
const displayCodeMigrationUrl = new URL("../drizzle/0003_persist_demo_identifiers.sql", import.meta.url);
const d1RouteUrl = new URL("../examples/d1/app/api/notes/route.ts", import.meta.url);
const d1DbUrl = new URL("../examples/d1/db/index.ts", import.meta.url);

test("exports the persistent quality tables and their parent relationships", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  for (const tableName of [
    "alarms",
    "targets",
    "actionPlans",
    "actionTasks",
    "sampleDelayStages",
    "auditEvents",
  ]) {
    assert.match(schema, new RegExp(`export const ${tableName}\\s*=`));
  }

  assert.match(schema, /references\(\(\)\s*=>\s*alarms\.id\)/);
  assert.match(schema, /references\(\(\)\s*=>\s*actionPlans\.id\)/);
});

test("persists stable display codes for alarms and management targets", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  assert.match(schema, /alarmCode:\s*text\("alarm_code"\)\.notNull\(\)/);
  assert.match(schema, /targetCode:\s*text\("target_code"\)\.notNull\(\)/);
  assert.match(schema, /uniqueIndex\("alarms_alarm_code_unique"\)\.on\(table\.alarmCode\)/);
  assert.match(schema, /uniqueIndex\("targets_target_code_unique"\)\.on\(table\.targetCode\)/);
});

test("creates the database client only from the server DATABASE_URL environment variable", async () => {
  const dbModule = await readFile(dbUrl, "utf8");

  assert.match(dbModule, /process\.env\.DATABASE_URL/);
  assert.doesNotMatch(dbModule, /postgresql:\/\//i);
});

test("uses the Cloudflare DATABASE_URL binding for API requests", async () => {
  const workerDb = await readFile(workerDbUrl, "utf8");

  assert.match(workerDb, /from "cloudflare:workers"/);
  assert.match(workerDb, /env\.DATABASE_URL/);
});

test("records the generated migration as PostgreSQL metadata", async () => {
  const journal = JSON.parse(await readFile(journalUrl, "utf8"));

  assert.equal(journal.dialect, "postgresql");
});

test("backfills display codes before enforcing their unique non-null constraints", async () => {
  const migration = await readFile(displayCodeMigrationUrl, "utf8");

  assert.match(migration, /ADD COLUMN "alarm_code" text/);
  assert.match(migration, /ADD COLUMN "target_code" text/);
  assert.match(migration, /UPDATE "alarms"/);
  assert.match(migration, /UPDATE "targets"/);
  assert.match(migration, /ALTER COLUMN "alarm_code" SET NOT NULL/);
  assert.match(migration, /ALTER COLUMN "target_code" SET NOT NULL/);
  assert.match(migration, /CREATE UNIQUE INDEX "alarms_alarm_code_unique"/);
  assert.match(migration, /CREATE UNIQUE INDEX "targets_target_code_unique"/);
});

test("keeps the standalone D1 notes route on its own D1 database helper", async () => {
  const [route, d1Db] = await Promise.all([
    readFile(d1RouteUrl, "utf8"),
    readFile(d1DbUrl, "utf8"),
  ]);

  assert.match(route, /from "\.\.\/\.\.\/\.\.\/db"/);
  assert.match(d1Db, /drizzle-orm\/d1/);
  assert.match(d1Db, /cloudflare:workers/);
});

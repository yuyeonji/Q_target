import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const schemaUrl = new URL("../db/schema.ts", import.meta.url);
const dbUrl = new URL("../db/index.ts", import.meta.url);
const workerDbUrl = new URL("../db/worker.ts", import.meta.url);
const journalUrl = new URL("../drizzle/meta/_journal.json", import.meta.url);
const displayCodeMigrationUrl = new URL("../drizzle/0003_persist_demo_identifiers.sql", import.meta.url);
const actionPlanClosureMigrationUrl = new URL("../drizzle/0007_action_plan_closure.sql", import.meta.url);
const alarmDetailMigrationUrl = new URL("../drizzle/0008_alarm_detail_data.sql", import.meta.url);
const d1RouteUrl = new URL("../examples/d1/app/api/notes/route.ts", import.meta.url);
const d1DbUrl = new URL("../examples/d1/db/index.ts", import.meta.url);
const seedUrl = new URL("../lib/seed.ts", import.meta.url);
const apiRootUrl = new URL("../app/api/", import.meta.url);

test("production API routes use the Node-compatible Neon database helper", async () => {
  const { readdir, readFile: readRoute } = await import("node:fs/promises");
  const routeFiles = [];
  async function collectRoutes(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      if (entry.isDirectory()) await collectRoutes(path);
      if (entry.isFile() && entry.name === "route.ts") routeFiles.push(path);
    }
  }
  await collectRoutes(apiRootUrl);
  const routeSources = await Promise.all(routeFiles.map((file) => readRoute(file, "utf8")));
  assert.ok(routeSources.length > 0);
  for (const source of routeSources) {
    assert.doesNotMatch(source, /@\/db\/worker|getWorkerDb|cloudflare:workers/);
  }
});

test("stores factory and product metadata on dashboard alarms", async () => {
  const [schema, seed] = await Promise.all([
    readFile(schemaUrl, "utf8"),
    readFile(seedUrl, "utf8"),
  ]);

  assert.match(schema, /factory:\s*text\("factory"\)/);
  assert.match(schema, /productType:\s*text\("product_type"\)/);
  assert.match(seed, /factory:\s*"[^"]+"/);
  assert.match(seed, /productType:\s*"Type [XY]"/);
});

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

test("persists action-plan closure reasons through the schema migration", async () => {
  const [schema, migration] = await Promise.all([
    readFile(schemaUrl, "utf8"),
    readFile(actionPlanClosureMigrationUrl, "utf8"),
  ]);

  assert.match(schema, /closureReason:\s*text\("closure_reason"\)/);
  assert.match(migration, /ALTER TABLE "action_plans" ADD COLUMN "closure_reason" text;/);
});

test("keeps one managed target per linked alarm", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  assert.match(schema, /uniqueIndex\("targets_source_alarm_id_unique"\)\.on\(table\.sourceAlarmId\)/);
});

test("defines unique tables for master rules and master codes", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  assert.match(schema, /export const masterRules = pgTable\("master_rules"/);
  assert.match(schema, /export const masterCodes = pgTable\("master_codes"/);
  assert.match(schema, /uniqueIndex\("master_rules_rule_code_unique"/);
  assert.match(schema, /uniqueIndex\("master_codes_code_unique"/);
});

test("stores alarm detail, measurement, and attachment records for every demo alarm", async () => {
  const [schema, migration, { developmentSeed }] = await Promise.all([
    readFile(schemaUrl, "utf8"),
    readFile(alarmDetailMigrationUrl, "utf8"),
    import("../lib/seed.ts"),
  ]);

  assert.match(schema, /export const alarmDetails = pgTable\("alarm_details"/);
  assert.match(schema, /export const alarmMeasurements = pgTable\("alarm_measurements"/);
  assert.match(schema, /export const alarmAttachments = pgTable\("alarm_attachments"/);
  assert.match(schema, /uniqueIndex\("alarm_details_alarm_id_unique"\)\.on\(table\.alarmId\)/);
  for (const tableName of ["alarmDetails", "alarmMeasurements", "alarmAttachments"]) {
    assert.match(
      schema,
      new RegExp(`export const ${tableName} = pgTable\\("[^"]+", \\{[\\s\\S]{0,250}alarmId: uuid\\("alarm_id"\\)\\.notNull\\(\\)\\.references\\(\\(\\) => alarms\\.id\\)`),
    );
  }
  assert.match(migration, /CREATE TABLE "alarm_details"/);
  assert.match(migration, /CREATE TABLE "alarm_measurements"/);
  assert.match(migration, /CREATE TABLE "alarm_attachments"/);
  assert.match(migration, /"alarm_details_alarm_id_unique"/);
  assert.match(migration, /"alarm_measurements_alarm_metric_measured_unique"/);
  assert.match(migration, /"alarm_attachments_alarm_file_unique"/);

  for (const alarmId of [
    "99198000-0000-4000-8000-000000000001",
    "99201000-0000-4000-8000-000000000001",
    "99202000-0000-4000-8000-000000000001",
    "99203000-0000-4000-8000-000000000001",
  ]) {
    assert.equal(developmentSeed.alarmDetails.filter((detail) => detail.alarmId === alarmId).length, 1);
    assert.equal(developmentSeed.alarmMeasurements.filter((measurement) => measurement.alarmId === alarmId).length, 30);
    assert.ok(developmentSeed.alarmAttachments.some((attachment) => attachment.alarmId === alarmId));
  }
  assert.deepEqual(
    [...new Set(developmentSeed.alarmMeasurements.map((measurement) => measurement.metricName))],
    ["Sample turnaround SLA", "Bore diameter CPK", "Winding defect rate", "End-of-line torque trend"],
  );
});

test("creates the database client only from the server DATABASE_URL environment variable", async () => {
  const dbModule = await readFile(dbUrl, "utf8");

  assert.match(dbModule, /process\.env\.DATABASE_URL/);
  assert.doesNotMatch(dbModule, /postgresql:\/\//i);
});

test("accepts a quoted local DATABASE_URL without passing quotes to Neon", async () => {
  const dbModule = await readFile(dbUrl, "utf8");

  assert.match(dbModule, /export function normalizeDatabaseUrl/);
  assert.match(dbModule, /replace\(\/\^"\|"\$\/g, ""\)/);
});

test("keeps the legacy Cloudflare adapter isolated from production API routes", async () => {
  const workerDb = await readFile(workerDbUrl, "utf8");

  assert.match(workerDb, /from "cloudflare:workers"/);
  assert.match(workerDb, /env\.DATABASE_URL/);
});

test("records the generated migration as PostgreSQL metadata", async () => {
  const journal = JSON.parse(await readFile(journalUrl, "utf8"));

  assert.equal(journal.dialect, "postgresql");
  for (let index = 1; index < journal.entries.length; index += 1) {
    assert.ok(
      journal.entries[index].when > journal.entries[index - 1].when,
      `${journal.entries[index].tag} must have a later timestamp than ${journal.entries[index - 1].tag}`,
    );
  }
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

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const handlers = await import("../lib/route-handlers.mjs");
const seed = await import(`../lib/seed.ts?final-review=${Date.now()}`);

test("action-plan creation requires an alarm or target context and preserves a selected target", async () => {
  const saved = [];
  const repository = {
    async createActionPlanWithAudit(plan) {
      saved.push(plan);
      return { id: "plan-1" };
    },
  };
  const route = handlers.createActionPlanRouteHandlers(repository);

  const missingContext = await route.POST(new Request("http://app.local/api/action-plans", {
    method: "POST",
    body: JSON.stringify({ status: "진행 중" }),
  }));
  assert.equal(missingContext.status, 400);

  const created = await route.POST(new Request("http://app.local/api/action-plans", {
    method: "POST",
    body: JSON.stringify({ status: "진행 중", targetId: "target-1" }),
  }));
  assert.equal(created.status, 201);
  assert.equal(saved[0].targetId, "target-1");
});

test("Sample Delay stages accept only the four approved stage names", () => {
  assert.doesNotThrow(() => seed.assertValidSampleDelayStages(seed.developmentSeed.sampleDelayStages));
  assert.throws(
    () => seed.assertValidSampleDelayStages([{ ...seed.developmentSeed.sampleDelayStages[0], stageName: "임의 단계" }]),
    /Invalid Sample Delay stage/,
  );
});

test("development seed writes parents before children and is idempotent", async () => {
  const batches = [];
  const database = {
    insert(table) {
      return {
        values(rows) {
          return {
            onConflictDoNothing(target) {
              return { table, rows, conflict: "ignore", target };
            },
          };
        },
      };
    },
    async batch(statements) { batches.push(statements); },
  };

  const stageTable = { alarmId: "sample_delay_stages.alarm_id", stageName: "sample_delay_stages.stage_name" };
  await seed.seedDevelopmentData(database, {
    alarms: "alarms", targets: "targets", actionPlans: "action-plans", actionTasks: "action-tasks", sampleDelayStages: stageTable,
  });
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 5);
  assert.ok(batches[0].every((statement) => statement.conflict === "ignore"));
  const stageStatement = batches[0][4];
  assert.ok(stageStatement.rows.every((stage) => /^[0-9a-f-]{36}$/i.test(stage.id)));
  assert.deepEqual(stageStatement.target.target, ["sample_delay_stages.alarm_id", "sample_delay_stages.stage_name"]);
});

test("production TypeScript modules use extensionless local imports", async () => {
  const [repository, db] = await Promise.all([
    readFile(new URL("../lib/quality-repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(repository, /from\s+["'][^"']+\.ts["']/);
  assert.doesNotMatch(db, /from\s+["'][^"']+\.ts["']/);
});

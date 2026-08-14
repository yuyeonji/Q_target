import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const handlers = await import("../lib/route-handlers.mjs");
const seed = await import(`../lib/seed.ts?final-review=${Date.now()}`);
const targetId = "99198000-0000-4000-8000-000000000002";
const actionPlanId = "99198000-0000-4000-8000-000000000003";

test("action-plan creation requires an alarm or target context and preserves a selected target", async () => {
  const saved = [];
  const repository = {
    async findTarget(id) {
      return id === targetId ? { id } : null;
    },
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
    body: JSON.stringify({ status: "진행 중", targetId }),
  }));
  assert.equal(created.status, 201);
  assert.equal(saved[0].targetId, targetId);
});

test("standard action-plan closure requires a matching target and uses the closure audit event", async () => {
  const saved = [];
  const repository = {
    async findTarget(id) { return id === targetId ? { id } : null; },
    async closeActionPlanWithAudit(id, relationTargetId, input, audit) {
      if (id !== actionPlanId || relationTargetId !== targetId) return null;
      saved.push({ input, audit });
      return { id };
    },
  };
  const route = handlers.createActionPlanCloseRouteHandlers(repository);
  const response = await route.POST(new Request(`http://app.local/api/action-plans/${actionPlanId}/close`, {
    method: "POST",
    body: JSON.stringify({
      targetId,
      rootCause: "원인 분석",
      immediateAction: "즉시 조치",
      preventiveAction: "재발 방지",
      closureReason: "효과 확인 완료",
      tasks: [{ description: "조치 확인", owner: "홍길동", dueDate: "2026-08-13", completedAt: "2026-08-13T00:00:00.000Z" }],
    }),
  }), { params: Promise.resolve({ id: actionPlanId }) });

  assert.equal(response.status, 200);
  assert.equal(saved[0].input.status, "종결");
  assert.equal(saved[0].input.targetStatus, "완료");
  assert.equal(saved[0].audit.eventType, "action-plan.closed");
});

test("Sample Delay stages accept only the four approved stage names", () => {
  assert.doesNotThrow(() => seed.assertValidSampleDelayStages(seed.developmentSeed.sampleDelayStages));
  assert.throws(
    () => seed.assertValidSampleDelayStages([{ ...seed.developmentSeed.sampleDelayStages[0], stageName: "임의 단계" }]),
    /Invalid Sample Delay stage/,
  );
});

test("development seed preserves every displayed alarm and target code", () => {
  assert.deepEqual(
    seed.developmentSeed.alarms.map((alarm) => alarm.alarmCode),
    ["AL-99198", "AL-99201", "AL-99202", "AL-99203"],
  );
  assert.deepEqual(
    seed.developmentSeed.targets.map((target) => target.targetCode),
    ["TRG-8921", "TRG-8922", "TRG-8915", "TRG-8925", "TRG-8910"],
  );
  assert.equal(seed.developmentSeed.alarms.length, 4);
  assert.equal(seed.developmentSeed.targets.length, 5);
});

test("development seed exactly restores the existing displayed records", () => {
  assert.deepEqual(
    seed.developmentSeed.alarms.map(({ alarmCode, item, type, process, line, status, reviewer }) => ({ alarmCode, item, type, process, line, status, reviewer })),
    [
      { alarmCode: "AL-99198", item: "Bearing Housing A1", type: "Sample Delay", process: "Machining", line: "Line 4", status: "심각", reviewer: "품질 검토팀" },
      { alarmCode: "AL-99201", item: "Bearing Housing A1", type: "CPK Drop", process: "Machining", line: "Line 4", status: "신규", reviewer: "-" },
      { alarmCode: "AL-99202", item: "Stator Core B2", type: "Defect Rate", process: "Assembly", line: "Line 2", status: "검토중", reviewer: "S. Miller" },
      { alarmCode: "AL-99203", item: "Rotor Assembly C", type: "Trend Alert", process: "Testing", line: "Line 1", status: "종결", reviewer: "시스템" },
    ],
  );
  assert.deepEqual(
    seed.developmentSeed.targets.map(({ targetCode, name, status, owner, priority, dueDate }) => ({ targetCode, name, status, owner, priority, due: dueDate.toISOString().slice(0, 10) })),
    [
      { targetCode: "TRG-8921", name: "터빈 압파 교정", status: "진행 중", owner: "Sarah Chen", priority: "높음", due: "2023-11-15" },
      { targetCode: "TRG-8922", name: "HVAC 시스템 오버홀", status: "대기", owner: "Marcus Rossi", priority: "중간", due: "2023-11-20" },
      { targetCode: "TRG-8915", name: "원자로 코어 센서 동기화", status: "심각", owner: "John Doe", priority: "긴급", due: "2023-10-31" },
      { targetCode: "TRG-8925", name: "파이프라인 압력 테스트", status: "대기", owner: "Aisha Patel", priority: "낮음", due: "2023-12-05" },
      { targetCode: "TRG-8910", name: "안전 장비 재고 확인", status: "완료", owner: "Marcus Rossi", priority: "중간", due: "2023-10-25" },
    ],
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
            onConflictDoUpdate(options) {
              return { table, rows, conflict: "update", options };
            },
          };
        },
      };
    },
    async batch(statements) { batches.push(statements); },
  };

  const stageTable = { alarmId: "sample_delay_stages.alarm_id", stageName: "sample_delay_stages.stage_name" };
  await seed.seedDevelopmentData(database, {
    alarms: { id: "alarms.id" }, targets: { id: "targets.id" }, actionPlans: "action-plans", actionTasks: "action-tasks", sampleDelayStages: stageTable,
  });
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 5);
  assert.equal(batches[0][0].conflict, "update");
  assert.equal(batches[0][1].conflict, "update");
  assert.ok(batches[0].slice(2).every((statement) => statement.conflict === "ignore"));
  assert.equal(batches[0][0].options.target, "alarms.id");
  assert.equal(batches[0][1].options.target, "targets.id");
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

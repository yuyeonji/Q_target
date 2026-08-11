import assert from "node:assert/strict";
import test from "node:test";

async function loadHandlers() {
  return import("../lib/route-handlers.mjs");
}

function createFakeRepository({ failAtomicMutation = false } = {}) {
  const auditEvents = [];
  const savedTargets = [];
  const savedPlans = [];
  const sampleDelayStages = [
    { stageName: "샘플 의뢰", eventAt: "2023-10-12T08:00:00.000Z" },
    { stageName: "시험 접수", eventAt: "2023-10-12T09:10:00.000Z" },
    { stageName: "시험 분석 완료", eventAt: "2023-10-12T10:40:00.000Z" },
    { stageName: "판정 지연", eventAt: "2023-10-12T12:20:00.000Z" },
  ];
  const alarms = [{ id: "alarm-1", alarmCode: "AL-99198", item: "Bearing Housing A1", type: "Sample Delay" }];

  return {
    auditEvents,
    savedTargets,
    savedPlans,
    async listAlarms() { return alarms; },
    async findAlarm(id) { return alarms.find((alarm) => alarm.id === id) ?? null; },
    async listSampleDelayStages() { return sampleDelayStages; },
    async listTargets() { return savedTargets; },
    async createTargetWithAudit(target, auditEvent) {
      if (failAtomicMutation) throw new Error("storage unavailable");
      const saved = { id: "target-1", ...target };
      savedTargets.push(saved);
      auditEvents.push(auditEvent);
      return saved;
    },
    async updateTargetWithAudit(id, changes, auditEvent) {
      if (failAtomicMutation) throw new Error("storage unavailable");
      const target = { id, ...changes };
      savedTargets.push(target);
      auditEvents.push(auditEvent);
      return target;
    },
    async createActionPlanWithAudit(actionPlan, auditEvent) {
      if (failAtomicMutation) throw new Error("storage unavailable");
      const saved = { id: "plan-1", ...actionPlan };
      savedPlans.push(saved);
      auditEvents.push(auditEvent);
      return saved;
    },
  };
}

test("alarm handlers return a list and Sample Delay stages in chronological order", async () => {
  const { createAlarmRouteHandlers, createAlarmDetailRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();

  const list = await createAlarmRouteHandlers(repository).GET();
  assert.deepEqual((await list.json()).alarms, [{ id: "alarm-1", alarmCode: "AL-99198", item: "Bearing Housing A1", type: "Sample Delay" }]);

  const detail = await createAlarmDetailRouteHandlers(repository).GET(
    new Request("http://app.local/api/alarms/alarm-1"),
    { params: Promise.resolve({ id: "alarm-1" }) },
  );
  const body = await detail.json();
  assert.equal(detail.status, 200);
  assert.deepEqual(body.sampleDelayStages.map((stage) => stage.stageName), ["샘플 의뢰", "시험 접수", "시험 분석 완료", "판정 지연"]);
});

test("mutation handlers reject malformed JSON without exposing database details", async () => {
  const { createTargetRouteHandlers, createTargetDetailRouteHandlers, createActionPlanRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();
  const handlers = [
    createTargetRouteHandlers(repository).POST(new Request("http://app.local/api/targets", { method: "POST", body: "{}" })),
    createTargetDetailRouteHandlers(repository).PATCH(new Request("http://app.local/api/targets/target-1", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "target-1" }) }),
    createActionPlanRouteHandlers(repository).POST(new Request("http://app.local/api/action-plans", { method: "POST", body: "{}" })),
  ];

  for (const response of await Promise.all(handlers)) {
    assert.equal(response.status, 400);
    assert.doesNotMatch(await response.text(), /DATABASE_URL|postgresql:/i);
  }
});

test("target and action-plan mutations save their audit events through atomic repository operations", async () => {
  const { createTargetRouteHandlers, createTargetDetailRouteHandlers, createActionPlanRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();

  const created = await createTargetRouteHandlers(repository).POST(new Request("http://app.local/api/targets", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "새 관리대상", status: "대기중", owner: "홍길동", priority: "높음" }),
  }));
  assert.equal(created.status, 201);
  assert.match(repository.savedTargets[0].targetCode, /^TRG-[0-9A-F]{8}$/);

  const updated = await createTargetDetailRouteHandlers(repository).PATCH(new Request("http://app.local/api/targets/target-1", {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "진행중" }),
  }), { params: Promise.resolve({ id: "target-1" }) });
  assert.equal(updated.status, 200);

  const plan = await createActionPlanRouteHandlers(repository).POST(new Request("http://app.local/api/action-plans", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "진행중", alarmId: "alarm-1", tasks: [{ description: "원인 확인", owner: "홍길동" }] }),
  }));
  assert.equal(plan.status, 201);
  assert.deepEqual(repository.auditEvents.map((event) => event.eventType), ["target.created", "target.updated", "action-plan.created"]);
});

test("a failed atomic mutation leaves no partial target, action-plan, or audit data", async () => {
  const { createTargetRouteHandlers, createActionPlanRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository({ failAtomicMutation: true });

  const target = await createTargetRouteHandlers(repository).POST(new Request("http://app.local/api/targets", {
    method: "POST", body: JSON.stringify({ name: "새 관리대상", status: "대기중", owner: "홍길동", priority: "높음" }),
  }));
  const plan = await createActionPlanRouteHandlers(repository).POST(new Request("http://app.local/api/action-plans", {
    method: "POST", body: JSON.stringify({ status: "진행중", alarmId: "alarm-1" }),
  }));

  assert.equal(target.status, 500);
  assert.equal(plan.status, 500);
  assert.deepEqual(repository.savedTargets, []);
  assert.deepEqual(repository.savedPlans, []);
  assert.deepEqual(repository.auditEvents, []);
});

test("development seed includes current-demo action plans and action tasks", async () => {
  const { developmentSeed } = await import("../lib/seed.ts");
  assert.equal(developmentSeed.alarms[0].alarmCode, "AL-99198");
  assert.equal(developmentSeed.actionPlans.length, 1);
  assert.equal(developmentSeed.actionTasks.length, 2);
  assert.ok(developmentSeed.actionTasks.every((task) => task.actionPlanId === developmentSeed.actionPlans[0].id));
  assert.deepEqual(
    developmentSeed.masterRules.map((rule) => rule.ruleCode),
    ["ALR-001", "ALR-002", "ALR-003", "CVR-001", "CVR-002", "CVR-003"],
  );
  assert.deepEqual(
    developmentSeed.masterCodes.map((code) => code.code),
    ["PRC-MCH", "ALM-CPK", "STS-HOLD"],
  );
});

test("development seed inserts master examples without overwriting matching codes", async () => {
  const { seedDevelopmentData } = await import("../lib/seed.ts");
  const batches = [];
  const database = {
    insert(table) {
      return {
        values(rows) {
          return {
            onConflictDoNothing(options) { return { table, rows, conflict: "ignore", options }; },
            onConflictDoUpdate(options) { return { table, rows, conflict: "update", options }; },
          };
        },
      };
    },
    async batch(statements) { batches.push(statements); },
  };
  const tables = {
    alarms: { id: "alarms.id" },
    targets: { id: "targets.id" },
    actionPlans: "action-plans",
    actionTasks: "action-tasks",
    sampleDelayStages: { alarmId: "sample-delay-stages.alarm-id", stageName: "sample-delay-stages.stage-name" },
    masterRules: { ruleCode: "master-rules.rule-code" },
    masterCodes: { code: "master-codes.code" },
  };

  await seedDevelopmentData(database, tables);

  const ruleStatement = batches[0].find((statement) => statement.table === tables.masterRules);
  const codeStatement = batches[0].find((statement) => statement.table === tables.masterCodes);
  assert.equal(ruleStatement.conflict, "ignore");
  assert.equal(codeStatement.conflict, "ignore");
  assert.equal(ruleStatement.options.target, "master-rules.rule-code");
  assert.equal(codeStatement.options.target, "master-codes.code");
});

test("repository executes awaited Neon HTTP batches for target and action-plan mutations", async () => {
  const { createQualityRepository } = await import("../lib/quality-repository.ts");
  const batchCalls = [];
  let releaseTargetBatch;
  const targetBatchGate = new Promise((resolve) => { releaseTargetBatch = resolve; });
  const fakeDb = {
    insert(table) {
      return { values(values) { return { kind: "insert", table, values }; } };
    },
    update(table) {
      return {
        set(changes) {
          return {
            where() {
              return { returning() { return { kind: "update", table, changes }; } };
            },
          };
        },
      };
    },
    execute(statement) { return { kind: "execute", statement }; },
    async batch(statements) {
      batchCalls.push(statements);
      if (batchCalls.length === 1) await targetBatchGate;
      if (batchCalls.length === 2) return [[{ id: "updated-target" }], []];
      if (batchCalls.length === 3) return [[], []];
      return [];
    },
    transaction() { throw new Error("unsupported interactive transaction must not run"); },
  };
  const tables = await import("../db/schema.ts");
  const repository = createQualityRepository(fakeDb, tables);

  let targetResolved = false;
  const targetPromise = repository.createTargetWithAudit(
    { name: "관리대상", status: "대기", owner: "홍길동", priority: "높음" },
    { eventType: "target.created", entityType: "target" },
  ).then((result) => { targetResolved = true; return result; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(batchCalls.length, 1);
  assert.equal(batchCalls[0].length, 2);
  assert.equal(targetResolved, false);
  releaseTargetBatch();
  const created = await targetPromise;
  assert.match(created.id, /^[0-9a-f-]{36}$/i);

  const updated = await repository.updateTargetWithAudit("target-1", { status: "진행중" }, { eventType: "target.updated", entityType: "target" });
  assert.deepEqual(updated, { id: "updated-target" });
  assert.equal(batchCalls[1].length, 2);

  const missing = await repository.updateTargetWithAudit("missing-target", { status: "진행중" }, { eventType: "target.updated", entityType: "target" });
  assert.equal(missing, null);
  assert.equal(batchCalls[2].length, 2);

  await repository.createActionPlanWithAudit(
    { status: "진행중", alarmId: "alarm-1", tasks: [{ description: "원인 확인", owner: "홍길동" }] },
    { eventType: "action-plan.created", entityType: "action-plan" },
  );
  assert.equal(batchCalls[3].length, 3);
});

test("repository persists master data and alarm updates in audited batches", async () => {
  const { createQualityRepository } = await import("../lib/quality-repository.ts");
  const batches = [];
  const masterRules = [{ id: "rule-1", ruleCode: "ALR-001", kind: "alarm" }];
  const masterCodes = [{ id: "code-1", code: "PRC-MCH" }];
  const fakeDb = {
    batches,
    select() {
      return {
        from(table) {
          return {
            where() { return table === tables.masterRules ? masterRules : []; },
            orderBy() { return table === tables.masterCodes ? masterCodes : []; },
          };
        },
      };
    },
    insert(table) {
      return { values(values) { return { kind: "insert", table, values }; } };
    },
    update(table) {
      return {
        set(changes) {
          return {
            where() {
              return { returning() { return { kind: "update", table, changes }; } };
            },
          };
        },
      };
    },
    execute(statement) { return { kind: "execute", statement }; },
    async batch(statements) {
      batches.push(statements);
      return [[{ id: "updated-row" }], []];
    },
  };
  const tables = await import("../db/schema.ts");
  const repository = createQualityRepository(fakeDb, tables);
  const audit = { eventType: "master.updated", entityType: "master" };

  assert.deepEqual(await repository.listMasterRules("alarm"), masterRules);
  assert.deepEqual(await repository.listMasterCodes(), masterCodes);

  await repository.createMasterRuleWithAudit(
    { ruleCode: "ALR-004", kind: "alarm", name: "신규 규칙", scope: "전체", threshold: "1회", active: true },
    audit,
  );
  assert.equal(fakeDb.batches.at(-1).length, 2);

  assert.deepEqual(
    await repository.updateMasterRuleWithAudit("rule-1", { active: false }, audit),
    { id: "updated-row" },
  );
  assert.equal(fakeDb.batches.at(-1).length, 2);

  await repository.createMasterCodeWithAudit(
    { code: "PRC-ASM", name: "조립", category: "공정 코드", active: true },
    audit,
  );
  assert.equal(fakeDb.batches.at(-1).length, 2);

  assert.deepEqual(
    await repository.updateMasterCodeWithAudit("code-1", { active: false }, audit),
    { id: "updated-row" },
  );
  assert.equal(fakeDb.batches.at(-1).length, 2);

  await repository.updateAlarmWithAudit("alarm-1", { status: "종결", reviewer: "품질 검토팀" }, audit);
  assert.equal(fakeDb.batches.at(-1).length, 2);
});

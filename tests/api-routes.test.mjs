import assert from "node:assert/strict";
import test from "node:test";

const alarmId = "99198000-0000-4000-8000-000000000001";
const targetId = "99198000-0000-4000-8000-000000000002";
const actionPlanId = "99198000-0000-4000-8000-000000000003";
const masterRuleId = "71111111-1111-4111-8111-111111111111";
const masterCodeId = "72222222-2222-4222-8222-222222222222";
const missingId = "79999999-9999-4999-8999-999999999999";

async function loadHandlers() {
  return import("../lib/route-handlers.mjs");
}

function createFakeRepository({ failAtomicMutation = false, findTargetBySourceAlarm = async () => null } = {}) {
  const auditEvents = [];
  const savedTargets = [];
  const savedPlans = [];
  const savedRules = [];
  const savedCodes = [];
  const closureCalls = [];
  let alarmUpdateCalls = 0;
  let targetUpdateCalls = 0;
  let masterRuleUpdateCalls = 0;
  let masterCodeUpdateCalls = 0;
  const actionPlanListCalls = [];
  const sampleDelayStages = [
    { stageName: "샘플 의뢰", eventAt: "2023-10-12T08:00:00.000Z" },
    { stageName: "시험 접수", eventAt: "2023-10-12T09:10:00.000Z" },
    { stageName: "시험 분석 완료", eventAt: "2023-10-12T10:40:00.000Z" },
    { stageName: "판정 지연", eventAt: "2023-10-12T12:20:00.000Z" },
  ];
  const alarms = [{ id: alarmId, alarmCode: "AL-99198", item: "Bearing Housing A1", type: "Sample Delay" }];

  return {
    auditEvents,
    savedTargets,
    savedPlans,
    savedRules,
    savedCodes,
    closureCalls,
    get alarmUpdateCalls() { return alarmUpdateCalls; },
    get targetUpdateCalls() { return targetUpdateCalls; },
    get masterRuleUpdateCalls() { return masterRuleUpdateCalls; },
    get masterCodeUpdateCalls() { return masterCodeUpdateCalls; },
    actionPlanListCalls,
    async listAlarms() { return alarms; },
    async findAlarm(id) { return alarms.find((alarm) => alarm.id === id) ?? null; },
    async listSampleDelayStages() { return sampleDelayStages; },
    async listTargets() { return savedTargets; },
    async findTarget(id) { return id === targetId ? { id } : savedTargets.find((target) => target.id === id) ?? null; },
    findTargetBySourceAlarm,
    async listActionPlans(relation) {
      actionPlanListCalls.push(relation);
      return savedPlans.filter((plan) => relation.alarmId ? plan.alarmId === relation.alarmId : plan.targetId === relation.targetId);
    },
    async listMasterRules(kind) { return savedRules.filter((rule) => rule.kind === kind); },
    async listMasterCodes() { return savedCodes; },
    async createTargetWithAudit(target, auditEvent) {
      if (failAtomicMutation) throw new Error("storage unavailable");
      const saved = { id: "target-1", ...target };
      savedTargets.push(saved);
      auditEvents.push(auditEvent);
      return saved;
    },
    async updateTargetWithAudit(id, changes, auditEvent) {
      targetUpdateCalls += 1;
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
    async updateActionPlanWithAudit(id, relation, actionPlan, auditEvent) {
      if (failAtomicMutation) throw new Error("storage unavailable");
      const saved = savedPlans.find((plan) => plan.id === id && (
        "targetId" in relation ? plan.targetId === relation.targetId : plan.alarmId === relation.alarmId
      ));
      if (!saved) return null;
      Object.assign(saved, actionPlan, { tasks: actionPlan.tasks });
      auditEvents.push(auditEvent);
      return { id };
    },
    async closeActionPlanWithAudit(id, planTargetId, actionPlan, auditEvent) {
      if (failAtomicMutation) throw new Error("storage unavailable");
      const saved = savedPlans.find((plan) => plan.id === id && plan.targetId === planTargetId);
      if (!saved) return null;
      Object.assign(saved, actionPlan, { tasks: actionPlan.tasks });
      closureCalls.push({ id, targetId: planTargetId, actionPlan, auditEvent });
      auditEvents.push(auditEvent);
      return { id };
    },
    async updateAlarmWithAudit(id, changes, auditEvent) {
      alarmUpdateCalls += 1;
      if (failAtomicMutation) throw new Error("DATABASE_URL=postgresql://secret");
      const alarm = alarms.find((item) => item.id === id);
      if (!alarm) return null;
      Object.assign(alarm, changes);
      auditEvents.push(auditEvent);
      return { id };
    },
    async createMasterRuleWithAudit(rule, auditEvent) {
      if (failAtomicMutation) throw new Error("DATABASE_URL=postgresql://secret");
      const saved = { id: masterRuleId, ...rule };
      savedRules.push(saved);
      auditEvents.push(auditEvent);
      return { id: saved.id };
    },
    async updateMasterRuleWithAudit(id, changes, auditEvent) {
      masterRuleUpdateCalls += 1;
      if (failAtomicMutation) throw new Error("DATABASE_URL=postgresql://secret");
      const rule = savedRules.find((item) => item.id === id);
      if (!rule) return null;
      Object.assign(rule, changes);
      auditEvents.push(auditEvent);
      return { id };
    },
    async createMasterCodeWithAudit(code, auditEvent) {
      if (failAtomicMutation) throw new Error("DATABASE_URL=postgresql://secret");
      const saved = { id: masterCodeId, ...code };
      savedCodes.push(saved);
      auditEvents.push(auditEvent);
      return { id: saved.id };
    },
    async updateMasterCodeWithAudit(id, changes, auditEvent) {
      masterCodeUpdateCalls += 1;
      if (failAtomicMutation) throw new Error("DATABASE_URL=postgresql://secret");
      const code = savedCodes.find((item) => item.id === id);
      if (!code) return null;
      Object.assign(code, changes);
      auditEvents.push(auditEvent);
      return { id };
    },
  };
}

test("alarm detail handler returns the requested aggregate", async () => {
  const { createAlarmRouteHandlers, createAlarmDetailRouteHandlers } = await loadHandlers();
  const aggregate = {
    alarm: { id: alarmId, alarmCode: "AL-99198", item: "Bearing Housing A1", type: "CPK Drop", process: "Machining" },
    detail: { alarmId, equipment: "CNC-M-04", productionLot: "LOT-231012-001" },
    measurements: [{ alarmId, metricName: "CPK", metricValue: "1.12", thresholdValue: "1.33", measuredAt: "2026-08-18T00:00:00.000Z" }],
    attachments: [{ alarmId, fileName: "cpk-report.pdf", fileSizeBytes: 1024 }],
    related: {
      similarAlarms: [{ id: "99198000-0000-4000-8000-000000000010", alarmCode: "AL-99197" }],
      targets: [{ id: targetId, targetCode: "TRG-10001" }],
      actionOutcomes: [{ id: actionPlanId, status: "종결", tasks: [{ description: "Inspect tooling" }] }],
    },
  };
  const calls = [];
  const repository = {
    async listAlarms() { return [aggregate.alarm]; },
    async getAlarmDetail(id) {
      calls.push(id);
      return id === alarmId ? aggregate : null;
    },
  };

  const list = await createAlarmRouteHandlers(repository).GET();
  assert.deepEqual((await list.json()).alarms, [aggregate.alarm]);

  const detail = await createAlarmDetailRouteHandlers(repository).GET(
    new Request(`http://app.local/api/alarms/${alarmId}`),
    { params: Promise.resolve({ id: alarmId }) },
  );
  const body = await detail.json();
  assert.equal(detail.status, 200);
  assert.deepEqual(Object.keys(body).sort(), ["alarm", "attachments", "detail", "measurements", "related"]);
  assert.equal(body.detail.equipment, "CNC-M-04");
  assert.deepEqual(body.measurements.map((point) => point.alarmId), [alarmId]);
  assert.deepEqual(body.attachments.map((attachment) => attachment.alarmId), [alarmId]);
  assert.deepEqual(body.related.targets.map((target) => target.id), [targetId]);
  assert.deepEqual(calls, [alarmId]);
});

test("alarm detail handler rejects invalid IDs and guards missing or failed lookups", async () => {
  const { createAlarmDetailRouteHandlers } = await loadHandlers();
  const calls = [];
  const repository = {
    async getAlarmDetail(id) {
      calls.push(id);
      if (id === missingId) return null;
      throw new Error("DATABASE_URL=postgresql://secret");
    },
  };
  const handlers = createAlarmDetailRouteHandlers(repository);

  const invalid = await handlers.GET(new Request("http://app.local/api/alarms/not-a-uuid"), {
    params: Promise.resolve({ id: "not-a-uuid" }),
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(calls, []);

  const missing = await handlers.GET(new Request(`http://app.local/api/alarms/${missingId}`), {
    params: Promise.resolve({ id: missingId }),
  });
  assert.equal(missing.status, 404);

  const failure = await handlers.GET(new Request(`http://app.local/api/alarms/${alarmId}`), {
    params: Promise.resolve({ id: alarmId }),
  });
  assert.equal(failure.status, 500);
  assert.doesNotMatch(await failure.text(), /DATABASE_URL|postgresql:/i);
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

  const updated = await createTargetDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/targets/${targetId}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "진행중" }),
  }), { params: Promise.resolve({ id: targetId }) });
  assert.equal(updated.status, 200);

  const plan = await createActionPlanRouteHandlers(repository).POST(new Request("http://app.local/api/action-plans", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "진행중", alarmId, tasks: [{ description: "원인 확인", owner: "홍길동" }] }),
  }));
  assert.equal(plan.status, 201);
  assert.deepEqual(repository.auditEvents.map((event) => event.eventType), ["target.created", "target.updated", "action-plan.created"]);
});

test("action-plan GET returns persisted plans with tasks for exactly one UUID relation", async () => {
  const { createActionPlanRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();
  repository.savedPlans.push({
    id: actionPlanId,
    alarmId,
    targetId,
    rootCause: "인수인계 지연",
    status: "진행 중",
    tasks: [{ id: "99198000-0000-4000-8000-000000000004", description: "원인 확인", owner: "홍길동" }],
  });
  const route = createActionPlanRouteHandlers(repository);

  const response = await route.GET(new Request(`http://app.local/api/action-plans?targetId=${targetId}`));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).actionPlans, repository.savedPlans);
  assert.deepEqual(repository.actionPlanListCalls, [{ targetId }]);

  for (const url of [
    "http://app.local/api/action-plans",
    `http://app.local/api/action-plans?alarmId=${alarmId}&targetId=${targetId}`,
    "http://app.local/api/action-plans?alarmId=not-a-uuid",
  ]) {
    assert.equal((await route.GET(new Request(url))).status, 400);
  }
});

test("action-plan POST forwards a target status into the same atomic repository mutation", async () => {
  const { createActionPlanRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();
  const response = await createActionPlanRouteHandlers(repository).POST(new Request("http://app.local/api/action-plans", {
    method: "POST",
    body: JSON.stringify({ status: "진행 중", targetId, targetStatus: "진행 중", tasks: [] }),
  }));

  assert.equal(response.status, 201);
  assert.equal(repository.savedPlans.length, 1);
  assert.equal(repository.savedPlans[0].targetId, targetId);
  assert.equal(repository.savedPlans[0].targetStatus, "진행 중");
});

test("action-plan PATCH updates only the selected plan for its target", async () => {
  const { createActionPlanDetailRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();
  repository.savedPlans.push({ id: actionPlanId, targetId, status: "open", tasks: [] });
  const route = createActionPlanDetailRouteHandlers(repository);

  const response = await route.PATCH(new Request(`http://app.local/api/action-plans/${actionPlanId}`, {
    method: "PATCH",
    body: JSON.stringify({ targetId, status: "open", tasks: [{ description: "only-save-on-approval", owner: "owner" }] }),
  }), { params: Promise.resolve({ id: actionPlanId }) });

  assert.equal(response.status, 200);
  assert.equal(repository.savedPlans[0].tasks[0].description, "only-save-on-approval");
  assert.equal(repository.auditEvents.at(-1)?.eventType, "action-plan.updated");

  const mismatch = await route.PATCH(new Request(`http://app.local/api/action-plans/${actionPlanId}`, {
    method: "PATCH",
    body: JSON.stringify({ alarmId, status: "open", tasks: [] }),
  }), { params: Promise.resolve({ id: actionPlanId }) });
  assert.equal(mismatch.status, 404);
});

test("normal action-plan save and reload retain completed task timestamps", async () => {
  const { createActionPlanRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();
  const route = createActionPlanRouteHandlers(repository);
  const completedAt = "2026-08-13T00:00:00.000Z";

  const saved = await route.POST(new Request("http://app.local/api/action-plans", {
    method: "POST",
    body: JSON.stringify({
      status: "진행 중",
      targetId,
      tasks: [{ description: "완료 확인", owner: "홍길동", dueDate: "2026-08-13", completedAt }],
    }),
  }));
  assert.equal(saved.status, 201);

  const reloaded = await route.GET(new Request(`http://app.local/api/action-plans?targetId=${targetId}`));
  assert.equal(reloaded.status, 200);
  assert.equal((await reloaded.json()).actionPlans[0].tasks[0].completedAt, completedAt);
});

test("action-plan closure rejects missing analysis, reason, and completed task details", async () => {
  const { createActionPlanCloseRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();
  repository.savedPlans.push({ id: actionPlanId, targetId, status: "진행 중", tasks: [] });
  const route = createActionPlanCloseRouteHandlers(repository);
  const valid = {
    targetId,
    rootCause: "원인 분석",
    immediateAction: "즉시 조치",
    preventiveAction: "재발 방지",
    closureReason: "효과 확인 완료",
    tasks: [{ description: "조치 확인", owner: "홍길동", dueDate: "2026-08-13", completedAt: "2026-08-13T00:00:00.000Z" }],
  };

  for (const body of [
    { ...valid, rootCause: "" },
    { ...valid, immediateAction: "" },
    { ...valid, preventiveAction: "" },
    { ...valid, closureReason: "" },
    { ...valid, tasks: [] },
    { ...valid, tasks: [{ ...valid.tasks[0], description: "" }] },
    { ...valid, tasks: [{ ...valid.tasks[0], owner: "" }] },
    { ...valid, tasks: [{ ...valid.tasks[0], dueDate: "" }] },
    { ...valid, tasks: [{ ...valid.tasks[0], completedAt: "" }] },
  ]) {
    const response = await route.POST(new Request(`http://app.local/api/action-plans/${actionPlanId}/close`, {
      method: "POST", body: JSON.stringify(body),
    }), { params: Promise.resolve({ id: actionPlanId }) });
    assert.equal(response.status, 400);
  }
  assert.deepEqual(repository.closureCalls, []);
});

test("action-plan closure persists complete tasks and server-enforced terminal statuses", async () => {
  const { createActionPlanCloseRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();
  repository.savedPlans.push({ id: actionPlanId, targetId, status: "진행 중", tasks: [] });
  const response = await createActionPlanCloseRouteHandlers(repository).POST(new Request(`http://app.local/api/action-plans/${actionPlanId}/close`, {
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
  assert.deepEqual(await response.json(), { actionPlan: { id: actionPlanId } });
  assert.equal(repository.closureCalls[0].actionPlan.status, "종결");
  assert.equal(repository.closureCalls[0].actionPlan.targetStatus, "완료");
  assert.equal(repository.closureCalls[0].actionPlan.tasks[0].completedAt.toISOString(), "2026-08-13T00:00:00.000Z");
  assert.equal(repository.closureCalls[0].auditEvent.eventType, "action-plan.closed");
});

test("target registration rejects an alarm that is already linked to a target", async () => {
  const { createTargetRouteHandlers } = await loadHandlers();
  const existingTarget = { id: targetId, targetCode: "TRG-00000001" };
  const repository = createFakeRepository({
    findTargetBySourceAlarm: async () => existingTarget,
  });

  const response = await createTargetRouteHandlers(repository).POST(new Request("http://app.local/api/targets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "새 관리대상", status: "대기중", owner: "홍길동", priority: "높음", sourceAlarmId: alarmId }),
  }));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "이미 관리대상으로 등록된 알람입니다.",
    target: existingTarget,
  });
  assert.equal(repository.savedTargets.length, 0);
});

test("a failed atomic mutation leaves no partial target, action-plan, or audit data", async () => {
  const { createTargetRouteHandlers, createActionPlanRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository({ failAtomicMutation: true });

  const target = await createTargetRouteHandlers(repository).POST(new Request("http://app.local/api/targets", {
    method: "POST", body: JSON.stringify({ name: "새 관리대상", status: "대기중", owner: "홍길동", priority: "높음" }),
  }));
  const plan = await createActionPlanRouteHandlers(repository).POST(new Request("http://app.local/api/action-plans", {
    method: "POST", body: JSON.stringify({ status: "진행중", alarmId }),
  }));

  assert.equal(target.status, 500);
  assert.equal(plan.status, 500);
  assert.deepEqual(repository.savedTargets, []);
  assert.deepEqual(repository.savedPlans, []);
  assert.deepEqual(repository.auditEvents, []);
});

test("alarm and master handlers persist valid changes through audited repository operations", async () => {
  const {
    createAlarmDetailRouteHandlers,
    createMasterRuleRouteHandlers,
    createMasterRuleDetailRouteHandlers,
    createMasterCodeRouteHandlers,
    createMasterCodeDetailRouteHandlers,
  } = await loadHandlers();
  const repository = createFakeRepository();

  const alarm = await createAlarmDetailRouteHandlers(repository).PATCH(
    new Request(`http://app.local/api/alarms/${alarmId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "종결", reviewer: "품질 검토팀" }),
    }),
    { params: Promise.resolve({ id: alarmId }) },
  );
  assert.equal(alarm.status, 200);
  assert.deepEqual((await alarm.json()).alarm, { id: alarmId });

  const rule = await createMasterRuleRouteHandlers(repository).POST(new Request("http://app.local/api/master/rules", {
    method: "POST",
    body: JSON.stringify({ ruleCode: "ALR-004", kind: "alarm", name: "신규 규칙", scope: "전체", threshold: "1회", active: true }),
  }));
  assert.equal(rule.status, 201);
  assert.deepEqual(await (await createMasterRuleRouteHandlers(repository).GET(new Request("http://app.local/api/master/rules?kind=alarm"))).json(), {
    rules: [{ id: masterRuleId, ruleCode: "ALR-004", kind: "alarm", name: "신규 규칙", scope: "전체", threshold: "1회", active: true }],
  });

  const updatedRule = await createMasterRuleDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/master/rules/${masterRuleId}`, {
    method: "PATCH",
    body: JSON.stringify({ active: false }),
  }), { params: Promise.resolve({ id: masterRuleId }) });
  assert.equal(updatedRule.status, 200);

  const code = await createMasterCodeRouteHandlers(repository).POST(new Request("http://app.local/api/master/codes", {
    method: "POST",
    body: JSON.stringify({ code: "PRC-ASM", name: "조립", category: "공정 코드", active: true }),
  }));
  assert.equal(code.status, 201);
  assert.deepEqual(await (await createMasterCodeRouteHandlers(repository).GET()).json(), {
    codes: [{ id: masterCodeId, code: "PRC-ASM", name: "조립", category: "공정 코드", active: true }],
  });

  const updatedCode = await createMasterCodeDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/master/codes/${masterCodeId}`, {
    method: "PATCH",
    body: JSON.stringify({ category: "공정 분류", active: false }),
  }), { params: Promise.resolve({ id: masterCodeId }) });
  assert.equal(updatedCode.status, 200);
  assert.deepEqual(repository.auditEvents.map((event) => event.eventType), [
    "alarm.updated",
    "master-rule.created",
    "master-rule.updated",
    "master-code.created",
    "master-code.updated",
  ]);
});

test("alarm and master handlers reject malformed writes and report missing rows safely", async () => {
  const {
    createAlarmDetailRouteHandlers,
    createMasterRuleRouteHandlers,
    createMasterRuleDetailRouteHandlers,
    createMasterCodeRouteHandlers,
    createMasterCodeDetailRouteHandlers,
  } = await loadHandlers();
  const repository = createFakeRepository();
  const malformed = await Promise.all([
    createAlarmDetailRouteHandlers(repository).PATCH(new Request("http://app.local/api/alarms/alarm-1", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "alarm-1" }) }),
    createMasterRuleRouteHandlers(repository).POST(new Request("http://app.local/api/master/rules", { method: "POST", body: "{}" })),
    createMasterRuleDetailRouteHandlers(repository).PATCH(new Request("http://app.local/api/master/rules/rule-1", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "rule-1" }) }),
    createMasterCodeRouteHandlers(repository).POST(new Request("http://app.local/api/master/codes", { method: "POST", body: "{}" })),
    createMasterCodeDetailRouteHandlers(repository).PATCH(new Request("http://app.local/api/master/codes/code-1", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "code-1" }) }),
  ]);
  for (const response of malformed) assert.equal(response.status, 400);

  const missing = await Promise.all([
    createAlarmDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/alarms/${missingId}`, { method: "PATCH", body: JSON.stringify({ status: "종결" }) }), { params: Promise.resolve({ id: missingId }) }),
    createMasterRuleDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/master/rules/${missingId}`, { method: "PATCH", body: JSON.stringify({ active: false }) }), { params: Promise.resolve({ id: missingId }) }),
    createMasterCodeDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/master/codes/${missingId}`, { method: "PATCH", body: JSON.stringify({ active: false }) }), { params: Promise.resolve({ id: missingId }) }),
  ]);
  for (const response of missing) {
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /DATABASE_URL|postgresql:/i);
  }
});

test("alarm and master handlers return generic errors when an atomic write fails", async () => {
  const {
    createAlarmDetailRouteHandlers,
    createMasterRuleRouteHandlers,
    createMasterCodeRouteHandlers,
  } = await loadHandlers();
  const repository = createFakeRepository({ failAtomicMutation: true });
  const failed = await Promise.all([
    createAlarmDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/alarms/${alarmId}`, { method: "PATCH", body: JSON.stringify({ status: "종결" }) }), { params: Promise.resolve({ id: alarmId }) }),
    createMasterRuleRouteHandlers(repository).POST(new Request("http://app.local/api/master/rules", { method: "POST", body: JSON.stringify({ ruleCode: "ALR-004", kind: "alarm", name: "신규 규칙", scope: "전체", threshold: "1회" }) })),
    createMasterCodeRouteHandlers(repository).POST(new Request("http://app.local/api/master/codes", { method: "POST", body: JSON.stringify({ code: "PRC-ASM", name: "조립", category: "공정 코드" }) })),
  ]);

  for (const response of failed) {
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /DATABASE_URL|postgresql:/i);
  }
  assert.deepEqual(repository.auditEvents, []);
});

test("detail PATCH handlers reject malformed UUID parameters before calling repository writes", async () => {
  const {
    createAlarmDetailRouteHandlers,
    createTargetDetailRouteHandlers,
    createMasterRuleDetailRouteHandlers,
    createMasterCodeDetailRouteHandlers,
  } = await loadHandlers();
  const repository = createFakeRepository();
  const malformedId = "not-a-uuid";
  const responses = await Promise.all([
    createAlarmDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/alarms/${malformedId}`, { method: "PATCH", body: JSON.stringify({ status: "종결" }) }), { params: Promise.resolve({ id: malformedId }) }),
    createTargetDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/targets/${malformedId}`, { method: "PATCH", body: JSON.stringify({ status: "진행 중" }) }), { params: Promise.resolve({ id: malformedId }) }),
    createMasterRuleDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/master/rules/${malformedId}`, { method: "PATCH", body: JSON.stringify({ active: false }) }), { params: Promise.resolve({ id: malformedId }) }),
    createMasterCodeDetailRouteHandlers(repository).PATCH(new Request(`http://app.local/api/master/codes/${malformedId}`, { method: "PATCH", body: JSON.stringify({ active: false }) }), { params: Promise.resolve({ id: malformedId }) }),
  ]);

  for (const response of responses) assert.equal(response.status, 400);
  assert.deepEqual([repository.alarmUpdateCalls, repository.targetUpdateCalls, repository.masterRuleUpdateCalls, repository.masterCodeUpdateCalls], [0, 0, 0, 0]);
});

test("write handlers reject invalid UUID relations and unsupported rule kinds before repository writes", async () => {
  const { createTargetRouteHandlers, createActionPlanRouteHandlers, createMasterRuleRouteHandlers } = await loadHandlers();
  const repository = createFakeRepository();
  const responses = await Promise.all([
    createTargetRouteHandlers(repository).POST(new Request("http://app.local/api/targets", {
      method: "POST",
      body: JSON.stringify({ name: "관리대상", status: "대기", owner: "홍길동", priority: "높음", sourceAlarmId: "AL-99198" }),
    })),
    createActionPlanRouteHandlers(repository).POST(new Request("http://app.local/api/action-plans", {
      method: "POST",
      body: JSON.stringify({ status: "진행 중", alarmId: "AL-99198" }),
    })),
    createMasterRuleRouteHandlers(repository).POST(new Request("http://app.local/api/master/rules", {
      method: "POST",
      body: JSON.stringify({ ruleCode: "BAD-001", kind: "unsupported", name: "잘못된 규칙", scope: "전체", threshold: "1회" }),
    })),
    createMasterRuleRouteHandlers(repository).GET(new Request("http://app.local/api/master/rules?kind=unsupported")),
  ]);

  assert.deepEqual(responses.map((response) => response.status), [400, 400, 400, 400]);
  assert.deepEqual(repository.savedTargets, []);
  assert.deepEqual(repository.savedPlans, []);
  assert.deepEqual(repository.savedRules, []);
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
              return {
                kind: "update",
                table,
                changes,
                returning() { return { kind: "update", table, changes }; },
              };
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
    { name: "관리대상", status: "진행 중", owner: "홍길동", priority: "높음", sourceAlarmId: alarmId },
    { eventType: "target.created", entityType: "target" },
  ).then((result) => { targetResolved = true; return result; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(batchCalls.length, 1);
  assert.equal(batchCalls[0].length, 3);
  assert.equal(batchCalls[0][1].kind, "update");
  assert.equal(batchCalls[0][1].table, tables.alarms);
  assert.deepEqual(batchCalls[0][1].changes, { status: "관리대상" });
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
    { status: "진행중", alarmId, targetId, targetStatus: "진행 중", tasks: [{ description: "원인 확인", owner: "홍길동" }] },
    { eventType: "action-plan.created", entityType: "action-plan" },
  );
  assert.equal(batchCalls[3].length, 5);
  assert.equal(batchCalls[3][0].kind, "update");
  assert.equal(batchCalls[3][0].table, tables.targets);
  assert.deepEqual(batchCalls[3][0].changes, { status: "진행 중" });
});

test("repository closes a matching action plan in one guarded Neon batch", async () => {
  const { createQualityRepository } = await import("../lib/quality-repository.ts");
  const batchCalls = [];
  const fakeDb = {
    insert(table) {
      return { values(values) { return { kind: "insert", table, values }; } };
    },
    update(table) {
      return {
        set(changes) {
          return {
            where() {
              return {
                kind: "update", table, changes,
                returning() { return { kind: "update", table, changes }; },
              };
            },
          };
        },
      };
    },
    delete(table) {
      return { where() { return { kind: "delete", table }; } };
    },
    execute(statement) { return { kind: "execute", statement }; },
    async batch(statements) {
      batchCalls.push(statements);
      return [[{ id: actionPlanId }], [], [], [], [], [], [], []];
    },
    transaction() { throw new Error("interactive transaction must not run"); },
  };
  const tables = await import("../db/schema.ts");
  const repository = createQualityRepository(fakeDb, tables);
  const closed = await repository.closeActionPlanWithAudit(actionPlanId, targetId, {
    rootCause: "원인 분석",
    immediateAction: "즉시 조치",
    preventiveAction: "재발 방지",
    closureReason: "효과 확인 완료",
    status: "종결",
    targetStatus: "완료",
    tasks: [{ description: "조치 확인", owner: "홍길동", dueDate: new Date("2026-08-13"), completedAt: new Date("2026-08-13T00:00:00Z") }],
  }, { eventType: "action-plan.closed", entityType: "action-plan" });

  assert.deepEqual(closed, { id: actionPlanId });
  assert.equal(batchCalls.length, 1);
  assert.equal(batchCalls[0].length, 8);
  assert.equal(batchCalls[0][0].table, tables.actionPlans);
  assert.deepEqual(batchCalls[0][0].changes, {
    rootCause: "원인 분석",
    immediateAction: "즉시 조치",
    preventiveAction: "재발 방지",
    closureReason: "효과 확인 완료",
    status: "종결",
  });
  assert.equal(batchCalls[0][1].kind, "delete");
  assert.equal(batchCalls[0][3].table, tables.targets);
  assert.deepEqual(batchCalls[0][3].changes, { status: "완료" });
  assert.equal(batchCalls[0][4].table, tables.alarms);
  assert.deepEqual(batchCalls[0][4].changes, { status: "종결" });
  assert.ok(batchCalls[0].slice(5).every((statement) => statement.kind === "execute"));
});

test("repository lists action plans with their tasks for the selected relation", async () => {
  const { createQualityRepository } = await import("../lib/quality-repository.ts");
  const plans = [
    { id: actionPlanId, alarmId, targetId, status: "진행 중", createdAt: new Date("2026-08-11T01:00:00Z") },
  ];
  const tasks = [
    { id: "99198000-0000-4000-8000-000000000004", actionPlanId, description: "원인 확인", owner: "홍길동", createdAt: new Date("2026-08-11T01:01:00Z") },
  ];
  const tables = await import("../db/schema.ts");
  const fakeDb = {
    select() {
      return {
        from(table) {
          return {
            where() {
              return {
                orderBy() { return table === tables.actionPlans ? plans : tasks; },
              };
            },
          };
        },
      };
    },
  };
  const repository = createQualityRepository(fakeDb, tables);

  assert.deepEqual(await repository.listActionPlans({ targetId }), [{ ...plans[0], tasks }]);
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

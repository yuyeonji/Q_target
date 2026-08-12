const json = (data, init = {}) => Response.json(data, init);

async function readJson(request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const requiredText = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const isUuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const validRuleKinds = new Set(["alarm", "conversion"]);

function optionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseTarget(input) {
  const targetCode = requiredText(input.targetCode) ?? `TRG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const name = requiredText(input.name);
  const status = requiredText(input.status);
  const owner = requiredText(input.owner);
  const priority = requiredText(input.priority);
  const dueDate = optionalDate(input.dueDate);
  const sourceAlarmId = input.sourceAlarmId === undefined || input.sourceAlarmId === null ? null : requiredText(input.sourceAlarmId);
  if (!name || !status || !owner || !priority || dueDate === undefined || (input.sourceAlarmId !== undefined && input.sourceAlarmId !== null && !sourceAlarmId)) return null;
  if (sourceAlarmId && !isUuid(sourceAlarmId)) return null;
  if (!/^TRG-[A-Z0-9-]+$/.test(targetCode)) return null;
  return { targetCode, name, status, owner, priority, dueDate, sourceAlarmId };
}

function parseTargetChanges(input) {
  const changes = {};
  for (const field of ["name", "status", "owner", "priority"]) {
    if (field in input) {
      const value = requiredText(input[field]);
      if (!value) return null;
      changes[field] = value;
    }
  }
  if ("dueDate" in input) {
    const dueDate = optionalDate(input.dueDate);
    if (dueDate === undefined) return null;
    changes.dueDate = dueDate;
  }
  return Object.keys(changes).length ? changes : null;
}

function parseAlarmChanges(input) {
  const changes = {};
  for (const field of ["status", "reviewer"]) {
    if (field in input) {
      const value = requiredText(input[field]);
      if (!value) return null;
      changes[field] = value;
    }
  }
  return Object.keys(changes).length ? changes : null;
}

function parseMasterRule(input) {
  const ruleCode = requiredText(input.ruleCode);
  const kind = requiredText(input.kind);
  const name = requiredText(input.name);
  const scope = requiredText(input.scope);
  const threshold = requiredText(input.threshold);
  const active = input.active === undefined ? true : input.active;
  if (!ruleCode || !kind || !validRuleKinds.has(kind) || !name || !scope || !threshold || typeof active !== "boolean") return null;
  return { ruleCode, kind, name, scope, threshold, active };
}

function parseMasterRuleChanges(input) {
  const changes = {};
  for (const field of ["name", "scope", "threshold"]) {
    if (field in input) {
      const value = requiredText(input[field]);
      if (!value) return null;
      changes[field] = value;
    }
  }
  if ("active" in input) {
    if (typeof input.active !== "boolean") return null;
    changes.active = input.active;
  }
  return Object.keys(changes).length ? changes : null;
}

function parseMasterCode(input) {
  const code = requiredText(input.code);
  const name = requiredText(input.name);
  const category = requiredText(input.category);
  const active = input.active === undefined ? true : input.active;
  if (!code || !name || !category || typeof active !== "boolean") return null;
  return { code, name, category, active };
}

function parseMasterCodeChanges(input) {
  const changes = {};
  for (const field of ["code", "name", "category"]) {
    if (field in input) {
      const value = requiredText(input[field]);
      if (!value) return null;
      changes[field] = value;
    }
  }
  if ("active" in input) {
    if (typeof input.active !== "boolean") return null;
    changes.active = input.active;
  }
  return Object.keys(changes).length ? changes : null;
}

const optionalText = (value) => value === undefined || value === null || value === "" ? null : requiredText(value);

function parseActionPlan(input) {
  const status = requiredText(input.status);
  const alarmId = optionalText(input.alarmId);
  const targetId = optionalText(input.targetId);
  const targetStatus = optionalText(input.targetStatus);
  if (!status || (!alarmId && !targetId) || (input.alarmId !== undefined && input.alarmId !== null && !alarmId) || (input.targetId !== undefined && input.targetId !== null && !targetId)) return null;
  if ((alarmId && !isUuid(alarmId)) || (targetId && !isUuid(targetId))) return null;
  if ((input.targetStatus !== undefined && input.targetStatus !== null && !targetStatus) || (targetStatus && !targetId)) return null;
  const values = {};
  for (const field of ["rootCause", "immediateAction", "preventiveAction"]) {
    values[field] = optionalText(input[field]);
    if (input[field] !== undefined && input[field] !== null && !values[field]) return null;
  }
  if (input.tasks !== undefined && (!Array.isArray(input.tasks) || input.tasks.some((task) => {
    if (!task || typeof task !== "object") return true;
    return !requiredText(task.description) || !requiredText(task.owner) || optionalDate(task.dueDate) === undefined;
  }))) return null;
  return {
    status, alarmId, targetId, targetStatus, ...values,
    tasks: (input.tasks ?? []).map((task) => ({ description: requiredText(task.description), owner: requiredText(task.owner), dueDate: optionalDate(task.dueDate) ?? null })),
  };
}

export function createAlarmRouteHandlers(repository) {
  return {
    async GET() {
      try { return json({ alarms: await repository.listAlarms() }); }
      catch { return json({ error: "알람 목록을 불러올 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createAlarmDetailRouteHandlers(repository) {
  return {
    async GET(_request, context) {
      try {
        const { id } = await context.params;
        const alarm = await repository.findAlarm(id);
        if (!alarm) return json({ error: "알람을 찾을 수 없습니다." }, { status: 404 });
        return json({ alarm, sampleDelayStages: await repository.listSampleDelayStages(id) });
      } catch { return json({ error: "알람 상세 정보를 불러올 수 없습니다." }, { status: 500 }); }
    },
    async PATCH(request, context) {
      const body = await readJson(request);
      const changes = body && parseAlarmChanges(body);
      if (!changes) return json({ error: "수정할 알람 값이 필요합니다." }, { status: 400 });
      try {
        const { id } = await context.params;
        if (!isUuid(id)) return json({ error: "알람 식별자가 올바르지 않습니다." }, { status: 400 });
        const alarm = await repository.updateAlarmWithAudit(id, changes, { eventType: "alarm.updated", entityType: "alarm", details: changes });
        if (!alarm) return json({ error: "알람을 찾을 수 없습니다." }, { status: 404 });
        return json({ alarm });
      } catch { return json({ error: "알람을 수정할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createMasterRuleRouteHandlers(repository) {
  return {
    async GET(request) {
      const kind = requiredText(new URL(request.url).searchParams.get("kind"));
      if (!kind || !validRuleKinds.has(kind)) return json({ error: "규칙 종류가 올바르지 않습니다." }, { status: 400 });
      try { return json({ rules: await repository.listMasterRules(kind) }); }
      catch { return json({ error: "규칙 목록을 불러올 수 없습니다." }, { status: 500 }); }
    },
    async POST(request) {
      const body = await readJson(request);
      const rule = body && parseMasterRule(body);
      if (!rule) return json({ error: "규칙 입력값이 올바르지 않습니다." }, { status: 400 });
      try {
        const created = await repository.createMasterRuleWithAudit(rule, { eventType: "master-rule.created", entityType: "master-rule", details: { ruleCode: rule.ruleCode, kind: rule.kind } });
        return json({ rule: created }, { status: 201 });
      } catch { return json({ error: "규칙을 저장할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createMasterRuleDetailRouteHandlers(repository) {
  return {
    async PATCH(request, context) {
      const body = await readJson(request);
      const changes = body && parseMasterRuleChanges(body);
      if (!changes) return json({ error: "수정할 규칙 값이 필요합니다." }, { status: 400 });
      try {
        const { id } = await context.params;
        if (!isUuid(id)) return json({ error: "규칙 식별자가 올바르지 않습니다." }, { status: 400 });
        const rule = await repository.updateMasterRuleWithAudit(id, changes, { eventType: "master-rule.updated", entityType: "master-rule", details: changes });
        if (!rule) return json({ error: "규칙을 찾을 수 없습니다." }, { status: 404 });
        return json({ rule });
      } catch { return json({ error: "규칙을 수정할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createMasterCodeRouteHandlers(repository) {
  return {
    async GET() {
      try { return json({ codes: await repository.listMasterCodes() }); }
      catch { return json({ error: "코드 목록을 불러올 수 없습니다." }, { status: 500 }); }
    },
    async POST(request) {
      const body = await readJson(request);
      const code = body && parseMasterCode(body);
      if (!code) return json({ error: "코드 입력값이 올바르지 않습니다." }, { status: 400 });
      try {
        const created = await repository.createMasterCodeWithAudit(code, { eventType: "master-code.created", entityType: "master-code", details: { code: code.code, category: code.category } });
        return json({ code: created }, { status: 201 });
      } catch { return json({ error: "코드를 저장할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createMasterCodeDetailRouteHandlers(repository) {
  return {
    async PATCH(request, context) {
      const body = await readJson(request);
      const changes = body && parseMasterCodeChanges(body);
      if (!changes) return json({ error: "수정할 코드 값이 필요합니다." }, { status: 400 });
      try {
        const { id } = await context.params;
        if (!isUuid(id)) return json({ error: "코드 식별자가 올바르지 않습니다." }, { status: 400 });
        const code = await repository.updateMasterCodeWithAudit(id, changes, { eventType: "master-code.updated", entityType: "master-code", details: changes });
        if (!code) return json({ error: "코드를 찾을 수 없습니다." }, { status: 404 });
        return json({ code });
      } catch { return json({ error: "코드를 수정할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createTargetRouteHandlers(repository) {
  return {
    async GET() {
      try { return json({ targets: await repository.listTargets() }); }
      catch { return json({ error: "관리대상 목록을 불러올 수 없습니다." }, { status: 500 }); }
    },
    async POST(request) {
      const body = await readJson(request);
      const target = body && parseTarget(body);
      if (!target) return json({ error: "관리대상 입력값이 올바르지 않습니다." }, { status: 400 });
      try {
        if (target.sourceAlarmId && !await repository.findAlarm(target.sourceAlarmId)) {
          return json({ error: "연결할 알람을 찾을 수 없습니다." }, { status: 404 });
        }
        const created = await repository.createTargetWithAudit(target, { eventType: "target.created", entityType: "target", details: { name: target.name } });
        return json({ target: created }, { status: 201 });
      } catch { return json({ error: "관리대상을 저장할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createTargetDetailRouteHandlers(repository) {
  return {
    async PATCH(request, context) {
      const body = await readJson(request);
      const changes = body && parseTargetChanges(body);
      if (!changes) return json({ error: "수정할 관리대상 값이 필요합니다." }, { status: 400 });
      try {
        const { id } = await context.params;
        if (!isUuid(id)) return json({ error: "관리대상 식별자가 올바르지 않습니다." }, { status: 400 });
        const target = await repository.updateTargetWithAudit(id, changes, { eventType: "target.updated", entityType: "target", details: changes });
        if (!target) return json({ error: "관리대상을 찾을 수 없습니다." }, { status: 404 });
        return json({ target });
      } catch { return json({ error: "관리대상을 수정할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createActionPlanRouteHandlers(repository) {
  return {
    async GET(request) {
      const url = new URL(request.url);
      const alarmId = url.searchParams.get("alarmId");
      const targetId = url.searchParams.get("targetId");
      if ((alarmId === null) === (targetId === null)) {
        return json({ error: "알람 또는 관리대상 관계 하나가 필요합니다." }, { status: 400 });
      }
      const relationId = alarmId ?? targetId;
      if (!isUuid(relationId)) return json({ error: "조치계획 관계 식별자가 올바르지 않습니다." }, { status: 400 });
      const relation = alarmId ? { alarmId } : { targetId };
      try {
        return json({ actionPlans: await repository.listActionPlans(relation) });
      } catch {
        return json({ error: "조치계획 목록을 불러올 수 없습니다." }, { status: 500 });
      }
    },
    async POST(request) {
      const body = await readJson(request);
      const actionPlan = body && parseActionPlan(body);
      if (!actionPlan) return json({ error: "조치계획 입력값이 올바르지 않습니다." }, { status: 400 });
      try {
        if (actionPlan.alarmId && !await repository.findAlarm(actionPlan.alarmId)) {
          return json({ error: "연결할 알람을 찾을 수 없습니다." }, { status: 404 });
        }
        if (actionPlan.targetId && !await repository.findTarget(actionPlan.targetId)) {
          return json({ error: "연결할 관리대상을 찾을 수 없습니다." }, { status: 404 });
        }
        const created = await repository.createActionPlanWithAudit(actionPlan, { eventType: "action-plan.created", entityType: "action-plan", details: { status: actionPlan.status, alarmId: actionPlan.alarmId, targetId: actionPlan.targetId } });
        return json({ actionPlan: created }, { status: 201 });
      } catch { return json({ error: "조치계획을 저장할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createActionPlanDetailRouteHandlers(repository) {
  return {
    async PATCH(request, context) {
      const body = await readJson(request);
      const actionPlan = body && parseActionPlan(body);
      if (!actionPlan) return json({ error: "Invalid action plan input." }, { status: 400 });
      const relation = actionPlan.targetId ? { targetId: actionPlan.targetId } : { alarmId: actionPlan.alarmId };
      try {
        const { id } = await context.params;
        if (!isUuid(id)) return json({ error: "Invalid action plan id." }, { status: 400 });
        const updated = await repository.updateActionPlanWithAudit(id, relation, actionPlan, {
          eventType: "action-plan.updated", entityType: "action-plan", details: { status: actionPlan.status, ...relation },
        });
        if (!updated) return json({ error: "Action plan not found." }, { status: 404 });
        return json({ actionPlan: updated });
      } catch {
        return json({ error: "Unable to save action plan." }, { status: 500 });
      }
    },
  };
}

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

function optionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseTarget(input) {
  const name = requiredText(input.name);
  const status = requiredText(input.status);
  const owner = requiredText(input.owner);
  const priority = requiredText(input.priority);
  const dueDate = optionalDate(input.dueDate);
  const sourceAlarmId = input.sourceAlarmId === undefined || input.sourceAlarmId === null ? null : requiredText(input.sourceAlarmId);
  if (!name || !status || !owner || !priority || dueDate === undefined || (input.sourceAlarmId !== undefined && input.sourceAlarmId !== null && !sourceAlarmId)) return null;
  return { name, status, owner, priority, dueDate, sourceAlarmId };
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

const optionalText = (value) => value === undefined || value === null || value === "" ? null : requiredText(value);

function parseActionPlan(input) {
  const status = requiredText(input.status);
  const alarmId = optionalText(input.alarmId);
  const targetId = optionalText(input.targetId);
  if (!status || (!alarmId && !targetId) || (input.alarmId !== undefined && input.alarmId !== null && !alarmId) || (input.targetId !== undefined && input.targetId !== null && !targetId)) return null;
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
    status, alarmId, targetId, ...values,
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
        const target = await repository.updateTargetWithAudit(id, changes, { eventType: "target.updated", entityType: "target", details: changes });
        if (!target) return json({ error: "관리대상을 찾을 수 없습니다." }, { status: 404 });
        return json({ target });
      } catch { return json({ error: "관리대상을 수정할 수 없습니다." }, { status: 500 }); }
    },
  };
}

export function createActionPlanRouteHandlers(repository) {
  return {
    async POST(request) {
      const body = await readJson(request);
      const actionPlan = body && parseActionPlan(body);
      if (!actionPlan) return json({ error: "조치계획 입력값이 올바르지 않습니다." }, { status: 400 });
      try {
        const created = await repository.createActionPlanWithAudit(actionPlan, { eventType: "action-plan.created", entityType: "action-plan", details: { status: actionPlan.status, alarmId: actionPlan.alarmId, targetId: actionPlan.targetId } });
        return json({ actionPlan: created }, { status: 201 });
      } catch { return json({ error: "조치계획을 저장할 수 없습니다." }, { status: 500 }); }
    },
  };
}

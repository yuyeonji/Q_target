import { json, optionalDate, readJson, requiredText } from "@/lib/api-utils";
import { createQualityRepository, type NewActionPlan, type QualityRepository } from "@/lib/quality-repository";

function optionalText(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value);
}

function parseActionPlan(input: Record<string, unknown>): NewActionPlan | null {
  const status = requiredText(input.status);
  const alarmId = optionalText(input.alarmId);
  if (!status || (input.alarmId !== undefined && input.alarmId !== null && !alarmId)) return null;

  const fields = ["rootCause", "immediateAction", "preventiveAction"] as const;
  const values = Object.fromEntries(fields.map((field) => [field, optionalText(input[field])])) as Record<typeof fields[number], string | null>;
  if (fields.some((field) => input[field] !== undefined && input[field] !== null && !values[field])) return null;

  if (input.tasks !== undefined && (!Array.isArray(input.tasks) || input.tasks.some((task) => {
    if (!task || typeof task !== "object") return true;
    const item = task as Record<string, unknown>;
    return !requiredText(item.description) || !requiredText(item.owner) || optionalDate(item.dueDate) === undefined;
  }))) return null;

  return {
    status,
    alarmId,
    ...values,
    tasks: Array.isArray(input.tasks) ? input.tasks.map((task) => {
      const item = task as Record<string, unknown>;
      return { description: requiredText(item.description)!, owner: requiredText(item.owner)!, dueDate: optionalDate(item.dueDate) ?? null };
    }) : [],
  };
}

export function createActionPlanRouteHandlers(repository: QualityRepository) {
  return {
    async POST(request: Request) {
      const body = await readJson(request);
      const actionPlan = body && parseActionPlan(body);
      if (!actionPlan) return json({ error: "조치계획 입력값이 올바르지 않습니다." }, { status: 400 });

      try {
        const created = await repository.createActionPlan(actionPlan);
        await repository.createAuditEvent({ eventType: "action-plan.created", entityType: "action-plan", entityId: created.id, details: { status: actionPlan.status } });
        return json({ actionPlan: created }, { status: 201 });
      } catch {
        return json({ error: "조치계획을 저장할 수 없습니다." }, { status: 500 });
      }
    },
  };
}

export async function POST(request: Request) {
  return createActionPlanRouteHandlers(createQualityRepository()).POST(request);
}

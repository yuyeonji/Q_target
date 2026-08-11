import { json, optionalDate, readJson, requiredText } from "@/lib/api-utils";
import { createQualityRepository, type QualityRepository } from "@/lib/quality-repository";

function parseTarget(input: Record<string, unknown>) {
  const name = requiredText(input.name);
  const status = requiredText(input.status);
  const owner = requiredText(input.owner);
  const priority = requiredText(input.priority);
  const dueDate = optionalDate(input.dueDate);
  const sourceAlarmId = input.sourceAlarmId === undefined || input.sourceAlarmId === null ? null : requiredText(input.sourceAlarmId);

  if (!name || !status || !owner || !priority || dueDate === undefined || (input.sourceAlarmId !== undefined && input.sourceAlarmId !== null && !sourceAlarmId)) return null;
  return { name, status, owner, priority, dueDate, sourceAlarmId };
}

export function createTargetRouteHandlers(repository: QualityRepository) {
  return {
    async GET() {
      try {
        return json({ targets: await repository.listTargets() });
      } catch {
        return json({ error: "관리대상 목록을 불러올 수 없습니다." }, { status: 500 });
      }
    },
    async POST(request: Request) {
      const body = await readJson(request);
      const target = body && parseTarget(body);
      if (!target) return json({ error: "관리대상 입력값이 올바르지 않습니다." }, { status: 400 });

      try {
        const created = await repository.createTarget(target);
        await repository.createAuditEvent({ eventType: "target.created", entityType: "target", entityId: created.id, details: { name: target.name } });
        return json({ target: created }, { status: 201 });
      } catch {
        return json({ error: "관리대상을 저장할 수 없습니다." }, { status: 500 });
      }
    },
  };
}

export async function GET() {
  return createTargetRouteHandlers(createQualityRepository()).GET();
}

export async function POST(request: Request) {
  return createTargetRouteHandlers(createQualityRepository()).POST(request);
}

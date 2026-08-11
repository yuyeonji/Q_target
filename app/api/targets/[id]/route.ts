import { json, optionalDate, readJson, requiredText } from "@/lib/api-utils";
import { createQualityRepository, type QualityRepository, type TargetChanges } from "@/lib/quality-repository";

type RouteContext = { params: Promise<{ id: string }> };

function parseChanges(input: Record<string, unknown>): TargetChanges | null {
  const changes: TargetChanges = {};
  for (const field of ["name", "status", "owner", "priority"] as const) {
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

export function createTargetDetailRouteHandlers(repository: QualityRepository) {
  return {
    async PATCH(request: Request, context: RouteContext) {
      const body = await readJson(request);
      const changes = body && parseChanges(body);
      if (!changes) return json({ error: "수정할 관리대상 값이 필요합니다." }, { status: 400 });

      try {
        const { id } = await context.params;
        const target = await repository.updateTarget(id, changes);
        if (!target) return json({ error: "관리대상을 찾을 수 없습니다." }, { status: 404 });
        await repository.createAuditEvent({ eventType: "target.updated", entityType: "target", entityId: id, details: changes });
        return json({ target });
      } catch {
        return json({ error: "관리대상을 수정할 수 없습니다." }, { status: 500 });
      }
    },
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  return createTargetDetailRouteHandlers(createQualityRepository()).PATCH(request, context);
}

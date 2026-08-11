import { json } from "@/lib/api-utils";
import { createQualityRepository, type QualityRepository } from "@/lib/quality-repository";

type RouteContext = { params: Promise<{ id: string }> };

export function createAlarmDetailRouteHandlers(repository: QualityRepository) {
  return {
    async GET(_request: Request, context: RouteContext) {
      try {
        const { id } = await context.params;
        const alarm = await repository.findAlarm(id);
        if (!alarm) return json({ error: "알람을 찾을 수 없습니다." }, { status: 404 });

        return json({ alarm, sampleDelayStages: await repository.listSampleDelayStages(id) });
      } catch {
        return json({ error: "알람 상세 정보를 불러올 수 없습니다." }, { status: 500 });
      }
    },
  };
}

export async function GET(request: Request, context: RouteContext) {
  return createAlarmDetailRouteHandlers(createQualityRepository()).GET(request, context);
}

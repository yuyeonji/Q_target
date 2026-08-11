import { json } from "@/lib/api-utils";
import { createQualityRepository, type QualityRepository } from "@/lib/quality-repository";

export function createAlarmRouteHandlers(repository: QualityRepository) {
  return {
    async GET() {
      try {
        return json({ alarms: await repository.listAlarms() });
      } catch {
        return json({ error: "알람 목록을 불러올 수 없습니다." }, { status: 500 });
      }
    },
  };
}

export async function GET() {
  return createAlarmRouteHandlers(createQualityRepository()).GET();
}

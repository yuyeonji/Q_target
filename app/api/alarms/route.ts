import { createQualityRepository } from "@/lib/quality-repository";
import { getWorkerDb } from "@/db/worker";
import * as schema from "@/db/schema";
export { createAlarmRouteHandlers } from "@/lib/route-handlers.mjs";
import { createAlarmRouteHandlers } from "@/lib/route-handlers.mjs";

export async function GET() {
  return createAlarmRouteHandlers(createQualityRepository(getWorkerDb(), schema)).GET();
}

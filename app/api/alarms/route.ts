import { createQualityRepository } from "@/lib/quality-repository";
export { createAlarmRouteHandlers } from "@/lib/route-handlers.mjs";
import { createAlarmRouteHandlers } from "@/lib/route-handlers.mjs";

export async function GET() {
  return createAlarmRouteHandlers(createQualityRepository()).GET();
}

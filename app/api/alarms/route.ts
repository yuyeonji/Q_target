import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
export { createAlarmRouteHandlers } from "@/lib/route-handlers.mjs";
import { createAlarmRouteHandlers } from "@/lib/route-handlers.mjs";

export async function GET() {
  return createAlarmRouteHandlers(createQualityRepository(getDb(), schema)).GET();
}

import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
export { createActionPlanRouteHandlers } from "@/lib/route-handlers.mjs";
import { createActionPlanRouteHandlers } from "@/lib/route-handlers.mjs";

export async function POST(request: Request) {
  return createActionPlanRouteHandlers(createQualityRepository(getDb(), schema)).POST(request);
}

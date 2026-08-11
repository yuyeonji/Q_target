import { createQualityRepository } from "@/lib/quality-repository";
import { getWorkerDb } from "@/db/worker";
import * as schema from "@/db/schema";
export { createActionPlanRouteHandlers } from "@/lib/route-handlers.mjs";
import { createActionPlanRouteHandlers } from "@/lib/route-handlers.mjs";

export async function POST(request: Request) {
  return createActionPlanRouteHandlers(createQualityRepository(getWorkerDb(), schema)).POST(request);
}

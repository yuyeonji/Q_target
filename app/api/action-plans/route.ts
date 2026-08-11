import { createQualityRepository } from "@/lib/quality-repository";
export { createActionPlanRouteHandlers } from "@/lib/route-handlers.mjs";
import { createActionPlanRouteHandlers } from "@/lib/route-handlers.mjs";

export async function POST(request: Request) {
  return createActionPlanRouteHandlers(createQualityRepository()).POST(request);
}

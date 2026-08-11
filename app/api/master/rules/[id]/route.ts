import { createQualityRepository } from "@/lib/quality-repository";
import { getWorkerDb } from "@/db/worker";
import * as schema from "@/db/schema";
export { createMasterRuleDetailRouteHandlers } from "@/lib/route-handlers.mjs";
import { createMasterRuleDetailRouteHandlers } from "@/lib/route-handlers.mjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return createMasterRuleDetailRouteHandlers(createQualityRepository(getWorkerDb(), schema)).PATCH(request, context);
}

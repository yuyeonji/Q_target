import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
export { createMasterRuleDetailRouteHandlers } from "@/lib/route-handlers.mjs";
import { createMasterRuleDetailRouteHandlers } from "@/lib/route-handlers.mjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return createMasterRuleDetailRouteHandlers(createQualityRepository(getDb(), schema)).PATCH(request, context);
}

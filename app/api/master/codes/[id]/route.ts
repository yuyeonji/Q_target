import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
export { createMasterCodeDetailRouteHandlers } from "@/lib/route-handlers.mjs";
import { createMasterCodeDetailRouteHandlers } from "@/lib/route-handlers.mjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return createMasterCodeDetailRouteHandlers(createQualityRepository(getDb(), schema)).PATCH(request, context);
}

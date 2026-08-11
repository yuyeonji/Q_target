import { createQualityRepository } from "@/lib/quality-repository";
import { getWorkerDb } from "@/db/worker";
import * as schema from "@/db/schema";
export { createTargetDetailRouteHandlers } from "@/lib/route-handlers.mjs";
import { createTargetDetailRouteHandlers } from "@/lib/route-handlers.mjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return createTargetDetailRouteHandlers(createQualityRepository(getWorkerDb(), schema)).PATCH(request, context);
}

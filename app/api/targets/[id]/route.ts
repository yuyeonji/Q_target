import { createQualityRepository } from "@/lib/quality-repository";
export { createTargetDetailRouteHandlers } from "@/lib/route-handlers.mjs";
import { createTargetDetailRouteHandlers } from "@/lib/route-handlers.mjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return createTargetDetailRouteHandlers(createQualityRepository()).PATCH(request, context);
}

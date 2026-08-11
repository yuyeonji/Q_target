import { createQualityRepository } from "@/lib/quality-repository";
export { createAlarmDetailRouteHandlers } from "@/lib/route-handlers.mjs";
import { createAlarmDetailRouteHandlers } from "@/lib/route-handlers.mjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return createAlarmDetailRouteHandlers(createQualityRepository()).GET(request, context);
}

import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
export { createAlarmDetailRouteHandlers } from "@/lib/route-handlers.mjs";
import { createAlarmDetailRouteHandlers } from "@/lib/route-handlers.mjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return createAlarmDetailRouteHandlers(createQualityRepository(getDb(), schema)).GET(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return createAlarmDetailRouteHandlers(createQualityRepository(getDb(), schema)).PATCH(request, context);
}

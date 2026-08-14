import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { createActionPlanDetailRouteHandlers } from "@/lib/route-handlers.mjs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return createActionPlanDetailRouteHandlers(createQualityRepository(getDb(), schema)).PATCH(request, context);
}

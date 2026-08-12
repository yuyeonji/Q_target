import { createQualityRepository } from "@/lib/quality-repository";
import { getWorkerDb } from "@/db/worker";
import * as schema from "@/db/schema";
import { createActionPlanDetailRouteHandlers } from "@/lib/route-handlers.mjs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return createActionPlanDetailRouteHandlers(createQualityRepository(getWorkerDb(), schema)).PATCH(request, context);
}

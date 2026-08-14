import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { createQualityRepository } from "@/lib/quality-repository";
import { createActionPlanCloseRouteHandlers } from "@/lib/route-handlers.mjs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return createActionPlanCloseRouteHandlers(createQualityRepository(getDb(), schema)).POST(request, context);
}

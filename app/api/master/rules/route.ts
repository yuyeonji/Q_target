import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
export { createMasterRuleRouteHandlers } from "@/lib/route-handlers.mjs";
import { createMasterRuleRouteHandlers } from "@/lib/route-handlers.mjs";

export async function GET(request: Request) {
  return createMasterRuleRouteHandlers(createQualityRepository(getDb(), schema)).GET(request);
}

export async function POST(request: Request) {
  return createMasterRuleRouteHandlers(createQualityRepository(getDb(), schema)).POST(request);
}

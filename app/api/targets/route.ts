import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
export { createTargetRouteHandlers } from "@/lib/route-handlers.mjs";
import { createTargetRouteHandlers } from "@/lib/route-handlers.mjs";

export async function GET() {
  return createTargetRouteHandlers(createQualityRepository(getDb(), schema)).GET();
}

export async function POST(request: Request) {
  return createTargetRouteHandlers(createQualityRepository(getDb(), schema)).POST(request);
}

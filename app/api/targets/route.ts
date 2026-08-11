import { createQualityRepository } from "@/lib/quality-repository";
import { getWorkerDb } from "@/db/worker";
import * as schema from "@/db/schema";
export { createTargetRouteHandlers } from "@/lib/route-handlers.mjs";
import { createTargetRouteHandlers } from "@/lib/route-handlers.mjs";

export async function GET() {
  return createTargetRouteHandlers(createQualityRepository(getWorkerDb(), schema)).GET();
}

export async function POST(request: Request) {
  return createTargetRouteHandlers(createQualityRepository(getWorkerDb(), schema)).POST(request);
}

import { createQualityRepository } from "@/lib/quality-repository";
import { getWorkerDb } from "@/db/worker";
import * as schema from "@/db/schema";
export { createMasterCodeRouteHandlers } from "@/lib/route-handlers.mjs";
import { createMasterCodeRouteHandlers } from "@/lib/route-handlers.mjs";

export async function GET() {
  return createMasterCodeRouteHandlers(createQualityRepository(getWorkerDb(), schema)).GET();
}

export async function POST(request: Request) {
  return createMasterCodeRouteHandlers(createQualityRepository(getWorkerDb(), schema)).POST(request);
}

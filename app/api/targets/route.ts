import { createQualityRepository } from "@/lib/quality-repository";
export { createTargetRouteHandlers } from "@/lib/route-handlers.mjs";
import { createTargetRouteHandlers } from "@/lib/route-handlers.mjs";

export async function GET() {
  return createTargetRouteHandlers(createQualityRepository()).GET();
}

export async function POST(request: Request) {
  return createTargetRouteHandlers(createQualityRepository()).POST(request);
}

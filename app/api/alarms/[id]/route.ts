import { createQualityRepository } from "@/lib/quality-repository";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
export { createAlarmDetailRouteHandlers } from "@/lib/route-handlers.mjs";
import { createAlarmDetailRouteHandlers } from "@/lib/route-handlers.mjs";

type RouteContext = { params: Promise<{ id: string }> };
const qualityTables = {
  actionPlans: schema.actionPlans,
  actionTasks: schema.actionTasks,
  alarmAttachments: schema.alarmAttachments,
  alarmDetails: schema.alarmDetails,
  alarmMeasurements: schema.alarmMeasurements,
  alarms: schema.alarms,
  auditEvents: schema.auditEvents,
  masterCodes: schema.masterCodes,
  masterRules: schema.masterRules,
  sampleDelayStages: schema.sampleDelayStages,
  targets: schema.targets,
};

export async function GET(request: Request, context: RouteContext) {
  return createAlarmDetailRouteHandlers(createQualityRepository(getDb(), qualityTables)).GET(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return createAlarmDetailRouteHandlers(createQualityRepository(getDb(), qualityTables)).PATCH(request, context);
}

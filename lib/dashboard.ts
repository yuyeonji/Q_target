import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { actionPlans, alarms, targets } from "@/db/schema";
import { buildDashboardResponse, type DashboardFilters, type DashboardResponse } from "./dashboard-types";

const PERIOD_DAYS: Record<DashboardFilters["period"], number> = {
  "7d": 7,
  "30d": 30,
  quarter: 90,
};

export async function loadDashboard(filters: DashboardFilters): Promise<DashboardResponse> {
  const db = getDb();
  const now = new Date();
  const predicates = [gte(alarms.occurredAt, new Date(now.getTime() - PERIOD_DAYS[filters.period] * 86_400_000))];
  if (filters.factory !== "all") predicates.push(eq(alarms.factory, filters.factory));
  if (filters.productType !== "all") predicates.push(eq(alarms.productType, filters.productType));

  const matchingAlarms = await db.select().from(alarms).where(and(...predicates));
  const alarmIds = matchingAlarms.map((alarm) => alarm.id);
  const matchingTargets = alarmIds.length
    ? await db.select().from(targets).where(inArray(targets.sourceAlarmId, alarmIds))
    : [];
  const targetIds = matchingTargets.map((target) => target.id);
  const matchingPlans = targetIds.length
    ? await db.select().from(actionPlans).where(inArray(actionPlans.targetId, targetIds))
    : [];

  return buildDashboardResponse({
    filters,
    now,
    alarms: matchingAlarms,
    targets: matchingTargets,
    actionPlans: matchingPlans,
  });
}

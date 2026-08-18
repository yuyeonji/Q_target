import { getDb } from "@/db";
import { actionPlans, alarmDetails, alarms, targets } from "@/db/schema";
import { buildDashboardResponse, type DashboardFilters, type DashboardResponse } from "./dashboard-types";

const customerFromAffectedProducts = (value: string | null) => value?.split("/").at(-1)?.trim() || null;

export async function loadDashboard(filters: DashboardFilters): Promise<DashboardResponse> {
  const db = getDb();
  const now = new Date();
  const [storedAlarms, details, storedTargets, storedPlans] = await Promise.all([
    db.select().from(alarms),
    db.select().from(alarmDetails),
    db.select().from(targets),
    db.select().from(actionPlans),
  ]);
  const customerByAlarmId = new Map(details.map((detail) => [detail.alarmId, customerFromAffectedProducts(detail.affectedProductsCustomers)]));
  const dashboardAlarms = storedAlarms.map((alarm) => ({ ...alarm, customer: customerByAlarmId.get(alarm.id) ?? null }));

  return buildDashboardResponse({
    filters,
    now,
    alarms: dashboardAlarms,
    targets: storedTargets,
    actionPlans: storedPlans,
  });
}

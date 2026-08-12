import { createDashboardRouteHandlers, parseDashboardFilters } from "@/lib/dashboard.mjs";
import { loadDashboard } from "@/lib/dashboard";

export async function GET(request: Request) {
  return createDashboardRouteHandlers(loadDashboard).GET(request);
}

export { createDashboardRouteHandlers, parseDashboardFilters };

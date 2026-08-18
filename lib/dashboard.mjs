const PERIOD_DAYS = { "7d": 7, "30d": 30, quarter: 90 };
const COMPLETE_STATUSES = new Set(["완료", "종결", "closed", "complete"]);

export function parseDashboardFilters(url) {
  const period = url.searchParams.get("period") ?? "7d";
  const factory = url.searchParams.get("factory") ?? "all";
  const productType = url.searchParams.get("productType") ?? "all";
  if (!(period in PERIOD_DAYS)) throw new Error("INVALID_PERIOD");
  return { period, factory, productType };
}

export function filterSince(filters, now) {
  return new Date(now.getTime() - PERIOD_DAYS[filters.period] * 24 * 60 * 60 * 1000);
}

export function buildDashboardResponse({ filters, now, alarms, targets, actionPlans }) {
  const since = filterSince(filters, now);
  const filteredAlarms = alarms.filter((alarm) => (
    new Date(alarm.occurredAt) >= since
    && (filters.factory === "all" || alarm.factory === filters.factory)
    && (filters.productType === "all" || alarm.productType === filters.productType)
  ));
  const alarmIds = new Set(filteredAlarms.map((alarm) => alarm.id));
  const filteredTargets = targets.filter((target) => alarmIds.has(target.sourceAlarmId));
  const targetIds = new Set(filteredTargets.map((target) => target.id));
  const matchingPlans = actionPlans.filter((plan) => targetIds.has(plan.targetId));
  const completedPlans = matchingPlans.filter((plan) => COMPLETE_STATUSES.has(String(plan.status).toLowerCase()));
  const overdueCases = filteredTargets.filter((target) => (
    target.dueDate && new Date(target.dueDate) < now && !COMPLETE_STATUSES.has(String(target.status).toLowerCase())
  ));
  const trend = new Map();
  for (const alarm of filteredAlarms) {
    const date = new Date(alarm.occurredAt).toISOString().slice(0, 10);
    const key = `${date}\u0000${alarm.type}`;
    trend.set(key, (trend.get(key) ?? 0) + 1);
  }
  const distribution = new Map();
  for (const target of filteredTargets) {
    distribution.set(target.status, (distribution.get(target.status) ?? 0) + 1);
  }

  return {
    kpi: {
      totalAlerts: filteredAlarms.length,
      totalTargets: filteredTargets.length,
      closureRate: matchingPlans.length ? Math.round((completedPlans.length / matchingPlans.length) * 1000) / 10 : 0,
    },
    alerts: filteredAlarms.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 10),
    cases: overdueCases.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    chartData: {
      alertTrend: [...trend.entries()]
        .map(([key, count]) => {
          const [date, category] = key.split("\u0000");
          return { date, category, count };
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.category.localeCompare(b.category)),
      targetDistribution: [...distribution.entries()].map(([status, count]) => ({ status, count })),
    },
  };
}

export function createDashboardRouteHandlers(loadDashboard) {
  return {
    async GET(request) {
      let filters;
      try {
        filters = parseDashboardFilters(new URL(request.url));
      } catch {
        return Response.json({ error: "Invalid dashboard filters." }, { status: 400 });
      }
      try {
        return Response.json(await loadDashboard(filters));
      } catch {
        return Response.json({ error: "Unable to load dashboard data." }, { status: 500 });
      }
    },
  };
}

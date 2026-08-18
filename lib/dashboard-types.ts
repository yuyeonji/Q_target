export type DashboardFilters = {
  period: "7d" | "30d" | "quarter";
  factory: string;
  productType: string;
};

export type DashboardAlert = {
  id: string;
  alarmCode: string;
  type: string;
  line: string;
  duration?: string;
  status: string;
  occurredAt: string | Date;
  factory?: string | null;
  productType?: string | null;
};

export type DashboardCase = {
  id: string;
  targetCode: string;
  name: string;
  status: string;
  dueDate: string | Date | null;
  sourceAlarmId: string | null;
};

export type DashboardResponse = {
  kpi: { totalAlerts: number; totalTargets: number; closureRate: number };
  alerts: DashboardAlert[];
  cases: DashboardCase[];
  chartData: {
    alertTrend: Array<{ date: string; category: string; count: number }>;
    targetDistribution: Array<{ status: string; count: number }>;
  };
};

export type DashboardBuildInput = {
  filters: DashboardFilters;
  now: Date;
  alarms: DashboardAlert[];
  targets: DashboardCase[];
  actionPlans: Array<{ id: string; targetId: string | null; status: string }>;
};

export function buildDashboardResponse(input: DashboardBuildInput): DashboardResponse {
  const days = { "7d": 7, "30d": 30, quarter: 90 } as const;
  const completeStatuses = new Set(["완료", "종결", "closed", "complete"]);
  const since = new Date(input.now.getTime() - days[input.filters.period] * 86_400_000);
  const alerts = input.alarms.filter((alarm) => new Date(alarm.occurredAt) >= since);
  const targetIds = new Set(input.targets.map((target) => target.id));
  const plans = input.actionPlans.filter((plan) => plan.targetId && targetIds.has(plan.targetId));
  const completed = plans.filter((plan) => completeStatuses.has(plan.status.toLowerCase()));
  const alertTrend = new Map<string, number>();
  const targetDistribution = new Map<string, number>();
  for (const alert of alerts) {
    const date = new Date(alert.occurredAt).toISOString().slice(0, 10);
    const key = `${date}\u0000${alert.type}`;
    alertTrend.set(key, (alertTrend.get(key) ?? 0) + 1);
  }
  for (const target of input.targets) targetDistribution.set(target.status, (targetDistribution.get(target.status) ?? 0) + 1);
  return {
    kpi: { totalAlerts: alerts.length, totalTargets: input.targets.length, closureRate: plans.length ? Math.round((completed.length / plans.length) * 1000) / 10 : 0 },
    alerts: [...alerts].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt)).slice(0, 10),
    cases: input.targets.filter((target) => target.dueDate && new Date(target.dueDate) < input.now && !completeStatuses.has(target.status.toLowerCase())),
    chartData: {
      alertTrend: [...alertTrend.entries()]
        .map(([key, count]) => {
          const [date, category] = key.split("\u0000");
          return { date, category, count };
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.category.localeCompare(b.category)),
      targetDistribution: [...targetDistribution.entries()].map(([status, count]) => ({ status, count })),
    },
  };
}

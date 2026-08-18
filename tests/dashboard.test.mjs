import assert from "node:assert/strict";
import test from "node:test";

const now = new Date("2026-08-12T12:00:00.000Z");

test("dashboard aggregation applies period, factory, and product filters to KPI and panels", async () => {
  const { buildDashboardResponse } = await import("../lib/dashboard.mjs");
  const response = buildDashboardResponse({
    filters: { period: "7d", factory: "Alpha", productType: "Type Y" },
    now,
    alarms: [
      { id: "a-1", alarmCode: "AL-1", item: "Type Y", customer: "Alpha", type: "delay", line: "L1", duration: "2h", status: "심각", occurredAt: new Date("2026-08-10T09:00:00Z") },
      { id: "a-2", alarmCode: "AL-2", item: "Type Y", customer: "Beta", type: "defect", line: "L2", duration: "1h", status: "경고", occurredAt: new Date("2026-08-10T09:00:00Z") },
      { id: "a-3", alarmCode: "AL-3", item: "Type Y", customer: "Alpha", type: "defect", line: "L3", duration: "1h", status: "경고", occurredAt: new Date("2026-07-01T09:00:00Z") },
    ],
    targets: [
      { id: "t-1", targetCode: "TRG-1", name: "Past due", status: "진행 중", dueDate: new Date("2026-08-11T00:00:00Z"), sourceAlarmId: "a-1" },
      { id: "t-2", targetCode: "TRG-2", name: "Completed", status: "완료", dueDate: new Date("2026-08-11T00:00:00Z"), sourceAlarmId: "a-1" },
    ],
    actionPlans: [
      { id: "p-1", targetId: "t-1", status: "진행 중" },
      { id: "p-2", targetId: "t-2", status: "종결" },
    ],
  });

  assert.equal(response.kpi.totalAlerts, 1);
  assert.equal(response.kpi.totalTargets, 2);
  assert.equal(response.kpi.closureRate, 50);
  assert.deepEqual(response.alerts.map((alert) => alert.id), ["a-1"]);
  assert.deepEqual(response.cases.map((item) => item.id), ["t-1"]);
  assert.deepEqual(response.chartData.alertTrend, [{ date: "2026-08-10", count: 1 }]);
});

test("dashboard filters customers and alarm item names, and returns actual KPI notes and options", async () => {
  const { buildDashboardResponse } = await import("../lib/dashboard.mjs");
  const response = buildDashboardResponse({
    filters: { period: "all", factory: "광양", productType: "NCM N86 Bulk F 소입경 04μm" },
    now,
    alarms: [
      { id: "a-1", alarmCode: "AL-1", item: "NCM N86 Bulk F 소입경 04μm", customer: "광양", type: "delay", line: "L1", status: "심각", occurredAt: new Date("2026-08-10T09:00:00Z") },
      { id: "a-2", alarmCode: "AL-2", item: "LFP M65 Standard A 중입경 08μm", customer: "포항", type: "defect", line: "L2", status: "신규", occurredAt: new Date("2026-08-10T09:00:00Z") },
    ],
    targets: [
      { id: "t-1", targetCode: "TRG-1", name: "linked", status: "진행 중", dueDate: new Date("2026-08-11T00:00:00Z"), sourceAlarmId: "a-1" },
    ],
    actionPlans: [],
  });

  assert.equal(response.kpi.totalAlerts, 1);
  assert.equal(response.kpi.criticalAlerts, 1);
  assert.equal(response.kpi.newAlerts, 0);
  assert.equal(response.kpi.inProgressTargets, 1);
  assert.equal(response.kpi.overdueTargets, 1);
  assert.deepEqual(response.filterOptions, {
    customers: ["광양", "포항"],
    products: ["LFP M65 Standard A 중입경 08μm", "NCM N86 Bulk F 소입경 04μm"],
  });
});

test("dashboard route validates filters and hides database failures", async () => {
  const { createDashboardRouteHandlers } = await import("../lib/dashboard.mjs");
  const handler = createDashboardRouteHandlers(async () => {
    throw new Error("DATABASE_URL=postgresql://secret");
  });

  const invalid = await handler.GET(new Request("http://app.local/api/dashboard?period=forever"));
  assert.equal(invalid.status, 400);

  const failed = await handler.GET(new Request("http://app.local/api/dashboard?period=7d&factory=Alpha&productType=Type%20Y"));
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: "Unable to load dashboard data." });
});

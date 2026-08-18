import assert from "node:assert/strict";
import test from "node:test";

const now = new Date("2026-08-12T12:00:00.000Z");

test("dashboard aggregation applies period, factory, and product filters to KPI and panels", async () => {
  const { buildDashboardResponse } = await import("../lib/dashboard.mjs");
  const response = buildDashboardResponse({
    filters: { period: "7d", factory: "Alpha", productType: "Type Y" },
    now,
    alarms: [
      { id: "a-1", alarmCode: "AL-1", type: "delay", line: "L1", duration: "2h", status: "심각", occurredAt: new Date("2026-08-10T09:00:00Z"), factory: "Alpha", productType: "Type Y" },
      { id: "a-2", alarmCode: "AL-2", type: "defect", line: "L2", duration: "1h", status: "경고", occurredAt: new Date("2026-08-10T09:00:00Z"), factory: "Beta", productType: "Type Y" },
      { id: "a-3", alarmCode: "AL-3", type: "defect", line: "L3", duration: "1h", status: "경고", occurredAt: new Date("2026-07-01T09:00:00Z"), factory: "Alpha", productType: "Type Y" },
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
  assert.deepEqual(response.chartData.alertTrend, [{ date: "2026-08-10", category: "delay", count: 1 }]);
});

test("dashboard trend groups matching alarm history by date and category", async () => {
  const { buildDashboardResponse } = await import("../lib/dashboard.mjs");
  const response = buildDashboardResponse({
    filters: { period: "7d", factory: "all", productType: "all" },
    now,
    alarms: [
      { id: "a-1", alarmCode: "AL-1", type: "검사접수 지연", line: "GNPT11", status: "심각", occurredAt: "2026-08-10T09:00:00Z", factory: "광양", productType: "NCM" },
      { id: "a-2", alarmCode: "AL-2", type: "Vital Few 이상", line: "GNPT12", status: "검토중", occurredAt: "2026-08-10T12:00:00Z", factory: "광양", productType: "NCM" },
      { id: "a-3", alarmCode: "AL-3", type: "검사접수 지연", line: "GNPT21", status: "신규", occurredAt: "2026-08-11T09:00:00Z", factory: "광양", productType: "NCM" },
    ],
    targets: [],
    actionPlans: [],
  });

  assert.deepEqual(response.chartData.alertTrend, [
    { date: "2026-08-10", category: "Vital Few 이상", count: 1 },
    { date: "2026-08-10", category: "검사접수 지연", count: 1 },
    { date: "2026-08-11", category: "검사접수 지연", count: 1 },
  ]);
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

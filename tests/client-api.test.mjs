import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const client = await import(`../lib/client-api.ts?test=${Date.now()}`);

function withFetch(response, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    calls.push([input, init]);
    return response;
  };
  return Promise.resolve(run(calls)).finally(() => {
    globalThis.fetch = original;
  });
}

test("list helpers request persisted alarm and target endpoints", async () => {
  await withFetch(new Response(JSON.stringify({ alarms: [{ id: "99198000-0000-4000-8000-000000000001", alarmCode: "AL-99198" }] }), { status: 200 }), async (calls) => {
    assert.deepEqual(await client.listAlarms(), [{ id: "99198000-0000-4000-8000-000000000001", alarmCode: "AL-99198" }]);
    assert.equal(calls[0][0], "/api/alarms");
    assert.equal(calls[0][1]?.method, "GET");
  });

  await withFetch(new Response(JSON.stringify({ targets: [{ id: "89210000-0000-4000-8000-000000000001", targetCode: "TRG-8921" }] }), { status: 200 }), async (calls) => {
    assert.deepEqual(await client.listTargets(), [{ id: "89210000-0000-4000-8000-000000000001", targetCode: "TRG-8921" }]);
    assert.equal(calls[0][0], "/api/targets");
  });
});

test("client records model persisted display codes", async () => {
  const source = await readFile(new URL("../lib/client-api.ts", import.meta.url), "utf8");
  assert.match(source, /alarmCode:\s*string/);
  assert.match(source, /targetCode:\s*string/);
});

test("mutation helpers use JSON API contracts", async () => {
  await withFetch(new Response(JSON.stringify({ target: { id: "T-1" } }), { status: 200 }), async (calls) => {
    await client.updateTarget("T-1", { status: "진행 중" });
    assert.equal(calls[0][0], "/api/targets/T-1");
    assert.equal(calls[0][1]?.method, "PATCH");
    assert.equal(calls[0][1]?.body, JSON.stringify({ status: "진행 중" }));
  });

  await withFetch(new Response(JSON.stringify({ actionPlan: { id: "P-1" } }), { status: 201 }), async (calls) => {
    await client.saveActionPlan({ status: "진행 중", tasks: [] });
    assert.equal(calls[0][0], "/api/action-plans");
    assert.equal(calls[0][1]?.method, "POST");
  });
});

test("helpers return safe errors without server details", async () => {
  await withFetch(new Response("DATABASE_URL=postgresql://secret", { status: 500 }), async () => {
    await assert.rejects(client.listAlarms(), (error) => {
      assert.match(error.message, /불러오지 못했습니다/);
      assert.doesNotMatch(error.message, /DATABASE_URL|postgresql/i);
      return true;
    });
  });
});

test("Sample Delay detail uses an encoded alarm path and preserves the API stage order", async () => {
  const stages = [
    { stageName: "샘플 의뢰", eventAt: "2023-10-12T08:00:00Z", elapsedMinutes: 0, allowedMinutes: 60, isDelayed: false },
    { stageName: "판정 지연", eventAt: "2023-10-12T12:20:00Z", elapsedMinutes: 100, allowedMinutes: 60, isDelayed: true },
  ];
  await withFetch(new Response(JSON.stringify({ alarm: { id: "AL / 1" }, sampleDelayStages: stages }), { status: 200 }), async (calls) => {
    const detail = await client.getAlarmDetail("AL / 1");
    assert.equal(calls[0][0], "/api/alarms/AL%20%2F%201");
    assert.deepEqual(detail.sampleDelayStages.map((stage) => stage.stageName), ["샘플 의뢰", "판정 지연"]);
  });

  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const sampleDelaySummary = persistedStages\?\.length/);
});

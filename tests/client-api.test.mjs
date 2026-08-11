import assert from "node:assert/strict";
import test from "node:test";

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
  await withFetch(new Response(JSON.stringify({ alarms: [{ id: "AL-1" }] }), { status: 200 }), async (calls) => {
    assert.deepEqual(await client.listAlarms(), [{ id: "AL-1" }]);
    assert.equal(calls[0][0], "/api/alarms");
    assert.equal(calls[0][1]?.method, "GET");
  });

  await withFetch(new Response(JSON.stringify({ targets: [{ id: "T-1" }] }), { status: 200 }), async (calls) => {
    assert.deepEqual(await client.listTargets(), [{ id: "T-1" }]);
    assert.equal(calls[0][0], "/api/targets");
  });
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

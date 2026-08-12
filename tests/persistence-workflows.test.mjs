import assert from "node:assert/strict";
import test from "node:test";

let workflows = {};
try {
  workflows = await import(`../lib/persistence-workflows.ts?test=${Date.now()}`);
} catch {
  // The first RED run intentionally reaches this branch before the module exists.
}

test("persistThenRefresh distinguishes a committed write from a failed refresh", async () => {
  assert.equal(typeof workflows.persistThenRefresh, "function");
  const calls = [];
  const result = await workflows.persistThenRefresh(
    async () => { calls.push("write"); },
    async () => { calls.push("refresh"); throw new Error("refresh unavailable"); },
  );

  assert.deepEqual(calls, ["write", "refresh"]);
  assert.deepEqual(result, { committed: true, refreshed: false });
  await assert.rejects(
    workflows.persistThenRefresh(async () => { throw new Error("write failed"); }, async () => undefined),
    /write failed/,
  );
});

test("reconcileSelection replaces a stale object with the reloaded UUID row or clears it", () => {
  assert.equal(typeof workflows.reconcileSelection, "function");
  const current = { id: "99198000-0000-4000-8000-000000000001", status: "심각" };
  const reloaded = { id: current.id, status: "검토중" };
  assert.equal(workflows.reconcileSelection(current, [reloaded]), reloaded);
  assert.equal(workflows.reconcileSelection({ id: "AL-99198" }, [reloaded]), null);
  assert.equal(workflows.reconcileSelection(null, [reloaded]), null);
});

test("runSingleFlight prevents concurrent duplicate submissions and releases the lock", async () => {
  assert.equal(typeof workflows.runSingleFlight, "function");
  const lock = { current: false };
  let release;
  let submissions = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  const submit = () => workflows.runSingleFlight(lock, async () => {
    submissions += 1;
    await gate;
  });

  const first = submit();
  const second = submit();
  assert.equal(await second, false);
  assert.equal(submissions, 1);
  release();
  assert.equal(await first, true);
  assert.equal(lock.current, false);
});

test("isUuid accepts persisted identifiers and rejects display-code fallbacks", () => {
  assert.equal(typeof workflows.isUuid, "function");
  assert.equal(workflows.isUuid("99198000-0000-4000-8000-000000000001"), true);
  assert.equal(workflows.isUuid("AL-99198"), false);
  assert.equal(workflows.isUuid("TRG-8921"), false);
});

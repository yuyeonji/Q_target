import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("provides injectable repository-backed alarm and target route handlers", async () => {
  const [alarms, alarmDetail, targets, targetDetail, actionPlans, repository] = await Promise.all([
    read("app/api/alarms/route.ts"),
    read("app/api/alarms/[id]/route.ts"),
    read("app/api/targets/route.ts"),
    read("app/api/targets/[id]/route.ts"),
    read("app/api/action-plans/route.ts"),
    read("lib/quality-repository.ts"),
  ]);

  for (const source of [alarms, alarmDetail, targets, targetDetail, actionPlans]) {
    assert.match(source, /createQualityRepository/);
  }
  assert.match(repository, /export interface QualityRepository/);
  assert.match(repository, /createAuditEvent/);
});

test("returns safe 400 validation errors from every mutation route", async () => {
  const [targets, targetDetail, actionPlans] = await Promise.all([
    read("app/api/targets/route.ts"),
    read("app/api/targets/[id]/route.ts"),
    read("app/api/action-plans/route.ts"),
  ]);

  for (const source of [targets, targetDetail, actionPlans]) {
    assert.match(source, /status:\s*400/);
    assert.doesNotMatch(source, /DATABASE_URL|postgresql:/i);
  }
});

test("keeps the sample-delay alarm stages ordered in the development seed", async () => {
  const seed = await read("lib/seed.ts");
  const expectedStages = ["샘플 의뢰", "시험 접수", "시험 분석 완료", "판정 지연"];

  assert.match(seed, /AL-99198/);
  const positions = expectedStages.map((stage) => seed.indexOf(stage));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("writes an audit event for target and action-plan mutations", async () => {
  const [targets, targetDetail, actionPlans] = await Promise.all([
    read("app/api/targets/route.ts"),
    read("app/api/targets/[id]/route.ts"),
    read("app/api/action-plans/route.ts"),
  ]);

  for (const source of [targets, targetDetail, actionPlans]) {
    assert.match(source, /createAuditEvent/);
  }
});

test("does not retain the retired D1 binding in the worker environment", async () => {
  const worker = await read("worker/index.ts");
  assert.doesNotMatch(worker, /DB:\s*D1Database/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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

function typeDiagnostics(source) {
  const virtualTestFile = fileURLToPath(new URL("./client-api-contract.test.ts", import.meta.url));
  const isVirtualTestFile = (fileName) => ts.sys.resolvePath(fileName) === ts.sys.resolvePath(virtualTestFile);
  const options = {
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
  };
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => isVirtualTestFile(fileName) || fileExists(fileName);
  host.readFile = (fileName) => isVirtualTestFile(fileName) ? source : readFile(fileName);
  host.getSourceFile = (fileName, languageVersion) => isVirtualTestFile(fileName)
    ? ts.createSourceFile(fileName, source, languageVersion, true)
    : getSourceFile(fileName, languageVersion);
  return ts.getPreEmitDiagnostics(ts.createProgram([virtualTestFile], options, host));
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

test("createTarget and updateAlarm send JSON to collection and encoded detail endpoints", async () => {
  await withFetch(new Response(JSON.stringify({ target: { id: "T-2" } }), { status: 201 }), async (calls) => {
    await client.createTarget({ name: "신규 항목", status: "대기", owner: "담당자 미지정", priority: "중간" });
    assert.equal(calls[0][0], "/api/targets");
    assert.equal(calls[0][1]?.method, "POST");
    assert.equal(calls[0][1]?.body, JSON.stringify({ name: "신규 항목", status: "대기", owner: "담당자 미지정", priority: "중간" }));
  });

  await withFetch(new Response(JSON.stringify({ alarm: { id: "AL / 1" } }), { status: 200 }), async (calls) => {
    await client.updateAlarm("AL / 1", { status: "종결", reviewer: "품질 검토팀" });
    assert.equal(calls[0][0], "/api/alarms/AL%20%2F%201");
    assert.equal(calls[0][1]?.method, "PATCH");
    assert.equal(calls[0][1]?.body, JSON.stringify({ status: "종결", reviewer: "품질 검토팀" }));
  });
});

test("updateAlarm's typed mutation contract rejects a null reviewer", () => {
  const diagnostics = typeDiagnostics('import { updateAlarm } from "../lib/client-api.ts"; updateAlarm("alarm-1", { reviewer: null });');
  assert.ok(
    diagnostics.some((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ").includes("Type 'null' is not assignable")),
    diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("\n"),
  );
});

test("master-rule helpers use a kind-filtered collection and encoded detail endpoint", async () => {
  await withFetch(new Response(JSON.stringify({ rules: [{ id: "R-1", ruleCode: "ALR-001" }] }), { status: 200 }), async (calls) => {
    assert.deepEqual(await client.listMasterRules("alarm rules"), [{ id: "R-1", ruleCode: "ALR-001" }]);
    assert.equal(calls[0][0], "/api/master/rules?kind=alarm%20rules");
  });

  await withFetch(new Response(JSON.stringify({ rule: { id: "R-2" } }), { status: 201 }), async (calls) => {
    await client.createMasterRule({ ruleCode: "ALR-004", kind: "alarm", name: "신규 규칙", scope: "전체", threshold: "1회", active: true });
    assert.equal(calls[0][0], "/api/master/rules");
    assert.equal(calls[0][1]?.method, "POST");
  });

  await withFetch(new Response(JSON.stringify({ rule: { id: "R / 2" } }), { status: 200 }), async (calls) => {
    await client.updateMasterRule("R / 2", { active: false });
    assert.equal(calls[0][0], "/api/master/rules/R%20%2F%202");
    assert.equal(calls[0][1]?.method, "PATCH");
  });
});

test("master-code helpers use collection and encoded detail endpoints", async () => {
  await withFetch(new Response(JSON.stringify({ codes: [{ id: "C-1", code: "PRC-MCH" }] }), { status: 200 }), async (calls) => {
    assert.deepEqual(await client.listMasterCodes(), [{ id: "C-1", code: "PRC-MCH" }]);
    assert.equal(calls[0][0], "/api/master/codes");
  });

  await withFetch(new Response(JSON.stringify({ code: { id: "C-2" } }), { status: 201 }), async (calls) => {
    await client.createMasterCode({ code: "PRC-ASM", name: "조립", category: "공정 코드", active: true });
    assert.equal(calls[0][0], "/api/master/codes");
    assert.equal(calls[0][1]?.method, "POST");
  });

  await withFetch(new Response(JSON.stringify({ code: { id: "C / 2" } }), { status: 200 }), async (calls) => {
    await client.updateMasterCode("C / 2", { category: "공정 분류", active: false });
    assert.equal(calls[0][0], "/api/master/codes/C%20%2F%202");
    assert.equal(calls[0][1]?.method, "PATCH");
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

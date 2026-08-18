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

test("client action-plan contracts include closure reasons and completed tasks", async () => {
  const clientSource = await readFile(new URL("../lib/client-api.ts", import.meta.url), "utf8");

  assert.match(clientSource, /closureReason\?: string \| null/);
  assert.match(clientSource, /completedAt\?: string \| null/);
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

  await withFetch(new Response(JSON.stringify({ actionPlan: { id: "P / 1" } }), { status: 200 }), async (calls) => {
    await client.updateActionPlan("P / 1", { status: "open", tasks: [] });
    assert.equal(calls[0][0], "/api/action-plans/P%20%2F%201");
    assert.equal(calls[0][1]?.method, "PATCH");
  });
});

test("action-plan list helper restores persisted plans and tasks for one encoded relation", async () => {
  const actionPlans = [{
    id: "99198000-0000-4000-8000-000000000003",
    targetId: "99198000-0000-4000-8000-000000000002",
    rootCause: "인수인계 지연",
    tasks: [{ id: "99198000-0000-4000-8000-000000000004", description: "원인 확인" }],
  }];
  await withFetch(new Response(JSON.stringify({ actionPlans }), { status: 200 }), async (calls) => {
    assert.equal(typeof client.listActionPlans, "function");
    assert.deepEqual(
      await client.listActionPlans({ targetId: "99198000-0000-4000-8000-000000000002" }),
      actionPlans,
    );
    assert.equal(calls[0][0], "/api/action-plans?targetId=99198000-0000-4000-8000-000000000002");
    assert.equal(calls[0][1]?.method, "GET");
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

test("closeActionPlan posts an encoded terminal action-plan payload", async () => {
  const closure = {
    targetId: "99198000-0000-4000-8000-000000000002",
    rootCause: "원인 분석을 완료했습니다.",
    immediateAction: "즉시 조치를 완료했습니다.",
    preventiveAction: "재발 방지 조치를 완료했습니다.",
    closureReason: "효과 확인 근거를 검토했습니다.",
    status: "종결",
    targetStatus: "완료",
    tasks: [{ description: "조치 확인", owner: "홍길동", dueDate: "2026-08-13", completedAt: "2026-08-13T00:00:00.000Z" }],
  };
  await withFetch(new Response(JSON.stringify({ actionPlan: { id: "P / 1" } }), { status: 200 }), async (calls) => {
    assert.deepEqual(await client.closeActionPlan("P / 1", closure), { id: "P / 1" });
    assert.equal(calls[0][0], "/api/action-plans/P%20%2F%201/close");
    assert.equal(calls[0][1]?.method, "POST");
    assert.equal(calls[0][1]?.body, JSON.stringify(closure));
  });
});

test("HTTP failures retain safe text and expose the response status", async () => {
  await withFetch(new Response(JSON.stringify({ error: "conflict detail" }), { status: 409 }), async () => {
    await assert.rejects(client.createTarget({
      name: "신규 항목",
      status: "대기",
      owner: "미지정",
      priority: "보통",
    }), (error) => {
      assert.equal(error.status, 409);
      assert.match(error.message, /불러오지 못했습니다/);
      assert.doesNotMatch(error.message, /conflict detail/);
      return true;
    });
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

test("alarm detail uses an encoded alarm path and returns the complete aggregate", async () => {
  const aggregate = {
    alarm: { id: "AL / 1", alarmCode: "AL-99198", occurredAt: "2023-10-12T08:00:00Z", reviewDeadline: "2023-10-13T10:42:15Z", item: "Bearing Housing A1", type: "CPK Drop", process: "Machining", line: "Line 4", status: "긴급" },
    detail: { alarmId: "AL / 1", equipment: "CNC-M-05", productionLot: "LOT-231012-005", currentValue: "1.18", thresholdValue: "1.33" },
    measurements: [{ alarmId: "AL / 1", metricName: "CPK", metricValue: "1.18", thresholdValue: "1.33", measuredAt: "2023-10-12T08:00:00Z" }],
    attachments: [{ alarmId: "AL / 1", fileName: "cpk-report.pdf", fileSizeBytes: 1024 }],
    sampleDelayStages: [{ stageName: "샘플 의뢰", eventAt: "2023-10-12T08:00:00Z", elapsedMinutes: 0, allowedMinutes: 60, isDelayed: false }],
    related: { similarAlarms: [], targets: [], actionOutcomes: [] },
  };
  await withFetch(new Response(JSON.stringify(aggregate), { status: 200 }), async (calls) => {
    const detail = await client.getAlarmDetail("AL / 1");
    assert.equal(calls[0][0], "/api/alarms/AL%20%2F%201");
    assert.equal(detail.detail?.equipment, "CNC-M-05");
    assert.deepEqual(detail.measurements.map((point) => point.alarmId), ["AL / 1"]);
    assert.deepEqual(detail.attachments.map((attachment) => attachment.fileName), ["cpk-report.pdf"]);
    assert.equal(detail.alarm.reviewDeadline, "2023-10-13T10:42:15Z");
    assert.deepEqual(detail.sampleDelayStages?.map((stage) => stage.stageName), ["샘플 의뢰"]);
    assert.deepEqual(detail.related, aggregate.related);
  });

  const source = await readFile(new URL("../lib/client-api.ts", import.meta.url), "utf8");
  assert.match(source, /export type AlarmDetail =/);
  assert.match(source, /export type AlarmMeasurement =/);
  assert.match(source, /export type AlarmAttachment =/);
  assert.match(source, /export type AlarmDetailResponse =/);
  assert.match(source, /reviewDeadline\?: string \| null/);
  assert.match(source, /sampleDelayStages\?: SampleDelayStage\[\]/);
});

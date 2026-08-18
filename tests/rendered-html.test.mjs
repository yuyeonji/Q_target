import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the quality platform dashboard instead of the starter", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /품질 알람 및 관리 통합 플랫폼/);
  assert.match(html, /현황판 개요/);
  assert.match(html, /전체 알람/);
  assert.match(html, /관리대상/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("includes interactive demo controls in the client page", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /CSV 내보내기/);
  assert.match(source, /상태 필터/);
  assert.match(source, /새 규칙 추가/);
  assert.match(source, /신규 케이스 등록/);
});

test("registers an alarm as a target without entering the action-plan flow", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const alarmDetails = page.match(/\{alarm &&[\s\S]*?\{actionPlan &&/)?.[0] ?? "";
  const registrationHandler = page.match(/const submitTargetRegistration = async \(\) => \{[\s\S]*?\n {2}\};/)?.[0] ?? "";

  assert.match(alarmDetails, /onAction=\{\(\) => void openTargetRegistration\(\)\}/);
  assert.doesNotMatch(alarmDetails, /onAction=\{\(\) => void openActionPlan\(\)\}/);
  assert.match(page, /function TargetRegistrationDialog\(/);
  assert.match(registrationHandler, /sourceAlarmId:\s*selectedRegistrationAlarm\.id/);
  assert.match(registrationHandler, /dueDate:\s*registrationDueDate \? registrationDueDate : null/);
  assert.doesNotMatch(registrationHandler, /updateAlarm\(|reloadActionPlan\(|saveActionPlan\(|updateActionPlan\(|setActionPlan\(/);
});

test("removes registered alarms from history without a registration status control", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const registrationHandler = page.match(/const submitTargetRegistration = async \(\) => \{[\s\S]*?\n {2}\};/)?.[0] ?? "";
  const dialog = page.match(/function TargetRegistrationDialog\([\s\S]*?\r?\n}\r?\n\r?\nfunction NewCase/)?.[0] ?? "";
  const alarmList = page.match(/function AlarmList\([\s\S]*?\r?\n}\r?\n\r?\nfunction TargetList/)?.[0] ?? "";

  assert.match(page, /type AlarmStatus = "신규" \| "검토중" \| "심각" \| "관리대상" \| "종결"/);
  assert.match(registrationHandler, /status:\s*"진행 중"/);
  assert.doesNotMatch(registrationHandler, /registrationStatus/);
  assert.doesNotMatch(dialog, /onStatusChange|<label>\s*상태/);
  assert.doesNotMatch(alarmList, /<option>관리대상<\/option>/);
  assert.match(page, /item\.status !== "관리대상"/);
});

test("maps persisted display codes while retaining UUID action IDs", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /code:\s*item\.alarmCode/);
  assert.match(page, /code:\s*item\.targetCode/);
  assert.match(page, /id:\s*item\.id/);
});

test("persists every dashboard save action before reloading rendered data", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const newCaseHandler = pageSource.match(/const createNewCase[\s\S]*?const openTargetRegistration/)?.[0] ?? "";
  const actionPlanSave = pageSource.match(/onSave=\{async \(\{ rootCause, immediateAction, preventiveAction(?:, draftTask)? \}\) => \{[\s\S]*?\r?\n          }}\r?\n        \/>/)?.[0] ?? "";
  const codeManagement = pageSource.match(/function CodeManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction MasterNote/)?.[0] ?? "";
  const ruleManagement = pageSource.match(/function RuleManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction Kpi/)?.[0] ?? "";

  assert.match(pageSource, /await createTarget\(/);
  assert.match(pageSource, /updateAlarm\(/);
  assert.match(pageSource, /await createMasterRule\(/);
  assert.match(pageSource, /updateMasterRule\(/);
  assert.match(pageSource, /await createMasterCode\(/);
  assert.match(pageSource, /updateMasterCode\(/);
  assert.match(pageSource, /await reloadPersistedData\(/);
  assert.doesNotMatch(pageSource, /id: `TRG-\$\{Date\.now/);
  assert.match(pageSource, /const reloadPersistedData[\s\S]*?listAlarms\([\s\S]*?listTargets\([\s\S]*?listMasterRules\("alarm"\)[\s\S]*?listMasterRules\("conversion"\)[\s\S]*?listMasterCodes\(/);
  assert.match(newCaseHandler, /await createTarget\([\s\S]*?setNewCase\(false\)[\s\S]*?await reloadPersistedData\(/);
  assert.match(actionPlanSave, /await saveActionPlan\([\s\S]*?setActionPlan\(false\)[\s\S]*?await reloadPersistedData\(/);
  assert.doesNotMatch(actionPlanSave, /setTargetItems\(/);
  assert.match(codeManagement, /await createMasterCode\([\s\S]*?setDraft\([\s\S]*?await reloadPersistedData\(/);
  assert.match(codeManagement, /persistThenRefresh\([\s\S]*?updateMasterCode\([\s\S]*?setEditing\(null\)/);
  assert.doesNotMatch(codeManagement, /setCodes\(/);
  assert.match(ruleManagement, /await createMasterRule\([\s\S]*?setDraft\([\s\S]*?await reloadPersistedData\(/);
  assert.match(ruleManagement, /persistThenRefresh\([\s\S]*?updateMasterRule\([\s\S]*?setEditing\(null\)/);
  assert.doesNotMatch(ruleManagement, /setRules\(/);
});

test("persists controlled action-plan analysis values on successful save", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const actionPlan = pageSource.match(/function ActionPlan\([\s\S]*?\r?\n}\r?\n\r?\nfunction QuickPanel/)?.[0] ?? "";
  const actionPlanSave = pageSource.match(/onSave=\{async \(\{ rootCause, immediateAction, preventiveAction(?:, draftTask)? \}\) => \{[\s\S]*?\r?\n          }}\r?\n        \/>/)?.[0] ?? "";

  assert.match(actionPlan, /const \[immediateAction, setImmediateAction\] = useState/);
  assert.match(actionPlan, /const \[rootCause, setRootCause\] = useState/);
  assert.match(actionPlan, /const \[preventiveAction, setPreventiveAction\] = useState/);
  assert.match(actionPlan, /value=\{immediateAction\}[\s\S]*?onChange=\{\(event\) => setImmediateAction/);
  assert.match(actionPlan, /value=\{rootCause\}[\s\S]*?onChange=\{\(event\) => setRootCause/);
  assert.match(actionPlan, /value=\{preventiveAction\}[\s\S]*?onChange=\{\(event\) => setPreventiveAction/);
  assert.match(actionPlanSave, /rootCause,\s*immediateAction,\s*preventiveAction,/);
});

test("treats committed New Case and action-plan saves as successful when refresh fails", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const newCaseHandler = pageSource.match(/const createNewCase[\s\S]*?const openTargetRegistration/)?.[0] ?? "";
  const actionPlanSave = pageSource.match(/onSave=\{async \(\{ rootCause, immediateAction, preventiveAction(?:, draftTask)? \}\) => \{[\s\S]*?\r?\n          }}\r?\n        \/>/)?.[0] ?? "";

  assert.match(newCaseHandler, /await createTarget\([\s\S]*?setNewCase\(false\)[\s\S]*?setView\("targets"\)[\s\S]*?try \{\s*await reloadPersistedData\(\)[\s\S]*?catch \{[\s\S]*?저장은 완료/);
  assert.match(actionPlanSave, /await saveActionPlan\([\s\S]*?targetStatus:\s*selectedTarget \? "진행 중" : null[\s\S]*?setActionPlan\(false\)[\s\S]*?try \{\s*await reloadPersistedData\(\)[\s\S]*?catch \{[\s\S]*?저장은 완료/);
  assert.doesNotMatch(actionPlanSave, /await updateTarget\(/);
});

test("restores persisted action-plan analysis and tasks for the selected UUID relation", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /listActionPlans/);
  assert.match(pageSource, /reconcileSelection/);
  assert.match(pageSource, /const reloadActionPlan[\s\S]*?await listActionPlans\([\s\S]*?setPersistedActionPlan\([\s\S]*?setTasks\(/);
  assert.match(pageSource, /initialPlan=\{persistedActionPlan\}/);
  assert.match(pageSource, /initialPlan\?\.rootCause/);
  assert.match(pageSource, /initialPlan\?\.immediateAction/);
  assert.match(pageSource, /initialPlan\?\.preventiveAction/);
});

test("ignores a stale action-plan reload after the user opens another target", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const reloadActionPlan = pageSource.match(/const reloadActionPlan[\s\S]*?\n  \}, \[\]\);/)?.[0] ?? "";
  const openTargetActionPlan = pageSource.match(/const openTargetActionPlan[\s\S]*?\n  \};/)?.[0] ?? "";

  assert.match(pageSource, /const actionPlanRelationRef = useRef<string \| null>\(null\)/);
  assert.match(openTargetActionPlan, /actionPlanRelationRef\.current = `target:\$\{target\.id\}`;/);
  assert.match(reloadActionPlan, /const relationKey = "targetId" in relation \? `target:\$\{relation\.targetId\}` : `alarm:\$\{relation\.alarmId\}`;/);
  assert.match(reloadActionPlan, /if \(actionPlanRelationRef\.current !== relationKey\) return latest;/);
});

test("shows an action-plan loading state instead of another target's plan", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const openTargetActionPlan = pageSource.match(/const openTargetActionPlan[\s\S]*?\n  \};/)?.[0] ?? "";

  assert.match(pageSource, /const \[actionPlanLoading, setActionPlanLoading\] = useState\(false\)/);
  assert.match(openTargetActionPlan, /setActionPlanLoading\(true\);[\s\S]*?finally[\s\S]*?setActionPlanLoading\(false\)/);
  assert.match(pageSource, /actionPlanLoading \? \([\s\S]*?조치계획을 불러오는 중/);
});

test("clears an unsaved task draft before opening another target's action plan", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const openTargetActionPlan = pageSource.match(/const openTargetActionPlan[\s\S]*?\n  \};/)?.[0] ?? "";

  assert.match(
    openTargetActionPlan,
    /setPersistedActionPlan\(null\);\s*setTasks\(\[\]\);\s*setNewTask\(""\);\s*setTaskOwner\("담당자 미지정"\);\s*setTaskDue\("미정"\);/,
  );
});

test("keeps newly added action-plan tasks local until the approval save, then updates the current plan", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const addTask = pageSource.match(/const addTask = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
  const actionPlanSave = pageSource.match(/onSave=\{async \(\{ rootCause, immediateAction, preventiveAction(?:, draftTask)? \}\) => \{[\s\S]*?\r?\n          }}\r?\n        \/>/)?.[0] ?? "";

  assert.match(addTask, /setTasks\(/);
  assert.doesNotMatch(addTask, /saveActionPlan|updateActionPlan|fetch\(/);
  assert.match(actionPlanSave, /if \(persistedActionPlan\)[\s\S]*?await updateActionPlan\(persistedActionPlan\.id/);
  assert.match(actionPlanSave, /else \{[\s\S]*?await saveActionPlan\(/);
  assert.match(pageSource, /const \[tasks, setTasks\] = useState<Task\[\]>\(\[\]\)/);
});

test("uses committed-write refresh results for alarm, rule, and code updates", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const alarmUpdates = pageSource.match(/const updateAlarmStatus[\s\S]*?const createNewCase/)?.[0] ?? "";
  const codeManagement = pageSource.match(/function CodeManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction MasterNote/)?.[0] ?? "";
  const ruleManagement = pageSource.match(/function RuleManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction Kpi/)?.[0] ?? "";

  assert.match(alarmUpdates, /persistThenRefresh\([\s\S]*?updateAlarm/);
  assert.match(codeManagement, /persistThenRefresh\([\s\S]*?updateMasterCode/);
  assert.match(ruleManagement, /persistThenRefresh\([\s\S]*?updateMasterRule/);
  assert.match(codeManagement, /committed[\s\S]*?refreshed/);
  assert.match(ruleManagement, /committed[\s\S]*?refreshed/);
});

test("guards New Case and Action Plan against concurrent duplicate submissions", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const newCase = pageSource.match(/function NewCase\([\s\S]*?\r?\n}\r?\n\r?\nfunction ActionPlan/)?.[0] ?? "";
  const actionPlan = pageSource.match(/function ActionPlan\([\s\S]*?\r?\n}\r?\n\r?\nfunction QuickPanel/)?.[0] ?? "";

  assert.match(newCase, /runSingleFlight/);
  assert.match(newCase, /submittingRef/);
  assert.match(newCase, /disabled=\{!persistenceReady \|\| submitting\}/);
  assert.match(actionPlan, /runSingleFlight/);
  assert.match(actionPlan, /submittingRef/);
  assert.match(actionPlan, /disabled=\{!persistenceReady \|\| submitting \|\| isClosed\}/);
});

test("treats committed rule and code creates as successful when refresh fails", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const codeManagement = pageSource.match(/function CodeManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction MasterNote/)?.[0] ?? "";
  const ruleManagement = pageSource.match(/function RuleManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction Kpi/)?.[0] ?? "";

  assert.match(codeManagement, /await createMasterCode\([\s\S]*?setDraft\(\{ code: "", name: "", category: "" \}\)[\s\S]*?try \{\s*await reloadPersistedData\(\)[\s\S]*?catch \{[\s\S]*?저장은 완료[\s\S]*?다시 시도 버튼으로 새로고침/);
  assert.match(ruleManagement, /await createMasterRule\([\s\S]*?setDraft\(\{ name: "", scope: "", threshold: "" \}\)[\s\S]*?try \{\s*await reloadPersistedData\(\)[\s\S]*?catch \{[\s\S]*?저장은 완료[\s\S]*?다시 시도 버튼으로 새로고침/);
});

test("retains master create drafts only when the create request itself fails", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const codeManagement = pageSource.match(/function CodeManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction MasterNote/)?.[0] ?? "";
  const ruleManagement = pageSource.match(/function RuleManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction Kpi/)?.[0] ?? "";

  assert.match(codeManagement, /await createMasterCode\([\s\S]*?catch \{[\s\S]*?입력값은 유지[\s\S]*?return;[\s\S]*?setDraft\(\{ code: "", name: "", category: "" \}\)/);
  assert.match(ruleManagement, /await createMasterRule\([\s\S]*?catch \{[\s\S]*?입력값은 유지[\s\S]*?return;[\s\S]*?setDraft\(\{ name: "", scope: "", threshold: "" \}\)/);
});

test("disables every persisted mutation control until UUID-backed data is ready", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const master = pageSource.match(/function Master\([\s\S]*?\r?\n}\r?\n\r?\nfunction downloadMasterCsv/)?.[0] ?? "";
  const ruleStateChoices = pageSource.match(/function RuleStateChoices\([\s\S]*?\r?\n}\r?\n\r?\nfunction CodeManagement/)?.[0] ?? "";
  const codeManagement = pageSource.match(/function CodeManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction MasterNote/)?.[0] ?? "";
  const ruleManagement = pageSource.match(/function RuleManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction Kpi/)?.[0] ?? "";
  const actionPlan = pageSource.match(/function ActionPlan\([\s\S]*?\r?\n}\r?\n\r?\nfunction QuickPanel/)?.[0] ?? "";

  assert.match(pageSource, /const persistenceReady = dataState === "ready"/);
  assert.match(pageSource, /className="black"\s*disabled=\{!persistenceReady\}\s*onClick=\{\(\) => setNewCase\(true\)\}/);
  assert.match(pageSource, /<SampleDelayDrawer[\s\S]*?persistenceReady=\{persistenceReady\}/);
  assert.match(pageSource, /<AlarmDrawer[\s\S]*?persistenceReady=\{persistenceReady\}/);
  assert.match(pageSource, /<ActionPlan[\s\S]*?persistenceReady=\{persistenceReady\}/);
  assert.match(pageSource, /<Master[\s\S]*?persistenceReady=\{persistenceReady\}/);
  assert.match(master, /persistenceReady: boolean/);
  assert.match(master, /persistenceReady=\{persistenceReady\}/);
  assert.match(ruleStateChoices, /disabled: boolean/);
  assert.match(ruleStateChoices, /disabled=\{disabled\}/);
  assert.match(codeManagement, /persistenceReady: boolean/);
  assert.match(codeManagement, /disabled=\{!persistenceReady\}/);
  assert.match(ruleManagement, /persistenceReady: boolean/);
  assert.match(ruleManagement, /disabled=\{!persistenceReady\}/);
  assert.match(actionPlan, /persistenceReady: boolean/);
  assert.match(actionPlan, /disabled=\{!persistenceReady \|\| submitting \|\| isClosed\}/);
});

test("includes complete demo control surfaces", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /알림 센터/);
  assert.match(source, /표시 설정/);
  assert.match(source, /다음 페이지/);
  assert.match(source, /고객지원 센터/);
  assert.match(source, /시스템 로그/);
  assert.match(source, /q-target-rules.csv/);
  assert.match(source, /compact-mode/);
  assert.match(source, /selectedTarget/);
});

test("wires dashboard analysis controls and critical-alarm navigation", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const criticalNavigation = source.match(/onViewCriticalAlarms=\{\(\) => \{[^}]+\}\}/)?.[0] ?? "";

  assert.match(source, /setAnalysisPanel\("trend"\)/);
  assert.match(source, /setAnalysisPanel\("distribution"\)/);
  assert.match(source, /onOpenAnalysis\("trend"\)/);
  assert.match(source, /onOpenAnalysis\("distribution"\)/);
  assert.match(source, /onClick=\{onViewCriticalAlarms\}/);
  assert.match(criticalNavigation, /setView\("alarms"\);\s*setAlarmFilter\("심각"\)/);
  assert.doesNotMatch(criticalNavigation, /setAlarm\(/);
  assert.match(source, /\{analysisPanel\s*&&\s*\(?\s*<AnalysisPanel/);
  assert.match(source, /function AnalysisPanel/);
  assert.match(source, /기간별 카테고리 추이/);
  assert.match(source, /상태별 대상 분포/);
});

test("critical-alarm navigation resolves to a supported filter with visible history", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /type AlarmStatus = [^;]*"심각"/);
  assert.match(source, /const alarms: Alarm\[\] = \[[\s\S]*?status: "심각"/);
  assert.match(source, /상태 필터[\s\S]*?<select[^>]*>[\s\S]*?<option>\s*심각\s*<\/option>/);
});

test("fits the wide desktop dashboard without hiding card content", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /<div className="dashboard-view">/);
  assert.match(css, /\.dashboard-view\s*\{[^}]*height:\s*calc\(100vh - 50px\)[^}]*overflow:\s*visible[^}]*\}/s);
  assert.match(css, /@media\s*\(min-width:\s*1201px\)[\s\S]*?\.dashboard-grid\s*\{[^}]*grid-template-rows:\s*repeat\(2,minmax\(0,1fr\)\)[^}]*flex:\s*1[^}]*\}/);
  assert.match(css, /@media\s*\(min-width:\s*1201px\)[\s\S]*?\.dashboard-view \.table-card\s+th,\.dashboard-view \.table-card\s+td\s*\{[^}]*padding:\s*6px 10px[^}]*\}/);
  assert.match(css, /@media\s*\(max-width:\s*1200px\)\s*\{[\s\S]*?\.dashboard-view\s*\{[^}]*height:\s*auto[^}]*overflow:\s*visible[^}]*\}/);
});

test("keeps the compact desktop donut and overdue rows inside their equal-height cards", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const desktop = css.match(/@media\(min-width:1201px\)\{([\s\S]*?)\}\s*@media\(max-width:1200px\)/)?.[1] ?? "";

  assert.match(desktop, /\.distribution-layout \.donut\{width:114px;height:114px;margin:0 auto\}/);
  assert.match(desktop, /\.distribution\{padding:0 10px 0\}/);
  assert.match(desktop, /\.distribution p\{padding:3px 7px;margin:2px 0\}/);
  assert.match(desktop, /\.overdue-row\{margin:3px 7px;padding:4px;gap:1px;font-size:12px\}/);
});

test("fits all overdue targets and the paginated target list in a desktop viewport", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /L1 불량률 감소/);
  assert.match(page, /자동 샘플링 도입/);
  assert.match(page, /3분기 공정 심사 준수/);
  assert.doesNotMatch(page, /const pageSize = 3/);
  assert.match(page, /window\.innerHeight/);
  assert.match(page, /addEventListener\("resize"/);
  assert.match(page, /setPage\(\(currentPage\) => Math\.min\(currentPage, totalPages\)\)/);
  assert.match(css, /@media\(min-width:1201px\)\{[\s\S]*?\.overdue\{[^}]*min-height:0[^}]*\}[\s\S]*?\.overdue-row\{[^}]*font-size:12px[^}]*\}/);
  assert.match(css, /@media\(min-width:1201px\)\{[\s\S]*?\.target-list\{[^}]*height:calc\(100vh - 50px\)[^}]*overflow:hidden[^}]*\}/);
  assert.match(css, /@media\(max-width:1200px\)\{[\s\S]*?\.target-list\{[^}]*height:auto[^}]*overflow:visible[^}]*\}/);
});

test("uses a right-side target distribution legend", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.distribution-layout \.donut[^}]*clamp\(140px, 13vw, 180px\)/s);
  assert.match(source, /distribution-layout/);
  assert.match(source, /distribution-legend/);
  assert.match(css, /\.distribution-layout[^}]*display:\s*grid/s);
  assert.match(css, /@media\(max-width:1200px\)[\s\S]*\.distribution-layout[^}]*grid-template-columns:\s*1fr/s);
});

test("matches target distribution legend markers to donut segment colors", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /distribution-dot normal/);
  assert.match(source, /distribution-dot risk/);
  assert.match(source, /distribution-dot overdue/);
  assert.match(css, /\.distribution-dot\.normal\{color:#111827\}/);
  assert.match(css, /\.distribution-dot\.risk\{color:#4b4de2\}/);
  assert.match(css, /\.distribution-dot\.overdue\{color:#d0181d\}/);
});

test("makes narrow tables and charts horizontally reachable", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /function ScrollTable/);
  assert.match(page, /className="table-scroll"[\s\S]*?role="region"[\s\S]*?aria-label=\{label\}/);
  assert.match(page, /className="chart-scroll"[\s\S]*?role="region"[\s\S]*?aria-label="카테고리별 알람 추세 차트"/);
  assert.doesNotMatch(page, /className="(?:table|chart)-scroll"[^>]*tabIndex=\{0\}/);
  assert.match(css, /\.table-scroll,\.chart-scroll\s*\{[^}]*overflow-x:\s*auto[^}]*\}/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*?\.chart\s*\{[^}]*min-width:\s*520px[^}]*\}/);
});

test("analysis dialog manages focus, Escape, and background inertness", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /const dialogRef = useRef<HTMLElement>/);
  assert.match(source, /previousFocus\.current\s*=\s*document\.activeElement/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /previousFocus\.current\?\.focus\(\)/);
  assert.match(source, /ref=\{dialogRef\}[^>]*tabIndex=\{-1\}/);
  assert.match(source, /className="overlay-dismiss"[\s\S]*?aria-label="분석 패널 닫기"[\s\S]*?onClick=\{onClose\}/);
  assert.match(source, /className="sidebar" inert=\{analysisPanel \? true : undefined\}/);
  assert.match(source, /className="workspace" inert=\{analysisPanel \? true : undefined\}/);
});

test("keeps alarm drawer actions clear of scrollable details and labels the action-plan approval button", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /className="drawer-body"/);
  assert.match(page, /className="drawer-footer"/);
  assert.match(css, /\.drawer\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*overflow:\s*hidden[^}]*\}/s);
  assert.match(css, /\.drawer-body\s*\{[^}]*flex:\s*1[^}]*min-height:\s*0[^}]*overflow-y:\s*auto[^}]*\}/s);
  assert.match(css, /\.drawer-footer\s*\{[^}]*position:\s*relative[^}]*flex:\s*none[^}]*\}/s);
  assert.match(page, />\s*저장 및 승인 요청\s*<\/button>/);
  assert.match(css, /\.modal footer\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0[^}]*\}/s);
  assert.match(css, /\.modal footer \.black\s*\{[^}]*min-width:\s*180px[^}]*\}/s);
  assert.match(css, /\.drawer-footer \.black,\.modal footer \.black\s*\{[^}]*background:\s*#050505[^}]*color:\s*#fff[^}]*\}/s);
});

test("uses an accessible related-information accordion and sample-delay workflow drawer", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const alarmDrawer =
    page.match(/function AlarmDrawer\([\s\S]*?\r?\n}\r?\n\r?\nfunction RelatedInfoAccordion/)?.[0] ?? "";
  const relatedAccordion =
    page.match(/function RelatedInfoAccordion\([\s\S]*?\r?\n}\r?\n\r?\nfunction SampleDelayDrawer/)?.[0] ?? "";
  const sampleDelayDrawer =
    page.match(/function SampleDelayDrawer\([\s\S]*?\r?\n}\r?\n\r?\nfunction NewCase/)?.[0] ?? "";

  assert.match(page, /function RelatedInfoAccordion/);
  assert.match(page, /aria-expanded=\{expanded\}/);
  assert.match(page, /aria-controls=\{panelId\}/);
  assert.match(page, /id=\{panelId\} hidden=\{!expanded\}/);
  assert.match(relatedAccordion, /onClick=\{\(\) => setOpen\(label\)\}/);
  assert.doesNotMatch(relatedAccordion, /setOpen\(expanded \? "" : label\)/);
  assert.doesNotMatch(alarmDrawer, /\btab\??:|\bsetTab\??:|const tabs =|drawer-tab-content/);
  assert.doesNotMatch(page, /drawer-tabs|drawer-tab-content|demo-attachment/);
  assert.doesNotMatch(css, /\.drawer-tabs|\.drawer-tab-content|\.demo-attachment/);
  assert.match(page, /alarm\.type === "Sample Delay"\s*\?\s*\(?\s*<SampleDelayDrawer/);
  assert.match(page, /function SampleDelayDrawer/);
  assert.match(page, /경과 시간/);
  assert.match(page, /허용 기준/);
  assert.match(page, /초과 시간/);
  assert.match(sampleDelayDrawer, /const stages = persistedStages\?\.map/);
  assert.match(sampleDelayDrawer, /const sampleDelaySummary = stages\.length/);
  assert.match(sampleDelayDrawer, /overageMinutes: Math\.max\(0, latestStage\.elapsedMinutes - latestStage\.allowedMinutes\)/);
  assert.match(sampleDelayDrawer, /등록된 샘플 지연 단계 데이터가 없습니다/);
  assert.match(sampleDelayDrawer, /const stageDataLoaded = detail\?\.alarm\.id === alarm\.id/);
  assert.match(sampleDelayDrawer, /!detailLoading && !detailError && stageDataLoaded && stages\.length === 0/);
  assert.match(sampleDelayDrawer, /detailError && <p role="alert">/);
  assert.doesNotMatch(sampleDelayDrawer, /fallbackSummary|elapsedMinutes: 68|allowedMinutes: 30|overageMinutes: 38/);
  assert.doesNotMatch(sampleDelayDrawer, /판정 지연: 허용 기준을 38분 초과했습니다/);
  assert.match(css, /\.related-info-control/);
  assert.match(css, /\.sample-delay-stage\.delay/);
});

test("loads selected alarm detail data and avoids fabricated drawer values", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const alarmDrawer = page.match(/function AlarmDrawer\([\s\S]*?\r?\n}\r?\n\r?\nfunction RelatedInfoAccordion/)?.[0] ?? "";

  assert.match(page, /const \[alarmDetail, setAlarmDetail\] = useState<AlarmDetailResponse \| null>\(null\)/);
  assert.match(page, /const \[alarmDetailLoading, setAlarmDetailLoading\] = useState\(false\)/);
  assert.match(page, /const \[alarmDetailError, setAlarmDetailError\] = useState<string \| null>\(null\)/);
  assert.match(page, /selectedAlarmIdRef\.current === selectedId/);
  assert.match(page, /const matchingDetail = alarmDetail\?\.alarm\.id === alarm\.id \? alarmDetail : null/);
  assert.match(page, /setSampleDelayStages\(detail\.sampleDelayStages \?\? null\)/);
  assert.match(page, /상세 데이터를 불러오는 중/);
  assert.match(page, /등록된 상세 데이터가 없습니다/);
  assert.match(page, /상세 데이터를 불러오지 못했습니다/);
  assert.match(alarmDrawer, /detail\?\.equipment/);
  assert.match(alarmDrawer, /detail\?\.productionLot/);
  assert.match(alarmDrawer, /검토 기한/);
  assert.match(alarmDrawer, /response\?\.alarm\.reviewDeadline/);
  assert.match(alarmDrawer, /!detailLoading && !detailError && detailLoaded && !detail/);
  assert.doesNotMatch(alarmDrawer, /<strong>CNC-M-04<\/strong>/);
  assert.doesNotMatch(alarmDrawer, /<strong>LOT-231012-001<\/strong>/);
  assert.doesNotMatch(alarmDrawer, /5,000 \/ 100/);
});

test("splits master tabs into distinct editable rule and code management surfaces", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /const initialAlarmRules: Rule\[\]/);
  assert.match(page, /const initialConversionRules: Rule\[\]/);
  assert.match(page, /const initialCodes: MasterCode\[\]/);
  assert.match(page, /function RuleManagement/);
  assert.match(page, /function CodeManagement/);
  assert.match(page, /알람 규칙 관리/);
  assert.match(page, /전환 규칙 관리/);
  assert.match(page, /코드값/);
  assert.match(page, /aria-label="규칙명 수정"/);
  assert.match(page, /aria-label="적용 범위 수정"/);
  assert.match(page, /aria-label="임계값 수정"/);
  assert.match(page, />\s*활성\s*<\/button>[\s\S]*?>\s*비활성\s*<\/button>/);
  assert.doesNotMatch(page, /window\.prompt/);
  assert.match(css, /\.rule-state-choice\.active\.selected[^}]*background:\s*#[0-9a-f]{6}[^}]*color:\s*#fff/i);
  assert.match(css, /\.rule-state-choice\.inactive\.selected[^}]*background:\s*#[0-9a-f]{6}[^}]*color:\s*#fff/i);
});

test("uses Korean-first action-plan labels and clearly distinguished rule states", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /<h3>🟣 원인 분석<\/h3>/);
  assert.match(page, /현상\s*<textarea/);
  assert.match(page, /근본 원인\s*<textarea/);
  assert.match(page, /<h3>▣ 조치 계획<\/h3>/);
  assert.match(page, /aria-pressed=\{active\}/);
  assert.match(page, /aria-pressed=\{!active\}/);
  assert.match(css, /\.rule-state-choice\.active\.selected\{[^}]*background:\s*#16803b[^}]*color:\s*#fff[^}]*\}/);
  assert.match(css, /\.rule-state-choice\.inactive\.selected\{[^}]*background:\s*#c52229[^}]*color:\s*#fff[^}]*\}/);
  assert.match(css, /\.rule-state-choice\{[^}]*border:\s*2px solid #[0-9a-f]{6}[^}]*\}/i);
  assert.match(css, /\.rule-state-choice:focus-visible\{[^}]*outline:\s*3px solid #[0-9a-f]{6}[^}]*\}/i);
});

test("opens a target action-plan popup even when loading its persisted plan fails", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const openTargetActionPlan = pageSource.match(/const openTargetActionPlan = async \(target: Target\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";

  assert.match(
    openTargetActionPlan,
    /setActionPlan\(true\);[\s\S]*?await reloadActionPlan\(\{ targetId: target\.id \}\);/,
  );
});

test("includes a typed draft task in the action-plan save payload", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /draftTask:[\s\S]*?newTask/);
  assert.match(page, /\[\.\.\.tasks, draftTask\]/);
});

test("action plans expose a Korean validated close flow with completed task controls", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const actionPlan = page.match(/function ActionPlan\([\s\S]*?\r?\n}\r?\n\r?\nfunction QuickPanel/)?.[0] ?? "";

  assert.match(page, /closeActionPlan/);
  assert.match(actionPlan, /onToggleComplete/);
  assert.match(actionPlan, /종결 처리/);
  assert.match(actionPlan, /조치 결과\s*\/\s*효과 확인 근거\s*\/\s*종결 판단 사유/);
  assert.match(actionPlan, /type="checkbox"/);
});

test("renders typed visible feedback primitives", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /type FeedbackTone = "success" \| "error" \| "info"/);
  assert.match(page, /function ValidationSummary\(/);
  assert.match(page, /function FieldError\(/);
  assert.match(page, /role="alert"/);
  assert.match(css, /\.feedback-banner\.error\{/);
  assert.match(css, /\.field-error\{/);
  assert.match(css, /\.field-invalid\{/);
});

test("shows action-plan errors only after save or close is attempted", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const actionPlan = page.match(/function ActionPlan\([\s\S]*?\r?\n}\r?\n\r?\nfunction QuickPanel/)?.[0] ?? "";

  assert.match(actionPlan, /const \[saveAttempted, setSaveAttempted\] = useState\(false\)/);
  assert.match(actionPlan, /const \[closeAttempted, setCloseAttempted\] = useState\(false\)/);
  assert.match(actionPlan, /<ValidationSummary errors=\{closeErrors\}/);
  assert.match(actionPlan, /className=\{immediateActionError \? "field-invalid" : undefined\}/);
  assert.match(actionPlan, /<FieldError message=\{immediateActionError\}/);
  assert.match(actionPlan, /setSaveAttempted\(true\)/);
  assert.match(actionPlan, /setCloseAttempted\(true\)/);
});

test("keeps non-action-plan validation visible only after submission", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const newCase = page.match(/function NewCase[\s\S]*?\r?\n}\r?\n\r?\nfunction ActionPlan/)?.[0] ?? "";
  const codes = page.match(/function CodeManagement[\s\S]*?\r?\n}\r?\n\r?\nfunction MasterNote/)?.[0] ?? "";
  const rules = page.match(/function RuleManagement[\s\S]*?\r?\n}\r?\n\r?\nfunction Kpi/)?.[0] ?? "";

  assert.match(codes, /<FieldError/);
  assert.match(rules, /<FieldError/);
  assert.match(newCase, /<ValidationSummary/);
});

test("keeps New Case validation state out of the action-plan save handler", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const newCase = page.match(/function NewCase[\s\S]*?\r?\n}\r?\n\r?\nfunction ActionPlan/)?.[0] ?? "";
  const actionPlan = page.match(/function ActionPlan\([\s\S]*?\r?\n}\r?\n\r?\nfunction QuickPanel/)?.[0] ?? "";

  assert.match(newCase, /setAttempted\(true\);\s*if \(!name\.trim\(\)\) return;/);
  assert.doesNotMatch(actionPlan, /setAttempted\(|!name\.trim\(\)/);
});

test("renders closed action plans as read-only and accepts concise real closure analyses", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const actionPlan = page.match(/function ActionPlan\([\s\S]*?\r?\n}\r?\n\r?\nfunction QuickPanel/)?.[0] ?? "";

  assert.match(actionPlan, /const isClosed = initialPlan\?\.status === "종결"/);
  assert.match(actionPlan, /종결된 조치계획은 읽기 전용입니다/);
  assert.match(actionPlan, /disabled=\{isClosed/);
  assert.match(actionPlan, /isMeaningful\(rootCause\)/);
  assert.match(actionPlan, /isMeaningful\(immediateAction\)/);
  assert.match(actionPlan, /isMeaningful\(preventiveAction\)/);
  assert.doesNotMatch(actionPlan, /trim\(\)\.length < 10/);
});

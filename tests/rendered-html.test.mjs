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

test("maps persisted display codes while retaining UUID action IDs", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /code:\s*item\.alarmCode/);
  assert.match(page, /code:\s*item\.targetCode/);
  assert.match(page, /id:\s*item\.id/);
});

test("persists every dashboard save action before reloading rendered data", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const newCaseHandler = pageSource.match(/const createNewCase[\s\S]*?const openActionPlan/)?.[0] ?? "";
  const actionPlanSave = pageSource.match(/onSave=\{async \(\{ rootCause, immediateAction, preventiveAction \}\) => \{[\s\S]*?\r?\n          }}\r?\n        \/>/)?.[0] ?? "";
  const codeManagement = pageSource.match(/function CodeManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction MasterNote/)?.[0] ?? "";
  const ruleManagement = pageSource.match(/function RuleManagement\([\s\S]*?\r?\n}\r?\n\r?\nfunction Kpi/)?.[0] ?? "";

  assert.match(pageSource, /await createTarget\(/);
  assert.match(pageSource, /await updateAlarm\(/);
  assert.match(pageSource, /await createMasterRule\(/);
  assert.match(pageSource, /await updateMasterRule\(/);
  assert.match(pageSource, /await createMasterCode\(/);
  assert.match(pageSource, /await updateMasterCode\(/);
  assert.match(pageSource, /await reloadPersistedData\(/);
  assert.doesNotMatch(pageSource, /id: `TRG-\$\{Date\.now/);
  assert.match(pageSource, /const reloadPersistedData[\s\S]*?listAlarms\([\s\S]*?listTargets\([\s\S]*?listMasterRules\("alarm"\)[\s\S]*?listMasterRules\("conversion"\)[\s\S]*?listMasterCodes\(/);
  assert.match(newCaseHandler, /await createTarget\([\s\S]*?await reloadPersistedData\([\s\S]*?setNewCase\(false\)/);
  assert.match(actionPlanSave, /await saveActionPlan\([\s\S]*?await reloadPersistedData\([\s\S]*?setActionPlan\(false\)/);
  assert.doesNotMatch(actionPlanSave, /setTargetItems\(/);
  assert.match(codeManagement, /await createMasterCode\([\s\S]*?await reloadPersistedData\([\s\S]*?setDraft/);
  assert.match(codeManagement, /await updateMasterCode\([\s\S]*?await reloadPersistedData\([\s\S]*?setEditing\(null\)/);
  assert.doesNotMatch(codeManagement, /setCodes\(/);
  assert.match(ruleManagement, /await createMasterRule\([\s\S]*?await reloadPersistedData\([\s\S]*?setDraft/);
  assert.match(ruleManagement, /await updateMasterRule\([\s\S]*?await reloadPersistedData\([\s\S]*?setEditing\(null\)/);
  assert.doesNotMatch(ruleManagement, /setRules\(/);
});

test("persists controlled action-plan analysis values on successful save", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const actionPlan = pageSource.match(/function ActionPlan\([\s\S]*?\r?\n}\r?\n\r?\nfunction QuickPanel/)?.[0] ?? "";
  const actionPlanSave = pageSource.match(/onSave=\{async \(\{ rootCause, immediateAction, preventiveAction \}\) => \{[\s\S]*?\r?\n          }}\r?\n        \/>/)?.[0] ?? "";

  assert.match(actionPlan, /const \[immediateAction, setImmediateAction\] = useState/);
  assert.match(actionPlan, /const \[rootCause, setRootCause\] = useState/);
  assert.match(actionPlan, /const \[preventiveAction, setPreventiveAction\] = useState/);
  assert.match(actionPlan, /value=\{immediateAction\}[\s\S]*?onChange=\{\(event\) => setImmediateAction/);
  assert.match(actionPlan, /value=\{rootCause\}[\s\S]*?onChange=\{\(event\) => setRootCause/);
  assert.match(actionPlan, /value=\{preventiveAction\}[\s\S]*?onChange=\{\(event\) => setPreventiveAction/);
  assert.match(actionPlanSave, /rootCause,\s*immediateAction,\s*preventiveAction,/);
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
    page.match(/function AlarmDrawer\([\s\S]*?\n}\n\nconst relatedInfo =/)?.[0] ?? "";
  const relatedAccordion =
    page.match(/function RelatedInfoAccordion\(\)[\s\S]*?\r?\n}\r?\n\r?\nfunction SampleDelayDrawer/)?.[0] ?? "";
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
  assert.match(page, /샘플 의뢰[\s\S]*시험 접수[\s\S]*시험 분석 완료[\s\S]*판정 지연/);
  assert.match(page, /경과 시간/);
  assert.match(page, /허용 기준/);
  assert.match(page, /초과 시간/);
  assert.match(sampleDelayDrawer, /const sampleDelaySummary = persistedStages\?\.length/);
  assert.match(sampleDelayDrawer, /overageMinutes: Math\.max\(0, elapsedMinutes - allowedMinutes\)/);
  assert.match(sampleDelayDrawer, /<span>\{sampleDelaySummary\.elapsedMinutes\}분<\/span>/);
  assert.match(sampleDelayDrawer, /<span>\{sampleDelaySummary\.allowedMinutes\}분<\/span>/);
  assert.match(sampleDelayDrawer, /<span>\{sampleDelaySummary\.overageMinutes\}분<\/span>/);
  assert.match(css, /\.related-info-control/);
  assert.match(css, /\.sample-delay-stage\.delay/);
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

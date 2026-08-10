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

test("includes complete demo control surfaces", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /알림 센터/);
  assert.match(source, /표시 설정/);
  assert.match(source, /첨부 파일 추가/);
  assert.match(source, /다음 페이지/);
  assert.match(source, /고객지원 센터/);
  assert.match(source, /시스템 로그/);
  assert.match(source, /q-target-rules.csv/);
  assert.match(source, /demo-attachment/);
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
  assert.match(source, /\{analysisPanel && <AnalysisPanel/);
  assert.match(source, /function AnalysisPanel/);
  assert.match(source, /기간별 카테고리 추이/);
  assert.match(source, /상태별 대상 분포/);
});

test("critical-alarm navigation resolves to a supported filter with visible history", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /type AlarmStatus = [^;]*"심각"/);
  assert.match(source, /const alarms: Alarm\[\] = \[[\s\S]*?status: "심각"/);
  assert.match(source, /상태 필터 <select[^>]*>[\s\S]*?<option>심각<\/option>/);
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
  assert.match(desktop, /\.overdue-row\{margin:4px 8px;padding:5px;gap:2px\}/);
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
  assert.match(page, /className="table-scroll" role="region" aria-label=\{label\} tabIndex=\{0\}/);
  assert.match(page, /className="chart-scroll" role="region" aria-label="카테고리별 알람 추세 차트" tabIndex=\{0\}/);
  assert.match(css, /\.table-scroll,\.chart-scroll\s*\{[^}]*overflow-x:\s*auto[^}]*\}/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*?\.chart\s*\{[^}]*min-width:\s*520px[^}]*\}/);
});

test("analysis dialog manages focus, Escape, and background inertness", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /const dialogRef = useRef<HTMLElement>/);
  assert.match(source, /previousFocus\.current = document\.activeElement/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /previousFocus\.current\?\.focus\(\)/);
  assert.match(source, /ref=\{dialogRef\}[^>]*tabIndex=\{-1\}/);
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
  assert.match(page, />저장 및 승인 요청<\/button>/);
  assert.match(css, /\.modal footer\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0[^}]*\}/s);
  assert.match(css, /\.modal footer \.black\s*\{[^}]*min-width:\s*180px[^}]*\}/s);
  assert.match(css, /\.drawer-footer \.black,\.modal footer \.black\s*\{[^}]*background:\s*#050505[^}]*color:\s*#fff[^}]*\}/s);
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
  assert.match(page, />활성<\/button>[\s\S]*?>비활성<\/button>/);
  assert.doesNotMatch(page, /window\.prompt/);
  assert.match(css, /\.rule-state-choice\.active[^}]*background:\s*#[0-9a-f]{6}[^}]*color:\s*#fff/i);
  assert.match(css, /\.rule-state-choice\.inactive[^}]*background:\s*#[0-9a-f]{6}[^}]*color:\s*#fff/i);
});

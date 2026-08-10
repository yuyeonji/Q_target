"use client";

import { useMemo, useState } from "react";

type ViewId = "dashboard" | "alarms" | "targets" | "master";
type AnalysisPanel = "trend" | "distribution" | null;
type AlarmStatus = "신규" | "검토중" | "종결";
type Alarm = { id: string; time: string; item: string; type: string; process: string; line: string; status: AlarmStatus; reviewer: string };
type Task = { id: number; title: string; owner: string; due: string; status: string };
type Target = { id: string; name: string; status: string; owner: string; priority: string; due: string };
type Rule = { id: string; name: string; scope: string; threshold: string; active: boolean };

const nav: { id: ViewId; icon: string; label: string }[] = [
  { id: "dashboard", icon: "▦", label: "통합 현황판" },
  { id: "alarms", icon: "♧", label: "알람 이력" },
  { id: "targets", icon: "◎", label: "관리대상" },
  { id: "master", icon: "⚙", label: "마스터 관리" },
];

const alarms: Alarm[] = [
  { id: "AL-99201", time: "2023-10-12 10:42:15", item: "Bearing Housing A1", type: "CPK Drop", process: "Machining", line: "Line 4", status: "신규", reviewer: "-" },
  { id: "AL-99202", time: "2023-10-12 09:15:00", item: "Stator Core B2", type: "Defect Rate", process: "Assembly", line: "Line 2", status: "검토중", reviewer: "S. Miller" },
  { id: "AL-99203", time: "2023-10-12 08:30:22", item: "Rotor Assembly C", type: "Trend Alert", process: "Testing", line: "Line 1", status: "종결", reviewer: "시스템" },
];

const initialTargets: Target[] = [
  { id: "TRG-8921", name: "터빈 압파 교정", status: "진행 중", owner: "Sarah Chen", priority: "높음", due: "2023-11-15" },
  { id: "TRG-8922", name: "HVAC 시스템 오버홀", status: "대기", owner: "Marcus Rossi", priority: "중간", due: "2023-11-20" },
  { id: "TRG-8915", name: "원자로 코어 센서 동기화", status: "심각", owner: "John Doe", priority: "긴급", due: "2023-10-31" },
  { id: "TRG-8925", name: "파이프라인 압력 테스트", status: "대기", owner: "Aisha Patel", priority: "낮음", due: "2023-12-05" },
  { id: "TRG-8910", name: "안전 장비 재고 확인", status: "완료", owner: "Marcus Rossi", priority: "중간", due: "2023-10-25" },
];
const initialRules: Rule[] = [
  { id: "RUL-001", name: "CPK 하한 임계값", scope: "전 공장 / 가공", threshold: "1.33 미만", active: true },
  { id: "RUL-002", name: "불량률 경고", scope: "조립 2라인", threshold: "3.0% 초과", active: true },
  { id: "RUL-003", name: "샘플링 지연", scope: "전체 제품", threshold: "30분 초과", active: false },
];

function Status({ children }: { children: string }) {
  const kind = children === "심각" ? "critical" : children === "진행 중" || children === "신규" ? "active" : children === "검토중" ? "warning" : "neutral";
  return <span className={`status ${kind}`}>{children}</span>;
}

function MiniBars({ critical = false }: { critical?: boolean }) {
  return <div className="bars" aria-label="최근 추이"><i /><i /><i /><i className={critical ? "red" : "blue"} /><i /><i /><i /><i /></div>;
}

export default function Home() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [analysisPanel, setAnalysisPanel] = useState<AnalysisPanel>(null);
  const [search, setSearch] = useState("");
  const [alarmFilter, setAlarmFilter] = useState("전체");
  const [targetFilter, setTargetFilter] = useState("전체");
  const [targetPage, setTargetPage] = useState(1);
  const [period, setPeriod] = useState("최근 7일");
  const [factory, setFactory] = useState("전체 공장");
  const [product, setProduct] = useState("전체 제품");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState<"고객지원 센터" | "시스템 로그" | null>(null);
  const [compact, setCompact] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [actionPlan, setActionPlan] = useState(false);
  const [newCase, setNewCase] = useState(false);
  const [taskTab, setTaskTab] = useState("최근 유사 알람");
  const [masterTab, setMasterTab] = useState("알람 규칙");
  const [notice, setNotice] = useState("");
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "압출기 3호기 모터 베어링 긴급 교체", owner: "박설비 (기계팀)", due: "11/20/2023", status: "진행중" },
    { id: 2, title: "윤활유 라인 누유 지점 보수 및 전체 라인 점검", owner: "이점검 (보전팀)", due: "11/21/2023", status: "대기중" },
  ]);
  const [newTask, setNewTask] = useState("");
  const [taskOwner, setTaskOwner] = useState("담당자 미지정");
  const [taskDue, setTaskDue] = useState("미정");
  const [alarmItems, setAlarmItems] = useState(alarms);
  const [targetItems, setTargetItems] = useState(initialTargets);
  const [rules, setRules] = useState(initialRules);

  const visibleAlarms = useMemo(() => alarmItems.filter((item) => `${item.item} ${item.id} ${item.type}`.toLowerCase().includes(search.toLowerCase()) && (alarmFilter === "전체" || item.status === alarmFilter)), [search, alarmFilter, alarmItems]);
  const visibleTargets = useMemo(() => targetItems.filter((item) => `${item.id} ${item.name} ${item.owner}`.toLowerCase().includes(search.toLowerCase()) && (targetFilter === "전체" || item.status === targetFilter)), [search, targetFilter, targetItems]);
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2200); };
  const addTask = () => {
    if (!newTask.trim()) return showNotice("새 과제명을 입력해 주세요.");
    setTasks([...tasks, { id: Date.now(), title: newTask, owner: taskOwner, due: taskDue, status: "대기중" }]);
    setNewTask("");
  };
  const downloadCsv = (rows: Record<string, string>[], filename: string) => {
    const columns = Object.keys(rows[0] ?? {});
    const value = [columns, ...rows.map((row) => columns.map((key) => `"${String(row[key]).replaceAll('"', '""')}"`))].map((line) => line.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`\uFEFF${value}`], { type: "text/csv;charset=utf-8" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    showNotice(`${filename} 파일을 내려받았습니다.`);
  };
  const updateAlarm = (status: AlarmStatus, message: string) => {
    if (!alarm) return;
    setAlarmItems((items) => items.map((item) => item.id === alarm.id ? { ...item, status, reviewer: status === "종결" ? "시스템" : "품질 검토팀" } : item));
    setAlarm(null);
    showNotice(message);
  };

  return (
    <main className={compact ? "platform compact-mode" : "platform"}>
      <aside className="sidebar">
        <div className="brand"><strong>Q-Target</strong><span>Precision Control</span></div>
        <p className="side-label">정밀 제어</p>
        <nav aria-label="주요 메뉴">{nav.map((item) => <button key={item.id} className={view === item.id ? "nav-item current" : "nav-item"} onClick={() => setView(item.id)}><b>{item.icon}</b>{item.label}</button>)}</nav>
        <div className="side-bottom"><button onClick={() => setSupportOpen("고객지원 센터")}>ⓘ 고객지원</button><button onClick={() => setSupportOpen("시스템 로그")}>▣ 로그</button></div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <h1>품질 알람 및 관리 통합 플랫폼</h1>
          <div className="global-search">⌕ <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="인텔렉트 검색..." /></div>
          <div className="top-actions"><button aria-label="알림" onClick={() => setNotificationOpen(!notificationOpen)}>♧</button><button aria-label="설정" onClick={() => setSettingsOpen(true)}>⚙</button><button className="black" onClick={() => setNewCase(true)}>신규 케이스</button><span className="avatar">YC</span></div>
        </header>

        <div className="content">
          {view === "dashboard" && <Dashboard period={period} factory={factory} product={product} setPeriod={setPeriod} setFactory={setFactory} setProduct={setProduct} onOpenAnalysis={(panel) => panel === "trend" ? setAnalysisPanel("trend") : setAnalysisPanel("distribution")} onViewCriticalAlarms={() => { setView("alarms"); setAlarmFilter("심각"); }} onNavigate={(nextView, filter) => { setView(nextView); if (nextView === "alarms") setAlarmFilter(filter); if (nextView === "targets") setTargetFilter(filter); }} />}
          {view === "alarms" && <AlarmList alarms={visibleAlarms} search={search} filter={alarmFilter} setFilter={setAlarmFilter} onOpen={setAlarm} onExport={() => downloadCsv(visibleAlarms.map(({ id, time, item, type, process, line, status, reviewer }) => ({ id, time, item, type, process, line, status, reviewer })), "q-target-alarms.csv")} />}
          {view === "targets" && <TargetList targets={visibleTargets} filter={targetFilter} setFilter={setTargetFilter} onOpen={(target) => { setSelectedTarget(target); setActionPlan(true); }} onExport={() => downloadCsv(visibleTargets, "q-target-targets.csv")} />}
          {view === "master" && <Master tab={masterTab} setTab={setMasterTab} rules={rules} setRules={setRules} showNotice={showNotice} />}
        </div>
      </section>

      {newCase && <NewCase onClose={() => setNewCase(false)} onCreate={(name, priority) => { setTargetItems((items) => [{ id: `TRG-${Date.now().toString().slice(-4)}`, name, status: "대기", owner: "담당자 미지정", priority, due: "미정" }, ...items]); setNewCase(false); setView("targets"); showNotice("새 관리대상을 등록했습니다."); }} />}
      {notificationOpen && <QuickPanel title="알림 센터" onClose={() => setNotificationOpen(false)}><p><b>심각 알람 1건</b><br />Bearing Housing A1 검토 기한이 임박했습니다.</p><p><b>승인 요청 2건</b><br />조치계획 검토를 기다리고 있습니다.</p></QuickPanel>}
      {settingsOpen && <SettingsPanel compact={compact} setCompact={setCompact} onClose={() => setSettingsOpen(false)} />}
      {supportOpen && <QuickPanel title={supportOpen} onClose={() => setSupportOpen(null)}><p>{supportOpen === "고객지원 센터" ? "품질 운영팀 · 평일 09:00–18:00 · help@q-target.demo" : "최근 24시간 동안 오류 없이 정상 수집되었습니다."}</p></QuickPanel>}
      {analysisPanel && <AnalysisPanel panel={analysisPanel} onClose={() => setAnalysisPanel(null)} />}
      {alarm && <AlarmDrawer alarm={alarm} tab={taskTab} setTab={setTaskTab} onClose={() => setAlarm(null)} onCloseAlarm={() => updateAlarm("종결", "알람을 조치 불필요로 종결했습니다.")} onMonitor={() => updateAlarm("검토중", "알람을 모니터링 상태로 전환했습니다.")} onAction={() => { setAlarmItems((items) => items.map((item) => item.id === alarm.id ? { ...item, status: "검토중", reviewer: "품질 검토팀" } : item)); setAlarm(null); setActionPlan(true); }} />}
      {actionPlan && <ActionPlan targetName={selectedTarget?.name ?? "설비 비정상 진동 발생"} tasks={tasks} newTask={newTask} setNewTask={setNewTask} taskOwner={taskOwner} setTaskOwner={setTaskOwner} taskDue={taskDue} setTaskDue={setTaskDue} onAdd={addTask} onDelete={(id) => setTasks(tasks.filter((task) => task.id !== id))} onClose={() => setActionPlan(false)} onSave={() => { setTargetItems((items) => items.map((target) => target.id === selectedTarget?.id ? { ...target, status: "진행 중" } : target)); setActionPlan(false); showNotice("조치계획을 저장하고 관리대상을 진행 상태로 변경했습니다."); }} />}
      {notice && <div className="toast" role="status">✓ {notice}</div>}
    </main>
  );
}

function Dashboard({ period, factory, product, setPeriod, setFactory, setProduct, onOpenAnalysis, onViewCriticalAlarms, onNavigate }: { period: string; factory: string; product: string; setPeriod: (value: string) => void; setFactory: (value: string) => void; setProduct: (value: string) => void; onOpenAnalysis: (panel: Exclude<AnalysisPanel, null>) => void; onViewCriticalAlarms: () => void; onNavigate: (view: ViewId, filter: string) => void }) {
  return <>
    <div className="page-head"><div><h2>현황판 개요</h2><p>{period} · {factory} · {product}</p></div><div className="filters"><label>기간<select value={period} onChange={(e) => setPeriod(e.target.value)}><option>최근 7일</option><option>최근 30일</option><option>이번 분기</option></select></label><label>공장<select value={factory} onChange={(e) => setFactory(e.target.value)}><option>전체 공장</option><option>알파 공장</option><option>베타 공장</option></select></label><label>제품<select value={product} onChange={(e) => setProduct(e.target.value)}><option>전체 제품</option><option>Type X</option><option>Type Y</option></select></label></div></div>
    <div className="kpis"><button className="kpi-button" onClick={() => onNavigate("alarms", "전체")}><Kpi title="전체 알람" value={period === "최근 7일" ? "2,405" : "8,742"} note="● 142 심각    ● 893 신규" trend="↗ +12%" /></button><button className="kpi-button" onClick={() => onNavigate("targets", "진행 중")}><Kpi title="관리대상" value={factory === "전체 공장" ? "84" : "28"} note="● 62 진행중    ● 12 기한 초과" trend="→ 0%" /></button><article className="kpi-button"><Kpi title="조치 종결률" value="92.4%" note="목표: 95%" trend="↗ +4.2%" progress /></article></div>
    <div className="dashboard-grid"><article className="card chart-card"><h3>카테고리별 알람 추세 <button type="button" aria-label="카테고리별 알람 추세 상세 보기" onClick={() => onOpenAnalysis("trend")}>⋮</button></h3><div className="chart"><span style={{height:"40%"}} /><span style={{height:"65%"}} /><span className="pink" style={{height:"84%"}} /><span style={{height:"45%"}} /><span style={{height:"30%"}} /><span style={{height:"55%"}} /><span style={{height:"70%"}} /><span style={{height:"90%"}} /><span style={{height:"60%"}} /><span style={{height:"40%"}} /></div><p className="legend">● 샘플 지연　● 공정능력　● 트렌드 이탈</p></article>
      <article className="card donut-card"><h3>대상 분포 <button type="button" aria-label="대상 분포 상세 보기" onClick={() => onOpenAnalysis("distribution")}>⋮</button></h3><div className="donut"><strong>84<small>전체</small></strong></div><div className="distribution"><p>● 정상 <b>50 (60%)</b></p><p>● 위험 <b>22 (25%)</b></p><p className="red-text">● 기한 초과 <b>12 (15%)</b></p></div></article>
      <article className="card table-card"><h3>심각 알람 검토 대기 <button onClick={onViewCriticalAlarms}>전체 보기 →</button></h3><table><thead><tr><th>알람 ID</th><th>유형</th><th>공장 / 라인</th><th>지속 시간</th><th>상태</th></tr></thead><tbody>{[["ALM-8492","샘플 지연","알파 - L1","4h 12m"],["ALM-8490","공정능력 위반","베타 - L3","2h 45m"],["ALM-8488","트렌드 경고","감마 - L2","1h 10m"],["ALM-8475","샘플 지연","알파 - L1","5h 30m"]].map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><Status>심각</Status></td></tr>)}</tbody></table></article>
      <article className="card overdue"><h3>⚠ 기한 초과 관리대상</h3>{["L1 불량률 감소","자동 샘플링 도입","3분기 공정 심사 준수"].map((x, i) => <div className="overdue-row" key={x}><small>TGT-8{84 + i}</small><b>{x}</b><div><i style={{width: `${65 + i * 10}%`}} /></div></div>)}</article></div>
  </>;
}

function AnalysisPanel({ panel, onClose }: { panel: Exclude<AnalysisPanel, null>; onClose: () => void }) {
  const title = panel === "trend" ? "카테고리별 알람 추세 분석" : "대상 분포 분석";

  return <div className="overlay" role="presentation" onClick={onClose}>
    <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="analysis-panel-title" onClick={(event) => event.stopPropagation()}>
      <button aria-label="분석 패널 닫기" className="close" onClick={onClose}>×</button>
      <span className="badge">DASHBOARD ANALYSIS</span>
      <h2 id="analysis-panel-title">{title}</h2>
      {panel === "trend" ? <section>
        <h3>기간별 카테고리 추이</h3>
        <table><thead><tr><th>카테고리</th><th>최근 7일</th><th>최근 30일</th><th>이번 분기</th></tr></thead><tbody>
          <tr><td>샘플 지연</td><td>18</td><td>72</td><td>211</td></tr>
          <tr><td>공정능력</td><td>24</td><td>96</td><td>284</td></tr>
          <tr><td>트렌드 이탈</td><td>12</td><td>51</td><td>143</td></tr>
        </tbody></table>
      </section> : <section>
        <h3>상태별 대상 분포</h3>
        <table><thead><tr><th>상태</th><th>건수</th><th>비중</th><th>대상 행</th></tr></thead><tbody>
          <tr><td>정상</td><td>50</td><td>60%</td><td>TGT-8921, TGT-8925</td></tr>
          <tr><td>위험</td><td>22</td><td>25%</td><td>TGT-8918, TGT-8922</td></tr>
          <tr><td>기한 초과</td><td>12</td><td>15%</td><td>TGT-8884, TGT-8885</td></tr>
        </tbody></table>
      </section>}
    </aside>
  </div>;
}

function Kpi({ title, value, note, trend, progress }: { title: string; value: string; note: string; trend: string; progress?: boolean }) { return <article className="card kpi"><div><h3>{title}</h3><b className="trend">{trend}</b></div><strong>{value}</strong>{progress && <div className="progress"><i /></div>}<p>{note}</p></article>; }

function AlarmList({ alarms, search, filter, setFilter, onOpen, onExport }: { alarms: Alarm[]; search: string; filter: string; setFilter: (value: string) => void; onOpen: (a: Alarm) => void; onExport: () => void }) { return <article className="card full-table"><div className="section-head"><div><h2>활성 알람</h2><p>생산 라인 전체의 14개 심각 편차를 모니터링 중입니다.</p></div><div className="interactive-controls"><label>상태 필터 <select value={filter} onChange={(e) => setFilter(e.target.value)}><option>전체</option><option>신규</option><option>검토중</option><option>종결</option></select></label><button onClick={onExport}>⇩ CSV 내보내기</button></div></div><table><thead><tr><th>시간</th><th>항목</th><th>ID</th><th>유형</th><th>공정</th><th>라인</th><th>상태</th><th>검토자</th></tr></thead><tbody>{alarms.map((a) => <tr className="clickable" key={a.id} onClick={() => onOpen(a)}><td>{a.time}</td><td>{a.item}</td><td>{a.id}</td><td>{a.type}</td><td>{a.process}</td><td>{a.line}</td><td><Status>{a.status}</Status></td><td>{a.reviewer}</td></tr>)}</tbody></table>{alarms.length === 0 && <div className="empty">“{search}”에 해당하는 알람이 없습니다.</div>}</article>; }

function TargetList({ targets, filter, setFilter, onOpen, onExport }: { targets: Target[]; filter: string; setFilter: (value: string) => void; onOpen: (target: Target) => void; onExport: () => void }) { const [page, setPage] = useState(1); const pageSize = 3; const pageRows = targets.slice((page - 1) * pageSize, page * pageSize); const totalPages = Math.max(1, Math.ceil(targets.length / pageSize)); return <><div className="page-head target-title"><div><h2>관리대상 목록</h2><p>모든 활성 및 대기 중인 관리대상 현황입니다.</p></div><div className="interactive-controls"><label>상태 필터 <select value={filter} onChange={(e) => setFilter(e.target.value)}><option>전체</option><option>진행 중</option><option>대기</option><option>심각</option><option>완료</option></select></label><button onClick={onExport}>⇩ CSV 내보내기</button></div></div><div className="target-kpis"><Kpi title="전체 관리대상" value={String(targets.length)} note="↗ +12%" trend="" /><Kpi title="진행 중" value={String(targets.filter((target) => target.status === "진행 중").length)} note="현재 처리 중인 항목" trend="" /><Kpi title="심각 알람" value={String(targets.filter((target) => target.status === "심각").length)} note="조치 필요" trend="⚠" /><Kpi title="완료 (연간)" value={String(targets.filter((target) => target.status === "완료").length)} note="완료된 관리 항목" trend="" /></div><article className="card full-table"><table><thead><tr><th>관리번호</th><th>관리항목명</th><th>상태</th><th>담당자</th><th>우선순위</th><th>마감일</th><th>작업</th></tr></thead><tbody>{pageRows.map((r) => <tr key={r.id} className={r.status === "심각" ? "critical-row" : ""}><td>{r.id}</td><td><b>{r.name}</b></td><td><Status>{r.status}</Status></td><td>◉　{r.owner}</td><td className={r.priority === "긴급" ? "red-text" : ""}>{r.priority === "긴급" ? "! " : ""}{r.priority}</td><td>{r.due}</td><td><button aria-label={`${r.name} 조치계획`} className="dots" onClick={() => onOpen(r)}>•••</button></td></tr>)}</tbody></table>{targets.length === 0 && <div className="empty">검색 또는 필터 조건에 맞는 관리대상이 없습니다.</div>}<div className="pagination">{targets.length}개 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, targets.length)} 표시 <span><button aria-label="이전 페이지" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button><button aria-label="다음 페이지" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button></span></div></article></>; }

function Master({ tab, setTab, rules, setRules, showNotice }: { tab: string; setTab: (s: string) => void; rules: Rule[]; setRules: (rules: Rule[]) => void; showNotice: (s: string) => void }) { const tabs = ["알람 규칙", "전환 규칙", "코드 관리"]; const [newRule, setNewRule] = useState(""); const exportRules = () => { const csv = ["규칙 ID,규칙명,적용 범위,임계값,상태", ...rules.map((rule) => [rule.id, rule.name, rule.scope, rule.threshold, rule.active ? "활성" : "비활성"].join(","))].join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })); link.download = "q-target-rules.csv"; link.click(); URL.revokeObjectURL(link.href); showNotice("q-target-rules.csv 파일을 내려받았습니다."); }; const addRule = () => { if (!newRule.trim()) return showNotice("규칙명을 입력해 주세요."); setRules([...rules, { id: `RUL-${String(rules.length + 1).padStart(3, "0")}`, name: newRule, scope: "전체 제품", threshold: "검토 필요", active: true }]); setNewRule(""); showNotice("새 규칙을 추가했습니다."); }; return <><div className="page-head"><div><h2>마스터 관리</h2><p>시스템 핵심 규칙 및 임계값을 설정합니다.</p></div><code>⌁ v4.2.1-prod</code></div><div className="tabs">{tabs.map((x) => <button key={x} onClick={() => setTab(x)} className={tab === x ? "selected" : ""}>{x}</button>)}</div><p className="tab-description">{tab === "알람 규칙" ? "알람 발생 기준을 관리합니다." : tab === "전환 규칙" ? "알람을 관리대상으로 전환하는 조건을 관리합니다." : "제품·공정 코드 체계를 관리합니다."}</p><div className="master-grid"><article className="card rules"><div className="section-head"><h3>{tab}</h3><div><button onClick={exportRules}>⇩ 내보내기</button></div></div><div className="rule-create"><input aria-label="새 규칙명" value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="새 규칙명 입력" /><button className="black" onClick={addRule}>＋ 새 규칙 추가</button></div><table><thead><tr><th>규칙 ID</th><th>규칙명</th><th>적용 범위</th><th>임계값</th><th>상태</th><th /></tr></thead><tbody>{rules.map((r) => <tr key={r.id}><td>{r.id}</td><td><b>{r.name}</b></td><td>{r.scope}</td><td>{r.threshold}</td><td><button className="rule-status" onClick={() => { setRules(rules.map((rule) => rule.id === r.id ? { ...rule, active: !rule.active } : rule)); showNotice(`${r.name} 규칙을 ${r.active ? "비활성" : "활성"}화했습니다.`); }}><Status>{r.active ? "활성" : "비활성"}</Status></button></td><td><button aria-label={`${r.name} 이름 수정`} onClick={() => { const name = window.prompt("규칙명", r.name); if (name?.trim()) { setRules(rules.map((rule) => rule.id === r.id ? { ...rule, name } : rule)); showNotice("규칙명을 수정했습니다."); } }}>✎</button></td></tr>)}</tbody></table></article><article className="card master-note"><h3>규칙 적용 안내</h3><p>변경된 규칙은 승인 후 다음 수집 주기부터 적용됩니다.</p><div className="step current"><b>1</b><span>변경사항 저장</span></div><div className="step"><b>2</b><span>검토자 승인</span></div><div className="step"><b>3</b><span>운영 환경 반영</span></div></article></div></>; }

function AlarmDrawer({ alarm, tab, setTab, onClose, onCloseAlarm, onMonitor, onAction }: { alarm: Alarm; tab: string; setTab: (s: string) => void; onClose: () => void; onCloseAlarm: () => void; onMonitor: () => void; onAction: () => void }) { const [attachments, setAttachments] = useState(["측정 데이터.csv · 42KB"]); const tabs = ["최근 유사 알람", "과거 관리대상 내역", "과거 조치 및 효과", "첨부파일"]; return <div className="overlay"><aside className="drawer"><button aria-label="상세 닫기" className="close" onClick={onClose}>×</button><span className="badge">NEW ALARM　 ID: {alarm.id}</span><h2>{alarm.item}</h2><p className="red-text">CPK 값이 1.33 임계값 미만으로 하락했습니다.</p><section><h3>알람 기본 정보</h3><div className="info-grid"><p>알람 번호<strong>{alarm.id}</strong></p><p>발생 일시<strong>{alarm.time}</strong></p><p>유형<strong>{alarm.type}</strong></p><p>제품/스펙<strong>{alarm.item} / Type X</strong></p><p>공정/라인<strong>{alarm.process} / {alarm.line}</strong></p><p>설비<strong>CNC-M-04</strong></p><p>생산 LOT<strong>LOT-231012-001</strong></p><p>검토 기한<strong className="red-text">2023-10-13 10:42:15</strong></p></div></section><section><h3>상세 수치 및 기준 비교</h3><p>30일 CPK 1.12 / 기준 1.33 / 최근 7일 중 4회 발생</p><div className="measurements"><article><b>현재 값 vs 기준 값</b><p>현재 값 <strong className="red-text">1.12</strong></p><p>목표 값 <strong>1.33</strong></p></article><article><b>CPK 비교 추이</b><p>30일 <strong className="red-text">1.12</strong></p><p>3개월 <strong>1.15</strong></p><p>3년 <strong>1.20</strong></p></article><article><b>최근 30일 추세</b><MiniBars critical /></article></div></section><section><h3>영향도 평가</h3><div className="impact"><p>영향받는 제품/고객<br /><b>제품 A, B / 주요 고객사 X</b></p><p>로트 생산/검사/부적합 수량<br /><b>5,000 / 100 / <span className="red-text">12</span></b></p><p>출하 상태 및 재고<br /><b>출하 대기 / 재고 2,000</b></p><p>연관 CTQ 및 공정 요인<br /><b>온도 편차, 절삭 공구 마모</b></p></div></section><section className="drawer-tab-content"><h3>{tab}</h3>{tab === "최근 유사 알람" && <p>최근 30일 내 같은 설비에서 3건의 유사 알람이 발생했습니다.</p>}{tab === "과거 관리대상 내역" && <p>TRG-8841 · 2023-09-18 · 조치 완료</p>}{tab === "과거 조치 및 효과" && <p>베어링 교체 후 CPK가 1.42까지 회복되었습니다.</p>}{tab === "첨부파일" && <div><p>{attachments.map((file) => <span className="demo-attachment" key={file}>{file}</span>)}</p><button onClick={() => setAttachments([...attachments, "demo-attachment-" + (attachments.length + 1) + ".pdf"])}>첨부 파일 추가</button></div>}</section><div className="drawer-footer"><button onClick={onCloseAlarm}>조치 불필요 종결</button><button onClick={onMonitor}>모니터링 유지</button><button className="black" onClick={onAction}>✣ 관리대상 등록</button></div><div className="drawer-tabs">{tabs.map((x) => <button key={x} className={tab === x ? "selected" : ""} onClick={() => setTab(x)}>{x}</button>)}</div></aside></div>; }

function NewCase({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, priority: string) => void }) { const [name, setName] = useState(""); const [priority, setPriority] = useState("중간"); return <div className="overlay modal-overlay"><section className="case-modal"><button aria-label="모달 닫기" className="close" onClick={onClose}>×</button><h2>신규 케이스 등록</h2><p>관리대상으로 추적할 품질 이슈를 등록합니다.</p><label>관리항목명<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 설비 진동 기준 초과" /></label><label>우선순위<select value={priority} onChange={(e) => setPriority(e.target.value)}><option>중간</option><option>높음</option><option>긴급</option></select></label><footer><button onClick={onClose}>취소</button><button className="black" onClick={() => onCreate(name, priority)}>등록</button></footer></section></div>; }

function ActionPlan({ targetName, tasks, newTask, setNewTask, taskOwner, setTaskOwner, taskDue, setTaskDue, onAdd, onDelete, onClose, onSave }: { targetName: string; tasks: Task[]; newTask: string; setNewTask: (s: string) => void; taskOwner: string; setTaskOwner: (s: string) => void; taskDue: string; setTaskDue: (s: string) => void; onAdd: () => void; onDelete: (id: number) => void; onClose: () => void; onSave: () => void }) { return <div className="overlay modal-overlay"><section className="modal"><button aria-label="모달 닫기" className="close" onClick={onClose}>×</button><h2>원인분석 및 조치계획</h2><p>Target ID: TGT-2023-1049 | {targetName}</p><section><h3>🔔 알람 상세 정보 (Alarm Details)</h3><div className="alarm-summary"><div><b>항목명</b><br />압출기 3호기 비정상 진동<br /><b className="red-text">높음 (High)</b></div><div><b>측정 데이터</b><p>현재값　<strong className="red-text">3.82</strong>　 기준값　<strong>2.50</strong></p><small>발생일시　2023-11-20 14:22:05</small></div><div><b>최근 30일 발생 추이</b><MiniBars /></div></div></section><section><h3>🟣 원인분석 (Cause Analysis)</h3><div className="textareas"><label>현상 (Phenomenon)<textarea defaultValue={"발생한 현상을 객관적인 사실 기반으로 상세히 기술하세요."} /></label><label>근본 원인 (Root Cause)<textarea defaultValue={"5Why 분석을 통한 근본 원인을 기술하세요."} /></label></div></section><section><div className="section-head"><h3>▣ 조치계획 (Action Plan)</h3><button onClick={onAdd}>＋ 신규 과제 추가</button></div><table className="tasks"><thead><tr><th>No.</th><th>과제명</th><th>담당자</th><th>완료예정일</th><th>상태</th><th>관리</th></tr></thead><tbody>{tasks.map((task, index) => <tr key={task.id}><td>{index + 1}</td><td>{task.title}</td><td>{task.owner}</td><td>{task.due}</td><td><Status>{task.status}</Status></td><td><button aria-label="과제 삭제" onClick={() => onDelete(task.id)}>⌫</button></td></tr>)}<tr><td>{tasks.length + 1}</td><td><input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="새로운 과제를 입력하세요..." /></td><td><select aria-label="담당자 선택" value={taskOwner} onChange={(e) => setTaskOwner(e.target.value)}><option>담당자 미지정</option><option>박설비 (기계팀)</option><option>이점검 (보전팀)</option></select></td><td><select aria-label="완료예정일" value={taskDue} onChange={(e) => setTaskDue(e.target.value)}><option>미정</option><option>11/25/2023</option><option>11/30/2023</option></select></td><td>-</td><td /></tr></tbody></table></section><footer><button onClick={onClose}>취소 (Cancel)</button><button className="black" onClick={onSave}>▣ 저장 및 승인요청 (Save & Submit)</button></footer></section></div>; }

function QuickPanel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="overlay quick-overlay"><section className="quick-panel"><button aria-label="패널 닫기" className="close" onClick={onClose}>×</button><h2>{title}</h2>{children}<button className="black" onClick={onClose}>확인</button></section></div>;
}

function SettingsPanel({ compact, setCompact, onClose }: { compact: boolean; setCompact: (value: boolean) => void; onClose: () => void }) { const [alerts, setAlerts] = useState(true); return <div className="overlay quick-overlay"><section className="quick-panel"><button aria-label="설정 닫기" className="close" onClick={onClose}>×</button><h2>표시 설정</h2><label className="setting-row">간결한 테이블 보기<input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /></label><label className="setting-row">심각 알람 알림<input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} /></label><button className="black" onClick={onClose}>저장</button></section></div>; }

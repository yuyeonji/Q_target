"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createMasterCode,
  createMasterRule,
  createTarget,
  getAlarmDetail,
  listAlarms,
  listMasterCodes,
  listMasterRules,
  listTargets,
  saveActionPlan,
  type SampleDelayStage,
  updateAlarm,
  updateMasterCode,
  updateMasterRule,
  updateTarget,
} from "@/lib/client-api";

type ViewId = "dashboard" | "alarms" | "targets" | "master";
type AnalysisPanel = "trend" | "distribution" | null;
type AlarmStatus = "신규" | "검토중" | "심각" | "종결";
type Alarm = {
  id: string;
  code?: string;
  time: string;
  item: string;
  type: string;
  process: string;
  line: string;
  status: AlarmStatus;
  reviewer: string;
};
type Task = {
  id: number;
  title: string;
  owner: string;
  due: string;
  status: string;
};
type Target = {
  id: string;
  code?: string;
  name: string;
  status: string;
  owner: string;
  priority: string;
  due: string;
  sourceAlarmId?: string;
};
type Rule = {
  id: string;
  code?: string;
  name: string;
  scope: string;
  threshold: string;
  active: boolean;
};
type MasterCode = {
  id: string;
  code: string;
  name: string;
  category: string;
  active: boolean;
};

const nav: { id: ViewId; icon: string; label: string }[] = [
  { id: "dashboard", icon: "▦", label: "통합 현황판" },
  { id: "alarms", icon: "♧", label: "알람 이력" },
  { id: "targets", icon: "◎", label: "관리대상" },
  { id: "master", icon: "⚙", label: "마스터 관리" },
];

const alarms: Alarm[] = [
  {
    id: "AL-99198",
    time: "2023-10-12 11:08:44",
    item: "Bearing Housing A1",
    type: "Sample Delay",
    process: "Machining",
    line: "Line 4",
    status: "심각",
    reviewer: "품질 검토팀",
  },
  {
    id: "AL-99201",
    time: "2023-10-12 10:42:15",
    item: "Bearing Housing A1",
    type: "CPK Drop",
    process: "Machining",
    line: "Line 4",
    status: "신규",
    reviewer: "-",
  },
  {
    id: "AL-99202",
    time: "2023-10-12 09:15:00",
    item: "Stator Core B2",
    type: "Defect Rate",
    process: "Assembly",
    line: "Line 2",
    status: "검토중",
    reviewer: "S. Miller",
  },
  {
    id: "AL-99203",
    time: "2023-10-12 08:30:22",
    item: "Rotor Assembly C",
    type: "Trend Alert",
    process: "Testing",
    line: "Line 1",
    status: "종결",
    reviewer: "시스템",
  },
];

const initialTargets: Target[] = [
  {
    id: "TRG-8921",
    name: "터빈 압파 교정",
    status: "진행 중",
    owner: "Sarah Chen",
    priority: "높음",
    due: "2023-11-15",
  },
  {
    id: "TRG-8922",
    name: "HVAC 시스템 오버홀",
    status: "대기",
    owner: "Marcus Rossi",
    priority: "중간",
    due: "2023-11-20",
  },
  {
    id: "TRG-8915",
    name: "원자로 코어 센서 동기화",
    status: "심각",
    owner: "John Doe",
    priority: "긴급",
    due: "2023-10-31",
  },
  {
    id: "TRG-8925",
    name: "파이프라인 압력 테스트",
    status: "대기",
    owner: "Aisha Patel",
    priority: "낮음",
    due: "2023-12-05",
  },
  {
    id: "TRG-8910",
    name: "안전 장비 재고 확인",
    status: "완료",
    owner: "Marcus Rossi",
    priority: "중간",
    due: "2023-10-25",
  },
];
const initialAlarmRules: Rule[] = [
  {
    id: "ALR-001",
    name: "CPK 하한 경고",
    scope: "전 공장 / 가공",
    threshold: "1.33 미만",
    active: true,
  },
  {
    id: "ALR-002",
    name: "불량률 급증",
    scope: "조립 2라인",
    threshold: "3.0% 초과",
    active: true,
  },
  {
    id: "ALR-003",
    name: "샘플링 지연",
    scope: "전체 제품",
    threshold: "30분 초과",
    active: false,
  },
];
const initialConversionRules: Rule[] = [
  {
    id: "CVR-001",
    name: "심각 알람 자동 전환",
    scope: "심각 등급 알람",
    threshold: "즉시 전환",
    active: true,
  },
  {
    id: "CVR-002",
    name: "반복 알람 전환",
    scope: "동일 제품 / 동일 공정",
    threshold: "7일 내 3회",
    active: true,
  },
  {
    id: "CVR-003",
    name: "장기 미검토 전환",
    scope: "신규·검토중 알람",
    threshold: "24시간 경과",
    active: false,
  },
];
const initialCodes: MasterCode[] = [
  {
    id: "COD-001",
    code: "PRC-MCH",
    name: "가공",
    category: "공정 코드",
    active: true,
  },
  {
    id: "COD-002",
    code: "ALM-CPK",
    name: "CPK 하락",
    category: "알람 유형",
    active: true,
  },
  {
    id: "COD-003",
    code: "STS-HOLD",
    name: "출하 보류",
    category: "상태 코드",
    active: false,
  },
];

function Status({ children }: { children: string }) {
  const kind =
    children === "심각"
      ? "critical"
      : children === "진행 중" || children === "신규"
        ? "active"
        : children === "검토중"
          ? "warning"
          : "neutral";
  return <span className={`status ${kind}`}>{children}</span>;
}

function MiniBars({ critical = false }: { critical?: boolean }) {
  return (
    <div className="bars" aria-label="최근 추이">
      <i />
      <i />
      <i />
      <i className={critical ? "red" : "blue"} />
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [analysisPanel, setAnalysisPanel] = useState<AnalysisPanel>(null);
  const [search, setSearch] = useState("");
  const [alarmFilter, setAlarmFilter] = useState("전체");
  const [targetFilter, setTargetFilter] = useState("전체");
  const [period, setPeriod] = useState("최근 7일");
  const [factory, setFactory] = useState("전체 공장");
  const [product, setProduct] = useState("전체 제품");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState<
    "고객지원 센터" | "시스템 로그" | null
  >(null);
  const [compact, setCompact] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [actionPlan, setActionPlan] = useState(false);
  const [actionPlanAlarmId, setActionPlanAlarmId] = useState<string | null>(null);
  const [newCase, setNewCase] = useState(false);
  const [masterTab, setMasterTab] = useState("알람 규칙");
  const [notice, setNotice] = useState("");
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "압출기 3호기 모터 베어링 긴급 교체",
      owner: "박설비 (기계팀)",
      due: "11/20/2023",
      status: "진행중",
    },
    {
      id: 2,
      title: "윤활유 라인 누유 지점 보수 및 전체 라인 점검",
      owner: "이점검 (보전팀)",
      due: "11/21/2023",
      status: "대기중",
    },
  ]);
  const [newTask, setNewTask] = useState("");
  const [taskOwner, setTaskOwner] = useState("담당자 미지정");
  const [taskDue, setTaskDue] = useState("미정");
  const [alarmItems, setAlarmItems] = useState(alarms);
  const [targetItems, setTargetItems] = useState(initialTargets);
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading");
  const [sampleDelayStages, setSampleDelayStages] = useState<SampleDelayStage[] | null>(null);
  const [alarmRules, setAlarmRules] = useState(initialAlarmRules);
  const [conversionRules, setConversionRules] = useState(
    initialConversionRules,
  );
  const [codes, setCodes] = useState(initialCodes);
  const persistenceReady = dataState === "ready";
  const closeAnalysis = useCallback(() => setAnalysisPanel(null), []);
  const reloadPersistedData = useCallback(async () => {
    setDataState("loading");
    try {
      const [
        persistedAlarms,
        persistedTargets,
        persistedAlarmRules,
        persistedConversionRules,
        persistedCodes,
      ] = await Promise.all([
        listAlarms(),
        listTargets(),
        listMasterRules("alarm"),
        listMasterRules("conversion"),
        listMasterCodes(),
      ]);
      setAlarmItems(persistedAlarms.map((item) => ({
        id: item.id,
        code: item.alarmCode,
        time: new Date(item.occurredAt).toLocaleString("sv-SE").replace("T", " "),
        item: item.item,
        type: item.type,
        process: item.process,
        line: item.line,
        status: item.status as AlarmStatus,
        reviewer: item.reviewer ?? "-",
      })));
      setTargetItems(persistedTargets.map((item) => ({
        id: item.id,
        code: item.targetCode,
        name: item.name,
        status: item.status,
        owner: item.owner,
        priority: item.priority,
        due: item.dueDate ? item.dueDate.slice(0, 10) : "미정",
        sourceAlarmId: item.sourceAlarmId ?? undefined,
      })));
      setAlarmRules(persistedAlarmRules.map((item) => ({
        id: item.id,
        code: item.ruleCode,
        name: item.name,
        scope: item.scope,
        threshold: item.threshold,
        active: item.active,
      })));
      setConversionRules(persistedConversionRules.map((item) => ({
        id: item.id,
        code: item.ruleCode,
        name: item.name,
        scope: item.scope,
        threshold: item.threshold,
        active: item.active,
      })));
      setCodes(persistedCodes.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        active: item.active,
      })));
      setDataState("ready");
    } catch (error) {
      setDataState("error");
      throw error;
    }
  }, []);

  useEffect(() => {
    void reloadPersistedData().catch(() => undefined);
  }, [reloadPersistedData]);

  useEffect(() => {
    if (!alarm || alarm.type !== "Sample Delay") {
      setSampleDelayStages(null);
      return;
    }
    let active = true;
    void getAlarmDetail(alarm.id)
      .then((detail) => {
        if (active) setSampleDelayStages(detail.sampleDelayStages);
      })
      .catch(() => {
        if (active) setSampleDelayStages(null);
      });
    return () => { active = false; };
  }, [alarm]);

  const visibleAlarms = useMemo(
    () =>
      alarmItems.filter(
        (item) =>
          `${item.item} ${item.code ?? item.id} ${item.type}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (alarmFilter === "전체" || item.status === alarmFilter),
      ),
    [search, alarmFilter, alarmItems],
  );
  const visibleTargets = useMemo(
    () =>
      targetItems.filter(
        (item) =>
          `${item.code ?? item.id} ${item.name} ${item.owner}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (targetFilter === "전체" || item.status === targetFilter),
      ),
    [search, targetFilter, targetItems],
  );
  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  const addTask = () => {
    if (!newTask.trim()) return showNotice("새 과제명을 입력해 주세요.");
    setTasks([
      ...tasks,
      {
        id: Date.now(),
        title: newTask,
        owner: taskOwner,
        due: taskDue,
        status: "대기중",
      },
    ]);
    setNewTask("");
  };
  const downloadCsv = (rows: Record<string, string>[], filename: string) => {
    const columns = Object.keys(rows[0] ?? {});
    const value = [
      columns,
      ...rows.map((row) =>
        columns.map((key) => `"${String(row[key]).replaceAll('"', '""')}"`),
      ),
    ]
      .map((line) => line.join(","))
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([`\uFEFF${value}`], { type: "text/csv;charset=utf-8" }),
    );
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    showNotice(`${filename} 파일을 내려받았습니다.`);
  };
  const updateAlarmStatus = async (status: AlarmStatus, message: string) => {
    if (!persistenceReady) return;
    if (!alarm) return;
    try {
      await updateAlarm(alarm.id, {
        status,
        reviewer: status === "종결" ? "시스템" : "품질 검토팀",
      });
      await reloadPersistedData();
      setAlarm(null);
      showNotice(message);
    } catch {
      showNotice("저장에 실패했습니다. 이전 상태는 유지됩니다. 다시 시도해 주세요.");
    }
  };
  const createNewCase = async (name: string, priority: string) => {
    if (!persistenceReady) return;
    try {
      await createTarget({
        name,
        priority,
        status: "대기",
        owner: "담당자 미지정",
      });
    } catch {
      showNotice("저장에 실패했습니다. 다시 시도해 주세요.");
      return;
    }
    setNewCase(false);
    setView("targets");
    try {
      await reloadPersistedData();
      showNotice("관리대상을 등록했습니다.");
    } catch {
      showNotice("관리대상 저장은 완료되었습니다. 최신 데이터를 불러오지 못했습니다. 다시 시도 버튼으로 새로고침하세요.");
    }
  };
  const openActionPlan = async () => {
    if (!persistenceReady) return;
    if (!alarm) return;
    try {
      await updateAlarm(alarm.id, {
        status: "검토중",
        reviewer: "품질 검토팀",
      });
      await reloadPersistedData();
      setSelectedTarget(
        targetItems.find((target) => target.sourceAlarmId === alarm.id) ?? null,
      );
      setActionPlanAlarmId(alarm.id);
      setAlarm(null);
      setActionPlan(true);
    } catch {
      showNotice("저장에 실패했습니다. 이전 상태는 유지됩니다. 다시 시도해 주세요.");
    }
  };

  return (
    <main className={compact ? "platform compact-mode" : "platform"}>
      <aside className="sidebar" inert={analysisPanel ? true : undefined}>
        <div className="brand">
          <strong>Q-Target</strong>
          <span>Precision Control</span>
        </div>
        <p className="side-label">정밀 제어</p>
        <nav aria-label="주요 메뉴">
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item current" : "nav-item"}
              onClick={() => setView(item.id)}
            >
              <b>{item.icon}</b>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button onClick={() => setSupportOpen("고객지원 센터")}>
            ⓘ 고객지원
          </button>
          <button onClick={() => setSupportOpen("시스템 로그")}>▣ 로그</button>
        </div>
      </aside>
      <section className="workspace" inert={analysisPanel ? true : undefined}>
        <header className="topbar">
          <h1>품질 알람 및 관리 통합 플랫폼</h1>
          <div className="global-search">
            ⌕{" "}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="인텔렉트 검색..."
            />
          </div>
          <div className="top-actions">
            <button
              aria-label="알림"
              onClick={() => setNotificationOpen(!notificationOpen)}
            >
              ♧
            </button>
            <button aria-label="설정" onClick={() => setSettingsOpen(true)}>
              ⚙
            </button>
            <button
              className="black"
              disabled={!persistenceReady}
              onClick={() => setNewCase(true)}
            >
              신규 케이스
            </button>
            <span className="avatar">YC</span>
          </div>
        </header>

        <div className="content">
          {dataState !== "ready" && (
            <div className="data-status" role="status">
              {dataState === "loading"
                ? "저장된 데이터를 불러오는 중입니다."
                : "저장된 데이터를 불러오지 못했습니다. 현재 화면의 예시 데이터를 표시합니다."}
              {dataState === "error" && (
                <button onClick={() => void reloadPersistedData().catch(() => undefined)}>다시 시도</button>
              )}
            </div>
          )}
          {view === "dashboard" && (
            <Dashboard
              period={period}
              factory={factory}
              product={product}
              setPeriod={setPeriod}
              setFactory={setFactory}
              setProduct={setProduct}
              onOpenAnalysis={(panel) =>
                panel === "trend"
                  ? setAnalysisPanel("trend")
                  : setAnalysisPanel("distribution")
              }
              onViewCriticalAlarms={() => {
                setView("alarms");
                setAlarmFilter("심각");
              }}
              onNavigate={(nextView, filter) => {
                setView(nextView);
                if (nextView === "alarms") setAlarmFilter(filter);
                if (nextView === "targets") setTargetFilter(filter);
              }}
            />
          )}
          {view === "alarms" && (
            <AlarmList
              alarms={visibleAlarms}
              search={search}
              filter={alarmFilter}
              setFilter={setAlarmFilter}
              onOpen={setAlarm}
              onExport={() =>
                downloadCsv(
                  visibleAlarms.map(
                    ({
                      code,
                      id,
                      time,
                      item,
                      type,
                      process,
                      line,
                      status,
                      reviewer,
                    }) => ({
                      id: code ?? id,
                      time,
                      item,
                      type,
                      process,
                      line,
                      status,
                      reviewer,
                    }),
                  ),
                  "q-target-alarms.csv",
                )
              }
            />
          )}
          {view === "targets" && (
            <TargetList
              targets={visibleTargets}
              filter={targetFilter}
              setFilter={setTargetFilter}
              onOpen={(target) => {
                setSelectedTarget(target);
                setActionPlanAlarmId(target.sourceAlarmId ?? null);
                setActionPlan(true);
              }}
              onExport={() =>
                downloadCsv(
                  visibleTargets.map(({ code, id, ...target }) => ({
                    ...target,
                    id: code ?? id,
                  })),
                  "q-target-targets.csv",
                )
              }
            />
          )}
          {view === "master" && (
            <Master
              tab={masterTab}
              setTab={setMasterTab}
              alarmRules={alarmRules}
              conversionRules={conversionRules}
              codes={codes}
              persistenceReady={persistenceReady}
              reloadPersistedData={reloadPersistedData}
              showNotice={showNotice}
            />
          )}
        </div>
      </section>

      {newCase && (
        <NewCase
          persistenceReady={persistenceReady}
          onClose={() => setNewCase(false)}
          onCreate={createNewCase}
        />
      )}
      {notificationOpen && (
        <QuickPanel
          title="알림 센터"
          onClose={() => setNotificationOpen(false)}
        >
          <p>
            <b>심각 알람 1건</b>
            <br />
            Bearing Housing A1 검토 기한이 임박했습니다.
          </p>
          <p>
            <b>승인 요청 2건</b>
            <br />
            조치계획 검토를 기다리고 있습니다.
          </p>
        </QuickPanel>
      )}
      {settingsOpen && (
        <SettingsPanel
          compact={compact}
          setCompact={setCompact}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {supportOpen && (
        <QuickPanel title={supportOpen} onClose={() => setSupportOpen(null)}>
          <p>
            {supportOpen === "고객지원 센터"
              ? "품질 운영팀 · 평일 09:00–18:00 · help@q-target.demo"
              : "최근 24시간 동안 오류 없이 정상 수집되었습니다."}
          </p>
        </QuickPanel>
      )}
      {analysisPanel && (
        <AnalysisPanel panel={analysisPanel} onClose={closeAnalysis} />
      )}
      {alarm &&
        (alarm.type === "Sample Delay" ? (
          <SampleDelayDrawer
            alarm={alarm}
            stages={sampleDelayStages}
            persistenceReady={persistenceReady}
            onClose={() => setAlarm(null)}
            onCloseAlarm={() =>
              void updateAlarmStatus("종결", "알람을 조치 불필요로 종결했습니다.")
            }
            onMonitor={() =>
              void updateAlarmStatus("검토중", "알람을 모니터링 상태로 전환했습니다.")
            }
            onAction={() => void openActionPlan()}
          />
        ) : (
          <AlarmDrawer
            alarm={alarm}
            persistenceReady={persistenceReady}
            onClose={() => setAlarm(null)}
            onCloseAlarm={() =>
              void updateAlarmStatus("종결", "알람을 조치 불필요로 종결했습니다.")
            }
            onMonitor={() =>
              void updateAlarmStatus("검토중", "알람을 모니터링 상태로 전환했습니다.")
            }
            onAction={() => void openActionPlan()}
          />
        ))}
      {actionPlan && (
        <ActionPlan
          persistenceReady={persistenceReady}
          targetName={selectedTarget?.name ?? "설비 비정상 진동 발생"}
          tasks={tasks}
          newTask={newTask}
          setNewTask={setNewTask}
          taskOwner={taskOwner}
          setTaskOwner={setTaskOwner}
          taskDue={taskDue}
          setTaskDue={setTaskDue}
          onAdd={addTask}
          onDelete={(id) => setTasks(tasks.filter((task) => task.id !== id))}
          onClose={() => setActionPlan(false)}
          onSave={async ({ rootCause, immediateAction, preventiveAction }) => {
            if (!persistenceReady) return;
            if (selectedTarget) {
              try {
                await updateTarget(selectedTarget.id, { status: "진행 중" });
              } catch {
                showNotice("관리대상 상태 변경에 실패했습니다. 조치계획은 저장되지 않았으며 입력값은 유지됩니다.");
                return;
              }
            }
            try {
              await saveActionPlan({
                alarmId: actionPlanAlarmId,
                targetId: selectedTarget?.id ?? null,
                rootCause,
                immediateAction,
                preventiveAction,
                status: "진행 중",
                tasks: tasks.map((task) => ({
                  description: task.title,
                  owner: task.owner,
                  dueDate: task.due === "미정" ? null : task.due,
                })),
              });
            } catch {
              showNotice("조치계획 저장에 실패했습니다. 입력값은 유지됩니다. 다시 시도해 주세요.");
              return;
            }
            setActionPlan(false);
            try {
              await reloadPersistedData();
              showNotice(
                "조치계획을 저장하고 관리대상을 진행 상태로 변경했습니다.",
              );
            } catch {
              showNotice("조치계획 저장은 완료되었습니다. 최신 데이터를 불러오지 못했습니다. 다시 시도 버튼으로 새로고침하세요.");
            }
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
        </div>
      )}
    </main>
  );
}

function Dashboard({
  period,
  factory,
  product,
  setPeriod,
  setFactory,
  setProduct,
  onOpenAnalysis,
  onViewCriticalAlarms,
  onNavigate,
}: {
  period: string;
  factory: string;
  product: string;
  setPeriod: (value: string) => void;
  setFactory: (value: string) => void;
  setProduct: (value: string) => void;
  onOpenAnalysis: (panel: Exclude<AnalysisPanel, null>) => void;
  onViewCriticalAlarms: () => void;
  onNavigate: (view: ViewId, filter: string) => void;
}) {
  return (
    <div className="dashboard-view">
      <div className="page-head">
        <div>
          <h2>현황판 개요</h2>
          <p>
            {period} · {factory} · {product}
          </p>
        </div>
        <div className="filters">
          <label>
            기간
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option>최근 7일</option>
              <option>최근 30일</option>
              <option>이번 분기</option>
            </select>
          </label>
          <label>
            공장
            <select
              value={factory}
              onChange={(e) => setFactory(e.target.value)}
            >
              <option>전체 공장</option>
              <option>알파 공장</option>
              <option>베타 공장</option>
            </select>
          </label>
          <label>
            제품
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option>전체 제품</option>
              <option>Type X</option>
              <option>Type Y</option>
            </select>
          </label>
        </div>
      </div>
      <div className="kpis">
        <button
          className="kpi-button"
          onClick={() => onNavigate("alarms", "전체")}
        >
          <Kpi
            title="전체 알람"
            value={period === "최근 7일" ? "2,405" : "8,742"}
            note="● 142 심각    ● 893 신규"
            trend="↗ +12%"
          />
        </button>
        <button
          className="kpi-button"
          onClick={() => onNavigate("targets", "진행 중")}
        >
          <Kpi
            title="관리대상"
            value={factory === "전체 공장" ? "84" : "28"}
            note="● 62 진행중    ● 12 기한 초과"
            trend="→ 0%"
          />
        </button>
        <article className="kpi-button">
          <Kpi
            title="조치 종결률"
            value="92.4%"
            note="목표: 95%"
            trend="↗ +4.2%"
            progress
          />
        </article>
      </div>
      <div className="dashboard-grid">
        <article className="card chart-card">
          <h3>
            카테고리별 알람 추세{" "}
            <button
              type="button"
              aria-label="카테고리별 알람 추세 상세 보기"
              onClick={() => onOpenAnalysis("trend")}
            >
              ⋮
            </button>
          </h3>
          <div
            className="chart-scroll"
            role="region"
            aria-label="카테고리별 알람 추세 차트"
          >
            <div className="chart">
              <span style={{ height: "40%" }} />
              <span style={{ height: "65%" }} />
              <span className="pink" style={{ height: "84%" }} />
              <span style={{ height: "45%" }} />
              <span style={{ height: "30%" }} />
              <span style={{ height: "55%" }} />
              <span style={{ height: "70%" }} />
              <span style={{ height: "90%" }} />
              <span style={{ height: "60%" }} />
              <span style={{ height: "40%" }} />
            </div>
          </div>
          <p className="legend">● 샘플 지연 · ● 공정능력 · ● 트렌드 이탈</p>
        </article>
        <article className="card donut-card">
          <h3>
            대상 분포{" "}
            <button
              type="button"
              aria-label="대상 분포 상세 보기"
              onClick={() => onOpenAnalysis("distribution")}
            >
              ⋮
            </button>
          </h3>
          <div className="distribution-layout">
            <div className="donut">
              <strong>
                84<small>전체</small>
              </strong>
            </div>
            <div className="distribution distribution-legend">
              <p>
                <span className="distribution-dot normal" aria-hidden="true">
                  ●
                </span>{" "}
                정상 <b>50 (60%)</b>
              </p>
              <p>
                <span className="distribution-dot risk" aria-hidden="true">
                  ●
                </span>{" "}
                위험 <b>22 (25%)</b>
              </p>
              <p className="red-text">
                <span className="distribution-dot overdue" aria-hidden="true">
                  ●
                </span>{" "}
                기한 초과 <b>12 (15%)</b>
              </p>
            </div>
          </div>
        </article>
        <article className="card table-card">
          <h3>
            심각 알람 검토 대기{" "}
            <button onClick={onViewCriticalAlarms}>전체 보기 →</button>
          </h3>
          <ScrollTable label="심각 알람 검토 대기 목록">
            <table>
              <thead>
                <tr>
                  <th>알람 ID</th>
                  <th>유형</th>
                  <th>공장 / 라인</th>
                  <th>지속 시간</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["ALM-8492", "샘플 지연", "알파 - L1", "4h 12m"],
                  ["ALM-8490", "공정능력 위반", "베타 - L3", "2h 45m"],
                  ["ALM-8488", "트렌드 경고", "감마 - L2", "1h 10m"],
                  ["ALM-8475", "샘플 지연", "알파 - L1", "5h 30m"],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td>{r[0]}</td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                    <td>
                      <Status>심각</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
        </article>
        <article className="card overdue">
          <h3>⚠ 기한 초과 관리대상</h3>
          {["L1 불량률 감소", "자동 샘플링 도입", "3분기 공정 심사 준수"].map(
            (x, i) => (
              <div className="overdue-row" key={x}>
                <small>TGT-8{84 + i}</small>
                <b>{x}</b>
                <div>
                  <i style={{ width: `${65 + i * 10}%` }} />
                </div>
              </div>
            ),
          )}
        </article>
      </div>
    </div>
  );
}

function AnalysisPanel({
  panel,
  onClose,
}: {
  panel: Exclude<AnalysisPanel, null>;
  onClose: () => void;
}) {
  const title =
    panel === "trend" ? "카테고리별 알람 추세 분석" : "대상 분포 분석";
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = dialogRef.current;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirstControl = () => {
      const firstControl =
        dialog?.querySelector<HTMLElement>(focusableSelector);
      (firstControl ?? dialog)?.focus();
    };
    const focusFrame = window.requestAnimationFrame(focusFirstControl);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (controls.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => {
        if (!dialog?.isConnected) previousFocus.current?.focus();
      });
    };
  }, [onClose]);

  return (
    <div className="overlay">
      <button
        type="button"
        className="overlay-dismiss"
        style={{ position: "absolute", inset: 0, border: 0, background: "transparent" }}
        aria-label="분석 패널 닫기"
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-panel-title"
        tabIndex={-1}
      >
        <button aria-label="분석 패널 닫기" className="close" onClick={onClose}>
          ×
        </button>
        <span className="badge">DASHBOARD ANALYSIS</span>
        <h2 id="analysis-panel-title">{title}</h2>
        {panel === "trend" ? (
          <section>
            <h3>기간별 카테고리 추이</h3>
            <ScrollTable label="기간별 카테고리 추이 표">
              <table>
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th>최근 7일</th>
                    <th>최근 30일</th>
                    <th>이번 분기</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>샘플 지연</td>
                    <td>18</td>
                    <td>72</td>
                    <td>211</td>
                  </tr>
                  <tr>
                    <td>공정능력</td>
                    <td>24</td>
                    <td>96</td>
                    <td>284</td>
                  </tr>
                  <tr>
                    <td>트렌드 이탈</td>
                    <td>12</td>
                    <td>51</td>
                    <td>143</td>
                  </tr>
                </tbody>
              </table>
            </ScrollTable>
          </section>
        ) : (
          <section>
            <h3>상태별 대상 분포</h3>
            <ScrollTable label="상태별 대상 분포 표">
              <table>
                <thead>
                  <tr>
                    <th>상태</th>
                    <th>건수</th>
                    <th>비중</th>
                    <th>대상 행</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>정상</td>
                    <td>50</td>
                    <td>60%</td>
                    <td>TGT-8921, TGT-8925</td>
                  </tr>
                  <tr>
                    <td>위험</td>
                    <td>22</td>
                    <td>25%</td>
                    <td>TGT-8918, TGT-8922</td>
                  </tr>
                  <tr>
                    <td>기한 초과</td>
                    <td>12</td>
                    <td>15%</td>
                    <td>TGT-8884, TGT-8885</td>
                  </tr>
                </tbody>
              </table>
            </ScrollTable>
          </section>
        )}
      </aside>
    </div>
  );
}

function ScrollTable({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="table-scroll" role="region" aria-label={label}>
      {children}
    </div>
  );
}

function Master({
  tab = "최근 유사 알람",
  setTab,
  alarmRules,
  conversionRules,
  codes,
  persistenceReady,
  reloadPersistedData,
  showNotice,
}: {
  tab: string;
  setTab: (value: string) => void;
  alarmRules: Rule[];
  conversionRules: Rule[];
  codes: MasterCode[];
  persistenceReady: boolean;
  reloadPersistedData: () => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const tabs = ["알람 규칙", "전환 규칙", "코드 관리"];
  const description =
    tab === "알람 규칙"
      ? "알람 발생 기준과 감시 범위를 관리합니다."
      : tab === "전환 규칙"
        ? "알람을 관리대상으로 전환하는 조건을 관리합니다."
        : "제품·공정·상태 코드 체계를 관리합니다.";
  return (
    <>
      <div className="page-head">
        <div>
          <h2>마스터 관리</h2>
          <p>시스템 핵심 규칙 및 기준정보를 설정합니다.</p>
        </div>
        <code>⌁ v4.2.1-prod</code>
      </div>
      <div className="tabs" role="tablist" aria-label="마스터 관리 메뉴">
        {tabs.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item}
            key={item}
            onClick={() => setTab(item)}
            className={tab === item ? "selected" : ""}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="tab-description">{description}</p>
      <div className="master-grid">
        {tab === "알람 규칙" && (
          <RuleManagement
            key="alarm"
            title="알람 규칙 관리"
            idLabel="알람 규칙 ID"
            scopeLabel="감시 범위"
            thresholdLabel="알람 임계값"
            idPrefix="ALR"
            kind="alarm"
            filename="q-target-rules.csv"
            rules={alarmRules}
            persistenceReady={persistenceReady}
            reloadPersistedData={reloadPersistedData}
            showNotice={showNotice}
          />
        )}
        {tab === "전환 규칙" && (
          <RuleManagement
            key="conversion"
            title="전환 규칙 관리"
            idLabel="전환 규칙 ID"
            scopeLabel="전환 대상 범위"
            thresholdLabel="전환 임계값"
            idPrefix="CVR"
            kind="conversion"
            filename="q-target-conversion-rules.csv"
            rules={conversionRules}
            persistenceReady={persistenceReady}
            reloadPersistedData={reloadPersistedData}
            showNotice={showNotice}
          />
        )}
        {tab === "코드 관리" && (
          <CodeManagement
            codes={codes}
            persistenceReady={persistenceReady}
            reloadPersistedData={reloadPersistedData}
            showNotice={showNotice}
          />
        )}
        <MasterNote codeMode={tab === "코드 관리"} />
      </div>
    </>
  );
}

function downloadMasterCsv(
  columns: string[],
  rows: string[][],
  filename: string,
) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const csv = [columns, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
  );
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function RuleStateChoices({
  active,
  label,
  disabled,
  onChange,
}: {
  active: boolean;
  label: string;
  disabled: boolean;
  onChange: (active: boolean) => void;
}) {
  return (
    <div className="rule-state-choices" role="group" aria-label={label}>
      <button
        type="button"
        className={`rule-state-choice active ${active ? "selected" : ""}`}
        aria-pressed={active}
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        활성
      </button>
      <button
        type="button"
        className={`rule-state-choice inactive ${!active ? "selected" : ""}`}
        aria-pressed={!active}
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        비활성
      </button>
    </div>
  );
}

function CodeManagement({
  codes,
  persistenceReady,
  reloadPersistedData,
  showNotice,
}: {
  codes: MasterCode[];
  persistenceReady: boolean;
  reloadPersistedData: () => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const [draft, setDraft] = useState({ code: "", name: "", category: "" });
  const [editing, setEditing] = useState<MasterCode | null>(null);
  const updateDraft = (field: keyof typeof draft, value: string) =>
    setDraft({ ...draft, [field]: value });
  const addCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!persistenceReady) return;
    if (!draft.code.trim() || !draft.name.trim() || !draft.category.trim())
      return showNotice("코드값, 코드명, 코드 분류를 모두 입력해 주세요.");
    try {
      await createMasterCode({
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        category: draft.category.trim(),
        active: true,
      });
      await reloadPersistedData();
      setDraft({ code: "", name: "", category: "" });
      showNotice("새 코드를 추가했습니다.");
    } catch {
      showNotice("저장에 실패했습니다. 입력값은 유지됩니다. 다시 시도해 주세요.");
    }
  };
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!persistenceReady) return;
    if (
      !editing ||
      !editing.code.trim() ||
      !editing.name.trim() ||
      !editing.category.trim()
    )
      return showNotice("코드값, 코드명, 코드 분류를 모두 입력해 주세요.");
    try {
      await updateMasterCode(editing.id, {
        code: editing.code.trim().toUpperCase(),
        name: editing.name.trim(),
        category: editing.category.trim(),
        active: editing.active,
      });
      await reloadPersistedData();
      setEditing(null);
      showNotice("코드 변경사항을 저장했습니다.");
    } catch {
      showNotice("저장에 실패했습니다. 입력값은 유지됩니다. 다시 시도해 주세요.");
    }
  };
  const setActive = async (code: MasterCode, active: boolean) => {
    if (!persistenceReady) return;
    try {
      await updateMasterCode(code.id, { active });
      await reloadPersistedData();
      showNotice(
        `${code.name} 코드를 ${active ? "활성" : "비활성"}화했습니다.`,
      );
    } catch {
      showNotice("저장에 실패했습니다. 이전 상태는 유지됩니다. 다시 시도해 주세요.");
    }
  };
  return (
    <article className="card rules master-surface">
      <div className="section-head">
        <div>
          <h3>코드 관리</h3>
          <p>{codes.length}개 기준 코드</p>
        </div>
        <button
          type="button"
          onClick={() => {
            downloadMasterCsv(
              ["코드 ID", "코드값", "코드명", "코드 분류", "상태"],
              codes.map((code) => [
                code.id,
                code.code,
                code.name,
                code.category,
                code.active ? "활성" : "비활성",
              ]),
              "q-target-codes.csv",
            );
            showNotice("q-target-codes.csv 파일을 내려받았습니다.");
          }}
        >
          ⇩ 내보내기
        </button>
      </div>
      <form className="master-create code-create" onSubmit={addCode}>
        <label>
          코드값
          <input
            aria-label="새 코드값"
            value={draft.code}
            disabled={!persistenceReady}
            onChange={(event) => updateDraft("code", event.target.value)}
            placeholder="예: PRC-MCH"
          />
        </label>
        <label>
          코드명
          <input
            aria-label="새 코드명"
            value={draft.name}
            disabled={!persistenceReady}
            onChange={(event) => updateDraft("name", event.target.value)}
            placeholder="코드명 입력"
          />
        </label>
        <label>
          코드 분류
          <input
            aria-label="새 코드 분류"
            value={draft.category}
            disabled={!persistenceReady}
            onChange={(event) => updateDraft("category", event.target.value)}
            placeholder="분류 입력"
          />
        </label>
        <button className="black" type="submit" disabled={!persistenceReady}>
          ＋ 새 코드 추가
        </button>
      </form>
      <ScrollTable label="코드 관리 목록">
        <table>
          <thead>
            <tr>
              <th>코드 ID</th>
              <th>코드값</th>
              <th>코드명</th>
              <th>코드 분류</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code) =>
              editing?.id === code.id ? (
                <tr className="master-edit-row" key={code.id}>
                  <td>{code.id}</td>
                  <td>
                    <input
                      aria-label="코드값 수정"
                      value={editing.code}
                      disabled={!persistenceReady}
                      onChange={(event) =>
                        setEditing({ ...editing, code: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label="코드명 수정"
                      value={editing.name}
                      disabled={!persistenceReady}
                      onChange={(event) =>
                        setEditing({ ...editing, name: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label="코드 분류 수정"
                      value={editing.category}
                      disabled={!persistenceReady}
                      onChange={(event) =>
                        setEditing({ ...editing, category: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <RuleStateChoices
                      active={editing.active}
                      label={`${editing.name} 상태`}
                      disabled={!persistenceReady}
                      onChange={(active) => setEditing({ ...editing, active })}
                    />
                  </td>
                  <td>
                    <form className="edit-actions" onSubmit={saveEdit}>
                      <button className="save" type="submit" disabled={!persistenceReady}>
                        저장
                      </button>
                      <button type="button" onClick={() => setEditing(null)}>
                        취소
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={code.id}>
                  <td>{code.id}</td>
                  <td>
                    <code>{code.code}</code>
                  </td>
                  <td>
                    <b>{code.name}</b>
                  </td>
                  <td>{code.category}</td>
                  <td>
                    <RuleStateChoices
                      active={code.active}
                      label={`${code.name} 상태`}
                      disabled={!persistenceReady}
                      onChange={(active) => void setActive(code, active)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      aria-label={`${code.name} 코드 수정`}
                      disabled={!persistenceReady}
                      onClick={() => setEditing({ ...code })}
                    >
                      ✎ 수정
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </ScrollTable>
    </article>
  );
}

function MasterNote({ codeMode }: { codeMode: boolean }) {
  return (
    <article className="card master-note">
      <h3>{codeMode ? "코드 적용 안내" : "규칙 적용 안내"}</h3>
      <p>
        {codeMode
          ? "코드 변경은 연계 시스템 검토 후 배포됩니다."
          : "변경된 규칙은 승인 후 다음 수집 주기부터 적용됩니다."}
      </p>
      <div className="step current">
        <b>1</b>
        <span>변경사항 저장</span>
      </div>
      <div className="step">
        <b>2</b>
        <span>검토자 승인</span>
      </div>
      <div className="step">
        <b>3</b>
        <span>운영 환경 반영</span>
      </div>
    </article>
  );
}

function RuleManagement({
  title,
  idLabel,
  scopeLabel,
  thresholdLabel,
  idPrefix,
  kind,
  filename,
  rules,
  persistenceReady,
  reloadPersistedData,
  showNotice,
}: {
  title: string;
  idLabel: string;
  scopeLabel: string;
  thresholdLabel: string;
  idPrefix: string;
  kind: string;
  filename: string;
  rules: Rule[];
  persistenceReady: boolean;
  reloadPersistedData: () => Promise<void>;
  showNotice: (message: string) => void;
}) {
  const [draft, setDraft] = useState({ name: "", scope: "", threshold: "" });
  const [editing, setEditing] = useState<Rule | null>(null);
  const updateDraft = (field: keyof typeof draft, value: string) =>
    setDraft({ ...draft, [field]: value });
  const addRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!persistenceReady) return;
    if (!draft.name.trim() || !draft.scope.trim() || !draft.threshold.trim())
      return showNotice("규칙명, 적용 범위, 임계값을 모두 입력해 주세요.");
    const nextNumber =
      Math.max(0, ...rules.map((rule) => Number((rule.code ?? rule.id).split("-")[1]) || 0)) +
      1;
    try {
      await createMasterRule({
        ruleCode: `${idPrefix}-${String(nextNumber).padStart(3, "0")}`,
        kind,
        name: draft.name.trim(),
        scope: draft.scope.trim(),
        threshold: draft.threshold.trim(),
        active: true,
      });
      await reloadPersistedData();
      setDraft({ name: "", scope: "", threshold: "" });
      showNotice(`${title}에 새 규칙을 추가했습니다.`);
    } catch {
      showNotice("저장에 실패했습니다. 입력값은 유지됩니다. 다시 시도해 주세요.");
    }
  };
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!persistenceReady) return;
    if (
      !editing ||
      !editing.name.trim() ||
      !editing.scope.trim() ||
      !editing.threshold.trim()
    )
      return showNotice("규칙명, 적용 범위, 임계값을 모두 입력해 주세요.");
    try {
      await updateMasterRule(editing.id, {
        name: editing.name.trim(),
        scope: editing.scope.trim(),
        threshold: editing.threshold.trim(),
        active: editing.active,
      });
      await reloadPersistedData();
      setEditing(null);
      showNotice("규칙 변경사항을 저장했습니다.");
    } catch {
      showNotice("저장에 실패했습니다. 입력값은 유지됩니다. 다시 시도해 주세요.");
    }
  };
  const setActive = async (rule: Rule, active: boolean) => {
    if (!persistenceReady) return;
    try {
      await updateMasterRule(rule.id, { active });
      await reloadPersistedData();
      showNotice(`${rule.name} 규칙을 ${active ? "활성" : "비활성"}화했습니다.`);
    } catch {
      showNotice("저장에 실패했습니다. 이전 상태는 유지됩니다. 다시 시도해 주세요.");
    }
  };
  return (
    <article className="card rules master-surface">
      <div className="section-head">
        <div>
          <h3>{title}</h3>
          <p>{rules.length}개 규칙</p>
        </div>
        <button
          type="button"
          onClick={() => {
            downloadMasterCsv(
              [idLabel, "규칙명", scopeLabel, thresholdLabel, "상태"],
              rules.map((rule) => [
                rule.id,
                rule.name,
                rule.scope,
                rule.threshold,
                rule.active ? "활성" : "비활성",
              ]),
              filename,
            );
            showNotice(`${filename} 파일을 내려받았습니다.`);
          }}
        >
          ⇩ 내보내기
        </button>
      </div>
      <form className="master-create rule-create" onSubmit={addRule}>
        <label>
          규칙명
          <input
            aria-label="새 규칙명"
            value={draft.name}
            disabled={!persistenceReady}
            onChange={(event) => updateDraft("name", event.target.value)}
            placeholder="규칙명 입력"
          />
        </label>
        <label>
          {scopeLabel}
          <input
            aria-label={`새 ${scopeLabel}`}
            value={draft.scope}
            disabled={!persistenceReady}
            onChange={(event) => updateDraft("scope", event.target.value)}
            placeholder="적용 범위 입력"
          />
        </label>
        <label>
          {thresholdLabel}
          <input
            aria-label={`새 ${thresholdLabel}`}
            value={draft.threshold}
            disabled={!persistenceReady}
            onChange={(event) => updateDraft("threshold", event.target.value)}
            placeholder="임계값 입력"
          />
        </label>
        <button className="black" type="submit" disabled={!persistenceReady}>
          ＋ 새 규칙 추가
        </button>
      </form>
      <ScrollTable label={`${title} 목록`}>
        <table>
          <thead>
            <tr>
              <th>{idLabel}</th>
              <th>규칙명</th>
              <th>{scopeLabel}</th>
              <th>{thresholdLabel}</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) =>
              editing?.id === rule.id ? (
                <tr className="master-edit-row" key={rule.id}>
                  <td>{rule.id}</td>
                  <td>
                    <input
                      aria-label="규칙명 수정"
                      value={editing.name}
                      disabled={!persistenceReady}
                      onChange={(event) =>
                        setEditing({ ...editing, name: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label="적용 범위 수정"
                      value={editing.scope}
                      disabled={!persistenceReady}
                      onChange={(event) =>
                        setEditing({ ...editing, scope: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label="임계값 수정"
                      value={editing.threshold}
                      disabled={!persistenceReady}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          threshold: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <RuleStateChoices
                      active={editing.active}
                      label={`${editing.name} 상태`}
                      disabled={!persistenceReady}
                      onChange={(active) => setEditing({ ...editing, active })}
                    />
                  </td>
                  <td>
                    <form className="edit-actions" onSubmit={saveEdit}>
                      <button className="save" type="submit" disabled={!persistenceReady}>
                        저장
                      </button>
                      <button type="button" onClick={() => setEditing(null)}>
                        취소
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={rule.id}>
                  <td>{rule.id}</td>
                  <td>
                    <b>{rule.name}</b>
                  </td>
                  <td>{rule.scope}</td>
                  <td>{rule.threshold}</td>
                  <td>
                    <RuleStateChoices
                      active={rule.active}
                      label={`${rule.name} 상태`}
                      disabled={!persistenceReady}
                      onChange={(active) => setActive(rule, active)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      aria-label={`${rule.name} 규칙 수정`}
                      disabled={!persistenceReady}
                      onClick={() => setEditing({ ...rule })}
                    >
                      ✎ 수정
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </ScrollTable>
    </article>
  );
}

function Kpi({
  title,
  value,
  note,
  trend,
  progress,
}: {
  title: string;
  value: string;
  note: string;
  trend: string;
  progress?: boolean;
}) {
  return (
    <article className="card kpi">
      <div>
        <h3>{title}</h3>
        <b className="trend">{trend}</b>
      </div>
      <strong>{value}</strong>
      {progress && (
        <div className="progress">
          <i />
        </div>
      )}
      <p>{note}</p>
    </article>
  );
}

function AlarmList({
  alarms,
  search,
  filter,
  setFilter,
  onOpen,
  onExport,
}: {
  alarms: Alarm[];
  search: string;
  filter: string;
  setFilter: (value: string) => void;
  onOpen: (a: Alarm) => void;
  onExport: () => void;
}) {
  return (
    <article className="card full-table">
      <div className="section-head">
        <div>
          <h2>활성 알람</h2>
          <p>생산 라인 전체의 14개 심각 편차를 모니터링 중입니다.</p>
        </div>
        <div className="interactive-controls">
          <label>
            상태 필터{" "}
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>전체</option>
              <option>신규</option>
              <option>검토중</option>
              <option>심각</option>
              <option>종결</option>
            </select>
          </label>
          <button onClick={onExport}>⇩ CSV 내보내기</button>
        </div>
      </div>
      <ScrollTable label="알람 이력 목록">
        <table>
          <thead>
            <tr>
              <th>시간</th>
              <th>항목</th>
              <th>ID</th>
              <th>유형</th>
              <th>공정</th>
              <th>라인</th>
              <th>상태</th>
              <th>검토자</th>
            </tr>
          </thead>
          <tbody>
            {alarms.map((a) => (
              <tr className="clickable" key={a.id} onClick={() => onOpen(a)}>
                <td>{a.time}</td>
                <td>{a.item}</td>
                <td>{a.code ?? a.id}</td>
                <td>{a.type}</td>
                <td>{a.process}</td>
                <td>{a.line}</td>
                <td>
                  <Status>{a.status}</Status>
                </td>
                <td>{a.reviewer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollTable>
      {alarms.length === 0 && (
        <div className="empty">“{search}”에 해당하는 알람이 없습니다.</div>
      )}
    </article>
  );
}

function TargetList({
  targets,
  filter,
  setFilter,
  onOpen,
  onExport,
}: {
  targets: Target[];
  filter: string;
  setFilter: (value: string) => void;
  onOpen: (target: Target) => void;
  onExport: () => void;
}) {
  const [page, setPage] = useState(1);
  const getPageSize = () =>
    typeof window === "undefined"
      ? 3
      : Math.max(3, Math.floor((window.innerHeight - 390) / 46));
  const [pageSize, setPageSize] = useState(getPageSize);
  const totalPages = Math.max(1, Math.ceil(targets.length / pageSize));

  useEffect(() => {
    const updatePageSize = () => setPageSize(getPageSize());
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const pageRows = targets.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="target-list">
      <div className="page-head target-title">
        <div>
          <h2>관리대상 목록</h2>
          <p>모든 활성 및 대기 중인 관리대상 현황입니다.</p>
        </div>
        <div className="interactive-controls">
          <label>
            상태 필터{" "}
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>전체</option>
              <option>진행 중</option>
              <option>대기</option>
              <option>심각</option>
              <option>완료</option>
            </select>
          </label>
          <button onClick={onExport}>⇩ CSV 내보내기</button>
        </div>
      </div>
      <div className="target-kpis">
        <Kpi
          title="전체 관리대상"
          value={String(targets.length)}
          note="↗ +12%"
          trend=""
        />
        <Kpi
          title="진행 중"
          value={String(
            targets.filter((target) => target.status === "진행 중").length,
          )}
          note="현재 처리 중인 항목"
          trend=""
        />
        <Kpi
          title="심각 알람"
          value={String(
            targets.filter((target) => target.status === "심각").length,
          )}
          note="조치 필요"
          trend="⚠"
        />
        <Kpi
          title="완료 (연간)"
          value={String(
            targets.filter((target) => target.status === "완료").length,
          )}
          note="완료된 관리 항목"
          trend=""
        />
      </div>
      <article className="card full-table">
        <ScrollTable label="관리대상 목록">
          <table>
            <thead>
              <tr>
                <th>관리번호</th>
                <th>관리항목명</th>
                <th>상태</th>
                <th>담당자</th>
                <th>우선순위</th>
                <th>마감일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr
                  key={r.id}
                  className={r.status === "심각" ? "critical-row" : ""}
                >
                  <td>{r.code ?? r.id}</td>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td>
                    <Status>{r.status}</Status>
                  </td>
                  <td>◉ {r.owner}</td>
                  <td className={r.priority === "긴급" ? "red-text" : ""}>
                    {r.priority === "긴급" ? "! " : ""}
                    {r.priority}
                  </td>
                  <td>{r.due}</td>
                  <td>
                    <button
                      aria-label={`${r.name} 조치계획`}
                      className="dots"
                      onClick={() => onOpen(r)}
                    >
                      •••
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
        {targets.length === 0 && (
          <div className="empty">
            검색 또는 필터 조건에 맞는 관리대상이 없습니다.
          </div>
        )}
        <div className="pagination">
          {targets.length}개 중 {(page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, targets.length)} 표시{" "}
          <span>
            <button
              aria-label="이전 페이지"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </button>
            <button
              aria-label="다음 페이지"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              ›
            </button>
          </span>
        </div>
      </article>
    </div>
  );
}

function AlarmDrawer({
  alarm,
  onClose,
  onCloseAlarm,
  onMonitor,
  onAction,
  persistenceReady,
}: {
  alarm: Alarm;
  onClose: () => void;
  onCloseAlarm: () => void;
  onMonitor: () => void;
  onAction: () => void;
  persistenceReady: boolean;
}) {
  return (
    <div className="overlay">
      <aside className="drawer">
        <div className="drawer-body">
          <button aria-label="상세 닫기" className="close" onClick={onClose}>
            ×
          </button>
          <span className="badge">NEW ALARM ID: {alarm.code ?? alarm.id}</span>
          <h2>{alarm.item}</h2>
          <p className="red-text">
            CPK 값이 1.33 임계값 미만으로 하락했습니다.
          </p>
          <section>
            <h3>알람 기본 정보</h3>
            <div className="info-grid">
              <p>
                알람 번호<strong>{alarm.code ?? alarm.id}</strong>
              </p>
              <p>
                발생 일시<strong>{alarm.time}</strong>
              </p>
              <p>
                유형<strong>{alarm.type}</strong>
              </p>
              <p>
                제품/스펙<strong>{alarm.item} / Type X</strong>
              </p>
              <p>
                공정/라인
                <strong>
                  {alarm.process} / {alarm.line}
                </strong>
              </p>
              <p>
                설비<strong>CNC-M-04</strong>
              </p>
              <p>
                생산 LOT<strong>LOT-231012-001</strong>
              </p>
              <p>
                검토 기한
                <strong className="red-text">2023-10-13 10:42:15</strong>
              </p>
            </div>
          </section>
          <section>
            <h3>상세 수치 및 기준 비교</h3>
            <p>30일 CPK 1.12 / 기준 1.33 / 최근 7일 중 4회 발생</p>
            <div className="measurements">
              <article>
                <b>현재 값 vs 기준 값</b>
                <p>
                  현재 값 <strong className="red-text">1.12</strong>
                </p>
                <p>
                  목표 값 <strong>1.33</strong>
                </p>
              </article>
              <article>
                <b>CPK 비교 추이</b>
                <p>
                  30일 <strong className="red-text">1.12</strong>
                </p>
                <p>
                  3개월 <strong>1.15</strong>
                </p>
                <p>
                  3년 <strong>1.20</strong>
                </p>
              </article>
              <article>
                <b>최근 30일 추세</b>
                <MiniBars critical />
              </article>
            </div>
          </section>
          <section>
            <h3>영향도 평가</h3>
            <div className="impact">
              <p>
                영향받는 제품/고객
                <br />
                <b>제품 A, B / 주요 고객사 X</b>
              </p>
              <p>
                로트 생산/검사/부적합 수량
                <br />
                <b>
                  5,000 / 100 / <span className="red-text">12</span>
                </b>
              </p>
              <p>
                출하 상태 및 재고
                <br />
                <b>출하 대기 / 재고 2,000</b>
              </p>
              <p>
                연관 CTQ 및 공정 요인
                <br />
                <b>온도 편차, 절삭 공구 마모</b>
              </p>
            </div>
          </section>
          <RelatedInfoAccordion />
        </div>
        <div className="drawer-footer">
          <button disabled={!persistenceReady} onClick={onCloseAlarm}>조치 불필요 종결</button>
          <button disabled={!persistenceReady} onClick={onMonitor}>모니터링 유지</button>
          <button className="black" disabled={!persistenceReady} onClick={onAction}>
            ✣ 관리대상 등록
          </button>
        </div>
      </aside>
    </div>
  );
}

const relatedInfo = [
  {
    label: "최근 유사 알람",
    content: "최근 30일 내 같은 설비에서 3건의 유사 알람이 발생했습니다.",
  },
  { label: "과거 관리대상 내역", content: "TRG-8841 · 2023-09-18 · 조치 완료" },
  {
    label: "과거 조치 및 효과",
    content: "베어링 교체 후 CPK가 1.42까지 회복되었습니다.",
  },
  { label: "첨부파일", content: "측정 데이터.csv · 42KB" },
];

function RelatedInfoAccordion() {
  const [open, setOpen] = useState(relatedInfo[0].label);
  return (
    <section className="related-info">
      <h3>연관 정보</h3>
      {relatedInfo.map(({ label, content }, index) => {
        const panelId = `related-info-panel-${index}`;
        const expanded = open === label;
        return (
          <div className="related-info-item" key={label}>
            <button
              className="related-info-control"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen(label)}
            >
              {label}
            </button>
            <div className="related-info-panel" id={panelId} hidden={!expanded}>
              {content}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SampleDelayDrawer({
  alarm,
  stages: persistedStages,
  onClose,
  onCloseAlarm,
  onMonitor,
  onAction,
  persistenceReady,
}: {
  alarm: Alarm;
  stages: SampleDelayStage[] | null;
  onClose: () => void;
  onCloseAlarm: () => void;
  onMonitor: () => void;
  onAction: () => void;
  persistenceReady: boolean;
}) {
  const fallbackSummary = { elapsedMinutes: 68, allowedMinutes: 30, overageMinutes: 38 };
  const sampleDelaySummary = persistedStages?.length
    ? (() => {
        const latestStage = [...persistedStages]
          .reverse()
          .find((stage) => Number.isFinite(stage.elapsedMinutes) && Number.isFinite(stage.allowedMinutes));
        if (!latestStage) return fallbackSummary;
        const elapsedMinutes = Math.max(0, Number(latestStage.elapsedMinutes));
        const allowedMinutes = Math.max(0, Number(latestStage.allowedMinutes));
        return {
          elapsedMinutes,
          allowedMinutes,
          overageMinutes: Math.max(0, elapsedMinutes - allowedMinutes),
        };
      })()
    : fallbackSummary;
  const stages = persistedStages?.length
    ? persistedStages.map((stage) => {
        const eventAt = new Date(stage.eventAt);
        const elapsedMinutes = Number.isFinite(stage.elapsedMinutes) ? Math.max(0, Number(stage.elapsedMinutes)) : null;
        const allowedMinutes = Number.isFinite(stage.allowedMinutes) ? Math.max(0, Number(stage.allowedMinutes)) : null;
        return {
          name: stage.stageName || "단계 정보 없음",
          time: Number.isNaN(eventAt.getTime()) ? "-" : eventAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          elapsed: elapsedMinutes === null ? "-" : `${elapsedMinutes}분`,
          delay: stage.isDelayed === true || (elapsedMinutes !== null && allowedMinutes !== null && elapsedMinutes > allowedMinutes),
        };
      })
    : [
    { name: "샘플 의뢰", time: "10:00", elapsed: "0분" },
    { name: "시험 접수", time: "10:12", elapsed: "12분" },
    { name: "시험 분석 완료", time: "10:38", elapsed: "38분" },
    { name: "판정 지연", time: "11:08", elapsed: "68분", delay: true },
    ];
  return (
    <div className="overlay">
      <aside className="drawer">
        <div className="drawer-body">
          <button aria-label="상세 닫기" className="close" onClick={onClose}>
            ×
          </button>
          <span className="badge">SAMPLE DELAY ID: {alarm.code ?? alarm.id}</span>
          <h2>{alarm.item}</h2>
          <p className="red-text">판정 지연: 허용 기준을 38분 초과했습니다.</p>
          <section>
            <h3>샘플 지연 워크플로</h3>
            <div className="sample-delay-workflow">
              {stages.map((stage) => (
                <article
                  className={
                    stage.delay
                      ? "sample-delay-stage delay"
                      : "sample-delay-stage"
                  }
                  key={stage.name}
                >
                  <b>{stage.name}</b>
                  <span>시간 {stage.time}</span>
                  <span>경과 {stage.elapsed}</span>
                  {stage.delay && <strong>지연 상태</strong>}
                </article>
              ))}
            </div>
            <div className="sample-delay-summary">
              <b>경과 시간</b>
              <span>{sampleDelaySummary.elapsedMinutes}분</span>
              <b>허용 기준</b>
              <span>{sampleDelaySummary.allowedMinutes}분</span>
              <b>초과 시간</b>
              <span>{sampleDelaySummary.overageMinutes}분</span>
            </div>
            <ul className="sample-delay-durations">
              {stages.map((stage) => (
                <li key={stage.name}>
                  {stage.name}: {stage.elapsed}
                </li>
              ))}
            </ul>
          </section>
          <RelatedInfoAccordion />
        </div>
        <div className="drawer-footer">
          <button disabled={!persistenceReady} onClick={onCloseAlarm}>조치 불필요 종결</button>
          <button disabled={!persistenceReady} onClick={onMonitor}>모니터링 유지</button>
          <button className="black" disabled={!persistenceReady} onClick={onAction}>
            관리대상 등록
          </button>
        </div>
      </aside>
    </div>
  );
}

function NewCase({
  onClose,
  onCreate,
  persistenceReady,
}: {
  onClose: () => void;
  onCreate: (name: string, priority: string) => void;
  persistenceReady: boolean;
}) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("중간");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => nameInputRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, []);

  return (
    <div className="overlay modal-overlay">
      <section className="case-modal">
        <button aria-label="모달 닫기" className="close" onClick={onClose}>
          ×
        </button>
        <h2>신규 케이스 등록</h2>
        <p>관리대상으로 추적할 품질 이슈를 등록합니다.</p>
        <label>
          관리항목명
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 설비 진동 기준 초과"
          />
        </label>
        <label>
          우선순위
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>중간</option>
            <option>높음</option>
            <option>긴급</option>
          </select>
        </label>
        <footer>
          <button onClick={onClose}>취소</button>
          <button
            className="black"
            disabled={!persistenceReady}
            onClick={() => onCreate(name, priority)}
          >
            등록
          </button>
        </footer>
      </section>
    </div>
  );
}

function ActionPlan({
  targetName,
  tasks,
  newTask,
  setNewTask,
  taskOwner,
  setTaskOwner,
  taskDue,
  setTaskDue,
  onAdd,
  onDelete,
  onClose,
  onSave,
  persistenceReady,
}: {
  targetName: string;
  tasks: Task[];
  newTask: string;
  setNewTask: (s: string) => void;
  taskOwner: string;
  setTaskOwner: (s: string) => void;
  taskDue: string;
  setTaskDue: (s: string) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onClose: () => void;
  onSave: (analysis: {
    rootCause: string;
    immediateAction: string;
    preventiveAction: string;
  }) => void | Promise<void>;
  persistenceReady: boolean;
}) {
  const [immediateAction, setImmediateAction] = useState(
    "발생한 현상을 객관적인 사실 기반으로 상세히 기술하세요.",
  );
  const [rootCause, setRootCause] = useState(
    "5Why 분석을 통한 근본 원인을 기술하세요.",
  );
  const [preventiveAction, setPreventiveAction] = useState(
    "재발 방지를 위한 예방 조치를 기술하세요.",
  );
  return (
    <div className="overlay modal-overlay">
      <section className="modal">
        <button aria-label="모달 닫기" className="close" onClick={onClose}>
          ×
        </button>
        <div className="modal-body">
          <h2>원인분석 및 조치계획</h2>
          <p>Target ID: TGT-2023-1049 | {targetName}</p>
          <section>
            <h3>🔔 알람 상세 정보 (Alarm Details)</h3>
            <div className="alarm-summary">
              <div>
                <b>항목명</b>
                <br />
                압출기 3호기 비정상 진동
                <br />
                <b className="red-text">높음 (High)</b>
              </div>
              <div>
                <b>측정 데이터</b>
                <p>
                  현재값 <strong className="red-text">3.82</strong> 기준값{" "}
                  <strong>2.50</strong>
                </p>
                <small>발생일시 2023-11-20 14:22:05</small>
              </div>
              <div>
                <b>최근 30일 발생 추이</b>
                <MiniBars />
              </div>
            </div>
          </section>
          <section>
            <h3>🟣 원인 분석</h3>
            <div className="textareas">
              <label>
                현상
                <textarea
                  value={immediateAction}
                  onChange={(event) => setImmediateAction(event.target.value)}
                />
              </label>
              <label>
                근본 원인
                <textarea
                  value={rootCause}
                  onChange={(event) => setRootCause(event.target.value)}
                />
              </label>
              <label>
                예방 조치
                <textarea
                  value={preventiveAction}
                  onChange={(event) => setPreventiveAction(event.target.value)}
                />
              </label>
            </div>
          </section>
          <section>
            <div className="section-head">
              <h3>▣ 조치 계획</h3>
              <button onClick={onAdd}>＋ 신규 과제 추가</button>
            </div>
            <ScrollTable label="조치계획 과제 목록">
              <table className="tasks">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>과제명</th>
                    <th>담당자</th>
                    <th>완료예정일</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={task.id}>
                      <td>{index + 1}</td>
                      <td>{task.title}</td>
                      <td>{task.owner}</td>
                      <td>{task.due}</td>
                      <td>
                        <Status>{task.status}</Status>
                      </td>
                      <td>
                        <button
                          aria-label="과제 삭제"
                          onClick={() => onDelete(task.id)}
                        >
                          ⌫
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>{tasks.length + 1}</td>
                    <td>
                      <input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="새로운 과제를 입력하세요..."
                      />
                    </td>
                    <td>
                      <select
                        aria-label="담당자 선택"
                        value={taskOwner}
                        onChange={(e) => setTaskOwner(e.target.value)}
                      >
                        <option>담당자 미지정</option>
                        <option>박설비 (기계팀)</option>
                        <option>이점검 (보전팀)</option>
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label="완료예정일"
                        value={taskDue}
                        onChange={(e) => setTaskDue(e.target.value)}
                      >
                        <option>미정</option>
                        <option>11/25/2023</option>
                        <option>11/30/2023</option>
                      </select>
                    </td>
                    <td>-</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </ScrollTable>
          </section>
        </div>
        <footer>
          <button onClick={onClose}>취소 (Cancel)</button>
          <button
            className="black"
            disabled={!persistenceReady}
            onClick={() =>
              void onSave({ rootCause, immediateAction, preventiveAction })
            }
          >
            저장 및 승인 요청
          </button>
        </footer>
      </section>
    </div>
  );
}

function QuickPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="overlay quick-overlay">
      <section className="quick-panel">
        <button aria-label="패널 닫기" className="close" onClick={onClose}>
          ×
        </button>
        <h2>{title}</h2>
        {children}
        <button className="black" onClick={onClose}>
          확인
        </button>
      </section>
    </div>
  );
}

function SettingsPanel({
  compact,
  setCompact,
  onClose,
}: {
  compact: boolean;
  setCompact: (value: boolean) => void;
  onClose: () => void;
}) {
  const [alerts, setAlerts] = useState(true);
  return (
    <div className="overlay quick-overlay">
      <section className="quick-panel">
        <button aria-label="설정 닫기" className="close" onClick={onClose}>
          ×
        </button>
        <h2>표시 설정</h2>
        <label className="setting-row">
          간결한 테이블 보기
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
          />
        </label>
        <label className="setting-row">
          심각 알람 알림
          <input
            type="checkbox"
            checked={alerts}
            onChange={(e) => setAlerts(e.target.checked)}
          />
        </label>
        <button className="black" onClick={onClose}>
          저장
        </button>
      </section>
    </div>
  );
}

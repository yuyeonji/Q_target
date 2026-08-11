import { sql } from "drizzle-orm";

const sampleDelayAlarmId = "99198000-0000-4000-8000-000000000001";
const sampleDelayTargetId = "99198000-0000-4000-8000-000000000002";
const sampleDelayActionPlanId = "99198000-0000-4000-8000-000000000003";

const sampleDelayStageNameSet = new Set<string>([
  "샘플 의뢰",
  "시험 접수",
  "시험 분석 완료",
  "판정 지연",
]);

export function assertValidSampleDelayStages(stages: Array<{ stageName: string }>) {
  if (!stages.every((stage) => sampleDelayStageNameSet.has(stage.stageName))) {
    throw new Error("Invalid Sample Delay stage");
  }
}

export const developmentSeed = {
  alarms: [
    {
      id: sampleDelayAlarmId,
      alarmCode: "AL-99198",
      occurredAt: new Date("2023-10-12T11:08:44Z"),
      item: "Bearing Housing A1",
      type: "Sample Delay",
      process: "Machining",
      line: "Line 4",
      status: "심각",
      reviewer: "품질 검토팀",
      reviewDeadline: new Date("2023-10-13T10:42:15Z"),
    },
    {
      id: "99201000-0000-4000-8000-000000000001",
      alarmCode: "AL-99201",
      occurredAt: new Date("2023-10-12T10:42:15Z"),
      item: "Bearing Housing A1",
      type: "CPK Drop",
      process: "Machining",
      line: "Line 4",
      status: "신규",
      reviewer: "-",
      reviewDeadline: null,
    },
    {
      id: "99202000-0000-4000-8000-000000000001",
      alarmCode: "AL-99202",
      occurredAt: new Date("2023-10-12T09:15:00Z"),
      item: "Stator Core B2",
      type: "Defect Rate",
      process: "Assembly",
      line: "Line 2",
      status: "검토중",
      reviewer: "S. Miller",
      reviewDeadline: null,
    },
    {
      id: "99203000-0000-4000-8000-000000000001",
      alarmCode: "AL-99203",
      occurredAt: new Date("2023-10-12T08:30:22Z"),
      item: "Rotor Assembly C",
      type: "Trend Alert",
      process: "Testing",
      line: "Line 1",
      status: "종결",
      reviewer: "시스템",
      reviewDeadline: null,
    },
  ],
  targets: [
    {
      id: sampleDelayTargetId,
      targetCode: "TRG-8921",
      name: "터빈 압파 교정",
      status: "진행 중",
      owner: "Sarah Chen",
      priority: "높음",
      dueDate: new Date("2023-11-15T00:00:00Z"),
      sourceAlarmId: sampleDelayAlarmId,
    },
    {
      id: "89220000-0000-4000-8000-000000000001",
      targetCode: "TRG-8922",
      name: "HVAC 시스템 오버홀",
      status: "대기",
      owner: "Marcus Rossi",
      priority: "중간",
      dueDate: new Date("2023-11-20T00:00:00Z"),
      sourceAlarmId: null,
    },
    {
      id: "89150000-0000-4000-8000-000000000001",
      targetCode: "TRG-8915",
      name: "원자로 코어 센서 동기화",
      status: "심각",
      owner: "John Doe",
      priority: "긴급",
      dueDate: new Date("2023-10-31T00:00:00Z"),
      sourceAlarmId: null,
    },
    {
      id: "89250000-0000-4000-8000-000000000001",
      targetCode: "TRG-8925",
      name: "파이프라인 압력 테스트",
      status: "대기",
      owner: "Aisha Patel",
      priority: "낮음",
      dueDate: new Date("2023-12-05T00:00:00Z"),
      sourceAlarmId: null,
    },
    {
      id: "89100000-0000-4000-8000-000000000001",
      targetCode: "TRG-8910",
      name: "안전 장비 재고 확인",
      status: "완료",
      owner: "Marcus Rossi",
      priority: "중간",
      dueDate: new Date("2023-10-25T00:00:00Z"),
      sourceAlarmId: null,
    },
  ],
  masterRules: [
    { id: "99300000-0000-4000-8000-000000000001", ruleCode: "ALR-001", kind: "alarm", name: "CPK 하한 경고", scope: "전 공장 / 가공", threshold: "1.33 미만", active: true },
    { id: "99300000-0000-4000-8000-000000000002", ruleCode: "ALR-002", kind: "alarm", name: "불량률 급증", scope: "조립 2라인", threshold: "3.0% 초과", active: true },
    { id: "99300000-0000-4000-8000-000000000003", ruleCode: "ALR-003", kind: "alarm", name: "샘플링 지연", scope: "전체 제품", threshold: "30분 초과", active: false },
    { id: "99300000-0000-4000-8000-000000000004", ruleCode: "CVR-001", kind: "conversion", name: "심각 알람 자동 전환", scope: "심각 등급 알람", threshold: "즉시 전환", active: true },
    { id: "99300000-0000-4000-8000-000000000005", ruleCode: "CVR-002", kind: "conversion", name: "반복 알람 전환", scope: "동일 제품 / 동일 공정", threshold: "7일 내 3회", active: true },
    { id: "99300000-0000-4000-8000-000000000006", ruleCode: "CVR-003", kind: "conversion", name: "장기 미검토 전환", scope: "신규·검토중 알람", threshold: "24시간 경과", active: false },
  ],
  masterCodes: [
    { id: "99400000-0000-4000-8000-000000000001", code: "PRC-MCH", name: "가공", category: "공정 코드", active: true },
    { id: "99400000-0000-4000-8000-000000000002", code: "ALM-CPK", name: "CPK 하락", category: "알람 유형", active: true },
    { id: "99400000-0000-4000-8000-000000000003", code: "STS-HOLD", name: "출하 보류", category: "상태 코드", active: false },
  ],
  sampleDelayStages: [
    { id: "99198000-0000-4000-8000-000000000006", alarmId: sampleDelayAlarmId, stageName: "샘플 의뢰", eventAt: new Date("2023-10-12T08:00:00Z"), elapsedMinutes: 0, allowedMinutes: 60, isDelayed: false },
    { id: "99198000-0000-4000-8000-000000000007", alarmId: sampleDelayAlarmId, stageName: "시험 접수", eventAt: new Date("2023-10-12T09:10:00Z"), elapsedMinutes: 70, allowedMinutes: 60, isDelayed: true },
    { id: "99198000-0000-4000-8000-000000000008", alarmId: sampleDelayAlarmId, stageName: "시험 분석 완료", eventAt: new Date("2023-10-12T10:40:00Z"), elapsedMinutes: 90, allowedMinutes: 120, isDelayed: false },
    { id: "99198000-0000-4000-8000-000000000009", alarmId: sampleDelayAlarmId, stageName: "판정 지연", eventAt: new Date("2023-10-12T12:20:00Z"), elapsedMinutes: 100, allowedMinutes: 60, isDelayed: true },
  ],
  actionPlans: [
    {
      id: sampleDelayActionPlanId,
      alarmId: sampleDelayAlarmId,
      targetId: sampleDelayTargetId,
      rootCause: "시험 접수와 판정 단계의 인수인계 지연",
      immediateAction: "담당자에게 지연 알림 및 우선 판정 요청",
      preventiveAction: "단계별 SLA 알림을 설정",
      status: "진행 중",
    },
  ],
  actionTasks: [
    {
      id: "99198000-0000-4000-8000-000000000004",
      actionPlanId: sampleDelayActionPlanId,
      description: "시험 접수 지연 원인 확인",
      owner: "박실비",
      dueDate: new Date("2023-10-13T00:00:00Z"),
    },
    {
      id: "99198000-0000-4000-8000-000000000005",
      actionPlanId: sampleDelayActionPlanId,
      description: "판정 단계 SLA 설정",
      owner: "이점검",
      dueDate: new Date("2023-10-16T00:00:00Z"),
    },
  ],
};

type SeedTables = {
  alarms: { id: unknown };
  targets: { id: unknown };
  actionPlans: unknown;
  actionTasks: unknown;
  masterRules?: { ruleCode: unknown };
  masterCodes?: { code: unknown };
  sampleDelayStages: { alarmId: unknown; stageName: unknown };
};

export async function seedDevelopmentData(database: { insert: Function; batch: Function }, tables: SeedTables) {
  assertValidSampleDelayStages(developmentSeed.sampleDelayStages);
  const masterSeedStatements = tables.masterRules && tables.masterCodes
    ? [
      database.insert(tables.masterRules).values(developmentSeed.masterRules).onConflictDoNothing({
        target: tables.masterRules.ruleCode,
      }),
      database.insert(tables.masterCodes).values(developmentSeed.masterCodes).onConflictDoNothing({
        target: tables.masterCodes.code,
      }),
    ]
    : [];
  await database.batch([
    database.insert(tables.alarms).values(developmentSeed.alarms).onConflictDoUpdate({
      target: tables.alarms.id,
      set: {
        alarmCode: sql`excluded.alarm_code`,
        occurredAt: sql`excluded.occurred_at`,
        item: sql`excluded.item`,
        type: sql`excluded.type`,
        process: sql`excluded.process`,
        line: sql`excluded.line`,
        status: sql`excluded.status`,
        reviewer: sql`excluded.reviewer`,
        reviewDeadline: sql`excluded.review_deadline`,
      },
    }),
    database.insert(tables.targets).values(developmentSeed.targets).onConflictDoUpdate({
      target: tables.targets.id,
      set: {
        targetCode: sql`excluded.target_code`,
        name: sql`excluded.name`,
        status: sql`excluded.status`,
        owner: sql`excluded.owner`,
        priority: sql`excluded.priority`,
        dueDate: sql`excluded.due_date`,
        sourceAlarmId: sql`excluded.source_alarm_id`,
      },
    }),
    database.insert(tables.actionPlans).values(developmentSeed.actionPlans).onConflictDoNothing(),
    database.insert(tables.actionTasks).values(developmentSeed.actionTasks).onConflictDoNothing(),
    database.insert(tables.sampleDelayStages).values(developmentSeed.sampleDelayStages).onConflictDoNothing({
      target: [tables.sampleDelayStages.alarmId, tables.sampleDelayStages.stageName],
    }),
    ...masterSeedStatements,
  ]);
}

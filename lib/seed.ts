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
  sampleDelayStages: { alarmId: unknown; stageName: unknown };
};

export async function seedDevelopmentData(database: { insert: Function; batch: Function }, tables: SeedTables) {
  assertValidSampleDelayStages(developmentSeed.sampleDelayStages);
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
  ]);
}

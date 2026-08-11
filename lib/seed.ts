export const sampleDelayStageNames = ["샘플 의뢰", "시험 접수", "시험 분석 완료", "판정 지연"] as const;
const sampleDelayStageNameSet = new Set<string>(sampleDelayStageNames);

export function assertValidSampleDelayStages(stages: Array<{ stageName: string }>) {
  if (!stages.every((stage) => sampleDelayStageNameSet.has(stage.stageName))) {
    throw new Error("Invalid Sample Delay stage");
  }
}

const sampleDelayAlarmId = "99198000-0000-4000-8000-000000000001";
const sampleDelayTargetId = "99198000-0000-4000-8000-000000000002";
const sampleDelayActionPlanId = "99198000-0000-4000-8000-000000000003";

export const developmentSeed = {
  alarms: [
    {
      id: sampleDelayAlarmId,
      occurredAt: new Date("2023-10-12T11:08:44Z"),
      item: "AL-99198",
      type: "Sample Delay",
      process: "Machining",
      line: "Line 4",
      status: "검토 대기",
      reviewer: null,
      reviewDeadline: new Date("2023-10-13T10:42:15Z"),
    },
  ],
  sampleDelayStages: [
    { id: "99198000-0000-4000-8000-000000000006", alarmId: sampleDelayAlarmId, stageName: "샘플 의뢰", eventAt: new Date("2023-10-12T08:00:00Z"), elapsedMinutes: 0, allowedMinutes: 60, isDelayed: false },
    { id: "99198000-0000-4000-8000-000000000007", alarmId: sampleDelayAlarmId, stageName: "시험 접수", eventAt: new Date("2023-10-12T09:10:00Z"), elapsedMinutes: 70, allowedMinutes: 60, isDelayed: true },
    { id: "99198000-0000-4000-8000-000000000008", alarmId: sampleDelayAlarmId, stageName: "시험 분석 완료", eventAt: new Date("2023-10-12T10:40:00Z"), elapsedMinutes: 90, allowedMinutes: 120, isDelayed: false },
    { id: "99198000-0000-4000-8000-000000000009", alarmId: sampleDelayAlarmId, stageName: "판정 지연", eventAt: new Date("2023-10-12T12:20:00Z"), elapsedMinutes: 100, allowedMinutes: 60, isDelayed: true },
  ],
  targets: [
    {
      id: sampleDelayTargetId,
      name: "베어링 하우징 CPK 개선",
      status: "진행중",
      owner: "박실비",
      priority: "높음",
      dueDate: new Date("2023-11-20T00:00:00Z"),
      sourceAlarmId: sampleDelayAlarmId,
    },
  ],
  actionPlans: [
    {
      id: sampleDelayActionPlanId,
      alarmId: sampleDelayAlarmId,
      targetId: sampleDelayTargetId,
      rootCause: "시험 접수와 판정 단계의 인수인계 지연",
      immediateAction: "담당자에게 지연 알림 및 우선 판정 요청",
      preventiveAction: "단계별 SLA 알림을 설정",
      status: "진행중",
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

type SeedTables = { alarms: unknown; targets: unknown; actionPlans: unknown; actionTasks: unknown; sampleDelayStages: any };

export async function seedDevelopmentData(database: { insert: Function; batch: Function }, tables: SeedTables) {
  assertValidSampleDelayStages(developmentSeed.sampleDelayStages);
  await database.batch([
    database.insert(tables.alarms).values(developmentSeed.alarms).onConflictDoNothing(),
    database.insert(tables.targets).values(developmentSeed.targets).onConflictDoNothing(),
    database.insert(tables.actionPlans).values(developmentSeed.actionPlans).onConflictDoNothing(),
    database.insert(tables.actionTasks).values(developmentSeed.actionTasks).onConflictDoNothing(),
    database.insert(tables.sampleDelayStages).values(developmentSeed.sampleDelayStages).onConflictDoNothing({
      target: [tables.sampleDelayStages.alarmId, tables.sampleDelayStages.stageName],
    }),
  ]);
}

export const sampleDelayStageNames = ["샘플 의뢰", "시험 접수", "시험 분석 완료", "판정 지연"] as const;

const sampleDelayAlarmId = "99198000-0000-4000-8000-000000000001";

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
    { alarmId: sampleDelayAlarmId, stageName: "샘플 의뢰", eventAt: new Date("2023-10-12T08:00:00Z"), elapsedMinutes: 0, allowedMinutes: 60, isDelayed: false },
    { alarmId: sampleDelayAlarmId, stageName: "시험 접수", eventAt: new Date("2023-10-12T09:10:00Z"), elapsedMinutes: 70, allowedMinutes: 60, isDelayed: true },
    { alarmId: sampleDelayAlarmId, stageName: "시험 분석 완료", eventAt: new Date("2023-10-12T10:40:00Z"), elapsedMinutes: 90, allowedMinutes: 120, isDelayed: false },
    { alarmId: sampleDelayAlarmId, stageName: "판정 지연", eventAt: new Date("2023-10-12T12:20:00Z"), elapsedMinutes: 100, allowedMinutes: 60, isDelayed: true },
  ],
  targets: [
    {
      id: "99198000-0000-4000-8000-000000000002",
      name: "베어링 하우징 CPK 개선",
      status: "진행중",
      owner: "박실비",
      priority: "높음",
      dueDate: new Date("2023-11-20T00:00:00Z"),
      sourceAlarmId: sampleDelayAlarmId,
    },
  ],
};

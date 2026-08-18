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

const trendDates = [
  "2020-01-15T08:00:00Z", "2020-04-15T08:00:00Z", "2020-07-15T08:00:00Z", "2020-10-15T08:00:00Z",
  "2021-01-15T08:00:00Z", "2021-04-15T08:00:00Z", "2021-07-15T08:00:00Z", "2021-10-15T08:00:00Z",
  "2022-01-15T08:00:00Z", "2022-04-15T08:00:00Z", "2022-07-15T08:00:00Z", "2022-10-15T08:00:00Z",
  "2023-01-15T08:00:00Z", "2023-03-15T08:00:00Z", "2023-06-15T08:00:00Z", "2023-08-15T08:00:00Z",
  "2023-09-28T08:00:00Z", "2023-09-29T08:00:00Z", "2023-09-30T08:00:00Z", "2023-10-01T08:00:00Z",
  "2023-10-02T08:00:00Z", "2023-10-03T08:00:00Z", "2023-10-04T08:00:00Z", "2023-10-05T08:00:00Z",
  "2023-10-06T08:00:00Z", "2023-10-07T08:00:00Z", "2023-10-08T08:00:00Z", "2023-10-09T08:00:00Z",
  "2023-10-10T08:00:00Z", "2023-10-11T08:00:00Z",
];

function trendMeasurements(alarmId: string, metricName: string, thresholdValue: number, values: number[]) {
  return trendDates.map((measuredAt, index) => ({
    alarmId,
    metricName,
    metricValue: values[index].toFixed(4),
    thresholdValue: thresholdValue.toFixed(4),
    measuredAt: new Date(measuredAt),
  }));
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
      factory: "Alpha",
      productType: "Type Y",
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
      factory: "Alpha",
      productType: "Type X",
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
      factory: "Beta",
      productType: "Type Y",
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
      factory: "Beta",
      productType: "Type X",
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
  alarmDetails: [
    {
      alarmId: sampleDelayAlarmId,
      equipment: "Lab intake station L4-02",
      productionLot: "BH-A1-231012-04",
      measurementSummary: "Sample receipt exceeded the 60-minute service-level target.",
      currentValue: "70.0000",
      thresholdValue: "60.0000",
      affectedProductsCustomers: "Bearing Housing A1 pilot batch / Northwind Motors",
      producedQuantity: 480,
      inspectedQuantity: 120,
      nonconformingQuantity: 0,
      shippingStatus: "Sampling hold released after laboratory review",
      inventoryQuantity: 360,
      relatedCtq: "Incoming sample turnaround time",
      processFactor: "Courier handoff and laboratory intake queue",
    },
    {
      alarmId: "99201000-0000-4000-8000-000000000001",
      equipment: "CNC machining center M-04",
      productionLot: "BH-A1-231012-02",
      measurementSummary: "Bore diameter capability fell below the 1.33 CPK control limit.",
      currentValue: "1.2800",
      thresholdValue: "1.3300",
      affectedProductsCustomers: "Bearing Housing A1 / Atlas Drive Systems",
      producedQuantity: 960,
      inspectedQuantity: 180,
      nonconformingQuantity: 11,
      shippingStatus: "Finished goods quarantined pending tool-offset verification",
      inventoryQuantity: 780,
      relatedCtq: "Bore diameter 48.000 +/- 0.020 mm",
      processFactor: "Spindle thermal compensation and tool wear offset",
    },
    {
      alarmId: "99202000-0000-4000-8000-000000000001",
      equipment: "Stator winding cell A-02",
      productionLot: "SC-B2-231012-07",
      measurementSummary: "Winding insulation defects exceeded the 3.00 percent escalation limit.",
      currentValue: "3.4000",
      thresholdValue: "3.0000",
      affectedProductsCustomers: "Stator Core B2 / Sejong E-Mobility",
      producedQuantity: 720,
      inspectedQuantity: 250,
      nonconformingQuantity: 9,
      shippingStatus: "Customer allocation held for 100 percent visual inspection",
      inventoryQuantity: 470,
      relatedCtq: "Winding insulation defect rate",
      processFactor: "Coil insertion guide alignment and varnish cure time",
    },
    {
      alarmId: "99203000-0000-4000-8000-000000000001",
      equipment: "End-of-line torque tester T-01",
      productionLot: "RA-C-231012-01",
      measurementSummary: "End-of-line torque drift crossed the 75.00 Nm trend alert threshold.",
      currentValue: "76.8000",
      thresholdValue: "75.0000",
      affectedProductsCustomers: "Rotor Assembly C / Pacific Motion",
      producedQuantity: 640,
      inspectedQuantity: 160,
      nonconformingQuantity: 4,
      shippingStatus: "Outbound pallet blocked until tester calibration is confirmed",
      inventoryQuantity: 510,
      relatedCtq: "Final fastening torque",
      processFactor: "Torque transducer drift and fixture clamp repeatability",
    },
  ],
  alarmMeasurements: [
    ...trendMeasurements(sampleDelayAlarmId, "Sample turnaround SLA", 60, [48, 50, 47, 49, 51, 50, 52, 49, 50, 51, 53, 52, 50, 52, 54, 55, 57, 58, 60, 61, 63, 65, 66, 64, 67, 68, 69, 70, 68, 70]),
    ...trendMeasurements("99201000-0000-4000-8000-000000000001", "Bore diameter CPK", 1.33, [1.58, 1.57, 1.56, 1.57, 1.55, 1.54, 1.53, 1.52, 1.51, 1.50, 1.49, 1.48, 1.47, 1.46, 1.45, 1.43, 1.41, 1.40, 1.39, 1.38, 1.37, 1.36, 1.35, 1.34, 1.33, 1.32, 1.31, 1.30, 1.29, 1.28]),
    ...trendMeasurements("99202000-0000-4000-8000-000000000001", "Winding defect rate", 3, [1.20, 1.30, 1.25, 1.40, 1.45, 1.50, 1.55, 1.60, 1.65, 1.70, 1.80, 1.85, 1.90, 2.00, 2.10, 2.20, 2.35, 2.40, 2.50, 2.60, 2.70, 2.80, 2.85, 2.90, 3.00, 3.10, 3.20, 3.30, 3.35, 3.40]),
    ...trendMeasurements("99203000-0000-4000-8000-000000000001", "End-of-line torque trend", 75, [69.20, 69.00, 69.40, 69.60, 69.80, 70.10, 70.30, 70.50, 70.70, 70.90, 71.20, 71.40, 71.70, 72.00, 72.30, 72.50, 72.80, 73.10, 73.30, 73.60, 73.80, 74.10, 74.30, 74.60, 74.90, 75.20, 75.50, 75.90, 76.30, 76.80]),
  ],
  alarmAttachments: [
    { alarmId: sampleDelayAlarmId, fileName: "AL-99198-lab-intake-log.pdf", fileUrl: null, fileSizeBytes: 184320 },
    { alarmId: sampleDelayAlarmId, fileName: "AL-99198-courier-handoff.csv", fileUrl: null, fileSizeBytes: 9216 },
    { alarmId: "99201000-0000-4000-8000-000000000001", fileName: "AL-99201-bore-cpk-study.xlsx", fileUrl: null, fileSizeBytes: 248832 },
    { alarmId: "99201000-0000-4000-8000-000000000001", fileName: "AL-99201-tool-offset-photo.jpg", fileUrl: null, fileSizeBytes: 376832 },
    { alarmId: "99202000-0000-4000-8000-000000000001", fileName: "AL-99202-winding-inspection.pdf", fileUrl: null, fileSizeBytes: 194560 },
    { alarmId: "99202000-0000-4000-8000-000000000001", fileName: "AL-99202-coil-guide-checklist.csv", fileUrl: null, fileSizeBytes: 12288 },
    { alarmId: "99203000-0000-4000-8000-000000000001", fileName: "AL-99203-torque-calibration.pdf", fileUrl: null, fileSizeBytes: 231424 },
    { alarmId: "99203000-0000-4000-8000-000000000001", fileName: "AL-99203-fixture-repeatability.csv", fileUrl: null, fileSizeBytes: 15360 },
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
  alarmDetails?: { alarmId: unknown };
  alarmMeasurements?: { alarmId: unknown; metricName: unknown; measuredAt: unknown };
  alarmAttachments?: { alarmId: unknown; fileName: unknown };
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
  const alarmDetailSeedStatements = tables.alarmDetails && tables.alarmMeasurements && tables.alarmAttachments
    ? [
      database.insert(tables.alarmDetails).values(developmentSeed.alarmDetails).onConflictDoUpdate({
        target: tables.alarmDetails.alarmId,
        set: {
          equipment: sql`excluded.equipment`,
          productionLot: sql`excluded.production_lot`,
          measurementSummary: sql`excluded.measurement_summary`,
          currentValue: sql`excluded.current_value`,
          thresholdValue: sql`excluded.threshold_value`,
          affectedProductsCustomers: sql`excluded.affected_products_customers`,
          producedQuantity: sql`excluded.produced_quantity`,
          inspectedQuantity: sql`excluded.inspected_quantity`,
          nonconformingQuantity: sql`excluded.nonconforming_quantity`,
          shippingStatus: sql`excluded.shipping_status`,
          inventoryQuantity: sql`excluded.inventory_quantity`,
          relatedCtq: sql`excluded.related_ctq`,
          processFactor: sql`excluded.process_factor`,
        },
      }),
      database.insert(tables.alarmMeasurements).values(developmentSeed.alarmMeasurements).onConflictDoUpdate({
        target: [tables.alarmMeasurements.alarmId, tables.alarmMeasurements.metricName, tables.alarmMeasurements.measuredAt],
        set: {
          metricValue: sql`excluded.metric_value`,
          thresholdValue: sql`excluded.threshold_value`,
        },
      }),
      database.insert(tables.alarmAttachments).values(developmentSeed.alarmAttachments).onConflictDoUpdate({
        target: [tables.alarmAttachments.alarmId, tables.alarmAttachments.fileName],
        set: {
          fileUrl: sql`excluded.file_url`,
          fileSizeBytes: sql`excluded.file_size_bytes`,
        },
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
        factory: sql`excluded.factory`,
        productType: sql`excluded.product_type`,
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
    ...alarmDetailSeedStatements,
  ]);
}

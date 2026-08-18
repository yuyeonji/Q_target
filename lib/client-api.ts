export type PersistedAlarm = {
  id: string;
  alarmCode: string;
  occurredAt: string;
  item: string;
  type: string;
  process: string;
  line: string;
  status: string;
  reviewer?: string | null;
  reviewDeadline?: string | null;
};

export type PersistedTarget = {
  id: string;
  targetCode: string;
  name: string;
  status: string;
  owner: string;
  priority: string;
  dueDate?: string | null;
  sourceAlarmId?: string | null;
};

export type CreateTargetInput = {
  targetCode?: string;
  name: string;
  status: string;
  owner: string;
  priority: string;
  dueDate?: string | null;
  sourceAlarmId?: string | null;
};

export type AlarmChanges = Partial<{ status: string; reviewer: string }>;

export type PersistedMasterRule = {
  id: string;
  ruleCode: string;
  kind: string;
  name: string;
  scope: string;
  threshold: string;
  active: boolean;
};

export type MasterRuleInput = Omit<PersistedMasterRule, "id">;
export type MasterRuleChanges = Partial<Pick<MasterRuleInput, "name" | "scope" | "threshold" | "active">>;

export type PersistedMasterCode = {
  id: string;
  code: string;
  name: string;
  category: string;
  active: boolean;
};

export type MasterCodeInput = Omit<PersistedMasterCode, "id">;
export type MasterCodeChanges = Partial<MasterCodeInput>;

export type SampleDelayStage = {
  stageName: string;
  eventAt: string;
  elapsedMinutes: number;
  allowedMinutes: number;
  isDelayed: boolean;
};

export type AlarmDetail = {
  alarmId: string;
  equipment?: string | null;
  productionLot?: string | null;
  measurementSummary?: string | null;
  currentValue?: string | null;
  thresholdValue?: string | null;
  affectedProductsCustomers?: string | null;
  producedQuantity?: number | null;
  inspectedQuantity?: number | null;
  nonconformingQuantity?: number | null;
  shippingStatus?: string | null;
  inventoryQuantity?: number | null;
  relatedCtq?: string | null;
  processFactor?: string | null;
};

export type AlarmMeasurement = {
  alarmId: string;
  metricName: string;
  metricValue?: string | null;
  thresholdValue?: string | null;
  measuredAt: string;
};

export type AlarmAttachment = {
  alarmId: string;
  fileName: string;
  fileUrl?: string | null;
  fileSizeBytes?: number | null;
  createdAt?: string | null;
};

type RelatedAlarm = Pick<PersistedAlarm, "id" | "alarmCode" | "item" | "type" | "process" | "line" | "status" | "occurredAt">;
type RelatedTarget = Pick<PersistedTarget, "id" | "targetCode" | "name" | "status" | "owner" | "priority" | "dueDate">;
type RelatedActionOutcome = PersistedActionPlan & { createdAt?: string | null };

export type AlarmDetailResponse = {
  alarm: PersistedAlarm;
  detail: AlarmDetail | null;
  measurements: AlarmMeasurement[];
  attachments: AlarmAttachment[];
  sampleDelayStages?: SampleDelayStage[];
  related: {
    similarAlarms: RelatedAlarm[];
    targets: RelatedTarget[];
    actionOutcomes: RelatedActionOutcome[];
  };
};

export type ActionPlanInput = {
  alarmId?: string | null;
  targetId?: string | null;
  rootCause?: string | null;
  immediateAction?: string | null;
  preventiveAction?: string | null;
  closureReason?: string | null;
  status: string;
  targetStatus?: string | null;
  tasks: Array<{ description: string; owner: string; dueDate?: string | null; completedAt?: string | null }>;
};

export type PersistedActionTask = {
  id: string;
  actionPlanId: string;
  description: string;
  owner: string;
  dueDate?: string | null;
  completedAt?: string | null;
};

export type PersistedActionPlan = {
  id: string;
  alarmId?: string | null;
  targetId?: string | null;
  rootCause?: string | null;
  immediateAction?: string | null;
  preventiveAction?: string | null;
  closureReason?: string | null;
  status: string;
  tasks: PersistedActionTask[];
};

export type ActionPlanRelation =
  | { alarmId: string }
  | { targetId: string };

const safeError = "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error(safeError);
  }
  if (!response.ok) throw new ApiError(safeError, response.status);
  try {
    return await response.json() as T;
  } catch {
    throw new Error(safeError);
  }
}

const jsonRequest = (method: "PATCH" | "POST", body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export async function listAlarms() {
  const response = await request<{ alarms: PersistedAlarm[] }>("/api/alarms", { method: "GET" });
  return response.alarms;
}

export async function getAlarmDetail(id: string): Promise<AlarmDetailResponse> {
  return request<AlarmDetailResponse>(`/api/alarms/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function listTargets() {
  const response = await request<{ targets: PersistedTarget[] }>("/api/targets", { method: "GET" });
  return response.targets;
}

export async function listActionPlans(relation: ActionPlanRelation) {
  const [key, value] = "alarmId" in relation
    ? ["alarmId", relation.alarmId]
    : ["targetId", relation.targetId];
  const response = await request<{ actionPlans: PersistedActionPlan[] }>(
    `/api/action-plans?${key}=${encodeURIComponent(value)}`,
    { method: "GET" },
  );
  return response.actionPlans;
}

export async function createTarget(input: CreateTargetInput) {
  return request<{ target: { id: string } }>("/api/targets", jsonRequest("POST", input));
}

export async function updateTarget(id: string, changes: Partial<Pick<PersistedTarget, "name" | "status" | "owner" | "priority">> & { dueDate?: string | null }) {
  return request<{ target: { id: string } }>(`/api/targets/${encodeURIComponent(id)}`, jsonRequest("PATCH", changes));
}

export async function updateAlarm(id: string, changes: AlarmChanges) {
  return request<{ alarm: { id: string } }>(`/api/alarms/${encodeURIComponent(id)}`, jsonRequest("PATCH", changes));
}

export async function listMasterRules(kind: string) {
  const response = await request<{ rules: PersistedMasterRule[] }>(`/api/master/rules?kind=${encodeURIComponent(kind)}`, { method: "GET" });
  return response.rules;
}

export async function createMasterRule(input: MasterRuleInput) {
  return request<{ rule: { id: string } }>("/api/master/rules", jsonRequest("POST", input));
}

export async function updateMasterRule(id: string, changes: MasterRuleChanges) {
  return request<{ rule: { id: string } }>(`/api/master/rules/${encodeURIComponent(id)}`, jsonRequest("PATCH", changes));
}

export async function listMasterCodes() {
  const response = await request<{ codes: PersistedMasterCode[] }>("/api/master/codes", { method: "GET" });
  return response.codes;
}

export async function createMasterCode(input: MasterCodeInput) {
  return request<{ code: { id: string } }>("/api/master/codes", jsonRequest("POST", input));
}

export async function updateMasterCode(id: string, changes: MasterCodeChanges) {
  return request<{ code: { id: string } }>(`/api/master/codes/${encodeURIComponent(id)}`, jsonRequest("PATCH", changes));
}

export async function saveActionPlan(input: ActionPlanInput) {
  return request<{ actionPlan: { id: string } }>("/api/action-plans", jsonRequest("POST", input));
}

export async function updateActionPlan(id: string, input: ActionPlanInput) {
  return request<{ actionPlan: { id: string } }>(`/api/action-plans/${encodeURIComponent(id)}`, jsonRequest("PATCH", input));
}

export async function closeActionPlan(id: string, input: ActionPlanInput): Promise<{ id: string }> {
  const response = await request<{ actionPlan: { id: string } }>(
    `/api/action-plans/${encodeURIComponent(id)}/close`,
    jsonRequest("POST", input),
  );
  return response.actionPlan;
}

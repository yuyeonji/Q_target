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

export type ActionPlanInput = {
  alarmId?: string | null;
  targetId?: string | null;
  rootCause?: string | null;
  immediateAction?: string | null;
  preventiveAction?: string | null;
  status: string;
  tasks: Array<{ description: string; owner: string; dueDate?: string | null }>;
};

const safeError = "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error(safeError);
  }
  if (!response.ok) throw new Error(safeError);
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

export async function getAlarmDetail(id: string) {
  return request<{ alarm: PersistedAlarm; sampleDelayStages: SampleDelayStage[] }>(`/api/alarms/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function listTargets() {
  const response = await request<{ targets: PersistedTarget[] }>("/api/targets", { method: "GET" });
  return response.targets;
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

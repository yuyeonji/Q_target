import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

export type NewTarget = {
  targetCode: string;
  name: string;
  status: string;
  owner: string;
  priority: string;
  dueDate?: Date | null;
  sourceAlarmId?: string | null;
};

export type TargetChanges = Partial<Pick<NewTarget, "name" | "status" | "owner" | "priority" | "dueDate">>;

export type NewMasterRule = {
  ruleCode: string;
  kind: string;
  name: string;
  scope: string;
  threshold: string;
  active?: boolean;
};

export type MasterRuleChanges = Partial<Pick<NewMasterRule, "name" | "scope" | "threshold" | "active">>;

export type NewMasterCode = {
  code: string;
  name: string;
  category: string;
  active?: boolean;
};

export type MasterCodeChanges = Partial<NewMasterCode>;

export type AlarmChanges = Partial<Pick<{ status: string; reviewer: string | null }, "status" | "reviewer">>;

export type NewActionPlan = {
  alarmId?: string | null;
  targetId?: string | null;
  rootCause?: string | null;
  immediateAction?: string | null;
  preventiveAction?: string | null;
  status: string;
  targetStatus?: string | null;
  tasks?: Array<{ description: string; owner: string; dueDate?: Date | null }>;
};

export type ActionPlanRelation =
  | { alarmId: string }
  | { targetId: string };

export interface QualityRepository {
  listAlarms(): Promise<unknown[]>;
  findAlarm(id: string): Promise<unknown | null>;
  listSampleDelayStages(alarmId: string): Promise<unknown[]>;
  listTargets(): Promise<unknown[]>;
  findTarget(id: string): Promise<unknown | null>;
  listActionPlans(relation: ActionPlanRelation): Promise<Array<Record<string, unknown> & { tasks: unknown[] }>>;
  listMasterRules(kind: string): Promise<unknown[]>;
  listMasterCodes(): Promise<unknown[]>;
  createTargetWithAudit(input: NewTarget, audit: NewAuditEvent): Promise<{ id: string }>;
  updateTargetWithAudit(id: string, changes: TargetChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
  createActionPlanWithAudit(input: NewActionPlan, audit: NewAuditEvent): Promise<{ id: string }>;
  updateActionPlanWithAudit(id: string, relation: ActionPlanRelation, input: NewActionPlan, audit: NewAuditEvent): Promise<{ id: string } | null>;
  createMasterRuleWithAudit(input: NewMasterRule, audit: NewAuditEvent): Promise<{ id: string }>;
  updateMasterRuleWithAudit(id: string, changes: MasterRuleChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
  createMasterCodeWithAudit(input: NewMasterCode, audit: NewAuditEvent): Promise<{ id: string }>;
  updateMasterCodeWithAudit(id: string, changes: MasterCodeChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
  updateAlarmWithAudit(id: string, changes: AlarmChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
}

type NewAuditEvent = { eventType: string; entityType: string; details?: Record<string, unknown> };
type QualityTables = { actionPlans: any; actionTasks: any; alarms: any; auditEvents: any; masterCodes: any; masterRules: any; sampleDelayStages: any; targets: any };

export function createQualityRepository(database: unknown, tables: QualityTables): QualityRepository {
  // The Drizzle type includes all current tables, while this boundary deliberately
  // exposes only the operations needed by the HTTP routes.
  const db = database as any;

  return {
    async listAlarms() {
      return db.select().from(tables.alarms).orderBy(desc(tables.alarms.occurredAt));
    },
    async findAlarm(id) {
      const [alarm] = await db.select().from(tables.alarms).where(eq(tables.alarms.id, id)).limit(1);
      return alarm ?? null;
    },
    async listSampleDelayStages(alarmId) {
      return db.select().from(tables.sampleDelayStages).where(eq(tables.sampleDelayStages.alarmId, alarmId)).orderBy(asc(tables.sampleDelayStages.eventAt));
    },
    async listTargets() {
      return db.select().from(tables.targets).orderBy(desc(tables.targets.createdAt));
    },
    async findTarget(id) {
      const [target] = await db.select().from(tables.targets).where(eq(tables.targets.id, id)).limit(1);
      return target ?? null;
    },
    async listActionPlans(relation) {
      const [relationColumn, relationId] = "alarmId" in relation
        ? [tables.actionPlans.alarmId, relation.alarmId]
        : [tables.actionPlans.targetId, relation.targetId];
      const plans = await db.select()
        .from(tables.actionPlans)
        .where(eq(relationColumn, relationId))
        .orderBy(desc(tables.actionPlans.createdAt));
      if (!plans.length) return [];
      const tasks = await db.select()
        .from(tables.actionTasks)
        .where(inArray(tables.actionTasks.actionPlanId, plans.map((plan: { id: string }) => plan.id)))
        .orderBy(asc(tables.actionTasks.createdAt));
      return plans.map((plan: { id: string }) => ({
        ...plan,
        tasks: tasks.filter((task: { actionPlanId: string }) => task.actionPlanId === plan.id),
      }));
    },
    async listMasterRules(kind) {
      return db.select().from(tables.masterRules).where(eq(tables.masterRules.kind, kind));
    },
    async listMasterCodes() {
      return db.select().from(tables.masterCodes).orderBy(asc(tables.masterCodes.code));
    },
    async createTargetWithAudit(input, audit) {
      const id = crypto.randomUUID();
      await db.batch([
        db.insert(tables.targets).values({ ...input, id }),
        db.insert(tables.auditEvents).values({ ...audit, id: crypto.randomUUID(), entityId: id }),
      ]);
      return { id };
    },
    async updateTargetWithAudit(id, changes, audit) {
      const [updated] = await db.batch([
        db.update(tables.targets).set(changes).where(eq(tables.targets.id, id)).returning({ id: tables.targets.id }),
        db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${audit.eventType}, ${audit.entityType}, ${id}, ${audit.details ?? null}
          where exists (select 1 from ${tables.targets} where ${eq(tables.targets.id, id)})`),
      ]);
      return updated[0] ?? null;
    },
    async createActionPlanWithAudit(input, audit) {
      const { tasks, targetStatus, ...plan } = input;
      const id = crypto.randomUUID();
      const statements = [
        ...(targetStatus && plan.targetId ? [
          db.update(tables.targets)
            .set({ status: targetStatus })
            .where(eq(tables.targets.id, plan.targetId))
            .returning({ id: tables.targets.id }),
        ] : []),
        db.insert(tables.actionPlans).values({ ...plan, id }),
        ...(tasks?.length ? [db.insert(tables.actionTasks).values(tasks.map((task) => ({ ...task, id: crypto.randomUUID(), actionPlanId: id })))] : []),
        ...(targetStatus && plan.targetId ? [
          db.insert(tables.auditEvents).values({
            id: crypto.randomUUID(),
            eventType: "target.updated",
            entityType: "target",
            entityId: plan.targetId,
            details: { status: targetStatus },
          }),
        ] : []),
        db.insert(tables.auditEvents).values({ ...audit, id: crypto.randomUUID(), entityId: id }),
      ];
      await db.batch(statements);
      return { id };
    },
    async updateActionPlanWithAudit(id, relation, input, audit) {
      const { tasks, targetStatus, ...plan } = input;
      const relationColumn = "targetId" in relation ? tables.actionPlans.targetId : tables.actionPlans.alarmId;
      const relationId = "targetId" in relation ? relation.targetId : relation.alarmId;
      const planWhere = and(eq(tables.actionPlans.id, id), eq(relationColumn, relationId));
      const statements = [
        db.update(tables.actionPlans)
          .set(plan)
          .where(planWhere)
          .returning({ id: tables.actionPlans.id }),
        db.delete(tables.actionTasks).where(
          sql`exists (select 1 from ${tables.actionPlans} where ${planWhere}) and ${eq(tables.actionTasks.actionPlanId, id)}`,
        ),
        ...(tasks?.length ? [
          db.insert(tables.actionTasks).values(tasks.map((task) => ({ ...task, id: crypto.randomUUID(), actionPlanId: id }))),
        ] : []),
        ...(targetStatus && plan.targetId ? [
          db.update(tables.targets).set({ status: targetStatus }).where(and(
            eq(tables.targets.id, plan.targetId),
            sql`exists (select 1 from ${tables.actionPlans} where ${planWhere})`,
          )),
          db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
            select ${crypto.randomUUID()}, ${"target.updated"}, ${"target"}, ${plan.targetId}, ${{ status: targetStatus }}
            where exists (select 1 from ${tables.actionPlans} where ${planWhere})`),
        ] : []),
        db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${audit.eventType}, ${audit.entityType}, ${id}, ${audit.details ?? null}
          where exists (select 1 from ${tables.actionPlans} where ${planWhere})`),
      ];
      const [updated] = await db.batch(statements);
      return updated[0] ?? null;
    },
    async createMasterRuleWithAudit(input, audit) {
      const id = crypto.randomUUID();
      await db.batch([
        db.insert(tables.masterRules).values({ ...input, id }),
        db.insert(tables.auditEvents).values({ ...audit, id: crypto.randomUUID(), entityId: id }),
      ]);
      return { id };
    },
    async updateMasterRuleWithAudit(id, changes, audit) {
      const [updated] = await db.batch([
        db.update(tables.masterRules).set(changes).where(eq(tables.masterRules.id, id)).returning({ id: tables.masterRules.id }),
        db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${audit.eventType}, ${audit.entityType}, ${id}, ${audit.details ?? null}
          where exists (select 1 from ${tables.masterRules} where ${eq(tables.masterRules.id, id)})`),
      ]);
      return updated[0] ?? null;
    },
    async createMasterCodeWithAudit(input, audit) {
      const id = crypto.randomUUID();
      await db.batch([
        db.insert(tables.masterCodes).values({ ...input, id }),
        db.insert(tables.auditEvents).values({ ...audit, id: crypto.randomUUID(), entityId: id }),
      ]);
      return { id };
    },
    async updateMasterCodeWithAudit(id, changes, audit) {
      const [updated] = await db.batch([
        db.update(tables.masterCodes).set(changes).where(eq(tables.masterCodes.id, id)).returning({ id: tables.masterCodes.id }),
        db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${audit.eventType}, ${audit.entityType}, ${id}, ${audit.details ?? null}
          where exists (select 1 from ${tables.masterCodes} where ${eq(tables.masterCodes.id, id)})`),
      ]);
      return updated[0] ?? null;
    },
    async updateAlarmWithAudit(id, changes, audit) {
      const [updated] = await db.batch([
        db.update(tables.alarms).set(changes).where(eq(tables.alarms.id, id)).returning({ id: tables.alarms.id }),
        db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${audit.eventType}, ${audit.entityType}, ${id}, ${audit.details ?? null}
          where exists (select 1 from ${tables.alarms} where ${eq(tables.alarms.id, id)})`),
      ]);
      return updated[0] ?? null;
    },
  };
}

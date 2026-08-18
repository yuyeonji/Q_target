import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";

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
  tasks?: Array<{ description: string; owner: string; dueDate?: Date | null; completedAt?: Date | null }>;
};

export type ClosedActionPlan = {
  rootCause: string;
  immediateAction: string;
  preventiveAction: string;
  closureReason: string;
  status: "종결";
  targetStatus: "완료";
  tasks: Array<{ description: string; owner: string; dueDate: Date; completedAt: Date }>;
};

export type ActionPlanRelation =
  | { alarmId: string }
  | { targetId: string };

export interface QualityRepository {
  listAlarms(): Promise<unknown[]>;
  findAlarm(id: string): Promise<unknown | null>;
  getAlarmDetail(id: string): Promise<AlarmDetailAggregate | null>;
  listSampleDelayStages(alarmId: string): Promise<unknown[]>;
  listTargets(): Promise<unknown[]>;
  findTarget(id: string): Promise<unknown | null>;
  findTargetBySourceAlarm(sourceAlarmId: string): Promise<{ id: string; targetCode: string } | null>;
  listActionPlans(relation: ActionPlanRelation): Promise<Array<Record<string, unknown> & { tasks: unknown[] }>>;
  listMasterRules(kind: string): Promise<unknown[]>;
  listMasterCodes(): Promise<unknown[]>;
  createTargetWithAudit(input: NewTarget, audit: NewAuditEvent): Promise<{ id: string }>;
  updateTargetWithAudit(id: string, changes: TargetChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
  createActionPlanWithAudit(input: NewActionPlan, audit: NewAuditEvent): Promise<{ id: string }>;
  updateActionPlanWithAudit(id: string, relation: ActionPlanRelation, input: NewActionPlan, audit: NewAuditEvent): Promise<{ id: string } | null>;
  closeActionPlanWithAudit(id: string, targetId: string, input: ClosedActionPlan, audit: NewAuditEvent): Promise<{ id: string } | null>;
  createMasterRuleWithAudit(input: NewMasterRule, audit: NewAuditEvent): Promise<{ id: string }>;
  updateMasterRuleWithAudit(id: string, changes: MasterRuleChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
  createMasterCodeWithAudit(input: NewMasterCode, audit: NewAuditEvent): Promise<{ id: string }>;
  updateMasterCodeWithAudit(id: string, changes: MasterCodeChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
  updateAlarmWithAudit(id: string, changes: AlarmChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
}

type NewAuditEvent = { eventType: string; entityType: string; details?: Record<string, unknown> };
type AlarmDetailAggregate = {
  alarm: Record<string, unknown>;
  detail: Record<string, unknown> | null;
  measurements: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  related: {
    similarAlarms: Array<Record<string, unknown>>;
    targets: Array<Record<string, unknown>>;
    actionOutcomes: Array<Record<string, unknown> & { tasks: Array<Record<string, unknown>> }>;
  };
};
type QualityTables = { actionPlans: any; actionTasks: any; alarmAttachments: any; alarmDetails: any; alarmMeasurements: any; alarms: any; auditEvents: any; masterCodes: any; masterRules: any; sampleDelayStages: any; targets: any };

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
    async getAlarmDetail(id) {
      const [alarm] = await db.select().from(tables.alarms).where(eq(tables.alarms.id, id)).limit(1);
      if (!alarm) return null;

      const targetMatchesProcess = sql`exists (
        select 1 from ${tables.alarms} as source_alarm
        where ${eq(tables.targets.sourceAlarmId, sql.raw("source_alarm.id"))}
          and ${eq(sql.raw("source_alarm.process"), alarm.process)}
      )`;
      const actionPlanMatchesProcess = sql`exists (
        select 1 from ${tables.targets}
        join ${tables.alarms} as source_alarm on ${eq(tables.targets.sourceAlarmId, sql.raw("source_alarm.id"))}
        where ${eq(tables.targets.id, tables.actionPlans.targetId)}
          and ${eq(sql.raw("source_alarm.process"), alarm.process)}
      )`;
      const [detail, measurements, attachments, similarAlarms, relatedTargets, completedPlans] = await Promise.all([
        db.select().from(tables.alarmDetails).where(eq(tables.alarmDetails.alarmId, id)).limit(1),
        db.select().from(tables.alarmMeasurements).where(eq(tables.alarmMeasurements.alarmId, id)).orderBy(asc(tables.alarmMeasurements.measuredAt)),
        db.select().from(tables.alarmAttachments).where(eq(tables.alarmAttachments.alarmId, id)).orderBy(desc(tables.alarmAttachments.createdAt)),
        db.select().from(tables.alarms).where(and(
          eq(tables.alarms.type, alarm.type),
          eq(tables.alarms.process, alarm.process),
          ne(tables.alarms.id, id),
        )).orderBy(desc(tables.alarms.occurredAt)).limit(3),
        db.select().from(tables.targets).where(or(
          eq(tables.targets.sourceAlarmId, id),
          targetMatchesProcess,
        )).orderBy(desc(tables.targets.createdAt)).limit(5),
        db.select().from(tables.actionPlans).where(and(
          eq(tables.actionPlans.status, "종결"),
          or(eq(tables.actionPlans.alarmId, id), actionPlanMatchesProcess),
        )).orderBy(desc(tables.actionPlans.createdAt)).limit(5),
      ]);
      const actionTasks = completedPlans.length
        ? await db.select().from(tables.actionTasks)
          .where(inArray(tables.actionTasks.actionPlanId, completedPlans.map((plan: { id: string }) => plan.id)))
          .orderBy(asc(tables.actionTasks.createdAt))
        : [];

      return {
        alarm,
        detail: detail ?? null,
        measurements,
        attachments,
        related: {
          similarAlarms,
          targets: relatedTargets,
          actionOutcomes: completedPlans.map((plan: Record<string, unknown> & { id: string }) => ({
            ...plan,
            tasks: actionTasks.filter((task: { actionPlanId: string }) => task.actionPlanId === plan.id),
          })),
        },
      };
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
    async findTargetBySourceAlarm(sourceAlarmId) {
      const [target] = await db.select({ id: tables.targets.id, targetCode: tables.targets.targetCode })
        .from(tables.targets)
        .where(eq(tables.targets.sourceAlarmId, sourceAlarmId))
        .limit(1);
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
        ...(input.sourceAlarmId ? [
          db.update(tables.alarms)
            .set({ status: "관리대상" })
            .where(eq(tables.alarms.id, input.sourceAlarmId)),
        ] : []),
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
    async closeActionPlanWithAudit(id, targetId, input, audit) {
      const planWhere = and(eq(tables.actionPlans.id, id), eq(tables.actionPlans.targetId, targetId));
      const planExists = sql`exists (select 1 from ${tables.actionPlans} where ${planWhere})`;
      const statements = [
        db.update(tables.actionPlans).set({
          rootCause: input.rootCause,
          immediateAction: input.immediateAction,
          preventiveAction: input.preventiveAction,
          closureReason: input.closureReason,
          status: "종결",
        }).where(planWhere).returning({ id: tables.actionPlans.id }),
        db.delete(tables.actionTasks).where(
          sql`${planExists} and ${eq(tables.actionTasks.actionPlanId, id)}`,
        ),
        ...input.tasks.map((task) => db.execute(sql`insert into ${tables.actionTasks} (id, action_plan_id, description, owner, due_date, completed_at)
          select ${crypto.randomUUID()}, ${id}, ${task.description}, ${task.owner}, ${task.dueDate}, ${task.completedAt}
          where ${planExists}`)),
        db.update(tables.targets).set({ status: "완료" }).where(and(
          eq(tables.targets.id, targetId),
          planExists,
        )),
        db.update(tables.alarms).set({ status: "종결" }).where(sql`exists (
          select 1 from ${tables.targets}
          where ${eq(tables.targets.id, targetId)}
            and ${eq(tables.targets.sourceAlarmId, tables.alarms.id)}
            and ${planExists}
        )`),
        db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${audit.eventType}, ${audit.entityType}, ${id}, ${audit.details ?? null}
          where ${planExists}`),
        db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${"target.updated"}, ${"target"}, ${targetId}, ${{ status: "완료" }}
          where ${planExists}`),
        db.execute(sql`insert into ${tables.auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${"alarm.updated"}, ${"alarm"}, targets.source_alarm_id, ${{ status: "종결" }}
          from ${tables.targets}
          where ${eq(tables.targets.id, targetId)} and targets.source_alarm_id is not null and ${planExists}`),
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

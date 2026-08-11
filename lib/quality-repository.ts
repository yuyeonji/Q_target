import { asc, desc, eq, sql } from "drizzle-orm";

export type NewTarget = {
  name: string;
  status: string;
  owner: string;
  priority: string;
  dueDate?: Date | null;
  sourceAlarmId?: string | null;
};

export type TargetChanges = Partial<Pick<NewTarget, "name" | "status" | "owner" | "priority" | "dueDate">>;

export type NewActionPlan = {
  alarmId?: string | null;
  targetId?: string | null;
  rootCause?: string | null;
  immediateAction?: string | null;
  preventiveAction?: string | null;
  status: string;
  tasks?: Array<{ description: string; owner: string; dueDate?: Date | null }>;
};

export interface QualityRepository {
  listAlarms(): Promise<unknown[]>;
  findAlarm(id: string): Promise<unknown | null>;
  listSampleDelayStages(alarmId: string): Promise<unknown[]>;
  listTargets(): Promise<unknown[]>;
  createTargetWithAudit(input: NewTarget, audit: NewAuditEvent): Promise<{ id: string }>;
  updateTargetWithAudit(id: string, changes: TargetChanges, audit: NewAuditEvent): Promise<{ id: string } | null>;
  createActionPlanWithAudit(input: NewActionPlan, audit: NewAuditEvent): Promise<{ id: string }>;
}

type NewAuditEvent = { eventType: string; entityType: string; details?: Record<string, unknown> };
type QualityTables = { actionPlans: any; actionTasks: any; alarms: any; auditEvents: any; sampleDelayStages: any; targets: any };

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
      const { tasks, ...plan } = input;
      const id = crypto.randomUUID();
      const statements = [
        db.insert(tables.actionPlans).values({ ...plan, id }),
        ...(tasks?.length ? [db.insert(tables.actionTasks).values(tasks.map((task) => ({ ...task, id: crypto.randomUUID(), actionPlanId: id })))] : []),
        db.insert(tables.auditEvents).values({ ...audit, id: crypto.randomUUID(), entityId: id }),
      ];
      await db.batch(statements);
      return { id };
    },
  };
}

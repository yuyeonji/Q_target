import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  actionPlans,
  actionTasks,
  alarms,
  auditEvents,
  sampleDelayStages,
  targets,
} from "@/db/schema";

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

export function createQualityRepository(database = getDb()): QualityRepository {
  // The Drizzle type includes all current tables, while this boundary deliberately
  // exposes only the operations needed by the HTTP routes.
  const db = database as any;

  return {
    async listAlarms() {
      return db.select().from(alarms).orderBy(desc(alarms.occurredAt));
    },
    async findAlarm(id) {
      const [alarm] = await db.select().from(alarms).where(eq(alarms.id, id)).limit(1);
      return alarm ?? null;
    },
    async listSampleDelayStages(alarmId) {
      return db.select().from(sampleDelayStages).where(eq(sampleDelayStages.alarmId, alarmId)).orderBy(asc(sampleDelayStages.eventAt));
    },
    async listTargets() {
      return db.select().from(targets).orderBy(desc(targets.createdAt));
    },
    async createTargetWithAudit(input, audit) {
      const id = crypto.randomUUID();
      await db.batch([
        db.insert(targets).values({ ...input, id }),
        db.insert(auditEvents).values({ ...audit, id: crypto.randomUUID(), entityId: id }),
      ]);
      return { id };
    },
    async updateTargetWithAudit(id, changes, audit) {
      const [updated] = await db.batch([
        db.update(targets).set(changes).where(eq(targets.id, id)).returning({ id: targets.id }),
        db.execute(sql`insert into ${auditEvents} (id, event_type, entity_type, entity_id, details)
          select ${crypto.randomUUID()}, ${audit.eventType}, ${audit.entityType}, ${id}, ${audit.details ?? null}
          where exists (select 1 from ${targets} where ${eq(targets.id, id)})`),
      ]);
      return updated[0] ?? null;
    },
    async createActionPlanWithAudit(input, audit) {
      const { tasks, ...plan } = input;
      const id = crypto.randomUUID();
      const statements = [
        db.insert(actionPlans).values({ ...plan, id }),
        ...(tasks?.length ? [db.insert(actionTasks).values(tasks.map((task) => ({ ...task, id: crypto.randomUUID(), actionPlanId: id })))] : []),
        db.insert(auditEvents).values({ ...audit, id: crypto.randomUUID(), entityId: id }),
      ];
      await db.batch(statements);
      return { id };
    },
  };
}

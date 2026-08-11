import { asc, desc, eq } from "drizzle-orm";
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
  createTarget(input: NewTarget): Promise<{ id: string }>;
  updateTarget(id: string, changes: TargetChanges): Promise<{ id: string } | null>;
  createActionPlan(input: NewActionPlan): Promise<{ id: string }>;
  createAuditEvent(input: { eventType: string; entityType: string; entityId: string; details?: Record<string, unknown> }): Promise<void>;
}

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
    async createTarget(input) {
      const [target] = await db.insert(targets).values(input).returning({ id: targets.id });
      return target;
    },
    async updateTarget(id, changes) {
      const [target] = await db.update(targets).set(changes).where(eq(targets.id, id)).returning({ id: targets.id });
      return target ?? null;
    },
    async createActionPlan(input) {
      const { tasks, ...plan } = input;
      const [createdPlan] = await db.insert(actionPlans).values(plan).returning({ id: actionPlans.id });
      if (tasks?.length) {
        await db.insert(actionTasks).values(tasks.map((task) => ({ ...task, actionPlanId: createdPlan.id })));
      }
      return createdPlan;
    },
    async createAuditEvent(input) {
      await db.insert(auditEvents).values({
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
      });
    },
  };
}

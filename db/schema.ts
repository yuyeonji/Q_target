import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const alarms = pgTable("alarms", {
  id: id(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  item: text("item").notNull(),
  type: text("type").notNull(),
  process: text("process").notNull(),
  line: text("line").notNull(),
  status: text("status").notNull(),
  reviewer: text("reviewer"),
  reviewDeadline: timestamp("review_deadline", { withTimezone: true }),
  createdAt: createdAt(),
});

export const targets = pgTable("targets", {
  id: id(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  owner: text("owner").notNull(),
  priority: text("priority").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  sourceAlarmId: uuid("source_alarm_id").references(() => alarms.id),
  createdAt: createdAt(),
});

export const actionPlans = pgTable("action_plans", {
  id: id(),
  alarmId: uuid("alarm_id").references(() => alarms.id),
  rootCause: text("root_cause"),
  immediateAction: text("immediate_action"),
  preventiveAction: text("preventive_action"),
  status: text("status").notNull(),
  createdAt: createdAt(),
});

export const actionTasks = pgTable("action_tasks", {
  id: id(),
  actionPlanId: uuid("action_plan_id")
    .notNull()
    .references(() => actionPlans.id),
  description: text("description").notNull(),
  owner: text("owner").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const sampleDelayStages = pgTable("sample_delay_stages", {
  id: id(),
  alarmId: uuid("alarm_id")
    .notNull()
    .references(() => alarms.id),
  stageName: text("stage_name").notNull(),
  eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
  elapsedMinutes: integer("elapsed_minutes").notNull(),
  allowedMinutes: integer("allowed_minutes").notNull(),
  isDelayed: boolean("is_delayed").notNull().default(false),
  createdAt: createdAt(),
});

export const auditEvents = pgTable("audit_events", {
  id: id(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  actor: text("actor"),
  details: jsonb("details"),
});

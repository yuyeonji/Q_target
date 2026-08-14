import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const alarms = pgTable("alarms", {
  id: id(),
  alarmCode: text("alarm_code").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  item: text("item").notNull(),
  type: text("type").notNull(),
  process: text("process").notNull(),
  line: text("line").notNull(),
  factory: text("factory"),
  productType: text("product_type"),
  status: text("status").notNull(),
  reviewer: text("reviewer"),
  reviewDeadline: timestamp("review_deadline", { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("alarms_alarm_code_unique").on(table.alarmCode),
]);

export const targets = pgTable("targets", {
  id: id(),
  targetCode: text("target_code").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  owner: text("owner").notNull(),
  priority: text("priority").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  sourceAlarmId: uuid("source_alarm_id").references(() => alarms.id),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("targets_target_code_unique").on(table.targetCode),
  uniqueIndex("targets_source_alarm_id_unique").on(table.sourceAlarmId),
]);

export const actionPlans = pgTable("action_plans", {
  id: id(),
  alarmId: uuid("alarm_id").references(() => alarms.id),
  targetId: uuid("target_id").references(() => targets.id),
  rootCause: text("root_cause"),
  immediateAction: text("immediate_action"),
  preventiveAction: text("preventive_action"),
  closureReason: text("closure_reason"),
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
}, (table) => [
  uniqueIndex("sample_delay_stages_alarm_stage_unique").on(table.alarmId, table.stageName),
  check(
    "sample_delay_stages_stage_name_check",
    sql`${table.stageName} in ('샘플 의뢰', '시험 접수', '시험 분석 완료', '판정 지연')`,
  ),
]);

export const masterRules = pgTable("master_rules", {
  id: id(),
  ruleCode: text("rule_code").notNull(),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  scope: text("scope").notNull(),
  threshold: text("threshold").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("master_rules_rule_code_unique").on(table.ruleCode),
]);

export const masterCodes = pgTable("master_codes", {
  id: id(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("master_codes_code_unique").on(table.code),
]);

export const auditEvents = pgTable("audit_events", {
  id: id(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  actor: text("actor"),
  details: jsonb("details"),
});

CREATE TABLE "action_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alarm_id" uuid,
	"root_cause" text,
	"immediate_action" text,
	"preventive_action" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_plan_id" uuid NOT NULL,
	"description" text NOT NULL,
	"owner" text NOT NULL,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alarms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"item" text NOT NULL,
	"type" text NOT NULL,
	"process" text NOT NULL,
	"line" text NOT NULL,
	"status" text NOT NULL,
	"reviewer" text,
	"review_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "sample_delay_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alarm_id" uuid NOT NULL,
	"stage_name" text NOT NULL,
	"event_at" timestamp with time zone NOT NULL,
	"elapsed_minutes" integer NOT NULL,
	"allowed_minutes" integer NOT NULL,
	"is_delayed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"owner" text NOT NULL,
	"priority" text NOT NULL,
	"due_date" timestamp with time zone,
	"source_alarm_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_alarm_id_alarms_id_fk" FOREIGN KEY ("alarm_id") REFERENCES "public"."alarms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_tasks" ADD CONSTRAINT "action_tasks_action_plan_id_action_plans_id_fk" FOREIGN KEY ("action_plan_id") REFERENCES "public"."action_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_delay_stages" ADD CONSTRAINT "sample_delay_stages_alarm_id_alarms_id_fk" FOREIGN KEY ("alarm_id") REFERENCES "public"."alarms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_source_alarm_id_alarms_id_fk" FOREIGN KEY ("source_alarm_id") REFERENCES "public"."alarms"("id") ON DELETE no action ON UPDATE no action;
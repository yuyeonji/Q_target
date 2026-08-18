CREATE TABLE "alarm_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alarm_id" uuid NOT NULL,
	"equipment" text,
	"production_lot" text,
	"measurement_summary" text,
	"current_value" numeric(12, 4),
	"threshold_value" numeric(12, 4),
	"affected_products_customers" text,
	"produced_quantity" integer,
	"inspected_quantity" integer,
	"nonconforming_quantity" integer,
	"shipping_status" text,
	"inventory_quantity" integer,
	"related_ctq" text,
	"process_factor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alarm_details_alarm_id_alarms_id_fk" FOREIGN KEY ("alarm_id") REFERENCES "public"."alarms"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "alarm_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alarm_id" uuid NOT NULL,
	"metric_name" text NOT NULL,
	"metric_value" numeric(12, 4) NOT NULL,
	"threshold_value" numeric(12, 4) NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	CONSTRAINT "alarm_measurements_alarm_id_alarms_id_fk" FOREIGN KEY ("alarm_id") REFERENCES "public"."alarms"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "alarm_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alarm_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text,
	"file_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alarm_attachments_alarm_id_alarms_id_fk" FOREIGN KEY ("alarm_id") REFERENCES "public"."alarms"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "alarm_details_alarm_id_unique" ON "alarm_details" USING btree ("alarm_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "alarm_measurements_alarm_metric_measured_unique" ON "alarm_measurements" USING btree ("alarm_id", "metric_name", "measured_at");
--> statement-breakpoint
CREATE INDEX "alarm_measurements_alarm_measured_at_idx" ON "alarm_measurements" USING btree ("alarm_id", "measured_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "alarm_attachments_alarm_file_unique" ON "alarm_attachments" USING btree ("alarm_id", "file_name");
--> statement-breakpoint
CREATE INDEX "alarm_attachments_alarm_created_at_idx" ON "alarm_attachments" USING btree ("alarm_id", "created_at");

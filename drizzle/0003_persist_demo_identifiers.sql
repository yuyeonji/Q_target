ALTER TABLE "alarms" ADD COLUMN "alarm_code" text;
--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "target_code" text;
--> statement-breakpoint
UPDATE "alarms"
SET "alarm_code" = CASE "id"::text
  WHEN '99198000-0000-4000-8000-000000000001' THEN 'AL-99198'
  WHEN '99201000-0000-4000-8000-000000000001' THEN 'AL-99201'
  WHEN '99202000-0000-4000-8000-000000000001' THEN 'AL-99202'
  WHEN '99203000-0000-4000-8000-000000000001' THEN 'AL-99203'
  ELSE 'AL-LEGACY-' || replace("id"::text, '-', '')
END
WHERE "alarm_code" IS NULL;
--> statement-breakpoint
UPDATE "targets"
SET "target_code" = CASE "id"::text
  WHEN '99198000-0000-4000-8000-000000000002' THEN 'TRG-8921'
  WHEN '89220000-0000-4000-8000-000000000001' THEN 'TRG-8922'
  WHEN '89150000-0000-4000-8000-000000000001' THEN 'TRG-8915'
  WHEN '89250000-0000-4000-8000-000000000001' THEN 'TRG-8925'
  WHEN '89100000-0000-4000-8000-000000000001' THEN 'TRG-8910'
  ELSE 'TRG-LEGACY-' || replace("id"::text, '-', '')
END
WHERE "target_code" IS NULL;
--> statement-breakpoint
ALTER TABLE "alarms" ALTER COLUMN "alarm_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "targets" ALTER COLUMN "target_code" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "alarms_alarm_code_unique" ON "alarms" USING btree ("alarm_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "targets_target_code_unique" ON "targets" USING btree ("target_code");

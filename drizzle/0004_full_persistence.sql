CREATE TABLE "master_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_code" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"scope" text NOT NULL,
	"threshold" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "master_codes_code_unique" ON "master_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "master_rules_rule_code_unique" ON "master_rules" USING btree ("rule_code");
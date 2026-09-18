CREATE TYPE "public"."asset_status" AS ENUM('ok', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('pipe', 'hydrant', 'sensor', 'valve');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"status" "asset_status" NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(10, 6) NOT NULL,
	"installed_at" timestamp with time zone NOT NULL,
	"last_inspected_at" timestamp with time zone,
	"notes" text NOT NULL,
	CONSTRAINT "assets_lat_range" CHECK ("assets"."lat" between -90 and 90),
	CONSTRAINT "assets_lng_range" CHECK ("assets"."lng" between -180 and 180),
	CONSTRAINT "assets_inspection_after_installation" CHECK ("assets"."last_inspected_at" is null or "assets"."last_inspected_at" >= "assets"."installed_at")
);
--> statement-breakpoint
CREATE INDEX "assets_type_idx" ON "assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_installed_at_idx" ON "assets" USING btree ("installed_at");
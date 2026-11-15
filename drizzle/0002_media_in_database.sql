ALTER TABLE "media" ALTER COLUMN "path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "data" "bytea";
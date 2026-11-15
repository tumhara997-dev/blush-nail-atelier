-- Make double-booking a technician impossible at the database level, even under concurrent requests.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appt_valid_range" CHECK ("ends_at" > "starts_at");
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "no_staff_overlap"
  EXCLUDE USING gist ("staff_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('REQUESTED', 'QUOTED', 'CONFIRMED', 'CHECKED_IN'));

-- Removes ALL demo data added by *_demo_data.sql.
-- To use: copy this file to netlify/database/migrations/<new timestamp>_remove_demo_data.sql and deploy.
DELETE FROM "appointments" WHERE "customer_id" IN (SELECT "id" FROM "users" WHERE "staff_notes" LIKE '[DEMO]%');
DELETE FROM "otp_codes" WHERE "phone" IN (SELECT "phone" FROM "users" WHERE "staff_notes" LIKE '[DEMO]%');
DELETE FROM "users" WHERE "staff_notes" LIKE '[DEMO]%';
DELETE FROM "enquiries" WHERE "id" IN ('91677fbc-2e69-4760-a33a-e70f75c54933', 'ab3bbcba-1893-495c-a9d9-2a04ed917282', '70148010-5e62-4192-a69e-6f4a8ee8270b');
UPDATE "appointments" SET "staff_id" = NULL WHERE "staff_id" = '5cd4ef49-8c52-44cd-a550-4e19691adcb5';
DELETE FROM "staff" WHERE "id" = '5cd4ef49-8c52-44cd-a550-4e19691adcb5';

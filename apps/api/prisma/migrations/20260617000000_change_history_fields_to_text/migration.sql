-- AlterTable: Change history fields from jsonb to text
ALTER TABLE "medical_records" ALTER COLUMN "family_history" TYPE text USING "family_history"::text;
ALTER TABLE "medical_records" ALTER COLUMN "non_pathological_history" TYPE text USING "non_pathological_history"::text;
ALTER TABLE "medical_records" ALTER COLUMN "pathological_history" TYPE text USING "pathological_history"::text;
ALTER TABLE "medical_records" ALTER COLUMN "systems_review" TYPE text USING "systems_review"::text;

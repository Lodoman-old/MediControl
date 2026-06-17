-- AlterTable: Change history fields from jsonb to text
ALTER TABLE "medical_record" ALTER COLUMN "family_history" TYPE text USING "family_history"::text;
ALTER TABLE "medical_record" ALTER COLUMN "non_pathological_history" TYPE text USING "non_pathological_history"::text;
ALTER TABLE "medical_record" ALTER COLUMN "pathological_history" TYPE text USING "pathological_history"::text;
ALTER TABLE "medical_record" ALTER COLUMN "systems_review" TYPE text USING "systems_review"::text;

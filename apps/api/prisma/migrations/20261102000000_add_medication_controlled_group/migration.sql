-- Fraccion del articulo 226 de la Ley General de Salud (I-VI).
-- NULL = sin clasificar.
ALTER TABLE "medications"
  ADD COLUMN IF NOT EXISTS "controlled_group" VARCHAR(4);

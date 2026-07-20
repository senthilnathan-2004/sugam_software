-- Add packaging multiplier: base units (tablets) per pack/strip.
-- Existing rows default to 1 (sold whole), which preserves current behavior:
-- quantity semantics and pricing are unchanged until a medicine opts in.
ALTER TABLE "Medicine" ADD COLUMN "unitsPerPack" INTEGER NOT NULL DEFAULT 1;

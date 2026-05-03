/*
  Warnings:

  - Added the required column `category` to the `structures` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StructureCategory" AS ENUM ('BONE', 'CARTILAGE', 'LIGAMENT', 'MUSCLE', 'TENDON', 'ORGAN', 'VASCULAR_VESSEL', 'NERVE', 'LYMPH_NODE', 'TISSUE');

-- AlterTable
ALTER TABLE "structures" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "category" "StructureCategory",
ADD COLUMN     "hierarchy_parent" UUID,
ADD COLUMN     "metadata" JSONB;

-- Set default category for existing rows
UPDATE "structures" SET "category" = 'BONE' WHERE "category" IS NULL;

-- Make category NOT NULL
ALTER TABLE "structures" ALTER COLUMN "category" SET NOT NULL;

-- CreateTable
CREATE TABLE "SvgPath" (
    "id" UUID NOT NULL,
    "viewBox" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "boundingBox" JSONB,
    "system" TEXT,
    "structureId" UUID NOT NULL,

    CONSTRAINT "SvgPath_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "structures_svg_path_id_idx" ON "structures"("svg_path_id");

-- CreateIndex
CREATE INDEX "structures_system_idx" ON "structures"("system");

-- CreateIndex
CREATE INDEX "structures_category_idx" ON "structures"("category");

-- AddForeignKey
ALTER TABLE "SvgPath" ADD CONSTRAINT "SvgPath_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

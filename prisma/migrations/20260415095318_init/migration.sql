/*
  Warnings:

  - You are about to drop the column `svgPaths` on the `structures` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "structures_svg_path_id_idx";

-- AlterTable
ALTER TABLE "structures" DROP COLUMN "svgPaths",
ADD COLUMN     "svgPathIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

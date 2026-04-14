/*
  Warnings:

  - You are about to drop the `SvgPath` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SvgPath" DROP CONSTRAINT "SvgPath_structureId_fkey";

-- AlterTable
ALTER TABLE "structures" ADD COLUMN     "svgPaths" JSONB NOT NULL DEFAULT '[]';

-- DropTable
DROP TABLE "SvgPath";

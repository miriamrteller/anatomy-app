-- CreateEnum
CREATE TYPE "System" AS ENUM ('SKELETAL', 'MUSCULAR', 'VASCULAR', 'NERVOUS', 'ENDOCRINE');

-- CreateTable
CREATE TABLE "structures" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latin_name" TEXT NOT NULL,
    "system" "System" NOT NULL,
    "coordinates" JSONB,
    "svg_path_id" TEXT,
    "description" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "structures_pkey" PRIMARY KEY ("id")
);

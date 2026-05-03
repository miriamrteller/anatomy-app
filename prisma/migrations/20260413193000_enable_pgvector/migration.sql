CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "structures"
ALTER COLUMN "embedding" TYPE vector(1536)
USING (("embedding")::text::vector);

ALTER TABLE "structures"
ALTER COLUMN "embedding" DROP NOT NULL;
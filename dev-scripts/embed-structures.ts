import { db } from '../src/lib/db';
import { embedText, buildStructureText } from '../src/lib/embeddings';

/**
 * Embedding Script
 *
 * One-time job to generate and save embeddings for all structures in the database
 * - Fetches every structure
 * - Converts to rich text representation
 * - Calls OpenAI embedding API
 * - Saves vectors to database using pgvector
 *
 * Cost: ~$0.02 per 1M tokens (very cheap, one-time)
 * Time: ~10 seconds for 5 structures
 *
 * Usage: npm run embed
 */

interface Structure {
  id: string;
  name: string;
  description: string;
  latinName: string;
  system: string;
  svgPathIds?: string[];
}

async function embedAllStructures() {
  console.log('\n🔍 Fetching all structures from database...');

  // Get all structures that need embedding
  const structures = (await db.structure.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      latinName: true,
      system: true,
      svgPathIds: true,
    },
  })) as Structure[];

  console.log(`📊 Found ${structures.length} structures to embed\n`);

  let successCount = 0;
  let errorCount = 0;

  // Process each structure sequentially
  for (let i = 0; i < structures.length; i++) {
    const structure = structures[i];

    try {
      // Build readable text representation for embedding
      const text = buildStructureText(structure);
      console.log(`[${i + 1}/${structures.length}] Embedding: ${structure.name}`);

      // Call OpenAI to get the embedding vector
      const embedding = await embedText(text);

      // Save embedding to database using raw SQL
      // (Prisma can't auto-convert number[] to pgvector type)
      await db.$executeRaw`
        UPDATE structures
        SET embedding = ${embedding}::vector
        WHERE id = ${structure.id}::uuid
      `;

      successCount++;
      console.log(`  ✅ Saved (vector dimension: ${embedding.length})`);

      // Polite rate limiting to respect OpenAI's rate limits
      // Space out API calls to avoid hitting limits
      if ((i + 1) % 5 === 0) {
        console.log(`  ⏸️  Pausing for 1 second (rate limiting)...\n`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      errorCount++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ Failed: ${message}`);
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Embedding process complete!`);
  console.log(`   Success: ${successCount}/${structures.length}`);
  if (errorCount > 0) {
    console.log(`   Failed:  ${errorCount}/${structures.length}`);
    console.log(`   💡 Re-run the script to retry failed structures`);
  }
  console.log(`${'='.repeat(60)}\n`);

  if (successCount === 0) {
    process.exit(1);
  }
}

// Run the script
embedAllStructures().catch((error) => {
  console.error('\n❌ Script failed with error:', error);
  process.exit(1);
});

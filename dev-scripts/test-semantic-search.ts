import { PrismaClient } from '@prisma/client';
import { embedText } from '../src/lib/embeddings.js';

const db = new PrismaClient();

async function test() {
  try {
    console.log('\n=== Testing Semantic Search Pipeline ===\n');
    
    // Step 1: Embed a question
    const question = "femur";
    console.log(`[Test] Embedding question: "${question}"`);
    const embedding = await embedText(question);
    console.log(`[Test] ✓ Embedding created: ${embedding.length} dimensions\n`);
    
    // Step 2: Run semantic search
    console.log(`[Test] Running pgvector semantic search...`);
    const results = await db.$queryRaw<any[]>`
      SELECT 
        id,
        name,
        system,
        "svgPathIds",
        (embedding <-> ${embedding}::vector) AS distance
      FROM structures
      WHERE embedding IS NOT NULL
      ORDER BY embedding <-> ${embedding}::vector
      LIMIT 5
    `;
    
    console.log(`[Test] ✓ Found ${results.length} structures\n`);
    
    // Step 3: Inspect raw data
    console.log('[Test] Raw query results:');
    results.forEach((s: any) => {
      console.log(`  ${s.name}:`);
      console.log(`    - svgPathIds type: ${typeof s.svgPathIds}`);
      console.log(`    - svgPathIds value: ${JSON.stringify(s.svgPathIds)}`);
      console.log(`    - svgPathIds is array: ${Array.isArray(s.svgPathIds)}`);
    });
    
    console.log('\n[Test] Extracting SVG path IDs:');
    const sourceIds = results
      .flatMap((s: any) => {
        const ids = s.svgPathIds;
        
        if (Array.isArray(ids)) {
          console.log(`  ✓ ${s.name}: Array with ${ids.length} items = ${JSON.stringify(ids)}`);
          return ids;
        }
        
        if (ids && typeof ids === 'object') {
          const values = Object.values(ids).filter(v => v && typeof v === 'string');
          console.log(`  ✓ ${s.name}: Object with ${values.length} values = ${JSON.stringify(values)}`);
          return values as string[];
        }
        
        if (typeof ids === 'string' && ids.length > 0) {
          console.log(`  ✓ ${s.name}: String = ${ids}`);
          return [ids];
        }
        
        console.log(`  ✗ ${s.name}: Invalid (type=${typeof ids}, value=${JSON.stringify(ids)})`);
        return [];
      })
      .filter((id: string) => id && id.length > 0);
    
    console.log(`\n[Test] Final sourceIds array: ${JSON.stringify(sourceIds)}`);
    console.log(`[Test] Total: ${sourceIds.length} SVG path IDs ready to send`);
    
    if (sourceIds.length > 0) {
      console.log(`\n✅ SUCCESS: Would send sources event with: ${JSON.stringify(sourceIds)}`);
    } else {
      console.log(`\n❌ FAILURE: sourceIds is empty, sources event would NOT be sent`);
    }
    
  } catch (error) {
    console.error('[Test] Error:', error);
  } finally {
    await db.$disconnect();
  }
}

test();

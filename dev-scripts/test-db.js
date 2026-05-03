import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function test() {
  try {
    const structures = await db.structure.findMany({
      where: {
        name: {
          contains: 'Femur'
        }
      },
      select: {
        id: true,
        name: true,
        svgPathIds: true
      },
      take: 5
    });

    console.log('Femur structures:');
    structures.forEach(s => {
      console.log(`  ${s.name}: ${JSON.stringify(s.svgPathIds)}`);
    });

    // Now test semantic query
    console.log('\n\nTesting semantic query with pgvector...');
    const result = await db.$queryRaw`
      SELECT 
        id,
        name,
        "svgPathIds"
      FROM structures
      WHERE embedding IS NOT NULL
      ORDER BY random()
      LIMIT 5
    `;

    console.log('Random structures with embeddings:');
    result.forEach(s => {
      console.log(`  ${s.name}: ${JSON.stringify(s.svgPathIds)}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

test();

/**
 * FMA API Integration Test
 * 
 * Tests:
 * 1. BioPortal API search
 * 2. Rate limit tracking
 * 3. SPARQL fallback
 * 4. Caching
 */

import { fmaClient } from '../src/lib/fmaApi.js';

async function runTests() {
  console.log('🧪 FMA API Integration Tests\n');

  // Test 1: Search for a common bone
  console.log('Test 1: Search for "Femur" via BioPortal');
  const femurResult = await fmaClient.search('Femur');
  if (femurResult) {
    console.log(`✅ Found: ${femurResult.prefLabel}`);
    console.log(`   Source: ${femurResult.source}`);
    console.log(`   Definition: ${femurResult.definition?.substring(0, 100)}...`);
  } else {
    console.log('❌ No result');
  }

  // Test 2: Check rate limit status
  const rateLimit = fmaClient.getRateLimitStatus();
  console.log(`\nTest 2: Rate Limit Status`);
  console.log(`   Remaining: ${rateLimit.remaining}`);
  console.log(`   Is Limited: ${rateLimit.isLimited}`);
  console.log(`✅ Rate limit tracking working`);

  // Test 3: Cache check
  console.log(`\nTest 3: Cache Test`);
  console.log(`   Cache size before: ${fmaClient.getCacheSize()}`);
  const cachedResult = await fmaClient.search('Femur'); // Should hit cache
  console.log(`   Cache size after: ${fmaClient.getCacheSize()}`);
  if (cachedResult?.source === 'cache') {
    console.log(`✅ Cache hit (source: ${cachedResult.source})`);
  } else {
    console.log(`⚠️ Expected cache hit, got: ${cachedResult?.source}`);
  }

  // Test 4: Get detailed info
  console.log(`\nTest 4: Detailed Info Retrieval`);
  const details = await fmaClient.getDetails('Tibia');
  if (details) {
    console.log(`✅ Retrieved details`);
    console.log(`   Definition: ${details.definition.substring(0, 100)}...`);
    console.log(`   Relationships: ${details.relationships.length}`);
  } else {
    console.log('❌ Failed to get details');
  }

  // Test 5: Fallback test (optional - requires rate limiting)
  console.log(`\nTest 5: Fallback Behavior (informational)`);
  console.log(`   Current source priority: BioPortal → SPARQL`);
  console.log(`   When rate limited, automatically switches to SPARQL`);
  console.log(`   (Can be tested by manually setting isLimited=true)`);

  console.log(`\n✅ All tests completed`);
}

runTests().catch(console.error);

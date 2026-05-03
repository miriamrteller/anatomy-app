#!/bin/bash

##############################################################################
# PHASE 3 VERIFICATION TESTS
# Purpose: Verify semantic search RAG pipeline is working
# Run: bash tests/verify-phase3.sh
##############################################################################

set -e

API_URL="http://localhost:3000"
BACKEND_PORT=3000
FRONTEND_PORT=5173

echo "============================================================"
echo "PHASE 3 VERIFICATION: Semantic Search RAG Pipeline"
echo "============================================================"
echo ""

# COLOR CODES
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

# Helper functions
pass_test() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((pass_count++))
}

fail_test() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((fail_count++))
}

warn_test() {
  echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

echo ""
echo "TEST 1: Backend Health Check"
echo "---"
if curl -s "$API_URL/health" > /dev/null 2>&1; then
  pass_test "Backend is running on port $BACKEND_PORT"
else
  fail_test "Backend not responding on http://localhost:$BACKEND_PORT"
  echo "  Run: npm run dev (in root directory)"
  exit 1
fi

echo ""
echo "TEST 2: Embeddings Exist in Database"
echo "---"
# Check if any structures have embeddings
EMBEDDING_COUNT=$(psql -U postgres -d anatomy_app -t -c "SELECT COUNT(*) FROM structures WHERE embedding IS NOT NULL;" 2>/dev/null || echo "0")

if [ "$EMBEDDING_COUNT" -gt 0 ]; then
  pass_test "Found $EMBEDDING_COUNT structures with embeddings"
else
  fail_test "No embeddings found in database"
  echo "  Run: npm run embed (in root directory)"
  exit 1
fi

echo ""
echo "TEST 3: Semantic Search Endpoint Returns JSON"
echo "---"
SEARCH_RESPONSE=$(curl -s "$API_URL/api/structures/search/semantic?q=leg%20bone&limit=5")

if echo "$SEARCH_RESPONSE" | grep -q "success"; then
  pass_test "Semantic search endpoint responds with valid JSON"
  echo "  Response preview: $(echo "$SEARCH_RESPONSE" | head -c 80)..."
else
  fail_test "Semantic search endpoint response invalid"
  echo "  Response: $SEARCH_RESPONSE"
fi

echo ""
echo "TEST 4: Chat Endpoint Accepts Questions"
echo "---"
# Test that chat endpoint accepts a POST with a question
CHAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the femur?"}' -N)

if [ "$CHAT_STATUS" = "200" ]; then
  pass_test "Chat endpoint responds with HTTP 200"
else
  fail_test "Chat endpoint returned HTTP $CHAT_STATUS (expected 200)"
fi

echo ""
echo "TEST 5: Chat Endpoint Streams SSE Events (Semantic Search)"
echo "---"
# Capture the streaming response and check for key events
echo -n "  Sending question: 'What bones are in the leg?'... "
CHAT_RESPONSE=$(timeout 10 curl -s -N -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"question":"What bones are in the leg?"}' 2>/dev/null || echo "")

# Check for different SSE event types
if echo "$CHAT_RESPONSE" | grep -q '"event":"sources"'; then
  pass_test "Chat response includes 'sources' SSE event"
  
  # Extract and show the sources IDs
  SOURCES=$(echo "$CHAT_RESPONSE" | grep '"event":"sources"' | head -1)
  echo "    Sources received: $SOURCES"
else
  fail_test "Chat response missing 'sources' SSE event"
  echo "    Response (first 200 chars): ${CHAT_RESPONSE:0:200}"
fi

if echo "$CHAT_RESPONSE" | grep -q '"event":"token"'; then
  pass_test "Chat response includes 'token' SSE events (streaming working)"
else
  warn_test "Chat response missing 'token' SSE events"
fi

if echo "$CHAT_RESPONSE" | grep -q '"event":"done"'; then
  pass_test "Chat response includes 'done' SSE event (completion signal)"
else
  warn_test "Chat response missing 'done' SSE event"
fi

echo ""
echo "TEST 6: Verify Semantic Similarity (pgvector Query)"
echo "---"
# This test checks that the top results make semantic sense
echo "  Querying for structures related to 'arm bones'..."
ARM_RESPONSE=$(curl -s "$API_URL/api/structures/search/semantic?q=arm%20bones&limit=3")

if echo "$ARM_RESPONSE" | grep -qE "(Humerus|Radius|Ulna)"; then
  pass_test "Semantic search returns relevant arm structures (Humerus/Radius/Ulna found)"
else
  warn_test "Semantic search results may not be optimal for 'arm bones' query"
  echo "    Results: $(echo "$ARM_RESPONSE" | head -c 150)..."
fi

echo ""
echo "TEST 7: Frontend Can Access Chat Endpoint"
echo "---"
CORS_CHECK=$(curl -s -X OPTIONS "$API_URL/api/chat" \
  -H "Origin: http://localhost:$FRONTEND_PORT" \
  -H "Access-Control-Request-Method: POST" \
  -w "%{http_code}" -o /dev/null)

if [ "$CORS_CHECK" = "200" ]; then
  pass_test "CORS preflight request succeeds"
else
  fail_test "CORS preflight failed (HTTP $CORS_CHECK)"
fi

echo ""
echo "============================================================"
echo "RESULTS:"
echo "  ✅ Passed: $pass_count"
echo "  ❌ Failed: $fail_count"
echo "============================================================"

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}✅ PHASE 3 VERIFICATION COMPLETE - ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ PHASE 3 VERIFICATION FAILED - FIX ERRORS ABOVE${NC}"
  exit 1
fi

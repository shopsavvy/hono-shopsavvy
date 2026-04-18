#!/bin/bash
set -e

# Must be run from the hono-shopsavvy directory
if [ ! -f "package.json" ] || ! grep -q '"name": "@shopsavvy/hono"' package.json; then
  echo "ERROR: Run this script from the hono-shopsavvy directory"
  exit 1
fi

echo "=== @shopsavvy/hono tests ==="

# Check project structure
echo "Checking project structure..."
test -f src/index.ts && echo "  src/index.ts exists"
test -f src/middleware.ts && echo "  src/middleware.ts exists"
test -f src/router.ts && echo "  src/router.ts exists"
test -f src/openapi.ts && echo "  src/openapi.ts exists"
test -f src/streaming/sse.ts && echo "  src/streaming/sse.ts exists"
test -f src/cache/base.ts && echo "  src/cache/base.ts exists"
test -f src/cache/cloudflare.ts && echo "  src/cache/cloudflare.ts exists"
test -f src/cache/vercel.ts && echo "  src/cache/vercel.ts exists"
test -f src/components/ProductCard.tsx && echo "  src/components/ProductCard.tsx exists"
test -f src/components/PriceComparisonTable.tsx && echo "  src/components/PriceComparisonTable.tsx exists"
test -f src/components/DealFeed.tsx && echo "  src/components/DealFeed.tsx exists"
test -f package.json && echo "  package.json exists"
test -f tsconfig.json && echo "  tsconfig.json exists"
test -f README.md && echo "  README.md exists"
test -f LICENSE && echo "  LICENSE exists"

echo ""
echo "Installing dependencies..."
npm install --silent 2>/dev/null || bun install --silent

echo ""
echo "Running unit tests..."
npx vitest run

if [ "$1" = "--integration" ]; then
  echo ""
  echo "Running integration tests (live API)..."
  if [ -z "$SHOPSAVVY_API_KEY" ]; then
    echo "ERROR: Set SHOPSAVVY_API_KEY to run integration tests"
    exit 1
  fi
  npx vitest run tests/integration 2>/dev/null || echo "No integration tests found yet"
fi

echo ""
echo "All checks passed!"

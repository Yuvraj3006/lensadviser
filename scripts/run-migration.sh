#!/bin/bash
# Simple script to run the migration
# This will compile TypeScript and run the migration script

echo "🚀 Running Unified BenefitFeature Migration..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules not found. Please run 'npm install' first."
  exit 1
fi

# Try using tsx if available
if command -v npx &> /dev/null; then
  echo "📦 Attempting to run with tsx..."
  npx tsx scripts/migrate-to-unified-benefit-feature.ts 2>&1
  exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    exit 0
  fi
fi

# Fallback: Compile and run
echo "📦 Compiling TypeScript..."
npx tsc scripts/migrate-to-unified-benefit-feature.ts \
  --outDir dist \
  --module commonjs \
  --esModuleInterop \
  --resolveJsonModule \
  --target ES2020 \
  --skipLibCheck 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Compilation successful. Running migration..."
  node dist/scripts/migrate-to-unified-benefit-feature.js
  exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    # Clean up compiled files
    rm -rf dist/scripts
    exit 0
  else
    echo "❌ Migration failed with exit code $exit_code"
    exit $exit_code
  fi
else
  echo "❌ Compilation failed"
  exit 1
fi

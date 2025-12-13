#!/bin/bash
# Script to help identify pages that need responsive updates

echo "=== Pages with non-responsive headers ==="
find app -name "page.tsx" -exec grep -l "flex items-center justify-between.*mb-" {} \;

echo ""
echo "=== Pages with text-3xl headings ==="
find app -name "page.tsx" -exec grep -l "text-3xl font-bold" {} \;

echo ""
echo "=== Pages with p-8 padding ==="
find app -name "page.tsx" -exec grep -l "className.*p-8" {} \;

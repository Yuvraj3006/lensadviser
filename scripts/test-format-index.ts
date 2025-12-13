/**
 * Test script for formatIndexDisplay function
 */

function formatIndexDisplay(index: string | undefined | null): string {
  if (!index) return '';
  
  if (index.startsWith('INDEX_')) {
    // Extract the number part after INDEX_
    const numPart = index.replace('INDEX_', '');
    // Convert INDEX_156 → 1.56, INDEX_167 → 1.67, INDEX_174 → 1.74
    // Pattern: INDEX_1XX → 1.XX (remove the first digit)
    if (numPart.length >= 3 && numPart.startsWith('1')) {
      return `1.${numPart.substring(1)}`;
    }
    // Fallback: just replace INDEX_ with 1.
    return index.replace('INDEX_', '1.');
  }
  
  return index;
}

// Test cases
console.log('Testing formatIndexDisplay:');
console.log('INDEX_156 →', formatIndexDisplay('INDEX_156')); // Should be 1.56
console.log('INDEX_160 →', formatIndexDisplay('INDEX_160')); // Should be 1.60
console.log('INDEX_167 →', formatIndexDisplay('INDEX_167')); // Should be 1.67
console.log('INDEX_174 →', formatIndexDisplay('INDEX_174')); // Should be 1.74
console.log('INDEX_150 →', formatIndexDisplay('INDEX_150')); // Should be 1.50
console.log('Already formatted 1.67 →', formatIndexDisplay('1.67')); // Should be 1.67
console.log('Empty →', formatIndexDisplay('')); // Should be empty
console.log('Undefined →', formatIndexDisplay(undefined)); // Should be empty


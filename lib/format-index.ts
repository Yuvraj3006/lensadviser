/**
 * Utility function to format lens index for display
 * Converts INDEX_156 → 1.56, INDEX_167 → 1.67, INDEX_174 → 1.74
 */
export function formatIndexDisplay(index: string | undefined | null): string {
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


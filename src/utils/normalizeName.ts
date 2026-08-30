/**
 * Utility functions for normalizing, validating, and formatting Ethiopian names in Latin/English characters.
 */

/**
 * Normalizes an Ethiopian name for index matching, search, and duplicate prevention:
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces
 * - Converts to lowercase
 * - Strips special punctuation except allowed hyphens and apostrophes
 */
export function normalizeEthiopianName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z\s\-']/g, '');
}

/**
 * Validates if the input string contains allowed English/Latin characters for Ethiopian names.
 * Allowed: A-Z, a-z, spaces, hyphens, and apostrophes (e.g. Haile-Mariam, Desta, D'Esta, Tsige).
 */
export function isValidEthiopianNameString(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  // English/Latin letters, spaces, hyphens, single quotes
  const validRegex = /^[A-Za-z]+([A-Za-z\s\-']*[A-Za-z]+)?$/;
  return validRegex.test(trimmed);
}

/**
 * Capitalizes Ethiopian names properly, taking into account hyphenated compound names
 * such as "Haile-Mariam", "Gebre-Egziabher", "Welde-Mikael", etc.
 */
export function formatEthiopianCapitalization(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(' ')
    .map(word => {
      // Handle hyphenated components e.g. Haile-Mariam
      return word
        .split('-')
        .map(part => {
          if (!part) return '';
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('-');
    })
    .join(' ');
}

/**
 * Finds highlight indices range [start, end] for matching substrings.
 */
export function findHighlightRanges(text: string, query: string): [number, number][] {
  if (!text || !query) return [];
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const ranges: [number, number][] = [];
  let startIndex = 0;

  while (startIndex < normalizedText.length) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, startIndex);
    if (matchIndex === -1) break;
    ranges.push([matchIndex, matchIndex + normalizedQuery.length]);
    startIndex = matchIndex + normalizedQuery.length;
  }

  return ranges;
}

/**
 * Computes Levenshtein Distance for fuzzy matching.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

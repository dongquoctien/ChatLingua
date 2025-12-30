/**
 * Flexible answer matching utilities for exercises
 */

/**
 * Normalize text for comparison:
 * - Lowercase
 * - Remove extra whitespace
 * - Remove punctuation (except apostrophe for contractions)
 * - Normalize apostrophes
 */
export function normalizeAnswer(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .replace(/[.,!?;:"""''()[\]{}]/g, '')  // Remove punctuation
    .replace(/[']/g, "'")  // Normalize apostrophes
    .trim();
}

/**
 * Calculate Levenshtein distance for typo tolerance
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Exercise types that benefit from flexible matching
 */
const FLEXIBLE_TYPES = ['fill_blank', 'translation', 'spelling', 'listening', 'cloze', 'verb_conjugation'];

/**
 * Flexible answer matching for exercises
 * - Supports multiple correct answers separated by "|"
 * - Normalizes text (removes punctuation, extra spaces)
 * - Allows minor typos for flexible types (1 typo per 5 chars)
 *
 * @param userAnswer - The user's answer
 * @param correctAnswer - The correct answer (can contain "|" for alternatives)
 * @param exerciseType - Type of exercise for flexible matching rules
 * @returns true if answer is considered correct
 */
export function isAnswerCorrect(
  userAnswer: string,
  correctAnswer: string,
  exerciseType?: string
): boolean {
  if (!correctAnswer) return false;
  if (!userAnswer) return false;

  const normalizedUser = normalizeAnswer(userAnswer);
  if (!normalizedUser) return false;

  // Support multiple correct answers separated by "|"
  const correctOptions = correctAnswer.split('|').map(opt => normalizeAnswer(opt));

  for (const correctOpt of correctOptions) {
    if (!correctOpt) continue;

    // Exact match after normalization
    if (normalizedUser === correctOpt) {
      return true;
    }

    // For flexible types - allow minor typos
    if (FLEXIBLE_TYPES.includes(exerciseType || '')) {
      // Only allow typos for answers longer than 3 chars
      if (correctOpt.length > 3) {
        const maxTypos = Math.max(1, Math.floor(correctOpt.length / 5));
        const distance = levenshteinDistance(normalizedUser, correctOpt);

        if (distance <= maxTypos) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Simple exact match (case-insensitive, trimmed)
 * Use for multiple_choice, matching where exact match is required
 */
export function isExactMatch(userAnswer: string, correctAnswer: string): boolean {
  if (!correctAnswer || !userAnswer) return false;
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

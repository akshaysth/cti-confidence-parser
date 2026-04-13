import type { WELMatch, WELEntry } from '../types';
import { WEL_DATABASE } from './welDatabase';

export interface WELSuggestion {
  phrase: string;
  sentence: string;
  confidence: number;
  reasoning: string;
  similarTo: string[];
  suggestedTier: string;
}

// Common words that might indicate probability but aren't WEL
const PROBABILITY_INDICATORS = [
  'perhaps', 'maybe', 'possibly', 'probably', 'likely', 'unlikely',
  'presumably', 'ostensibly', 'apparently', 'seemingly', 'presumably',
  'evidently', 'presumably', 'arguably', 'presumably', 'conceivably',
  'feasibly', 'potentially', 'presumably', 'purportedly', 'reputedly',
];

// Words that look like WEL but aren't
const FALSE_POSITIVES = [
  'sure', 'definitely', 'absolutely', 'clearly', 'obviously',
  'undoubtedly', 'certainly', 'definitely', 'inevitably', 'necessarily',
];

/**
 * Calculate string similarity using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function stringSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Find similar phrases in the WEL database
 */
function findSimilarPhrases(phrase: string): string[] {
  const similar: string[] = [];
  const threshold = 0.6;

  for (const entry of WEL_DATABASE) {
    // Check main phrase
    if (stringSimilarity(phrase, entry.phrase) >= threshold) {
      similar.push(entry.phrase);
      continue;
    }

    // Check aliases
    for (const alias of entry.aliases) {
      if (stringSimilarity(phrase, alias) >= threshold) {
        similar.push(entry.phrase);
        break;
      }
    }
  }

  return [...new Set(similar)];
}

/**
 * Check if a phrase is already in the WEL database
 */
function isInWELDatabase(phrase: string): boolean {
  const lowerPhrase = phrase.toLowerCase();

  for (const entry of WEL_DATABASE) {
    if (entry.phrase.toLowerCase() === lowerPhrase) return true;
    if (entry.aliases.some((a) => a.toLowerCase() === lowerPhrase)) return true;
  }

  return false;
}

/**
 * Suggest a tier based on similar phrases
 */
function suggestTier(similarPhrases: string[]): string {
  if (similarPhrases.length === 0) return 'unknown';

  // Find the most common tier among similar phrases
  const tierCounts: Record<string, number> = {};

  for (const phrase of similarPhrases) {
    const entry = WEL_DATABASE.find(
      (e) =>
        e.phrase.toLowerCase() === phrase.toLowerCase() ||
        e.aliases.some((a) => a.toLowerCase() === phrase.toLowerCase())
    );
    if (entry) {
      tierCounts[entry.tier] = (tierCounts[entry.tier] || 0) + 1;
    }
  }

  const sortedTiers = Object.entries(tierCounts).sort((a, b) => b[1] - a[1]);
  return sortedTiers[0]?.[0] || 'unknown';
}

/**
 * Analyze matches and generate suggestions for potential new WEL phrases
 */
export function analyzeForSuggestions(matches: WELMatch[]): WELSuggestion[] {
  const suggestions: WELSuggestion[] = [];
  const seenPhrases = new Set<string>();

  for (const match of matches) {
    // Only consider matches with high model confidence that aren't already WEL
    if (
      match.status === 'done' &&
      match.modelIsWEL &&
      match.modelConfidence !== null &&
      match.modelConfidence >= 70 &&
      !isInWELDatabase(match.matchedPhrase)
    ) {
      const phrase = match.matchedPhrase.toLowerCase();

      // Skip if we've already seen this phrase
      if (seenPhrases.has(phrase)) continue;
      seenPhrases.add(phrase);

      // Skip false positives
      if (FALSE_POSITIVES.includes(phrase)) continue;

      // Find similar phrases
      const similar = findSimilarPhrases(match.matchedPhrase);

      // Only suggest if we have some similarity or it's a clear probability indicator
      if (
        similar.length > 0 ||
        PROBABILITY_INDICATORS.some((indicator) => phrase.includes(indicator))
      ) {
        suggestions.push({
          phrase: match.matchedPhrase,
          sentence: match.sentence,
          confidence: match.modelConfidence,
          reasoning: match.modelReasoning || '',
          similarTo: similar,
          suggestedTier: suggestTier(similar),
        });
      }
    }
  }

  // Sort by confidence (highest first)
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get suggestion quality score
 */
export function getSuggestionQuality(suggestion: WELSuggestion): 'high' | 'medium' | 'low' {
  if (suggestion.confidence >= 85 && suggestion.similarTo.length > 0) return 'high';
  if (suggestion.confidence >= 70 && suggestion.similarTo.length > 0) return 'medium';
  return 'low';
}

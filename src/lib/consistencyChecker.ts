import type { WELMatch, WELTier } from '../types';

export interface ConsistencyIssue {
  type: 'conflict' | 'range_gap' | 'cluster';
  severity: 'warning' | 'info';
  message: string;
  matches: WELMatch[];
  description?: string;
}

export interface ConsistencyReport {
  issues: ConsistencyIssue[];
  tierDistribution: Record<WELTier, number>;
  confidenceRange: [number, number];
  averageConfidence: number;
  isConsistent: boolean;
}

const TIER_ORDER: WELTier[] = ['remote', 'unlikely', 'even', 'probable', 'certain'];
const TIER_LEVEL: Record<WELTier, number> = {
  remote: 0,
  unlikely: 1,
  even: 2,
  probable: 3,
  certain: 4,
};

/**
 * Analyze WEL matches for consistency issues
 */
export function analyzeConsistency(matches: WELMatch[]): ConsistencyReport {
  const issues: ConsistencyIssue[] = [];

  // Calculate tier distribution
  const tierDistribution: Record<WELTier, number> = {
    certain: 0,
    probable: 0,
    even: 0,
    unlikely: 0,
    remote: 0,
  };

  matches.forEach((m) => {
    tierDistribution[m.entry.tier]++;
  });

  // Calculate confidence metrics (using kentCenter as confidence proxy)
  const confidences = matches.map((m) => m.entry.kentCenter);
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;
  const minConfidence = confidences.length > 0 ? Math.min(...confidences) : 0;
  const maxConfidence = confidences.length > 0 ? Math.max(...confidences) : 0;

  // Check for conflicts (high variance in nearby text)
  const conflicts = findConflicts(matches);
  issues.push(...conflicts);

  // Check for range gaps
  const gaps = findRangeGaps(matches);
  issues.push(...gaps);

  // Check for tier clusters (many matches in same tier)
  const clusters = findTierClusters(tierDistribution, matches.length);
  issues.push(...clusters);

  // Determine overall consistency
  const hasCriticalIssues = issues.some((i) => i.severity === 'warning' && i.type === 'conflict');

  return {
    issues,
    tierDistribution,
    confidenceRange: [minConfidence, maxConfidence],
    averageConfidence: Math.round(avgConfidence),
    isConsistent: !hasCriticalIssues,
  };
}

/**
 * Find conflicts where high-confidence and low-confidence terms appear close together
 */
function findConflicts(matches: WELMatch[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const conflicts: WELMatch[] = [];

  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      const m1 = matches[i];
      const m2 = matches[j];

      const tierDiff = Math.abs(TIER_LEVEL[m1.entry.tier] - TIER_LEVEL[m2.entry.tier]);
      const charDistance = Math.abs(m1.charOffset - m2.charOffset);

      // Conflict: tier difference >= 2 and within 1000 characters
      if (tierDiff >= 2 && charDistance < 1000) {
        // Check if this pair is already in conflicts
        const isNew = !conflicts.some(
          (m) =>
            (m.id === m1.id && conflicts.some((cm) => cm.id === m2.id)) ||
            (m.id === m2.id && conflicts.some((cm) => cm.id === m1.id))
        );

        if (isNew) {
          conflicts.push(m1, m2);
          issues.push({
            type: 'conflict',
            severity: 'warning',
            message: `Conflicting confidence levels nearby`,
            matches: [m1, m2],
            description: `"${m1.matchedPhrase}" (${m1.entry.kentRange[0]}-${m1.entry.kentRange[1]}%) and "${m2.matchedPhrase}" (${m2.entry.kentRange[0]}-${m2.entry.kentRange[1]}%) appear close together`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Find gaps in the confidence range
 */
function findRangeGaps(matches: WELMatch[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  if (matches.length < 2) return issues;

  const presentTiers = new Set(matches.map((m) => m.entry.tier));
  const allTiers = TIER_ORDER;

  // Check if there are gaps in the tier progression
  const presentIndices = allTiers
    .map((t, i) => ({ tier: t, index: i, present: presentTiers.has(t) }))
    .filter((t) => t.present);

  for (let i = 0; i < presentIndices.length - 1; i++) {
    const gap = presentIndices[i + 1].index - presentIndices[i].index;
    if (gap > 1) {
      const skippedTiers = allTiers.slice(presentIndices[i].index + 1, presentIndices[i + 1].index);
      issues.push({
        type: 'range_gap',
        severity: 'info',
        message: `Gap in confidence range`,
        matches: [],
        description: `Missing tiers: ${skippedTiers.join(', ')}`,
      });
    }
  }

  return issues;
}

/**
 * Find tier clusters (many matches in same tier)
 */
function findTierClusters(
  distribution: Record<WELTier, number>,
  totalMatches: number
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  if (totalMatches < 5) return issues;

  const threshold = totalMatches * 0.6; // 60% threshold

  (Object.entries(distribution) as [WELTier, number][]).forEach(([tier, count]) => {
    if (count >= threshold && count >= 3) {
      issues.push({
        type: 'cluster',
        severity: 'info',
        message: `Cluster of "${tier}" assessments`,
        matches: [],
        description: `${count} out of ${totalMatches} assessments (${Math.round((count / totalMatches) * 100)}%) use "${tier}"`,
      });
    }
  });

  return issues;
}

/**
 * Get color for consistency issue severity
 */
export function getIssueColor(severity: ConsistencyIssue['severity']): string {
  switch (severity) {
    case 'warning':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'info':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

/**
 * Get icon for consistency issue type
 */
export function getIssueIcon(type: ConsistencyIssue['type']): string {
  switch (type) {
    case 'conflict':
      return '⚠️';
    case 'range_gap':
      return '📊';
    case 'cluster':
      return '📈';
    default:
      return 'ℹ️';
  }
}

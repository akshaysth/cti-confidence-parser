import type { WELEntry, WELTier } from '../types';

// Sherman Kent's Words of Estimative Language
// Sources: "Words of Estimative Language" (Kent, 1964, Studies in Intelligence)
// and ICD 203 / IC standard probability terms.

export const WEL_DATABASE: WELEntry[] = [
  // --- CERTAIN tier (75–100%) ---
  {
    phrase: 'certain',
    aliases: ['certainly', 'certainty'],
    kentRange: [93, 100],
    kentCenter: 97,
    tier: 'certain',
    source: 'kent-original',
  },
  {
    phrase: 'virtual certainty',
    aliases: ['virtually certain', 'near certainty', 'nearly certain'],
    kentRange: [93, 100],
    kentCenter: 95,
    tier: 'certain',
    source: 'kent-expanded',
  },
  {
    phrase: 'almost certainly',
    aliases: ['almost certain'],
    kentRange: [87, 93],
    kentCenter: 90,
    tier: 'certain',
    source: 'kent-original',
  },
  {
    phrase: 'highly probable',
    aliases: ['highly likely', 'high probability', 'highly confident'],
    kentRange: [75, 90],
    kentCenter: 83,
    tier: 'certain',
    source: 'kent-expanded',
  },

  // --- PROBABLE tier (55–75%) ---
  {
    phrase: 'probable',
    aliases: ['probably'],
    kentRange: [55, 75],
    kentCenter: 75,
    tier: 'probable',
    source: 'kent-original',
  },
  {
    phrase: 'likely',
    aliases: ['likelihood'],
    kentRange: [55, 75],
    kentCenter: 65,
    tier: 'probable',
    source: 'ic-standard',
  },
  {
    phrase: 'we believe',
    aliases: [],
    kentRange: [55, 75],
    kentCenter: 65,
    tier: 'probable',
    source: 'ic-standard',
  },
  {
    phrase: 'we assess',
    aliases: [
      'we judge',
      'we estimate',
      'analysts assess',
      'analysts believe',
      'analysts judge',
    ],
    kentRange: [55, 75],
    kentCenter: 65,
    tier: 'probable',
    source: 'ic-standard',
  },
  {
    phrase: 'better than even',
    aliases: ['better-than-even'],
    kentRange: [55, 70],
    kentCenter: 62,
    tier: 'probable',
    source: 'kent-original',
  },

  // --- EVEN tier (45–55%) ---
  {
    phrase: 'roughly even',
    aliases: [
      'about even',
      'roughly even chance',
      'even chance',
      'coin toss',
      'fifty-fifty',
    ],
    kentRange: [45, 55],
    kentCenter: 50,
    tier: 'even',
    source: 'kent-original',
  },

  // --- UNLIKELY tier (15–50%) ---
  {
    phrase: 'possibly',
    aliases: ['possible', 'possibility'],
    kentRange: [25, 50],
    kentCenter: 37,
    tier: 'unlikely',
    source: 'kent-expanded',
  },
  {
    phrase: 'may',
    aliases: ['might', 'could'],
    kentRange: [25, 50],
    kentCenter: 37,
    tier: 'unlikely',
    source: 'kent-expanded',
  },
  {
    phrase: 'unlikely',
    aliases: ['not likely'],
    kentRange: [20, 45],
    kentCenter: 30,
    tier: 'unlikely',
    source: 'kent-original',
  },
  {
    phrase: 'probably not',
    aliases: [],
    kentRange: [20, 45],
    kentCenter: 30,
    tier: 'unlikely',
    source: 'kent-original',
  },
  {
    phrase: 'improbable',
    aliases: ['doubtful', 'we doubt'],
    kentRange: [10, 25],
    kentCenter: 17,
    tier: 'unlikely',
    source: 'kent-original',
  },

  // --- REMOTE tier (0–15%) ---
  {
    phrase: 'remote',
    aliases: ['remotely possible', 'remotely likely'],
    kentRange: [5, 15],
    kentCenter: 10,
    tier: 'remote',
    source: 'kent-original',
  },
  {
    phrase: 'little chance',
    aliases: ['small chance', 'slight chance', 'slim chance'],
    kentRange: [5, 15],
    kentCenter: 10,
    tier: 'remote',
    source: 'kent-expanded',
  },
  {
    phrase: 'almost certainly not',
    aliases: ['almost no chance'],
    kentRange: [3, 7],
    kentCenter: 5,
    tier: 'remote',
    source: 'kent-original',
  },
  {
    phrase: 'impossible',
    aliases: ['virtually impossible', 'near impossible'],
    kentRange: [0, 3],
    kentCenter: 1,
    tier: 'remote',
    source: 'kent-expanded',
  },
];

// Build a single regex matching all phrases and aliases (longest first to
// prevent shorter sub-phrases from stealing matches).
export function buildWELRegex(): RegExp {
  const allPhrases: string[] = [];
  for (const entry of WEL_DATABASE) {
    allPhrases.push(entry.phrase, ...entry.aliases);
  }
  allPhrases.sort((a, b) => b.length - a.length);
  const escaped = allPhrases.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}

export function findWELEntry(phrase: string): WELEntry | undefined {
  const lower = phrase.toLowerCase();
  return WEL_DATABASE.find(
    (entry) =>
      entry.phrase.toLowerCase() === lower ||
      entry.aliases.some((a) => a.toLowerCase() === lower),
  );
}

// Extract the sentence (or sentence fragment) surrounding a match.
export function extractSentence(
  text: string,
  matchIndex: number,
  matchLength: number,
): string {
  const WINDOW = 400;
  const winStart = Math.max(0, matchIndex - WINDOW);
  const winEnd = Math.min(text.length, matchIndex + matchLength + WINDOW);
  const window = text.slice(winStart, winEnd);
  const matchInWin = matchIndex - winStart;

  let sentStart = 0;
  for (let i = matchInWin - 1; i >= 0; i--) {
    if (['.', '!', '?', '\n'].includes(window[i])) {
      sentStart = i + 1;
      break;
    }
  }

  let sentEnd = window.length;
  for (let i = matchInWin + matchLength; i < window.length; i++) {
    if (['.', '!', '?', '\n'].includes(window[i])) {
      sentEnd = i + 1;
      break;
    }
  }

  return window.slice(sentStart, sentEnd).trim();
}

export interface RawWELMatch {
  matchedPhrase: string;
  entry: WELEntry;
  charOffset: number;
  sentence: string;
}

export function detectWEL(text: string): RawWELMatch[] {
  const regex = buildWELRegex();
  const results: RawWELMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchedPhrase = match[0];
    // Build a lookup map keyed by lowercase phrase for case-insensitive matching
    const entry = WEL_DATABASE.find(
      (entry) =>
        entry.phrase.toLowerCase() === matchedPhrase.toLowerCase() ||
        entry.aliases.some((a) => a.toLowerCase() === matchedPhrase.toLowerCase()),
    );
    if (!entry) continue;

    const sentence = extractSentence(text, match.index, matchedPhrase.length);
    results.push({ matchedPhrase, entry, charOffset: match.index, sentence });
  }

  return results;
}

export const TIER_ORDER: WELTier[] = [
  'certain',
  'probable',
  'even',
  'unlikely',
  'remote',
];

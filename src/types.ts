export type BackendType = 'ollama' | 'openai-compatible';

export interface ModelConfig {
  backend: BackendType;
  endpoint: string;
  model: string;
  apiKey: string;
}

export type WELTier = 'certain' | 'probable' | 'even' | 'unlikely' | 'remote';

export interface WELEntry {
  phrase: string;
  aliases: string[];
  kentRange: [number, number];
  kentCenter: number;
  tier: WELTier;
  source: 'kent-original' | 'kent-expanded' | 'ic-standard';
}

export type MatchStatus = 'pending' | 'analyzing' | 'done' | 'error' | 'skipped';

export const TIER_ORDER: WELTier[] = [
  'certain',
  'probable',
  'even',
  'unlikely',
  'remote',
];

export interface QualityScore {
  score: number;
  explanation: string;
}

export interface IntelligenceClaim {
  id: string;
  claim: string;
  confidence: string;
  confidenceLevel: number;
  timeframe?: string;
  evidence: string[];
  assumptions: string[];
  sourceReferences: string[];
  entities: string[];
}

export interface WELMatch {
  id: string;
  entry: WELEntry;
  matchedPhrase: string;
  sentence: string;
  charOffset: number;
  modelConfidence: number | null;
  modelIsWEL: boolean | null;
  modelReasoning: string | null;
  qualityScore?: QualityScore;
  status: MatchStatus;
  error?: string;
}

export type InputMode = 'text' | 'pdf' | 'url';

// Theme-aware tier colors using CSS variables
export const TIER_META: Record<
  WELTier,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  certain: {
    label: 'Certain',
    color: 'text-[hsl(var(--tier-certain))]',
    bgColor: 'bg-[hsl(var(--tier-certain-bg))]',
    borderColor: 'border-[hsl(var(--tier-certain))]',
  },
  probable: {
    label: 'Probable',
    color: 'text-[hsl(var(--tier-probable))]',
    bgColor: 'bg-[hsl(var(--tier-probable-bg))]',
    borderColor: 'border-[hsl(var(--tier-probable))]',
  },
  even: {
    label: 'Even Odds',
    color: 'text-[hsl(var(--tier-even))]',
    bgColor: 'bg-[hsl(var(--tier-even-bg))]',
    borderColor: 'border-[hsl(var(--tier-even))]',
  },
  unlikely: {
    label: 'Unlikely',
    color: 'text-[hsl(var(--tier-unlikely))]',
    bgColor: 'bg-[hsl(var(--tier-unlikely-bg))]',
    borderColor: 'border-[hsl(var(--tier-unlikely))]',
  },
  remote: {
    label: 'Remote',
    color: 'text-[hsl(var(--tier-remote))]',
    bgColor: 'bg-[hsl(var(--tier-remote-bg))]',
    borderColor: 'border-[hsl(var(--tier-remote))]',
  },
};

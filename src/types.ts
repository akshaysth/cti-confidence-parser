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

export const TIER_META: Record<
  WELTier,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  certain: {
    label: 'Certain',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-900/30',
    borderColor: 'border-emerald-800',
  },
  probable: {
    label: 'Probable',
    color: 'text-lime-400',
    bgColor: 'bg-lime-900/30',
    borderColor: 'border-lime-800',
  },
  even: {
    label: 'Even Odds',
    color: 'text-sky-400',
    bgColor: 'bg-sky-900/30',
    borderColor: 'border-sky-800',
  },
  unlikely: {
    label: 'Unlikely',
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-800',
  },
  remote: {
    label: 'Remote',
    color: 'text-rose-400',
    bgColor: 'bg-rose-900/30',
    borderColor: 'border-rose-800',
  },
};

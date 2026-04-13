import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader, CheckCircle, XCircle, AlertCircle, Star } from 'lucide-react';
import type { WELMatch, WELTier } from '../types';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface Props {
  match: WELMatch;
  index: number;
}

const TIER_LEFT_BORDER: Record<WELTier, string> = {
  certain: 'border-l-tier-certain',
  probable: 'border-l-tier-probable',
  even: 'border-l-tier-even',
  unlikely: 'border-l-tier-unlikely',
  remote: 'border-l-tier-remote',
};

const TIER_LABEL: Record<WELTier, string> = {
  certain: 'Certain',
  probable: 'Probable',
  even: 'Even Odds',
  unlikely: 'Unlikely',
  remote: 'Remote',
};

function HighlightedSentence({ sentence, phrase }: { sentence: string; phrase: string }) {
  const idx = sentence.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return <span className="font-serif text-sm leading-relaxed text-foreground">{sentence}</span>;
  return (
    <span className="font-serif text-sm leading-relaxed text-foreground">
      {sentence.slice(0, idx)}
      <mark className="bg-secondary/70 text-foreground rounded-sm px-0.5 font-semibold not-italic">
        {sentence.slice(idx, idx + phrase.length)}
      </mark>
      {sentence.slice(idx + phrase.length)}
    </span>
  );
}

function KentRangeBar({ range, center }: { range: [number, number]; center: number }) {
  return (
    <div className="space-y-1.5">
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-primary/25 rounded-full"
          style={{ left: `${range[0]}%`, width: `${range[1] - range[0]}%` }}
        />
        <div
          className="absolute h-full w-0.5 bg-primary/70 rounded-full"
          style={{ left: `${center}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-meta text-muted-foreground">
        <span>0%</span>
        <span className="text-primary font-medium">{range[0]}–{range[1]}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function ConfidenceDial({ confidence, isWEL }: { confidence: number; isWEL: boolean }) {
  const color = !isWEL
    ? 'text-muted-foreground'
    : confidence >= 75
    ? 'text-tier-certain'
    : confidence >= 40
    ? 'text-tier-unlikely'
    : 'text-tier-remote';

  return (
    <div className="flex flex-col items-center">
      <span className={cn('text-3xl font-sans font-bold tabular-nums', color)}>
        {confidence}<span className="text-lg">%</span>
      </span>
      <span className={cn('text-xs font-meta mt-0.5', isWEL ? 'text-tier-certain' : 'text-muted-foreground')}>
        {isWEL ? 'WEL Confirmed' : 'Not WEL'}
      </span>
    </div>
  );
}

export function WELCard({ match, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      'bg-card rounded-sm border-l-[3px] shadow-[0_1px_3px_rgba(4,22,39,0.06)]',
      TIER_LEFT_BORDER[match.entry.tier],
    )}>
      {/* Card header row */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/50">
        <span className="font-meta text-xs text-muted-foreground/60 tabular-nums w-5 text-right shrink-0">
          {index + 1}
        </span>

        <code className="font-sans font-semibold text-sm text-primary bg-primary/8 px-1.5 py-0.5 rounded-sm">
          {match.matchedPhrase}
        </code>

        <Badge variant={match.entry.tier}>
          {TIER_LABEL[match.entry.tier]}
        </Badge>

        <span className="font-meta text-xs text-muted-foreground/50 ml-auto">
          {match.entry.source === 'kent-original'
            ? 'Kent 1964'
            : match.entry.source === 'ic-standard'
            ? 'IC Standard'
            : 'Kent Expanded'}
        </span>

        {/* Status icon */}
        <div className="shrink-0">
          {match.status === 'pending' && (
            <span className="w-2 h-2 rounded-full bg-border inline-block" />
          )}
          {match.status === 'analyzing' && (
            <Loader className="w-3.5 h-3.5 text-primary/50 animate-spin" />
          )}
          {match.status === 'done' && match.modelIsWEL && (
            <CheckCircle className="w-3.5 h-3.5 text-tier-certain" />
          )}
          {match.status === 'done' && !match.modelIsWEL && (
            <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
          )}
          {match.status === 'error' && (
            <AlertCircle className="w-3.5 h-3.5 text-tier-unlikely" />
          )}
        </div>
      </div>

      {/* Sentence in context */}
      <div className="px-5 py-3 border-b border-border/50">
        <p className="font-meta text-xs text-muted-foreground mb-1.5">In context</p>
        <HighlightedSentence sentence={match.sentence} phrase={match.matchedPhrase} />
      </div>

      {/* Score panels */}
      <div className="grid grid-cols-2 divide-x divide-border/50">
        {/* Kent range */}
        <div className="px-5 py-4">
          <p className="font-meta text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Kent Probability Range
          </p>
          <KentRangeBar range={match.entry.kentRange} center={match.entry.kentCenter} />
          <p className="font-meta text-xs text-muted-foreground mt-2">
            Range{' '}
            <span className="text-foreground font-medium">
              {match.entry.kentRange[0]}–{match.entry.kentRange[1]}%
            </span>
            {' '}· Center{' '}
            <span className="text-foreground font-medium">{match.entry.kentCenter}%</span>
          </p>
        </div>

        {/* Model confidence */}
        <div className="px-5 py-4">
          <p className="font-meta text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Model Assessment
          </p>

          {match.status === 'pending' && (
            <p className="text-xs font-meta text-muted-foreground">Queued…</p>
          )}
          {match.status === 'analyzing' && (
            <div className="flex items-center gap-2 text-xs font-meta text-primary/60">
              <Loader className="w-3 h-3 animate-spin" />
              Analyzing with model…
            </div>
          )}
{match.status === 'done' && match.modelConfidence !== null && (
<div className="space-y-2">
<ConfidenceDial
confidence={match.modelConfidence}
isWEL={match.modelIsWEL ?? false}
/>
{match.qualityScore && (
<div className="mt-2 pt-2 border-t border-border/30">
<div className="flex items-center gap-1.5">
<div className="flex">
{[1, 2, 3, 4, 5].map((star) => (
<Star
key={star}
className={cn(
'w-3 h-3',
star <= (match.qualityScore?.score || 0)
? 'fill-amber-400 text-amber-400'
: 'text-slate-200'
)}
/>
))}
</div>
<span className="text-[10px] font-medium text-slate-600">
{match.qualityScore.score >= 4
? 'Excellent'
: match.qualityScore.score >= 3
? 'Good'
: match.qualityScore.score >= 2
? 'Fair'
: 'Poor'}
</span>
</div>
<p className="text-[10px] text-slate-400 mt-1">
{match.qualityScore.explanation}
</p>
</div>
)}
{match.modelReasoning && (
<div>
<button
onClick={() => setExpanded((v) => !v)}
className="flex items-center gap-1 text-xs font-meta text-muted-foreground hover:text-foreground transition-colors"
>
{expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
Reasoning
</button>
{expanded && (
<p className="mt-1.5 text-xs font-meta text-muted-foreground leading-relaxed">
{match.modelReasoning}
</p>
)}
</div>
)}
</div>
)}
          {match.status === 'error' && (
            <p className="text-xs font-meta text-destructive">{match.error ?? 'Analysis failed'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

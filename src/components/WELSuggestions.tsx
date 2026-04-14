import { useState, useMemo } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import type { WELMatch } from '../types';
import { TIER_META } from '../types';
import { analyzeForSuggestions, getSuggestionQuality, type WELSuggestion } from '../lib/welSuggestions';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

interface Props {
  matches: WELMatch[];
}

// Theme-aware quality colors
const QUALITY_COLORS = {
  high: {
    card: 'bg-success/10 border-success/30',
    badge: 'bg-success/20 text-success',
    icon: 'text-success',
  },
  medium: {
    card: 'bg-warning/10 border-warning/30',
    badge: 'bg-warning/20 text-warning',
    icon: 'text-warning',
  },
  low: {
    card: 'bg-muted border-border',
    badge: 'bg-muted-foreground/20 text-muted-foreground',
    icon: 'text-muted-foreground',
  },
};

export function WELSuggestions({ matches }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('wel-dismissed-suggestions');
    return new Set(saved ? JSON.parse(saved) : []);
  });
  const [added, setAdded] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('wel-added-suggestions');
    return new Set(saved ? JSON.parse(saved) : []);
  });

  const suggestions = useMemo(() => analyzeForSuggestions(matches), [matches]);

  // Filter out dismissed and added
  const activeSuggestions = useMemo(() => {
    return suggestions.filter((s) => !dismissed.has(s.phrase) && !added.has(s.phrase));
  }, [suggestions, dismissed, added]);

  const handleDismiss = (phrase: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(phrase);
    setDismissed(newDismissed);
    localStorage.setItem('wel-dismissed-suggestions', JSON.stringify([...newDismissed]));
  };

  const handleAdd = (phrase: string) => {
    const newAdded = new Set(added);
    newAdded.add(phrase);
    setAdded(newAdded);
    localStorage.setItem('wel-added-suggestions', JSON.stringify([...newAdded]));
    // In a real implementation, this would add to the WEL database
  };

  const highQuality = activeSuggestions.filter((s) => getSuggestionQuality(s) === 'high');
  const mediumQuality = activeSuggestions.filter((s) => getSuggestionQuality(s) === 'medium');
  const lowQuality = activeSuggestions.filter((s) => getSuggestionQuality(s) === 'low');

  if (activeSuggestions.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-foreground font-medium">No new WEL suggestions</p>
        <p className="text-xs text-muted-foreground mt-1">
          The model hasn't detected any potential new estimative phrases yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            Potential New WEL Terms
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {highQuality.length} high confidence · {mediumQuality.length} medium · {lowQuality.length} low
          </p>
        </div>
      </div>

      {/* High Priority Suggestions */}
      {highQuality.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">High Confidence</h4>
          {highQuality.map((suggestion) => (
            <SuggestionCard
              key={suggestion.phrase}
              suggestion={suggestion}
              quality="high"
              isExpanded={expandedId === suggestion.phrase}
              onToggle={() => setExpandedId(expandedId === suggestion.phrase ? null : suggestion.phrase)}
              onDismiss={() => handleDismiss(suggestion.phrase)}
              onAdd={() => handleAdd(suggestion.phrase)}
            />
          ))}
        </div>
      )}

      {/* Medium Priority Suggestions */}
      {mediumQuality.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Medium Confidence</h4>
          {mediumQuality.map((suggestion) => (
            <SuggestionCard
              key={suggestion.phrase}
              suggestion={suggestion}
              quality="medium"
              isExpanded={expandedId === suggestion.phrase}
              onToggle={() => setExpandedId(expandedId === suggestion.phrase ? null : suggestion.phrase)}
              onDismiss={() => handleDismiss(suggestion.phrase)}
              onAdd={() => handleAdd(suggestion.phrase)}
            />
          ))}
        </div>
      )}

      {/* Low Priority Suggestions */}
      {lowQuality.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Low Confidence</h4>
          {lowQuality.map((suggestion) => (
            <SuggestionCard
              key={suggestion.phrase}
              suggestion={suggestion}
              quality="low"
              isExpanded={expandedId === suggestion.phrase}
              onToggle={() => setExpandedId(expandedId === suggestion.phrase ? null : suggestion.phrase)}
              onDismiss={() => handleDismiss(suggestion.phrase)}
              onAdd={() => handleAdd(suggestion.phrase)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: WELSuggestion;
  quality: 'high' | 'medium' | 'low';
  isExpanded: boolean;
  onToggle: () => void;
  onDismiss: () => void;
  onAdd: () => void;
}

function SuggestionCard({
  suggestion,
  quality,
  isExpanded,
  onToggle,
  onDismiss,
  onAdd,
}: SuggestionCardProps) {
  const config = QUALITY_COLORS[quality];
  const tierMeta = TIER_META[suggestion.suggestedTier as keyof typeof TIER_META];

  return (
    <div className={cn('border rounded-lg overflow-hidden', config.card)}>
      <div
        className="p-3 flex items-start gap-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-sm font-semibold text-foreground">{suggestion.phrase}</code>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', config.badge)}>
              {suggestion.confidence}% model conf
            </span>
          </div>

          {suggestion.similarTo.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Similar to: {suggestion.similarTo.join(', ')}
            </p>
          )}

          {tierMeta && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-muted-foreground">Suggested tier:</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded font-medium',
                  tierMeta.bgColor,
                  tierMeta.color
                )}
              >
                {tierMeta.label}
              </span>
            </div>
          )}
        </div>

        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
        />
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/50">
          <div className="pt-3 space-y-3">
            {/* Context */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Context</p>
              <p className="text-xs text-foreground italic">"{suggestion.sentence}"</p>
            </div>

            {/* Model Reasoning */}
            {suggestion.reasoning && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Model Reasoning</p>
                <p className="text-xs text-foreground">{suggestion.reasoning}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Add to WEL Database
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

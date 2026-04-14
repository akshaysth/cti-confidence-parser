import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, FileText, Users, AlertTriangle, CheckCircle, Download, Loader, AlertCircle } from 'lucide-react';
import type { IntelligenceClaim } from '../types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

interface Props {
  claims: IntelligenceClaim[];
  status?: 'idle' | 'loading' | 'success' | 'error';
  error?: string | null;
}

// Theme-aware tier colors
const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  certain: { bg: 'bg-[hsl(var(--tier-certain-bg))]', text: 'text-[hsl(var(--tier-certain))]', border: 'border-[hsl(var(--tier-certain))]' },
  probable: { bg: 'bg-[hsl(var(--tier-probable-bg))]', text: 'text-[hsl(var(--tier-probable))]', border: 'border-[hsl(var(--tier-probable))]' },
  even: { bg: 'bg-[hsl(var(--tier-even-bg))]', text: 'text-[hsl(var(--tier-even))]', border: 'border-[hsl(var(--tier-even))]' },
  unlikely: { bg: 'bg-[hsl(var(--tier-unlikely-bg))]', text: 'text-[hsl(var(--tier-unlikely))]', border: 'border-[hsl(var(--tier-unlikely))]' },
  remote: { bg: 'bg-[hsl(var(--tier-remote-bg))]', text: 'text-[hsl(var(--tier-remote))]', border: 'border-[hsl(var(--tier-remote))]' },
};

export function ClaimsPanel({ claims, status = 'idle', error }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 bg-info/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
          <Loader className="w-5 h-5 text-info animate-spin" />
        </div>
        <p className="text-sm text-foreground font-medium">Extracting claims...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Using AI to identify intelligence assertions
        </p>
      </div>
    );
  }

  // Show error state
  if (status === 'error') {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5 text-error" />
        </div>
        <p className="text-sm text-foreground font-medium">Failed to extract claims</p>
        {error && (
          <p className="text-xs text-error mt-1 font-mono bg-error/10 p-2 rounded">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Check the console for more details
        </p>
      </div>
    );
  }

  const handleExportSTIX = () => {
    // Simple STIX export
    const stix = {
      type: 'bundle',
      id: `bundle--${crypto.randomUUID()}`,
      spec_version: '2.1',
      objects: claims.map((claim) => ({
        type: 'threat-actor',
        id: `threat-actor--${crypto.randomUUID()}`,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        name: claim.claim.slice(0, 100),
        description: claim.claim,
        confidence: claim.confidenceLevel,
        labels: claim.entities,
        'x_wel_claim': {
          confidence_term: claim.confidence,
          timeframe: claim.timeframe,
          evidence: claim.evidence,
          assumptions: claim.assumptions,
          source_refs: claim.sourceReferences,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(stix, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claims-stix-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (claims.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-foreground font-medium">No claims extracted yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Claims will be automatically extracted when you analyze text.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Extracted Intelligence Claims
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {claims.length} claim{claims.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportSTIX}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export STIX
        </Button>
      </div>

      {/* Claims List */}
      <div className="space-y-3">
        {claims.map((claim, index) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            index={index}
            isExpanded={expandedId === claim.id}
            onToggle={() => setExpandedId(expandedId === claim.id ? null : claim.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface ClaimCardProps {
  claim: IntelligenceClaim;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function ClaimCard({ claim, index, isExpanded, onToggle }: ClaimCardProps) {
  const getConfidenceTier = (level: number) => {
    if (level >= 75) return 'certain';
    if (level >= 55) return 'probable';
    if (level >= 45) return 'even';
    if (level >= 25) return 'unlikely';
    return 'remote';
  };

  const tier = getConfidenceTier(claim.confidenceLevel);
  const tierColors = TIER_COLORS[tier];

  return (
    <div
      className={cn(
        'bg-card border rounded-lg overflow-hidden cursor-pointer transition-all hover:border-border/80',
        tierColors.border
      )}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xs font-mono text-muted-foreground mt-0.5">{index + 1}</span>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed">{claim.claim}</p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Confidence Badge */}
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded font-medium',
                  tierColors.bg,
                  tierColors.text
                )}
              >
                {claim.confidence} ({claim.confidenceLevel}%)
              </span>

              {/* Timeframe */}
              {claim.timeframe && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  <Calendar className="w-3 h-3" />
                  {claim.timeframe}
                </span>
              )}

              {/* Evidence count */}
              {claim.evidence.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  <CheckCircle className="w-3 h-3" />
                  {claim.evidence.length} evidence
                </span>
              )}

              {/* Entities count */}
              {claim.entities.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  <Users className="w-3 h-3" />
                  {claim.entities.length} entities
                </span>
              )}
            </div>
          </div>

          <ChevronDown
            className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
          />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="pt-3 space-y-3">
            {/* Evidence */}
            {claim.evidence.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Evidence
                </h4>
                <ul className="space-y-1">
                  {claim.evidence.map((item, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 text-success mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assumptions */}
            {claim.assumptions.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-warning" />
                  Assumptions
                </h4>
                <ul className="space-y-1">
                  {claim.assumptions.map((item, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <span className="text-warning">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entities */}
            {claim.entities.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Entities
                </h4>
                <div className="flex flex-wrap gap-1">
                  {claim.entities.map((entity, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source References */}
            {claim.sourceReferences.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Sources
                </h4>
                <div className="flex flex-wrap gap-1">
                  {claim.sourceReferences.map((ref, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-muted-foreground"
                    >
                      {ref}{i < claim.sourceReferences.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

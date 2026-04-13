import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, FileText, Users, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import type { IntelligenceClaim } from '../types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { TIER_META } from '../types';

interface Props {
  claims: IntelligenceClaim[];
}

export function ClaimsPanel({ claims }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-600 font-medium">No claims extracted yet</p>
        <p className="text-xs text-slate-400 mt-1">
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
          <h3 className="text-sm font-medium text-slate-800">
            Extracted Intelligence Claims
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
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
  const tierMeta = TIER_META[tier];

  return (
    <div
      className={cn(
        'bg-white border rounded-lg overflow-hidden cursor-pointer transition-all',
        tierMeta.borderColor.replace('border-', 'border-').replace('-800', '-200')
      )}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xs font-mono text-slate-400 mt-0.5">{index + 1}</span>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-800 leading-relaxed">{claim.claim}</p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Confidence Badge */}
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded font-medium',
                  tierMeta.bgColor,
                  tierMeta.color
                )}
              >
                {claim.confidence} ({claim.confidenceLevel}%)
              </span>

              {/* Timeframe */}
              {claim.timeframe && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  <Calendar className="w-3 h-3" />
                  {claim.timeframe}
                </span>
              )}

              {/* Evidence count */}
              {claim.evidence.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  <CheckCircle className="w-3 h-3" />
                  {claim.evidence.length} evidence
                </span>
              )}

              {/* Entities count */}
              {claim.entities.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  <Users className="w-3 h-3" />
                  {claim.entities.length} entities
                </span>
              )}
            </div>
          </div>

          <ChevronDown
            className={cn('w-4 h-4 text-slate-400 transition-transform', isExpanded && 'rotate-180')}
          />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="pt-3 space-y-3">
            {/* Evidence */}
            {claim.evidence.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Evidence
                </h4>
                <ul className="space-y-1">
                  {claim.evidence.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assumptions */}
            {claim.assumptions.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Assumptions
                </h4>
                <ul className="space-y-1">
                  {claim.assumptions.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entities */}
            {claim.entities.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Entities
                </h4>
                <div className="flex flex-wrap gap-1">
                  {claim.entities.map((entity, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
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
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Sources
                </h4>
                <div className="flex flex-wrap gap-1">
                  {claim.sourceReferences.map((ref, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-slate-500"
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

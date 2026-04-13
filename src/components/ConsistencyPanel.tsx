import { AlertTriangle, Info, BarChart3, CheckCircle2 } from 'lucide-react';
import type { WELMatch } from '../types';
import { analyzeConsistency, getIssueColor, type ConsistencyIssue } from '../lib/consistencyChecker';
import { TIER_META } from '../types';
import { cn } from '../lib/utils';
import { useMemo, useState } from 'react';

interface Props {
  matches: WELMatch[];
}

export function ConsistencyPanel({ matches }: Props) {
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const report = useMemo(() => analyzeConsistency(matches), [matches]);

  if (matches.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm font-meta">
        No WEL terms detected to analyze consistency.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center gap-3">
        {report.isConsistent ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Consistent</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              {report.issues.filter((i) => i.severity === 'warning').length} warning
              {report.issues.filter((i) => i.severity === 'warning').length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <span className="text-slate-400 text-sm font-meta">
          {matches.length} matches · Avg confidence: {report.averageConfidence}%
        </span>
      </div>

      {/* Tier Distribution */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h4 className="text-xs font-bold font-meta text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5" />
          Distribution by Tier
        </h4>
        <div className="flex items-end gap-1 h-20">
          {(['certain', 'probable', 'even', 'unlikely', 'remote'] as const).map((tier) => {
            const count = report.tierDistribution[tier];
            const maxCount = Math.max(...Object.values(report.tierDistribution));
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const meta = TIER_META[tier];

            return (
              <div key={tier} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-full min-h-[4px] rounded-t transition-all',
                    meta.bgColor
                  )}
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${meta.label}: ${count}`}
                />
                <span className={cn('text-[10px] font-bold', meta.color)}>{count}</span>
                <span className="text-[9px] text-slate-400 uppercase font-meta">
                  {tier.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issues List */}
      {report.issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold font-meta text-slate-600 uppercase tracking-wide">
            Analysis
          </h4>
          {report.issues.map((issue, index) => (
            <IssueCard
              key={index}
              issue={issue}
              isExpanded={expandedIssue === index}
              onToggle={() => setExpandedIssue(expandedIssue === index ? null : index)}
            />
          ))}
        </div>
      )}

      {/* Confidence Range */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 font-meta">Confidence range:</span>
          <span className="font-mono font-medium text-slate-700">
            {report.confidenceRange[0]}% - {report.confidenceRange[1]}%
          </span>
        </div>
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  isExpanded,
  onToggle,
}: {
  issue: ConsistencyIssue;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = issue.severity === 'warning' ? AlertTriangle : Info;
  const colorClass = getIssueColor(issue.severity);

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all cursor-pointer',
        colorClass.replace('bg-', 'bg-opacity-30 bg-').replace('text-', 'border-')
      )}
      onClick={onToggle}
    >
      <div className="p-3 flex items-start gap-3">
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
            colorClass.split(' ')[1] // bg color
          )}
        >
          <Icon className={cn('w-3.5 h-3.5', colorClass.split(' ')[0])} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-sm', colorClass.split(' ')[0])}>{issue.message}</p>
          {issue.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{issue.description}</p>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && issue.matches.length > 0 && (
        <div className="px-3 pb-3">
          <div className="bg-white/50 rounded border border-current border-opacity-20 p-2 space-y-2">
            {issue.matches.map((match) => (
              <div key={match.id} className="text-xs">
                <code className="font-semibold text-slate-700">{match.matchedPhrase}</code>
                <span className="text-slate-400 mx-1">·</span>
                <span className="text-slate-600">{match.entry.kentRange[0]}-{match.entry.kentRange[1]}%</span>
                <p className="text-slate-400 mt-0.5 italic line-clamp-2">{match.sentence}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

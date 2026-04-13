import { useState, useMemo } from 'react';
import { Download, Trash2, AlertTriangle, List, Activity } from 'lucide-react';
import type { WELMatch } from '../types';
import { SummaryStats } from './SummaryStats';
import { WELCard } from './WELCard';
import { ConsistencyPanel } from './ConsistencyPanel';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { analyzeConsistency } from '../lib/consistencyChecker';

interface Props {
  matches: WELMatch[];
  sourceText: string;
  onClear: () => void;
}

type ViewTab = 'matches' | 'consistency';

export function ResultsDashboard({ matches, sourceText, onClear }: Props) {
  const [activeTab, setActiveTab] = useState<ViewTab>('matches');

  const consistencyReport = useMemo(() => analyzeConsistency(matches), [matches]);
  const hasWarnings = consistencyReport.issues.some((i) => i.severity === 'warning');

  const handleExport = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      sourceLength: sourceText.length,
      totalMatches: matches.length,
      matches: matches.map((m) => ({
        phrase: m.matchedPhrase,
        sentence: m.sentence,
        charOffset: m.charOffset,
        kent: {
          tier: m.entry.tier,
          range: m.entry.kentRange,
          center: m.entry.kentCenter,
          source: m.entry.source,
        },
        model: {
          isWEL: m.modelIsWEL,
          confidence: m.modelConfidence,
          reasoning: m.modelReasoning,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wel-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (matches.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm font-meta text-muted-foreground">No WEL terms detected.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Results toolbar */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-sans text-sm font-semibold text-foreground">
            {matches.length} WEL instance{matches.length !== 1 ? 's' : ''} detected
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>

        <SummaryStats matches={matches} />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('matches')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]',
              activeTab === 'matches'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="w-4 h-4" />
            Matches
          </button>
          <button
            onClick={() => setActiveTab('consistency')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]',
              activeTab === 'consistency'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              hasWarnings && 'text-amber-600'
            )}
          >
            <Activity className="w-4 h-4" />
            Consistency
            {hasWarnings && (
              <span className="flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-700 text-xs rounded-full font-bold">
                <AlertTriangle className="w-3 h-3" />
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'matches' ? (
          <div className="space-y-3">
            {matches.map((match, i) => (
              <WELCard key={match.id} match={match} index={i} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <ConsistencyPanel matches={matches} />
          </div>
        )}
      </div>
    </div>
  );
}

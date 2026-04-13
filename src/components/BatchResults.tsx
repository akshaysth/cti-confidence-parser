import { BarChart3, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { TIER_META, TIER_ORDER } from '../types';
import type { BatchJob } from '../lib/batchProcessor';

interface Props {
jobs: BatchJob[];
}

export function BatchResults({ jobs }: Props) {
const completedJobs = jobs.filter((j) => j.status === 'completed');
const errorJobs = jobs.filter((j) => j.status === 'error');

// Aggregate statistics
const allMatches = completedJobs.flatMap((j) => j.matches);
const totalConfirmed = completedJobs.reduce((sum, j) => sum + j.confirmedCount, 0);

// Tier distribution
const tierDistribution: Record<string, number> = {
  certain: 0,
  probable: 0,
  even: 0,
  unlikely: 0,
  remote: 0,
};

allMatches.forEach((m) => {
  tierDistribution[m.entry.tier]++;
});

const handleExport = () => {
  const payload = {
    timestamp: new Date().toISOString(),
    totalDocuments: completedJobs.length,
    totalMatches: allMatches.length,
    totalConfirmed,
    tierDistribution,
documents: completedJobs.map((j) => ({
name: j.name,
type: j.type,
matchCount: j.matches.length,
confirmed: j.confirmedCount,
matches: j.matches.map((m) => ({
phrase: m.matchedPhrase,
tier: m.entry.tier,
confidence: m.entry.kentRange,
modelConfidence: m.modelConfidence,
isWEL: m.modelIsWEL,
sentence: m.sentence,
})),
})),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `batch-analysis-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

return (
  <div className="space-y-6">
    {/* Summary Cards */}
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Documents"
        value={completedJobs.length}
        icon={FileText}
        color="text-blue-600"
        bgColor="bg-blue-50"
      />
      <StatCard
        label="Total Matches"
        value={allMatches.length}
        icon={BarChart3}
        color="text-slate-600"
        bgColor="bg-slate-100"
      />
      <StatCard
        label="Confirmed"
        value={totalConfirmed}
        icon={CheckCircle}
        color="text-emerald-600"
        bgColor="bg-emerald-50"
      />
      <StatCard
        label="Failed"
        value={errorJobs.length}
        icon={AlertCircle}
        color={errorJobs.length > 0 ? 'text-rose-600' : 'text-slate-400'}
        bgColor={errorJobs.length > 0 ? 'bg-rose-50' : 'bg-slate-100'}
      />
    </div>

    {/* Tier Distribution */}
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-slate-800 mb-4">Tier Distribution</h3>
      <div className="flex items-end gap-2 h-32">
        {TIER_ORDER.map((tier) => {
          const count = tierDistribution[tier];
          const maxCount = Math.max(...Object.values(tierDistribution), 1);
          const height = (count / maxCount) * 100;
          const meta = TIER_META[tier];

          return (
            <div key={tier} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn('w-full rounded-t transition-all', meta.bgColor)}
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`${meta.label}: ${count}`}
              />
              <span className={cn('text-[10px] font-medium', meta.color)}>{count}</span>
              <span className="text-[9px] text-slate-400 uppercase">{tier.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
    </div>

    {/* Per-Document Summary */}
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-medium text-slate-800">Document Results</h3>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {completedJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700 truncate">{job.name}</p>
              <p className="text-xs text-slate-500">
                {job.matches.length} matches · {job.confirmedCount} confirmed
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(['certain', 'probable', 'even', 'unlikely', 'remote'] as const).map((tier) => {
                const count = job.matches.filter((m) => m.entry.tier === tier).length;
                if (count === 0) return null;
                const meta = TIER_META[tier];
                return (
                  <span
                    key={tier}
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      meta.bgColor,
                      meta.color
                    )}
                  >
                    {count}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Actions */}
    <div className="flex justify-end">
      <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        Export Batch Results
      </Button>
    </div>
  </div>
);
}

function StatCard({
label,
value,
icon: Icon,
color,
bgColor,
}: {
label: string;
value: number;
icon: React.ElementType;
color: string;
bgColor: string;
}) {
return (
  <div className="bg-white border border-slate-200 rounded-lg p-4">
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center mb-2', bgColor)}>
      <Icon className={cn('w-4 h-4', color)} />
    </div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);
}

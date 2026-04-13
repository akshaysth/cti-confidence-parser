import { useState, useEffect, useMemo } from 'react';
import { X, ArrowLeftRight, ChevronRight, Plus, Minus, AlertCircle, FileText, Clock } from 'lucide-react';
import type { WELMatch } from '../types';
import { TIER_META, TIER_ORDER } from '../types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
} from './ui/dialog';
import { getAnalysis, type AnalysisRecord } from '../lib/dbClient';

interface Props {
analysisA: AnalysisRecord;
analysisB: AnalysisRecord;
open: boolean;
onClose: () => void;
}

interface FullAnalysis extends AnalysisRecord {
data: WELMatch[];
sourceText?: string;
}

type DiffType = 'added' | 'removed' | 'changed' | 'unchanged';

interface DiffEntry {
id: string;
phrase: string;
tier: string;
confidence: [number, number];
modelConfidence: number | null;
type: DiffType;
analysisA?: WELMatch;
analysisB?: WELMatch;
}

export function ComparisonView({ analysisA, analysisB, open, onClose }: Props) {
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [dataA, setDataA] = useState<FullAnalysis | null>(null);
const [dataB, setDataB] = useState<FullAnalysis | null>(null);
const [filter, setFilter] = useState<DiffType | 'all'>('all');

useEffect(() => {
if (!open) return;

const loadBoth = async () => {
try {
setLoading(true);
setError('');
const [fullA, fullB] = await Promise.all([
getAnalysis(analysisA.id),
getAnalysis(analysisB.id),
]);
setDataA(fullA as unknown as FullAnalysis);
setDataB(fullB as unknown as FullAnalysis);
} catch (err) {
setError(err instanceof Error ? err.message : 'Failed to load analyses');
} finally {
setLoading(false);
}
};

loadBoth();
}, [open, analysisA.id, analysisB.id]);

const diffs = useMemo(() => {
if (!dataA || !dataB) return [];

const aMatches = dataA.data || [];
const bMatches = dataB.data || [];
const result: DiffEntry[] = [];

// Build lookup maps
const aMap = new Map(aMatches.map((m) => [m.matchedPhrase.toLowerCase(), m]));
const bMap = new Map(bMatches.map((m) => [m.matchedPhrase.toLowerCase(), m]));

// Find all unique phrases
const allPhrases = new Set([...aMap.keys(), ...bMap.keys()]);

allPhrases.forEach((phrase) => {
const matchA = aMap.get(phrase);
const matchB = bMap.get(phrase);

if (matchA && matchB) {
// Check if changed
const tierChanged = matchA.entry.tier !== matchB.entry.tier;
const confidenceChanged =
matchA.modelConfidence !== matchB.modelConfidence;

result.push({
id: `${matchA.id}-${matchB.id}`,
phrase: matchA.matchedPhrase,
tier: tierChanged
? `${matchA.entry.tier} → ${matchB.entry.tier}`
: matchA.entry.tier,
confidence: matchA.entry.kentRange,
modelConfidence: matchB.modelConfidence,
type: tierChanged || confidenceChanged ? 'changed' : 'unchanged',
analysisA: matchA,
analysisB: matchB,
});
} else if (matchA) {
result.push({
id: matchA.id,
phrase: matchA.matchedPhrase,
tier: matchA.entry.tier,
confidence: matchA.entry.kentRange,
modelConfidence: matchA.modelConfidence,
type: 'removed',
analysisA: matchA,
});
} else if (matchB) {
result.push({
id: matchB.id,
phrase: matchB.matchedPhrase,
tier: matchB.entry.tier,
confidence: matchB.entry.kentRange,
modelConfidence: matchB.modelConfidence,
type: 'added',
analysisB: matchB,
});
}
});

return result.sort((a, b) => {
// Sort by: changes first, then adds/removes, then alphabetically
const priority = { changed: 0, added: 1, removed: 2, unchanged: 3 };
const priorityDiff = priority[a.type] - priority[b.type];
if (priorityDiff !== 0) return priorityDiff;
return a.phrase.localeCompare(b.phrase);
});
}, [dataA, dataB]);

const stats = useMemo(() => {
return {
added: diffs.filter((d) => d.type === 'added').length,
removed: diffs.filter((d) => d.type === 'removed').length,
changed: diffs.filter((d) => d.type === 'changed').length,
unchanged: diffs.filter((d) => d.type === 'unchanged').length,
};
}, [diffs]);

const filteredDiffs = useMemo(() => {
if (filter === 'all') return diffs;
return diffs.filter((d) => d.type === filter);
}, [diffs, filter]);

const formatDate = (iso: string) => {
const d = new Date(iso + 'Z');
return d.toLocaleString(undefined, {
month: 'short',
day: 'numeric',
year: 'numeric',
hour: '2-digit',
minute: '2-digit',
});
};

if (!open) return null;

return (
<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
<DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
<DialogHeader className="shrink-0">
<DialogTitle className="flex items-center gap-2">
<ArrowLeftRight className="w-5 h-5" />
Compare Analyses
</DialogTitle>
</DialogHeader>

{loading ? (
<div className="flex items-center justify-center py-20 text-slate-400">
<div className="animate-spin mr-2 h-5 w-5 border-2 border-slate-300 border-t-primary rounded-full" />
Loading analyses...
</div>
) : error ? (
<div className="flex items-center gap-2 text-destructive py-10 justify-center">
<AlertCircle className="w-5 h-5" />
{error}
</div>
) : (
<div className="flex-1 overflow-hidden flex flex-col">
{/* Comparison Header */}
<div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-200">
<div>
<div className="flex items-center gap-2 text-sm font-medium text-slate-700">
<FileText className="w-4 h-4 text-slate-400" />
<span className="truncate">
{dataA?.source_ref ?? `Analysis #${analysisA.id}`}
</span>
</div>
<div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
<Clock className="w-3 h-3" />
{formatDate(analysisA.created_at)}
</div>
<div className="text-xs text-slate-500 mt-1">
{dataA?.data?.length ?? 0} matches · {dataA?.confirmed_wel ?? 0} confirmed
</div>
</div>
<div className="border-l border-slate-200 pl-4">
<div className="flex items-center gap-2 text-sm font-medium text-slate-700">
<FileText className="w-4 h-4 text-slate-400" />
<span className="truncate">
{dataB?.source_ref ?? `Analysis #${analysisB.id}`}
</span>
</div>
<div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
<Clock className="w-3 h-3" />
{formatDate(analysisB.created_at)}
</div>
<div className="text-xs text-slate-500 mt-1">
{dataB?.data?.length ?? 0} matches · {dataB?.confirmed_wel ?? 0} confirmed
</div>
</div>
</div>

{/* Stats Bar */}
<div className="flex items-center gap-2 mb-4">
<button
onClick={() => setFilter('all')}
className={cn(
'px-3 py-1.5 rounded text-xs font-medium transition-colors',
filter === 'all'
? 'bg-slate-800 text-white'
: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
)}
>
All ({diffs.length})
</button>
<button
onClick={() => setFilter('changed')}
className={cn(
'px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1',
filter === 'changed'
? 'bg-amber-100 text-amber-800'
: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
)}
>
Changed ({stats.changed})
</button>
<button
onClick={() => setFilter('added')}
className={cn(
'px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1',
filter === 'added'
? 'bg-emerald-100 text-emerald-800'
: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
)}
>
<Plus className="w-3 h-3" />
Added ({stats.added})
</button>
<button
onClick={() => setFilter('removed')}
className={cn(
'px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1',
filter === 'removed'
? 'bg-rose-100 text-rose-800'
: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
)}
>
<Minus className="w-3 h-3" />
Removed ({stats.removed})
</button>
</div>

{/* Diff List */}
<div className="flex-1 overflow-y-auto space-y-2">
{filteredDiffs.length === 0 ? (
<div className="text-center py-10 text-slate-400 text-sm">
No {filter !== 'all' ? filter : ''} differences found.
</div>
) : (
filteredDiffs.map((diff) => (
<DiffRow key={diff.id} diff={diff} />
))
)}
</div>
</div>
)}

<div className="flex justify-end pt-4 border-t border-slate-200 shrink-0">
<Button variant="outline" onClick={onClose}>
Close
</Button>
</div>
</DialogContent>
</Dialog>
);
}

function DiffRow({ diff }: { diff: DiffEntry }) {
const [showContext, setShowContext] = useState(false);

const typeConfig = {
added: { color: 'bg-emerald-50 border-emerald-200', icon: Plus, iconColor: 'text-emerald-600' },
removed: { color: 'bg-rose-50 border-rose-200', icon: Minus, iconColor: 'text-rose-600' },
changed: { color: 'bg-amber-50 border-amber-200', icon: ArrowLeftRight, iconColor: 'text-amber-600' },
unchanged: { color: 'bg-slate-50 border-slate-200', icon: null, iconColor: '' },
};

const config = typeConfig[diff.type];
const Icon = config.icon;

return (
<div
className={cn(
'border rounded-lg overflow-hidden transition-all cursor-pointer',
config.color
)}
onClick={() => setShowContext(!showContext)}
>
<div className="p-3 flex items-center gap-3">
{Icon && <Icon className={cn('w-4 h-4 shrink-0', config.iconColor)} />}

<div className="flex-1 min-w-0">
<div className="flex items-center gap-2">
<code className="text-sm font-semibold text-slate-800">{diff.phrase}</code>
<span
className={cn(
'text-[10px] px-1.5 py-0.5 rounded font-medium',
TIER_META[diff.tier.split(' → ')[0] as keyof typeof TIER_META]?.bgColor ?? 'bg-slate-100',
TIER_META[diff.tier.split(' → ')[0] as keyof typeof TIER_META]?.color ?? 'text-slate-600'
)}
>
{diff.tier}
</span>
</div>
{diff.type === 'changed' && (
<div className="text-xs text-slate-500 mt-1">
{diff.analysisA?.entry.kentRange.join('-')}% → {diff.analysisB?.entry.kentRange.join('-')}%
</div>
)}
</div>

<ChevronRight
className={cn(
'w-4 h-4 text-slate-400 transition-transform',
showContext && 'rotate-90'
)}
/>
</div>

{showContext && (
<div className="px-3 pb-3">
<div className="bg-white/70 rounded border border-current border-opacity-20 p-2 space-y-2">
{diff.analysisA && (
<div>
<p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Original</p>
<p className="text-xs text-slate-600 italic line-clamp-3">
"{diff.analysisA.sentence}"
</p>
</div>
)}
{diff.analysisB && (
<div>
<p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
{diff.type === 'added' ? 'Added' : 'Revised'}
</p>
<p className="text-xs text-slate-600 italic line-clamp-3">
"{diff.analysisB.sentence}"
</p>
</div>
)}
</div>
</div>
)}
</div>
);
}

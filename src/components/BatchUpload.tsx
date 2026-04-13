import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, Loader, CheckCircle, AlertCircle, Play, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import type { BatchJob, BatchProgress } from '../lib/batchProcessor';

interface Props {
isProcessing: boolean;
jobs: BatchJob[];
progress: BatchProgress;
onAddFiles: (files: File[]) => void;
onRemoveJob: (id: string) => void;
onStartProcessing: () => void;
onClearAll: () => void;
}

export function BatchUpload({
isProcessing,
jobs,
progress,
onAddFiles,
onRemoveJob,
onStartProcessing,
onClearAll,
}: Props) {
const [isDragging, setIsDragging] = useState(false);
const fileRef = useRef<HTMLInputElement>(null);

const handleDragOver = useCallback((e: React.DragEvent) => {
e.preventDefault();
setIsDragging(true);
}, []);

const handleDragLeave = useCallback((e: React.DragEvent) => {
e.preventDefault();
setIsDragging(false);
}, []);

const handleDrop = useCallback(
(e: React.DragEvent) => {
e.preventDefault();
setIsDragging(false);
const files = Array.from(e.dataTransfer.files).filter(
(f) => f.type === 'application/pdf' || f.type === 'text/plain'
);
if (files.length > 0) {
onAddFiles(files);
}
},
[onAddFiles]
);

const handleFileSelect = useCallback(
(e: React.ChangeEvent<HTMLInputElement>) => {
const files = Array.from(e.target.files || []);
if (files.length > 0) {
onAddFiles(files);
}
if (fileRef.current) {
fileRef.current.value = '';
}
},
[onAddFiles]
);

const pendingJobs = jobs.filter((j) => j.status === 'pending');
const canStart = pendingJobs.length > 0 && !isProcessing;

return (
<div className="space-y-4">
{/* Drop Zone */}
<div
onDragOver={handleDragOver}
onDragLeave={handleDragLeave}
onDrop={handleDrop}
onClick={() => fileRef.current?.click()}
className={cn(
'w-full border-2 border-dashed rounded-lg px-6 py-10 text-center cursor-pointer transition-all',
isDragging
? 'border-primary bg-primary/5'
: 'border-slate-300 hover:border-slate-400 bg-surface-lowest'
)}
>
<Upload
className={cn(
'w-10 h-10 mx-auto mb-3 transition-colors',
isDragging ? 'text-primary' : 'text-slate-400'
)}
/>
<p className="text-sm font-medium text-slate-700">
Drop PDF or text files here, or click to browse
</p>
<p className="text-xs text-slate-500 mt-1">Supports multiple files</p>
<input
ref={fileRef}
type="file"
accept=".pdf,.txt,application/pdf,text/plain"
multiple
className="hidden"
onChange={handleFileSelect}
/>
</div>

{/* Jobs List */}
{jobs.length > 0 && (
<div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
<div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
<div>
<h3 className="font-medium text-slate-800 text-sm">Batch Queue</h3>
<p className="text-xs text-slate-500 mt-0.5">
{progress.completed} of {progress.total} processed
{progress.processing > 0 && ` · ${progress.processing} in progress`}
{progress.errors > 0 && ` · ${progress.errors} failed`}
</p>
</div>
{jobs.length > 0 && !isProcessing && (
<button
onClick={onClearAll}
className="text-xs text-slate-500 hover:text-destructive flex items-center gap-1"
>
<Trash2 className="w-3 h-3" />
Clear all
</button>
)}
</div>

<div className="max-h-[300px] overflow-y-auto">
{jobs.map((job) => (
<JobRow key={job.id} job={job} onRemove={() => onRemoveJob(job.id)} />
))}
</div>

{/* Progress Bar */}
{isProcessing && (
<div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
<div className="flex items-center justify-between text-xs text-slate-600 mb-2">
<span>Processing...</span>
<span>{Math.round((progress.completed / progress.total) * 100)}%</span>
</div>
<div className="h-2 bg-slate-200 rounded-full overflow-hidden">
<div
className="h-full bg-primary transition-all duration-300"
style={{ width: `${(progress.completed / progress.total) * 100}%` }}
/>
</div>
</div>
)}

{/* Start Button */}
{canStart && (
<div className="px-4 py-3 border-t border-slate-200">
<Button
onClick={onStartProcessing}
className="w-full flex items-center justify-center gap-2"
>
<Play className="w-4 h-4" />
Start Processing ({pendingJobs.length} files)
</Button>
</div>
)}
</div>
)}
</div>
);
}

function JobRow({ job, onRemove }: { job: BatchJob; onRemove: () => void }) {
const statusConfig = {
pending: { icon: null, color: 'text-slate-400', bg: 'bg-slate-100' },
processing: { icon: Loader, color: 'text-primary', bg: 'bg-primary/10' },
completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

const config = statusConfig[job.status];
const Icon = config.icon;

return (
<div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
<div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', config.bg)}>
{Icon && <Icon className={cn('w-4 h-4', config.color, job.status === 'processing' && 'animate-spin')} />}
{job.status === 'pending' && <span className="text-xs font-medium text-slate-500">{job.name.slice(0, 1)}</span>}
</div>

<div className="flex-1 min-w-0">
<p className="text-sm font-medium text-slate-700 truncate">{job.name}</p>
<p className="text-xs text-slate-500">
{job.status === 'completed' && (
<>
{job.matches.length} matches · {job.confirmedCount} confirmed
</>
)}
{job.status === 'error' && <span className="text-destructive">{job.error}</span>}
{job.status === 'processing' && 'Analyzing...'}
{job.status === 'pending' && 'Waiting...'}
</p>
</div>

{job.status === 'pending' && (
<button
onClick={onRemove}
className="p-1.5 text-slate-400 hover:text-destructive rounded hover:bg-slate-100 transition-colors"
>
<X className="w-4 h-4" />
</button>
)}
</div>
);
}

import type { WELMatch, InputMode } from '../types';
import { detectWEL } from './welDatabase';
import { analyzeWEL } from './modelClient';
import type { ModelConfig } from '../types';

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface BatchJob {
id: string;
name: string;
type: InputMode;
content: string;
status: BatchStatus;
matches: WELMatch[];
confirmedCount: number;
error?: string;
startedAt?: Date;
completedAt?: Date;
}

export interface BatchProgress {
total: number;
completed: number;
processing: number;
errors: number;
}

export type BatchCallback = (job: BatchJob) => void;
export type ProgressCallback = (progress: BatchProgress) => void;

export class BatchProcessor {
private jobs: BatchJob[] = [];
private config: ModelConfig;
private abortController: AbortController | null = null;

constructor(config: ModelConfig) {
this.config = config;
}

addJob(name: string, type: InputMode, content: string): BatchJob {
const job: BatchJob = {
id: crypto.randomUUID(),
name,
type,
content,
status: 'pending',
matches: [],
confirmedCount: 0,
};
this.jobs.push(job);
return job;
}

getJobs(): BatchJob[] {
return [...this.jobs];
}

getProgress(): BatchProgress {
const completed = this.jobs.filter((j) => j.status === 'completed').length;
const processing = this.jobs.filter((j) => j.status === 'processing').length;
const errors = this.jobs.filter((j) => j.status === 'error').length;

return {
total: this.jobs.length,
completed,
processing,
errors,
};
}

async processAll(
onJobUpdate: BatchCallback,
onProgress: ProgressCallback
): Promise<void> {
this.abortController = new AbortController();
const signal = this.abortController.signal;

for (const job of this.jobs) {
if (signal.aborted) break;

if (job.status !== 'pending') continue;

await this.processJob(job, onJobUpdate);
onProgress(this.getProgress());
}
}

private async processJob(job: BatchJob, onUpdate: BatchCallback): Promise<void> {
job.status = 'processing';
job.startedAt = new Date();
onUpdate(job);

try {
// Step 1: Detect WEL terms
const rawMatches = detectWEL(job.content);

if (rawMatches.length === 0) {
job.status = 'completed';
job.completedAt = new Date();
onUpdate(job);
return;
}

// Step 2: Create match objects
const matches: WELMatch[] = rawMatches.map((r, index) => ({
id: `batch-${job.id}-${index}`,
entry: r.entry,
matchedPhrase: r.matchedPhrase,
sentence: r.sentence,
charOffset: r.charOffset,
modelConfidence: null,
modelIsWEL: null,
modelReasoning: null,
status: 'pending',
}));

job.matches = matches;

// Step 3: Analyze with LLM
await Promise.all(
matches.map(async (m) => {
try {
m.status = 'analyzing';
const result = await analyzeWEL(this.config, m.matchedPhrase, m.sentence);
m.status = 'done';
m.modelConfidence = result.confidence;
m.modelIsWEL = result.isWEL;
m.modelReasoning = result.reasoning;
} catch (err) {
m.status = 'error';
m.error = err instanceof Error ? err.message : String(err);
}
})
);

// Count confirmed
job.confirmedCount = matches.filter((m) => m.status === 'done' && m.modelIsWEL).length;
job.status = 'completed';
job.completedAt = new Date();
} catch (err) {
job.status = 'error';
job.error = err instanceof Error ? err.message : String(err);
}

onUpdate(job);
}

abort(): void {
this.abortController?.abort();
}

clear(): void {
this.abort();
this.jobs = [];
}

getAggregateStats(): {
totalMatches: number;
totalConfirmed: number;
totalDocuments: number;
avgMatchesPerDoc: number;
tierDistribution: Record<string, number>;
} {
const allMatches = this.jobs.flatMap((j) => j.matches);
const totalDocuments = this.jobs.filter((j) => j.status === 'completed').length;

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

return {
totalMatches: allMatches.length,
totalConfirmed: this.jobs.reduce((sum, j) => sum + j.confirmedCount, 0),
totalDocuments,
avgMatchesPerDoc: totalDocuments > 0 ? allMatches.length / totalDocuments : 0,
tierDistribution,
};
}
}

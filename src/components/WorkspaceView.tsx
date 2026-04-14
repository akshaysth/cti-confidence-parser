import React, { useState, useMemo, useCallback } from 'react';
import {
FileText, Plus, Save, Tag, Percent, Download, Trash2,
Clock, Loader, CheckCircle, XCircle, AlertCircle, BarChart3, StickyNote, Lightbulb, FileSearch,
} from 'lucide-react';
import type { WELMatch, WELTier, IntelligenceClaim } from '../types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { VisualizationPanel } from './VisualizationPanel';
import { WELSuggestions } from './WELSuggestions';
import { ClaimsPanel } from './ClaimsPanel';

export interface AnalystNote {
  id: string;
  sessionId: string;
  matchId: string;
  matchedPhrase: string;
  sentence: string;
  kentRange: [number, number];
  tier: WELTier;
  modelConfidence: number | null;
  modelIsWEL: boolean | null;
  title: string;
  commentary: string;
  tags: string;
  date: string;
}

interface Props {
  matches: WELMatch[];
  claims: IntelligenceClaim[];
  claimsStatus?: 'idle' | 'loading' | 'success' | 'error';
  claimsError?: string | null;
  sourceText: string;
  sessionId: string;
  isAnalyzing: boolean;
  notes: AnalystNote[];
  onSaveNote: (note: AnalystNote) => void;
  onClear: () => void;
}

// Tier → inline highlight colors (theme-aware)
const TIER_HIGHLIGHT: Record<WELTier, { base: string; active: string }> = {
  certain: { base: 'bg-[hsl(var(--tier-certain-bg))] text-[hsl(var(--tier-certain))] border-b-2 border-[hsl(var(--tier-certain))] hover:brightness-95', active: 'ring-2 ring-[hsl(var(--tier-certain))] ring-offset-1 bg-[hsl(var(--tier-certain-bg))]' },
  probable: { base: 'bg-[hsl(var(--tier-probable-bg))] text-[hsl(var(--tier-probable))] border-b-2 border-[hsl(var(--tier-probable))] hover:brightness-95', active: 'ring-2 ring-[hsl(var(--tier-probable))] ring-offset-1 bg-[hsl(var(--tier-probable-bg))]' },
  even: { base: 'bg-[hsl(var(--tier-even-bg))] text-[hsl(var(--tier-even))] border-b-2 border-[hsl(var(--tier-even))] hover:brightness-95', active: 'ring-2 ring-[hsl(var(--tier-even))] ring-offset-1 bg-[hsl(var(--tier-even-bg))]' },
  unlikely: { base: 'bg-[hsl(var(--tier-unlikely-bg))] text-[hsl(var(--tier-unlikely))] border-b-2 border-[hsl(var(--tier-unlikely))] hover:brightness-95', active: 'ring-2 ring-[hsl(var(--tier-unlikely))] ring-offset-1 bg-[hsl(var(--tier-unlikely-bg))]' },
  remote: { base: 'bg-[hsl(var(--tier-remote-bg))] text-[hsl(var(--tier-remote))] border-b-2 border-[hsl(var(--tier-remote))] hover:brightness-95', active: 'ring-2 ring-[hsl(var(--tier-remote))] ring-offset-1 bg-[hsl(var(--tier-remote-bg))]' },
};

type Segment =
  | { type: 'text'; content: string }
  | { type: 'match'; match: WELMatch };

function buildSegments(text: string, matches: WELMatch[]): Segment[] {
  const sorted = [...matches].sort((a, b) => a.charOffset - b.charOffset);
  const segments: Segment[] = [];
  let pos = 0;

  for (const match of sorted) {
    if (match.charOffset < pos) continue; // skip overlapping
    if (match.charOffset > pos) {
      segments.push({ type: 'text', content: text.slice(pos, match.charOffset) });
    }
    segments.push({ type: 'match', match });
    pos = match.charOffset + match.matchedPhrase.length;
  }

  if (pos < text.length) {
    segments.push({ type: 'text', content: text.slice(pos) });
  }

  return segments;
}

function PlainText({ content }: { content: string }) {
  return (
    <>
      {content.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

function MatchSpan({
  match,
  isActive,
  onClick,
}: {
  match: WELMatch;
  isActive: boolean;
  onClick: () => void;
}) {
  const colors = TIER_HIGHLIGHT[match.entry.tier];
  return (
    <span
      onClick={onClick}
      className={cn(
        'cursor-pointer font-medium px-0.5 rounded-sm transition-all',
        colors.base,
        isActive && colors.active,
      )}
      title={`${match.entry.tier} · ${match.entry.kentRange[0]}–${match.entry.kentRange[1]}%`}
    >
      {match.matchedPhrase}
    </span>
  );
}

// ── Note Creator ─────────────────────────────────────────────────────────────

function NoteCreator({
  match,
  sessionId,
  onSave,
  onCancel,
}: {
  match: WELMatch;
  sessionId: string;
  onSave: (note: AnalystNote) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [commentary, setCommentary] = useState('');
  const [tags, setTags] = useState('');

  const handleSave = () => {
    onSave({
      id: crypto.randomUUID(),
      sessionId,
      matchId: match.id,
      matchedPhrase: match.matchedPhrase,
      sentence: match.sentence,
      kentRange: match.entry.kentRange,
      tier: match.entry.tier,
      modelConfidence: match.modelConfidence,
      modelIsWEL: match.modelIsWEL,
      title: title.trim() || 'Untitled Note',
      commentary,
      tags,
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="bg-card p-5 rounded-xl border border-border shadow-sm ring-1 ring-primary/10 animate-slide-in-from-top">
      <div className="flex justify-between items-center mb-4">
        <span className="uppercase tracking-wider text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded font-meta">
          Drafting Note
        </span>
        <span className="font-mono text-sm font-bold text-foreground bg-muted px-2 py-1 rounded border border-border">
          {match.entry.kentRange[0]}–{match.entry.kentRange[1]}%
        </span>
      </div>

      {/* Context sentence */}
      <div className="mb-4 bg-muted/50 p-3 rounded-lg border-l-4 border-primary italic text-foreground text-sm leading-relaxed font-serif">
        "{match.sentence}"
      </div>

      {/* Model status badge */}
      {match.status === 'done' && match.modelConfidence !== null && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground font-meta">
          {match.modelIsWEL
            ? <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
            : <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          Model: <strong>{match.modelConfidence}%</strong> confidence ·{' '}
          {match.modelIsWEL ? 'WEL confirmed' : 'Not WEL'}
        </div>
      )}
      {match.status === 'analyzing' && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground font-meta">
          <Loader className="w-3 h-3 animate-spin" />
          Model analyzing…
        </div>
      )}
      {match.status === 'error' && (
        <div className="mb-4 flex items-center gap-2 text-xs text-destructive font-meta">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {match.error ?? 'Analysis failed'}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 font-meta">
            Note Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., APT29 physical breach likelihood"
            className="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-sm bg-card text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 font-meta">
            Analyst Commentary
          </label>
          <textarea
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            placeholder="Add your insights…"
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-sm resize-none bg-card text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 font-meta">
            <Tag className="w-3 h-3" /> Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="MITRE ATT&CK, threat actor, … (comma-separated)"
            className="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-sm bg-card text-foreground placeholder:text-muted-foreground"
      />
    </div>

    <div className="pt-1 flex justify-end gap-2">
      <button
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
      >
        Cancel
      </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2 transition"
          >
            <Save className="w-3.5 h-3.5" /> Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main WorkspaceView ────────────────────────────────────────────────────────

type RightPanelTab = 'notes' | 'visualizations' | 'suggestions' | 'claims';

export function WorkspaceView({
  matches,
  claims,
  claimsStatus = 'idle',
  claimsError,
  sourceText,
  sessionId,
  isAnalyzing,
  notes,
  onSaveNote,
  onClear,
}: Props) {
const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('notes');

  const activeMatch = useMemo(
    () => matches.find((m) => m.id === activeMatchId) ?? null,
    [matches, activeMatchId],
  );

  const sessionNotes = useMemo(
    () => notes.filter((n) => n.sessionId === sessionId),
    [notes, sessionId],
  );

  const segments = useMemo(
    () => (sourceText ? buildSegments(sourceText, matches) : []),
    [sourceText, matches],
  );

  const handleSelectMatch = useCallback((match: WELMatch) => {
    setActiveMatchId((prev) => (prev === match.id ? null : match.id));
  }, []);

  const handleSaveNote = useCallback(
    (note: AnalystNote) => {
      onSaveNote(note);
      setActiveMatchId(null);
    },
    [onSaveNote],
  );

  const pending = matches.filter(
    (m) => m.status === 'pending' || m.status === 'analyzing',
  ).length;
  const confirmed = matches.filter((m) => m.status === 'done' && m.modelIsWEL).length;

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ matches, timestamp: new Date().toISOString() }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wel-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left pane: highlighted report text ── */}
      <div className="w-3/5 border-r border-border flex flex-col bg-card">
        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border bg-muted/50 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Intelligence Report
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-meta">
              {matches.length} WEL phrase{matches.length !== 1 ? 's' : ''} detected
              {pending > 0 && ` · ${pending} analyzing…`}
              {pending === 0 && matches.length > 0 && ` · ${confirmed} model-confirmed`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden lg:flex gap-1.5 text-[10px] font-meta">
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 rounded border border-orange-200">Certain</span>
              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800 rounded border border-yellow-200">Probable</span>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 rounded border border-blue-200">Even</span>
              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800 rounded border border-teal-200">Unlikely</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 rounded border border-green-200">Remote</span>
            </div>

            <Button 
              variant="subtle" 
              size="icon" 
              onClick={handleExport} 
              title="Export JSON"
              className="shrink-0"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Report body */}
        <div className="flex-1 overflow-y-auto p-8 text-foreground leading-relaxed text-base font-serif">
          {segments.length > 0 ? (
            segments.map((seg, i) =>
              seg.type === 'text' ? (
                <PlainText key={i} content={seg.content} />
              ) : (
                <MatchSpan
                  key={i}
                  match={seg.match}
                  isActive={activeMatchId === seg.match.id}
                  onClick={() => handleSelectMatch(seg.match)}
                />
              ),
            )
          ) : (
            // History load with no source text — show match list
            <div className="space-y-3">
              <p className="text-xs font-meta text-muted-foreground mb-4">
                Source text not available. Detected phrases:
              </p>
              {matches.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMatch(m)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border transition-colors',
                  activeMatchId === m.id
                    ? 'border-primary/40 bg-primary/8'
                    : 'border-border bg-card hover:border-primary/30',
                )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-meta text-muted-foreground/60 w-5 text-right">{i + 1}</span>
                    <code className="text-sm font-semibold text-primary">{m.matchedPhrase}</code>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded border font-meta',
                      TIER_HIGHLIGHT[m.entry.tier].base,
                    )}>
                      {m.entry.tier}
                    </span>
                  </div>
                  <p className="text-sm font-serif text-muted-foreground pl-7 line-clamp-2 italic">
                    {m.sentence}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    {/* ── Right pane: note creator ── */}
    <div className="w-2/5 flex flex-col bg-muted/50">
      {/* Tab Navigation */}
      <div className="px-6 py-3 border-b border-border bg-card shrink-0">
<div className="flex items-center gap-1">
<button
onClick={() => setRightPanelTab('notes')}
className={cn(
'flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
rightPanelTab === 'notes'
? 'border-primary text-foreground'
: 'border-transparent text-muted-foreground hover:text-foreground'
)}
>
<StickyNote className="w-4 h-4" />
Notes
</button>
<button
onClick={() => setRightPanelTab('visualizations')}
className={cn(
'flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
rightPanelTab === 'visualizations'
? 'border-primary text-foreground'
: 'border-transparent text-muted-foreground hover:text-foreground'
)}
>
<BarChart3 className="w-4 h-4" />
Visualizations
</button>
<button
          onClick={() => setRightPanelTab('suggestions')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            rightPanelTab === 'suggestions'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Lightbulb className="w-4 h-4" />
          Suggestions
        </button>
        <button
          onClick={() => setRightPanelTab('claims')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            rightPanelTab === 'claims'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <FileSearch className="w-4 h-4" />
          Claims
          {claimsStatus === 'loading' && (
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          )}
          {claimsStatus === 'error' && (
            <span className="w-2 h-2 bg-red-400 rounded-full" />
          )}
          {claimsStatus === 'success' && claims.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {claims.length}
            </span>
          )}
        </button>
      </div>
    </div>

<div className="flex-1 overflow-y-auto p-5 space-y-5">
{rightPanelTab === 'visualizations' && (
<VisualizationPanel matches={matches} />
)}

{rightPanelTab === 'suggestions' && (
          <WELSuggestions matches={matches} />
        )}

        {rightPanelTab === 'claims' && (
          <ClaimsPanel claims={claims} status={claimsStatus} error={claimsError} />
        )}

        {rightPanelTab === 'notes' && (
<>
        {!activeMatch ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center px-8 border-2 border-dashed border-border rounded-xl">
            <Percent className="w-7 h-7 mb-3 text-muted-foreground" />
            <p className="text-sm font-meta">
              Select a highlighted WEL phrase to extract context and create an analyst note.
            </p>
          </div>
        ) : (
          <NoteCreator
key={activeMatch.id}
match={activeMatch}
sessionId={sessionId}
onSave={handleSaveNote}
onCancel={() => setActiveMatchId(null)}
/>
)}

          {/* Notes saved this session */}
          {sessionNotes.length > 0 && (
            <div>
              <h3 className="text-xs font-bold font-meta text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">
                Saved · This Report
              </h3>
              <div className="space-y-2">
                {sessionNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-card p-4 border border-border rounded-lg shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="font-semibold text-foreground text-sm leading-snug">{note.title}</h4>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-input shrink-0 ml-2">
                        {note.kentRange[0]}–{note.kentRange[1]}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 italic line-clamp-2 font-serif">
                      "{note.sentence}"
                    </p>
                    {note.tags && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.split(',').map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-meta bg-muted text-muted-foreground px-2 py-0.5 rounded-full border-border"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] font-meta text-muted-foreground">
                      <Clock className="w-3 h-3" /> {note.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyzing indicator */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-xs font-meta text-muted-foreground justify-center py-2">
              <Loader className="w-3 h-3 animate-spin" />
              Model analysis in progress…
            </div>
          )}
</>
)}
</div>
</div>
</div>
  );
}

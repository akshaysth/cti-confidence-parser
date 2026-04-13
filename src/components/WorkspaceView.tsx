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
  sourceText: string;
  sessionId: string;
  isAnalyzing: boolean;
  notes: AnalystNote[];
  onSaveNote: (note: AnalystNote) => void;
  onClear: () => void;
}

// Tier → inline highlight colors (light mode)
const TIER_HIGHLIGHT: Record<WELTier, { base: string; active: string }> = {
  certain:  { base: 'bg-orange-100 text-orange-900 border-b-2 border-orange-400 hover:bg-orange-200',  active: 'ring-2 ring-orange-400 ring-offset-1 bg-orange-200' },
  probable: { base: 'bg-yellow-100 text-yellow-900 border-b-2 border-yellow-400 hover:bg-yellow-200', active: 'ring-2 ring-yellow-400 ring-offset-1 bg-yellow-200' },
  even:     { base: 'bg-blue-100   text-blue-900   border-b-2 border-blue-400   hover:bg-blue-200',   active: 'ring-2 ring-blue-400   ring-offset-1 bg-blue-200' },
  unlikely: { base: 'bg-teal-100   text-teal-900   border-b-2 border-teal-400   hover:bg-teal-200',   active: 'ring-2 ring-teal-400   ring-offset-1 bg-teal-200' },
  remote:   { base: 'bg-green-100  text-green-900  border-b-2 border-green-400  hover:bg-green-200',  active: 'ring-2 ring-green-400  ring-offset-1 bg-green-200' },
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
    <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm ring-1 ring-blue-50 animate-slide-in-from-top">
      <div className="flex justify-between items-center mb-4">
        <span className="uppercase tracking-wider text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded font-meta">
          Drafting Note
        </span>
        <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
          {match.entry.kentRange[0]}–{match.entry.kentRange[1]}%
        </span>
      </div>

      {/* Context sentence */}
      <div className="mb-4 bg-slate-50 p-3 rounded-lg border-l-4 border-blue-400 italic text-slate-700 text-sm leading-relaxed font-serif">
        "{match.sentence}"
      </div>

      {/* Model status badge */}
      {match.status === 'done' && match.modelConfidence !== null && (
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-600 font-meta">
          {match.modelIsWEL
            ? <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
            : <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          Model: <strong>{match.modelConfidence}%</strong> confidence ·{' '}
          {match.modelIsWEL ? 'WEL confirmed' : 'Not WEL'}
        </div>
      )}
      {match.status === 'analyzing' && (
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500 font-meta">
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
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 font-meta">
            Note Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., APT29 physical breach likelihood"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 font-meta">
            Analyst Commentary
          </label>
          <textarea
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            placeholder="Add your insights…"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none bg-white"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 font-meta">
            <Tag className="w-3 h-3" /> Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="MITRE ATT&CK, threat actor, … (comma-separated)"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
          />
        </div>

        <div className="pt-1 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
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

type RightPanelTab = 'notes' | 'visualizations' | 'suggestions';

export function WorkspaceView({
matches,
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
      <div className="w-3/5 border-r border-slate-200 flex flex-col bg-white">
        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Intelligence Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-meta">
              {matches.length} WEL phrase{matches.length !== 1 ? 's' : ''} detected
              {pending > 0 && ` · ${pending} analyzing…`}
              {pending === 0 && matches.length > 0 && ` · ${confirmed} model-confirmed`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden lg:flex gap-1.5 text-[10px] font-meta">
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded border border-orange-200">Certain</span>
              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">Probable</span>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-200">Even</span>
              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded border border-teal-200">Unlikely</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded border border-green-200">Remote</span>
            </div>

            <Button variant="outline" size="sm" onClick={handleExport} title="Export JSON">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground hover:text-destructive"
              title="Clear"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Report body */}
        <div className="flex-1 overflow-y-auto p-8 text-slate-800 leading-relaxed text-base font-serif">
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
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300',
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
                  <p className="text-sm font-serif text-slate-600 pl-7 line-clamp-2 italic">
                    {m.sentence}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

{/* ── Right pane: note creator ── */}
<div className="w-2/5 flex flex-col bg-slate-50">
{/* Tab Navigation */}
<div className="px-6 py-3 border-b border-slate-200 bg-white shrink-0">
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
</div>
</div>

<div className="flex-1 overflow-y-auto p-5 space-y-5">
{rightPanelTab === 'visualizations' && (
<VisualizationPanel matches={matches} />
)}

{rightPanelTab === 'suggestions' && (
<WELSuggestions matches={matches} />
)}

{rightPanelTab === 'notes' && (
<>
{!activeMatch ? (
<div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center px-8 border-2 border-dashed border-slate-200 rounded-xl">
<Percent className="w-7 h-7 mb-3 text-slate-300" />
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
<h3 className="text-xs font-bold font-meta text-slate-600 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">
Saved · This Report
</h3>
<div className="space-y-2">
{sessionNotes.map((note) => (
<div
key={note.id}
className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm"
>
<div className="flex justify-between items-start mb-1.5">
<h4 className="font-semibold text-slate-800 text-sm leading-snug">{note.title}</h4>
<span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
{note.kentRange[0]}–{note.kentRange[1]}%
</span>
</div>
<p className="text-xs text-slate-500 mb-2 italic line-clamp-2 font-serif">
"{note.sentence}"
</p>
{note.tags && (
<div className="flex flex-wrap gap-1">
{note.tags.split(',').map((tag, i) => (
<span
key={i}
className="text-[10px] font-meta bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200"
>
{tag.trim()}
</span>
))}
</div>
)}
<div className="flex items-center gap-1 mt-2 text-[10px] font-meta text-slate-400">
<Clock className="w-3 h-3" /> {note.date}
</div>
</div>
))}
</div>
</div>
)}

{/* Analyzing indicator */}
{isAnalyzing && (
<div className="flex items-center gap-2 text-xs font-meta text-slate-500 justify-center py-2">
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

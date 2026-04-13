import { useState, useRef, useCallback } from 'react';
import {
  ShieldAlert, FileText, BookOpen, Settings, LayoutDashboard,
  History, Search, Clock,
} from 'lucide-react';
import type { WELMatch, InputMode } from './types';
import { detectWEL } from './lib/welDatabase';
import { analyzeWEL, analyzeQuality } from './lib/modelClient';
import type { QualityScore, IntelligenceClaim } from './types';
import { extractClaims } from './lib/claimExtractor';
import { saveAnalysis } from './lib/dbClient';
import { useModelConfig } from './hooks/useModelConfig';
import { ModelConfigModal } from './components/ModelConfigModal';
import { HistoryPanel } from './components/HistoryPanel';
import { InputPanel } from './components/InputPanel';
import { WorkspaceView } from './components/WorkspaceView';
import type { AnalystNote } from './components/WorkspaceView';
import { cn } from './lib/utils';

type View = 'ingestion' | 'workspace' | 'library';

interface AnalyzeMeta {
  sourceType: InputMode;
  sourceRef?: string;
}

function loadNotes(): AnalystNote[] {
  try { return JSON.parse(localStorage.getItem('analyst-notes') || '[]'); }
  catch { return []; }
}

function persistNotes(notes: AnalystNote[]) {
  localStorage.setItem('analyst-notes', JSON.stringify(notes));
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 px-6 py-3 w-full transition-colors text-sm font-medium',
        active
          ? 'bg-blue-600/80 text-white border-r-[3px] border-white/60'
          : disabled
          ? 'text-white/20 cursor-not-allowed'
          : 'text-white/55 hover:bg-white/8 hover:text-white',
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}

function LibraryView({ notes }: { notes: AnalystNote[] }) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.tags.toLowerCase().includes(search.toLowerCase()) ||
          n.matchedPhrase.toLowerCase().includes(search.toLowerCase()),
      )
    : notes;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col h-full">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Knowledge Base
          </h1>
          <p className="text-slate-500 text-sm font-meta">
            {notes.length} analyst note{notes.length !== 1 ? 's' : ''} stored locally.
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, tags…"
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm w-56 bg-white"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-meta">
          {notes.length === 0
            ? 'No notes yet. Save analyst notes from the Workspace.'
            : 'No notes match your search.'}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 text-xs sticky top-0">
              <tr>
                <th className="px-6 py-3 font-semibold uppercase tracking-wide">Note Title</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wide">WEL Phrase</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wide">Kent Range</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wide">Tags</th>
                <th className="px-6 py-3 font-semibold uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((note) => (
                <tr key={note.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 max-w-xs">
                    <div className="font-medium text-slate-900">{note.title}</div>
                    {note.commentary && (
                      <div className="text-xs text-slate-400 mt-0.5 truncate font-meta">
                        {note.commentary}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {note.matchedPhrase}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                      {note.kentRange[0]}–{note.kentRange[1]}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {note.tags ? (
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
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-meta text-slate-400 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {note.date}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { config, updateConfig } = useModelConfig();
  const [currentView, setCurrentView] = useState<View>('ingestion');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
const [matches, setMatches] = useState<WELMatch[]>([]);
const [claims, setClaims] = useState<IntelligenceClaim[]>([]);
const [sourceText, setSourceText] = useState('');
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [sessionId, setSessionId] = useState('');
const [notes, setNotes] = useState<AnalystNote[]>(loadNotes);
const abortRef = useRef(false);
  const matchCounterRef = useRef(0);

  const nextId = useCallback(() => {
    matchCounterRef.current += 1;
    return `match-${matchCounterRef.current}`;
  }, []);

  const updateMatch = useCallback((id: string, updates: Partial<WELMatch>) => {
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const handleAnalyze = async (text: string, meta: AnalyzeMeta) => {
    abortRef.current = false;
    setSourceText(text);
    const sid = `session-${Date.now()}`;
    setSessionId(sid);
    sessionStorage.setItem('currentSessionId', sid);

    const raw = detectWEL(text);
    setCurrentView('workspace');

    if (raw.length === 0) {
      setMatches([]);
      return;
    }

    const initial: WELMatch[] = raw.map((r) => ({
      id: nextId(),
      entry: r.entry,
      matchedPhrase: r.matchedPhrase,
      sentence: r.sentence,
      charOffset: r.charOffset,
      modelConfidence: null,
      modelIsWEL: null,
      modelReasoning: null,
      status: 'pending',
    }));

setMatches(initial);
setIsAnalyzing(true);
setClaims([]); // Clear previous claims

const finalMatches = initial.map((m) => ({ ...m }));

// Extract intelligence claims in parallel with WEL analysis
const claimsPromise = extractClaims(config, text).then((extractedClaims) => {
  if (!abortRef.current) {
    setClaims(extractedClaims);
  }
}).catch((err) => {
  console.error('Failed to extract claims:', err);
});

// Process all matches in parallel for better performance
await Promise.all([
  // WEL analysis
  Promise.all(
    initial.map(async (m, i) => {
      if (abortRef.current) return;
      updateMatch(m.id, { status: 'analyzing' });
      try {
        // Analyze if it's WEL
        const result = await analyzeWEL(config, m.matchedPhrase, m.sentence);
        if (abortRef.current) return;

        const updates: Partial<WELMatch> = {
          status: 'done',
          modelConfidence: result.confidence,
          modelIsWEL: result.isWEL,
          modelReasoning: result.reasoning,
        };

        // Analyze quality of reasoning if confirmed as WEL
        if (result.isWEL) {
          try {
            const quality = await analyzeQuality(config, m.matchedPhrase, m.sentence);
            if (!abortRef.current) {
              updates.qualityScore = quality;
            }
          } catch {
            // Quality analysis is optional, don't fail on error
          }
        }

        finalMatches[i] = { ...finalMatches[i], ...updates };
        updateMatch(m.id, updates);
      } catch (err) {
        if (abortRef.current) return;
        const error = err instanceof Error ? err.message : String(err);
        finalMatches[i] = { ...finalMatches[i], status: 'error', error };
        updateMatch(m.id, { status: 'error', error });
      }
    })
  ),
  // Claims extraction
  claimsPromise,
]);

// Also wait for claims if they haven't finished
await claimsPromise;

// Count confirmed WEL from final results (safe to do after all parallel work completes)
const confirmedWel = finalMatches.filter((m) => m.status === 'done' && m.modelIsWEL).length;

    setIsAnalyzing(false);

if (!abortRef.current) {
saveAnalysis({
sourceType: meta.sourceType,
sourceRef: meta.sourceRef,
textLength: text.length,
totalMatches: finalMatches.length,
confirmedWel,
data: finalMatches,
sessionId: sid,
sourceText: text,
}).catch(console.error);
}
  };

  const handleLoadHistory = (loadedMatches: WELMatch[], text: string, sessionId: string) => {
    abortRef.current = true;
    setIsAnalyzing(false);
    setMatches(loadedMatches);
    setSourceText(text);
    setSessionId(sessionId);
    sessionStorage.setItem('currentSessionId', sessionId);
    setCurrentView('workspace');
    setShowHistory(false);
  };

  const handleSaveNote = useCallback((note: AnalystNote) => {
    setNotes((prev) => {
      const next = [note, ...prev];
      persistNotes(next);
      return next;
    });
  }, []);

  const handleClear = () => {
    abortRef.current = true;
    setMatches([]);
    setSourceText('');
    setIsAnalyzing(false);
    setCurrentView('ingestion');
  };

  const hasWorkspace = matches.length > 0 || sourceText.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Sidebar ── */}
      <aside
        className="w-60 flex flex-col shrink-0"
        style={{ background: 'linear-gradient(180deg, #041627 0%, #0d1f2d 100%)' }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <ShieldAlert className="w-5 h-5 text-sky-300 shrink-0" />
          <div className="ml-3">
            <p className="font-bold text-white text-sm leading-tight tracking-tight">
              CTI Confidence
            </p>
            <p className="text-white/30 text-[10px] font-meta mt-0.5">
              Sherman Kent · WEL
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-0.5">
          <NavItem
            icon={LayoutDashboard}
            label="Ingestion"
            active={currentView === 'ingestion'}
            onClick={() => setCurrentView('ingestion')}
          />
          <NavItem
            icon={FileText}
            label="Workspace"
            active={currentView === 'workspace'}
            onClick={() => setCurrentView('workspace')}
            disabled={!hasWorkspace}
          />
          <NavItem
            icon={BookOpen}
            label="Knowledge Base"
            active={currentView === 'library'}
            onClick={() => setCurrentView('library')}
          />
        </nav>

        {/* Footer buttons */}
        <div className="p-3 border-t border-white/10 flex flex-col gap-0.5">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-3 w-full text-white/40 hover:text-white transition-colors text-sm font-medium py-2 px-3 rounded hover:bg-white/8"
          >
            <History className="w-4 h-4 shrink-0" />
            Analysis History
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 w-full text-white/40 hover:text-white transition-colors text-sm font-medium py-2 px-3 rounded hover:bg-white/8"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Model Settings
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-hidden h-full">
        {currentView === 'ingestion' && (
          <div className="h-full overflow-y-auto">
            <InputPanel onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          </div>
        )}

{currentView === 'workspace' && (
<WorkspaceView
matches={matches}
claims={claims}
sourceText={sourceText}
sessionId={sessionId}
isAnalyzing={isAnalyzing}
notes={notes}
onSaveNote={handleSaveNote}
onClear={handleClear}
/>
)}

        {currentView === 'library' && (
          <div className="h-full overflow-y-auto">
            <LibraryView notes={notes} />
          </div>
        )}
      </main>

      {showSettings && (
        <ModelConfigModal
          config={config}
          onSave={updateConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHistory && (
        <HistoryPanel onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}

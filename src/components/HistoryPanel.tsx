import { useState, useEffect } from 'react';
import { Trash2, FileText, Link, ClipboardPaste, Loader, FolderOpen } from 'lucide-react';
import type { WELMatch, InputMode } from '../types';
import { listAnalyses, getAnalysis, deleteAnalysis, type AnalysisRecord } from '../lib/dbClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface Props {
  onLoad: (matches: WELMatch[], sourceText: string, sessionId: string) => void;
  onClose: () => void;
}

const SOURCE_ICON: Record<string, React.ElementType> = {
  text: ClipboardPaste,
  pdf: FileText,
  url: Link,
};

function formatDate(iso: string) {
  const d = new Date(iso + 'Z'); // SQLite datetime is UTC
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryPanel({ onLoad, onClose }: Props) {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    listAnalyses()
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLoad = async (id: number) => {
    setLoadingId(id);
    try {
      const full = await getAnalysis(id);
      onLoad(full.data, '', full.session_id ?? '');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteAnalysis(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mx-4 max-w-xl">
        <DialogHeader>
          <DialogTitle>Analysis History</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm font-meta">Loading…</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <FolderOpen className="w-8 h-8 opacity-30" />
              <p className="text-sm font-meta">No saved analyses yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto -mx-1 px-1">
              {records.map((r) => {
                const Icon = SOURCE_ICON[(r.source_type as InputMode)] ?? ClipboardPaste;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleLoad(r.id)}
                    disabled={loadingId === r.id}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-sm bg-surface-low hover:bg-muted border-l-[3px] border-l-primary/20 hover:border-l-primary transition-colors disabled:opacity-50 group"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-medium text-foreground truncate">
                        {r.source_ref ?? `${r.source_type} analysis`}
                      </p>
                      <p className="font-meta text-xs text-muted-foreground mt-0.5">
                        {formatDate(r.created_at)} ·{' '}
                        <span className="text-primary font-medium">{r.total_matches}</span> WEL ·{' '}
                        <span className="text-tier-certain font-medium">{r.confirmed_wel}</span> confirmed
                      </p>
                    </div>

                    {loadingId === r.id ? (
                      <Loader className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                    ) : (
                      <button
                        onClick={(e) => handleDelete(e, r.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

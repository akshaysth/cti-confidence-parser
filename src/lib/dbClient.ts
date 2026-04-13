import type { WELMatch, InputMode } from '../types';

export interface AnalysisRecord {
  id: number;
  created_at: string;
  source_type: string;
  source_ref: string | null;
  total_matches: number;
  confirmed_wel: number;
  session_id: string | null;
}

export interface FullAnalysisRecord extends AnalysisRecord {
  text_length: number;
  data: WELMatch[];
}

export async function saveAnalysis(payload: {
  sourceType: InputMode;
  sourceRef?: string;
  textLength: number;
  totalMatches: number;
  confirmedWel: number;
  data: WELMatch[];
  sessionId?: string;
}): Promise<{ id: number }> {
  const res = await fetch('/api/db/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to save analysis: ${res.status}`);
  return res.json();
}

export async function listAnalyses(): Promise<AnalysisRecord[]> {
  const res = await fetch('/api/db/list');
  if (!res.ok) throw new Error(`Failed to list analyses: ${res.status}`);
  return res.json();
}

export async function getAnalysis(id: number): Promise<FullAnalysisRecord> {
  const res = await fetch(`/api/db/get?id=${id}`);
  if (!res.ok) throw new Error(`Failed to get analysis: ${res.status}`);
  return res.json();
}

export async function deleteAnalysis(id: number): Promise<void> {
  const res = await fetch(`/api/db/delete?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete analysis: ${res.status}`);
}

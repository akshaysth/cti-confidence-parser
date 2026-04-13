import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import Database from 'better-sqlite3';
import path from 'node:path';

// ── SQLite setup ──────────────────────────────────────────────────────────────

const DB_PATH = path.resolve('./wel-analyses.db');
let _db: ReturnType<typeof Database> | null = null;

function getDB() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS analyses (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
        source_type  TEXT    NOT NULL,
        source_ref   TEXT,
        text_length  INTEGER NOT NULL DEFAULT 0,
        total_matches INTEGER NOT NULL DEFAULT 0,
        confirmed_wel INTEGER NOT NULL DEFAULT 0,
        data         TEXT    NOT NULL
      )
    `);
  }
  return _db;
}

function sendJSON(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
    req.on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {

        // ── /api/db/* — SQLite CRUD ──────────────────────────────────────────
        server.middlewares.use('/api/db', async (req: IncomingMessage, res: ServerResponse) => {
          const urlObj = new URL(req.url ?? '/', 'http://localhost');
          const route = urlObj.pathname; // stripped of /api/db prefix by Connect

          try {
            const db = getDB();

            if (route === '/save' && req.method === 'POST') {
              const body = await readBody(req) as {
                sourceType: string;
                sourceRef?: string;
                textLength: number;
                totalMatches: number;
                confirmedWel: number;
                data: unknown;
              };
              const result = db.prepare(`
                INSERT INTO analyses
                  (source_type, source_ref, text_length, total_matches, confirmed_wel, data)
                VALUES (?, ?, ?, ?, ?, ?)
              `).run(
                body.sourceType,
                body.sourceRef ?? null,
                body.textLength,
                body.totalMatches,
                body.confirmedWel,
                JSON.stringify(body.data),
              );
              sendJSON(res, 200, { id: result.lastInsertRowid });

            } else if (route === '/list' && req.method === 'GET') {
              const rows = db.prepare(`
                SELECT id, created_at, source_type, source_ref, total_matches, confirmed_wel
                FROM analyses ORDER BY created_at DESC LIMIT 100
              `).all();
              sendJSON(res, 200, rows);

            } else if (route === '/get' && req.method === 'GET') {
              const id = urlObj.searchParams.get('id');
              const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(id) as Record<string, unknown> | undefined;
              if (!row) { sendJSON(res, 404, { error: 'Not found' }); return; }
              sendJSON(res, 200, { ...row, data: JSON.parse(row.data as string) });

            } else if (route === '/delete' && req.method === 'DELETE') {
              const id = urlObj.searchParams.get('id');
              db.prepare('DELETE FROM analyses WHERE id = ?').run(id);
              sendJSON(res, 200, { ok: true });

            } else {
              sendJSON(res, 404, { error: 'Route not found' });
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            sendJSON(res, 500, { error: msg });
          }
        });

        // ── /api/fetch-url — CORS proxy ──────────────────────────────────────
        server.middlewares.use('/api/fetch-url', async (req: IncomingMessage, res: ServerResponse) => {
          const urlObj = new URL(req.url ?? '/', 'http://localhost');
          const targetUrl = urlObj.searchParams.get('url');

          if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing url parameter');
            return;
          }

          try {
            const upstream = await fetch(targetUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CTIConfidenceParser/1.0)' },
            });
            const buffer = await upstream.arrayBuffer();
            const contentType = upstream.headers.get('content-type') ?? 'text/plain';
            res.writeHead(upstream.status, {
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*',
            });
            res.end(Buffer.from(buffer));
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Fetch failed: ${msg}`);
          }
        });

      },
    },
  ],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
});

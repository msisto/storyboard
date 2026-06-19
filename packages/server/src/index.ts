import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import path from 'path';

// ── Database ─────────────────────────────────────────────────────────────────

const DB_PATH = path.join(__dirname, '..', 'storyboard.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    data      TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

interface FileRow { id: string; name: string; createdAt: number; updatedAt: number }
interface FileBody { id: string; name: string; createdAt: number; updatedAt: number }

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: 'http://localhost:1234' }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/files', (_req, res) => {
  const rows = db
    .prepare('SELECT id, name, createdAt, updatedAt FROM files ORDER BY updatedAt DESC')
    .all() as FileRow[];
  res.json(rows);
});

app.get('/api/files/:id', (req, res) => {
  const row = db.prepare('SELECT data FROM files WHERE id = ?').get(req.params.id) as
    | { data: string }
    | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json(JSON.parse(row.data));
});

app.post('/api/files', (req, res) => {
  const file = req.body?.file as FileBody | undefined;
  if (!file?.id || !file?.name) return res.status(400).json({ error: 'file.id and file.name required' });
  db.prepare(
    'INSERT INTO files (id, name, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
  ).run(file.id, file.name, JSON.stringify(req.body.file), file.createdAt, file.updatedAt);
  return res.status(201).json({ id: file.id, name: file.name, createdAt: file.createdAt, updatedAt: file.updatedAt });
});

app.put('/api/files/:id', (req, res) => {
  const file = req.body?.file as FileBody | undefined;
  if (!file) return res.status(400).json({ error: 'file required' });
  const result = db
    .prepare('UPDATE files SET name = ?, data = ?, updatedAt = ? WHERE id = ?')
    .run(file.name, JSON.stringify(req.body.file), file.updatedAt, req.params.id) as { changes: number };
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  return res.json({ id: req.params.id, name: file.name, updatedAt: file.updatedAt });
});

app.delete('/api/files/:id', (req, res) => {
  db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ── WebSocket ─────────────────────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map<string, Set<WebSocket>>();

function broadcastPeers(fileId: string) {
  const count = rooms.get(fileId)?.size ?? 0;
  rooms.get(fileId)?.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'peers', count }));
    }
  });
}

wss.on('connection', (ws) => {
  let currentRoom: string | null = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString()) as { type: string; fileId?: string };

      if (msg.type === 'join' && msg.fileId) {
        if (currentRoom) {
          rooms.get(currentRoom)?.delete(ws);
          broadcastPeers(currentRoom);
        }
        currentRoom = msg.fileId;
        if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
        rooms.get(currentRoom)!.add(ws);
        broadcastPeers(currentRoom);
        return;
      }

      if (currentRoom) {
        rooms.get(currentRoom)?.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
          }
        });
      }
    } catch {
      // ignore malformed messages
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      rooms.get(currentRoom)?.delete(ws);
      broadcastPeers(currentRoom);
    }
  });

  ws.on('error', () => {
    if (currentRoom) {
      rooms.get(currentRoom)?.delete(ws);
      broadcastPeers(currentRoom);
    }
  });
});

const PORT = 3333;
server.listen(PORT, () => {
  console.log(`Storyboard server listening on :${PORT} — DB: ${DB_PATH}`);
});

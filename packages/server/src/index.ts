import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

// ── Designs directory ─────────────────────────────────────────────────────────
// Design files live in /designs at the repo root, checked in alongside source.

const DESIGNS_DIR = path.join(__dirname, '../../../designs');
if (!fs.existsSync(DESIGNS_DIR)) fs.mkdirSync(DESIGNS_DIR, { recursive: true });

interface DesignFile {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

function designPath(id: string): string {
  return path.join(DESIGNS_DIR, `${id}.json`);
}

function readDesign(id: string): DesignFile | null {
  const p = designPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as DesignFile;
  } catch {
    return null;
  }
}

function writeDesign(file: DesignFile): void {
  fs.writeFileSync(designPath(file.id), JSON.stringify(file, null, 2), 'utf8');
}

function listDesigns(): Pick<DesignFile, 'id' | 'name' | 'createdAt' | 'updatedAt'>[] {
  return fs
    .readdirSync(DESIGNS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const id = f.replace(/\.json$/, '');
      const design = readDesign(id);
      if (!design) return null;
      return { id: design.id, name: design.name, createdAt: design.createdAt, updatedAt: design.updatedAt };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: 'http://localhost:1618' }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/files', (_req, res) => {
  res.json(listDesigns());
});

app.get('/api/files/:id', (req, res) => {
  const design = readDesign(req.params.id);
  if (!design) return res.status(404).json({ error: 'Not found' });
  return res.json(design);
});

app.post('/api/files', (req, res) => {
  const file = req.body?.file as DesignFile | undefined;
  if (!file?.id || !file?.name) return res.status(400).json({ error: 'file.id and file.name required' });
  writeDesign(file);
  return res.status(201).json({ id: file.id, name: file.name, createdAt: file.createdAt, updatedAt: file.updatedAt });
});

app.put('/api/files/:id', (req, res) => {
  const file = req.body?.file as DesignFile | undefined;
  if (!file) return res.status(400).json({ error: 'file required' });
  if (!fs.existsSync(designPath(req.params.id))) return res.status(404).json({ error: 'Not found' });
  writeDesign(file);
  return res.json({ id: req.params.id, name: file.name, updatedAt: file.updatedAt });
});

app.delete('/api/files/:id', (req, res) => {
  const p = designPath(req.params.id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.status(204).send();
});

// ── Theme editor ─────────────────────────────────────────────────────────────
// Reads and writes the shadcn/ui CSS token files so the theme editor in the
// app can update the design system live across both app and Storybook.

const APP_THEME  = path.join(__dirname, '../../app/src/theme.css');
const SB_GLOBALS = path.join(__dirname, '../../storybook/globals.css');

function parseThemeTokens(css: string): { light: Record<string, string>; dark: Record<string, string> } {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  const counts: Record<string, number> = {};
  for (const line of css.split('\n')) {
    const m = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*;/);
    if (!m) continue;
    const [, name, value] = m;
    counts[name] = (counts[name] ?? 0) + 1;
    if (counts[name] === 1) light[name] = value;
    else if (counts[name] === 2) dark[name] = value;
  }
  return { light, dark };
}

function setOccurrence(css: string, varName: string, value: string, n: 1 | 2): string {
  let hit = 0;
  return css.replace(/([ \t]*)(--[\w-]+)([ \t]*:[ \t]*)([^;]+)(;)/g,
    (_m, ws, name, colon, _val, semi) => {
      if (name !== varName) return _m;
      hit++;
      return hit === n ? `${ws}${name}${colon}${value}${semi}` : _m;
    });
}

app.get('/api/theme', (_req, res) => {
  try {
    const css = fs.readFileSync(APP_THEME, 'utf8');
    res.json(parseThemeTokens(css));
  } catch (err) {
    console.error('Failed to read theme:', err);
    res.status(500).json({ error: 'Failed to read theme' });
  }
});

app.put('/api/theme', (req, res) => {
  const { light, dark } = req.body as { light?: Record<string, string>; dark?: Record<string, string> };
  if (!light || !dark) return res.status(400).json({ error: 'light and dark required' });

  try {
    for (const filePath of [APP_THEME, SB_GLOBALS]) {
      let css = fs.readFileSync(filePath, 'utf8');
      for (const [name, value] of Object.entries(light)) {
        css = setOccurrence(css, name, value, 1);
      }
      for (const [name, value] of Object.entries(dark)) {
        css = setOccurrence(css, name, value, 2);
      }
      fs.writeFileSync(filePath, css, 'utf8');
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to write theme:', err);
    return res.status(500).json({ error: 'Failed to write theme' });
  }
});

// ── Local stories ─────────────────────────────────────────────────────────────
// Writes a real Storybook story file to packages/storybook/src/stories/local/.
// File content is generated client-side (with correct imports); server just writes it.

// __dirname is packages/server/src — go up 2 to packages/, then into storybook/
const LOCAL_STORIES_DIR = path.join(__dirname, '../../storybook/src/stories/local');

function toPascal(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9]+/g, ' ').trim()
    .split(' ').filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join('') || 'Component';
}

app.post('/api/local-stories', async (req, res) => {
  const { name, content } = req.body as { name?: string; content?: string };
  if (!name || !content) return res.status(400).json({ error: 'name and content required' });

  const pascal = toPascal(name);
  const storyId = `local-${pascal.toLowerCase()}--default`;
  const filePath = path.join(LOCAL_STORIES_DIR, `${pascal}.stories.tsx`);

  try {
    if (!fs.existsSync(LOCAL_STORIES_DIR)) fs.mkdirSync(LOCAL_STORIES_DIR, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return res.json({ id: storyId, pascal, file: filePath });
  } catch (err) {
    console.error('Failed to write local story:', err);
    return res.status(500).json({ error: 'Failed to write story file' });
  }
});

app.post('/api/local-stories/batch', (req, res) => {
  const { frames } = req.body as { frames?: { name: string; content: string }[] };
  if (!Array.isArray(frames)) return res.status(400).json({ error: 'frames array required' });

  try {
    if (!fs.existsSync(LOCAL_STORIES_DIR)) fs.mkdirSync(LOCAL_STORIES_DIR, { recursive: true });

    // Build a map of frameId → current filename from existing files so we can
    // delete stale files when a frame is renamed.
    const existingById = new Map<string, string>(); // id → filename
    for (const f of fs.readdirSync(LOCAL_STORIES_DIR).filter((f) => f.endsWith('.stories.tsx'))) {
      try {
        const text = fs.readFileSync(path.join(LOCAL_STORIES_DIR, f), 'utf-8');
        const m = text.match(/^\/\/ @storyboard (.+)$/m);
        if (!m) continue;
        const id = (JSON.parse(m[1]) as { id?: string }).id;
        if (id) existingById.set(id, f);
      } catch { /* skip unreadable files */ }
    }

    for (const { name, content } of frames) {
      if (!name || !content) continue;
      const pascal = toPascal(name);
      const newFilename = `${pascal}.stories.tsx`;

      // Extract the frame id from the content being written.
      const m = content.match(/^\/\/ @storyboard (.+)$/m);
      const frameId = m ? (JSON.parse(m[1]) as { id?: string }).id : undefined;

      // Delete any existing file for this frame id if the name changed.
      if (frameId) {
        const oldFilename = existingById.get(frameId);
        if (oldFilename && oldFilename !== newFilename) {
          fs.unlinkSync(path.join(LOCAL_STORIES_DIR, oldFilename));
        }
      }

      fs.writeFileSync(path.join(LOCAL_STORIES_DIR, newFilename), content, 'utf-8');
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to write frame stories:', err);
    return res.status(500).json({ error: 'Failed to write story files' });
  }
});

// ── WebSocket ─────────────────────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map<string, Set<WebSocket>>();

function broadcastAll(msg: unknown) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

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
  console.log(`Storyboard server listening on :${PORT} — designs: ${DESIGNS_DIR}`);
});

// Watch local story files for external edits. When a developer edits the
// @storyboard comment in a frame file, the canvas reloads that frame via WS.
if (!fs.existsSync(LOCAL_STORIES_DIR)) fs.mkdirSync(LOCAL_STORIES_DIR, { recursive: true });

// Debounce map to avoid double-firing on rapid writes (e.g. from our own batch save)
const watchDebounce = new Map<string, ReturnType<typeof setTimeout>>();

fs.watch(LOCAL_STORIES_DIR, { persistent: false }, (_, filename) => {
  if (!filename?.endsWith('.stories.tsx')) return;
  const filePath = path.join(LOCAL_STORIES_DIR, filename);

  const existing = watchDebounce.get(filename);
  if (existing) clearTimeout(existing);

  watchDebounce.set(filename, setTimeout(() => {
    watchDebounce.delete(filename);
    if (!fs.existsSync(filePath)) return;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/^\/\/ @storyboard (.+)$/m);
      if (!match) return;
      const frame = JSON.parse(match[1]);
      broadcastAll({ type: 'frame-updated', frame });
    } catch {
      // ignore malformed files
    }
  }, 300));
});

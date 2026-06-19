import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
app.use(cors({ origin: 'http://localhost:1234' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

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
  console.log(`Storyboard server listening on :${PORT}`);
});

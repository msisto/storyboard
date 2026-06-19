import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../store/useDesignStore';
import type { Comment, CommentReply, DesignFile } from '../types';

const WS_URL = 'ws://localhost:3333';

type WsOutbound =
  | { type: 'join'; fileId: string; author: string }
  | { type: 'add_comment'; comment: Comment }
  | { type: 'add_reply'; commentId: string; reply: CommentReply }
  | { type: 'resolve_comment'; commentId: string }
  | { type: 'canvas_patch'; file: DesignFile };

type WsInbound =
  | { type: 'comment_added'; comment: Comment }
  | { type: 'reply_added'; commentId: string; reply: CommentReply }
  | { type: 'comment_resolved'; commentId: string }
  | { type: 'peers'; count: number }
  | { type: 'canvas_patch'; file: DesignFile };

export function useCommentSync(author: string) {
  const [connected, setConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  // Use file.id (UUID) as the room key instead of file.name
  const fileId = useDesignStore((s) => s.file?.id ?? null);
  const { addComment, resolveComment, addReply } = useDesignStore.getState();

  const sendRef = useRef<(msg: WsOutbound) => void>(() => {});

  // Tracks the last updatedAt we broadcast to avoid re-broadcasting a patch
  // we just received from a peer (echo suppression).
  const lastBroadcastAtRef = useRef<number>(0);
  const canvasPatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!fileId) return;

    let destroyed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (destroyed) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }
        backoffRef.current = 1000;
        setConnected(true);
        ws.send(JSON.stringify({ type: 'join', fileId, author }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WsInbound;
          if (msg.type === 'peers') {
            setPeerCount(msg.count);
          } else if (msg.type === 'comment_added') {
            addComment(msg.comment);
          } else if (msg.type === 'comment_resolved') {
            resolveComment(msg.commentId);
          } else if (msg.type === 'reply_added') {
            addReply(msg.commentId, msg.reply);
          } else if (msg.type === 'canvas_patch') {
            const store = useDesignStore.getState();
            const local = store.file;
            if (!local || msg.file.updatedAt > local.updatedAt) {
              // Suppress echo: mark this timestamp as already broadcast so
              // the store subscription below doesn't re-send it.
              lastBroadcastAtRef.current = msg.file.updatedAt;
              store.loadFile(msg.file);
            }
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (destroyed) return;
        setConnected(false);
        setPeerCount(0);
        const delay = Math.min(backoffRef.current, 30000);
        backoffRef.current = Math.min(backoffRef.current * 2, 30000);
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    sendRef.current = (msg: WsOutbound) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      }
    };

    // Broadcast canvas state to peers whenever the design changes (debounced).
    const canvasUnsub = useDesignStore.subscribe((state) => {
      const file = state.file;
      if (!file || !fileId) return;
      if (file.updatedAt <= lastBroadcastAtRef.current) return;

      if (canvasPatchTimerRef.current) clearTimeout(canvasPatchTimerRef.current);
      canvasPatchTimerRef.current = setTimeout(() => {
        const current = useDesignStore.getState().file;
        if (!current) return;
        sendRef.current({ type: 'canvas_patch', file: current });
        lastBroadcastAtRef.current = current.updatedAt;
      }, 500);
    });

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (canvasPatchTimerRef.current) clearTimeout(canvasPatchTimerRef.current);
      canvasUnsub();
      wsRef.current?.close();
      setConnected(false);
    };
  }, [fileId, author]);

  const broadcast = (msg: WsOutbound) => sendRef.current(msg);

  return { connected, peerCount, broadcast };
}

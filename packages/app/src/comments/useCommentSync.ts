import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../store/useDesignStore';
import type { Comment, CommentReply } from '../types';

const WS_URL = 'ws://localhost:3333';

type WsOutbound =
  | { type: 'join'; fileId: string; author: string }
  | { type: 'add_comment'; comment: Comment }
  | { type: 'add_reply'; commentId: string; reply: CommentReply }
  | { type: 'resolve_comment'; commentId: string };

type WsInbound =
  | { type: 'comment_added'; comment: Comment }
  | { type: 'reply_added'; commentId: string; reply: CommentReply }
  | { type: 'comment_resolved'; commentId: string }
  | { type: 'peers'; count: number };

export function useCommentSync(author: string) {
  const [connected, setConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const fileId = useDesignStore((s) => s.file?.name ?? null);
  const { addComment, resolveComment, addReply } = useDesignStore.getState();

  const sendRef = useRef<(msg: WsOutbound) => void>(() => {});

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
          if (msg.type === 'peers') setPeerCount(msg.count);
          else if (msg.type === 'comment_added') addComment(msg.comment);
          else if (msg.type === 'comment_resolved') resolveComment(msg.commentId);
          else if (msg.type === 'reply_added') addReply(msg.commentId, msg.reply);
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

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      setConnected(false);
    };
  }, [fileId, author]);

  const broadcast = (msg: WsOutbound) => sendRef.current(msg);

  return { connected, peerCount, broadcast };
}

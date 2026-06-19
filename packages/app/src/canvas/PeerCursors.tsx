import React from 'react';
import type { CanvasViewport } from '../types';
import type { PeerCursor } from '../comments/useCommentSync';

interface PeerCursorsProps {
  cursors: Map<string, PeerCursor>;
  viewport: CanvasViewport;
}

// SVG cursor arrow matching the OS default pointer shape
const CursorSVG = ({ color }: { color: string }) => (
  <svg width="16" height="20" viewBox="0 0 16 20" fill="none" style={{ display: 'block' }}>
    <path
      d="M0 0L0 14L4 10L6.5 16L8.5 15.5L6 9.5L11 9.5Z"
      fill={color}
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export function PeerCursors({ cursors, viewport }: PeerCursorsProps) {
  if (cursors.size === 0) return null;

  return (
    <>
      {Array.from(cursors.entries()).map(([sessionId, cursor]) => {
        const screenX = cursor.x * viewport.zoom + viewport.x;
        const screenY = cursor.y * viewport.zoom + viewport.y;
        return (
          <div
            key={sessionId}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              pointerEvents: 'none',
              zIndex: 1000,
              transform: 'translate(0, 0)',
            }}
          >
            <CursorSVG color={cursor.color} />
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 8,
                background: cursor.color,
                color: 'white',
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                fontFamily: 'system-ui, sans-serif',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            >
              {cursor.author}
            </div>
          </div>
        );
      })}
    </>
  );
}

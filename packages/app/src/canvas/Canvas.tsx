import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDesignStore } from '../store/useDesignStore';
import { FrameNode } from './FrameNode';
import { PeerCursors } from './PeerCursors';
import type { PeerCursor } from '../comments/useCommentSync';

const CHECKERBOARD = `
  repeating-conic-gradient(var(--sb-canvas-a) 0% 25%, var(--sb-canvas-b) 0% 50%) 0 0 / 20px 20px
`;

interface CanvasProps {
  sendCursor?: (x: number, y: number) => void;
  peerCursors?: Map<string, PeerCursor>;
}

export function Canvas({ sendCursor, peerCursors }: CanvasProps = {}) {
  const { viewport, activeTool, pan, zoom, setTool } = useCanvasStore();
  const { file, addFrame, selectFrame, selectComponent, selectedFrameId, selectedFrameIds } = useDesignStore();
  const rootRef = useRef<HTMLDivElement>(null);

  // Middle-mouse / space pan
  const isPanning = useRef(false);
  const isSpacePanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Frame rubber-band
  const [rubberBand, setRubberBand] = useState<{
    x: number; y: number; w: number; h: number;
  } | null>(null);
  const rbStart = useRef<{ x: number; y: number } | null>(null);

  // Convert screen coords to world coords
  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - viewport.x) / viewport.zoom,
      y: (sy - viewport.y) / viewport.zoom,
    }),
    [viewport]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = rootRef.current?.getBoundingClientRect();
        const originX = e.clientX - (rect?.left ?? 0);
        const originY = e.clientY - (rect?.top ?? 0);
        zoom(-e.deltaY, originX, originY);
      } else {
        pan(-e.deltaX, -e.deltaY);
      }
    },
    [zoom, pan]
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Keyboard shortcuts for pan tool
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePanning.current && e.target === document.body) {
        isSpacePanning.current = true;
        if (rootRef.current) rootRef.current.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePanning.current = false;
        if (rootRef.current) rootRef.current.style.cursor = '';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Middle mouse pan
      if (e.button === 1) {
        e.preventDefault();
        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (e.button !== 0) return;

      // Space+drag pan
      if (isSpacePanning.current || activeTool === 'pan') {
        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        if (rootRef.current) rootRef.current.style.cursor = 'grabbing';
        return;
      }

      // Frame rubber-band
      if (activeTool === 'frame') {
        const rect = rootRef.current!.getBoundingClientRect();
        rbStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setRubberBand({ x: rbStart.current.x, y: rbStart.current.y, w: 0, h: 0 });
        return;
      }

      // Click on empty canvas background → deselect
      if (e.target === rootRef.current || (e.target as HTMLElement).dataset.canvasWorld === 'true') {
        selectFrame(null);
        selectComponent(null);
      }
    },
    [activeTool, selectFrame, selectComponent]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPanning.current) {
        pan(e.clientX - lastPos.current.x, e.clientY - lastPos.current.y);
        lastPos.current = { x: e.clientX, y: e.clientY };
        return;
      }
      if (activeTool === 'frame' && rbStart.current) {
        const rect = rootRef.current!.getBoundingClientRect();
        const curX = e.clientX - rect.left;
        const curY = e.clientY - rect.top;
        setRubberBand({
          x: Math.min(rbStart.current.x, curX),
          y: Math.min(rbStart.current.y, curY),
          w: Math.abs(curX - rbStart.current.x),
          h: Math.abs(curY - rbStart.current.y),
        });
      }
      if (sendCursor) {
        const rect = rootRef.current?.getBoundingClientRect();
        const cx = e.clientX - (rect?.left ?? 0);
        const cy = e.clientY - (rect?.top ?? 0);
        const vp = useCanvasStore.getState().viewport;
        sendCursor((cx - vp.x) / vp.zoom, (cy - vp.y) / vp.zoom);
      }
    },
    [activeTool, pan, sendCursor]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPanning.current) {
        isPanning.current = false;
        if (rootRef.current) rootRef.current.style.cursor = '';
        return;
      }
      if (activeTool === 'frame' && rbStart.current && rubberBand) {
        rbStart.current = null;
        setRubberBand(null);
        if (rubberBand.w >= 50 && rubberBand.h >= 50) {
          const world = screenToWorld(rubberBand.x, rubberBand.y);
          addFrame(
            Math.round(world.x),
            Math.round(world.y),
            Math.round(rubberBand.w / viewport.zoom),
            Math.round(rubberBand.h / viewport.zoom)
          );
          setTool('select');
        }
      }
    },
    [activeTool, rubberBand, screenToWorld, addFrame, setTool, viewport.zoom]
  );

  const cursor =
    activeTool === 'pan'
      ? 'grab'
      : activeTool === 'frame'
      ? 'crosshair'
      : activeTool === 'comment'
      ? 'crosshair'
      : 'default';

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        background: CHECKERBOARD,
        cursor,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* World transform layer */}
      <div
        data-canvas-world="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {file?.frames.map((frame) => (
          <FrameNode
            key={frame.id}
            frame={frame}
            isSelected={frame.id === selectedFrameId}
            isMultiSelected={selectedFrameIds.length > 1 && selectedFrameIds.includes(frame.id)}
          />
        ))}
      </div>

      {/* Peer cursors overlay */}
      {peerCursors && peerCursors.size > 0 && (
        <PeerCursors cursors={peerCursors} viewport={viewport} />
      )}

      {/* Rubber-band selection for frame tool */}
      {rubberBand && (
        <div
          style={{
            position: 'absolute',
            left: rubberBand.x,
            top: rubberBand.y,
            width: rubberBand.w,
            height: rubberBand.h,
            border: '2px solid #0066FF',
            background: 'rgba(0, 102, 255, 0.08)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

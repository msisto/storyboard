import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDesignStore } from '../store/useDesignStore';
import { FrameNode } from './FrameNode';
import { PeerCursors } from './PeerCursors';
import { CommentPin } from '../comments/CommentPin';
import type { PeerCursor } from '../comments/useCommentSync';
import type { Frame } from '../types';

import type { Comment } from '../types';

interface PlacedComment { comment: Comment; wx: number; wy: number }

// Build a map of frameId → world offset by walking the frame tree.
function buildFrameOffsets(frames: Frame[], ox = 0, oy = 0, out = new Map<string, { x: number; y: number }>()) {
  for (const f of frames) {
    const ax = ox + f.x, ay = oy + f.y;
    out.set(f.id, { x: ax, y: ay });
    if (f.frames?.length) buildFrameOffsets(f.frames, ax, ay, out);
  }
  return out;
}

function placedComments(frames: Frame[], comments: Comment[]): PlacedComment[] {
  const offsets = buildFrameOffsets(frames);
  return comments.map((c) => {
    const off = offsets.get(c.frameId) ?? { x: 0, y: 0 };
    return { comment: c, wx: off.x + c.x, wy: off.y + c.y };
  });
}


interface CanvasProps {
  sendCursor?: (x: number, y: number) => void;
  peerCursors?: Map<string, PeerCursor>;
}

export function Canvas({ sendCursor, peerCursors }: CanvasProps = {}) {
  const { viewport, activeTool, pan, zoom, setTool, globalInteractMode, exitGlobalInteractMode } = useCanvasStore();
  const { file, addFrame, addChildFrame, selectFrame, selectComponent, selectedFrameId, selectedFrameIds } = useDesignStore();
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
      const { interactingComponentId, globalInteractMode } = useCanvasStore.getState();
      const inInteractMode = interactingComponentId || globalInteractMode;
      if (inInteractMode && !(e.ctrlKey || e.metaKey)) {
        // Walk up from event target looking for a scrollable element.
        // Check the Radix viewport data attribute directly to avoid relying on
        // computed overflowY, which starts as "hidden" until Radix's internal
        // scrollbarYEnabled measurement fires (causing getComputedStyle to miss it).
        const stop = rootRef.current;
        let el: Element | null = e.target as Element;
        const scale = e.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? 1 : e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 20 : 300;
        while (el && el !== stop) {
          const h = el as HTMLElement;
          const isRadixViewport = el.hasAttribute('data-radix-scroll-area-viewport');
          if (isRadixViewport) {
            if (e.deltaY !== 0) h.scrollTop += e.deltaY * scale;
            if (e.deltaX !== 0) h.scrollLeft += e.deltaX * scale;
            e.preventDefault();
            return;
          }
          // Also handle plain native scroll containers
          const s = window.getComputedStyle(el);
          if (e.deltaY !== 0 && (s.overflowY === 'scroll' || s.overflowY === 'auto') && el.scrollHeight > el.clientHeight) {
            h.scrollTop += e.deltaY * scale;
            e.preventDefault();
            return;
          }
          if (e.deltaX !== 0 && (s.overflowX === 'scroll' || s.overflowX === 'auto') && el.scrollWidth > el.clientWidth) {
            h.scrollLeft += e.deltaX * scale;
            e.preventDefault();
            return;
          }
          el = el.parentElement;
        }
      }
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

  // Receive ctrl+wheel forwarded from iframes so zoom works in global interact mode.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data || e.data.type !== 'storyboard:wheel') return;
      const { instanceId, deltaY, clientX, clientY } = e.data as {
        instanceId: string; deltaY: number; clientX: number; clientY: number;
      };
      // Find the iframe by src URL containing the instanceId and translate
      // its local clientX/Y to canvas-relative coordinates.
      const iframe = Array.from(document.querySelectorAll('iframe')).find(
        (el) => el.src.includes(instanceId)
      );
      if (!iframe || !rootRef.current) return;
      const iframeRect = iframe.getBoundingClientRect();
      const canvasRect = rootRef.current.getBoundingClientRect();
      zoom(-deltaY, iframeRect.left + clientX - canvasRect.left, iframeRect.top + clientY - canvasRect.top);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [zoom]);

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
          const worldX = Math.round(world.x);
          const worldY = Math.round(world.y);
          const worldW = Math.round(rubberBand.w / viewport.zoom);
          const worldH = Math.round(rubberBand.h / viewport.zoom);
          const centerX = worldX + worldW / 2;
          const centerY = worldY + worldH / 2;

          const frames = file?.frames ?? [];
          const parentFrame = frames.find(
            (f) => centerX >= f.x && centerX <= f.x + f.width && centerY >= f.y && centerY <= f.y + f.height
          );

          if (parentFrame) {
            addChildFrame(
              parentFrame.id,
              Math.round(centerX - parentFrame.x - worldW / 2),
              Math.round(centerY - parentFrame.y - worldH / 2),
              worldW,
              worldH
            );
          } else {
            addFrame(worldX, worldY, worldW, worldH);
          }
          setTool('select');
        }
      }
    },
    [activeTool, rubberBand, screenToWorld, addFrame, addChildFrame, setTool, viewport.zoom, file?.frames]
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
        background: 'var(--sb-canvas-bg)',
        cursor,
        boxShadow: globalInteractMode ? 'inset 0 0 0 3px var(--sb-accent)' : 'none',
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

        {/* Comment pins rendered in world space, outside any clipping frame */}
        {file && placedComments(file.frames, file.comments).map(({ comment, wx, wy }) => (
          <div key={comment.id} style={{ position: 'absolute', left: wx, top: wy, zIndex: 9999 }}>
            <CommentPin comment={comment} />
          </div>
        ))}
      </div>

      {/* Peer cursors overlay */}
      {peerCursors && peerCursors.size > 0 && (
        <PeerCursors cursors={peerCursors} viewport={viewport} />
      )}

      {/* Global interact mode badge */}
      {globalInteractMode && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--sb-accent)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 500,
            padding: '4px 12px',
            borderRadius: 20,
            whiteSpace: 'nowrap',
            zIndex: 100,
            pointerEvents: 'none',
            letterSpacing: '0.01em',
          }}
        >
          Interact mode · I to exit
        </div>
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
            border: '2px solid var(--sb-accent)',
            background: 'rgba(0, 102, 255, 0.08)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

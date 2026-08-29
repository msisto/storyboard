import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDesignStore } from '../store/useDesignStore';
import { FrameNode } from './FrameNode';
import { PeerCursors } from './PeerCursors';
import { CommentPin } from '../comments/CommentPin';
import { TransitionInspectorPanel } from '../components/TransitionInspectorPanel';
import type { PeerCursor } from '../comments/useCommentSync';
import type { Frame, FrameTransition } from '../types';

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

function TransitionArrow({
  from, to, transition,
  onOpen,
}: {
  from: Frame; to: Frame; transition: FrameTransition;
  onOpen: (rect: DOMRect) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const sx = from.x + from.width;
  const sy = from.y + from.height / 2;
  const ex = to.x;
  const ey = to.y + to.height / 2;
  const offset = Math.max(80, Math.abs(ex - sx) * 0.5);
  const d = `M ${sx} ${sy} C ${sx + offset} ${sy} ${ex - offset} ${ey} ${ex} ${ey}`;
  const mid = { x: (sx + ex) / 2, y: (sy + ey) / 2 };

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        const svgEl = (e.currentTarget as SVGGElement).closest('svg');
        const svgRect = svgEl?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
        // Create anchor rect near click point
        const rect = { left: e.clientX - 1, top: e.clientY - 1, width: 2, height: 2, right: e.clientX + 1, bottom: e.clientY + 1 } as DOMRect;
        onOpen(rect);
      }}
    >
      {/* Wide invisible hit target */}
      <path d={d} stroke="transparent" strokeWidth={12} fill="none" style={{ pointerEvents: 'stroke' }} />
      {/* Visible arrow */}
      <path
        d={d}
        stroke="var(--sb-accent)"
        strokeWidth={1.5}
        fill="none"
        opacity={hovered ? 0.85 : 0.45}
        markerEnd="url(#transition-arrow)"
        style={{ transition: 'opacity 120ms', pointerEvents: 'none' }}
      />
      {/* Midpoint circle */}
      <circle cx={mid.x} cy={mid.y} r={4} fill="var(--sb-accent)" opacity={hovered ? 0.9 : 0.55} style={{ pointerEvents: 'none' }} />
    </g>
  );
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

  // Transition inspector state
  const [activeConnector, setActiveConnector] = useState<{
    fromFrame: Frame; toFrame?: Frame; rect: DOMRect;
  } | null>(null);
  const activeTransition = activeConnector
    ? (file?.transitions ?? []).find(
        (t) => t.fromFrameId === activeConnector.fromFrame.id &&
               (activeConnector.toFrame ? t.toFrameId === activeConnector.toFrame.id : false)
      )
    : undefined;

  // Hovered frame (for connect handle)
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);

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
      // Track hovered frame for connect handle
      if (activeTool === 'select' && !globalInteractMode) {
        const rect = rootRef.current?.getBoundingClientRect();
        if (rect) {
          const vp = useCanvasStore.getState().viewport;
          const wx = (e.clientX - rect.left - vp.x) / vp.zoom;
          const wy = (e.clientY - rect.top - vp.y) / vp.zoom;
          const hovered = file?.frames.find(
            (f) => wx >= f.x && wx <= f.x + f.width && wy >= f.y && wy <= f.y + f.height
          ) ?? null;
          setHoveredFrameId(hovered?.id ?? null);
        }
      } else if (hoveredFrameId !== null) {
        setHoveredFrameId(null);
      }
    },
    [activeTool, pan, sendCursor, globalInteractMode, file?.frames, hoveredFrameId]
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
        const frames = file?.frames ?? [];
        const drawn = rubberBand.w >= 50 && rubberBand.h >= 50;

        if (drawn) {
          const world = screenToWorld(rubberBand.x, rubberBand.y);
          const worldX = Math.round(world.x);
          const worldY = Math.round(world.y);
          const worldW = Math.round(rubberBand.w / viewport.zoom);
          const worldH = Math.round(rubberBand.h / viewport.zoom);
          const centerX = worldX + worldW / 2;
          const centerY = worldY + worldH / 2;

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
        } else {
          // Click without drawing — use last timeline frame's dimensions
          const timelineFrames = frames.filter((f) => f.inTimeline !== false);
          const ref = timelineFrames[timelineFrames.length - 1];
          const w = ref?.width ?? 390;
          const h = ref?.height ?? 844;
          const world = screenToWorld(rubberBand.x, rubberBand.y);
          addFrame(Math.round(world.x), Math.round(world.y), w, h);
        }
        setTool('select');
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
        {/* Transition arrows — rendered under frames */}
        <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', width: 0, height: 0, pointerEvents: 'none' }}>
          <defs>
            <marker id="transition-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="var(--sb-accent)" />
            </marker>
          </defs>
          <g style={{ pointerEvents: 'all' }}>
            {(file?.transitions ?? []).map((t) => {
              const fromF = file!.frames.find((f) => f.id === t.fromFrameId);
              const toF = file!.frames.find((f) => f.id === t.toFrameId);
              if (!fromF || !toF) return null;
              return (
                <TransitionArrow
                  key={t.id}
                  from={fromF}
                  to={toF}
                  transition={t}
                  onOpen={(rect) => setActiveConnector({ fromFrame: fromF, toFrame: toF, rect })}
                />
              );
            })}
          </g>
        </svg>

        {file?.frames.map((frame) => (
          <FrameNode
            key={frame.id}
            frame={frame}
            isSelected={frame.id === selectedFrameId}
            isMultiSelected={selectedFrameIds.length > 1 && selectedFrameIds.includes(frame.id)}
          />
        ))}

        {/* Connect "+" handle on hovered frame */}
        {activeTool === 'select' && !globalInteractMode && hoveredFrameId && (() => {
          const f = file?.frames.find((fr) => fr.id === hoveredFrameId);
          if (!f) return null;
          return (
            <div
              style={{
                position: 'absolute',
                left: f.x + f.width + 4,
                top: f.y + f.height / 2 - 10,
                width: 20, height: 20,
                borderRadius: '50%',
                background: 'var(--sb-accent)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 200,
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
              title="Add transition from this frame"
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setActiveConnector({ fromFrame: f, toFrame: undefined, rect });
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1V9M1 5H9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          );
        })()}

        {/* Comment pins: unread in any mode, all unresolved in comment mode */}
        {file && placedComments(file.frames, file.comments.filter((c) =>
          !c.resolved && (activeTool === 'comment' || !c.read)
        )).map(({ comment, wx, wy }) => (
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

      {/* Transition inspector */}
      {activeConnector && (
        <TransitionInspectorPanel
          fromFrame={activeConnector.fromFrame}
          toFrame={activeConnector.toFrame}
          allFrames={file?.frames ?? []}
          transition={activeTransition}
          anchorRect={activeConnector.rect}
          onAdd={(toFrameId) => {
            const { addTransition } = useDesignStore.getState();
            addTransition(activeConnector.fromFrame.id, toFrameId, { type: 'manual' });
            // After adding, update activeConnector to know the destination
            const toF = file?.frames.find((f) => f.id === toFrameId);
            if (toF) setActiveConnector((prev) => prev ? { ...prev, toFrame: toF } : null);
          }}
          onUpdate={(trigger) => {
            if (activeTransition) {
              const { updateTransition } = useDesignStore.getState();
              updateTransition(activeTransition.id, { trigger });
            }
          }}
          onRemove={() => {
            if (activeTransition) {
              const { removeTransition } = useDesignStore.getState();
              removeTransition(activeTransition.id);
            }
            setActiveConnector(null);
          }}
          onClose={() => setActiveConnector(null)}
        />
      )}
    </div>
  );
}

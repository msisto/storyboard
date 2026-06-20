import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { Frame } from '../types';
import { useDesignStore } from '../store/useDesignStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { ComponentNode } from './ComponentNode';
import { ResizeHandles } from './ResizeHandles';
import { CommentPin } from '../comments/CommentPin';
import { computeAutoLayout } from './autoLayout';
import { TextLayerNode } from './TextLayerNode';

type Direction = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

function getCombinedFlow(frame: Frame, excludeId?: string) {
  const all = [
    ...frame.components.filter((c) => !c.absolute && c.visible),
    ...(frame.textLayers ?? []).filter((t) => !t.absolute && t.visible),
    ...(frame.frames ?? []).filter((cf) => !cf.absolute && (cf.visible ?? true)),
  ];
  if (frame.flowOrder) {
    const order = frame.flowOrder;
    all.sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
  }
  return excludeId ? all.filter((item) => item.id !== excludeId) : all;
}

// ── ChildFrameNode ────────────────────────────────────────────────────────────

interface ChildFrameNodeProps {
  frame: Frame;
  parentFrameId: string;
  isSelected: boolean;
  computedGeometry: { x: number; y: number; width: number; height: number } | undefined;
  inAutoLayout: boolean;
  onReorderDragStart: (id: string, startX: number, startY: number) => void;
}

function ChildFrameNode({
  frame,
  isSelected,
  computedGeometry,
  inAutoLayout,
  onReorderDragStart,
}: ChildFrameNodeProps) {
  const { selectComponent, updateFrame, pushHistory, selectedComponentIds } = useDesignStore();
  const { viewport } = useCanvasStore();

  const x = inAutoLayout ? (computedGeometry?.x ?? frame.x) : frame.x;
  const y = inAutoLayout ? (computedGeometry?.y ?? frame.y) : frame.y;
  const w = computedGeometry?.width ?? frame.width;
  const h = computedGeometry?.height ?? frame.height;

  const sizeRef = useRef({ x: frame.x, y: frame.y, w: frame.width, h: frame.height });
  sizeRef.current = { x: frame.x, y: frame.y, w: frame.width, h: frame.height };
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // "Entered" = a direct child item is currently selected (user has clicked into the group).
  const isEntered = selectedComponentIds.some(
    (id) =>
      frame.components.some((c) => c.id === id) ||
      (frame.textLayers ?? []).some((t) => t.id === id) ||
      (frame.frames ?? []).some((f) => f.id === id)
  );

  // Show the group-selection overlay whenever neither selected nor entered.
  // The overlay intercepts all pointer events so clicks on inner items reach the group first.
  const showOverlay = !isSelected && !isEntered;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      // preventDefault stops the browser from initiating a native drag, which
      // would swallow our window mousemove listener. To keep keyboard shortcuts
      // working we also explicitly blur any focused input (e.g. the inspector),
      // since preventDefault would otherwise keep focus there.
      e.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        active.blur();
      }
      selectComponent(frame.id);

      if (inAutoLayout) {
        onReorderDragStart(frame.id, e.clientX, e.clientY);
        return;
      }

      // Free drag
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = sizeRef.current.x;
      const origY = sizeRef.current.y;
      let moved = false;
      let lockedAxis: 'x' | 'y' | null = null;
      document.body.style.userSelect = 'none';

      const onMove = (mv: MouseEvent) => {
        const zoom = viewportRef.current.zoom;
        const dx = (mv.clientX - startX) / zoom;
        const dy = (mv.clientY - startY) / zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          if (!moved) pushHistory();
          moved = true;
        }
        if (!moved) return;
        if (mv.shiftKey) {
          if (!lockedAxis) lockedAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        } else {
          lockedAxis = null;
        }
        updateFrame(frame.id, {
          x: Math.round(origX + (lockedAxis === 'y' ? 0 : dx)),
          y: Math.round(origY + (lockedAxis === 'x' ? 0 : dy)),
        });
      };

      const onUp = () => {
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [frame.id, inAutoLayout, selectComponent, onReorderDragStart, updateFrame, pushHistory]
  );

  const getChildGeometry = useCallback(
    () => ({ x: sizeRef.current.x, y: sizeRef.current.y, width: sizeRef.current.w, height: sizeRef.current.h }),
    []
  );

  const handleResize = useCallback(
    (nx: number, ny: number, nw: number, nh: number) => {
      updateFrame(frame.id, { x: nx, y: ny, width: Math.max(20, nw), height: Math.max(20, nh) });
    },
    [frame.id, updateFrame]
  );

  return (
    // Outer div owns the selection outline — keeps it at the correct bounds.
    // ResizeHandles also render here (outside the clipped content area).
    <div
      data-component-node
      style={{
        position: 'absolute',
        left: x, top: y,
        width: w, height: h,
        outline: isSelected ? '2px solid var(--sb-accent)' : 'none',
        outlineOffset: '1px',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Content div clips the inner FrameNode so it never bleeds into the gap
          between adjacent groups in an auto-layout parent. */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <FrameNode frame={{ ...frame, x: 0, y: 0 }} isSelected={false} isChildFrame />
      </div>

      {/* Overlay: intercepts all clicks so the first interaction selects the group,
          not an individual item inside it. Removed once selected or entered. */}
      {showOverlay && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 10 }}
          onMouseDown={handleMouseDown}
        />
      )}

      {isSelected && !inAutoLayout && (
        <ResizeHandles
          getGeometry={getChildGeometry}
          onResize={handleResize}
          onResizeStart={pushHistory}
          zoom={viewport.zoom}
        />
      )}
    </div>
  );
}

// ── FrameNode ─────────────────────────────────────────────────────────────────

interface FrameNodeProps {
  frame: Frame;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isChildFrame?: boolean;
}

const MIN_SIZE = 50;

export function FrameNode({ frame, isSelected, isMultiSelected, isChildFrame }: FrameNodeProps) {
  const { selectFrame, toggleFrameSelection, updateFrame, selectedComponentIds, selectComponent, reorderFlowItem, addTextLayer, pushHistory } =
    useDesignStore();
  const { activeTool, viewport, enterTextEditMode, setTool } = useCanvasStore();
  const comments = useDesignStore((s) => s.file?.comments.filter((c) => c.frameId === frame.id) ?? []);

  const sizeRef = useRef({ x: frame.x, y: frame.y, w: frame.width, h: frame.height });
  sizeRef.current = { x: frame.x, y: frame.y, w: frame.width, h: frame.height };
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const frameRef = useRef(frame);
  frameRef.current = frame;

  const layout = useMemo(() => computeAutoLayout(frame), [frame]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const insertionIndexRef = useRef<number | null>(null);
  insertionIndexRef.current = insertionIndex;

  const innerDivRef = useRef<HTMLDivElement>(null);

  const REORDER_DRAG_THRESHOLD = 6;

  const handleReorderDragStart = useCallback(
    (compId: string, startClientX: number, startClientY: number) => {
      draggingIdRef.current = compId;
      selectComponent(compId);
      document.body.style.userSelect = 'none';

      const onMove = (mv: MouseEvent) => {
        if (
          Math.hypot(mv.clientX - startClientX, mv.clientY - startClientY) <
          REORDER_DRAG_THRESHOLD
        )
          return;

        const f = frameRef.current;
        const al = f.autoLayout;
        if (!al || !innerDivRef.current) return;
        const rect = innerDivRef.current.getBoundingClientRect();
        const zoom = viewportRef.current.zoom;
        const cursor =
          al.direction === 'horizontal'
            ? (mv.clientX - rect.left) / zoom
            : (mv.clientY - rect.top) / zoom;

        const flow = getCombinedFlow(f, compId);
        let idx = flow.length;
        for (let i = 0; i < flow.length; i++) {
          const geo = layoutRef.current.components[flow[i].id];
          if (!geo) continue;
          const mid =
            al.direction === 'horizontal'
              ? geo.x + geo.width / 2
              : geo.y + geo.height / 2;
          if (cursor < mid) {
            idx = i;
            break;
          }
        }
        setInsertionIndex(idx);
        insertionIndexRef.current = idx;
      };

      const onUp = () => {
        document.body.style.userSelect = '';
        const idx = insertionIndexRef.current;
        const id = draggingIdRef.current;
        if (id !== null && idx !== null) {
          reorderFlowItem(frameRef.current.id, id, idx);
        }
        draggingIdRef.current = null;
        setInsertionIndex(null);
        insertionIndexRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [selectComponent, reorderFlowItem]
  );

  const handleFrameClick = useCallback(
    (e: React.MouseEvent) => {
      if (isChildFrame) return;
      e.stopPropagation();
      if (activeTool === 'text') {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / viewport.zoom);
        const y = Math.round((e.clientY - rect.top) / viewport.zoom);
        const id = addTextLayer(frame.id, { x, y });
        setTool('select');
        requestAnimationFrame(() => enterTextEditMode(id));
        return;
      }
      if (activeTool === 'select') {
        if (e.shiftKey) return;
        selectFrame(frame.id);
        selectComponent(null);
      }
    },
    [isChildFrame, activeTool, frame.id, viewport.zoom, selectFrame, selectComponent, addTextLayer, setTool, enterTextEditMode]
  );

  const handleFrameMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isChildFrame) return;
      if (e.button !== 0 || activeTool !== 'select') return;
      if ((e.target as HTMLElement).closest('[data-component-node]')) return;
      e.stopPropagation();
      e.preventDefault();

      if (e.shiftKey) {
        toggleFrameSelection(frame.id);
        return;
      }

      selectFrame(frame.id);
      selectComponent(null);
      document.body.style.userSelect = 'none';

      const startX = e.clientX;
      const startY = e.clientY;
      const origX = sizeRef.current.x;
      const origY = sizeRef.current.y;
      let moved = false;
      let lockedAxis: 'x' | 'y' | null = null;

      const onMove = (mv: MouseEvent) => {
        const zoom = viewportRef.current.zoom;
        const dx = (mv.clientX - startX) / zoom;
        const dy = (mv.clientY - startY) / zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          if (!moved) pushHistory();
          moved = true;
        }
        if (!moved) return;
        if (mv.shiftKey) {
          if (!lockedAxis) lockedAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        } else {
          lockedAxis = null;
        }
        updateFrame(frame.id, {
          x: Math.round(origX + (lockedAxis === 'y' ? 0 : dx)),
          y: Math.round(origY + (lockedAxis === 'x' ? 0 : dy)),
        });
      };

      const onUp = () => {
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [isChildFrame, activeTool, frame.id, selectFrame, toggleFrameSelection, selectComponent, updateFrame, pushHistory]
  );

  const getGeometry = useCallback(
    () => ({
      x: sizeRef.current.x,
      y: sizeRef.current.y,
      width: sizeRef.current.w,
      height: sizeRef.current.h,
    }),
    []
  );

  const handleResize = useCallback(
    (x: number, y: number, width: number, height: number) => {
      updateFrame(frame.id, { x, y, width: Math.max(MIN_SIZE, width), height: Math.max(MIN_SIZE, height) });
    },
    [frame.id, updateFrame]
  );

  const handleCommentClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== 'comment') return;
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / viewport.zoom;
      const y = (e.clientY - rect.top) / viewport.zoom;
      const event = new CustomEvent('storyboard:place-comment', {
        detail: { frameId: frame.id, x, y },
        bubbles: true,
      });
      e.currentTarget.dispatchEvent(event);
    },
    [activeTool, frame.id, viewport.zoom]
  );

  const hiddenDirs: Direction[] = [];
  if (frame.autoLayout?.widthMode === 'hug') {
    hiddenDirs.push('e', 'w', 'ne', 'nw', 'se', 'sw');
  }
  if (frame.autoLayout?.heightMode === 'hug') {
    for (const d of ['n', 's', 'ne', 'nw', 'se', 'sw'] as Direction[]) {
      if (!hiddenDirs.includes(d)) hiddenDirs.push(d);
    }
  }

  const insertionLine = (() => {
    if (!frame.autoLayout || insertionIndex === null) return null;
    const al = frame.autoLayout;
    const flowItems = getCombinedFlow(frame);
    const prev = flowItems[insertionIndex - 1];
    const next = flowItems[insertionIndex];
    const lyt = layout;

    if (al.direction === 'horizontal') {
      const prevRight = prev
        ? (lyt.components[prev.id]?.x ?? 0) + (lyt.components[prev.id]?.width ?? 0)
        : al.paddingLeft;
      const nextLeft = next
        ? (lyt.components[next.id]?.x ?? lyt.frameWidth - al.paddingRight)
        : lyt.frameWidth - al.paddingRight;
      const pos = (prevRight + nextLeft) / 2;
      return (
        <div
          style={{
            position: 'absolute',
            left: pos - 1,
            top: 0,
            width: 2,
            height: '100%',
            background: 'var(--sb-accent)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      );
    } else {
      const prevBot = prev
        ? (lyt.components[prev.id]?.y ?? 0) + (lyt.components[prev.id]?.height ?? 0)
        : al.paddingTop;
      const nextTop = next
        ? (lyt.components[next.id]?.y ?? lyt.frameHeight - al.paddingBottom)
        : lyt.frameHeight - al.paddingBottom;
      const pos = (prevBot + nextTop) / 2;
      return (
        <div
          style={{
            position: 'absolute',
            top: pos - 1,
            left: 0,
            height: 2,
            width: '100%',
            background: 'var(--sb-accent)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      );
    }
  })();

  const frameIsSelected = isChildFrame
    ? isSelected
    : isSelected && selectedComponentIds.length === 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: frame.x,
        top: frame.y,
        width: layout.frameWidth,
        height: layout.frameHeight,
        backgroundColor: frame.backgroundColor,
        outline: frameIsSelected
          ? '2px solid var(--sb-accent)'
          : isMultiSelected
          ? '2px solid var(--sb-accent-muted)'
          : 'none',
        boxSizing: 'border-box',
        cursor: activeTool === 'text' ? 'text' : undefined,
      }}
      onClick={handleFrameClick}
      onMouseDown={handleFrameMouseDown}
    >
      {/* Frame label — only for top-level frames */}
      {!isChildFrame && (
        <div
          style={{
            position: 'absolute',
            top: -24,
            left: 0,
            fontSize: 12,
            color: 'var(--sb-text-3)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {frame.label}
        </div>
      )}

      {/* Components + comment click target */}
      <div
        ref={innerDivRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
        onClick={handleCommentClick}
      >
        {frame.components.map((component) => (
          <ComponentNode
            key={component.id}
            instance={component}
            frameId={frame.id}
            isSelected={selectedComponentIds.includes(component.id)}
            computedGeometry={layout.components[component.id]}
            inAutoLayout={!!frame.autoLayout && !component.absolute}
            onReorderDragStart={handleReorderDragStart as (id: string, x: number, y: number) => void}
          />
        ))}

        {(frame.textLayers ?? []).map((tl) => (
          <TextLayerNode
            key={tl.id}
            layer={tl}
            frameId={frame.id}
            isSelected={selectedComponentIds.includes(tl.id)}
            computedGeometry={layout.components[tl.id]}
            inAutoLayout={!!frame.autoLayout && !tl.absolute}
            onReorderDragStart={handleReorderDragStart as (id: string, x: number, y: number) => void}
          />
        ))}

        {(frame.frames ?? []).map((childFrame) => (
          <ChildFrameNode
            key={childFrame.id}
            frame={childFrame}
            parentFrameId={frame.id}
            isSelected={selectedComponentIds.includes(childFrame.id)}
            computedGeometry={layout.components[childFrame.id]}
            inAutoLayout={!!frame.autoLayout && !childFrame.absolute}
            onReorderDragStart={handleReorderDragStart as (id: string, x: number, y: number) => void}
          />
        ))}

        {insertionLine}

        {comments.map((comment) => (
          <CommentPin key={comment.id} comment={comment} />
        ))}

        {activeTool === 'text' && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 999, cursor: 'text' }}
            onClick={handleFrameClick}
          />
        )}
      </div>

      {/* Resize handles only for top-level selected frames with no child selection */}
      {!isChildFrame && isSelected && selectedComponentIds.length === 0 && (
        <ResizeHandles
          getGeometry={getGeometry}
          onResize={handleResize}
          onResizeStart={pushHistory}
          zoom={viewport.zoom}
          hiddenDirections={hiddenDirs.length > 0 ? hiddenDirs : undefined}
        />
      )}
    </div>
  );
}

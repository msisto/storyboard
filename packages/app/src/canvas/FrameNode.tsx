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

interface FrameNodeProps {
  frame: Frame;
  isSelected: boolean;
  isMultiSelected?: boolean;
}

const MIN_SIZE = 50;

export function FrameNode({ frame, isSelected, isMultiSelected }: FrameNodeProps) {
  const { selectFrame, toggleFrameSelection, updateFrame, selectedComponentIds, selectComponent, reorderFlowItem, addTextLayer, pushHistory } =
    useDesignStore();
  const { activeTool, viewport, enterTextEditMode, setTool } = useCanvasStore();
  const comments = useDesignStore((s) => s.file?.comments.filter((c) => c.frameId === frame.id) ?? []);

  const sizeRef = useRef({ x: frame.x, y: frame.y, w: frame.width, h: frame.height });
  sizeRef.current = { x: frame.x, y: frame.y, w: frame.width, h: frame.height };
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Keep frame + layout in refs so drag closures always see the latest values
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const layout = useMemo(() => computeAutoLayout(frame), [frame]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Reorder drag state
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const insertionIndexRef = useRef<number | null>(null);
  insertionIndexRef.current = insertionIndex;

  const innerDivRef = useRef<HTMLDivElement>(null);

  const REORDER_DRAG_THRESHOLD = 6; // px — must move this far before treating as a drag

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
      e.stopPropagation();
      if (activeTool === 'text') {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / viewport.zoom);
        const y = Math.round((e.clientY - rect.top) / viewport.zoom);
        const id = addTextLayer(frame.id, { x, y });
        setTool('select');
        // Short delay so the node has mounted before we enter edit mode
        requestAnimationFrame(() => enterTextEditMode(id));
        return;
      }
      if (activeTool === 'select') {
        if (e.shiftKey) return; // handled by onMouseDown — don't double-toggle
        selectFrame(frame.id);
        selectComponent(null);
      }
    },
    [activeTool, frame.id, viewport.zoom, selectFrame, selectComponent, addTextLayer, setTool, enterTextEditMode]
  );

  const handleFrameMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || activeTool !== 'select') return;
      // If the event came from a component inside this frame, stop here —
      // the component's container already called stopPropagation, but guard
      // defensively against edge cases (e.g. clicking during scroll or resize).
      if ((e.target as HTMLElement).closest('[data-component-node]')) return;
      e.stopPropagation();

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

      const onMove = (mv: MouseEvent) => {
        const zoom = viewportRef.current.zoom;
        const dx = (mv.clientX - startX) / zoom;
        const dy = (mv.clientY - startY) / zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          if (!moved) pushHistory();
          moved = true;
        }
        if (!moved) return;
        updateFrame(frame.id, {
          x: Math.round(origX + dx),
          y: Math.round(origY + dy),
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
    [activeTool, frame.id, selectFrame, toggleFrameSelection, selectComponent, updateFrame, pushHistory]
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

  // Compute which resize handle directions to hide for hug-mode frames
  const hiddenDirs: Direction[] = [];
  if (frame.autoLayout?.widthMode === 'hug') {
    hiddenDirs.push('e', 'w', 'ne', 'nw', 'se', 'sw');
  }
  if (frame.autoLayout?.heightMode === 'hug') {
    // avoid duplicates
    for (const d of ['n', 's', 'ne', 'nw', 'se', 'sw'] as Direction[]) {
      if (!hiddenDirs.includes(d)) hiddenDirs.push(d);
    }
  }

  // Insertion indicator position
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

  return (
    <div
      style={{
        position: 'absolute',
        left: frame.x,
        top: frame.y,
        width: layout.frameWidth,
        height: layout.frameHeight,
        backgroundColor: frame.backgroundColor,
        outline: (isSelected && selectedComponentIds.length === 0)
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
      {/* Frame label */}
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

        {insertionLine}

        {comments.map((comment) => (
          <CommentPin key={comment.id} comment={comment} />
        ))}

        {/* Transparent overlay that captures clicks anywhere in the frame when the text tool is active */}
        {activeTool === 'text' && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 999, cursor: 'text' }}
            onClick={handleFrameClick}
          />
        )}
      </div>

      {/* Resize handles only when the frame itself is selected, not when a child component is */}
      {isSelected && selectedComponentIds.length === 0 && (
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

import React, { useCallback, useEffect, useRef } from 'react';
import type { ComponentInstance } from '../types';
import type { ChildGeometry } from './autoLayout';
import { useDesignStore } from '../store/useDesignStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { ResizeHandles } from './ResizeHandles';
import { getStoryEntry } from '../registry/storyRegistry';
import { renderInstanceTree } from './renderInstance';

interface ComponentNodeProps {
  instance: ComponentInstance;
  frameId: string;
  isSelected: boolean;
  computedGeometry?: ChildGeometry;
  inAutoLayout?: boolean;
  onReorderDragStart?: (id: string, startX: number, startY: number) => void;
}

const MIN_SIZE = 40;

export function ComponentNode({
  instance,
  frameId,
  isSelected,
  computedGeometry,
  inAutoLayout,
  onReorderDragStart,
}: ComponentNodeProps) {
  const { selectComponent, updateComponent, pushHistory } = useDesignStore();
  const { viewport, activeTool, globalInteractMode } =
    useCanvasStore();
  const instanceRef = useRef(instance);
  instanceRef.current = instance;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const computedGeometryRef = useRef(computedGeometry);
  computedGeometryRef.current = computedGeometry;

  const lastSizeRef = useRef<{ w: number; h: number } | null>(null);
  useEffect(() => {
    lastSizeRef.current = null;
  }, [instance.storybookId]);

  // Auto-size via ResizeObserver — measures natural content dimensions
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w > 0 && h > 0) {
        const last = lastSizeRef.current;
        if (last?.w === w && last?.h === h) return;
        lastSizeRef.current = { w, h };
        updateComponent(frameId, instanceRef.current.id, { width: w, height: h });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [frameId, instance.storybookId, updateComponent]);

  const effectiveX = computedGeometry?.x ?? instance.x;
  const effectiveY = computedGeometry?.y ?? instance.y;
  const effectiveWidth = computedGeometry?.width ?? instance.width;
  const effectiveHeight = computedGeometry?.height ?? instance.height;

  const getGeometry = useCallback(() => {
    const geo = computedGeometryRef.current;
    return {
      x: geo?.x ?? instanceRef.current.x,
      y: geo?.y ?? instanceRef.current.y,
      width: geo?.width ?? instanceRef.current.width,
      height: geo?.height ?? instanceRef.current.height,
    };
  }, []);

  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (activeTool !== 'select') return;
      e.stopPropagation();
      e.preventDefault();

      selectComponent(instance.id, e.shiftKey);
      containerRef.current?.focus();

      if (e.shiftKey) return;

      if (inAutoLayout && !instance.absolute) {
        onReorderDragStart?.(instance.id, e.clientX, e.clientY);
        return;
      }

      document.body.style.userSelect = 'none';
      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;
      let lockedAxis: 'x' | 'y' | null = null;
      const origX = instanceRef.current.x;
      const origY = instanceRef.current.y;

      const onMove = (mv: MouseEvent) => {
        const dx = (mv.clientX - startX) / viewport.zoom;
        const dy = (mv.clientY - startY) / viewport.zoom;
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
        updateComponent(frameId, instance.id, {
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
    [activeTool, instance.id, instance.absolute, frameId, inAutoLayout,
     selectComponent, updateComponent, onReorderDragStart, pushHistory, viewport.zoom]
  );

  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    []
  );

  const handleResize = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const w = Math.max(MIN_SIZE, width);
      const h = Math.max(MIN_SIZE, height);
      if (inAutoLayout && !instance.absolute) {
        updateComponent(frameId, instance.id, { width: w, height: h });
      } else {
        updateComponent(frameId, instance.id, { x, y, width: w, height: h });
      }
    },
    [frameId, instance.id, instance.absolute, inAutoLayout, updateComponent]
  );

  const overlayCursor = activeTool === 'comment'
    ? 'crosshair'
    : inAutoLayout && !instance.absolute
    ? 'grab'
    : instance.locked
    ? 'not-allowed'
    : activeTool === 'select'
    ? 'move'
    : 'default';

  if (!instance.visible) return null;

  const entry = getStoryEntry(instance.storybookId);
  const showOverlay = !globalInteractMode;

  const widthHug = instance.widthMode === 'hug';
  const heightHug = instance.heightMode === 'hug';

  return (
    <div
      data-component-node="true"
      style={{
        position: 'absolute',
        left: effectiveX,
        top: effectiveY,
        width: widthHug ? 'fit-content' : effectiveWidth,
        height: heightHug ? 'auto' : effectiveHeight,
        opacity: instance.locked ? 0.6 : 1,
        outline: isSelected ? '2px solid var(--sb-accent)' : 'none',
        outlineOffset: -2,
        overflow: 'hidden',
      }}
      ref={containerRef}
      onMouseDown={handleContainerMouseDown}
      onClick={(e) => { if (activeTool !== 'comment') e.stopPropagation(); }}
    >
      {/* Selection/drag overlay — removed in interact mode so component receives events */}
      {showOverlay && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: overlayCursor }}
          onMouseDown={handleOverlayMouseDown}
          onClick={(e) => { if (activeTool !== 'comment') e.stopPropagation(); }}
        />
      )}

      {/* Native component render */}
      <div
        ref={contentRef}
        style={{ width: widthHug ? 'fit-content' : '100%', minHeight: heightHug ? undefined : '100%' }}
        onPointerDown={showOverlay && activeTool !== 'comment' ? (e) => e.stopPropagation() : undefined}
      >
        {entry ? (
          renderInstanceTree(instance)
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'hsl(var(--muted))',
              color: 'hsl(var(--muted-foreground))',
              fontSize: 12,
              padding: 8,
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          >
            {instance.storybookId}
          </div>
        )}
      </div>

      {isSelected && (
        <ResizeHandles
          getGeometry={getGeometry}
          onResize={handleResize}
          onResizeStart={pushHistory}
          zoom={viewport.zoom}
        />
      )}
    </div>
  );
}

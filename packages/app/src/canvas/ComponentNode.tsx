import React, { useCallback, useEffect, useRef } from 'react';
import type { ComponentInstance } from '../types';
import { useDesignStore } from '../store/useDesignStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { buildIframeUrl } from '../registry/buildIframeUrl';
import { ResizeHandles } from './ResizeHandles';

interface ComponentNodeProps {
  instance: ComponentInstance;
  frameId: string;
  isSelected: boolean;
}

const MIN_SIZE = 40;

export function ComponentNode({ instance, frameId, isSelected }: ComponentNodeProps) {
  const { selectComponent, updateComponent, deleteComponent } = useDesignStore();
  const { interactingComponentId, enterInteractMode, exitInteractMode, viewport, activeTool } =
    useCanvasStore();

  const isInteracting = interactingComponentId === instance.id;
  const instanceRef = useRef(instance);
  instanceRef.current = instance;
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-size once when the iframe first reports its natural dimensions.
  // Uses a ref so it fires only once per component instance lifetime.
  const hasMeasured = useRef(false);
  useEffect(() => {
    hasMeasured.current = false;
  }, [instance.storybookId]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'storyboard:story-size') return;
      if (e.data?.instanceId !== instance.id) return;
      if (hasMeasured.current) return;

      const w = Math.round(e.data.width as number);
      const h = Math.round(e.data.height as number);
      if (w > 0 && h > 0) {
        hasMeasured.current = true;
        updateComponent(frameId, instance.id, { width: w, height: h });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [instance.id, frameId, updateComponent]);

  const iframeUrl = buildIframeUrl(instance.storybookId, instance.args, instance.id);

  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (activeTool !== 'select') return;
      e.stopPropagation();

      selectComponent(instance.id);
      containerRef.current?.focus();

      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;
      const origX = instanceRef.current.x;
      const origY = instanceRef.current.y;

      const onMove = (mv: MouseEvent) => {
        const dx = (mv.clientX - startX) / viewport.zoom;
        const dy = (mv.clientY - startY) / viewport.zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
        if (!moved) return;

        let newX = origX + dx;
        let newY = origY + dy;

        // Shift = 8px grid snap
        if (mv.shiftKey) {
          newX = Math.round(newX / 8) * 8;
          newY = Math.round(newY / 8) * 8;
        }

        updateComponent(frameId, instance.id, { x: Math.round(newX), y: Math.round(newY) });
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [activeTool, instance.id, frameId, selectComponent, updateComponent, viewport.zoom]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (instance.locked) return;
      e.stopPropagation();
      enterInteractMode(instance.id);
    },
    [instance.id, instance.locked, enterInteractMode]
  );

  // Exit interact mode on Escape or click outside
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isInteracting && e.target === e.currentTarget) {
        exitInteractMode();
      }
    },
    [isInteracting, exitInteractMode]
  );

  const getGeometry = useCallback(
    () => ({
      x: instanceRef.current.x,
      y: instanceRef.current.y,
      width: instanceRef.current.width,
      height: instanceRef.current.height,
    }),
    []
  );

  const handleResize = useCallback(
    (x: number, y: number, width: number, height: number) => {
      updateComponent(frameId, instance.id, { x, y, width, height });
    },
    [frameId, instance.id, updateComponent]
  );

  // Delete on keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && isSelected && !isInteracting) {
        deleteComponent(frameId, instance.id);
      }
      if (e.key === 'Escape' && isInteracting) {
        exitInteractMode();
      }
    },
    [isSelected, isInteracting, instance.id, frameId, deleteComponent, exitInteractMode]
  );

  if (!instance.visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: instance.x,
        top: instance.y,
        width: instance.width,
        height: instance.height,
        opacity: instance.locked ? 0.6 : 1,
        outline: isSelected && !isInteracting ? '2px solid #0066FF' : 'none',
        outlineOffset: -2,
      }}
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onMouseDown={handleContainerMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Overlay — sits above iframe to capture pointer events when not interacting */}
      {!isInteracting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            cursor: instance.locked ? 'not-allowed' : activeTool === 'select' ? 'move' : 'default',
          }}
          onMouseDown={handleOverlayMouseDown}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Live Storybook iframe */}
      <iframe
        src={iframeUrl}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          pointerEvents: isInteracting ? 'auto' : 'none',
        }}
        title={instance.label}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />

      {/* Selection resize handles */}
      {isSelected && !isInteracting && (
        <ResizeHandles
          getGeometry={getGeometry}
          onResize={handleResize}
          zoom={viewport.zoom}
        />
      )}

      {/* Interact mode badge */}
      {isInteracting && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: 0,
            background: '#0066FF',
            color: '#fff',
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          Interact mode · Esc to exit
        </div>
      )}
    </div>
  );
}

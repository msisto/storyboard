import React, { useCallback, useEffect, useRef } from 'react';
import type { TextLayer } from '../types';
import { TAILWIND_FONT_SIZES, TAILWIND_FONT_WEIGHTS } from '../types';
import { useDesignStore } from '../store/useDesignStore';
import { useCanvasStore } from '../store/useCanvasStore';
import type { ChildGeometry } from './autoLayout';

interface TextLayerNodeProps {
  layer: TextLayer;
  frameId: string;
  isSelected: boolean;
  computedGeometry?: ChildGeometry;
  inAutoLayout?: boolean;
  onReorderDragStart?: (id: string, startX: number, startY: number) => void;
}

export function TextLayerNode({ layer, frameId, isSelected, computedGeometry, inAutoLayout, onReorderDragStart }: TextLayerNodeProps) {
  const { selectComponent, updateTextLayer } = useDesignStore();
  const { activeTool, editingTextLayerId, enterTextEditMode, exitTextEditMode, viewport } =
    useCanvasStore();
  const isEditing = editingTextLayerId === layer.id;
  const editRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const effectiveX = computedGeometry?.x ?? layer.x;
  const effectiveY = computedGeometry?.y ?? layer.y;
  const effectiveWidth = computedGeometry?.width ?? layer.width;

  const sizeEntry = TAILWIND_FONT_SIZES.find((s) => s.key === layer.fontSize)!;
  const weightEntry = TAILWIND_FONT_WEIGHTS.find((w) => w.key === layer.fontWeight)!;

  // Focus the editable div when entering edit mode
  useEffect(() => {
    if (!isEditing || !editRef.current) return;
    editRef.current.focus();
    // Place cursor at end
    const range = document.createRange();
    range.selectNodeContents(editRef.current);
    range.collapse(false);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    if (!editRef.current) return;
    const newContent = editRef.current.innerText;
    updateTextLayer(frameId, layer.id, {
      content: newContent || 'Text',
      label: newContent.slice(0, 24) || 'Text',
    });
    exitTextEditMode();
  }, [frameId, layer.id, updateTextLayer, exitTextEditMode]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (activeTool !== 'select') return;
      e.stopPropagation();

      if (layer.locked) return;

      selectComponent(layer.id, e.shiftKey);
      containerRef.current?.focus();

      if (e.shiftKey) return;

      // In auto-layout flow: trigger reorder drag
      if (inAutoLayout && !layer.absolute && onReorderDragStart) {
        onReorderDragStart(layer.id, e.clientX, e.clientY);
        return;
      }

      // Free-position drag
      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;
      const origX = layer.x;
      const origY = layer.y;

      const onMove = (mv: MouseEvent) => {
        const dx = (mv.clientX - startX) / viewportRef.current.zoom;
        const dy = (mv.clientY - startY) / viewportRef.current.zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
        if (!moved) return;
        updateTextLayer(frameId, layer.id, {
          x: Math.round(origX + dx),
          y: Math.round(origY + dy),
        });
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [activeTool, layer, frameId, inAutoLayout, onReorderDragStart, selectComponent, updateTextLayer]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (layer.locked) return;
      e.stopPropagation();
      enterTextEditMode(layer.id);
    },
    [layer.id, layer.locked, enterTextEditMode]
  );

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        commitEdit();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      }
      e.stopPropagation();
    },
    [commitEdit]
  );

  const handleEditBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  if (!layer.visible) return null;

  return (
    <div
      data-component-node="true"
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'absolute',
        left: effectiveX,
        top: effectiveY,
        width: effectiveWidth,
        outline: isSelected && !isEditing ? '2px solid #0066FF' : 'none',
        outlineOffset: 2,
        cursor: isEditing ? 'text' : inAutoLayout && !layer.absolute ? 'grab' : activeTool === 'select' ? 'move' : 'default',
        userSelect: isEditing ? 'text' : 'none',
        opacity: layer.locked ? 0.5 : 1,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => e.stopPropagation()}
    >
      {isEditing ? (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: sizeEntry.px,
            lineHeight: `${sizeEntry.lineHeight}px`,
            fontWeight: weightEntry.value,
            color: layer.color,
            outline: '2px solid #0066FF',
            outlineOffset: 2,
            minWidth: 40,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            background: 'transparent',
            padding: 0,
            margin: 0,
          }}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditBlur}
          dangerouslySetInnerHTML={{ __html: layer.content }}
        />
      ) : (
        <div
          style={{
            fontSize: sizeEntry.px,
            lineHeight: `${sizeEntry.lineHeight}px`,
            fontWeight: weightEntry.value,
            color: layer.color,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            pointerEvents: 'none',
          }}
        >
          {layer.content}
        </div>
      )}
    </div>
  );
}

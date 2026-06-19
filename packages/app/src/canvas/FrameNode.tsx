import React, { useCallback, useRef } from 'react';
import type { Frame } from '../types';
import { useDesignStore } from '../store/useDesignStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { ComponentNode } from './ComponentNode';
import { ResizeHandles } from './ResizeHandles';
import { CommentPin } from '../comments/CommentPin';

interface FrameNodeProps {
  frame: Frame;
  isSelected: boolean;
}

const MIN_SIZE = 50;

export function FrameNode({ frame, isSelected }: FrameNodeProps) {
  const { selectFrame, updateFrame, selectedComponentId, selectComponent } = useDesignStore();
  const { activeTool, viewport } = useCanvasStore();
  const comments = useDesignStore((s) => s.file?.comments.filter((c) => c.frameId === frame.id) ?? []);

  const sizeRef = useRef({ x: frame.x, y: frame.y, w: frame.width, h: frame.height });
  sizeRef.current = { x: frame.x, y: frame.y, w: frame.width, h: frame.height };

  const handleFrameClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (activeTool === 'select') {
        selectFrame(frame.id);
        selectComponent(null);
      }
    },
    [activeTool, frame.id, selectFrame, selectComponent]
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
      updateFrame(frame.id, { x, y, width, height });
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
      // Will be handled by the comment placement logic in App
      const event = new CustomEvent('storyboard:place-comment', {
        detail: { frameId: frame.id, x, y },
        bubbles: true,
      });
      e.currentTarget.dispatchEvent(event);
    },
    [activeTool, frame.id, viewport.zoom]
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        backgroundColor: frame.backgroundColor,
        outline: isSelected ? '2px solid #0066FF' : '1px solid #D1D5DB',
        boxSizing: 'border-box',
      }}
      onClick={handleFrameClick}
      onMouseDown={(e) => {
        if (activeTool === 'select' && e.button === 0) {
          selectFrame(frame.id);
        }
      }}
    >
      {/* Frame label */}
      <div
        style={{
          position: 'absolute',
          top: -24,
          left: 0,
          fontSize: 12,
          color: '#6B7280',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {frame.label}
      </div>

      {/* Components + comment click target */}
      <div
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
            isSelected={component.id === selectedComponentId}
          />
        ))}

        {comments.map((comment) => (
          <CommentPin key={comment.id} comment={comment} />
        ))}
      </div>

      {/* Resize handles when selected */}
      {isSelected && (
        <ResizeHandles
          getGeometry={getGeometry}
          onResize={handleResize}
          zoom={viewport.zoom}
        />
      )}
    </div>
  );
}

import React, { useCallback, useRef, useState } from 'react';
import type { Frame } from '../types';

interface StoryboardTimelineProps {
  frames: Frame[];
  selectedFrameId: string | null;
  selectedFrameIds: string[];
  onSelectFrame: (frame: Frame) => void;
  onToggleFrame: (frame: Frame) => void;
  onReorderFrame: (fromIndex: number, toIndex: number) => void;
  onAddFrame: () => void;
}

const CARD_WIDTH = 84;
const DRAG_THRESHOLD = 6;

function FrameThumbnail({ frame }: { frame: Frame }) {
  const scaleX = 52 / Math.max(1, frame.width);
  const scaleY = 38 / Math.max(1, frame.height);
  return (
    <div
      style={{
        width: 52,
        height: 38,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 3,
        background: '#f3f4f6',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: frame.width,
          height: frame.height,
          background: frame.backgroundColor,
          transform: `scale(${scaleX}, ${scaleY})`,
          transformOrigin: '0 0',
        }}
      >
        {frame.components.map((c) => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: c.x,
              top: c.y,
              width: c.width,
              height: c.height,
              background: '#D1D5DB',
              border: '0.5px solid #9CA3AF',
              borderRadius: 1,
            }}
          />
        ))}
        {frame.textLayers?.map((t) => (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left: t.x,
              top: t.y,
              width: t.width ?? 60,
              height: 3,
              background: '#9CA3AF',
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function StoryboardTimeline({
  frames,
  selectedFrameId,
  selectedFrameIds,
  onSelectFrame,
  onToggleFrame,
  onReorderFrame,
  onAddFrame,
}: StoryboardTimelineProps) {
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const insertionIndexRef = useRef<number | null>(null);
  insertionIndexRef.current = insertionIndex;
  const stripRef = useRef<HTMLDivElement>(null);

  const handleCardMouseDown = useCallback(
    (frameId: string, startClientX: number) => {
      draggingIdRef.current = frameId;

      const onMove = (mv: MouseEvent) => {
        if (Math.abs(mv.clientX - startClientX) < DRAG_THRESHOLD) return;

        if (!stripRef.current) return;
        const rect = stripRef.current.getBoundingClientRect();
        const cursor = mv.clientX - rect.left + stripRef.current.scrollLeft;

        const currentFrames = frames.filter((f) => f.id !== frameId);
        let idx = currentFrames.length;
        for (let i = 0; i < currentFrames.length; i++) {
          const cardCenter = i * CARD_WIDTH + CARD_WIDTH / 2;
          if (cursor < cardCenter) {
            idx = i;
            break;
          }
        }
        setInsertionIndex(idx);
        insertionIndexRef.current = idx;
      };

      const onUp = () => {
        const idx = insertionIndexRef.current;
        const id = draggingIdRef.current;
        if (id !== null && idx !== null) {
          const fromIdx = frames.findIndex((f) => f.id === id);
          if (fromIdx !== -1 && fromIdx !== idx) {
            onReorderFrame(fromIdx, idx);
          }
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
    [frames, onReorderFrame]
  );

  return (
    <div
      style={{
        height: 90,
        flexShrink: 0,
        borderTop: '1px solid #e5e7eb',
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Label */}
      <div
        style={{
          width: 72,
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 600,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textAlign: 'center',
          borderRight: '1px solid #e5e7eb',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Timeline
      </div>

      {/* Scrollable strip */}
      <div
        ref={stripRef}
        style={{
          flex: 1,
          height: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '0 8px',
          position: 'relative',
        }}
      >
        {frames.map((frame, i) => {
          const isSelected = frame.id === selectedFrameId;
          const isMultiSelected = selectedFrameIds.length > 1 && selectedFrameIds.includes(frame.id);
          const isDragging = draggingIdRef.current === frame.id;
          const showInsertBefore = insertionIndex === i;
          const showInsertAfter = insertionIndex === frames.length && i === frames.length - 1;

          return (
            <React.Fragment key={frame.id}>
              {/* Insertion line before this card */}
              {showInsertBefore && (
                <div
                  style={{
                    width: 2,
                    height: 64,
                    background: '#0066FF',
                    borderRadius: 1,
                    flexShrink: 0,
                    marginRight: 2,
                  }}
                />
              )}

              {/* Board card */}
              <div
                style={{
                  width: CARD_WIDTH,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 6px',
                  borderRadius: 6,
                  border: isSelected ? '2px solid #0066FF' : isMultiSelected ? '2px solid #60a5fa' : '1px solid transparent',
                  background: isSelected ? '#eff6ff' : isMultiSelected ? '#f0f7ff' : 'transparent',
                  cursor: isDragging ? 'grabbing' : 'pointer',
                  opacity: isDragging ? 0.5 : 1,
                  userSelect: 'none',
                  position: 'relative',
                  boxSizing: 'border-box',
                }}
                onClick={(e) => e.shiftKey ? onToggleFrame(frame) : onSelectFrame(frame)}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  handleCardMouseDown(frame.id, e.clientX);
                }}
              >
                {/* Sequence number badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    color: isSelected ? '#0066FF' : '#9ca3af',
                    lineHeight: 1,
                  }}
                >
                  {i + 1}
                </div>

                <FrameThumbnail frame={frame} />

                <div
                  style={{
                    fontSize: 10,
                    color: isSelected ? '#0066FF' : '#374151',
                    fontWeight: isSelected ? 600 : 400,
                    maxWidth: 72,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  {frame.label}
                </div>
              </div>

              {/* Insertion line after last card */}
              {showInsertAfter && (
                <div
                  style={{
                    width: 2,
                    height: 64,
                    background: '#0066FF',
                    borderRadius: 1,
                    flexShrink: 0,
                    marginLeft: 2,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Add board button */}
        <button
          onClick={onAddFrame}
          style={{
            flexShrink: 0,
            marginLeft: 8,
            width: 68,
            height: 64,
            border: '1.5px dashed #d1d5db',
            borderRadius: 6,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: '#9ca3af',
            fontSize: 10,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#0066FF';
            (e.currentTarget as HTMLButtonElement).style.color = '#0066FF';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
            (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          <span>Add Board</span>
        </button>
      </div>
    </div>
  );
}

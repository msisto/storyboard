import React, { useCallback, useRef, useState } from 'react';
import type { Frame } from '../types';

interface StoryboardTimelineProps {
  frames: Frame[];
  selectedFrameId: string | null;
  selectedFrameIds: string[];
  onSelectFrame: (frame: Frame) => void;
  onToggleFrame: (frame: Frame) => void;
  onReorderFrame: (fromId: string, beforeId: string | null) => void;
  onRemoveFromTimeline: (frameId: string) => void;
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
        background: 'var(--sb-bg-tertiary)',
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
              background: 'var(--sb-border-strong)',
              border: '0.5px solid var(--sb-text-4)',
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
              background: 'var(--sb-text-4)',
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
  onRemoveFromTimeline,
  onAddFrame,
}: StoryboardTimelineProps) {
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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
          const others = frames.filter((f) => f.id !== id);
          const beforeId = idx < others.length ? others[idx].id : null;
          const currentIdx = frames.findIndex((f) => f.id === id);
          const wouldChange = beforeId
            ? frames[currentIdx + 1]?.id !== beforeId
            : currentIdx !== frames.length - 1;
          if (wouldChange) onReorderFrame(id, beforeId);
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
        borderTop: '1px solid var(--sb-border)',
        background: 'var(--sb-bg-secondary)',
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
          color: 'var(--sb-text-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textAlign: 'center',
          borderRight: '1px solid var(--sb-border)',
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
                    background: 'var(--sb-accent)',
                    borderRadius: 1,
                    flexShrink: 0,
                    marginRight: 2,
                  }}
                />
              )}

              {/* Frame card */}
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
                  border: isSelected ? '2px solid var(--sb-accent)' : isMultiSelected ? '2px solid var(--sb-accent-muted)' : '1px solid transparent',
                  background: isSelected ? 'var(--sb-accent-bg)' : isMultiSelected ? 'var(--sb-accent-bg)' : 'transparent',
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
                onMouseEnter={() => setHoveredId(frame.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Sequence number badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    color: isSelected ? 'var(--sb-accent)' : 'var(--sb-text-4)',
                    lineHeight: 1,
                  }}
                >
                  {i + 1}
                </div>

                {/* Remove from timeline button */}
                {hoveredId === frame.id && (
                  <button
                    title="Remove from timeline"
                    onClick={(e) => { e.stopPropagation(); onRemoveFromTimeline(frame.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.45)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 1L7 7M7 1L1 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}

                <FrameThumbnail frame={frame} />

                <div
                  style={{
                    fontSize: 10,
                    color: isSelected ? 'var(--sb-accent)' : 'var(--sb-text-2)',
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
                    background: 'var(--sb-accent)',
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
            border: '1.5px dashed var(--sb-border-strong)',
            borderRadius: 6,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: 'var(--sb-text-4)',
            fontSize: 10,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sb-accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--sb-accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sb-border-strong)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--sb-text-4)';
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          <span>Add Frame</span>
        </button>
      </div>
    </div>
  );
}

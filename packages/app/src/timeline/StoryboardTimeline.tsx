import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Comment, Frame, FrameTransition, TransitionTrigger } from '../types';
import { TAILWIND_FONT_SIZES, TAILWIND_FONT_WEIGHTS } from '../types';
import { getStoryEntry } from '../registry/storyRegistry';

interface StoryboardTimelineProps {
  frames: Frame[];
  comments: Comment[];
  selectedFrameId: string | null;
  selectedFrameIds: string[];
  transitions?: FrameTransition[];
  onSelectFrame: (frame: Frame) => void;
  onToggleFrame: (frame: Frame) => void;
  onReorderFrame: (fromId: string, beforeId: string | null) => void;
  onRemoveFromTimeline: (frameId: string) => void;
  onAddFrame: () => void;
  onAddTransition?: (fromFrameId: string, toFrameId: string) => void;
  onUpdateTransition?: (id: string, trigger: TransitionTrigger) => void;
  onRemoveTransition?: (transitionId: string) => void;
}

const CARD_WIDTH = 84;
const THUMB_W = 52;
const THUMB_H = 38;
const DRAG_THRESHOLD = 6;

/* Crossfade icon — two bezier arcs that cross in the center */
function CrossfadeIcon({ size = 14, color = 'var(--sb-accent)', opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  const h = Math.round(size * 2.4);
  const yTop = Math.round(h * 0.22);
  const yBot = Math.round(h * 0.78);
  const cp = Math.round(size * 0.55);
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} fill="none" style={{ opacity, transition: 'opacity 150ms' }}>
      <path
        d={`M 0 ${yTop} C ${cp} ${yTop} ${size - cp} ${yBot} ${size} ${yBot}`}
        stroke={color} strokeWidth="1.4" strokeLinecap="round"
      />
      <path
        d={`M 0 ${yBot} C ${cp} ${yBot} ${size - cp} ${yTop} ${size} ${yTop}`}
        stroke={color} strokeWidth="1.4" strokeLinecap="round"
      />
    </svg>
  );
}

interface TransitionInspectorPanelProps {
  fromFrame: Frame;
  toFrame: Frame;
  transition?: FrameTransition;
  anchorRect: DOMRect;
  onAdd: () => void;
  onUpdate: (trigger: TransitionTrigger) => void;
  onRemove: () => void;
  onClose: () => void;
}

function TransitionInspectorPanel({ fromFrame, toFrame, transition, anchorRect, onAdd, onUpdate, onRemove, onClose }: TransitionInspectorPanelProps) {
  const trigger = transition?.trigger ?? { type: 'manual' as const };
  const isTimer = trigger.type === 'timer';
  const panelWidth = 264;
  const left = Math.round(anchorRect.left + anchorRect.width / 2 - panelWidth / 2);
  const bottom = window.innerHeight - anchorRect.top + 10;

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest('[data-transition-inspector]')) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const sel: React.CSSProperties = {
    width: '100%', padding: '4px 8px', fontSize: 11,
    border: '1px solid var(--sb-border)', borderRadius: 4,
    background: 'var(--sb-bg)', color: 'var(--sb-text-2)', outline: 'none',
    cursor: 'pointer',
  };

  return createPortal(
    <div
      data-transition-inspector
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8)),
        bottom,
        width: panelWidth,
        background: 'var(--sb-bg)',
        border: '1px solid var(--sb-border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        zIndex: 99998,
        overflow: 'hidden',
      }}
    >
      {/* Header: frame A → crossfade → frame B */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px 8px', borderBottom: '1px solid var(--sb-border)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
          {fromFrame.label}
        </span>
        <CrossfadeIcon size={12} color="var(--sb-accent)" opacity={0.8} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80, textAlign: 'right' }}>
          {toFrame.label}
        </span>
        <button onClick={onClose} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sb-text-4)', fontSize: 13, padding: 2, lineHeight: 1, flexShrink: 0 }}>✕</button>
      </div>

      {/* Trigger config */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--sb-text-3)', flexShrink: 0 }}>Trigger</span>
          <select
            value={isTimer ? 'timer' : 'manual'}
            style={{ ...sel, flex: 1 }}
            onChange={(e) => {
              const t: TransitionTrigger = e.target.value === 'timer'
                ? { type: 'timer', seconds: 3 }
                : { type: 'manual' };
              if (transition) onUpdate(t);
              else { onAdd(); onUpdate(t); }
            }}
          >
            <option value="manual">Tap anywhere to advance</option>
            <option value="timer">Auto-advance after…</option>
          </select>
        </div>

        {isTimer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--sb-text-3)', flexShrink: 0, width: 40 }}>Seconds</span>
            <input
              type="number"
              min={0.5} step={0.5}
              value={(trigger as { seconds: number }).seconds}
              onChange={(e) => onUpdate({ type: 'timer', seconds: parseFloat(e.target.value) || 1 })}
              style={{ ...sel, width: 64 }}
            />
          </div>
        )}

        {!transition && (
          <button
            onClick={onAdd}
            style={{ width: '100%', padding: '5px 0', fontSize: 11, borderRadius: 4, border: 'none', background: 'var(--sb-accent)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Add transition
          </button>
        )}

        {transition && (
          <button
            onClick={() => { onRemove(); onClose(); }}
            style={{ width: '100%', padding: '5px 0', fontSize: 11, borderRadius: 4, border: '1px solid var(--sb-border)', background: 'transparent', color: 'var(--sb-text-3)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Remove transition
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

function ConnectorSlot({
  fromFrame,
  toFrame,
  transition,
  onOpen,
}: {
  fromFrame: Frame;
  toFrame: Frame;
  transition?: FrameTransition;
  onOpen: (rect: DOMRect) => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const connected = !!transition;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (ref.current) onOpen(ref.current.getBoundingClientRect());
      }}
      title={connected ? `${fromFrame.label} → ${toFrame.label}` : 'Add transition'}
      style={{
        flexShrink: 0,
        width: 20,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {connected ? (
        <CrossfadeIcon size={14} color="var(--sb-accent)" opacity={hovered ? 0.95 : 0.55} />
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: hovered ? 0.5 : 0.15, transition: 'opacity 150ms' }}>
          <path d="M5 1V9M1 5H9" stroke="var(--sb-text)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

function ThumbnailFrame({ frame, x = 0, y = 0 }: { frame: Frame; x?: number; y?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: frame.width,
        height: frame.height,
        background: frame.backgroundColor,
        overflow: 'hidden',
      }}
    >
      {frame.textLayers?.map((t) => {
        const fs = TAILWIND_FONT_SIZES.find((s) => s.key === t.fontSize)?.px ?? 14;
        const fw = TAILWIND_FONT_WEIGHTS.find((w) => w.key === t.fontWeight)?.value ?? 400;
        return (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left: t.x,
              top: t.y,
              color: t.color,
              fontSize: fs,
              fontWeight: fw,
              lineHeight: 1.3,
              whiteSpace: 'pre',
              overflow: 'hidden',
              width: t.width,
            }}
          >
            {t.content}
          </div>
        );
      })}
      {frame.components.map((c) => {
        const entry = getStoryEntry(c.storybookId);
        return (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: c.x,
              top: c.y,
              width: c.width,
              height: c.height,
              overflow: 'hidden',
            }}
          >
            {entry ? entry.render({ ...entry.defaultArgs, ...c.args }) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--sb-border-strong)', borderRadius: 2 }} />
            )}
          </div>
        );
      })}
      {frame.frames?.map((cf) => (
        <ThumbnailFrame key={cf.id} frame={cf} x={cf.x} y={cf.y} />
      ))}
    </div>
  );
}

const FrameThumbnail = React.memo(function FrameThumbnail({ frame }: { frame: Frame }) {
  const scale = Math.min(THUMB_W / Math.max(1, frame.width), THUMB_H / Math.max(1, frame.height));
  const offsetX = (THUMB_W - frame.width * scale) / 2;
  const offsetY = (THUMB_H - frame.height * scale) / 2;
  return (
    <div
      style={{
        width: THUMB_W,
        height: THUMB_H,
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
          top: offsetY,
          left: offsetX,
          width: frame.width,
          height: frame.height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <ThumbnailFrame frame={frame} />
      </div>
    </div>
  );
});

export function StoryboardTimeline({
  frames,
  comments,
  selectedFrameId,
  selectedFrameIds,
  transitions = [],
  onSelectFrame,
  onToggleFrame,
  onReorderFrame,
  onRemoveFromTimeline,
  onAddFrame,
  onAddTransition,
  onUpdateTransition,
  onRemoveTransition,
}: StoryboardTimelineProps) {
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSlot, setActiveSlot] = useState<{ fromFrame: Frame; toFrame: Frame; transition?: FrameTransition; rect: DOMRect } | null>(null);
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

  const sortedComments = [...comments].sort((a, b) => b.timestamp - a.timestamp);
  const unreadCount = comments.filter((c) => !c.read && !c.resolved).length;

  return (
    <>
    <div
      style={{
        height: 90,
        flexShrink: 0,
        borderTop: '1px solid var(--sb-border)',
        background: 'var(--sb-bg)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'visible',
        position: 'relative',
      }}
    >
      {/* Comment history panel */}
      {showHistory && (
        <div
          style={{
            position: 'absolute',
            bottom: 94,
            right: 0,
            width: 300,
            maxHeight: 400,
            overflowY: 'auto',
            background: 'var(--sb-bg)',
            border: '1px solid var(--sb-border)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            zIndex: 200,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: '10px 12px 8px',
            fontWeight: 600,
            fontSize: 12,
            color: 'var(--sb-text-2)',
            borderBottom: '1px solid var(--sb-border)',
          }}>
            Comments
          </div>
          {sortedComments.length === 0 ? (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--sb-text-4)', textAlign: 'center' }}>
              No comments yet
            </div>
          ) : sortedComments.map((c) => (
            <div
              key={c.id}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--sb-border)',
                opacity: c.resolved ? 0.45 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-text-2)' }}>
                  {c.author}
                  {!c.read && !c.resolved && (
                    <span style={{
                      display: 'inline-block',
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: '#F59E0B',
                      marginLeft: 5,
                      verticalAlign: 'middle',
                    }} />
                  )}
                </span>
                <span style={{ fontSize: 10, color: 'var(--sb-text-4)' }}>
                  {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--sb-text-2)', margin: 0, lineHeight: 1.4 }}>{c.text}</p>
              {c.replies.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--sb-text-4)' }}>
                  {c.replies.length} {c.replies.length === 1 ? 'reply' : 'replies'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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

              {/* Connector slot between this card and the next */}
              {i < frames.length - 1 && (() => {
                const next = frames[i + 1];
                const t = transitions.find((tr) => tr.fromFrameId === frame.id && tr.toFrameId === next.id);
                return (
                  <ConnectorSlot
                    fromFrame={frame}
                    toFrame={next}
                    transition={t}
                    onOpen={(rect) => setActiveSlot({ fromFrame: frame, toFrame: next, transition: t, rect })}
                  />
                );
              })()}

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

        {/* Add frame button */}
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

      {/* Comment history button — far right */}
      <button
        onClick={() => setShowHistory((v) => !v)}
        title="Comment history"
        style={{
          flexShrink: 0,
          width: 48,
          height: '100%',
          borderLeft: '1px solid var(--sb-border)',
          background: showHistory ? 'var(--sb-bg-tertiary)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          color: showHistory ? 'var(--sb-text)' : 'var(--sb-text-4)',
          position: 'relative',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2C4.686 2 2 4.462 2 7.5c0 1.48.607 2.82 1.593 3.8L3 14l2.857-1.143A6.14 6.14 0 0 0 8 13c3.314 0 6-2.462 6-5.5S11.314 2 8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: 16,
            right: 8,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#F59E0B',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount}
          </div>
        )}
      </button>
    </div>

    {/* Transition inspector portal */}
    {activeSlot && (
      <TransitionInspectorPanel
        fromFrame={activeSlot.fromFrame}
        toFrame={activeSlot.toFrame}
        transition={activeSlot.transition}
        anchorRect={activeSlot.rect}
        onAdd={() => {
          onAddTransition?.(activeSlot.fromFrame.id, activeSlot.toFrame.id);
          const t = transitions.find((tr) => tr.fromFrameId === activeSlot.fromFrame.id && tr.toFrameId === activeSlot.toFrame.id);
          setActiveSlot((s) => s ? { ...s, transition: t } : null);
        }}
        onUpdate={(trigger) => {
          if (activeSlot.transition) onUpdateTransition?.(activeSlot.transition.id, trigger);
        }}
        onRemove={() => {
          if (activeSlot.transition) onRemoveTransition?.(activeSlot.transition.id);
          setActiveSlot(null);
        }}
        onClose={() => setActiveSlot(null)}
      />
    )}
    </>
  );
}

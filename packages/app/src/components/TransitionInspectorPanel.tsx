import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ComponentInstance, Frame, FrameTransition, TransitionTrigger } from '../types';

function collectAllComponents(frame: Frame): ComponentInstance[] {
  return [
    ...frame.components,
    ...(frame.frames ?? []).flatMap(collectAllComponents),
  ];
}

export function CrossfadeIcon({ size = 14, color = 'var(--sb-accent)', opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  const h = Math.round(size * 2.4);
  const yTop = Math.round(h * 0.22);
  const yBot = Math.round(h * 0.78);
  const cp = Math.round(size * 0.55);
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} fill="none" style={{ opacity, transition: 'opacity 150ms' }}>
      <path d={`M 0 ${yTop} C ${cp} ${yTop} ${size - cp} ${yBot} ${size} ${yBot}`} stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d={`M 0 ${yBot} C ${cp} ${yBot} ${size - cp} ${yTop} ${size} ${yTop}`} stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface TransitionInspectorPanelProps {
  fromFrame: Frame;
  toFrame?: Frame;
  allFrames: Frame[];
  transition?: FrameTransition;
  anchorRect: DOMRect;
  onAdd: (toFrameId: string) => void;
  onUpdate: (trigger: TransitionTrigger) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function TransitionInspectorPanel({
  fromFrame, toFrame, allFrames, transition, anchorRect, onAdd, onUpdate, onRemove, onClose,
}: TransitionInspectorPanelProps) {
  const trigger = transition?.trigger ?? { type: 'manual' as const };
  const triggerType = trigger.type === 'component-click' ? 'component-click'
    : trigger.type === 'timer' ? 'timer'
    : 'manual';
  const selectedComponentId = trigger.type === 'component-click' ? trigger.componentId : '';
  const selectedItemValue = trigger.type === 'component-click' ? (trigger.itemValue ?? '') : '';
  const timerSeconds = trigger.type === 'timer' ? trigger.seconds : 3;

  // Pending destination for new transitions (when toFrame is undefined)
  const [pendingToFrameId, setPendingToFrameId] = useState<string>(toFrame?.id ?? '');

  const allComponents = collectAllComponents(fromFrame);
  const selectedComp = allComponents.find((c) => c.id === selectedComponentId);
  const arrayArgEntries = selectedComp
    ? Object.entries(selectedComp.args).filter(
        ([, v]) => Array.isArray(v) && (v as unknown[]).length > 0 && typeof (v as unknown[])[0] === 'object'
      )
    : [];
  const listItems = (arrayArgEntries[0]?.[1] ?? null) as Record<string, unknown>[] | null;
  function itemLabel(item: Record<string, unknown>): string {
    return String(item.label ?? item.title ?? item.name ?? item.value ?? '?');
  }
  function itemValue(item: Record<string, unknown>, i: number): string {
    return String(item.value ?? item.label ?? i);
  }

  const panelWidth = 280;
  const panelLeft = Math.max(8, Math.min(
    Math.round(anchorRect.left + anchorRect.width / 2 - panelWidth / 2),
    window.innerWidth - panelWidth - 8
  ));
  // Show above anchor, but flip below if too close to top
  const showAbove = anchorRect.top >= 260;
  const posStyle: React.CSSProperties = showAbove
    ? { bottom: window.innerHeight - anchorRect.top + 10 }
    : { top: anchorRect.bottom + 10 };

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest('[data-transition-inspector]')) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  function applyTrigger(t: TransitionTrigger) {
    if (transition) onUpdate(t);
  }

  const sel: React.CSSProperties = {
    width: '100%', padding: '4px 8px', fontSize: 11,
    border: '1px solid var(--sb-border)', borderRadius: 4,
    background: 'var(--sb-bg)', color: 'var(--sb-text-2)', outline: 'none',
    cursor: 'pointer',
  };

  const destId = toFrame?.id ?? pendingToFrameId;
  const destFrame = toFrame ?? allFrames.find((f) => f.id === pendingToFrameId);

  return createPortal(
    <div
      data-transition-inspector
      style={{
        position: 'fixed',
        left: panelLeft,
        ...posStyle,
        width: panelWidth,
        background: 'var(--sb-bg)',
        border: '1px solid var(--sb-border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        zIndex: 99998,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px 8px', borderBottom: '1px solid var(--sb-border)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fromFrame.label}
        </span>
        <CrossfadeIcon size={12} color="var(--sb-accent)" opacity={0.8} />
        {toFrame ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
            {toFrame.label}
          </span>
        ) : (
          <select
            value={pendingToFrameId}
            onChange={(e) => setPendingToFrameId(e.target.value)}
            style={{ ...sel, flex: 1, fontSize: 11, fontWeight: 600 }}
          >
            <option value="">— pick destination —</option>
            {allFrames.filter((f) => f.id !== fromFrame.id).map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        )}
        <button onClick={onClose} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sb-text-4)', fontSize: 13, padding: 2, lineHeight: 1, flexShrink: 0 }}>✕</button>
      </div>

      {/* Trigger config */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--sb-text-3)', flexShrink: 0, width: 44 }}>When</span>
          <select
            value={triggerType}
            style={{ ...sel, flex: 1 }}
            onChange={(e) => {
              const v = e.target.value;
              const t: TransitionTrigger = v === 'timer' ? { type: 'timer', seconds: timerSeconds }
                : v === 'component-click' ? { type: 'component-click', componentId: allComponents[0]?.id ?? '' }
                : { type: 'manual' };
              applyTrigger(t);
            }}
          >
            <option value="manual">tap anywhere on screen</option>
            <option value="component-click">click on a component</option>
            <option value="timer">automatically after…</option>
          </select>
        </div>

        {triggerType === 'component-click' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--sb-text-3)', flexShrink: 0, width: 44 }}>Which</span>
            <select
              value={selectedComponentId}
              style={{ ...sel, flex: 1 }}
              onChange={(e) => applyTrigger({ type: 'component-click', componentId: e.target.value })}
            >
              {allComponents.length === 0 && (
                <option value="">— no components on this frame —</option>
              )}
              {allComponents.map((c) => (
                <option key={c.id} value={c.id}>{c.label || c.name}</option>
              ))}
            </select>
          </div>
        )}

        {triggerType === 'component-click' && selectedComponentId && listItems && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--sb-text-3)', flexShrink: 0, width: 44 }}>Item</span>
            <select
              value={selectedItemValue}
              style={{ ...sel, flex: 1 }}
              onChange={(e) => {
                const val = e.target.value;
                applyTrigger({ type: 'component-click', componentId: selectedComponentId, ...(val ? { itemValue: val } : {}) });
              }}
            >
              <option value="">Any item</option>
              {listItems.map((item, i) => (
                <option key={i} value={itemValue(item, i)}>{itemLabel(item)}</option>
              ))}
            </select>
          </div>
        )}

        {triggerType === 'timer' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--sb-text-3)', flexShrink: 0, width: 44 }}>Seconds</span>
            <input
              type="number" min={0.5} step={0.5} value={timerSeconds}
              onChange={(e) => applyTrigger({ type: 'timer', seconds: parseFloat(e.target.value) || 1 })}
              style={{ ...sel, width: 72 }}
            />
          </div>
        )}

        {!transition ? (
          <button
            onClick={() => { if (destId) onAdd(destId); }}
            disabled={!destId}
            style={{
              width: '100%', padding: '5px 0', fontSize: 11, borderRadius: 4, border: 'none',
              background: destId ? 'var(--sb-accent)' : 'var(--sb-border)',
              color: destId ? '#fff' : 'var(--sb-text-4)',
              cursor: destId ? 'pointer' : 'default', fontFamily: 'inherit',
            }}
          >
            Add transition
          </button>
        ) : (
          <button
            onClick={() => { onRemove(); onClose(); }}
            style={{ width: '100%', padding: '5px 0', fontSize: 11, borderRadius: 4, border: '1px solid var(--sb-border)', background: 'transparent', color: 'var(--sb-text-3)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}
          >
            Remove transition
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

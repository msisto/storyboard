import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FramePortalContext } from '@/components/ui/portal-context';
import { computeAutoLayout } from '../canvas/autoLayout';
import { renderInstanceTreePrototype } from '../canvas/renderInstance';
import type { Frame, FrameTransition, TransitionCondition } from '../types';
import { TAILWIND_FONT_SIZES, TAILWIND_FONT_WEIGHTS } from '../types';

interface PrototypePlayerProps {
  frames: Frame[];
  transitions: FrameTransition[];
  onClose: () => void;
}

function evaluateConditions(
  conditions: TransitionCondition[],
  liveArgs: Map<string, Record<string, unknown>>,
  baseArgs: Map<string, Record<string, unknown>>
): boolean {
  return conditions.every((c) => {
    const args = { ...(baseArgs.get(c.componentId) ?? {}), ...(liveArgs.get(c.componentId) ?? {}) };
    const val = args[c.argName];
    switch (c.type) {
      case 'arg-truthy': return !!val;
      case 'arg-falsy': return !val;
      case 'arg-equals': return String(val ?? '') === c.value;
      case 'arg-not-equals': return String(val ?? '') !== c.value;
    }
  });
}

function usePortalContainer() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const ref = useCallback((node: HTMLElement | null) => setEl(node), []);
  return { el, ref };
}

interface ProtoFrameViewProps {
  frame: Frame;
  transitions: FrameTransition[];
  liveArgs: Map<string, Record<string, unknown>>;
  onArgChange: (componentId: string, argName: string, value: unknown) => void;
  onNavigate: (toFrameId: string) => void;
  isManual: boolean;
}

function ProtoFrameView({ frame, transitions, liveArgs, onArgChange, onNavigate, isManual }: ProtoFrameViewProps) {
  const { el: portalContainer, ref: portalRef } = usePortalContainer();
  const layout = useMemo(() => computeAutoLayout(frame), [frame]);

  // Build a map of base args per component for condition evaluation
  const baseArgs = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const c of frame.components) m.set(c.id, c.args ?? {});
    return m;
  }, [frame]);

  // Timer triggers
  useEffect(() => {
    const timers = transitions
      .filter((t) => t.trigger.type === 'timer')
      .map((t) => {
        const secs = (t.trigger as { type: 'timer'; seconds: number }).seconds;
        return setTimeout(() => {
          if (evaluateConditions(t.conditions ?? [], liveArgs, baseArgs)) {
            onNavigate(t.toFrameId);
          }
        }, secs * 1000);
      });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.id]);

  function tryNavigate(componentId: string, eventType: 'component-click' | 'component-submit') {
    for (const t of transitions) {
      if (t.trigger.type !== eventType) continue;
      const tr = t.trigger as { componentId: string; itemValue?: string };
      if (tr.componentId !== componentId) continue;
      if (tr.itemValue) continue; // item-value triggers handled in handleComponentArgChange
      if (evaluateConditions(t.conditions ?? [], liveArgs, baseArgs)) {
        onNavigate(t.toFrameId);
        return;
      }
    }
  }

  function handleComponentArgChange(componentId: string, argName: string, value: unknown) {
    onArgChange(componentId, argName, value);

    // arg-change triggers
    for (const t of transitions) {
      if (t.trigger.type !== 'arg-change') continue;
      const tr = t.trigger as { type: 'arg-change'; componentId: string; argName: string; condition: 'truthy' | 'equals'; value?: string };
      if (tr.componentId !== componentId || tr.argName !== argName) continue;
      const passes = tr.condition === 'truthy' ? !!value : String(value ?? '') === (tr.value ?? '');
      if (passes && evaluateConditions(t.conditions ?? [], liveArgs, baseArgs)) {
        onNavigate(t.toFrameId);
        return;
      }
    }

    // component-click with itemValue — fires when onValueChange/onChange reports the target value
    for (const t of transitions) {
      if (t.trigger.type !== 'component-click') continue;
      const tr = t.trigger as { componentId: string; itemValue?: string };
      if (tr.componentId !== componentId || !tr.itemValue) continue;
      if (String(value ?? '') === tr.itemValue) {
        if (evaluateConditions(t.conditions ?? [], liveArgs, baseArgs)) {
          onNavigate(t.toFrameId);
          return;
        }
      }
    }
  }

  return (
    <FramePortalContext.Provider value={portalContainer}>
      <div
        style={{
          position: 'relative',
          width: frame.width,
          height: frame.height,
          backgroundColor: frame.backgroundColor,
          overflow: 'hidden',
          flexShrink: 0,
        }}
        onClick={isManual ? () => {
          const t = transitions.find((t) => t.trigger.type === 'manual');
          if (t) onNavigate(t.toFrameId);
        } : undefined}
      >
        {/* Portal target for dialogs/sheets */}
        <div
          ref={portalRef}
          style={{ position: 'absolute', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
        />

        {frame.components.map((component) => {
          const geo = layout.components[component.id];
          if (!geo) return null;
          // Whole-component click trigger (no itemValue) — use event bubbling, no overlay
          const wholeClickTrigger = transitions.find(
            (t) => t.trigger.type === 'component-click'
              && (t.trigger as { componentId: string; itemValue?: string }).componentId === component.id
              && !(t.trigger as { itemValue?: string }).itemValue
          );

          return (
            <div
              key={component.id}
              style={{
                position: 'absolute',
                left: geo.x,
                top: geo.y,
                width: geo.width,
                height: geo.height,
                cursor: wholeClickTrigger ? 'pointer' : undefined,
              }}
              onClick={wholeClickTrigger ? () => tryNavigate(component.id, 'component-click') : undefined}
            >
              {renderInstanceTreePrototype(component, liveArgs, handleComponentArgChange)}
            </div>
          );
        })}

        {(frame.textLayers ?? []).map((tl) => {
          const geo = layout.components[tl.id];
          const fs = TAILWIND_FONT_SIZES.find((s) => s.key === tl.fontSize)?.px ?? 16;
          const fw = TAILWIND_FONT_WEIGHTS.find((w) => w.key === tl.fontWeight)?.value ?? 400;
          return (
            <div
              key={tl.id}
              style={{
                position: 'absolute',
                left: geo?.x ?? tl.x,
                top: geo?.y ?? tl.y,
                fontSize: fs,
                fontWeight: fw,
                color: tl.color ?? '#000000',
                whiteSpace: 'pre-wrap',
                pointerEvents: 'none',
              }}
            >
              {tl.content}
            </div>
          );
        })}
      </div>
    </FramePortalContext.Provider>
  );
}

export function PrototypePlayer({ frames, transitions, onClose }: PrototypePlayerProps) {
  const [history, setHistory] = useState<string[]>(() => [frames[0]?.id ?? '']);
  const [fading, setFading] = useState(false);
  const [pendingFrameId, setPendingFrameId] = useState<string | null>(null);
  const [liveArgs, setLiveArgs] = useState<Map<string, Record<string, unknown>>>(new Map());

  const currentFrameId = history[history.length - 1];
  const currentFrame = frames.find((f) => f.id === currentFrameId);
  const currentIndex = frames.findIndex((f) => f.id === currentFrameId);

  const outgoing = useMemo(
    () => transitions.filter((t) => t.fromFrameId === currentFrameId),
    [transitions, currentFrameId]
  );
  const isManual = outgoing.some((t) => t.trigger.type === 'manual');

  const navigate = useCallback((toFrameId: string) => {
    if (fading) return;
    setFading(true);
    setPendingFrameId(toFrameId);
  }, [fading]);

  useEffect(() => {
    if (!fading || !pendingFrameId) return;
    const t = setTimeout(() => {
      setHistory((h) => [...h, pendingFrameId]);
      setLiveArgs(new Map()); // reset live args on navigation
      setPendingFrameId(null);
      setFading(false);
    }, 120);
    return () => clearTimeout(t);
  }, [fading, pendingFrameId]);

  const goBack = useCallback(() => {
    if (history.length <= 1) return;
    setHistory((h) => h.slice(0, -1));
    setLiveArgs(new Map());
  }, [history]);

  const handleArgChange = useCallback((componentId: string, argName: string, value: unknown) => {
    setLiveArgs((prev) => {
      const next = new Map(prev);
      next.set(componentId, { ...(prev.get(componentId) ?? {}), [argName]: value });
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!currentFrame) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: '#0a0a0a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Frame viewport */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          width: '100%',
          padding: '24px 24px 0',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ opacity: fading ? 0 : 1, transition: 'opacity 120ms ease', borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}>
          <ProtoFrameView
            frame={currentFrame}
            transitions={outgoing}
            liveArgs={liveArgs}
            onArgChange={handleArgChange}
            onNavigate={navigate}
            isManual={isManual}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '12px 20px',
          width: '100%', boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Back */}
        <button
          onClick={goBack}
          disabled={history.length <= 1}
          style={{
            background: 'none', border: 'none', cursor: history.length > 1 ? 'pointer' : 'default',
            color: history.length > 1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
            fontSize: 18, padding: 4, lineHeight: 1,
          }}
          title="Back"
        >
          ←
        </button>

        {/* Progress dots */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {frames.map((f, i) => (
            <div
              key={f.id}
              style={{
                width: f.id === currentFrameId ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: f.id === currentFrameId ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                transition: 'width 200ms ease, background 200ms ease',
              }}
            />
          ))}
        </div>

        {/* Frame label + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit' }}>
            {currentFrame.label} · {currentIndex + 1} of {frames.length}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 5, cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)', fontSize: 11, padding: '3px 8px',
              fontFamily: 'inherit',
            }}
          >
            Esc
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

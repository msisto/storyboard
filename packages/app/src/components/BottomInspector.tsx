import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useDesignStore } from '../store/useDesignStore';
import { useRegistryStore } from '../registry/useRegistryStore';
import { buildLocalStoryFile } from '../export/jsxExport';
import type { ComponentInstance, Frame, FrameTransition, TransitionTrigger } from '../types';
import { CrossfadeIcon } from './TransitionInspectorPanel';

type BottomTab = 'code' | 'events';

const PANEL_HEIGHT = 260;

function collectAllComponents(frame: Frame): ComponentInstance[] {
  return [
    ...frame.components,
    ...(frame.frames ?? []).flatMap(collectAllComponents),
  ];
}

// ── Code tab ─────────────────────────────────────────────────────────────────

function CodeTab({ frame }: { frame: Frame }) {
  const { stories } = useRegistryStore();
  const [copied, setCopied] = useState(false);
  const code = buildLocalStoryFile(frame, frame.label, stories);

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '4px 12px', borderBottom: '1px solid var(--sb-border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button onClick={copy} style={{ fontSize: 11, color: 'var(--sb-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <CodeMirror
          value={code}
          readOnly
          theme={vscodeDark}
          extensions={[javascript({ jsx: true, typescript: true })]}
          basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
          style={{ fontSize: 11 }}
        />
      </div>
    </div>
  );
}

// ── Events tab ────────────────────────────────────────────────────────────────

type TriggerMode = 'manual' | 'component-click' | 'timer';

function triggerSummary(t: TransitionTrigger, components: ComponentInstance[]): string {
  if (t.type === 'manual') return 'Tap anywhere';
  if (t.type === 'timer') return `After ${t.seconds}s`;
  if (t.type === 'component-click') {
    const name = components.find((c) => c.id === t.componentId)?.label || components.find((c) => c.id === t.componentId)?.name || 'Unknown';
    return t.itemValue ? `${name} → "${t.itemValue}"` : `Click ${name}`;
  }
  return t.type;
}

function EventRow({
  transition, allFrames, allComponents,
  onUpdate, onRemove,
}: {
  transition: FrameTransition;
  allFrames: Frame[];
  allComponents: ComponentInstance[];
  onUpdate: (patch: Partial<Omit<FrameTransition, 'id'>>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = transition.trigger;
  const triggerType: TriggerMode = t.type === 'timer' ? 'timer' : t.type === 'component-click' ? 'component-click' : 'manual';
  const compId = t.type === 'component-click' ? t.componentId : '';
  const itemValue = t.type === 'component-click' ? (t.itemValue ?? '') : '';
  const seconds = t.type === 'timer' ? t.seconds : 3;

  const selectedComp = allComponents.find((c) => c.id === compId);
  const arrayArgEntries = selectedComp
    ? Object.entries(selectedComp.args).filter(
        ([, v]) => Array.isArray(v) && (v as unknown[]).length > 0 && typeof (v as unknown[])[0] === 'object'
      )
    : [];
  const listItems = (arrayArgEntries[0]?.[1] ?? null) as Record<string, unknown>[] | null;

  const toFrame = allFrames.find((f) => f.id === transition.toFrameId);

  const sel: React.CSSProperties = {
    padding: '3px 6px', fontSize: 11, border: '1px solid var(--sb-border)', borderRadius: 4,
    background: 'var(--sb-bg)', color: 'var(--sb-text-2)', outline: 'none', cursor: 'pointer',
  };

  function buildTrigger(mode: TriggerMode, cId: string, iv: string, secs: number): TransitionTrigger {
    if (mode === 'timer') return { type: 'timer', seconds: secs };
    if (mode === 'component-click') return { type: 'component-click', componentId: cId, ...(iv ? { itemValue: iv } : {}) };
    return { type: 'manual' };
  }

  return (
    <div style={{ borderBottom: '1px solid var(--sb-border)' }}>
      {/* Row summary */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <CrossfadeIcon size={11} color="var(--sb-accent)" opacity={0.7} />
        <span style={{ fontSize: 11, color: 'var(--sb-text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {triggerSummary(t, allComponents)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--sb-accent)', flexShrink: 0 }}>
          → {toFrame?.label ?? '?'}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sb-text-4)', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '6px 14px 10px', display: 'flex', flexDirection: 'column', gap: 7, background: 'var(--sb-bg-secondary)' }}>
          {/* Destination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--sb-text-3)', width: 52, flexShrink: 0 }}>To</span>
            <select value={transition.toFrameId} onChange={(e) => onUpdate({ toFrameId: e.target.value })} style={{ ...sel, flex: 1 }}>
              {allFrames.filter((f) => f.id !== transition.fromFrameId).map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Trigger type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--sb-text-3)', width: 52, flexShrink: 0 }}>When</span>
            <select
              value={triggerType}
              style={{ ...sel, flex: 1 }}
              onChange={(e) => onUpdate({ trigger: buildTrigger(e.target.value as TriggerMode, compId, itemValue, seconds) })}
            >
              <option value="manual">Tap anywhere</option>
              <option value="component-click">Click component</option>
              <option value="timer">Timer</option>
            </select>
          </div>

          {triggerType === 'component-click' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--sb-text-3)', width: 52, flexShrink: 0 }}>Which</span>
              <select
                value={compId}
                style={{ ...sel, flex: 1 }}
                onChange={(e) => onUpdate({ trigger: buildTrigger('component-click', e.target.value, '', seconds) })}
              >
                {allComponents.length === 0 && <option value="">— no components —</option>}
                {allComponents.map((c) => <option key={c.id} value={c.id}>{c.label || c.name}</option>)}
              </select>
            </div>
          )}

          {triggerType === 'component-click' && compId && listItems && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--sb-text-3)', width: 52, flexShrink: 0 }}>Item</span>
              <select
                value={itemValue}
                style={{ ...sel, flex: 1 }}
                onChange={(e) => onUpdate({ trigger: buildTrigger('component-click', compId, e.target.value, seconds) })}
              >
                <option value="">Any item</option>
                {(listItems as Record<string, unknown>[]).map((item, i) => {
                  const val = String(item.value ?? item.label ?? i);
                  const label = String(item.label ?? item.title ?? item.name ?? item.value ?? '?');
                  return <option key={i} value={val}>{label}</option>;
                })}
              </select>
            </div>
          )}

          {triggerType === 'timer' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--sb-text-3)', width: 52, flexShrink: 0 }}>Seconds</span>
              <input
                type="number" min={0.5} step={0.5} value={seconds}
                onChange={(e) => onUpdate({ trigger: buildTrigger('timer', compId, itemValue, parseFloat(e.target.value) || 1) })}
                style={{ ...sel, width: 72 }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventsTab({ frame }: { frame: Frame }) {
  const { file, addTransition, updateTransition, removeTransition } = useDesignStore();
  const allFrames = file?.frames ?? [];
  const transitions = (file?.transitions ?? []).filter((t) => t.fromFrameId === frame.id);
  const allComponents = collectAllComponents(frame);

  const handleAdd = () => {
    const dest = allFrames.find((f) => f.id !== frame.id);
    if (dest) addTransition(frame.id, dest.id, { type: 'manual' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--sb-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--sb-text-3)' }}>
          {transitions.length === 0 ? 'No events' : `${transitions.length} event${transitions.length > 1 ? 's' : ''}`} from <strong style={{ color: 'var(--sb-text-2)' }}>{frame.label}</strong>
        </span>
        <button
          onClick={handleAdd}
          disabled={allFrames.length < 2}
          style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--sb-accent)',
            background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)',
          }}
        >
          + Add event
        </button>
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {transitions.length === 0 ? (
          <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--sb-text-4)', fontSize: 12 }}>
            Add an event to connect this screen to another
          </div>
        ) : transitions.map((t) => (
          <EventRow
            key={t.id}
            transition={t}
            allFrames={allFrames}
            allComponents={allComponents}
            onUpdate={(patch) => updateTransition(t.id, patch)}
            onRemove={() => removeTransition(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Bottom Inspector ──────────────────────────────────────────────────────────

export function BottomInspector() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('code');
  const { file, selectedFrameId } = useDesignStore();

  const selectedFrame = file?.frames.find((f) => f.id === selectedFrameId) ?? null;

  function handleTabClick(tab: BottomTab) {
    if (!expanded) {
      setActiveTab(tab);
      setExpanded(true);
    } else if (activeTab === tab) {
      setExpanded(false);
    } else {
      setActiveTab(tab);
    }
  }

  const tabStyle = (tab: BottomTab): React.CSSProperties => ({
    padding: '0 16px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    borderTop: activeTab === tab && expanded ? '2px solid var(--sb-accent)' : '2px solid transparent',
    borderBottom: 'none',
    background: 'none',
    color: activeTab === tab && expanded ? 'var(--sb-accent)' : 'var(--sb-text-3)',
    letterSpacing: '0.02em',
  });

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid var(--sb-border)',
        background: 'var(--sb-bg)',
        display: 'flex',
        flexDirection: 'column',
        height: expanded ? PANEL_HEIGHT : 32,
        transition: 'height 180ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Tab strip */}
      <div style={{ height: 32, flexShrink: 0, display: 'flex', alignItems: 'stretch', borderBottom: expanded ? '1px solid var(--sb-border)' : 'none' }}>
        <span style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: 'var(--sb-text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', borderRight: '1px solid var(--sb-border)' }}>
          Inspector
        </span>

        <button style={tabStyle('code')} onClick={() => handleTabClick('code')}>
          Code
        </button>
        <button style={tabStyle('events')} onClick={() => handleTabClick('events')}>
          Events
          {(() => {
            const count = (file?.transitions ?? []).filter((t) => t.fromFrameId === selectedFrameId).length;
            return count > 0 ? (
              <span style={{ background: 'var(--sb-accent)', color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 700, padding: '1px 4px', lineHeight: 1 }}>
                {count}
              </span>
            ) : null;
          })()}
        </button>

        <div style={{ flex: 1 }} />

        {/* Collapse/expand chevron */}
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ padding: '0 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sb-text-4)', display: 'flex', alignItems: 'center' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }}>
            <path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Tab content */}
      {expanded && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'code' && (
            selectedFrame ? (
              <CodeTab frame={selectedFrame} />
            ) : (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--sb-text-4)', textAlign: 'center' }}>
                Select a frame to view its code
              </div>
            )
          )}
          {activeTab === 'events' && (
            selectedFrame ? (
              <EventsTab frame={selectedFrame} />
            ) : (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--sb-text-4)', textAlign: 'center' }}>
                Select a frame to manage its events
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

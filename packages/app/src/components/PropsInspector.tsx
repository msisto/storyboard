import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ThemeEditor } from './ThemeEditor';
import { useDesignStore } from '../store/useDesignStore';
import { useRegistryStore } from '../registry/useRegistryStore';
import { computeAutoLayout } from '../canvas/autoLayout';
import {
  alignLeft, alignCenterH, alignRight,
  alignTop, alignCenterV, alignBottom,
  distributeH, distributeV, tidyUp,
  type ItemGeometry,
} from '../canvas/alignmentUtils';
import type { ArgDefinition, AutoLayoutSettings, ComponentInstance, DesignFile, Frame, SizingMode } from '../types';
import { TAILWIND_FONT_SIZES, TAILWIND_FONT_WEIGHTS, TAILWIND_SPACING } from '../types';
import { detectColorTokens, tokenToCss, type ColorToken } from '../lib/detectTokens';

// Detect design system tokens once at module load (DOM is ready by then)
const _detectedTokens: ColorToken[] = detectColorTokens();

function TextColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {_detectedTokens.map((token) => {
        const tv = tokenToCss(token);
        const selected = value === tv;
        return (
          <div
            key={token.prop}
            onClick={() => onChange(tv)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 6px',
              borderRadius: 5,
              cursor: 'pointer',
              background: selected ? 'var(--sb-control-active)' : 'transparent',
              border: selected ? '1px solid var(--sb-border-strong)' : '1px solid transparent',
            }}
          >
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: tv,
              border: '1px solid var(--sb-border)',
              flexShrink: 0,
            }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--sb-text-2)' }}>{token.label}</div>
          </div>
        );
      })}
      {_detectedTokens.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--sb-text-4)', padding: '4px 6px' }}>
          No CSS color tokens detected
        </div>
      )}
    </div>
  );
}

function BackgroundColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selectedToken = _detectedTokens.find((t) => tokenToCss(t) === value);
  const displayColor = selectedToken ? tokenToCss(selectedToken) : value;
  const displayLabel = selectedToken ? selectedToken.label : value;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 6px', borderRadius: 5, cursor: 'pointer',
          border: '1px solid var(--sb-border)',
          background: 'var(--sb-bg)',
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 3,
          background: displayColor,
          border: '1px solid var(--sb-border)',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--sb-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </div>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'var(--sb-bg-secondary)', border: '1px solid var(--sb-border)',
          borderRadius: 6, padding: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          maxHeight: 240, overflowY: 'auto',
        }}>
          {_detectedTokens.length > 0 ? _detectedTokens.map((token) => {
            const tv = tokenToCss(token);
            const isSelected = value === tv;
            return (
              <div
                key={token.prop}
                onClick={() => { onChange(tv); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 6px', borderRadius: 4, cursor: 'pointer',
                  background: isSelected ? 'var(--sb-control-active)' : 'transparent',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 3,
                  background: tv, border: '1px solid var(--sb-border)', flexShrink: 0,
                }} />
                <div style={{ fontSize: 12, fontWeight: isSelected ? 500 : 400, color: 'var(--sb-text-2)' }}>
                  {token.label}
                </div>
              </div>
            );
          }) : (
            <div style={{ fontSize: 11, color: 'var(--sb-text-4)', padding: '8px 6px' }}>
              No CSS color tokens detected
            </div>
          )}
        </div>
      )}
    </div>
  );
}


const DEVICE_PRESETS = [
  { label: 'iPhone', w: 390, h: 844 },
  { label: 'iPad', w: 820, h: 1180 },
  { label: 'Desktop', w: 1440, h: 900 },
  { label: 'MacBook', w: 1280, h: 800 },
] as const;

const DEFAULT_AUTO_LAYOUT: AutoLayoutSettings = {
  direction: 'horizontal',
  wrap: false,
  gap: 16,
  paddingTop: 16,
  paddingRight: 16,
  paddingBottom: 16,
  paddingLeft: 16,
  primaryAlign: 'start',
  counterAlign: 'start',
  widthMode: 'fixed',
  heightMode: 'fixed',
};

function pushH() { useDesignStore.getState().pushHistory(); }

function NumberInput({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: 10, color: 'var(--sb-text-3)', textTransform: 'uppercase' }}>{label}</label>
      <input
        type="number"
        value={Math.round(value)}
        onFocus={readOnly ? undefined : pushH}
        onChange={readOnly ? undefined : (e) => onChange?.(Number(e.target.value))}
        disabled={readOnly}
        style={{
          width: '100%',
          padding: '3px 6px',
          fontSize: 12,
          border: '1px solid var(--sb-border)',
          borderRadius: 4,
          outline: 'none',
          boxSizing: 'border-box',
          background: readOnly ? 'var(--sb-bg-secondary)' : 'var(--sb-bg)',
          color: readOnly ? 'var(--sb-text-4)' : 'inherit',
        }}
      />
    </div>
  );
}

function ArgControl({
  def,
  value,
  onChange,
}: {
  def: ArgDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const strVal = value === undefined || value === null ? '' : String(value);

  if (def.type === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          onFocus={pushH}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ fontSize: 12 }}>{def.name}</span>
      </label>
    );
  }

  if (def.type === 'number') {
    return (
      <div>
        <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 2 }}>
          {def.name}
        </label>
        <input
          type="number"
          value={strVal}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '3px 6px',
            fontSize: 12,
            border: '1px solid var(--sb-border)',
            borderRadius: 4,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    );
  }

  if (def.type === 'select') {
    return (
      <div>
        <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 2 }}>
          {def.name}
        </label>
        <select
          value={strVal}
          onFocus={pushH}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '3px 6px',
            fontSize: 12,
            border: '1px solid var(--sb-border)',
            borderRadius: 4,
            outline: 'none',
            boxSizing: 'border-box',
            background: 'var(--sb-bg)',
          }}
        >
          {def.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (def.type === 'color') {
    return (
      <div>
        <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 2 }}>
          {def.name}
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={strVal || '#000000'}
            onFocus={pushH}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--sb-border)', borderRadius: 4 }}
          />
          <input
            type="text"
            value={strVal}
            onFocus={pushH}
            onChange={(e) => onChange(e.target.value)}
            style={{
              flex: 1,
              padding: '3px 6px',
              fontSize: 12,
              border: '1px solid var(--sb-border)',
              borderRadius: 4,
              outline: 'none',
            }}
          />
        </div>
      </div>
    );
  }

  const effectiveValue = value ?? def.defaultValue;

  if (def.type === 'object' && Array.isArray(effectiveValue)) {
    const items = effectiveValue as Record<string, unknown>[];
    const allFields = items.length > 0
      ? Object.keys(items[0]).filter((k) => typeof items[0][k] === 'string' || typeof items[0][k] === 'number')
      : [];
    const hasValueField = allFields.includes('value');
    // Fields the user edits directly; 'value' is auto-derived and shown as a badge
    const editFields = hasValueField ? allFields.filter((k) => k !== 'value') : allFields;
    const primaryField = editFields[0];

    const toSlug = (s: string) =>
      s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

    const updateItem = (idx: number, field: string, v: string) => {
      pushH();
      const next = items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: v };
        // Auto-sync 'value' when editing the primary field, if value still matches the old slug
        if (hasValueField && field === primaryField) {
          const oldSlug = toSlug(String(item[primaryField] ?? ''));
          if (!item.value || String(item.value) === oldSlug) {
            updated.value = toSlug(v);
          }
        }
        return updated;
      });
      onChange(next);
    };

    const removeItem = (idx: number) => {
      pushH();
      onChange(items.filter((_, i) => i !== idx));
    };

    const addItem = () => {
      pushH();
      const template = editFields.reduce((a, k) => ({ ...a, [k]: '' }), {} as Record<string, unknown>);
      if (hasValueField) template.value = `item-${items.length + 1}`;
      // Preserve field order from original schema
      const ordered = allFields.reduce((a, k) => ({ ...a, [k]: template[k] ?? '' }), {} as Record<string, unknown>);
      onChange([...items, ordered]);
    };

    return (
      <div>
        <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 4 }}>
          {def.name}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {editFields.map((field) => (
                <ItemCell
                  key={field}
                  value={String(item[field] ?? '')}
                  placeholder={field}
                  onChange={(v) => updateItem(idx, field, v)}
                />
              ))}
              <button
                onClick={() => removeItem(idx)}
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sb-text-4)', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                title="Remove item"
              >×</button>
            </div>
          ))}
          <button
            onClick={addItem}
            style={{ marginTop: 2, fontSize: 11, color: 'var(--sb-accent)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0' }}
          >+ Add item</button>
        </div>
      </div>
    );
  }

  if (def.type === 'object') {
    return (
      <div>
        <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 2 }}>
          {def.name}
        </label>
        <button
          onClick={() => {
            setJsonText(JSON.stringify(value, null, 2));
            setJsonOpen(true);
          }}
          style={{
            padding: '4px 8px',
            fontSize: 11,
            border: '1px solid var(--sb-border)',
            borderRadius: 4,
            cursor: 'pointer',
            background: 'var(--sb-bg)',
          }}
        >
          Edit JSON
        </button>
        {jsonOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: 'var(--sb-bg)',
                borderRadius: 8,
                padding: 16,
                width: 400,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>Edit {def.name}</div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={8}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  border: '1px solid var(--sb-border)',
                  borderRadius: 4,
                  padding: 8,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setJsonOpen(false)}
                  style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer', border: '1px solid var(--sb-border)', borderRadius: 4, background: 'var(--sb-bg)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    try {
                      pushH();
                      onChange(JSON.parse(jsonText));
                      setJsonOpen(false);
                    } catch {
                      alert('Invalid JSON');
                    }
                  }}
                  style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 4, background: 'var(--sb-accent)', color: 'var(--sb-bg)' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // text (default)
  return (
    <div>
      <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 2 }}>
        {def.name}
      </label>
      <input
        type="text"
        value={strVal}
        onFocus={pushH}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '3px 6px',
          fontSize: 12,
          border: '1px solid var(--sb-border)',
          borderRadius: 4,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function ItemCell({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const start = () => { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commit = () => { onChange(draft); setEditing(false); };

  return editing ? (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      placeholder={placeholder}
      style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '2px 5px', border: '1px solid var(--sb-accent)', borderRadius: 3, outline: 'none', background: 'var(--sb-bg)', color: 'var(--sb-text-1)' }}
    />
  ) : (
    <div
      onClick={start}
      title={placeholder}
      style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '2px 5px', border: '1px solid var(--sb-border)', borderRadius: 3, cursor: 'text', background: 'var(--sb-bg)', color: value ? 'var(--sb-text-1)' : 'var(--sb-text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      {value || placeholder}
    </div>
  );
}

function GapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="2" width="4" height="10" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="9" y="2" width="4" height="10" rx="1" fill="currentColor" opacity="0.4" />
      <line x1="5.5" y1="7" x2="8.5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.5" y1="4.5" x2="5.5" y2="9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="8.5" y1="4.5" x2="8.5" y2="9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function PaddingIcon({ side }: { side: 'top' | 'right' | 'bottom' | 'left' }) {
  const s = 14;
  const outer = { x: 1, y: 1, w: s - 2, h: s - 2 };
  const t = side === 'top' ? 2 : 0.75;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" style={{ flexShrink: 0 }}>
      <rect x={outer.x} y={outer.y} width={outer.w} height={outer.h} rx="1.5" stroke="var(--sb-text-4)" strokeWidth="0.75" />
      {side === 'top'    && <line x1={outer.x} y1={outer.y} x2={outer.x + outer.w} y2={outer.y} stroke="currentColor" strokeWidth={t} strokeLinecap="round" />}
      {side === 'right'  && <line x1={outer.x + outer.w} y1={outer.y} x2={outer.x + outer.w} y2={outer.y + outer.h} stroke="currentColor" strokeWidth={t} strokeLinecap="round" />}
      {side === 'bottom' && <line x1={outer.x} y1={outer.y + outer.h} x2={outer.x + outer.w} y2={outer.y + outer.h} stroke="currentColor" strokeWidth={t} strokeLinecap="round" />}
      {side === 'left'   && <line x1={outer.x} y1={outer.y} x2={outer.x} y2={outer.y + outer.h} stroke="currentColor" strokeWidth={t} strokeLinecap="round" />}
    </svg>
  );
}

function SpacingInput({ label, value, onChange }: { label: React.ReactNode; value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= 0) onChange(v);
    setEditing(false);
    setDraft('');
  };

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) { setOpen(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const startEdit = () => {
    pushH();
    setDraft(String(value));
    setEditing(true);
    setOpen(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  };

  return (
    <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, position: 'relative' }}>
      {label && <span style={{ color: 'var(--sb-text-3)', flexShrink: 0, width: 16, display: 'flex', alignItems: 'center' }}>{label}</span>}

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => { commit(e.target.value); setOpen(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); setOpen(false); }
            if (e.key === 'Escape') { setEditing(false); setOpen(false); }
            if (e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.max(0, value + 1)); setDraft(String(Math.max(0, value + 1))); }
            if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0, value - 1)); setDraft(String(Math.max(0, value - 1))); }
          }}
          style={{
            width: '100%', padding: '3px 6px', fontSize: 12,
            border: '1px solid var(--sb-accent)', borderRadius: 4,
            outline: 'none', background: 'var(--sb-bg)',
            color: 'var(--sb-text-1)', minWidth: 0,
          }}
        />
      ) : (
        <div
          onClick={startEdit}
          style={{
            width: '100%', padding: '3px 8px', fontSize: 12,
            border: '1px solid var(--sb-border)', borderRadius: 4,
            background: 'var(--sb-bg)', cursor: 'text', minWidth: 0,
            display: 'flex', alignItems: 'baseline', gap: 3,
            justifyContent: 'flex-end',
          }}
        >
          <span style={{ color: 'var(--sb-text-1)', fontWeight: 500 }}>
            {TAILWIND_SPACING.find((s) => s.px === value)?.token ?? value}
          </span>
          <span style={{ fontSize: 11, color: 'var(--sb-text-4)' }}>{value}px</span>
        </div>
      )}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: label ? 32 : 0,
            right: 0,
            marginTop: 3,
            background: 'var(--sb-bg)',
            border: '1px solid var(--sb-border)',
            borderRadius: 6,
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            zIndex: 200,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {TAILWIND_SPACING.map((s) => {
            const active = s.px === value;
            return (
              <div
                key={s.px}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s.px);
                  setEditing(false);
                  setDraft('');
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  background: active ? 'var(--sb-control-active)' : 'transparent',
                  borderLeft: active ? '2px solid var(--sb-accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover, rgba(128,128,128,0.08))'; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--sb-text-1)' : 'var(--sb-text-2)' }}>
                  {s.token}
                </span>
                <span style={{ fontSize: 11, color: 'var(--sb-text-4)' }}>
                  {s.px}px
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PropsSection({
  argDefs,
  args,
  onChange,
}: {
  argDefs: ArgDefinition[];
  args: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const [newKey, setNewKey] = useState('');

  // Keys covered by argDefs
  const defKeys = new Set(argDefs.map((d) => d.name));

  // Args already on the instance that have no argDef (user-added or set externally).
  // Exclude React-reserved props — they appear as stale args when a story renames children to label.
  const REACT_RESERVED = new Set(['children', 'className', 'style', 'key', 'ref']);
  const extraKeys = Object.keys(args).filter(
    (k) => !defKeys.has(k) && !(argDefs.length > 0 && REACT_RESERVED.has(k))
  );

  const hasContent = argDefs.length > 0 || extraKeys.length > 0;

  return (
    <Section title="Props">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {argDefs.map((def) => (
          <ArgControl
            key={def.name}
            def={def}
            value={args[def.name]}
            onChange={(v) => onChange(def.name, v)}
          />
        ))}

        {extraKeys.map((key) => (
          <ArgControl
            key={key}
            def={{ name: key, type: typeof args[key] === 'boolean' ? 'boolean' : typeof args[key] === 'number' ? 'number' : 'text' }}
            value={args[key]}
            onChange={(v) => onChange(key, v)}
          />
        ))}

        {!hasContent && (
          <span style={{ fontSize: 11, color: 'var(--sb-text-4)', lineHeight: 1.5 }}>
            No args defined in this story. Add a prop name below, or define <code style={{ fontFamily: 'monospace', background: 'var(--sb-bg-tertiary)', padding: '0 3px', borderRadius: 2 }}>args</code> in your Storybook story to auto-populate.
          </span>
        )}

        {/* Add a new prop manually */}
        <div style={{ display: 'flex', gap: 4, marginTop: hasContent ? 4 : 0 }}>
          <input
            type="text"
            placeholder="prop name"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newKey.trim()) {
                onChange(newKey.trim(), '');
                setNewKey('');
              }
            }}
            style={{
              flex: 1,
              padding: '3px 6px',
              fontSize: 11,
              border: '1px solid var(--sb-border)',
              borderRadius: 4,
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (newKey.trim()) { onChange(newKey.trim(), ''); setNewKey(''); }
            }}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              border: '1px solid var(--sb-border)',
              borderRadius: 4,
              cursor: 'pointer',
              background: 'var(--sb-bg)',
              color: 'var(--sb-text-2)',
            }}
          >
            +
          </button>
        </div>
      </div>
    </Section>
  );
}


function SlotsSection({
  frameId,
  componentId,
  slots,
  slotArgDefs,
  onSelect,
  onRemove,
}: {
  frameId: string;
  componentId: string;
  slots: ComponentInstance['slots'];
  slotArgDefs: ArgDefinition[];
  onSelect: (id: string) => void;
  onRemove: (frameId: string, parentId: string, slotName: string, childId: string) => void;
}) {
  return (
    <Section title="Slots">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {slotArgDefs.map((def) => {
          const children = slots?.[def.name] ?? [];
          return (
            <div key={def.name}>
              <div style={{ fontSize: 10, color: 'var(--sb-text-4)', textTransform: 'uppercase', marginBottom: 4 }}>
                {def.name}
              </div>
              {children.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--sb-text-4)', fontStyle: 'italic' }}>
                  Drop a component here
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {children.map((child) => (
                    <div
                      key={child.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 6px',
                        borderRadius: 4,
                        background: 'var(--sb-bg-secondary)',
                        border: '1px solid var(--sb-border)',
                      }}
                    >
                      <button
                        onClick={() => onSelect(child.id)}
                        style={{
                          flex: 1,
                          textAlign: 'left',
                          fontSize: 11,
                          color: 'var(--sb-text-2)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {child.label}
                      </button>
                      <button
                        onClick={() => onRemove(frameId, componentId, def.name, child.id)}
                        style={{
                          fontSize: 12,
                          color: 'var(--sb-text-4)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0 2px',
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function PropsInspector() {
  const { file, selectedFrameId, selectedFrameIds, selectedComponentId, selectedComponentIds, updateFrame, updateComponent, updateTextLayer, batchUpdatePositions, batchUpdateFramePositions, removeSlottedComponent, selectComponent } =
    useDesignStore();
  const { getArgDefs } = useRegistryStore();
  const [tidyGap, setTidyGap] = useState(16);

  const selectedFrame = file?.frames.find((f) => f.id === selectedFrameId);
  const selectedFrameData = selectedFrame;
  const selectedComponentData = selectedFrameData?.components.find(
    (c) => c.id === selectedComponentId
  );
  const selectedTextLayer = selectedFrameData?.textLayers?.find(
    (t) => t.id === selectedComponentId
  );

  // Recursively find a slot child and its parent context
  function findSlotChild(
    components: ComponentInstance[],
    id: string,
    childFrames?: Frame['frames']
  ): { child: ComponentInstance; parentId: string; slotName: string } | undefined {
    for (const c of components) {
      for (const [slotName, children] of Object.entries(c.slots ?? {})) {
        for (const child of children) {
          if (child.id === id) return { child, parentId: c.id, slotName };
          const deeper = findSlotChild([child], id);
          if (deeper) return deeper;
        }
      }
    }
    // Also search inside child frames (groups)
    for (const cf of childFrames ?? []) {
      const found = findSlotChild(cf.components, id, cf.frames);
      if (found) return found;
    }
  }
  const slotChildContext = !selectedComponentData && !selectedTextLayer && selectedFrameData
    ? findSlotChild(selectedFrameData.components, selectedComponentId ?? '', selectedFrameData.frames)
    : undefined;

  function findChildFrame(frames: Frame['frames'], id: string | null): import('../types').Frame | undefined {
    if (!id || !frames) return undefined;
    for (const f of frames) {
      if (f.id === id) return f;
      const found = findChildFrame(f.frames, id);
      if (found) return found;
    }
  }
  const selectedChildFrame =
    !selectedComponentData && !selectedTextLayer && selectedFrameData
      ? findChildFrame(selectedFrameData.frames, selectedComponentId)
      : undefined;

  if (!selectedFrameData && !selectedComponentData && !selectedTextLayer) {
    return <ThemeEditor />;
  }

  // Multi-frame alignment panel
  if (selectedFrameIds.length > 1 && selectedComponentIds.length === 0) {
    const frameItems: ItemGeometry[] = selectedFrameIds
      .map((id) => file?.frames.find((f) => f.id === id))
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({ id: f.id, x: f.x, y: f.y, width: f.width, height: f.height }));

    const canDistribute = frameItems.length >= 3;

    const applyFrames = (updates: Array<{ id: string; x?: number; y?: number }>) => {
      const meaningful = updates.filter((u) => u.x !== undefined || u.y !== undefined);
      if (meaningful.length > 0) batchUpdateFramePositions(meaningful);
    };

    const btnStyle = (disabled = false): React.CSSProperties => ({
      width: 28, height: 28, padding: 0,
      border: '1px solid var(--sb-border)', borderRadius: 4,
      background: 'var(--sb-bg)', cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? 0.35 : 1,
    });

    return (
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-text-2)' }}>
          {selectedFrameIds.length} frames selected
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--sb-text-4)', marginBottom: 4 }}>ALIGN</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button title="Align left" style={btnStyle()} onClick={() => applyFrames(alignLeft(frameItems))}><AlignLeftIcon /></button>
            <button title="Align center horizontal" style={btnStyle()} onClick={() => applyFrames(alignCenterH(frameItems))}><AlignCenterHIcon /></button>
            <button title="Align right" style={btnStyle()} onClick={() => applyFrames(alignRight(frameItems))}><AlignRightIcon /></button>
            <div style={{ width: 6 }} />
            <button title="Align top" style={btnStyle()} onClick={() => applyFrames(alignTop(frameItems))}><AlignTopIcon /></button>
            <button title="Align center vertical" style={btnStyle()} onClick={() => applyFrames(alignCenterV(frameItems))}><AlignCenterVIcon /></button>
            <button title="Align bottom" style={btnStyle()} onClick={() => applyFrames(alignBottom(frameItems))}><AlignBottomIcon /></button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--sb-text-4)', marginBottom: 4 }}>DISTRIBUTE</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button title="Distribute horizontally" style={btnStyle(!canDistribute)} onClick={() => { if (canDistribute) applyFrames(distributeH(frameItems)); }}><DistributeHIcon /></button>
            <button title="Distribute vertically" style={btnStyle(!canDistribute)} onClick={() => { if (canDistribute) applyFrames(distributeV(frameItems)); }}><DistributeVIcon /></button>
            <div style={{ width: 6 }} />
            <button title="Tidy up" style={btnStyle()} onClick={() => applyFrames(tidyUp(frameItems, tidyGap))}><TidyUpIcon /></button>
            <div style={{ width: 64 }}>
              <SpacingInput
                label=""
                value={tidyGap}
                onChange={(g) => { setTidyGap(g); applyFrames(tidyUp(frameItems, g)); }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Text layer panel ───────────────────────────────────────────────────────
  if (selectedTextLayer && selectedFrameData) {
    const tl = selectedTextLayer;
    const patch = (p: Parameters<typeof updateTextLayer>[2]) =>
      updateTextLayer(selectedFrameData.id, tl.id, p);
    const patchWithHistory = (p: Parameters<typeof updateTextLayer>[2]) => { pushH(); patch(p); };

    return (
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <Section title="Text">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, color: 'var(--sb-text-3)', textTransform: 'uppercase' }}>Content</label>
            <textarea
              value={tl.content}
              rows={3}
              onFocus={pushH}
              onChange={(e) => patch({ content: e.target.value, label: e.target.value.slice(0, 24) || 'Text' })}
              style={{
                fontSize: 12, border: '1px solid var(--sb-border)', borderRadius: 4,
                padding: '4px 6px', outline: 'none', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.4,
              }}
            />
          </div>
        </Section>

        <Section title="Typography">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--sb-text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Font Size
              </label>
              <select
                value={tl.fontSize}
                onFocus={pushH}
                onChange={(e) => patch({ fontSize: e.target.value as typeof tl.fontSize })}
                style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid var(--sb-border)', borderRadius: 4, outline: 'none' }}
              >
                {TAILWIND_FONT_SIZES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} — {s.px}px
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'var(--sb-text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Font Weight
              </label>
              <select
                value={tl.fontWeight}
                onFocus={pushH}
                onChange={(e) => patch({ fontWeight: e.target.value as typeof tl.fontWeight })}
                style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid var(--sb-border)', borderRadius: 4, outline: 'none' }}
              >
                {TAILWIND_FONT_WEIGHTS.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'var(--sb-text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Color
              </label>
              <TextColorPicker
                value={tl.color ?? '#000000'}
                onChange={(v) => { pushH(); patch({ color: v }); }}
              />
            </div>
          </div>
        </Section>

        <Section title="Position">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberInput label="X" value={tl.x} onChange={(v) => patch({ x: v })} />
            <NumberInput label="Y" value={tl.y} onChange={(v) => patch({ y: v })} />
          </div>
        </Section>

        {selectedFrameData.autoLayout && (
          <Section title="Flex">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <SizingSelect
                label="W Mode"
                value={tl.widthMode ?? 'hug'}
                options={['fixed', 'fill', 'hug']}
                onChange={(v) => patchWithHistory({ widthMode: v as SizingMode })}
              />
              <SizingSelect
                label="H Mode"
                value={tl.heightMode ?? 'hug'}
                options={['fixed', 'fill', 'hug']}
                onChange={(v) => patchWithHistory({ heightMode: v as SizingMode })}
              />
              {(tl.widthMode ?? 'hug') === 'fixed' && (
                <NumberInput label="W" value={tl.width ?? 200} onChange={(v) => patch({ width: Math.max(10, v) })} />
              )}
              {(tl.heightMode ?? 'hug') === 'fixed' && (
                <NumberInput label="H" value={tl.height ?? 24} onChange={(v) => patch({ height: Math.max(10, v) })} />
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={tl.absolute ?? false}
                onFocus={pushH}
                onChange={(e) => patchWithHistory({ absolute: e.target.checked })}
              />
              Ignore flex
            </label>
          </Section>
        )}
      </div>
    );
  }

  // ── Child frame inspector ──────────────────────────────────────────────────
  if (selectedChildFrame && selectedFrameData) {
    const cf = selectedChildFrame;
    const cfAl = cf.autoLayout;
    const patchCF = (p: Partial<import('../types').Frame>) => updateFrame(cf.id, p);
    const patchCFAL = (partial: Partial<AutoLayoutSettings>) =>
      updateFrame(cf.id, { autoLayout: { ...cf.autoLayout!, ...partial } });

    const enableCFAutoLayout = () => {
      pushH();
      const flowOrder = [
        ...cf.components.map((c) => c.id),
        ...(cf.textLayers ?? []).map((t) => t.id),
      ];
      updateFrame(cf.id, { autoLayout: { ...DEFAULT_AUTO_LAYOUT }, flowOrder });
    };
    const disableCFAutoLayout = () => {
      pushH();
      updateFrame(cf.id, { autoLayout: undefined });
    };

    return (
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <Section title="Frame">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 2 }}>LABEL</label>
              <input
                type="text"
                value={cf.label}
                onFocus={pushH}
                onChange={(e) => patchCF({ label: e.target.value })}
                style={{ width: '100%', padding: '3px 6px', fontSize: 12, border: '1px solid var(--sb-border)', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumberInput label="X" value={cf.x} onChange={(v) => patchCF({ x: v })} />
              <NumberInput label="Y" value={cf.y} onChange={(v) => patchCF({ y: v })} />
              <NumberInput label="W" value={cf.width} onChange={(v) => patchCF({ width: Math.max(20, v) })} />
              <NumberInput label="H" value={cf.height} onChange={(v) => patchCF({ height: Math.max(20, v) })} />
            </div>

            {selectedFrameData.autoLayout && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <SizingSelect
                  label="W Mode"
                  value={cf.widthMode ?? 'fixed'}
                  options={['fixed', 'fill', 'hug']}
                  onChange={(v) => patchCF({ widthMode: v as SizingMode })}
                />
                <SizingSelect
                  label="H Mode"
                  value={cf.heightMode ?? 'fixed'}
                  options={['fixed', 'fill', 'hug']}
                  onChange={(v) => patchCF({ heightMode: v as SizingMode })}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', gridColumn: '1 / -1' }}>
                  <input
                    type="checkbox"
                    checked={cf.absolute ?? false}
                    onFocus={pushH}
                    onChange={(e) => { pushH(); patchCF({ absolute: e.target.checked }); }}
                  />
                  Ignore flex
                </label>
              </div>
            )}

            <div>
              <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 4 }}>BACKGROUND</label>
              <BackgroundColorPicker value={cf.backgroundColor} onChange={(v) => { pushH(); patchCF({ backgroundColor: v }); }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: 'var(--sb-text-3)', textTransform: 'uppercase' }}>Clip Content</span>
              <button
                onClick={() => { pushH(); patchCF({ clipContent: !cf.clipContent }); }}
                style={{
                  padding: '2px 8px', fontSize: 11, borderRadius: 4,
                  border: '1px solid var(--sb-border)',
                  background: cf.clipContent ? 'var(--sb-accent-bg)' : 'var(--sb-bg-secondary)',
                  color: cf.clipContent ? 'var(--sb-accent)' : 'var(--sb-text-3)',
                  cursor: 'pointer',
                }}
              >
                {cf.clipContent ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </Section>

        <Section title="Flex">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={cfAl ? disableCFAutoLayout : enableCFAutoLayout}
              style={{ width: '100%', padding: '5px 0', fontSize: 12, borderRadius: 4, border: '1px solid var(--sb-border)', background: cfAl ? 'var(--sb-control-active)' : 'var(--sb-bg)', color: 'var(--sb-text-2)', cursor: 'pointer' }}
            >
              {cfAl ? 'Remove Flex' : 'Add Flex  ⇧A'}
            </button>
            {cfAl && (
              <>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Direction</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['horizontal', 'vertical'] as const).map((dir) => (
                      <button key={dir} onClick={() => { pushH(); patchCFAL({ direction: dir }); }}
                        style={{ flex: 1, padding: '4px 0', fontSize: 12, borderRadius: 4, border: '1px solid var(--sb-border)', background: cfAl.direction === dir ? 'var(--sb-control-active)' : 'var(--sb-bg)', color: 'var(--sb-text-2)', cursor: 'pointer' }}>
                        {dir === 'horizontal' ? '→ Row' : '↓ Col'}
                      </button>
                    ))}
                  </div>
                </div>
                <SpacingInput label={<GapIcon />} value={cfAl.gap} onChange={(v) => patchCFAL({ gap: v })} />
                <div>
                  <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Padding</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <SpacingInput label={<PaddingIcon side="top" />}    value={cfAl.paddingTop}    onChange={(v) => patchCFAL({ paddingTop: v })} />
                    <SpacingInput label={<PaddingIcon side="right" />}  value={cfAl.paddingRight}  onChange={(v) => patchCFAL({ paddingRight: v })} />
                    <SpacingInput label={<PaddingIcon side="left" />}   value={cfAl.paddingLeft}   onChange={(v) => patchCFAL({ paddingLeft: v })} />
                    <SpacingInput label={<PaddingIcon side="bottom" />} value={cfAl.paddingBottom} onChange={(v) => patchCFAL({ paddingBottom: v })} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlignmentGrid
                    primaryAlign={cfAl.primaryAlign}
                    counterAlign={cfAl.counterAlign}
                    direction={cfAl.direction}
                    onChange={(pa, ca) => patchCFAL({ primaryAlign: pa, counterAlign: ca })}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                    <SizingSelect label="W Mode" value={cfAl.widthMode} options={['fixed', 'hug']} onChange={(v) => patchCFAL({ widthMode: v as 'fixed' | 'hug' })} />
                    <SizingSelect label="H Mode" value={cfAl.heightMode} options={['fixed', 'hug']} onChange={(v) => patchCFAL({ heightMode: v as 'fixed' | 'hug' })} />
                  </div>
                </div>
              </>
            )}
          </div>
        </Section>
      </div>
    );
  }

  // ── Slot child selected ───────────────────────────────────────────────────────
  if (slotChildContext && selectedFrameData) {
    const { child, parentId, slotName } = slotChildContext;
    const argDefs = getArgDefs(child.storybookId);
    return (
      <div style={{ overflowY: 'auto', height: '100%' }}>
        {/* Breadcrumb */}
        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--sb-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => selectComponent(parentId)}
            style={{ fontSize: 11, color: 'var(--sb-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← Back
          </button>
          <span style={{ fontSize: 11, color: 'var(--sb-text-4)' }}>/ {slotName}</span>
        </div>
        <PropsSection
          argDefs={argDefs.filter((d) => d.type !== 'slot')}
          args={child.args}
          onChange={(key, v) =>
            updateComponent(selectedFrameData.id, child.id, {
              args: { ...child.args, [key]: v },
            })
          }
        />
        {/* Nested slots of the slot child */}
        {argDefs.some((d) => d.type === 'slot') && (
          <SlotsSection
            frameId={selectedFrameData.id}
            componentId={child.id}
            slots={child.slots}
            slotArgDefs={argDefs.filter((d) => d.type === 'slot')}
            onSelect={selectComponent}
            onRemove={removeSlottedComponent}
          />
        )}
      </div>
    );
  }

  if (selectedComponentData && selectedFrameData) {
    const argDefs = getArgDefs(selectedComponentData.storybookId);
    const inFlow = !!(selectedFrameData.autoLayout && !selectedComponentData.absolute);

    // Computed positions from layout engine (for read-only display when in flow)
    const computedLayout = selectedFrameData.autoLayout
      ? computeAutoLayout(selectedFrameData)
      : null;
    const computedGeo = computedLayout?.components[selectedComponentData.id];

    return (
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <Section title="Layout">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberInput
              label="X"
              value={inFlow ? (computedGeo?.x ?? selectedComponentData.x) : selectedComponentData.x}
              onChange={inFlow ? undefined : (v) =>
                updateComponent(selectedFrameData.id, selectedComponentData.id, { x: v })
              }
              readOnly={inFlow}
            />
            <NumberInput
              label="Y"
              value={inFlow ? (computedGeo?.y ?? selectedComponentData.y) : selectedComponentData.y}
              onChange={inFlow ? undefined : (v) =>
                updateComponent(selectedFrameData.id, selectedComponentData.id, { y: v })
              }
              readOnly={inFlow}
            />
            <NumberInput
              label="W"
              value={selectedComponentData.width}
              onChange={(v) =>
                updateComponent(selectedFrameData.id, selectedComponentData.id, { width: Math.max(40, v) })
              }
            />
            <NumberInput
              label="H"
              value={selectedComponentData.height}
              onChange={(v) =>
                updateComponent(selectedFrameData.id, selectedComponentData.id, { height: Math.max(40, v) })
              }
            />
          </div>
        </Section>

        {selectedFrameData.autoLayout && (
          <Section title="Flex">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <SizingSelect
                label="W Mode"
                value={selectedComponentData.widthMode ?? 'fixed'}
                options={['fixed', 'fill', 'hug']}
                onChange={(v) =>
                  updateComponent(selectedFrameData.id, selectedComponentData.id, {
                    widthMode: v as SizingMode,
                  })
                }
              />
              <SizingSelect
                label="H Mode"
                value={selectedComponentData.heightMode ?? 'fixed'}
                options={['fixed', 'fill', 'hug']}
                onChange={(v) =>
                  updateComponent(selectedFrameData.id, selectedComponentData.id, {
                    heightMode: v as SizingMode,
                  })
                }
              />
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              <input
                type="checkbox"
                checked={selectedComponentData.absolute ?? false}
                onFocus={pushH}
                onChange={(e) =>
                  updateComponent(selectedFrameData.id, selectedComponentData.id, {
                    absolute: e.target.checked,
                  })
                }
              />
              Ignore flex
            </label>
          </Section>
        )}

        <PropsSection
          argDefs={argDefs.filter((d) => d.type !== 'slot')}
          args={selectedComponentData.args}
          onChange={(key, v) =>
            updateComponent(selectedFrameData.id, selectedComponentData.id, {
              args: { ...selectedComponentData.args, [key]: v },
            })
          }
        />

        {argDefs.some((d) => d.type === 'slot') && (
          <SlotsSection
            frameId={selectedFrameData.id}
            componentId={selectedComponentData.id}
            slots={selectedComponentData.slots}
            slotArgDefs={argDefs.filter((d) => d.type === 'slot')}
            onSelect={selectComponent}
            onRemove={removeSlottedComponent}
          />
        )}
      </div>
    );
  }

  if (selectedFrameData) {
    const al = selectedFrameData.autoLayout;

    const patchAL = (partial: Partial<AutoLayoutSettings>) =>
      updateFrame(selectedFrameData.id, {
        autoLayout: { ...selectedFrameData.autoLayout!, ...partial },
      });

    const enableAutoLayout = () => {
      pushH();
      const flowOrder = [
        ...selectedFrameData.components.map((c) => c.id),
        ...(selectedFrameData.textLayers ?? []).map((t) => t.id),
      ];
      updateFrame(selectedFrameData.id, { autoLayout: { ...DEFAULT_AUTO_LAYOUT }, flowOrder });
    };

    const disableAutoLayout = () => {
      pushH();
      const layout = computeAutoLayout(selectedFrameData);
      selectedFrameData.components
        .filter((c) => !c.absolute)
        .forEach((c) => {
          const geo = layout.components[c.id];
          if (geo) updateComponent(selectedFrameData.id, c.id, { x: geo.x, y: geo.y });
        });
      updateFrame(selectedFrameData.id, { autoLayout: undefined });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
        <Section title="Frame">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 2 }}>
                LABEL
              </label>
              <input
                type="text"
                value={selectedFrameData.label}
                onFocus={pushH}
                onChange={(e) => updateFrame(selectedFrameData.id, { label: e.target.value })}
                style={{
                  width: '100%',
                  padding: '3px 6px',
                  fontSize: 12,
                  border: '1px solid var(--sb-border)',
                  borderRadius: 4,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {DEVICE_PRESETS.map((preset) => {
                const active = selectedFrameData.width === preset.w && selectedFrameData.height === preset.h;
                return (
                  <button
                    key={preset.label}
                    onClick={() => { pushH(); updateFrame(selectedFrameData.id, { width: preset.w, height: preset.h }); }}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: `1px solid ${active ? 'var(--sb-border-strong)' : 'var(--sb-border)'}`,
                      background: active ? 'var(--sb-control-active)' : 'transparent',
                      color: 'var(--sb-text-2)',
                      cursor: 'pointer',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumberInput
                label="W"
                value={selectedFrameData.width}
                onChange={(v) => updateFrame(selectedFrameData.id, { width: Math.max(50, v) })}
                readOnly={al?.widthMode === 'hug'}
              />
              <NumberInput
                label="H"
                value={selectedFrameData.height}
                onChange={(v) => updateFrame(selectedFrameData.id, { height: Math.max(50, v) })}
                readOnly={al?.heightMode === 'hug'}
              />
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 4 }}>
                BACKGROUND
              </label>
              <BackgroundColorPicker
                value={selectedFrameData.backgroundColor}
                onChange={(v) => { pushH(); updateFrame(selectedFrameData.id, { backgroundColor: v }); }}
              />
            </div>
          </div>
        </Section>



        <Section title="Flex">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={al ? disableAutoLayout : enableAutoLayout}
              style={{
                width: '100%',
                padding: '5px 0',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--sb-border)',
                background: al ? 'var(--sb-control-active)' : 'var(--sb-bg)',
                color: 'var(--sb-text-2)',
                cursor: 'pointer',
              }}
            >
              {al ? 'Remove Flex' : 'Add Flex  ⇧A'}
            </button>

            {al && (
              <>
                {/* Direction */}
                <div>
                  <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                    Direction
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['horizontal', 'vertical'] as const).map((dir) => (
                      <button
                        key={dir}
                        onClick={() => { pushH(); patchAL({ direction: dir }); }}
                        style={{
                          flex: 1,
                          padding: '4px 0',
                          fontSize: 12,
                          borderRadius: 4,
                          border: '1px solid var(--sb-border)',
                          background: al.direction === dir ? 'var(--sb-control-active)' : 'var(--sb-bg)',
                          color: 'var(--sb-text-2)',
                          cursor: 'pointer',
                        }}
                      >
                        {dir === 'horizontal' ? '→ Row' : '↓ Col'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wrap (horizontal only) */}
                {al.direction === 'horizontal' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={al.wrap}
                      onFocus={pushH}
                      onChange={(e) => patchAL({ wrap: e.target.checked })}
                    />
                    Wrap
                  </label>
                )}

                {/* Gap */}
                <SpacingInput
                  label={<GapIcon />}
                  value={al.gap}
                  onChange={(v) => patchAL({ gap: v })}
                />

                {/* Padding */}
                <div>
                  <label style={{ fontSize: 10, color: 'var(--sb-text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                    Padding
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <SpacingInput label={<PaddingIcon side="top" />}    value={al.paddingTop}    onChange={(v) => patchAL({ paddingTop: v })} />
                    <SpacingInput label={<PaddingIcon side="right" />}  value={al.paddingRight}  onChange={(v) => patchAL({ paddingRight: v })} />
                    <SpacingInput label={<PaddingIcon side="left" />}   value={al.paddingLeft}   onChange={(v) => patchAL({ paddingLeft: v })} />
                    <SpacingInput label={<PaddingIcon side="bottom" />} value={al.paddingBottom} onChange={(v) => patchAL({ paddingBottom: v })} />
                  </div>
                </div>

                {/* Alignment grid + frame sizing side by side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlignmentGrid
                    primaryAlign={al.primaryAlign}
                    counterAlign={al.counterAlign}
                    direction={al.direction}
                    onChange={(primaryAlign, counterAlign) => patchAL({ primaryAlign, counterAlign })}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                    <SizingSelect
                      label="W Mode"
                      value={al.widthMode}
                      options={['fixed', 'hug']}
                      onChange={(v) => patchAL({ widthMode: v as 'fixed' | 'hug' })}
                    />
                    <SizingSelect
                      label="H Mode"
                      value={al.heightMode}
                      options={['fixed', 'hug']}
                      onChange={(v) => patchAL({ heightMode: v as 'fixed' | 'hug' })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Section>

        </div>
      </div>
    );
  }

  // Multi-selection panel
  if (selectedComponentIds.length > 1 && selectedFrameData) {
    const fr: Frame = selectedFrameData;

    const resolveGeometry = (id: string): ItemGeometry | null => {
      const c = fr.components.find((c) => c.id === id);
      if (c) return { id: c.id, x: c.x, y: c.y, width: c.width, height: c.height };
      const t = (fr.textLayers ?? []).find((t) => t.id === id);
      if (t) return { id: t.id, x: t.x, y: t.y, width: t.width ?? 200, height: t.height ?? 24 };
      return null;
    };

    // Only absolute items (not flow items in auto-layout)
    const items = selectedComponentIds
      .map(resolveGeometry)
      .filter((i): i is ItemGeometry => {
        if (!i) return false;
        if (!fr.autoLayout) return true;
        const comp = fr.components.find((c) => c.id === i.id);
        const text = (fr.textLayers ?? []).find((t) => t.id === i.id);
        return !!(comp?.absolute || text?.absolute);
      });

    const canDistribute = items.length >= 3;

    const apply = (updates: Array<{ id: string; x?: number; y?: number }>) => {
      const meaningful = updates.filter((u) => u.x !== undefined || u.y !== undefined);
      if (meaningful.length > 0) batchUpdatePositions(fr.id, meaningful);
    };

    const btnStyle = (disabled = false): React.CSSProperties => ({
      width: 28,
      height: 28,
      padding: 0,
      border: '1px solid var(--sb-border)',
      borderRadius: 4,
      background: 'var(--sb-bg)',
      cursor: disabled ? 'default' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.35 : 1,
    });

    return (
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-text-2)' }}>
          {selectedComponentIds.length} items selected
        </div>

        {items.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--sb-text-4)' }}>
            Alignment not available for auto-layout flow items
          </div>
        ) : (
          <>
            {/* Alignment row */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--sb-text-4)', marginBottom: 4 }}>ALIGN</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button title="Align left" style={btnStyle()} onClick={() => apply(alignLeft(items))}>
                  <AlignLeftIcon />
                </button>
                <button title="Align center horizontal" style={btnStyle()} onClick={() => apply(alignCenterH(items))}>
                  <AlignCenterHIcon />
                </button>
                <button title="Align right" style={btnStyle()} onClick={() => apply(alignRight(items))}>
                  <AlignRightIcon />
                </button>
                <div style={{ width: 6 }} />
                <button title="Align top" style={btnStyle()} onClick={() => apply(alignTop(items))}>
                  <AlignTopIcon />
                </button>
                <button title="Align center vertical" style={btnStyle()} onClick={() => apply(alignCenterV(items))}>
                  <AlignCenterVIcon />
                </button>
                <button title="Align bottom" style={btnStyle()} onClick={() => apply(alignBottom(items))}>
                  <AlignBottomIcon />
                </button>
              </div>
            </div>

            {/* Distribute row */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--sb-text-4)', marginBottom: 4 }}>DISTRIBUTE</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  title="Distribute horizontally"
                  style={btnStyle(!canDistribute)}
                  onClick={() => { if (canDistribute) apply(distributeH(items)); }}
                >
                  <DistributeHIcon />
                </button>
                <button
                  title="Distribute vertically"
                  style={btnStyle(!canDistribute)}
                  onClick={() => { if (canDistribute) apply(distributeV(items)); }}
                >
                  <DistributeVIcon />
                </button>
                <div style={{ width: 6 }} />
                <button title="Tidy up" style={btnStyle()} onClick={() => apply(tidyUp(items, tidyGap))}>
                  <TidyUpIcon />
                </button>
                <div style={{ width: 64 }}>
                  <SpacingInput
                    label=""
                    value={tidyGap}
                    onChange={(g) => { setTidyGap(g); apply(tidyUp(items, g)); }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// ── Alignment icons ───────────────────────────────────────────────────────────

function AlignLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="1.5" height="12" fill="currentColor" rx="0.5" />
      <rect x="4" y="4" width="5" height="3" fill="currentColor" rx="0.5" />
      <rect x="4" y="9" width="8" height="3" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function AlignCenterHIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="7.25" y="2" width="1.5" height="12" fill="currentColor" rx="0.5" />
      <rect x="3.5" y="4" width="9" height="3" fill="currentColor" rx="0.5" />
      <rect x="5.5" y="9" width="5" height="3" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="12.5" y="2" width="1.5" height="12" fill="currentColor" rx="0.5" />
      <rect x="7" y="4" width="5" height="3" fill="currentColor" rx="0.5" />
      <rect x="4" y="9" width="8" height="3" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function AlignTopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="1.5" fill="currentColor" rx="0.5" />
      <rect x="4" y="4" width="3" height="5" fill="currentColor" rx="0.5" />
      <rect x="9" y="4" width="3" height="8" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function AlignCenterVIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="7.25" width="12" height="1.5" fill="currentColor" rx="0.5" />
      <rect x="4" y="3.5" width="3" height="9" fill="currentColor" rx="0.5" />
      <rect x="9" y="5.5" width="3" height="5" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function AlignBottomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="12.5" width="12" height="1.5" fill="currentColor" rx="0.5" />
      <rect x="4" y="7" width="3" height="5" fill="currentColor" rx="0.5" />
      <rect x="9" y="4" width="3" height="8" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function DistributeHIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3" width="1.5" height="10" fill="currentColor" rx="0.5" />
      <rect x="13" y="3" width="1.5" height="10" fill="currentColor" rx="0.5" />
      <rect x="6" y="5" width="4" height="6" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function DistributeVIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="1.5" width="10" height="1.5" fill="currentColor" rx="0.5" />
      <rect x="3" y="13" width="10" height="1.5" fill="currentColor" rx="0.5" />
      <rect x="5" y="6" width="6" height="4" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function TidyUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" fill="currentColor" rx="0.5" />
      <rect x="9" y="2" width="5" height="5" fill="currentColor" rx="0.5" />
      <rect x="2" y="9" width="5" height="5" fill="currentColor" rx="0.5" />
      <rect x="9" y="9" width="5" height="5" fill="currentColor" rx="0.5" />
    </svg>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--sb-border)' }}>
      <div
        style={{
          padding: '10px 12px 6px',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--sb-text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '0 12px 12px' }}>{children}</div>
    </div>
  );
}

function SizingSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 10, color: 'var(--sb-text-3)', textTransform: 'uppercase', flexShrink: 0, width: 14 }}>
        {label.charAt(0)}
      </span>
      <div style={{ display: 'flex', border: '1px solid var(--sb-border)', borderRadius: 4, overflow: 'hidden', flex: 1 }}>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => { pushH(); onChange(o); }}
            title={o.charAt(0).toUpperCase() + o.slice(1)}
            style={{
              flex: 1,
              padding: '3px 4px',
              fontSize: 10,
              border: 'none',
              borderRight: o !== options[options.length - 1] ? '1px solid var(--sb-border)' : 'none',
              background: value === o ? 'var(--sb-control-active)' : 'transparent',
              color: value === o ? 'var(--sb-text-1)' : 'var(--sb-text-3)',
              cursor: 'pointer',
              fontWeight: value === o ? 600 : 400,
            }}
          >
            {o === 'fixed' ? 'Fixed' : o === 'hug' ? 'Hug' : 'Fill'}
          </button>
        ))}
      </div>
    </div>
  );
}

// Spatial 3×3 alignment grid — position of the dot = where content sits in the container.
// Horizontal layout: grid-x = primaryAlign (start/center/end), grid-y = counterAlign (start/center/end)
// Vertical layout: grid-x = counterAlign, grid-y = primaryAlign
// Space-between is a separate distribute button alongside the grid.
function AlignmentGrid({
  primaryAlign,
  counterAlign,
  direction,
  onChange,
}: {
  primaryAlign: AutoLayoutSettings['primaryAlign'];
  counterAlign: AutoLayoutSettings['counterAlign'];
  direction: AutoLayoutSettings['direction'];
  onChange: (
    primaryAlign: AutoLayoutSettings['primaryAlign'],
    counterAlign: AutoLayoutSettings['counterAlign']
  ) => void;
}) {
  const isH = direction === 'horizontal';
  const colValues: ('start' | 'center' | 'end')[] = ['start', 'center', 'end'];
  const rowValues: ('start' | 'center' | 'end')[] = ['start', 'center', 'end'];
  const isDistribute = primaryAlign === 'space-between';

  const getPA = (col: 'start' | 'center' | 'end', row: 'start' | 'center' | 'end') =>
    isH ? col : row;
  const getCA = (col: 'start' | 'center' | 'end', row: 'start' | 'center' | 'end') =>
    isH ? row : col;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
      {/* 3×3 dot grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 26px)',
          gridTemplateRows: 'repeat(3, 26px)',
          gap: 2,
          border: '1px solid var(--sb-border)',
          borderRadius: 5,
          padding: 3,
          background: 'var(--sb-bg-2, var(--sb-bg))',
        }}
      >
        {rowValues.map((row) =>
          colValues.map((col) => {
            const pa = getPA(col, row);
            const ca = getCA(col, row);
            const active = !isDistribute && primaryAlign === pa && counterAlign === ca;
            return (
              <button
                key={`${col}-${row}`}
                onClick={() => { pushH(); onChange(pa, ca); }}
                title={`${isH ? 'primary' : 'counter'}: ${col}, ${isH ? 'counter' : 'primary'}: ${row}`}
                style={{
                  width: 26,
                  height: 26,
                  border: 'none',
                  borderRadius: 3,
                  background: active ? 'var(--sb-control-active)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: active ? 'var(--sb-accent)' : 'var(--sb-border-strong, var(--sb-text-4))',
                  }}
                />
              </button>
            );
          })
        )}
      </div>

      {/* Distribute (space-between) button */}
      <button
        onClick={() => {
          pushH();
          onChange(isDistribute ? 'start' : 'space-between', counterAlign);
        }}
        title="Distribute (space-between)"
        style={{
          width: 26,
          height: 26,
          border: '1px solid var(--sb-border)',
          borderRadius: 4,
          background: isDistribute ? 'var(--sb-control-active)' : 'transparent',
          color: isDistribute ? 'var(--sb-accent)' : 'var(--sb-text-3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          alignSelf: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {isH ? (
            <>
              <line x1="1" y1="3" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="13" y1="3" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <rect x="3.5" y="5" width="3" height="4" rx="1" fill="currentColor"/>
              <rect x="7.5" y="5" width="3" height="4" rx="1" fill="currentColor"/>
            </>
          ) : (
            <>
              <line x1="3" y1="1" x2="11" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="3" y1="13" x2="11" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <rect x="5" y="3.5" width="4" height="3" rx="1" fill="currentColor"/>
              <rect x="5" y="7.5" width="4" height="3" rx="1" fill="currentColor"/>
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

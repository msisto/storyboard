import React, { useState } from 'react';
import { useDesignStore } from '../store/useDesignStore';
import { useRegistryStore } from '../registry/useRegistryStore';
import { computeAutoLayout } from '../canvas/autoLayout';
import type { ArgDefinition, AutoLayoutSettings, SizingMode } from '../types';
import { TAILWIND_FONT_SIZES, TAILWIND_FONT_WEIGHTS } from '../types';

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
      <label style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{label}</label>
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
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          outline: 'none',
          boxSizing: 'border-box',
          background: readOnly ? '#f9fafb' : 'white',
          color: readOnly ? '#9ca3af' : 'inherit',
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
        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>
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
            border: '1px solid #e5e7eb',
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
        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>
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
            border: '1px solid #e5e7eb',
            borderRadius: 4,
            outline: 'none',
            boxSizing: 'border-box',
            background: 'white',
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
        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>
          {def.name}
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={strVal || '#000000'}
            onFocus={pushH}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 28, height: 28, padding: 0, border: '1px solid #e5e7eb', borderRadius: 4 }}
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
              border: '1px solid #e5e7eb',
              borderRadius: 4,
              outline: 'none',
            }}
          />
        </div>
      </div>
    );
  }

  if (def.type === 'object') {
    return (
      <div>
        <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>
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
            border: '1px solid #e5e7eb',
            borderRadius: 4,
            cursor: 'pointer',
            background: 'white',
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
                background: 'white',
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
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  padding: 8,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setJsonOpen(false)}
                  style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: 4, background: 'white' }}
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
                  style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 4, background: '#0066FF', color: 'white' }}
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
      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>
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
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

export function PropsInspector() {
  const { file, selectedFrameId, selectedComponentId, updateFrame, updateComponent, updateTextLayer } =
    useDesignStore();
  const { getArgDefs } = useRegistryStore();

  const selectedFrame = file?.frames.find((f) => f.id === selectedFrameId);
  const selectedFrameData = selectedFrame;
  const selectedComponentData = selectedFrameData?.components.find(
    (c) => c.id === selectedComponentId
  );
  const selectedTextLayer = selectedFrameData?.textLayers?.find(
    (t) => t.id === selectedComponentId
  );

  if (!selectedFrameData && !selectedComponentData && !selectedTextLayer) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        Select a frame or component
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
            <label style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Content</label>
            <textarea
              value={tl.content}
              rows={3}
              onFocus={pushH}
              onChange={(e) => patch({ content: e.target.value, label: e.target.value.slice(0, 24) || 'Text' })}
              style={{
                fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4,
                padding: '4px 6px', outline: 'none', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.4,
              }}
            />
          </div>
        </Section>

        <Section title="Typography">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Font Size
              </label>
              <select
                value={tl.fontSize}
                onFocus={pushH}
                onChange={(e) => patch({ fontSize: e.target.value as typeof tl.fontSize })}
                style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none' }}
              >
                {TAILWIND_FONT_SIZES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} — {s.px}px
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Font Weight
              </label>
              <select
                value={tl.fontWeight}
                onFocus={pushH}
                onChange={(e) => patch({ fontWeight: e.target.value as typeof tl.fontWeight })}
                style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none' }}
              >
                {TAILWIND_FONT_WEIGHTS.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="color"
                  value={tl.color}
                  onFocus={pushH}
                  onChange={(e) => patch({ color: e.target.value })}
                  style={{ width: 32, height: 28, padding: 2, border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={tl.color}
                  onFocus={pushH}
                  onChange={(e) => patch({ color: e.target.value })}
                  style={{ flex: 1, padding: '4px 6px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none', fontFamily: 'monospace' }}
                />
              </div>
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
          <Section title="Auto Layout">
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
              Ignore auto layout
            </label>
          </Section>
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
          <Section title="Auto Layout">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
              Ignore auto layout
            </label>
          </Section>
        )}

        {argDefs.length > 0 && (
          <Section title="Props">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {argDefs.map((def) => (
                <ArgControl
                  key={def.name}
                  def={def}
                  value={selectedComponentData.args[def.name]}
                  onChange={(v) =>
                    updateComponent(selectedFrameData.id, selectedComponentData.id, {
                      args: { ...selectedComponentData.args, [def.name]: v },
                    })
                  }
                />
              ))}
            </div>
          </Section>
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
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <Section title="Frame">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>
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
                  border: '1px solid #e5e7eb',
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
                      border: `1px solid ${active ? '#0066FF' : '#d1d5db'}`,
                      background: active ? '#eff6ff' : 'transparent',
                      color: active ? '#0066FF' : '#6b7280',
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
              <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2 }}>
                BACKGROUND
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="color"
                  value={selectedFrameData.backgroundColor}
                  onFocus={pushH}
                  onChange={(e) =>
                    updateFrame(selectedFrameData.id, { backgroundColor: e.target.value })
                  }
                  style={{ width: 28, height: 28, padding: 0, border: '1px solid #e5e7eb', borderRadius: 4 }}
                />
                <input
                  type="text"
                  value={selectedFrameData.backgroundColor}
                  onFocus={pushH}
                  onChange={(e) =>
                    updateFrame(selectedFrameData.id, { backgroundColor: e.target.value })
                  }
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    fontSize: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 4,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Auto Layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={al ? disableAutoLayout : enableAutoLayout}
              style={{
                width: '100%',
                padding: '5px 0',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid #e5e7eb',
                background: al ? '#0066FF' : 'white',
                color: al ? 'white' : '#374151',
                cursor: 'pointer',
              }}
            >
              {al ? 'Remove Auto Layout' : 'Add Auto Layout  ⇧A'}
            </button>

            {al && (
              <>
                {/* Direction */}
                <div>
                  <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
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
                          border: '1px solid #e5e7eb',
                          background: al.direction === dir ? '#0066FF' : 'white',
                          color: al.direction === dir ? 'white' : '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        {dir === 'horizontal' ? '→ Horiz' : '↓ Vert'}
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
                <NumberInput
                  label="Gap"
                  value={al.gap}
                  onChange={(v) => patchAL({ gap: Math.max(0, v) })}
                />

                {/* Padding */}
                <div>
                  <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                    Padding
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <NumberInput label="Top"    value={al.paddingTop}    onChange={(v) => patchAL({ paddingTop: Math.max(0, v) })} />
                    <NumberInput label="Right"  value={al.paddingRight}  onChange={(v) => patchAL({ paddingRight: Math.max(0, v) })} />
                    <NumberInput label="Bottom" value={al.paddingBottom} onChange={(v) => patchAL({ paddingBottom: Math.max(0, v) })} />
                    <NumberInput label="Left"   value={al.paddingLeft}   onChange={(v) => patchAL({ paddingLeft: Math.max(0, v) })} />
                  </div>
                </div>

                {/* Alignment grid */}
                <AlignmentGrid
                  primaryAlign={al.primaryAlign}
                  counterAlign={al.counterAlign}
                  direction={al.direction}
                  onChange={(primaryAlign, counterAlign) => patchAL({ primaryAlign, counterAlign })}
                />

                {/* Frame sizing */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
              </>
            )}
          </div>
        </Section>
      </div>
    );
  }

  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid #f3f4f6' }}>
      <div
        style={{
          padding: '10px 12px 6px',
          fontSize: 10,
          fontWeight: 600,
          color: '#6b7280',
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
    <div>
      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 2, textTransform: 'uppercase' }}>
        {label}
      </label>
      <select
        value={value}
        onFocus={pushH}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '3px 6px',
          fontSize: 12,
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          outline: 'none',
          background: 'white',
          boxSizing: 'border-box',
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

// 3×3 + space-between alignment grid
// For horizontal: columns = primaryAlign (start/center/end/space-between), rows = counterAlign (start/center/end)
// For vertical: axes are swapped
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
  const primaries: AutoLayoutSettings['primaryAlign'][] = ['start', 'center', 'end', 'space-between'];
  const counters: AutoLayoutSettings['counterAlign'][] = ['start', 'center', 'end'];

  // Visual labels
  const primaryLabels = direction === 'horizontal'
    ? { start: '⇤', center: '⇔', end: '⇥', 'space-between': '⇿' }
    : { start: '⇡', center: '⇕', end: '⇣', 'space-between': '⇿' };
  const counterLabels = direction === 'horizontal'
    ? { start: '↑', center: '↕', end: '↓' }
    : { start: '←', center: '↔', end: '→' };

  return (
    <div>
      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
        Alignment
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {counters.map((ca) => (
          <div key={ca} style={{ display: 'flex', gap: 3 }}>
            {primaries.map((pa) => {
              const active = primaryAlign === pa && counterAlign === ca;
              return (
                <button
                  key={pa}
                  onClick={() => { pushH(); onChange(pa, ca); }}
                  title={`${pa} / ${ca}`}
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: 11,
                    borderRadius: 3,
                    border: '1px solid #e5e7eb',
                    background: active ? '#0066FF' : '#f9fafb',
                    color: active ? 'white' : '#374151',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  {primaryLabels[pa]}
                  {counterLabels[ca]}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useDesignStore } from '../store/useDesignStore';
import { useRegistryStore } from '../registry/useRegistryStore';
import type { ArgDefinition } from '../types';

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{label}</label>
      <input
        type="number"
        value={Math.round(value)}
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
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 28, height: 28, padding: 0, border: '1px solid #e5e7eb', borderRadius: 4 }}
          />
          <input
            type="text"
            value={strVal}
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
  const { file, selectedFrameId, selectedComponentId, updateFrame, updateComponent } =
    useDesignStore();
  const { getArgDefs } = useRegistryStore();

  const selectedFrame = file?.frames.find((f) => f.id === selectedFrameId);
  const selectedFrameData = selectedFrame;
  const selectedComponentData = selectedFrameData?.components.find(
    (c) => c.id === selectedComponentId
  );

  if (!selectedFrameData && !selectedComponentData) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        Select a frame or component
      </div>
    );
  }

  if (selectedComponentData && selectedFrameData) {
    const argDefs = getArgDefs(selectedComponentData.storybookId);
    return (
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <Section title="Layout">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberInput
              label="X"
              value={selectedComponentData.x}
              onChange={(v) =>
                updateComponent(selectedFrameData.id, selectedComponentData.id, { x: v })
              }
            />
            <NumberInput
              label="Y"
              value={selectedComponentData.y}
              onChange={(v) =>
                updateComponent(selectedFrameData.id, selectedComponentData.id, { y: v })
              }
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumberInput
                label="W"
                value={selectedFrameData.width}
                onChange={(v) => updateFrame(selectedFrameData.id, { width: Math.max(50, v) })}
              />
              <NumberInput
                label="H"
                value={selectedFrameData.height}
                onChange={(v) => updateFrame(selectedFrameData.id, { height: Math.max(50, v) })}
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
                  onChange={(e) =>
                    updateFrame(selectedFrameData.id, { backgroundColor: e.target.value })
                  }
                  style={{ width: 28, height: 28, padding: 0, border: '1px solid #e5e7eb', borderRadius: 4 }}
                />
                <input
                  type="text"
                  value={selectedFrameData.backgroundColor}
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
      </div>
    );
  }

  return null;
}

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

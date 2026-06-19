import React, { useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDesignStore } from '../store/useDesignStore';
import { useRegistryStore } from '../registry/useRegistryStore';
import { saveDesignFile, openDesignFile } from '../store/fileSystem';
import { exportFrameAsJsx } from '../export/jsxExport';
import type { Tool } from '../types';

interface ToolbarProps {
  connected: boolean;
  peerCount: number;
}

interface ExportModalProps {
  onClose: () => void;
}

function ExportModal({ onClose }: ExportModalProps) {
  const { file, selectedFrameId } = useDesignStore();
  const { stories } = useRegistryStore();
  const [selectedFrame, setSelectedFrame] = useState<string>(
    selectedFrameId ?? file?.frames[0]?.id ?? ''
  );
  const [copied, setCopied] = useState(false);

  const frame = file?.frames.find((f) => f.id === selectedFrame);
  const code = frame ? exportFrameAsJsx(frame, stories) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 8,
          padding: 20,
          width: 560,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Export as JSX</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
            ✕
          </button>
        </div>

        <select
          value={selectedFrame}
          onChange={(e) => setSelectedFrame(e.target.value)}
          style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none' }}
        >
          {file?.frames.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>

        <textarea
          readOnly
          value={code}
          rows={16}
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            border: '1px solid #e5e7eb',
            borderRadius: 4,
            padding: 10,
            resize: 'vertical',
            outline: 'none',
            background: '#f9fafb',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 16px',
              fontSize: 13,
              background: copied ? '#10b981' : '#0066FF',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '6px 16px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', background: 'white' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toolbar({ connected, peerCount }: ToolbarProps) {
  const { activeTool, setTool, viewport, zoomTo } = useCanvasStore();
  const { file, newFile, loadFile, selectedFrameId } = useDesignStore();
  const [showExport, setShowExport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const zoomPercent = Math.round(viewport.zoom * 100);

  const tools: { id: Tool; label: string; key: string }[] = [
    { id: 'select',  label: '↖',  key: 'V' },
    { id: 'frame',   label: '⬜', key: 'F' },
    { id: 'comment', label: '✦',  key: 'C' },
    { id: 'pan',     label: '✋', key: 'H' },
  ];

  const handleSave = async () => {
    if (!file) return;
    try {
      await saveDesignFile(file);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') alert('Save failed: ' + (e as Error).message);
    }
  };

  const handleOpen = async () => {
    try {
      const loaded = await openDesignFile();
      loadFile(loaded);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') alert('Open failed: ' + (e as Error).message);
    }
  };

  const fitAll = () => {
    if (!file?.frames.length) return;
    zoomTo(1);
  };

  return (
    <>
      <div
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          borderBottom: '1px solid #e5e7eb',
          background: 'white',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', background: 'white', fontSize: 14 }}
          >
            ≡
          </button>
          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                minWidth: 140,
              }}
            >
              {[
                { label: 'New file', action: () => { newFile('Untitled'); setShowMenu(false); } },
                { label: 'Save  ⌘S', action: () => { handleSave(); setShowMenu(false); } },
                { label: 'Open  ⌘O', action: () => { handleOpen(); setShowMenu(false); } },
                { label: 'Export JSX', action: () => { setShowExport(true); setShowMenu(false); } },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginRight: 4 }}>
          Storyboard
        </span>

        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />

        {/* Tools */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            title={`${tool.id} (${tool.key})`}
            style={{
              padding: '4px 10px',
              border: activeTool === tool.id ? '1px solid #0066FF' : '1px solid #e5e7eb',
              borderRadius: 4,
              cursor: 'pointer',
              background: activeTool === tool.id ? '#eff6ff' : 'white',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {tool.label}
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{tool.key}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
        <input
          type="number"
          value={zoomPercent}
          min={10}
          max={400}
          onChange={(e) => zoomTo(Number(e.target.value) / 100)}
          style={{
            width: 56,
            padding: '3px 6px',
            fontSize: 12,
            border: '1px solid #e5e7eb',
            borderRadius: 4,
            textAlign: 'right',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: '#6b7280' }}>%</span>
        <button
          onClick={fitAll}
          style={{ padding: '3px 8px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', background: 'white' }}
        >
          Fit
        </button>
        <button
          onClick={() => zoomTo(1)}
          style={{ padding: '3px 8px', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', background: 'white' }}
        >
          1:1
        </button>

        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />

        {/* Save / Open / Export */}
        <button
          onClick={handleSave}
          title="Save (⌘S)"
          style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', background: 'white' }}
        >
          💾
        </button>
        <button
          onClick={handleOpen}
          title="Open (⌘O)"
          style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', background: 'white' }}
        >
          📂
        </button>
        <button
          onClick={() => setShowExport(true)}
          title="Export JSX"
          style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', background: 'white' }}
          disabled={!file?.frames.length}
        >
          ↗ JSX
        </button>

        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />

        {/* Online indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#6b7280' }}>
            {connected ? `${peerCount} online` : 'Disconnected'}
          </span>
        </div>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}

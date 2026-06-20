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
  author: string;
  onAuthorChange: (name: string) => void;
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
          background: 'var(--sb-bg)',
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
          style={{ padding: '6px 8px', fontSize: 13, border: '1px solid var(--sb-border)', borderRadius: 4, outline: 'none' }}
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
            border: '1px solid var(--sb-border)',
            borderRadius: 4,
            padding: 10,
            resize: 'vertical',
            outline: 'none',
            background: 'var(--sb-bg-secondary)',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 16px',
              fontSize: 13,
              background: copied ? '#10b981' : 'var(--sb-accent)',
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
            style={{ padding: '6px 16px', fontSize: 13, border: '1px solid var(--sb-border)', borderRadius: 4, cursor: 'pointer', background: 'var(--sb-bg)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toolbar({ connected, peerCount, author, onAuthorChange }: ToolbarProps) {
  const { activeTool, setTool, viewport, zoomTo, globalInteractMode, toggleGlobalInteractMode } = useCanvasStore();
  const { file, newFile, loadFile, selectedFrameId } = useDesignStore();
  const { status, loadRegistry } = useRegistryStore();
  const [showExport, setShowExport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const zoomPercent = Math.round(viewport.zoom * 100);

  const tools: { id: Tool; icon: React.ReactNode; label: string; key: string }[] = [
    { id: 'select',  icon: <SelectIcon />,  label: 'Select',  key: '1' },
    { id: 'comment', icon: <CommentIcon />, label: 'Comment', key: '2' },
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
          borderBottom: '1px solid var(--sb-border)',
          background: 'var(--sb-bg)',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={{ padding: '5px 7px', border: '1px solid var(--sb-border)', borderRadius: 4, cursor: 'pointer', background: 'var(--sb-bg)', display: 'flex', alignItems: 'center' }}
          >
            <MenuIcon />
          </button>
          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'var(--sb-bg)',
                border: '1px solid var(--sb-border)',
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
                    borderBottom: '1px solid var(--sb-border)',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sb-text-2)', marginRight: 4 }}>
          Storyboard
        </span>

        <div style={{ width: 1, height: 20, background: 'var(--sb-border)' }} />

        {/* Tools */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            title={`${tool.label} (${tool.key})`}
            style={{
              padding: '5px 9px',
              border: activeTool === tool.id ? '1px solid var(--sb-accent)' : '1px solid var(--sb-border)',
              borderRadius: 4,
              cursor: 'pointer',
              background: activeTool === tool.id ? 'var(--sb-accent-bg)' : 'var(--sb-bg)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {tool.icon}
            <span style={{ fontSize: 10, color: activeTool === tool.id ? 'var(--sb-accent)' : 'var(--sb-text-4)' }}>{tool.key}</span>
          </button>
        ))}

        <button
          onClick={toggleGlobalInteractMode}
          title="Global interact mode (3) — all iframes receive pointer events"
          style={{
            padding: '5px 9px',
            border: globalInteractMode ? '1px solid var(--sb-accent)' : '1px solid var(--sb-border)',
            borderRadius: 4,
            cursor: 'pointer',
            background: globalInteractMode ? 'var(--sb-accent-bg)' : 'var(--sb-bg)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <InteractIcon />
          <span style={{ fontSize: 10, color: globalInteractMode ? 'var(--sb-accent)' : 'var(--sb-text-4)' }}>3</span>
        </button>

        <div style={{ flex: 1 }} />

        {/* Author name */}
        <input
          type="text"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="Your name"
          style={{
            width: 120,
            padding: '3px 7px',
            fontSize: 12,
            border: '1px solid var(--sb-border)',
            borderRadius: 4,
            outline: 'none',
            color: 'var(--sb-text-2)',
          }}
        />

        {/* Zoom controls */}
        <div style={{ width: 1, height: 20, background: 'var(--sb-border)' }} />
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
            border: '1px solid var(--sb-border)',
            borderRadius: 4,
            textAlign: 'right',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--sb-text-3)' }}>%</span>
        <button
          onClick={fitAll}
          style={{ padding: '3px 8px', fontSize: 11, border: '1px solid var(--sb-border)', borderRadius: 4, cursor: 'pointer', background: 'var(--sb-bg)' }}
        >
          Fit
        </button>
        <button
          onClick={() => zoomTo(1)}
          style={{ padding: '3px 8px', fontSize: 11, border: '1px solid var(--sb-border)', borderRadius: 4, cursor: 'pointer', background: 'var(--sb-bg)' }}
        >
          1:1
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--sb-border)' }} />

        {/* Save / Open / Export */}
        <button onClick={handleSave} title="Save (⌘S)"
          style={{ padding: '5px 7px', border: '1px solid var(--sb-border)', borderRadius: 4, cursor: 'pointer', background: 'var(--sb-bg)', display: 'flex', alignItems: 'center' }}>
          <SaveIcon />
        </button>
        <button onClick={handleOpen} title="Open (⌘O)"
          style={{ padding: '5px 7px', border: '1px solid var(--sb-border)', borderRadius: 4, cursor: 'pointer', background: 'var(--sb-bg)', display: 'flex', alignItems: 'center' }}>
          <OpenIcon />
        </button>
        <button onClick={() => setShowExport(true)} title="Export JSX" disabled={!file?.frames.length}
          style={{ padding: '5px 7px', border: '1px solid var(--sb-border)', borderRadius: 4, cursor: 'pointer', background: 'var(--sb-bg)', display: 'flex', alignItems: 'center', gap: 4, opacity: !file?.frames.length ? 0.4 : 1 }}>
          <ExportIcon />
          <span style={{ fontSize: 11, color: 'var(--sb-text-2)' }}>JSX</span>
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--sb-border)' }} />

        {/* Refresh components */}
        <button
          onClick={loadRegistry}
          title="Refresh component library"
          style={{
            padding: '5px 7px',
            border: '1px solid var(--sb-border)',
            borderRadius: 4,
            cursor: 'pointer',
            background: 'var(--sb-bg)',
            display: 'flex',
            alignItems: 'center',
            opacity: status === 'loading' ? 0.5 : 1,
          }}
        >
          <RefreshIcon spinning={status === 'loading'} />
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--sb-border)' }} />

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
          <span style={{ color: 'var(--sb-text-3)' }}>
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

// ── Icons ─────────────────────────────────────────────────────────────────────

function MenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="6.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="10" width="12" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3L5 18.5L9.5 14L12.5 21L14.5 20.2L11.5 13.2L18 13.2L5 3Z"
        fill="currentColor"
        stroke="var(--sb-bg)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2.5C2 1.67 2.67 1 3.5 1H10.5C11.33 1 12 1.67 12 2.5V8.5C12 9.33 11.33 10 10.5 10H5L2 13V2.5Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="4" y="1.5" width="6" height="4" rx="0.5" fill="currentColor" />
      <rect x="3" y="7.5" width="8" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="5.5" y="2" width="1.5" height="2.5" rx="0.5" fill="var(--sb-bg)" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 4.5C1.5 3.67 2.17 3 3 3H5.5L7 5H11C11.83 5 12.5 5.67 12.5 6.5V10.5C12.5 11.33 11.83 12 11 12H3C2.17 12 1.5 11.33 1.5 10.5V4.5Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={spinning ? { animation: 'spin 0.8s linear infinite' } : undefined}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 7A5 5 0 1 1 9.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M9.5 1V3.5H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InteractIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 2.5V9.5L6.5 7.5L8 11L9.5 10.4L8 7H11L4 2.5Z" fill="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.5 4L7 1.5L9.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 9.5V11.5C2 12.05 2.45 12.5 3 12.5H11C11.55 12.5 12 12.05 12 11.5V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

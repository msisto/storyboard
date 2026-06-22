import React, { useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDesignStore } from '../store/useDesignStore';
import type { Tool } from '../types';

interface ToolbarProps {
  connected: boolean;
  peerCount: number;
  author: string;
  onAuthorChange: (name: string) => void;
  onPlay?: () => void;
  hasTransitions?: boolean;
  onAddFrame?: () => void;
  unreadCommentCount?: number;
  onToggleComments?: () => void;
}

export function Toolbar({ connected, peerCount, author, onAuthorChange, onPlay, hasTransitions, onAddFrame, unreadCommentCount = 0, onToggleComments }: ToolbarProps) {
  const { activeTool, setTool, viewport, zoomTo, globalInteractMode, toggleGlobalInteractMode } = useCanvasStore();
  const { file, newFile, closeFile, renameFile, selectComponent } = useDesignStore();
  const [showMenu, setShowMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const zoomPercent = Math.round(viewport.zoom * 100);

  const tools: { id: Tool; icon: React.ReactNode; label: string; key: string }[] = [
    { id: 'select',  icon: <SelectIcon />,  label: 'Select',  key: 'V' },
    { id: 'comment', icon: <CommentIcon />, label: 'Comment', key: 'C' },
  ];


  const fitAll = () => {
    if (!file?.frames.length) return;
    zoomTo(1);
  };

  return (
    <>
      <div
        style={{
          position: 'relative',
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
                { label: 'All boards', action: () => { closeFile(); setShowMenu(false); } },
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
              border: activeTool === tool.id && !globalInteractMode ? '1px solid var(--sb-accent)' : '1px solid var(--sb-border)',
              borderRadius: 4,
              cursor: 'pointer',
              background: activeTool === tool.id && !globalInteractMode ? 'var(--sb-accent-bg)' : 'var(--sb-bg)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {tool.icon}
            <span style={{ fontSize: 10, color: activeTool === tool.id && !globalInteractMode ? 'var(--sb-accent)' : 'var(--sb-text-4)' }}>{tool.key}</span>
          </button>
        ))}

        <button
          onClick={() => { if (!globalInteractMode) selectComponent(null); toggleGlobalInteractMode(); }}
          title="Global interact mode (I)"
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
          <span style={{ fontSize: 10, color: globalInteractMode ? 'var(--sb-accent)' : 'var(--sb-text-4)' }}>I</span>
        </button>

        {/* Add Frame */}
        {onAddFrame && (
          <button
            onClick={onAddFrame}
            title="Add frame"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
              border: '1px solid var(--sb-border)',
              background: 'var(--sb-bg)',
              color: 'var(--sb-text-3)',
              fontSize: 11,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="0.5" y="0.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5.5 3V8M3 5.5H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Frame
          </button>
        )}

        {/* Play / prototype button */}
        {hasTransitions && onPlay && (
          <button
            onClick={onPlay}
            title="Play prototype"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--sb-accent)',
              background: 'var(--sb-accent-bg)',
              color: 'var(--sb-accent)',
              marginLeft: 4,
            }}
          >
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
              <path d="M1 1.5L11 7L1 12.5V1.5Z" />
            </svg>
          </button>
        )}

        {/* Comment history */}
        <button
          onClick={onToggleComments}
          title="Comments"
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 4, cursor: 'pointer',
            border: '1px solid var(--sb-border)',
            background: 'var(--sb-bg)',
            color: 'var(--sb-text-4)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2C4.686 2 2 4.462 2 7.5c0 1.48.607 2.82 1.593 3.8L3 14l2.857-1.143A6.14 6.14 0 0 0 8 13c3.314 0 6-2.462 6-5.5S11.314 2 8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          {unreadCommentCount > 0 && (
            <div style={{
              position: 'absolute', top: 2, right: 2,
              width: 8, height: 8, borderRadius: '50%',
              background: '#F59E0B',
              border: '1px solid var(--sb-bg)',
            }} />
          )}
        </button>

        {/* Centered file title */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                const trimmed = titleDraft.trim();
                if (trimmed) renameFile(trimmed);
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              style={{
                pointerEvents: 'all',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--sb-text-1)',
                background: 'var(--sb-bg)',
                border: '1px solid var(--sb-border)',
                borderRadius: 4,
                padding: '2px 8px',
                outline: 'none',
                textAlign: 'center',
                width: 200,
              }}
            />
          ) : (
            <span
              onClick={() => {
                setTitleDraft(file?.name ?? '');
                setEditingTitle(true);
                setTimeout(() => titleInputRef.current?.select(), 0);
              }}
              style={{
                pointerEvents: file ? 'all' : 'none',
                fontSize: 13,
                fontWeight: 500,
                color: file ? 'var(--sb-text-1)' : 'var(--sb-text-4)',
                cursor: 'text',
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {file?.name ?? 'Untitled'}
            </span>
          )}
        </div>

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

        {/* Online indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              flexShrink: 0,
            }}
          />
          {(!connected || peerCount > 1) && (
            <span style={{ fontSize: 12, color: 'var(--sb-text-3)' }}>
              {connected ? `${peerCount} online` : 'Offline'}
            </span>
          )}
        </div>
      </div>

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

function InteractIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 2.5V9.5L6.5 7.5L8 11L9.5 10.4L8 7H11L4 2.5Z" fill="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

import React, { useState } from 'react';
import type { Frame } from '../types';
import { useDesignStore } from '../store/useDesignStore';

export function LayersPanel() {
  const {
    file,
    selectedFrameId,
    selectedComponentIds,
    selectFrame,
    selectComponent,
    updateFrame,
    updateComponent,
    deleteFrame,
    deleteComponent,
    updateTextLayer,
    deleteTextLayer,
  } = useDesignStore();
  const frameIsDirectlySelected = selectedComponentIds.length === 0;

  const [collapsedFrames, setCollapsedFrames] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const toggleCollapse = (id: string) => {
    setCollapsedFrames((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditingText(currentLabel);
  };

  const commitEdit = (isFrame: boolean, frameId?: string) => {
    if (!editingId || !editingText.trim()) {
      setEditingId(null);
      return;
    }
    if (isFrame) {
      updateFrame(editingId, { label: editingText });
    } else if (frameId) {
      updateComponent(frameId, editingId, { label: editingText });
    }
    setEditingId(null);
  };

  if (!file) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: 'var(--sb-text-4)', textAlign: 'center' }}>
        No file open
      </div>
    );
  }

  // ── Recursive frame tree node ─────────────────────────────────────────────

  function FrameTreeNode({ frame, depth, isTopLevel }: { frame: Frame; depth: number; isTopLevel: boolean }) {
    const isCollapsed = collapsedFrames.has(frame.id);
    const indent = depth * 16;
    const isSelectedFrame = isTopLevel && frame.id === selectedFrameId && frameIsDirectlySelected;
    const isSelectedChild = !isTopLevel && selectedComponentIds.includes(frame.id);
    const isHighlighted = isSelectedFrame || isSelectedChild;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editingId) return;
        const state = useDesignStore.getState();
        if (isTopLevel) {
          if (state.selectedFrameId !== frame.id || state.selectedComponentIds.length > 0) return;
        } else {
          if (!state.selectedComponentIds.includes(frame.id)) return;
        }
        e.preventDefault();
        e.stopPropagation();
        deleteFrame(frame.id);
      }
    };

    const handleClick = () => {
      if (isTopLevel) {
        selectFrame(frame.id);
        selectComponent(null);
      } else {
        selectComponent(frame.id);
      }
    };

    const hasChildren =
      frame.components.length > 0 ||
      (frame.textLayers ?? []).length > 0 ||
      (frame.frames ?? []).length > 0;

    return (
      <div key={frame.id}>
        {/* Frame row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: `4px 8px 4px ${8 + indent}px`,
            background: isHighlighted ? 'var(--sb-accent-bg)' : 'transparent',
            cursor: 'pointer',
            gap: 4,
          }}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <span
            onClick={(e) => { e.stopPropagation(); toggleCollapse(frame.id); }}
            style={{ fontSize: 9, color: 'var(--sb-text-3)', width: 10, flexShrink: 0 }}
          >
            {hasChildren ? (isCollapsed ? '▶' : '▼') : ' '}
          </span>

          {editingId === frame.id ? (
            <input
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={() => commitEdit(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(true);
                if (e.key === 'Escape') setEditingId(null);
                e.stopPropagation();
              }}
              style={{ flex: 1, fontSize: 12, border: '1px solid var(--sb-accent)', borderRadius: 2, padding: '0 2px', outline: 'none' }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: isTopLevel ? 500 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              onDoubleClick={(e) => { e.stopPropagation(); startEdit(frame.id, frame.label); }}
            >
              {frame.label}
            </span>
          )}

          <span style={{ fontSize: 9, color: 'var(--sb-text-4)', background: 'var(--sb-bg-tertiary)', padding: '1px 4px', borderRadius: 2, flexShrink: 0 }}>
            F
          </span>
        </div>

        {/* Children */}
        {!isCollapsed && (
          <>
            {/* Nested child frames */}
            {(frame.frames ?? []).map((childFrame) => (
              <FrameTreeNode
                key={childFrame.id}
                frame={childFrame}
                depth={depth + 1}
                isTopLevel={false}
              />
            ))}

            {/* Component rows */}
            {frame.components.map((component) => {
              const isSelectedComp = selectedComponentIds.includes(component.id);
              return (
                <div
                  key={component.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: `3px 8px 3px ${24 + indent}px`,
                    background: isSelectedComp ? 'var(--sb-accent-bg)' : 'transparent',
                    cursor: 'pointer',
                    gap: 4,
                  }}
                  onClick={(e) => selectComponent(component.id, e.shiftKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      if (editingId) return;
                      if (!selectedComponentIds.includes(component.id)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      deleteComponent(frame.id, component.id);
                    }
                  }}
                  tabIndex={0}
                >
                  {editingId === component.id ? (
                    <input
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => commitEdit(false, frame.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(false, frame.id);
                        if (e.key === 'Escape') setEditingId(null);
                        e.stopPropagation();
                      }}
                      style={{ flex: 1, fontSize: 12, border: '1px solid var(--sb-accent)', borderRadius: 2, padding: '0 2px', outline: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--sb-text-2)' }}
                      onDoubleClick={(e) => { e.stopPropagation(); startEdit(component.id, component.label); }}
                    >
                      {component.label}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); updateComponent(frame.id, component.id, { visible: !component.visible }); }}
                    title={component.visible ? 'Hide' : 'Show'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: component.visible ? 'var(--sb-text-2)' : 'var(--sb-border-strong)' }}
                  >
                    {component.visible ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateComponent(frame.id, component.id, { locked: !component.locked }); }}
                    title={component.locked ? 'Unlock' : 'Lock'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: component.locked ? 'var(--sb-text-2)' : 'var(--sb-border-strong)' }}
                  >
                    {component.locked ? <LockIcon /> : <UnlockIcon />}
                  </button>
                </div>
              );
            })}

            {/* Text layer rows */}
            {(frame.textLayers ?? []).map((tl) => {
              const isSelectedTL = selectedComponentIds.includes(tl.id);
              return (
                <div
                  key={tl.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: `3px 8px 3px ${24 + indent}px`,
                    background: isSelectedTL ? 'var(--sb-accent-bg)' : 'transparent',
                    cursor: 'pointer',
                    gap: 4,
                  }}
                  onClick={(e) => selectComponent(tl.id, e.shiftKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      if (editingId) return;
                      if (!selectedComponentIds.includes(tl.id)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      deleteTextLayer(frame.id, tl.id);
                    }
                  }}
                  tabIndex={0}
                >
                  {editingId === tl.id ? (
                    <input
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => { if (editingText.trim()) updateTextLayer(frame.id, tl.id, { label: editingText }); setEditingId(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { if (editingText.trim()) updateTextLayer(frame.id, tl.id, { label: editingText }); setEditingId(null); }
                        if (e.key === 'Escape') setEditingId(null);
                        e.stopPropagation();
                      }}
                      style={{ flex: 1, fontSize: 12, border: '1px solid var(--sb-accent)', borderRadius: 2, padding: '0 2px', outline: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--sb-text-2)' }}
                      onDoubleClick={(e) => { e.stopPropagation(); startEdit(tl.id, tl.label); }}
                    >
                      {tl.label}
                    </span>
                  )}
                  <span style={{ fontSize: 9, color: 'var(--sb-text-4)', background: 'var(--sb-bg-tertiary)', padding: '1px 4px', borderRadius: 2, flexShrink: 0 }}>T</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateTextLayer(frame.id, tl.id, { visible: !tl.visible }); }}
                    title={tl.visible ? 'Hide' : 'Show'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: tl.visible ? 'var(--sb-text-2)' : 'var(--sb-border-strong)' }}
                  >
                    {tl.visible ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {file.frames.map((frame) => (
        <FrameTreeNode key={frame.id} frame={frame} depth={0} isTopLevel={true} />
      ))}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="6" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <ellipse cx="6" cy="6" rx="5" ry="3.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M4 5.5V3.5a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="6" cy="8" r="0.8" fill="currentColor" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M4 5.5V3.5a2 2 0 014 0" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="6" cy="8" r="0.8" fill="currentColor" />
    </svg>
  );
}

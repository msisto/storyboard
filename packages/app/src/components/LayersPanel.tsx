import React, { useState } from 'react';
import { useDesignStore } from '../store/useDesignStore';

export function LayersPanel() {
  const {
    file,
    selectedFrameId,
    selectedComponentId,
    selectFrame,
    selectComponent,
    updateFrame,
    updateComponent,
    deleteFrame,
    deleteComponent,
  } = useDesignStore();

  const [collapsedFrames, setCollapsedFrames] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const toggleFrame = (id: string) => {
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

  const handleKeyDown = (
    e: React.KeyboardEvent,
    id: string,
    isFrame: boolean,
    frameId?: string
  ) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (editingId) return;
      // Guard: only act when the focused row matches store selection.
      // Without this, a focused frame row deletes the whole frame even
      // when the user has since clicked a component on the canvas.
      const state = useDesignStore.getState();
      if (isFrame) {
        if (state.selectedFrameId !== id || state.selectedComponentId) return;
      } else {
        if (state.selectedComponentId !== id) return;
      }
      e.preventDefault();
      e.stopPropagation(); // prevent window listener from also firing after this deletes
      if (isFrame) {
        deleteFrame(id);
      } else if (frameId) {
        deleteComponent(frameId, id);
      }
    }
  };

  if (!file) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        No file open
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {file.frames.map((frame) => {
        const isCollapsed = collapsedFrames.has(frame.id);
        const isSelectedFrame = frame.id === selectedFrameId;

        return (
          <div key={frame.id}>
            {/* Frame row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                background: isSelectedFrame ? '#eff6ff' : 'transparent',
                cursor: 'pointer',
                gap: 4,
              }}
              onClick={() => {
                selectFrame(frame.id);
                selectComponent(null);
              }}
              onKeyDown={(e) => handleKeyDown(e, frame.id, true)}
              tabIndex={0}
            >
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFrame(frame.id);
                }}
                style={{ fontSize: 9, color: '#6b7280', width: 10, flexShrink: 0 }}
              >
                {isCollapsed ? '▶' : '▼'}
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
                  style={{
                    flex: 1,
                    fontSize: 12,
                    border: '1px solid #0066FF',
                    borderRadius: 2,
                    padding: '0 2px',
                    outline: 'none',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEdit(frame.id, frame.label);
                  }}
                >
                  {frame.label}
                </span>
              )}

              <span
                style={{
                  fontSize: 9,
                  color: '#9ca3af',
                  background: '#f3f4f6',
                  padding: '1px 4px',
                  borderRadius: 2,
                }}
              >
                F
              </span>
            </div>

            {/* Component rows */}
            {!isCollapsed &&
              frame.components.map((component) => {
                const isSelectedComp = component.id === selectedComponentId;
                return (
                  <div
                    key={component.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '3px 8px 3px 24px',
                      background: isSelectedComp ? '#eff6ff' : 'transparent',
                      cursor: 'pointer',
                      gap: 4,
                    }}
                    onClick={() => {
                      selectComponent(component.id);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, component.id, false, frame.id)}
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
                        style={{
                          flex: 1,
                          fontSize: 12,
                          border: '1px solid #0066FF',
                          borderRadius: 2,
                          padding: '0 2px',
                          outline: 'none',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#374151',
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEdit(component.id, component.label);
                        }}
                      >
                        {component.label}
                      </span>
                    )}

                    {/* Visibility toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateComponent(frame.id, component.id, {
                          visible: !component.visible,
                        });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '0 2px',
                        color: component.visible ? '#374151' : '#d1d5db',
                      }}
                      title={component.visible ? 'Hide' : 'Show'}
                    >
                      {component.visible ? '👁' : '👁'}
                    </button>

                    {/* Lock toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateComponent(frame.id, component.id, {
                          locked: !component.locked,
                        });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '0 2px',
                        color: component.locked ? '#374151' : '#d1d5db',
                      }}
                      title={component.locked ? 'Unlock' : 'Lock'}
                    >
                      {component.locked ? '🔒' : '🔓'}
                    </button>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

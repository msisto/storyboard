import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from './canvas/Canvas';
import { Toolbar } from './components/Toolbar';
import { LayersPanel } from './components/LayersPanel';
import { ComponentPalette } from './components/ComponentPalette';
import { FilePicker } from './components/FilePicker';
import { saveDesignFile, openDesignFile } from './store/fileSystem';
import { PropsInspector } from './components/PropsInspector';
import { useRegistryStore } from './registry/useRegistryStore';
import { useDesignStore } from './store/useDesignStore';
import { useCanvasStore } from './store/useCanvasStore';
import { useCommentSync } from './comments/useCommentSync';
import { useAutoSave } from './store/useAutoSave';
import { api } from './store/api';
import { computeAutoLayout } from './canvas/autoLayout';
import type { AutoLayoutSettings, StorybookStory } from './types';

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

type AppView = 'loading' | 'picker' | 'canvas';

const AUTHOR = 'User';

function StorybookErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        gap: 16,
        zIndex: 9998,
      }}
    >
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Storybook not reachable</h2>
      <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
        Make sure Storybook is running at{' '}
        <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: 3 }}>
          localhost:6006
        </code>
      </p>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{error}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 20px',
          background: '#0066FF',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Retry
      </button>
    </div>
  );
}

type LeftTab = 'layers' | 'components';

// Comment placement modal
function CommentModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (text: string, author: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(AUTHOR);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 8,
          padding: 16,
          width: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Add comment</h3>
        <input
          type="text"
          placeholder="Your name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none' }}
        />
        <textarea
          autoFocus
          placeholder="Comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{ padding: '6px 8px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              if (text.trim() && author.trim()) onSubmit(text, author);
            }
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '5px 12px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', background: 'white' }}>
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim() && author.trim()) onSubmit(text, author); }}
            disabled={!text.trim() || !author.trim()}
            style={{ padding: '5px 12px', fontSize: 12, background: '#0066FF', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { status, error, loadRegistry } = useRegistryStore();
  const { file, loadFile, addComponent, addComment, selectedFrameId } = useDesignStore();
  const { activeTool, setTool, exitInteractMode, zoom, pan } = useCanvasStore();
  const { connected, peerCount } = useCommentSync(AUTHOR);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<AppView>('loading');
  const [leftTab, setLeftTab] = useState<LeftTab>('layers');
  const [pendingComment, setPendingComment] = useState<{
    frameId: string;
    x: number;
    y: number;
  } | null>(null);

  useAutoSave();

  // URL-based routing: ?file=<id> opens a file; no param shows the picker
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('file');
    if (!id) {
      setView('picker');
      return;
    }
    api
      .getFile(id)
      .then((f) => {
        loadFile(f);
        loadRegistry();
        setView('canvas');
      })
      .catch(() => {
        history.replaceState(null, '', window.location.pathname);
        setView('picker');
      });
  }, []);

  const handleFileOpened = useCallback(
    async (id: string) => {
      // If the store already has this file (just created in FilePicker), skip fetch
      const existing = useDesignStore.getState().file;
      if (!existing || existing.id !== id) {
        const f = await api.getFile(id);
        loadFile(f);
      }
      history.pushState(null, '', `?file=${id}`);
      loadRegistry();
      setView('canvas');
    },
    [loadFile, loadRegistry]
  );

  // Auto-retry registry every 5s on error
  useEffect(() => {
    if (status !== 'error') return;
    const t = setInterval(loadRegistry, 5000);
    return () => clearInterval(t);
  }, [status, loadRegistry]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) return;

      // Tools
      if (!e.metaKey && !e.ctrlKey) {
        if (e.key === 'v' || e.key === 'V') setTool('select');
        if (e.key === 'f' || e.key === 'F') setTool('frame');
        if (e.key === 'c' || e.key === 'C') setTool('comment');
        if (e.key === 'h' || e.key === 'H') setTool('pan');
        if (e.key === 'Escape') exitInteractMode();

        // Shift+A: toggle auto layout on selected frame
        if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
          e.preventDefault();
          const state = useDesignStore.getState();
          const frame = state.file?.frames.find((f) => f.id === state.selectedFrameId);
          if (frame) {
            if (frame.autoLayout) {
              const layout = computeAutoLayout(frame);
              frame.components.filter((c) => !c.absolute).forEach((c) => {
                const geo = layout.components[c.id];
                if (geo) state.updateComponent(frame.id, c.id, { x: geo.x, y: geo.y });
              });
              state.updateFrame(frame.id, { autoLayout: undefined });
            } else {
              state.updateFrame(frame.id, { autoLayout: { ...DEFAULT_AUTO_LAYOUT } });
            }
          }
        }
      }

      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useDesignStore.getState().undo();
        return;
      }

      // Zoom
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoom(1, window.innerWidth / 2, window.innerHeight / 2);
        }
        if (e.key === '-') {
          e.preventDefault();
          zoom(-1, window.innerWidth / 2, window.innerHeight / 2);
        }
        if (e.key === '0') {
          e.preventDefault();
          useCanvasStore.getState().resetViewport();
        }
        if (e.key === '1') {
          e.preventDefault();
          useCanvasStore.getState().zoomTo(1);
        }
        if (e.key === 's') {
          e.preventDefault();
          const f = useDesignStore.getState().file;
          if (f) saveDesignFile(f).catch(() => {});
        }
        if (e.key === 'o') {
          e.preventDefault();
          openDesignFile()
            .then((loaded) => useDesignStore.getState().loadFile(loaded))
            .catch(() => {});
        }
        if (e.key === 'd') {
          e.preventDefault();
          const state = useDesignStore.getState();
          if (state.selectedComponentId) {
            const frame = state.file?.frames.find((f) =>
              f.components.some((c) => c.id === state.selectedComponentId)
            );
            const comp = frame?.components.find((c) => c.id === state.selectedComponentId);
            if (comp && frame) {
              state.addComponent(frame.id, {
                ...comp,
                x: comp.x + 20,
                y: comp.y + 20,
                label: comp.label + ' copy',
              });
            }
          }
        }
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useDesignStore.getState();
        if (state.selectedComponentId) {
          const frame = state.file?.frames.find((f) =>
            f.components.some((c) => c.id === state.selectedComponentId)
          );
          if (frame) state.deleteComponent(frame.id, state.selectedComponentId);
        } else if (state.selectedFrameId) {
          state.deleteFrame(state.selectedFrameId);
        }
      }

      // Z-order
      if (e.key === '[' || e.key === ']') {
        const state = useDesignStore.getState();
        if (state.selectedComponentId && state.selectedFrameId) {
          const frame = state.file?.frames.find((f) => f.id === state.selectedFrameId);
          if (frame) {
            const idx = frame.components.findIndex((c) => c.id === state.selectedComponentId);
            if (idx >= 0) {
              const newIdx = e.key === '[' ? Math.max(0, idx - 1) : Math.min(frame.components.length - 1, idx + 1);
              if (newIdx !== idx) state.reorderComponent(frame.id, idx, newIdx);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setTool, exitInteractMode, zoom]);

  // Comment placement via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const { frameId, x, y } = (e as CustomEvent<{ frameId: string; x: number; y: number }>).detail;
      setPendingComment({ frameId, x, y });
    };
    window.addEventListener('storyboard:place-comment', handler);
    return () => window.removeEventListener('storyboard:place-comment', handler);
  }, []);

  // Drag-drop from component palette onto canvas
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-storybook-story')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/x-storybook-story');
      if (!raw) return;

      const story: StorybookStory = JSON.parse(raw);
      const state = useDesignStore.getState();
      const viewport = useCanvasStore.getState().viewport;
      const rect = canvasRef.current!.getBoundingClientRect();

      // Convert screen drop position to world coordinates
      const worldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const worldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

      // Find which frame the cursor landed inside
      const frames = state.file?.frames ?? [];
      let targetFrame = frames.find(
        (f) =>
          worldX >= f.x &&
          worldX <= f.x + f.width &&
          worldY >= f.y &&
          worldY <= f.y + f.height
      );

      // If not inside any frame, create one at the drop position
      if (!targetFrame) {
        if (frames.length === 0) {
          const newId = state.addFrame(
            Math.round(worldX - 200),
            Math.round(worldY - 100),
            600,
            400
          );
          targetFrame = useDesignStore.getState().file?.frames.find((f) => f.id === newId);
        } else {
          // Fall back to the selected frame or the first frame
          const fallbackId = state.selectedFrameId ?? frames[0].id;
          targetFrame = frames.find((f) => f.id === fallbackId);
        }
      }

      if (!targetFrame) return;

      const relX = worldX - targetFrame.x;
      const relY = worldY - targetFrame.y;

      addComponent(targetFrame.id, {
        storybookId: story.id,
        title: story.title,
        name: story.name,
        x: Math.max(0, Math.round(relX - 100)), // center on cursor
        y: Math.max(0, Math.round(relY - 40)),
        width: 200,
        height: 80,
        args: {},
        locked: false,
        visible: true,
        label: `${story.title.split('/').pop()} · ${story.name}`,
      });
    },
    [addComponent]
  );

  if (view === 'loading') {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (view === 'picker') {
    return <FilePicker onFileOpened={handleFileOpened} />;
  }

  if (status === 'error' && error) {
    return <StorybookErrorScreen error={error} onRetry={loadRegistry} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Toolbar connected={connected} peerCount={peerCount} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #e5e7eb',
            background: 'white',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {(['layers', 'components'] as LeftTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: 11,
                  fontWeight: leftTab === tab ? 600 : 400,
                  background: 'none',
                  border: 'none',
                  borderBottom: leftTab === tab ? '2px solid #0066FF' : '2px solid transparent',
                  cursor: 'pointer',
                  color: leftTab === tab ? '#0066FF' : '#6b7280',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {leftTab === 'layers' ? <LayersPanel /> : <ComponentPalette />}
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <Canvas />
        </div>

        {/* Right panel */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            borderLeft: '1px solid #e5e7eb',
            background: 'white',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: '#6b7280',
              borderBottom: '1px solid #e5e7eb',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Inspect
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PropsInspector />
          </div>
        </div>
      </div>

      {/* Comment placement modal */}
      {pendingComment && (
        <CommentModal
          onSubmit={(text, author) => {
            addComment({
              frameId: pendingComment.frameId,
              x: pendingComment.x,
              y: pendingComment.y,
              text,
              author,
              resolved: false,
            });
            setPendingComment(null);
            setTool('select');
          }}
          onCancel={() => setPendingComment(null)}
        />
      )}
    </div>
  );
}

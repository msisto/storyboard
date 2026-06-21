import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from './canvas/Canvas';
import { Toolbar } from './components/Toolbar';
import { LayersPanel } from './components/LayersPanel';
import { ComponentPalette } from './components/ComponentPalette';
import { TextPalette } from './components/TextPalette';
import { FilePicker } from './components/FilePicker';
import { saveDesignFile, openDesignFile } from './store/fileSystem';
import { PropsInspector } from './components/PropsInspector';
import { useRegistryStore } from './registry/useRegistryStore';
import { getStoryEntry } from './registry/storyRegistry';
import { useDesignStore, findFrame } from './store/useDesignStore';
import { useCanvasStore } from './store/useCanvasStore';
import { useCommentSync } from './comments/useCommentSync';
import { useAutoSave } from './store/useAutoSave';
import { api } from './store/api';
import { computeAutoLayout } from './canvas/autoLayout';
import { StoryboardTimeline } from './timeline/StoryboardTimeline';
import type { AutoLayoutSettings, Frame, StorybookStory } from './types';

function inferAutoLayout(frame: Frame): AutoLayoutSettings {
  type Item = { x: number; y: number; width?: number; height?: number };
  const allItems: Item[] = [
    ...frame.components.filter((c) => !c.absolute && c.visible !== false),
    ...(frame.textLayers ?? []).filter((t) => !t.absolute && t.visible !== false),
    ...(frame.frames ?? []).filter((f) => !f.absolute && (f.visible ?? true)),
  ];

  // Detect direction: if items spread further in X than Y, use horizontal.
  let direction: 'horizontal' | 'vertical' = 'vertical';
  if (allItems.length >= 2) {
    const xRange = Math.max(...allItems.map((i) => i.x)) - Math.min(...allItems.map((i) => i.x));
    const yRange = Math.max(...allItems.map((i) => i.y)) - Math.min(...allItems.map((i) => i.y));
    if (xRange > yRange) direction = 'horizontal';
  }

  // Sort by the flow axis and measure gaps between adjacent items.
  const sorted = [...allItems].sort((a, b) =>
    direction === 'vertical' ? a.y - b.y : a.x - b.x
  );
  const gaps: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const space = direction === 'vertical'
      ? b.y - (a.y + (a.height ?? 20))
      : b.x - (a.x + (a.width ?? 100));
    if (space > 0) gaps.push(space);
  }
  const gap = gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : 0;

  return {
    direction,
    gap,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    primaryAlign: 'start',
    counterAlign: 'start',
    widthMode: 'fixed',
    heightMode: 'hug',
    wrap: false,
  };
}

type AppView = 'loading' | 'picker' | 'canvas';

const AUTHOR_KEY = 'storyboard:author';

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
        background: 'var(--sb-bg-secondary)',
        gap: 16,
        zIndex: 9998,
      }}
    >
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Storybook not reachable</h2>
      <p style={{ fontSize: 14, color: 'var(--sb-text-3)', margin: 0 }}>
        Make sure Storybook is running at{' '}
        <code style={{ background: 'var(--sb-border)', padding: '2px 6px', borderRadius: 3 }}>
          localhost:6006
        </code>
      </p>
      <p style={{ fontSize: 12, color: 'var(--sb-text-4)', margin: 0 }}>{error}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 20px',
          background: 'var(--sb-accent)',
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

type LeftTab = 'layers' | 'components' | 'text';

// Comment placement modal
function CommentModal({
  onSubmit,
  onCancel,
  initialAuthor,
}: {
  onSubmit: (text: string, author: string) => void;
  onCancel: () => void;
  initialAuthor: string;
}) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(initialAuthor);

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
          background: 'var(--sb-bg)',
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
          style={{ padding: '6px 8px', fontSize: 13, border: '1px solid var(--sb-border)', borderRadius: 4, outline: 'none' }}
        />
        <textarea
          autoFocus
          placeholder="Comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{ padding: '6px 8px', fontSize: 13, border: '1px solid var(--sb-border)', borderRadius: 4, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              if (text.trim() && author.trim()) onSubmit(text, author);
            }
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '5px 12px', fontSize: 12, border: '1px solid var(--sb-border)', borderRadius: 4, cursor: 'pointer', background: 'var(--sb-bg)' }}>
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim() && author.trim()) onSubmit(text, author); }}
            disabled={!text.trim() || !author.trim()}
            style={{ padding: '5px 12px', fontSize: 12, background: 'var(--sb-accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
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
  const { file, loadFile, addComponent, addSlottedComponent, addComment, addFrame, selectFrame, selectedFrameId, selectedFrameIds, selectedComponentId, toggleFrameSelection, reorderFrame, selectComponent } = useDesignStore();
  const { activeTool, setTool, exitInteractMode, exitTextEditMode, zoom, pan, toggleGlobalInteractMode, exitGlobalInteractMode, globalInteractMode } = useCanvasStore();
  const [authorName, setAuthorName] = useState(() => localStorage.getItem(AUTHOR_KEY) || '');
  const handleAuthorChange = useCallback((name: string) => {
    setAuthorName(name);
    localStorage.setItem(AUTHOR_KEY, name);
  }, []);
  const { connected, peerCount, sendCursor, peerCursors } = useCommentSync(authorName || 'Anonymous');
  const canvasRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<AppView>('loading');
  const [leftTab, setLeftTab] = useState<LeftTab>('layers');
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [panelsVisible, setPanelsVisible] = useState(true);

  const handleLeftPanelResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const onMove = (mv: MouseEvent) => {
      setLeftPanelWidth(Math.max(160, Math.min(480, startWidth + mv.clientX - startX)));
    };
    const onUp = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftPanelWidth]);
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

  // Retry every 5s on error; poll every 10s when ready so story arg changes are picked up
  useEffect(() => {
    if (status !== 'error' && status !== 'ready') return;
    const interval = status === 'error' ? 5000 : 10000;
    const t = setInterval(loadRegistry, interval);
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
        if (e.key === 't' || e.key === 'T') setTool('text');
        if (e.key === 'c' || e.key === 'C') setTool('comment');
        if (e.key === 'h' || e.key === 'H') setTool('pan');
        if (e.key === 'i' || e.key === 'I') {
          if (!globalInteractMode) selectComponent(null);
          toggleGlobalInteractMode();
        }
        if (e.key === 'Escape') {
          if (globalInteractMode) { exitGlobalInteractMode(); return; }
          exitInteractMode();
          exitTextEditMode();
          // Pop out of an entered group: if the selected item is a direct child of a
          // child frame (not the top-level frame itself), select the parent group.
          const ds = useDesignStore.getState();
          if (ds.selectedComponentId && ds.file) {
            const allFrames = ds.file.frames;
            const parentGroup = (function findDirectParent(frames: Frame[], id: string): Frame | undefined {
              for (const f of frames) {
                const isDirect =
                  f.components.some((c) => c.id === id) ||
                  (f.textLayers ?? []).some((t) => t.id === id) ||
                  (f.frames ?? []).some((cf) => cf.id === id);
                if (isDirect) return f;
                const found = findDirectParent(f.frames ?? [], id);
                if (found) return found;
              }
            })(allFrames, ds.selectedComponentId);
            // Only pop up if the parent is a child frame (not a top-level frame)
            if (parentGroup && !allFrames.some((f) => f.id === parentGroup.id)) {
              ds.selectComponent(parentGroup.id);
            }
          }
        }

        // Shift+A: toggle auto layout on selected frame or selected child frame
        if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
          e.preventDefault();
          const state = useDesignStore.getState();
          // If the selected "component" is actually a child frame, target it directly.
          const childFrame = state.selectedComponentId && state.file
            ? findFrame(state.file.frames, state.selectedComponentId)
            : null;
          const frame: Frame | null | undefined = childFrame
            ?? state.file?.frames.find((f) => f.id === state.selectedFrameId);
          if (frame) {
            if (frame.autoLayout) {
              const layout = computeAutoLayout(frame);
              frame.components.filter((c) => !c.absolute).forEach((c) => {
                const geo = layout.components[c.id];
                if (geo) state.updateComponent(frame.id, c.id, { x: geo.x, y: geo.y });
              });
              state.updateFrame(frame.id, { autoLayout: undefined });
            } else {
              state.updateFrame(frame.id, { autoLayout: inferAutoLayout(frame) });
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

      // Toggle panels
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setPanelsVisible((v) => !v);
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
        if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          useDesignStore.getState().groupSelectedItems();
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
        if (state.selectedComponentIds.length > 0) {
          state.deleteSelectedComponents();
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

  // Drag-drop from component palette or text palette onto canvas
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes('application/x-storybook-story') ||
      e.dataTransfer.types.includes('application/x-text-style')
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const state = useDesignStore.getState();
      const viewport = useCanvasStore.getState().viewport;
      const rect = canvasRef.current!.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const worldY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

      const frames = state.file?.frames ?? [];

      type FrameHit = { frame: Frame; absX: number; absY: number };
      function findDeepestFrameAt(
        list: Frame[], wx: number, wy: number, ox = 0, oy = 0
      ): FrameHit | undefined {
        for (const f of list) {
          const ax = ox + f.x, ay = oy + f.y;
          if (wx >= ax && wx <= ax + f.width && wy >= ay && wy <= ay + f.height) {
            const child = findDeepestFrameAt(f.frames ?? [], wx, wy, ax, ay);
            return child ?? { frame: f, absX: ax, absY: ay };
          }
        }
      }

      const hit = findDeepestFrameAt(frames, worldX, worldY);
      let targetFrame = hit?.frame;
      let targetAbsX = hit?.absX ?? 0;
      let targetAbsY = hit?.absY ?? 0;

      const ensureFrame = (): FrameHit | undefined => {
        if (targetFrame) return { frame: targetFrame!, absX: targetAbsX, absY: targetAbsY };
        if (frames.length === 0) {
          const newId = state.addFrame(Math.round(worldX - 200), Math.round(worldY - 100), 600, 400);
          const f = useDesignStore.getState().file?.frames.find((f) => f.id === newId);
          return f ? { frame: f, absX: f.x, absY: f.y } : undefined;
        }
        const fallbackId = state.selectedFrameId ?? frames[0].id;
        const f = frames.find((f) => f.id === fallbackId);
        return f ? { frame: f, absX: f.x, absY: f.y } : undefined;
      };

      // ── Text style drop ──────────────────────────────────────────────────
      const textRaw = e.dataTransfer.getData('application/x-text-style');
      if (textRaw) {
        const { fontSize, fontWeight } = JSON.parse(textRaw) as { fontSize: string; fontWeight: string };
        const result = ensureFrame();
        if (!result) return;
        const relX = Math.max(0, Math.round(worldX - result.absX));
        const relY = Math.max(0, Math.round(worldY - result.absY));
        const id = state.addTextLayer(result.frame.id, { x: relX, y: relY, fontSize: fontSize as never, fontWeight: fontWeight as never });
        requestAnimationFrame(() => useCanvasStore.getState().enterTextEditMode(id));
        return;
      }

      // ── Component (Storybook story) drop ─────────────────────────────────
      const storyRaw = e.dataTransfer.getData('application/x-storybook-story');
      if (!storyRaw) return;
      const story: StorybookStory = JSON.parse(storyRaw);
      const result = ensureFrame();
      if (!result) return;
      const { frame, absX, absY } = result;
      const storyEntry = getStoryEntry(story.id);
      const slotData = {
        storybookId: story.id,
        title: story.title,
        name: story.name,
        x: 0, y: 0, width: 0, height: 0,
        args: storyEntry?.defaultArgs ?? {},
        locked: false,
        visible: true,
        label: `${story.title.split('/').pop()} · ${story.name}`,
      };

      // Check if the drop lands on an existing component — if so, slot into it
      const parentComp = frame.components.find((c) => {
        return worldX >= absX + c.x && worldX <= absX + c.x + c.width
            && worldY >= absY + c.y && worldY <= absY + c.y + c.height;
      });
      if (parentComp) {
        addSlottedComponent(frame.id, parentComp.id, 'children', slotData);
        return;
      }

      const relX = worldX - absX;
      const relY = worldY - absY;
      addComponent(frame.id, {
        ...slotData,
        x: Math.max(0, Math.round(relX - 100)),
        y: Math.max(0, Math.round(relY - 40)),
        width: 200,
        height: 80,
      });
    },
    [addComponent, addSlottedComponent]
  );

  const fitFrame = useCallback((frame: Frame) => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const PAD = 56;
    const newZoom = Math.max(0.1, Math.min(4, Math.min(
      (width - PAD * 2) / frame.width,
      (height - PAD * 2) / frame.height,
    )));
    useCanvasStore.getState().fitViewport(
      width / 2 - (frame.x + frame.width / 2) * newZoom,
      height / 2 - (frame.y + frame.height / 2) * newZoom,
      newZoom,
    );
  }, []);

  const handleSelectFrame = useCallback(
    (frame: Frame) => {
      selectFrame(frame.id);
      fitFrame(frame);
    },
    [selectFrame, fitFrame]
  );

  // Fit all frames on initial load
  useEffect(() => {
    if (view !== 'canvas') return;
    requestAnimationFrame(() => {
      const frames = useDesignStore.getState().file?.frames ?? [];
      if (frames.length === 0 || !canvasRef.current) return;
      if (frames.length === 1) { fitFrame(frames[0]); return; }
      const { width, height } = canvasRef.current.getBoundingClientRect();
      const minX = Math.min(...frames.map((f) => f.x));
      const minY = Math.min(...frames.map((f) => f.y));
      const maxX = Math.max(...frames.map((f) => f.x + f.width));
      const maxY = Math.max(...frames.map((f) => f.y + f.height));
      const PAD = 72;
      const newZoom = Math.max(0.1, Math.min(4, Math.min(
        (width - PAD * 2) / (maxX - minX),
        (height - PAD * 2) / (maxY - minY),
      )));
      useCanvasStore.getState().fitViewport(
        width / 2 - (minX + (maxX - minX) / 2) * newZoom,
        height / 2 - (minY + (maxY - minY) / 2) * newZoom,
        newZoom,
      );
    });
  }, [view]);

  const handleAddFrame = useCallback(() => {
    const frames = useDesignStore.getState().file?.frames ?? [];
    const last = frames[frames.length - 1];
    const x = last ? last.x + last.width + 80 : 100;
    const y = last?.y ?? 100;
    const id = addFrame(x, y, 400, 300);
    requestAnimationFrame(() => {
      const newFrame = useDesignStore.getState().file?.frames.find((f) => f.id === id);
      if (newFrame) handleSelectFrame(newFrame);
    });
  }, [addFrame, handleSelectFrame]);

  if (view === 'loading') {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sb-bg-secondary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <p style={{ color: 'var(--sb-text-3)', fontSize: 14 }}>Loading…</p>
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
      {panelsVisible && (
        <Toolbar connected={connected} peerCount={peerCount} author={authorName} onAuthorChange={handleAuthorChange} />
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        {panelsVisible && (
          <>
            <div
              style={{
                width: leftPanelWidth,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--sb-bg)',
                overflow: 'hidden',
              }}
            >
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--sb-border)' }}>
                {(['layers', 'components', 'text'] as LeftTab[]).map((tab) => (
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
                      borderBottom: leftTab === tab ? '2px solid var(--sb-accent)' : '2px solid transparent',
                      cursor: 'pointer',
                      color: leftTab === tab ? 'var(--sb-accent)' : 'var(--sb-text-3)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                {leftTab === 'layers' ? <LayersPanel /> : leftTab === 'components' ? <ComponentPalette /> : <TextPalette />}
              </div>
            </div>

            {/* Left panel resize handle */}
            <div
              onMouseDown={handleLeftPanelResize}
              style={{
                width: 4,
                flexShrink: 0,
                cursor: 'col-resize',
                background: 'var(--sb-border)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sb-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--sb-border)')}
            />
          </>
        )}

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <Canvas sendCursor={sendCursor} peerCursors={peerCursors} />
        </div>

        {/* Right panel */}
        {panelsVisible && (
          <div
            style={{
              width: 240,
              flexShrink: 0,
              borderLeft: '1px solid var(--sb-border)',
              background: 'var(--sb-bg)',
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
                color: 'var(--sb-text-3)',
                borderBottom: '1px solid var(--sb-border)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {selectedFrameId || selectedComponentId || selectedFrameIds.length > 0 ? 'Inspect' : 'Theme'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PropsInspector />
            </div>
          </div>
        )}
      </div>

      {panelsVisible && (
        <StoryboardTimeline
          frames={file?.frames.filter((f) => f.inTimeline !== false) ?? []}
          selectedFrameId={selectedFrameId}
          selectedFrameIds={selectedFrameIds}
          onSelectFrame={handleSelectFrame}
          onToggleFrame={(frame) => toggleFrameSelection(frame.id)}
          onReorderFrame={reorderFrame}
          onRemoveFromTimeline={(id) => {
            const { updateFrame } = useDesignStore.getState();
            updateFrame(id, { inTimeline: false });
          }}
          onAddFrame={handleAddFrame}
        />
      )}

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
          initialAuthor={authorName}
        />
      )}
    </div>
  );
}

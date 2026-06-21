import { create } from 'zustand';
import type { Comment, CommentReply, ComponentInstance, DesignFile, Frame, TextLayer, TailwindFontSize, TailwindFontWeight } from '../types';
import { TAILWIND_FONT_SIZES } from '../types';
import { computeAutoLayout } from '../canvas/autoLayout';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const MAX_HISTORY = 50;

// ── Recursive frame helpers ───────────────────────────────────────────────────

function mapFrames(frames: Frame[], id: string, fn: (f: Frame) => Frame): Frame[] {
  return frames.map((f) => {
    if (f.id === id) return fn(f);
    if (!f.frames || f.frames.length === 0) return f;
    return { ...f, frames: mapFrames(f.frames, id, fn) };
  });
}

export function findFrame(frames: Frame[], id: string): Frame | undefined {
  for (const f of frames) {
    if (f.id === id) return f;
    if (f.frames) {
      const found = findFrame(f.frames, id);
      if (found) return found;
    }
  }
}

function removeFrame(frames: Frame[], id: string): Frame[] {
  return frames
    .filter((f) => f.id !== id)
    .map((f) => f.frames ? { ...f, frames: removeFrame(f.frames, id) } : f);
}

// Recursively map over a ComponentInstance and its slot descendants
function mapComponent(
  component: ComponentInstance,
  id: string,
  fn: (c: ComponentInstance) => ComponentInstance
): ComponentInstance {
  if (component.id === id) return fn(component);
  if (!component.slots) return component;
  let changed = false;
  const newSlots: Record<string, ComponentInstance[]> = {};
  for (const [slotName, children] of Object.entries(component.slots)) {
    const mapped = children.map((child) => {
      const next = mapComponent(child, id, fn);
      if (next !== child) changed = true;
      return next;
    });
    newSlots[slotName] = mapped;
  }
  return changed ? { ...component, slots: newSlots } : component;
}

// Returns true if a component or any of its slot descendants has the given id
function componentContainsId(component: ComponentInstance, id: string): boolean {
  if (component.id === id) return true;
  for (const children of Object.values(component.slots ?? {})) {
    if (children.some((c) => componentContainsId(c, id))) return true;
  }
  return false;
}

function frameContainsItem(frame: Frame, id: string): boolean {
  if (frame.id === id) return true;
  if (frame.components.some((c) => componentContainsId(c, id))) return true;
  if ((frame.textLayers ?? []).some((t) => t.id === id)) return true;
  for (const cf of frame.frames ?? []) {
    if (frameContainsItem(cf, id)) return true;
  }
  return false;
}

function buildDefaultFlowOrder(f: Frame): string[] {
  return [
    ...f.components.map((c) => c.id),
    ...(f.textLayers ?? []).map((t) => t.id),
    ...(f.frames ?? []).map((cf) => cf.id),
  ];
}

// ── Interface ─────────────────────────────────────────────────────────────────

interface DesignStore {
  file: DesignFile | null;
  history: DesignFile[];
  selectedFrameId: string | null;
  selectedFrameIds: string[];              // multi-frame selection (shift-click)
  selectedComponentId: string | null;     // primary (last clicked) — kept for single-select consumers
  selectedComponentIds: string[];          // full multi-selection
  newFile: (name: string) => void;
  renameFile: (name: string) => void;
  loadFile: (file: Omit<DesignFile, 'id'> & { id?: string }) => void;
  pushHistory: () => void;
  undo: () => void;
  addFrame: (x: number, y: number, width: number, height: number) => string;
  addChildFrame: (parentFrameId: string, x: number, y: number, width: number, height: number) => string;
  updateFrame: (id: string, patch: Partial<Frame>) => void;
  loadFrame: (id: string, frame: Frame) => void;
  deleteFrame: (id: string) => void;
  selectFrame: (id: string | null) => void;
  toggleFrameSelection: (id: string) => void;
  batchUpdateFramePositions: (updates: Array<{ id: string; x?: number; y?: number }>) => void;
  addComponent: (frameId: string, instance: Omit<ComponentInstance, 'id'>) => string;
  updateComponent: (frameId: string, componentId: string, patch: Partial<ComponentInstance>) => void;
  deleteComponent: (frameId: string, componentId: string) => void;
  deleteSelectedComponents: () => void;
  selectComponent: (id: string | null, addToSelection?: boolean) => void;
  reorderFrame: (fromId: string, beforeId: string | null) => void;
  reorderComponent: (frameId: string, fromIndex: number, toIndex: number) => void;
  reorderFlowItem: (frameId: string, itemId: string, toIndex: number) => void;
  addComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'read' | 'replies'>) => void;
  resolveComment: (id: string) => void;
  markCommentRead: (id: string) => void;
  addReply: (commentId: string, reply: Omit<CommentReply, 'id' | 'timestamp'>) => void;
  addTextLayer: (frameId: string, partial: { x: number; y: number; fontSize?: TailwindFontSize; fontWeight?: TailwindFontWeight; content?: string; label?: string }) => string;
  updateTextLayer: (frameId: string, layerId: string, patch: Partial<TextLayer>) => void;
  deleteTextLayer: (frameId: string, layerId: string) => void;
  batchUpdatePositions: (frameId: string, updates: Array<{ id: string; x?: number; y?: number }>) => void;
  groupSelectedItems: () => void;
  addSlottedComponent: (frameId: string, parentId: string, slotName: string, data: Omit<ComponentInstance, 'id'>) => string;
  removeSlottedComponent: (frameId: string, parentId: string, slotName: string, childId: string) => void;
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  file: null,
  history: [],
  selectedFrameId: null,
  selectedFrameIds: [],
  selectedComponentId: null,
  selectedComponentIds: [],

  newFile: (name) =>
    set({
      file: {
        version: 1,
        id: crypto.randomUUID(),
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        frames: [],
        comments: [],
      },
      history: [],
      selectedFrameId: null,
      selectedFrameIds: [],
      selectedComponentId: null,
      selectedComponentIds: [],
    }),

  renameFile: (name) =>
    set((state) => state.file ? { file: { ...state.file, name, updatedAt: Date.now() } } : state),

  loadFile: (file) =>
    set({
      file: { ...file, id: file.id ?? crypto.randomUUID() } as DesignFile,
      history: [],
      selectedFrameId: null,
      selectedFrameIds: [],
      selectedComponentId: null,
      selectedComponentIds: [],
    }),

  pushHistory: () =>
    set((state) => {
      if (!state.file) return state;
      const last = state.history[state.history.length - 1];
      if (last?.updatedAt === state.file.updatedAt) return state;
      return { history: [...state.history, state.file].slice(-MAX_HISTORY) };
    }),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const history = state.history.slice(0, -1);
      const previous = state.history[state.history.length - 1];
      return { file: previous, history, selectedComponentId: null, selectedComponentIds: [] };
    }),

  addFrame: (x, y, width, height) => {
    const id = uid();
    set((state) => {
      if (!state.file) return state;
      const count = state.file.frames.length + 1;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: [
            ...state.file.frames,
            {
              id,
              label: `Frame ${count}`,
              x,
              y,
              width,
              height,
              backgroundColor: '#ffffff',
              components: [],
            },
          ],
        },
        selectedFrameId: id,
        selectedComponentId: null,
      };
    });
    return id;
  },

  addChildFrame: (parentFrameId, x, y, width, height) => {
    const id = uid();
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, parentFrameId, (f) => {
            const count = (f.frames ?? []).length + 1;
            const newChild: Frame = {
              id,
              label: `Frame ${count}`,
              x,
              y,
              width,
              height,
              backgroundColor: 'transparent',
              components: [],
              visible: true,
            };
            const newFlowOrder = f.autoLayout
              ? [...(f.flowOrder ?? buildDefaultFlowOrder(f)), id]
              : f.flowOrder ? [...f.flowOrder, id] : undefined;
            return {
              ...f,
              frames: [...(f.frames ?? []), newChild],
              ...(newFlowOrder !== undefined ? { flowOrder: newFlowOrder } : {}),
            };
          }),
        },
        selectedComponentId: id,
        selectedComponentIds: [id],
      };
    });
    return id;
  },

  updateFrame: (id, patch) =>
    set((state) => {
      if (!state.file) return state;
      return {
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, id, (f) => ({ ...f, ...patch })),
        },
      };
    }),

  // Replaces a frame without touching updatedAt — used for external file-watcher
  // updates so the write doesn't trigger another auto-save cycle.
  loadFrame: (id, frame) =>
    set((state) => {
      if (!state.file) return state;
      return {
        file: {
          ...state.file,
          frames: mapFrames(state.file.frames, id, () => frame),
        },
      };
    }),

  deleteFrame: (id) =>
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: removeFrame(state.file.frames, id),
        },
        selectedFrameId: state.selectedFrameId === id ? null : state.selectedFrameId,
        selectedFrameIds: state.selectedFrameIds.filter((fid) => fid !== id),
        selectedComponentId: null,
      };
    }),

  selectFrame: (id) => set({ selectedFrameId: id, selectedFrameIds: [], selectedComponentId: null, selectedComponentIds: [] }),

  toggleFrameSelection: (id) =>
    set((state) => {
      const current = state.selectedFrameIds.length > 0
        ? state.selectedFrameIds
        : state.selectedFrameId ? [state.selectedFrameId] : [];
      const already = current.includes(id);
      const next = already ? current.filter((f) => f !== id) : [...current, id];
      return {
        selectedFrameIds: next,
        selectedFrameId: next[next.length - 1] ?? null,
        selectedComponentId: null,
        selectedComponentIds: [],
      };
    }),

  batchUpdateFramePositions: (updates) =>
    set((state) => {
      if (!state.file) return state;
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: state.file.frames.map((f) => {
            const u = updateMap.get(f.id);
            if (!u) return f;
            return {
              ...f,
              ...(u.x !== undefined ? { x: u.x } : {}),
              ...(u.y !== undefined ? { y: u.y } : {}),
            };
          }),
        },
      };
    }),

  addComponent: (frameId, instance) => {
    const id = uid();
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => {
            const newFlowOrder = f.autoLayout
              ? [...(f.flowOrder ?? buildDefaultFlowOrder(f)), id]
              : f.flowOrder ? [...f.flowOrder, id] : undefined;
            return {
              ...f,
              components: [...f.components, { ...instance, id }],
              ...(newFlowOrder !== undefined ? { flowOrder: newFlowOrder } : {}),
            };
          }),
        },
        selectedComponentId: id,
      };
    });
    return id;
  },

  updateComponent: (frameId, componentId, patch) =>
    set((state) => {
      if (!state.file) return state;
      return {
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => ({
            ...f,
            components: f.components.map((c) =>
              mapComponent(c, componentId, (comp) => ({ ...comp, ...patch }))
            ),
          })),
        },
      };
    }),

  deleteComponent: (frameId, componentId) =>
    set((state) => {
      if (!state.file) return state;
      const newIds = state.selectedComponentIds.filter((i) => i !== componentId);
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => ({
            ...f,
            components: f.components.filter((c) => c.id !== componentId),
            ...(f.flowOrder ? { flowOrder: f.flowOrder.filter((id) => id !== componentId) } : {}),
          })),
        },
        selectedComponentId: newIds[newIds.length - 1] ?? null,
        selectedComponentIds: newIds,
      };
    }),

  deleteSelectedComponents: () =>
    set((state) => {
      if (!state.file || state.selectedComponentIds.length === 0) return state;
      const ids = new Set(state.selectedComponentIds);

      function deleteFromFrame(f: Frame): Frame {
        return {
          ...f,
          components: f.components.filter((c) => !ids.has(c.id)),
          textLayers: (f.textLayers ?? []).filter((t) => !ids.has(t.id)),
          frames: (f.frames ?? []).filter((cf) => !ids.has(cf.id)).map(deleteFromFrame),
          ...(f.flowOrder ? { flowOrder: f.flowOrder.filter((id) => !ids.has(id)) } : {}),
        };
      }

      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: state.file.frames.map(deleteFromFrame),
        },
        selectedComponentId: null,
        selectedComponentIds: [],
      };
    }),

  selectComponent: (id, addToSelection = false) =>
    set((state) => {
      if (id === null) {
        return { selectedComponentId: null, selectedComponentIds: [] };
      }
      // Find the TOP-LEVEL frame that contains this item anywhere in the nested tree
      const topFrame = state.file?.frames.find((f) => frameContainsItem(f, id));
      // Shift-select only works within the same frame
      const sameFrame = topFrame?.id === state.selectedFrameId;
      if (addToSelection && sameFrame && state.selectedComponentIds.length > 0) {
        const already = state.selectedComponentIds.includes(id);
        const newIds = already
          ? state.selectedComponentIds.filter((i) => i !== id)
          : [...state.selectedComponentIds, id];
        return {
          selectedComponentId: newIds[newIds.length - 1] ?? null,
          selectedComponentIds: newIds,
          selectedFrameId: topFrame?.id ?? state.selectedFrameId,
        };
      }
      return {
        selectedComponentId: id,
        selectedComponentIds: [id],
        selectedFrameId: topFrame?.id ?? state.selectedFrameId,
      };
    }),

  reorderFrame: (fromId, beforeId) =>
    set((state) => {
      if (!state.file) return state;
      const frames = [...state.file.frames];
      const fromIdx = frames.findIndex((f) => f.id === fromId);
      if (fromIdx === -1) return state;
      const [moved] = frames.splice(fromIdx, 1);
      const beforeIdx = beforeId ? frames.findIndex((f) => f.id === beforeId) : frames.length;
      frames.splice(beforeIdx === -1 ? frames.length : beforeIdx, 0, moved);
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: { ...state.file, updatedAt: Date.now(), frames },
      };
    }),

  reorderComponent: (frameId, fromIndex, toIndex) =>
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => {
            const components = [...f.components];
            const [moved] = components.splice(fromIndex, 1);
            components.splice(toIndex, 0, moved);
            return { ...f, components };
          }),
        },
      };
    }),

  addComment: (comment) =>
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          comments: [
            ...state.file.comments,
            { ...comment, id: uid(), timestamp: Date.now(), read: false, replies: [] },
          ],
        },
      };
    }),

  resolveComment: (id) =>
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          comments: state.file.comments.map((c) =>
            c.id === id ? { ...c, resolved: true, read: true } : c
          ),
        },
      };
    }),

  markCommentRead: (id) =>
    set((state) => {
      if (!state.file) return state;
      return {
        file: {
          ...state.file,
          comments: state.file.comments.map((c) =>
            c.id === id ? { ...c, read: true } : c
          ),
        },
      };
    }),

  addReply: (commentId, reply) =>
    set((state) => {
      if (!state.file) return state;
      return {
        file: {
          ...state.file,
          updatedAt: Date.now(),
          comments: state.file.comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  replies: [
                    ...c.replies,
                    { ...reply, id: uid(), timestamp: Date.now() },
                  ],
                }
              : c
          ),
        },
      };
    }),

  addTextLayer: (frameId, partial) => {
    const id = uid();
    set((state) => {
      if (!state.file) return state;
      const fontSize = partial.fontSize ?? 'base';
      const sizeEntry = TAILWIND_FONT_SIZES.find((s) => s.key === fontSize);
      const newLayer: TextLayer = {
        id,
        type: 'text',
        label: partial.label ?? partial.content?.slice(0, 24) ?? 'Text',
        content: partial.content ?? 'Text',
        x: partial.x,
        y: partial.y,
        width: 200,
        height: sizeEntry?.lineHeight ?? 24,
        fontSize,
        fontWeight: partial.fontWeight ?? 'normal',
        color: '#111827',
        visible: true,
        locked: false,
        widthMode: 'hug',
        heightMode: 'hug',
      };
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => {
            const newFlowOrder = f.autoLayout
              ? [...(f.flowOrder ?? buildDefaultFlowOrder(f)), id]
              : f.flowOrder ? [...f.flowOrder, id] : undefined;
            return {
              ...f,
              textLayers: [...(f.textLayers ?? []), newLayer],
              ...(newFlowOrder !== undefined ? { flowOrder: newFlowOrder } : {}),
            };
          }),
        },
        selectedComponentId: id,
        selectedComponentIds: [id],
        selectedFrameId: frameId,
      };
    });
    return id;
  },

  updateTextLayer: (frameId, layerId, patch) =>
    set((state) => {
      if (!state.file) return state;
      return {
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => ({
            ...f,
            textLayers: (f.textLayers ?? []).map((t) =>
              t.id === layerId ? { ...t, ...patch } : t
            ),
          })),
        },
      };
    }),

  deleteTextLayer: (frameId, layerId) =>
    set((state) => {
      if (!state.file) return state;
      const newIds = state.selectedComponentIds.filter((i) => i !== layerId);
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => ({
            ...f,
            textLayers: (f.textLayers ?? []).filter((t) => t.id !== layerId),
            ...(f.flowOrder ? { flowOrder: f.flowOrder.filter((id) => id !== layerId) } : {}),
          })),
        },
        selectedComponentId: newIds[newIds.length - 1] ?? null,
        selectedComponentIds: newIds,
      };
    }),

  reorderFlowItem: (frameId, itemId, toIndex) =>
    set((state) => {
      if (!state.file) return state;
      const frame = findFrame(state.file.frames, frameId);
      if (!frame) return state;
      const current = frame.flowOrder ?? buildDefaultFlowOrder(frame);
      const from = current.indexOf(itemId);
      if (from === -1) return state;
      const next = [...current];
      next.splice(from, 1);
      next.splice(toIndex, 0, itemId);
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => ({ ...f, flowOrder: next })),
        },
      };
    }),

  batchUpdatePositions: (frameId, updates) =>
    set((state) => {
      if (!state.file) return state;
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => ({
            ...f,
            components: f.components.map((c) => {
              const u = updateMap.get(c.id);
              return u ? { ...c, ...(u.x !== undefined ? { x: u.x } : {}), ...(u.y !== undefined ? { y: u.y } : {}) } : c;
            }),
            textLayers: (f.textLayers ?? []).map((t) => {
              const u = updateMap.get(t.id);
              return u ? { ...t, ...(u.x !== undefined ? { x: u.x } : {}), ...(u.y !== undefined ? { y: u.y } : {}) } : t;
            }),
          })),
        },
      };
    }),

  groupSelectedItems: () =>
    set((state) => {
      const { file, selectedComponentIds } = state;
      if (!file || selectedComponentIds.length < 2) return state;

      const selSet = new Set(selectedComponentIds);

      // Find the immediate parent frame whose direct children include ALL selected ids
      function findDirectParent(frames: Frame[]): Frame | undefined {
        for (const f of frames) {
          const directIds = new Set([
            ...f.components.map((c) => c.id),
            ...(f.textLayers ?? []).map((t) => t.id),
            ...(f.frames ?? []).map((cf) => cf.id),
          ]);
          if ([...selSet].every((id) => directIds.has(id))) return f;
          const found = findDirectParent(f.frames ?? []);
          if (found) return found;
        }
      }

      const parent = findDirectParent(file.frames);
      if (!parent) return state;

      const selComponents = parent.components.filter((c) => selSet.has(c.id));
      const selTextLayers = (parent.textLayers ?? []).filter((t) => selSet.has(t.id));
      const selChildFrames = (parent.frames ?? []).filter((f) => selSet.has(f.id));

      // When the parent has auto-layout, use computed positions (stored x/y are stale).
      const computed = parent.autoLayout ? computeAutoLayout(parent).components : null;
      const pos = (id: string, fallbackX: number, fallbackY: number, w: number, h: number) => {
        const geo = computed?.[id];
        return geo
          ? { x: geo.x, y: geo.y, r: geo.x + geo.width, b: geo.y + geo.height }
          : { x: fallbackX, y: fallbackY, r: fallbackX + w, b: fallbackY + h };
      };

      // Bounding box over actual visual positions
      const items = [
        ...selComponents.map((c) => pos(c.id, c.x, c.y, c.width, c.height)),
        ...selTextLayers.map((t) => pos(t.id, t.x, t.y, t.width ?? 100, t.height ?? 20)),
        ...selChildFrames.map((f) => pos(f.id, f.x, f.y, f.width, f.height)),
      ];
      const minX = Math.min(...items.map((i) => i.x));
      const minY = Math.min(...items.map((i) => i.y));
      const maxR = Math.max(...items.map((i) => i.r));
      const maxB = Math.max(...items.map((i) => i.b));

      const childFrameId = uid();
      const actualPos = (id: string, fallbackX: number, fallbackY: number) => {
        const geo = computed?.[id];
        return geo ? { x: geo.x, y: geo.y } : { x: fallbackX, y: fallbackY };
      };

      const childFrame: Frame = {
        id: childFrameId,
        label: 'Group',
        x: minX,
        y: minY,
        width: maxR - minX,
        height: maxB - minY,
        backgroundColor: 'transparent',
        components: selComponents.map((c) => {
          const { x, y } = actualPos(c.id, c.x, c.y);
          return { ...c, x: x - minX, y: y - minY };
        }),
        textLayers: selTextLayers.map((t) => {
          const { x, y } = actualPos(t.id, t.x, t.y);
          return { ...t, x: x - minX, y: y - minY };
        }),
        frames: selChildFrames.map((f) => {
          const { x, y } = actualPos(f.id, f.x, f.y);
          return { ...f, x: x - minX, y: y - minY };
        }),
        flowOrder: [
          ...selComponents.map((c) => c.id),
          ...selTextLayers.map((t) => t.id),
          ...selChildFrames.map((f) => f.id),
        ],
      };

      const updatedFrames = mapFrames(file.frames, parent.id, (p) => {
        const newComponents = p.components.filter((c) => !selSet.has(c.id));
        const newTextLayers = (p.textLayers ?? []).filter((t) => !selSet.has(t.id));
        const newChildFrames = (p.frames ?? []).filter((f) => !selSet.has(f.id));

        let newFlowOrder: string[] | undefined;
        if (p.flowOrder) {
          const firstIdx = p.flowOrder.findIndex((id) => selSet.has(id));
          const filtered = p.flowOrder.filter((id) => !selSet.has(id));
          filtered.splice(firstIdx >= 0 ? firstIdx : filtered.length, 0, childFrameId);
          newFlowOrder = filtered;
        }

        return {
          ...p,
          components: newComponents,
          textLayers: newTextLayers,
          frames: [...newChildFrames, childFrame],
          ...(newFlowOrder !== undefined ? { flowOrder: newFlowOrder } : {}),
        };
      });

      return {
        history: [...state.history, file].slice(-MAX_HISTORY),
        file: { ...file, frames: updatedFrames, updatedAt: Date.now() },
        selectedComponentId: childFrameId,
        selectedComponentIds: [childFrameId],
      };
    }),

  addSlottedComponent: (frameId, parentId, slotName, data) => {
    const id = uid();
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => ({
            ...f,
            components: f.components.map((c) =>
              mapComponent(c, parentId, (parent) => ({
                ...parent,
                slots: {
                  ...parent.slots,
                  [slotName]: [...(parent.slots?.[slotName] ?? []), { ...data, id }],
                },
              }))
            ),
          })),
        },
        selectedComponentId: id,
        selectedComponentIds: [id],
      };
    });
    return id;
  },

  removeSlottedComponent: (frameId, parentId, slotName, childId) =>
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: mapFrames(state.file.frames, frameId, (f) => ({
            ...f,
            components: f.components.map((c) =>
              mapComponent(c, parentId, (parent) => {
                const remaining = (parent.slots?.[slotName] ?? []).filter((ch) => ch.id !== childId);
                const newSlots = { ...parent.slots };
                if (remaining.length === 0) {
                  delete newSlots[slotName];
                } else {
                  newSlots[slotName] = remaining;
                }
                return { ...parent, slots: Object.keys(newSlots).length > 0 ? newSlots : undefined };
              })
            ),
          })),
        },
        selectedComponentId: state.selectedComponentId === childId ? null : state.selectedComponentId,
        selectedComponentIds: state.selectedComponentIds.filter((i) => i !== childId),
      };
    }),

  // Expose a convenience getter for the selected frame
  get selectedFrame() {
    const { file, selectedFrameId } = get();
    return file?.frames.find((f) => f.id === selectedFrameId) ?? null;
  },

  get selectedComponent() {
    const { file, selectedComponentId } = get();
    for (const frame of file?.frames ?? []) {
      const comp = frame.components.find((c) => c.id === selectedComponentId);
      if (comp) return { frame, component: comp };
    }
    return null;
  },
}));

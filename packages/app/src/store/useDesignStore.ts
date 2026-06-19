import { create } from 'zustand';
import type { Comment, CommentReply, ComponentInstance, DesignFile, Frame, TextLayer } from '../types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const MAX_HISTORY = 50;

interface DesignStore {
  file: DesignFile | null;
  history: DesignFile[];
  selectedFrameId: string | null;
  selectedComponentId: string | null;     // primary (last clicked) — kept for single-select consumers
  selectedComponentIds: string[];          // full multi-selection
  newFile: (name: string) => void;
  loadFile: (file: Omit<DesignFile, 'id'> & { id?: string }) => void;
  undo: () => void;
  addFrame: (x: number, y: number, width: number, height: number) => string;
  updateFrame: (id: string, patch: Partial<Frame>) => void;
  deleteFrame: (id: string) => void;
  selectFrame: (id: string | null) => void;
  addComponent: (frameId: string, instance: Omit<ComponentInstance, 'id'>) => string;
  updateComponent: (frameId: string, componentId: string, patch: Partial<ComponentInstance>) => void;
  deleteComponent: (frameId: string, componentId: string) => void;
  deleteSelectedComponents: () => void;
  selectComponent: (id: string | null, addToSelection?: boolean) => void;
  reorderComponent: (frameId: string, fromIndex: number, toIndex: number) => void;
  addComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'replies'>) => void;
  resolveComment: (id: string) => void;
  addReply: (commentId: string, reply: Omit<CommentReply, 'id' | 'timestamp'>) => void;
  addTextLayer: (frameId: string, partial: Pick<TextLayer, 'x' | 'y'>) => string;
  updateTextLayer: (frameId: string, layerId: string, patch: Partial<TextLayer>) => void;
  deleteTextLayer: (frameId: string, layerId: string) => void;
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  file: null,
  history: [],
  selectedFrameId: null,
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
      selectedComponentId: null,
      selectedComponentIds: [],
    }),

  loadFile: (file) =>
    set({
      file: { ...file, id: file.id ?? crypto.randomUUID() } as DesignFile,
      history: [],
      selectedFrameId: null,
      selectedComponentId: null,
      selectedComponentIds: [],
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

  updateFrame: (id, patch) =>
    set((state) => {
      if (!state.file) return state;
      return {
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: state.file.frames.map((f) => (f.id === id ? { ...f, ...patch } : f)),
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
          frames: state.file.frames.filter((f) => f.id !== id),
        },
        selectedFrameId: state.selectedFrameId === id ? null : state.selectedFrameId,
        selectedComponentId: null,
      };
    }),

  selectFrame: (id) => set({ selectedFrameId: id, selectedComponentId: null, selectedComponentIds: [] }),

  addComponent: (frameId, instance) => {
    const id = uid();
    set((state) => {
      if (!state.file) return state;
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: state.file.frames.map((f) =>
            f.id === frameId
              ? { ...f, components: [...f.components, { ...instance, id }] }
              : f
          ),
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
          frames: state.file.frames.map((f) =>
            f.id === frameId
              ? {
                  ...f,
                  components: f.components.map((c) =>
                    c.id === componentId ? { ...c, ...patch } : c
                  ),
                }
              : f
          ),
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
          frames: state.file.frames.map((f) =>
            f.id === frameId
              ? { ...f, components: f.components.filter((c) => c.id !== componentId) }
              : f
          ),
        },
        selectedComponentId: newIds[newIds.length - 1] ?? null,
        selectedComponentIds: newIds,
      };
    }),

  deleteSelectedComponents: () =>
    set((state) => {
      if (!state.file || state.selectedComponentIds.length === 0) return state;
      const ids = new Set(state.selectedComponentIds);
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: state.file.frames.map((f) => ({
            ...f,
            components: f.components.filter((c) => !ids.has(c.id)),
            textLayers: (f.textLayers ?? []).filter((t) => !ids.has(t.id)),
          })),
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
      const frame = state.file?.frames.find(
        (f) =>
          f.components.some((c) => c.id === id) ||
          (f.textLayers ?? []).some((t) => t.id === id)
      );
      // Shift-select only works within the same frame
      const sameFrame = frame?.id === state.selectedFrameId;
      if (addToSelection && sameFrame && state.selectedComponentIds.length > 0) {
        const already = state.selectedComponentIds.includes(id);
        const newIds = already
          ? state.selectedComponentIds.filter((i) => i !== id)
          : [...state.selectedComponentIds, id];
        return {
          selectedComponentId: newIds[newIds.length - 1] ?? null,
          selectedComponentIds: newIds,
          selectedFrameId: frame?.id ?? state.selectedFrameId,
        };
      }
      return {
        selectedComponentId: id,
        selectedComponentIds: [id],
        selectedFrameId: frame?.id ?? state.selectedFrameId,
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
          frames: state.file.frames.map((f) => {
            if (f.id !== frameId) return f;
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
            { ...comment, id: uid(), timestamp: Date.now(), replies: [] },
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
            c.id === id ? { ...c, resolved: true } : c
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
      const newLayer: TextLayer = {
        id,
        type: 'text',
        label: 'Text',
        content: 'Text',
        x: partial.x,
        y: partial.y,
        fontSize: 'base',
        fontWeight: 'normal',
        color: '#111827',
        visible: true,
        locked: false,
      };
      return {
        history: [...state.history, state.file].slice(-MAX_HISTORY),
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: state.file.frames.map((f) =>
            f.id === frameId
              ? { ...f, textLayers: [...(f.textLayers ?? []), newLayer] }
              : f
          ),
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
          frames: state.file.frames.map((f) =>
            f.id === frameId
              ? {
                  ...f,
                  textLayers: (f.textLayers ?? []).map((t) =>
                    t.id === layerId ? { ...t, ...patch } : t
                  ),
                }
              : f
          ),
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
          frames: state.file.frames.map((f) =>
            f.id === frameId
              ? { ...f, textLayers: (f.textLayers ?? []).filter((t) => t.id !== layerId) }
              : f
          ),
        },
        selectedComponentId: newIds[newIds.length - 1] ?? null,
        selectedComponentIds: newIds,
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

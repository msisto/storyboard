import { create } from 'zustand';
import type { Comment, CommentReply, ComponentInstance, DesignFile, Frame } from '../types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface DesignStore {
  file: DesignFile | null;
  selectedFrameId: string | null;
  selectedComponentId: string | null;
  newFile: (name: string) => void;
  loadFile: (file: DesignFile) => void;
  addFrame: (x: number, y: number, width: number, height: number) => string;
  updateFrame: (id: string, patch: Partial<Frame>) => void;
  deleteFrame: (id: string) => void;
  selectFrame: (id: string | null) => void;
  addComponent: (frameId: string, instance: Omit<ComponentInstance, 'id'>) => string;
  updateComponent: (frameId: string, componentId: string, patch: Partial<ComponentInstance>) => void;
  deleteComponent: (frameId: string, componentId: string) => void;
  selectComponent: (id: string | null) => void;
  reorderComponent: (frameId: string, fromIndex: number, toIndex: number) => void;
  addComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'replies'>) => void;
  resolveComment: (id: string) => void;
  addReply: (commentId: string, reply: Omit<CommentReply, 'id' | 'timestamp'>) => void;
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  file: null,
  selectedFrameId: null,
  selectedComponentId: null,

  newFile: (name) =>
    set({
      file: {
        version: 1,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        frames: [],
        comments: [],
      },
      selectedFrameId: null,
      selectedComponentId: null,
    }),

  loadFile: (file) =>
    set({ file, selectedFrameId: null, selectedComponentId: null }),

  addFrame: (x, y, width, height) => {
    const id = uid();
    set((state) => {
      if (!state.file) return state;
      const count = state.file.frames.length + 1;
      return {
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
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: state.file.frames.filter((f) => f.id !== id),
        },
        selectedFrameId: state.selectedFrameId === id ? null : state.selectedFrameId,
        selectedComponentId: null,
      };
    }),

  selectFrame: (id) => set({ selectedFrameId: id, selectedComponentId: null }),

  addComponent: (frameId, instance) => {
    const id = uid();
    set((state) => {
      if (!state.file) return state;
      return {
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
      return {
        file: {
          ...state.file,
          updatedAt: Date.now(),
          frames: state.file.frames.map((f) =>
            f.id === frameId
              ? { ...f, components: f.components.filter((c) => c.id !== componentId) }
              : f
          ),
        },
        selectedComponentId:
          state.selectedComponentId === componentId ? null : state.selectedComponentId,
      };
    }),

  selectComponent: (id) =>
    set((state) => {
      if (id === null) return { selectedComponentId: null };
      const frame = state.file?.frames.find((f) =>
        f.components.some((c) => c.id === id)
      );
      return {
        selectedComponentId: id,
        selectedFrameId: frame?.id ?? state.selectedFrameId,
      };
    }),

  reorderComponent: (frameId, fromIndex, toIndex) =>
    set((state) => {
      if (!state.file) return state;
      return {
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

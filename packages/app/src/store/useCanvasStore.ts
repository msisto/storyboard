import { create } from 'zustand';
import type { CanvasViewport, Tool } from '../types';

interface CanvasStore {
  viewport: CanvasViewport;
  activeTool: Tool;
  interactingComponentId: string | null;
  editingTextLayerId: string | null;
  setTool: (tool: Tool) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (delta: number, originX: number, originY: number) => void;
  zoomTo: (level: number) => void;
  resetViewport: () => void;
  setViewportXY: (x: number, y: number) => void;
  enterInteractMode: (componentId: string) => void;
  exitInteractMode: () => void;
  enterTextEditMode: (id: string) => void;
  exitTextEditMode: () => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4.0;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  activeTool: 'select',
  interactingComponentId: null,
  editingTextLayerId: null,

  setTool: (tool) => set({ activeTool: tool, interactingComponentId: null, editingTextLayerId: null }),

  pan: (dx, dy) =>
    set((state) => ({
      viewport: { ...state.viewport, x: state.viewport.x + dx, y: state.viewport.y + dy },
    })),

  zoom: (delta, originX, originY) =>
    set((state) => {
      const oldZoom = state.viewport.zoom;
      const factor = delta > 0 ? 1.1 : 0.9;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
      // Keep the point under the cursor fixed in world space
      const newX = originX - (originX - state.viewport.x) * (newZoom / oldZoom);
      const newY = originY - (originY - state.viewport.y) * (newZoom / oldZoom);
      return { viewport: { x: newX, y: newY, zoom: newZoom } };
    }),

  zoomTo: (level) =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level)) },
    })),

  resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  setViewportXY: (x, y) => set((s) => ({ viewport: { ...s.viewport, x, y } })),

  enterInteractMode: (componentId) => {
    const { activeTool } = get();
    if (activeTool === 'select') set({ interactingComponentId: componentId });
  },

  exitInteractMode: () => set({ interactingComponentId: null }),

  enterTextEditMode: (id) => set({ editingTextLayerId: id }),
  exitTextEditMode: () => set({ editingTextLayerId: null }),
}));

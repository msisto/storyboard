import { create } from 'zustand';
import type { CanvasViewport, Tool } from '../types';

interface CanvasStore {
  viewport: CanvasViewport;
  activeTool: Tool;
  interactingComponentId: string | null;
  editingTextLayerId: string | null;
  globalInteractMode: boolean;
  themePreview: 'dark' | 'light' | null;
  setThemePreview: (mode: 'dark' | 'light' | null) => void;
  setTool: (tool: Tool) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (delta: number, originX: number, originY: number) => void;
  zoomTo: (level: number) => void;
  fitViewport: (x: number, y: number, zoom: number) => void;
  resetViewport: () => void;
  setViewportXY: (x: number, y: number) => void;
  enterInteractMode: (componentId: string) => void;
  exitInteractMode: () => void;
  toggleGlobalInteractMode: () => void;
  exitGlobalInteractMode: () => void;
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
  globalInteractMode: false,
  themePreview: null,
  setThemePreview: (mode) => set({ themePreview: mode }),

  setTool: (tool) => set({ activeTool: tool, interactingComponentId: null, editingTextLayerId: null, globalInteractMode: false }),

  pan: (dx, dy) =>
    set((state) => ({
      viewport: { ...state.viewport, x: state.viewport.x + dx, y: state.viewport.y + dy },
    })),

  zoom: (delta, originX, originY) =>
    set((state) => {
      const oldZoom = state.viewport.zoom;
      // Scale proportionally to gesture magnitude so a light touch gives a
      // small change and a fast pinch gives a larger one. Cap the exponent to
      // ±0.12 so a single event can never change zoom by more than ~13%.
      const factor = Math.exp(Math.max(-0.12, Math.min(0.12, delta * 0.003)));
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

  fitViewport: (x, y, zoom) =>
    set({ viewport: { x, y, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) } }),

  resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  setViewportXY: (x, y) => set((s) => ({ viewport: { ...s.viewport, x, y } })),

  enterInteractMode: (componentId) => {
    const { activeTool } = get();
    if (activeTool === 'select') set({ interactingComponentId: componentId });
  },

  exitInteractMode: () => set({ interactingComponentId: null }),

  toggleGlobalInteractMode: () => set((s) => ({ globalInteractMode: !s.globalInteractMode, interactingComponentId: null })),
  exitGlobalInteractMode: () => set({ globalInteractMode: false }),

  enterTextEditMode: (id) => set({ editingTextLayerId: id }),
  exitTextEditMode: () => set({ editingTextLayerId: null }),
}));

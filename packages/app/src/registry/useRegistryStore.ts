import { create } from 'zustand';
import type { ArgDefinition, StorybookStory } from '../types';
import { fetchStorybookIndex, fetchStorybookArgTypes } from './loader';
import { parseArgTypes } from './argTypes';

interface RegistryStore {
  stories: StorybookStory[];
  argDefinitions: Record<string, ArgDefinition[]>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  loadRegistry: () => Promise<void>;
  updateArgDefinitions: (storyId: string, defs: ArgDefinition[]) => void;
  getStory: (id: string) => StorybookStory | undefined;
  getArgDefs: (storyId: string) => ArgDefinition[];
}

export const useRegistryStore = create<RegistryStore>((set, get) => ({
  stories: [],
  argDefinitions: {},
  status: 'idle',
  error: null,

  loadRegistry: async () => {
    set({ status: 'loading', error: null });
    try {
      const [stories, rawArgTypes] = await Promise.all([
        fetchStorybookIndex(),
        fetchStorybookArgTypes(),
      ]);

      const fetched: Record<string, ArgDefinition[]> = {};
      for (const [storyId, rawTypes] of Object.entries(rawArgTypes)) {
        fetched[storyId] = parseArgTypes(rawTypes);
      }

      // Merge: iframe-populated entries (from ArgsReporter) take priority over
      // static index.json data. Only replace an existing entry if the fetch has
      // more definitions for that story (static JSON rarely has full arg lists).
      set((state) => {
        const merged = { ...state.argDefinitions };
        for (const [id, defs] of Object.entries(fetched)) {
          const existing = merged[id];
          if (!existing || defs.length >= existing.length) merged[id] = defs;
        }
        return { stories, argDefinitions: merged, status: 'ready' };
      });
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load Storybook',
      });
    }
  },

  updateArgDefinitions: (storyId, defs) =>
    set((state) => ({
      argDefinitions: { ...state.argDefinitions, [storyId]: defs },
    })),

  getStory: (id) => get().stories.find((s) => s.id === id),

  getArgDefs: (storyId) => get().argDefinitions[storyId] ?? [],
}));

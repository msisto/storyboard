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

      const argDefinitions: Record<string, ArgDefinition[]> = {};
      for (const [storyId, rawTypes] of Object.entries(rawArgTypes)) {
        argDefinitions[storyId] = parseArgTypes(rawTypes);
      }

      set({ stories, argDefinitions, status: 'ready' });
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load Storybook',
      });
    }
  },

  getStory: (id) => get().stories.find((s) => s.id === id),

  getArgDefs: (storyId) => get().argDefinitions[storyId] ?? [],
}));

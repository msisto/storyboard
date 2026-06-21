import { create } from 'zustand';
import type { ArgDefinition, StorybookStory } from '../types';
import { getAllStoryEntries } from './storyRegistry';

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

function buildInitialState() {
  const entries = getAllStoryEntries();
  const stories: StorybookStory[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    name: e.name,
    componentName: e.componentName,
    importPath: e.importPath,
  }));
  const argDefinitions: Record<string, ArgDefinition[]> = {};
  for (const e of entries) {
    argDefinitions[e.id] = e.argDefs;
  }
  return { stories, argDefinitions };
}

const initial = buildInitialState();

export const useRegistryStore = create<RegistryStore>((set, get) => ({
  ...initial,
  status: 'ready',
  error: null,

  loadRegistry: async () => {
    // No-op: registry is populated statically at module load time
  },

  updateArgDefinitions: (storyId, defs) =>
    set((state) => ({
      argDefinitions: { ...state.argDefinitions, [storyId]: defs },
    })),

  getStory: (id) => get().stories.find((s) => s.id === id),

  getArgDefs: (storyId) => get().argDefinitions[storyId] ?? [],
}));

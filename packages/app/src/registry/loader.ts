import type { StorybookIndex, StorybookStory } from '../types';

const STORYBOOK_URL = 'http://localhost:6006';

export async function fetchStorybookIndex(): Promise<StorybookStory[]> {
  const res = await fetch(`${STORYBOOK_URL}/index.json`);
  if (!res.ok) throw new Error(`Storybook not reachable at localhost:6006 (${res.status})`);
  const index: StorybookIndex = await res.json();
  return Object.values(index.entries).filter(
    (entry) => !entry.type || entry.type === 'story'
  );
}

export interface RawArgType {
  control?: string | { type: string };
  options?: string[];
  description?: string;
  defaultValue?: unknown;
}

export async function fetchStorybookArgTypes(): Promise<
  Record<string, Record<string, RawArgType>>
> {
  try {
    const res = await fetch(`${STORYBOOK_URL}/stories.json`);
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, Record<string, RawArgType>> = {};
    for (const [id, story] of Object.entries<Record<string, unknown>>(data.stories ?? data.entries ?? {})) {
      const argTypes = (story as { parameters?: { argTypes?: Record<string, RawArgType> } })?.parameters?.argTypes;
      if (argTypes) result[id] = argTypes;
    }
    return result;
  } catch {
    return {};
  }
}

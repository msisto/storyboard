import type { StorybookIndex, StorybookStory } from '../types';

const STORYBOOK_URL = import.meta.env.VITE_STORYBOOK_URL ?? 'http://localhost:6006';

export async function fetchStorybookIndex(): Promise<StorybookStory[]> {
  const res = await fetch(`${STORYBOOK_URL}/index.json`);
  if (!res.ok) throw new Error(`Storybook not reachable at ${STORYBOOK_URL} (${res.status})`);
  const index: StorybookIndex = await res.json();
  return Object.values(index.entries).filter(
    (entry) => !entry.type || entry.type === 'story'
  );
}

export interface RawArgType {
  control?: false | string | { type: string };
  options?: string[];
  description?: string;
  defaultValue?: unknown;
}

function argsToRawArgTypes(args: Record<string, unknown>): Record<string, RawArgType> {
  const out: Record<string, RawArgType> = {};
  for (const [k, v] of Object.entries(args)) {
    const t = typeof v;
    out[k] = {
      control: t === 'boolean' ? 'boolean' : t === 'number' ? 'number' : 'text',
      defaultValue: v,
    };
  }
  return out;
}

export async function fetchStorybookArgTypes(): Promise<
  Record<string, Record<string, RawArgType>>
> {
  try {
    const [indexData, storiesData] = await Promise.all([
      fetch(`${STORYBOOK_URL}/index.json`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${STORYBOOK_URL}/stories.json`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);

    const result: Record<string, Record<string, RawArgType>> = {};

    const processEntry = (id: string, entry: Record<string, unknown>) => {
      const argTypes = (entry as { argTypes?: Record<string, RawArgType> }).argTypes;
      const args = (entry as { args?: Record<string, unknown> }).args;
      const inferred = args && Object.keys(args).length > 0 ? argsToRawArgTypes(args) : {};
      const explicit = argTypes && Object.keys(argTypes).length > 0 ? argTypes : {};
      const merged = { ...inferred, ...explicit };
      if (Object.keys(merged).length > 0) result[id] = merged;
    };

    for (const [id, entry] of Object.entries<Record<string, unknown>>(indexData?.entries ?? {})) {
      processEntry(id, entry);
    }

    for (const [id, story] of Object.entries<Record<string, unknown>>(
      storiesData?.stories ?? storiesData?.entries ?? {}
    )) {
      if (result[id]) continue;
      const withParameterArgTypes = {
        ...(story as Record<string, unknown>),
        argTypes: (story as { argTypes?: unknown }).argTypes ??
          (story as { parameters?: { argTypes?: unknown } }).parameters?.argTypes,
      };
      processEntry(id, withParameterArgTypes as Record<string, unknown>);
    }

    return result;
  } catch {
    return {};
  }
}

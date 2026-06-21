import React from 'react';
import type { ArgDefinition } from '../types';
import type { RawArgType } from './loader';
import { parseArgTypes } from './argTypes';

const storyModules = import.meta.glob(
  [
    '../../../storybook/src/stories/*.stories.tsx',
    '../../../storybook/src/stories/local/*.stories.tsx',
  ],
  { eager: true }
);

type StorybookMeta = {
  title: string;
  component?: React.ComponentType<Record<string, unknown>>;
  argTypes?: Record<string, RawArgType>;
  args?: Record<string, unknown>;
};

type StorybookStoryObj = {
  name?: string;
  args?: Record<string, unknown>;
  argTypes?: Record<string, RawArgType>;
  render?: (args: Record<string, unknown>) => React.ReactElement;
};

type StoryModule = {
  default: StorybookMeta;
  [key: string]: unknown;
};

export interface StoryEntry {
  id: string;
  title: string;
  name: string;
  render: (args: Record<string, unknown>) => React.ReactElement;
  defaultArgs: Record<string, unknown>;
  argDefs: ArgDefinition[];
}

// Match Storybook's ID generation algorithm exactly.
function startCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function sanitize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[ '"–—―′¿'!@#$%^&*()_+=[\]{};:<>,./\\|`~?]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function toStoryId(title: string, exportName: string, storyName?: string): string {
  const nameStr = storyName ?? startCase(exportName);
  return `${sanitize(title)}--${sanitize(nameStr)}`;
}

function buildEntries(): StoryEntry[] {
  const entries: StoryEntry[] = [];

  for (const [, raw] of Object.entries(storyModules)) {
    const m = raw as StoryModule;
    const meta = m.default;
    if (!meta?.title) continue;

    const metaArgs = meta.args ?? {};
    const metaArgTypes = meta.argTypes ?? {};

    for (const [exportName, storyExport] of Object.entries(m)) {
      if (exportName === 'default') continue;
      if (typeof storyExport !== 'object' || storyExport === null) continue;

      const story = storyExport as StorybookStoryObj;
      const name = story.name ?? startCase(exportName);
      const id = toStoryId(meta.title, exportName, story.name);
      const mergedArgs = { ...metaArgs, ...(story.args ?? {}) };
      const mergedArgTypes: Record<string, RawArgType> = {
        ...metaArgTypes,
        ...(story.argTypes ?? {}),
      };

      let renderFn: (args: Record<string, unknown>) => React.ReactElement;
      if (story.render) {
        const storyRender = story.render;
        renderFn = (args) => storyRender(args);
      } else if (meta.component) {
        const Comp = meta.component;
        renderFn = (args) => React.createElement(Comp, args as Record<string, unknown>);
      } else {
        continue;
      }

      // Infer argTypes for any arg value that isn't already typed
      for (const [k, v] of Object.entries(mergedArgs)) {
        if (mergedArgTypes[k]) continue;
        const t = typeof v;
        mergedArgTypes[k] = {
          control: t === 'boolean' ? 'boolean' : t === 'number' ? 'number' : 'text',
          defaultValue: v,
        };
      }

      // For string args with no value, default to the formatted arg name
      // (e.g. "title" → "Title", "description" → "Description")
      const defaultArgs = { ...mergedArgs };
      for (const [key, rawType] of Object.entries(mergedArgTypes)) {
        if (defaultArgs[key] !== undefined && defaultArgs[key] !== '') continue;
        const ctrl = typeof rawType.control === 'string'
          ? rawType.control
          : (rawType.control as { type?: string } | undefined)?.type ?? 'text';
        if (ctrl === 'text' || ctrl === '') {
          defaultArgs[key] = startCase(key);
        }
      }

      entries.push({
        id,
        title: meta.title,
        name,
        render: renderFn,
        defaultArgs,
        argDefs: parseArgTypes(mergedArgTypes),
      });
    }
  }

  return entries;
}

const _entries = buildEntries();
const _byId = new Map(_entries.map((e) => [e.id, e]));

export function getStoryEntry(id: string): StoryEntry | undefined {
  return _byId.get(id);
}

export function getAllStoryEntries(): StoryEntry[] {
  return _entries;
}

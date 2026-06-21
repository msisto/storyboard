import React from 'react';
import { getStoryEntry } from '../registry/storyRegistry';
import type { ComponentInstance } from '../types';

export function renderInstanceTree(instance: ComponentInstance): React.ReactElement {
  const entry = getStoryEntry(instance.storybookId);
  if (!entry) return React.createElement('div');

  const resolvedArgs: Record<string, unknown> = { ...entry.defaultArgs, ...instance.args };

  if (instance.slots) {
    for (const [slotName, children] of Object.entries(instance.slots)) {
      const rendered = children.map((child) =>
        React.cloneElement(renderInstanceTree(child), { key: child.id })
      );
      resolvedArgs[slotName] = rendered.length === 1 ? rendered[0] : rendered;
    }
  }

  return entry.render(resolvedArgs);
}

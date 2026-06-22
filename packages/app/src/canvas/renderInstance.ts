import React from 'react';
import { getStoryEntry } from '../registry/storyRegistry';
import type { ComponentInstance } from '../types';
import { SlotChildNode } from './SlotChildNode';

export function renderInstanceTree(instance: ComponentInstance): React.ReactElement {
  const entry = getStoryEntry(instance.storybookId);
  if (!entry) return React.createElement('div');

  const resolvedArgs: Record<string, unknown> = { ...entry.defaultArgs, ...instance.args };

  if (instance.slots) {
    for (const [slotName, children] of Object.entries(instance.slots)) {
      const rendered = children.map((child) =>
        React.createElement(SlotChildNode, { key: child.id, id: child.id, children: renderInstanceTree(child) })
      );
      resolvedArgs[slotName] = rendered.length === 1 ? rendered[0] : rendered;
    }
  }

  return entry.render(resolvedArgs);
}

const ON_CALLBACK_NAMES = new Set(['onChange', 'onValueChange', 'onCheckedChange', 'onSubmit', 'onSelect']);

// Prototype variant: intercepts onChange-family callbacks to track live arg state.
// onArgChange(componentId, argName, value) is called whenever a callback fires.
export function renderInstanceTreePrototype(
  instance: ComponentInstance,
  liveArgOverrides: Map<string, Record<string, unknown>>,
  onArgChange: (componentId: string, argName: string, value: unknown) => void
): React.ReactElement {
  const entry = getStoryEntry(instance.storybookId);
  if (!entry) return React.createElement('div');

  const resolvedArgs: Record<string, unknown> = {
    ...entry.defaultArgs,
    ...instance.args,
    ...(liveArgOverrides.get(instance.id) ?? {}),
  };

  // Intercept known callback props to capture live values
  for (const key of Object.keys(resolvedArgs)) {
    if (ON_CALLBACK_NAMES.has(key) || (key.startsWith('on') && key.length > 2 && key[2] === key[2].toUpperCase())) {
      const original = resolvedArgs[key];
      const id = instance.id;
      resolvedArgs[key] = (...args: unknown[]) => {
        // Call original handler if present
        if (typeof original === 'function') (original as (...a: unknown[]) => void)(...args);
        // Capture the first argument as the new value
        onArgChange(id, key, args[0]);
      };
    }
  }

  if (instance.slots) {
    for (const [slotName, children] of Object.entries(instance.slots)) {
      const rendered = children.map((child) =>
        React.createElement('div', { key: child.id }, renderInstanceTreePrototype(child, liveArgOverrides, onArgChange))
      );
      resolvedArgs[slotName] = rendered.length === 1 ? rendered[0] : rendered;
    }
  }

  return entry.render(resolvedArgs);
}

import type { ArgDefinition } from '../types';
import type { RawArgType } from './loader';

function getControlType(raw: RawArgType): ArgDefinition['type'] {
  const ctrl = raw.control;
  // control: false means this arg is a React slot (accepts component children)
  if (ctrl === false) return 'slot';
  if (!ctrl) return 'text';
  const type = typeof ctrl === 'string' ? ctrl : ctrl.type;
  if (type === 'boolean') return 'boolean';
  if (type === 'number' || type === 'range') return 'number';
  if (type === 'select' || type === 'radio' || type === 'inline-radio') return 'select';
  if (type === 'color') return 'color';
  if (type === 'object' || type === 'file') return 'object';
  return 'text';
}

export function parseArgTypes(
  rawArgTypes: Record<string, RawArgType>
): ArgDefinition[] {
  return Object.entries(rawArgTypes).map(([name, raw]) => {
    const ctrl = raw.control;
    const options: string[] | undefined =
      raw.options ??
      (typeof ctrl === 'object' && 'options' in ctrl
        ? (ctrl as { options?: string[] }).options
        : undefined);

    return {
      name,
      type: getControlType(raw),
      defaultValue: raw.defaultValue,
      options,
      description: raw.description,
    };
  });
}

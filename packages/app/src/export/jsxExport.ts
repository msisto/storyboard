import type { AutoLayoutSettings, ComponentInstance, Frame, StorybookStory, TextLayer } from '../types';

const FONT_SIZE_TW: Record<string, string> = {
  xs: 'text-xs', sm: 'text-sm', base: 'text-base', lg: 'text-lg',
  xl: 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl', '4xl': 'text-4xl',
};

const FONT_WEIGHT_TW: Record<string, string> = {
  thin: 'font-thin', extralight: 'font-extralight', light: 'font-light',
  normal: 'font-normal', medium: 'font-medium', semibold: 'font-semibold',
  bold: 'font-bold', extrabold: 'font-extrabold', black: 'font-black',
};

const SEMANTIC_COLOR_TW: Record<string, string> = {
  'hsl(var(--foreground))': 'text-foreground',
  'hsl(var(--muted-foreground))': 'text-muted-foreground',
  'hsl(var(--card-foreground))': 'text-card-foreground',
  'hsl(var(--primary))': 'text-primary',
  'hsl(var(--primary-foreground))': 'text-primary-foreground',
  'hsl(var(--secondary-foreground))': 'text-secondary-foreground',
  'hsl(var(--accent-foreground))': 'text-accent-foreground',
  'hsl(var(--destructive))': 'text-destructive',
  'hsl(var(--destructive-foreground))': 'text-destructive-foreground',
};

const PX_TO_TAILWIND: Record<number, string> = {
  0: '0', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5', 12: '3', 14: '3.5',
  16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10', 44: '11',
  48: '12', 56: '14', 64: '16', 80: '20', 96: '24', 112: '28', 128: '32',
};

const COUNTER_ALIGN_CLASS: Record<string, string> = {
  start: 'items-start', center: 'items-center', end: 'items-end',
};

const PRIMARY_ALIGN_CLASS: Record<string, string> = {
  start: 'justify-start', center: 'justify-center', end: 'justify-end', 'space-between': 'justify-between',
};

function pxClass(prefix: string, px: number): string | null {
  const token = PX_TO_TAILWIND[px];
  return token !== undefined ? `${prefix}-${token}` : null;
}

function buildAutoLayoutClassName(al: AutoLayoutSettings): string {
  const classes: string[] = ['flex'];
  classes.push(al.direction === 'horizontal' ? 'flex-row' : 'flex-col');

  const gap = pxClass('gap', al.gap);
  if (gap) classes.push(gap);

  const pt = al.paddingTop ?? 0;
  const pr = al.paddingRight ?? 0;
  const pb = al.paddingBottom ?? 0;
  const pl = al.paddingLeft ?? 0;

  if (pt === pr && pr === pb && pb === pl) {
    const p = pxClass('p', pt);
    if (p) classes.push(p);
  } else if (pt === pb && pr === pl) {
    const py = pxClass('py', pt);
    const px = pxClass('px', pr);
    if (py) classes.push(py);
    if (px) classes.push(px);
  } else {
    const ptc = pxClass('pt', pt); if (ptc) classes.push(ptc);
    const prc = pxClass('pr', pr); if (prc) classes.push(prc);
    const pbc = pxClass('pb', pb); if (pbc) classes.push(pbc);
    const plc = pxClass('pl', pl); if (plc) classes.push(plc);
  }

  classes.push(COUNTER_ALIGN_CLASS[al.counterAlign] ?? 'items-start');
  classes.push(PRIMARY_ALIGN_CLASS[al.primaryAlign] ?? 'justify-start');
  return classes.join(' ');
}

function propsString(instance: ComponentInstance): string {
  return Object.entries(instance.args)
    .map(([k, v]) => {
      if (typeof v === 'boolean') return v ? k : `${k}={false}`;
      if (typeof v === 'number') return `${k}={${v}}`;
      if (typeof v === 'string') return `${k}={${JSON.stringify(v)}}`;
      return `${k}={${JSON.stringify(v)}}`;
    })
    .join(' ');
}

function textSpan(t: TextLayer, absolute: boolean): string {
  const fsTw = FONT_SIZE_TW[t.fontSize ?? 'base'] ?? 'text-base';
  const fwTw = FONT_WEIGHT_TW[t.fontWeight ?? 'normal'] ?? 'font-normal';
  const colorTw = t.color ? SEMANTIC_COLOR_TW[t.color] : null;
  const colorStyle = !colorTw && t.color ? `, color: '${t.color}'` : '';

  if (absolute) {
    const posStyle = `position: 'absolute', left: ${t.x}, top: ${t.y}${colorStyle}`;
    const cls = [fsTw, fwTw, colorTw].filter(Boolean).join(' ');
    return `    <span className="${cls}" style={{ ${posStyle} }}>${t.content}</span>`;
  } else {
    const cls = [fsTw, fwTw, colorTw].filter(Boolean).join(' ');
    if (colorStyle) {
      return `    <span className="${cls}" style={{ color: '${t.color}' }}>${t.content}</span>`;
    }
    return `    <span className="${cls}">${t.content}</span>`;
  }
}

function toKebab(pascal: string): string {
  return pascal.replace(/([A-Z])/g, (m, c, i) => (i > 0 ? '-' : '') + c.toLowerCase());
}

function toPascal(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ')
    .filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join('');
}

// Recursively collect all storybookIds in a component tree (instance + all slot descendants).
function collectIds(instance: ComponentInstance, into: Set<string>) {
  into.add(instance.storybookId);
  for (const children of Object.values(instance.slots ?? {})) {
    for (const child of children) collectIds(child, into);
  }
}

// Recursively emit JSX string for a ComponentInstance and its slot children.
// tagName: resolves the JSX tag name from a storybookId (varies between the two generators).
function renderInstanceString(
  instance: ComponentInstance,
  tagName: (id: string) => string | null,
  indent: number
): string {
  const tag = tagName(instance.storybookId);
  if (!tag) return `${'  '.repeat(indent)}{/* ${instance.label || instance.storybookId} */}`;

  const props = propsString(instance);
  const pad = '  '.repeat(indent);

  const slotEntries = Object.entries(instance.slots ?? {});
  if (slotEntries.length === 0) {
    return `${pad}<${tag}${props ? ` ${props}` : ''} />`;
  }

  // children slot first, named slots after (emitted as comments — JSX has no named slot syntax)
  const sorted = [
    ...slotEntries.filter(([k]) => k === 'children'),
    ...slotEntries.filter(([k]) => k !== 'children'),
  ];

  const childPad = '  '.repeat(indent + 1);
  const childLines = sorted.flatMap(([slotName, children]) => {
    if (slotName !== 'children') {
      return [`${childPad}{/* slot: ${slotName} */}`];
    }
    return children.map((child) => renderInstanceString(child, tagName, indent + 1));
  });

  return [
    `${pad}<${tag}${props ? ` ${props}` : ''}>`,
    ...childLines,
    `${pad}</${tag}>`,
  ].join('\n');
}

// Returns the JSX body string for a frame — wrapper div + children, without imports or function wrapper.
export function buildFrameJsx(frame: Frame, stories: StorybookStory[] = []): string {
  const storyLookup = (id: string) => stories.find((s) => s.id === id);
  const tagName = (id: string) => {
    const s = storyLookup(id);
    if (!s) return null;
    return s.componentName ?? s.title.split('/').pop()!;
  };

  if (frame.autoLayout) {
    const al = frame.autoLayout;
    const allItems: Array<ComponentInstance | TextLayer> = [
      ...frame.components.filter((c) => c.visible),
      ...(frame.textLayers ?? []).filter((t) => t.visible !== false),
    ];
    if (frame.flowOrder) {
      const order = frame.flowOrder;
      allItems.sort((a, b) => {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
      });
    }
    const children = allItems
      .map((item) =>
        (item as TextLayer).type === 'text'
          ? textSpan(item as TextLayer, false)
          : renderInstanceString(item as ComponentInstance, tagName, 2)
      )
      .join('\n');
    const className = buildAutoLayoutClassName(al);
    return `  <div className="${className}" style={{ width: ${frame.width}, height: ${frame.height}, background: '${frame.backgroundColor}' }}>
${children}
  </div>`;
  }

  // Absolute layout
  const children = [
    ...frame.components.filter((c) => c.visible).map((instance) => {
      const inner = renderInstanceString(instance, tagName, 3);
      return `    <div style={{ position: 'absolute', left: ${instance.x}, top: ${instance.y}, width: ${instance.width}, height: ${instance.height} }}>
${inner}
    </div>`;
    }),
    ...(frame.textLayers ?? []).filter((t) => t.visible !== false).map((t) => textSpan(t, true)),
  ].join('\n');

  return `  <div style={{ position: 'relative', width: ${frame.width}, height: ${frame.height}, background: '${frame.backgroundColor}' }}>
${children}
  </div>`;
}

// Generates a complete .stories.tsx file.
export function buildLocalStoryFile(frame: Frame, name: string, stories: StorybookStory[]): string {
  const pascal = toPascal(name) || 'LocalComponent';
  const storyboardMeta = JSON.stringify(frame);
  const body = buildFrameJsx(frame, stories);

  // Collect all component instances (including slot descendants) and build import lines.
  const allIds = new Set<string>();
  frame.components.forEach((c) => collectIds(c, allIds));

  // Group componentName exports by importPath.
  const byPath = new Map<string, Set<string>>();
  for (const id of allIds) {
    const s = stories.find((st) => st.id === id);
    if (!s?.importPath) continue;
    const compName = s.componentName ?? s.title.split('/').pop()!;
    if (!byPath.has(s.importPath)) byPath.set(s.importPath, new Set());
    byPath.get(s.importPath)!.add(compName);
  }

  const importLines = Array.from(byPath.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, names]) => `import { ${Array.from(names).sort().join(', ')} } from '${path}';`)
    .join('\n');

  return `// @storyboard ${storyboardMeta}
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
${importLines}

// Generated by Storyboard — edit the @storyboard comment above to sync changes back to the canvas.
const ${pascal} = () => (
${body}
);

const meta = {
  title: 'Local/${pascal}',
  component: ${pascal},
  // Auto-generated per-frame scratch content — excluded from Chromatic visual regression,
  // which covers the component library (UI/*) only.
  parameters: { chromatic: { disable: true } },
} satisfies Meta<typeof ${pascal}>;
export default meta;

export const Default: StoryObj<typeof ${pascal}> = {};
`;
}

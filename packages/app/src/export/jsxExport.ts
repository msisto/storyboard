import type { AutoLayoutSettings, ComponentInstance, Frame, StorybookStory, TextLayer } from '../types';

const FONT_SIZE_MAP: Record<string, string> = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
};

const FONT_WEIGHT_MAP: Record<string, number> = {
  thin: 100, extralight: 200, light: 300, normal: 400,
  medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
};

// Maps pixel values (from the Tailwind spacing scale) to Tailwind token strings
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

  const counterClass = COUNTER_ALIGN_CLASS[al.counterAlign] ?? 'items-start';
  const primaryClass = PRIMARY_ALIGN_CLASS[al.primaryAlign] ?? 'justify-start';
  classes.push(counterClass, primaryClass);

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
  const fs = FONT_SIZE_MAP[t.fontSize ?? 'base'] ?? '1rem';
  const fw = FONT_WEIGHT_MAP[t.fontWeight ?? 'normal'] ?? 400;
  const posStyle = absolute
    ? `position: 'absolute', left: ${t.x}, top: ${t.y}, `
    : '';
  return `    <span style={{ ${posStyle}fontSize: '${fs}', fontWeight: ${fw}, color: '${t.color ?? '#111827'}' }}>${t.content}</span>`;
}

function toPascal(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ')
    .filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join('');
}

// Returns the JSX body string for a frame — the wrapper div + children,
// without imports or a wrapping function. Used both by the export modal and
// the "Save as Story" flow that writes real story files to the Storybook package.
export function buildFrameJsx(frame: Frame, stories: StorybookStory[] = []): string {
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
      .map((item) => {
        if ((item as TextLayer).type === 'text') {
          return textSpan(item as TextLayer, false);
        }
        const instance = item as ComponentInstance;
        const story = stories.find((s) => s.id === instance.storybookId);
        if (!story) return `    {/* ${instance.label || instance.storybookId} */}`;
        const componentName = story.title.split('/').pop()!;
        const props = propsString(instance);
        return `    <${componentName}${props ? ` ${props}` : ''} />`;
      })
      .join('\n');

    const className = buildAutoLayoutClassName(al);
    return `  <div className="${className}" style={{ width: ${frame.width}, height: ${frame.height}, background: '${frame.backgroundColor}' }}>
${children}
  </div>`;
  }

  // Absolute layout path
  const children = [
    ...frame.components
      .filter((c) => c.visible)
      .map((instance) => {
        const story = stories.find((s) => s.id === instance.storybookId);
        const componentName = story ? story.title.split('/').pop()! : null;
        const props = componentName ? propsString(instance) : '';
        return `    <div style={{ position: 'absolute', left: ${instance.x}, top: ${instance.y}, width: ${instance.width}, height: ${instance.height} }}>
      ${componentName ? `<${componentName}${props ? ` ${props}` : ''} />` : `{/* ${instance.label || instance.storybookId} */}`}
    </div>`;
      }),
    ...(frame.textLayers ?? [])
      .filter((t) => t.visible !== false)
      .map((t) => textSpan(t, true)),
  ].join('\n');

  return `  <div style={{ position: 'relative', width: ${frame.width}, height: ${frame.height}, background: '${frame.backgroundColor}' }}>
${children}
  </div>`;
}

export function exportFrameAsJsx(frame: Frame, stories: StorybookStory[]): string {
  const imports = new Set<string>();
  const fnName = frame.label.replace(/[^a-zA-Z0-9]/g, '') || 'Frame';

  // Collect imports from visible components
  frame.components.filter((c) => c.visible).forEach((instance) => {
    const story = stories.find((s) => s.id === instance.storybookId);
    if (story) imports.add(story.title.split('/').pop()!);
  });

  const body = buildFrameJsx(frame, stories);
  const importBlock = [...imports]
    .map((name) => `import { ${name} } from '@/components/ui/${name.toLowerCase()}';`)
    .join('\n');

  return `${importBlock}

export function ${fnName}() {
  return (
${body}
  );
}`;
}

// Generates a complete .stories.tsx file using composeStories so each child
// component renders with its actual render function and decorators — matching
// exactly what Storyboard shows in its iframes.
export function buildLocalStoryFile(frame: Frame, name: string, stories: StorybookStory[]): string {
  const pascal = toPascal(name) || 'LocalComponent';

  // -- Build per-instance info -------------------------------------------------
  interface InstanceInfo {
    varName: string;      // e.g. "CardDefault"
    exportName: string;   // e.g. "Default"
    moduleAlias: string;  // e.g. "CardStories"
    relPath: string;      // e.g. "../Card.stories"
  }
  // storybookId → info (first occurrence wins for dedup)
  const infoMap = new Map<string, InstanceInfo>();

  frame.components.filter((c) => c.visible).forEach((instance) => {
    if (infoMap.has(instance.storybookId)) return;
    const story = stories.find((s) => s.id === instance.storybookId);
    if (!story?.importPath) return;

    const componentName = (story.title.split('/').pop() ?? 'Component').replace(/\s+/g, '');
    const exportName = toPascal(story.name) || 'Default';
    const varName = componentName + exportName;
    const moduleAlias = componentName + 'Stories';
    // importPath is relative to Storybook project root: "./src/stories/Card.stories.tsx"
    // local story lives at "src/stories/local/" — go up one level
    const relPath = story.importPath
      .replace(/^\.\/src\/stories\//, '../')
      .replace(/\.tsx?$/, '');

    infoMap.set(instance.storybookId, { varName, exportName, moduleAlias, relPath });
  });

  // -- Group by module alias for import + compose lines -----------------------
  const moduleGroups = new Map<string, { relPath: string; entries: { exportName: string; varName: string }[] }>();
  infoMap.forEach(({ moduleAlias, relPath, exportName, varName }) => {
    if (!moduleGroups.has(moduleAlias)) {
      moduleGroups.set(moduleAlias, { relPath, entries: [] });
    }
    const group = moduleGroups.get(moduleAlias)!;
    if (!group.entries.find((e) => e.exportName === exportName)) {
      group.entries.push({ exportName, varName });
    }
  });

  const hasModules = moduleGroups.size > 0;
  const importLines: string[] = [];
  const composeLines: string[] = [];

  if (hasModules) {
    importLines.push(`import { composeStories } from '@storybook/react';`);
    moduleGroups.forEach(({ relPath, entries }, alias) => {
      importLines.push(`import * as ${alias} from '${relPath}';`);
      const destructure = entries
        .map(({ exportName, varName }) =>
          exportName === varName ? exportName : `${exportName}: ${varName}`
        )
        .join(', ');
      composeLines.push(`const { ${destructure} } = composeStories(${alias});`);
    });
  }

  // -- Build JSX body using composed var names --------------------------------
  const body = (() => {
    const renderInstance = (instance: ComponentInstance): string => {
      const info = infoMap.get(instance.storybookId);
      if (!info) return `    {/* ${instance.label || instance.storybookId} */}`;
      const props = propsString(instance);
      return `    <${info.varName}${props ? ` ${props}` : ''} />`;
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
            : renderInstance(item as ComponentInstance)
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
        const inner = renderInstance(instance);
        return `    <div style={{ position: 'absolute', left: ${instance.x}, top: ${instance.y}, width: ${instance.width}, height: ${instance.height} }}>
      ${inner.trim()}
    </div>`;
      }),
      ...(frame.textLayers ?? []).filter((t) => t.visible !== false).map((t) => textSpan(t, true)),
    ].join('\n');
    return `  <div style={{ position: 'relative', width: ${frame.width}, height: ${frame.height}, background: '${frame.backgroundColor}' }}>
${children}
  </div>`;
  })();

  return `import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
${importLines.join('\n')}
${composeLines.length > 0 ? '\n' + composeLines.join('\n') + '\n' : ''}
// Generated by Storyboard
const ${pascal} = () => (
${body}
);

const meta = {
  title: 'Local/${pascal}',
  component: ${pascal},
} satisfies Meta<typeof ${pascal}>;
export default meta;

export const Default: StoryObj<typeof ${pascal}> = {};
`;
}

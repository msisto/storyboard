import type { ComponentInstance, Frame, StorybookStory, TextLayer } from '../types';

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

const PRIMARY_ALIGN: Record<string, string> = {
  start: 'flex-start', center: 'center', end: 'flex-end', 'space-between': 'space-between',
};

const COUNTER_ALIGN: Record<string, string> = {
  start: 'flex-start', center: 'center', end: 'flex-end',
};

function propsString(instance: ComponentInstance): string {
  return Object.entries(instance.args)
    .map(([k, v]) => {
      if (typeof v === 'boolean') return v ? k : `${k}={false}`;
      if (typeof v === 'number') return `${k}={${v}}`;
      if (typeof v === 'string') return `${k}="${v}"`;
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

export function exportFrameAsJsx(frame: Frame, stories: StorybookStory[]): string {
  const imports = new Set<string>();
  const fnName = frame.label.replace(/[^a-zA-Z0-9]/g, '') || 'Frame';

  if (frame.autoLayout) {
    const al = frame.autoLayout;

    // Build combined ordered list
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
        if (!story) return `    {/* Missing: ${instance.storybookId} */}`;
        const componentName = story.title.split('/').pop()!;
        imports.add(componentName);
        const props = propsString(instance);
        return `    <${componentName}${props ? ` ${props}` : ''} />`;
      })
      .join('\n');

    const containerStyle = [
      `display: 'flex'`,
      `flexDirection: '${al.direction === 'horizontal' ? 'row' : 'column'}'`,
      `gap: ${al.gap}`,
      `paddingTop: ${al.paddingTop}`,
      `paddingRight: ${al.paddingRight}`,
      `paddingBottom: ${al.paddingBottom}`,
      `paddingLeft: ${al.paddingLeft}`,
      `alignItems: '${COUNTER_ALIGN[al.counterAlign] ?? 'flex-start'}'`,
      `justifyContent: '${PRIMARY_ALIGN[al.primaryAlign] ?? 'flex-start'}'`,
      `width: ${frame.width}`,
      `height: ${frame.height}`,
      `background: '${frame.backgroundColor}'`,
    ].join(', ');

    const importBlock = [...imports]
      .map((name) => `import { ${name} } from '@/components/ui/${name.toLowerCase()}';`)
      .join('\n');

    return `${importBlock}

export function ${fnName}() {
  return (
    <div style={{ ${containerStyle} }}>
${children}
    </div>
  );
}`;
  }

  // Absolute layout path
  const children = [
    ...frame.components
      .filter((c) => c.visible)
      .map((instance) => {
        const story = stories.find((s) => s.id === instance.storybookId);
        if (!story) return `    {/* Missing: ${instance.storybookId} */}`;
        const componentName = story.title.split('/').pop()!;
        imports.add(componentName);
        const props = propsString(instance);
        return `    <div style={{ position: 'absolute', left: ${instance.x}, top: ${instance.y}, width: ${instance.width}, height: ${instance.height} }}>
      <${componentName}${props ? ` ${props}` : ''} />
    </div>`;
      }),
    ...(frame.textLayers ?? [])
      .filter((t) => t.visible !== false)
      .map((t) => textSpan(t, true)),
  ].join('\n');

  const importBlock = [...imports]
    .map((name) => `import { ${name} } from '@/components/ui/${name.toLowerCase()}';`)
    .join('\n');

  return `${importBlock}

export function ${fnName}() {
  return (
    <div style={{ position: 'relative', width: ${frame.width}, height: ${frame.height}, background: '${frame.backgroundColor}' }}>
${children}
    </div>
  );
}`;
}

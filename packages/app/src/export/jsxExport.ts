import type { Frame, StorybookStory } from '../types';

export function exportFrameAsJsx(frame: Frame, stories: StorybookStory[]): string {
  const imports = new Set<string>();

  const children = frame.components
    .filter((c) => c.visible)
    .map((instance) => {
      const story = stories.find((s) => s.id === instance.storybookId);
      if (!story) return `    {/* Missing: ${instance.storybookId} */}`;

      const componentName = story.title.split('/').pop()!;
      imports.add(componentName);

      const props = Object.entries(instance.args)
        .map(([k, v]) => {
          if (typeof v === 'boolean') return v ? k : `${k}={false}`;
          if (typeof v === 'number') return `${k}={${v}}`;
          if (typeof v === 'string') return `${k}="${v}"`;
          return `${k}={${JSON.stringify(v)}}`;
        })
        .join(' ');

      return `    <div style={{ position: 'absolute', left: ${instance.x}, top: ${instance.y}, width: ${instance.width}, height: ${instance.height} }}>
      <${componentName}${props ? ` ${props}` : ''} />
    </div>`;
    })
    .join('\n');

  const importBlock = [...imports]
    .map((name) => `import { ${name} } from '@/components/ui/${name.toLowerCase()}';`)
    .join('\n');

  const fnName = frame.label.replace(/[^a-zA-Z0-9]/g, '') || 'Frame';

  return `${importBlock}

export function ${fnName}() {
  return (
    <div style={{ position: 'relative', width: ${frame.width}, height: ${frame.height}, background: '${frame.backgroundColor}' }}>
${children}
    </div>
  );
}`;
}

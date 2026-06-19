import React from 'react';
import type { Decorator, Preview } from '@storybook/react';
import { useArgs } from '@storybook/preview-api';
import '../globals.css';

// Measures the rendered story's natural size and posts it to the parent
// window so Storyboard can auto-size the iframe container on first drop.
const SizeReporter: Decorator = (Story) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const instanceId = React.useMemo(
    () => new URLSearchParams(window.location.search).get('instanceId'),
    []
  );
  const [measured, setMeasured] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!instanceId) return;
    const style = document.createElement('style');
    style.textContent =
      'body,#storybook-root{' +
      'display:block!important;' +
      'padding:0!important;' +
      'margin:0!important;' +
      'min-height:unset!important;' +
      'align-items:unset!important;' +
      'justify-content:unset!important;' +
      'flex-direction:unset!important}';
    document.head.appendChild(style);
    return () => style.remove();
  }, [instanceId]);

  React.useEffect(() => {
    if (!instanceId || !ref.current) return;
    const el = ref.current;

    const report = () => {
      const { offsetWidth, offsetHeight } = el;
      if (offsetWidth > 0 && offsetHeight > 0) {
        window.parent.postMessage(
          { type: 'storyboard:story-size', instanceId, width: offsetWidth, height: offsetHeight },
          '*'
        );
        setMeasured(true);
      }
    };

    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [instanceId]);

  // Before measurement: use a block wrapper that fills the iframe width so
  // `w-full` components measure correctly. After measurement: display:contents
  // makes this wrapper transparent so the component fills its container naturally.
  return React.createElement(
    'div',
    { ref, style: measured ? { display: 'contents' } : { display: 'block', width: '100%' } },
    React.createElement(Story as React.ComponentType, null)
  );
};

// Reports the story's args/argTypes to the parent so the Storyboard inspector
// can display them. Also listens for `storyboard:update-args` messages from
// the parent and applies them via Storybook's useArgs hook — no channel
// manipulation needed, works reliably across Storybook versions.
const ArgsReporter: Decorator = (Story, context) => {
  const instanceId = React.useMemo(
    () => new URLSearchParams(window.location.search).get('instanceId'),
    []
  );
  const [, updateArgs] = useArgs();

  // Send current args + argTypes to parent whenever they change
  React.useEffect(() => {
    if (!instanceId) return;
    window.parent.postMessage(
      {
        type: 'storyboard:story-args',
        instanceId,
        storyId: context.id,
        args: context.args,
        argTypes: context.argTypes,
      },
      '*'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, context.id, JSON.stringify(context.args)]);

  // Apply arg updates sent from the parent (e.g. PropsInspector edits)
  React.useEffect(() => {
    if (!instanceId) return;
    const handler = (e: MessageEvent) => {
      if (!e.data || e.data.type !== 'storyboard:update-args') return;
      if (e.data.instanceId !== instanceId) return;
      updateArgs(e.data.args as Record<string, unknown>);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [instanceId, updateArgs]);

  return React.createElement(Story as React.ComponentType, null);
};

const preview: Preview = {
  decorators: [SizeReporter, ArgsReporter],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    layout: 'centered',
  },
};

export default preview;

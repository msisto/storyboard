import React from 'react';
import type { Decorator, Preview } from '@storybook/react';
import '../globals.css';

// Measures the rendered story's natural size and posts it to the parent
// window so Storyboard can auto-size the iframe container on first drop.
// Only active when `instanceId` is present in the URL (i.e. when loaded
// inside the Storyboard canvas — not when browsing Storybook directly).
const SizeReporter: Decorator = (Story) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const instanceId = React.useMemo(
    () => new URLSearchParams(window.location.search).get('instanceId'),
    []
  );

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
      }
    };

    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [instanceId]);

  return React.createElement(
    'div',
    { ref, style: { display: 'inline-block' } },
    React.createElement(Story as React.ComponentType, null)
  );
};

const preview: Preview = {
  decorators: [SizeReporter],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    layout: 'centered',
  },
};

export default preview;

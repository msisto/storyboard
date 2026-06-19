# Storyboard

An experience design canvas for Storybook libraries.

<img width="1728" height="936" alt="Screenshot 2026-06-19 at 2 39 58 PM" src="https://github.com/user-attachments/assets/b4662dc6-349a-44d9-be73-0fe7a3ecf8d1" />



---

## What it does

Storybook is excellent at developing components in isolation. Figma is good at composing those components into screens. The problem: Figma mockups are static pictures of your components, not the components themselves. Storyboard sits in the middle — it's a canvas that renders your actual Storybook stories as live iframes, so you're composing real, interactive components rather than approximations.

Each canvas frame is a "board" — a screen in a user flow. Boards are arranged in a timeline at the bottom of the UI. The idea is to lay out a journey left-to-right, the way designers already think about flows, while keeping every component in sync with the actual codebase.

Concretely this means:

- Component props changed in the inspector update the live component instantly, one character at a time — no reload
- Each instance on the canvas can have independent content (two Cards with different titles, same story)
- A component with a hover state actually hovers when you mouse over it in interact mode
- The layout you see is the layout your production code would produce, not an approximation
- Design files are JSON checked into the repo alongside the components they reference

---

## Architecture

Three packages in a single npm workspace:

```
packages/
  app/       — the canvas tool (React + Vite, :1618)
  server/    — persistence and real-time sync (Express + WebSocket, :3333)
  storybook/ — the reference component library (Storybook 8, :6006)
```

`packages/storybook` is a demo library. In practice you point the tool at your own Storybook instance.

### How the canvas renders components

Each component instance on the canvas is an `<iframe>` pointing at Storybook's `iframe.html` endpoint:

```
http://localhost:6006/iframe.html?id=ui-button--default&viewMode=story&instanceId=abc123
```

Storybook already supports this URL format for story embeds. Storyboard adds two things on top:

**Auto-sizing.** A global decorator in `.storybook/preview.ts` (the `SizeReporter`) wraps every story in a permanent `display: block; width: 100%` div and attaches a `ResizeObserver` to it. On every size change it posts `{ type: 'storyboard:story-size', instanceId, width, height }` to the parent window. The canvas updates the iframe container to match. Because the wrapper always occupies full iframe width, components using `w-full` measure against the correct width, and height re-measures correctly as text content grows or shrinks. The iframe background is transparent so components with rounded corners blend cleanly with the frame background color.

**Interact mode.** By default a transparent overlay sits above the iframe so the canvas can intercept mouse events for dragging and selection. Double-clicking a component removes the overlay and passes pointer events directly to the iframe — you can type in inputs, click buttons, trigger hover states. Press Escape to exit.

### How story props work

A second decorator, `ArgsReporter`, runs inside every story iframe. On each render it:

1. **Reports** the story's current `args` and `argTypes` to the parent window via `postMessage({ type: 'storyboard:story-args', instanceId, storyId, args, argTypes })`. The canvas uses this to populate the Inspect panel — no static JSON parsing required.
2. **Listens** for `postMessage({ type: 'storyboard:update-args', instanceId, args })` from the parent. When received, it calls Storybook's `useArgs()` hook to update the story's args and trigger an immediate re-render.

This means prop changes in the inspector are instant and character-by-character. The iframe never reloads. Each canvas instance stores its own `args` map independently, so two instances of the same story can have different content.

For this to work, your stories must accept the text content you want to change as `args`:

```tsx
// ✅ Works — title is editable from the canvas
export const Default: Story = {
  args: { title: 'Card Title', description: 'Card description.' },
  render: ({ title, description }) => (
    <Card><CardTitle>{title}</CardTitle>...</Card>
  ),
};

// ✗ Hardcoded — no way to change from the canvas
export const Default: Story = {
  render: () => <Card><CardTitle>Card Title</CardTitle>...</Card>,
};
```

The component registry auto-refreshes every 10 seconds so story changes are picked up without reloading the app. The ↻ button in the toolbar forces an immediate refresh.

### Design file storage

Design files are plain JSON at `designs/<uuid>.json`. They're committed to the repo alongside source code — designs are treated as artifacts that belong in version control, not in a separate database.

The file format is exactly the `DesignFile` interface from `packages/app/src/types.ts`. This matters for tooling: Claude Code and other LLM tools can read a design file directly from the repo, reason about the layout, and make changes programmatically.

Auto-save fires 1 second after any change via a Zustand subscription in `useAutoSave.ts`. The toolbar save/open buttons are for downloading or loading `.json` files separately from the server.

### Undo

Every structural mutation (add/move/delete, layout changes, text edits) pushes a snapshot of `DesignFile` onto a history stack (max 50 entries). The dedup key is `file.updatedAt` — rapid consecutive calls within the same action don't create separate history entries. Drag operations push once on the first pixel of movement; inspector field edits push on focus so each field session is one undo step.

### Auto-layout

Frames have an optional auto-layout mode (Shift+A, or the inspector toggle). When enabled, children flow horizontally or vertically with configurable gap, padding, and alignment — similar to Figma's auto-layout. The layout engine is a pure TypeScript function in `canvas/autoLayout.ts` that runs synchronously every render; there's no async layout pass.

Child sizing modes:
- **fixed** — explicit stored width/height
- **fill** — expands to consume remaining space in the flow direction
- **hug** — sizes to natural content; for text layers, measured via `ResizeObserver`

All spacing values (gap, padding) are constrained to the Tailwind default spacing scale and displayed as token + pixel value (e.g. `4 — 16px`).

Frame self-sizing: `widthMode: 'hug'` or `heightMode: 'hug'` makes the frame wrap its content rather than clip it.

Components and text layers share a single ordered list (`flowOrder` on the frame) so they can be drag-reordered together within a flow.

### Viewport

The canvas supports pinch-to-zoom centered on the cursor position. On load the viewport fits all frames with padding. Clicking a frame in the timeline centers and fits that frame. The toolbar shows the current zoom and has Fit / 1:1 buttons.

### Timeline

The horizontal strip at the bottom shows frames in sequence order as wireframe thumbnail cards. Frames can be drag-reordered. Clicking a card selects the frame and fits the viewport to it.

Frames can be **hidden from the timeline** (Inspect panel → Timeline → Hidden) while staying on the canvas — useful for keeping utility or reference boards that aren't part of the demo flow. Hidden frames show a hover × button in the timeline to restore them, and can be toggled back from the inspector.

### Real-time collaboration

The server maintains a WebSocket room per file ID. When any connected client modifies the design, it broadcasts the full file state to the room (debounced 500ms, with echo suppression keyed on `updatedAt`). Cursor positions are broadcast at ~30fps. The connection reconnects automatically with exponential backoff. Peer cursors appear as colored dots with names on the canvas.

---

## Installation

### Prerequisites

- Node.js 18+

### Clone and install

```bash
git clone https://github.com/msisto/storyboard.git
cd storyboard
npm install
```

### Run everything

```bash
npm run dev
```

This starts three processes concurrently via `concurrently`:
- Storybook dev server at `http://localhost:6006`
- Canvas UI at `http://localhost:1618`
- API + WebSocket server at `http://localhost:3333`

Open `http://localhost:1618`. The first screen is the file picker. Create a new file or open an existing one from `designs/`.

---

## Connecting your own Storybook

### Step 1 — Add the decorators

Copy the following into your `.storybook/preview.ts` and add both decorators. These are the only code changes required in your project.

```typescript
import React from 'react';
import type { Decorator } from '@storybook/react';
import { useArgs } from '@storybook/preview-api';

// Reports the story's natural size to the canvas on every resize.
// The wrapper is permanently block/full-width so w-full components measure correctly
// and height updates as content grows (e.g. editable text). Background is transparent
// so components with rounded corners blend with the frame background color.
const SizeReporter: Decorator = (Story) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const instanceId = React.useMemo(
    () => new URLSearchParams(window.location.search).get('instanceId'),
    []
  );

  React.useLayoutEffect(() => {
    if (!instanceId) return;
    const style = document.createElement('style');
    style.textContent =
      'body,#storybook-root{display:block!important;padding:0!important;margin:0!important;' +
      'min-height:unset!important;align-items:unset!important;justify-content:unset!important;' +
      'flex-direction:unset!important;background:transparent!important}';
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
      }
    };
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [instanceId]);

  return React.createElement(
    'div',
    { ref, style: { display: 'block', width: '100%' } },
    React.createElement(Story as React.ComponentType, null)
  );
};

// Reports args/argTypes to the canvas inspector and applies live arg updates.
const ArgsReporter: Decorator = (Story, context) => {
  const instanceId = React.useMemo(
    () => new URLSearchParams(window.location.search).get('instanceId'),
    []
  );
  const [, updateArgs] = useArgs();

  React.useEffect(() => {
    if (!instanceId) return;
    window.parent.postMessage(
      { type: 'storyboard:story-args', instanceId, storyId: context.id,
        args: context.args, argTypes: context.argTypes },
      '*'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, context.id, JSON.stringify(context.args)]);

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

export default {
  decorators: [SizeReporter, ArgsReporter],
  parameters: { /* ... your existing parameters */ },
};
```

Both decorators are gated on `instanceId` being present in the URL, which only happens when Storyboard loads the story. They have no effect when browsing Storybook normally.

### Step 2 — Use args for editable content

For content to be editable from the canvas, it must come from `args`:

```tsx
type CardArgs = { title: string; description: string; action: string };

const meta: Meta<CardArgs> = { title: 'UI/Card', component: Card };
export default meta;

export const Default: StoryObj<CardArgs> = {
  args: { title: 'Card Title', description: 'Card description.', action: 'Submit' },
  render: ({ title, description, action }) => (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
      <Button>{action}</Button>
    </Card>
  ),
};
```

### Step 3 — Point the tool at your Storybook URL

The canvas defaults to `http://localhost:6006`. To use a different URL, set it in your environment:

```bash
# packages/app/.env
VITE_STORYBOOK_URL=http://localhost:7007
```

### Step 4 — Run with your own Storybook

If your Storybook already runs separately, skip `packages/storybook` entirely:

```bash
# Terminal 1 — your project's Storybook
cd /path/to/your/project
npm run storybook

# Terminal 2 — canvas UI + server
cd /path/to/storyboard
npm run dev -w packages/app & npm run dev -w packages/server
```

---

## Using the tool

### Canvas shortcuts

| Action | Shortcut |
|--------|----------|
| Select tool | V |
| Comment tool | C |
| Pan canvas | Space + drag, or middle mouse drag |
| Zoom to cursor | Trackpad pinch, or Cmd/Ctrl + scroll |
| Toggle auto-layout | Shift+A (with frame selected) |
| Delete selected | Delete |
| Undo | Cmd/Ctrl+Z |

### Adding components to a frame

Drag a story from the Components panel onto a frame. The component renders as a live iframe and auto-sizes to its natural dimensions. Dropping onto empty canvas creates a frame automatically.

### Editing component content

Select a component to see its props in the Inspect panel under **PROPS**. Each arg defined in the story appears as an input control. Changes take effect instantly in the iframe — no reload, one character at a time. Different instances of the same story can have independent content.

### Interacting with components

Double-click any component to enter interact mode. The overlay is removed; the iframe receives pointer events directly. Press Escape to exit.

### Text layers

Open the Text tab to browse the Tailwind type scale. Click a row to add a text layer to the selected frame. Drag to position. Double-click any text layer on the canvas to edit it inline.

### Auto-layout

Press Shift+A with a frame selected to enable auto-layout. Use the Inspect panel to set direction, gap, padding, alignment, and sizing modes. All spacing values snap to the Tailwind scale. Drag children within the frame to reorder. Press Shift+A again to disable; components keep their computed positions.

### Alignment and distribution

Select two or more items to see alignment controls in the Inspect panel. Align edges or centers, distribute with equal spacing, or tidy up into a grid.

### Timeline management

Frames shown in the timeline represent your demo flow. To remove a frame from the timeline without deleting it (e.g. a utility or reference board), select it and toggle **Timeline → Hidden** in the inspector. Hidden frames stay on the canvas but don't appear in the timeline strip.

### JSX export

Menu (≡) → Export JSX generates a React component for any frame. Auto-layout frames produce a `className` string using Tailwind utility classes for all spacing and flex properties (e.g. `flex flex-col gap-4 p-4 items-start`). Width, height, and background stay as inline `style`. Use it as handoff scaffolding.

---

## Design file format

Files are stored as `designs/<uuid>.json`. The shape maps directly to `DesignFile` in `types.ts`.

```jsonc
{
  "version": 1,
  "id": "0e2e0642-...",
  "name": "Checkout flow",
  "createdAt": 1718800000000,
  "updatedAt": 1718800001234,
  "frames": [
    {
      "id": "<uuid>",
      "label": "Cart",
      "x": 100, "y": 100,
      "width": 375, "height": 812,
      "backgroundColor": "#ffffff",
      "inTimeline": true,
      "autoLayout": {
        "direction": "vertical",
        "gap": 16,
        "paddingTop": 24, "paddingRight": 16, "paddingBottom": 24, "paddingLeft": 16,
        "primaryAlign": "start", "counterAlign": "start",
        "widthMode": "fixed", "heightMode": "hug",
        "wrap": false
      },
      "flowOrder": ["<text-layer-id>", "<component-id>"],
      "components": [
        {
          "id": "<uuid>",
          "storybookId": "ui-button--default",
          "title": "UI/Button", "name": "Default",
          "x": 16, "y": 720, "width": 343, "height": 44,
          "args": { "variant": "default", "children": "Checkout" },
          "widthMode": "fill", "heightMode": "fixed",
          "visible": true, "locked": false,
          "label": "Button · Default"
        }
      ],
      "textLayers": [
        {
          "id": "<uuid>",
          "type": "text",
          "label": "Heading",
          "content": "Your cart",
          "x": 16, "y": 24,
          "fontSize": "2xl", "fontWeight": "bold",
          "color": "#111827",
          "widthMode": "hug", "heightMode": "hug",
          "visible": true, "locked": false
        }
      ]
    }
  ],
  "comments": []
}
```

`storybookId` is the only coupling to Storybook. It's the story ID from `/index.json` — the same string in the `id` query param of `iframe.html`. If a story is renamed or moved, instances referencing the old ID will show a broken iframe until updated.

---

## Project structure

```
packages/app/src/
  App.tsx                    root: keyboard shortcuts, drag-drop wiring, layout
  types.ts                   all shared TypeScript interfaces + Tailwind spacing scale

  canvas/
    Canvas.tsx               pan/zoom/rubber-band, renders FrameNodes
    FrameNode.tsx            frame resize, auto-layout reorder drag, text tool overlay
    ComponentNode.tsx        iframe wrapper, interact mode, resize handles, arg sync
    TextLayerNode.tsx        inline text editing, hug-size via ResizeObserver
    ResizeHandles.tsx        8-direction resize handles used by frames + components
    autoLayout.ts            pure layout engine, unified FlowItem abstraction

  components/
    Toolbar.tsx              tool switcher, zoom controls, file menu, registry refresh
    LayersPanel.tsx          frame/component/text layer tree, visibility toggles
    ComponentPalette.tsx     searchable story list from Storybook index
    TextPalette.tsx          Tailwind type scale browser, draggable rows
    PropsInspector.tsx       context-sensitive inspector (frame / component / text layer)
    FilePicker.tsx           file list, create/open/delete

  timeline/
    StoryboardTimeline.tsx   bottom board strip, wireframe thumbnails, drag reorder

  store/
    useDesignStore.ts        all design state + 50-step undo history
    useCanvasStore.ts        viewport, active tool, interact mode, text edit mode
    useAutoSave.ts           debounced save (1s) on state change
    api.ts                   REST client for /api/files

  registry/
    loader.ts                fetches /index.json from Storybook
    buildIframeUrl.ts        constructs iframe.html URLs with instanceId
    argTypes.ts              maps Storybook argTypes to ArgDefinition[]
    useRegistryStore.ts      store for available stories and arg defs (auto-refreshes every 10s)

  comments/
    useCommentSync.ts        WebSocket, real-time canvas sync, peer cursors
    CommentPin.tsx           in-canvas comment marker

  export/
    jsxExport.ts             frame → JSX string

packages/server/src/
  index.ts                   Express REST API (/api/files CRUD) + WebSocket room server

packages/storybook/
  src/stories/               example stories using Radix UI + Tailwind (all using args)
  .storybook/
    preview.ts               SizeReporter + ArgsReporter decorators — copy to your Storybook
    main.ts                  Storybook config (stories glob, addons)

designs/
  *.json                     design files, committed to the repo
```

---

## Known limitations

- **No component library abstraction** — each frame has its own independent component list. There's no concept of reusable symbols or shared instances across frames.
- **JSX export doesn't handle nested auto-layout** — the exporter generates correct flexbox JSX for top-level auto-layout frames but does not recurse into nested frames.
- **Hardcoded story renders** — stories that use `render: () => (...)` with no `args` won't show editable props. Migrate content to `args` to make it editable.
- **Box shadows are clipped at iframe boundaries** — each component renders inside an iframe sized to its natural dimensions. CSS `box-shadow` that bleeds outside the component's bounding box is clipped by the iframe viewport. A future fix would add a transparent padding buffer around each story so shadows have room to render without affecting the reported component size.

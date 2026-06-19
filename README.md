# Storyboard

An experience design canvas for Storybook libraries.

<img width="1728" height="936" alt="Screenshot 2026-06-19 at 2 39 58 PM" src="https://github.com/user-attachments/assets/b4662dc6-349a-44d9-be73-0fe7a3ecf8d1" />



---

## What it does

Storybook is excellent at developing components in isolation. Figma is good at composing those components into screens. The problem: Figma mockups are static pictures of your components, not the components themselves. Storyboard sits in the middle — it's a canvas that renders your actual Storybook stories as live iframes, so you're composing real, interactive components rather than screenshots.

Each canvas frame is a "board" — a screen in a user flow. Boards are arranged in a timeline at the bottom of the UI. The idea is to lay out a journey left-to-right, the way designers already think about flows, while keeping every component in sync with the actual codebase.

Concretely this means:

- Component props changed in the inspector take effect in the real rendered component immediately
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
http://localhost:6006/iframe.html?id=ui-button--default&viewMode=story&args=variant:outline;children:Click+me&instanceId=abc123
```

Storybook already supports this URL format for story embeds. Storyboard adds two things on top:

**Auto-sizing.** When a component is first dropped onto the canvas, the iframe needs a size. A global decorator in `.storybook/preview.ts` (the `SizeReporter`) wraps every story in a `ResizeObserver`, measures the rendered component's natural dimensions, and posts them to the parent window via `postMessage({ type: 'storyboard:story-size', instanceId, width, height })`. The canvas listens for this message and resizes the iframe container to fit. Once measured, the wrapper switches to `display: contents` so the component can fill the iframe on resize.

**Interact mode.** By default a transparent overlay sits above the iframe so the canvas can intercept mouse events for dragging and selection. Double-clicking a component removes the overlay and passes pointer events directly to the iframe — you can type in inputs, click buttons, trigger hover states. Press Escape to exit.

### How story props work

On load the tool fetches:
- `/index.json` — full story list (id, title, name)
- `/stories.json` — argTypes per story (control types, options, defaults)

These populate the component palette and drive the inspector controls. Argtype control types (`boolean`, `select`, `color`, `text`, `number`) map to appropriate input widgets. When you change a prop the new value is written into the instance's `args` map, the iframe URL is rebuilt, and the component re-renders.

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

Frame self-sizing: `widthMode: 'hug'` or `heightMode: 'hug'` makes the frame wrap its content rather than clip it.

Components and text layers share a single ordered list (`flowOrder` on the frame) so they can be drag-reordered together within a flow.

### Real-time collaboration

The server maintains a WebSocket room per file ID. When any connected client modifies the design, it broadcasts the full file state to the room (debounced 500ms, with echo suppression keyed on `updatedAt`). Cursor positions are broadcast at ~30fps. The connection reconnects automatically with exponential backoff. Peer cursors appear as colored dots with names on the canvas.

### Timeline

The horizontal strip at the bottom shows all frames in sequence order as wireframe thumbnail cards. Each thumbnail is a CSS-scaled `div` rendering component outlines and text stubs — no iframes, no network requests. Frames can be drag-reordered on the timeline. Clicking a card selects the frame and centers the canvas viewport on it. "+ Add Board" creates a new frame to the right of the last one and pans to it.

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

### Step 1 — Add the SizeReporter decorator

Copy the following into your `.storybook/preview.ts` and add `SizeReporter` to the `decorators` array. This is the only code change required in your project.

```typescript
import React from 'react';
import type { Decorator } from '@storybook/react';

const SizeReporter: Decorator = (Story) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const instanceId = React.useMemo(
    () => new URLSearchParams(window.location.search).get('instanceId'),
    []
  );
  const [measured, setMeasured] = React.useState(false);

  // Remove Storybook's centering layout so the component renders flush
  // from the top-left corner with no padding.
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

  return React.createElement(
    'div',
    { ref, style: { display: measured ? 'contents' : 'inline-block' } },
    React.createElement(Story as React.ComponentType, null)
  );
};

// Merge with your existing preview export:
export default {
  decorators: [SizeReporter],
  parameters: { /* ... */ },
};
```

The decorator is gated on `instanceId` being present in the URL, which only happens when Storyboard loads the story. It has no effect when browsing Storybook normally.

### Step 2 — Point the tool at your Storybook URL

The canvas hardcodes `http://localhost:6006`. If your Storybook runs elsewhere, update:

- `packages/app/src/registry/loader.ts` — `STORYBOOK_URL` constant at the top
- `packages/app/src/registry/buildIframeUrl.ts` — `base` variable in `buildIframeUrl`
- `packages/app/vite.config.ts` — the proxy target for `/storybook`

### Step 3 — Run with your own Storybook

If your Storybook already runs separately, skip `packages/storybook` entirely:

```bash
# Terminal 1 — your project's Storybook
cd /path/to/your/project
npm run storybook   # or whatever starts it on :6006

# Terminal 2 — canvas UI
cd /path/to/storyboard
npm run dev -w packages/app

# Terminal 3 — server
cd /path/to/storyboard
npm run dev -w packages/server
```

### Verifying the connection

Open `http://localhost:1618` and create or open a file. The Components tab on the left should populate with your stories. If you see "Storybook not reachable", the tool can't reach `localhost:6006/index.json`. The error screen shows the exact error and auto-retries every 5 seconds.

---

## Using the tool

### Canvas shortcuts

| Action | Shortcut |
|--------|----------|
| Select tool | V |
| Frame tool | F |
| Comment tool | C |
| Pan tool | H |
| Pan canvas | Space + drag, or middle mouse drag |
| Zoom | Cmd/Ctrl + scroll |
| Toggle auto-layout | Shift+A (with frame selected) |
| Delete selected | Delete |
| Undo | Cmd/Ctrl+Z |

### Adding components to a frame

Drag a story from the Components panel onto a frame. The component renders as a live iframe and auto-sizes. Dropping onto empty canvas creates a frame automatically.

### Editing props

Select a component to see its props in the Inspect panel. Controls are generated from `argTypes`. Changing a value takes effect immediately.

### Interacting with components

Double-click any component to enter interact mode. The overlay is removed; the iframe receives pointer events directly. Press Escape to exit.

### Text layers

Open the Text tab to browse the Tailwind type scale. Click a row to add a text layer to the selected frame. Drag to position. Double-click any text layer on the canvas to edit it inline.

### Auto-layout

Press Shift+A with a frame selected to enable auto-layout. Use the Inspect panel to set direction, gap, padding, alignment, and sizing modes. Drag children within the frame to reorder. Press Shift+A again to disable; components keep their computed positions.

### JSX export

Menu (≡) → Export JSX generates a React component for any frame with components placed via absolute positioning. Use it as handoff scaffolding.

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
  types.ts                   all shared TypeScript interfaces

  canvas/
    Canvas.tsx               pan/zoom/rubber-band, renders FrameNodes
    FrameNode.tsx            frame resize, auto-layout reorder drag, text tool overlay
    ComponentNode.tsx        iframe wrapper, interact mode, resize handles
    TextLayerNode.tsx        inline text editing, hug-size via ResizeObserver
    ResizeHandles.tsx        8-direction resize handles used by frames + components
    autoLayout.ts            pure layout engine, unified FlowItem abstraction

  components/
    Toolbar.tsx              tool switcher, zoom controls, file menu
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
    loader.ts                fetches /index.json and /stories.json from Storybook
    buildIframeUrl.ts        constructs iframe.html URLs with args
    argTypes.ts              maps Storybook argTypes to ArgDefinition[]
    useRegistryStore.ts      store for available stories and arg defs

  comments/
    useCommentSync.ts        WebSocket, real-time canvas sync, peer cursors
    CommentPin.tsx           in-canvas comment marker

  export/
    jsxExport.ts             frame → JSX string

packages/server/src/
  index.ts                   Express REST API (/api/files CRUD) + WebSocket room server

packages/storybook/
  src/stories/               example stories using Radix UI + Tailwind
  .storybook/
    preview.ts               SizeReporter decorator — copy this to your own Storybook
    main.ts                  Storybook config (stories glob, addons)

designs/
  *.json                     design files, committed to the repo
```

---

## Known limitations

- **Storybook URL is hardcoded** — `localhost:6006` appears in `loader.ts`, `buildIframeUrl.ts`, and `vite.config.ts`. There's no config file or environment variable yet.
- **No component library abstraction** — each frame has its own independent component list. There's no concept of reusable symbols or shared instances across frames.
- **JSX export is position-only** — exported components use absolute positioning. No flexbox, grid, or responsive layout is generated.
- **Fixed-pixel frames** — frames have explicit pixel dimensions. There's no viewport or breakpoint simulation.
- **Hardcoded author name** — the collaborator display name is `'User'` in `App.tsx`. There's no login or profile system.

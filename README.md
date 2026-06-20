# Storyboard

An experience design canvas for Storybook component libraries.

<img width="1728" height="937" alt="Screenshot 2026-06-20 at 1 52 25 PM" src="https://github.com/user-attachments/assets/9d6ad5fd-711d-4847-b3ac-a3fbaa50e5f9" />



---

## What it does

Storyboard is a design environment for Storybook component libraries. Instead of maintaining a design system in two places, Storyboard lets you design experiences using your actual app's production components — rendered live in the same React tree as the canvas, not as static mockups or sandboxed iframes. Each frame on the canvas is a screen; frames are sequenced in a timeline at the bottom.

Concretely this means:

- Component props changed in the inspector update the live component instantly, one character at a time — no reload
- Each instance on the canvas can have independent content (two Cards with different titles, same story)
- A component with a hover state actually hovers when you mouse over it in interact mode
- The layout you see is the layout your production code would produce, not an approximation
- Portals (dialogs, drawers, sheets) render inside the frame boundary, not at document root
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

`packages/storybook` is a demo library. In practice you replace it with your own component library or add your stories to it.

### How the canvas renders components

Components render **natively** in the same React tree as the canvas — there are no iframes. At build time, Vite eagerly imports every story module via a glob:

```typescript
// packages/app/src/registry/storyRegistry.ts
const storyModules = import.meta.glob(
  '../../../storybook/src/stories/*.stories.tsx',
  { eager: true }
);
```

The registry walks every exported story object, extracts its `render` function (or wraps `meta.component`), merges `meta.args` with story-level `args`, and builds a `StoryEntry` map keyed by story ID. Story IDs match Storybook's own ID format (`sanitize(title)--sanitize(exportName)`) so design files stay compatible with the Storybook URL format.

When a component is placed on the canvas, `ComponentNode` calls `entry.render(instance.args)` directly — no postMessage, no network round-trip.

**Auto-sizing.** A `ResizeObserver` on the component's content div measures the rendered height after each React commit and writes it back to the design store. `minHeight: '100%'` on the content div ensures the component expands to its natural size while still respecting manual resizes (the container's height acts as the min).

**Interact mode.** By default a transparent overlay sits above each component so the canvas can intercept mouse events for dragging and selection. Double-clicking a component removes the overlay and passes pointer events through — you can type in inputs, click buttons, scroll, trigger hover states. Press Escape to exit. Pressing **I** (or the toolbar button) enters global interact mode, which removes overlays from every component at once.

**Frame clipping.** Top-level frames always apply `overflow: hidden`, acting as browser viewport boundaries. Content and portals are clipped to the frame edge — a drawer that slides in stays inside the frame, not floating over the rest of the canvas. Child frames have an optional "Clip Content" toggle in the inspector.

### How story props work

Args are stored in the design store (`ComponentInstance.args`). When the inspector changes a prop, the store is updated and the component re-renders in the same React commit cycle — no message passing, no debounce.

The registry infers `argTypes` from arg values for any arg not explicitly typed in the story (so components with partial `argTypes` get full inspector controls automatically). String args with no defined value default to the formatted arg name (`title` → `"Title"`, `description` → `"Description"`).

For props to be editable from the canvas, content must come through `args`:

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

### How portals work

Components that use React portals (Dialog, Drawer, Sheet, DropdownMenu, etc.) would normally render at `document.body`, bleeding outside the frame. Storyboard redirects portals to a container div that lives inside the outer frame element, so portaled content is:

- Visually clipped by the frame's `overflow: hidden`
- Correctly z-indexed above frame content (the container is `position: absolute; inset: 0; z-index: 9999`)
- Pointer-events-aware (the container uses `pointer-events: none` with targeted re-enabling)

Each Radix UI primitive in `packages/storybook/src/components/ui/` reads a container from `FramePortalContext` (via a custom `portal-context.tsx`) and passes it as the `container` prop to the Radix `Portal` component.

### Dark mode

The canvas UI and all components respond to the system `prefers-color-scheme` setting. All colors are CSS custom properties — switching your OS between light and dark mode updates the toolbar, panels, inspector, and every rendered component instantly.

Background color tokens (`background`, `card`, `muted`, etc.) in the color picker are stored as `hsl(var(--card))` in the design file and resolve at runtime against the same shadcn/ui CSS variable definitions the component library uses, so frames and components stay in sync across theme switches.

### Design file storage

Design files are plain JSON at `designs/<uuid>.json`. They're committed to the repo alongside source code — designs are treated as artifacts that belong in version control, not in a separate database.

The file format is exactly the `DesignFile` interface from `packages/app/src/types.ts`. Claude Code and other LLM tools can read a design file directly from the repo, reason about the layout, and make changes programmatically.

Auto-save fires 1 second after any change via a Zustand subscription in `useAutoSave.ts`.

### Undo

Every structural mutation (add/move/delete, layout changes, text edits) pushes a snapshot of `DesignFile` onto a history stack (max 50 entries). The dedup key is `file.updatedAt` — rapid consecutive calls within the same action don't create separate history entries. Drag operations push once on the first pixel of movement; inspector field edits push on focus so each field session is one undo step.

### Auto-layout

Frames have an optional auto-layout mode (Shift+A, or the inspector toggle). When enabled, children flow horizontally or vertically with configurable gap, padding, and alignment — similar to Figma's auto-layout. The layout engine is a pure TypeScript function in `canvas/autoLayout.ts` that runs synchronously every render.

Child sizing modes:
- **fixed** — explicit stored width/height
- **fill** — expands to consume remaining space in the flow direction
- **hug** — sizes to natural content; for text layers, measured via `ResizeObserver`

All spacing values (gap, padding) are constrained to the Tailwind default spacing scale and displayed as token + pixel value (e.g. `4 — 16px`).

### Nested frames

Frames can contain child frames, enabling nested auto-layouts — for example, a horizontal row of cards inside a vertically-stacked screen. Draw the frame tool inside an existing frame to create a child frame. Child frames can have their own independent auto-layout and a "Clip Content" toggle. The data model is recursive: `Frame.frames?: Frame[]`. All store mutations use recursive helpers so they work at any nesting depth.

### Viewport

The canvas supports pinch-to-zoom centered on the cursor position. On load the viewport fits all frames with padding. Clicking a frame in the timeline centers and fits that frame.

### Timeline

The horizontal strip at the bottom shows frames in sequence order. Frames can be drag-reordered. Clicking a card selects the frame and fits the viewport to it. Frames can be hidden from the timeline (inspector → Timeline → Hidden) while staying on the canvas.

### Real-time collaboration

The server maintains a WebSocket room per file ID. When any connected client modifies the design, it broadcasts the full file state to the room. Cursor positions are broadcast at ~30fps. The connection reconnects automatically with exponential backoff. Peer cursors appear as colored dots on the canvas.

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

This starts three processes concurrently:
- Storybook dev server at `http://localhost:6006` (for browsing stories independently)
- Canvas UI at `http://localhost:1618`
- API + WebSocket server at `http://localhost:3333`

Open `http://localhost:1618`. The first screen is the file picker. Create a new file or open an existing one from `designs/`.

> The canvas does **not** depend on the Storybook server at runtime — components are imported directly at build time. The Storybook process is only needed for browsing stories in the standard Storybook UI.

---

## Connecting your own component library

Because components are imported via Vite's `import.meta.glob` rather than fetched from a running Storybook server, connecting your library means making its story files importable from the canvas app.

### Option A — Add stories directly to `packages/storybook`

Drop your `.stories.tsx` files into `packages/storybook/src/stories/`. The glob in `storyRegistry.ts` picks them up automatically:

```
packages/storybook/src/stories/MyComponent.stories.tsx
```

Make sure your component and any peer dependencies are available to the storybook package.

### Option B — Point the glob at your own package

Add your package to the workspace in `package.json`, then update the glob in `packages/app/src/registry/storyRegistry.ts`:

```typescript
const storyModules = import.meta.glob(
  '../../../your-library/src/**/*.stories.tsx',
  { eager: true }
);
```

Run `npm install` from the repo root to link the workspace package.

### Story format

Stories must export a `default` meta object and named story exports. The story's `args` drive the inspector — any arg with a value gets an editable control automatically:

```tsx
// your-library/src/stories/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { variant: 'default', children: 'Click me' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete' },
};
```

No decorators, no postMessage, no config files to add. The canvas reads `args`, `argTypes`, and `render` directly from the exported story objects.

### Portals (dialogs, drawers, sheets)

If your components use Radix UI (or any library that uses React portals), wire them up to `FramePortalContext` so portaled content stays inside the frame boundary:

```tsx
// packages/storybook/src/components/ui/portal-context.tsx
import { createContext, useContext } from 'react';
export const FramePortalContext = createContext<HTMLElement | null>(null);
export function usePortalContainer() {
  return useContext(FramePortalContext) ?? document.body;
}
```

Then pass `container={usePortalContainer()}` to your Radix `Portal` components. The canvas sets the context to a div inside the frame boundary, so portaled content is clipped by the frame.

---

## Using the tool

### Canvas shortcuts

| Action | Shortcut |
|--------|----------|
| Select tool | V |
| Frame tool | F |
| Comment tool | C |
| Interact mode (global) | I |
| Pan canvas | Space + drag, or middle mouse drag |
| Zoom to cursor | Trackpad pinch, or Cmd/Ctrl + scroll |
| Toggle auto-layout | Shift+A (with frame selected) |
| Group selected items into a frame | Cmd/Ctrl+G |
| Constrain drag to axis | Shift + drag |
| Delete selected | Delete |
| Undo | Cmd/Ctrl+Z |
| Enter child frame / group | Double-click |
| Exit child frame / group | Escape |

### Adding components to a frame

Drag a story from the Components panel onto a frame. The component renders immediately and auto-sizes to its natural dimensions. Dropping onto empty canvas creates a frame automatically.

### Editing component content

Select a component to see its props in the Inspect panel under **PROPS**. Each arg defined in the story appears as an input control. Changes take effect instantly — no reload, one character at a time. Different instances of the same story can have independent content.

### Interacting with components

**Double-click** any component to enter per-component interact mode. The overlay is removed; pointer events pass through to the component. Press Escape to exit.

**Press I** (or the toolbar button) to enter global interact mode — all components on the canvas become interactive at once. Press I again or Escape to exit. Entering interact mode deselects everything.

In interact mode, two-finger scroll over a scroll area scrolls the content; the canvas does not pan.

### Text layers

Open the Text tab to browse the Tailwind type scale. Click a row to add a text layer to the selected frame. Drag to position. Double-click any text layer on the canvas to edit it inline.

### Nested frames

Select the frame tool (F) and draw inside an existing frame to create a child frame. The child frame participates in its parent's auto-layout flow. Child frames can have their own auto-layout, a "Clip Content" toggle, and all the same inspector controls as top-level frames.

**Selection model (Figma-style):** Clicking a child frame selects it as a unit. Double-click to enter it and select its individual children. Press Escape to step back out.

### Frame clipping

Top-level frames always clip their content — they behave like browser viewport windows. A component that opens a drawer or sheet will render that drawer inside the frame boundary. Child frames have an optional **Clip Content** toggle in the inspector (off by default).

### Auto-layout

Press Shift+A with a frame selected to enable auto-layout. Use the Inspect panel to set direction, gap, padding, alignment, and sizing modes. All spacing values snap to the Tailwind scale. Drag children within the frame to reorder. Press Shift+A again to disable.

### Alignment and distribution

Select two or more items to see alignment controls in the Inspect panel. Align edges or centers, distribute with equal spacing, or tidy up into a grid.

### Timeline management

Frames shown in the timeline represent your demo flow. To remove a frame from the timeline without deleting it, select it and toggle **Timeline → Hidden** in the inspector.

### JSX export

Menu (≡) → Export JSX generates a React component for any frame. Auto-layout frames produce a `className` string using Tailwind utility classes for all spacing and flex properties. Semantic background tokens (`hsl(var(--background))` etc.) are preserved as-is.

---

## Component library

`packages/storybook` ships stories for the complete [shadcn/ui](https://ui.shadcn.com/docs/components) component set — 45+ components with multiple story variants each:

Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, EmptyState, Form, HoverCard, Input, InputOTP, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toggle, ToggleGroup, Tooltip

All stories use the `args` pattern so every component's props are editable live from the canvas inspector.

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
      "backgroundColor": "hsl(var(--background))",
      "inTimeline": true,
      "autoLayout": {
        "direction": "vertical",
        "gap": 16,
        "paddingTop": 24, "paddingRight": 16, "paddingBottom": 24, "paddingLeft": 16,
        "primaryAlign": "start", "counterAlign": "start",
        "widthMode": "fixed", "heightMode": "hug",
        "wrap": false
      },
      "flowOrder": ["<text-layer-id>", "<component-id>", "<child-frame-id>"],
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
          "color": "hsl(var(--foreground))",
          "widthMode": "hug", "heightMode": "hug",
          "visible": true, "locked": false
        }
      ],
      "frames": [
        {
          "id": "<child-frame-id>",
          "label": "Row",
          "x": 16, "y": 200, "width": 343, "height": 80,
          "backgroundColor": "transparent",
          "components": [],
          "clipContent": true,
          "autoLayout": { "direction": "horizontal", "gap": 8 }
        }
      ]
    }
  ],
  "comments": []
}
```

`storybookId` matches the story's export name processed through Storybook's own ID algorithm (`sanitize(title)--sanitize(exportName)`). If a story is renamed, instances referencing the old ID will show a placeholder until updated.

---

## Project structure

```
packages/app/src/
  App.tsx                    root: keyboard shortcuts, drag-drop wiring, layout
  types.ts                   all shared TypeScript interfaces + Tailwind spacing scale

  canvas/
    Canvas.tsx               pan/zoom/rubber-band, frame tool, wheel event routing
    FrameNode.tsx            frame resize, auto-layout reorder drag, portal context provider
    ComponentNode.tsx        native component render, interact mode overlay, auto-size via ResizeObserver
    TextLayerNode.tsx        inline text editing, hug-size via ResizeObserver
    ResizeHandles.tsx        8-direction resize handles used by frames + components
    autoLayout.ts            pure layout engine, unified FlowItem abstraction

  components/
    Toolbar.tsx              tool switcher, zoom controls, file menu, interact mode toggle
    LayersPanel.tsx          recursive frame/component/text layer tree, visibility toggles
    ComponentPalette.tsx     searchable story list from the registry
    TextPalette.tsx          Tailwind type scale browser, draggable rows
    PropsInspector.tsx       context-sensitive inspector (frame / child frame / component / text layer)
    FilePicker.tsx           file list, create/open/delete

  timeline/
    StoryboardTimeline.tsx   bottom frame strip, wireframe thumbnails, drag reorder

  store/
    useDesignStore.ts        all design state + 50-step undo; recursive frame helpers
    useCanvasStore.ts        viewport, active tool, interact mode
    useAutoSave.ts           debounced save (1s) on state change
    api.ts                   REST client for /api/files

  registry/
    storyRegistry.ts         eagerly imports all *.stories.tsx via import.meta.glob;
                             builds StoryEntry map (id → render fn + defaultArgs + argDefs)
    argTypes.ts              maps Storybook argTypes to ArgDefinition[]
    useRegistryStore.ts      store for available stories (read from storyRegistry)

  comments/
    useCommentSync.ts        WebSocket, real-time canvas sync, peer cursors
    CommentPin.tsx           in-canvas comment marker

  export/
    jsxExport.ts             frame → JSX string

packages/server/src/
  index.ts                   Express REST API (/api/files CRUD) + WebSocket room server

packages/storybook/
  src/stories/               45+ shadcn/ui component stories (all using args pattern)
  src/components/ui/         full shadcn/ui component library
    portal-context.tsx       FramePortalContext — redirects Radix portals into the frame boundary
  .storybook/
    preview.ts               Storybook preview config (for storybook dev server only)
    main.ts                  Storybook config

designs/
  *.json                     design files, committed to the repo
```

---

## Known limitations

- **No component library abstraction** — each frame has its own independent component list. There's no concept of reusable symbols or shared instances across frames.
- **JSX export is flat** — the exporter generates correct flexbox JSX for top-level auto-layout frames but does not recurse into nested child frames.
- **Hardcoded story renders** — stories that use `render: () => (...)` with no `args` won't show editable props. Migrate content to `args` to make it editable.
- **Glob is static at build time** — adding a new `.stories.tsx` file requires a Vite HMR reload to pick up the new story. The palette refreshes automatically during development; no manual restart needed.

# Storyboard

A design environment for Storybook component libraries.

<img width="3456" height="1868" alt="CleanShot 2026-06-21 at 20 11 52@2x" src="https://github.com/user-attachments/assets/a2702723-eb5d-4886-8d43-8ea870456e8b" />

<img width="1728" height="933" alt="Screenshot 2026-06-21 at 8 56 21 PM" src="https://github.com/user-attachments/assets/53fe0362-2302-4e00-864a-9a2b3f267a2c" />

---

## Why this exists

Most teams keep their component library twice: once in code, once in a design tool that mirrors it. The two drift, and keeping them aligned is ongoing work.

Storyboard is a design canvas whose only component library is your Storybook. Every element on the canvas is a live production component, and every frame you compose is written back to the repo as a real .tsx story. One source of truth; the output of design is code, not a spec to reinterpret.

Because the design lives in the repo as readable story files and JSON, it's also part of the context an agent reads when working on the codebase — no separate design system to reconcile, no handoff to encode.

Concretely:

- Interaction states are real — hover a component and it hovers, type in an input, open a dropdown
- Portals (dialogs, drawers, sheets) render and clip inside the frame, like a real viewport boundary
- Every instance can hold independent content, so the same story appears as different concrete screens
- Each frame is a committed .tsx story — design changes show up as readable git diffs alongside the code

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

Components render natively in the same React tree as the canvas. At build time, Vite eagerly imports every story module via a glob:

```typescript
// packages/app/src/registry/storyRegistry.ts
const storyModules = import.meta.glob(
  [
    '../../../storybook/src/stories/*.stories.tsx',
    '../../../storybook/src/stories/local/*.stories.tsx',
  ],
  { eager: true }
);
```

The registry walks every exported story object, extracts its `render` function (or wraps `meta.component`), merges `meta.args` with story-level `args`, and builds a `StoryEntry` map keyed by story ID. Story IDs match Storybook's own ID format (`sanitize(title)--sanitize(exportName)`) so design files stay compatible with the Storybook URL format.

When a component is placed on the canvas, `ComponentNode` calls `entry.render(instance.args)` directly.

The `local/` directory is listed in `vite.config.ts` under `server.watch.ignored` so the auto-save writes that happen every second do not trigger HMR.

**Auto-sizing.** A `ResizeObserver` on the component's content div measures the rendered height after each React commit and writes it back to the design store. `minHeight: '100%'` on the content div ensures the component expands to its natural size while still respecting manual resizes.

**Interact mode.** By default a transparent overlay sits above each component so the canvas can intercept mouse events for dragging and selection. Pressing **I** (or the toolbar button) enters global interact mode, which removes overlays from every component at once — you can type in inputs, click buttons, scroll, and trigger hover states. Press I again or Escape to exit.

**Frame clipping.** Top-level frames always apply `overflow: hidden`, acting as browser viewport boundaries. Content and portals are clipped to the frame edge — a drawer that slides in stays inside the frame. Child frames have an optional "Clip Content" toggle in the inspector.

### How story props work

Args are stored in the design store (`ComponentInstance.args`). When the inspector changes a prop, the store is updated and the component re-renders in the same React commit cycle.

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

### List-driven components (required convention)

For components with repeating items — Accordion rows, Select options, radio buttons, menu items, tabs — move the items array into `args` and map over it in the render function. Storyboard detects any `args` field whose value is an array of objects and renders an inline list editor: add rows, remove rows, and edit each field directly from the canvas.

```tsx
// ✅ Items are editable from the canvas
type AccordionItem = { value: string; trigger: string; content: string };

export const Default: Story = {
  args: {
    items: [
      { value: 'item-1', trigger: 'Is it accessible?', content: 'Yes.' },
      { value: 'item-2', trigger: 'Is it styled?', content: 'Yes.' },
    ],
  },
  argTypes: { items: { control: { type: 'object' } } },
  render: ({ items }) => (
    <Accordion type="single" collapsible>
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.trigger}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
};

// ✗ Hardcoded — items are not editable from the canvas
export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">...</AccordionItem>
      <AccordionItem value="item-2">...</AccordionItem>
    </Accordion>
  ),
};
```

Components that don't follow this pattern still work on the canvas, but their items aren't individually editable.

**Migrating an existing library:** This is a mechanical refactor. For each list-driven component, extract the hardcoded items into a typed array, add it to `args`, add `argTypes: { items: { control: { type: 'object' } } }`, and map over it in the render function. See [`STORYBOARD_MIGRATION.md`](./STORYBOARD_MIGRATION.md) for a ready-to-use Claude Code prompt that does this automatically.

### Slots

A component instance can contain child component instances via named slots. The data model:

```typescript
// ComponentInstance
slots?: Record<string, ComponentInstance[]>
```

Keys are slot names (`children`, `header`, `footer`, etc.); values are arrays of `ComponentInstance`.

**Declaring slots in a story.** Add `type: 'slot'` to any arg in `argTypes`:

```tsx
const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  argTypes: {
    children: { type: 'slot' },
  },
};
```

Slot-typed args are hidden from the props inspector and rendered via the slot tree instead.

**Filling a slot on the canvas.** Drag a component from the palette and drop it onto an existing component. If the target has any slot argTypes, the dropped component is placed into the first available slot. Slot children appear nested in the Layers panel under their parent with a `└` prefix and slot name badge. They also appear in the inspector under SLOTS with ✕ remove buttons.

**JSX export.** The exporter recurses into `instance.slots` and emits proper JSX nesting: `<Card><Button /></Card>`. Named (non-`children`) slots emit a `{/* slot: name */}` comment placeholder.

The recursive renderer (`canvas/renderInstance.ts`) handles slots at display time: slot children are rendered as React children of their parent component, at every depth.

### How portals work

Components that use React portals (Dialog, Drawer, Sheet, DropdownMenu, etc.) render into a container div that lives inside the outer frame element, so portaled content is:

- Visually clipped by the frame's `overflow: hidden`
- Correctly z-indexed above frame content (the container is `position: absolute; inset: 0; z-index: 9999`)
- Pointer-events-aware (the container uses `pointer-events: none` with targeted re-enabling)

Each Radix UI primitive in `packages/storybook/src/components/ui/` reads a container from `FramePortalContext` (via `portal-context.tsx`) and passes it as the `container` prop to the Radix `Portal` component.

### Dark mode

The canvas UI and all components respond to the system `prefers-color-scheme` setting. All colors are CSS custom properties — switching your OS between light and dark mode updates the toolbar, panels, inspector, and every rendered component instantly.

Background color tokens (`background`, `card`, `muted`, etc.) in the color picker are stored as `hsl(var(--card))` in the design file and resolve at runtime against the same shadcn/ui CSS variable definitions the component library uses, so frames and components stay in sync across theme switches.

### Design file storage

Design files are plain JSON at `designs/<uuid>.json`. They're committed to the repo alongside source code — designs are treated as artifacts that belong in version control, not in a separate database.

The file format is exactly the `DesignFile` interface from `packages/app/src/types.ts`. LLM tools can read a design file directly from the repo and reason about layout or make changes programmatically.

Auto-save fires 1 second after any change via a Zustand subscription in `useAutoSave.ts`.

### Local stories

Every frame auto-saves as a `.tsx` Storybook story file alongside the JSON design:

```
packages/storybook/src/stories/local/{PascalName}.stories.tsx
```

The filename is derived from the frame label: `Frame 1` → `Frame1.stories.tsx`, `Hero Section` → `HeroSection.stories.tsx`. Renaming a frame deletes the old file and writes the new one (files are keyed by frame ID embedded in the `@storyboard` comment).

**File format:**

```tsx
// @storyboard {"id":"abc123","label":"Hero Section","width":390,"height":844,...}
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../../components/ui/card';

const HeroSection = () => (
  <div style={{ width: 390, height: 844, ... }}>
    <Card title="Hello" />
  </div>
);

const meta = { title: 'Local/HeroSection', component: HeroSection } satisfies Meta<typeof HeroSection>;
export default meta;
export const Default: StoryObj<typeof HeroSection> = {};
```

The `// @storyboard` comment on line 1 is the round-trip payload — it contains the full serialized `Frame` JSON. The JSX body is human-readable and produces meaningful git diffs. The comment is authoritative; the JSX is for human consumption.

**Two-way sync.** The server watches `LOCAL_STORIES_DIR` with Node's `fs.watch` and a 300ms debounce. When an external editor saves a file, the server parses the `@storyboard` comment and broadcasts `{ type: 'frame-updated', frame }` via WebSocket to all connected clients. The canvas applies the incoming frame using `loadFrame` (which does not bump `updatedAt`), so the auto-save subscriber does not treat the externally-sourced change as a new canvas edit and write it back.

**Local palette.** Local stories appear in the Components panel under **Local** (below library groups). They are draggable onto the canvas like any library story.

### Undo

Every structural mutation (add/move/delete, layout changes, text edits) pushes a snapshot of `DesignFile` onto a history stack (max 50 entries). The dedup key is `file.updatedAt` — rapid consecutive calls within the same action don't create separate history entries. Drag operations push once on the first pixel of movement; inspector field edits push on focus so each field session is one undo step.

### Auto-layout

Frames have an optional auto-layout mode (Shift+A, or the inspector toggle). When enabled, children flow horizontally or vertically with configurable gap, padding, and alignment. The layout engine is a pure TypeScript function in `canvas/autoLayout.ts` that runs synchronously every render.

Child sizing modes:
- **fixed** — explicit stored width/height
- **fill** — expands to consume remaining space in the flow direction
- **hug** — sizes to natural content; for text layers, measured via `ResizeObserver`

All spacing values (gap, padding) are constrained to the Tailwind default spacing scale and displayed as token + pixel value (e.g. `4  16px`).

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
- Storybook dev server at `http://localhost:6006`
- Canvas UI at `http://localhost:1618`
- API + WebSocket server at `http://localhost:3333`

Open `http://localhost:1618`. The first screen is the file picker. Create a new file or open an existing one from `designs/`.

> The canvas does not depend on the Storybook server at runtime — components are imported directly at build time. The Storybook process is only needed for browsing stories in the standard Storybook UI.

---

## Connecting your own component library

Components are imported via Vite's `import.meta.glob`, so connecting your library means making its story files importable from the canvas app.

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

To fill a slot, drag a component from the palette and drop it onto an existing component that has slot argTypes defined. The dropped component is added as a child of the target's first available slot.

### Editing component content

Select a component to see its props in the Inspect panel under **PROPS**. Each arg defined in the story appears as an input control. Changes take effect instantly — one character at a time. Different instances of the same story can have independent content.

### Inspector Code tab

The frame inspector has a Properties | Code tab bar at the top. The **Code** tab shows live JSX for the selected frame — slot-aware, updated as you edit. A Copy button in the top-right copies the output to clipboard.

### Interacting with components

**Press I** (or the toolbar button) to enter global interact mode — all components on the canvas become interactive at once. Press I again or Escape to exit.

In interact mode, two-finger scroll over a scroll area scrolls the content; the canvas does not pan.

### Text layers

Open the Text tab to browse the Tailwind type scale. Click a row to add a text layer to the selected frame. Drag to position. Double-click any text layer on the canvas to edit it inline.

### Nested frames

Select the frame tool (F) and draw inside an existing frame to create a child frame. The child frame participates in its parent's auto-layout flow. Child frames can have their own auto-layout, a "Clip Content" toggle, and all the same inspector controls as top-level frames.

**Selection model:** Clicking a child frame selects it as a unit. Click a child component in the Layers panel to select it directly. Press Escape to step back out.

### Auto-layout

Press Shift+A with a frame selected to enable auto-layout. Use the Inspect panel to set direction, gap, padding, alignment, and sizing modes. All spacing values snap to the Tailwind scale. Drag children within the frame to reorder. Press Shift+A again to disable.

### Alignment and distribution

Select two or more items to see alignment controls in the Inspect panel. Align edges or centers, distribute with equal spacing.

### Timeline management

Frames shown in the timeline represent your demo flow. To remove a frame from the timeline without deleting it, select it and toggle **Timeline → Hidden** in the inspector.

### JSX export

Menu (≡) → Export JSX generates a React component for any frame. Auto-layout frames produce a `className` string using Tailwind utility classes. Slot compositions are emitted as nested JSX. Semantic background tokens (`hsl(var(--background))` etc.) are preserved as-is.

---

## Component library

`packages/storybook` ships stories for the complete [shadcn/ui](https://ui.shadcn.com/docs/components) component set — 46+ components with multiple story variants each:

Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, ButtonGroup, Calendar, Card, Carousel, Checkbox, Collapsible, Command, ContextMenu, DataTable, Dialog, Drawer, DropdownMenu, EmptyState, Form, HoverCard, Input, InputOTP, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toggle, ToggleGroup, Tooltip

All stories use the `args` pattern so every component's props are editable live from the canvas inspector. Card, Dialog, Sheet, and Popover have `children` slot argTypes defined, so components can be dropped directly into them.

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
          "storybookId": "ui-card--default",
          "title": "UI/Card", "name": "Default",
          "x": 16, "y": 100, "width": 343, "height": 200,
          "args": { "title": "Your cart" },
          "slots": {
            "children": [
              {
                "id": "<uuid>",
                "storybookId": "ui-button--default",
                "args": { "children": "Checkout" }
              }
            ]
          },
          "widthMode": "fill", "heightMode": "hug",
          "visible": true, "locked": false,
          "label": "Card · Default"
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
      "frames": []
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
    renderInstance.ts        recursive React renderer for ComponentInstance trees with slot support

  components/
    Toolbar.tsx              tool switcher, zoom controls, file menu, interact mode toggle
    LayersPanel.tsx          recursive frame/component/text layer tree; slot children shown nested
    ComponentPalette.tsx     searchable story list; Local section below library groups
    TextPalette.tsx          Tailwind type scale browser, draggable rows
    PropsInspector.tsx       context-sensitive inspector; frame view has Properties|Code tab
    FilePicker.tsx           file list, create/open/delete

  timeline/
    StoryboardTimeline.tsx   bottom frame strip, wireframe thumbnails, drag reorder

  store/
    useDesignStore.ts        all design state + 50-step undo; recursive frame helpers
    useCanvasStore.ts        viewport, active tool, interact mode
    useAutoSave.ts           debounced save (1s): JSON to /api/files + .tsx to /api/local-stories/batch
    api.ts                   REST client for /api/files and /api/local-stories

  registry/
    storyRegistry.ts         imports all *.stories.tsx + local/*.stories.tsx at build time;
                             builds StoryEntry map (id → render fn + defaultArgs + argDefs)
    argTypes.ts              maps Storybook argTypes to ArgDefinition[]
    useRegistryStore.ts      store for available stories

  comments/
    useCommentSync.ts        WebSocket, real-time canvas sync, peer cursors, frame-updated handler
    CommentPin.tsx           in-canvas comment marker

  export/
    jsxExport.ts             frame → JSX string (slot-aware via renderInstanceString);
                             buildLocalStoryFile generates .tsx with @storyboard metadata comment

packages/server/src/
  index.ts                   Express REST API (/api/files CRUD, /api/local-stories/batch)
                             + WebSocket room server + fs.watch on stories/local/ for two-way sync

packages/storybook/
  src/stories/               46+ shadcn/ui component stories (all using args pattern)
  src/stories/local/         auto-generated per-frame story files; committed to git
  src/components/ui/         full shadcn/ui component library
    portal-context.tsx       FramePortalContext — redirects Radix portals into the frame boundary
  .storybook/
    preview.ts               Storybook preview config
    main.ts                  Storybook config

designs/
  *.json                     design files, committed to the repo
```

---

## Known limitations

- **No shared instances** — each frame has its own independent component list. There's no concept of reusable symbols or shared instances across frames; changing a component in one frame does not update it elsewhere.
- **Hardcoded story renders** — stories that use `render: () => (...)` with no `args` won't show editable props. Migrate content to `args` to make it editable.
- **Local palette requires reload for new frames** — local stories are resolved via `import.meta.glob` at app startup. Frames created or renamed during the current session need a page reload to appear in the Local section of the component palette.
- **Glob is static at build time** — adding a new `.stories.tsx` file to the main library requires a Vite HMR reload to pick up the new story. The palette refreshes automatically during development.

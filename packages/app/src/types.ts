export interface StorybookStory {
  id: string;
  title: string;
  name: string;
  importPath?: string;
  componentName?: string;
}

export interface StorybookIndex {
  v: number;
  entries: Record<string, StorybookStory & { type?: string }>;
}

export interface ArgDefinition {
  name: string;
  type: 'text' | 'boolean' | 'number' | 'select' | 'color' | 'object' | 'slot';
  defaultValue?: unknown;
  options?: string[];
  description?: string;
}

export type SizingMode = 'fixed' | 'fill' | 'hug';

export interface AutoLayoutSettings {
  direction: 'horizontal' | 'vertical';
  wrap: boolean;
  gap: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  primaryAlign: 'start' | 'center' | 'end' | 'space-between';
  counterAlign: 'start' | 'center' | 'end';
  widthMode: 'fixed' | 'hug';
  heightMode: 'fixed' | 'hug';
}

export interface ComponentInstance {
  id: string;
  storybookId: string;
  title: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  args: Record<string, unknown>;
  locked: boolean;
  visible: boolean;
  label: string;
  widthMode?: SizingMode;
  heightMode?: SizingMode;
  absolute?: boolean;
  slots?: Record<string, ComponentInstance[]>;
}

// ── Tailwind spacing scale ────────────────────────────────────────────────────
// Each entry: token name → pixel value (1 unit = 4px in Tailwind's default scale)
export const TAILWIND_SPACING: { token: string; px: number }[] = [
  { token: '0',    px: 0   },
  { token: '0.5',  px: 2   },
  { token: '1',    px: 4   },
  { token: '1.5',  px: 6   },
  { token: '2',    px: 8   },
  { token: '2.5',  px: 10  },
  { token: '3',    px: 12  },
  { token: '3.5',  px: 14  },
  { token: '4',    px: 16  },
  { token: '5',    px: 20  },
  { token: '6',    px: 24  },
  { token: '7',    px: 28  },
  { token: '8',    px: 32  },
  { token: '9',    px: 36  },
  { token: '10',   px: 40  },
  { token: '11',   px: 44  },
  { token: '12',   px: 48  },
  { token: '14',   px: 56  },
  { token: '16',   px: 64  },
  { token: '20',   px: 80  },
  { token: '24',   px: 96  },
  { token: '28',   px: 112 },
  { token: '32',   px: 128 },
  { token: '36',   px: 144 },
  { token: '40',   px: 160 },
  { token: '44',   px: 176 },
  { token: '48',   px: 192 },
  { token: '52',   px: 208 },
  { token: '56',   px: 224 },
  { token: '60',   px: 240 },
  { token: '64',   px: 256 },
  { token: '72',   px: 288 },
  { token: '80',   px: 320 },
  { token: '96',   px: 384 },
];

export function snapToSpacing(px: number): number {
  const vals = TAILWIND_SPACING.map((s) => s.px);
  return vals.reduce((best, v) => Math.abs(v - px) < Math.abs(best - px) ? v : best, vals[0]);
}

export function spacingToken(px: number): string {
  return TAILWIND_SPACING.find((s) => s.px === px)?.token ?? String(px);
}

// ── Text layers ───────────────────────────────────────────────────────────────

export const TAILWIND_FONT_SIZES = [
  { key: 'xs',   label: 'text-xs',   px: 12,  lineHeight: 16 },
  { key: 'sm',   label: 'text-sm',   px: 14,  lineHeight: 20 },
  { key: 'base', label: 'text-base', px: 16,  lineHeight: 24 },
  { key: 'lg',   label: 'text-lg',   px: 18,  lineHeight: 28 },
  { key: 'xl',   label: 'text-xl',   px: 20,  lineHeight: 28 },
  { key: '2xl',  label: 'text-2xl',  px: 24,  lineHeight: 32 },
  { key: '3xl',  label: 'text-3xl',  px: 30,  lineHeight: 36 },
  { key: '4xl',  label: 'text-4xl',  px: 36,  lineHeight: 40 },
  { key: '5xl',  label: 'text-5xl',  px: 48,  lineHeight: 48 },
  { key: '6xl',  label: 'text-6xl',  px: 60,  lineHeight: 60 },
  { key: '7xl',  label: 'text-7xl',  px: 72,  lineHeight: 72 },
  { key: '8xl',  label: 'text-8xl',  px: 96,  lineHeight: 96 },
  { key: '9xl',  label: 'text-9xl',  px: 128, lineHeight: 128 },
] as const;

export type TailwindFontSize = typeof TAILWIND_FONT_SIZES[number]['key'];

export const TAILWIND_FONT_WEIGHTS = [
  { key: 'thin',       label: 'Thin',        value: 100 },
  { key: 'extralight', label: 'Extra Light', value: 200 },
  { key: 'light',      label: 'Light',       value: 300 },
  { key: 'normal',     label: 'Normal',      value: 400 },
  { key: 'medium',     label: 'Medium',      value: 500 },
  { key: 'semibold',   label: 'Semibold',    value: 600 },
  { key: 'bold',       label: 'Bold',        value: 700 },
  { key: 'extrabold',  label: 'Extra Bold',  value: 800 },
  { key: 'black',      label: 'Black',       value: 900 },
] as const;

export type TailwindFontWeight = typeof TAILWIND_FONT_WEIGHTS[number]['key'];

export interface TextLayer {
  id: string;
  type: 'text';
  label: string;
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: TailwindFontSize;
  fontWeight: TailwindFontWeight;
  color: string;
  visible: boolean;
  locked: boolean;
  absolute?: boolean;
  widthMode?: SizingMode;
  heightMode?: SizingMode;
}

// ── Frame ─────────────────────────────────────────────────────────────────────

export interface Frame {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  components: ComponentInstance[];
  textLayers?: TextLayer[];
  frames?: Frame[];
  autoLayout?: AutoLayoutSettings;
  flowOrder?: string[];
  visible?: boolean;
  absolute?: boolean;
  widthMode?: SizingMode;
  heightMode?: SizingMode;
  locked?: boolean;
  inTimeline?: boolean;
  localStoryName?: string;
  clipContent?: boolean;
}

export interface CommentReply {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  frameId: string;
  x: number;
  y: number;
  text: string;
  author: string;
  timestamp: number;
  read: boolean;
  resolved: boolean;
  replies: CommentReply[];
}

export type TransitionTrigger =
  | { type: 'component-click'; componentId: string; itemValue?: string }
  | { type: 'component-submit'; componentId: string }
  | { type: 'arg-change'; componentId: string; argName: string; condition: 'truthy' | 'equals'; value?: string }
  | { type: 'timer'; seconds: number }
  | { type: 'manual' };

export type TransitionCondition =
  | { type: 'arg-truthy'; componentId: string; argName: string }
  | { type: 'arg-falsy'; componentId: string; argName: string }
  | { type: 'arg-equals'; componentId: string; argName: string; value: string }
  | { type: 'arg-not-equals'; componentId: string; argName: string; value: string };

export interface FrameTransition {
  id: string;
  fromFrameId: string;
  toFrameId: string;
  trigger: TransitionTrigger;
  conditions?: TransitionCondition[];
  label: string;
}

export interface DesignFile {
  version: 1;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  frames: Frame[];
  comments: Comment[];
  transitions?: FrameTransition[];
}

export interface FileListItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export type Tool = 'select' | 'frame' | 'text' | 'comment' | 'pan';

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

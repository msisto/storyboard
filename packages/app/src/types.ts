export interface StorybookStory {
  id: string;
  title: string;
  name: string;
  importPath?: string;
}

export interface StorybookIndex {
  v: number;
  entries: Record<string, StorybookStory & { type?: string }>;
}

export interface ArgDefinition {
  name: string;
  type: 'text' | 'boolean' | 'number' | 'select' | 'color' | 'object';
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
  autoLayout?: AutoLayoutSettings;
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
  resolved: boolean;
  replies: CommentReply[];
}

export interface DesignFile {
  version: 1;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  frames: Frame[];
  comments: Comment[];
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

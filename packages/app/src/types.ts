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
}

export interface Frame {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  components: ComponentInstance[];
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

export type Tool = 'select' | 'frame' | 'comment' | 'pan';

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

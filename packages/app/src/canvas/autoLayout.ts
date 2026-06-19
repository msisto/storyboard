import type { Frame, AutoLayoutSettings, SizingMode } from '../types';
import { TAILWIND_FONT_SIZES } from '../types';

export interface ChildGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedLayout {
  components: Record<string, ChildGeometry>;
  frameWidth: number;
  frameHeight: number;
}

// Minimum shape needed by the layout engine — satisfied by both ComponentInstance and TextLayer
interface FlowItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  absolute?: boolean;
  widthMode?: SizingMode;
  heightMode?: SizingMode;
}

function textLayerNaturalHeight(fontSize: string): number {
  return TAILWIND_FONT_SIZES.find((s) => s.key === fontSize)?.lineHeight ?? 24;
}

function toFlowItem(item: { id: string; x: number; y: number; width?: number; height?: number; visible: boolean; absolute?: boolean; widthMode?: SizingMode; heightMode?: SizingMode; fontSize?: string }, fallbackW = 200): FlowItem {
  return {
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.width ?? fallbackW,
    height: item.height ?? (item.fontSize ? textLayerNaturalHeight(item.fontSize) : 40),
    visible: item.visible,
    absolute: item.absolute,
    widthMode: item.widthMode,
    heightMode: item.heightMode,
  };
}

export function computeAutoLayout(frame: Frame): ComputedLayout {
  if (!frame.autoLayout) {
    const components: Record<string, ChildGeometry> = {};
    for (const c of frame.components) {
      components[c.id] = { x: c.x, y: c.y, width: c.width, height: c.height };
    }
    for (const t of frame.textLayers ?? []) {
      components[t.id] = {
        x: t.x,
        y: t.y,
        width: t.width ?? 200,
        height: t.height ?? textLayerNaturalHeight(t.fontSize),
      };
    }
    return { components, frameWidth: frame.width, frameHeight: frame.height };
  }

  const al = frame.autoLayout;

  // Build combined flow sorted by flowOrder when present
  const allItems: FlowItem[] = [
    ...frame.components.map((c) => toFlowItem(c)),
    ...(frame.textLayers ?? []).map((t) => toFlowItem(t)),
  ];
  if (frame.flowOrder) {
    const order = frame.flowOrder;
    allItems.sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
  }

  if (al.direction === 'horizontal') {
    return computeHorizontal(frame, al, allItems);
  } else {
    return computeVertical(frame, al, allItems);
  }
}

// ── Horizontal ────────────────────────────────────────────────────────────────

function computeHorizontal(frame: Frame, al: AutoLayoutSettings, allItems: FlowItem[]): ComputedLayout {
  const result: Record<string, ChildGeometry> = {};

  for (const c of allItems) {
    if (c.absolute || !c.visible) {
      result[c.id] = { x: c.x, y: c.y, width: c.width, height: c.height };
    }
  }

  const flow = allItems.filter((c) => !c.absolute && c.visible);
  if (flow.length === 0) {
    return {
      components: result,
      frameWidth: al.widthMode === 'hug' ? al.paddingLeft + al.paddingRight : frame.width,
      frameHeight: al.heightMode === 'hug' ? al.paddingTop + al.paddingBottom : frame.height,
    };
  }

  const hugFrame = al.widthMode === 'hug';
  const fillCount = flow.filter((c) => c.widthMode === 'fill').length;
  const fixedTotal = flow.filter((c) => c.widthMode !== 'fill').reduce((s, c) => s + c.width, 0);
  const gapTotal = Math.max(0, flow.length - 1) * al.gap;
  const innerW = frame.width - al.paddingLeft - al.paddingRight;
  const fillWidth =
    !hugFrame && fillCount > 0
      ? Math.max(0, (innerW - fixedTotal - gapTotal) / fillCount)
      : 0;

  const resolvedW = new Map<string, number>();
  for (const c of flow) {
    resolvedW.set(c.id, c.widthMode === 'fill' ? (hugFrame ? c.width : fillWidth) : c.width);
  }

  const counterAvail = frame.height - al.paddingTop - al.paddingBottom;
  const resolvedH = new Map<string, number>();
  for (const c of flow) {
    resolvedH.set(c.id, c.heightMode === 'fill' ? Math.max(0, counterAvail) : c.height);
  }

  const rows = al.wrap ? buildRows(flow, resolvedW, innerW, al.gap) : [flow];

  let rowTopY = al.paddingTop;
  for (const row of rows) {
    const rowW = row.reduce((s, c) => s + (resolvedW.get(c.id) ?? c.width), 0);
    const effectiveGap = computeEffectiveGap(al.primaryAlign, row.length, innerW, rowW, al.gap);
    const startX = computeStartX(al.primaryAlign, al.paddingLeft, frame.width - al.paddingRight, rowW, al.gap, row.length);
    const rowH = Math.max(...row.map((c) => resolvedH.get(c.id) ?? c.height));

    let cursor = startX;
    for (const c of row) {
      const cw = resolvedW.get(c.id) ?? c.width;
      const ch = resolvedH.get(c.id) ?? c.height;
      const cy = rowTopY + counterAlignOffset(al.counterAlign, rowH, ch);
      result[c.id] = { x: cursor, y: cy, width: cw, height: ch };
      cursor += cw + effectiveGap;
    }

    rowTopY += rowH + al.gap;
  }

  const frameWidth = hugFrame ? hugHorizontalWidth(rows, resolvedW, al) : frame.width;
  const frameHeight = al.heightMode === 'hug' ? hugHorizontalHeight(rows, resolvedH, al) : frame.height;

  return { components: result, frameWidth, frameHeight };
}

// ── Vertical ──────────────────────────────────────────────────────────────────

function computeVertical(frame: Frame, al: AutoLayoutSettings, allItems: FlowItem[]): ComputedLayout {
  const result: Record<string, ChildGeometry> = {};

  for (const c of allItems) {
    if (c.absolute || !c.visible) {
      result[c.id] = { x: c.x, y: c.y, width: c.width, height: c.height };
    }
  }

  const flow = allItems.filter((c) => !c.absolute && c.visible);
  if (flow.length === 0) {
    return {
      components: result,
      frameWidth: al.widthMode === 'hug' ? al.paddingLeft + al.paddingRight : frame.width,
      frameHeight: al.heightMode === 'hug' ? al.paddingTop + al.paddingBottom : frame.height,
    };
  }

  const hugFrame = al.heightMode === 'hug';
  const fillCount = flow.filter((c) => c.heightMode === 'fill').length;
  const fixedTotal = flow.filter((c) => c.heightMode !== 'fill').reduce((s, c) => s + c.height, 0);
  const gapTotal = Math.max(0, flow.length - 1) * al.gap;
  const innerH = frame.height - al.paddingTop - al.paddingBottom;
  const fillHeight =
    !hugFrame && fillCount > 0
      ? Math.max(0, (innerH - fixedTotal - gapTotal) / fillCount)
      : 0;

  const resolvedH = new Map<string, number>();
  for (const c of flow) {
    resolvedH.set(c.id, c.heightMode === 'fill' ? (hugFrame ? c.height : fillHeight) : c.height);
  }

  const counterAvail = frame.width - al.paddingLeft - al.paddingRight;
  const resolvedW = new Map<string, number>();
  for (const c of flow) {
    resolvedW.set(c.id, c.widthMode === 'fill' ? Math.max(0, counterAvail) : c.width);
  }

  const colH = flow.reduce((s, c) => s + (resolvedH.get(c.id) ?? c.height), 0);
  const effectiveGap = computeEffectiveGap(al.primaryAlign, flow.length, innerH, colH, al.gap);
  const startY = computeStartX(al.primaryAlign, al.paddingTop, frame.height - al.paddingBottom, colH, al.gap, flow.length);
  const colW = frame.width - al.paddingLeft - al.paddingRight;

  let cursor = startY;
  for (const c of flow) {
    const ch = resolvedH.get(c.id) ?? c.height;
    const cw = resolvedW.get(c.id) ?? c.width;
    const cx = al.paddingLeft + counterAlignOffset(al.counterAlign, colW, cw);
    result[c.id] = { x: cx, y: cursor, width: cw, height: ch };
    cursor += ch + effectiveGap;
  }

  const frameWidth = al.widthMode === 'hug' ? hugVerticalWidth(flow, resolvedW, al) : frame.width;
  const frameHeight = hugFrame ? hugVerticalHeight(flow, resolvedH, al) : frame.height;

  return { components: result, frameWidth, frameHeight };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRows(flow: FlowItem[], resolvedW: Map<string, number>, innerW: number, gap: number): FlowItem[][] {
  const rows: FlowItem[][] = [];
  let row: FlowItem[] = [];
  let rowW = 0;

  for (const c of flow) {
    const cw = resolvedW.get(c.id) ?? c.width;
    const addedW = row.length === 0 ? cw : cw + gap;
    if (row.length > 0 && rowW + addedW > innerW) {
      rows.push(row);
      row = [c];
      rowW = cw;
    } else {
      row.push(c);
      rowW += addedW;
    }
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

function computeStartX(
  align: AutoLayoutSettings['primaryAlign'],
  paddingStart: number,
  paddingEnd: number,
  contentSize: number,
  gap: number,
  itemCount: number
): number {
  const innerSize = paddingEnd - paddingStart;
  switch (align) {
    case 'start':
    case 'space-between':
      return paddingStart;
    case 'center':
      return paddingStart + (innerSize - contentSize - Math.max(0, itemCount - 1) * gap) / 2;
    case 'end':
      return paddingEnd - contentSize - Math.max(0, itemCount - 1) * gap;
  }
}

function computeEffectiveGap(
  align: AutoLayoutSettings['primaryAlign'],
  itemCount: number,
  innerSize: number,
  contentSize: number,
  gap: number
): number {
  if (align === 'space-between') {
    return itemCount > 1 ? (innerSize - contentSize) / (itemCount - 1) : 0;
  }
  return gap;
}

function counterAlignOffset(
  align: AutoLayoutSettings['counterAlign'],
  containerSize: number,
  itemSize: number
): number {
  switch (align) {
    case 'start':
      return 0;
    case 'center':
      return (containerSize - itemSize) / 2;
    case 'end':
      return containerSize - itemSize;
  }
}

function hugHorizontalWidth(rows: FlowItem[][], resolvedW: Map<string, number>, al: AutoLayoutSettings): number {
  const maxRowW = Math.max(
    0,
    ...rows.map((row) => {
      const itemsW = row.reduce((s, c) => s + (resolvedW.get(c.id) ?? c.width), 0);
      return itemsW + Math.max(0, row.length - 1) * al.gap;
    })
  );
  return al.paddingLeft + maxRowW + al.paddingRight;
}

function hugHorizontalHeight(rows: FlowItem[][], resolvedH: Map<string, number>, al: AutoLayoutSettings): number {
  const totalRowH = rows.reduce(
    (s, row) => s + Math.max(0, ...row.map((c) => resolvedH.get(c.id) ?? c.height)),
    0
  );
  return al.paddingTop + totalRowH + Math.max(0, rows.length - 1) * al.gap + al.paddingBottom;
}

function hugVerticalWidth(flow: FlowItem[], resolvedW: Map<string, number>, al: AutoLayoutSettings): number {
  const maxW = Math.max(0, ...flow.map((c) => resolvedW.get(c.id) ?? c.width));
  return al.paddingLeft + maxW + al.paddingRight;
}

function hugVerticalHeight(flow: FlowItem[], resolvedH: Map<string, number>, al: AutoLayoutSettings): number {
  const itemsH = flow.reduce((s, c) => s + (resolvedH.get(c.id) ?? c.height), 0);
  return al.paddingTop + itemsH + Math.max(0, flow.length - 1) * al.gap + al.paddingBottom;
}

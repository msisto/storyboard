import type { Frame, AutoLayoutSettings, ComponentInstance } from '../types';

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

export function computeAutoLayout(frame: Frame): ComputedLayout {
  // Pass-through when auto layout is not enabled
  if (!frame.autoLayout) {
    const components: Record<string, ChildGeometry> = {};
    for (const c of frame.components) {
      components[c.id] = { x: c.x, y: c.y, width: c.width, height: c.height };
    }
    return { components, frameWidth: frame.width, frameHeight: frame.height };
  }

  const al = frame.autoLayout;

  if (al.direction === 'horizontal') {
    return computeHorizontal(frame, al);
  } else {
    return computeVertical(frame, al);
  }
}

// ── Horizontal ────────────────────────────────────────────────────────────────

function computeHorizontal(frame: Frame, al: AutoLayoutSettings): ComputedLayout {
  const result: Record<string, ChildGeometry> = {};

  // Absolute children pass through unchanged
  for (const c of frame.components) {
    if (c.absolute || !c.visible) {
      result[c.id] = { x: c.x, y: c.y, width: c.width, height: c.height };
    }
  }

  const flow = frame.components.filter((c) => !c.absolute && c.visible);
  if (flow.length === 0) {
    return {
      components: result,
      frameWidth: al.widthMode === 'hug' ? al.paddingLeft + al.paddingRight : frame.width,
      frameHeight: al.heightMode === 'hug' ? al.paddingTop + al.paddingBottom : frame.height,
    };
  }

  // 1. Resolve child widths
  const hugFrame = al.widthMode === 'hug';
  const fillCount = flow.filter((c) => c.widthMode === 'fill').length;
  const fixedTotal = flow
    .filter((c) => c.widthMode !== 'fill')
    .reduce((s, c) => s + c.width, 0);
  const gapTotal = Math.max(0, flow.length - 1) * al.gap;
  const innerW = frame.width - al.paddingLeft - al.paddingRight;
  const fillWidth =
    !hugFrame && fillCount > 0
      ? Math.max(0, (innerW - fixedTotal - gapTotal) / fillCount)
      : 0;

  const resolvedW = new Map<string, number>();
  for (const c of flow) {
    if (c.widthMode === 'fill') {
      resolvedW.set(c.id, hugFrame ? c.width : fillWidth);
    } else {
      resolvedW.set(c.id, c.width);
    }
  }

  // 2. Resolve child heights
  const counterAvail = frame.height - al.paddingTop - al.paddingBottom;
  const resolvedH = new Map<string, number>();
  for (const c of flow) {
    resolvedH.set(c.id, c.heightMode === 'fill' ? Math.max(0, counterAvail) : c.height);
  }

  // 3. Build rows (wrap support)
  const rows = al.wrap ? buildHorizontalRows(flow, resolvedW, innerW, al.gap) : [flow];

  // 4. Assign positions
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

  // 5. Hug dimensions
  const frameWidth = hugFrame ? hugHorizontalWidth(rows, resolvedW, al) : frame.width;
  const frameHeight =
    al.heightMode === 'hug' ? hugHorizontalHeight(rows, resolvedH, al) : frame.height;

  return { components: result, frameWidth, frameHeight };
}

// ── Vertical ──────────────────────────────────────────────────────────────────

function computeVertical(frame: Frame, al: AutoLayoutSettings): ComputedLayout {
  const result: Record<string, ChildGeometry> = {};

  for (const c of frame.components) {
    if (c.absolute || !c.visible) {
      result[c.id] = { x: c.x, y: c.y, width: c.width, height: c.height };
    }
  }

  const flow = frame.components.filter((c) => !c.absolute && c.visible);
  if (flow.length === 0) {
    return {
      components: result,
      frameWidth: al.widthMode === 'hug' ? al.paddingLeft + al.paddingRight : frame.width,
      frameHeight: al.heightMode === 'hug' ? al.paddingTop + al.paddingBottom : frame.height,
    };
  }

  // 1. Resolve child heights (primary axis = vertical)
  const hugFrame = al.heightMode === 'hug';
  const fillCount = flow.filter((c) => c.heightMode === 'fill').length;
  const fixedTotal = flow
    .filter((c) => c.heightMode !== 'fill')
    .reduce((s, c) => s + c.height, 0);
  const gapTotal = Math.max(0, flow.length - 1) * al.gap;
  const innerH = frame.height - al.paddingTop - al.paddingBottom;
  const fillHeight =
    !hugFrame && fillCount > 0
      ? Math.max(0, (innerH - fixedTotal - gapTotal) / fillCount)
      : 0;

  const resolvedH = new Map<string, number>();
  for (const c of flow) {
    if (c.heightMode === 'fill') {
      resolvedH.set(c.id, hugFrame ? c.height : fillHeight);
    } else {
      resolvedH.set(c.id, c.height);
    }
  }

  // 2. Resolve child widths (counter axis = horizontal)
  const counterAvail = frame.width - al.paddingLeft - al.paddingRight;
  const resolvedW = new Map<string, number>();
  for (const c of flow) {
    resolvedW.set(c.id, c.widthMode === 'fill' ? Math.max(0, counterAvail) : c.width);
  }

  // 3. Single column (vertical does not wrap in this impl)
  const rows = [flow];

  // 4. Assign positions
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

  // 5. Hug dimensions
  const frameWidth = al.widthMode === 'hug' ? hugVerticalWidth(rows, resolvedW, al) : frame.width;
  const frameHeight = hugFrame ? hugVerticalHeight(rows, resolvedH, al) : frame.height;

  return { components: result, frameWidth, frameHeight };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildHorizontalRows(
  flow: ComponentInstance[],
  resolvedW: Map<string, number>,
  innerW: number,
  gap: number
): ComponentInstance[][] {
  const rows: ComponentInstance[][] = [];
  let row: ComponentInstance[] = [];
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

function hugHorizontalWidth(
  rows: ComponentInstance[][],
  resolvedW: Map<string, number>,
  al: AutoLayoutSettings
): number {
  const maxRowW = Math.max(
    0,
    ...rows.map((row) => {
      const itemsW = row.reduce((s, c) => s + (resolvedW.get(c.id) ?? c.width), 0);
      const gaps = Math.max(0, row.length - 1) * al.gap;
      return itemsW + gaps;
    })
  );
  return al.paddingLeft + maxRowW + al.paddingRight;
}

function hugHorizontalHeight(
  rows: ComponentInstance[][],
  resolvedH: Map<string, number>,
  al: AutoLayoutSettings
): number {
  const totalRowH = rows.reduce((s, row) => {
    return s + Math.max(0, ...row.map((c) => resolvedH.get(c.id) ?? c.height));
  }, 0);
  const rowGaps = Math.max(0, rows.length - 1) * al.gap;
  return al.paddingTop + totalRowH + rowGaps + al.paddingBottom;
}

function hugVerticalWidth(
  rows: ComponentInstance[][],
  resolvedW: Map<string, number>,
  al: AutoLayoutSettings
): number {
  const maxW = Math.max(0, ...rows.flat().map((c) => resolvedW.get(c.id) ?? c.width));
  return al.paddingLeft + maxW + al.paddingRight;
}

function hugVerticalHeight(
  rows: ComponentInstance[][],
  resolvedH: Map<string, number>,
  al: AutoLayoutSettings
): number {
  const flow = rows.flat();
  const itemsH = flow.reduce((s, c) => s + (resolvedH.get(c.id) ?? c.height), 0);
  const gaps = Math.max(0, flow.length - 1) * al.gap;
  return al.paddingTop + itemsH + gaps + al.paddingBottom;
}

export interface ItemGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PositionUpdate = { id: string; x?: number; y?: number };

function bbox(items: ItemGeometry[]) {
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const maxY = Math.max(...items.map((i) => i.y + i.height));
  return { minX, minY, maxX, maxY };
}

export function alignLeft(items: ItemGeometry[]): PositionUpdate[] {
  const { minX } = bbox(items);
  return items.map((i) => ({ id: i.id, x: minX }));
}

export function alignCenterH(items: ItemGeometry[]): PositionUpdate[] {
  const { minX, maxX } = bbox(items);
  const cx = (minX + maxX) / 2;
  return items.map((i) => ({ id: i.id, x: Math.round(cx - i.width / 2) }));
}

export function alignRight(items: ItemGeometry[]): PositionUpdate[] {
  const { maxX } = bbox(items);
  return items.map((i) => ({ id: i.id, x: maxX - i.width }));
}

export function alignTop(items: ItemGeometry[]): PositionUpdate[] {
  const { minY } = bbox(items);
  return items.map((i) => ({ id: i.id, y: minY }));
}

export function alignCenterV(items: ItemGeometry[]): PositionUpdate[] {
  const { minY, maxY } = bbox(items);
  const cy = (minY + maxY) / 2;
  return items.map((i) => ({ id: i.id, y: Math.round(cy - i.height / 2) }));
}

export function alignBottom(items: ItemGeometry[]): PositionUpdate[] {
  const { maxY } = bbox(items);
  return items.map((i) => ({ id: i.id, y: maxY - i.height }));
}

export function distributeH(items: ItemGeometry[]): PositionUpdate[] {
  if (items.length < 3) return items.map((i) => ({ id: i.id }));
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const totalSpan = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width - sorted[0].x;
  const totalWidth = sorted.reduce((s, i) => s + i.width, 0);
  const gap = (totalSpan - totalWidth) / (sorted.length - 1);
  const updates: PositionUpdate[] = [];
  let cursor = sorted[0].x;
  for (const item of sorted) {
    updates.push({ id: item.id, x: Math.round(cursor) });
    cursor += item.width + gap;
  }
  return updates;
}

export function distributeV(items: ItemGeometry[]): PositionUpdate[] {
  if (items.length < 3) return items.map((i) => ({ id: i.id }));
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const totalSpan = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height - sorted[0].y;
  const totalHeight = sorted.reduce((s, i) => s + i.height, 0);
  const gap = (totalSpan - totalHeight) / (sorted.length - 1);
  const updates: PositionUpdate[] = [];
  let cursor = sorted[0].y;
  for (const item of sorted) {
    updates.push({ id: item.id, y: Math.round(cursor) });
    cursor += item.height + gap;
  }
  return updates;
}

export function tidyUp(items: ItemGeometry[]): PositionUpdate[] {
  if (items.length === 0) return [];
  const COL_GAP = 16;
  const ROW_GAP = 16;

  // Sort by y then x to get reading order
  const sorted = [...items].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
  const avgH = sorted.reduce((s, i) => s + i.height, 0) / sorted.length;

  // Cluster into rows: items within 0.5 * avgH of the current row's minY
  const rows: ItemGeometry[][] = [];
  for (const item of sorted) {
    const lastRow = rows[rows.length - 1];
    if (!lastRow || item.y - lastRow[0].y > avgH * 0.6) {
      rows.push([item]);
    } else {
      lastRow.push(item);
    }
  }

  // Sort within each row by x
  rows.forEach((row) => row.sort((a, b) => a.x - b.x));

  const { minX, minY } = bbox(items);
  const updates: PositionUpdate[] = [];
  let rowY = minY;
  for (const row of rows) {
    const rowH = Math.max(...row.map((i) => i.height));
    let colX = minX;
    for (const item of row) {
      updates.push({ id: item.id, x: Math.round(colX), y: Math.round(rowY) });
      colX += item.width + COL_GAP;
    }
    rowY += rowH + ROW_GAP;
  }
  return updates;
}

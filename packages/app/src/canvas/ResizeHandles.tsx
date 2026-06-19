import React, { useCallback } from 'react';

type Direction = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type ResizeGeometry = { x: number; y: number; width: number; height: number };

interface ResizeHandlesProps {
  // Called at mousedown to snapshot current geometry — avoids stale-closure
  // accumulation when the parent updates position/size on every mousemove.
  getGeometry: () => ResizeGeometry;
  onResize: (x: number, y: number, width: number, height: number) => void;
  onResizeStart?: () => void;
  zoom: number;
  hiddenDirections?: Direction[];
}

const MIN_SIZE = 40;

const CURSORS: Record<Direction, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize',   se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize',
};

const POSITIONS: Record<Direction, React.CSSProperties> = {
  nw: { top: -5, left: -5 },
  n:  { top: -5, left: '50%', transform: 'translateX(-50%)' },
  ne: { top: -5, right: -5 },
  e:  { top: '50%', right: -5, transform: 'translateY(-50%)' },
  se: { bottom: -5, right: -5 },
  s:  { bottom: -5, left: '50%', transform: 'translateX(-50%)' },
  sw: { bottom: -5, left: -5 },
  w:  { top: '50%', left: -5, transform: 'translateY(-50%)' },
};

const DIRECTIONS: Direction[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function ResizeHandles({ getGeometry, onResize, onResizeStart, zoom, hiddenDirections }: ResizeHandlesProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, dir: Direction) => {
      e.stopPropagation();
      e.preventDefault();
      onResizeStart?.();

      const clientX0 = e.clientX;
      const clientY0 = e.clientY;
      // Snapshot geometry once at drag start — all delta maths are relative
      // to this, so moving the mouse back actually makes things smaller.
      const { x: ox, y: oy, width: ow, height: oh } = getGeometry();

      const onMove = (mv: MouseEvent) => {
        const ddx = (mv.clientX - clientX0) / zoom;
        const ddy = (mv.clientY - clientY0) / zoom;

        let nx = ox, ny = oy, nw = ow, nh = oh;

        if (dir.includes('e')) nw = Math.max(MIN_SIZE, ow + ddx);
        if (dir.includes('s')) nh = Math.max(MIN_SIZE, oh + ddy);
        if (dir.includes('w')) { nw = Math.max(MIN_SIZE, ow - ddx); nx = ox + ow - nw; }
        if (dir.includes('n')) { nh = Math.max(MIN_SIZE, oh - ddy); ny = oy + oh - nh; }

        onResize(nx, ny, nw, nh);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [getGeometry, onResize, zoom]
  );

  return (
    <>
      {DIRECTIONS.filter((d) => !hiddenDirections?.includes(d)).map((dir) => (
        <div
          key={dir}
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            background: 'white',
            border: '2px solid #0066FF',
            borderRadius: 1,
            zIndex: 4,
            cursor: CURSORS[dir],
            ...POSITIONS[dir],
          }}
          onMouseDown={(e) => handleMouseDown(e, dir)}
          onClick={(e) => e.stopPropagation()}
        />
      ))}
    </>
  );
}

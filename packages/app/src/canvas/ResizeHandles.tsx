import React, { useCallback } from 'react';

type Direction = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface ResizeHandlesProps {
  width: number;
  height: number;
  onResize: (dx: number, dy: number, dw: number, dh: number) => void;
  zoom: number;
}

const CURSORS: Record<Direction, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize', se: 'se-resize', s: 's-resize',
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

export function ResizeHandles({ onResize, zoom }: ResizeHandlesProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, dir: Direction) => {
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;

      const onMove = (mv: MouseEvent) => {
        const rawDx = (mv.clientX - startX) / zoom;
        const rawDy = (mv.clientY - startY) / zoom;

        let dx = 0, dy = 0, dw = 0, dh = 0;
        if (dir.includes('w')) { dx = rawDx; dw = -rawDx; }
        if (dir.includes('e')) { dw = rawDx; }
        if (dir.includes('n')) { dy = rawDy; dh = -rawDy; }
        if (dir.includes('s')) { dh = rawDy; }

        onResize(dx, dy, dw, dh);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [onResize, zoom]
  );

  return (
    <>
      {DIRECTIONS.map((dir) => (
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

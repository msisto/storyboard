import React from 'react';
import { useDesignStore } from '../store/useDesignStore';
import { useCanvasStore } from '../store/useCanvasStore';

export function SlotChildNode({ id, children }: { id: string; children?: React.ReactNode }) {
  const { selectedComponentIds, selectComponent } = useDesignStore();
  const { globalInteractMode } = useCanvasStore();
  const isSelected = selectedComponentIds.includes(id);

  return (
    <div style={{ position: 'relative' }}>
      {children}
      {!globalInteractMode && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            cursor: 'default',
            outline: isSelected ? '2px solid var(--sb-accent)' : 'none',
            outlineOffset: -2,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            selectComponent(id);
          }}
        />
      )}
      {globalInteractMode && isSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          outline: '2px solid var(--sb-accent)',
          outlineOffset: -2,
          pointerEvents: 'none',
          zIndex: 3,
        }} />
      )}
    </div>
  );
}

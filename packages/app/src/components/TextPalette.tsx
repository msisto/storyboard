import React from 'react';
import { TAILWIND_FONT_SIZES, TAILWIND_FONT_WEIGHTS } from '../types';
import type { TailwindFontSize, TailwindFontWeight } from '../types';
import { useDesignStore } from '../store/useDesignStore';

const SAMPLE_WEIGHTS: Array<typeof TAILWIND_FONT_WEIGHTS[number]> = TAILWIND_FONT_WEIGHTS.filter(
  (w) => ['normal', 'medium', 'semibold', 'bold'].includes(w.key)
);

function sampleText(sizePx: number): string {
  if (sizePx >= 48) return 'Aa';
  if (sizePx >= 36) return 'The quick fox';
  return 'The quick brown fox';
}

export function TextPalette() {
  const { file, selectedFrameId, addTextLayer } = useDesignStore();

  const addToFrame = (fontSize: TailwindFontSize, fontWeight: TailwindFontWeight) => {
    const frame = file?.frames.find((f) => f.id === selectedFrameId);
    if (!frame) return;
    const existingCount = (frame.textLayers ?? []).length;
    const sizeEntry = TAILWIND_FONT_SIZES.find((s) => s.key === fontSize)!;
    addTextLayer(frame.id, {
      x: 20,
      y: 20 + existingCount * (sizeEntry.lineHeight + 8),
      fontSize,
      fontWeight,
    });
  };

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {TAILWIND_FONT_SIZES.map((size) => (
        <div key={size.key}>
          {/* Section header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              padding: '8px 12px 4px',
              borderBottom: '1px solid #f3f4f6',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{size.label}</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{size.px}px / {size.lineHeight}px</span>
          </div>

          {/* Weight rows */}
          {SAMPLE_WEIGHTS.map((weight) => (
            <div
              key={weight.key}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/x-text-style',
                  JSON.stringify({ fontSize: size.key, fontWeight: weight.key })
                );
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => addToFrame(size.key as TailwindFontSize, weight.key as TailwindFontWeight)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 12px',
                gap: 8,
                cursor: 'grab',
                borderBottom: '1px solid #f9fafb',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: '#9ca3af',
                  width: 52,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {weight.label}
              </span>
              <div
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  maxHeight: Math.min(size.lineHeight * 1.2, 60),
                  lineHeight: `${size.lineHeight}px`,
                }}
              >
                <span
                  style={{
                    fontSize: size.px,
                    fontWeight: weight.value,
                    color: '#111827',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    overflow: 'hidden',
                  }}
                >
                  {sampleText(size.px)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {!selectedFrameId && (
        <p style={{ padding: 12, fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
          Select a frame to click-add text, or drag onto a frame.
        </p>
      )}
    </div>
  );
}

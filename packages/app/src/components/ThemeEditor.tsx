import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTheme, saveTheme, type ThemeTokens } from '../store/themeApi';
import { hslToHexSafe, hexToHslString } from '../utils/colorUtils';
import { useCanvasStore } from '../store/useCanvasStore';

// ── Token groups shown in the editor ─────────────────────────────────────────

interface TokenGroup {
  label: string;
  tokens: Array<{ key: string; label: string }>;
}

const COLOR_GROUPS: TokenGroup[] = [
  {
    label: 'Background',
    tokens: [
      { key: '--background', label: 'Background' },
      { key: '--foreground', label: 'Foreground' },
    ],
  },
  {
    label: 'Card',
    tokens: [
      { key: '--card', label: 'Base' },
      { key: '--card-foreground', label: 'Foreground' },
    ],
  },
  {
    label: 'Primary',
    tokens: [
      { key: '--primary', label: 'Base' },
      { key: '--primary-foreground', label: 'Foreground' },
    ],
  },
  {
    label: 'Secondary',
    tokens: [
      { key: '--secondary', label: 'Base' },
      { key: '--secondary-foreground', label: 'Foreground' },
    ],
  },
  {
    label: 'Muted',
    tokens: [
      { key: '--muted', label: 'Base' },
      { key: '--muted-foreground', label: 'Foreground' },
    ],
  },
  {
    label: 'Accent',
    tokens: [
      { key: '--accent', label: 'Base' },
      { key: '--accent-foreground', label: 'Foreground' },
    ],
  },
  {
    label: 'Popover',
    tokens: [
      { key: '--popover', label: 'Base' },
      { key: '--popover-foreground', label: 'Foreground' },
    ],
  },
  {
    label: 'Destructive',
    tokens: [
      { key: '--destructive', label: 'Base' },
      { key: '--destructive-foreground', label: 'Foreground' },
    ],
  },
  {
    label: 'Border & Input',
    tokens: [
      { key: '--border', label: 'Border' },
      { key: '--input', label: 'Input' },
      { key: '--ring', label: 'Ring' },
    ],
  },
];

const COLOR_TOKEN_KEYS = new Set(COLOR_GROUPS.flatMap((g) => g.tokens.map((t) => t.key)));

// ── ThemeEditor ───────────────────────────────────────────────────────────────

export function ThemeEditor() {
  const [tokens, setTokens] = useState<ThemeTokens | null>(null);
  const [mode, setMode] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  const { setThemePreview } = useCanvasStore();

  useEffect(() => {
    fetchTheme().then(setTokens).catch(console.error);
  }, []);

  // Sync theme preview mode with the selected tab; clear on unmount
  useEffect(() => {
    setThemePreview(mode);
    return () => setThemePreview(null);
  }, [mode, setThemePreview]);

  // Inject a scoped style tag for the active mode so frames override
  // the OS media query regardless of system dark/light setting
  useEffect(() => {
    if (!tokens) return;
    const modeTokens = tokens[mode];
    const vars = Object.entries(modeTokens).map(([k, v]) => `  ${k}: ${v};`).join('\n');
    const styleEl = document.createElement('style');
    styleEl.textContent = `[data-theme-preview="${mode}"] {\n${vars}\n}`;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, [mode, tokens]);

  const handleColorChange = useCallback(
    (varName: string, hex: string) => {
      const hsl = hexToHslString(hex);

      setTokens((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          [mode]: { ...prev[mode], [varName]: hsl },
        };

        // Apply to DOM live so the app updates immediately
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((mode === 'dark') === systemDark) {
          document.documentElement.style.setProperty(varName, hsl);
        }

        // Debounce write to disk
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          setSaveState('saving');
          saveTheme(next)
            .then(() => {
              setSaveState('saved');
              clearTimeout(savedTimer.current);
              savedTimer.current = setTimeout(() => setSaveState('idle'), 1500);
            })
            .catch(() => setSaveState('error'));
        }, 600);

        return next;
      });
    },
    [mode]
  );

  const handleRadiusChange = useCallback(
    (value: number) => {
      const strVal = `${value}rem`;
      setTokens((prev) => {
        if (!prev) return prev;
        const next = {
          light: { ...prev.light, '--radius': strVal },
          dark: { ...prev.dark, '--radius': strVal },
        };
        document.documentElement.style.setProperty('--radius', strVal);

        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          setSaveState('saving');
          saveTheme(next)
            .then(() => {
              setSaveState('saved');
              clearTimeout(savedTimer.current);
              savedTimer.current = setTimeout(() => setSaveState('idle'), 1500);
            })
            .catch(() => setSaveState('error'));
        }, 600);

        return next;
      });
    },
    []
  );

  useEffect(() => () => { clearTimeout(saveTimer.current); clearTimeout(savedTimer.current); }, []);

  const activeTokens = tokens?.[mode] ?? {};
  const radiusVal = parseFloat(tokens?.light['--radius'] ?? '0.5');

  if (!tokens) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: 'var(--sb-text-4)', textAlign: 'center' }}>
        Loading theme…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--sb-border)', flexShrink: 0 }}>
        {(['light', 'dark'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: 'none', outline: 'none',
              background: mode === m ? 'var(--sb-bg)' : 'var(--sb-bg-secondary)',
              color: mode === m ? 'var(--sb-text)' : 'var(--sb-text-3)',
              borderBottom: mode === m ? '2px solid var(--sb-accent)' : '2px solid transparent',
              textTransform: 'capitalize',
              transition: 'color 120ms',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Scrollable token list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {COLOR_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            <div style={{
              padding: '4px 12px 2px',
              fontSize: 10, fontWeight: 600,
              color: 'var(--sb-text-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {group.label}
            </div>
            {group.tokens.map(({ key, label }) => {
              const hslStr = activeTokens[key] ?? '0 0% 0%';
              const hex = hslToHexSafe(hslStr);
              return (
                <ColorRow
                  key={key}
                  label={label}
                  hex={hex}
                  onChange={(h) => handleColorChange(key, h)}
                />
              );
            })}
          </div>
        ))}

        {/* Radius */}
        <div style={{ marginBottom: 4 }}>
          <div style={{
            padding: '4px 12px 2px',
            fontSize: 10, fontWeight: 600,
            color: 'var(--sb-text-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Shape
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 12px',
          }}>
            <span style={{ fontSize: 11, color: 'var(--sb-text-2)', width: 80, flexShrink: 0 }}>
              Radius
            </span>
            <input
              type="range"
              min={0} max={2} step={0.05}
              value={radiusVal}
              onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--sb-accent)' }}
            />
            <span style={{
              fontSize: 11, color: 'var(--sb-text-3)',
              width: 36, textAlign: 'right', flexShrink: 0,
            }}>
              {radiusVal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Save status */}
      {saveState !== 'idle' && (
        <div style={{
          padding: '6px 12px', fontSize: 11,
          borderTop: '1px solid var(--sb-border)',
          color: saveState === 'saved' ? 'var(--sb-success)' : saveState === 'error' ? 'var(--sb-error)' : 'var(--sb-text-3)',
          background: saveState === 'saved' ? 'var(--sb-success-bg)' : saveState === 'error' ? 'var(--sb-error-bg)' : 'var(--sb-bg)',
          flexShrink: 0,
        }}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved to CSS files' : '✗ Save failed'}
        </div>
      )}
    </div>
  );
}

// ── ColorRow ──────────────────────────────────────────────────────────────────

function ColorRow({ label, hex, onChange }: { label: string; hex: string; onChange: (hex: string) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '3px 12px',
    }}>
      <span style={{ fontSize: 11, color: 'var(--sb-text-2)', flex: 1, minWidth: 0 }}>
        {label}
      </span>
      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          display: 'block', width: 20, height: 20, borderRadius: 4,
          background: hex,
          border: '1px solid var(--sb-border)',
          flexShrink: 0,
        }} />
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
          tabIndex={-1}
        />
        <span style={{ fontSize: 10, color: 'var(--sb-text-4)', fontFamily: 'monospace' }}>
          {hex}
        </span>
      </label>
    </div>
  );
}

export { COLOR_TOKEN_KEYS };

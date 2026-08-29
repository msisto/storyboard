import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTheme, saveTheme, type ThemeTokens } from '../store/themeApi';
import { hslToHexSafe, hexToHslString } from '../utils/colorUtils';
import { useCanvasStore } from '../store/useCanvasStore';
import { useDesignStore } from '../store/useDesignStore';
import { detectColorTokens, isShadcnTokens, groupTokens, type ColorToken } from '../lib/detectTokens';

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
  const { file, updateTheme } = useDesignStore();
  const { themeScope: scope, setThemeScope: setScope, themeMode: mode, setThemeMode: setMode, setThemePreview } = useCanvasStore();
  const [systemTokens, setSystemTokens] = useState<ThemeTokens | null>(null);
  const [localTokens, setLocalTokens] = useState<ThemeTokens | null>(file?.theme ?? null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const tokens = scope === 'local' ? localTokens : systemTokens;

  // Always fetch system tokens; also seed local if file has saved theme
  useEffect(() => {
    fetchTheme().then((t) => {
      setSystemTokens(t);
      if (file?.theme) {
        setLocalTokens(file.theme);
        setScope('local');
      } else {
        setLocalTokens(t);
        setScope('system');
      }
    }).catch(console.error);
  }, [file?.id]);

  // Sync theme preview when mode changes (App.tsx keeps it alive across unmounts)
  useEffect(() => {
    setThemePreview(mode);
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
      const applyDOM = () => {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((mode === 'dark') === systemDark) document.documentElement.style.setProperty(varName, hsl);
      };
      if (scope === 'local') {
        setLocalTokens((prev) => {
          if (!prev) return prev;
          const next = { ...prev, [mode]: { ...prev[mode], [varName]: hsl } };
          applyDOM();
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => updateTheme(next), 300);
          return next;
        });
      } else {
        setSystemTokens((prev) => {
          if (!prev) return prev;
          const next = { ...prev, [mode]: { ...prev[mode], [varName]: hsl } };
          applyDOM();
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => saveTheme(next), 300);
          return next;
        });
      }
    },
    [mode, scope, updateTheme]
  );

  const handleRadiusChange = useCallback(
    (value: number) => {
      const strVal = `${value}rem`;
      const apply = (prev: ThemeTokens): ThemeTokens => ({
        light: { ...prev.light, '--radius': strVal },
        dark: { ...prev.dark, '--radius': strVal },
      });
      document.documentElement.style.setProperty('--radius', strVal);
      if (scope === 'local') {
        setLocalTokens((prev) => {
          if (!prev) return prev;
          const next = apply(prev);
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => updateTheme(next), 300);
          return next;
        });
      } else {
        setSystemTokens((prev) => {
          if (!prev) return prev;
          const next = apply(prev);
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => saveTheme(next), 300);
          return next;
        });
      }
    },
    [scope, updateTheme]
  );

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const activeTokens = tokens?.[mode] ?? {};
  const radiusVal = parseFloat(tokens?.light['--radius'] ?? '0.5');

  const detectedTokens = useMemo(() => detectColorTokens(), []);
  const shadcn = useMemo(() => isShadcnTokens(detectedTokens), [detectedTokens]);
  const hasRadius = useMemo(() => detectedTokens.some((t) => t.prop === '--radius'), [detectedTokens]);

  // For non-shadcn: group detected tokens by prefix
  const genericGroups = useMemo(
    () => (!shadcn ? groupTokens(detectedTokens) : []),
    [shadcn, detectedTokens]
  );

  if (!tokens) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: 'var(--sb-text-4)', textAlign: 'center' }}>
        Loading theme…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Scope + mode row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid var(--sb-border)', flexShrink: 0 }}>
        <select
          value={scope}
          onChange={(e) => {
            const next = e.target.value as 'system' | 'local';
            if (next === 'local' && !file?.theme && systemTokens) {
              // First time switching to local — copy system tokens into file
              setLocalTokens(systemTokens);
              updateTheme(systemTokens);
            }
            setScope(next);
          }}
          style={{ flex: 1, fontSize: 11, padding: '3px 5px', border: '1px solid var(--sb-border)', borderRadius: 4, background: 'var(--sb-bg)', color: 'var(--sb-text-2)', cursor: 'pointer' }}
        >
          <option value="system">System theme</option>
          <option value="local">Local theme</option>
        </select>
        {(['light', 'dark'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '3px 8px', fontSize: 11,
            fontWeight: mode === m ? 600 : 400,
            color: mode === m ? 'var(--sb-text-1)' : 'var(--sb-text-4)',
            background: mode === m ? 'var(--sb-control-active)' : 'transparent',
            border: '1px solid var(--sb-border)', borderRadius: 4,
            cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {m}
          </button>
        ))}
      </div>
      {/* Scrollable token list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {shadcn ? (
          // shadcn/ui: use the known grouped layout
          COLOR_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <GroupLabel>{group.label}</GroupLabel>
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
          ))
        ) : genericGroups.length > 0 ? (
          // Generic: introspected tokens grouped by prefix
          genericGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <GroupLabel>{group.label}</GroupLabel>
              {group.tokens.map((token) => {
                const hex = hslToHexSafe(activeTokens[token.prop] ?? token.rawValue);
                return (
                  <ColorRow
                    key={token.prop}
                    label={token.label}
                    hex={hex}
                    onChange={(h) => handleColorChange(token.prop, h)}
                  />
                );
              })}
            </div>
          ))
        ) : (
          <div style={{ padding: '16px 12px', fontSize: 11, color: 'var(--sb-text-4)' }}>
            No CSS color tokens detected on :root. Add CSS custom properties to your global stylesheet to edit them here.
          </div>
        )}

        {/* Radius — show only if --radius token exists or using shadcn */}
        {(shadcn || hasRadius) && (
          <div style={{ marginBottom: 4 }}>
            <GroupLabel>Shape</GroupLabel>
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
        )}
      </div>

    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '4px 12px 2px',
      fontSize: 10, fontWeight: 600,
      color: 'var(--sb-text-4)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {children}
    </div>
  );
}

// ── ColorRow ──────────────────────────────────────────────────────────────────

function ColorRow({ label, hex, onChange }: { label: string; hex: string; onChange: (hex: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 12px' }}>
      <span style={{ fontSize: 11, color: 'var(--sb-text-2)', flex: 1, minWidth: 0 }}>{label}</span>
      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'block', width: 20, height: 20, borderRadius: 4, background: hex, border: '1px solid var(--sb-border)', flexShrink: 0 }} />
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
          tabIndex={-1}
        />
        <span style={{ fontSize: 10, color: 'var(--sb-text-4)', fontFamily: 'monospace' }}>{hex}</span>
      </label>
    </div>
  );
}

export { COLOR_TOKEN_KEYS };

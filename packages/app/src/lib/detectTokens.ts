export type ColorToken = { prop: string; label: string; rawValue: string };

function looksLikeColor(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true;
  if (/^(rgb|rgba|hsl|hsla)\(/.test(v)) return true;
  // shadcn bare HSL: "222.2 47.4% 11.2%"
  if (/^\d+\.?\d*\s+\d+\.?\d*%\s+\d+\.?\d*%$/.test(v)) return true;
  return false;
}

export function detectColorTokens(): ColorToken[] {
  const computed = getComputedStyle(document.documentElement);
  const seen = new Set<string>();
  const result: ColorToken[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
          for (const prop of Array.from(rule.style)) {
            if (!prop.startsWith('--') || seen.has(prop)) continue;
            seen.add(prop);
            const value = computed.getPropertyValue(prop).trim();
            if (looksLikeColor(value)) {
              result.push({
                prop,
                label: prop.replace(/^--/, '').replace(/-/g, ' '),
                rawValue: value,
              });
            }
          }
        }
      }
    } catch {
      // Cross-origin stylesheets
    }
  }

  return result.sort((a, b) => a.prop.localeCompare(b.prop));
}

// Returns true when the detected tokens look like a shadcn/ui setup
export function isShadcnTokens(tokens: ColorToken[]): boolean {
  const props = new Set(tokens.map((t) => t.prop));
  return props.has('--background') && props.has('--foreground') && props.has('--primary');
}

// Returns the CSS color string for use in style props and background values
export function tokenToCss(token: ColorToken): string {
  // shadcn bare HSL → must wrap in hsl(var(...)) to be a valid CSS color
  if (/^\d+\.?\d*\s+\d+\.?\d*%\s+\d+\.?\d*%$/.test(token.rawValue.trim())) {
    return `hsl(var(${token.prop}))`;
  }
  return `var(${token.prop})`;
}

// Group a flat token list by the first segment of the prop name
export function groupTokens(tokens: ColorToken[]): { label: string; tokens: ColorToken[] }[] {
  const groups = new Map<string, ColorToken[]>();
  for (const token of tokens) {
    const seg = token.prop.replace(/^--/, '').split('-')[0];
    const key = seg.charAt(0).toUpperCase() + seg.slice(1);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(token);
  }
  return Array.from(groups.entries()).map(([label, tokens]) => ({ label, tokens }));
}

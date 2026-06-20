export interface ThemeTokens {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export async function fetchTheme(): Promise<ThemeTokens> {
  const res = await fetch('/api/theme');
  if (!res.ok) throw new Error(`Failed to fetch theme: ${res.status}`);
  return res.json() as Promise<ThemeTokens>;
}

export async function saveTheme(tokens: ThemeTokens): Promise<void> {
  const res = await fetch('/api/theme', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens),
  });
  if (!res.ok) throw new Error(`Failed to save theme: ${res.status}`);
}

export function buildIframeUrl(storybookId: string, args: Record<string, unknown>): string {
  const base = 'http://localhost:6006/iframe.html';
  const params = new URLSearchParams({ id: storybookId, viewMode: 'story' });

  if (Object.keys(args).length > 0) {
    const argsStr = Object.entries(args)
      .map(([k, v]) => `${k}:${encodeURIComponent(String(v))}`)
      .join(';');
    params.set('args', argsStr);
  }

  return `${base}?${params.toString()}`;
}

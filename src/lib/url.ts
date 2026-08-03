export function buildHref(
  basePath: string,
  current: Record<string, string | undefined>,
  overrides: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v !== undefined) params.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) params.delete(k);
    else params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

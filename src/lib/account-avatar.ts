// Profile metadata is display data only. Accept Google's HTTPS photo hosts.
export function googleAccountAvatar(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const values = metadata as Record<string, unknown>;
  for (const value of [values.avatar_url, values.picture]) {
    if (typeof value !== 'string') continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))) return url.href;
    } catch { /* Missing or invalid photos use the account initial. */ }
  }
  return null;
}

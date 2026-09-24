export function isConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export function appUrl() {
  const value = process.env.APP_URL || (process.env.NODE_ENV === 'production' ? 'https://keeplyph.com' : 'http://localhost:3000');
  return new URL(value).origin;
}
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing server configuration: ' + name);
  return value;
}

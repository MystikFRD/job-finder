/** Public base URL of this app (used for OAuth redirects). */
export function getAppUrl(): string {
  const url =
    process.env.APP_URL ??
    process.env.N8N_WEB_CONFIG_URL ??
    process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("APP_URL or N8N_WEB_CONFIG_URL must be set");
  }
  return url.replace(/\/$/, "");
}

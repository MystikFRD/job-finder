import { NextResponse } from "next/server";

export function requireN8nSecret(request: Request): NextResponse | null {
  const secret = request.headers.get("x-n8n-secret");
  const expected = process.env.N8N_INTERNAL_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** Public proxy URL n8n should call (this app, not the private SearXNG IP). */
export function searxngProxyUrl(): string {
  const base =
    process.env.APP_URL ??
    process.env.N8N_WEB_CONFIG_URL ??
    "https://jobs.mubu.dev";
  return `${base.replace(/\/$/, "")}/api/n8n/searxng`;
}

/**
 * Direct SearXNG instance — only reachable from the jobs VPS.
 * n8n on orc.momoh.de gets 403 if it hits this IP itself.
 */
export function searxngUpstreamUrl(): string {
  return (
    process.env.SEARXNG_UPSTREAM_URL ?? "http://host.docker.internal:8080/search"
  );
}

export function rewriteSearxngUrlForN8n(url: string | null | undefined): string {
  const fallback = searxngProxyUrl();
  if (!url) return fallback;
  if (/152\.53\.157\.68:8080|:8080\/search/i.test(url) && !url.includes("/api/n8n/searxng")) {
    return fallback;
  }
  return url;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUserId } from "@/lib/auth";
import { buildCanvaAuthorizeUrl, createPkcePair, isCanvaConfigured } from "@/lib/canva";
import { CANVA_PKCE_COOKIE, CANVA_STATE_COOKIE } from "@/lib/canva-oauth-cookies";

export async function GET() {
  try {
    if (!isCanvaConfigured()) {
      return NextResponse.json(
        { error: "Canva ist auf dem Server nicht konfiguriert." },
        { status: 503 },
      );
    }

    const userId = await requireUserId();
    const { codeVerifier, codeChallenge } = createPkcePair();
    const state = Buffer.from(
      JSON.stringify({ userId, nonce: randomBytes(16).toString("hex") }),
    ).toString("base64url");

    const cookieStore = await cookies();
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 10,
    };
    cookieStore.set(CANVA_PKCE_COOKIE, codeVerifier, cookieOpts);
    cookieStore.set(CANVA_STATE_COOKIE, state, cookieOpts);

    const url = buildCanvaAuthorizeUrl({ state, codeChallenge });
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canva-Verbindung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

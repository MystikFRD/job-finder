import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { exchangeCanvaCode } from "@/lib/canva";
import { saveCanvaTokens } from "@/lib/canva-connection";
import { CANVA_PKCE_COOKIE, CANVA_STATE_COOKIE } from "@/lib/canva-oauth-cookies";

export async function GET(request: Request) {
  const settingsUrl = new URL("/settings", getAppUrl());

  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      settingsUrl.searchParams.set("canva", "error");
      settingsUrl.searchParams.set("canva_msg", error);
      return NextResponse.redirect(settingsUrl);
    }

    if (!code || !state) {
      settingsUrl.searchParams.set("canva", "error");
      settingsUrl.searchParams.set("canva_msg", "missing_code");
      return NextResponse.redirect(settingsUrl);
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get(CANVA_STATE_COOKIE)?.value;
    const codeVerifier = cookieStore.get(CANVA_PKCE_COOKIE)?.value;

    cookieStore.delete(CANVA_PKCE_COOKIE);
    cookieStore.delete(CANVA_STATE_COOKIE);

    if (!storedState || storedState !== state || !codeVerifier) {
      settingsUrl.searchParams.set("canva", "error");
      settingsUrl.searchParams.set("canva_msg", "invalid_state");
      return NextResponse.redirect(settingsUrl);
    }

    let parsedState: { userId?: string };
    try {
      parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    } catch {
      settingsUrl.searchParams.set("canva", "error");
      settingsUrl.searchParams.set("canva_msg", "invalid_state");
      return NextResponse.redirect(settingsUrl);
    }

    if (parsedState.userId !== userId) {
      settingsUrl.searchParams.set("canva", "error");
      settingsUrl.searchParams.set("canva_msg", "user_mismatch");
      return NextResponse.redirect(settingsUrl);
    }

    const tokens = await exchangeCanvaCode({ code, codeVerifier });
    await saveCanvaTokens(userId, tokens);

    settingsUrl.searchParams.set("canva", "connected");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    settingsUrl.searchParams.set("canva", "error");
    settingsUrl.searchParams.set(
      "canva_msg",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.redirect(settingsUrl);
  }
}

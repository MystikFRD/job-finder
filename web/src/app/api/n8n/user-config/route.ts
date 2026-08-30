import { NextResponse } from "next/server";
import { buildN8nUserConfig } from "@/lib/search-settings";

export async function GET(request: Request) {
  const secret = request.headers.get("x-n8n-secret");
  const expected = process.env.N8N_INTERNAL_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  try {
    const payload = await buildN8nUserConfig(userId);
    if (!payload) {
      return NextResponse.json({ error: "User settings not found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

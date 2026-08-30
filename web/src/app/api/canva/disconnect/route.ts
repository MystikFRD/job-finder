import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { revokeCanvaConnection } from "@/lib/canva";

export async function POST() {
  try {
    const userId = await requireUserId();
    await revokeCanvaConnection(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

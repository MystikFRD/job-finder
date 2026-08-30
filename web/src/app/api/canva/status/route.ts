import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { isCanvaConfigured } from "@/lib/canva";
import { isCanvaConnected } from "@/lib/canva-connection";

export async function GET() {
  try {
    const userId = await requireUserId();
    const connected = await isCanvaConnected(userId);
    return NextResponse.json({
      configured: isCanvaConfigured(),
      connected,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

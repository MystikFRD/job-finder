import { NextResponse } from "next/server";
import { dismissActionItem } from "@/lib/action-items";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    await dismissActionItem(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

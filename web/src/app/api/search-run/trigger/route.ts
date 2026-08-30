import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import {
  getManualRunStatus,
  triggerFinderForCurrentUser,
} from "@/lib/n8n-trigger";

export async function GET() {
  try {
    const userId = await requireUserId();
    const status = await getManualRunStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await triggerFinderForCurrentUser();
    return NextResponse.json({
      ok: true,
      message: "Job search started. Results appear in a few minutes.",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trigger failed";
    let status = 500;
    if (message.includes("already running") || message.includes("not configured")) {
      status = 409;
    } else if (message.includes("Manual search limit")) {
      status = 429;
    }
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

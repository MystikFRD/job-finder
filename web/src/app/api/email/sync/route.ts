import { NextResponse } from "next/server";
import { syncEmails } from "@/lib/email-sync";

export async function POST() {
  try {
    const result = await syncEmails();
    return NextResponse.json({ ok: true, ...result, emails: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}

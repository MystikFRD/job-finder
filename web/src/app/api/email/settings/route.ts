import { NextResponse } from "next/server";
import { updateEmailSettings } from "@/lib/email-sync";
import { queryOne } from "@/lib/db";

export async function GET() {
  try {
    const settings = await queryOne(
      `SELECT id, imap_host, imap_port, imap_user, imap_secure, scan_enabled,
              last_scan_at, last_scan_status, last_scan_error, auto_update_min_confidence,
              (imap_password IS NOT NULL AND imap_password <> '') AS imap_password_set
       FROM email_settings ORDER BY created_at LIMIT 1`,
    );
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await updateEmailSettings(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

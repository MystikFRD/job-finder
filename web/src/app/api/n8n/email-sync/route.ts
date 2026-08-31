import { NextResponse } from "next/server";
import { requireN8nSecret } from "@/lib/n8n-internal-auth";
import { listScanEnabledUserIds, syncEmails } from "@/lib/email-sync";

export async function POST(request: Request) {
  const denied = requireN8nSecret(request);
  if (denied) return denied;

  try {
    const userIds = await listScanEnabledUserIds();
    const results = [];
    for (const userId of userIds) {
      try {
        results.push({ userId, ...(await syncEmails(30, userId)) });
      } catch (error) {
        results.push({
          userId,
          error: error instanceof Error ? error.message : "IMAP error",
        });
      }
    }
    return NextResponse.json({
      ok: true,
      users: userIds.length,
      results,
      emails: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}

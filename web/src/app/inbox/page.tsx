import Link from "next/link";
import { DbError, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getRecentEmails } from "@/lib/queries";

export default async function InboxPage() {
  try {
    const emails = await getRecentEmails();

    return (
      <div className="page-container">
        <PageHeader
          title="Inbox"
          description="Recruiting emails — classified and linked to applications"
        />

        {emails.length ? (
          <div className="space-y-3">
            {emails.map((email) => (
              <Link
                key={email.id}
                href={`/inbox/${email.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-700"
              >
                <p className="font-medium text-zinc-100">{email.subject ?? "(no subject)"}</p>
                <p className="mt-1 text-sm text-zinc-400">{email.from_address}</p>
                <p className="mt-2 text-xs capitalize text-zinc-500">
                  {email.category?.replace(/_/g, " ")} · {formatDateTime(email.received_at)}
                </p>
                {email.job_title ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    {email.company} — {email.job_title}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-zinc-400">No recruiting emails synced yet.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Configure IMAP in Settings and click Scan now, or wait for the n8n Email Scanner.
            </p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <div className="flex min-h-full items-center justify-center page-container">
        <DbError message={message} />
      </div>
    );
  }
}

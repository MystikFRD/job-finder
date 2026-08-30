import Link from "next/link";
import { notFound } from "next/navigation";
import { AppStatusBadge } from "@/components/badges";
import { AssistantPanel } from "@/components/AssistantPanel";
import { DbError, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getEmailById } from "@/lib/queries";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const email = await getEmailById(id);
    if (!email) notFound();

    return (
      <div className="page-container">
        <PageHeader title={email.subject ?? "(no subject)"} description={email.from_address ?? undefined} />

        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {email.category ? (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 capitalize text-zinc-300">
              {email.category.replace(/_/g, " ")}
            </span>
          ) : null}
          {email.classification_confidence != null ? (
            <span className="text-zinc-500">
              Confidence: {Math.round(email.classification_confidence * 100)}%
            </span>
          ) : null}
          {email.auto_status_updated ? (
            <span className="text-emerald-400">Auto-updated application</span>
          ) : null}
          {email.requires_review ? (
            <span className="text-amber-400">Needs review</span>
          ) : null}
        </div>

        <p className="mb-6 text-xs text-zinc-500">{formatDateTime(email.received_at)}</p>

        {email.application_id ? (
          <Link href={`/applications/${email.application_id}`} className="mb-6 inline-block text-sm text-sky-400">
            Linked application →
          </Link>
        ) : null}

        <article className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {email.body_text ?? email.body_preview ?? "No body"}
          </pre>
        </article>

        <AssistantPanel emailId={id} applicationId={email.application_id ?? undefined} />

        <Link href="/inbox" className="mt-8 inline-block text-sm text-zinc-400 hover:text-zinc-200">
          ← Inbox
        </Link>
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

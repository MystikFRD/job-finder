import Link from "next/link";
import { notFound } from "next/navigation";
import { AppStatusBadge, ScoreBadge } from "@/components/badges";
import { AssistantPanel } from "@/components/AssistantPanel";
import { DbError, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { getApplicationById } from "@/lib/queries";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const data = await getApplicationById(id);
    if (!data) notFound();

    const { application, job, events, documents } = data;

    return (
      <div className="page-container">
        <PageHeader
          title={application.job_title ?? "Application"}
          description={application.company ?? undefined}
        />

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <AppStatusBadge status={application.status} />
          {application.match_score != null ? (
            <ScoreBadge score={application.match_score} />
          ) : null}
          <Link
            href={`/applications/${id}/draft`}
            className="rounded-lg border border-emerald-800/60 bg-emerald-950/50 px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-900/40"
          >
            Generate / Edit Application
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {job ? (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Job
              </h2>
              <Link href={`/jobs/${job.id}`} className="text-sm text-sky-400 hover:underline">
                View full job details →
              </Link>
              {job.job_description ? (
                <p className="mt-3 line-clamp-6 text-sm text-zinc-400">{job.job_description}</p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Timeline
            </h2>
            {events.length ? (
              <ul className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="border-l-2 border-zinc-700 pl-3">
                    <p className="text-sm font-medium text-zinc-200">{event.title}</p>
                    <p className="text-xs text-zinc-500">{formatDateTime(event.occurred_at)}</p>
                    {event.description ? (
                      <p className="mt-1 text-xs text-zinc-400">{event.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No events yet.</p>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Application Documents
            </h2>
            {documents.length ? (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="text-sm text-zinc-300">
                    {doc.title ?? doc.document_type} (v{doc.version})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No drafts yet. Application generator coming in Phase 4.
              </p>
            )}
          </section>

          {application.notes ? (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Notes
              </h2>
              <p className="text-sm text-zinc-300">{application.notes}</p>
            </section>
          ) : null}
        </div>

        <AssistantPanel applicationId={id} companyName={application.company} />

        <Link href="/applications" className="mt-8 inline-block text-sm text-zinc-400 hover:text-zinc-200">
          ← Back to pipeline
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { JobActions } from "@/components/JobActions";
import { ScoreBadge, JobStatusBadge, TagList } from "@/components/badges";
import { DbError, PageHeader } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { getJobById } from "@/lib/queries";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const job = await getJobById(id);
    if (!job) notFound();

    const jobUrl = job.source_url ?? job.url;

    return (
      <div className="page-container">
        <PageHeader
          title={job.job_title}
          description={`${job.company}${job.location ? ` · ${job.location}` : ""}`}
          actions={
            jobUrl ? (
              <a
                href={jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                Open Original ↗
              </a>
            ) : null
          }
        />

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <ScoreBadge score={job.match_score} />
          <JobStatusBadge status={job.status} />
          {job.remote_option ? (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-300">
              {job.remote_option}
            </span>
          ) : null}
        </div>

        <JobActions jobId={job.id} />

        <p className="mt-3 text-xs text-zinc-500">
          Apply creates an application · then use Generate / Edit Application on the application page.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {job.match_score != null ? (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Match Score
                </h2>
                <p className="mt-2 text-4xl font-bold text-emerald-400">
                  {job.match_score}
                  <span className="text-lg text-zinc-500"> / 100</span>
                </p>
                {job.match_recommendation ? (
                  <p className="mt-2 text-sm text-zinc-300">{job.match_recommendation}</p>
                ) : null}
              </section>
            ) : null}

            {job.match_positives?.length ? (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-500">
                  Why it matches
                </h2>
                <ul className="space-y-1.5 text-sm text-zinc-300">
                  {job.match_positives.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-emerald-500">+</span> {p}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {job.match_warnings?.length ? (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-500">
                  Potential gaps
                </h2>
                <ul className="space-y-1.5 text-sm text-zinc-300">
                  {job.match_warnings.map((w) => (
                    <li key={w} className="flex gap-2">
                      <span className="text-amber-500">−</span> {w}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {job.job_description ? (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Description
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {job.job_description}
                </p>
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Details
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-zinc-500">Employment</dt>
                  <dd>{job.employment_type ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Weekly hours</dt>
                  <dd>{job.weekly_hours ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Date posted</dt>
                  <dd>{formatDate(job.date_posted)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">First seen</dt>
                  <dd>{formatDateTime(job.first_seen_at)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Last seen</dt>
                  <dd>{formatDateTime(job.last_seen_at)}</dd>
                </div>
                {job.analysis_status ? (
                  <div>
                    <dt className="text-zinc-500">Analysis</dt>
                    <dd className="capitalize">{job.analysis_status.replace(/_/g, " ")}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Required Technologies
              </h2>
              <TagList items={job.required_technologies} />
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Preferred Technologies
              </h2>
              <TagList items={job.preferred_technologies} />
            </section>

            {job.tasks?.length ? (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Tasks
                </h2>
                <TagList items={job.tasks} />
              </section>
            ) : null}
          </div>
        </div>

        <div className="mt-8">
          <Link href="/jobs" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back to jobs
          </Link>
        </div>
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

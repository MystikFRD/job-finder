import { RunSearchButton } from "@/components/RunSearchButton";
import { requireUserId } from "@/lib/auth";
import { getManualRunStatus } from "@/lib/n8n-trigger";
import Link from "next/link";
import { ScoreBadge, JobStatusBadge } from "@/components/badges";
import { ActionItemsPanel } from "@/components/ActionItemsPanel";
import { DbError, PageHeader, StatCard } from "@/components/ui";
import { getActionItems } from "@/lib/action-items";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  getDashboardStats,
  getLatestSearchRun,
  getTopJobs,
} from "@/lib/queries";

export default async function DashboardPage() {
  try {
    const userId = await requireUserId();
    const [stats, topJobs, latestRun, actionItems, manualRun] = await Promise.all([
      getDashboardStats(),
      getTopJobs(8),
      getLatestSearchRun(),
      getActionItems(),
      getManualRunStatus(userId),
    ]);

    return (
      <div className="page-container">
        <PageHeader
          title="Dashboard"
          description="Overview of your job search pipeline"
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="New Jobs" value={stats.new_jobs} />
          <StatCard label="Good Matches (70+)" value={stats.good_matches} />
          <StatCard label="Applications Sent" value={stats.applications_sent} />
          <StatCard label="Waiting for Response" value={stats.waiting_for_response} />
          <StatCard label="Interviews" value={stats.interviews} />
          <StatCard label="Rejections" value={stats.rejections} />
          <StatCard label="Offers" value={stats.offers} />
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-medium text-zinc-100">Action items</h2>
          <ActionItemsPanel items={actionItems} />
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-zinc-100">Top Matches</h2>
              <Link href="/jobs" className="text-sm text-zinc-400 hover:text-zinc-200">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {topJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition hover:border-zinc-700 sm:flex-row sm:items-center sm:gap-4"
                >
                  <ScoreBadge score={job.match_score} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">{job.job_title}</p>
                    <p className="truncate text-sm text-zinc-400">
                      {job.company} · {job.location ?? "—"}
                    </p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </Link>
              ))}
              {!topJobs.length ? (
                <p className="text-sm text-zinc-500">No analyzed jobs yet. Run the n8n search workflow.</p>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-medium text-zinc-100">Latest Search Run</h2>
            {latestRun ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-sm text-zinc-400">{formatDateTime(latestRun.started_at)}</p>
                <p className="mt-2 text-2xl font-semibold capitalize text-zinc-100">
                  {latestRun.status}
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Raw results</dt>
                    <dd>{latestRun.results_found}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">New jobs</dt>
                    <dd className="text-emerald-400">{latestRun.new_jobs_found}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Existing seen</dt>
                    <dd>{latestRun.existing_jobs_seen ?? 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Analyzed</dt>
                    <dd>{latestRun.jobs_analyzed}</dd>
                  </div>
                </dl>
                <Link
                  href="/search-runs"
                  className="mt-4 inline-block text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Search history →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No search runs recorded yet.</p>
            )}

            <div className="mt-4">
              <RunSearchButton
                canRunToday={manualRun.canRunToday}
                unlimitedManualRuns={manualRun.unlimitedManualRuns}
                variant="secondary"
              />
            </div>

            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="text-sm font-medium text-zinc-300">Automation</h3>
              <p className="mt-2 text-xs text-zinc-500">
                Scheduled search runs once daily at 08:00 UTC (if enabled in Settings).
                Manual runs are also limited to once per day. Last run{" "}
                {latestRun ? formatRelative(latestRun.finished_at ?? latestRun.started_at) : "—"}.
              </p>
            </div>
          </section>
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

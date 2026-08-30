import { RunSearchButton } from "@/components/RunSearchButton";
import { DbError, PageHeader } from "@/components/ui";
import { requireUserId } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getManualRunStatus } from "@/lib/n8n-trigger";
import { getSearchRuns } from "@/lib/queries";

export default async function SearchRunsPage() {
  try {
    const userId = await requireUserId();
    const [runs, manualRun] = await Promise.all([
      getSearchRuns(),
      getManualRunStatus(userId),
    ]);

    return (
      <div className="page-container">
        <PageHeader
          title="Search Runs"
          description="Automation history from n8n job finder"
        />

        <RunSearchButton
          canRunToday={manualRun.canRunToday}
          unlimitedManualRuns={manualRun.unlimitedManualRuns}
          className="mb-6"
        />

        <div className="space-y-4">
          {runs.map((run) => {
            const details = run.run_details as Record<string, number> | null;
            return (
              <article
                key={run.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">{formatDateTime(run.started_at)}</p>
                    <p className="mt-1 text-lg font-medium capitalize text-zinc-100">
                      {run.status}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-zinc-500">Raw results</p>
                      <p className="font-medium">{run.results_found}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">New jobs</p>
                      <p className="font-medium text-emerald-400">{run.new_jobs_found}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Existing</p>
                      <p className="font-medium">{run.existing_jobs_seen ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Analyzed</p>
                      <p className="font-medium">{run.jobs_analyzed}</p>
                    </div>
                  </div>
                </div>

                {details ? (
                  <dl className="mt-4 grid gap-2 border-t border-zinc-800 pt-4 text-xs sm:grid-cols-3">
                    {details.parsed_jobs != null ? (
                      <div>
                        <dt className="text-zinc-500">Parsed</dt>
                        <dd>{details.parsed_jobs}</dd>
                      </div>
                    ) : null}
                    {details.jobs_location_filtered != null ? (
                      <div>
                        <dt className="text-zinc-500">Location filtered</dt>
                        <dd>{details.jobs_location_filtered}</dd>
                      </div>
                    ) : null}
                    {details.jobs_deduped_pre_db != null ? (
                      <div>
                        <dt className="text-zinc-500">Pre-DB deduped</dt>
                        <dd>{details.jobs_deduped_pre_db}</dd>
                      </div>
                    ) : null}
                    {details.analysis_failed != null ? (
                      <div>
                        <dt className="text-zinc-500">Analysis failed</dt>
                        <dd className="text-amber-400">{details.analysis_failed}</dd>
                      </div>
                    ) : null}
                    {details.score_filtered != null ? (
                      <div>
                        <dt className="text-zinc-500">Score filtered (&lt;40)</dt>
                        <dd>{details.score_filtered}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}

                {run.error_message ? (
                  <p className="mt-3 text-sm text-red-400">{run.error_message}</p>
                ) : null}
              </article>
            );
          })}

          {!runs.length ? (
            <p className="text-sm text-zinc-500">No search runs yet.</p>
          ) : null}
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

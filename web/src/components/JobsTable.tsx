import Link from "next/link";
import { ScoreBadge, JobStatusBadge } from "@/components/badges";
import { formatDate, formatRelative } from "@/lib/format";
import type { Job } from "@/lib/types";

export function JobsTable({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500 sm:p-12">
        No jobs found.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-700"
          >
            <div className="flex items-start gap-3">
              <ScoreBadge score={job.match_score} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{job.job_title}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  {job.remote_option ? (
                    <span className="capitalize">{job.remote_option}</span>
                  ) : null}
                  <span>{formatRelative(job.first_seen_at)}</span>
                  <JobStatusBadge status={job.status} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-zinc-800 md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Found</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-zinc-800/80 transition hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3">
                  <ScoreBadge score={job.match_score} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-medium text-zinc-100 hover:text-white"
                  >
                    {job.job_title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-300">{job.company}</td>
                <td className="px-4 py-3 text-zinc-400">{job.location ?? "—"}</td>
                <td className="px-4 py-3 capitalize text-zinc-400">
                  {job.remote_option ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-500" title={formatDate(job.first_seen_at)}>
                  {formatRelative(job.first_seen_at)}
                </td>
                <td className="px-4 py-3">
                  <JobStatusBadge status={job.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

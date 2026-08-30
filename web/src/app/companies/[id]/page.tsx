import Link from "next/link";
import { notFound } from "next/navigation";
import { AssistantPanel } from "@/components/AssistantPanel";
import { AppStatusBadge, ScoreBadge } from "@/components/badges";
import { DbError, PageHeader } from "@/components/ui";
import { getCompanyById } from "@/lib/queries";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const data = await getCompanyById(id);
    if (!data) notFound();

    const { company, jobs, applications } = data;

    return (
      <div className="page-container">
        <PageHeader title={company.name} description={company.location ?? undefined} />

        <dl className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <dt className="text-xs text-zinc-500">Jobs discovered</dt>
            <dd className="text-2xl font-semibold">{company.job_count}</dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <dt className="text-xs text-zinc-500">Applications</dt>
            <dd className="text-2xl font-semibold">{company.application_count}</dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <dt className="text-xs text-zinc-500">Interviews</dt>
            <dd className="text-2xl font-semibold">
              {applications.filter((a) => a.status.includes("interview")).length}
            </dd>
          </div>
        </dl>

        <AssistantPanel companyName={company.name} />

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-medium">Jobs</h2>
          <ul className="space-y-2">
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 px-4 py-2">
                <ScoreBadge score={j.match_score} />
                <Link href={`/jobs/${j.id}`} className="text-sm text-zinc-200 hover:text-white">
                  {j.job_title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-medium">Applications</h2>
          <ul className="space-y-2">
            {applications.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-2">
                <Link href={`/applications/${a.id}`} className="text-sm text-zinc-200">
                  {a.job_title}
                </Link>
                <AppStatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </section>

        <Link href="/companies" className="mt-8 inline-block text-sm text-zinc-400">← Companies</Link>
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

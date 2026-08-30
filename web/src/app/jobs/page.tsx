import { JobsTable } from "@/components/JobsTable";
import { DbError, PageHeader } from "@/components/ui";
import { getJobs } from "@/lib/queries";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  try {
    const jobs = await getJobs({
      q: params.q,
      status: params.status,
      minScore: params.minScore ? Number(params.minScore) : undefined,
      remote: params.remote,
      sort: params.sort,
      order: params.order as "asc" | "desc" | undefined,
    });

    return (
      <div className="page-container">
        <PageHeader
          title="Jobs"
          description={`${jobs.length} discovered jobs`}
        />

        <form className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search title, company, location…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 sm:col-span-2 lg:col-span-1"
          />
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="interesting">Interesting</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="ignored">Ignored</option>
            <option value="expired">Expired</option>
          </select>
          <select
            name="minScore"
            defaultValue={params.minScore ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Any score</option>
            <option value="40">40+</option>
            <option value="60">60+</option>
            <option value="70">70+</option>
            <option value="80">80+</option>
          </select>
          <select
            name="sort"
            defaultValue={params.sort ?? "score"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="score">Match score</option>
            <option value="newest">Newest found</option>
            <option value="oldest">Oldest found</option>
            <option value="company">Company</option>
            <option value="posted">Date posted</option>
          </select>
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white sm:col-span-2 lg:col-span-1 lg:w-auto"
          >
            Filter
          </button>
        </form>

        <JobsTable jobs={jobs} />
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

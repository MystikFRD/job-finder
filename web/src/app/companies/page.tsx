import Link from "next/link";
import { DbError, PageHeader } from "@/components/ui";
import { getCompanies } from "@/lib/queries";

export default async function CompaniesPage() {
  try {
    const companies = await getCompanies();

    return (
      <div className="page-container">
        <PageHeader
          title="Companies"
          description="Employers discovered through your job search"
        />

        {companies.length ? (
          <>
            <div className="space-y-2 md:hidden">
              {companies.map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-700"
                >
                  <p className="font-medium text-zinc-100">{c.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">{c.location ?? "—"}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {c.job_count} jobs · {c.application_count} applications
                  </p>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-zinc-800 md:block">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Jobs</th>
                    <th className="px-4 py-3">Applications</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/40">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/companies/${c.id}`} className="text-zinc-100 hover:text-white">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{c.location ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-300">{c.job_count}</td>
                      <td className="px-4 py-3 text-zinc-300">{c.application_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
            Companies appear when you create applications from jobs.
          </p>
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

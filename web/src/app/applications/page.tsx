import Link from "next/link";
import { KanbanBoard } from "@/components/KanbanBoard";
import { DbError, PageHeader } from "@/components/ui";
import { getApplications } from "@/lib/queries";

export default async function ApplicationsPage() {
  try {
    const applications = await getApplications();

    return (
      <div className="page-container">
        <PageHeader
          title="Applications"
          description="Track your application pipeline"
        />
        <KanbanBoard applications={applications} />
        {applications.length ? (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-zinc-400">All applications</h2>
            <ul className="space-y-2">
              {applications.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/applications/${app.id}`}
                    className="text-sm text-zinc-300 hover:text-white"
                  >
                    {app.company} — {app.job_title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            No applications yet. Open a job and click Apply to start.
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

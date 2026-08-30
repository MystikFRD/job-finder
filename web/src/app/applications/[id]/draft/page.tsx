import Link from "next/link";
import { notFound } from "next/navigation";
import { AssistantPanel } from "@/components/AssistantPanel";
import { DraftEditor } from "@/components/DraftEditor";
import { DbError, PageHeader } from "@/components/ui";
import { getApplicationById } from "@/lib/queries";

export default async function ApplicationDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const data = await getApplicationById(id);
    if (!data?.job) notFound();

    const currentDoc = data.documents.find(
      (d) => d.document_type === "cover_letter" && d.is_current,
    ) ?? data.documents[0] ?? null;

    return (
      <div className="page-container">
        <PageHeader
          title="Application Editor"
          description={`${data.application.company} — ${data.application.job_title}`}
          actions={
            <Link
              href={`/applications/${id}`}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
            >
              ← Application
            </Link>
          }
        />
        <p className="mb-6 text-xs text-amber-400/90">
          AI prepares drafts only — review and send applications yourself.
        </p>
        <DraftEditor applicationId={id} job={data.job} initialDocument={currentDoc} />
        <div className="mt-8">
          <AssistantPanel applicationId={id} companyName={data.application.company} />
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

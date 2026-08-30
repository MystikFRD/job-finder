import { NextResponse } from "next/server";
import { buildCoverLetterExport } from "@/lib/export-document";
import { coverLetterFilename } from "@/lib/export-filename";
import { getApplicationById, getUserProfile } from "@/lib/queries";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      format?: "docx" | "pdf";
      content?: string;
    };

    if (body.format !== "docx" && body.format !== "pdf") {
      return NextResponse.json({ error: "Format muss docx oder pdf sein." }, { status: 400 });
    }

    const [data, profile] = await Promise.all([
      getApplicationById(id),
      getUserProfile(),
    ]);
    if (!data) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const { buffer, mimeType } = await buildCoverLetterExport(
      body.content ?? "",
      body.format,
      {
        applicantName: profile?.full_name,
        applicantLocation: profile?.location,
        applicantEmail: profile?.email,
        applicantPhone: profile?.phone,
        company: data.application.company,
        jobTitle: data.application.job_title ?? data.job?.job_title,
      },
    );

    const filename = coverLetterFilename(data.application.company ?? "Bewerbung", body.format);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

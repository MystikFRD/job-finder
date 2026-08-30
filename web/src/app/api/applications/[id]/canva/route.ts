import { NextResponse } from "next/server";
import { getValidCanvaAccessToken, importDocxToCanva, isCanvaConfigured } from "@/lib/canva";
import { buildCoverLetterDocx } from "@/lib/export-document";
import { getApplicationById, getUserProfile } from "@/lib/queries";
import { requireUserId } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isCanvaConfigured()) {
      return NextResponse.json(
        { error: "Canva ist auf dem Server nicht konfiguriert." },
        { status: 503 },
      );
    }

    const userId = await requireUserId();
    const { id } = await context.params;
    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Kein Anschreiben-Text vorhanden." }, { status: 400 });
    }

    const [data, profile] = await Promise.all([
      getApplicationById(id),
      getUserProfile(),
    ]);
    if (!data) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const docx = await buildCoverLetterDocx(content, {
      applicantName: profile?.full_name,
      applicantLocation: profile?.location,
      applicantEmail: profile?.email,
      applicantPhone: profile?.phone,
      company: data.application.company,
      jobTitle: data.application.job_title ?? data.job?.job_title,
    });

    const title = `Anschreiben — ${data.application.company ?? "Bewerbung"}`;
    const accessToken = await getValidCanvaAccessToken(userId);
    const editUrl = await importDocxToCanva({
      accessToken,
      file: docx,
      title,
    });

    return NextResponse.json({ edit_url: editUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canva Import fehlgeschlagen";
    const status = message.includes("nicht verbunden") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { generateCoverLetter, regenerateDocument } from "@/lib/assistant";
import { getApplicationById, getUserProfile, saveApplicationDocument } from "@/lib/queries";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, tone, length, instruction, content } = body as {
      action?: string;
      tone?: string;
      length?: "short" | "standard";
      instruction?: string;
      content?: string;
    };

    const data = await getApplicationById(id);
    if (!data?.job) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Profile not configured" }, { status: 400 });
    }

    if (action === "regenerate" && content && instruction) {
      const revised = await regenerateDocument(content, instruction);
      const doc = await saveApplicationDocument(
        id,
        "cover_letter",
        `Anschreiben — ${data.job.company}`,
        revised,
        true,
      );
      return NextResponse.json({ content: revised, document: doc });
    }

    const letter = await generateCoverLetter(data.job, profile, { tone, length });
    const doc = await saveApplicationDocument(
      id,
      "cover_letter",
      `Anschreiben — ${data.job.company}`,
      letter,
      !!body.createVersion,
    );

    return NextResponse.json({ content: letter, document: doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { content, title, createVersion } = body as {
      content: string;
      title?: string;
      createVersion?: boolean;
    };

    const doc = await saveApplicationDocument(
      id,
      "cover_letter",
      title ?? "Anschreiben",
      content,
      createVersion ?? false,
    );
    return NextResponse.json(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

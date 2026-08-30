import { NextResponse } from "next/server";
import { createApplicationFromJob, updateJobStatus } from "@/lib/queries";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, status } = body as { action?: string; status?: string };

    if (action === "apply") {
      const result = await createApplicationFromJob(id);
      if (!result?.id) {
        return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
      }
      return NextResponse.json({ redirect: `/applications/${result.id}` });
    }

    if (action === "status" && status) {
      await updateJobStatus(id, status);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

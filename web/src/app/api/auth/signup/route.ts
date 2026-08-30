import { NextResponse } from "next/server";
import {
  createSession,
  createUserAccount,
  findUserByEmail,
  verifyPassword,
} from "@/lib/auth";
import { provisionUserWorkflows } from "@/lib/n8n-provision";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    if (!email?.trim() || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Email and password (min 8 characters) required" },
        { status: 400 },
      );
    }

    const user = await createUserAccount({
      email,
      password,
      displayName,
    });

    try {
      await provisionUserWorkflows(user.id, user.email);
    } catch (err) {
      console.error("n8n workflow provisioning failed:", err);
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

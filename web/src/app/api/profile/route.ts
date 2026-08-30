import { NextResponse } from "next/server";
import { getUserProfile, updateUserProfile } from "@/lib/queries";

export async function GET() {
  try {
    const profile = await getUserProfile();
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const profile = await updateUserProfile(body);
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

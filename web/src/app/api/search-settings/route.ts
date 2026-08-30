import { NextResponse } from "next/server";
import {
  getSearchSettings,
  updateSearchSettings,
} from "@/lib/search-settings";

export async function GET() {
  try {
    const settings = await getSearchSettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const settings = await updateSearchSettings(body);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

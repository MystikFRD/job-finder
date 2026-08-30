import OpenAI from "openai";
import { requireUserId } from "./auth";
import { getDecryptedApiKeys } from "./search-settings";

const clients = new Map<string, OpenAI>();

export async function getOpenAIForUser(userId?: string) {
  const resolvedUserId = userId ?? (await requireUserId());
  const cached = clients.get(resolvedUserId);
  if (cached) return cached;

  const keys = await getDecryptedApiKeys(resolvedUserId);
  const apiKey = keys.openai_api_key ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Add it in Settings → API Keys.",
    );
  }

  const client = new OpenAI({ apiKey });
  clients.set(resolvedUserId, client);
  return client;
}

export async function chatComplete(
  system: string,
  user: string,
  options?: { model?: string; temperature?: number; userId?: string },
) {
  const openai = await getOpenAIForUser(options?.userId);
  const response = await openai.chat.completions.create({
    model: options?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: options?.temperature ?? 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

export async function chatJson<T>(
  system: string,
  user: string,
  options?: { userId?: string },
): Promise<T> {
  const text = await chatComplete(
    system + "\nRespond with valid JSON only, no markdown fences.",
    user,
    { temperature: 0.3, userId: options?.userId },
  );
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

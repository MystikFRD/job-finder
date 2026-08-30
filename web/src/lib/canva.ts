import { createHash, randomBytes } from "crypto";
import { getAppUrl } from "./app-url";
import {
  deleteCanvaConnection,
  getDecryptedCanvaTokens,
  saveCanvaTokens,
  type CanvaTokens,
} from "./canva-connection";

const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const CANVA_IMPORT_URL = "https://api.canva.com/rest/v1/imports";

export const CANVA_SCOPES = ["design:content:write"];

export function isCanvaConfigured(): boolean {
  return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
}

function getCanvaCredentials() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Canva ist auf dem Server nicht konfiguriert (CANVA_CLIENT_ID / CANVA_CLIENT_SECRET).");
  }
  return { clientId, clientSecret };
}

export function getCanvaRedirectUri(): string {
  return `${getAppUrl()}/api/canva/callback`;
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function buildCanvaAuthorizeUrl(input: {
  state: string;
  codeChallenge: string;
}): string {
  const { clientId } = getCanvaCredentials();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getCanvaRedirectUri(),
    scope: CANVA_SCOPES.join(" "),
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    state: input.state,
  });
  return `${CANVA_AUTH_URL}?${params.toString()}`;
}

async function requestCanvaTokens(body: URLSearchParams): Promise<CanvaTokens> {
  const { clientId, clientSecret } = getCanvaCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await res.json()) as CanvaTokens & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.error_description ?? data.error ?? "Canva Token-Anfrage fehlgeschlagen",
    );
  }

  return data;
}

export async function exchangeCanvaCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<CanvaTokens> {
  return requestCanvaTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: getCanvaRedirectUri(),
    }),
  );
}

export async function refreshCanvaTokens(refreshToken: string): Promise<CanvaTokens> {
  return requestCanvaTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export async function getValidCanvaAccessToken(userId: string): Promise<string> {
  const tokens = await getDecryptedCanvaTokens(userId);
  if (!tokens) {
    throw new Error("Canva ist nicht verbunden. Bitte in den Settings verbinden.");
  }

  if (tokens.expires_in > 120) {
    return tokens.access_token;
  }

  const refreshed = await refreshCanvaTokens(tokens.refresh_token);
  await saveCanvaTokens(userId, refreshed);
  return refreshed.access_token;
}

export async function revokeCanvaConnection(userId: string): Promise<void> {
  const tokens = await getDecryptedCanvaTokens(userId);
  if (tokens) {
    try {
      const { clientId, clientSecret } = getCanvaCredentials();
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      await fetch(CANVA_TOKEN_URL.replace("/token", "/revoke"), {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token: tokens.refresh_token }),
      });
    } catch {
      // Best-effort revoke; still clear local tokens.
    }
  }
  await deleteCanvaConnection(userId);
}

interface ImportJobResponse {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    result?: {
      designs?: Array<{
        urls?: { edit_url?: string; view_url?: string };
      }>;
    };
    error?: { code?: string; message?: string };
  };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function importDocxToCanva(input: {
  accessToken: string;
  file: Buffer;
  title: string;
}): Promise<string> {
  const title = input.title.trim().slice(0, 50) || "Anschreiben";
  const metadata = JSON.stringify({
    title_base64: Buffer.from(title, "utf8").toString("base64"),
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const createRes = await fetch(CANVA_IMPORT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/octet-stream",
      "Import-Metadata": metadata,
    },
    body: new Uint8Array(input.file),
  });

  const created = (await createRes.json()) as ImportJobResponse & {
    error?: string;
    message?: string;
  };

  if (!createRes.ok) {
    throw new Error(created.message ?? created.error ?? "Canva Import fehlgeschlagen");
  }

  const jobId = created.job?.id;
  if (!jobId) {
    throw new Error("Canva Import: keine Job-ID erhalten");
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const statusRes = await fetch(`${CANVA_IMPORT_URL}/${jobId}`, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    const status = (await statusRes.json()) as ImportJobResponse;

    if (!statusRes.ok) {
      throw new Error("Canva Import-Status konnte nicht abgerufen werden");
    }

    if (status.job.status === "success") {
      const editUrl = status.job.result?.designs?.[0]?.urls?.edit_url;
      if (!editUrl) {
        throw new Error("Canva Import erfolgreich, aber keine Bearbeitungs-URL erhalten");
      }
      return editUrl;
    }

    if (status.job.status === "failed") {
      throw new Error(
        status.job.error?.message ?? "Canva konnte die Datei nicht importieren",
      );
    }

    await sleep(1000);
  }

  throw new Error("Canva Import dauert zu lange — bitte später erneut versuchen");
}

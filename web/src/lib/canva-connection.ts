import { decryptSecret, encryptSecret } from "./crypto";
import { query, queryOne } from "./db";

export interface CanvaTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function getCanvaConnection(userId: string) {
  return queryOne<{
    access_token_enc: string;
    refresh_token_enc: string;
    expires_at: string;
  }>(
    `SELECT access_token_enc, refresh_token_enc, expires_at
     FROM canva_connections WHERE user_id = $1`,
    [userId],
  );
}

export async function isCanvaConnected(userId: string): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM canva_connections WHERE user_id = $1) AS exists`,
    [userId],
  );
  return row?.exists ?? false;
}

export async function saveCanvaTokens(userId: string, tokens: CanvaTokens): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await query(
    `INSERT INTO canva_connections (user_id, access_token_enc, refresh_token_enc, expires_at)
     VALUES ($1, $2, $3, $4::timestamptz)
     ON CONFLICT (user_id) DO UPDATE SET
       access_token_enc = EXCLUDED.access_token_enc,
       refresh_token_enc = EXCLUDED.refresh_token_enc,
       expires_at = EXCLUDED.expires_at,
       updated_at = timezone('utc', now())`,
    [
      userId,
      encryptSecret(tokens.access_token),
      encryptSecret(tokens.refresh_token),
      expiresAt,
    ],
  );
}

export async function deleteCanvaConnection(userId: string): Promise<void> {
  await query(`DELETE FROM canva_connections WHERE user_id = $1`, [userId]);
}

export async function getDecryptedCanvaTokens(userId: string): Promise<CanvaTokens | null> {
  const row = await getCanvaConnection(userId);
  if (!row) return null;
  const access_token = decryptSecret(row.access_token_enc);
  const refresh_token = decryptSecret(row.refresh_token_enc);
  if (!access_token || !refresh_token) return null;
  const expiresMs = new Date(row.expires_at).getTime() - Date.now();
  return {
    access_token,
    refresh_token,
    expires_in: Math.max(0, Math.floor(expiresMs / 1000)),
  };
}

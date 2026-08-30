import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { query, queryOne } from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./auth-edge";

export { SESSION_COOKIE, verifySessionToken };

export interface SessionUser {
  id: string;
  email: string;
  display_name: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set (min 32 characters)");
  }
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return queryOne<SessionUser>(
    `SELECT id, email, display_name FROM users WHERE id = $1`,
    [userId],
  );
}

export async function findUserByEmail(email: string) {
  return queryOne<{ id: string; email: string; password_hash: string }>(
    `SELECT id, email, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
}

export async function createUserAccount(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<SessionUser> {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  const legacyClaim =
    existing?.password_hash.startsWith("$2a$12$LEGACYPLACEHOLDER") ?? false;

  if (existing && !legacyClaim) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  if (existing && legacyClaim) {
    const user = await queryOne<SessionUser>(
      `UPDATE users SET password_hash = $2, display_name = coalesce($3, display_name), updated_at = timezone('utc', now())
       WHERE id = $1
       RETURNING id, email, display_name`,
      [existing.id, passwordHash, input.displayName?.trim() || null],
    );
    if (!user) throw new Error("Failed to activate account");
    return user;
  }

  const user = await queryOne<SessionUser>(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name`,
    [email, passwordHash, input.displayName?.trim() || null],
  );
  if (!user) throw new Error("Failed to create user");

  await query(
    `INSERT INTO search_settings (user_id, search_queries, match_skills)
     VALUES ($1, $2::jsonb, $3::jsonb)`,
    [
      user.id,
      JSON.stringify([
        "Werkstudent Informatik Köln",
        "Werkstudent Softwareentwicklung Köln",
        "Werkstudent Python Köln",
        "Working Student Software Cologne",
      ]),
      JSON.stringify(["Python", "Git", "React", "JavaScript"]),
    ],
  );

  await query(
    `INSERT INTO user_profile (user_id, full_name, email)
     VALUES ($1, $2, $3)`,
    [user.id, input.displayName?.trim() || "My Profile", email],
  );

  await query(`INSERT INTO email_settings (user_id) VALUES ($1)`, [user.id]);

  return user;
}

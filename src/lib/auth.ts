import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  type Role,
} from "./session";

export type { Role };

export async function getSession(): Promise<Role | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<Role | null> {
  const candidates: Array<{ user?: string; hash?: string; role: Role }> = [
    { user: process.env.ADMIN_USERNAME, hash: process.env.ADMIN_PASSWORD_HASH, role: "admin" },
    { user: process.env.PLAYER_USERNAME, hash: process.env.PLAYER_PASSWORD_HASH, role: "player" },
  ];

  for (const candidate of candidates) {
    if (!candidate.user || !candidate.hash) continue;
    if (username !== candidate.user) continue;
    const ok = await bcrypt.compare(password, candidate.hash);
    if (ok) return candidate.role;
  }

  return null;
}

export async function setSessionCookie(role: Role) {
  const token = await createSessionToken(role);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireAdmin(): Promise<Role> {
  const role = await getSession();
  if (role !== "admin") throw new Error("No autorizado");
  return role;
}

export async function requireSession(): Promise<Role> {
  const role = await getSession();
  if (!role) throw new Error("No autorizado");
  return role;
}

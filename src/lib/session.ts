import { SignJWT, jwtVerify } from "jose";

export type Role = "admin" | "player";
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 dias

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno SESSION_SECRET");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<Role | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role === "admin" || payload.role === "player") {
      return payload.role;
    }
  } catch {
    // token invalido o vencido
  }
  return null;
}

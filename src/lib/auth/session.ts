import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

export const ADMIN_SESSION_COOKIE_NAME: string = 'admin_session';
const SESSION_DURATION_SECONDS: number = 7 * 24 * 60 * 60;

export interface AdminSessionPayload extends JWTPayload {
  sub: string;
  email: string;
  role: string;
}

function getJwtSecret(): Uint8Array {
  const configuredSecret: string | undefined = process.env.AUTH_JWT_SECRET;

  if (process.env.NODE_ENV === 'production' && !configuredSecret) {
    const error: Error = new Error('缺少 AUTH_JWT_SECRET，生产环境已触发安全熔断并禁止应用继续提供鉴权服务。');
    console.error(error.message);
    throw error;
  }

  const secret: string | undefined = configuredSecret
    || (process.env.NODE_ENV !== 'production' ? 'dev-only-housecare-admin-session-secret' : undefined);

  if (!secret) {
    throw new Error('缺少 AUTH_JWT_SECRET，生产环境禁止使用默认会话密钥。');
  }

  return new TextEncoder().encode(secret);
}

export async function signAdminSession(payload: {
  adminId: string;
  email: string;
  role: string;
}): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return null;
    }

    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}

export async function getCurrentAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token: string | undefined = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token);
}

export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session: AdminSessionPayload | null = await getCurrentAdminSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

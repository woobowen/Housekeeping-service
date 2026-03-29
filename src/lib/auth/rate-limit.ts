import 'server-only';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { db } from '@/lib/prisma';

const LOGIN_RATE_LIMIT_WINDOW_MS: number = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS: number = 5;
const LOGIN_RATE_LIMIT_BLOCK_MS: number = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_KEY_PREFIX: string = 'security:login-rate-limit:';

type LoginRateLimitState = {
  count: number;
  firstAttemptAt: string;
  blockedUntil?: string;
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function buildRateLimitKey(identifier: string): string {
  return `${LOGIN_RATE_LIMIT_KEY_PREFIX}${sha256(identifier)}`;
}

function parseRateLimitState(value: string | null): LoginRateLimitState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const state = parsed as LoginRateLimitState;
    if (typeof state.count !== 'number' || typeof state.firstAttemptAt !== 'string') {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

function getRequestIp(headerStore: Headers): string {
  const forwardedFor: string | null = headerStore.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown-ip';
  }

  return headerStore.get('x-real-ip') || 'unknown-ip';
}

export async function getLoginRateLimitIdentifier(email: string): Promise<string> {
  const headerStore: Headers = await headers();
  const requestIp: string = getRequestIp(headerStore);
  return `${email.trim().toLowerCase()}|${requestIp}`;
}

export async function assertLoginRateLimit(identifier: string): Promise<void> {
  const key: string = buildRateLimitKey(identifier);
  const setting = await db.systemSettings.findUnique({
    where: { key },
    select: { value: true },
  });

  const state: LoginRateLimitState | null = parseRateLimitState(setting?.value || null);
  if (!state?.blockedUntil) {
    return;
  }

  const blockedUntilTs: number = new Date(state.blockedUntil).getTime();
  if (Number.isFinite(blockedUntilTs) && blockedUntilTs > Date.now()) {
    throw new Error('登录失败次数过多，请 15 分钟后再试');
  }

  await db.systemSettings.deleteMany({
    where: { key },
  });
}

export async function recordLoginFailure(identifier: string): Promise<void> {
  const key: string = buildRateLimitKey(identifier);
  const existing = await db.systemSettings.findUnique({
    where: { key },
    select: { value: true },
  });

  const now: Date = new Date();
  const nowTs: number = now.getTime();
  const state: LoginRateLimitState | null = parseRateLimitState(existing?.value || null);
  const firstAttemptTs: number | null = state ? new Date(state.firstAttemptAt).getTime() : null;
  const isSameWindow: boolean = firstAttemptTs !== null && Number.isFinite(firstAttemptTs)
    && nowTs - firstAttemptTs <= LOGIN_RATE_LIMIT_WINDOW_MS;

  const nextCount: number = isSameWindow ? (state?.count || 0) + 1 : 1;
  const nextState: LoginRateLimitState = {
    count: nextCount,
    firstAttemptAt: isSameWindow && state ? state.firstAttemptAt : now.toISOString(),
    blockedUntil: nextCount >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS
      ? new Date(nowTs + LOGIN_RATE_LIMIT_BLOCK_MS).toISOString()
      : undefined,
  };

  await db.systemSettings.upsert({
    where: { key },
    update: {
      value: JSON.stringify(nextState),
      description: '管理员登录失败防爆破限流状态',
      updatedAt: now,
    },
    create: {
      key,
      value: JSON.stringify(nextState),
      description: '管理员登录失败防爆破限流状态',
    },
  });
}

export async function clearLoginFailures(identifier: string): Promise<void> {
  await db.systemSettings.deleteMany({
    where: {
      key: buildRateLimitKey(identifier),
    },
  });
}

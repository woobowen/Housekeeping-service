import 'server-only';

import { createHash, randomInt } from 'node:crypto';
import { db } from '@/lib/prisma';

export const REGISTER_CODE_TYPE: string = 'ADMIN_REGISTER';
export const REGISTER_CODE_RESEND_SECONDS: number = 60;
export const REGISTER_CODE_EXPIRES_MINUTES: number = 10;

function getVerificationPepper(): string {
  return process.env.AUTH_CODE_PEPPER
    || process.env.AUTH_JWT_SECRET
    || 'dev-only-housecare-verification-pepper';
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashVerificationCode(email: string, code: string): string {
  return createHash('sha256')
    .update(`${normalizeEmail(email)}:${code}:${getVerificationPepper()}`)
    .digest('hex');
}

export function generateVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function assertSendCodeRateLimit(email: string, type: string): Promise<void> {
  const windowStart: Date = new Date(Date.now() - REGISTER_CODE_RESEND_SECONDS * 1000);
  const latestRecord = await db.verificationCode.findFirst({
    where: {
      email: normalizeEmail(email),
      type,
      createdAt: {
        gte: windowStart,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (latestRecord) {
    throw new Error(`验证码发送过于频繁，请 ${REGISTER_CODE_RESEND_SECONDS} 秒后再试`);
  }
}

export async function createVerificationCodeRecord(email: string, type: string): Promise<{
  code: string;
  expiresAt: Date;
}> {
  const normalizedEmail: string = normalizeEmail(email);
  const code: string = generateVerificationCode();
  const expiresAt: Date = new Date(Date.now() + REGISTER_CODE_EXPIRES_MINUTES * 60 * 1000);

  await db.verificationCode.create({
    data: {
      email: normalizedEmail,
      codeHash: hashVerificationCode(normalizedEmail, code),
      type,
      expiresAt,
    },
  });

  return {
    code,
    expiresAt,
  };
}

export async function getValidVerificationCodeRecord(email: string, type: string) {
  return db.verificationCode.findFirst({
    where: {
      email: normalizeEmail(email),
      type,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function verifyRegisterCode(email: string, code: string): Promise<{ id: string } | null> {
  const normalizedEmail: string = normalizeEmail(email);
  const record = await getValidVerificationCodeRecord(normalizedEmail, REGISTER_CODE_TYPE);

  if (!record) {
    return null;
  }

  const incomingHash: string = hashVerificationCode(normalizedEmail, code);

  if (incomingHash !== record.codeHash) {
    return null;
  }

  return {
    id: record.id,
  };
}

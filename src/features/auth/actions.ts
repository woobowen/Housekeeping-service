'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  clearAdminSessionCookie,
  setAdminSessionCookie,
  signAdminSession,
} from '@/lib/auth/session';
import {
  assertLoginRateLimit,
  clearLoginFailures,
  getLoginRateLimitIdentifier,
  recordLoginFailure,
} from '@/lib/auth/rate-limit';
import { verifyRegisterCode } from '@/lib/auth/verification';
import { loginSchema, registerSchema, type AuthActionState } from './schema';

function getFormValue(formData: FormData, key: string): string {
  const value: FormDataEntryValue | null = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function login(_prevState: AuthActionState | null, formData: FormData): Promise<AuthActionState | null> {
  const parsed = loginSchema.safeParse({
    email: getFormValue(formData, 'email'),
    password: getFormValue(formData, 'password'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || '登录信息校验失败',
    };
  }

  const rateLimitIdentifier: string = await getLoginRateLimitIdentifier(parsed.data.email);

  try {
    await assertLoginRateLimit(rateLimitIdentifier);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '登录请求过于频繁，请稍后重试',
    };
  }

  const admin = await db.adminAccount.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });

  if (!admin || admin.status !== 'ACTIVE') {
    await recordLoginFailure(rateLimitIdentifier);
    return {
      error: '邮箱或密码错误',
    };
  }

  const passwordMatched: boolean = await verifyPassword(parsed.data.password, admin.passwordHash);

  if (!passwordMatched) {
    await recordLoginFailure(rateLimitIdentifier);
    return {
      error: '邮箱或密码错误',
    };
  }

  await clearLoginFailures(rateLimitIdentifier);

  const token: string = await signAdminSession({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  });

  await setAdminSessionCookie(token);

  await db.adminAccount.update({
    where: {
      id: admin.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  revalidatePath('/');
  redirect('/');
}

export async function register(_prevState: AuthActionState | null, formData: FormData): Promise<AuthActionState | null> {
  const parsed = registerSchema.safeParse({
    email: getFormValue(formData, 'email'),
    phone: getFormValue(formData, 'phone'),
    password: getFormValue(formData, 'password'),
    code: getFormValue(formData, 'code'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || '注册信息校验失败',
    };
  }

  const verifiedRecord: { id: string } | null = await verifyRegisterCode(parsed.data.email, parsed.data.code);

  if (!verifiedRecord) {
    return {
      error: '验证码无效、已过期或已被使用',
    };
  }

  const passwordHash: string = await hashPassword(parsed.data.password);

  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const duplicatedAdmin = await tx.adminAccount.findFirst({
        where: {
          OR: [
            { email: parsed.data.email },
            { phone: parsed.data.phone },
          ],
        },
        select: {
          email: true,
          phone: true,
        },
      });

      if (duplicatedAdmin?.email === parsed.data.email) {
        throw new Error('该邮箱已注册管理员账号');
      }

      if (duplicatedAdmin?.phone === parsed.data.phone) {
        throw new Error('该手机号已被占用');
      }

      await tx.adminAccount.create({
        data: {
          email: parsed.data.email,
          phone: parsed.data.phone,
          passwordHash,
          role: 'SUPER_ADMIN',
          emailVerifiedAt: new Date(),
        },
      });

      const consumeResult = await tx.verificationCode.updateMany({
        where: {
          id: verifiedRecord.id,
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      // 中文说明：验证码消费必须是原子动作，避免用户并发点击或重放请求导致同一验证码被重复使用。
      if (consumeResult.count !== 1) {
        throw new Error('验证码无效、已过期或已被使用');
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message,
      };
    }

    return {
      error: '注册失败，请稍后重试',
    };
  }

  redirect('/login?registered=1');
}

export async function logout() {
  await clearAdminSessionCookie();
  revalidatePath('/');
  redirect('/login');
}

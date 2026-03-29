import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createVerificationCodeRecord, REGISTER_CODE_TYPE } from '@/lib/auth/verification';

const requestSchema = z.object({
  email: z.string().email(),
});

function isE2EDebugEnabled(): boolean {
  return process.env.ENABLE_E2E_DEBUG === '1';
}

export async function POST(request: Request) {
  if (!isE2EDebugEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  if (!parsed.data.email.includes('golden-test')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 中文说明：该接口只在 E2E 调试环境下开放，用于生成一次性验证码，
  // 避免浏览器测试进程直连数据库，同时不暴露生产环境能力。
  const record = await createVerificationCodeRecord(parsed.data.email, REGISTER_CODE_TYPE);

  return NextResponse.json({
    code: record.code,
    expiresAt: record.expiresAt.toISOString(),
  });
}

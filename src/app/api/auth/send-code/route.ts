import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { sendRegisterVerificationCode } from '@/lib/auth/mailer';
import {
  assertSendCodeRateLimit,
  createVerificationCodeRecord,
  REGISTER_CODE_TYPE,
} from '@/lib/auth/verification';
import { sendCodeSchema } from '@/features/auth/schema';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = sendCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '邮箱格式不正确' },
        { status: 400 }
      );
    }

    const existingAdmin = await db.adminAccount.findUnique({
      where: {
        email: parsed.data.email,
      },
      select: {
        id: true,
      },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: '该邮箱已注册管理员账号' },
        { status: 409 }
      );
    }

    await assertSendCodeRateLimit(parsed.data.email, REGISTER_CODE_TYPE);
    const { code } = await createVerificationCodeRecord(parsed.data.email, REGISTER_CODE_TYPE);
    await sendRegisterVerificationCode(parsed.data.email, code);

    return NextResponse.json({
      message: '验证码已发送，请查看邮箱或终端模拟邮件日志',
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '验证码发送失败，请稍后重试' },
      { status: 500 }
    );
  }
}

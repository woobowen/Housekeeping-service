'use client';

import { useActionState, useRef, useState } from 'react';
import { register } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthActionState } from '@/features/auth/schema';

interface SendCodeState {
  error?: string;
  success?: string;
}

export function RegisterForm() {
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);
  const [sendCodeState, setSendCodeState] = useState<SendCodeState | null>(null);
  const [state, formAction, isPending] = useActionState<AuthActionState | null, FormData>(register, null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  function getNormalizedEmail(): string {
    return emailInputRef.current?.value.trim() ?? '';
  }

  async function handleSendCode(): Promise<void> {
    const normalizedEmail: string = getNormalizedEmail();

    if (!normalizedEmail) {
      setSendCodeState({
        error: '请先输入邮箱地址',
      });
      return;
    }

    setIsSendingCode(true);
    setSendCodeState(null);

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const result: { error?: string; message?: string } = await response.json();

      if (!response.ok) {
        setSendCodeState({
          error: result.error || '验证码发送失败',
        });
        return;
      }

      setSendCodeState({
        success: result.message || '验证码已发送，请查看邮箱',
      });
    } catch {
      setSendCodeState({
        error: '验证码发送失败，请检查网络或稍后重试',
      });
    } finally {
      setIsSendingCode(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_40%,_#f8fafc_100%)] px-4 py-10">
      <Card className="w-full max-w-lg border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
            创建管理员账号
          </CardTitle>
          <CardDescription className="text-slate-600">
            使用真实邮箱验证码完成首个后台管理员注册。手机号仅用于唯一性校验，不发送短信。
          </CardDescription>
        </CardHeader>
        <form action={formAction} data-testid="register-form">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                name="phone"
                inputMode="numeric"
                placeholder="请输入 11 位手机号"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                ref={emailInputRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@housecare.pro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="至少 8 位，包含大小写字母和数字"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">邮箱验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  placeholder="请输入 6 位验证码"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={isSendingCode}
                  data-testid="send-code-button"
                >
                  {isSendingCode ? '发送中...' : '获取验证码'}
                </Button>
              </div>
            </div>
            {sendCodeState?.success ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {sendCodeState.success}
              </p>
            ) : null}
            {sendCodeState?.error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {sendCodeState.error}
              </p>
            ) : null}
            {state?.error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {state.error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '注册中...' : '完成管理员注册'}
            </Button>
            <p className="text-center text-sm text-slate-500">
              已有管理员账号？<a href="/login" className="font-semibold text-slate-900 underline underline-offset-4">返回登录</a>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

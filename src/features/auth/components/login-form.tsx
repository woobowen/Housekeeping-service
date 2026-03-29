'use client';

import { useActionState, useMemo, useState } from 'react';
import { login } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import type { AuthActionState } from '@/features/auth/schema';

export function LoginForm({ registered }: { registered: boolean }) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [state, formAction, isPending] = useActionState<AuthActionState | null, FormData>(login, null);
  const helperMessage: string = useMemo(() => {
    if (registered) {
      return '管理员账号创建完成，请使用邮箱和密码登录。';
    }

    return '请输入管理员邮箱和密码';
  }, [registered]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#f8fafc_40%,_#e2e8f0_100%)] px-4">
      <Card className="w-full max-w-md border-slate-200 bg-white/95 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-black tracking-tight text-slate-900">
            HouseCare-Pro 登录
          </CardTitle>
          <CardDescription className="text-center text-slate-600">
            {helperMessage}
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@housecare.pro"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入登录密码"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {state?.error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {state.error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '登录中...' : '登录后台'}
            </Button>
            <p className="text-center text-sm text-slate-500">
              首次部署请先前往 <a href="/register" className="font-semibold text-slate-900 underline underline-offset-4">注册管理员</a>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

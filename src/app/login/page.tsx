import { LoginForm } from '@/features/auth/components/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;

  return <LoginForm registered={params.registered === '1'} />;
}

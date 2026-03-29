import { LogoutButton } from '@/components/logout-button';
import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <Link href="/" prefetch={false} className="flex items-center gap-2 font-semibold text-lg md:text-xl hover:text-primary transition-colors">
          <span>HouseCare-Pro</span>
        </Link>
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
        >
          🏠 工作台
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        {children}
      </main>
    </div>
  );
}

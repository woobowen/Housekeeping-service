import { LogoutButton } from '@/components/logout-button';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <Link href="/caregivers" className="flex items-center gap-2 font-semibold text-lg md:text-xl hover:text-primary transition-colors">
          <span>HouseCare-Pro</span>
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

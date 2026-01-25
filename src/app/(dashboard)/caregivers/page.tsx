import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCaregivers } from '@/features/caregivers/actions';
import { CaregiverList } from '@/features/caregivers/components/caregiver-list';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CaregiversPage() {
  const caregivers = await getCaregivers();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">护理员管理</h1>
          <p className="text-muted-foreground mt-2">
            管理系统中的所有护理员信息
          </p>
        </div>
        <Button asChild>
          <Link href="/caregivers/new">
            <Plus className="mr-2 h-4 w-4" />
            新建护理员
          </Link>
        </Button>
      </div>

      <CaregiverList data={caregivers} />
    </div>
  );
}

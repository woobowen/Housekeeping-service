import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCaregivers } from '@/features/caregivers/actions';
import { CaregiverList } from '@/features/caregivers/components/caregiver-list';
import { ComprehensiveFilter } from '@/features/caregivers/components/comprehensive-filter';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CaregiversPage(props: PageProps) {
  const searchParams = await props.searchParams;
  
  // Parse Params
  const page = Number(searchParams.page) || 1;
  const query = (searchParams.query as string) || '';
  const level = (searchParams.level as string) || undefined;
  const minExperience = (searchParams.minExperience as string) || undefined;
  const minAge = searchParams.minAge ? Number(searchParams.minAge) : undefined;
  const maxAge = searchParams.maxAge ? Number(searchParams.maxAge) : undefined;
  const nativePlace = (searchParams.nativePlace as string) || undefined;
  const gender = (searchParams.gender as string) || undefined;
  const liveInStatus = (searchParams.liveInStatus as string) || undefined;
  const education = (searchParams.education as string) || undefined;
  const jobType = (searchParams.jobType as string) || undefined;
  const certificate = (searchParams.certificate as string) || undefined;

  const { data, pagination } = await getCaregivers({ 
    page, 
    pageSize: 9, 
    query,
    level,
    minExperience,
    minAge,
    maxAge,
    nativePlace,
    gender,
    liveInStatus,
    education,
    jobType,
    certificate
  });

  // Helper to generate pagination URLs
  const createPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (level) params.set('level', level);
    if (minExperience) params.set('minExperience', minExperience);
    if (minAge) params.set('minAge', minAge.toString());
    if (maxAge) params.set('maxAge', maxAge.toString());
    if (nativePlace) params.set('nativePlace', nativePlace);
    if (gender) params.set('gender', gender);
    if (liveInStatus) params.set('liveInStatus', liveInStatus);
    if (education) params.set('education', education);
    if (jobType) params.set('jobType', jobType);
    if (certificate) params.set('certificate', certificate);
    
    params.set('page', newPage.toString());
    return `/caregivers?${params.toString()}`;
  };

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

      <ComprehensiveFilter />

      <CaregiverList data={data} />
      
      {/* Pagination Controls */}
      <div className="flex justify-center gap-2 mt-8">
        <Button 
          variant="outline" 
          disabled={pagination.current <= 1}
          asChild={pagination.current > 1}
        >
          {pagination.current > 1 ? (
            <Link href={createPageUrl(pagination.current - 1)}>上一页</Link>
          ) : (
            <span>上一页</span>
          )}
        </Button>
        
        <span className="flex items-center text-sm text-muted-foreground px-2">
          第 {pagination.current} / {pagination.totalPages || 1} 页
        </span>

        <Button 
          variant="outline" 
          disabled={pagination.current >= pagination.totalPages}
          asChild={pagination.current < pagination.totalPages}
        >
          {pagination.current < pagination.totalPages ? (
             <Link href={createPageUrl(pagination.current + 1)}>下一页</Link>
          ) : (
            <span>下一页</span>
          )}
        </Button>
      </div>
    </div>
  );
}

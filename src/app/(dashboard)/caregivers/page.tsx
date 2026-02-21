import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCaregivers } from '@/features/caregivers/actions';
import { CaregiverList } from '@/features/caregivers/components/caregiver-list';
import { ComprehensiveFilter } from '@/features/caregivers/components/comprehensive-filter';
import { CaregiverImportDialog } from '@/features/caregivers/components/caregiver-import-dialog';
import { DownloadTemplateButton } from '@/features/caregivers/components/download-template-button';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CaregiversPage(props: PageProps) {
  const searchParams = await props.searchParams;
  
  // Helper to ensure we have string arrays for multi-select fields (handles both array and comma-string)
  const toArray = (val: string | string[] | undefined): string[] | undefined => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val;
    return val.split(',').filter(Boolean);
  };

  // Parse Params
  const page = Number(searchParams.page) || 1;
  const query = (searchParams.query as string) || '';
  const minAge = searchParams.minAge ? Number(searchParams.minAge) : undefined;
  const maxAge = searchParams.maxAge ? Number(searchParams.maxAge) : undefined;
  const minExperience = searchParams.minExperience ? Number(searchParams.minExperience) : undefined;
  const maxExperience = searchParams.maxExperience ? Number(searchParams.maxExperience) : undefined;
  
  const nativePlace = (searchParams.nativePlace as string) || undefined;
  const gender = (searchParams.gender as string) || undefined;
  const liveInStatus = (searchParams.liveInStatus as string) || undefined;
  const education = toArray(searchParams.education);
  
  // Multi-select categories
  const jobTypes = toArray(searchParams.jobTypes);
  const jobTypeMode = (searchParams.jobTypesMode as 'AND' | 'OR') || 'OR';
  
  const specialties = toArray(searchParams.specialties);
  const specialtyMode = (searchParams.specialtiesMode as 'AND' | 'OR') || 'OR';
  
  const certificates = toArray(searchParams.certificates);
  const certificateMode = (searchParams.certificatesMode as 'AND' | 'OR') || 'OR';
  
  const cookingSkills = toArray(searchParams.cookingSkills);
  const cookingSkillMode = (searchParams.cookingSkillsMode as 'AND' | 'OR') || 'OR';

  const { data, pagination } = await getCaregivers({ 
    page, 
    pageSize: 9, 
    query,
    minAge,
    maxAge,
    minExperience,
    maxExperience,
    nativePlace,
    gender,
    liveInStatus,
    education,
    jobTypes,
    jobTypeMode,
    specialties,
    specialtyMode,
    certificates,
    certificateMode,
    cookingSkills,
    cookingSkillMode
  });

  // Helper to generate pagination URLs
  const createPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    // Reconstruct all current params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === 'page') return;
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else if (value) {
        params.set(key, value);
      }
    });
    params.set('page', newPage.toString());
    return `/caregivers?${params.toString()}`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">阿姨库管理</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            全量查看与多维度筛选所有护理员。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2 mr-4 border-r pr-4 border-slate-200">
            <Button variant="outline" asChild size="sm">
              <Link href="/orders">新建订单</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href="/salary-settlement">薪资结算</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href="/settings/fields">字段设置</Link>
            </Button>
          </div>
          <DownloadTemplateButton />
          <CaregiverImportDialog />
          <Button asChild className="shadow-md">
            <Link href="/caregivers/new">
              <Plus className="mr-2 h-4 w-4" />
              手工录入阿姨
            </Link>
          </Button>
        </div>
      </div>

      <ComprehensiveFilter />

      <CaregiverList data={data || []} />
      
      {/* Pagination Controls */}
      <div className="flex justify-center gap-2 mt-12 pb-8">
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
        
        <div className="flex items-center px-6 rounded-full bg-slate-50 border border-slate-100 shadow-inner">
           <span className="text-sm font-medium text-slate-600">
            第 <span className="text-primary font-bold">{pagination.current}</span> / {pagination.totalPages || 1} 页
          </span>
        </div>

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
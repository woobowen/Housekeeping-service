import { Suspense } from 'react';
import { getGlobalFieldConfig } from '@/features/system/actions';
import { GlobalFieldManager } from '@/features/settings/components/global-field-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: '字段自定义设置',
  description: '管理系统的全局动态字段',
};

export default async function GlobalFieldsPage() {
  const config = await getGlobalFieldConfig();

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">字段自定义设置</h1>
        <p className="text-muted-foreground">
          在此处配置阿姨档案中的动态扩展字段。添加的字段将立即在新建/编辑页面生效。
        </p>
      </div>

      <Suspense fallback={<FieldsSkeleton />}>
        <GlobalFieldManager initialConfig={config} />
      </Suspense>
    </div>
  );
}

function FieldsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
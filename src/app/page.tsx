import Link from 'next/link';
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns';
import { ArrowRight, Briefcase, CalendarRange, ClipboardList, Settings2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from './(dashboard)/layout';
import { db } from '@/lib/prisma';
import { getSettlementCandidates } from '@/features/finance/actions';

async function getDashboardOverview() {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthKey = format(today, 'yyyy-MM');
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    activeOrderCount,
    idleCaregiverCount,
    activeCaregiverCount,
    monthlyCandidates,
    crossMonthOrderCount,
    settlementCandidates,
  ] = await Promise.all([
    db.order.count({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'SERVING'] },
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    }),
    db.caregiver.count({
      where: { status: 'IDLE' },
    }),
    db.caregiver.count(),
    db.salarySettlement.findMany({
      where: { month: monthKey },
      select: { caregiverId: true },
    }),
    db.order.count({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'SERVING', 'COMPLETED'] },
        startDate: { lte: monthEnd },
        endDate: { gt: monthEnd },
      },
    }),
    getSettlementCandidates(monthKey),
  ]);

  const settledCaregiverIds = new Set(monthlyCandidates.map((item) => item.caregiverId));
  const pendingSettlementCaregivers = await db.order.findMany({
    where: {
      status: { in: ['CONFIRMED', 'COMPLETED', 'SERVING', 'PENDING'] },
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    select: { caregiverId: true },
    distinct: ['caregiverId'],
  });

  const pendingSettlementCount = pendingSettlementCaregivers.filter(
    (item) => !settledCaregiverIds.has(item.caregiverId)
  ).length;

  return {
    activeOrderCount,
    idleCaregiverCount,
    activeCaregiverCount,
    pendingSettlementCount,
    crossMonthOrderCount,
    pendingSettlementAmount: settlementCandidates.success
      ? settlementCandidates.data.reduce((sum: number, item: any) => sum + Number(item.totalAmount || 0), 0)
      : 0,
    monthKey,
  };
}

const quickLinks = [
  {
    title: '家政员管理',
    description: '录入阿姨、补齐证件、查看档案与时间线。',
    href: '/caregivers',
    cta: '前往家政员管理',
    icon: Briefcase,
  },
  {
    title: '订单调度',
    description: '新建派单、修改订单、补扣款与结单。',
    href: '/orders',
    cta: '前往订单调度',
    icon: ClipboardList,
  },
  {
    title: '薪资结算',
    description: '按月核算工资、处理跨月单并生成结算单。',
    href: '/salary-settlement',
    cta: '前往薪资结算',
    icon: Wallet,
  },
  {
    title: '字段设置',
    description: '维护扩展字段，让入职表单与档案同步生效。',
    href: '/settings/fields',
    cta: '前往字段设置',
    icon: Settings2,
  },
];

export default async function HomePage() {
  const overview = await getDashboardOverview();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-100">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  HouseCare Pro
                </p>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">
                  今日经营概览
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  先看今天正在服务的订单，再看阿姨空闲量与月底待结算规模，最后进入对应模块处理日常业务。
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
                <div className="font-bold">当前结算月份</div>
                <div className="mt-1 flex items-center gap-2 text-blue-700">
                  <CalendarRange className="h-4 w-4" />
                  {overview.monthKey}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="今日进行中订单"
              value={String(overview.activeOrderCount)}
              description="今天仍在服务周期内，且状态未取消的订单。"
            />
            <MetricCard
              title="当前空闲阿姨"
              value={String(overview.idleCaregiverCount)}
              description={`总阿姨数 ${overview.activeCaregiverCount} 人，可直接用于今日派单。`}
            />
            <MetricCard
              title="本月待结算人数"
              value={String(overview.pendingSettlementCount)}
              description="本月已有订单交集，但还没有生成结算单的阿姨人数。"
            />
            <MetricCard
              title="本月待结总额"
              value={new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(overview.pendingSettlementAmount)}
              description={`跨月订单 ${overview.crossMonthOrderCount} 单，月底发薪需重点复核。`}
            />
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.href} className="rounded-3xl border-slate-200 shadow-sm">
                  <CardHeader className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold text-slate-900">{item.title}</CardTitle>
                      <CardDescription className="text-sm leading-6 text-slate-600">
                        {item.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full justify-between rounded-xl">
                      <Link href={item.href}>
                        {item.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </main>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardDescription className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </CardDescription>
        <CardTitle className="text-4xl font-black tracking-tight text-slate-900">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-slate-600">
        {description}
      </CardContent>
    </Card>
  );
}

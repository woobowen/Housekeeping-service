import { SettlementDashboard } from '@/features/finance/components/settlement-dashboard';

export const metadata = {
  title: '薪资结算中心 | HouseCare Pro',
};

export default function SalarySettlementPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">薪资结算中心</h1>
        <p className="text-muted-foreground">
          按月汇总阿姨订单，核算最终应发薪资并生成结算单。
        </p>
      </div>

      <SettlementDashboard />
    </div>
  );
}

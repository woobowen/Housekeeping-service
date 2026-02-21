'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

// Define a flexible type for the order prop since it comes from the server action
// and might have complex include relations.
interface OrderViewModalProps {
  order: any; // Using any here to accommodate the specific server-side return type flexible
}

export function OrderViewModal({ order }: OrderViewModalProps) {
  
  const formatCurrency = (val: any) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(Number(val) || 0);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '-';
    return format(new Date(date), 'yyyy-MM-dd');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="outline" className="text-slate-500 border-slate-200">已完成</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-green-500">已确认</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">待确认</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">已取消</Badge>;
      case 'PAID':
        return <Badge className="bg-blue-500">已支付</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Eye className="h-4 w-4" />
          <span className="sr-only">查看</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between mr-8">
            <DialogTitle className="text-xl">订单详情</DialogTitle>
            {getStatusBadge(order.status)}
          </div>
          <DialogDescription>
            订单编号: <span className="font-mono text-foreground">{order.orderNo}</span>
          </DialogDescription>
        </DialogHeader>

        {/* SCROLLABLE AREA STARTS */}
        <div className="flex-1 overflow-y-auto max-h-[75vh] px-6 py-2">
          <div className="space-y-6 pb-12">
            
            {/* 1. Basic Info & Relations */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">基础信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoItem label="家政员" value={
                    <span>
                        {order.caregiver?.name} 
                        <span className="text-xs text-muted-foreground ml-2">({order.caregiver?.workerId})</span>
                    </span>
                } />
                <InfoItem label="客户姓名" value={order.clientName || '-'} />
                <InfoItem label="派单员" value={order.dispatcherName || '-'} />
                <InfoItem label="服务类型" value={order.serviceType} />
              </div>
            </section>
            
            <Separator />

            {/* 2. Schedule */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">服务周期</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoItem label="开始时间" value={formatDate(order.startDate)} />
                <InfoItem label="结束时间" value={formatDate(order.endDate)} />
                <InfoItem label="预计天数" value={<span className="font-bold">{order.durationDays || order.estimatedDays || 0} 天</span>} />
                <InfoItem label="创建时间" value={formatDate(order.createdAt)} />
              </div>
            </section>

            <Separator />

            {/* 3. Financials */}
            <section className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                费用与结算
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <InfoItem label="结算模式" value={order.salaryMode === 'MONTHLY' ? '月薪' : '日薪'} />
                <InfoItem label="计费日薪" value={<span className="font-bold text-slate-900">{formatCurrency(order.dailySalary)}</span>} />
                <InfoItem label="管理费" value={formatCurrency(order.managementFee)} />
                <InfoItem label="中介费 (阿姨部分)" value={formatCurrency(order.amount)} />
                <InfoItem 
                  label="支付状态" 
                  value={
                    order.paymentStatus === 'PAID' ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">已支付</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 bg-slate-100 border-slate-200">未支付</Badge>
                    )
                  } 
                />

                <div className="md:col-span-3 mt-2 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="font-bold text-lg block mb-1">应付总金额 (预估)</span>
                    <div className="text-4xl font-black text-blue-600 tracking-tighter">
                      {/* Logic: (DailySalary * Days) + ManagementFee */}
                      {formatCurrency(
                        order.totalAmount || 
                        ((Number(order.dailySalary || 0) * Number(order.durationDays || order.estimatedDays || 0)) + Number(order.managementFee || 0))
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 max-w-[280px]">
                    <p className="text-[10px] text-blue-700 leading-relaxed italic">
                      * 公式: (日薪 ¥{Number(order.dailySalary || 0).toFixed(2)} × 时长 {order.durationDays || order.estimatedDays || 0}天) + 管理费 ¥{Number(order.managementFee || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* 4. Contact & Location */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">联系与地址</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <InfoItem label="联系人" value={order.contactName} />
                <InfoItem label="联系电话" value={order.contactPhone} />
                <InfoItem label="区域" value={order.clientLocation} />
                <InfoItem label="详细地址" value={order.address} className="md:col-span-2" />
                {order.requirements && (
                    <InfoItem label="特殊需求" value={order.requirements} className="md:col-span-2 text-amber-600" />
                )}
                {order.remarks && (
                    <InfoItem label="备注" value={order.remarks} className="md:col-span-2" />
                )}
              </div>
            </section>

            {/* 5. Dynamic Fields (customData) */}
            {order.customData && Object.keys(order.customData).length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">扩展信息 (Dynamic)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-md">
                    {Object.entries(order.customData).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{key}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

          </div>
        </div>
        {/* SCROLLABLE AREA ENDS */}
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value, className }: { label: string, value: React.ReactNode, className?: string }) {
  return (
    <div className={className}>
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      <div className="font-medium text-foreground break-words">{value}</div>
    </div>
  );
}

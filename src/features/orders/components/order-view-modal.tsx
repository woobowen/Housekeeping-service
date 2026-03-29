'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  CircleDollarSign,
  Eye,
  Loader2,
  MinusCircle,
  PlusCircle,
  Repeat,
} from 'lucide-react';
import { addOrderAdjustment } from '../actions';

type AdjustmentType = 'OVERTIME' | 'LEAVE' | 'SUBSTITUTE';

interface OrderAdjustment {
  date: string;
  type: AdjustmentType;
  value: number;
  substituteId?: string;
  substituteName?: string;
  remarks?: string;
  calculatedAmount?: number;
}

interface OrderViewModalProps {
  order: OrderViewState;
}

interface OrderViewCaregiver {
  name?: string | null;
  workerId?: string | null;
}

interface OrderViewState {
  id: string;
  orderNo: string;
  status: string;
  clientName?: string | null;
  clientLocation?: string | null;
  dispatcherName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  paymentStatus?: string | null;
  salaryMode?: 'MONTHLY' | 'DAILY' | string | null;
  amount?: number | string | null;
  managementFee?: number | string | null;
  totalAmount?: number | string | null;
  monthlySalary?: number | string | null;
  dailySalary?: number | string | null;
  durationDays?: number | null;
  estimatedDays?: number | null;
  createdAt?: Date | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  serviceType?: string | null;
  requirements?: string | null;
  remarks?: string | null;
  address?: string | null;
  caregiver?: OrderViewCaregiver | null;
  customData?: Record<string, unknown> | string | null;
}

interface OrderAdjustmentPayload {
  totalAmount: number | string;
  customData: Record<string, unknown> | string | null;
}

const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  OVERTIME: '加班补款',
  LEAVE: '请假扣款',
  SUBSTITUTE: '替班调整',
};

export function OrderViewModal({ order }: OrderViewModalProps) {
  const router = useRouter();
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentOrder, setCurrentOrder] = useState<OrderViewState>(order);
  const [adjustmentForm, setAdjustmentForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'OVERTIME' as AdjustmentType,
    value: '0.5',
    substituteId: '',
    remarks: '',
  });

  const formatCurrency = (val: unknown) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(Number(val) || 0);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'yyyy-MM-dd');
  };

  const parsedCustomData = useMemo(() => {
    if (!currentOrder?.customData) return {};
    if (typeof currentOrder.customData === 'string') {
      try {
        return JSON.parse(currentOrder.customData);
      } catch {
        return {};
      }
    }
    return currentOrder.customData;
  }, [currentOrder]);

  const adjustments = useMemo<OrderAdjustment[]>(() => {
    const list = parsedCustomData?.adjustments;
    return Array.isArray(list) ? list : [];
  }, [parsedCustomData]);

  const handleAdjustmentChange = (field: keyof typeof adjustmentForm, value: string) => {
    setAdjustmentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetAdjustmentForm = () => {
    setAdjustmentForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'OVERTIME',
      value: '0.5',
      substituteId: '',
      remarks: '',
    });
  };

  const handleSubmitAdjustment = () => {
    const numericValue = Number(adjustmentForm.value);
    if (Number.isNaN(numericValue) || numericValue === 0) {
      toast.error('请输入非 0 的调整天数');
      return;
    }

    // 中文说明：请假默认应为负数，避免前端把扣款误提交为加款。
    if (adjustmentForm.type === 'LEAVE' && numericValue > 0) {
      toast.error('请假扣款请填写负数天数，例如 -0.5');
      return;
    }

    startTransition(async () => {
      const result = await addOrderAdjustment(currentOrder.id, {
        date: adjustmentForm.date,
        type: adjustmentForm.type,
        value: numericValue,
        substituteId: adjustmentForm.substituteId || undefined,
        remarks: adjustmentForm.remarks || undefined,
      });

      if (!result.success) {
        toast.error(result.message || '调整失败');
        return;
      }

      if (!result.data) {
        toast.error('调整已提交，但返回结果不完整');
        return;
      }

      // 中文说明：后端只返回订单本体，这里只增量更新金额和 customData，避免丢失关联展示字段。
      const adjustmentData = result.data as unknown as OrderAdjustmentPayload;
      setCurrentOrder((prev: OrderViewState) => ({
        ...prev,
        totalAmount: adjustmentData.totalAmount,
        customData: adjustmentData.customData,
      }));

      toast.success('订单调整已写入');
      setAdjustmentOpen(false);
      resetAdjustmentForm();
      router.refresh();
    });
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
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
            <span className="sr-only">查看</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-start justify-between gap-4 mr-8">
              <div>
                <DialogTitle className="text-xl">订单详情</DialogTitle>
                <DialogDescription>
                  订单编号: <span className="font-mono text-foreground">{currentOrder.orderNo}</span>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(currentOrder.status)}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setAdjustmentOpen(true)}
                >
                  <CircleDollarSign className="h-4 w-4" />
                  调整金额
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto max-h-[75vh] px-6 py-2">
            <div className="space-y-6 pb-12">
              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">基础信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoItem label="家政员" value={
                    <span>
                      {currentOrder.caregiver?.name}
                      <span className="text-xs text-muted-foreground ml-2">({currentOrder.caregiver?.workerId})</span>
                    </span>
                  } />
                  <InfoItem label="客户姓名" value={currentOrder.clientName || '-'} />
                  <InfoItem label="派单员" value={currentOrder.dispatcherName || '-'} />
                  <InfoItem label="服务类型" value={currentOrder.serviceType} />
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">服务周期</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoItem label="开始时间" value={formatDate(currentOrder.startDate)} />
                  <InfoItem label="结束时间" value={formatDate(currentOrder.endDate)} />
                  <InfoItem label="预计天数" value={<span className="font-bold">{currentOrder.durationDays || currentOrder.estimatedDays || 0} 天</span>} />
                  <InfoItem label="创建时间" value={formatDate(currentOrder.createdAt)} />
                </div>
              </section>

              <Separator />

              <section className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  费用与结算
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <InfoItem label="结算模式" value={currentOrder.salaryMode === 'MONTHLY' ? '月薪' : '日薪'} />
                  <InfoItem label="计费日薪" value={<span className="font-bold text-slate-900">{formatCurrency(currentOrder.dailySalary)}</span>} />
                  <InfoItem label="管理费" value={formatCurrency(currentOrder.managementFee)} />
                  <InfoItem label="中介费 (阿姨部分)" value={formatCurrency(currentOrder.amount)} />
                  <InfoItem
                    label="支付状态"
                    value={
                      currentOrder.paymentStatus === 'PAID' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">已支付</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 bg-slate-100 border-slate-200">未支付</Badge>
                      )
                    }
                  />

                  <div className="md:col-span-3 mt-2 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="font-bold text-lg block mb-1">应付总金额 (含补扣款)</span>
                      <div className="text-4xl font-black text-blue-600 tracking-tighter">
                        {formatCurrency(
                          currentOrder.totalAmount ||
                          ((Number(currentOrder.dailySalary || 0) * Number(currentOrder.durationDays || currentOrder.estimatedDays || 0)) + Number(currentOrder.managementFee || 0))
                        )}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 max-w-[320px]">
                      <p className="text-[10px] text-blue-700 leading-relaxed italic">
                        * 当前总额已包含后续追加的补扣款调整。订单调整由服务端重新计算后写回。
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              <section>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">补扣款记录</h3>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setAdjustmentOpen(true)}>
                    <Repeat className="h-4 w-4" />
                    生成补扣款
                  </Button>
                </div>

                {adjustments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                    当前订单尚无金额调整记录。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adjustments.map((item, index) => (
                      <div key={`${item.date}-${item.type}-${index}`} className="rounded-xl border border-slate-200 p-4 bg-white">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{ADJUSTMENT_LABELS[item.type]}</Badge>
                              <span className="text-xs text-slate-500">{item.date}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-900">
                              {item.type === 'LEAVE' ? <MinusCircle className="inline h-4 w-4 mr-1 text-red-500" /> : <PlusCircle className="inline h-4 w-4 mr-1 text-green-500" />}
                              调整天数: {item.value}
                            </p>
                            {item.substituteId && (
                              <p className="text-xs text-slate-500">
                                替班人: {item.substituteName || '-'} ({item.substituteId})
                              </p>
                            )}
                            {item.remarks && (
                              <p className="text-xs text-slate-500 whitespace-pre-wrap">{item.remarks}</p>
                            )}
                          </div>
                          <div className="text-left md:text-right">
                            <div className="text-xs text-slate-400">折算金额</div>
                            <div className={`text-lg font-bold ${Number(item.calculatedAmount || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(item.calculatedAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">联系与地址</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <InfoItem label="联系人" value={currentOrder.contactName} />
                  <InfoItem label="联系电话" value={currentOrder.contactPhone} />
                  <InfoItem label="区域" value={currentOrder.clientLocation} />
                  <InfoItem label="详细地址" value={currentOrder.address} className="md:col-span-2" />
                  {currentOrder.requirements && (
                    <InfoItem label="特殊需求" value={currentOrder.requirements} className="md:col-span-2 text-amber-600" />
                  )}
                  {currentOrder.remarks && (
                    <InfoItem label="备注" value={currentOrder.remarks} className="md:col-span-2" />
                  )}
                </div>
              </section>

              {parsedCustomData && Object.keys(parsedCustomData).filter((key) => key !== 'adjustments').length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">扩展信息 (Dynamic)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-md">
                      {Object.entries(parsedCustomData)
                        .filter(([key]) => key !== 'adjustments')
                        .map(([key, value]: [string, unknown]) => (
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
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>调整金额 / 生成补扣款</DialogTitle>
            <DialogDescription>
              通过追加调整项，让服务端按当前订单日薪重新折算并回写总金额。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adjust-date">发生日期</Label>
                <Input
                  id="adjust-date"
                  type="date"
                  value={adjustmentForm.date}
                  onChange={(e) => handleAdjustmentChange('date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjust-type">调整类型</Label>
                <Select
                  value={adjustmentForm.type}
                  onValueChange={(value) => handleAdjustmentChange('type', value)}
                >
                  <SelectTrigger id="adjust-type">
                    <SelectValue placeholder="选择调整类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OVERTIME">加班补款</SelectItem>
                    <SelectItem value="LEAVE">请假扣款</SelectItem>
                    <SelectItem value="SUBSTITUTE">替班调整</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust-value">调整天数</Label>
              <Input
                id="adjust-value"
                type="number"
                step="0.1"
                value={adjustmentForm.value}
                onChange={(e) => handleAdjustmentChange('value', e.target.value)}
              />
              <p className="text-xs text-slate-500">
                中文说明：补款填正数，请假扣款填负数，例如 `-0.5`。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust-substitute">替班人工号 / ID</Label>
              <Input
                id="adjust-substitute"
                value={adjustmentForm.substituteId}
                onChange={(e) => handleAdjustmentChange('substituteId', e.target.value)}
                placeholder="仅替班场景填写"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust-remarks">备注说明</Label>
              <Textarea
                id="adjust-remarks"
                value={adjustmentForm.remarks}
                onChange={(e) => handleAdjustmentChange('remarks', e.target.value)}
                placeholder="说明补扣款原因，便于后续对账"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdjustmentOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleSubmitAdjustment} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认写入调整
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoItem({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      <div className="font-medium text-foreground break-words">{value}</div>
    </div>
  );
}

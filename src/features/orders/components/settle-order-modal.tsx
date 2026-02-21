'use client';

import { useState, useMemo, useTransition } from 'react';
import { toast } from 'sonner';
import { 
  Calculator, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Banknote,
  AlertTriangle,
  CalendarDays
} from 'lucide-react';
import { format, isAfter, endOfMonth, startOfMonth, differenceInDays } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { settleOrder } from '../actions';

interface SettleOrderModalProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettleOrderModal({ order, open, onOpenChange }: SettleOrderModalProps) {
  const [isPending, startTransition] = useTransition();
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  // Detection for Cross-Month
  const isCrossMonth = useMemo(() => {
    if (!order) return false;
    const monthEnd = endOfMonth(new Date());
    return isAfter(new Date(order.endDate), monthEnd);
  }, [order]);

  // Expected days in this month if cross-month
  const expectedDaysInMonth = useMemo(() => {
    if (!order) return 0;
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const calcStart = new Date(order.startDate) < monthStart ? monthStart : new Date(order.startDate);
    const calcEnd = new Date(order.endDate) > monthEnd ? monthEnd : new Date(order.endDate);
    const diff = differenceInDays(calcEnd, calcStart) + 1;
    return diff > 0 ? diff : 0;
  }, [order]);

  // Default to expected duration (or expected in month if cross), but allow edit
  const [actualDays, setActualDays] = useState<string>(
    String(isCrossMonth ? expectedDaysInMonth : (order?.durationDays || 0))
  );

  if (!order) return null;

  const dailySalary = Number(order.dailySalary) || Math.round(Number(order.monthlySalary || 0) / 26);
  const managementFee = Number(order.managementFee) || 0;

  const totalAmount = useMemo(() => {
    const days = parseFloat(actualDays) || 0;
    return Math.round((dailySalary * days + managementFee) * 100) / 100;
  }, [dailySalary, actualDays, managementFee]);

  const handleSettle = () => {
    const daysNum = parseFloat(actualDays);
    if (isNaN(daysNum) || daysNum < 0) {
      toast.error('请输入有效的工作天数');
      return;
    }

    startTransition(async () => {
      const result = await settleOrder(order.id, daysNum, totalAmount, currentMonth);
      if (result.success) {
        toast.success(isCrossMonth ? '本月部分结算成功' : '订单结算成功，家政员已释放');
        onOpenChange(false);
      } else {
        toast.error('结算失败', { description: result.message });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            订单结单结算
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            正在结算月份: <Badge variant="secondary" className="font-mono">{currentMonth}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {isCrossMonth && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold mb-1">跨月订单提醒</p>
                <p>该订单结束日期晚于本月。当前仅进行“部分结单”，结算完成后订单状态将保持活跃。</p>
                <p className="mt-1 font-medium text-amber-900 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> 本月建议结算天数: {expectedDaysInMonth} 天
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 flex items-center gap-2">
                <Banknote className="w-4 h-4" /> 计费日薪
              </span>
              <span className="font-bold">¥ {dailySalary.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> 订单总预计
              </span>
              <span className="font-medium">{order.durationDays || 0} 天</span>
            </div>
            <div className="flex justify-between items-center text-sm text-blue-600">
              <span className="flex items-center gap-2 font-medium">
                <Calculator className="w-4 h-4" /> 管理费
              </span>
              <span className="font-bold">¥ {managementFee.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="actual-days" className="text-blue-700 font-bold">实际工作天数 (支持 0.5 天)</Label>
            <div className="relative">
              <Input
                id="actual-days"
                type="number"
                step="0.1"
                value={actualDays}
                onChange={(e) => setActualDays(e.target.value)}
                className="pr-10 h-12 text-lg font-bold border-blue-200 focus:border-blue-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">天</span>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center space-y-1">
            <div className="text-xs text-green-600 font-bold uppercase tracking-wider">
              {isCrossMonth ? '本次预估应付金额' : '最终应付总额'}
            </div>
            <div className="text-3xl font-black text-green-700">
              ¥ {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button 
            className="bg-green-600 hover:bg-green-700" 
            onClick={handleSettle}
            disabled={isPending}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            确认{isCrossMonth ? '部分结算' : '结单'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

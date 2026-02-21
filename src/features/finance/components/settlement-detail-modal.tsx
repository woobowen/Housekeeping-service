'use client';

import { useState, useTransition } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, AlertCircle, CheckCircle2, ArrowRightLeft, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

import type { SettlementDetail } from '../schema';
import { createOrUpdateSettlement } from '../actions';
import { format } from 'date-fns';
import Link from 'next/link';

interface SettlementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SettlementDetail | null;
  onSuccess?: () => void;
}

export function SettlementDetailModal({ 
  open, 
  onOpenChange, 
  data, 
  onSuccess 
}: SettlementDetailModalProps) {
  const [isPending, startTransition] = useTransition();

  if (!data) return null;

  const isUpdate = !!data.existingSettlementId;
  const isPaid = data.status === 'PAID';
  const canSave = data.allOrdersSettled && !isPaid;

  const handleConfirm = () => {
    if (!canSave) return;
    startTransition(async () => {
      const res = await createOrUpdateSettlement(data);
      if (res.success) {
        toast.success(isUpdate ? '结算单已更新' : '结算单已生成');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || '操作失败');
      }
    });
  };

  const formatMoney = (val: number) => 
    val.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' });

  const formatDate = (isoStr: string) => {
    try {
      return format(new Date(isoStr), 'MM-dd');
    } catch { return '-'; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between mr-8">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                薪资结算详情
                <Badge variant="outline" className="font-normal text-slate-500">
                  {data.month}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-1">
                家政员: <span className="font-medium text-foreground">{data.caregiverName}</span> ({data.workerId})
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">本月应付总额</div>
              <div className="text-2xl font-black text-blue-600">
                {formatMoney(data.totalAmount)}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            
            {/* 1. Critical Blocking Alert */}
            {!data.allOrdersSettled && (
               <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3 text-sm text-red-800">
                 <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                 <div className="space-y-2">
                   <strong>结算限制：存在尚未结单的订单</strong>
                   <p>该阿姨在本月涉及的订单中，仍有部分未在“订单管理”模块完成本月的薪资核算。请先前往订单模块完成对应的“结单”操作。</p>
                   <Button asChild size="sm" variant="destructive" className="h-7 text-xs">
                      <Link href="/orders">前往订单管理</Link>
                   </Button>
                 </div>
               </div>
            )}

            {/* 2. Update Alert */}
            {isUpdate && data.allOrdersSettled && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-3 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <strong>该月份已存在结算记录。</strong>
                  <p>点击“确认更新”将使用当前的计算结果覆盖原有记录。如果原记录已发放，请谨慎操作。</p>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                本月有效订单明细 ({data.items.length})
              </h3>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[120px]">结单状态</TableHead>
                        <TableHead className="w-[140px]">订单号</TableHead>
                        <TableHead>订单日程</TableHead>
                        <TableHead className="text-center">有效工作天数</TableHead>
                        <TableHead className="text-right">日薪标准</TableHead>
                        <TableHead className="text-right">小计</TableHead>
                        <TableHead className="text-center">结算类型</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((item) => (
                        <TableRow key={item.orderId} className={!item.isOrderSettled ? "bg-red-50/30" : ""}>
                          <TableCell>
                             {item.isOrderSettled ? (
                               <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                                 <CheckCircle2 className="w-3.5 h-3.5" /> 已结单
                               </div>
                             ) : (
                               <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                                 <XCircle className="w-3.5 h-3.5" /> 未结单
                               </div>
                             )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.orderNo}
                            <span className="block text-[10px] text-muted-foreground font-sans mt-0.5">{item.clientName}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <span>{formatDate(item.startDate)}</span>
                              <span className="text-slate-300">~</span>
                              <span>{formatDate(item.endDate)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold text-slate-900">{item.actualDays ?? item.daysInMonth} 天</div>
                            {item.isOrderSettled && (
                              <div className="text-[10px] text-green-600 font-medium">来自订单结算</div>
                            )}
                            {!item.isOrderSettled && (
                              <div className="text-[10px] text-slate-400">预估/未结单</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatMoney(item.dailyRate)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-blue-700">
                            {formatMoney(item.amount)}
                            <div className="text-[10px] text-muted-foreground font-normal">
                               {item.dailyRate} × {item.actualDays ?? item.daysInMonth}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.settlementType === 'FULL' ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50/50 text-[10px]">完全结单</Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50/50 text-[10px]">跨月/部分</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                <div>
                    <span className="text-muted-foreground">总服务天数：</span>
                    <span className="font-medium ml-2">{data.totalDays} 天</span>
                </div>
                <div>
                    <span className="text-muted-foreground">涉及订单数：</span>
                    <span className="font-medium ml-2">{data.orderCount} 单</span>
                </div>
            </div>

            <div className="pb-4">
               {/* Spacer for bottom padding inside scroll area */}
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-slate-50/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {!isPaid && (
            <Button 
              onClick={handleConfirm} 
              disabled={!canSave || isPending} 
              className={!data.allOrdersSettled ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {!data.allOrdersSettled ? '请先完成订单结单' : (isUpdate ? '确认更新结算单' : '确认生成结算单')}
            </Button>
          )}
          {isPaid && (
             <Button disabled variant="secondary">
                已支付，不可修改
             </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

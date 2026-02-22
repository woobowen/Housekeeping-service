'use client';

import { useState, useEffect, useTransition } from 'react';
import { format } from 'date-fns';
import { 
  Calculator, 
  History, 
  Search, 
  ArrowRight,
  Eye,
  FileCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { getSettlementCandidates, getSettlementHistory } from '../actions';
import { SettlementDetailModal } from './settlement-detail-modal';
import type { SettlementDetail } from '../schema';

export function SettlementDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // Candidates = Active calculations (some might be already settled, some pending)
  const [candidates, setCandidates] = useState<SettlementDetail[]>([]);
  
  // History = Raw DB records (for the history tab)
  const [history, setHistory] = useState<any[]>([]);
  
  const [isPending, startTransition] = useTransition();
  const [selectedDetail, setSelectedDetail] = useState<SettlementDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = () => {
    startTransition(async () => {
      const [resCandidates, resHistory] = await Promise.all([
        getSettlementCandidates(selectedMonth),
        getSettlementHistory(selectedMonth)
      ]);

      if (resCandidates.success) setCandidates(resCandidates.data as SettlementDetail[]);
      if (resHistory.success) setHistory(resHistory.data);
      
      if (!resCandidates.success || !resHistory.success) {
        toast.error('获取数据失败');
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const handleOpenDetail = (detail: SettlementDetail) => {
    setSelectedDetail(detail);
    setIsModalOpen(true);
  };

  // Adapter for History Records to SettlementDetail
  const handleOpenHistory = (record: any) => {
    const detail: SettlementDetail = {
        caregiverId: record.caregiverId,
        caregiverName: record.caregiver?.name || '未知',
        workerId: record.caregiver?.workerId || '-',
        month: record.month,
        totalAmount: Number(record.totalAmount),
        totalDays: 0, // Recalculate from items or store in DB? DB doesn't have it top-level, so derive from items
        orderCount: 0,
        status: record.status,
        existingSettlementId: record.id,
        allOrdersSettled: true,
        items: []
    };

    try {
        if (record.details) {
            const items = JSON.parse(record.details);
            detail.items = items;
            detail.totalDays = items.reduce((acc: number, item: any) => acc + (item.daysInMonth || 0), 0);
            detail.orderCount = items.length;
        }
    } catch (e) {
        console.error("Failed to parse history details", e);
    }

    setSelectedDetail(detail);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold">查询范围</CardTitle>
          <CardDescription>选择结算月份以查看该月待结算阿姨及历史记录。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500">结算月份</label>
              <Input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={fetchData} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              查询
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <Calculator className="w-4 h-4" />
            结算计算 ({candidates.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            已生成记录 ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>结算计算列表 ({selectedMonth})</CardTitle>
              <CardDescription>
                基于该月有效订单实时计算的结果。若该阿姨已结算，此处显示结果可能与历史记录一致，也可能因订单变更而产生差异（提示更新）。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>阿姨姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>本月服务天数</TableHead>
                    <TableHead>预计薪资 (元)</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                        {isPending ? '正在加载数据...' : '该月份无活跃订单需结算'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    candidates.map((candidate) => (
                      <TableRow key={candidate.caregiverId}>
                        <TableCell className="font-bold">{candidate.caregiverName}</TableCell>
                        <TableCell className="text-slate-500 font-mono text-xs">{candidate.workerId}</TableCell>
                        <TableCell>{candidate.totalDays} 天</TableCell>
                        <TableCell className="font-medium text-blue-600">
                          ¥ {candidate.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {candidate.existingSettlementId ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 px-2 py-1">
                              <FileCheck className="w-3 h-3 mr-1" /> 已生成
                            </Badge>
                          ) : !candidate.allOrdersSettled ? (
                            <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 px-2 py-1">
                              当月还未完全结单
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 px-2 py-1">已全部结单</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {candidate.existingSettlementId ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-2 text-slate-600 hover:text-blue-600"
                              disabled={isPending}
                              onClick={() => handleOpenDetail(candidate)}
                            >
                              <RefreshCw className="w-3 h-3" />
                              更新/重算
                            </Button>
                          ) : !candidate.allOrdersSettled ? (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={isPending}
                              onClick={() => handleOpenDetail(candidate)}
                            >
                              查看详情
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="default"
                              className="gap-2 bg-blue-600 hover:bg-blue-700"
                              disabled={isPending}
                              onClick={() => handleOpenDetail(candidate)}
                            >
                              去结算
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>已生成的结算单</CardTitle>
              <CardDescription>
                数据库中实际存储的结算记录。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>阿姨</TableHead>
                    <TableHead>月份</TableHead>
                    <TableHead>结算金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>生成时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                        {isPending ? '正在加载数据...' : '暂无历史记录'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="font-medium">{record.caregiver?.name}</div>
                          <div className="text-xs text-slate-400">{record.caregiver?.workerId}</div>
                        </TableCell>
                        <TableCell>{record.month}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          ¥ {Number(record.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500">{record.status === 'PAID' ? '已发放' : '已结算'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="gap-2"
                            onClick={() => handleOpenHistory(record)}
                          >
                            <Eye className="w-4 h-4" />
                            查看完整信息
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SettlementDetailModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        data={selectedDetail}
        onSuccess={fetchData}
      />
    </div>
  );
}

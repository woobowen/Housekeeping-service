'use client';

import { useState, useEffect, useTransition } from 'react';
import { format } from 'date-fns';
import { Pencil, CheckCircle, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrderViewModal } from './order-view-modal';
import { EditOrderModal } from './edit-order-modal';
import { SettleOrderModal } from './settle-order-modal';
import { DeleteOrderButton } from './delete-order-button';
import { getOrders } from '../actions';
import { DatePicker } from '@/components/ui/date-picker';
import { X } from 'lucide-react';

interface OrderListProps {
  orders?: any[];
}

export function OrderList({ orders: initialOrders = [] }: OrderListProps) {
  const [orders, setOrders] = useState(initialOrders || []);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [settlingOrder, setSettlingOrder] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('caregiver');
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    startTransition(async () => {
      const data = await getOrders(query, searchType);
      setOrders(data || []);
    });
  };

  const clearSearch = () => {
    setQuery('');
    startTransition(async () => {
      const data = await getOrders('', 'caregiver');
      setOrders(data || []);
    });
  };

  const formatCustomData = (customData: any) => {
    if (!customData || Object.keys(customData).length === 0) return '-';
    return Object.entries(customData)
      .slice(0, 3)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ') + (Object.keys(customData).length > 3 ? '...' : '');
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          <Select value={searchType} onValueChange={(v) => { setSearchType(v); setQuery(''); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="搜索类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="caregiver">家政员姓名</SelectItem>
              <SelectItem value="client">客户姓名</SelectItem>
              <SelectItem value="dispatcher">派单员姓名</SelectItem>
              <SelectItem value="date">服务日期</SelectItem>
              <SelectItem value="all">全部字段</SelectItem>
            </SelectContent>
          </Select>

          {searchType === 'date' ? (
            <div className="w-[240px]">
              <DatePicker 
                value={query ? new Date(query) : null}
                onChange={(date) => setQuery(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="选择或输入日期"
              />
            </div>
          ) : (
            <Input 
              placeholder="输入关键词..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-[200px]"
            />
          )}

          <Button onClick={handleSearch} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
          {query && (
            <Button variant="ghost" size="sm" onClick={clearSearch} className="h-8">
              <X className="w-4 h-4 mr-1" /> 重置
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单编号</TableHead>
              <TableHead>家政员</TableHead>
              <TableHead>客户/服务地点</TableHead>
              <TableHead>服务时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orders || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  暂无订单
                </TableCell>
              </TableRow>
            ) : (
              (orders || []).map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>
                    {order.caregiver?.name} 
                    <span className="text-xs text-muted-foreground block">
                      {order.caregiver?.workerId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{order.clientName || '未记录客户'}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">{order.clientLocation}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{format(new Date(order.startDate), 'yyyy-MM-dd')}</span>
                      <span className="text-muted-foreground text-xs">至</span>
                      <span>{format(new Date(order.endDate), 'yyyy-MM-dd')}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => setSettlingOrder(order)}
                            title="结单结算"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setEditingOrder(order)}
                            title="修改订单"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <DeleteOrderButton orderId={order.id} orderNo={order.orderNo} />
                      <OrderViewModal order={order} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditOrderModal 
        open={!!editingOrder} 
        onOpenChange={(open) => !open && setEditingOrder(null)} 
        order={editingOrder} 
      />

      <SettleOrderModal
        open={!!settlingOrder}
        onOpenChange={(open) => !open && setSettlingOrder(null)}
        order={settlingOrder}
      />
    </div>
  );
}

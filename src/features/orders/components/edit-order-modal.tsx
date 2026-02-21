'use client';

import { FileEdit } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderForm, type OrderFormValues } from './order-form';
import { updateOrder } from '../actions';

interface EditOrderModalProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOrderModal({ order, open, onOpenChange }: EditOrderModalProps) {
  if (!order) return null;

  const handleSubmit = async (values: OrderFormValues) => {
    const effectiveDaily = values.dailySalary || (values.monthlySalary ? values.monthlySalary / 26 : 0);
    
    const payload = { 
      ...values, 
      dailySalary: effectiveDaily
    };
    
    const result = await updateOrder(order.id, payload);
    
    if (result.success) {
      toast.success('订单更新成功');
      onOpenChange(false);
    } else {
      toast.error('更新失败', { description: result.message });
    }
  };

  const defaultValues = {
    ...order,
    clientName: order.clientName || '',
    caregiverName: order.caregiver?.name || '',
    startDate: order.startDate ? new Date(order.startDate) : undefined,
    endDate: order.endDate ? new Date(order.endDate) : undefined,
    dailySalary: Number(order.dailySalary) || 0,
    monthlySalary: Number(order.monthlySalary) || 0,
    managementFee: Number(order.managementFee) || 0,
    totalAmount: Number(order.totalAmount) || 0,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 bg-slate-50 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-primary" /> 
            修改订单信息
          </DialogTitle>
          <DialogDescription>
            更新订单内容。系统将根据新的日期和薪资重新计算金额。
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <OrderForm 
            defaultValues={defaultValues} 
            onSubmit={async () => {}} 
            submitLabel="保存修改" 
            onSuccess={() => {
              toast.success('订单更新成功');
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

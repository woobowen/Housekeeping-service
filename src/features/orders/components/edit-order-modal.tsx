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
import { OrderForm } from './order-form';
import type { CaregiverOption } from '@/features/caregivers/actions';
import type { OrderFormDefaultValues } from './order-form';

interface OrderModalCaregiver {
  name?: string | null;
}

interface EditableOrder {
  id: string;
  caregiverId?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientLocation?: string | null;
  dispatcherName?: string | null;
  dispatcherPhone?: string | null;
  caregiver?: OrderModalCaregiver | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  dailySalary?: number | string | null;
  monthlySalary?: number | string | null;
  managementFee?: number | string | null;
  totalAmount?: number | string | null;
  durationDays?: number | null;
  status?: string | null;
  remarks?: string | null;
}

interface EditOrderModalProps {
  order: EditableOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiverOptions?: CaregiverOption[];
}

export function EditOrderModal({ order, open, onOpenChange, caregiverOptions = [] }: EditOrderModalProps) {
  if (!order) return null;

  const defaultValues: OrderFormDefaultValues = {
    ...order,
    clientName: order.clientName || '',
    clientPhone: order.clientPhone || '',
    clientLocation: order.clientLocation || '',
    dispatcherName: order.dispatcherName || '',
    dispatcherPhone: order.dispatcherPhone || '',
    remarks: order.remarks || '',
    status: order.status || 'PENDING',
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
            caregiverOptions={caregiverOptions}
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

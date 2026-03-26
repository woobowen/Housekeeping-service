'use client';

import { CircleDollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderForm, type OrderFormValues } from './order-form';
import { createOrder } from '../actions';
import type { CaregiverOption } from '@/features/caregivers/actions';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiverOptions: CaregiverOption[];
  initialData?: any;
}

export function CreateOrderModal({ open, onOpenChange, initialData, caregiverOptions }: CreateOrderModalProps) {
  const router = useRouter();

  const handleSubmit = async (values: OrderFormValues) => {
    // Derive effective daily salary for persistence
    const effectiveDaily = values.dailySalary || (values.monthlySalary ? values.monthlySalary / 26 : 0);
    
    const payload = { 
      ...values, 
      dailySalary: effectiveDaily
    };
    
    const result = await createOrder(payload);
    
    if (result.success) {
      toast.success('订单创建成功');
      router.refresh();
      onOpenChange(false);
    } else {
      const friendlyMessage = result.message?.includes('派单失败')
        ? result.message
        : (result.message || '请检查订单日期、阿姨选择和必填字段后重试');
      toast.error('创建失败', { description: friendlyMessage });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 bg-slate-50 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-primary" /> 
            录入新订单
          </DialogTitle>
          <DialogDescription>
            填写三方信息以生成正式订单。系统将根据日期和薪资模式自动计算总额。
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <OrderForm 
            caregiverOptions={caregiverOptions}
            defaultValues={initialData} 
            onSubmit={handleSubmit} 
            submitLabel="提交正式订单" 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

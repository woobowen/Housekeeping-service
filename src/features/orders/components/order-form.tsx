'use client';

import { useEffect, useMemo, useRef, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValid, differenceInDays, addDays } from 'date-fns';
import { 
  Briefcase, 
  User, 
  Headset, 
  Clock, 
  Calculator, 
  Info,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useRouter } from 'next/navigation';
import { createOrder, updateOrder } from '../actions';

const phoneRegex = /^1[3-9]\d{9}$/;

export const orderFormSchema = z.object({
  caregiverId: z.string().min(1, '请输入家政员姓名/工号'),
  caregiverName: z.string().optional(),
  caregiverPhone: z.string().regex(phoneRegex, '请输入有效的11位手机号'),
  monthlySalary: z.coerce.number().min(0).optional(),
  dailySalary: z.coerce.number().min(0).optional(),
  durationDays: z.coerce.number().min(1, '时长必须大于0').optional(),
  clientName: z.string().min(1, '请输入客户姓名'),
  clientPhone: z.string().regex(phoneRegex, '请输入有效的11位手机号'),
  clientLocation: z.string().optional(),
  dispatcherName: z.string().min(1, '请输入派单员姓名'),
  dispatcherPhone: z.string().regex(phoneRegex, '请输入有效的11位手机号'),
  managementFee: z.coerce.number().min(0, '管理费不能为负数'),
  startDate: z.date({ required_error: '请选择开始日期' }),
  endDate: z.date({ required_error: '请选择结束日期' }),
  totalAmount: z.coerce.number().optional(),
  status: z.string().default('PENDING'),
  remarks: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  defaultValues?: Partial<OrderFormValues> & { id?: string };
  onSubmit: (values: OrderFormValues) => Promise<void>;
  submitLabel?: string;
  onSuccess?: () => void;
}

export function OrderForm({ defaultValues, onSubmit, submitLabel = '提交订单', onSuccess }: OrderFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const lastDateUpdate = useRef<'startDate' | 'endDate' | 'duration' | null>(null);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      caregiverId: defaultValues?.caregiverId ?? '',
      caregiverName: defaultValues?.caregiverName ?? '',
      caregiverPhone: defaultValues?.caregiverPhone || (defaultValues as any)?.caregiver?.phone || '',
      monthlySalary: Number(defaultValues?.monthlySalary ?? 0),
      dailySalary: Number(defaultValues?.dailySalary ?? 0),
      durationDays: Number(defaultValues?.durationDays ?? 1),
      clientName: defaultValues?.clientName ?? '',
      clientPhone: defaultValues?.clientPhone || (defaultValues as any)?.contactPhone || '',
      clientLocation: defaultValues?.clientLocation ?? '',
      dispatcherName: defaultValues?.dispatcherName ?? '',
      dispatcherPhone: defaultValues?.dispatcherPhone ?? '',
      managementFee: Number(defaultValues?.managementFee ?? 0),
      startDate: defaultValues?.startDate ? new Date(defaultValues.startDate) : new Date(),
      endDate: defaultValues?.endDate ? new Date(defaultValues.endDate) : new Date(),
      totalAmount: Number(defaultValues?.totalAmount ?? 0),
      status: defaultValues?.status ?? 'PENDING',
      remarks: defaultValues?.remarks ?? '',
    },
  });

  // Fix: Reset form when defaultValues.id changes (essential for edit modals)
  useEffect(() => {
    if (defaultValues?.id) {
      form.reset({
        caregiverId: String(defaultValues.caregiverId ?? ''),
        caregiverName: String(defaultValues.caregiverName ?? ''),
        caregiverPhone: String(defaultValues.caregiverPhone || (defaultValues as any)?.caregiver?.phone || ''),
        monthlySalary: Number(defaultValues.monthlySalary ?? 0),
        dailySalary: Number(defaultValues.dailySalary ?? 0),
        durationDays: Number(defaultValues.durationDays ?? 1),
        clientName: String(defaultValues.clientName ?? ''),
        clientPhone: String(defaultValues.clientPhone || (defaultValues as any)?.contactPhone || ''),
        clientLocation: String(defaultValues.clientLocation ?? ''),
        dispatcherName: String(defaultValues.dispatcherName ?? ''),
        dispatcherPhone: String(defaultValues.dispatcherPhone ?? ''),
        managementFee: Number(defaultValues.managementFee ?? 0),
        startDate: defaultValues.startDate ? new Date(defaultValues.startDate) : new Date(),
        endDate: defaultValues.endDate ? new Date(defaultValues.endDate) : new Date(),
        totalAmount: Number(defaultValues.totalAmount ?? 0),
        status: defaultValues.status ?? 'PENDING',
        remarks: String(defaultValues.remarks ?? ''),
      });
    }
  }, [defaultValues?.id, form]);

  const { control, setValue } = form;

  const watchedStartDate = useWatch({ control, name: 'startDate' });
  const watchedEndDate = useWatch({ control, name: 'endDate' });
  const watchedDurationDays = useWatch({ control, name: 'durationDays' });
  const watchedMonthlySalary = useWatch({ control, name: 'monthlySalary' });
  const watchedDailySalary = useWatch({ control, name: 'dailySalary' });
  const watchedManagementFee = useWatch({ control, name: 'managementFee' });

  // Date linkage
  useEffect(() => {
    if (!watchedStartDate) return;

    if (lastDateUpdate.current === 'startDate' || lastDateUpdate.current === 'duration') {
      if (watchedDurationDays > 0) {
        const newEndDate = addDays(watchedStartDate, watchedDurationDays - 1);
        if (!watchedEndDate || watchedEndDate.getTime() !== newEndDate.getTime()) {
          setValue('endDate', newEndDate);
        }
      }
    } else if (lastDateUpdate.current === 'endDate') {
      if (watchedEndDate && isValid(watchedEndDate)) {
        const diff = differenceInDays(watchedEndDate, watchedStartDate) + 1;
        if (diff > 0 && watchedDurationDays !== diff) {
          setValue('durationDays', diff);
        }
      }
    }
  }, [watchedStartDate, watchedEndDate, watchedDurationDays, setValue]);

  // Salary Logic: Monthly -> Daily auto-calc (only if daily is 0 or monthly is changed)
  const prevMonthly = useRef(watchedMonthlySalary);
  useEffect(() => {
    if (watchedMonthlySalary !== prevMonthly.current) {
      const monthly = Number(watchedMonthlySalary);
      if (!isNaN(monthly) && monthly > 0) {
        const daily = monthly / 26;
        setValue('dailySalary', Number(daily.toFixed(2)), { shouldValidate: true });
      }
      prevMonthly.current = watchedMonthlySalary;
    }
  }, [watchedMonthlySalary, setValue]);

  const calculation = useMemo(() => {
    const days = Number(watchedDurationDays) || 0;
    const dSalary = Number(watchedDailySalary) || 0;
    const fee = Number(watchedManagementFee) || 0;
    const total = Math.round((dSalary * days + fee) * 100) / 100;
    return { days, dSalary, fee, total };
  }, [watchedDurationDays, watchedDailySalary, watchedManagementFee]);

  useEffect(() => {
    setValue('totalAmount', calculation.total);
  }, [calculation.total, setValue]);

  const handleFormSubmit = (values: OrderFormValues) => {
    startTransition(async () => {
      if (defaultValues?.id) {
        // Edit Mode
        const res = await updateOrder(defaultValues.id, values);
        if (res.success) {
          router.refresh();
          if (onSuccess) onSuccess();
        }
      } else {
        // Create Mode
        await onSubmit(values);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section 1: Caregiver */}
          <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 font-bold border-b border-blue-200 pb-2">
              <Briefcase className="w-4 h-4" /> 家政员
            </div>
            <FormField
              control={form.control}
              name="caregiverName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名 *</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-white" onChange={(e) => {
                      field.onChange(e.target.value);
                      form.setValue('caregiverId', e.target.value);
                    }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="monthlySalary" render={({ field }) => (
                <FormItem><FormLabel>月薪 (¥)</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="dailySalary" render={({ field }) => (
                <FormItem><FormLabel>日薪 (¥)</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl></FormItem>
              )} />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-100/50 p-2 rounded">
              <Info className="w-3 h-3" />
              <span>日薪优先逻辑：输入月薪自动折算，手动调整日薪则以日薪为准。</span>
            </div>
            <FormField control={form.control} name="caregiverPhone" render={({ field }) => (
              <FormItem><FormLabel>联系手机 *</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          {/* Section 2: Client */}
          <div className="p-5 rounded-2xl bg-orange-50/40 border border-orange-100 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-orange-700 font-bold border-b border-orange-200 pb-2">
              <User className="w-4 h-4" /> 客户
            </div>
            <FormField control={form.control} name="clientName" render={({ field }) => (
              <FormItem><FormLabel>客户姓名 *</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="clientPhone" render={({ field }) => (
              <FormItem><FormLabel>手机号 *</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="clientLocation" render={({ field }) => (
              <FormItem><FormLabel>区域 *</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          {/* Section 3: Dispatcher */}
          <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-purple-700 font-bold border-b border-purple-200 pb-2">
              <Headset className="w-4 h-4" /> 派单与财务
            </div>
            <FormField control={form.control} name="dispatcherName" render={({ field }) => (
              <FormItem><FormLabel>派单员 *</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dispatcherPhone" render={({ field }) => (
              <FormItem><FormLabel>派单员电话 *</FormLabel><FormControl><Input {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="managementFee" render={({ field }) => (
              <FormItem><FormLabel>管理费 (¥) *</FormLabel><FormControl><Input type="number" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        {/* Section 4: Schedule */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2 mb-6 uppercase tracking-wider">
            <Clock className="w-4 h-4" /> 服务周期与时长
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>开始日期 *</FormLabel>
                <DatePicker value={field.value} onChange={(d) => { lastDateUpdate.current = 'startDate'; field.onChange(d); }} />
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="durationDays" render={({ field }) => (
              <FormItem>
                <FormLabel>预计天数</FormLabel>
                <FormControl><Input type="number" {...field} onChange={(e) => { lastDateUpdate.current = 'duration'; field.onChange(e.target.value); }} className="bg-white" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="endDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>结束日期 *</FormLabel>
                <DatePicker value={field.value} onChange={(d) => { lastDateUpdate.current = 'endDate'; field.onChange(d); }} />
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Section 5: Total */}
        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
          <div className="flex items-center gap-2 text-primary font-bold mb-4"><Calculator className="w-5 h-5" /> 费用自动预估</div>
          <FormField control={form.control} name="totalAmount" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-bold">应付总额 (¥)</FormLabel>
              <FormControl><Input type="number" {...field} readOnly className="text-2xl font-black text-primary bg-white h-14 border-2 border-primary/30" /></FormControl>
              <FormDescription>公式: (折算日薪 ¥{calculation.dSalary} × {calculation.days} 天 + 管理费 ¥{calculation.fee})</FormDescription>
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="submit" disabled={isPending} className="min-w-[150px] rounded-full h-12 text-lg">
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

'use client';

import { useEffect, useMemo, useRef, useTransition } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
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
import { updateOrder } from '../actions';
import type { CaregiverOption } from '@/features/caregivers/actions';

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
  managementFee: z.coerce.number().min(0, "管理费不能为负数"),
  startDate: z.date({ message: '请选择开始日期' }),
  endDate: z.date({ message: '请选择结束日期' }),
  totalAmount: z.coerce.number().optional(),
  status: z.string().default('PENDING'),
  remarks: z.string().optional(),
}).refine((values) => values.endDate >= values.startDate, {
  message: '结束日期不能早于开始日期',
  path: ['endDate'],
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

interface EmbeddedCaregiver {
  phone?: string | null;
  name?: string | null;
}

export interface OrderFormDefaultValues {
  id?: string;
  caregiverId?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  monthlySalary?: number | string | null;
  dailySalary?: number | string | null;
  durationDays?: number | null;
  clientName?: string;
  clientPhone?: string;
  clientLocation?: string;
  dispatcherName?: string;
  dispatcherPhone?: string;
  managementFee?: number | string | null;
  caregiver?: EmbeddedCaregiver | null;
  contactPhone?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  totalAmount?: number | string | null;
  status?: string;
  remarks?: string;
}

interface OrderFormProps {
  defaultValues?: OrderFormDefaultValues;
  caregiverOptions?: CaregiverOption[];
  onSubmit: (values: OrderFormValues) => Promise<void>;
  submitLabel?: string;
  onSuccess?: () => void;
}

export function OrderForm({
  defaultValues,
  caregiverOptions = [],
  onSubmit,
  submitLabel = '提交订单',
  onSuccess,
}: OrderFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const lastDateUpdate = useRef<'startDate' | 'endDate' | 'duration' | null>(null);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema) as Resolver<OrderFormValues>,
    defaultValues: {
      caregiverId: defaultValues?.caregiverId ?? '',
      caregiverName: defaultValues?.caregiverName ?? '',
      caregiverPhone: defaultValues?.caregiverPhone || defaultValues?.caregiver?.phone || '',
      monthlySalary: Number(defaultValues?.monthlySalary ?? 0),
      dailySalary: Number(defaultValues?.dailySalary ?? 0),
      durationDays: Number(defaultValues?.durationDays ?? 1),
      clientName: defaultValues?.clientName ?? '',
      clientPhone: defaultValues?.clientPhone || defaultValues?.contactPhone || '',
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
        caregiverPhone: String(defaultValues.caregiverPhone || defaultValues.caregiver?.phone || ''),
        monthlySalary: Number(defaultValues.monthlySalary ?? 0),
        dailySalary: Number(defaultValues.dailySalary ?? 0),
        durationDays: Number(defaultValues.durationDays ?? 1),
        clientName: String(defaultValues.clientName ?? ''),
        clientPhone: String(defaultValues.clientPhone || defaultValues.contactPhone || ''),
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
  }, [defaultValues, form]);

  const { control, setValue } = form;

  const watchedStartDate = useWatch({ control, name: 'startDate' });
  const watchedEndDate = useWatch({ control, name: 'endDate' });
  const watchedDurationDays = useWatch({ control, name: 'durationDays' });
  const watchedMonthlySalary = useWatch({ control, name: 'monthlySalary' });
  const watchedDailySalary = useWatch({ control, name: 'dailySalary' });
  const watchedManagementFee = useWatch({ control, name: 'managementFee' });
  const watchedCaregiverId = useWatch({ control, name: 'caregiverId' });

  useEffect(() => {
    if (!watchedCaregiverId) return;
    const selectedCaregiver = caregiverOptions.find((item) => item.idString === watchedCaregiverId);
    if (!selectedCaregiver) return;

    // 中文说明：选择阿姨后自动回填关键字段，减少管理员重复录入与输错概率。
    setValue('caregiverName', selectedCaregiver.name, { shouldValidate: true });
    setValue('caregiverPhone', selectedCaregiver.phone, { shouldValidate: true });

    const currentMonthlySalary = Number(form.getValues('monthlySalary') || 0);
    const currentDailySalary = Number(form.getValues('dailySalary') || 0);
    if (!currentMonthlySalary && !currentDailySalary && selectedCaregiver.monthlySalary) {
      setValue('monthlySalary', selectedCaregiver.monthlySalary, { shouldValidate: true });
    }
  }, [caregiverOptions, form, setValue, watchedCaregiverId]);

  // Date linkage
  useEffect(() => {
    if (!watchedStartDate) return;

    if (lastDateUpdate.current === 'startDate' || lastDateUpdate.current === 'duration') {
      const durationDays = Number(watchedDurationDays ?? 0);
      if (durationDays > 0) {
        const newEndDate = addDays(watchedStartDate, durationDays - 1);
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
              name="caregiverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>选择阿姨 *</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white" data-testid="order-caregiver-select-trigger">
                        <SelectValue placeholder="按姓名 / 工号选择阿姨" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {caregiverOptions.map((caregiver) => (
                        <SelectItem key={caregiver.idString} value={caregiver.idString}>
                          {caregiver.name} / {caregiver.workerId} / {caregiver.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    若阿姨正在忙碌，仍可查看，但派单时系统会在提交阶段做冲突校验。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="caregiverName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名 *</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-white" readOnly />
                  </FormControl>
                  <FormDescription>系统会在选择阿姨后自动回填，通常无需手工修改。</FormDescription>
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
          {watchedEndDate && watchedStartDate && watchedEndDate < watchedStartDate && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              日期有误：结束日期不能早于开始日期，请重新选择服务周期。
            </div>
          )}
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            档期冲突会在提交时做最终校验。如阿姨在所选日期已有订单，系统会返回明确的中文提示。
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

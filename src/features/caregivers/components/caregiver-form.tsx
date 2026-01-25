'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';

import { createCaregiver, updateCaregiver } from '../actions';
import {
  caregiverFormSchema,
  type CaregiverFormValues,
  defaultCaregiverValues,
  GenderEnum,
  EducationEnum,
  WorkExperienceLevelEnum,
  LiveInStatusEnum,
} from '../schema';

// ... (existing constants)
const STEPS = [
  { id: 'basic', title: '基本信息' },
  { id: 'professional', title: '专业技能' },
  { id: 'files', title: '证件上传' },
];

const SPECIALTIES_OPTIONS = ["做饭", "保洁", "育儿", "英语", "陪护", "驾驶", "收纳"];

// ... (existing maps)
const EDUCATION_MAP: Record<string, string> = {
  PRIMARY: '小学',
  JUNIOR_HIGH: '初中',
  SENIOR_HIGH: '高中',
  VOCATIONAL: '中专/职高',
  COLLEGE: '大专',
  BACHELOR: '本科及以上',
};

const EXPERIENCE_LEVEL_MAP: Record<string, string> = {
  ENTRY: '初级 (1年以下)',
  INTERMEDIATE: '中级 (1-3年)',
  SENIOR: '高级 (3-5年)',
  EXPERT: '特级 (5年以上)',
};

interface CaregiverFormProps {
  initialData?: CaregiverFormValues & { idString: string };
}

export function CaregiverForm({ initialData }: CaregiverFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<CaregiverFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(caregiverFormSchema) as any,
    defaultValues: initialData || defaultCaregiverValues as CaregiverFormValues,
    mode: 'onChange',
  });

  const { trigger } = form;

  // Handle Next Step with Validation
  const handleNext = async () => {
    let fieldsToValidate: (keyof CaregiverFormValues)[] = [];

    if (currentStep === 0) {
      fieldsToValidate = [
        'workerId',
        'name',
        'phone',
        'idCardNumber',
        'dob',
        'gender',
        'nativePlace',
        'education',
        'notes',
      ];
    } else if (currentStep === 1) {
      fieldsToValidate = [
        'workExpLevel',
        'isLiveIn',
        'specialties',
      ];
    }

    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = (data: CaregiverFormValues) => {
    startTransition(async () => {
      let result;
      
      if (isEdit && initialData) {
        result = await updateCaregiver(initialData.idString, data);
      } else {
        result = await createCaregiver(data);
      }

      if (result.success) {
        toast.success(result.message);
        router.push('/caregivers'); 
        router.refresh();
      } else {
        toast.error(result.message || '操作失败');
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEdit ? '编辑护理员信息' : '录入护理员信息'}</CardTitle>
        <CardDescription>
          步骤 {currentStep + 1} / {STEPS.length}: {STEPS[currentStep].title}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* --- Step 1: Basic Info --- */}
            <div className={cn(currentStep === 0 ? "block" : "hidden", "space-y-4")}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="workerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>工号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入工号" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号</FormLabel>
                      <FormControl>
                        <Input placeholder="11位手机号" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="idCardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>身份证号</FormLabel>
                      <FormControl>
                        <Input placeholder="18位身份证号" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>出生日期</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          {...field}
                          value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : (field.value ?? '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>性别</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择性别" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GenderEnum.options.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender === 'MALE' ? '男' : '女'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nativePlace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>籍贯</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：江苏南京" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>学历</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择学历" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EducationEnum.options.map((edu) => (
                            <SelectItem key={edu} value={edu}>
                              {EDUCATION_MAP[edu] || edu}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注/其他信息</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入备注信息..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* --- Step 2: Professional Info --- */}
            <div className={cn(currentStep === 1 ? "block" : "hidden", "space-y-4")}>
               <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="workExpLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>工作经验等级</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择经验等级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {WorkExperienceLevelEnum.options.map((level) => (
                            <SelectItem key={level} value={level}>
                              {EXPERIENCE_LEVEL_MAP[level] || level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isLiveIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>住家情况</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择住家情况" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LiveInStatusEnum.options.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status === 'LIVE_IN' ? '住家' : status === 'LIVE_OUT' ? '不住家' : '皆可'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialties"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">特长 (多选)</FormLabel>
                      <FormDescription>
                        请选择该护理员擅长的技能领域。
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      {SPECIALTIES_OPTIONS.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="specialties"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* --- Step 3: Files --- */}
            <div className={cn(currentStep === 2 ? "block" : "hidden", "space-y-4")}>
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>头像 URL (暂用文本)</FormLabel>
                    <FormControl>
                      <Input placeholder="输入图片链接 (Mock)" {...field} />
                    </FormControl>
                    <FormDescription>后续将替换为真实文件上传</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="idCardFrontUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>身份证正面 URL</FormLabel>
                      <FormControl>
                        <Input placeholder="输入图片链接 (Mock)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="idCardBackUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>身份证背面 URL</FormLabel>
                      <FormControl>
                        <Input placeholder="输入图片链接 (Mock)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* --- Navigation Buttons --- */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 || isPending}
                className={cn(currentStep === 0 && 'invisible')}
              >
                上一步
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  下一步
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? '提交中...' : (isEdit ? '保存修改' : '提交')}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

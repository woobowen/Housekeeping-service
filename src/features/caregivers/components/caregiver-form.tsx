'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
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
  { id: 'metadata', title: '内部管理' },
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
  caregiverJson?: string;
  metadataJson?: string;
}

export function CaregiverForm({ initialData, caregiverJson, metadataJson }: CaregiverFormProps) {
  // Parse and hydrate JSON data if available
  const parsedInitialData = useMemo(() => {
    // 1. Prioritize caregiverJson (Full Data Tunnel)
    if (caregiverJson) {
       try {
        const data = JSON.parse(caregiverJson);
        if (data.dob) data.dob = new Date(data.dob);
        if (data.createdAt) data.createdAt = new Date(data.createdAt);
        if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);
        
        // Inject metadataJson if present separately or within
        if (metadataJson) {
           try {
             data.metadata = JSON.parse(metadataJson);
           } catch (e) { console.error('Failed to parse metadataJson prop', e); }
        } else if (data.metadataJson) {
           try {
             data.metadata = JSON.parse(data.metadataJson);
           } catch (e) { console.error('Failed to parse metadataJson from object', e); }
        }

        return data;
      } catch (e) {
        console.error("Failed to parse caregiverJson", e);
      }
    }
    
    // 2. Fallback to initialData + metadataJson
    if (initialData) {
       const data = { ...initialData };
       if (metadataJson) {
          try {
             data.metadata = JSON.parse(metadataJson);
          } catch(e) { console.error('Failed to parse metadataJson fallback', e); }
       }
       return data;
    }

    return null;
  }, [caregiverJson, initialData, metadataJson]);

  // Use parsed data as primary source, fallback to initialData
  const activeData = parsedInitialData || initialData;
  console.log('Client Active Data:', activeData);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(activeData?.avatarUrl || null);
  const router = useRouter();
  const isEdit = !!activeData;

  const form = useForm<CaregiverFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(caregiverFormSchema) as any,
    defaultValues: {
      ...defaultCaregiverValues,
      ...activeData,
      metadata: {
        rating: activeData?.metadata?.rating ?? 0,
        internalNotes: activeData?.metadata?.internalNotes ?? '',
        customTags: activeData?.metadata?.customTags ?? [],
      },
    } as CaregiverFormValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (activeData) {
      form.reset({
        ...defaultCaregiverValues,
        ...activeData,
        metadata: {
          rating: activeData.metadata?.rating ?? 0,
          internalNotes: activeData.metadata?.internalNotes ?? '',
          customTags: activeData.metadata?.customTags ?? [],
        },
      });
      setPreviewUrl(activeData.avatarUrl || null);
    }
  }, [activeData, form]);

  const { trigger } = form;

  // Handle Next Step with Validation
  const handleNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    let fieldsToValidate: (keyof CaregiverFormValues)[] = [];

    switch (currentStep) {
      case 0:
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
        break;
      case 1:
        fieldsToValidate = [
          'workExpLevel',
          'isLiveIn',
          'specialties',
        ];
        break;
      case 2:
        fieldsToValidate = [
          // 'avatarUrl', // Avatar is now handled by file input state
          'idCardFrontUrl',
          'idCardBackUrl',
        ];
        break;
      // Step 3 (Metadata) is last, validation happens on submit usually, 
      // but if we had more steps, we'd add case 3 here.
    }

    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      form.setValue('avatarUrl', url); 
    }
  };

  const onSubmit = (data: CaregiverFormValues) => {
    // Safeguard: Prevent submission if not on the last step
    if (currentStep < STEPS.length - 1) {
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();

        // 1. Basic Fields
        if (data.workerId) formData.append('workerId', data.workerId);
        if (data.name) formData.append('name', data.name);
        if (data.phone) formData.append('phone', data.phone);
        if (data.idCardNumber) formData.append('idCardNumber', data.idCardNumber);
        
        // Date formatting
        if (data.dob) {
           const dateStr = data.dob instanceof Date 
             ? format(data.dob, 'yyyy-MM-dd') 
             : String(data.dob);
           formData.append('dob', dateStr);
        }

        if (data.gender) formData.append('gender', data.gender);
        if (data.nativePlace) formData.append('nativePlace', data.nativePlace);
        if (data.education) formData.append('education', data.education);
        if (data.notes) formData.append('notes', data.notes);

        // 2. Professional Fields
        if (data.workExpLevel) formData.append('workExpLevel', data.workExpLevel);
        if (data.isLiveIn) formData.append('isLiveIn', data.isLiveIn);
        
        // JSON Arrays
        formData.append('specialties', JSON.stringify(data.specialties || []));

        // 3. Files
        if (data.avatarUrl) formData.append('avatarUrl', data.avatarUrl);
        if (data.idCardFrontUrl) formData.append('idCardFrontUrl', data.idCardFrontUrl);
        if (data.idCardBackUrl) formData.append('idCardBackUrl', data.idCardBackUrl);

        // Append REAL File object
        if (selectedFile) {
          formData.append('avatarFile', selectedFile);
        }

        // 4. Metadata (JSON)
        if (data.metadata) {
          formData.append('metadata', JSON.stringify(data.metadata));
        }

        if (isEdit && initialData) {
          formData.append('idString', initialData.idString);
          const result = await updateCaregiver(null, formData);
          
          if (result && !result.success) {
            toast.error(result.message);
          } else {
            toast.success('更新成功');
          }
        } else {
          const result = await createCaregiver(null, formData);
          if (result.success) {
            toast.success(result.message);
            router.push('/caregivers'); 
            router.refresh();
          } else {
            toast.error(result.message || '操作失败');
          }
        }
      } catch (error: any) {
        // Next.js redirects (redirect()) work by throwing a special error.
        // We must not treat this as a real error in our UI.
        if (error.message === 'NEXT_REDIRECT' || error.message?.includes('NEXT_REDIRECT')) {
          return;
        }

        console.error("Submit error:", error);
        toast.error('提交发生错误');
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
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-6"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement && currentStep < STEPS.length - 1) {
                e.preventDefault();
              }
            }}
          >
            
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
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
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
                    <FormLabel>头像上传</FormLabel>
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-full border bg-muted">
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt="Avatar preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            无图
                          </div>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          disabled={field.disabled}
                          type="file"
                          accept="image/*"
                          onChange={onFileChange}
                          className="w-full max-w-sm"
                        />
                      </FormControl>
                    </div>
                    <FormDescription>支持 JPG, PNG, WEBP 格式</FormDescription>
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

            {/* --- Step 4: Metadata (Internal Management) --- */}
            <div className={cn(currentStep === 3 ? "block" : "hidden", "space-y-4")}>
               <div className="grid gap-4 md:grid-cols-2">
                 <FormField
                   control={form.control}
                   name="metadata.rating"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>评分 (1-5)</FormLabel>
                       <FormControl>
                         <Input
                           type="text"              // CHANGE: Use text to stop browser interference
                           inputMode="decimal"      // HINT: Shows numeric keypad on mobile
                           placeholder="0-5"
                           {...field}
                           // 1. Display Logic: Convert undefined/0 to string, handle empty case
                           // Ensure we never pass null/undefined to value to avoid uncontrolled warnings
                           value={field.value ?? ''}
                           onChange={(e) => {
                             const rawValue = e.target.value;

                             // 2. Allow clearing the input completely
                             if (rawValue === '') {
                               field.onChange(undefined);
                               return;
                             }

                             // 3. Regex Validation: Only allow digits and one decimal point
                             // Matches: "1", "1.", "1.5"
                             if (/^\d*\.?\d*$/.test(rawValue)) {
                                 // Prevent values > 5 manually since type="text" ignores max attribute
                                 const num = parseFloat(rawValue);
                                 if (!isNaN(num) && num <= 5) {
                                    field.onChange(num);
                                 } else if (isNaN(num)) {
                                    // Handle edge case like "."
                                    field.onChange(undefined);
                                 }
                             }
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <FormField
                   control={form.control}
                   name="metadata.customTags"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>自定义标签 (逗号分隔)</FormLabel>
                       <FormControl>
                         <Input 
                           placeholder="例如: VIP, 加急, 夜班" 
                           value={(field.value || []).join(', ')}
                           onChange={(e) => {
                             const value = e.target.value;
                             // Convert comma-separated string to array
                             const tags = value.split(/[,，]/).map(t => t.trim()).filter(Boolean);
                             field.onChange(tags);
                           }} 
                         />
                       </FormControl>
                       <FormDescription>输入标签后用逗号分隔</FormDescription>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
               </div>

               <FormField
                 control={form.control}
                 name="metadata.internalNotes"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>内部备注</FormLabel>
                     <FormControl>
                       <Textarea
                         placeholder="仅管理员可见的备注信息..."
                         className="min-h-[100px]"
                         {...field}
                         value={field.value ?? ''}
                       />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            </div>

            {/* --- Navigation Buttons --- */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              {/* Back Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 || isPending}
                className={cn(currentStep === 0 && 'invisible')}
              >
                上一步
              </Button>

              {/* Logic Split: Explicitly separate Next and Submit buttons */}
              {currentStep === STEPS.length - 1 ? (
                // === SUBMIT BUTTON ===
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? '提交中...' : (isEdit ? '保存修改' : '提交')}
                </Button>
              ) : (
                // === NEXT BUTTON ===
                <Button type="button" onClick={handleNext}>
                  下一步
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

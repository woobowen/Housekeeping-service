'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2, X, Plus, Upload, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';

import { createCaregiver, updateCaregiver } from '../actions';
import { getGlobalFieldConfig } from '@/features/system/actions';
import { DynamicFieldRenderer, type FieldDefinition } from '../../settings/components/dynamic-field-renderer';
import { CAREGIVER_OPTIONS } from '@/constants/caregiver-options';

import {
  caregiverFormSchema,
  type CaregiverFormValues,
  defaultCaregiverValues,
} from '../schema';

const SUZHOU_AREAS = [
  "工业园区", "姑苏区", "虎丘区/高新区", "吴中区", "相城区", "吴江区", "昆山市", "太仓市", "张家港市", "常熟市"
];

const EDUCATION_OPTIONS = [
  { label: '小学', value: 'PRIMARY' },
  { label: '初中', value: 'JUNIOR_HIGH' },
  { label: '高中', value: 'SENIOR_HIGH' },
  { label: '中专/职高', value: 'VOCATIONAL' },
  { label: '大专', value: 'COLLEGE' },
  { label: '本科及以上', value: 'BACHELOR' },
];

const STEPS = [
  { id: 'basic', title: '基本信息' },
  { id: 'professional', title: '专业技能' },
  { id: 'content', title: '详细介绍' },
  { id: 'files', title: '证件与照片' },
  { id: 'extended', title: '拓展信息' },
];

interface CaregiverFormProps {
  initialData?: any;
}

export function CaregiverForm({ initialData }: CaregiverFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [dynamicFields, setDynamicFields] = useState<FieldDefinition[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [filesMap, setFilesMap] = useState<Record<string, File>>({});
  
  const router = useRouter();
  const isEdit = !!initialData;

  const form = useForm<CaregiverFormValues>({
    resolver: zodResolver(caregiverFormSchema) as any,
    defaultValues: {
      ...defaultCaregiverValues,
      workerId: initialData?.workerId || "",
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      idCardNumber: initialData?.idCardNumber || "",
      dob: initialData?.dob || null,
      gender: initialData?.gender || "女",
      nativePlace: initialData?.nativePlace || "",
      education: initialData?.education || "",
      currentResidence: initialData?.currentResidence || undefined,
      residenceDetail: initialData?.residenceDetail || "",
      
      height: initialData?.height ?? undefined,
      weight: initialData?.weight ?? undefined,
      experienceYears: initialData?.experienceYears ?? undefined,
      isLiveIn: initialData?.isLiveIn || "",
      
      jobTypes: initialData?.jobTypes || [],
      specialties: initialData?.specialties || [],
      certificates: initialData?.certificates || [],
      cookingSkills: initialData?.cookingSkills || [],
      languages: initialData?.languages || [],
      
      workHistory: initialData?.workHistory || "",
      selfIntro: initialData?.selfIntro || "",
      reviews: initialData?.reviews || "",
      notes: initialData?.notes || "",
      
      avatarUrl: initialData?.avatarUrl || "",
      idCardFrontUrl: initialData?.idCardFrontUrl || "",
      idCardBackUrl: initialData?.idCardBackUrl || "",
      healthCertImages: initialData?.healthCertImages || [],
      lifeImages: initialData?.lifeImages || [],
    },
  });

  useEffect(() => {
    getGlobalFieldConfig().then((config) => {
      const allFields = [...(config.sections.basic_info || []), ...(config.sections.skills || [])];
      setDynamicFields(allFields as FieldDefinition[]);
    });

    if (initialData?.customData) {
      try {
        setCustomValues(JSON.parse(initialData.customData));
      } catch (e) { console.error(e); }
    }

    if (initialData?.currentResidence) {
      form.setValue('currentResidence', initialData.currentResidence);
    }

    // Cleanup blob URLs on unmount
    return () => {
      Object.keys(filesMap).forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [initialData, form]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof CaregiverFormValues)[] = [];
    if (currentStep === 0) fieldsToValidate = ['workerId', 'name', 'phone', 'idCardNumber'];
    
    const isStepValid = fieldsToValidate.length > 0 ? await form.trigger(fieldsToValidate) : true;
    if (isStepValid && currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof CaregiverFormValues) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fieldName === 'avatarUrl') {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setFilesMap(prev => ({ ...prev, [url]: file }));
      form.setValue('avatarUrl', url);
      return;
    }

    const newUrls: string[] = [];
    const newFilesMap = { ...filesMap };

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        newUrls.push(url);
        newFilesMap[url] = file;
    }
    
    setFilesMap(newFilesMap);
    const currentValues = (form.getValues(fieldName) as string[]) || [];
    form.setValue(fieldName, [...currentValues, ...newUrls] as any);
  };

  const removeImage = (fieldName: keyof CaregiverFormValues, index: number) => {
    if (fieldName === 'avatarUrl') {
      const url = form.getValues('avatarUrl') as string;
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
        setFilesMap(prev => {
          const next = { ...prev };
          delete next[url];
          return next;
        });
      }
      form.setValue('avatarUrl', '');
      return;
    }

    const currentValues = form.getValues(fieldName) as string[];
    const urlToRemove = currentValues[index];
    
    if (urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
      const newFilesMap = { ...filesMap };
      delete newFilesMap[urlToRemove];
      setFilesMap(newFilesMap);
    }

    const newValues = [...currentValues];
    newValues.splice(index, 1);
    form.setValue(fieldName, newValues as any);
  };

  const onSubmit = (data: CaregiverFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      
      if (isEdit && initialData?.idString) {
        formData.append('idString', initialData.idString);
      }

      Object.entries(data).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        
        if (key === 'healthCertImages' || key === 'lifeImages') {
          const urls = value as string[];
          const existingUrls = urls.filter(url => !url.startsWith('blob:'));
          const blobUrls = urls.filter(url => url.startsWith('blob:'));
          
          formData.append(key, JSON.stringify(existingUrls));
          
          const fileKey = key.replace('Images', 'Files');
          blobUrls.forEach(url => {
            const file = filesMap[url];
            if (file) formData.append(fileKey, file);
          });
          return;
        }

        if (key === 'avatarUrl') {
          const url = value as string;
          if (url.startsWith('blob:')) {
            const file = filesMap[url];
            if (file) formData.append('avatarFile', file);
            formData.append('avatarUrl', ''); // Backend will handle the file
          } else {
            formData.append('avatarUrl', url);
          }
          return;
        }

        if (Array.isArray(value) || typeof value === 'object') {
          if (value instanceof Date) {
            formData.append(key, format(value, 'yyyy-MM-dd'));
          } else {
            formData.append(key, JSON.stringify(value));
          }
        } else {
          formData.append(key, String(value));
        }
      });
      
      formData.append('customData', JSON.stringify(customValues));

      const result = isEdit 
        ? await updateCaregiver(null, formData)
        : await createCaregiver(null, formData);

      if (result.success) {
        toast.success(result.message);
        router.push('/caregivers');
        router.refresh();
      } else {
        toast.error(result.message || '操作失败');
      }
    });
  };

  const renderMultiSelect = (fieldName: keyof CaregiverFormValues, label: string, options: string[]) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>{label}</FormLabel>
          <div className="flex flex-wrap gap-2">
            {options.map(option => {
              const selected = (field.value as string[])?.includes(option);
              return (
                <Badge
                  key={option}
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer py-1.5 px-3"
                  onClick={() => {
                    const current = (field.value as string[]) || [];
                    const next = selected ? current.filter(i => i !== option) : [...current, option];
                    field.onChange(next);
                  }}
                >
                  {option}
                  {selected ? <X className="ml-1 h-3 w-3" /> : <Plus className="ml-1 h-3 w-3" />}
                </Badge>
              );
            })}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="w-full max-w-3xl mx-auto shadow-lg border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">{isEdit ? '编辑护理员' : '录入护理员'}</CardTitle>
                <CardDescription>步骤 {currentStep + 1} / {STEPS.length}: {STEPS[currentStep].title}</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            {/* Step 1: Basic Info */}
            <div className={cn(currentStep === 0 ? "space-y-6" : "hidden")}>
              <div className="flex flex-col items-center justify-center space-y-4 mb-8">
                <FormLabel>头像</FormLabel>
                <div className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden group hover:border-primary transition-colors">
                  {form.watch('avatarUrl') ? (
                    <>
                      <img src={form.watch('avatarUrl')!} className="w-full h-full object-cover" alt="头像" />
                      <button type="button" onClick={() => removeImage('avatarUrl', 0)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-6 h-6 text-white" />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500">点击上传</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatarUrl')} />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="workerId" render={({ field }) => (
                  <FormItem><FormLabel>工号 *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>姓名 *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>手机号 *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="idCardNumber" render={({ field }) => (
                  <FormItem><FormLabel>身份证号 *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nativePlace" render={({ field }) => (
                  <FormItem><FormLabel>籍贯</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dob" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>出生日期</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>性别</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="选择性别" /></SelectTrigger></FormControl><SelectContent><SelectItem value="男">男</SelectItem><SelectItem value="女">女</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="height" render={({ field }) => (
                  <FormItem><FormLabel>身高 (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="weight" render={({ field }) => (
                  <FormItem><FormLabel>体重 (kg)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="education" render={({ field }) => (
                  <FormItem><FormLabel>学历</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="选择学历" /></SelectTrigger></FormControl><SelectContent>{EDUCATION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currentResidence" render={({ field }) => (
                  <FormItem>
                    <FormLabel>暂住区域</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择区域" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUZHOU_AREAS.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Step 2: Professional Info */}
            <div className={cn(currentStep === 1 ? "space-y-8" : "hidden")}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="experienceYears" render={({ field }) => (
                  <FormItem><FormLabel>从业年限 (年)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              {renderMultiSelect('jobTypes', '工种', CAREGIVER_OPTIONS.jobTypes)}
              {renderMultiSelect('specialties', '特长', CAREGIVER_OPTIONS.specialties)}
              {renderMultiSelect('certificates', '证书', CAREGIVER_OPTIONS.certificates)}
              {renderMultiSelect('cookingSkills', '烹饪技巧', CAREGIVER_OPTIONS.cookingSkills)}
            </div>

            {/* Step 3: Content blocks */}
            <div className={cn(currentStep === 2 ? "space-y-6" : "hidden")}>
              <FormField control={form.control} name="selfIntro" render={({ field }) => (
                <FormItem><FormLabel>自我介绍</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="workHistory" render={({ field }) => (
                <FormItem><FormLabel>工作经历</FormLabel><FormControl><Textarea rows={6} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="reviews" render={({ field }) => (
                <FormItem><FormLabel>他人评语</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>备注说明</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            {/* Step 4: Files and Photos */}
            <div className={cn(currentStep === 3 ? "space-y-8" : "hidden")}>
               <div className="space-y-4">
                 <FormLabel>健康证/体检表</FormLabel>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {form.watch('healthCertImages')?.map((url, i) => (
                      <div key={i} className="relative aspect-[3/4] rounded-lg border overflow-hidden group">
                        <img src={url} className="w-full h-full object-cover" alt="健康证" />
                        <button type="button" onClick={() => removeImage('healthCertImages', i)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <label className="aspect-[3/4] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500">点击上传</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'healthCertImages')} />
                    </label>
                 </div>
               </div>

               <div className="space-y-4">
                 <FormLabel>照片</FormLabel>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {form.watch('lifeImages')?.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg border overflow-hidden group">
                        <img src={url} className="w-full h-full object-cover" alt="照片" />
                        <button type="button" onClick={() => removeImage('lifeImages', i)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500">点击上传</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'lifeImages')} />
                    </label>
                 </div>
               </div>
            </div>

            {/* Step 5: Extended */}
            <div className={cn(currentStep === 4 ? "block" : "hidden")}>
               <DynamicFieldRenderer fields={dynamicFields} values={customValues} onChange={(k, v) => setCustomValues(prev => ({ ...prev, [k]: v }))} />
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8 border-t">
              <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 0 || isPending} className={cn(currentStep === 0 && "invisible")}>上一步</Button>
              <div className="flex gap-4">
                {currentStep < STEPS.length - 1 ? (
                  <Button type="button" onClick={handleNext}>下一步</Button>
                ) : (
                  <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEdit ? '保存修改' : '立即创建'}</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

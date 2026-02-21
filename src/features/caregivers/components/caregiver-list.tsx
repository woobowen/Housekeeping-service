'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, GraduationCap, Briefcase, FileDown, Ruler, Weight, Clock } from 'lucide-react';
import { AvailabilityBadge } from './availability-badge';
import { EducationMap, LiveInStatusMap } from '@/lib/mappings';
import { toast } from 'sonner';
import { utils, writeFile } from 'xlsx';
import { getGlobalFieldConfig } from '@/features/system/actions';

interface Caregiver {
  id: string;
  workerId: string;
  fullName: string;
  phone: string;
  gender: string | null;
  age: number;
  dob: Date | null;
  status: string;
  nativePlace: string | null;
  education: string | null;
  height: number | null;
  weight: number | null;
  experienceYears: number | null;
  isTrainee: boolean;
  jobTypes: string[];
  specialties: string[];
  certificates: string[];
  cookingSkills: string[];
  languages: string[];
  avatarUrl: string | null;
  liveInStatus: string | null;
  currentResidence: string | null;
  residenceDetail: string | null;
  idCardNumber: string;
  notes: string | null;
  customData: Record<string, any> | string | null | undefined;
}

interface CaregiverListProps {
  data: Caregiver[];
}

export function CaregiverList({ data }: CaregiverListProps) {
  const handleExport = async () => {
    try {
      toast.loading('正在准备导出数据...');

      const fieldConfig = await getGlobalFieldConfig();
      const dynamicFields = [
        ...(fieldConfig.sections.basic_info || []),
        ...(fieldConfig.sections.skills || [])
      ];

      const headers = [
        "工号", "姓名", "培训中", "手机号", "身份证号", "薪资要求", "出生日期", "性别", 
        "从业年限", "学历", "籍贯", "身高(cm)", "体重(kg)", "住家意向", "暂住区域", "详细地址", 
        "核心工种", "特长技能", "持有证书", "烹饪技巧",
        ...dynamicFields.map(field => field.label),
        "备注"
      ];

      const getCustomValue = (customData: any, key: string) => {
        if (!customData) return '';
        let obj = customData;
        if (typeof customData === 'string') {
          try { obj = JSON.parse(customData); } catch { return ''; }
        }
        const val = obj?.[key];
        if (typeof val === 'boolean') return val ? '是' : '否';
        return val ?? '';
      };

      const exportData = data.map(item => {
        const dynamicValues = dynamicFields.map(field => getCustomValue(item.customData, field.name));
        const fmtArray = (val: any) => Array.isArray(val) ? val.join(', ') : '';

        return [
          item.workerId,
          item.fullName,
          item.isTrainee ? '是' : '否',
          item.phone,
          item.idCardNumber,
          item.salaryRequirements,
          item.dob ? new Date(item.dob).toLocaleDateString('zh-CN') : '',
          item.gender === 'MALE' ? '男' : item.gender === 'FEMALE' ? '女' : '未知',
          item.experienceYears ? `${item.experienceYears}年` : '',
          EducationMap[item.education || ''] || item.education || '',
          item.nativePlace,
          item.height || '',
          item.weight || '',
          LiveInStatusMap[item.liveInStatus || ''] || item.liveInStatus || '',
          item.currentResidence,
          item.residenceDetail,
          fmtArray(item.jobTypes),
          fmtArray(item.specialties),
          fmtArray(item.certificates),
          fmtArray(item.cookingSkills),
          ...dynamicValues,
          item.notes
        ];
      });

      const wb = utils.book_new();
      const ws = utils.aoa_to_sheet([headers, ...exportData]);
      utils.book_append_sheet(wb, ws, '阿姨数据');
      
      const fileName = `阿姨库导出_${new Date().toISOString().split('T')[0]}.xlsx`;
      writeFile(wb, fileName);

      toast.dismiss();
      toast.success('导出成功');
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error('导出失败');
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="text-muted-foreground mb-6 font-medium">没找到符合条件的阿姨，请尝试调整筛选条件。</p>
        <Button asChild variant="default">
          <Link href="/caregivers/new">创建新阿姨资料</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
           检索到 <span className="text-primary">{data.length}</span> 位阿姨
        </span>
        <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-2 rounded-full px-5 border-slate-200 hover:bg-slate-50">
          <FileDown className="h-4 w-4" />
          导出 Excel 数据
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((caregiver) => (
          <Card key={caregiver.id} className="group overflow-hidden border-slate-200 hover:border-primary/50 hover:shadow-xl transition-all duration-300 rounded-2xl flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-slate-50/50">
              <div className="flex flex-col">
                <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">
                  {caregiver.fullName}
                </CardTitle>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                  {caregiver.workerId}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                 <AvailabilityBadge status={caregiver.status} />
                 {caregiver.isTrainee && (
                   <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] px-2 py-0">培训中</Badge>
                 )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <div className="grid grid-cols-2 gap-y-3 text-sm mb-6">
                <div className="flex items-center text-slate-600 font-medium col-span-2">
                  <Phone className="mr-2 h-4 w-4 text-slate-400" />
                  {caregiver.phone}
                </div>
                <div className="flex items-center text-slate-500">
                  <Clock className="mr-2 h-4 w-4 text-slate-300" />
                  经验: {caregiver.experienceYears ? `${caregiver.experienceYears}年` : '未填'}
                </div>
                <div className="flex items-center text-slate-500">
                  <Ruler className="mr-2 h-4 w-4 text-slate-300" />
                  {caregiver.height ? `${caregiver.height}cm` : '-'} / {caregiver.weight ? `${caregiver.weight}kg` : '-'}
                </div>
                <div className="flex items-center text-slate-500">
                  <MapPin className="mr-2 h-4 w-4 text-slate-300" />
                  {caregiver.nativePlace || '籍贯不详'}
                </div>
                 <div className="flex items-center text-slate-500">
                  <GraduationCap className="mr-2 h-4 w-4 text-slate-300" />
                  {EducationMap[caregiver.education || ''] || caregiver.education || '-'}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-100">
                {(caregiver.jobTypes || []).slice(0, 3).map((job, index) => (
                  <Badge key={index} variant="secondary" className="bg-slate-100 text-slate-500 border-none text-[10px]">
                    {job}
                  </Badge>
                ))}
                {(caregiver.specialties || []).slice(0, 2).map((skill, index) => (
                  <Badge key={index} variant="outline" className="border-slate-200 text-slate-400 text-[10px]">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button asChild className="w-full rounded-xl group-hover:bg-primary group-hover:text-white transition-colors" variant="outline">
                <Link href={`/caregivers/${caregiver.id}`}>
                  查看完整档案
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
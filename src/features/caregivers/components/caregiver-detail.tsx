'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeleteCaregiverButton } from '@/components/caregiver-delete-button';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  User,
  FileText,
  Star,
  FileSignature,
  Ruler,
  Weight,
  Clock,
  CheckCircle2,
  Award,
  Utensils
} from 'lucide-react';
import { format } from 'date-fns';
import { AvailabilityBadge } from './availability-badge';
import {
  EducationMap,
  GenderMap,
  CaregiverLevelMap,
} from '@/lib/mappings';
import { zhCN } from 'date-fns/locale';

interface CaregiverDetailProps {
  data: any;
  systemFields?: any[];
}

export function CaregiverDetail({ data, systemFields = [] }: CaregiverDetailProps) {
  const customDataMap = useMemo(() => {
    if (!data.customData) return {};
    try {
      return typeof data.customData === 'string' ? JSON.parse(data.customData) : data.customData;
    } catch (e) { return {}; }
  }, [data.customData]);

  const renderSkillSection = (title: string, icon: React.ReactNode, items: string[] | any) => {
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
          {icon} {title}
        </h4>
        <div className="flex flex-wrap gap-2">
          {list.map((item, i) => (
            <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 px-3 py-1">
              {item}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderContentBlock = (title: string, content: string | null) => {
    return (
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 py-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">
          {content || <span className="text-slate-400 italic">暂无内容</span>}
        </CardContent>
      </Card>
    );
  };

  const renderGallery = (title: string, images: string[] | any) => {
    const list = Array.isArray(images) ? images : [];
    if (list.length === 0) return null;
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
          {title}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {list.map((url, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 hover:shadow-md transition-shadow cursor-pointer">
              <img src={url} className="w-full h-full object-cover" alt={`${title}-${i}`} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="-ml-4 hover:bg-slate-100">
          <Link href="/caregivers">
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回列表
          </Link>
        </Button>
        <div className="flex gap-3">
           <Button className="bg-blue-600 hover:bg-blue-700 shadow-md" asChild>
             <Link href={`/orders?action=new&caregiverId=${data.idString}&caregiverName=${encodeURIComponent(data.name)}&caregiverPhone=${data.phone}`}>
               <FileSignature className="mr-2 h-4 w-4" /> 派单立项
             </Link>
           </Button>
           <Button variant="outline" asChild className="border-slate-200 shadow-sm">
             <Link href={`/caregivers/${data.idString}/edit`}>编辑信息</Link>
           </Button>
           <DeleteCaregiverButton id={data.idString} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Essential Info (Narrower - col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-slate-200 shadow-md overflow-hidden">
            <div className="bg-slate-50 h-24 border-b flex justify-end p-4">
            </div>
            <CardHeader className="text-center -mt-16 pb-2">
              <div className="w-32 h-32 mx-auto bg-white rounded-2xl border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                {data.avatarUrl ? (
                    <img src={data.avatarUrl || "/placeholder-avatar.png"} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <User className="h-16 w-16 text-slate-300" />
                    </div>
                )}
              </div>
              <CardTitle className="text-2xl font-black mt-4">{data.name}</CardTitle>
              <CardDescription className="text-slate-500 font-medium">工号: {data.workerId}</CardDescription>
              <div className="pt-4 flex justify-center gap-2">
                <AvailabilityBadge status={data.status} />
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">
                  {CaregiverLevelMap[data.level] || data.level}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center text-sm font-medium p-3 bg-slate-50 rounded-xl">
                  <Phone className="mr-3 h-4 w-4 text-blue-500" /> {data.phone}
                </div>
                <div className={cn(
                  "flex items-center text-sm font-medium p-3 rounded-xl",
                  data.gender === "男" ? "text-blue-600 bg-blue-100/50" : "text-pink-600 bg-pink-100/50"
                )}>
                  <User className={cn("mr-3 h-4 w-4", data.gender === "男" ? "text-blue-500" : "text-pink-500")} /> {GenderMap[data.gender] || data.gender || '未知'}
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                 {data.dob && (
                   <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                     <span className="text-slate-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> 出生日期</span>
                     <span className="font-bold">{format(new Date(data.dob), 'yyyy年MM月dd日', { locale: zhCN })}</span>
                   </div>
                 )}
                 <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                   <span className="text-slate-500 flex items-center gap-2"><Ruler className="w-4 h-4" /> 身高</span>
                   <span className="font-bold">{data.height ? `${data.height} cm` : '未填'}</span>
                 </div>
                 <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                   <span className="text-slate-500 flex items-center gap-2"><Weight className="w-4 h-4" /> 体重</span>
                   <span className="font-bold">{data.weight ? `${data.weight} kg` : '未填'}</span>
                 </div>
                 <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                   <span className="text-slate-500 flex items-center gap-2"><Clock className="w-4 h-4" /> 从业年限</span>
                   <span className="font-bold">{data.experienceYears ? `${data.experienceYears} 年` : '未填'}</span>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 border-b bg-slate-50/50">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">联系信息</CardTitle>
            </CardHeader>
            <CardContent className="py-4 space-y-4">
               <div className="space-y-1">
                 <p className="text-xs font-bold text-slate-400 uppercase">身份证号</p>
                 <p className="text-sm font-medium">{data.idCardNumber || '未登记'}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-xs font-bold text-slate-400 uppercase">籍贯</p>
                 <p className="text-sm font-medium">{data.nativePlace || '未登记'}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-xs font-bold text-slate-400 uppercase">暂住地</p>
                 <p className="text-sm font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> {data.currentResidence || '未登记'}</p>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Skills & Details (Wider - col-span-8) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Professional Skills Card - Distinct Sections */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-white py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-blue-600" /> 专业技能图谱
              </CardTitle>
            </CardHeader>
            <CardContent className="py-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {renderSkillSection('工种', <Briefcase className="w-4 h-4" />, data.jobTypes)}
              {renderSkillSection('特长', <Star className="w-4 h-4" />, data.specialties)}
              {renderSkillSection('证书', <CheckCircle2 className="w-4 h-4" />, data.certificates)}
              {renderSkillSection('烹饪技巧', <Utensils className="w-4 h-4" />, data.cookingSkills)}
            </CardContent>
          </Card>

          {/* Text Blocks for History, Intro, Reviews */}
          <div className="grid grid-cols-1 gap-6">
            {renderContentBlock('自我介绍', data.selfIntro)}
            {renderContentBlock('工作经历', data.workHistory)}
            {renderContentBlock('他人评语', data.reviews)}
          </div>

          {/* Gallery for Health Certs and Photos */}
          <Card className="border-slate-200 shadow-sm p-8 space-y-10">
             {renderGallery('健康证 / 体检表', data.healthCertImages)}
             <Separator className="bg-slate-100" />
             {renderGallery('照片风采展示', data.lifeImages)}
          </Card>

          {/* System Fields (Dynamic) */}
          {systemFields.length > 0 && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
               <CardHeader className="bg-slate-50/50 py-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-slate-500">
                  拓展资料
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                {systemFields.map((field: any) => (
                   <div key={field.name} className="space-y-1">
                     <p className="text-xs font-bold text-slate-400 uppercase">{field.label}</p>
                     <p className="text-sm font-medium">{customDataMap[field.name] || '-'}</p>
                   </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Remarks */}
          <Card className="border-slate-200 shadow-sm bg-slate-50/30">
             <CardHeader className="py-3 border-b">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">备注说明</CardTitle>
             </CardHeader>
             <CardContent className="py-4 italic text-sm text-slate-500">
               {data.notes || '暂无其他备注说明'}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeleteCaregiverButton } from '@/components/caregiver-delete-button';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Briefcase, 
  Calendar, 
  User,
  FileText,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { CaregiverMetadata } from '../types';

// Define the shape of the parsed caregiver data
// This should match the return type of getCaregiver in actions.ts
interface CaregiverDetailProps {
  data: {
    idString: string;
    workerId: string;
    name: string;
    phone: string;
    idCardNumber: string;
    dob: Date | null;
    gender: string | null;
    nativePlace: string | null;
    education: string | null;
    workExpLevel: string | null;
    isLiveIn: string | null;
    specialties: string[];
    cookingSkills: string[];
    languages: string[];
    avatarUrl: string | null;
    notes: string | null;
    metadata: CaregiverMetadata;
    status: string;
    level: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function CaregiverDetail({ data }: CaregiverDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/caregivers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>
        <div className="flex gap-2">
           <Button variant="outline" asChild>
             <Link href={`/caregivers/${data.idString}/edit`}>
               编辑信息
             </Link>
           </Button>
           <DeleteCaregiverButton id={data.idString} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center mb-4 text-4xl text-muted-foreground overflow-hidden">
                {data.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                    <User className="h-12 w-12" />
                )}
              </div>
              <CardTitle className="text-2xl">{data.name}</CardTitle>
              <CardDescription>工号: {data.workerId}</CardDescription>
              <div className="pt-2 flex justify-center gap-2">
                <Badge variant={getStatusVariant(data.status)}>{getStatusLabel(data.status)}</Badge>
                <Badge variant="outline">{data.level}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center text-sm">
                <Phone className="mr-3 h-4 w-4 text-muted-foreground" />
                {data.phone}
              </div>
               <div className="flex items-center text-sm">
                <User className="mr-3 h-4 w-4 text-muted-foreground" />
                {data.gender === 'MALE' ? '男' : data.gender === 'FEMALE' ? '女' : '未知'}
              </div>
              {data.dob && (
                <div className="flex items-center text-sm">
                  <Calendar className="mr-3 h-4 w-4 text-muted-foreground" />
                  {format(new Date(data.dob), 'yyyy-MM-dd')}
                </div>
              )}
            </CardContent>
          </Card>

           <Card>
             <CardHeader>
               <CardTitle className="text-base">系统信息</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2 text-sm text-muted-foreground">
               <div className="flex justify-between">
                 <span>创建时间</span>
                 <span>{format(new Date(data.createdAt), 'yyyy-MM-dd')}</span>
               </div>
               <div className="flex justify-between">
                 <span>更新时间</span>
                 <span>{format(new Date(data.updatedAt), 'yyyy-MM-dd')}</span>
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>基本资料</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">身份证号</p>
                <p>{data.idCardNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">籍贯</p>
                <p className="flex items-center"><MapPin className="mr-1 h-3 w-3" /> {data.nativePlace || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">学历</p>
                 <p className="flex items-center"><GraduationCap className="mr-1 h-3 w-3" /> {getEducationLabel(data.education)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">住家意向</p>
                <p>{getLiveInLabel(data.isLiveIn)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Professional Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="mr-2 h-5 w-5" /> 专业技能
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                 <h4 className="text-sm font-medium mb-2">工作经验</h4>
                 <p>{getWorkExpLabel(data.workExpLevel)}</p>
              </div>
              
              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">特长技能</h4>
                <div className="flex flex-wrap gap-2">
                  {data.specialties.length > 0 ? (
                    data.specialties.map((item, i) => <Badge key={i} variant="secondary">{item}</Badge>)
                  ) : <span className="text-muted-foreground text-sm">无</span>}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">烹饪技能</h4>
                <div className="flex flex-wrap gap-2">
                  {data.cookingSkills.length > 0 ? (
                    data.cookingSkills.map((item, i) => <Badge key={i} variant="outline">{item}</Badge>)
                  ) : <span className="text-muted-foreground text-sm">无</span>}
                </div>
              </div>

               <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">语言能力</h4>
                <div className="flex flex-wrap gap-2">
                  {data.languages.length > 0 ? (
                    data.languages.map((item, i) => <Badge key={i} variant="outline">{item}</Badge>)
                  ) : <span className="text-muted-foreground text-sm">无</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
             <CardHeader>
               <CardTitle className="flex items-center">
                 <FileText className="mr-2 h-5 w-5" /> 备注信息
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-sm whitespace-pre-wrap">{data.notes || '暂无备注'}</p>
             </CardContent>
          </Card>

          {/* Internal Management (Metadata) */}
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <Star className="mr-2 h-5 w-5 fill-yellow-500 text-yellow-500" /> 内部管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium text-muted-foreground">综合评分</span>
                 <div className="flex items-center gap-1">
                   {Array.from({ length: 5 }).map((_, i) => (
                     <Star 
                       key={i} 
                       className={`h-4 w-4 ${i < (data.metadata?.rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`} 
                     />
                   ))}
                   <span className="ml-2 text-sm font-medium">{data.metadata?.rating || 0} / 5</span>
                 </div>
               </div>
               
               <Separator className="bg-yellow-200" />

               <div className="space-y-2">
                 <span className="text-sm font-medium text-muted-foreground">自定义标签</span>
                 <div className="flex flex-wrap gap-2">
                   {data.metadata?.customTags && data.metadata.customTags.length > 0 ? (
                     data.metadata.customTags.map((tag, i) => (
                       <Badge key={i} variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-100">
                         {tag}
                       </Badge>
                     ))
                   ) : (
                     <span className="text-sm text-muted-foreground">无标签</span>
                   )}
                 </div>
               </div>

               <Separator className="bg-yellow-200" />

               <div className="space-y-2">
                 <span className="text-sm font-medium text-muted-foreground">内部备注</span>
                 <div className="p-3 rounded-md bg-yellow-100/50 text-sm text-yellow-900 border border-yellow-100">
                    {data.metadata?.internalNotes ? (
                      <p className="whitespace-pre-wrap">{data.metadata.internalNotes}</p>
                    ) : (
                      <span className="text-muted-foreground italic">暂无内部备注</span>
                    )}
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'ACTIVE': return 'default';
    case 'PENDING': return 'secondary';
    case 'BLACKLISTED': return 'destructive';
    default: return 'outline';
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待审核',
    ACTIVE: '在职',
    INACTIVE: '离职',
    SUSPENDED: '暂停',
    BLACKLISTED: '黑名单',
  };
  return map[status] || status;
}

function getEducationLabel(val: string | null): string {
  if (!val) return '-';
  const map: Record<string, string> = {
    PRIMARY: '小学',
    JUNIOR_HIGH: '初中',
    SENIOR_HIGH: '高中',
    VOCATIONAL: '中专/职高',
    COLLEGE: '大专',
    BACHELOR: '本科',
  };
  return map[val] || val;
}

function getWorkExpLabel(val: string | null): string {
  if (!val) return '-';
  const map: Record<string, string> = {
    ENTRY: '入门/新手',
    INTERMEDIATE: '中级/熟练',
    SENIOR: '高级/资深',
    EXPERT: '专家/金牌',
  };
  return map[val] || val;
}

function getLiveInLabel(val: string | null): string {
  if (!val) return '-';
  const map: Record<string, string> = {
    LIVE_IN: '住家',
    LIVE_OUT: '不住家',
    BOTH: '皆可',
  };
  return map[val] || val;
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Search, SlidersHorizontal } from 'lucide-react';
import {
  PROVINCES,
  EDUCATION_LEVELS,
  LIVE_IN_STATUS,
} from '@/config/constants';
import { CAREGIVER_OPTIONS } from '@/constants/caregiver-options';

import { MultiSelectLogic } from '@/components/ui/multi-select-logic';

interface FilterRowProps {
  label: string;
  options: string[];
  currentValue: string | null;
  onSelect: (value: string | null) => void;
}

function FilterRow({ label, options, currentValue, onSelect }: FilterRowProps) {
  return (
    <div className="flex flex-col space-y-2 mb-4">
      <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = currentValue === option;
          return (
            <Badge
              key={option}
              variant={isSelected ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/90 px-3 py-1 font-normal transition-colors"
              onClick={() => onSelect(isSelected ? null : option)}
            >
              {option}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

export function ComprehensiveFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for inputs that shouldn't trigger immediately
  const [searchTerm, setSearchTerm] = useState(searchParams.get('query') || '');
  const [minAge, setMinAge] = useState(searchParams.get('minAge') || '');
  const [maxAge, setMaxAge] = useState(searchParams.get('maxAge') || '');
  const [minExp, setMinExp] = useState(searchParams.get('minExperience') || '');
  const [maxExp, setMaxExp] = useState(searchParams.get('maxExperience') || '');

  // Sync local state when URL changes
  useEffect(() => {
    setSearchTerm(searchParams.get('query') || '');
    setMinAge(searchParams.get('minAge') || '');
    setMaxAge(searchParams.get('maxAge') || '');
    setMinExp(searchParams.get('minExperience') || '');
    setMaxExp(searchParams.get('maxExperience') || '');
  }, [searchParams]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSearch = () => updateParam('query', searchTerm);

  const applyRangeFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minAge) params.set('minAge', minAge); else params.delete('minAge');
    if (maxAge) params.set('maxAge', maxAge); else params.delete('maxAge');
    if (minExp) params.set('minExperience', minExp); else params.delete('minExperience');
    if (maxExp) params.set('maxExperience', maxExp); else params.delete('maxExperience');
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => {
    router.replace(pathname);
    setSearchTerm('');
    setMinAge(''); setMaxAge('');
    setMinExp(''); setMaxExp('');
  };

  return (
    <Card className="w-full shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b bg-slate-50/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" /> 高级筛选
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 px-2 text-muted-foreground hover:text-destructive">
            <X className="mr-2 h-4 w-4" /> 重置筛选
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、工号、电话或身份证..."
              className="pl-10 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} className="h-11 px-8">搜索</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
           {/* Left Section: Dimensions (4 cols) */}
           <div className="md:col-span-4 space-y-6 border-r pr-8 border-slate-100">
              <div className="flex flex-col space-y-2">
                <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">籍贯</Label>
                <Select 
                  value={searchParams.get('nativePlace') || 'ALL'} 
                  onValueChange={(val) => updateParam('nativePlace', val === 'ALL' ? null : val)}
                >
                  <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="选择省份" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="ALL">全部地区</SelectItem>
                    {PROVINCES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">年龄范围</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="最小" value={minAge} onChange={(e) => setMinAge(e.target.value)} className="h-10" />
                    <Input type="number" placeholder="最大" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className="h-10" />
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">从业年限</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="最小" value={minExp} onChange={(e) => setMinExp(e.target.value)} className="h-10" />
                    <Input type="number" placeholder="最大" value={maxExp} onChange={(e) => setMaxExp(e.target.value)} className="h-10" />
                  </div>
                </div>
              </div>
              <Button variant="secondary" className="w-full h-9 text-xs" onClick={applyRangeFilters}>应用区间筛选</Button>

              <FilterRow label="性别" options={['女', '男']} currentValue={searchParams.get('gender')} onSelect={(val) => updateParam('gender', val)} />
              <FilterRow label="住家意向" options={LIVE_IN_STATUS} currentValue={searchParams.get('liveInStatus')} onSelect={(val) => updateParam('liveInStatus', val)} />
           </div>

           {/* Right Section: Tag Multi-Selects (8 cols) */}
           <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">工种要求</Label>
                <MultiSelectLogic title="选择工种" options={CAREGIVER_OPTIONS.jobTypes} paramKey="jobTypes" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">特长技能</Label>
                <MultiSelectLogic title="选择特长" options={CAREGIVER_OPTIONS.specialties} paramKey="specialties" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">持有证书</Label>
                <MultiSelectLogic title="选择证书" options={CAREGIVER_OPTIONS.certificates} paramKey="certificates" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">烹饪技巧</Label>
                <MultiSelectLogic title="选择烹饪" options={CAREGIVER_OPTIONS.cookingSkills} paramKey="cookingSkills" />
              </div>

              <div className="sm:col-span-2 pt-4">
                 <FilterRow label="学历" options={EDUCATION_LEVELS} currentValue={searchParams.get('education')} onSelect={(val) => updateParam('education', val)} />
              </div>
           </div>
        </div>

      </CardContent>
    </Card>
  );
}

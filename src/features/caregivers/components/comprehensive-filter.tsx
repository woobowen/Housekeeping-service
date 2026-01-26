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
import { X, Search } from 'lucide-react';
import {
  PROVINCES,
  JOB_TYPES,
  EDUCATION_LEVELS,
  CERTIFICATES,
  LIVE_IN_STATUS,
} from '@/config/constants';

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

  // Sync local state when URL changes (e.g. Back button)
  useEffect(() => {
    const q = searchParams.get('query') || '';
    const min = searchParams.get('minAge') || '';
    const max = searchParams.get('maxAge') || '';

    if (q !== searchTerm) setSearchTerm(q);
    if (min !== minAge) setMinAge(min);
    if (max !== maxAge) setMaxAge(max);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); 

  // Update URL helper
  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset page
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Batch update for Search and Age
  const handleSearch = () => {
    updateParam('query', searchTerm);
  };

  const handleAgeUpdate = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minAge) params.set('minAge', minAge); else params.delete('minAge');
    if (maxAge) params.set('maxAge', maxAge); else params.delete('maxAge');
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => {
    router.replace(pathname);
    setSearchTerm('');
    setMinAge('');
    setMaxAge('');
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">筛选与搜索</CardTitle>
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 px-2 text-muted-foreground">
            <X className="mr-2 h-4 w-4" />
            重置筛选
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、电话或身份证号..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch}>搜索</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Left Column: Dimensions */}
           <div className="space-y-4">
              {/* Native Place (Select) */}
              <div className="flex flex-col space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">籍贯 (省份)</Label>
                <Select 
                  value={searchParams.get('nativePlace') || 'ALL'} 
                  onValueChange={(val) => updateParam('nativePlace', val === 'ALL' ? null : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择省份" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="ALL">全部地区</SelectItem>
                    {PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Age Range */}
              <div className="flex flex-col space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">年龄范围</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    placeholder="最小" 
                    value={minAge} 
                    onChange={(e) => setMinAge(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input 
                    type="number" 
                    placeholder="最大" 
                    value={maxAge} 
                    onChange={(e) => setMaxAge(e.target.value)}
                     className="w-24"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAgeUpdate}>确定</Button>
                </div>
              </div>

              {/* Gender */}
              <FilterRow 
                label="性别" 
                options={['女', '男']} 
                currentValue={searchParams.get('gender')}
                onSelect={(val) => updateParam('gender', val)}
              />
           </div>

           {/* Right Column: Tags */}
           <div className="space-y-4">
              {/* Job Type MultiSelect */}
              <div className="flex flex-col space-y-2 mb-4">
                <Label className="text-sm font-semibold text-muted-foreground">工种 (多选)</Label>
                <MultiSelectLogic 
                  title="工种要求" 
                  options={JOB_TYPES} 
                  paramKey="jobType" 
                />
              </div>

              {/* Certificate MultiSelect */}
              <div className="flex flex-col space-y-2 mb-4">
                <Label className="text-sm font-semibold text-muted-foreground">证书 (多选)</Label>
                <MultiSelectLogic 
                  title="持有证书" 
                  options={CERTIFICATES} 
                  paramKey="certificate" 
                />
              </div>

              <FilterRow 
                label="住家情况" 
                options={LIVE_IN_STATUS} 
                currentValue={searchParams.get('liveInStatus')}
                onSelect={(val) => updateParam('liveInStatus', val)}
              />
              <FilterRow 
                label="学历" 
                options={EDUCATION_LEVELS} 
                currentValue={searchParams.get('education')}
                onSelect={(val) => updateParam('education', val)}
              />
           </div>
        </div>

      </CardContent>
    </Card>
  );
}

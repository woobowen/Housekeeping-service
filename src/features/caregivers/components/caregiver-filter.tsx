'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

export function CaregiverFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Local state for the search input to allow controlled component with debounce
  const [searchTerm, setSearchTerm] = useState(searchParams.get('query')?.toString() || '');

  // Sync local state with URL params if they change externally (e.g. back button)
  useEffect(() => {
    setSearchTerm(searchParams.get('query')?.toString() || '');
  }, [searchParams]);

  // Debounce logic for search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only trigger if the value is different from what's in the URL
      const currentQuery = searchParams.get('query')?.toString() || '';
      
      if (searchTerm !== currentQuery) {
        handleSearch(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); 
  // We exclude searchParams from deps to avoid circular loop, 
  // we only want to trigger when searchTerm changes.

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    params.set('page', '1'); // Reset to page 1
    replace(`${pathname}?${params.toString()}`);
  };

  const handleLevelChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') {
      params.set('level', value);
    } else {
      params.delete('level');
    }
    params.set('page', '1'); // Reset to page 1
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索姓名或手机号..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="w-full sm:w-[180px]">
        <Select
          defaultValue={searchParams.get('level')?.toString()}
          onValueChange={handleLevelChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="筛选等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部等级</SelectItem>
            <SelectItem value="TRAINEE">见习 (TRAINEE)</SelectItem>
            <SelectItem value="JUNIOR">初级 (JUNIOR)</SelectItem>
            <SelectItem value="SENIOR">中级 (SENIOR)</SelectItem>
            <SelectItem value="GOLD">金牌 (GOLD)</SelectItem>
            <SelectItem value="DIAMOND">钻石 (DIAMOND)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

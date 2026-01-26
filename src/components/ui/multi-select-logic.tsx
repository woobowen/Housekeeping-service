'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
  CommandEmpty,
} from '@/components/ui/command';

interface MultiSelectLogicProps {
  title: string;
  options: string[];
  paramKey: string;
  defaultValues?: string[];
  defaultMode?: 'AND' | 'OR';
}

export function MultiSelectLogic({
  title,
  options,
  paramKey,
  defaultValues = [],
  defaultMode = 'OR',
}: MultiSelectLogicProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL or defaults
  const urlValues = searchParams.get(paramKey)?.split(',').filter(Boolean) || defaultValues;
  const urlMode = (searchParams.get(`${paramKey}Mode`) as 'AND' | 'OR') || defaultMode;

  const [selected, setSelected] = React.useState<string[]>(urlValues);
  const [mode, setMode] = React.useState<'AND' | 'OR'>(urlMode);
  const [open, setOpen] = React.useState(false);

  // Sync with URL changes
  React.useEffect(() => {
    const vals = searchParams.get(paramKey)?.split(',').filter(Boolean) || [];
    const m = (searchParams.get(`${paramKey}Mode`) as 'AND' | 'OR') || defaultMode;
    setSelected(vals);
    setMode(m);
  }, [searchParams, paramKey, defaultMode]);

  const toggleOption = (option: string) => {
    setSelected((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const applyChanges = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Handle Values
    if (selected.length > 0) {
      params.set(paramKey, selected.join(','));
      params.set(`${paramKey}Mode`, mode);
    } else {
      params.delete(paramKey);
      params.delete(`${paramKey}Mode`);
    }

    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  const clearSelection = () => {
    setSelected([]);
    setMode('OR');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between bg-background px-3 font-normal"
        >
          <span className="truncate">
            {selected.length > 0 ? `${title} (${selected.length})` : title}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        
        {/* Header: Mode Switch */}
        <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">逻辑关系</span>
            <span className="text-[10px] text-muted-foreground">
              {mode === 'OR' ? '任一 (OR)' : '同时 (AND)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${paramKey}-mode`} className="text-xs font-bold cursor-pointer">
              {mode}
            </Label>
            <Switch
              id={`${paramKey}-mode`}
              checked={mode === 'AND'}
              onCheckedChange={(checked) => setMode(checked ? 'AND' : 'OR')}
              className="scale-75"
            />
          </div>
        </div>

        {/* List: Command Interface */}
        <Command>
          <CommandInput placeholder="搜索..." className="h-9" />
          <CommandList>
            <CommandEmpty>未找到相关选项.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    toggleOption(currentValue);
                  }}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Checkbox 
                    checked={selected.includes(option)}
                    className="pointer-events-none" // Checkbox controlled by item click
                  />
                  <span className="flex-1">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        <Separator />

        {/* Footer: Actions */}
        <div className="flex items-center justify-between p-2 bg-muted/30">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearSelection}
            disabled={selected.length === 0}
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
          >
            清除
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={applyChanges}
            className="h-8 text-xs"
          >
            确定
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
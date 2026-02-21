'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

/**
 * Enhanced Date Picker with Hybrid Input (Manual Type + Calendar Pick)
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "请选择日期",
  className,
  disabled,
  allowClear = true,
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>('');
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // Sync internal input string with external value
  React.useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, 'yyyy年MM月dd日', { locale: zhCN }));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const parseAndNotify = (val: string) => {
    if (!val) {
      onChange?.(undefined);
      return;
    }

    // Try multiple formats
    const formats = [
      'yyyy-MM-dd',
      'yyyyMMdd',
      'yyyy/MM/dd',
      'yyyy年MM月dd日',
      'yyyy.MM.dd',
    ];

    let parsedDate: Date | undefined;

    for (const fmt of formats) {
      const p = parse(val, fmt, new Date());
      if (isValid(p)) {
        parsedDate = p;
        break;
      }
    }

    if (parsedDate) {
      onChange?.(parsedDate);
    } else {
      // If invalid, reset to current value's format
      if (value && isValid(value)) {
        setInputValue(format(value, 'yyyy年MM月dd日', { locale: zhCN }));
      } else {
        setInputValue('');
      }
    }
  };

  const handleBlur = () => {
    parseAndNotify(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      parseAndNotify(inputValue);
    }
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange?.(undefined);
  };

  return (
    <div className={cn("relative flex w-full items-center gap-1", className)}>
      <div className="relative flex-1">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "pr-9 transition-all focus:ring-2",
            !value && "text-muted-foreground"
          )}
        />
        {allowClear && value && (
          <button
            type="button"
            onClick={clearDate}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "px-3 flex-shrink-0 bg-white border-slate-200 hover:bg-slate-50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={(date) => {
              onChange?.(date);
              setIsPopoverOpen(false);
            }}
            locale={zhCN}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

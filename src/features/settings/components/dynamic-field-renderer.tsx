'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export type FieldDefinition = {
  id?: string;
  name: string; // The key (e.g., 'bloodType')
  label: string; // Display Name (e.g., '血型')
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | string;
  options?: string[]; // For SELECT
  required?: boolean;
};

interface DynamicFieldRendererProps {
  fields: FieldDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function DynamicFieldRenderer({ fields, values, onChange }: DynamicFieldRendererProps) {
  if (!fields || fields.length === 0) return null;

  const normalizeType = (type: string) => type.toLowerCase();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => {
        const val = values[field.name];
        const displayVal = val ?? '';
        const type = normalizeType(field.type);

        return (
          <div key={field.id || field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
            
            {type === 'text' && (
              <Input 
                value={displayVal} 
                onChange={(e) => onChange(field.name, e.target.value)} 
                required={field.required}
              />
            )}

            {type === 'number' && (
              <Input 
                type="number" 
                value={displayVal} 
                onChange={(e) => onChange(field.name, e.target.value)} 
                required={field.required}
              />
            )}

            {type === 'date' && (
               <div className="flex gap-2">
                 <Input 
                  placeholder="YYYY-MM-DD"
                  className="flex-1"
                  value={displayVal}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  required={field.required}
                 />
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="px-3">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={displayVal ? parse(displayVal, 'yyyy-MM-dd', new Date()) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            onChange(field.name, format(date, 'yyyy-MM-dd'));
                          }
                        }}
                        locale={zhCN}
                        initialFocus
                      />
                    </PopoverContent>
                 </Popover>
               </div>
            )}

            {type === 'select' && field.options && (
              <Select 
                value={val || undefined} 
                onValueChange={(v) => onChange(field.name, v)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`选择${field.label}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {type === 'boolean' && (
              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  checked={!!val} 
                  onCheckedChange={(checked) => onChange(field.name, checked)} 
                />
                <span className="text-sm text-muted-foreground">{val ? '是' : '否'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Stub for FormControl if not available, though ideally it should be imported from @/components/ui/form
function FormControl({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
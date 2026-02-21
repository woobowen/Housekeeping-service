'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { importCaregivers, type ImportError } from '@/features/caregivers/import-actions';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CaregiverImportDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message?: string; errors?: ImportError[] } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    // Reset previous result
    setResult(null);

    startTransition(async () => {
      const state = await importCaregivers(null, formData);
      setResult(state);
      
      if (state.success) {
        toast.success(state.message);
        // Don't close immediately so they can see warnings if any
        if (!state.errors || state.errors.length === 0) {
           setTimeout(() => setOpen(false), 1500);
        }
      } else {
        toast.error(state.message);
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setResult(null); // Clear result when closing
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          批量导入
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>批量导入护理员</DialogTitle>
          <DialogDescription>
            请上传符合格式的 Excel 文件 (.xlsx, .xls)。
            <br />
            必需字段: 姓名, 手机, 身份证
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">Excel 文件</Label>
            <div className="flex items-center gap-2">
                <Input 
                    id="file" 
                    name="file" 
                    type="file" 
                    accept=".xlsx, .xls" 
                    required 
                    disabled={isPending}
                />
            </div>
          </div>
          
          {/* Result Feedback Area */}
          {result && (
            <div className="space-y-2">
                <div className={cn(
                    "p-3 rounded-md border flex items-start gap-3",
                    result.success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
                )}>
                    {result.success ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
                    <div>
                        <p className="font-semibold text-sm">{result.success ? "导入完成" : "导入失败"}</p>
                        <p className="text-xs opacity-90">{result.message}</p>
                    </div>
                </div>

                {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 max-h-[200px] overflow-y-auto rounded-md border bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">
                        <p className="font-semibold mb-2 flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            导入详细记录 ({result.errors.length} 条异常):
                        </p>
                        <div className="space-y-1.5">
                            {result.errors.map((err, idx) => (
                                <div key={idx} className="border-b border-slate-200 pb-1 last:border-0">
                                    <span className="font-medium text-slate-800">第 {err.row} 行</span>
                                    {err.name !== '未知' && <span className="mx-1">[{err.name}]</span>}
                                    <span className="text-red-500 ml-1">: {err.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? '导入中...' : '开始导入'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

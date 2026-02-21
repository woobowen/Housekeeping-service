'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addTimelineItem } from '@/features/caregivers/timeline-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Define the shape locally
export interface TimelineItem {
  idString: string;
  content: string;
  imageUrls: string[];
  createdAt: Date | string; // Handle both Date objects and ISO strings
}

interface TimelineSectionProps {
  caregiverId: string;
  initialItems: TimelineItem[];
}

const initialState = {
  success: false,
  message: '',
};

export function TimelineSection({ caregiverId, initialItems }: TimelineSectionProps) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(addTimelineItem, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success('动态已发布');
      formRef.current?.reset();
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>最近工作状态</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={action} className="space-y-4">
            <input type="hidden" name="caregiverId" value={caregiverId} />
            
            <Textarea 
              name="content"
              placeholder="记录阿姨的最近工作表现、客户反馈等..." 
              required
              disabled={isPending}
            />
            
            <div className="flex gap-2 items-center">
              <Input 
                type="file"
                name="images"
                multiple
                accept="image/*"
                disabled={isPending}
                className="flex-1"
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? '发布中...' : '发布动态'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-0">
        {initialItems.map((item) => (
          <div key={item.idString} className="flex gap-4 border-l-2 border-gray-200 pl-6 pb-8 last:pb-0 relative">
             <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200 border-2 border-white" />
             <div className="flex-1 space-y-2 -mt-1">
               <div className="text-sm text-muted-foreground">
                 {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
               </div>
               <p className="whitespace-pre-wrap text-sm">{item.content}</p>
               {item.imageUrls.length > 0 && (
                 <div className="flex gap-2 mt-2 flex-wrap">
                   {item.imageUrls.map((url, idx) => (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img key={idx} src={url} alt="动态图片" className="w-24 h-24 object-cover rounded-md border" />
                   ))}
                 </div>
               )}
             </div>
          </div>
        ))}
        {initialItems.length === 0 && (
          <p className="text-muted-foreground text-center py-4">暂无动态</p>
        )}
      </div>
    </div>
  );
}
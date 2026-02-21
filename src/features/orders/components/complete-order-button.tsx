'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { completeOrder } from '../actions';
import { toast } from 'sonner';

interface CompleteOrderButtonProps {
  orderId: string;
  orderNo: string;
}

export function CompleteOrderButton({ orderId, orderNo }: CompleteOrderButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleComplete = () => {
    startTransition(async () => {
      const result = await completeOrder(orderId);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50">
          <CheckCircle2 className="h-4 w-4" />
          <span className="sr-only">结束订单</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认结束订单？</AlertDialogTitle>
          <AlertDialogDescription>
            确认结束订单 {orderNo} 吗？
            <br />
            操作后，订单状态将变更为“已完成”，且家政员状态将释放为“空闲”。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>取消</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleComplete();
            }}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认结束
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

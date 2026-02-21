'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CreateOrderModal } from './create-order-modal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

function OrderActionHandlerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  
  const action = searchParams.get('action');
  const caregiverId = searchParams.get('caregiverId');
  const caregiverName = searchParams.get('caregiverName');
  const caregiverPhone = searchParams.get('caregiverPhone');

  useEffect(() => {
    if (action === 'new') {
      setOpen(true);
    }
  }, [action]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && action === 'new') {
      // Clear URL params when closing
      router.replace(pathname);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新建订单
      </Button>
      <CreateOrderModal 
        open={open} 
        onOpenChange={handleOpenChange} 
        initialData={{
            caregiverId: caregiverId || '',
            caregiverName: caregiverName || caregiverId || '',
            caregiverPhone: caregiverPhone || '',
        }}
      />
    </>
  );
}

export function OrderActionHandler() {
    return (
        <Suspense fallback={<Button disabled><Plus className="mr-2 h-4 w-4" />新建订单</Button>}>
            <OrderActionHandlerContent />
        </Suspense>
    );
}

'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CreateOrderModal } from './create-order-modal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { CaregiverOption } from '@/features/caregivers/actions';
import type { OrderFormDefaultValues } from './order-form';

interface OrderActionHandlerProps {
  caregiverOptions: CaregiverOption[];
}

function OrderActionHandlerContent({ caregiverOptions }: OrderActionHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  
  const action = searchParams.get('action');
  const caregiverId = searchParams.get('caregiverId');
  const caregiverName = searchParams.get('caregiverName');
  const caregiverPhone = searchParams.get('caregiverPhone');

  const forceOpenFromUrl: boolean = action === 'new';
  const initialData: Partial<OrderFormDefaultValues> = useMemo(() => ({
    caregiverId: caregiverId || '',
    caregiverName: caregiverName || caregiverId || '',
    caregiverPhone: caregiverPhone || '',
  }), [caregiverId, caregiverName, caregiverPhone]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && forceOpenFromUrl) {
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
        open={open || forceOpenFromUrl} 
        onOpenChange={handleOpenChange} 
        caregiverOptions={caregiverOptions}
        initialData={initialData}
      />
    </>
  );
}

export function OrderActionHandler({ caregiverOptions }: OrderActionHandlerProps) {
    return (
        <Suspense fallback={<Button disabled><Plus className="mr-2 h-4 w-4" />新建订单</Button>}>
            <OrderActionHandlerContent caregiverOptions={caregiverOptions} />
        </Suspense>
    );
}

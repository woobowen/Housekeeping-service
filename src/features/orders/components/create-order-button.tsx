'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateOrderModal } from './create-order-modal';
import type { CaregiverOption } from '@/features/caregivers/actions';

interface CreateOrderButtonProps {
  caregiverOptions: CaregiverOption[];
}

export function CreateOrderButton({ caregiverOptions }: CreateOrderButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新建订单
      </Button>
      <CreateOrderModal open={open} onOpenChange={setOpen} caregiverOptions={caregiverOptions} />
    </>
  );
}

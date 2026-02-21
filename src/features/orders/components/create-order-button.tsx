'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateOrderModal } from './create-order-modal';

export function CreateOrderButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新建订单
      </Button>
      <CreateOrderModal open={open} onOpenChange={setOpen} />
    </>
  );
}

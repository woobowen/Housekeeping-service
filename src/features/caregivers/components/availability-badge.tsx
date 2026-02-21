import { Badge } from '@/components/ui/badge';

interface AvailabilityBadgeProps {
  status: string;
}

export function AvailabilityBadge({ status }: AvailabilityBadgeProps) {
  // Logic: If status is explicitly 'BUSY', show Busy badge.
  // Otherwise, assume they are available (Idle).
  // Note: This overrides the previous employment status display (Active/Pending) 
  // with a pure availability view as requested.
  
  const isBusy = status === 'BUSY';

  if (isBusy) {
    return (
      <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 border-red-600">
        服务中
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="bg-green-500 hover:bg-green-600 border-green-600">
      空闲
    </Badge>
  );
}

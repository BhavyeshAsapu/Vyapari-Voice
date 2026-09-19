import { cn, statusLabel, statusColor } from '@/utils';
import type { StockStatus } from '@/types';

interface StatusBadgeProps {
  status: StockStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('badge', statusColor(status), className)}>
      {status === 'out' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" aria-hidden />
      )}
      {status === 'low' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" aria-hidden />
      )}
      {status === 'healthy' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" aria-hidden />
      )}
      {(status === 'over_capacity' || status === 'at_capacity' || status === 'near_capacity') && (
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" aria-hidden />
      )}
      {statusLabel(status)}
    </span>
  );
}

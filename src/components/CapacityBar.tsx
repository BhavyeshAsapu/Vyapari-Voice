import { cn, capacityBarColor } from '@/utils';
import type { StockStatus } from '@/types';

interface CapacityBarProps {
  current: number;
  capacity: number;
  unit: string;
  status: StockStatus;
  className?: string;
  showLabel?: boolean;
}

export default function CapacityBar({
  current,
  capacity,
  unit,
  status,
  className,
  showLabel = true,
}: CapacityBarProps) {
  const pct = Math.min(Math.round((current / capacity) * 100), 100);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[--color-text-secondary] font-medium">
            {current} / {capacity} {unit}
          </span>
          <span className="text-xs font-semibold text-[--color-text-secondary]">{pct}%</span>
        </div>
      )}
      <div
        className="w-full h-2 rounded-full bg-gray-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Storage: ${pct}%`}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', capacityBarColor(status))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

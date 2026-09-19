import type { FastSellingItem } from '@/types';
import { motion } from 'framer-motion';

interface FastSellingCardProps {
  items: FastSellingItem[];
  period: 'today' | '7days' | '30days';
  onPeriodChange: (p: 'today' | '7days' | '30days') => void;
  loading?: boolean;
}

const periods = [
  { key: 'today' as const, label: 'Today' },
  { key: '7days' as const, label: '7 Days' },
  { key: '30days' as const, label: '30 Days' },
];

export default function FastSellingCard({
  items,
  period,
  onPeriodChange,
  loading,
}: FastSellingCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-[--color-text]">Fast Selling</h2>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => onPeriodChange(p.key)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                period === p.key
                  ? 'bg-orange-500 text-white'
                  : 'text-[--color-text-secondary] hover:bg-gray-100'
              }`}
              aria-pressed={period === p.key}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[--color-text-secondary] mb-3">
        Based on actual stock-out transactions
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-1">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-200 rounded w-12" />
              </div>
              <div className="h-2 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.productId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[--color-text]">{item.productName}</span>
                <span className="text-sm font-bold text-[--color-text]">
                  {item.totalOut} {item.unit}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-orange-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

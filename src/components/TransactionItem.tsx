import { motion } from 'framer-motion';
import { formatTime, relativeDay } from '@/utils';
import type { Transaction } from '@/types';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const isIn = transaction.type === 'stock_in';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-3 border-b border-[--color-border] last:border-0"
    >
      {/* Direction Icon */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          isIn ? 'bg-green-50' : 'bg-red-50'
        }`}
        aria-hidden
      >
        {isIn ? (
          <ArrowDownLeft size={18} className="text-green-600" />
        ) : (
          <ArrowUpRight size={18} className="text-red-500" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-[--color-text] truncate">
            {transaction.productName}
          </span>
          <span
            className={`font-bold text-sm ${isIn ? 'text-green-600' : 'text-red-500'}`}
            aria-label={`${isIn ? 'Added' : 'Removed'} ${transaction.quantity} ${transaction.unit}`}
          >
            {isIn ? '+' : '-'}{transaction.quantity} {transaction.unit}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[--color-text-secondary]">
            {relativeDay(transaction.timestamp)} · {formatTime(transaction.timestamp)}
          </span>
          {transaction.source === 'voice' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium border border-orange-100">
              Voice
            </span>
          )}
        </div>
        {transaction.note && (
          <p className="text-xs text-[--color-text-secondary] italic mt-0.5 truncate">
            "{transaction.note}"
          </p>
        )}
      </div>
    </motion.div>
  );
}

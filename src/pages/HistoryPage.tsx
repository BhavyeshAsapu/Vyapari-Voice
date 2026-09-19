import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { getTransactions } from '@/services/api';
import type { Transaction, TransactionType } from '@/types';
import TransactionItem from '@/components/TransactionItem';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import PageHeader from '@/components/PageHeader';
import { isToday, isYesterday, isThisWeek, relativeDay } from '@/utils';

type DateFilter = 'today' | 'yesterday' | 'week' | 'custom';
type TypeFilter = 'all' | TransactionType;

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
];

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'stock_in', label: 'Stock In' },
  { key: 'stock_out', label: 'Stock Out' },
];

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [undoToast, setUndoToast] = useState(false);

  useEffect(() => {
    getTransactions().then((tx) => {
      setTransactions(tx);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchDate =
        dateFilter === 'today' ? isToday(t.timestamp) :
        dateFilter === 'yesterday' ? isYesterday(t.timestamp) :
        dateFilter === 'week' ? isThisWeek(t.timestamp) : true;
      const matchType =
        typeFilter === 'all' ||
        t.type === typeFilter;
      return matchDate && matchType;
    });
  }, [transactions, dateFilter, typeFilter]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach((t) => {
      const day = relativeDay(t.timestamp);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(t);
    });
    return map;
  }, [filtered]);

  const handleUndo = () => {
    setUndoToast(true);
    setTimeout(() => setUndoToast(false), 3000);
  };

  const totalIn = filtered.filter((t) => t.type === 'stock_in').reduce((a, t) => a + t.quantity, 0);
  const totalOut = filtered.filter((t) => t.type === 'stock_out').reduce((a, t) => a + t.quantity, 0);

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <PageHeader
        title="History"
        subtitle={`${filtered.length} transactions`}
        rightAction={
          <button
            onClick={handleUndo}
            className="btn btn-secondary btn-sm"
            aria-label="Undo last transaction"
            id="undo-last-btn"
          >
            <RotateCcw size={14} />
            Undo Last
          </button>
        }
      />

      <div className="page-container pt-4 space-y-3">
        {/* Date filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`chip flex-shrink-0 ${dateFilter === f.key ? 'active' : ''}`}
              aria-pressed={dateFilter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`chip ${typeFilter === f.key ? 'active' : ''}`}
              aria-pressed={typeFilter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary bar */}
        {filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-center">
              <p className="text-sm font-bold text-green-700">+{totalIn} units</p>
              <p className="text-xs text-green-600">Stock In</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100 text-center">
              <p className="text-sm font-bold text-red-600">-{totalOut} units</p>
              <p className="text-xs text-red-500">Stock Out</p>
            </div>
          </motion.div>
        )}

        {/* Transactions */}
        {loading ? (
          <LoadingState rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="No stock movements match the selected filters."
          />
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([day, txs]) => (
              <div key={day}>
                <h2 className="text-xs font-bold text-[--color-text-secondary] uppercase tracking-wider mb-2">
                  {day}
                </h2>
                <div className="card divide-y divide-[--color-border]">
                  {txs.map((tx) => (
                    <div key={tx.id} className="px-4">
                      <TransactionItem transaction={tx} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Undo toast */}
      {undoToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[--color-text] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50"
          role="status"
          aria-live="polite"
        >
          Last transaction undone
        </motion.div>
      )}
    </div>
  );
}

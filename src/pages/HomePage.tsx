import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@/data/mockData';
import { getTodayTransactions, getInventory, getFastSelling } from '@/services/api';
import type { Transaction, FastSellingItem } from '@/types';
import VoicePanel from '@/components/VoicePanel';
import FastSellingCard from '@/components/FastSellingCard';
import { formatTime, getStockStatus } from '@/utils';
import { PRODUCTS } from '@/data/mockData';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const navigate = useNavigate();
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [fastSelling, setFastSelling] = useState<FastSellingItem[]>([]);
  const [fsPeriod, setFsPeriod] = useState<'today' | '7days' | '30days'>('7days');
  const [fsLoading, setFsLoading] = useState(false);

  const products = PRODUCTS;
  const lowStockCount = products.filter((p) => getStockStatus(p) === 'low').length;
  const outOfStockCount = products.filter((p) => getStockStatus(p) === 'out').length;

  // Today stock counts
  const todayIn = recentTx.filter((t) => t.type === 'stock_in').reduce((a, t) => a + t.quantity, 0);
  const todayOut = recentTx.filter((t) => t.type === 'stock_out').reduce((a, t) => a + t.quantity, 0);

  useEffect(() => {
    getTodayTransactions().then(setRecentTx);
    getFastSelling('7days').then(setFastSelling);
  }, []);

  const handleFsPeriodChange = async (p: 'today' | '7days' | '30days') => {
    setFsPeriod(p);
    setFsLoading(true);
    const data = await getFastSelling(p);
    setFastSelling(data);
    setFsLoading(false);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[--color-bg]/95 backdrop-blur-sm pt-4 pb-3 -mx-4 px-4 border-b border-[--color-border] mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[--color-text-secondary] font-medium">
              {getGreeting()}, {DEFAULT_SETTINGS.ownerName} 👋
            </p>
            <h1 className="text-xl font-bold text-[--color-text]">{DEFAULT_SETTINGS.shopName}</h1>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="relative w-10 h-10 rounded-xl bg-white border border-[--color-border] flex items-center justify-center shadow-sm"
            aria-label="View alerts"
          >
            <Bell size={20} className="text-[--color-text-secondary]" />
            {(lowStockCount + outOfStockCount) > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] min-h-[18px] px-1">
                {lowStockCount + outOfStockCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Voice Panel */}
      <section aria-label="Voice interaction">
        <VoicePanel onStockUpdated={() => getTodayTransactions().then(setRecentTx)} />
      </section>

      {/* Quick Stats */}
      <section aria-label="Quick statistics" className="mt-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Products', value: products.length, color: 'text-[--color-text]', bg: 'bg-white' },
            {
              label: 'Low Stock',
              value: lowStockCount,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              onClick: () => navigate('/alerts'),
            },
            {
              label: 'Out of Stock',
              value: outOfStockCount,
              color: 'text-red-600',
              bg: 'bg-red-50',
              onClick: () => navigate('/alerts'),
            },
          ].map((stat) => (
            <motion.button
              key={stat.label}
              whileTap={{ scale: 0.96 }}
              onClick={stat.onClick}
              disabled={!stat.onClick}
              className={`${stat.bg} border border-[--color-border] rounded-2xl p-3 text-center shadow-sm cursor-${stat.onClick ? 'pointer' : 'default'}`}
              aria-label={`${stat.value} ${stat.label}`}
            >
              <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-[--color-text-secondary] font-medium mt-0.5">{stat.label}</p>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Today's Activity */}
      <section aria-label="Today's activity" className="mt-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[--color-text]">Today's Activity</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-sm text-orange-500 font-medium flex items-center gap-1"
              aria-label="View full history"
            >
              See all <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownLeft size={16} className="text-green-600" />
                <span className="text-xs font-semibold text-green-700">Stock In</span>
              </div>
              <p className="text-2xl font-extrabold text-green-700">{todayIn}</p>
              <p className="text-xs text-green-600 font-medium">units added</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight size={16} className="text-red-500" />
                <span className="text-xs font-semibold text-red-600">Stock Out</span>
              </div>
              <p className="text-2xl font-extrabold text-red-600">{todayOut}</p>
              <p className="text-xs text-red-500 font-medium">units removed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      {recentTx.length > 0 && (
        <section aria-label="Recent activity" className="mt-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[--color-text]">Recent Activity</h2>
              <button
                onClick={() => navigate('/history')}
                className="text-sm text-orange-500 font-medium flex items-center gap-1"
              >
                See all <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {recentTx.slice(0, 5).map((tx) => {
                const isIn = tx.type === 'stock_in';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isIn ? 'bg-green-50' : 'bg-red-50'}`}>
                        {isIn ? (
                          <ArrowDownLeft size={14} className="text-green-600" />
                        ) : (
                          <ArrowUpRight size={14} className="text-red-500" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-[--color-text]">{tx.productName}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                        {isIn ? '+' : '-'}{tx.quantity} {tx.unit}
                      </span>
                      <p className="text-xs text-[--color-text-secondary]">{formatTime(tx.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Fast Selling */}
      <section aria-label="Fast selling products" className="mt-4">
        <FastSellingCard
          items={fastSelling}
          period={fsPeriod}
          onPeriodChange={handleFsPeriodChange}
          loading={fsLoading}
        />
      </section>
    </div>
  );
}

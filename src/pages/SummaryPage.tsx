import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, ArrowDownLeft, ArrowUpRight, PackageX, AlertTriangle,
  Info, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getDailySummary, getFastSelling, getDailyInventorySummary } from '@/services/api';
import type { DailySummary, FastSellingItem, DailyInventorySummary, DailyProductSummary } from '@/types';
import FastSellingCard from '@/components/FastSellingCard';
import LoadingState from '@/components/LoadingState';
import PageHeader from '@/components/PageHeader';
import { formatCurrency, formatDate, getCategoryEmoji } from '@/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sub?: string;
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, sub }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={iconColor} />
        </div>
        <div>
          <p className="text-xl font-extrabold text-[--color-text]">{value}</p>
          <p className="text-xs text-[--color-text-secondary] font-medium">{label}</p>
          {sub && <p className="text-xs text-[--color-text-secondary]">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function ProductSummaryRow({ item }: { item: DailyProductSummary }) {
  const netChange = item.stockIn - item.stockOut;
  return (
    <div className="border border-[--color-border] rounded-xl p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base" aria-hidden>📦</span>
        <p className="font-bold text-[--color-text]">{item.productName}</p>
        {item.hadActivity && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
            Updated
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-[--color-text-secondary]">Opening</span>
          <span className="font-semibold text-[--color-text]">{item.openingStock} {item.unit}</span>
        </div>
        {item.stockIn > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-[--color-text-secondary]">Stock In</span>
            <span className="font-semibold text-green-600">+{item.stockIn} {item.unit}</span>
          </div>
        )}
        {item.stockOut > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-[--color-text-secondary]">Stock Out</span>
            <span className="font-semibold text-red-500">-{item.stockOut} {item.unit}</span>
          </div>
        )}
        <div className="border-t border-[--color-border] pt-1.5 flex justify-between items-center">
          <span className="text-sm font-bold text-[--color-text]">Closing</span>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[--color-text]">{item.closingStock} {item.unit}</span>
            {netChange !== 0 && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                netChange > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
              }`}>
                {netChange > 0 ? '+' : ''}{netChange}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function SummaryPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [fastSelling, setFastSelling] = useState<FastSellingItem[]>([]);
  const [fsPeriod, setFsPeriod] = useState<'today' | '7days' | '30days'>('7days');
  const [fsLoading, setFsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Daily Inventory Summary state
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [dailySummary, setDailySummary] = useState<DailyInventorySummary | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  useEffect(() => {
    Promise.all([getDailySummary(), getFastSelling('7days'), getDailyInventorySummary()]).then(([s, fs, ds]) => {
      setSummary(s);
      setFastSelling(fs);
      setDailySummary(ds);
      setLoading(false);
    });
  }, []);

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setDailyLoading(true);
    try {
      const ds = await getDailyInventorySummary(date);
      setDailySummary(ds);
    } finally {
      setDailyLoading(false);
    }
  };

  const handleFsPeriodChange = async (p: 'today' | '7days' | '30days') => {
    setFsPeriod(p);
    setFsLoading(true);
    const data = await getFastSelling(p);
    setFastSelling(data);
    setFsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <PageHeader
        title="Daily Summary"
        subtitle={summary ? formatDate(summary.date) : 'Today'}
      />

      <div className="page-container pt-4 space-y-4">
        {loading || !summary ? (
          <LoadingState rows={4} />
        ) : (
          <>
            {/* Stock activity */}
            <section aria-label="Today's stock activity">
              <h2 className="font-bold text-[--color-text] mb-3">Today's Activity</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <StatCard
                  label="Stock In"
                  value={summary.totalStockIn}
                  sub="units added"
                  icon={ArrowDownLeft}
                  iconBg="bg-green-50"
                  iconColor="text-green-600"
                />
                <StatCard
                  label="Stock Out"
                  value={summary.totalStockOut}
                  sub="units removed"
                  icon={ArrowUpRight}
                  iconBg="bg-red-50"
                  iconColor="text-red-500"
                />
                <StatCard
                  label="Products Updated"
                  value={summary.productsUpdated}
                  icon={TrendingUp}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-500"
                />
                <StatCard
                  label="Low Stock"
                  value={summary.lowStockCount}
                  icon={AlertTriangle}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-500"
                />
              </div>
              {summary.outOfStockCount > 0 && (
                <StatCard
                  label="Out of Stock"
                  value={summary.outOfStockCount}
                  sub="needs restocking"
                  icon={PackageX}
                  iconBg="bg-red-50"
                  iconColor="text-red-500"
                />
              )}
            </section>

            {/* ── Daily Inventory Summary ──────────────────────────────────── */}
            <section aria-label="Daily inventory summary">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-orange-500" />
                <h2 className="font-bold text-[--color-text]">Daily Inventory Summary</h2>
              </div>

              {/* Date selector */}
              <div className="flex gap-2 mb-4">
                {[
                  { label: 'Today', value: todayISO() },
                  { label: 'Yesterday', value: yesterdayISO() },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleDateChange(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                      selectedDate === opt.value
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-[--color-text-secondary] border-[--color-border] hover:border-orange-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <input
                  type="date"
                  value={selectedDate}
                  max={todayISO()}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="ml-auto text-sm border border-[--color-border] rounded-xl px-2 py-1.5 bg-white text-[--color-text] focus:outline-none focus:border-orange-400"
                  aria-label="Select date"
                  id="inventory-summary-date"
                />
              </div>

              {dailyLoading ? (
                <LoadingState rows={2} />
              ) : !dailySummary || dailySummary.products.length === 0 ? (
                <div className="card p-6 text-center">
                  <p className="text-[--color-text-secondary] text-sm">
                    No inventory activity on{' '}
                    <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedDate}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {/* Totals bar */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="card p-3 text-center">
                        <p className="text-lg font-extrabold text-green-600">
                          {dailySummary.totals.stockInTransactions}
                        </p>
                        <p className="text-xs text-[--color-text-secondary]">Stock In</p>
                      </div>
                      <div className="card p-3 text-center">
                        <p className="text-lg font-extrabold text-red-500">
                          {dailySummary.totals.stockOutTransactions}
                        </p>
                        <p className="text-xs text-[--color-text-secondary]">Stock Out</p>
                      </div>
                      <div className="card p-3 text-center">
                        <p className={`text-lg font-extrabold ${dailySummary.totals.netChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {dailySummary.totals.netChange >= 0 ? '+' : ''}{dailySummary.totals.netChange}
                        </p>
                        <p className="text-xs text-[--color-text-secondary]">Net Change</p>
                      </div>
                    </div>

                    {/* Per-product cards */}
                    {dailySummary.products.map((item) => (
                      <ProductSummaryRow key={item.productId} item={item} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </section>

            {/* Financial summary */}
            <section aria-label="Inventory value" className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[--color-text]">Inventory Value</h2>
                <div className="group relative">
                  <Info size={14} className="text-[--color-text-secondary] cursor-help" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-[--color-border]">
                  <span className="text-sm text-[--color-text-secondary]">Total Inventory Value</span>
                  <span className="font-bold text-[--color-text]">{formatCurrency(summary.inventoryValue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[--color-border]">
                  <span className="text-sm text-[--color-text-secondary]">Estimated Sales Value</span>
                  <span className="font-bold text-green-600">{formatCurrency(summary.salesValue)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div>
                    <span className="text-sm text-[--color-text-secondary]">Estimated Gross Profit</span>
                    <p className="text-xs text-orange-500 mt-0.5">⚠️ Estimate only — not actual profit</p>
                  </div>
                  <span className="font-extrabold text-green-600">{formatCurrency(summary.estimatedGrossProfit)}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> Financial figures are estimates based on purchase and selling prices. Connect to backend for accurate calculations.
                </p>
              </div>
            </section>

            {/* Fast Selling */}
            <FastSellingCard
              items={fastSelling}
              period={fsPeriod}
              onPeriodChange={handleFsPeriodChange}
              loading={fsLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

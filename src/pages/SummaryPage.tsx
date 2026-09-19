import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, PackageX, AlertTriangle, Info } from 'lucide-react';
import { getDailySummary, getFastSelling } from '@/services/api';
import type { DailySummary, FastSellingItem } from '@/types';
import FastSellingCard from '@/components/FastSellingCard';
import LoadingState from '@/components/LoadingState';
import PageHeader from '@/components/PageHeader';
import { formatCurrency, formatDate } from '@/utils';

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

export default function SummaryPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [fastSelling, setFastSelling] = useState<FastSellingItem[]>([]);
  const [fsPeriod, setFsPeriod] = useState<'today' | '7days' | '30days'>('7days');
  const [fsLoading, setFsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDailySummary(), getFastSelling('7days')]).then(([s, fs]) => {
      setSummary(s);
      setFastSelling(fs);
      setLoading(false);
    });
  }, []);

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
                  <strong>Note:</strong> Financial figures are estimates based on purchase and selling prices in demo data. Connect to backend for accurate calculations.
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

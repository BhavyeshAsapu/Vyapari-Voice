import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { getAlerts } from '@/services/api';
import type { Alert, AlertType } from '@/types';
import AlertCard from '@/components/AlertCard';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import PageHeader from '@/components/PageHeader';

type SectionKey = 'critical' | AlertType;

const SECTIONS: { key: SectionKey; label: string; emoji: string }[] = [
  { key: 'critical', label: 'Critical', emoji: '🚨' },
  { key: 'low_stock', label: 'Low Stock', emoji: '⚠️' },
  { key: 'over_capacity', label: 'Over Capacity', emoji: '📦' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlerts().then((a) => {
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  const critical = alerts.filter((a) => a.severity === 'critical');
  const lowStock = alerts.filter((a) => a.type === 'low_stock');
  const capacityAlerts = alerts.filter(
    (a) => a.type === 'over_capacity' || a.type === 'near_capacity'
  );

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <PageHeader
        title="Alerts"
        subtitle={alerts.length > 0 ? `${alerts.length} active alerts` : 'All good!'}
      />

      <div className="page-container pt-4 space-y-6">
        {loading ? (
          <LoadingState rows={3} />
        ) : alerts.length === 0 ? (
          <EmptyState
            title="No alerts right now"
            description="Your inventory is healthy. We'll notify you when something needs attention."
            icon={<Bell size={28} className="text-green-500" />}
          />
        ) : (
          <>
            {/* Critical */}
            {critical.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                aria-label="Critical alerts"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg" aria-hidden>🚨</span>
                  <h2 className="font-bold text-red-600">Critical</h2>
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">
                    {critical.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {critical.map((a) => (
                    <AlertCard key={a.id} alert={a} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Low Stock */}
            {lowStock.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                aria-label="Low stock alerts"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg" aria-hidden>⚠️</span>
                  <h2 className="font-bold text-amber-700">Low Stock</h2>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">
                    {lowStock.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {lowStock.map((a) => (
                    <AlertCard key={a.id} alert={a} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Capacity */}
            {capacityAlerts.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                aria-label="Capacity alerts"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg" aria-hidden>📦</span>
                  <h2 className="font-bold text-orange-700">Capacity</h2>
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold">
                    {capacityAlerts.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {capacityAlerts.map((a) => (
                    <AlertCard key={a.id} alert={a} />
                  ))}
                </div>
              </motion.section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

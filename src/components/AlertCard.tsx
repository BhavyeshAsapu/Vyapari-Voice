import { motion } from 'framer-motion';
import { AlertTriangle, PackageX, Archive, ChevronRight } from 'lucide-react';
import type { Alert } from '@/types';
import { useNavigate } from 'react-router-dom';

interface AlertCardProps {
  alert: Alert;
}

function alertConfig(type: Alert['type']) {
  switch (type) {
    case 'out_of_stock':
      return {
        icon: PackageX,
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconColor: 'text-red-500',
        label: 'Out of Stock',
        labelColor: 'text-red-600 bg-red-100',
      };
    case 'low_stock':
      return {
        icon: AlertTriangle,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconColor: 'text-amber-500',
        label: 'Low Stock',
        labelColor: 'text-amber-700 bg-amber-100',
      };
    case 'over_capacity':
      return {
        icon: Archive,
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        iconColor: 'text-orange-500',
        label: 'Over Capacity',
        labelColor: 'text-orange-700 bg-orange-100',
      };
    case 'near_capacity':
      return {
        icon: Archive,
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        iconColor: 'text-orange-400',
        label: 'Near Capacity',
        labelColor: 'text-orange-600 bg-orange-50',
      };
  }
}

export default function AlertCard({ alert }: AlertCardProps) {
  const navigate = useNavigate();
  const config = alertConfig(alert.type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card border ${config.border} ${config.bg} p-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
          <Icon size={18} className={config.iconColor} aria-hidden />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.labelColor}`}>
              {config.label}
            </span>
          </div>
          <h3 className="font-bold text-[--color-text]">{alert.productName}</h3>
          <p className="text-sm text-[--color-text-secondary] mt-0.5">
            {alert.type === 'out_of_stock' && `0 ${alert.unit} — Needs immediate restocking`}
            {alert.type === 'low_stock' && `${alert.currentStock} ${alert.unit} remaining · Reorder at ${alert.threshold} ${alert.unit}`}
            {(alert.type === 'over_capacity' || alert.type === 'near_capacity') &&
              `${alert.currentStock} / ${alert.capacity} ${alert.unit}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => navigate(`/stock/${alert.productId}`)}
          className="btn btn-secondary btn-sm flex-1"
          aria-label={`View ${alert.productName}`}
        >
          View Product
          <ChevronRight size={14} />
        </button>
        {(alert.type === 'out_of_stock' || alert.type === 'low_stock') && (
          <button
            className="btn btn-primary btn-sm flex-1"
            aria-label={`Reorder ${alert.productName}`}
          >
            Reorder
          </button>
        )}
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { getCategoryEmoji, getStockStatus, getCapacityInfo } from '@/utils';
import type { Product } from '@/types';
import StatusBadge from './StatusBadge';
import CapacityBar from './CapacityBar';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const status = getStockStatus(product);
  const capacityInfo = getCapacityInfo(product);
  const emoji = getCategoryEmoji(product.category);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      onClick={() => navigate(`/stock/${product.id}`)}
      className="card w-full text-left p-4 cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      aria-label={`${product.name}, ${product.currentStock} ${product.unit}, ${status}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[--color-bg] flex items-center justify-center text-2xl">
          {emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div>
              <h3 className="font-semibold text-[--color-text] text-sm leading-tight">{product.name}</h3>
              {product.brand && (
                <p className="text-xs text-[--color-text-secondary] mt-0.5">{product.brand}</p>
              )}
            </div>
            <StatusBadge status={status} />
          </div>

          <p className="text-lg font-bold text-[--color-text] mt-1">
            {product.currentStock}{' '}
            <span className="text-sm font-medium text-[--color-text-secondary]">{product.unit}</span>
          </p>

          {capacityInfo && (
            <div className="mt-2">
              <CapacityBar
                current={capacityInfo.current}
                capacity={capacityInfo.capacity}
                unit={product.unit}
                status={status}
                showLabel={false}
              />
              <p className="text-xs text-[--color-text-secondary] mt-1">
                {capacityInfo.current} / {capacityInfo.capacity} {product.unit}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, Edit, ArrowLeft, Package } from 'lucide-react';
import { getProductById } from '@/services/api';
import { getStockStatus, getCapacityInfo, getCategoryEmoji, formatCurrency, statusLabel } from '@/utils';
import type { Product } from '@/types';
import CapacityBar from '@/components/CapacityBar';
import StatusBadge from '@/components/StatusBadge';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProductById(id)
      .then((p) => {
        setProduct(p);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="page-container pt-4">
        <LoadingState rows={3} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="page-container pt-4">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <ErrorState
          message="Product not found or failed to load."
          onRetry={() => navigate('/stock')}
        />
      </div>
    );
  }

  const status = getStockStatus(product);
  const capacityInfo = getCapacityInfo(product);
  const emoji = getCategoryEmoji(product.category);

  return (
    <div className="min-h-screen bg-[--color-bg]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[--color-bg]/95 backdrop-blur-sm border-b border-[--color-border] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/stock')}
            className="btn btn-ghost p-2 -ml-2"
            aria-label="Back to stock"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg text-[--color-text]">{product.name}</h1>
            {product.brand && <p className="text-xs text-[--color-text-secondary]">{product.brand}</p>}
          </div>
          <button
            onClick={() => navigate(`/stock/add?edit=${product.id}`)}
            className="btn btn-secondary btn-sm"
            aria-label="Edit product"
          >
            <Edit size={14} /> Edit
          </button>
        </div>
      </header>

      <div className="page-container pt-4 space-y-4">
        {/* Product Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[--color-bg] flex items-center justify-center text-4xl flex-shrink-0">
              {emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <div>
                  <h2 className="font-bold text-2xl text-[--color-text]">{product.name}</h2>
                  {product.brand && (
                    <p className="text-sm text-[--color-text-secondary]">by {product.brand}</p>
                  )}
                </div>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs text-[--color-text-secondary] bg-gray-50 rounded-lg px-2 py-0.5 inline-block">
                {product.category}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stock Info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-5"
        >
          <h3 className="font-semibold text-[--color-text-secondary] text-xs uppercase tracking-wider mb-4">
            Stock Information
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-[--color-text-secondary] mb-1">Current Stock</p>
              <p className="text-3xl font-extrabold text-[--color-text]">
                {product.currentStock}
                <span className="text-base font-medium text-[--color-text-secondary] ml-1">{product.unit}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-[--color-text-secondary] mb-1">Reorder Level</p>
              <p className="text-xl font-bold text-amber-600">
                {product.reorderLevel}
                <span className="text-sm font-medium ml-1">{product.unit}</span>
              </p>
            </div>
          </div>

          {capacityInfo && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[--color-text-secondary] font-medium">Capacity</p>
                <p className="text-xs font-semibold text-[--color-text-secondary]">
                  {statusLabel(status)}
                </p>
              </div>
              <CapacityBar
                current={capacityInfo.current}
                capacity={capacityInfo.capacity}
                unit={product.unit}
                status={status}
              />
            </div>
          )}
        </motion.div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5"
        >
          <h3 className="font-semibold text-[--color-text-secondary] text-xs uppercase tracking-wider mb-4">
            Pricing
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[--color-text-secondary] mb-1">Purchase Price</p>
              <p className="text-lg font-bold text-[--color-text]">
                {formatCurrency(product.purchasePrice)}
                <span className="text-xs font-normal text-[--color-text-secondary] ml-1">/{product.unit}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-[--color-text-secondary] mb-1">Selling Price</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(product.sellingPrice)}
                <span className="text-xs font-normal text-[--color-text-secondary] ml-1">/{product.unit}</span>
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-[--color-text-secondary] mb-1">Inventory Value</p>
              <p className="text-xl font-extrabold text-[--color-text]">
                {formatCurrency(product.currentStock * product.purchasePrice)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 pb-4"
        >
          <button
            className="btn btn-primary flex-col gap-1 h-auto py-4"
            aria-label="Add stock"
            id="add-stock-btn"
          >
            <Plus size={22} />
            <span className="text-xs font-semibold">Add Stock</span>
          </button>
          <button
            className="btn btn-secondary flex-col gap-1 h-auto py-4"
            aria-label="Remove stock"
            id="remove-stock-btn"
          >
            <Minus size={22} />
            <span className="text-xs font-semibold">Remove</span>
          </button>
          <button
            onClick={() => navigate(`/stock/add?edit=${product.id}`)}
            className="btn btn-secondary flex-col gap-1 h-auto py-4"
            aria-label="Edit product"
            id="edit-product-btn"
          >
            <Edit size={22} />
            <span className="text-xs font-semibold">Edit</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}

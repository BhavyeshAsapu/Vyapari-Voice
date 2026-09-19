import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Edit, ArrowLeft, Package, Trash2, X, CheckCircle2, Clock } from 'lucide-react';
import { getProductById, addStock, removeStock, deleteProduct } from '@/services/api';
import {
  getStockStatus, getCapacityInfo, getCategoryEmoji, formatCurrency, statusLabel,
  getExpiryStatus, formatExpiryDate, expiryStatusLabel, expiryStatusColor, daysUntilExpiry,
} from '@/utils';
import type { Product } from '@/types';
import CapacityBar from '@/components/CapacityBar';
import StatusBadge from '@/components/StatusBadge';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

type ModalMode = 'add' | 'remove' | 'delete' | null;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Stock adjustment modal state
  const [modal, setModal] = useState<ModalMode>(null);
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stockError, setStockError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProduct = (productId: string) => {
    setLoading(true);
    getProductById(productId)
      .then((p) => {
        setProduct(p);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!id) return;
    fetchProduct(id);
  }, [id]);

  const openModal = (mode: ModalMode) => {
    setQty('');
    setStockError('');
    setSuccessMsg('');
    setModal(mode);
  };

  const closeModal = () => {
    setModal(null);
    setQty('');
    setStockError('');
  };

  const handleStockSubmit = async () => {
    if (!product || !id) return;
    const quantity = parseFloat(qty);
    if (!qty || isNaN(quantity) || quantity <= 0) {
      setStockError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (submitting) return; // Prevent double-submit

    setSubmitting(true);
    setStockError('');
    try {
      if (modal === 'add') {
        const res = await addStock(id, quantity);
        setSuccessMsg(res.message);
      } else if (modal === 'remove') {
        const res = await removeStock(id, quantity);
        setSuccessMsg(res.message);
      }
      // Refresh product data from server
      await fetchProduct(id);
      setTimeout(() => {
        closeModal();
        setSuccessMsg('');
      }, 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update stock.';
      setStockError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !id || submitting) return;
    setSubmitting(true);
    setStockError('');
    try {
      const res = await deleteProduct(id);
      setSuccessMsg(res.message);
      setTimeout(() => navigate('/stock'), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to remove product.';
      setStockError(msg);
      setSubmitting(false);
    }
  };

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
            onClick={() => openModal('add')}
            className="btn btn-primary flex-col gap-1 h-auto py-4"
            aria-label="Add stock"
            id="add-stock-btn"
          >
            <Plus size={22} />
            <span className="text-xs font-semibold">Add Stock</span>
          </button>
          <button
            onClick={() => openModal('remove')}
            className="btn btn-secondary flex-col gap-1 h-auto py-4"
            aria-label="Remove stock"
            id="remove-stock-btn"
          >
            <Minus size={22} />
            <span className="text-xs font-semibold">Remove</span>
          </button>
          <button
            onClick={() => openModal('delete')}
            className="btn btn-secondary flex-col gap-1 h-auto py-4 text-red-500 border-red-200 hover:bg-red-50"
            aria-label="Remove product from inventory"
            id="delete-product-btn"
          >
            <Trash2 size={22} />
            <span className="text-xs font-semibold">Delete</span>
          </button>
        </motion.div>
      </div>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {(modal === 'add' || modal === 'remove') && (
          <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full bg-white rounded-t-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl text-[--color-text]">
                  {modal === 'add' ? 'Add Stock' : 'Remove Stock'}
                </h2>
                <button onClick={closeModal} className="btn btn-ghost p-2" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-[--color-text-secondary]">
                {modal === 'add'
                  ? `Adding to: ${product.name} (current: ${product.currentStock} ${product.unit})`
                  : `Removing from: ${product.name} (current: ${product.currentStock} ${product.unit})`}
              </p>

              {successMsg ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl text-green-700">
                  <CheckCircle2 size={20} />
                  <p className="font-medium">{successMsg}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="stock-qty" className="label">
                      Quantity ({product.unit}) *
                    </label>
                    <input
                      id="stock-qty"
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={`input ${stockError ? 'border-red-400' : ''}`}
                      placeholder={`e.g. 10`}
                      value={qty}
                      onChange={(e) => { setQty(e.target.value); setStockError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleStockSubmit()}
                      autoFocus
                    />
                    {stockError && <p className="text-xs text-red-500 mt-1">{stockError}</p>}
                  </div>

                  <button
                    onClick={handleStockSubmit}
                    disabled={submitting || !qty}
                    className="btn btn-primary w-full disabled:opacity-40"
                    id={modal === 'add' ? 'confirm-add-btn' : 'confirm-remove-btn'}
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      modal === 'add' ? 'Add Stock' : 'Remove Stock'
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {modal === 'delete' && (
          <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full bg-white rounded-t-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Package size={20} className="text-red-500" />
                </div>
                <h2 className="font-bold text-xl text-[--color-text]">Remove Product?</h2>
              </div>

              <p className="text-[--color-text-secondary]">
                Remove <strong>{product.name}</strong> from active inventory?
              </p>
              <p className="text-sm text-[--color-text-secondary] bg-amber-50 border border-amber-100 rounded-xl p-3">
                ⚠️ The product will be archived. All historical transactions remain intact.
              </p>

              {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl text-green-700">
                  <CheckCircle2 size={20} />
                  <p className="font-medium">{successMsg}</p>
                </div>
              )}
              {stockError && <p className="text-xs text-red-500">{stockError}</p>}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={closeModal} className="btn btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="btn btn-primary bg-red-500 border-red-500 hover:bg-red-600 disabled:opacity-40"
                  id="confirm-delete-btn"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Removing...
                    </>
                  ) : (
                    'Remove Product'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getProductById, createProduct } from '@/services/api';
import type { Category, Unit } from '@/types';

const CATEGORIES: Category[] = [
  'Grains & Rice', 'Pulses & Lentils', 'Spices', 'Oils & Ghee',
  'Biscuits & Snacks', 'Soaps & Detergents', 'Beverages', 'Dairy',
  'Sugar & Salt', 'Other',
];

const UNITS: Unit[] = [
  'Pieces', 'KG', 'Grams', 'Litres', 'Millilitres',
  'Bags', 'Cartons', 'Boxes', 'Dozens', 'Quintals', 'Packets',
];

interface FormData {
  name: string;
  brand: string;
  category: Category;
  unit: Unit;
  openingStock: string;
  purchasePrice: string;
  sellingPrice: string;
  reorderLevel: string;
  capacity: string;
}

const DEFAULT_FORM: FormData = {
  name: '',
  brand: '',
  category: 'Other',
  unit: 'Pieces',
  openingStock: '',
  purchasePrice: '',
  sellingPrice: '',
  reorderLevel: '',
  capacity: '',
};

export default function AddProductPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const isEdit = !!editId;

  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editId) {
      getProductById(editId).then((p) => {
        if (p) {
          setForm({
            name: p.name,
            brand: p.brand ?? '',
            category: p.category,
            unit: p.unit,
            openingStock: String(p.openingStock),
            purchasePrice: String(p.purchasePrice),
            sellingPrice: String(p.sellingPrice),
            reorderLevel: String(p.reorderLevel),
            capacity: p.capacity ? String(p.capacity) : '',
          });
        }
      });
    }
  }, [editId]);

  const set = (key: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.openingStock || isNaN(Number(form.openingStock))) errs.openingStock = 'Enter a valid number';
    if (!form.purchasePrice || isNaN(Number(form.purchasePrice))) errs.purchasePrice = 'Enter a valid price';
    if (!form.sellingPrice || isNaN(Number(form.sellingPrice))) errs.sellingPrice = 'Enter a valid price';
    if (!form.reorderLevel || isNaN(Number(form.reorderLevel))) errs.reorderLevel = 'Enter a valid number';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await createProduct({
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        category: form.category,
        unit: form.unit,
        currentStock: Number(form.openingStock),
        openingStock: Number(form.openingStock),
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        reorderLevel: Number(form.reorderLevel),
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
      setSaved(true);
      setTimeout(() => navigate('/stock'), 1200);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <PageHeader
        title={isEdit ? 'Edit Product' : 'Add Product'}
        backTo="/stock"
        rightAction={
          <button
            onClick={() => navigate('/stock')}
            className="btn btn-ghost btn-sm p-2"
            aria-label="Cancel"
          >
            <X size={18} />
          </button>
        }
      />

      <div className="page-container pt-4">
        {saved ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Save size={28} className="text-green-600" />
            </div>
            <p className="font-bold text-xl text-[--color-text]">Product Saved!</p>
            <p className="text-[--color-text-secondary] mt-1">Returning to stock list...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Basic Info */}
            <section className="card p-4 space-y-4">
              <h2 className="font-bold text-[--color-text]">Basic Information</h2>
              <div>
                <label htmlFor="p-name" className="label">Product Name *</label>
                <input id="p-name" type="text" className={`input ${errors.name ? 'border-red-400' : ''}`}
                  placeholder="e.g. Rice, Sugar, Parle-G"
                  value={form.name} onChange={(e) => set('name', e.target.value)} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="p-brand" className="label">Brand (Optional)</label>
                <input id="p-brand" type="text" className="input" placeholder="e.g. Parle, Britannia, TATA"
                  value={form.brand} onChange={(e) => set('brand', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="p-category" className="label">Category</label>
                  <select id="p-category" className="input select" value={form.category}
                    onChange={(e) => set('category', e.target.value as Category)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-unit" className="label">Unit</label>
                  <select id="p-unit" className="input select" value={form.unit}
                    onChange={(e) => set('unit', e.target.value as Unit)}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Stock Info */}
            <section className="card p-4 space-y-4">
              <h2 className="font-bold text-[--color-text]">Stock Information</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="p-opening" className="label">Opening Stock *</label>
                  <input id="p-opening" type="number" min="0" className={`input ${errors.openingStock ? 'border-red-400' : ''}`}
                    placeholder="0" value={form.openingStock} onChange={(e) => set('openingStock', e.target.value)} />
                  {errors.openingStock && <p className="text-xs text-red-500 mt-1">{errors.openingStock}</p>}
                </div>
                <div>
                  <label htmlFor="p-reorder" className="label">Reorder Level *</label>
                  <input id="p-reorder" type="number" min="0" className={`input ${errors.reorderLevel ? 'border-red-400' : ''}`}
                    placeholder="5" value={form.reorderLevel} onChange={(e) => set('reorderLevel', e.target.value)} />
                  {errors.reorderLevel && <p className="text-xs text-red-500 mt-1">{errors.reorderLevel}</p>}
                </div>
                <div>
                  <label htmlFor="p-capacity" className="label">Capacity (Optional)</label>
                  <input id="p-capacity" type="number" min="0" className="input"
                    placeholder="Max storage" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
                  <p className="text-xs text-[--color-text-secondary] mt-1">Leave blank if unlimited</p>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="card p-4 space-y-4">
              <h2 className="font-bold text-[--color-text]">Pricing</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="p-purchase" className="label">Purchase Price (₹) *</label>
                  <input id="p-purchase" type="number" min="0" step="0.01" className={`input ${errors.purchasePrice ? 'border-red-400' : ''}`}
                    placeholder="0.00" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                  {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">{errors.purchasePrice}</p>}
                </div>
                <div>
                  <label htmlFor="p-selling" className="label">Selling Price (₹) *</label>
                  <input id="p-selling" type="number" min="0" step="0.01" className={`input ${errors.sellingPrice ? 'border-red-400' : ''}`}
                    placeholder="0.00" value={form.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} />
                  {errors.sellingPrice && <p className="text-xs text-red-500 mt-1">{errors.sellingPrice}</p>}
                </div>
              </div>
              <div className="bg-[--color-bg] rounded-xl p-3 border border-[--color-border]">
                <p className="text-xs text-[--color-text-secondary]">
                  💡 Prices per unit ({form.unit})
                </p>
              </div>
            </section>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full"
              id="save-product-btn"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {isEdit ? 'Save Changes' : 'Add Product'}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

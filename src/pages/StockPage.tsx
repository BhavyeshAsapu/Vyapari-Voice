import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X } from 'lucide-react';
import { getInventory } from '@/services/api';
import type { StockStatus } from '@/types';
import { getStockStatus } from '@/utils';
import ProductCard from '@/components/ProductCard';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { PRODUCTS } from '@/data/mockData';

type FilterKey = 'all' | 'low' | 'out';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
];

export default function StockPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    getInventory().then((inv) => {
      setProducts(inv);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const status: StockStatus = getStockStatus(p);
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === 'all' ||
        (filter === 'low' && status === 'low') ||
        (filter === 'out' && status === 'out');
      return matchSearch && matchFilter;
    });
  }, [products, search, filter]);

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <PageHeader
        title="Stock"
        subtitle={`${products.length} products`}
        rightAction={
          <button
            onClick={() => navigate('/stock/add')}
            className="btn btn-primary btn-sm"
            aria-label="Add new product"
            id="add-product-btn"
          >
            <Plus size={16} />
            Add
          </button>
        }
      />

      <div className="page-container pt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-secondary]" aria-hidden />
          <input
            type="search"
            placeholder="Search products, brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 pr-10"
            aria-label="Search products"
            id="stock-search"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              aria-label="Clear search"
            >
              <X size={14} className="text-[--color-text-secondary]" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {FILTERS.map((f) => {
            const count =
              f.key === 'all'
                ? products.length
                : products.filter((p) => {
                    const s = getStockStatus(p);
                    return f.key === 'low' ? s === 'low' : s === 'out';
                  }).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`chip flex-shrink-0 ${filter === f.key ? 'active' : ''}`}
                aria-pressed={filter === f.key}
              >
                {f.label} {count > 0 && <span className="ml-1 font-bold">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Products */}
        {loading ? (
          <LoadingState rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No products found' : 'No products yet'}
            description={search ? `No results for "${search}"` : 'Add your first product to get started'}
            action={!search ? { label: 'Add Product', onClick: () => navigate('/stock/add') } : undefined}
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

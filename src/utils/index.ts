import type { Product, StockStatus, CapacityInfo, ExpiryStatus } from '@/types';

// ─── Stock Status ─────────────────────────────────────────────────────────────

export function getStockStatus(product: Product): StockStatus {
  const { currentStock, reorderLevel, capacity } = product;

  if (currentStock <= 0) return 'out';
  if (capacity && currentStock > capacity) return 'over_capacity';
  if (capacity && currentStock >= capacity) return 'at_capacity';
  if (capacity && currentStock >= capacity * 0.9) return 'near_capacity';
  if (currentStock <= reorderLevel) return 'low';
  return 'healthy';
}

export function getCapacityInfo(product: Product): CapacityInfo | null {
  if (!product.capacity) return null;
  const percentage = Math.min(
    Math.round((product.currentStock / product.capacity) * 100),
    120
  );
  return {
    current: product.currentStock,
    capacity: product.capacity,
    percentage,
    status: getStockStatus(product),
  };
}

export function statusLabel(status: StockStatus): string {
  switch (status) {
    case 'healthy': return 'Healthy';
    case 'low': return 'Low Stock';
    case 'out': return 'Out of Stock';
    case 'near_capacity': return 'Near Capacity';
    case 'at_capacity': return 'At Capacity';
    case 'over_capacity': return 'Over Capacity';
  }
}

export function statusColor(status: StockStatus): string {
  switch (status) {
    case 'healthy': return 'text-green-700 bg-green-50 border-green-200';
    case 'low': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'out': return 'text-red-700 bg-red-50 border-red-200';
    case 'near_capacity': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'at_capacity': return 'text-orange-800 bg-orange-100 border-orange-300';
    case 'over_capacity': return 'text-red-700 bg-red-50 border-red-200';
  }
}

export function capacityBarColor(status: StockStatus): string {
  switch (status) {
    case 'healthy': return 'bg-green-500';
    case 'low': return 'bg-amber-500';
    case 'out': return 'bg-red-400';
    case 'near_capacity': return 'bg-orange-400';
    case 'at_capacity': return 'bg-orange-500';
    case 'over_capacity': return 'bg-red-500';
  }
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString));
}

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoString));
}

export function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function isYesterday(isoString: string): boolean {
  const d = new Date(isoString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

export function isThisWeek(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return diff <= 7 * 24 * 60 * 60 * 1000;
}

export function relativeDay(isoString: string): string {
  if (isToday(isoString)) return 'Today';
  if (isYesterday(isoString)) return 'Yesterday';
  return formatDate(isoString);
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Category Icons ───────────────────────────────────────────────────────────

export function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'Grains & Rice': return '🌾';
    case 'Pulses & Lentils': return '🫘';
    case 'Spices': return '🌶️';
    case 'Oils & Ghee': return '🫙';
    case 'Biscuits & Snacks': return '🍪';
    case 'Soaps & Detergents': return '🧼';
    case 'Beverages': return '☕';
    case 'Dairy': return '🥛';
    case 'Sugar & Salt': return '🧂';
    default: return '📦';
  }
}

// ─── Class helpers ────────────────────────────────────────────────────────────

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Expiry Utils ─────────────────────────────────────────────────────────────

const EXPIRY_SOON_DAYS = 3; // Mirror backend config default

export function daysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(expiryDate?: string | null): ExpiryStatus {
  if (!expiryDate) return 'NO_EXPIRY';
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return 'EXPIRED';
  if (days <= EXPIRY_SOON_DAYS) return 'EXPIRING_SOON';
  return 'SAFE';
}

export function formatExpiryDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}

export function expiryStatusLabel(status: ExpiryStatus): string {
  switch (status) {
    case 'EXPIRED': return 'Expired';
    case 'EXPIRING_SOON': return 'Expiring Soon';
    case 'SAFE': return 'Safe';
    case 'NO_EXPIRY': return 'Not tracked';
  }
}

export function expiryStatusColor(status: ExpiryStatus): string {
  switch (status) {
    case 'EXPIRED': return 'text-red-700 bg-red-100 border-red-200';
    case 'EXPIRING_SOON': return 'text-amber-700 bg-amber-100 border-amber-200';
    case 'SAFE': return 'text-green-700 bg-green-100 border-green-200';
    case 'NO_EXPIRY': return 'text-gray-500 bg-gray-100 border-gray-200';
  }
}

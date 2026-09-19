/**
 * Service layer — currently returns mock data.
 * These functions are designed to be replaced by real API calls
 * when the FastAPI backend is ready.
 *
 * Each function mirrors a future REST endpoint:
 *   GET  /api/products             → getProducts()
 *   GET  /api/products/:id         → getProductById()
 *   POST /api/products             → createProduct()
 *   PUT  /api/products/:id         → updateProduct()
 *   DELETE /api/products/:id       → deleteProduct()
 *   GET  /api/inventory            → getInventory()
 *   GET  /api/inventory/alerts     → getAlerts()
 *   GET  /api/transactions         → getTransactions()
 *   GET  /api/transactions/today   → getTodayTransactions()
 *   POST /api/inventory/transaction→ createTransaction()
 *   POST /api/voice/parse          → parseVoiceCommand()
 *   POST /api/assistant/query      → queryAssistant()
 *   GET  /api/dashboard/summary    → getDailySummary()
 *   GET  /api/dashboard/fast-selling → getFastSelling()
 */

import type {
  Product,
  Transaction,
  Alert,
  DailySummary,
  AssistantMessage,
  FastSellingItem,
  VoiceTranscriptResult,
} from '@/types';
import {
  PRODUCTS,
  TRANSACTIONS,
  ALERTS,
  DAILY_SUMMARY,
  DEMO_ASSISTANT_MESSAGES,
  FAST_SELLING_7DAYS,
  FAST_SELLING_TODAY,
  FAST_SELLING_30DAYS,
  DEMO_TRANSCRIPT,
} from '@/data/mockData';
import { getStockStatus } from '@/utils';

// Simulate async API latency
const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  await delay();
  return PRODUCTS;
}

export async function getProductById(id: string): Promise<Product | null> {
  await delay();
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

export async function createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  await delay();
  const now = new Date().toISOString();
  const newProduct: Product = {
    ...product,
    id: `p${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  PRODUCTS.push(newProduct);
  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  await delay();
  const idx = PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  PRODUCTS[idx] = { ...PRODUCTS[idx], ...updates, updatedAt: new Date().toISOString() };
  return PRODUCTS[idx];
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function getInventory() {
  await delay();
  return PRODUCTS.map((p) => ({ ...p, status: getStockStatus(p) }));
}

export async function getAlerts(): Promise<Alert[]> {
  await delay();
  return ALERTS;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
  await delay();
  return TRANSACTIONS;
}

export async function getTodayTransactions(): Promise<Transaction[]> {
  await delay();
  const today = new Date().toDateString();
  return TRANSACTIONS.filter((t) => new Date(t.timestamp).toDateString() === today);
}

export async function createTransaction(
  tx: Omit<Transaction, 'id' | 'timestamp'>
): Promise<Transaction> {
  await delay();
  const newTx: Transaction = {
    ...tx,
    id: `t${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  TRANSACTIONS.unshift(newTx);
  // Update product stock
  const product = PRODUCTS.find((p) => p.id === tx.productId);
  if (product) {
    if (tx.type === 'stock_in') {
      product.currentStock += tx.quantity;
    } else {
      product.currentStock = Math.max(0, product.currentStock - tx.quantity);
    }
    product.updatedAt = new Date().toISOString();
  }
  return newTx;
}

// ─── Voice ────────────────────────────────────────────────────────────────────

export async function parseVoiceCommand(_audioBlob?: Blob): Promise<VoiceTranscriptResult> {
  // Mock: always returns the demo transcript
  await delay(800);
  return DEMO_TRANSCRIPT;
}

// ─── Assistant ────────────────────────────────────────────────────────────────

export async function queryAssistant(
  _question: string,
  _history: AssistantMessage[]
): Promise<AssistantMessage> {
  await delay(600);
  const demoResponses = [
    'You currently have 33 Bags of Rice (Sona Masoori). Stock is healthy.',
    '3 products are currently low on stock:\n• Sugar – 4 Bags remaining\n• Sunflower Oil – 6 Litres remaining\n• Parle-G – 12 Packets at reorder level.\n\nTata Salt is completely out of stock.',
    "Based on this week's transactions, you should reorder: Sugar (4 Bags remaining), Sunflower Oil (6 Litres), and Tata Salt (0 Packets).",
    'This week\'s fastest selling products are: Rice (22 Bags), Parle-G (34 Packets), and Sunflower Oil (27 Litres).',
    'Today 15 units came in across 2 transactions: Rice +5 Bags and Parle-G +10 Packets.',
    'Today 5 units went out: Sugar -2 Bags and Sunflower Oil -3 Litres.',
  ];
  const answer = demoResponses[Math.floor(Math.random() * demoResponses.length)];
  return {
    id: `msg${Date.now()}`,
    role: 'assistant',
    content: answer,
    timestamp: new Date().toISOString(),
  };
}

export async function getInitialAssistantMessages(): Promise<AssistantMessage[]> {
  await delay();
  return DEMO_ASSISTANT_MESSAGES;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDailySummary(): Promise<DailySummary> {
  await delay();
  return DAILY_SUMMARY;
}

export async function getFastSelling(
  period: 'today' | '7days' | '30days'
): Promise<FastSellingItem[]> {
  await delay();
  switch (period) {
    case 'today': return FAST_SELLING_TODAY;
    case '7days': return FAST_SELLING_7DAYS;
    case '30days': return FAST_SELLING_30DAYS;
  }
}

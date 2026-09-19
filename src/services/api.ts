/**
 * API Service layer — all backend calls go through here.
 *
 * In development: hits http://localhost:8000/api
 * In production:  hits the Render backend URL (set VITE_API_URL)
 */

import type {
  Product,
  Transaction,
  Alert,
  DailySummary,
  DailyInventorySummary,
  AssistantMessage,
  FastSellingItem,
  VoiceParseResponse,
  VoiceConfirmResponse,
} from '@/types';

// ── Base URL ────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof detail?.detail === 'string'
        ? detail.detail
        : detail?.detail?.message ?? `API error ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

// ── Products ────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/api/products');
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    return await apiFetch<Product>(`/api/products/${id}`);
  } catch {
    return null;
  }
}

export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Product> {
  return apiFetch<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>,
): Promise<Product | null> {
  try {
    return await apiFetch<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } catch {
    return null;
  }
}

export async function deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/products/${id}`, { method: 'DELETE' });
}

// ── Inventory ───────────────────────────────────────────────────────────────

export async function getInventory() {
  return apiFetch<(Product & { status: string })[]>('/api/inventory');
}

export async function getAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>('/api/inventory/alerts');
}

export async function dismissAlert(alertId: string): Promise<void> {
  await apiFetch('/api/inventory/alerts/dismiss', {
    method: 'POST',
    body: JSON.stringify({ alertId }),
  });
}

export async function addStock(
  productId: string,
  quantity: number,
  unit?: string,
  note?: string,
): Promise<{ success: boolean; newStock: number; transactionId: string; message: string }> {
  return apiFetch(`/api/inventory/${productId}/add-stock`, {
    method: 'POST',
    body: JSON.stringify({ quantity, unit, note }),
  });
}

export async function removeStock(
  productId: string,
  quantity: number,
  unit?: string,
  note?: string,
): Promise<{ success: boolean; newStock: number; transactionId: string; message: string }> {
  return apiFetch(`/api/inventory/${productId}/remove-stock`, {
    method: 'POST',
    body: JSON.stringify({ quantity, unit, note }),
  });
}

// ── Transactions ────────────────────────────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
  return apiFetch<Transaction[]>('/api/transactions?limit=50');
}

export async function getTodayTransactions(): Promise<Transaction[]> {
  return apiFetch<Transaction[]>('/api/transactions/today');
}

export async function createTransaction(
  tx: Omit<Transaction, 'id' | 'timestamp'>,
): Promise<Transaction> {
  return apiFetch<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(tx),
  });
}

// ── Voice ───────────────────────────────────────────────────────────────────

export async function parseVoiceCommand(
  transcript: string,
  sessionId: string,
  language?: string,
): Promise<VoiceParseResponse> {
  return apiFetch<VoiceParseResponse>('/api/voice/parse', {
    method: 'POST',
    body: JSON.stringify({ transcript, sessionId, language }),
  });
}

export async function confirmVoiceAction(sessionId: string): Promise<VoiceConfirmResponse> {
  return apiFetch<VoiceConfirmResponse>('/api/voice/confirm', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

// ── Assistant ───────────────────────────────────────────────────────────────

export async function queryAssistant(
  question: string,
  history: AssistantMessage[],
  language = 'english',
): Promise<AssistantMessage> {
  return apiFetch<AssistantMessage>('/api/assistant/query', {
    method: 'POST',
    body: JSON.stringify({ question, history, language }),
  });
}

export async function getInitialAssistantMessages(): Promise<AssistantMessage[]> {
  // Seed messages come from mock data — no backend endpoint needed
  const { DEMO_ASSISTANT_MESSAGES } = await import('@/data/mockData');
  return DEMO_ASSISTANT_MESSAGES;
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export async function getDailySummary(): Promise<DailySummary> {
  return apiFetch<DailySummary>('/api/dashboard/summary');
}

export async function getDailyInventorySummary(date?: string): Promise<DailyInventorySummary> {
  const params = date ? `?date=${date}` : '';
  return apiFetch<DailyInventorySummary>(`/api/dashboard/daily-summary${params}`);
}

export async function getFastSelling(
  period: 'today' | '7days' | '30days',
): Promise<FastSellingItem[]> {
  return apiFetch<FastSellingItem[]>(`/api/dashboard/fast-selling?period=${period}`);
}

// ── Profile ─────────────────────────────────────────────────────────────────

export interface ProfileData {
  ownerName: string;
  shopName: string;
  phone: string;
  language: string;
}

export async function getProfile(): Promise<ProfileData> {
  return apiFetch<ProfileData>('/api/profile');
}

export async function updateProfile(data: Partial<ProfileData>): Promise<ProfileData> {
  return apiFetch<ProfileData>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * API Service layer — all backend calls go through here.
 *
 * In development: hits http://localhost:8000/api
 * In production:  hits the Render backend URL (set VITE_API_URL)
 *
 * Function signatures are identical to the Milestone 1 mock layer,
 * so no page components needed to change.
 */

import type {
  Product,
  Transaction,
  Alert,
  DailySummary,
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
    throw new Error(detail?.detail ?? `API error ${res.status}`);
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

// ── Inventory ───────────────────────────────────────────────────────────────

export async function getInventory() {
  return apiFetch<(Product & { status: string })[]>('/api/inventory');
}

export async function getAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>('/api/inventory/alerts');
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

export async function getFastSelling(
  period: 'today' | '7days' | '30days',
): Promise<FastSellingItem[]> {
  return apiFetch<FastSellingItem[]>(`/api/dashboard/fast-selling?period=${period}`);
}

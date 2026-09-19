// Product & Inventory Types

export type Unit =
  | 'Pieces'
  | 'KG'
  | 'Grams'
  | 'Litres'
  | 'Millilitres'
  | 'Bags'
  | 'Cartons'
  | 'Boxes'
  | 'Dozens'
  | 'Quintals'
  | 'Packets';

export type Category =
  | 'Grains & Rice'
  | 'Pulses & Lentils'
  | 'Spices'
  | 'Oils & Ghee'
  | 'Biscuits & Snacks'
  | 'Soaps & Detergents'
  | 'Beverages'
  | 'Dairy'
  | 'Sugar & Salt'
  | 'Other';

export type StockStatus = 'healthy' | 'low' | 'out' | 'near_capacity' | 'at_capacity' | 'over_capacity';

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: Category;
  unit: Unit;
  currentStock: number;
  openingStock: number;
  reorderLevel: number;
  capacity?: number;
  purchasePrice: number;
  sellingPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem extends Product {
  status: StockStatus;
}

// Transaction Types

export type TransactionType = 'stock_in' | 'stock_out';
export type TransactionSource = 'voice' | 'manual';

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: Unit;
  type: TransactionType;
  source: TransactionSource;
  note?: string;
  timestamp: string;
}

// Alert Types

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertType = 'out_of_stock' | 'low_stock' | 'over_capacity' | 'near_capacity';

export interface Alert {
  id: string;
  productId: string;
  productName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  currentStock: number;
  threshold?: number;
  capacity?: number;
  unit: Unit;
  timestamp: string;
}

// Voice State Types

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'transcript'
  | 'confirmation'
  | 'correction'
  | 'success'
  | 'error';

export interface VoiceTranscriptResult {
  rawText: string;
  productName: string;
  quantity: number;
  unit: Unit;
  transactionType: TransactionType;
  confidence: number;
}

// ── Real voice pipeline types (Milestone 2) ────────────────────────────────────

export type IntentType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'CREATE_PRODUCT'
  | 'CHECK_STOCK'
  | 'LOW_STOCK_QUERY'
  | 'OUT_OF_STOCK_QUERY'
  | 'REORDER_QUERY'
  | 'TRANSACTION_HISTORY_QUERY'
  | 'FAST_SELLING_QUERY'
  | 'UNDO_LAST_TRANSACTION'
  | 'UNKNOWN';

export type ProductMatchStatus = 'MATCHED' | 'AMBIGUOUS' | 'NOT_FOUND';

export interface InventoryIntent {
  intent: IntentType;
  language: string;
  productName: string | null;
  brand: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  priceType: 'PER_UNIT' | 'TOTAL' | 'UNKNOWN' | null;
  transactionType: 'STOCK_IN' | 'STOCK_OUT' | null;
  possibleAliases: string[];
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

export interface ProductMatch {
  status: ProductMatchStatus;
  productId?: string;
  name?: string;
  brand?: string;
  unit?: string;
  currentStock?: number;
  candidates?: Array<{
    id: string;
    name: string;
    brand?: string;
    category?: string;
    unit?: string;
    currentStock?: number;
  }>;
}

export interface ProposedAction {
  type: 'STOCK_IN' | 'STOCK_OUT' | 'CREATE_PRODUCT' | 'QUERY' | 'CLARIFICATION' | 'UNDO';
  productId?: string;
  productName?: string;
  currentQuantity?: number;
  change?: number;
  resultQuantity?: number;
  unit?: string;
  price?: number;
  proposedProduct?: Record<string, unknown>;
}

export interface VoiceParseResponse {
  transcript: string;
  interpretation: InventoryIntent;
  productMatch: ProductMatch;
  proposedAction: ProposedAction;
  requiresConfirmation: boolean;
  queryAnswer?: string;
}

export interface VoiceConfirmResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  productId?: string;
  newStock?: number;
}

// Summary Types

export interface DailySummary {
  date: string;
  productsUpdated: number;
  totalStockIn: number;
  totalStockOut: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
  salesValue: number;
  estimatedGrossProfit: number;
}

// Assistant Types

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Fast Selling Types

export interface FastSellingItem {
  productId: string;
  productName: string;
  unit: Unit;
  totalOut: number;
  percentage: number;
}

// App Settings

export type Language = 'en' | 'te' | 'hi';

export interface AppSettings {
  language: Language;
  shopName: string;
  ownerName: string;
  notificationsEnabled: boolean;
  voiceLanguage: Language;
  defaultUnit: Unit;
  onboardingCompleted: boolean;
}

// Capacity Info

export interface CapacityInfo {
  current: number;
  capacity: number;
  percentage: number;
  status: StockStatus;
}

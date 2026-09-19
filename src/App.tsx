import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Layouts
import AppLayout from '@/layouts/AppLayout';

// Pages
import OnboardingPage from '@/pages/OnboardingPage';
import HomePage from '@/pages/HomePage';
import StockPage from '@/pages/StockPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import AddProductPage from '@/pages/AddProductPage';
import AlertsPage from '@/pages/AlertsPage';
import HistoryPage from '@/pages/HistoryPage';
import AssistantPage from '@/pages/AssistantPage';
import SummaryPage from '@/pages/SummaryPage';
import MorePage from '@/pages/MorePage';

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Onboarding — no app layout */}
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* App with layout */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/stock/add" element={<AddProductPage />} />
            <Route path="/stock/:id" element={<ProductDetailPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/more" element={<MorePage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

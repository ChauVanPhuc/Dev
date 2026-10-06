import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '@/shared/layouts/AdminLayout';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

// Modules
import ClaimLayout from '@/modules/claim/views/ClaimLayout';
import ClaimListView from '@/modules/claim/views/ClaimListView';
import PriceListView from '@/modules/price/views/PriceListView';
import DefectManagementView from '@/modules/defect/views/DefectManagementView';

// Module LPN Crawler Độc Lập
import LpnCrawlerView from '@lpn/pages/LpnCrawlerView';

// Module AI OCR & Training Độc Lập
import AiOcrTrainTab from '@ai-ocr/AiOcrTrainTab';

// Module Dashboard Thống Kê & Phân Tích Độc Lập
import DashboardView from '@dashboard/DashboardView';

import { ScreenProvider } from '@/shared/context/ScreenContext';

// ProtectedRoute cho hệ thống Claim_v2
const ProtectedRoute = ({ children }) => {
  return children;
};

/**
 * Controller chính điều phối Routing của ứng dụng Claim_v2
 */
function App() {
  return (
    <ErrorBoundary>
      <ScreenProvider>
        <Router>
        <Routes>
          {/* Chuyển hướng /login thẳng vào màn hình khiếu nại */}
          <Route path="/login" element={<Navigate to="/admin/claims" replace />} />

          {/* Route Admin (Layout chung) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/claims" replace />} />
            <Route path="dashboard" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
            <Route path="defects" element={<ProtectedRoute><DefectManagementView /></ProtectedRoute>} />
            <Route path="lpn-crawler" element={<ProtectedRoute><LpnCrawlerView /></ProtectedRoute>} />
            <Route path="ai-ocr-train" element={<ProtectedRoute><AiOcrTrainTab /></ProtectedRoute>} />
          </Route>

          {/* Route Claim */}
          <Route path="/admin/claims" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route element={<ClaimLayout />}>
              <Route index element={<ClaimListView />} />
            </Route>
          </Route>

          {/* Route Prices */}
          <Route path="/admin/prices" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route element={<ClaimLayout />}>
              <Route index element={<PriceListView />} />
            </Route>
          </Route>

          {/* Legacy Redirects */}
          <Route path="/claim/*" element={<Navigate to="/admin/claims" replace />} />
          <Route path="/admin/claim/*" element={<Navigate to="/admin/claims" replace />} />

          {/* Chuyển hướng mặc định */}
          <Route path="/" element={<Navigate to="/admin/claims" replace />} />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/admin/claims" replace />} />
        </Routes>
      </Router>
    </ScreenProvider>
    </ErrorBoundary>
  );
}

export default App;

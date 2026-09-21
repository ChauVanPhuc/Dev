import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from '@shared/components/ToastContext';
import FeedbackCreateReportView from '@modules/feedback/views/FeedbackCreateReportView';
import FeedbackOverviewView from '@modules/feedback/views/FeedbackOverviewView';

const CreateReportWrapper = () => {
  const navigate = useNavigate();
  return <FeedbackCreateReportView onNavigateToList={() => navigate('/list')} />;
};

export function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Màn hình chính mặc định tại cổng 3001 là Form Lập Báo Cáo MB37 theo đúng ảnh người dùng yêu cầu */}
          <Route path="/" element={<CreateReportWrapper />} />
          <Route path="/create" element={<CreateReportWrapper />} />
          <Route path="/quick-report-create" element={<CreateReportWrapper />} />

          {/* Màn hình danh sách theo dõi & xử lý */}
          <Route path="/list" element={<FeedbackOverviewView />} />
          <Route path="/admin" element={<FeedbackOverviewView />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;

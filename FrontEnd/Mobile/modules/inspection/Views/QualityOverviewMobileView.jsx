import React from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import { ToastProvider } from '@webShared/Views/components/feedback/ToastContext';
import QualityOverviewView from '@webModules/Inspection/Views/Report/QualityOverviewView';

/**
 * Màn hình Xác nhận phiếu kiểm tra (CL1 - /admin/quality) trên giao diện Mobile
 */
const QualityOverviewMobileView = () => {
  return (
    <Layout>
      <PageHeader 
        title="Xác nhận phiếu kiểm tra" 
        subTitle="CL1: Danh sách công việc tồn đọng cần xử lý" 
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', height: 'calc(100dvh - 56px)', backgroundColor: '#FAF6F0' }}>
        <ToastProvider>
          <QualityOverviewView isMobileView={true} />
        </ToastProvider>
      </div>
    </Layout>
  );
};

export default QualityOverviewMobileView;

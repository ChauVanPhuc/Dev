import React from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import QualityKPIDashboardView from '@webModules/KPI/Views/Report/QualityKPIDashboardView';

const QualityKPIDashboardMobileView = () => {
  return (
    <Layout>
      <PageHeader 
        title="Quản lý chất lượng" 
        subTitle="Báo cáo KPI & Đánh giá Chất lượng" 
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', height: 'calc(100dvh - 56px)', backgroundColor: '#FAF6F0' }}>
        <QualityKPIDashboardView readOnly={true} isMobileView={true} />
      </div>
    </Layout>
  );
};

export default QualityKPIDashboardMobileView;

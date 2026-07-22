import React from 'react';
import ActivityFeed from '../components/ActivityFeed';

const Dashboard = () => {
  return (
    <div className="dashboard-grid">
      <div className="main-viewport card">
        <h3 style={{ marginBottom: '20px', color: '#7B5233' }}>Hoạt động hệ thống</h3>
        <p style={{ color: '#666' }}>Chào mừng Amanda quay trở lại! Dưới đây là tóm tắt hoạt động hôm nay.</p>
        <div className="placeholder-box" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dbdbdb', fontSize: '2rem' }}>
          MAIN CONTENT AREA
        </div>
      </div>
      <ActivityFeed />

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-grid {
          display: flex;
          gap: 30px;
          align-items: flex-start;
        }
        .main-viewport {
          flex: 1;
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 1px solid #D3C1B4;
        }
        @media (max-width: 1200px) {
          .dashboard-grid {
            flex-direction: column;
          }
          .activity-feed {
            width: 100% !important;
          }
        }
      `}} />
    </div>
  );
};

export default Dashboard;

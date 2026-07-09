import React from 'react';

/**
 * View: Component hiển thị feed thông báo hoạt động gần đây
 */
const ActivityFeed = () => {
  const activities = [
    { id: 1, type: 'QC', name: 'Jennie Ponce', desc: 'Thêm điểm nóng', time: '10m ago', color: '#D35D33' },
    { id: 2, type: 'QC', name: 'Sally Rooney', desc: 'Nhập lỗi công đoạn PO:123', time: '10m ago', color: '#D35D33' },
    { id: 3, type: 'SX', name: 'Sally Rooney', desc: 'Cập nhật tiến độ PO:123', time: '10m ago', color: '#26C6DA' },
  ];

  return (
    <div className="activity-feed">
      <h3 className="feed-title">RECENTLY</h3>
      <div className="feed-list">
        {activities.map((act) => (
          <div key={act.id} className="feed-item">
            <div className="feed-badge" style={{ backgroundColor: act.color }}>
              {act.type}
            </div>
            <div className="feed-details">
              <div className="feed-user-row">
                <span className="feed-user-name">{act.name}</span>
                <span className="feed-time">{act.time}</span>
              </div>
              <span className="feed-desc">{act.desc}</span>
            </div>
            <div className="feed-indicator"></div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .activity-feed {
          width: 280px;
          height: fit-content;
          border: 2px solid #4D3422;
          border-radius: 12px;
          padding: 20px 10px;
          background: #fbfbfb;
        }
        .feed-title {
          font-size: 0.8rem;
          color: #888;
          margin-bottom: 20px;
          padding-left: 10px;
          letter-spacing: 1px;
        }
        .feed-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 10px;
          background: #f1f3ff;
          border-radius: 8px;
          margin-bottom: 10px;
          position: relative;
        }
        .feed-badge {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .feed-details {
          flex: 1;
        }
        .feed-user-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .feed-user-name {
          font-weight: 700;
          font-size: 0.85rem;
          color: #333;
        }
        .feed-time {
          font-size: 0.7rem;
          color: #888;
        }
        .feed-desc {
          font-size: 0.75rem;
          color: #666;
          display: block;
        }
        .feed-indicator {
          width: 6px;
          height: 6px;
          background: #5c6bc0;
          border-radius: 50%;
        }
      `}} />
    </div>
  );
};

export default ActivityFeed;

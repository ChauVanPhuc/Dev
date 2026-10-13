import React from 'react';
import { Link2 } from 'lucide-react';

export const ISORelatedRecordsTab = () => {
  return (
    <div className="iso-viewer-tab-content">
      <div className="iso-empty-related-records">
        <Link2 size={44} color="#CBD5E1" style={{ margin: '0 auto 14px auto', display: 'block' }} />
        <div style={{ fontSize: '0.98rem', fontWeight: '700', color: '#475569' }}>
          Chưa có hồ sơ liên quan.
        </div>
        <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginTop: '8px', lineHeight: '1.5', maxWidth: '440px', margin: '8px auto 0 auto' }}>
          Các liên kết giữa hồ sơ này với các hồ sơ hoặc quy trình ISO khác trong hệ thống sẽ được hiển thị tại đây khi được thiết lập.
        </p>
      </div>
    </div>
  );
};
export default ISORelatedRecordsTab;

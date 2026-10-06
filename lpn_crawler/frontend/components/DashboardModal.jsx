import React from 'react';
import { X, LayoutDashboard, AlertTriangle, BarChart3, TrendingUp, Layers, Image as ImageIcon, Box, PieChart, Activity } from 'lucide-react';

export const DashboardModal = ({
  isOpen,
  onClose,
  allTimeStats = {},
  onOpenMissingRows = () => {}
}) => {
  if (!isOpen) return null;

  const totalContainers = Number(allTimeStats.total_containers || 0);
  const totalSkuRows = Number(allTimeStats.total_sku_rows || 0);
  const totalImages = Number(allTimeStats.total_images || 0);
  const totalMissing = Number(allTimeStats.total_missing_rows || 0);

  return (
    <div
      className="lpn-dashboard-overlay"
      onClick={onClose}
    >
      <div
        className="lpn-dashboard-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sạch sẽ, không còn dòng subtitle dài */}
        <div
          className="lpn-dashboard-header"
          style={{
            padding: '16px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #EADCC9',
            backgroundColor: '#FAF6F0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#7B5233',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 3px 8px rgba(123, 82, 51, 0.28)'
              }}
            >
              <LayoutDashboard size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.28rem', fontWeight: '800', color: '#2D1A12', letterSpacing: '-0.3px' }}>
              Dashboard Tổng Quan Dữ Liệu Hệ Thống
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#7B5233',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s, color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EADCC9';
              e.currentTarget.style.color = '#2D1A12';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#7B5233';
            }}
            title="Đóng cửa sổ"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body Content */}
        <div
          className="lpn-dashboard-body"
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            flex: 1
          }}
        >
          {/* Bộ 4 Thẻ KPI - Thiết kế To, Cân Đối, Không Có Subtitle */}
          <div
            className="lpn-dashboard-kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '18px'
            }}
          >
            {/* Card 1: Số lượng Container */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #EADCC9',
                borderRadius: '12px',
                padding: '22px 24px',
                boxShadow: '0 2px 8px rgba(123, 82, 51, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '125px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(123, 82, 51, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(123, 82, 51, 0.05)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: '700', color: '#8D6E63' }}>
                  Số lượng Container
                </span>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#FAF6F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7B5233'
                  }}
                >
                  <Box size={20} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '2.45rem',
                  fontWeight: '900',
                  color: '#2D1A12',
                  lineHeight: 1.1,
                  marginTop: '10px',
                  letterSpacing: '-0.5px'
                }}
              >
                {totalContainers.toLocaleString()}
              </div>
            </div>

            {/* Card 2: Số lượng Pallet/Box */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #BAE6FD',
                borderRadius: '12px',
                padding: '22px 24px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '125px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(2, 132, 199, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.05)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: '700', color: '#0369A1' }}>
                  Số lượng Pallet/Box
                </span>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#F0F9FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284C7'
                  }}
                >
                  <Layers size={20} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '2.45rem',
                  fontWeight: '900',
                  color: '#0369A1',
                  lineHeight: 1.1,
                  marginTop: '10px',
                  letterSpacing: '-0.5px'
                }}
              >
                {totalSkuRows.toLocaleString()}
              </div>
            </div>

            {/* Card 3: Số lượng ảnh */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #EADCC9',
                borderRadius: '12px',
                padding: '22px 24px',
                boxShadow: '0 2px 8px rgba(123, 82, 51, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '125px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(123, 82, 51, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(123, 82, 51, 0.05)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: '700', color: '#7B5233' }}>
                  Số lượng ảnh
                </span>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#FAF6F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7B5233'
                  }}
                >
                  <ImageIcon size={20} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '2.45rem',
                  fontWeight: '900',
                  color: '#7B5233',
                  lineHeight: 1.1,
                  marginTop: '10px',
                  letterSpacing: '-0.5px'
                }}
              >
                {totalImages.toLocaleString()}
              </div>
            </div>

            {/* Card 4: Số lượng dòng thiếu (Có thể click xem popup) */}
            <div
              onClick={() => {
                onClose();
                onOpenMissingRows({
                  isAllTime: true,
                  dateRangeLabel: 'Toàn hệ thống'
                });
              }}
              style={{
                backgroundColor: totalMissing > 0 ? '#FEF2F2' : '#FFFFFF',
                border: `1.5px solid ${totalMissing > 0 ? '#FCA5A5' : '#EADCC9'}`,
                borderRadius: '12px',
                padding: '22px 24px',
                boxShadow: totalMissing > 0 ? '0 4px 14px rgba(220, 38, 38, 0.08)' : '0 2px 8px rgba(123, 82, 51, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '125px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = '#DC2626';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(220, 38, 38, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = totalMissing > 0 ? '#FCA5A5' : '#EADCC9';
                e.currentTarget.style.boxShadow = totalMissing > 0 ? '0 4px 14px rgba(220, 38, 38, 0.08)' : '0 2px 8px rgba(123, 82, 51, 0.05)';
              }}
              title="Bấm để mở danh sách chi tiết các dòng thiếu"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: '#DC2626' }}>
                    Số lượng dòng thiếu
                  </span>
                  {totalMissing > 0 && <AlertTriangle size={16} color="#DC2626" />}
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B'
                  }}
                >
                  Chi tiết ↗
                </span>
              </div>
              <div
                style={{
                  fontSize: '2.45rem',
                  fontWeight: '900',
                  color: '#DC2626',
                  lineHeight: 1.1,
                  marginTop: '10px',
                  letterSpacing: '-0.5px'
                }}
              >
                {totalMissing.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Section 2: Khung Biểu đồ Phân tích (Chiếm trọn phần không gian dưới rộng rãi) */}
          <div
            style={{
              flex: 1,
              minHeight: '340px',
              backgroundColor: '#FAF6F0',
              border: '1.5px dashed #D5C7B7',
              borderRadius: '14px',
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233',
                boxShadow: '0 4px 14px rgba(123, 82, 51, 0.1)'
              }}
            >
              <BarChart3 size={32} />
            </div>

            <div style={{ maxWidth: '620px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.18rem', fontWeight: '800', color: '#4A2E1B' }}>
                  Biểu Đồ Xu Hướng & Phân Tích Dữ Liệu
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FCD34D'
                  }}
                >
                  Sắp ra mắt
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#8D6E63', lineHeight: 1.6 }}>
                Phân hệ biểu đồ trực quan hóa xu hướng crawl theo ngày/tuần, biểu đồ tỷ lệ đạt/thiếu dữ liệu và dự báo công suất đang được tối ưu hóa và sẽ được tích hợp trực tiếp tại đây.
              </p>
            </div>

            {/* Các Module biểu đồ sắp tới */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#7B5233',
                  backgroundColor: '#FFFFFF',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  boxShadow: '0 2px 6px rgba(123, 82, 51, 0.04)'
                }}
              >
                <TrendingUp size={16} /> Biểu đồ xu hướng crawl hàng ngày
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#0369A1',
                  backgroundColor: '#FFFFFF',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #BAE6FD',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)'
                }}
              >
                <PieChart size={16} /> Tỷ lệ Hoàn Thiện Dữ Liệu
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#2E7D32',
                  backgroundColor: '#FFFFFF',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #C8E6C9',
                  boxShadow: '0 2px 6px rgba(46, 125, 50, 0.04)'
                }}
              >
                <Activity size={16} /> Hiệu suất crawl theo Nhà Máy
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 28px',
            backgroundColor: '#FAF6F0',
            borderTop: '1px solid #EADCC9',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-claim-action"
            style={{
              height: '36px',
              padding: '0 22px',
              fontSize: '0.85rem',
              fontWeight: '700',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5D4037'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7B5233'; }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

export const ForceRestartModal = ({
  message,
  onConfirm,
  onCancel
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(5px)',
      zIndex: 1300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 50px rgba(45, 26, 18, 0.35)',
        border: '1px solid #EADCC9',
        overflow: 'hidden',
        animation: 'lpnModalFadeIn 0.25s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#FFFBEB',
          borderBottom: '1px solid #FDE68A',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={22} color="#D97706" />
            <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#92400E' }}>
              Xác Nhận Buộc Dừng & Khởi Chạy Lại
            </span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', color: '#B45309', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', color: '#2D1A12' }}>
          <p style={{ margin: '0 0 14px 0', fontSize: '0.92rem', lineHeight: '1.5', color: '#4B5563' }}>
            {message || 'Hệ thống phát hiện đang có tiến trình Crawl cũ chưa hoàn tất hoặc bị khóa ngầm.'}
          </p>

          <div style={{
            backgroundColor: '#FAF6F0',
            borderLeft: '4px solid #7B5233',
            padding: '12px 14px',
            borderRadius: '6px',
            fontSize: '0.86rem',
            color: '#7B5233',
            lineHeight: '1.45'
          }}>
            Bạn có muốn <strong>HỦY TIẾN TRÌNH CŨ</strong> và <strong>KHỞI CHẠY NGAY PHIÊN CRAWL MỚI</strong> không?
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          backgroundColor: '#FAF6F0',
          borderTop: '1px solid #EADCC9',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#4B5563',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)'
            }}
          >
            <RefreshCw size={16} />
            BUỘC DỪNG & KHỞI CHẠY LẠI
          </button>
        </div>
      </div>
    </div>
  );
};

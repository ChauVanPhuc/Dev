import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const ISORevisionLogModal = ({
  isOpen,
  onClose,
  onConfirm,
  totalPages = 3,
  currentLogs = [],
  loading = false,
  initialNote = ''
}) => {
  const [note, setNote] = useState('');
  const [pageMode, setPageMode] = useState('all'); // 'all' | 'custom'
  const [selectedPages, setSelectedPages] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const nextSeq = useMemo(() => {
    const count = (currentLogs || []).length;
    return String(count + 1).padStart(2, '0');
  }, [currentLogs]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }, []);

  const safeTotalPages = Math.max(1, totalPages || 3);
  const availablePagesList = useMemo(() => {
    return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
  }, [safeTotalPages]);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote || '');
      setPageMode('all');
      setSelectedPages([]);
      setErrorMsg('');
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const togglePage = (pageNum) => {
    setSelectedPages(prev => {
      if (prev.includes(pageNum)) {
        return prev.filter(p => p !== pageNum);
      } else {
        return [...prev, pageNum].sort((a, b) => a - b);
      }
    });
    setErrorMsg('');
  };

  const handleSelectAllPages = () => {
    setPageMode('all');
    setSelectedPages([]);
    setErrorMsg('');
  };

  const handleSelectCustomPages = () => {
    setPageMode('custom');
    if (selectedPages.length === 0) {
      setSelectedPages([1]);
    }
    setErrorMsg('');
  };

  const computePageNoString = () => {
    if (pageMode === 'all') {
      return 'Toàn bộ';
    }
    if (selectedPages.length === 0) {
      return 'Toàn bộ';
    }
    if (selectedPages.length === safeTotalPages) {
      return 'Toàn bộ';
    }
    return `Trang ${selectedPages.join(', ')}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập nội dung sửa đổi để lưu lại lịch sử theo dõi.');
      return;
    }

    if (pageMode === 'custom' && selectedPages.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một trang sửa đổi.');
      return;
    }

    const pageNoResult = computePageNoString();
    onConfirm({
      revisionNote: trimmed,
      revisionPageNo: pageNoResult
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      backdropFilter: 'blur(3px)',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
        border: '1.5px solid #7B5233',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.15s ease-out'
      }}>
        {/* Header Modal */}
        <div style={{
          backgroundColor: '#FAF6F0',
          padding: '12px 18px',
          borderBottom: '1.5px solid #7B5233',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#7B5233" />
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '0.92rem',
                fontWeight: '700',
                color: '#7B5233',
                textTransform: 'uppercase',
                letterSpacing: '0.4px'
              }}>
                Ghi nhận lịch sử sửa đổi tài liệu
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                Lần sửa đổi thứ <strong>{nextSeq}</strong> &bull; Ngày: <strong>{todayStr}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#6B7280',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {errorMsg && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.80rem',
              color: '#B91C1C',
              fontWeight: 600
            }}>
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ô 1: Nội dung sửa đổi */}
          <div>
            <label style={{
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#374151',
              display: 'block',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              Nội dung sửa đổi <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              autoFocus
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              rows={3}
              placeholder="Nhập chi tiết nội dung đã thay đổi (Ví dụ: Cập nhật bước 3.2, bổ sung checklist kiểm tra độ ẩm, sửa đổi lưu đồ...)"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '5px',
                border: '1px solid #D1D5DB',
                fontSize: '0.84rem',
                color: '#111827',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.45',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF'
              }}
            />
            <span style={{ fontSize: '0.70rem', color: '#6B7280', display: 'block', marginTop: '3px' }}>
              Nội dung này sẽ được ghi nhận vào cột <strong>"Nội Dung Sửa Đổi"</strong> trên Trang 2 của tài liệu.
            </span>
          </div>

          {/* Ô 2: Số trang chỉnh sửa */}
          <div>
            <label style={{
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#374151',
              display: 'block',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              Trang số sửa đổi <span style={{ color: '#DC2626' }}>*</span>
            </label>

            {/* Chế độ chọn: Toàn bộ vs Từng trang */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAllPages}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '5px',
                  border: pageMode === 'all' ? '1.5px solid #7B5233' : '1px solid #D1D5DB',
                  backgroundColor: pageMode === 'all' ? '#FAF6F0' : '#FFFFFF',
                  color: pageMode === 'all' ? '#7B5233' : '#4B5563',
                  fontSize: '0.80rem',
                  fontWeight: pageMode === 'all' ? '700' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                {pageMode === 'all' && <CheckCircle2 size={14} color="#7B5233" />}
                Toàn bộ tài liệu
              </button>

              <button
                type="button"
                onClick={handleSelectCustomPages}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '5px',
                  border: pageMode === 'custom' ? '1.5px solid #7B5233' : '1px solid #D1D5DB',
                  backgroundColor: pageMode === 'custom' ? '#FAF6F0' : '#FFFFFF',
                  color: pageMode === 'custom' ? '#7B5233' : '#4B5563',
                  fontSize: '0.80rem',
                  fontWeight: pageMode === 'custom' ? '700' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                {pageMode === 'custom' && <CheckCircle2 size={14} color="#7B5233" />}
                Chọn trang cụ thể (Tài liệu có {safeTotalPages} trang)
              </button>
            </div>

            {/* Danh sách các nút chọn trang cụ thể (chỉ lấy trang thực tế) */}
            {pageMode === 'custom' && (
              <div style={{
                backgroundColor: '#F9FAFB',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#4B5563', fontWeight: 600 }}>
                  Click để chọn/bỏ chọn các trang bạn đã sửa đổi:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {availablePagesList.map(pageNum => {
                    const isSelected = selectedPages.includes(pageNum);
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => togglePage(pageNum)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? '700' : '500',
                          border: isSelected ? '1px solid #7B5233' : '1px solid #D1D5DB',
                          backgroundColor: isSelected ? '#7B5233' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#374151',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        {isSelected && <CheckCircle2 size={12} color="#FFFFFF" />}
                        Trang {pageNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nhãn xem trước kết quả sẽ ghi vào bảng */}
            <div style={{
              marginTop: '6px',
              padding: '6px 10px',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
              fontSize: '0.75rem',
              color: '#374151',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Giá trị cột "Trang Số":</span>
              <strong style={{ color: '#7B5233' }}>{computePageNoString()}</strong>
            </div>
          </div>

          {/* Footer nút hành động */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '8px',
            paddingTop: '12px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '7px 16px',
                borderRadius: '5px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#4B5563',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '7px 20px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(123, 82, 51, 0.2)'
              }}
            >
              {loading ? 'Đang lưu...' : 'Xác nhận & Lưu quy trình'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ISORevisionLogModal;

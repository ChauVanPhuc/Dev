import React, { useState, useEffect } from 'react';
import { X, Search, CheckSquare } from 'lucide-react';

// Cửa sổ danh sách các sự cố và hành động khắc phục CAPA
export const ActionItemsModal = ({ isOpen = false, onClose, actionItems = [] }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = actionItems.filter(item => {
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (item.capa_code && item.capa_code.toLowerCase().includes(s)) ||
      (item.issue_title && item.issue_title.toLowerCase().includes(s)) ||
      (item.stage && item.stage.toLowerCase().includes(s)) ||
      (item.owner && item.owner.toLowerCase().includes(s)) ||
      (item.batch_no && item.batch_no.toLowerCase().includes(s))
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CLOSED':
        return <span style={{ color: '#15803D', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.67rem' }}>Đã hoàn thành</span>;
      case 'IN_PROGRESS':
        return <span style={{ color: '#AD8057', backgroundColor: '#FAF3EC', border: '1px solid #E8E2DC', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.67rem' }}>Đang khắc phục</span>;
      case 'OPEN':
        return <span style={{ color: '#78716C', backgroundColor: '#F8F9FB', border: '1px solid #E8E2DC', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.67rem' }}>Chờ duyệt</span>;
      case 'OVERDUE':
        return <span style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.67rem' }}>Quá hạn SLA</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tiêu đề cửa sổ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: '#FAF8F5',
            borderBottom: '1.5px solid #EADCC9'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={18} style={{ color: '#5B3924' }} />
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1E293B' }}>
                Danh sách hành động khắc phục phòng ngừa (CAPA)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Theo dõi tiến độ xử lý sự cố chất lượng theo quy trình ISO 9001
              </div>
            </div>
          </div>

          <button
            type="button"
            className="page-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px'
            }}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Bộ lọc trạng thái và tìm kiếm */}
        <div style={{ padding: '8px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="filter" style={{ position: 'relative', width: '280px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm mã CAPA, vấn đề, công đoạn, Lô..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '30px',
                paddingLeft: '30px',
                paddingRight: '10px',
                border: '1px solid #D9C8B4',
                borderRadius: '6px',
                fontSize: '0.74rem',
                outline: 'none',
                background: '#FAF8F5'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {['ALL', 'OVERDUE', 'OPEN', 'IN_PROGRESS', 'CLOSED'].map(st => (
              <button
                key={st}
                type="button"
                className="page-btn"
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: filterStatus === st ? '1px solid #5B3924' : '1px solid #EADCC9',
                  backgroundColor: filterStatus === st ? '#FAF3EC' : '#FFFFFF',
                  color: filterStatus === st ? '#5B3924' : '#64748B',
                  fontWeight: filterStatus === st ? '700' : '500',
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
              >
                {st === 'ALL' ? 'Tất cả' : (st === 'OVERDUE' ? 'Quá hạn' : (st === 'OPEN' ? 'Chờ duyệt' : (st === 'IN_PROGRESS' ? 'Đang làm' : 'Đã xong')))}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 18px 12px 18px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', marginTop: '8px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1.5px solid #EADCC9' }}>
                <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Mã CAPA</th>
                <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Vấn đề cần xử lý</th>
                <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Lô kiểm tra</th>
                <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Công đoạn</th>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Mức độ</th>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Trạng thái</th>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Thời hạn</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px 10px', textAlign: 'center', color: '#64748B', fontSize: '0.78rem' }}>
                    Không có sự cố CAPA phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{ borderBottom: '1px solid #F1F5F9' }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: '800', color: '#5B3924' }}>
                      {item.capa_code}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1E293B' }}>
                      {item.issue_title}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>
                      {item.batch_no}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: '600', color: '#5B3924' }}>
                      {item.stage}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.67rem',
                          fontWeight: '700',
                          color: item.severity === 'Critical' ? '#B91C1C' : '#C58A4B'
                        }}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {getStatusBadge(item.status)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: item.status === 'OVERDUE' ? '#B91C1C' : '#475569', fontWeight: item.status === 'OVERDUE' ? '700' : '400' }}>
                      {item.deadline}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActionItemsModal;


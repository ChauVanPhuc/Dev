import React, { useState, useEffect } from 'react';
import { X, Search, FileText, AlertCircle } from 'lucide-react';
import api from '@webShared/Services/api.service';

export const DrillDownInspectionModal = ({
  isOpen = false,
  onClose,
  defect = null,
  stage = '',
  preset = 'all',
  startDate = '',
  endDate = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchDrillDownRecords = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const params = new URLSearchParams();
        if (defect?.defect_id) params.append('defect_id', defect.defect_id);
        else if (defect?.defect_name) params.append('defect_name', defect.defect_name);
        if (stage && stage !== 'all') params.append('stage', stage);
        if (preset !== 'all' && startDate) params.append('start_date', startDate);
        if (preset !== 'all' && endDate) params.append('end_date', endDate);
        params.append('limit', '100');

        const res = await api.get(`/inspections/daily?${params.toString()}`);
        const data = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
        if (isMounted) {
          setRecords(data);
        }
      } catch (err) {
        console.error('[DrillDownModal] Error fetching records:', err);
        if (isMounted) {
          setRecords([]);
          setErrorMsg(err?.response?.data?.detail || 'Không thể tải danh sách chứng từ kiểm tra từ máy chủ.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDrillDownRecords();
    return () => { isMounted = false; };
  }, [isOpen, defect, stage, preset, startDate, endDate]);

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

  const defectName = defect?.defect_name || defect?.name || 'Chi tiết';
  const defectCode = defect?.defect_code || defect?.code || '';

  const filteredRecords = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.batch_no && r.batch_no.toLowerCase().includes(s)) ||
      (r.pallet_code && r.pallet_code.toLowerCase().includes(s)) ||
      (r.stage_name && r.stage_name.toLowerCase().includes(s)) ||
      (r.inspector_name && r.inspector_name.toLowerCase().includes(s))
    );
  });

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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
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
            <FileText size={18} style={{ color: '#5B3924' }} />
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1E293B' }}>
                Chứng từ kiểm tra phát sinh lỗi: <span style={{ color: '#5B3924' }}>{defectName}</span>
                {defectCode && <span style={{ color: '#64748B', fontWeight: '600', marginLeft: '6px' }}>({defectCode})</span>}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '1px' }}>
                {stage ? `Công đoạn: ${stage} | ` : ''}Dữ liệu liên kết nguồn từ daily_inspection_records
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
              padding: '4px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div style={{ padding: '8px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="filter" style={{ position: 'relative', width: '280px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm theo Lô, Pallet, Công đoạn..."
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
          <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '600' }}>
            Tìm thấy: <strong style={{ color: '#1E293B' }}>{filteredRecords.length}</strong> phiếu
          </span>
        </div>

        {/* Bảng dữ liệu */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 18px 12px 18px' }}>
          {errorMsg && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                color: '#991B1B',
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
              Đang tải danh sách phiếu kiểm tra...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
              {errorMsg ? 'Chưa có dữ liệu hiển thị' : 'Không tìm thấy phiếu kiểm tra phù hợp'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1.5px solid #EADCC9' }}>
                  <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Mã phiếu / Lô</th>
                  <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Mã Pallet</th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Ngày KT</th>
                  <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Công đoạn</th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Tổng SP</th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Số lỗi</th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>Tỷ lệ</th>
                  <th style={{ textAlign: 'left', verticalAlign: 'middle', padding: '8px 8px', color: '#5B3924', fontWeight: '700', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>QC kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, i) => (
                  <tr
                    key={r.id || i}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.1s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF8F5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1E293B' }}>
                      {r.batch_no || `REC-${r.id}`}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>
                      {r.pallet_code || '---'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155', textAlign: 'center' }}>
                      {r.inspection_date ? String(r.inspection_date) : '---'}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: '600', color: '#5B3924' }}>
                      {r.stage_name}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#1E293B' }}>
                      {Number(r.total_products || 0).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', color: '#B91C1C' }}>
                      {Number(r.total_defects || 0).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#5B3924' }}>
                      {r.defect_rate !== undefined ? `${Number(r.defect_rate).toFixed(2)}%` : '---'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569', fontSize: '0.72rem' }}>
                      {r.inspector_name || 'QC'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrillDownInspectionModal;


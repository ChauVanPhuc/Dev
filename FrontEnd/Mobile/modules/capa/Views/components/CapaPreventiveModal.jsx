import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronDown } from 'lucide-react';
import apiClient from '@shared/services/api';

/**
 * CapaPreventiveModal Component (CL10.5: Thêm kế hoạch phòng ngừa)
 * Cập nhật:
 * 1. Nút đóng [X] nằm sát góc trên bên phải (marginLeft: 'auto')
 * 2. Cân bằng 100% chiều cao 2 ô "Thời gian hoàn thành" & "Người xử lý" (height: 40px)
 * 3. Tải danh sách tài khoản thực tế động từ Database (/accounts/?limit=500)
 */
const CapaPreventiveModal = ({ isOpen, onClose, onConfirm, initialData = null, staffList = [] }) => {
  const [actionText, setActionText] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [deadline, setDeadline] = useState('');
  const [performer, setPerformer] = useState('');
  const [staffs, setStaffs] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Tải danh sách nhân sự thực từ API Database hệ thống
  useEffect(() => {
    const loadStaffsFromDB = async () => {
      if (staffList && staffList.length > 0) {
        setStaffs(staffList);
        if (!performer && staffList.length > 0) {
          setPerformer(staffList[0].value || staffList[0].full_name || '');
        }
        return;
      }
      
      setLoadingStaff(true);
      try {
        const accResp = await apiClient.get('/accounts/?limit=500');
        const accData = accResp.data?.items || accResp.data || [];
        if (Array.isArray(accData) && accData.length > 0) {
          const list = accData
            .filter(u => u.full_name || u.username)
            .map(u => ({
              label: u.full_name ? `${u.full_name} (${u.username})` : u.username,
              value: u.full_name || u.username
            }));
          
          if (list.length > 0) {
            setStaffs(list);
            if (!performer && list.length > 0) {
              setPerformer(list[0].value);
            }
            setLoadingStaff(false);
            return;
          }
        }
      } catch (e) {
        console.error('Lỗi khi tải accounts cho PreventiveModal:', e);
      } finally {
        setLoadingStaff(false);
      }
    };

    if (isOpen) {
      loadStaffsFromDB();
    }
  }, [isOpen, staffList]);

  useEffect(() => {
    if (initialData) {
      setActionText(initialData.action || '');
      setExpectedResult(initialData.expected_result || '');
      setDeadline(initialData.deadline || '');
      setPerformer(initialData.performer || (staffs[0]?.value || ''));
    } else {
      setActionText('');
      setExpectedResult('');
      const today = new Date();
      const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setDeadline(formattedDate);
      if (staffs.length > 0 && !performer) {
        setPerformer(staffs[0].value);
      }
    }
  }, [initialData, isOpen, staffs]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!actionText.trim()) return;

    onConfirm({
      action: actionText,
      expected_result: expectedResult,
      deadline: deadline,
      performer: performer
    });
    onClose();
  };

  const handleClear = () => {
    setActionText('');
    setExpectedResult('');
    setDeadline('');
    if (staffs.length > 0) {
      setPerformer(staffs[0].value);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      zIndex: 2500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'modalSlideUp 0.2s ease-out'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Nút X nằm sát góc phải trên */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>
            CL10.5: Thêm kế hoạch phòng ngừa
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#1e293b',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Inner Form Box */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#fff'
          }}>

            {/* Hành động cụ thể */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#334155' }}>
                Hành động cụ thể <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Nhập mô tả hành động cụ thể..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minWidth: 0,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  color: '#1e293b',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Kết quả/ Tiêu chí đánh giá */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#334155' }}>
                Kết quả/ Tiêu chí đánh giá <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={2}
                required
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="Nhập tiêu chí đánh giá mong đợi..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minWidth: 0,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  color: '#1e293b',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Grid 2 cột bằng nhau 100%: Thời gian hoàn thành & Người xử lý */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', alignItems: 'start' }}>
              
              {/* Thời gian hoàn thành */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#334155' }}>
                  Thời gian hoàn thành <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative', width: '100%', height: '40px' }}>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0,
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      lineHeight: '1.2',
                      backgroundColor: '#fff',
                      color: '#1e293b',
                      fontWeight: '600',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Người xử lý (Dropdown dữ liệu DB thực) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#334155' }}>
                  Người xử lý <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative', width: '100%', height: '40px' }}>
                  <select
                    value={performer}
                    onChange={(e) => setPerformer(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0,
                      padding: '0 28px 0 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      lineHeight: '1.2',
                      backgroundColor: '#fff',
                      color: '#1e293b',
                      fontWeight: '600',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {loadingStaff ? (
                      <option value="">Đang tải DB...</option>
                    ) : staffs.length === 0 ? (
                      <option value="Ngô Diễm My">Ngô Diễm My</option>
                    ) : (
                      staffs.map((s, idx) => (
                        <option key={idx} value={s.value || s}>{s.label || s}</option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={16} color="#475569" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

            </div>

          </div>

          {/* Action Buttons: Xóa vs Xác nhận */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #432818',
                backgroundColor: '#fff',
                color: '#432818',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer'
              }}
            >
              Xóa
            </button>
            <button
              type="submit"
              style={{
                flex: 1.5,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#432818',
                color: '#fff',
                fontWeight: '800',
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(67, 40, 24, 0.2)'
              }}
            >
              Xác nhận
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CapaPreventiveModal;

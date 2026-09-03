import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Save, UserCheck, ShieldAlert } from 'lucide-react';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

/**
 * Modal KPIViolationFormModal (Tab 4 Dashboard - Xem Chi Tiết / Tạo Mới / Cập Nhật Biên Bản Vi Phạm QC)
 * Dữ liệu nhân sự được load 100% ĐỘNG từ Database API `/quality-employees` và `/hr/employees`
 */
const KPIViolationFormModal = ({ isOpen, onClose, violationData, onSave }) => {
  if (!isOpen) return null;

  const [dbEmployees, setDbEmployees] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    code: `VP-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
    emp: '',
    dept: 'Tổ Sơn Mạ',
    rule: '',
    severity: 'Nặng',
    score: -15,
    date: new Date().toISOString().slice(0, 10),
    reporter: 'QC Lead',
    status: 'Đã duyệt',
    note: ''
  });

  // Load danh sách nhân sự thực tế từ DB khi mở modal
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/quality-employees/?size=1000').catch(() => null);
        if (res && res.items && Array.isArray(res.items)) {
          setDbEmployees(res.items);
        } else {
          const hrRes = await api.get('/hr/employees?page=1&size=1000').catch(() => null);
          if (hrRes && hrRes.items && Array.isArray(hrRes.items)) {
            setDbEmployees(hrRes.items);
          }
        }
      } catch (err) {
        console.error('Lỗi load danh sách nhân sự từ DB:', err);
      }
    };

    fetchEmployees();
  }, [isOpen]);

  useEffect(() => {
    if (violationData) {
      setFormData({
        code: violationData.code || `VP-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
        emp: violationData.emp || violationData.staff_name || '',
        dept: violationData.dept || violationData.department || 'Tổ Sơn Mạ',
        rule: violationData.rule || violationData.issue || '',
        severity: Math.abs(violationData.score || 15) >= 15 ? 'Nặng' : (Math.abs(violationData.score || 10) >= 10 ? 'Vừa' : 'Nhẹ'),
        score: violationData.score !== undefined ? violationData.score : -15,
        date: violationData.date || new Date().toISOString().slice(0, 10),
        reporter: violationData.reporter || violationData.reporter_name || 'QC Lead',
        status: violationData.status || 'Đã duyệt',
        note: violationData.note || ''
      });
      let parsedImgs = [];
      if (violationData.evidence_images) {
        try {
          parsedImgs = typeof violationData.evidence_images === 'string' ? JSON.parse(violationData.evidence_images) : violationData.evidence_images;
        } catch (e) {
          parsedImgs = [violationData.evidence_images];
        }
      } else if (violationData.imagesList) {
        parsedImgs = violationData.imagesList;
      }
      setPhotos(Array.isArray(parsedImgs) ? parsedImgs : []);
    } else {
      setFormData({
        code: `VP-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
        emp: '',
        dept: 'Tổ Sơn Mạ',
        rule: '',
        severity: 'Nặng',
        score: -15,
        date: new Date().toISOString().slice(0, 10),
        reporter: 'QC Lead',
        status: 'Đã duyệt',
        note: ''
      });
      setPhotos([]);
    }
  }, [violationData, isOpen]);

  const handleAddPhoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        const res = await api.post('/awards-discipline/upload-image', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res && res.path) {
          setPhotos(prev => [...prev, res.path]);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => setPhotos(prev => [...prev, reader.result]);
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error("Lỗi upload ảnh:", err);
        const reader = new FileReader();
        reader.onloadend = () => setPhotos(prev => [...prev, reader.result]);
        reader.readAsDataURL(file);
      } finally {
        setUploading(false);
      }
    }
    e.target.value = null;
  };

  const handleSeverityChange = (newSeverity) => {
    let newScore = -15;
    if (newSeverity === 'Vừa') newScore = -10;
    if (newSeverity === 'Nhẹ') newScore = -5;
    if (newSeverity === 'Rất nặng') newScore = -20;
    
    setFormData(prev => ({
      ...prev,
      severity: newSeverity,
      score: newScore
    }));
  };

  const handleEmpSelect = (e) => {
    const selectedVal = e.target.value;
    const matched = dbEmployees.find(emp => (emp.employee_name || emp.full_name || emp.name) === selectedVal || emp.employee_id === selectedVal);
    
    if (matched) {
      setFormData(prev => ({
        ...prev,
        emp: matched.employee_name || matched.full_name || matched.name,
        dept: matched.department || matched.dept_name || prev.dept
      }));
    } else {
      setFormData(prev => ({ ...prev, emp: selectedVal }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ...formData,
        evidence_images: photos,
        id: violationData ? violationData.id : Date.now()
      });
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', boxSizing: 'border-box'
    }} onClick={onClose}>
      
      <div style={{
        margin: 'auto', backgroundColor: '#FFFFFF', borderRadius: '12px',
        width: '100%', maxWidth: '600px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden', border: '1px solid #EADCC9'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF6F0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} style={{ color: '#DC2626' }} />
            <h3 style={{ margin: 0, fontSize: '1.08rem', color: '#5D3B32', fontWeight: '800' }}>
              {violationData ? '📋 HT08.1: Chi Tiết & Chỉnh Sửa Biên Bản Vi Phạm QC' : '⚠️ HT08.1: Ghi Nhận Biên Bản Vi Phạm QC Mới'}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Mã biên bản vi phạm
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontSize: '0.82rem', fontWeight: '800', color: '#5D3B32', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Ngày vi phạm / Ghi nhận *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Nhân sự vi phạm (Chọn từ DB) *
              </label>
              <input
                type="text"
                list="db_employee_datalist"
                value={formData.emp}
                onChange={handleEmpSelect}
                placeholder="Chọn nhân sự từ DB hoặc nhập tên..."
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                required
              />
              <datalist id="db_employee_datalist">
                {dbEmployees.map((emp, i) => (
                  <option key={emp.id || i} value={emp.employee_name || emp.full_name || emp.name}>
                    {emp.employee_id ? `${emp.employee_id} - ` : ''}{emp.department ? `(${emp.department})` : ''}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Bộ phận / Tổ sản xuất *
              </label>
              <input
                type="text"
                value={formData.dept}
                onChange={(e) => setFormData(prev => ({ ...prev, dept: e.target.value }))}
                placeholder="Ví dụ: Tổ Sơn Mạ"
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Hành vi vi phạm / Mô tả lỗi QC *
            </label>
            <textarea
              rows={3}
              value={formData.rule}
              onChange={(e) => setFormData(prev => ({ ...prev, rule: e.target.value }))}
              placeholder="Mô tả chi tiết quy trình hoặc thao tác vi phạm..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', color: '#DC2626', fontWeight: '600' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Mức độ vi phạm *
              </label>
              <select
                value={formData.severity}
                onChange={(e) => handleSeverityChange(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FFFFFF', fontWeight: '700' }}
              >
                <option value="Nhẹ">Nhẹ (-5 điểm)</option>
                <option value="Vừa">Vừa (-10 điểm)</option>
                <option value="Nặng">Nặng (-15 điểm)</option>
                <option value="Rất nặng">Rất nặng (-20 điểm)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Số điểm trừ KPI *
              </label>
              <input
                type="number"
                value={formData.score}
                onChange={(e) => setFormData(prev => ({ ...prev, score: Number(e.target.value) }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: '900', color: '#DC2626', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Người phát hiện / Lập *
              </label>
              <input
                type="text"
                value={formData.reporter}
                onChange={(e) => setFormData(prev => ({ ...prev, reporter: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Trạng thái biên bản
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FFFFFF', fontWeight: '700' }}
            >
              <option value="Đã duyệt">Đã duyệt (Trừ điểm vào tổng điểm KPI)</option>
              <option value="Chờ duyệt">Chờ duyệt (Đang thẩm tra từ Trưởng QC)</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '6px 16px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 20px', border: 'none', borderRadius: '6px', backgroundColor: '#5D3B32', color: '#FFFFFF', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              <Save size={14} /> {violationData ? 'Cập Nhật Biên Bản' : 'Lưu Biên Bản Vào DB'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default KPIViolationFormModal;

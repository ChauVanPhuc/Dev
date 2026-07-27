import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Save, X, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

/**
 * ViolationFormView (HT08.1 — Trang chi tiết / Tạo mới báo cáo vi phạm)
 * Màn hình trang riêng biệt (Full Page) thay vì Side Panel / Popup.
 */
const ViolationFormView = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/violations');

  // Form state
  const [formData, setFormData] = useState({
    rule_code: '',
    rule_name: '',
    employee_id: '',
    staff_name: '',
    department: '',
    position: '',
    section: '',
    severity: 'Trung bình',
    points: 0,
    violation_time: '',
    reporter_name: '',
    description: '',
    note: '',
    status: 'pending'
  });

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dropdown options
  const [staffOptions, setStaffOptions] = useState([]);
  const [ruleOptions, setRuleOptions] = useState([]);

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(isEdit ? 'Chỉnh sửa vi phạm' : 'Thêm mới vi phạm');
    if (setCustomSubtitle) setCustomSubtitle('HT08.1: Thông tin vi phạm');
    if (setCustomScreenCode) setCustomScreenCode('HT08.1');
  }, [isEdit, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  useEffect(() => {
    fetchDropdowns();
    if (isEdit) {
      fetchDetail();
    } else {
      const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      const now = new Date();
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} | ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      setFormData(prev => ({
        ...prev,
        reporter_name: user.full_name || user.username || '',
        violation_time: formattedTime
      }));
    }
  }, [id]);

  const fetchDropdowns = async () => {
    try {
      const staffData = await api.get('/kpi-management/employees');
      if (Array.isArray(staffData)) {
        setStaffOptions(staffData.map(s => ({
          label: s.full_name,
          value: s.full_name,
          employee_id: s.employee_id,
          department: s.department,
          position: s.position,
          section: s.section
        })));
      }
    } catch (err) { console.error(err); }

    try {
      const rulesData = await api.get('/kpi-management/point-rules');
      if (Array.isArray(rulesData)) {
        setRuleOptions(rulesData.map(r => ({
          label: r.content,
          value: r.content,
          rule_code: r.rule_code,
          points: r.points,
          impact: r.impact
        })));
      }
    } catch (err) { console.error(err); }
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/awards-discipline/${id}`);
      setFormData({
        rule_code: data.rule_code || '',
        rule_name: data.rule_name || data.issue || '',
        employee_id: data.employee_id || '',
        staff_name: data.staff_name || '',
        department: data.department || '',
        position: data.position || '',
        section: data.section || '',
        severity: data.severity || data.impact || 'Trung bình',
        points: data.points || 0,
        violation_time: data.violation_time || data.date || '',
        reporter_name: data.reporter_name || '',
        description: data.description || '',
        note: data.note || '',
        status: data.status || 'pending'
      });
      if (data.evidence_images) {
        try {
          const parsed = JSON.parse(data.evidence_images);
          if (Array.isArray(parsed)) {
            setPhotos(parsed.map((url, idx) => ({ id: idx, url })));
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể tải thông tin vi phạm.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffChange = (staffName) => {
    const staff = staffOptions.find(s => s.value === staffName);
    setFormData(prev => ({
      ...prev,
      staff_name: staffName,
      employee_id: staff?.employee_id || '',
      department: staff?.department || prev.department,
      position: staff?.position || prev.position,
      section: staff?.section || prev.section
    }));
  };

  const handleRuleChange = (ruleName) => {
    const rule = ruleOptions.find(r => r.value === ruleName);
    setFormData(prev => ({
      ...prev,
      rule_name: ruleName,
      rule_code: rule?.rule_code || '',
      severity: rule?.impact || prev.severity,
      points: rule ? Math.abs(rule.points) : prev.points
    }));
  };

  const handleAddPhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotos(prev => [...prev, { id: Date.now(), url: URL.createObjectURL(file), file }]);
      toast('success', 'Đã thêm hình ảnh.');
    }
    e.target.value = null;
  };

  const handleRemovePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.staff_name || !formData.rule_name) {
      toast('error', 'Vui lòng chọn tên nhân sự và tên quy tắc vi phạm.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
      
      const payload = {
        staff_name: formData.staff_name,
        issue: formData.rule_name,
        note: formData.note,
        impact: formData.severity,
        points: formData.points,
        date: formattedDate,
        evidence_images: JSON.stringify(photos.map(p => p.url)),
        rule_code: formData.rule_code,
        rule_name: formData.rule_name,
        severity: formData.severity,
        employee_id: formData.employee_id,
        department: formData.department,
        position: formData.position,
        section: formData.section,
        violation_time: formData.violation_time,
        reporter_name: formData.reporter_name,
        description: formData.description,
        status: formData.status
      };

      if (isEdit) {
        await api.put(`/awards-discipline/${id}`, payload);
        toast('success', 'Cập nhật thông tin vi phạm thành công.');
      } else {
        await api.post('/awards-discipline/', payload);
        toast('success', 'Tạo mới báo cáo vi phạm thành công.');
      }

      navigate('/admin/violations');
    } catch (err) {
      console.error(err);
      toast('error', 'Lỗi khi lưu thông tin vi phạm.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">
        {/* Main Form Card */}
        <div className="card" style={{ background: '#fff', padding: '24px 30px', borderRadius: '16px', border: '1px solid #EADCC9', boxShadow: '0 4px 12px rgba(123,82,51,0.05)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#7B5233', fontWeight: '700' }}>Đang tải thông tin...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                
                {/* Row 1: Quy tắc */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Mã quy tắc
                  </label>
                  <input
                    type="text"
                    value={formData.rule_code}
                    readOnly
                    placeholder="Mã tự động theo quy tắc"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', color: '#64748b', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Tên quy tắc <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.rule_name}
                    onChange={(e) => handleRuleChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#fff', color: '#1e293b', boxSizing: 'border-box' }}
                  >
                    <option value="">Chọn quy tắc vi phạm</option>
                    {ruleOptions.map((opt, idx) => (
                      <option key={opt.rule_code || idx} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row 2: Nhân sự */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Mã nhân sự
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    readOnly
                    placeholder="Mã nhân sự"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', color: '#64748b', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Tên nhân sự <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.staff_name}
                    onChange={(e) => handleStaffChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#fff', color: '#1e293b', boxSizing: 'border-box' }}
                  >
                    <option value="">Chọn nhân sự vi phạm</option>
                    {staffOptions.map((opt, idx) => (
                      <option key={opt.employee_id || idx} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row 3: Thời gian & Người ghi nhận */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Thời gian ghi nhận
                  </label>
                  <input
                    type="text"
                    value={formData.violation_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, violation_time: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Người ghi nhận
                  </label>
                  <input
                    type="text"
                    value={formData.reporter_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, reporter_name: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

              </div>

              {/* Mô tả */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Mô tả chi tiết
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Nhập mô tả sự việc vi phạm..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Ghi chú */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Ghi chú
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Nhập ghi chú hoặc nhắc nhở..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Hình ảnh bằng chứng */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Hình ảnh bằng chứng
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '80px', height: '80px', borderRadius: '12px',
                      backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s ease', gap: '4px'
                    }}
                  >
                    <ImageIcon size={22} color="#94a3b8" />
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Tải ảnh</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleAddPhoto}
                  />

                  {photos.map(photo => (
                    <div key={photo.id} style={{ width: '80px', height: '80px', borderRadius: '12px', position: 'relative', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        style={{
                          position: 'absolute', top: '4px', right: '4px',
                          background: '#fff', borderRadius: '50%', border: 'none',
                          width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                        }}
                      >
                        <X size={12} color="#ef4444" strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => navigate('/admin/violations')}
                  style={{
                    padding: '10px 24px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', backgroundColor: '#fff',
                    color: '#475569', fontWeight: '700', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px', borderRadius: '8px',
                    border: 'none', backgroundColor: '#7B5233',
                    color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Save size={16} /> {saving ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViolationFormView;

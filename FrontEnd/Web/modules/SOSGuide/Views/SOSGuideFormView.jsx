import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Save, Sparkles, FileText } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

const THEME = {
  primary: '#7B5233',
  hover: '#5D3B32',
  bgLight: '#FAF6F0',
  borderLight: '#EADCC9',
  pageBg: '#FAF8F6'
};

const SOSGuideFormView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/sos-guides/create');

  const [form, setForm] = useState({
    code: '',
    name: '',
    doc_type: 'SOS',
    description: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
    return () => {
      if (setCustomTitle) setCustomTitle(null);
      if (setCustomSubtitle) setCustomSubtitle(null);
      if (setCustomScreenCode) setCustomScreenCode(null);
    };
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  // Tự động sinh mã G7.CL.SOS.xxx từ API backend
  const generateUniqueCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await api.get('/inspection-guides/next-code?doc_type=SOS');
      if (res?.code) {
        setForm(prev => ({ ...prev, code: res.code }));
        return;
      }
      throw new Error('Không lấy được mã từ server');
    } catch (err) {
      setForm(prev => ({ ...prev, code: 'G7.CL.SOS.001' }));
    } finally {
      setGeneratingCode(false);
    }
  };

  useEffect(() => {
    generateUniqueCode();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      if (toast) toast('warning', 'Vui lòng nhập Mã và Tên Hướng dẫn thao tác (SOS).');
      return;
    }

    setSaving(true);
    try {
      const created = await api.post('/inspection-guides', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        doc_type: 'SOS',
        description: form.description?.trim() || null
      });

      if (toast) toast('success', `Đã khởi tạo SOS "${form.code}" thành công! Đang chuyển sang trang thiết lập bước thao tác...`);
      navigate(`/admin/sos-guides/edit/${created.id}`);
    } catch (err) {
      console.error('Lỗi tạo SOS:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi tạo Hướng dẫn thao tác.');
      setSaving(false);
    }
  };

  return (
    <div
      className="guide-management-container"
      style={{
        padding: '32px 20px',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: THEME.pageBg,
        minHeight: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto'
      }}
    >
      <div style={{ width: '100%', maxWidth: 760, margin: '0 auto' }}>
        {/* Card Form */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: `1.5px solid ${THEME.borderLight}`,
          padding: '36px 40px',
          boxShadow: '0 12px 36px rgba(123, 82, 51, 0.08)'
        }}>
          {/* Card Header inside Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            paddingBottom: 20,
            marginBottom: 26,
            borderBottom: `1.5px solid ${THEME.borderLight}`
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: THEME.bgLight,
              border: `1px solid ${THEME.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: THEME.primary,
              flexShrink: 0
            }}>
              <FileText size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#2D1A12' }}>
                Tạo mới Hướng dẫn thao tác (SOS)
              </h2>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 3, fontWeight: 500 }}>
                Bảng phân tích thao tác chuẩn (Standard Operating Sheet) cho công nhân tại từng vị trí, từng công đoạn.
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Field 1: Mã SOS */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontWeight: 700, color: THEME.primary, fontSize: 13, textTransform: 'uppercase' }}>
                  Mã tài liệu * (SOS)
                </label>
                <button
                  type="button"
                  onClick={generateUniqueCode}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: THEME.primary,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Sparkles size={13} /> {generatingCode ? 'Đang sinh mã...' : 'Tự sinh mã mới'}
                </button>
              </div>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="VD: G7.CL.SOS.001"
                required
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: '#1E293B',
                  backgroundColor: THEME.bgLight,
                  textTransform: 'uppercase'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = THEME.primary; e.currentTarget.style.backgroundColor = '#FFF'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = THEME.bgLight; }}
              />
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Định dạng quy chuẩn cho SOS: <strong>G7.CL.SOS.xxx</strong> (Ví dụ: G7.CL.SOS.001)
              </div>
            </div>

            {/* Field 2: Tên Hướng dẫn thao tác */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: THEME.primary, fontSize: 13, textTransform: 'uppercase' }}>
                Tên Hướng dẫn thao tác *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="VD: Hướng dẫn thao tác căn chỉnh cữ máy phay mộng dương"
                required
                maxLength={250}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: '#1E293B',
                  backgroundColor: '#FFF'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = THEME.primary; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
              />
            </div>

            {/* Field 3: Vị trí & Phạm vi áp dụng */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: '#64748B', fontSize: 13, textTransform: 'uppercase' }}>
                Vị trí & Phạm vi áp dụng
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={1000}
                placeholder="VD: Áp dụng tại Công đoạn Tinh Chế - Chuyền 2, Nhà máy Amanda..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 14,
                  lineHeight: '1.5',
                  color: '#334155',
                  backgroundColor: '#FFF'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = THEME.primary; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
              />
            </div>

            {/* Field 4: Trạng thái kích hoạt */}
            <div style={{
              marginBottom: 28,
              padding: '14px 18px',
              backgroundColor: THEME.bgLight,
              borderRadius: 12,
              border: `1px solid ${THEME.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>Trạng thái áp dụng</div>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>Kích hoạt ngay hướng dẫn thao tác này trong hệ thống vận hành.</div>
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13.5,
                fontWeight: 700,
                color: form.is_active ? '#15803D' : '#64748B',
                padding: '6px 12px',
                backgroundColor: form.is_active ? '#DCFCE7' : '#F1F5F9',
                borderRadius: 20
              }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  style={{ accentColor: THEME.primary }}
                />
                {form.is_active ? 'Đang áp dụng' : 'Tạm ngưng'}
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate('/admin/sos-guides')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={saving || generatingCode}
                style={{
                  padding: '12px 28px',
                  backgroundColor: THEME.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(123, 82, 51, 0.25)',
                  transition: 'all 0.2s',
                  opacity: saving ? 0.7 : 1
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = THEME.hover; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = THEME.primary; }}
              >
                <Save size={18} />
                {saving ? 'Đang tạo...' : 'Lưu & Sang phần Thiết lập Bước & Ảnh'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SOSGuideFormView;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Save, Sparkles, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

const CODE_PRESETS = [
  { code: 'SOP-IQC-01', name: 'KT Nguyên liệu gỗ nhập kho' },
  { code: 'SOP-DO-AM-01', name: 'Quy trình đo độ ẩm gỗ sấy' },
  { code: 'SOP-BAM-DINH-01', name: 'Kiểm tra độ bám dính sơn' },
  { code: 'SOP-FAI-01', name: 'Kiểm tra mẫu đầu tiên chuyền ráp' },
  { code: 'SOP-OQC-01', name: 'Kiểm tra sau đóng gói xuất kho' }
];

const InspectionGuideFormView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleApplyPreset = (preset) => {
    setForm(prev => ({
      ...prev,
      code: preset.code,
      name: prev.name || preset.name
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      if (toast) toast('warning', 'Vui lòng điền mã và tên tài liệu SOP.');
      return;
    }

    setSaving(true);
    try {
      const created = await api.post('/inspection-guides', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description?.trim() || null
      });

      if (toast) toast('success', `Đã khởi tạo SOP "${form.code}" thành công! Đang chuyển sang trang biên soạn các bước...`);
      // Navigate straight to the detail studio to build steps
      navigate(`/admin/inspection-guides/edit/${created.id}`);
    } catch (err) {
      console.error('Lỗi tạo hướng dẫn:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi tạo hướng dẫn kiểm tra.');
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif', backgroundColor: '#FAF8F6', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 760 }}>
        {/* Top Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24
        }}>
          <button
            onClick={() => navigate('/admin/inspection-guides')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid #EADCC9',
              backgroundColor: '#FFFFFF',
              color: '#7B5233',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5EFE9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7B5233', fontSize: 13, fontWeight: 700 }}>
              <BookOpen size={16} /> QUẢN LÝ TIÊU CHUẨN CHẤT LƯỢNG
            </div>
            <h1 style={{ margin: '2px 0 0 0', fontSize: '1.6rem', color: '#2D1A12', fontWeight: 800 }}>
              Khởi tạo Tài liệu Hướng dẫn kiểm tra mới
            </h1>
          </div>
        </div>

        {/* Main Card Form */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #EADCC9',
          padding: 32,
          boxShadow: '0 10px 30px rgba(123, 82, 51, 0.06)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* Field 1: Mã hướng dẫn & Presets */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: '#7B5233', fontSize: 13, textTransform: 'uppercase' }}>
                Mã tài liệu SOP *
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="VD: SOP-IQC-01"
                required
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #D1D5DB',
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: '#2D1A12',
                  backgroundColor: '#FAF8F6',
                  textTransform: 'uppercase'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FFF'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
              />

              {/* Quick Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>Gợi ý mẫu:</span>
                {CODE_PRESETS.map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.color = '#7B5233'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#475569'; }}
                  >
                    {p.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 2: Tên hướng dẫn */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: '#7B5233', fontSize: 13, textTransform: 'uppercase' }}>
                Tên quy trình / Hướng dẫn kiểm tra *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="VD: Hướng dẫn kiểm tra quy cách ngoại quan phôi gỗ Sồi"
                required
                maxLength={250}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #D1D5DB',
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: '#2D1A12',
                  backgroundColor: '#FAF8F6'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FFF'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
              />
            </div>

            {/* Field 3: Mô tả */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: '#64748B', fontSize: 13, textTransform: 'uppercase' }}>
                Mô tả chi tiết / Mục đích quy trình
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={1000}
                placeholder="Nhập phạm vi áp dụng, thiết bị cần chuẩn bị, hoặc lưu ý an toàn lao động..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #D1D5DB',
                  fontSize: 14,
                  lineHeight: '1.5',
                  color: '#374151',
                  backgroundColor: '#FAF8F6'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FFF'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
              />
            </div>

            {/* Field 4: Trạng thái hoạt động */}
            <div style={{
              marginBottom: 28,
              padding: '14px 18px',
              backgroundColor: '#FAF8F6',
              borderRadius: 12,
              border: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#2D1A12' }}>Trạng thái kích hoạt</div>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>Cho phép hiển thị và áp dụng SOP này ngay trên xưởng.</div>
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13.5,
                fontWeight: 700,
                color: form.is_active ? '#065F46' : '#991B1B',
                padding: '6px 12px',
                backgroundColor: form.is_active ? '#D1FAE5' : '#FEE2E2',
                borderRadius: 20
              }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  style={{ accentColor: '#059669' }}
                />
                {form.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate('/admin/inspection-guides')}
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
                disabled={saving}
                style={{
                  padding: '12px 28px',
                  backgroundColor: '#7B5233',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(123, 82, 51, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5D3E26'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#7B5233'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Save size={18} />
                {saving ? 'Đang khởi tạo...' : 'Tạo SOP & Tiếp tục soạn các bước →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InspectionGuideFormView;

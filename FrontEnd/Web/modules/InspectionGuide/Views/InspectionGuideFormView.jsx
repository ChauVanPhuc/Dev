import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams, useOutletContext } from 'react-router-dom';
import { Save, BookOpen, FileText, AlertTriangle, Sparkles } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const DOC_TYPE_OPTIONS = [
  {
    key: 'HDKT',
    label: 'Hướng dẫn kiểm tra (HDKT)',
    codePrefix: 'G7.CL.HDKT.',
    badge: 'HDKT',
    color: '#7B5233',
    bg: '#FAF6F0',
    border: '#EADCC9',
    icon: BookOpen,
    desc: 'Quy chuẩn, danh mục các bước thực hiện và ảnh minh họa tiêu chuẩn kiểm định chất lượng QA/QC.'
  },
  {
    key: 'SOS',
    label: 'Hướng dẫn thao tác (SOS)',
    codePrefix: 'G7.CL.SOS.',
    badge: 'SOS',
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    icon: FileText,
    desc: 'Bảng phân tích thao tác chuẩn (Standard Operating Sheet) cho công nhân tại từng vị trí, từng công đoạn.'
  },
  {
    key: 'CTQ',
    label: 'Lỗi cần chú ý (CTQ)',
    codePrefix: 'G7.CL.CTQ.',
    badge: 'CTQ',
    color: '#E11D48',
    bg: '#FFF1F2',
    border: '#FECDD3',
    icon: AlertTriangle,
    desc: 'Điểm kiểm soát chất lượng trọng yếu (Critical To Quality) và danh sách các lỗi nguy cơ cao cần chú ý.'
  }
];

const InspectionGuideFormView = ({ initialDocType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title: metaTitle, subtitle: metaSubtitle } = useScreenMetadataCached('/admin/inspection-guides/create');

  const detectedDocType = useMemo(() => {
    if (initialDocType && ['HDKT', 'SOS', 'CTQ'].includes(initialDocType)) return initialDocType;
    const pathname = location.pathname.toLowerCase();
    if (pathname.includes('/sos-guides')) return 'SOS';
    if (pathname.includes('/ctq-guides')) return 'CTQ';
    const queryType = searchParams.get('doc_type') || searchParams.get('type');
    if (queryType && ['HDKT', 'SOS', 'CTQ'].includes(queryType)) return queryType;
    return 'HDKT';
  }, [initialDocType, location.pathname, searchParams]);

  const [form, setForm] = useState({
    code: '',
    name: '',
    doc_type: detectedDocType,
    description: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Synchronize form doc_type if route changes
  useEffect(() => {
    setForm(prev => ({ ...prev, doc_type: detectedDocType }));
  }, [detectedDocType]);

  const currentOpt = DOC_TYPE_OPTIONS.find(o => o.key === form.doc_type) || DOC_TYPE_OPTIONS[0];

  // Set top header title if PortalLayout provides it
  useEffect(() => {
    if (screenCode && metaTitle) {
      if (setCustomTitle) setCustomTitle(metaTitle);
      if (setCustomSubtitle) setCustomSubtitle(metaSubtitle || 'Khởi tạo mới');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    } else {
      if (setCustomTitle) setCustomTitle(currentOpt.label);
      if (setCustomSubtitle) setCustomSubtitle('Khởi tạo mới');
      if (setCustomScreenCode) setCustomScreenCode('HD02');
    }
  }, [screenCode, metaTitle, metaSubtitle, currentOpt, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Tự động sinh Mã tài liệu theo tiền tố của doc_type từ API backend
  const generateUniqueCode = async (docType) => {
    const type = docType || detectedDocType || 'HDKT';
    setGeneratingCode(true);
    try {
      const res = await api.get(`/inspection-guides/next-code?doc_type=${type}`);
      if (res?.code) {
        setForm(prev => ({ ...prev, code: res.code }));
        return;
      }
      throw new Error('Không lấy được mã từ server');
    } catch (err) {
      // Fallback cục bộ
      const prefix = type === 'SOS' ? 'G7.CL.SOS.' : type === 'CTQ' ? 'G7.CL.CTQ.' : 'G7.CL.HDKT.';
      setForm(prev => ({ ...prev, code: `${prefix}001` }));
    } finally {
      setGeneratingCode(false);
    }
  };

  useEffect(() => {
    generateUniqueCode(form.doc_type);
  }, [form.doc_type]);

  const getBackUrl = () => {
    if (form.doc_type === 'SOS') return '/admin/sos-guides';
    if (form.doc_type === 'CTQ') return '/admin/ctq-guides';
    return '/admin/inspection-guides';
  };

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
      if (toast) toast('warning', 'Vui lòng điền mã và tên tài liệu ban hành.');
      return;
    }

    setSaving(true);
    try {
      const created = await api.post('/inspection-guides', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        doc_type: form.doc_type,
        description: form.description?.trim() || null
      });

      const opt = DOC_TYPE_OPTIONS.find(o => o.key === form.doc_type) || DOC_TYPE_OPTIONS[0];
      if (toast) toast('success', `Đã khởi tạo ${opt.badge} "${form.code}" thành công! Đang chuyển sang trang biên soạn...`);
      
      if (form.doc_type === 'SOS') {
        navigate(`/admin/sos-guides/edit/${created.id}`);
      } else if (form.doc_type === 'CTQ') {
        navigate(`/admin/ctq-guides/edit/${created.id}`);
      } else {
        navigate(`/admin/inspection-guides/edit/${created.id}`);
      }
    } catch (err) {
      console.error('Lỗi tạo tài liệu:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi tạo tài liệu ban hành.');
      setSaving(false);
    }
  };

  return (
    <div
      className="guide-management-container"
      style={{
        padding: '32px 20px',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#FAF8F6',
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
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: `1.5px solid ${currentOpt.border}`,
          padding: '36px 40px',
          boxShadow: `0 12px 36px ${currentOpt.color}15`
        }}>
          {/* Card Header inside Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            paddingBottom: 20,
            marginBottom: 26,
            borderBottom: `1.5px solid ${currentOpt.border}`
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: currentOpt.bg,
              border: `1px solid ${currentOpt.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentOpt.color,
              flexShrink: 0
            }}>
              {React.createElement(currentOpt.icon || BookOpen, { size: 24 })}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#2D1A12' }}>
                Tạo mới {currentOpt.label}
              </h2>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 3, fontWeight: 500 }}>
                {currentOpt.desc}
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            {/* Field 1: Mã tài liệu */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontWeight: 700, color: currentOpt.color, fontSize: 13, textTransform: 'uppercase' }}>
                  Mã tài liệu * ({currentOpt.badge})
                </label>
                <button
                  type="button"
                  onClick={() => generateUniqueCode(form.doc_type)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: currentOpt.color,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Sparkles size={13} /> Tự sinh mã mới
                </button>
              </div>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder={`VD: ${currentOpt.codePrefix}001`}
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
                onFocus={e => { e.currentTarget.style.borderColor = currentOpt.color; e.currentTarget.style.backgroundColor = '#FFF'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
              />
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Định dạng quy chuẩn cho {currentOpt.badge}: <strong>{currentOpt.codePrefix}xxx</strong> (Ví dụ: {currentOpt.codePrefix}001)
              </div>
            </div>

            {/* Field 2: Tên quy trình / Hướng dẫn */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: currentOpt.color, fontSize: 13, textTransform: 'uppercase' }}>
                {form.doc_type === 'SOS' ? 'Tên Hướng dẫn thao tác *' : form.doc_type === 'CTQ' ? 'Tên Tiêu chuẩn Lỗi cần chú ý *' : 'Tên Hướng dẫn kiểm tra *'}
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={
                  form.doc_type === 'SOS'
                    ? "VD: Hướng dẫn thao tác căn chỉnh cữ máy phay mộng dương"
                    : form.doc_type === 'CTQ'
                    ? "VD: Các điểm lỗi chất lượng trọng yếu công đoạn ghép finger & ép ván"
                    : "VD: Hướng dẫn kiểm tra quy cách ngoại quan phôi gỗ Sồi"
                }
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
                onFocus={e => { e.currentTarget.style.borderColor = currentOpt.color; e.currentTarget.style.backgroundColor = '#FFF'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
              />
            </div>

            {/* Field 3: Mô tả chi tiết / Phạm vi áp dụng */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: '#64748B', fontSize: 13, textTransform: 'uppercase' }}>
                Mô tả chi tiết / Vị trí & Phạm vi áp dụng
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={1000}
                placeholder={
                  form.doc_type === 'SOS'
                    ? "VD: Áp dụng tại Công đoạn Tinh Chế - Chuyền 2. Dành cho công nhân bậc 2 trở lên. Yêu cầu đeo kính bảo hộ và găng tay chống cắt..."
                    : "Nhập phạm vi áp dụng, thiết bị cần chuẩn bị, hoặc lưu ý an toàn lao động..."
                }
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
                onFocus={e => { e.currentTarget.style.borderColor = currentOpt.color; e.currentTarget.style.backgroundColor = '#FFF'; }}
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
                <div style={{ fontSize: 12.5, color: '#64748B' }}>Cho phép hiển thị và áp dụng tài liệu này ngay trên xưởng.</div>
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
                onClick={() => navigate(getBackUrl())}
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
                  backgroundColor: currentOpt.color,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: `0 4px 14px ${currentOpt.color}40`,
                  transition: 'all 0.2s',
                  opacity: saving ? 0.7 : 1
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.filter = 'brightness(0.9)'; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.filter = 'brightness(1)'; }}
              >
                <Save size={18} />
                {saving ? 'Đang tạo...' : 'Lưu & Sang phần Soạn thảo các bước'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InspectionGuideFormView;

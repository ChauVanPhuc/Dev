import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, Save, Layers, ShieldCheck, Tag } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

export const INSPECTION_TYPE_OPTIONS = [
  {
    value: 'first_sample',
    label: 'Kiểm tra mẫu lần đầu',
    desc: 'Phiếu kiểm tra sản phẩm mẫu đầu chuyền trước khi sản xuất (/production_v2/inspection)',
    badge: 'Mẫu lần đầu'
  },
  {
    value: 're_inspect',
    label: 'Kiểm tra lại',
    desc: 'Phiếu tái kiểm tra các lô sản phẩm khắc phục/xử lý lại (/production_v2/inspection)',
    badge: 'Kiểm tra lại'
  },
  {
    value: 'parameter',
    label: 'Kiểm tra thông số',
    desc: 'Phiếu đo đạc và kiểm tra các thông số kỹ thuật (độ ẩm, nhiệt độ...) (/production_v2/inspection)',
    badge: 'Thông số'
  },
  {
    value: 'process',
    label: 'Kiểm tra quy trình',
    desc: 'Phiếu kiểm soát tuân thủ quy trình công đoạn sản xuất (/production_v2/inspection)',
    badge: 'Quy trình'
  },
  {
    value: 'qa',
    label: 'Vấn đáp',
    desc: 'Phiếu vấn đáp và đánh giá kiến thức nghiệp vụ QA/QC (/production_v2/inspection)',
    badge: 'Vấn đáp'
  },
  {
    value: 'input_inspection',
    label: 'Nhập kho nguyên liệu (IQC)',
    desc: 'Kiểm tra gỗ phôi, ván MDF, phụ kiện kim khí, vật tư đầu vào',
    badge: 'IQC Đầu vào'
  },
  {
    value: 'packaging_inspection',
    label: 'Sau đóng gói (OQC)',
    desc: 'Kiểm tra bao bì đóng gói, tem nhãn trước khi xuất xưởng',
    badge: 'OQC Đóng gói'
  }
];

export const NORMALIZE_MAP = {
  'dau-vao': 'input_inspection',
  'dau_vao': 'input_inspection',
  'sau-dong-goi': 'packaging_inspection',
  'sau_dong_goi': 'packaging_inspection',
  'mau-dau-tien': 'first_sample',
  'mau_dau_tien': 'first_sample',
  'quy-trinh': 'process',
  'quy_trinh': 'process',
  'do-am': 'parameter',
  'bam-dinh': 'parameter',
  'thong_so': 'parameter',
  'kiem_tra_lai': 're_inspect',
  're-inspect': 're_inspect',
  'van_dap': 'qa',
};

const GuideAssignmentTab = ({ guideId, initialAssignments = [], onSaved }) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const normalized = (initialAssignments || []).map(a => ({
      ...a,
      inspection_type: NORMALIZE_MAP[a.inspection_type] || a.inspection_type || 'first_sample'
    }));
    setAssignments(normalized);
  }, [initialAssignments]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [stagesRes, prodsRes] = await Promise.allSettled([
          api.get('/stages/').catch(() => api.get('/stages')),
          api.get('/products?limit=100').catch(() => null)
        ]);
        if (stagesRes.status === 'fulfilled' && stagesRes.value) {
          setStages(Array.isArray(stagesRes.value) ? stagesRes.value : (stagesRes.value?.items || []));
        }
        if (prodsRes.status === 'fulfilled' && prodsRes.value) {
          setProducts(Array.isArray(prodsRes.value) ? prodsRes.value : (prodsRes.value?.items || []));
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu dropdown:', err);
      }
    };
    fetchDropdowns();
  }, []);

  const handleAddAssignment = () => {
    // Find first unused type
    const usedTypes = new Set(assignments.map(a => a.inspection_type));
    const available = INSPECTION_TYPE_OPTIONS.find(opt => !usedTypes.has(opt.value));
    const defaultType = available ? available.value : INSPECTION_TYPE_OPTIONS[0].value;

    setAssignments(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        inspection_type: defaultType,
        product_id: null,
        category_id: null,
        stage_id: null,
        is_active: true
      }
    ]);
  };

  const handleRemoveAssignment = (index) => {
    setAssignments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleChange = (index, field, value) => {
    setAssignments(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        [field]: value === '' ? null : (field === 'is_active' ? Boolean(value) : (field === 'stage_id' || field === 'product_id' ? (value ? Number(value) : null) : value))
      };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        assignments: assignments.map(a => ({
          inspection_type: a.inspection_type,
          product_id: a.product_id || null,
          category_id: a.category_id || null,
          stage_id: a.stage_id || null,
          is_active: a.is_active !== false
        }))
      };

      await api.post(`/inspection-guides/${guideId}/assign`, payload);
      if (toast) toast('success', 'Đã lưu cấu hình liên kết loại phiếu kiểm tra thành công!');
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Lỗi lưu gán loại phiếu:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi lưu cấu hình liên kết');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      border: '1px solid #EADCC9',
      padding: 24,
      boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)'
    }}>
      {/* Header section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '1px solid #F1F5F9'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#2D1A12', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#7B5233" /> Cấu hình Liên kết Loại phiếu Kiểm tra
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: 13.5 }}>
            Chỉ định hướng dẫn SOP này sẽ tự động xuất hiện khi công nhân/QC mở loại phiếu kiểm tra nào trên xưởng.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleAddAssignment}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1.5px solid #7B5233',
              backgroundColor: '#FAF8F6',
              color: '#7B5233',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7B5233'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FAF8F6'; e.currentTarget.style.color = '#7B5233'; }}
          >
            <Plus size={16} /> Thêm liên kết mới
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#7B5233',
              color: '#FFF',
              fontWeight: 700,
              fontSize: 13,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 2px 6px rgba(123, 82, 51, 0.2)'
            }}
          >
            <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình liên kết'}
          </button>
        </div>
      </div>

      {/* Assignment List */}
      {assignments.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: '#FAF8F6',
          borderRadius: 12,
          border: '1.5px dashed #EADCC9'
        }}>
          <Tag size={40} style={{ color: '#8D6E63', opacity: 0.4, marginBottom: 10 }} />
          <h4 style={{ margin: '0 0 6px 0', color: '#2D1A12', fontWeight: 700 }}>Chưa có liên kết loại phiếu nào</h4>
          <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: 13.5, maxWidth: 460, marginInline: 'auto' }}>
            Hướng dẫn này chưa được gán cho bất kỳ loại phiếu kiểm tra nào. Hãy bấm "Thêm liên kết mới" để kích hoạt trên ứng dụng Mobile QC.
          </p>
          <button
            type="button"
            onClick={handleAddAssignment}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              backgroundColor: '#7B5233',
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            + Thêm liên kết đầu tiên
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assignments.map((item, idx) => {
            const selectedOpt = INSPECTION_TYPE_OPTIONS.find(o => o.value === item.inspection_type);
            return (
              <div
                key={item.id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px, 1.4fr) minmax(180px, 1fr) minmax(180px, 1fr) 120px 48px',
                  gap: 12,
                  alignItems: 'center',
                  padding: 14,
                  backgroundColor: '#FAF8F6',
                  borderRadius: 12,
                  border: '1px solid #EADCC9',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Field 1: Loại phiếu kiểm tra */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7B5233', textTransform: 'uppercase', marginBottom: 4 }}>
                    Loại phiếu kiểm tra *
                  </label>
                  <select
                    value={item.inspection_type || ''}
                    onChange={e => handleChange(idx, 'inspection_type', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFF',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#2D1A12'
                    }}
                  >
                    {INSPECTION_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {selectedOpt && (
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                      {selectedOpt.desc}
                    </div>
                  )}
                </div>

                {/* Field 2: Công đoạn áp dụng (Tùy chọn) */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                    Công đoạn áp dụng
                  </label>
                  <select
                    value={item.stage_id || ''}
                    onChange={e => handleChange(idx, 'stage_id', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFF',
                      fontSize: 13,
                      color: '#374151'
                    }}
                  >
                    <option value="">Tất cả công đoạn</option>
                    {stages.map(stg => (
                      <option key={stg.id} value={stg.id}>
                        {stg.name || stg.stage_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 3: Sản phẩm áp dụng (Tùy chọn) */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                    Sản phẩm áp dụng
                  </label>
                  <select
                    value={item.product_id || ''}
                    onChange={e => handleChange(idx, 'product_id', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFF',
                      fontSize: 13,
                      color: '#374151'
                    }}
                  >
                    <option value="">Tất cả sản phẩm</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.code ? `[${prod.code}] ` : ''}{prod.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 4: Trạng thái */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                    Trạng thái
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: item.is_active !== false ? '#065F46' : '#991B1B',
                    padding: '6px 8px',
                    backgroundColor: item.is_active !== false ? '#D1FAE5' : '#FEE2E2',
                    borderRadius: 6,
                    width: 'fit-content'
                  }}>
                    <input
                      type="checkbox"
                      checked={item.is_active !== false}
                      onChange={e => handleChange(idx, 'is_active', e.target.checked)}
                      style={{ accentColor: '#059669' }}
                    />
                    {item.is_active !== false ? 'Bật' : 'Tắt'}
                  </label>
                </div>

                {/* Field 5: Xóa */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(idx)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: '1px solid #FEE2E2',
                      backgroundColor: '#FFF',
                      color: '#DC2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="Xóa liên kết này"
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#DC2626'; e.currentTarget.style.color = '#FFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF'; e.currentTarget.style.color = '#DC2626'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GuideAssignmentTab;

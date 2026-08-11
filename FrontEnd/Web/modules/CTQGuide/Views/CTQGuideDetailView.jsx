import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Trash2, Image as ImageIcon, Upload, Eye, CheckCircle2,
  AlertTriangle, X, Sparkles, Layers, Info, Check, Search, Tag, FileText
} from 'lucide-react';
import api, { getFullImageUrl } from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import '@styles/components.css';

const THEME = {
  primary: '#7B5233',
  hover: '#5D3B32',
  bgLight: '#FAF6F0',
  borderLight: '#EADCC9',
  pageBg: '#FAF8F6'
};

const DEFAULT_STAGES = [
  "Định hình 1",
  "Định hình ván",
  "Lắp ráp, chà nhám",
  "Sơn hoàn thiện",
  "Sơn Pallet",
  "Sơn treo",
  "Đóng gói thành phẩm",
  "Kiểm tra đầu vào (IQC)"
];

const parseStageAndDesc = (description) => {
  if (!description) return { stage: '', cleanDesc: '' };
  const match = description.match(/^\[Công đoạn:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return {
      stage: match[1].trim(),
      cleanDesc: match[2].trim()
    };
  }
  return { stage: '', cleanDesc: description };
};

const CTQGuideDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingGuide, setSavingGuide] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form Thông tin Lỗi cần chú ý (CTQ)
  const [guideForm, setGuideForm] = useState({
    code: '',
    stage: '',
    name: '',
    description: '',
    is_active: true
  });

  // Danh sách công đoạn & danh mục lỗi
  const [stages, setStages] = useState([]);
  const [defects, setDefects] = useState([]);
  const [showDefectPicker, setShowDefectPicker] = useState(false);
  const [defectSearch, setDefectSearch] = useState('');

  // Modals & Preview
  const [deleteImageTarget, setDeleteImageTarget] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchGuideData();
    fetchDropdowns();
  }, [id]);

  const fetchDropdowns = async () => {
    try {
      const [stagesRes, defectsRes] = await Promise.allSettled([
        api.get('/stages/').catch(() => api.get('/stages')),
        api.get('/inspections/defect-types?include_inactive=false')
      ]);

      if (stagesRes.status === 'fulfilled' && stagesRes.value) {
        const rawStages = Array.isArray(stagesRes.value) ? stagesRes.value : (stagesRes.value?.items || []);
        const stageNames = rawStages.map(s => s.name || s.stage_name || s).filter(Boolean);
        setStages(Array.from(new Set([...stageNames, ...DEFAULT_STAGES])));
      } else {
        setStages(DEFAULT_STAGES);
      }

      if (defectsRes.status === 'fulfilled' && defectsRes.value) {
        const rawDefects = Array.isArray(defectsRes.value) ? defectsRes.value : (defectsRes.value?.items || []);
        setDefects(rawDefects);
      }
    } catch (err) {
      console.warn('Lỗi tải dropdowns:', err);
    }
  };

  const fetchGuideData = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/inspection-guides/${id}`);
      setGuide(data);
      const { stage, cleanDesc } = parseStageAndDesc(data.description);
      setGuideForm({
        code: data.code || '',
        stage: stage || '',
        name: data.name || '',
        description: cleanDesc || '',
        is_active: data.is_active !== false
      });
    } catch (err) {
      console.error('Lỗi tải chi tiết CTQ:', err);
      if (toast) toast('error', 'Không tìm thấy tài liệu Lỗi cần chú ý (CTQ).');
    } finally {
      setLoading(false);
    }
  };

  // Đảm bảo CTQ có ít nhất 1 step ngầm để lưu trữ hình ảnh
  const ensurePrimaryStep = async (currentGuide) => {
    if (currentGuide?.steps && currentGuide.steps.length > 0) {
      return currentGuide.steps[0];
    }
    try {
      const newStep = await api.post(`/inspection-guides/${id}/steps`, {
        step_no: 1,
        title: guideForm.name || 'Ảnh mẫu đối chứng CTQ',
        content: guideForm.description || ''
      });
      const updated = {
        ...currentGuide,
        steps: [{ ...newStep, images: [] }]
      };
      setGuide(updated);
      return newStep;
    } catch (e) {
      console.error('Lỗi khởi tạo step ngầm:', e);
      return null;
    }
  };

  // Cập nhật thông tin CTQ
  const handleSaveGuideInfo = async () => {
    setSavingGuide(true);
    try {
      let fullDesc = guideForm.description?.trim() || '';
      if (guideForm.stage) {
        fullDesc = `[Công đoạn: ${guideForm.stage}] ${fullDesc}`.trim();
      }

      const updated = await api.put(`/inspection-guides/${id}`, {
        name: guideForm.name.trim(),
        description: fullDesc || null,
        is_active: guideForm.is_active
      });

      // Cập nhật ngầm step 1 nếu có
      if (guide?.steps && guide.steps.length > 0) {
        try {
          await api.put(`/inspection-guides/${id}/steps/${guide.steps[0].id}`, {
            title: guideForm.name.trim(),
            content: guideForm.description?.trim() || ''
          });
        } catch (stepErr) {
          console.warn('Lỗi cập nhật step ngầm:', stepErr);
        }
      }

      setGuide(prev => ({ ...prev, ...updated }));
      if (toast) toast('success', 'Đã lưu thông tin tài liệu CTQ thành công!');
    } catch (err) {
      console.error('Lỗi cập nhật CTQ:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi cập nhật tài liệu.');
    } finally {
      setSavingGuide(false);
    }
  };

  // Tải ảnh mẫu đối chứng lên CTQ (hỗ trợ file input, kéo thả, paste Ctrl+V)
  const handleUploadImageFile = async (file) => {
    if (!file) return;

    const primaryStep = await ensurePrimaryStep(guide);
    if (!primaryStep) {
      if (toast) toast('error', 'Không thể kết nối kho lưu trữ ảnh CTQ.');
      return;
    }

    const currentImages = primaryStep.images || [];
    if (currentImages.length >= 20) {
      if (toast) toast('warning', 'Mỗi CTQ chỉ được đính kèm tối đa 20 ảnh mẫu đối chứng.');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const newImg = await api.post(`/inspection-guides/${id}/steps/${primaryStep.id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setGuide(prev => {
        const step0 = prev?.steps?.[0] || primaryStep;
        const updatedStep = {
          ...step0,
          images: [...(step0.images || []), newImg]
        };
        return {
          ...prev,
          steps: [updatedStep, ...(prev?.steps?.slice(1) || [])]
        };
      });

      if (toast) toast('success', 'Đã tải ảnh mẫu đối chứng lên thành công!');
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
      if (toast) toast('error', 'Lỗi khi tải ảnh đối chứng lên hệ thống.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Bắt sự kiện Paste Ctrl+V dán ảnh trực tiếp từ bộ nhớ tạm
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          handleUploadImageFile(blob);
          break;
        }
      }
    }
  };

  // Bắt sự kiện Kéo Thả ảnh vào vùng chứa
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleUploadImageFile(file);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Xóa ảnh đối chứng
  const handleDeleteImage = async () => {
    if (!deleteImageTarget || !guide?.steps?.[0]) return;
    const stepId = guide.steps[0].id;
    try {
      await api.delete(`/inspection-guides/${id}/steps/${stepId}/images/${deleteImageTarget.id}`);
      setGuide(prev => ({
        ...prev,
        steps: prev.steps.map(s => {
          if (s.id !== stepId) return s;
          return { ...s, images: (s.images || []).filter(img => img.id !== deleteImageTarget.id) };
        })
      }));
      if (toast) toast('success', 'Đã xóa ảnh mẫu đối chứng.');
      setDeleteImageTarget(null);
    } catch (err) {
      console.error('Lỗi xóa ảnh:', err);
      if (toast) toast('error', 'Lỗi khi xóa ảnh đối chứng.');
    }
  };

  // Chọn nhanh lỗi từ danh mục lỗi hệ thống
  const handleSelectDefectFromGlossary = (defect) => {
    const displayName = defect.code ? `[${defect.code}] ${defect.name}` : defect.name;
    const desc = defect.description || `Tiêu chuẩn kiểm soát và phòng ngừa lỗi: ${defect.name}`;

    let suggestedStage = guideForm.stage;
    if (!suggestedStage && defect.stage) {
      try {
        const parsed = typeof defect.stage === 'string' && defect.stage.startsWith('[') ? JSON.parse(defect.stage) : [defect.stage];
        if (Array.isArray(parsed) && parsed.length > 0) {
          suggestedStage = parsed[0];
        }
      } catch (e) {
        suggestedStage = defect.stage;
      }
    }

    setGuideForm(prev => ({
      ...prev,
      name: displayName,
      description: desc,
      stage: suggestedStage || prev.stage
    }));
    setShowDefectPicker(false);
    if (toast) toast('info', `Đã chọn lỗi: ${defect.name}`);
  };

  // Lấy danh sách tất cả ảnh của CTQ
  const images = (guide?.steps || []).reduce((acc, st) => [...acc, ...(st.images || [])], []);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
        Đang tải thông tin tài liệu CTQ...
      </div>
    );
  }

  return (
    <div
      className="guide-management-container"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        padding: '24px 32px',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: THEME.pageBg,
        minHeight: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/admin/ctq-guides')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1px solid ${THEME.borderLight}`,
              backgroundColor: '#FFFFFF',
              color: THEME.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            title="Quay lại danh sách CTQ"
            onMouseEnter={e => e.currentTarget.style.borderColor = THEME.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = THEME.borderLight}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              Tài liệu ban hành / Lỗi cần chú ý (CTQ) / Chi tiết tài liệu
            </div>
            <h1 style={{ margin: '2px 0 0 0', fontSize: '1.45rem', color: '#1E293B', fontWeight: 800 }}>
              Lỗi cần chú ý: {guideForm.code}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Trạng thái Switch */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', backgroundColor: '#FFFFFF', padding: '8px 14px', borderRadius: 10, border: `1px solid ${THEME.borderLight}` }}>
            <input
              type="checkbox"
              checked={guideForm.is_active}
              onChange={e => setGuideForm(prev => ({ ...prev, is_active: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: THEME.primary, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: guideForm.is_active ? '#059669' : '#64748B' }}>
              {guideForm.is_active ? 'Đang áp dụng' : 'Tạm ngưng'}
            </span>
          </label>

          {/* Nút Lưu thông tin */}
          <button
            type="button"
            onClick={handleSaveGuideInfo}
            disabled={savingGuide}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              backgroundColor: THEME.primary,
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(123, 82, 51, 0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.hover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = THEME.primary}
          >
            <Save size={18} /> {savingGuide ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* Card 1: Thông tin Lỗi cần chú ý (CTQ) */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: `1.5px solid ${THEME.borderLight}`,
        padding: '20px 24px',
        marginBottom: 20,
        boxShadow: '0 4px 14px rgba(123, 82, 51, 0.04)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '180px 240px 1fr',
          gap: 16,
          marginBottom: 16,
          alignItems: 'start'
        }}>
          {/* Mã CTQ */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: THEME.primary, textTransform: 'uppercase', marginBottom: 4 }}>
              1. Mã tài liệu (CTQ)
            </label>
            <div style={{
              padding: '9px 12px',
              borderRadius: 8,
              backgroundColor: THEME.bgLight,
              border: `1px solid ${THEME.borderLight}`,
              fontWeight: 800,
              color: THEME.primary,
              fontFamily: 'monospace',
              fontSize: 14
            }}>
              {guideForm.code || '---'}
            </div>
          </div>

          {/* Công đoạn */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: THEME.primary, textTransform: 'uppercase', marginBottom: 4 }}>
              2. Công đoạn áp dụng *
            </label>
            <select
              value={guideForm.stage}
              onChange={e => setGuideForm(prev => ({ ...prev, stage: e.target.value }))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFF',
                fontWeight: 600,
                color: '#334155',
                fontSize: 13.5
              }}
            >
              <option value="">-- Chọn công đoạn --</option>
              {stages.map((stg, i) => (
                <option key={i} value={stg}>{stg}</option>
              ))}
            </select>
          </div>

          {/* Tên Lỗi CTQ */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: THEME.primary, textTransform: 'uppercase' }}>
                3. Tên Lỗi cần chú ý (CTQ) *
              </label>
              <button
                type="button"
                onClick={() => setShowDefectPicker(prev => !prev)}
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
                <Tag size={13} /> {showDefectPicker ? 'Đóng danh mục' : 'Chọn từ Danh mục lỗi'}
              </button>
            </div>
            <input
              type="text"
              value={guideForm.name}
              onChange={e => setGuideForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nhập tên lỗi hoặc chọn từ danh mục lỗi..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFF',
                fontWeight: 700,
                color: '#1E293B',
                boxSizing: 'border-box',
                fontSize: 13.5
              }}
            />
          </div>
        </div>

        {/* Drawer / Popover chọn lỗi từ danh mục nếu mở */}
        {showDefectPicker && (
          <div style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 12,
            backgroundColor: THEME.bgLight,
            border: `1.5px solid ${THEME.borderLight}`
          }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Tìm lỗi theo mã hoặc tên để áp dụng vào CTQ này..."
                value={defectSearch}
                onChange={e => setDefectSearch(e.target.value)}
                style={{ flex: 1, padding: '7px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
              />
            </div>
            <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {defects
                .filter(d => !defectSearch || (d.name && d.name.toLowerCase().includes(defectSearch.toLowerCase())) || (d.code && d.code.toLowerCase().includes(defectSearch.toLowerCase())))
                .map(d => (
                  <div
                    key={d.id}
                    onClick={() => handleSelectDefectFromGlossary(d)}
                    style={{
                      padding: '7px 12px',
                      backgroundColor: '#FFF',
                      borderRadius: 6,
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12.5,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = THEME.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                  >
                    <div>
                      <strong style={{ color: THEME.primary, marginRight: 6 }}>[{d.code || 'N/A'}]</strong>
                      <span>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>{d.aql_class || d.category || ''}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Mô tả hiện tượng & biện pháp phòng ngừa */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
            4. Mô tả hiện tượng, Nguyên nhân & Tiêu chuẩn xử lý phòng ngừa
          </label>
          <textarea
            value={guideForm.description}
            onChange={e => setGuideForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Mô tả tóm tắt hiện tượng, dấu hiệu nhận biết lỗi (NG) và tiêu chuẩn đạt chuẩn (OK) cùng hướng khắc phục phòng ngừa..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13.5,
              color: '#334155',
              boxSizing: 'border-box',
              lineHeight: '1.5'
            }}
          />
        </div>
      </div>

      {/* Card 2: Thư viện Ảnh mẫu đối chứng trực tiếp */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: `1.5px solid ${THEME.borderLight}`,
        padding: '20px 24px',
        boxShadow: '0 4px 14px rgba(123, 82, 51, 0.04)'
      }}>
        {/* Header Gallery */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: THEME.bgLight,
              color: THEME.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ImageIcon size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: THEME.primary, textTransform: 'uppercase' }}>
                Thư viện Ảnh mẫu đối chứng (OK / NG)
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Đã tải {images.length} ảnh đối chứng
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage || images.length >= 20}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: THEME.primary,
              color: '#FFF',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(123, 82, 51, 0.2)'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.hover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = THEME.primary}
          >
            <Upload size={15} /> {uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleUploadImageFile(file);
            e.target.value = '';
          }}
        />

        {/* Dropzone Hint / Paste Notice */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: THEME.bgLight,
          borderRadius: 10,
          border: `1.5px dashed ${THEME.borderLight}`,
          marginBottom: 18,
          fontSize: 13,
          color: THEME.primary,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Info size={18} />
          <span>
            Bạn có thể <strong>kéo thả file ảnh</strong> trực tiếp vào khung này hoặc nhấn <strong>Ctrl + V</strong> để dán ảnh mẫu từ bộ nhớ tạm.
          </span>
        </div>

        {/* Image Grid */}
        {images.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: 48,
              textAlign: 'center',
              border: '2px dashed #E2E8F0',
              borderRadius: 12,
              backgroundColor: '#FAFAFA',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = THEME.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
          >
            <ImageIcon size={40} style={{ color: '#94A3B8', marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Chưa có ảnh mẫu đối chứng nào</div>
            <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 4 }}>
              Nhấp vào đây để tải ảnh lên hoặc dán ảnh bằng Ctrl + V
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16
          }}>
            {images.map((img, i) => {
              const fullUrl = getFullImageUrl(img.image_url);
              return (
                <div
                  key={img.id || i}
                  style={{
                    position: 'relative',
                    borderRadius: 12,
                    border: '1.5px solid #E2E8F0',
                    overflow: 'hidden',
                    aspectRatio: '1',
                    backgroundColor: '#F8FAFC',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    group: 'photo-card'
                  }}
                >
                  <img
                    src={fullUrl}
                    alt={`Ảnh mẫu đối chứng #${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setPreviewImage(fullUrl)}
                  />

                  {/* Badge số thứ tự ảnh */}
                  <div style={{
                    position: 'absolute',
                    bottom: 6,
                    left: 6,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    color: '#FFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>
                    Ảnh #{i + 1}
                  </div>

                  {/* Overlay action buttons */}
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    display: 'flex',
                    gap: 4
                  }}>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(fullUrl)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        color: '#FFF',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Xem ảnh lớn"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteImageTarget(img)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: 'rgba(220, 38, 38, 0.85)',
                        color: '#FFF',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Xóa ảnh này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox / Preview Modal for Image */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
        >
          <img
            src={previewImage}
            alt="Phóng to ảnh mẫu"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          />
        </div>
      )}

      {/* Delete Image Confirmation Modal */}
      <BeautifulConfirmModal
        isOpen={Boolean(deleteImageTarget)}
        title="Xác nhận xóa ảnh đối chứng"
        message="Bạn có chắc chắn muốn xóa ảnh đối chứng này khỏi tài liệu CTQ?"
        confirmText="Xóa ảnh"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={handleDeleteImage}
        onCancel={() => setDeleteImageTarget(null)}
      />
    </div>
  );
};

export default CTQGuideDetailView;

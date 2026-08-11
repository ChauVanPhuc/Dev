import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Save, Trash2, Plus, Upload, X, ChevronUp, ChevronDown,
  Layers, Image as ImageIcon, ZoomIn, CheckCircle2, ShieldCheck,
  Edit3, AlertTriangle, Sparkles
} from 'lucide-react';
import api, { getFullImageUrl } from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import { FormattedTextView } from '@shared/utils/textFormatter';
import '@styles/components.css';

const IMAGE_LIMIT = 10;

const THEME = {
  primary: '#7B5233',
  hover: '#5D3B32',
  bgLight: '#FAF6F0',
  borderLight: '#EADCC9',
  pageBg: '#FAF8F6'
};

const SOSGuideDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Core Data
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);

  // General info state
  const [metaForm, setMetaForm] = useState({ name: '', description: '', is_active: true });

  // Selected Step for editing
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [stepDraft, setStepDraft] = useState({ title: '', content: '' });
  const [savingStep, setSavingStep] = useState(false);

  // Modals & Popups
  const [lightboxImage, setLightboxImage] = useState(null);
  const [confirmDeleteGuide, setConfirmDeleteGuide] = useState(false);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(null);
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const selectedStep = (guide?.steps || []).find(s => s.id === selectedStepId) || null;

  const fetchGuide = async (preferredStepId = null) => {
    setLoading(true);
    try {
      const res = await api.get(`/inspection-guides/${id}`);
      setGuide(res);
      setMetaForm({
        name: res.name || '',
        description: res.description || '',
        is_active: res.is_active !== false
      });

      // Select default or preferred step
      const steps = res.steps || [];
      if (steps.length > 0) {
        const targetStep = preferredStepId
          ? steps.find(s => s.id === preferredStepId) || steps[0]
          : (selectedStepId ? (steps.find(s => s.id === selectedStepId) || steps[0]) : steps[0]);

        setSelectedStepId(targetStep.id);
        setStepDraft({ title: targetStep.title || '', content: targetStep.content || '' });
      } else {
        setSelectedStepId(null);
        setStepDraft({ title: '', content: '' });
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu SOS:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi tải dữ liệu Hướng dẫn thao tác.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuide();
  }, [id]);

  const handleSelectStep = (step) => {
    setSelectedStepId(step.id);
    setStepDraft({ title: step.title || '', content: step.content || '' });
  };

  // Save Guide Meta Information
  const handleSaveMeta = async (e) => {
    if (e) e.preventDefault();
    setSavingMeta(true);
    try {
      await api.put(`/inspection-guides/${id}`, {
        name: metaForm.name,
        description: metaForm.description,
        doc_type: 'SOS',
        is_active: metaForm.is_active
      });
      setGuide(prev => ({
        ...prev,
        name: metaForm.name,
        description: metaForm.description,
        is_active: metaForm.is_active
      }));
      if (toast) toast('success', 'Đã lưu thông tin Hướng dẫn thao tác (SOS)!');
    } catch (err) {
      console.error('Lỗi lưu SOS:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi lưu thông tin SOS.');
    } finally {
      setSavingMeta(false);
    }
  };

  // Delete Guide
  const handleDeleteGuide = async () => {
    try {
      await api.delete(`/inspection-guides/${id}`);
      if (toast) toast('success', 'Đã xóa Hướng dẫn thao tác (SOS) thành công.');
      navigate('/admin/sos-guides');
    } catch (err) {
      console.error('Lỗi xóa SOS:', err);
      if (toast) toast('error', 'Lỗi khi xóa Hướng dẫn thao tác.');
    }
  };

  // Step Operations
  const handleCreateStep = async () => {
    try {
      const nextNo = (guide?.steps?.length || 0) + 1;
      const created = await api.post(`/inspection-guides/${id}/steps`, {
        step_no: nextNo,
        title: `Bước ${nextNo}: Thao tác chuẩn`,
        content: ''
      });
      if (toast) toast('success', `Đã thêm Bước ${nextNo}!`);
      await fetchGuide(created.id);
    } catch (err) {
      console.error('Lỗi tạo bước thao tác:', err);
      if (toast) toast('error', 'Lỗi tạo bước thao tác mới.');
    }
  };

  const handleSaveStep = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStepId) return;

    setSavingStep(true);
    try {
      await api.put(`/inspection-guides/${id}/steps/${selectedStepId}`, {
        title: stepDraft.title,
        content: stepDraft.content
      });
      if (toast) toast('success', 'Đã lưu nội dung bước thao tác!');
      await fetchGuide(selectedStepId);
    } catch (err) {
      console.error('Lỗi lưu bước thao tác:', err);
      if (toast) toast('error', 'Lỗi khi lưu bước thao tác.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleDeleteStep = async () => {
    if (!confirmDeleteStep) return;
    try {
      await api.delete(`/inspection-guides/${id}/steps/${confirmDeleteStep.id}`);
      if (toast) toast('success', `Đã xóa bước "${confirmDeleteStep.title}".`);
      setConfirmDeleteStep(null);
      await fetchGuide();
    } catch (err) {
      console.error('Lỗi xóa bước:', err);
      if (toast) toast('error', 'Lỗi khi xóa bước thao tác.');
    }
  };

  const handleReorderStep = async (stepId, direction) => {
    const steps = [...(guide?.steps || [])];
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex < 0) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const currentStepObj = steps[currentIndex];
    const targetStepObj = steps[targetIndex];

    try {
      await api.put(`/inspection-guides/${id}/steps/${currentStepObj.id}`, { step_no: targetStepObj.step_no });
      await api.put(`/inspection-guides/${id}/steps/${targetStepObj.id}`, { step_no: currentStepObj.step_no });
      if (toast) toast('success', 'Đã cập nhật thứ tự bước!');
      await fetchGuide(stepId);
    } catch (err) {
      console.error('Lỗi đổi thứ tự bước:', err);
      if (toast) toast('error', 'Lỗi khi đổi thứ tự bước.');
    }
  };

  // Image Upload Handling
  const handleUploadImages = async (files) => {
    if (!files || files.length === 0 || !selectedStepId) return;

    const currentCount = selectedStep?.images?.length || 0;
    if (currentCount + files.length > IMAGE_LIMIT) {
      if (toast) toast('warning', `Mỗi bước thao tác chỉ được tải tối đa ${IMAGE_LIMIT} ảnh.`);
      return;
    }

    setUploadingImages(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => {
        formData.append('files', f);
      });

      await api.post(`/inspection-guides/${id}/steps/${selectedStepId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (toast) toast('success', 'Đã tải ảnh minh họa thao tác lên thành công!');
      await fetchGuide(selectedStepId);
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi tải ảnh lên.');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async () => {
    if (!confirmDeleteImage || !selectedStepId) return;
    try {
      await api.delete(`/inspection-guides/${id}/steps/${selectedStepId}/images/${confirmDeleteImage.id}`);
      if (toast) toast('success', 'Đã xóa ảnh minh họa.');
      setConfirmDeleteImage(null);
      await fetchGuide(selectedStepId);
    } catch (err) {
      console.error('Lỗi xóa ảnh:', err);
      if (toast) toast('error', 'Lỗi khi xóa ảnh minh họa.');
    }
  };

  // Paste image handler from clipboard
  const handlePasteImage = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleUploadImages(imageFiles);
    }
  };

  if (loading && !guide) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
        Đang tải thông tin Hướng dẫn thao tác (SOS)...
      </div>
    );
  }

  if (!guide) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <h3 style={{ color: '#0F172A' }}>Không tìm thấy Hướng dẫn thao tác</h3>
        <button
          onClick={() => navigate('/admin/sos-guides')}
          style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: THEME.primary, color: '#FFF', border: 'none', cursor: 'pointer', marginTop: 12 }}
        >
          Quay lại danh sách SOS
        </button>
      </div>
    );
  }

  const steps = guide.steps || [];

  return (
    <div
      className="guide-management-container"
      onPaste={handlePasteImage}
      style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif', backgroundColor: THEME.pageBg, minHeight: '100%', boxSizing: 'border-box' }}
    >
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Left: Breadcrumbs & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin/sos-guides')}
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
            title="Quay lại danh sách SOS"
            onMouseEnter={e => e.currentTarget.style.borderColor = THEME.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = THEME.borderLight}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: THEME.bgLight,
                color: THEME.primary,
                border: `1px solid ${THEME.borderLight}`,
                fontWeight: 800,
                fontSize: 12,
                fontFamily: 'monospace'
              }}>
                {guide.code}
              </span>
              <span style={{
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: THEME.primary,
                color: '#FFF',
                fontWeight: 800,
                fontSize: 11.5
              }}>
                Hướng dẫn thao tác (SOS)
              </span>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                Tài liệu ban hành
              </span>
            </div>
            <h1 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', color: '#1E293B', fontWeight: 800 }}>
              {guide.name}
            </h1>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 20,
            backgroundColor: metaForm.is_active ? '#DCFCE7' : '#FEE2E2',
            color: metaForm.is_active ? '#15803D' : '#991B1B',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={metaForm.is_active}
              onChange={e => setMetaForm(prev => ({ ...prev, is_active: e.target.checked }))}
              style={{ accentColor: THEME.primary }}
            />
            {metaForm.is_active ? 'Đang áp dụng' : 'Tạm ngưng'}
          </label>

          <button
            type="button"
            onClick={() => setConfirmDeleteGuide(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #FEE2E2',
              backgroundColor: '#FFF',
              color: '#DC2626',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEE2E2'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFF'}
          >
            <Trash2 size={16} /> Xóa SOS
          </button>
        </div>
      </div>

      {/* General Info Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: `1.5px solid ${THEME.borderLight}`,
        padding: '20px 24px',
        marginBottom: 20,
        boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) minmax(260px, 1.4fr) minmax(280px, 1.6fr) 120px', gap: 14, alignItems: 'start' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: THEME.primary, textTransform: 'uppercase', marginBottom: 6 }}>
              Mã tài liệu SOS
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: THEME.bgLight,
              border: `1.5px solid ${THEME.borderLight}`,
              height: 42,
              boxSizing: 'border-box'
            }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: THEME.primary, fontFamily: 'monospace' }}>
                {guide.code}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: THEME.primary, color: '#FFF', padding: '2px 8px', borderRadius: 6 }}>
                SOS
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: THEME.primary, textTransform: 'uppercase', marginBottom: 6 }}>
              Tên Hướng dẫn thao tác *
            </label>
            <input
              type="text"
              value={metaForm.name}
              onChange={e => setMetaForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="VD: Hướng dẫn thao tác căn chỉnh cữ máy phay mộng dương"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                fontWeight: 600,
                color: '#1E293B',
                backgroundColor: '#FFF',
                height: 42,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
              Vị trí & Phạm vi áp dụng
            </label>
            <input
              type="text"
              value={metaForm.description}
              onChange={e => setMetaForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="VD: Áp dụng tại Công đoạn Tinh Chế - Chuyền 2..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 14,
                color: '#334155',
                backgroundColor: '#FFF',
                height: 42,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ paddingTop: 24 }}>
            <button
              type="button"
              onClick={handleSaveMeta}
              disabled={savingMeta}
              style={{
                width: '100%',
                padding: '9px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: THEME.primary,
                color: '#FFF',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: savingMeta ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)',
                height: 42
              }}
              onMouseEnter={e => { if (!savingMeta) e.currentTarget.style.backgroundColor = THEME.hover; }}
              onMouseLeave={e => { if (!savingMeta) e.currentTarget.style.backgroundColor = THEME.primary; }}
            >
              <Save size={16} /> {savingMeta ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Steps & Image Gallery (Master - Detail) */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Step List */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          border: `1.5px solid ${THEME.borderLight}`,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)'
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${THEME.borderLight}`,
            backgroundColor: THEME.bgLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase' }}>
              Quy trình thao tác chuẩn ({steps.length})
            </div>
            <button
              type="button"
              onClick={handleCreateStep}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                backgroundColor: THEME.primary,
                color: '#FFF',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Plus size={14} /> Thêm bước
            </button>
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '65vh', overflowY: 'auto' }}>
            {steps.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                Chưa có bước thao tác nào. Bấm "+ Thêm bước" để bắt đầu.
              </div>
            ) : (
              steps.map((step, idx) => {
                const isSelected = step.id === selectedStepId;
                const imgCount = step.images?.length || 0;

                return (
                  <div
                    key={step.id}
                    onClick={() => handleSelectStep(step)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: isSelected ? `2px solid ${THEME.primary}` : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? THEME.bgLight : '#FFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 4px 12px rgba(123, 82, 51, 0.12)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: isSelected ? THEME.primary : '#64748B' }}>
                        BƯỚC {step.step_no || idx + 1}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {imgCount > 0 && (
                          <span style={{ fontSize: 11, color: THEME.primary, fontWeight: 700, backgroundColor: '#FAF6F0', border: `1px solid ${THEME.borderLight}`, padding: '1px 6px', borderRadius: 4 }}>
                            {imgCount} ảnh
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleReorderStep(step.id, 'up'); }}
                          disabled={idx === 0}
                          style={{ border: 'none', background: 'transparent', color: idx === 0 ? '#CBD5E1' : '#64748B', cursor: idx === 0 ? 'default' : 'pointer', padding: 2 }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleReorderStep(step.id, 'down'); }}
                          disabled={idx === steps.length - 1}
                          style={{ border: 'none', background: 'transparent', color: idx === steps.length - 1 ? '#CBD5E1' : '#64748B', cursor: idx === steps.length - 1 ? 'default' : 'pointer', padding: 2 }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteStep(step); }}
                          style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? THEME.primary : '#1E293B', lineHeight: '1.4' }}>
                      {step.title || 'Chưa đặt tiêu đề bước'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Step Editor & Image Gallery */}
        {selectedStep ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Step Detail Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: `1.5px solid ${THEME.borderLight}`,
              padding: 24,
              boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase' }}>
                  Soạn thảo chi tiết Bước {selectedStep.step_no}
                </div>
                <button
                  type="button"
                  onClick={handleSaveStep}
                  disabled={savingStep}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    backgroundColor: THEME.primary,
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: savingStep ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)'
                  }}
                  onMouseEnter={e => { if (!savingStep) e.currentTarget.style.backgroundColor = THEME.hover; }}
                  onMouseLeave={e => { if (!savingStep) e.currentTarget.style.backgroundColor = THEME.primary; }}
                >
                  <Save size={15} /> {savingStep ? 'Đang lưu...' : 'Lưu bước này'}
                </button>
              </div>

              {/* Step Title Input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: THEME.primary, textTransform: 'uppercase', marginBottom: 6 }}>
                  Tiêu đề bước thao tác *
                </label>
                <input
                  type="text"
                  value={stepDraft.title}
                  onChange={e => setStepDraft(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="VD: Căn chỉnh thước cữ và thông số máy"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: '#1E293B',
                    backgroundColor: '#FFF',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = THEME.primary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
                />
              </div>

              {/* Step Content / Safety Instruction */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: THEME.primary, textTransform: 'uppercase', marginBottom: 6 }}>
                  Nội dung hướng dẫn thao tác chi tiết & Lưu ý an toàn lao động:
                </label>
                <textarea
                  value={stepDraft.content}
                  onChange={e => setStepDraft(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  placeholder="1. Kiểm tra phôi gỗ đầu vào...&#10;2. Khóa chốt định vị trước khi bấm chạy máy...&#10;* Lưu ý an toàn: Bắt buộc đeo kính bảo hộ và găng tay chống cắt."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    lineHeight: '1.6',
                    color: '#334155',
                    backgroundColor: '#FFF',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = THEME.primary; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
                />
              </div>
            </div>

            {/* Images Gallery Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: `1.5px solid ${THEME.borderLight}`,
              padding: 24,
              boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: THEME.primary, textTransform: 'uppercase' }}>
                    Ảnh minh họa thao tác chuẩn ({selectedStep.images?.length || 0}/{IMAGE_LIMIT})
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Kéo thả file vào đây hoặc nhấn <strong>Ctrl+V</strong> để dán ảnh trực tiếp từ clipboard.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages || (selectedStep.images?.length || 0) >= IMAGE_LIMIT}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    backgroundColor: THEME.bgLight,
                    border: `1px solid ${THEME.borderLight}`,
                    color: THEME.primary,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: uploadingImages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Upload size={15} /> {uploadingImages ? 'Đang tải ảnh...' : '+ Tải ảnh lên'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => handleUploadImages(e.target.files)}
                />
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); handleUploadImages(e.dataTransfer.files); }}
                style={{
                  border: isDragging ? `2px dashed ${THEME.primary}` : '1.5px dashed #CBD5E1',
                  borderRadius: 12,
                  padding: 20,
                  backgroundColor: isDragging ? THEME.bgLight : '#FAFAFA',
                  textAlign: 'center',
                  marginBottom: 16,
                  transition: 'all 0.2s'
                }}
              >
                <ImageIcon size={32} style={{ color: '#94A3B8', marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  Kéo và thả ảnh thao tác vào đây, hoặc nhấn <strong>Ctrl+V</strong>
                </div>
                <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
                  Hỗ trợ định dạng PNG, JPG, JPEG (Tối đa 10 ảnh / bước)
                </div>
              </div>

              {/* Image Grid */}
              {selectedStep.images && selectedStep.images.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 14
                }}>
                  {selectedStep.images.map((img, i) => (
                    <div
                      key={img.id}
                      style={{
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#000',
                        position: 'relative',
                        aspectRatio: '4/3'
                      }}
                    >
                      <img
                        src={getFullImageUrl(img.image_url)}
                        alt={`Ảnh thao tác ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      {/* Action buttons */}
                      <div style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        display: 'flex',
                        gap: 6
                      }}>
                        <button
                          type="button"
                          onClick={() => setLightboxImage(img.image_url)}
                          title="Phóng to"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            border: 'none',
                            color: '#FFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteImage(img)}
                          title="Xóa ảnh"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: 'rgba(220,38,38,0.8)',
                            border: 'none',
                            color: '#FFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: `1.5px solid ${THEME.borderLight}`,
            padding: 40,
            textAlign: 'center',
            color: '#94A3B8'
          }}>
            Vui lòng chọn một bước thao tác ở cột bên trái hoặc tạo bước mới để soạn thảo.
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={getFullImageUrl(lightboxImage)}
            alt="Phóng to ảnh"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      )}

      {/* Confirm Delete Guide */}
      <BeautifulConfirmModal
        isOpen={confirmDeleteGuide}
        title="Xác nhận xóa Hướng dẫn thao tác (SOS)"
        message={`Bạn có chắc chắn muốn xóa toàn bộ tài liệu SOS "${guide.name}" (${guide.code})? Hành động này không thể hoàn tác.`}
        confirmText="Xóa SOS"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={handleDeleteGuide}
        onCancel={() => setConfirmDeleteGuide(false)}
      />

      {/* Confirm Delete Step */}
      <BeautifulConfirmModal
        isOpen={Boolean(confirmDeleteStep)}
        title="Xác nhận xóa bước thao tác"
        message={`Bạn có chắc muốn xóa "${confirmDeleteStep?.title}"? Tất cả hình ảnh trong bước này cũng sẽ bị xóa.`}
        confirmText="Xóa bước"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={handleDeleteStep}
        onCancel={() => setConfirmDeleteStep(null)}
      />

      {/* Confirm Delete Image */}
      <BeautifulConfirmModal
        isOpen={Boolean(confirmDeleteImage)}
        title="Xác nhận xóa ảnh thao tác chuẩn"
        message="Bạn có chắc chắn muốn xóa hình ảnh minh họa này khỏi bước thao tác?"
        confirmText="Xóa ảnh"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={handleDeleteImage}
        onCancel={() => setConfirmDeleteImage(null)}
      />
    </div>
  );
};

export default SOSGuideDetailView;

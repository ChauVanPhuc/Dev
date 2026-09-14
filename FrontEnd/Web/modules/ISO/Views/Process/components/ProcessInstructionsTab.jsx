import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ExternalLink, Link2, Unlink, Plus, Edit2, Trash2, ArrowUp, ArrowDown,
  Image as ImageIcon, CheckCircle, AlertCircle, Eye, X, Upload, RefreshCw,
  FileText, Check, Search, Layers, ShieldCheck, LayoutGrid, List, ZoomIn
} from 'lucide-react';
import api, { getFullImageUrl } from '@webShared/Services/api.service';
import { FormattedTextView } from '@shared/utils/textFormatter';
import isoGuideService from '../../../services/isoGuideService';

const ProcessInstructionsTab = ({ editor }) => {
  const {
    formData,
    setFormData,
    showFeedback,
    isProcessMode,
    fetchDocDetails
  } = editor;

  const processId = formData.id;
  const isNewProcess = !processId || processId === 'new';

  // --- Local State ---
  const [guide, setGuide] = useState(null);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  
  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinkedGuides, setUnlinkedGuides] = useState([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);
  const [searchGuideQuery, setSearchGuideQuery] = useState('');
  const [selectedGuideIdToLink, setSelectedGuideIdToLink] = useState(null);
  const [linking, setLinking] = useState(false);

  // Quick Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ code: '', name: '', description: '' });
  const [creating, setCreating] = useState(false);

  // Unlink Confirm Modal State
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  // Step Add/Edit Modal State
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null); // null = add, object = edit
  const [stepFormData, setStepFormData] = useState({
    title: '',
    content: '',
    sub_steps: []
  });
  const [savingStep, setSavingStep] = useState(false);

  // Image Upload State
  const [uploadingImageStepId, setUploadingImageStepId] = useState(null);
  const fileInputRef = useRef(null);

  // Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState(null);

  // Load linked inspection guide
  const loadLinkedGuide = useCallback(async () => {
    if (isNewProcess) {
      setGuide(null);
      return;
    }
    setLoadingGuide(true);
    try {
      const data = await isoGuideService.getProcessInspectionGuide(processId);
      setGuide(data);
      if (data && (!formData.inspection_guide_id || formData.inspection_guide_id !== data.id)) {
        setFormData(prev => ({
          ...prev,
          inspection_guide_id: data.id,
          inspection_guide: {
            id: data.id,
            code: data.code,
            name: data.name,
            doc_type: data.doc_type,
            steps_count: data.steps?.length || 0
          }
        }));
      }
    } catch (err) {
      console.error('Lỗi khi tải Hướng dẫn kiểm tra liên kết:', err);
      setGuide(null);
    } finally {
      setLoadingGuide(false);
    }
  }, [processId, isNewProcess, setFormData, formData.inspection_guide_id]);

  useEffect(() => {
    loadLinkedGuide();
  }, [loadLinkedGuide]);

  // Open Link Modal
  const handleOpenLinkModal = async () => {
    setShowLinkModal(true);
    setSelectedGuideIdToLink(guide?.id || null);
    setLoadingUnlinked(true);
    try {
      const list = await isoGuideService.getUnlinkedInspectionGuides(processId);
      setUnlinkedGuides(list || []);
    } catch (err) {
      console.error('Lỗi tải danh sách HDKT chưa liên kết:', err);
      showFeedback('error', 'Không thể tải danh sách Hướng dẫn kiểm tra');
    } finally {
      setLoadingUnlinked(false);
    }
  };

  // Submit Link
  const handleConfirmLink = async () => {
    if (!selectedGuideIdToLink) {
      showFeedback('warning', 'Vui lòng chọn một Hướng dẫn kiểm tra để liên kết');
      return;
    }
    setLinking(true);
    try {
      const res = await isoGuideService.linkProcessInspectionGuide(processId, selectedGuideIdToLink);
      showFeedback('success', res.message || 'Liên kết Hướng dẫn kiểm tra thành công!');
      setShowLinkModal(false);
      setGuide(res.guide);
      setFormData(prev => ({
        ...prev,
        inspection_guide_id: selectedGuideIdToLink,
        inspection_guide: {
          id: res.guide.id,
          code: res.guide.code,
          name: res.guide.name,
          doc_type: res.guide.doc_type,
          steps_count: res.guide.steps?.length || 0
        }
      }));
      if (fetchDocDetails) fetchDocDetails();
    } catch (err) {
      console.error('Lỗi liên kết HDKT:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể liên kết Hướng dẫn kiểm tra');
    } finally {
      setLinking(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const rawCode = formData.code || '';
    const suggestedCode = rawCode.startsWith('HD-') ? rawCode : `HD-${rawCode}`;
    const suggestedName = formData.name ? `Hướng dẫn kiểm tra ${formData.name}` : 'Hướng dẫn kiểm tra quy trình';
    setCreateForm({
      code: suggestedCode,
      name: suggestedName,
      description: `Tài liệu hướng dẫn kiểm tra thực hiện liên kết 1-1 với quy trình ${formData.code || ''} - ${formData.name || ''}`
    });
    setShowCreateModal(true);
  };

  // Submit Quick Create
  const handleConfirmCreate = async () => {
    if (!createForm.code.trim() || !createForm.name.trim()) {
      showFeedback('warning', 'Vui lòng nhập Mã và Tên Hướng dẫn kiểm tra');
      return;
    }
    setCreating(true);
    try {
      const res = await isoGuideService.createProcessInspectionGuide(processId, createForm);
      showFeedback('success', res.message || 'Tạo mới và liên kết HDKT thành công!');
      setShowCreateModal(false);
      setGuide(res.guide);
      setFormData(prev => ({
        ...prev,
        inspection_guide_id: res.guide.id,
        inspection_guide: {
          id: res.guide.id,
          code: res.guide.code,
          name: res.guide.name,
          doc_type: res.guide.doc_type,
          steps_count: res.guide.steps?.length || 0
        }
      }));
      if (fetchDocDetails) fetchDocDetails();
    } catch (err) {
      console.error('Lỗi tạo mới HDKT:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể tạo mới Hướng dẫn kiểm tra');
    } finally {
      setCreating(false);
    }
  };

  // Confirm Unlink
  const handleConfirmUnlink = async () => {
    setUnlinking(true);
    try {
      const res = await isoGuideService.unlinkProcessInspectionGuide(processId);
      showFeedback('success', res.message || 'Đã hủy liên kết thành công!');
      setShowUnlinkConfirm(false);
      setGuide(null);
      setFormData(prev => ({
        ...prev,
        inspection_guide_id: null,
        inspection_guide: null
      }));
      if (fetchDocDetails) fetchDocDetails();
    } catch (err) {
      console.error('Lỗi hủy liên kết:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể hủy liên kết');
    } finally {
      setUnlinking(false);
    }
  };

  // --- Step Management Handlers ---
  const handleOpenAddStep = () => {
    setEditingStep(null);
    setStepFormData({
      title: '',
      content: '',
      sub_steps: []
    });
    setShowStepModal(true);
  };

  const handleOpenEditStep = (step) => {
    setEditingStep(step);
    setStepFormData({
      title: step.title || '',
      content: step.content || '',
      sub_steps: step.sub_steps && step.sub_steps.length > 0
        ? step.sub_steps.map(s => ({ ...s }))
        : []
    });
    setShowStepModal(true);
  };

  const handleAddSubStepRow = () => {
    setStepFormData(prev => ({
      ...prev,
      sub_steps: [
        ...prev.sub_steps,
        { sub_step_no: prev.sub_steps.length + 1, title: 'Tiêu chuẩn chấp nhận', content: '' }
      ]
    }));
  };

  const handleRemoveSubStepRow = (index) => {
    setStepFormData(prev => ({
      ...prev,
      sub_steps: prev.sub_steps.filter((_, idx) => idx !== index)
    }));
  };

  const handleSubStepChange = (index, field, value) => {
    setStepFormData(prev => {
      const next = [...prev.sub_steps];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, sub_steps: next };
    });
  };

  const handleSaveStepModal = async () => {
    if (!stepFormData.title.trim()) {
      showFeedback('warning', 'Vui lòng nhập tên bước kiểm tra');
      return;
    }
    if (!guide?.id) return;

    setSavingStep(true);
    try {
      if (editingStep) {
        // Update Step
        await isoGuideService.updateGuideStep(guide.id, editingStep.id, {
          title: stepFormData.title,
          content: stepFormData.content
        });

        // Update Sub-steps: delete old sub-steps and re-create or update
        for (const sub of (editingStep.sub_steps || [])) {
          try {
            await api.delete(`/inspection-guides/${guide.id}/steps/${editingStep.id}/sub-steps/${sub.id}`);
          } catch (e) {
            console.error('Error deleting old sub-step:', e);
          }
        }
        for (let idx = 0; idx < stepFormData.sub_steps.length; idx++) {
          const s = stepFormData.sub_steps[idx];
          if (s.content && s.content.trim()) {
            await api.post(`/inspection-guides/${guide.id}/steps/${editingStep.id}/sub-steps`, {
              sub_step_no: idx + 1,
              title: s.title || 'Tiêu chuẩn chấp nhận',
              content: s.content.trim()
            });
          }
        }

        showFeedback('success', 'Đã cập nhật bước kiểm tra thành công!');
      } else {
        // Create Step
        const nextStepNo = (guide.steps?.length || 0) + 1;
        const newStep = await isoGuideService.addGuideStep(guide.id, {
          step_no: nextStepNo,
          title: stepFormData.title,
          content: stepFormData.content
        });

        // Add sub-steps
        for (let idx = 0; idx < stepFormData.sub_steps.length; idx++) {
          const s = stepFormData.sub_steps[idx];
          if (s.content && s.content.trim()) {
            await api.post(`/inspection-guides/${guide.id}/steps/${newStep.id}/sub-steps`, {
              sub_step_no: idx + 1,
              title: s.title || 'Tiêu chuẩn chấp nhận',
              content: s.content.trim()
            });
          }
        }

        showFeedback('success', 'Đã thêm bước kiểm tra mới thành công!');
      }

      setShowStepModal(false);
      await loadLinkedGuide();
    } catch (err) {
      console.error('Lỗi khi lưu bước kiểm tra:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể lưu bước kiểm tra');
    } finally {
      setSavingStep(false);
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bước kiểm tra này?')) return;
    try {
      await isoGuideService.deleteGuideStep(guide.id, stepId);
      showFeedback('success', 'Đã xóa bước kiểm tra thành công!');
      await loadLinkedGuide();
    } catch (err) {
      console.error('Lỗi xóa bước kiểm tra:', err);
      showFeedback('error', 'Không thể xóa bước kiểm tra');
    }
  };

  const handleMoveStep = async (index, direction) => {
    if (!guide?.steps) return;
    const newSteps = [...guide.steps];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    const stepIds = newSteps.map(s => s.id);
    try {
      await isoGuideService.reorderGuideSteps(guide.id, stepIds);
      await loadLinkedGuide();
    } catch (err) {
      console.error('Lỗi sắp xếp bước:', err);
      showFeedback('error', 'Không thể sắp xếp lại thứ tự bước');
    }
  };

  // Image Upload for Step
  const handleTriggerUploadImage = (stepId) => {
    setUploadingImageStepId(stepId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadingImageStepId || !guide?.id) return;

    const formDataUpload = new FormData();
    for (let i = 0; i < files.length; i++) {
      formDataUpload.append('files', files[i]);
    }

    try {
      await isoGuideService.uploadStepImages(guide.id, uploadingImageStepId, formDataUpload);
      showFeedback('success', 'Tải lên ảnh mẫu thành công!');
      await loadLinkedGuide();
    } catch (err) {
      console.error('Lỗi upload ảnh:', err);
      showFeedback('error', 'Không thể tải lên ảnh mẫu');
    } finally {
      setUploadingImageStepId(null);
    }
  };

  const handleDeleteImage = async (stepId, imageId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh mẫu này?')) return;
    try {
      await isoGuideService.deleteStepImage(guide.id, stepId, imageId);
      showFeedback('success', 'Đã xóa ảnh mẫu thành công!');
      await loadLinkedGuide();
    } catch (err) {
      console.error('Lỗi xóa ảnh mẫu:', err);
      showFeedback('error', 'Không thể xóa ảnh mẫu');
    }
  };

  // Filtered unlinked list for modal
  const filteredUnlinkedList = unlinkedGuides.filter(g => {
    const q = searchGuideQuery.toLowerCase().trim();
    if (!q) return true;
    return (g.code || '').toLowerCase().includes(q) || (g.name || '').toLowerCase().includes(q);
  });

  // Render: New process warning
  if (isNewProcess) {
    return (
      <div style={{
        padding: '40px 24px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1.5px dashed #EADCC9',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#FAF6F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7B5233'
        }}>
          <AlertCircle size={28} />
        </div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 'bold' }}>
          Quy trình đang được tạo mới
        </h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', maxWidth: '480px', lineHeight: '1.5' }}>
          Vui lòng bấm nút <strong>"Lưu Quy Trình"</strong> ở thanh công cụ phía trên để hoàn tất khởi tạo quy trình ISO trước khi liên kết với Hướng dẫn kiểm tra.
        </p>
      </div>
    );
  }

  // Render: Loading guide
  if (loadingGuide) {
    return (
      <div style={{
        padding: '60px 24px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1.5px solid #EADCC9',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#7B5233' }} />
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
          Đang tải dữ liệu Hướng dẫn kiểm tra...
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Hidden File Input for uploading step images */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ========================================================= */}
      {/* 1. TRẠNG THÁI: CHƯA LIÊN KẾT VỚI GUIDE NÀO */}
      {/* ========================================================= */}
      {!guide ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1.5px dashed #D1D5DB',
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FAF6F0',
            border: '2px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7B5233'
          }}>
            <FileText size={32} />
          </div>

          <div style={{ maxWidth: '580px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#1F2937', fontWeight: 'bold' }}>
              Quy trình này chưa có Hướng dẫn kiểm tra liên kết
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', lineHeight: '1.5' }}>
              Theo chuẩn quản lý chất lượng, mỗi quy trình ISO liên kết <strong>1 - 1</strong> với một tài liệu <strong>Hướng dẫn kiểm tra (HDKT)</strong> tại <code>/admin/inspection-guides</code> để nhân viên QC/KCS thực hiện đánh giá kiểm tra trên chuyền.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleOpenLinkModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: 'white',
                border: '1.5px solid #7B5233',
                borderRadius: '6px',
                color: '#7B5233',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <Link2 size={16} />
              <span>Chọn Hướng dẫn kiểm tra có sẵn</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#7B5233',
                border: '1.5px solid #7B5233',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(123, 82, 51, 0.15)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#654321'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
            >
              <Plus size={16} />
              <span>+ Tạo mới Hướng dẫn kiểm tra</span>
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. TRẠNG THÁI: ĐÃ LIÊN KẾT VỚI GUIDE (1 - 1)              */
        /* ========================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Header: Linked Guide Info & Actions */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            border: '1.5px solid #EADCC9',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 6px rgba(123, 82, 51, 0.04)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: '#FAF6F0',
                border: '1.5px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233'
              }}>
                <ShieldCheck size={26} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    backgroundColor: '#E0F2FE',
                    color: '#0369A1',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px'
                  }}>
                    {guide.doc_type || 'HDKT'} • LIÊN KẾT 1 - 1
                  </span>
                  <span style={{
                    backgroundColor: guide.is_active ? '#DCFCE7' : '#FEE2E2',
                    color: guide.is_active ? '#15803D' : '#B91C1C',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {guide.is_active ? 'Đang hiệu lực' : 'Tạm khóa'}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: '800' }}>
                  [{guide.code}] {guide.name}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                  {guide.steps?.length || 0} bước kiểm tra tiêu chuẩn {guide.description ? `• ${guide.description}` : ''}
                </span>
              </div>
            </div>

            {/* Actions for Linked Guide */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => window.open(`/admin/inspection-guides/edit/${guide.id}`, '_blank')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E2E8F0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                title="Mở tài liệu này trong module /admin/inspection-guides"
              >
                <ExternalLink size={14} />
                <span>Mở trong HDKT</span>
              </button>

              <button
                type="button"
                onClick={handleOpenLinkModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '6px',
                  color: '#92400E',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF3C7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFBEB'; }}
                title="Đổi sang liên kết với một Hướng dẫn kiểm tra khác"
              >
                <Link2 size={14} />
                <span>Đổi liên kết</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUnlinkConfirm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                title="Gỡ liên kết 1-1 giữa quy trình này và Hướng dẫn kiểm tra"
              >
                <Unlink size={14} />
                <span>Hủy liên kết</span>
              </button>
            </div>
          </div>

          {/* Steps Management Section */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            border: '1.5px solid #EADCC9',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(123, 82, 51, 0.03)'
          }}>
            {/* Toolbar */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#FAF6F0',
              borderBottom: '1.5px solid #EADCC9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#7B5233', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Các bước kiểm tra tiêu chuẩn
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  backgroundColor: 'white',
                  color: '#7B5233',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #EADCC9'
                }}>
                  {guide.steps?.length || 0} bước
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* View Mode Toggle */}
                <div style={{
                  display: 'flex',
                  backgroundColor: '#EAE0D5',
                  padding: '2px',
                  borderRadius: '6px'
                }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: viewMode === 'cards' ? 'white' : 'transparent',
                      color: viewMode === 'cards' ? '#7B5233' : '#64748B',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s'
                    }}
                    title="Hiển thị dạng thẻ chi tiết, dễ đọc"
                  >
                    <LayoutGrid size={13} />
                    <span>Dạng thẻ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: viewMode === 'table' ? 'white' : 'transparent',
                      color: viewMode === 'table' ? '#7B5233' : '#64748B',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s'
                    }}
                    title="Hiển thị dạng bảng tổng hợp"
                  >
                    <List size={13} />
                    <span>Dạng bảng</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddStep}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    backgroundColor: '#7B5233',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(123, 82, 51, 0.15)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#654321'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
                >
                  <Plus size={15} />
                  <span>Thêm bước mới</span>
                </button>
              </div>
            </div>

            {/* Empty State */}
            {(!guide.steps || guide.steps.length === 0) ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.88rem' }}>
                Chưa có bước kiểm tra nào trong Hướng dẫn này. Bấm <strong>"+ Thêm bước mới"</strong> để bắt đầu thiết lập.
              </div>
            ) : viewMode === 'cards' ? (
              /* ========================================================= */
              /* VIEW MODE 1: DẠNG THẺ CHI TIẾT (CARDS VIEW) - ĐẸP & DỄ NHÌN */
              /* ========================================================= */
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#FAF9F8' }}>
                {guide.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      overflow: 'hidden',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    {/* Step Card Header */}
                    <div style={{
                      padding: '12px 18px',
                      backgroundColor: '#FFFFFF',
                      borderBottom: '1px solid #F1F5F9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Step Number Circle */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#FAF0E6',
                          border: '1.5px solid #EADCC9',
                          color: '#7B5233',
                          fontWeight: '800',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        {/* Step Title */}
                        <h3 style={{
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: '800',
                          color: '#1E293B',
                          lineHeight: '1.4'
                        }}>
                          {step.title}
                        </h3>
                      </div>

                      {/* Header Actions: Reorder & Edit/Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Reorder Buttons */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '5px',
                          border: '1px solid #E2E8F0',
                          padding: '2px 4px'
                        }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStep(idx, -1)}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              opacity: idx === 0 ? 0.25 : 0.7,
                              padding: '3px 5px',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Di chuyển lên trên"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8', padding: '0 2px' }}>|</span>
                          <button
                            type="button"
                            disabled={idx === guide.steps.length - 1}
                            onClick={() => handleMoveStep(idx, 1)}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: idx === guide.steps.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: idx === guide.steps.length - 1 ? 0.25 : 0.7,
                              padding: '3px 5px',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Di chuyển xuống dưới"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditStep(step)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '5px',
                            color: '#1D4ED8',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Sửa</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(step.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '5px',
                            color: '#DC2626',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>

                    {/* Step Card Body */}
                    <div style={{ padding: '16px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      {/* Left: Content & Sub-steps (70%) */}
                      <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Content / Instructions */}
                        <div>
                          <div style={{
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            color: '#64748B',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '6px'
                          }}>
                            Nội dung kiểm tra & Hướng dẫn thao tác:
                          </div>
                          {step.content ? (
                            <div style={{
                              backgroundColor: '#FAFAF9',
                              border: '1px solid #E7E5E4',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              fontSize: '0.88rem',
                              color: '#334155'
                            }}>
                              <FormattedTextView text={step.content} />
                            </div>
                          ) : (
                            <div style={{ color: '#94A3B8', fontSize: '0.82rem', fontStyle: 'italic' }}>
                              Chưa có nội dung ghi chú thao tác cho bước này.
                            </div>
                          )}
                        </div>

                        {/* Sub-steps (Acceptance Criteria) if present */}
                        {step.sub_steps && step.sub_steps.length > 0 && (
                          <div>
                            <div style={{
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              color: '#059669',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Check size={14} />
                              <span>Tiêu chuẩn chấp nhận cụ thể:</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {step.sub_steps.map((sub, sIdx) => (
                                <div
                                  key={sub.id || sIdx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    backgroundColor: '#F0FDF4',
                                    border: '1px solid #DCFCE7',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    fontSize: '0.84rem',
                                    color: '#166534'
                                  }}
                                >
                                  <span style={{ fontWeight: '800', color: '#059669', marginTop: '1px' }}>✓</span>
                                  <div>
                                    {sub.title && sub.title !== 'Tiêu chuẩn chấp nhận' && (
                                      <strong style={{ color: '#14532D', marginRight: '6px' }}>{sub.title}:</strong>
                                    )}
                                    <span>{sub.content}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Sample Images (30%) */}
                      <div style={{ flex: '0 0 260px', minWidth: '220px', borderLeft: '1px solid #F1F5F9', paddingLeft: '20px' }}>
                        <div style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          color: '#64748B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>Ảnh mẫu tiêu chuẩn:</span>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                            ({step.images?.length || 0})
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {(step.images || []).map((img) => {
                            const imgSrc = getFullImageUrl(img.image_url);
                            return (
                              <div
                                key={img.id}
                                style={{
                                  position: 'relative',
                                  width: '84px',
                                  height: '84px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #E2E8F0',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  backgroundColor: '#F8FAFC',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                  transition: 'transform 0.15s'
                                }}
                                onClick={() => setLightboxImage(imgSrc)}
                                title="Bấm để xem ảnh phóng to"
                              >
                                <img
                                  src={imgSrc}
                                  alt={img.file_name || 'step sample'}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteImage(step.id, img.id);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                  title="Xóa ảnh này"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}

                          {/* Upload image button */}
                          <button
                            type="button"
                            onClick={() => handleTriggerUploadImage(step.id)}
                            style={{
                              width: '84px',
                              height: '84px',
                              borderRadius: '8px',
                              border: '1.5px dashed #CBD5E1',
                              backgroundColor: '#FAF6F0',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              color: '#7B5233',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#7B5233';
                              e.currentTarget.style.backgroundColor = '#F5ECE3';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#CBD5E1';
                              e.currentTarget.style.backgroundColor = '#FAF6F0';
                            }}
                            title="Tải thêm ảnh mẫu tiêu chuẩn cho bước này"
                          >
                            <Upload size={16} />
                            <span>+ Thêm ảnh</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ========================================================= */
              /* VIEW MODE 2: DẠNG BẢNG TỔNG HỢP (TABLE VIEW CHUẨN)        */
              /* ========================================================= */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 14px', textAlign: 'center', width: '60px', fontWeight: '800', color: '#475569' }}>STT</th>
                      <th style={{ padding: '12px 18px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>Tên bước & Hướng dẫn thao tác</th>
                      <th style={{ padding: '12px 18px', textAlign: 'left', width: '25%', fontWeight: '800', color: '#475569' }}>Tiêu chuẩn chấp nhận</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', width: '130px', fontWeight: '800', color: '#475569' }}>Ảnh mẫu</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', width: '110px', fontWeight: '800', color: '#475569' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guide.steps.map((step, idx) => (
                      <tr
                        key={step.id}
                        style={{
                          borderBottom: '1px solid #E2E8F0',
                          backgroundColor: idx % 2 === 0 ? 'white' : '#FCFBFA'
                        }}
                      >
                        {/* STT */}
                        <td style={{ padding: '14px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: '#FAF0E6',
                              color: '#7B5233',
                              fontWeight: '800',
                              fontSize: '0.85rem',
                              border: '1.5px solid #EADCC9'
                            }}>
                              {idx + 1}
                            </span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveStep(idx, -1)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                  opacity: idx === 0 ? 0.2 : 0.7,
                                  padding: '2px',
                                  color: '#334155'
                                }}
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === guide.steps.length - 1}
                                onClick={() => handleMoveStep(idx, 1)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  cursor: idx === guide.steps.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: idx === guide.steps.length - 1 ? 0.2 : 0.7,
                                  padding: '2px',
                                  color: '#334155'
                                }}
                              >
                                <ArrowDown size={13} />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Title & Formatted Content */}
                        <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '0.96rem', marginBottom: '8px' }}>
                            {step.title}
                          </div>
                          {step.content ? (
                            <div style={{
                              backgroundColor: '#FAFAF9',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              border: '1px solid #E7E5E4',
                              color: '#334155',
                              fontSize: '0.85rem'
                            }}>
                              <FormattedTextView text={step.content} />
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic' }}>Chưa có nội dung thao tác</span>
                          )}
                        </td>

                        {/* Sub-steps */}
                        <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                          {(!step.sub_steps || step.sub_steps.length === 0) ? (
                            <span style={{ color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic' }}>---</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {step.sub_steps.map((sub, sIdx) => (
                                <div key={sub.id || sIdx} style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '6px',
                                  fontSize: '0.82rem',
                                  color: '#166534',
                                  backgroundColor: '#F0FDF4',
                                  padding: '6px 10px',
                                  borderRadius: '5px',
                                  border: '1px solid #DCFCE7'
                                }}>
                                  <span style={{ fontWeight: '800', color: '#059669' }}>✓</span>
                                  <span>{sub.content}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Images */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                            {(step.images || []).map((img) => {
                              const imgSrc = getFullImageUrl(img.image_url);
                              return (
                                <div
                                  key={img.id}
                                  style={{
                                    position: 'relative',
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setLightboxImage(imgSrc)}
                                >
                                  <img src={imgSrc} alt="sample" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => handleTriggerUploadImage(step.id)}
                              style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '6px',
                                border: '1.5px dashed #CBD5E1',
                                backgroundColor: '#FAF6F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#7B5233',
                                cursor: 'pointer'
                              }}
                              title="+ Ảnh"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditStep(step)}
                              style={{
                                padding: '5px 8px',
                                border: '1px solid #BFDBFE',
                                backgroundColor: '#EFF6FF',
                                borderRadius: '5px',
                                color: '#1D4ED8',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStep(step.id)}
                              style={{
                                padding: '5px 8px',
                                border: '1px solid #FECACA',
                                backgroundColor: '#FEF2F2',
                                borderRadius: '5px',
                                color: '#DC2626',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CHỌN HƯỚNG DẪN KIỂM TRA CÓ SẴN (LINK MODAL)      */}
      {/* ========================================================= */}
      {showLinkModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid #EADCC9',
              backgroundColor: '#FAF6F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#7B5233', fontWeight: '800' }}>
                  Liên kết Hướng dẫn kiểm tra (HDKT)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Chọn 1 tài liệu Hướng dẫn kiểm tra để liên kết 1 - 1 với quy trình <strong>{formData.code}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search bar */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '8px' }}>
              <div style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã hoặc tên hướng dẫn..."
                  value={searchGuideQuery}
                  onChange={(e) => setSearchGuideQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '6px 12px 6px 36px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Guides List */}
            <div style={{ padding: '14px 20px', flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
              {loadingUnlinked ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#7B5233' }} />
                  <span>Đang tải danh sách HDKT...</span>
                </div>
              ) : filteredUnlinkedList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                  Không tìm thấy Hướng dẫn kiểm tra nào khả dụng.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredUnlinkedList.map((g) => {
                    const isSelected = selectedGuideIdToLink === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGuideIdToLink(g.id)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #7B5233' : '1px solid #E2E8F0',
                          backgroundColor: isSelected ? '#FAF6F0' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="radio"
                            name="selectedGuide"
                            checked={isSelected}
                            onChange={() => setSelectedGuideIdToLink(g.id)}
                            style={{ cursor: 'pointer', accentColor: '#7B5233', width: '16px', height: '16px' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '800', color: '#1E293B', fontSize: '0.88rem' }}>
                                [{g.code}]
                              </span>
                              <span style={{ color: '#334155', fontSize: '0.88rem', fontWeight: '600' }}>
                                {g.name}
                              </span>
                              {g.is_current && (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: '800',
                                  backgroundColor: '#DCFCE7',
                                  color: '#166534',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  Đang liên kết
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                              {g.steps_count || 0} bước kiểm tra • Loại: {g.doc_type || 'HDKT'}
                            </span>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.78rem',
                          color: isSelected ? '#7B5233' : '#94A3B8',
                          fontWeight: isSelected ? '800' : 'normal'
                        }}>
                          {isSelected ? '✓ Đang chọn' : 'Chọn'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={linking || !selectedGuideIdToLink}
                onClick={handleConfirmLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: '#7B5233',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  cursor: (linking || !selectedGuideIdToLink) ? 'not-allowed' : 'pointer',
                  opacity: (linking || !selectedGuideIdToLink) ? 0.6 : 1
                }}
              >
                {linking ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{linking ? 'Đang liên kết...' : 'Xác nhận liên kết'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: TẠO MỚI HƯỚNG DẪN KIỂM TRA (QUICK CREATE)        */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid #EADCC9',
              backgroundColor: '#FAF6F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#7B5233', fontWeight: '800' }}>
                  Tạo mới Hướng dẫn kiểm tra (HDKT)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Tạo tài liệu mới và tự động gắn liên kết 1 - 1 với quy trình hiện tại
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Mã Hướng dẫn kiểm tra <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  placeholder="VD: HD-G7.SX.QT01..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Tên Hướng dẫn kiểm tra <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="VD: Hướng dẫn kiểm tra tem nhãn..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Mô tả ngắn
                </label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Nhập mô tả mục đích hoặc phạm vi kiểm tra..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleConfirmCreate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: '#7B5233',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.6 : 1
                }}
              >
                {creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>{creating ? 'Đang tạo...' : 'Tạo & Liên kết'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: XÁC NHẬN HỦY LIÊN KẾT (UNLINK CONFIRM)          */}
      {/* ========================================================= */}
      {showUnlinkConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626'
            }}>
              <Unlink size={28} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1F2937', fontWeight: '800' }}>
              Xác nhận hủy liên kết HDKT?
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#6B7280', lineHeight: '1.5' }}>
              Hệ thống sẽ ngắt liên kết giữa quy trình này và Hướng dẫn kiểm tra <strong>[{guide?.code}] {guide?.name}</strong>.
              <br />
              <em>(Dữ liệu của Hướng dẫn kiểm tra vẫn được lưu giữ đầy đủ tại /admin/inspection-guides).</em>
            </p>
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowUnlinkConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'white',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Không, giữ lại
              </button>
              <button
                type="button"
                disabled={unlinking}
                onClick={handleConfirmUnlink}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: unlinking ? 'not-allowed' : 'pointer',
                  opacity: unlinking ? 0.7 : 1
                }}
              >
                {unlinking ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: THÊM / SỬA BƯỚC KIỂM TRA                         */}
      {/* ========================================================= */}
      {showStepModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '660px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1.5px solid #EADCC9',
              backgroundColor: '#FAF6F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#7B5233', fontWeight: '800' }}>
                {editingStep ? `Chỉnh sửa Bước ${editingStep.step_no}` : 'Thêm bước kiểm tra mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowStepModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Tên bước kiểm tra <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={stepFormData.title}
                  onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                  placeholder="VD: Bước 1: Kiểm tra tính hợp lệ của tem nhãn..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Nội dung hướng dẫn & Lưu ý thao tác
                </label>
                <textarea
                  rows={6}
                  value={stepFormData.content}
                  onChange={(e) => setStepFormData({ ...stepFormData, content: e.target.value })}
                  placeholder="Nhập chi tiết các thao tác thực hiện kiểm tra..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: '1.5'
                  }}
                />
              </div>

              {/* Sub-steps (Acceptance Criteria) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    Tiêu chuẩn chấp nhận con (Tùy chọn)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSubStepRow}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: '#FAF6F0',
                      border: '1px solid #EADCC9',
                      borderRadius: '5px',
                      color: '#7B5233',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={13} />
                    <span>+ Thêm tiêu chuẩn</span>
                  </button>
                </div>

                {stepFormData.sub_steps.length === 0 ? (
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px dashed #CBD5E1', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                    Chưa có tiêu chuẩn con riêng lẻ (các tiêu chuẩn có thể viết trực tiếp trong nội dung hướng dẫn ở trên).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stepFormData.sub_steps.map((sub, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748B', width: '20px', textAlign: 'center', fontWeight: '700' }}>
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={sub.content}
                          onChange={(e) => handleSubStepChange(idx, 'content', e.target.value)}
                          placeholder="Nội dung tiêu chuẩn chấp nhận..."
                          style={{
                            flex: 1,
                            height: '36px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.84rem',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSubStepRow(idx)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: '#EF4444',
                            padding: '4px'
                          }}
                          title="Xóa tiêu chuẩn này"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowStepModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={savingStep}
                onClick={handleSaveStepModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: '#7B5233',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  cursor: savingStep ? 'not-allowed' : 'pointer',
                  opacity: savingStep ? 0.7 : 1
                }}
              >
                {savingStep ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{savingStep ? 'Đang lưu...' : 'Lưu bước'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: LIGHTBOX ENLARGED IMAGE PREVIEW                  */}
      {/* ========================================================= */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out'
          }}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                backgroundColor: 'rgba(255,255,255,0.25)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImage}
              alt="Ảnh phóng to"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '8px',
                objectFit: 'contain',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default ProcessInstructionsTab;

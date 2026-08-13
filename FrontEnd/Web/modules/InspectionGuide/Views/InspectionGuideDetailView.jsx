import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Save, Trash2, Plus, Upload, X, ChevronUp, ChevronDown,
  Layers, Image as ImageIcon, Smartphone, ShieldCheck,
  CheckSquare, ListChecks, Edit3, Check, AlertCircle
} from 'lucide-react';
import api, { getFullImageUrl } from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import GuideAssignmentTab from './components/GuideAssignmentTab';
import RichTextEditor from '../../ISO/components/RichTextEditor';
import { cleanWordClipboardText, handlePasteCleanText, FormattedTextView } from '@shared/utils/textFormatter';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const IMAGE_LIMIT = 10;

const InspectionGuideDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/inspection-guides/edit/:id');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Core Data
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [activeTab, setActiveTab] = useState('steps'); // 'steps' | 'assignments'

  // General info state
  const [metaForm, setMetaForm] = useState({ name: '', description: '', doc_type: 'HDKT', is_active: true });

  // Selected Step for editing in Right Column
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [stepDraft, setStepDraft] = useState({ title: '', content: '' });
  const [savingStep, setSavingStep] = useState(false);

  // Sub-step State (Tiêu chí chi tiết hoặc Phân nhánh trường hợp)
  const [subStepDraft, setSubStepDraft] = useState({ title: '', content: '' });
  const [showSubStepInput, setShowSubStepInput] = useState(false);
  const [addingSubStep, setAddingSubStep] = useState(false);
  const [editingSubStepId, setEditingSubStepId] = useState(null);
  const [editingSubStepDraft, setEditingSubStepDraft] = useState({ title: '', content: '' });
  const [confirmDeleteSubStep, setConfirmDeleteSubStep] = useState(null);

  // Modals & Popups
  const [lightboxImage, setLightboxImage] = useState(null);
  const [confirmDeleteGuide, setConfirmDeleteGuide] = useState(false);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(null);
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Derived state
  const selectedStep = (guide?.steps || []).find(s => s.id === selectedStepId) || null;

  const isSOS = (guide?.doc_type || metaForm.doc_type) === 'SOS';
  const isCTQ = (guide?.doc_type || metaForm.doc_type) === 'CTQ';
  const themeColor = isSOS ? '#0284C7' : isCTQ ? '#E11D48' : '#7B5233';
  const themeBg = isSOS ? '#F0F9FF' : isCTQ ? '#FFF1F2' : '#FAF6F0';
  const themeBorder = isSOS ? '#BAE6FD' : isCTQ ? '#FECDD3' : '#EADCC9';
  const stepNoun = isSOS ? 'thao tác' : isCTQ ? 'chú ý' : 'kiểm tra';
  const stepLabel = isSOS ? 'bước thao tác' : isCTQ ? 'điểm kiểm soát' : 'bước kiểm tra';

  const fetchGuide = async (preferredStepId = null) => {
    setLoading(true);
    try {
      const res = await api.get(`/inspection-guides/${id}`);
      setGuide(res);
      setMetaForm({
        name: res.name || '',
        description: res.description || '',
        doc_type: res.doc_type || 'HDKT',
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
      console.error('Lỗi tải dữ liệu hướng dẫn:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi tải dữ liệu hướng dẫn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuide();
  }, [id]);

  // Change selected step in left panel
  const handleSelectStep = (step) => {
    setSelectedStepId(step.id);
    setStepDraft({ title: step.title || '', content: step.content || '' });
    setSubStepDraft({ title: '', content: '' });
    setShowSubStepInput(false);
    setEditingSubStepId(null);
  };

  // Save Guide Meta Information
  const handleSaveMeta = async (e) => {
    if (e) e.preventDefault();
    setSavingMeta(true);
    try {
      await api.put(`/inspection-guides/${id}`, {
        name: metaForm.name,
        description: metaForm.description,
        doc_type: metaForm.doc_type,
        is_active: metaForm.is_active
      });
      setGuide(prev => ({
        ...prev,
        name: metaForm.name,
        description: metaForm.description,
        doc_type: metaForm.doc_type,
        is_active: metaForm.is_active
      }));
      if (toast) toast('success', 'Đã lưu thông tin tài liệu ban hành thành công!');
    } catch (err) {
      console.error('Lỗi lưu thông tin tài liệu:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi lưu thông tin tài liệu.');
    } finally {
      setSavingMeta(false);
    }
  };

  const getBackUrl = () => {
    if (guide?.doc_type === 'SOS' || metaForm.doc_type === 'SOS') return '/admin/sos-guides';
    if (guide?.doc_type === 'CTQ' || metaForm.doc_type === 'CTQ') return '/admin/ctq-guides';
    return '/admin/inspection-guides';
  };

  // Delete Guide
  const handleDeleteGuide = async () => {
    try {
      await api.delete(`/inspection-guides/${id}`);
      if (toast) toast('success', 'Đã xóa tài liệu thành công.');
      navigate(getBackUrl());
    } catch (err) {
      if (toast) toast('error', 'Lỗi khi xóa tài liệu.');
    }
  };

  // --- STEP OPERATIONS ---

  // Add Step
  const handleAddStep = async () => {
    try {
      const steps = guide?.steps || [];
      const maxNo = steps.reduce((m, s) => Math.max(m, s.step_no), 0);
      const newNo = maxNo + 1;
      const created = await api.post(`/inspection-guides/${id}/steps`, {
        step_no: newNo,
        title: `Bước ${newNo}: Tiêu chuẩn kiểm tra mới`,
        content: ''
      });
      if (toast) toast('success', `Đã thêm Bước ${newNo} thành công.`);
      await fetchGuide(created.id);
    } catch (err) {
      console.error('Lỗi thêm bước:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi thêm bước.');
    }
  };

  // Update current step
  const handleSaveStep = async () => {
    if (!selectedStep) return;
    if (!stepDraft.title.trim()) {
      if (toast) toast('warning', 'Vui lòng nhập tiêu đề bước kiểm tra.');
      return;
    }
    setSavingStep(true);
    try {
      await api.put(`/inspection-guides/${id}/steps/${selectedStep.id}`, {
        step_no: selectedStep.step_no,
        title: stepDraft.title.trim(),
        content: stepDraft.content.trim()
      });
      if (toast) toast('success', 'Đã lưu nội dung bước kiểm tra thành công!');
      setGuide(prev => ({
        ...prev,
        steps: prev.steps.map(s => s.id === selectedStep.id ? { ...s, title: stepDraft.title.trim(), content: stepDraft.content.trim() } : s)
      }));
    } catch (err) {
      console.error('Lỗi lưu bước:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi cập nhật bước.');
    } finally {
      setSavingStep(false);
    }
  };

  // Delete Step
  const handleConfirmDeleteStep = async () => {
    if (!confirmDeleteStep) return;
    try {
      await api.delete(`/inspection-guides/${id}/steps/${confirmDeleteStep.id}`);
      if (toast) toast('success', `Đã xóa "${confirmDeleteStep.title}" thành công.`);
      setConfirmDeleteStep(null);
      await fetchGuide();
    } catch (err) {
      if (toast) toast('error', 'Lỗi khi xóa bước kiểm tra.');
    }
  };

  // Reorder Steps (Move Up / Down)
  const handleMoveStep = async (stepIndex, direction) => {
    const steps = [...(guide?.steps || [])];
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const temp = steps[stepIndex];
    steps[stepIndex] = steps[targetIndex];
    steps[targetIndex] = temp;

    const ids = steps.map(s => s.id);
    try {
      await api.post(`/inspection-guides/${id}/steps/reorder`, { ids });
      if (toast) toast('success', 'Đã cập nhật thứ tự các bước.');
      await fetchGuide(temp.id);
    } catch (err) {
      if (toast) toast('error', 'Lỗi sắp xếp bước.');
    }
  };

  // --- SUB-STEP OPERATIONS ---

  // Add Sub-step
  const handleAddSubStep = async (e) => {
    if (e) e.preventDefault();
    const titleTrimmed = subStepDraft.title?.trim() || '';
    const contentTrimmed = subStepDraft.content?.trim() || '';
    if (!selectedStep || (!titleTrimmed && !contentTrimmed)) {
      if (toast) toast('warning', 'Vui lòng nhập tiêu đề hoặc nội dung cho bước nhỏ.');
      return;
    }
    setAddingSubStep(true);
    try {
      const subs = selectedStep.sub_steps || [];
      const maxNo = subs.reduce((m, s) => Math.max(m, s.sub_step_no), 0);
      const newNo = maxNo + 1;
      await api.post(`/inspection-guides/${id}/steps/${selectedStep.id}/sub-steps`, {
        sub_step_no: newNo,
        title: titleTrimmed || null,
        content: contentTrimmed || null
      });
      setSubStepDraft({ title: '', content: '' });
      if (toast) toast('success', `Đã thêm bước nhỏ ${selectedStep.step_no}.${newNo} thành công.`);
      await fetchGuide(selectedStep.id);
    } catch (err) {
      console.error('Lỗi thêm bước nhỏ:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi thêm bước nhỏ.');
    } finally {
      setAddingSubStep(false);
    }
  };

  // Update Sub-step
  const handleSaveSubStepEdit = async (sub) => {
    const titleTrimmed = editingSubStepDraft.title?.trim() || '';
    const contentTrimmed = editingSubStepDraft.content?.trim() || '';
    if (!selectedStep || (!titleTrimmed && !contentTrimmed)) {
      if (toast) toast('warning', 'Vui lòng nhập tiêu đề hoặc nội dung bước nhỏ.');
      return;
    }
    try {
      await api.put(`/inspection-guides/${id}/steps/${selectedStep.id}/sub-steps/${sub.id}`, {
        sub_step_no: sub.sub_step_no,
        title: titleTrimmed || null,
        content: contentTrimmed || null
      });
      setEditingSubStepId(null);
      if (toast) toast('success', 'Đã cập nhật bước nhỏ thành công!');
      await fetchGuide(selectedStep.id);
    } catch (err) {
      if (toast) toast('error', 'Lỗi cập nhật bước nhỏ.');
    }
  };

  // Delete Sub-step
  const handleConfirmDeleteSubStep = async () => {
    if (!selectedStep || !confirmDeleteSubStep) return;
    try {
      await api.delete(`/inspection-guides/${id}/steps/${selectedStep.id}/sub-steps/${confirmDeleteSubStep.id}`);
      if (toast) toast('success', 'Đã xóa bước nhỏ thành công.');
      setConfirmDeleteSubStep(null);
      await fetchGuide(selectedStep.id);
    } catch (err) {
      if (toast) toast('error', 'Lỗi khi xóa bước nhỏ.');
    }
  };

  // Reorder Sub-steps
  const handleMoveSubStep = async (subIndex, direction) => {
    if (!selectedStep) return;
    const subs = [...(selectedStep.sub_steps || [])];
    const targetIndex = direction === 'up' ? subIndex - 1 : subIndex + 1;
    if (targetIndex < 0 || targetIndex >= subs.length) return;

    const temp = subs[subIndex];
    subs[subIndex] = subs[targetIndex];
    subs[targetIndex] = temp;

    const ids = subs.map(s => s.id);
    try {
      await api.post(`/inspection-guides/${id}/steps/${selectedStep.id}/sub-steps/reorder`, { ids });
      if (toast) toast('success', 'Đã cập nhật thứ tự bước nhỏ.');
      await fetchGuide(selectedStep.id);
    } catch (err) {
      if (toast) toast('error', 'Lỗi sắp xếp bước nhỏ.');
    }
  };

  // --- IMAGE OPERATIONS ---

  // Upload images
  const handleUploadImages = async (files) => {
    if (!selectedStep || !files || files.length === 0) return;
    const fileList = Array.from(files);
    const currentCount = selectedStep.images?.length || 0;
    if (currentCount + fileList.length > IMAGE_LIMIT) {
      if (toast) toast('warning', `Mỗi bước tối đa ${IMAGE_LIMIT} ảnh (Hiện có: ${currentCount}).`);
      return;
    }

    setUploadingImages(true);
    const fd = new FormData();
    for (const f of fileList) fd.append('files', f);

    try {
      await api.post(`/inspection-guides/${id}/steps/${selectedStep.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (toast) toast('success', `Đã tải lên ${fileList.length} hình ảnh thành công.`);
      await fetchGuide(selectedStep.id);
    } catch (err) {
      console.error('Lỗi upload ảnh:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi tải lên hình ảnh.');
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete Image
  const handleConfirmDeleteImage = async () => {
    if (!selectedStep || !confirmDeleteImage) return;
    try {
      await api.delete(`/inspection-guides/${id}/steps/${selectedStep.id}/images/${confirmDeleteImage.id}`);
      if (toast) toast('success', 'Đã xóa hình ảnh thành công.');
      setConfirmDeleteImage(null);
      await fetchGuide(selectedStep.id);
    } catch (err) {
      if (toast) toast('error', 'Lỗi khi xóa hình ảnh.');
    }
  };

  // --- PASTE (Ctrl+V) & DRAG-AND-DROP IMAGE HANDLERS ---
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      if (!selectedStep) return;

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type && item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
            const file = new File([blob], `clipboard_${Date.now()}_${i + 1}.${ext}`, { type: blob.type || item.type });
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        handleUploadImages(imageFiles);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [selectedStep, uploadingImages, id]);

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type && f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        handleUploadImages(imageFiles);
      } else if (toast) {
        toast('warning', 'Vui lòng chỉ kéo thả các file định dạng hình ảnh (PNG, JPG, JPEG, WEBP).');
      }
    }
  };



  if (loading && !guide) {
    return (
      <div style={{ padding: 60, textAlign: 'center', backgroundColor: '#FAF8F6', minHeight: '100vh' }}>
        <h3 style={{ color: '#7B5233' }}>Đang tải dữ liệu Hướng dẫn kiểm tra SOP...</h3>
      </div>
    );
  }

  if (!guide) {
    return (
      <div style={{ padding: 60, textAlign: 'center', backgroundColor: '#FAF8F6', minHeight: '100vh' }}>
        <AlertCircle size={48} color="#DC2626" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ color: '#2D1A12' }}>Không tìm thấy tài liệu hướng dẫn kiểm tra</h2>
        <button
          onClick={() => navigate('/admin/inspection-guides')}
          style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, backgroundColor: '#7B5233', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}
        >
          ← Quay lại danh sách
        </button>
      </div>
    );
  }

  const steps = guide.steps || [];

  return (
    <div className="guide-management-container" style={{ padding: '20px 32px', fontFamily: 'Inter, sans-serif', backgroundColor: '#FAF8F6', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Top Sticky Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
        padding: '14px 20px',
        borderRadius: 14,
        border: '1px solid #EADCC9',
        boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Left: Breadcrumbs & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(getBackUrl())}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: themeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            title="Quay lại danh sách"
            onMouseEnter={e => e.currentTarget.style.borderColor = themeColor}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: themeBg,
                color: themeColor,
                border: `1px solid ${themeBorder}`,
                fontWeight: 800,
                fontSize: 12,
                fontFamily: 'monospace'
              }}>
                {guide.code}
              </span>
              <span style={{
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: themeColor,
                color: '#FFF',
                fontWeight: 800,
                fontSize: 11.5
              }}>
                {isSOS ? 'Hướng dẫn thao tác (SOS)' : isCTQ ? 'Lỗi cần chú ý (CTQ)' : 'Hướng dẫn kiểm tra (HDKT)'}
              </span>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                Tài liệu ban hành
              </span>
            </div>
            <h1 style={{ margin: '4px 0 0 0', fontSize: '1.35rem', color: '#2D1A12', fontWeight: 800 }}>
              {guide.name}
            </h1>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Active Status Switch */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 20,
            backgroundColor: metaForm.is_active ? '#D1FAE5' : '#FEE2E2',
            color: metaForm.is_active ? '#065F46' : '#991B1B',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={metaForm.is_active}
              onChange={e => setMetaForm(prev => ({ ...prev, is_active: e.target.checked }))}
              style={{ accentColor: '#059669' }}
            />
            {metaForm.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
          </label>

          {/* Delete Guide Button */}
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
            <Trash2 size={16} /> Xóa tài liệu
          </button>
        </div>
      </div>

      {/* Top Section: General Info & Tabs Navigation */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #EADCC9',
        padding: '20px 24px',
        marginBottom: 20,
        boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)'
      }}>
        {/* Main Form Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) minmax(260px, 1.4fr) minmax(280px, 1.6fr) 120px', gap: 14, alignItems: 'start' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: themeColor, textTransform: 'uppercase', marginBottom: 6 }}>
              Phân loại & Mã tài liệu
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: themeBg,
              border: `1.5px solid ${themeBorder}`,
              height: 42,
              boxSizing: 'border-box'
            }}>
              <span style={{
                fontWeight: 800,
                fontSize: 13,
                color: themeColor,
                fontFamily: 'monospace'
              }}>
                {guide.code}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                backgroundColor: themeColor,
                color: '#FFF',
                padding: '2px 8px',
                borderRadius: 6
              }}>
                {isSOS ? 'SOS' : isCTQ ? 'CTQ' : 'HDKT'}
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: themeColor, textTransform: 'uppercase', marginBottom: 6 }}>
              {isSOS ? 'Tên Hướng dẫn thao tác *' : isCTQ ? 'Tên Tiêu chuẩn Lỗi *' : 'Tên Hướng dẫn kiểm tra *'}
            </label>
            <input
              type="text"
              value={metaForm.name}
              onChange={e => setMetaForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder={
                isSOS
                  ? "VD: Hướng dẫn thao tác căn chỉnh cữ máy phay mộng dương"
                  : isCTQ
                  ? "VD: Các điểm lỗi chất lượng trọng yếu công đoạn ghép finger"
                  : "VD: Hướng dẫn kiểm tra ngoại quan phôi gỗ sấy"
              }
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                fontWeight: 600,
                color: '#2D1A12',
                backgroundColor: '#FAF8F6',
                height: 42,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
              {isSOS ? 'Vị trí & Phạm vi áp dụng' : 'Mô tả / Phạm vi áp dụng'}
            </label>
            <input
              type="text"
              value={metaForm.description}
              onChange={e => setMetaForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả tóm tắt mục đích và tiêu chuẩn chất lượng..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 14,
                color: '#374151',
                backgroundColor: '#FAF8F6',
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
                backgroundColor: themeColor,
                color: '#FFF',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: savingMeta ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: `0 2px 6px ${themeColor}30`,
                height: 42
              }}
            >
              <Save size={16} /> {savingMeta ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: 12,
          borderTop: '1px solid #F1F5F9',
          marginTop: 18,
          paddingTop: 14
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('steps')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeTab === 'steps' ? themeColor : '#F1F5F9',
              color: activeTab === 'steps' ? '#FFF' : '#64748B',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow: activeTab === 'steps' ? `0 2px 8px ${themeColor}30` : 'none'
            }}
          >
            <Layers size={16} /> Danh mục các {stepLabel} ({steps.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: activeTab === 'assignments' ? themeColor : '#F1F5F9',
              color: activeTab === 'assignments' ? '#FFF' : '#64748B',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow: activeTab === 'assignments' ? `0 2px 8px ${themeColor}30` : 'none'
            }}
          >
            <ShieldCheck size={16} /> Cấu hình Liên kết Loại phiếu & Công đoạn ({guide.assignments?.length || 0})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'assignments' ? (
        <GuideAssignmentTab
          guideId={guide.id}
          initialAssignments={guide.assignments || []}
          onSaved={() => fetchGuide(selectedStepId)}
        />
      ) : (
        /* TAB 1: MASTER-DETAIL 2-COLUMN WORKFLOW BUILDER */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 340px) 1fr',
          gap: 20,
          alignItems: 'start'
        }}>
          {/* LEFT COLUMN: STEP NAVIGATION TIMELINE */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: `1px solid ${themeBorder}`,
            padding: 16,
            boxShadow: `0 4px 12px ${themeColor}0a`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 10,
              borderBottom: '1px solid #F1F5F9'
            }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#2D1A12', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={16} color={themeColor} /> Quy trình {stepNoun} ({steps.length})
              </div>
            </div>

            {/* Steps List */}
            {steps.length === 0 ? (
              <div style={{
                padding: '30px 16px',
                textAlign: 'center',
                backgroundColor: themeBg,
                borderRadius: 10,
                border: `1px dashed ${themeBorder}`,
                color: '#64748B'
              }}>
                <BookOpen size={32} style={{ opacity: 0.4, margin: '0 auto 8px auto', color: themeColor }} />
                <p style={{ fontSize: 13, margin: '0 0 12px 0' }}>Chưa có {stepLabel} nào trong quy trình.</p>
                <button
                  type="button"
                  onClick={handleAddStep}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    backgroundColor: themeColor,
                    color: '#FFF',
                    border: 'none',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: `0 2px 6px ${themeColor}30`
                  }}
                >
                  + Thêm bước 1
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '68vh', overflowY: 'auto' }}>
                {steps.map((step, idx) => {
                  const isSelected = step.id === selectedStepId;
                  const subCount = step.sub_steps?.length || 0;
                  const imgCount = step.images?.length || 0;

                  return (
                    <div
                      key={step.id}
                      onClick={() => handleSelectStep(step)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        backgroundColor: isSelected ? themeBg : '#FFFFFF',
                        border: isSelected ? `2px solid ${themeColor}` : '1px solid #E5E7EB',
                        boxShadow: isSelected ? `0 4px 12px ${themeColor}20` : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = '#CBD5E1';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                    >
                      {/* Step Top: Step Badge & Reorder Arrows */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            backgroundColor: isSelected ? themeColor : '#E2E8F0',
                            color: isSelected ? '#FFF' : '#475569',
                            fontWeight: 800,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {step.step_no || idx + 1}
                          </span>
                          <span style={{
                            fontSize: 13.5,
                            fontWeight: 800,
                            color: isSelected ? themeColor : '#2D1A12',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 180
                          }}>
                            {step.title}
                          </span>
                        </div>

                        {/* Reorder Buttons (Up / Down) */}
                        <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStep(idx, 'up')}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              border: 'none',
                              backgroundColor: '#F1F5F9',
                              color: idx === 0 ? '#CBD5E1' : '#475569',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Di chuyển bước lên trên"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === steps.length - 1}
                            onClick={() => handleMoveStep(idx, 'down')}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              border: 'none',
                              backgroundColor: '#F1F5F9',
                              color: idx === steps.length - 1 ? '#CBD5E1' : '#475569',
                              cursor: idx === steps.length - 1 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Di chuyển bước xuống dưới"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Step Sub-meta Chips */}
                      <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: '#64748B', paddingLeft: 32 }}>
                        {subCount > 0 && (
                          <span style={{ color: '#065F46', fontWeight: 700 }}>
                            {subCount} bước nhỏ
                          </span>
                        )}
                        <span><strong>{imgCount}</strong> ảnh minh họa</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add New Step Button */}
            <button
              type="button"
              onClick={handleAddStep}
              style={{
                marginTop: 4,
                padding: '10px',
                borderRadius: 10,
                border: `1.5px dashed ${themeColor}`,
                backgroundColor: themeBg,
                color: themeColor,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = themeColor; e.currentTarget.style.color = '#FFF'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = themeBg; e.currentTarget.style.color = themeColor; }}
            >
              <Plus size={16} /> Thêm {stepLabel} mới
            </button>
          </div>

          {/* RIGHT COLUMN: STEP DETAIL EDITOR */}
          {selectedStep ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: `1px solid ${themeBorder}`,
              padding: 24,
              boxShadow: `0 4px 14px ${themeColor}0a`,
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              {/* Step Editor Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 16,
                borderBottom: '1px solid #F1F5F9',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: themeColor,
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 2px 6px ${themeColor}35`
                  }}>
                    {selectedStep.step_no}
                  </span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#2D1A12', fontWeight: 800 }}>
                      Chỉnh sửa Bước #{selectedStep.step_no}
                    </h2>
                    <span style={{ fontSize: 12.5, color: '#64748B' }}>
                      Thiết lập tiêu đề, hướng dẫn {stepNoun} chi tiết, các bước nhỏ và ảnh minh họa
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteStep(selectedStep)}
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
                    <Trash2 size={15} /> Xóa bước này
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveStep}
                    disabled={savingStep}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: themeColor,
                      color: '#FFF',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: savingStep ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: `0 2px 8px ${themeColor}35`
                    }}
                  >
                    <Save size={15} /> {savingStep ? 'Đang lưu...' : 'Lưu bước'}
                  </button>
                </div>
              </div>

              {/* Step Title & Instructions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: themeColor, textTransform: 'uppercase', marginBottom: 6 }}>
                    Tiêu đề {stepLabel} *
                  </label>
                  <input
                    type="text"
                    value={stepDraft.title}
                    onChange={e => setStepDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={
                      isSOS
                        ? "VD: Căn chỉnh cữ dao và kiểm tra độ sắc bén"
                        : isCTQ
                        ? "VD: Kiểm tra điểm nứt gãy và khuyết tật đầu mộng"
                        : "VD: Kiểm tra ngoại quan bề mặt gỗ và vết nứt"
                    }
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#2D1A12',
                      backgroundColor: '#FAF8F6'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Nội dung hướng dẫn {stepNoun} chi tiết & Lưu ý an toàn
                  </label>

                  <RichTextEditor
                    value={stepDraft.content}
                    onChange={val => setStepDraft(prev => ({ ...prev, content: val }))}
                    placeholder={
                      isSOS
                        ? "Mô tả chi tiết các thao tác của công nhân, tư thế làm việc, thông số máy, điểm an toàn lao động..."
                        : "Nhập hướng dẫn thao tác tổng quan, phương pháp đo đạc hoặc tiêu chuẩn chất lượng (hỗ trợ soạn thảo văn bản, bảng biểu, danh sách, màu sắc)..."
                    }
                    style={{ minHeight: 220 }}
                  />
                </div>
              </div>

              {/* BƯỚC NHỎ / TIÊU CHÍ CON SECTION */}
              {((selectedStep.sub_steps && selectedStep.sub_steps.length > 0) || showSubStepInput) ? (
                <div style={{
                  backgroundColor: '#FAF8F6',
                  borderRadius: 14,
                  padding: 16,
                  border: '1.5px solid #EADCC9',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ListChecks size={16} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: '#2D1A12' }}>
                        Các bước nhỏ / Tiêu chí & Phân nhánh trường hợp
                      </span>
                      {selectedStep.sub_steps?.length > 0 && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          fontSize: 11.5,
                          fontWeight: 800
                        }}>
                          {selectedStep.sub_steps.length}
                        </span>
                      )}
                    </div>

                    {(!selectedStep.sub_steps || selectedStep.sub_steps.length === 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubStepInput(false);
                          setSubStepDraft({ title: '', content: '' });
                        }}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#64748B',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <X size={14} /> Đóng lại
                      </button>
                    )}
                  </div>

                  {/* Sub-steps List */}
                  {selectedStep.sub_steps && selectedStep.sub_steps.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      {selectedStep.sub_steps.map((sub, sIdx) => {
                        const isEditing = editingSubStepId === sub.id;

                        if (isEditing) {
                          return (
                            <div
                              key={sub.id || sIdx}
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 10,
                                padding: 14,
                                border: '1.5px solid #7B5233',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                boxShadow: '0 2px 8px rgba(123, 82, 51, 0.1)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                  padding: '2px 7px',
                                  borderRadius: 5,
                                  backgroundColor: '#ECFDF5',
                                  color: '#065F46',
                                  fontWeight: 800,
                                  fontSize: 11.5,
                                  fontFamily: 'monospace'
                                }}>
                                  {selectedStep.step_no}.{sub.sub_step_no || sIdx + 1}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#7B5233' }}>
                                  Chỉnh sửa bước nhỏ / trường hợp
                                </span>
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                                  Tiêu đề bước nhỏ / Tên trường hợp
                                </label>
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingSubStepDraft.title}
                                  onChange={e => setEditingSubStepDraft(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="VD: Trường hợp 1: Lô hàng ĐẠT chất lượng"
                                  style={{
                                    width: '100%',
                                    padding: '7px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #D1D5DB',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#2D1A12'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                                  Nội dung chi tiết / Điều kiện & Hành động thực hiện
                                </label>
                                <RichTextEditor
                                  minHeight={90}
                                  value={editingSubStepDraft.content}
                                  onChange={val => setEditingSubStepDraft(prev => ({ ...prev, content: val }))}
                                  placeholder="Nội dung chi tiết / Điều kiện & Hành động..."
                                />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => setEditingSubStepId(null)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #D1D5DB',
                                    backgroundColor: '#FFF',
                                    color: '#64748B',
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSubStepEdit(sub)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    border: 'none',
                                    backgroundColor: '#059669',
                                    color: '#FFF',
                                    fontWeight: 700,
                                    fontSize: 12.5,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Check size={14} /> Lưu thay đổi
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={sub.id || sIdx}
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: 10,
                              padding: '10px 12px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6
                            }}
                          >
                            {/* Sub-step Header */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: 10
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <span style={{
                                  padding: '2px 7px',
                                  borderRadius: 5,
                                  backgroundColor: '#ECFDF5',
                                  color: '#065F46',
                                  fontWeight: 800,
                                  fontSize: 11.5,
                                  fontFamily: 'monospace',
                                  flexShrink: 0
                                }}>
                                  {selectedStep.step_no}.{sub.sub_step_no || sIdx + 1}
                                </span>

                                <span style={{
                                  fontSize: 13.5,
                                  fontWeight: 800,
                                  color: '#2D1A12',
                                  lineHeight: '1.4'
                                }}>
                                  {sub.title || (sub.content ? (sub.content.length > 50 ? sub.content.slice(0, 50) + '...' : sub.content) : `Bước ${selectedStep.step_no}.${sub.sub_step_no || sIdx + 1}`)}
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                <button
                                  type="button"
                                  disabled={sIdx === 0}
                                  onClick={() => handleMoveSubStep(sIdx, 'up')}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 4,
                                    border: 'none',
                                    backgroundColor: '#F1F5F9',
                                    color: sIdx === 0 ? '#CBD5E1' : '#64748B',
                                    cursor: sIdx === 0 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Di chuyển lên"
                                >
                                  <ChevronUp size={13} />
                                </button>

                                <button
                                  type="button"
                                  disabled={sIdx === (selectedStep.sub_steps?.length || 0) - 1}
                                  onClick={() => handleMoveSubStep(sIdx, 'down')}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 4,
                                    border: 'none',
                                    backgroundColor: '#F1F5F9',
                                    color: sIdx === (selectedStep.sub_steps?.length || 0) - 1 ? '#CBD5E1' : '#64748B',
                                    cursor: sIdx === (selectedStep.sub_steps?.length || 0) - 1 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Di chuyển xuống"
                                >
                                  <ChevronDown size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubStepId(sub.id);
                                    setEditingSubStepDraft({
                                      title: sub.title || '',
                                      content: sub.content || ''
                                    });
                                  }}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 4,
                                    border: 'none',
                                    backgroundColor: '#F5EFE9',
                                    color: '#7B5233',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Sửa bước nhỏ này"
                                >
                                  <Edit3 size={12} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSubStep(sub)}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 4,
                                    border: 'none',
                                    backgroundColor: '#FEE2E2',
                                    color: '#DC2626',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Xóa bước nhỏ này"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Sub-step Detailed Content if present */}
                            {sub.content && (
                              <div style={{
                                marginLeft: 32,
                                padding: '8px 12px',
                                backgroundColor: '#FAF8F6',
                                borderRadius: 6,
                                borderLeft: '3px solid #059669'
                              }}>
                                <FormattedTextView text={sub.content} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Sub-step Form with Title & Content */}
                  <form
                    onSubmit={handleAddSubStep}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 10,
                      padding: 12,
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={14} /> Thêm bước nhỏ / Trường hợp mới (#{selectedStep.step_no}.{(selectedStep.sub_steps?.length || 0) + 1}):
                    </div>

                    <input
                      type="text"
                      autoFocus={showSubStepInput}
                      value={subStepDraft.title}
                      onChange={e => setSubStepDraft(prev => ({ ...prev, title: cleanWordClipboardText(e.target.value) }))}
                      placeholder={`Tiêu đề / Tên trường hợp (VD: Trường hợp 1: Lô hàng ĐẠT chất lượng...)`}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: '1px solid #D1D5DB',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#2D1A12',
                        backgroundColor: '#FAF8F6'
                      }}
                    />

                    <RichTextEditor
                      minHeight={90}
                      value={subStepDraft.content}
                      onChange={val => setSubStepDraft(prev => ({ ...prev, content: val }))}
                      placeholder="Nội dung chi tiết / Điều kiện & Hành động (hỗ trợ định dạng văn bản, bảng biểu, danh sách, màu sắc)..."
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
                      <button
                        type="submit"
                        disabled={addingSubStep || (!subStepDraft.title.trim() && !subStepDraft.content.trim())}
                        style={{
                          padding: '7px 16px',
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: (!subStepDraft.title.trim() && !subStepDraft.content.trim()) ? '#CBD5E1' : '#059669',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: (!subStepDraft.title.trim() && !subStepDraft.content.trim()) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Plus size={14} /> {addingSubStep ? 'Đang thêm...' : `+ Thêm bước nhỏ #${selectedStep.step_no}.${(selectedStep.sub_steps?.length || 0) + 1}`}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Nút thêm bước nhỏ tinh gọn khi chưa có bước nhỏ */
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSubStepInput(true)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: '1px dashed #059669',
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D1FAE5'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ECFDF5'}
                  >
                    <Plus size={14} /> + Thêm bước nhỏ / Phân nhánh trường hợp cho Bước #{selectedStep.step_no}
                  </button>
                </div>
              )}

              {/* PHOTO GALLERY SECTION */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  backgroundColor: isDragging ? '#FFF7ED' : '#FAF8F6',
                  borderRadius: 14,
                  padding: 18,
                  border: isDragging ? '2px dashed #C2410C' : `1px solid ${themeBorder}`,
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <ImageIcon size={18} color={themeColor} />
                    <span style={{ fontWeight: 800, fontSize: 13.5, color: '#2D1A12' }}>
                      Ảnh minh họa {stepNoun} chuẩn ({selectedStep.images?.length || 0} / {IMAGE_LIMIT})
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: themeBg,
                      color: themeColor,
                      padding: '2px 8px',
                      borderRadius: 6,
                      border: `1px solid ${themeBorder}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      ⌨️ Hỗ trợ Ctrl+V dán ảnh trực tiếp
                    </span>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={e => handleUploadImages(e.target.files)}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    disabled={uploadingImages || (selectedStep.images?.length || 0) >= IMAGE_LIMIT}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      backgroundColor: (selectedStep.images?.length || 0) >= IMAGE_LIMIT ? '#CBD5E1' : themeColor,
                      color: '#FFF',
                      border: 'none',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: (selectedStep.images?.length || 0) >= IMAGE_LIMIT ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: `0 2px 6px ${themeColor}30`
                    }}
                  >
                    <Upload size={14} /> {uploadingImages ? 'Đang tải lên...' : '+ Tải ảnh lên'}
                  </button>
                </div>

                {/* Images Grid */}
                {(!selectedStep.images || selectedStep.images.length === 0) ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '32px 20px',
                      textAlign: 'center',
                      backgroundColor: isDragging ? '#FFEDD5' : '#FFFFFF',
                      borderRadius: 12,
                      border: isDragging ? '2px dashed #EA580C' : '1.5px dashed #D1D5DB',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                    onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = themeColor; }}
                    onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = '#D1D5DB'; }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: themeBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px auto',
                      border: `1px solid ${themeBorder}`
                    }}>
                      <ImageIcon size={26} color={themeColor} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#2D1A12' }}>
                      {isDragging ? 'Thả file ảnh vào đây để tải lên ngay' : `Chưa có hình ảnh minh họa cho ${stepLabel} này.`}
                    </p>
                    <div style={{
                      marginTop: 6,
                      fontSize: 12.5,
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      flexWrap: 'wrap'
                    }}>
                      <span>Nhấp để chọn file, kéo thả vào đây hoặc bấm</span>
                      <kbd style={{
                        padding: '2px 7px',
                        backgroundColor: '#F3F4F6',
                        border: '1px solid #D1D5DB',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: 11.5,
                        color: '#1F2937',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>Ctrl + V</kbd>
                      <span>để dán ảnh chụp màn hình (Tối đa 10 ảnh)</span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 12
                  }}>
                    {selectedStep.images.map((img, imgIdx) => (
                      <div
                        key={img.id || imgIdx}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: '1.5px solid #E5E7EB',
                          backgroundColor: '#FFF',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                          group: 'image'
                        }}
                      >
                        <img
                          src={getFullImageUrl(img.image_url)}
                          alt={img.file_name}
                          onClick={() => setLightboxImage(img)}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            cursor: 'pointer'
                          }}
                        />

                        {/* Top Action Overlay: Delete */}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteImage(img)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(220, 38, 38, 0.85)',
                            color: '#FFF',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          title="Xóa ảnh này"
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DC2626'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.85)'}
                        >
                          <X size={14} />
                        </button>

                        {/* Bottom Label Overlay */}
                        <div
                          onClick={() => setLightboxImage(img)}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                            padding: '12px 6px 4px 6px',
                            color: '#FFF',
                            fontSize: 10.5,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                        >
                          {img.file_name || `Ảnh #${imgIdx + 1}`}
                        </div>
                      </div>
                    ))}

                    {/* Add More Tile if < IMAGE_LIMIT */}
                    {selectedStep.images.length < IMAGE_LIMIT && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          aspectRatio: '1',
                          borderRadius: 10,
                          border: isDragging ? '2px dashed #EA580C' : '1.5px dashed #D1D5DB',
                          backgroundColor: isDragging ? '#FFEDD5' : '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          gap: 4,
                          transition: 'all 0.2s',
                          padding: 8,
                          textAlign: 'center'
                        }}
                        onMouseEnter={e => {
                          if (!isDragging) {
                            e.currentTarget.style.borderColor = '#7B5233';
                            e.currentTarget.style.backgroundColor = '#FAF5F0';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isDragging) {
                            e.currentTarget.style.borderColor = '#D1D5DB';
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                          }
                        }}
                      >
                        <Plus size={22} color="#7B5233" />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7B5233' }}>Thêm ảnh</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>(hoặc Ctrl+V)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px dashed #D1D5DB',
              padding: 60,
              textAlign: 'center',
              color: '#64748B'
            }}>
              <BookOpen size={48} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
              <h3 style={{ margin: '0 0 6px 0', color: '#2D1A12' }}>Chưa chọn bước kiểm tra nào</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 13.5 }}>Hãy chọn một bước ở cột bên trái hoặc bấm thêm bước mới.</p>
              <button
                type="button"
                onClick={handleAddStep}
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
                + Thêm bước kiểm tra mới
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 30,
            animation: 'fadeIn 0.2s'
          }}
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <img
              src={getFullImageUrl(lightboxImage.image_url)}
              alt={lightboxImage.file_name}
              style={{
                maxWidth: '100%',
                maxHeight: '82vh',
                borderRadius: 10,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
            />
            <p style={{ color: '#E5E7EB', marginTop: 12, fontSize: 14, fontWeight: 600 }}>
              {lightboxImage.file_name}
            </p>
          </div>
        </div>
      )}

      {/* Delete Guide Confirm Modal */}
      <BeautifulConfirmModal
        isOpen={confirmDeleteGuide}
        onClose={() => setConfirmDeleteGuide(false)}
        onConfirm={handleDeleteGuide}
        title="Xác nhận xóa tài liệu SOP?"
        message={`Bạn có chắc chắn muốn xóa tài liệu "${guide.name}" (${guide.code})?\nThao tác này không thể hoàn tác.`}
        type="danger"
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
      />

      {/* Delete Step Confirm Modal */}
      <BeautifulConfirmModal
        isOpen={Boolean(confirmDeleteStep)}
        onClose={() => setConfirmDeleteStep(null)}
        onConfirm={handleConfirmDeleteStep}
        title="Xác nhận xóa bước kiểm tra?"
        message={`Bạn có chắc chắn muốn xóa "${confirmDeleteStep?.title}"?\nToàn bộ hình ảnh và bước nhỏ thuộc bước này sẽ bị xóa.`}
        type="danger"
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
      />

      {/* Delete Sub-Step Confirm Modal */}
      <BeautifulConfirmModal
        isOpen={Boolean(confirmDeleteSubStep)}
        onClose={() => setConfirmDeleteSubStep(null)}
        onConfirm={handleConfirmDeleteSubStep}
        title="Xác nhận xóa bước nhỏ?"
        message={`Bạn có chắc chắn muốn xóa bước nhỏ: "${confirmDeleteSubStep?.content}"?`}
        type="danger"
        confirmText="Xóa bước nhỏ"
        cancelText="Hủy bỏ"
      />

      {/* Delete Image Confirm Modal */}
      <BeautifulConfirmModal
        isOpen={Boolean(confirmDeleteImage)}
        onClose={() => setConfirmDeleteImage(null)}
        onConfirm={handleConfirmDeleteImage}
        title="Xác nhận xóa ảnh minh họa?"
        message={`Bạn có chắc muốn xóa ảnh "${confirmDeleteImage?.file_name}" khỏi bước kiểm tra này?`}
        type="danger"
        confirmText="Xóa ảnh"
        cancelText="Hủy bỏ"
      />
    </div>
  );
};

export default InspectionGuideDetailView;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import {
  ArrowLeft, Save, Plus, Trash2, Edit, ChevronUp, ChevronDown, CheckCircle, AlertCircle,
  ListPlus, Settings, FileText, Activity, Download, Upload, HelpCircle, Eye,
  ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import '@styles/components.css';
import RichTextEditor from './components/RichTextEditor';
import { FlowchartConnectors, renderCustomOutcomeNode } from './components/FlowchartConnectors';
import { removeDiacritics, isGenericNameText, generateNextQTCode } from './utils/isoUtils';
import logoCty from './utils/logoCty';
import FlowchartTable from './FlowchartTable';
import ProcessContentTab from './components/ProcessContentTab';
import ProcessInstructionsTab from './components/ProcessInstructionsTab';
import ProcessTemplatesTab from './components/ProcessTemplatesTab';
import FlowchartCanvas from './FlowchartCanvas';
import ApprovalSignatureSection from '@modules/ISO/components/ApprovalSignatureSection';
import DocumentBottomSignatures from '@modules/ISO/components/DocumentBottomSignatures';

const ISOProcessEditorView = () => {
  const outletContext = useOutletContext() || {};
  const setCustomTitle = outletContext.setCustomTitle || (() => {});
  const setCustomSubtitle = outletContext.setCustomSubtitle || (() => {});
  const setCustomScreenCode = outletContext.setCustomScreenCode || (() => {});

  const location = useLocation();
  const isProcessMode = location.pathname.includes('/iso-processes');
  const routePath = isProcessMode ? '/admin/iso-processes/edit/:id' : '/admin/iso-documents/edit/:id';
  const { screenCode, title, subtitle } = useScreenMetadataCached(routePath);
  const navigate = useNavigate();
  const { id } = useParams();
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const backPath = isProcessMode ? '/admin/iso-processes' : '/admin/iso-documents';
  const isEditMode = id && id !== 'new';

  // Screen routing states: 'overview' (Màn hình 1), 'step_instructions' (Ảnh 4)
  const [currentScreen, setCurrentScreen] = useState('overview');
  const [activeTab, setActiveTab] = useState('content');
  const [zoomScale, setZoomScale] = useState(1.0);
  const [activeMenu, setActiveMenu] = useState('Mục đích');
  const [selectedStepIdx, setSelectedStepIdx] = useState(-1);
  const [flowchartMode, setFlowchartMode] = useState(() => {
    return localStorage.getItem('iso_flowchart_mode') || 'classic';
  });

  const flowchartCanvasRef = useRef(null);

  const handleSetFlowchartMode = (mode) => {
    setFlowchartMode(mode);
    localStorage.setItem('iso_flowchart_mode', mode);
  };

  const [infoExpanded, setInfoExpanded] = useState(true);
  const [selectedInstructionId, setSelectedInstructionId] = useState(null);
  const [showStepPopup, setShowStepPopup] = useState(false);
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [editingStepIdx, setEditingStepIdx] = useState(-1);
  const [stepForm, setStepForm] = useState({
    id: '',
    step_number: 1,
    name: '',
    note: '',
    standard: '',
    image_url: ''
  });
  // Accordion collapsed states - initialized to false (collapsed) by default
  const [stepsAccordionExpanded, setStepsAccordionExpanded] = useState(false);
  const [historyAccordionExpanded, setHistoryAccordionExpanded] = useState(false);
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    name: '',
    symbol: '',
    version: '01',
    issue_date: new Date().toISOString().split('T')[0],
    issuer: '',
    approver: '',
    approver_bgd: '',
    file_path: '',
    status: 'Hiệu lực',
    folder: '', // display_at
    doc_type: '', // note
    document_level: '',
    iso_document_id: '',
    iso_document_code: '',
    iso_document_name: '',
    revision_logs: [
      { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
    ],
    sections: {},
    section_types: {},
    steps: [],
    instruction_steps: [],
    work_instructions: [],
    related_templates: [],
    inspection_guide_id: null,
    inspection_guide: null
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [systemScreens, setSystemScreens] = useState([]);
  const [isScreenDropdownOpen, setIsScreenDropdownOpen] = useState(false);

  // States for Related Templates
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [showSystemTemplatesModal, setShowSystemTemplatesModal] = useState(false);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [searchTemplateQuery, setSearchTemplateQuery] = useState('');
  const [systemTemplatesFilterOpen, setSystemTemplatesFilterOpen] = useState(false);
  const [systemTemplatesDepartmentFilter, setSystemTemplatesDepartmentFilter] = useState('');

  useEffect(() => {
    if (showSystemTemplatesModal) {
      const fetchSystemTemplates = async () => {
        try {
          const data = await api.get('/iso-documents');
          setSystemTemplates(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Lỗi khi tải danh sách tài liệu hệ thống:', err);
        }
      };
      fetchSystemTemplates();
    }
  }, [showSystemTemplatesModal]);

  const [tempCheckedIds, setTempCheckedIds] = useState([]);

  const handleUploadAttachment = async (e, templateId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataPay = new FormData();
    formDataPay.append('file', file);

    showFeedback('info', 'Đang tải lên tài liệu đính kèm...');
    try {
      const res = await api.post('/iso-documents/upload-attachment', formDataPay, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData(prev => ({
        ...prev,
        related_templates: (prev.related_templates || []).map(t => {
          if (t.id === templateId) {
            return {
              ...t,
              file_name: res.file_name,
              file_path: res.file_path
            };
          }
          return t;
        })
      }));
      showFeedback('success', 'Tải lên tài liệu đính kèm thành công!');
    } catch (err) {
      console.error('Lỗi khi upload tài liệu đính kèm:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể tải lên tài liệu đính kèm');
    }
  };

  const handleDeleteAttachment = (templateId) => {
    setFormData(prev => ({
      ...prev,
      related_templates: (prev.related_templates || []).map(t => {
        if (t.id === templateId) {
          return {
            ...t,
            file_name: '',
            file_path: ''
          };
        }
        return t;
      })
    }));
    showFeedback('success', 'Đã xóa file đính kèm!');
  };

  const handleAddRelatedTemplate = () => {
    const newId = `template_${Date.now()}`;
    const newT = {
      id: newId,
      code: `BM${String((formData.related_templates || []).length + 1).padStart(2, '0')}`,
      title: 'Tài liệu mới',
      scope: 'Tất cả',
      note: '',
      file_name: '',
      file_path: ''
    };
    setFormData(prev => ({
      ...prev,
      related_templates: [...(prev.related_templates || []), newT]
    }));
    setSelectedTemplateId(newId);
  };

  const handleDeleteRelatedTemplate = (templateId) => {
    setFormData(prev => ({
      ...prev,
      related_templates: (prev.related_templates || []).filter(t => t.id !== templateId)
    }));
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
    }
    showFeedback('success', 'Đã xóa tài liệu liên quan!');
  };

  const handleUpdateRelatedTemplate = (templateId, field, value) => {
    setFormData(prev => ({
      ...prev,
      related_templates: (prev.related_templates || []).map(t => {
        if (t.id === templateId) {
          return {
            ...t,
            [field]: value
          };
        }
        return t;
      })
    }));
  };

  const handleOpenSystemTemplatesModal = () => {
    const checkedIds = systemTemplates
      .filter(st => (formData.related_templates || []).some(rt => rt.code === st.code))
      .map(st => st.id);

    setTempCheckedIds(checkedIds);
    setSearchTemplateQuery('');
    setSystemTemplatesDepartmentFilter('');
    setShowSystemTemplatesModal(true);
  };

  const handleUpdateSystemTemplates = () => {
    const checkedDocs = systemTemplates.filter(st => tempCheckedIds.includes(st.id));
    const currentList = [...(formData.related_templates || [])];
    const newList = [];

    checkedDocs.forEach(st => {
      const existing = currentList.find(rt => rt.code === st.code);
      if (existing) {
        newList.push(existing);
      } else {
        newList.push({
          id: `template_${Date.now()}_${st.id}`,
          code: st.code,
          title: st.name,
          scope: st.folder || 'Tất cả',
          note: st.notes || '',
          file_name: st.file_path ? st.file_path.split('/').pop() : '',
          file_path: st.file_path || ''
        });
      }
    });

    setFormData(prev => ({
      ...prev,
      related_templates: newList
    }));

    if (newList.length > 0) {
      if (!newList.some(t => t.id === selectedTemplateId)) {
        setSelectedTemplateId(newList[0].id);
      }
    } else {
      setSelectedTemplateId(null);
    }

    setShowSystemTemplatesModal(false);
    showFeedback('success', 'Đã cập nhật danh sách tài liệu liên quan!');
  };

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const data = await api.get('/screens');
        setSystemScreens(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách màn hình:', err);
      }
    };
    fetchScreens();
  }, []);

  const handleToggleScreen = (routePath) => {
    const currentList = formData.folder ? formData.folder.split(',').map(s => s.trim()).filter(Boolean) : [];
    let newList;
    if (currentList.includes(routePath)) {
      newList = currentList.filter(p => p !== routePath);
    } else {
      newList = [...currentList, routePath];
    }
    handleInputChange('folder', newList.join(', '));
  };

  // Get all sidestep numbers that are in a No-branch chain
  const getSidestepsInfo = () => {
    const sidesteps = new Set();
    const parentToChild = {};

    (formData.steps || []).forEach(step => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        const noStepNum = failPath[0]?.return_to_step;
        if (noStepNum) {
          sidesteps.add(noStepNum);
          parentToChild[step.step_number] = noStepNum;

          let current = noStepNum;
          while (current) {
            const currStep = formData.steps.find(s => String(s.step_number) === String(current));
            const next = currStep?.transition?.next_step || currStep?.next_step;
            if (next && String(next) !== String(current) && !formData.steps.some(s => String(s.step_number) === String(next) && s.node_type === 'decision')) {
              sidesteps.add(next);
              parentToChild[current] = next;
              current = next;
            } else {
              break;
            }
          }
        }
      }
    });
    return { sidesteps, parentToChild };
  };

  const { sidesteps: sidestepSet } = getSidestepsInfo();

  // Calculate maximum No-branch horizontal chain length to adjust canvas padding
  const getMaxLeftChainLength = () => {
    let maxLen = 0;
    (formData.steps || []).forEach(step => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        let current = failPath[0]?.return_to_step;
        let len = 0;
        const visited = new Set();
        while (current && !visited.has(current)) {
          visited.add(current);
          len++;
          const currStep = formData.steps.find(s => String(s.step_number) === String(current));
          current = currStep?.transition?.next_step || currStep?.next_step;
        }
        if (len > maxLen) maxLen = len;
      }
    });
    return maxLen;
  };
  const maxLeftChainLength = getMaxLeftChainLength();

  const getStepDisplayLabels = () => {
    const labels = {};
    const mainSteps = (formData.steps || []).filter(s => !sidestepSet.has(s.step_number));

    mainSteps.forEach((step, index) => {
      const mainNum = index + 1;
      labels[step.step_number] = `B${mainNum}`;
    });

    mainSteps.forEach((step, index) => {
      const mainNum = index + 1;
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        let current = failPath[0]?.return_to_step;

        // Use the parent decision step's main number (mainNum) as the prefix
        const prefixNum = mainNum;

        const visited = new Set();
        let subIdx = 1;
        while (current && !visited.has(current)) {
          visited.add(current);
          const currStep = formData.steps.find(s => String(s.step_number) === String(current));
          if (currStep) {
            labels[currStep.step_number] = `B${prefixNum}.${subIdx}`;
            subIdx++;
            current = currStep.transition?.next_step || currStep.next_step;
            if (mainSteps.some(ms => String(ms.step_number) === String(current))) {
              break;
            }
          } else {
            break;
          }
        }
      }
    });
    return labels;
  };

  const stepDisplayLabels = getStepDisplayLabels();

  // Handle drag-to-scroll (pan) in the flowchart viewport canvas
  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click

    // Ignore interactive element clicks
    const tagName = e.target.tagName.toLowerCase();
    if (tagName === 'button' || tagName === 'input' || tagName === 'select' || tagName === 'option' || e.target.closest('button')) {
      return;
    }

    const container = e.currentTarget;
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';

    const startX = e.clientX;
    const startY = e.clientY;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      container.scrollLeft = scrollLeft - dx;
      container.scrollTop = scrollTop - dy;
    };

    const handleMouseUp = () => {
      container.style.cursor = 'grab';
      container.style.removeProperty('user-select');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Auto-synchronize default step names with their dynamic labels
  useEffect(() => {
    let changed = false;
    const newSteps = (formData.steps || []).map(step => {
      const label = stepDisplayLabels[step.step_number];
      if (label) {
        const cleanNum = label.substring(1); // e.g. "2.1"
        const expectedDefaultName = `Bước mới ${cleanNum}`;
        if (step.name && step.name.startsWith("Bước mới") && step.name !== expectedDefaultName) {
          changed = true;
          return { ...step, name: expectedDefaultName };
        }
      }
      return step;
    });
    if (changed) {
      setFormData(prev => ({ ...prev, steps: newSteps }));
    }
  }, [formData.steps, stepDisplayLabels]);

  const handleQuickTransitionChange = (index, val) => {
    setFormData(prev => {
      const steps = prev.steps.map(s => ({ ...s }));
      if (!steps[index]) return prev;
      if (val === 'new_step') {
        const nextStepNum = steps.length + 1;
        const newStep = {
          step_number: nextStepNum,
          name: `Bước mới ${nextStepNum}`,
          node_type: 'task',
          assignee_role: 'QC',
          transition: null,
          fail_path: []
        };
        steps.push(newStep);
        steps[index] = { ...steps[index], transition: { next_step: nextStepNum } };
        setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
        return { ...prev, steps };
      } else if (val === 'custom') {
        steps[index] = { ...steps[index], transition: { next_step: null, name: "Hoàn tất", node_type: "terminal" } };
        return { ...prev, steps };
      } else if (val === '') {
        steps[index] = { ...steps[index], transition: null };
        return { ...prev, steps };
      } else {
        steps[index] = { ...steps[index], transition: { next_step: parseInt(val) } };
        return { ...prev, steps };
      }
    });
  };

  const handleQuickFailPathChange = (index, val) => {
    setFormData(prev => {
      const steps = prev.steps.map(s => ({ ...s }));
      if (!steps[index]) return prev;
      const currentStep = steps[index];
      const failPath = [...getStepFailPath(currentStep)];
      if (val === 'new_step') {
        const nextStepNum = steps.length + 1;
        const newStep = {
          step_number: nextStepNum,
          name: `Bước mới ${nextStepNum}`,
          node_type: 'task',
          assignee_role: 'QC',
          transition: null,
          fail_path: []
        };
        steps.push(newStep);
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Không đồng ý", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: nextStepNum }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: nextStepNum } : { ...fp });
        }
        steps[index] = { ...currentStep, fail_path: newFailPath, has_branch: true };
        setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
        return { ...prev, steps };
      } else if (val === 'custom') {
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Hủy bỏ / Trả hàng", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: null, node_type: "terminal" }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: null, node_type: "terminal", name: fp.name || "Hủy bỏ / Trả hàng" } : { ...fp });
        }
        steps[index] = { ...currentStep, has_branch: true, fail_path: newFailPath };
        return { ...prev, steps };
      } else if (val === '') {
        steps[index] = { ...currentStep, fail_path: [], has_branch: false };
        return { ...prev, steps };
      } else {
        const stepNum = parseInt(val);
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Xử lý lỗi", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: stepNum }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: stepNum } : { ...fp });
        }
        steps[index] = { ...currentStep, fail_path: newFailPath, has_branch: true };
        return { ...prev, steps };
      }
    });
  };

  // Helper to render a single step card UI cleanly
  const renderSingleStepCard = (step, idx) => {
    const isSelected = selectedStepIdx === idx;
    const isDecision = step.node_type === 'decision';
    const isCondition = step.node_type === 'condition';
    const isTerminal = step.node_type === 'terminal';

    let cardBg = 'white';
    let cardBorder = '1px solid #cbd5e1';
    let cardRadius = '6px';
    let cardPadding = '12px 16px';
    let shapeIcon = '📄';

    if (isTerminal) {
      cardBg = '#F0FDF4';
      cardBorder = '1.5px solid #16a34a';
      cardRadius = '24px';
      shapeIcon = '🏁';
    } else if (isDecision) {
      cardBg = '#FFFBEB';
      cardBorder = '1.5px solid #d97706';
      cardRadius = '8px';
      shapeIcon = '🔶';
    } else if (isCondition) {
      cardBg = '#FAF5FF';
      cardBorder = '1.5px solid #7c3aed';
      cardRadius = '8px';
      shapeIcon = '☶';
    }

    if (isDecision || isCondition) {
      const hasYes = step.transition && (step.transition.next_step !== null || step.transition.name);
      const hasNo = getStepFailPath(step)[0] && (getStepFailPath(step)[0].return_to_step !== null || getStepFailPath(step)[0].name);

      return (
        <div id={`step-card-${step.step_number}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* Custom Outcome Cards (beside the diamond) */}
          {isDecision && getStepFailPath(step)[0] && (getStepFailPath(step)[0].return_to_step === null || getStepFailPath(step)[0].return_to_step === undefined) &&
            renderCustomOutcomeNode(
              `step-card-${step.step_number}-custom-fail`,
              getStepFailPath(step)[0].node_type || 'terminal',
              getStepFailPath(step)[0].name || 'Hủy bỏ',
              true
            )
          }

          {isDecision && step.transition && step.transition.next_step === null &&
            renderCustomOutcomeNode(
              `step-card-${step.step_number}-custom-yes`,
              step.transition.node_type || 'terminal',
              step.transition.name || 'Hoàn tất',
              false
            )
          }
          <div
            onClick={() => setSelectedStepIdx(idx)}
            style={{
              width: '150px',
              height: '150px',
              transform: 'rotate(45deg)',
              backgroundColor: isSelected ? '#FAF6F0' : cardBg,
              border: isSelected ? '2px solid #7B5233' : cardBorder,
              cursor: 'pointer',
              boxShadow: isSelected ? '0 4px 12px rgba(123, 82, 51, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.15s ease',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '12px 0'
            }}
          >
            {/* Content rotated back -45deg */}
            <div style={{
              transform: 'rotate(-45deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              width: '115px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.62rem', backgroundColor: isSelected ? '#7B5233' : (isDecision ? '#d97706' : '#7c3aed'), color: 'white', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px' }}>{stepDisplayLabels[step.step_number] || `B${step.step_number}`}</span>
                {step.assignee_role && (
                  <span style={{ fontSize: '0.55rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' }}>{step.assignee_role}</span>
                )}
              </div>

              <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#1e293b', lineBreak: 'anywhere', maxWidth: '106px' }}>
                {step.name}
              </div>

              {/* Validation Badges inside diamond */}
              {isDecision && !hasYes && (
                <span style={{ fontSize: '0.55rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Thiếu Yes</span>
              )}
              {isDecision && !hasNo && (
                <span style={{ fontSize: '0.55rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Thiếu No</span>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveStep(idx); }}
                style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '2px' }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>

          {/* Quick Connection Controls for Decision */}
          {isDecision && (
            <div style={{ display: 'flex', gap: '8px', zIndex: 20, marginTop: '2px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#F0FDF4', border: '1px solid #b7ebc6', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem' }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Đúng:</span>
                <select
                  value={step.transition?.next_step === null ? 'custom' : (step.transition?.next_step || '')}
                  onChange={(e) => handleQuickTransitionChange(idx, e.target.value)}
                  style={{ padding: '1px', border: '1px solid #b7ebc6', borderRadius: '3px', fontSize: '0.65rem', backgroundColor: 'white', maxWidth: '90px' }}
                >
                  <option value="">-- Hết --</option>
                  <option value="new_step">➕ Bước mới...</option>
                  <option value="custom">✍️ Tùy chỉnh...</option>
                  {formData.steps.map((s, sidx) => (
                    s.step_number !== step.step_number && (
                      <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                    )
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#FFF5F5', border: '1px solid #f8d7da', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem' }}>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Sai:</span>
                <select
                  value={getStepFailPath(step)[0]?.return_to_step === null && getStepFailPath(step)[0]?.name ? 'custom' : (getStepFailPath(step)[0]?.return_to_step || '')}
                  onChange={(e) => handleQuickFailPathChange(idx, e.target.value)}
                  style={{ padding: '1px', border: '1px solid #f8d7da', borderRadius: '3px', fontSize: '0.65rem', backgroundColor: 'white', maxWidth: '90px' }}
                >
                  <option value="">-- Hết --</option>
                  <option value="new_step">➕ Bước mới...</option>
                  <option value="custom">✍️ Tùy chỉnh...</option>
                  {formData.steps.map((s, sidx) => (
                    s.step_number !== step.step_number && (
                      <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                    )
                  ))}
                </select>
              </div>
            </div>
          )}

          {isCondition && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.68rem', color: '#7c3aed', fontWeight: 'bold', textAlign: 'center', marginTop: '-4px', marginBottom: '4px' }}>
              <div>➔ Nhánh 1: B3</div>
              <div>➔ Nhánh 2: B4</div>
            </div>
          )}
        </div>
      );
    } else {
      const hasNext = step.transition && (step.transition.next_step !== null || step.transition.name);
      const isLastStep = idx === formData.steps.length - 1;

      return (
        <div
          id={`step-card-${step.step_number}`}
          onClick={() => setSelectedStepIdx(idx)}
          style={{
            width: '240px',
            backgroundColor: isSelected ? '#FAF6F0' : cardBg,
            border: isSelected ? '2px solid #7B5233' : cardBorder,
            borderRadius: cardRadius,
            padding: cardPadding,
            cursor: 'pointer',
            boxShadow: isSelected ? '0 4px 12px rgba(123, 82, 51, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s ease',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem' }}>{shapeIcon}</span>
              <span style={{ fontSize: '0.7rem', backgroundColor: isSelected ? '#7B5233' : '#64748b', color: 'white', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px' }}>{stepDisplayLabels[step.step_number] || `B${step.step_number}`}</span>
              {step.assignee_role && (
                <span style={{ fontSize: '0.62rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>{step.assignee_role}</span>
              )}
            </div>

            {/* Validation Badge for Task */}
            {!hasNext && !isLastStep && (
              <span style={{ fontSize: '0.62rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚠️ Thiếu bước tiếp theo</span>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); handleRemoveStep(idx); }}
              style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#1e293b' }}>
            {step.name}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }} onClick={(e) => e.stopPropagation()}>
            <span style={{ color: '#7B5233', fontWeight: 'bold' }}>➔ Bước tiếp:</span>
            <select
              value={step.transition?.next_step === null ? 'custom' : (step.transition?.next_step || '')}
              onChange={(e) => handleQuickTransitionChange(idx, e.target.value)}
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.68rem', backgroundColor: 'white' }}
            >
              <option value="">-- Mặc định --</option>
              <option value="new_step">➕ Tạo bước mới...</option>
              <option value="custom">✍️ Tùy chỉnh...</option>
              {formData.steps.map((s, sidx) => (
                s.step_number !== step.step_number && (
                  <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                )
              ))}
            </select>
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    if (isProcessMode) {
      setCustomTitle(title);
      setCustomSubtitle(subtitle || (isEditMode ? 'Nhân sự - Chỉnh sửa Quy trình' : 'Nhân sự - Thêm mới Quy trình'));
      setCustomScreenCode(screenCode || (isEditMode ? 'AD55' : 'AD18'));
    } else {
      setCustomTitle(title);
      setCustomSubtitle(subtitle || (isEditMode ? 'Nhân sự - Chỉnh sửa Mẫu ISO' : 'Nhân sự - Thêm mới Mẫu ISO'));
      setCustomScreenCode(screenCode || (isEditMode ? 'AD17.1' : 'AD17'));
    }

    if (location.state && location.state.parsedData) {
      const parsed = location.state.parsedData;
      // Lấy nguyên danh sách sections từ parser – không thêm bớt
      const newSections = { ...(parsed.sections || {}) };
      const newSectionTypes = {};

      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsed.section_types?.[key] || 'text';
      });

      generateNextQTCode(isProcessMode).then(nextCode => {
        const parsedName = parsed.name || '';
        const isGenericName = isGenericNameText(parsedName);
        setFormData({
          id: null,
          code: nextCode,
          name: isGenericName ? '' : parsedName,
          version: parsed.version || '01',
          issue_date: parsed.issue_date || new Date().toISOString().split('T')[0],
          issuer: parsed.issuer || '',
          editor: loggedInUser.full_name || loggedInUser.username || '',
          approver: parsed.approver || '',
          owner: parsed.issuer || parsed.owner || '',
          file_path: parsed.file_path || '',
          status: parsed.status || 'Hiệu lực',
          folder: parsed.folder || '',
          doc_type: parsed.doc_type || '',
          document_level: parsed.document_level || '',
          revision_logs: parsed.revision_logs && parsed.revision_logs.length > 0 ? parsed.revision_logs : [
            { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
          ],
          sections: newSections,
          template_sections: newSections,
          section_types: newSectionTypes,
          steps: (parsed.steps || []).map(step => ({
            ...step,
            node_type: step.transition?.node_type || step.node_type || 'task',
            has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
            fail_path: step.transition?.fail_path || step.fail_path || [],
            image_url: step.transition?.image_url || ''
          })),
          instruction_steps: (parsed.steps || []).map((step, idx) => ({
            id: `inst_${Date.now()}_${idx}`,
            step_number: step.step_number || (idx + 1),
            name: step.name || '',
            image_url: step.transition?.image_url || step.image_url || ''
          })),
          work_instructions: [{
            id: `inst_${Date.now()}`,
            code: `${nextCode}-HD01`,
            title: 'Hướng dẫn thực hiện quy trình',
            scope: 'Tất cả',
            note: '',
            steps: (parsed.steps || []).map((step, idx) => ({
              id: `step_${Date.now()}_${idx}`,
              step_number: step.step_number || (idx + 1),
              name: step.name || '',
              image_urls: (step.transition?.image_url || step.image_url) ? [step.transition?.image_url || step.image_url] : []
            }))
          }]
        });
      });
      showFeedback('success', 'Đã bóc tách tự động dữ liệu từ file Word thành công!');
    } else if (isEditMode) {
      fetchDocDetails();
    } else {
      generateNextQTCode(isProcessMode).then(nextCode => {
        setFormData(prev => ({
          ...prev,
          code: nextCode
        }));
      });
    }
  }, [id, isProcessMode, isEditMode, title, subtitle, screenCode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('print') === 'true' && formData.id && !loading && !autoPrintTriggered) {
      setShowPdfPreview(true);
      setAutoPrintTriggered(true);
    }
  }, [location.search, formData.id, loading, autoPrintTriggered]);

  useEffect(() => {
    if (showPdfPreview && autoPrintTriggered) {
      const timer = setTimeout(() => {
        handlePrintPdf();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showPdfPreview, autoPrintTriggered]);

  const fetchDocDetails = async () => {
    setLoading(true);
    try {
      const url = isProcessMode ? `/iso-documents/processes/${id}/details` : `/iso-documents/${id}/details`;
      const data = await api.get(url);

      const receivedSections = { ...(data.sections || {}) };
      let sectionTypes = {};

      if (receivedSections['__metadata_section_types__']) {
        try {
          sectionTypes = JSON.parse(receivedSections['__metadata_section_types__']);
        } catch (e) {
          console.error('Error parsing section types metadata:', e);
        }
        delete receivedSections['__metadata_section_types__'];
      }

      let instructionSteps = [];
      if (receivedSections['__metadata_instruction_steps__']) {
        try {
          instructionSteps = JSON.parse(receivedSections['__metadata_instruction_steps__']);
        } catch (e) {
          console.error('Error parsing instruction steps metadata:', e);
        }
        delete receivedSections['__metadata_instruction_steps__'];
      } else {
        instructionSteps = (data.steps || []).map((step, idx) => ({
          id: `inst_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_url: step.transition?.image_url || step.image_url || ''
        }));
      }

      let workInstructions = [];
      if (receivedSections['__metadata_work_instructions__']) {
        try {
          workInstructions = JSON.parse(receivedSections['__metadata_work_instructions__']);
        } catch (e) {
          console.error('Error parsing work instructions metadata:', e);
        }
        delete receivedSections['__metadata_work_instructions__'];
      } else {
        // Fallback: convert instructionSteps to workInstructions
        const convertedSteps = (instructionSteps && instructionSteps.length > 0 ? instructionSteps : (data.steps || [])).map((step, idx) => ({
          id: step.id || `step_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_urls: step.image_urls || (step.image_url ? [step.image_url] : [])
        }));
        workInstructions = [{
          id: `inst_${Date.now()}`,
          title: 'Hướng dẫn thực hiện quy trình',
          steps: convertedSteps
        }];
      }

      let relatedTemplates = [];
      if (receivedSections['__metadata_related_templates__']) {
        try {
          relatedTemplates = JSON.parse(receivedSections['__metadata_related_templates__']);
        } catch (e) {
          console.error('Error parsing related templates metadata:', e);
        }
        delete receivedSections['__metadata_related_templates__'];
      }

      // Sections được lấy nguyên từ DB – không merge thêm key cố định

      Object.keys(receivedSections).forEach(key => {
        if (sectionTypes[key] === undefined) {
          sectionTypes[key] = (key === 'Nội dung' && isProcessMode) ? 'flowchart' : 'text';
        }
      });

      setFormData({
        id: data.id,
        code: data.code || '',
        name: data.name || '',
        symbol: data.symbol || '',
        version: data.version || '01',
        issue_date: data.issue_date || '',
        issuer: data.issuer || '',
        approver: data.approver || '',
        approver_bgd: data.approver_bgd || '',
        file_path: data.file_path || '',
        status: data.status || 'Hiệu lực',
        folder: data.folder || data.display_at || '',
        doc_type: data.doc_type || data.notes || '',
        document_level: data.document_level || '',
        revision_logs: data.revision_logs || [],
        iso_document_id: data.iso_document_id || '',
        iso_document_code: data.iso_document_code || '',
        iso_document_name: data.iso_document_name || '',
        owner: data.owner || '',
        editor: data.editor || '',
        sections: receivedSections,
        template_sections: data.template_sections || {},
        section_types: sectionTypes,
        steps: (data.steps || []).map(step => ({
          ...step,
          node_type: step.transition?.node_type || step.node_type || 'task',
          has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
          fail_path: step.transition?.fail_path || step.fail_path || [],
          image_url: step.transition?.image_url || ''
        })),
        instruction_steps: instructionSteps,
        work_instructions: workInstructions,
        related_templates: relatedTemplates,
        inspection_guide_id: data.inspection_guide_id || null,
        inspection_guide: data.inspection_guide || null
      });

      if (relatedTemplates && relatedTemplates.length > 0) {
        setSelectedTemplateId(relatedTemplates[0].id);
      }
    } catch (error) {
      console.error('Lỗi khi tải chi tiết quy trình:', error);
      showFeedback('error', 'Không thể tải chi tiết quy trình từ hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 4500);
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleWordUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.docx') && !fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.doc, .docx)');
      return;
    }

    if (fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Hệ thống chỉ hỗ trợ phân tích tự động định dạng Word (.docx). Vui lòng chuyển đổi tệp (.doc) sang (.docx) trước khi tải lên.');
      return;
    }

    const formDataPay = new FormData();
    formDataPay.append('file', file);

    setUploadLoading(true);
    showFeedback('info', 'Đang tải lên và phân tích tài liệu quy trình mới...');

    try {
      const parsedData = await api.post('/iso-documents/upload', formDataPay, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newSections = parsedData.sections || {};
      const newSectionTypes = {};
      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsedData.section_types?.[key] || 'text';
      });

      const nextCode = formData.code || 'QT01';

      const stepsMapped = (parsedData.steps || []).map(step => ({
        ...step,
        node_type: step.transition?.node_type || step.node_type || 'task',
        has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
        fail_path: step.transition?.fail_path || step.fail_path || [],
        image_url: step.transition?.image_url || ''
      }));

      const instructionStepsMapped = (parsedData.steps || []).map((step, idx) => ({
        id: `inst_${Date.now()}_${idx}`,
        step_number: step.step_number || (idx + 1),
        name: step.name || '',
        image_url: step.transition?.image_url || step.image_url || ''
      }));

      const workInstructionsMapped = [{
        id: `inst_${Date.now()}`,
        code: `${nextCode}-HD01`,
        title: 'Hướng dẫn thực hiện quy trình',
        scope: 'Tất cả',
        note: '',
        steps: (parsedData.steps || []).map((step, idx) => ({
          id: `step_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_urls: (step.transition?.image_url || step.image_url) ? [step.transition?.image_url || step.image_url] : []
        }))
      }];

      setFormData(prev => ({
        ...prev,
        name: (parsedData.name && parsedData.name.trim() !== '[Tên quy trình]' && parsedData.name.trim() !== 'Tên quy trình' && parsedData.name.trim() !== '[Tên tài liệu]' && parsedData.name.trim() !== 'Tên tài liệu') ? parsedData.name : prev.name,
        symbol: parsedData.symbol || prev.symbol,
        version: parsedData.version || prev.version || '01',
        file_path: parsedData.file_path || prev.file_path,
        folder: parsedData.folder || prev.folder,
        doc_type: parsedData.doc_type || prev.doc_type,
        document_level: parsedData.document_level || prev.document_level,
        notes: parsedData.notes || prev.notes,
        owner: parsedData.issuer || parsedData.owner || prev.owner,
        approver: parsedData.approver || prev.approver,
        sections: newSections,
        template_sections: newSections,
        section_types: newSectionTypes,
        steps: stepsMapped,
        instruction_steps: instructionStepsMapped,
        work_instructions: workInstructionsMapped
      }));

      showFeedback('success', 'Cập nhật cấu trúc tài liệu quy trình từ file Word thành công! Vui lòng ấn "Lưu quy trình" để hoàn tất.');
    } catch (error) {
      console.error('Lỗi upload file:', error);
      const errMsg = error.response?.data?.detail || error.message || 'Lỗi khi upload tệp quy trình mới';
      showFeedback('error', errMsg);
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const handleSectionChange = (sectionName, val) => {
    setFormData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: val
      }
    }));
  };

  const getSectionHint = (sectionKey) => {
    const templateHtml = formData.template_sections?.[sectionKey] || '';
    if (!templateHtml) return null;
    const cleanText = templateHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!cleanText) return null;
    const match = cleanText.match(/\[([^\]]*)\]/);
    return match ? match[1].trim() : cleanText;
  };

  // --- QC STEPS CONFIGURATION ---
  const handleAddStep = () => {
    const nextStepNum = formData.steps.length + 1;
    const newStep = {
      step_number: nextStepNum,
      name: `Bước mới ${nextStepNum}`,
      assignee_role: 'QC',
      instructions: '',
      checklist: [],
      transition: { next_step: nextStepNum + 1, image_url: '' },
      flow_node_id: `node_${nextStepNum}`,
      node_type: 'task',
      has_branch: false,
      image_url: ''
    };

    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));

    setSelectedStepIdx(nextStepNum - 1);
  };

  const getStepFailPath = (step) => {
    if (!step) return [];
    if (step.fail_path && step.fail_path.length > 0) {
      return step.fail_path;
    }
    if (step.has_branch === true) {
      const defaultRole = step.assignee_role || 'QC';
      return [
        { name: "Cập nhật báo cáo thông tin", assignee_role: defaultRole, edge_label: "Không", return_to_step: null }
      ];
    }
    return [];
  };

  const handleUpdateStep = (index, field, val) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      if (field.startsWith('fail_path_')) {
        const nodeIdx = parseInt(field.split('_')[2]);
        const currentPath = [...getStepFailPath(nextSteps[index])];
        if (currentPath[nodeIdx]) {
          currentPath[nodeIdx] = { ...currentPath[nodeIdx], name: val };
        }
        nextSteps[index] = { ...nextSteps[index], fail_path: currentPath };
      } else {
        nextSteps[index] = { ...nextSteps[index], [field]: val };
      }
      return { ...prev, steps: nextSteps };
    });
  };

  const handleRemoveStep = (index) => {
    setFormData(prev => {
      const nextSteps = prev.steps.filter((_, idx) => idx !== index)
        .map((step, idx) => ({ ...step, step_number: idx + 1, flow_node_id: `node_${idx + 1}` }));
      return { ...prev, steps: nextSteps };
    });
    if (selectedStepIdx >= formData.steps.length - 1) {
      setSelectedStepIdx(Math.max(0, formData.steps.length - 2));
    }
  };

  const handleAddInstructionStep = () => {
    const nextStepNum = (formData.instruction_steps || []).length + 1;
    const newStep = {
      id: `inst_${Date.now()}`,
      step_number: nextStepNum,
      name: '',
      image_url: ''
    };
    setFormData(prev => ({
      ...prev,
      instruction_steps: [...(prev.instruction_steps || []), newStep]
    }));
  };

  const handleUpdateInstructionStep = (index, field, val) => {
    setFormData(prev => {
      const nextSteps = [...(prev.instruction_steps || [])];
      if (nextSteps[index]) {
        nextSteps[index] = { ...nextSteps[index], [field]: val };
      }
      return { ...prev, instruction_steps: nextSteps };
    });
  };

  const handleRemoveInstructionStep = (index) => {
    setFormData(prev => {
      const nextSteps = (prev.instruction_steps || []).filter((_, idx) => idx !== index)
        .map((step, idx) => ({ ...step, step_number: idx + 1 }));
      return { ...prev, instruction_steps: nextSteps };
    });
  };

  const handleInstructionImageUpload = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateInstructionStep(index, 'image_url', reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Work Instructions CRUD & Image Helpers
  const handleAddWorkInstruction = () => {
    const processCode = formData.code || 'G7.SX.QT01';
    const prefix = `${processCode}-HD`;
    let maxAa = 0;
    if (formData.work_instructions && formData.work_instructions.length > 0) {
      formData.work_instructions.forEach(inst => {
        const c = inst.code || '';
        if (c.toUpperCase().startsWith(prefix.toUpperCase())) {
          const suffix = c.slice(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxAa) {
            maxAa = num;
          }
        }
      });
    }
    const aa = String(maxAa + 1).padStart(2, '0');
    const generatedCode = `${prefix}${aa}`;

    const newInst = {
      id: `inst_${Date.now()}`,
      code: generatedCode,
      title: `hướng dẫn ${maxAa + 1}`,
      scope: 'Tất cả',
      note: '',
      steps: []
    };

    setFormData(prev => ({
      ...prev,
      work_instructions: [...(prev.work_instructions || []), newInst]
    }));
    setSelectedInstructionId(newInst.id);
  };

  const handleUpdateWorkInstructionTitle = (id, newTitle) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, title: newTitle };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleUpdateWorkInstructionScope = (id, newScope) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, scope: newScope };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleUpdateWorkInstructionNote = (id, newNote) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, note: newNote };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleRemoveWorkInstruction = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa hướng dẫn này cùng toàn bộ các bước và hình ảnh?")) {
      setFormData(prev => {
        const nextInstructions = (prev.work_instructions || []).filter(inst => inst.id !== id);
        return { ...prev, work_instructions: nextInstructions };
      });
      if (selectedInstructionId === id) {
        setSelectedInstructionId(null);
      }
    }
  };

  const handleOpenAddStepPopup = (activeInst) => {
    const nextNum = (activeInst.steps || []).length + 1;
    setStepForm({
      id: `step_${Date.now()}_${nextNum}`,
      step_number: nextNum,
      name: '',
      note: '',
      standard: '',
      image_url: ''
    });
    setIsEditingStep(false);
    setEditingStepIdx(-1);
    setShowStepPopup(true);
  };

  const handleOpenEditStepPopup = (activeInst, idx) => {
    const step = activeInst.steps[idx];
    if (step) {
      setStepForm({
        id: step.id || `step_${Date.now()}_${step.step_number}`,
        step_number: step.step_number,
        name: step.name || '',
        note: step.note || '',
        standard: step.standard || '',
        image_url: step.image_url || ''
      });
      setIsEditingStep(true);
      setEditingStepIdx(idx);
      setShowStepPopup(true);
    }
  };

  const handleSaveStep = (e) => {
    e.preventDefault();
    if (!selectedInstructionId) return;

    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === selectedInstructionId) {
          let nextSteps = [...(inst.steps || [])];
          if (isEditingStep && editingStepIdx >= 0) {
            nextSteps[editingStepIdx] = { ...stepForm };
          } else {
            const insertIdx = stepForm.step_number - 1;
            nextSteps.splice(insertIdx, 0, { ...stepForm });
          }
          nextSteps = nextSteps.map((s, idx) => ({ ...s, step_number: idx + 1 }));
          return { ...inst, steps: nextSteps };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });

    setShowStepPopup(false);
  };

  const handleRemoveWorkInstructionStep = (instId, stepIdx) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bước này?")) {
      setFormData(prev => {
        const nextInstructions = (prev.work_instructions || []).map(inst => {
          if (inst.id === instId) {
            const nextSteps = (inst.steps || []).filter((_, idx) => idx !== stepIdx)
              .map((step, idx) => ({ ...step, step_number: idx + 1 }));
            return { ...inst, steps: nextSteps };
          }
          return inst;
        });
        return { ...prev, work_instructions: nextInstructions };
      });
    }
  };

  const handleReorderStepInPopup = (targetStepNo) => {
    const targetIdx = parseInt(targetStepNo, 10) - 1;
    if (isNaN(targetIdx) || targetIdx < 0) return;

    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === selectedInstructionId) {
          let nextSteps = [...(inst.steps || [])];

          if (isEditingStep && editingStepIdx >= 0) {
            const currentIdx = editingStepIdx;
            if (currentIdx === targetIdx) return inst;

            const [movedStep] = nextSteps.splice(currentIdx, 1);
            nextSteps.splice(targetIdx, 0, movedStep);
            nextSteps = nextSteps.map((s, i) => ({ ...s, step_number: i + 1 }));

            setEditingStepIdx(targetIdx);
            setStepForm(prevForm => ({ ...prevForm, step_number: targetStepNo }));
          } else {
            setStepForm(prevForm => ({ ...prevForm, step_number: targetStepNo }));
          }
          return { ...inst, steps: nextSteps };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handlePopupImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setStepForm(prev => ({ ...prev, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  const handlePrintPdf = () => {
    const previewEl = document.getElementById("pdf-preview-document-root");
    if (!previewEl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Trình duyệt chặn mở cửa sổ mới. Vui lòng cho phép popup để xuất PDF.");
      return;
    }

    let htmlContent = previewEl.innerHTML;
    // Replace relative image paths with absolute paths so they load on about:blank base
    const origin = window.location.origin;
    htmlContent = htmlContent.replace(/src="\/assets\//g, `src="${origin}/assets/`);
    htmlContent = htmlContent.replace(/src="\.\/assets\//g, `src="${origin}/assets/`);
    htmlContent = htmlContent.replace(/src="assets\//g, `src="${origin}/assets/`);

    printWindow.document.write(`
      <html>
        <head>
          <title>${formData.name || 'Quy trình ISO'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm 15mm 20mm 15mm;
            }
            * {
              font-family: "Times New Roman", Times, serif !important;
            }
            body {
              color: black;
              background-color: white;
              line-height: 1.5;
              font-size: 12pt;
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact;
            }
            .a4-page {
              width: 100% !important;
              min-height: unset !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              page-break-after: always !important;
            }
            .a4-page:last-child {
              page-break-after: avoid !important;
            }
            .cover-border-box {
              border: 2px solid black;
              padding: 24px;
              height: 250mm !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              flex: none !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid black;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid black;
              padding: 8px;
              vertical-align: middle;
            }
            table.no-border, table.no-border tr, table.no-border td {
              border: none !important;
            }
            th {
              background-color: #f8fafc !important;
            }
            h3 {
              font-size: 13pt;
              font-weight: bold;
              margin: 20px 0 10px 0;
              border-bottom: 1px solid black;
              padding-bottom: 2px;
              page-break-after: avoid;
            }
            h4 {
              font-size: 11pt;
              font-weight: bold;
              margin: 15px 0 8px 0;
              page-break-after: avoid;
            }
            img {
              max-width: 100%;
              height: auto;
              object-fit: cover;
            }
            .instruction-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .instruction-card {
              border: 1px solid black;
              padding: 10px;
              display: flex;
              flex-direction: column;
              gap: 8px;
              page-break-inside: avoid;
            }
            @media print {
              .no-print {
                display: none;
              }
              body {
                background: none;
              }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%;">
            ${htmlContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const svgToPngDataUrl = (svgElement) => {
    return new Promise((resolve) => {
      try {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const width = svgElement.viewBox?.baseVal?.width || svgElement.width?.baseVal?.value || 860;
          const height = svgElement.viewBox?.baseVal?.height || svgElement.height?.baseVal?.value || 800;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(pngUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch (e) {
        resolve(null);
      }
    });
  };

  const handleDownloadDoc = async () => {
    const previewEl = document.getElementById("pdf-preview-document-root");
    if (!previewEl) return;

    // Clone the DOM so we can manipulate it (replacing SVGs with PNGs for Word compat)
    const clone = previewEl.cloneNode(true);

    // Find all SVGs (e.g. the flowchart table) and replace them with high-res PNG images
    const svgEl = clone.querySelector("svg");
    if (svgEl) {
      const originalSvg = previewEl.querySelector("svg");
      const pngUrl = await svgToPngDataUrl(originalSvg);
      if (pngUrl) {
        const img = document.createElement("img");
        img.src = pngUrl;
        img.setAttribute("width", "680");
        img.style.width = "680px";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "0 auto";
        svgEl.parentNode.replaceChild(img, svgEl);
      }
    }

    // Recursively strip flexbox styles that break Word layout
    const cleanFlexboxStyles = (element) => {
      if (element.style) {
        if (element.style.display === 'flex') {
          element.style.display = 'block';
        }
        element.style.flex = '';
        element.style.flexDirection = '';
        element.style.justifyContent = '';
        element.style.alignItems = '';
        element.style.flexWrap = '';
        element.style.flexGrow = '';
        element.style.flexShrink = '';
        element.style.flexBasis = '';
      }
      Array.from(element.children).forEach(child => cleanFlexboxStyles(child));
    };
    cleanFlexboxStyles(clone);

    // Also look for other elements with page-break-before: always inside the document
    // and replace them with a standard paragraph page break before them
    const breakElms = clone.querySelectorAll('*');
    breakElms.forEach(el => {
      if (el.style && el.style.pageBreakBefore === 'always') {
        el.style.pageBreakBefore = ''; // Remove from element to avoid duplicate break
        const br = document.createElement("p");
        br.style.pageBreakBefore = "always";
        br.style.clear = "both";
        br.innerHTML = "&nbsp;";
        el.parentNode.insertBefore(br, el);
      }
    });

    // Extract pages flat inner contents
    const pages = clone.querySelectorAll(".a4-page");
    const pageContents = [];
    pages.forEach((page) => {
      const coverBox = page.querySelector(".cover-border-box");
      if (coverBox) {
        // MS Word ignores borders on div elements. We must replace the cover page border div
        // with a 1x1 table cell that has a solid border.
        const table = document.createElement("table");
        table.className = "cover-border-box-table";
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.border = "1.5pt solid windowtext";

        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.style.border = "none";
        td.style.padding = "24px";

        // Move all children of coverBox into td
        while (coverBox.firstChild) {
          td.appendChild(coverBox.firstChild);
        }

        tr.appendChild(td);
        table.appendChild(tr);

        coverBox.parentNode.replaceChild(table, coverBox);
      }
      pageContents.push(page.innerHTML);
    });

    // Join pages with a clean paragraph break (standard for MS Word HTML)
    let html = pageContents.join('\n<p style="page-break-before:always; clear:both; mso-break-type:section-break">&nbsp;</p>\n');

    // Ensure relative assets are resolved with absolute web origin paths
    const origin = window.location.origin;
    html = html.replace(/src="\/assets\//g, `src="${origin}/assets/`);
    html = html.replace(/src="\.\/assets\//g, `src="${origin}/assets/`);
    html = html.replace(/src="assets\//g, `src="${origin}/assets/`);

    const documentHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <title>${formData.name || 'Quy trình ISO'}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: 595.3pt 841.9pt; /* A4 width/height in points */
              margin: 1.0in 1.0in 1.0in 1.0in; /* 2.54cm standard margins */
              mso-header-margin: 36.0pt;
              mso-footer-margin: 36.0pt;
              mso-paper-source: 0;
            }
            div.Section1 {
              page: Section1;
            }
            body, p, span, div, table, tr, td, th, h1, h2, h3, h4, h5, h6 {
              font-family: "Times New Roman", Times, serif !important;
            }
            body {
              font-size: 12pt;
              line-height: 1.5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            th, td {
              border: 1.0pt solid windowtext;
              mso-border-alt: 0.5pt solid windowtext;
              padding: 8px;
              vertical-align: middle;
            }
            th {
              background-color: #f8fafc;
              font-weight: bold;
            }
            table.header-table {
              border: 1.5pt solid windowtext !important;
              mso-border-alt: solid windowtext 1.5pt !important;
              border-collapse: collapse !important;
              margin-bottom: 20px !important;
            }
            table.header-table td {
              border: none !important;
              mso-border-alt: none !important;
              padding: 10px !important;
            }
            table.header-table td.header-logo-cell {
              border-right: 1.5pt solid windowtext !important;
              mso-border-alt: right solid windowtext 1.5pt !important;
            }
            table.dashed-table {
              border: 1.0pt dashed windowtext !important;
              mso-border-alt: dashed windowtext 0.5pt !important;
              margin: 0 auto 20px auto !important;
            }
            table.dashed-table td {
              border: 1.0pt dashed windowtext !important;
              mso-border-alt: dashed windowtext 0.5pt !important;
              padding: 8px !important;
            }
            table.cover-border-box-table {
              border: 1.5pt solid windowtext !important;
              mso-border-alt: solid windowtext 1.5pt !important;
              border-collapse: collapse !important;
              width: 100% !important;
              margin: 0 !important;
            }
            table.cover-border-box-table td {
              border: none !important;
              mso-border-alt: none !important;
              padding: 18pt !important;
            }
            table.no-border, table.no-border tr, table.no-border td {
              border: none !important;
              mso-border-alt: none !important;
            }
            .word-only-spacer {
              display: block !important;
              height: 40pt !important;
              line-height: 40pt !important;
            }
            .word-only-spacer2 {
              display: block !important;
              height: 120pt !important;
              line-height: 120pt !important;
            }
            h3 {
              font-size: 13pt;
              font-weight: bold;
              margin: 20px 0 10px 0;
              border-bottom: 1.0pt solid windowtext;
              padding-bottom: 2px;
            }
            h4 {
              font-size: 11pt;
              font-weight: bold;
              margin: 15px 0 8px 0;
            }
            .instruction-grid {
              width: 100%;
            }
            .instruction-card {
              border: 1.0pt solid windowtext;
              padding: 10px;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <div class="Section1">
            ${html}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob(['\\ufeff' + documentHtml], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.code || 'ISO'}_${formData.name || 'Quy_trinh'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAutoLayoutClassic = useCallback(() => {
    const steps = formData.steps || [];
    if (steps.length === 0) return;

    // 1. Get unique roles in order of appearance
    const uniqueRoles = [];
    steps.forEach(s => {
      const role = s.assignee_role || "";
      if (role && !uniqueRoles.includes(role)) {
        uniqueRoles.push(role);
      }
    });
    if (uniqueRoles.length === 0) {
      uniqueRoles.push("");
    }

    // 2. Identify sidesteps (fail paths)
    const getSidesteps = () => {
      const sidesteps = new Set();
      steps.forEach(s => {
        if (s.node_type === 'decision') {
          const failPath = s.fail_path || [];
          const noStepNum = failPath[0]?.return_to_step;
          if (noStepNum) {
            sidesteps.add(noStepNum);
            let current = noStepNum;
            while (current) {
              const currStep = steps.find(st => String(st.step_number) === String(current));
              const next = currStep?.transition?.next_step || currStep?.next_step;
              if (next && String(next) !== String(current) && !steps.some(st => String(st.step_number) === String(next) && st.node_type === 'decision')) {
                sidesteps.add(next);
                current = next;
              } else break;
            }
          }
        }
      });
      return sidesteps;
    };

    const sidesteps = getSidesteps();
    const mainSteps = steps.filter(s => !sidesteps.has(s.step_number));
    const positions = {};

    const getNodeDimensions = (nodeType) => {
      if (nodeType === "decision") return { width: 86, height: 86 };
      if (nodeType === "terminal") return { width: 120, height: 44 };
      return { width: 140, height: 54 }; // task
    };

    // 3. Lay out main steps vertically
    mainSteps.forEach((step, idx) => {
      const role = step.assignee_role || "";
      const roleIdx = uniqueRoles.indexOf(role);
      const colCenter = 300 + (roleIdx >= 0 ? roleIdx : 0) * 280;

      const { width } = getNodeDimensions(step.node_type);
      positions[step.step_number] = {
        x: colCenter - width / 2,
        y: 60 + idx * 140
      };
    });

    // 4. Lay out sidesteps to the left column relative to their parent decision step
    mainSteps.forEach((step, idx) => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        const noStepNum = failPath[0]?.return_to_step;
        if (noStepNum && sidesteps.has(noStepNum)) {
          const parentY = positions[step.step_number]?.y || (60 + idx * 140);
          const parentRole = step.assignee_role || "";
          const parentRoleIdx = uniqueRoles.indexOf(parentRole);
          const colCenter = 300 + (parentRoleIdx >= 0 ? parentRoleIdx : 0) * 280;
          const sideCenter = colCenter - 180;

          const firstStep = steps.find(st => st.step_number === noStepNum);
          let startY = parentY;
          if (firstStep) {
            const { height: childHeight } = getNodeDimensions(firstStep.node_type);
            startY = parentY + 43 - childHeight / 2;
          }

          let current = noStepNum;
          let chainIdx = 0;
          const visited = new Set();

          while (current && !visited.has(current)) {
            visited.add(current);
            const currStep = steps.find(st => st.step_number === current);
            if (currStep) {
              const { width } = getNodeDimensions(currStep.node_type);
              positions[current] = {
                x: sideCenter - width / 2,
                y: startY + chainIdx * 130
              };
            }

            const next = currStep?.transition?.next_step || currStep?.next_step;
            if (next && sidesteps.has(next)) {
              current = next;
              chainIdx++;
            } else {
              break;
            }
          }
        }
      }
    });

    // 5. Update steps
    setFormData(prev => {
      const nextSteps = prev.steps.map(s => {
        const pos = positions[s.step_number];
        if (pos) {
          return { ...s, x_pos: pos.x, y_pos: pos.y };
        }
        return s;
      });
      return { ...prev, steps: nextSteps };
    });
  }, [formData.steps]);

  const handlePositionsChange = useCallback(({ type, stepNumber, branchIdx, x, y }) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      const stepIdx = nextSteps.findIndex(s => s.step_number === stepNumber);
      if (stepIdx < 0) return prev;

      if (type === 'step') {
        nextSteps[stepIdx] = { ...nextSteps[stepIdx], x_pos: x, y_pos: y };
      } else if (type === 'branch') {
        const currentPath = [...(nextSteps[stepIdx].fail_path || [])];
        if (currentPath[branchIdx]) {
          currentPath[branchIdx] = { ...currentPath[branchIdx], x_pos: x, y_pos: y };
          nextSteps[stepIdx] = { ...nextSteps[stepIdx], fail_path: currentPath };
        }
      }
      return { ...prev, steps: nextSteps };
    });
  }, []);

  const handleAddStepFromCanvas = useCallback((nodeType, position) => {
    setFormData(prev => {
      const nextStepNum = prev.steps.length + 1;
      const newStep = {
        step_number: nextStepNum,
        name: nodeType === 'decision' ? `Kiểm tra ${nextStepNum}` : nodeType === 'terminal' ? `Kết thúc` : `Bước mới ${nextStepNum}`,
        assignee_role: 'QC',
        instructions: '',
        checklist: [],
        transition: { next_step: nextStepNum + 1, image_url: '' },
        flow_node_id: `node_${nextStepNum}`,
        node_type: nodeType,
        has_branch: false,
        fail_path: [],
        x_pos: position.x,
        y_pos: position.y,
        image_url: ''
      };
      return { ...prev, steps: [...prev.steps, newStep] };
    });
    setSelectedStepIdx(formData.steps.length);
  }, [formData.steps]);

  const handleNodeSelect = useCallback((stepNumber) => {
    const idx = formData.steps.findIndex(s => s.step_number === stepNumber);
    if (idx >= 0) {
      setSelectedStepIdx(idx);
    }
  }, [formData.steps]);

  const handleImageUpload = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateStep(index, 'image_url', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const triggerDownload = () => {
    alert("Đang khởi tạo tải xuống tài liệu quy trình dạng PDF/Word...");
  };

  // --- SAVE FORM ---
  const handleSaveForm = async () => {
    if (!formData.code) {
      showFeedback('error', 'Mã quy trình không được để trống');
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      showFeedback('error', 'Tên quy trình là bắt buộc');
      return;
    }

    setLoading(true);
    try {
      const nodes = [];
      const links = [];

      formData.steps.forEach((step, idx) => {
        let nodeType = step.node_type || 'task';
        nodes.push({
          id: step.flow_node_id,
          label: `B${step.step_number}: ${step.name}`,
          type: nodeType,
          role: step.assignee_role,
          x: step.x_pos || 250,
          y: step.y_pos || (80 + idx * 120)
        });

        if (idx > 0) {
          links.push({
            from: formData.steps[idx-1].flow_node_id,
            to: step.flow_node_id,
            label: 'Đạt'
          });
        }
      });

      const stepsToSave = formData.steps.map(step => {
        const nextTransition = {
          ...(step.transition || {}),
          node_type: step.node_type || 'task',
          has_branch: step.has_branch || false,
          fail_path: getStepFailPath(step),
          image_url: step.image_url || ''
        };
        return {
          ...step,
          transition: nextTransition
        };
      });

      const flattenedInstructionSteps = (formData.work_instructions?.[0]?.steps || []).map(step => ({
        id: step.id,
        step_number: step.step_number,
        name: step.name,
        image_url: step.image_urls?.[0] || ''
      }));

      const finalPayload = {
        ...formData,
        editor: loggedInUser.full_name || loggedInUser.username || formData.editor || '',
        issuer: loggedInUser.full_name || loggedInUser.username || formData.issuer || '',
        display_at: formData.folder,
        notes: formData.doc_type,
        steps: stepsToSave,
        diagram_data: JSON.stringify({ nodes, links }),
        sections: {
          ...(formData.sections || {}),
          '__metadata_section_types__': JSON.stringify(formData.section_types || {}),
          '__metadata_instruction_steps__': JSON.stringify(flattenedInstructionSteps),
          '__metadata_work_instructions__': JSON.stringify(formData.work_instructions || []),
          '__metadata_related_templates__': JSON.stringify(formData.related_templates || [])
        }
      };

      const url = isProcessMode ? '/iso-documents/processes/save' : '/iso-documents/save';
      const res = await api.post(url, finalPayload);
      showFeedback('success', res.message || 'Lưu tài liệu quy trình ISO thành công!');

      setTimeout(() => {
        navigate(backPath);
      }, 1000);

    } catch (error) {
      console.error('Lỗi khi lưu quy trình:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi lưu trữ dữ liệu quy trình');
    } finally {
      setLoading(false);
    }
  };

  // Card panel style helpers
  const cardBorderColor = '#7B5233';
  const headerBgColor = '#FAF6F0';
  const accentColor = '#7B5233';

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '6px',
    border: `1.5px solid ${cardBorderColor}`,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(123, 82, 51, 0.02)',
    marginBottom: '16px'
  };

  const headerStyle = {
    backgroundColor: headerBgColor,
    padding: '10px 14px',
    borderBottom: `1.5px solid ${cardBorderColor}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  };

  const headerTextStyle = {
    fontWeight: 'bold',
    color: accentColor,
    fontSize: '0.84rem',
    textTransform: 'uppercase'
  };
  const isStepSelected = selectedStepIdx !== -1 && selectedStepIdx !== null && selectedStepIdx !== undefined && formData.steps && formData.steps[selectedStepIdx];
  const isFlowchartActive = activeTab === 'content' && formData.section_types?.[activeMenu] === 'flowchart';

  const editor = {
    accentColor,
    activeMenu,
    activeTab,
    autoPrintTriggered,
    backPath,
    cardBorderColor,
    cardStyle,
    currentScreen,
    editingStepIdx,
    explanationExpanded,
    fetchDocDetails,
    fileInputRef,
    flowchartCanvasRef,
    flowchartMode,
    formData,
    getMaxLeftChainLength,
    getSectionHint,
    getSidestepsInfo,
    getStepDisplayLabels,
    getStepFailPath,
    handleAddInstructionStep,
    handleAddRelatedTemplate,
    handleAddStep,
    handleAddStepFromCanvas,
    handleAddWorkInstruction,
    handleAutoLayoutClassic,
    handleCanvasMouseDown,
    handleDeleteAttachment,
    handleDeleteRelatedTemplate,
    handleDownloadDoc,
    handleImageUpload,
    handleInputChange,
    handleNodeSelect,
    handleOpenAddStepPopup,
    handleOpenEditStepPopup,
    handleOpenSystemTemplatesModal,
    handlePopupImageUpload,
    handlePositionsChange,
    handlePrintPdf,
    handleQuickFailPathChange,
    handleQuickTransitionChange,
    handleRemoveInstructionStep,
    handleRemoveStep,
    handleRemoveWorkInstruction,
    handleRemoveWorkInstructionStep,
    handleReorderStepInPopup,
    handleSaveForm,
    handleSaveStep,
    handleSectionChange,
    handleSetFlowchartMode,
    handleToggleScreen,
    handleUpdateInstructionStep,
    handleUpdateRelatedTemplate,
    handleUpdateStep,
    handleUpdateSystemTemplates,
    handleUpdateWorkInstructionNote,
    handleUpdateWorkInstructionScope,
    handleUpdateWorkInstructionTitle,
    handleUploadAttachment,
    handleWordUpload,
    headerStyle,
    headerTextStyle,
    historyAccordionExpanded,
    infoExpanded,
    isEditMode,
    isEditingStep,
    isProcessMode,
    isScreenDropdownOpen,
    isStepSelected,
    maxLeftChainLength,
    message,
    navigate,
    renderSingleStepCard,
    searchTemplateQuery,
    selectedInstructionId,
    selectedStepIdx,
    selectedTemplateId,
    setActiveMenu,
    setActiveTab,
    setAutoPrintTriggered,
    setCurrentScreen,
    setEditingStepIdx,
    setExplanationExpanded,
    setFlowchartMode,
    setFormData,
    setHistoryAccordionExpanded,
    setInfoExpanded,
    setIsEditingStep,
    setIsScreenDropdownOpen,
    setLoading,
    setMessage,
    setSearchTemplateQuery,
    setSelectedInstructionId,
    setSelectedStepIdx,
    setSelectedTemplateId,
    setShowPdfPreview,
    setShowStepPopup,
    setShowSystemTemplatesModal,
    setStepForm,
    setStepsAccordionExpanded,
    setSystemScreens,
    setSystemTemplates,
    setSystemTemplatesDepartmentFilter,
    setSystemTemplatesFilterOpen,
    setTempCheckedIds,
    setUploadLoading,
    setZoomScale,
    showFeedback,
    showPdfPreview,
    showStepPopup,
    showSystemTemplatesModal,
    sidestepSet,
    stepDisplayLabels,
    stepForm,
    stepsAccordionExpanded,
    systemScreens,
    systemTemplates,
    systemTemplatesDepartmentFilter,
    systemTemplatesFilterOpen,
    tempCheckedIds,
    uploadLoading,
    zoomScale,
  };

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      color: '#2D1A12',
      backgroundColor: '#FAF8F5',
      minHeight: '100vh',
      width: '100%'
    }}>

      {/* Top Action bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        border: '1px solid #EADCC9',
        boxShadow: '0 2px 8px rgba(45, 26, 18, 0.02)',
        width: '100%'
      }}>
        {currentScreen !== 'overview' ? (
          <button
            onClick={() => setCurrentScreen('overview')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#7B5233',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Quay lại trang thông tin
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleSaveForm}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#7B5233',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '0.88rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(123, 82, 51, 0.1)'
          }}
        >
          <Save size={16} /> {loading ? 'Đang lưu...' : (isProcessMode ? 'Lưu quy trình' : 'Lưu Mẫu ISO')}
        </button>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: message.type === 'success' ? '#e6f4ea' : '#fce8e6',
          color: message.type === 'success' ? '#137333' : '#c5221f',
          border: `1px solid ${message.type === 'success' ? '#137333' : '#c5221f'}`,
          width: '100%'
        }}>
          <AlertCircle size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* --- SCREEN 1: OVERVIEW SCREEN (Màn hình chính) --- */}
      {currentScreen === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>

          {/* Card: Thông tin quy trình - Có thể thu gọn/mở rộng */}
          <div style={{ ...cardStyle, overflow: 'visible' }}>
            <div
              style={{ ...headerStyle, borderTopLeftRadius: '5px', borderTopRightRadius: '5px', cursor: 'pointer' }}
              onClick={() => setInfoExpanded(!infoExpanded)}
            >
              <span style={headerTextStyle}>{isProcessMode ? 'Thông tin quy trình' : 'Thông tin Mẫu ISO'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPdfPreview(true);
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#4A301C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download size={13} />
                  Xuất tài liệu
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveForm();
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#4A301C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Lưu hồ sơ
                </button>
                <div style={{ width: '1px', height: '18px', backgroundColor: '#EADCC9', margin: '0 4px' }} />
                {infoExpanded ? <ChevronUp size={16} style={{color:accentColor}} /> : <ChevronDown size={16} style={{color:accentColor}} />}
              </div>
            </div>

            {infoExpanded && (
              <div style={{ padding: '20px', borderTop: '1px solid #F0E6D8', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '14px 16px' }}>

                  {/* Row 1 */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã QT</label>
                    <input
                      type="text"
                      value={formData.code}
                      readOnly
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 5' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên quy trình <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nhập tên quy trình..."
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', color: '#1F2937' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', color: '#1F2937' }}
                    >
                      <option value="Nháp">Nháp</option>
                      <option value="Dự thảo">Dự thảo</option>
                      <option value="Chờ Trưởng phòng duyệt">Chờ Trưởng phòng duyệt</option>
                      <option value="Chờ BGĐ duyệt">Chờ BGĐ duyệt</option>
                      <option value="Trưởng phòng đã duyệt">Trưởng phòng đã duyệt</option>
                      <option value="BGĐ đã duyệt">BGĐ đã duyệt</option>
                      <option value="Hiệu lực">Hiệu lực</option>
                      <option value="Từ chối">Từ chối</option>
                      <option value="Hết hiệu lực">Hết hiệu lực</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 3', position: 'relative' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phạm vi</label>
                    <div
                      onClick={() => setIsScreenDropdownOpen(!isScreenDropdownOpen)}
                      style={{
                        width: '100%',
                        minHeight: '36px',
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      {(() => {
                        const selectedScreens = formData.folder ? formData.folder.split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (selectedScreens.length === 0) {
                          return <span style={{ color: '#94a3b8' }}>Chọn phạm vi...</span>;
                        }
                        return selectedScreens.map(scrPath => {
                          const scrObj = systemScreens.find(s => s.route_path === scrPath);
                          const label = scrObj ? `${scrObj.title} (${scrObj.route_path})` : scrPath;
                          return (
                            <span
                              key={scrPath}
                              style={{
                                backgroundColor: '#FAF6F0',
                                color: '#7B5233',
                                border: '1px solid #7B5233',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {label}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleScreen(scrPath);
                                }}
                                style={{ cursor: 'pointer', fontWeight: '900' }}
                              >
                                ×
                              </span>
                            </span>
                          );
                        });
                      })()}
                    </div>

                    {isScreenDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '240px',
                        overflowY: 'auto',
                        backgroundColor: 'white',
                        border: '1.5px solid #EADCC9',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(45, 26, 18, 0.08)',
                        zIndex: 1000,
                        marginTop: '4px',
                        padding: '6px'
                      }}>
                        <div style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', borderBottom: '1px solid #FAF6F0', marginBottom: '4px' }}>
                          Chọn màn hình:
                        </div>
                        {systemScreens.length === 0 ? (
                          <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Đang tải màn hình...
                          </div>
                        ) : (
                          (() => {
                            const selectedScreens = formData.folder ? formData.folder.split(',').map(s => s.trim()).filter(Boolean) : [];
                            const mobileScreens = systemScreens.filter(scr =>
                              scr.platform &&
                              scr.platform.toLowerCase() === 'mobile' &&
                              ((scr.route_path || '').toLowerCase().includes('inspection') ||
                               (scr.title || '').toLowerCase().includes('kiểm tra'))
                            );
                            return mobileScreens.map(scr => {
                              const isSelected = selectedScreens.includes(scr.route_path);
                              return (
                                <div
                                  key={scr.id}
                                  onClick={() => handleToggleScreen(scr.route_path)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#FAF8F5';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    style={{ accentColor: '#7B5233', cursor: 'pointer' }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#7B5233' : '#334155' }}>
                                      {scr.title || 'Màn hình'}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                      [{scr.platform}] {scr.route_path}
                                    </span>
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Người soạn, Cấp tài liệu, Người cập nhật cuối cùng */}
                  <div style={{ gridColumn: 'span 4' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Người soạn</label>
                    <input
                      type="text"
                      value={formData.owner || loggedInUser.full_name || loggedInUser.username || ''}
                      readOnly
                      placeholder="Chưa có người soạn..."
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 4' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Cấp tài liệu
                    </label>
                    <select
                      value={formData.document_level || 'Cấp phòng'}
                      onChange={(e) => {
                        const newLvl = e.target.value;
                        handleInputChange('document_level', newLvl);
                      }}
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', color: '#1F2937' }}
                    >
                      <option value="Cấp phòng">Cấp phòng</option>
                      <option value="Cấp công ty">Cấp công ty</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 4' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Người cập nhật cuối cùng</label>
                    <input
                      type="text"
                      value={loggedInUser.full_name || loggedInUser.username || formData.editor || formData.issuer || '---'}
                      readOnly
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* Row 3: Chữ ký phê duyệt (Bên trái, nhỏ gọn) + Ghi chú (Bên phải, kéo dài) */}
                  <div style={{
                    gridColumn: 'span 12',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'stretch'
                  }}>
                    {/* Bên trái: Chữ ký phê duyệt hình vuông nhỏ gọn */}
                    <div style={{ flexShrink: 0 }}>
                      <ApprovalSignatureSection
                        documentLevel={formData.document_level || 'Cấp phòng'}
                        author={formData.owner || loggedInUser.full_name || loggedInUser.username || formData.editor || ''}
                        approver={formData.approver || ''}
                        approverBgd={formData.approver_bgd || ''}
                        approverCustomer={formData.approver_customer || ''}
                        department={(formData.symbol || formData.code || '').match(/G7\.([A-Z0-9]+)[-.]/i)?.[1]?.toUpperCase() || ''}
                        status={formData.status}
                      />
                    </div>

                    {/* Bên phải: Ghi chú kéo dài chiếm trọn không gian còn lại */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Ghi chú
                      </label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Nhập ghi chú hoặc mô tả ngắn cho quy trình..."
                        style={{
                          width: '100%',
                          flex: 1,
                          minHeight: '84px',
                          padding: '8px 10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          outline: 'none',
                          resize: 'none',
                          fontFamily: 'inherit',
                          color: '#1F2937',
                          lineHeight: '1.4',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}
        </div>

          {/* Tab Bar Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #EADCC9',
            marginTop: '12px',
            marginBottom: '16px',
            gap: '4px'
          }}>
            {[
              { id: 'content', label: 'Nội dung Quy trình', icon: FileText },
              { id: 'instructions', label: 'Hướng dẫn thực hiện', icon: Activity },
              { id: 'templates', label: 'Tài liệu liên quan', icon: ListPlus },
              { id: 'history', label: 'Lịch sử kiểm tra', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentScreen('overview');
                    if (tab.id === 'instructions') {
                      const instructions = formData.work_instructions || [];
                      if (instructions.length > 0 && !selectedInstructionId) {
                        setSelectedInstructionId(instructions[0].id);
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: '1px solid #EADCC9',
                    borderBottom: isActive ? '2px solid white' : '1px solid #EADCC9',
                    backgroundColor: isActive ? 'white' : '#FAF6F0',
                    color: isActive ? '#7B5233' : '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '-2px',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#FAF0E6';
                      e.currentTarget.style.color = '#7B5233';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#FAF6F0';
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Card: Nội dung quy trình */}
          {activeTab === 'content' && <ProcessContentTab editor={editor} />}

          {/* Tab 2: Hướng dẫn thực hiện */}
          {activeTab === 'instructions' && <ProcessInstructionsTab editor={editor} />}

          {/* Tab 3: Tài liệu liên quan */}
          {activeTab === 'templates' && <ProcessTemplatesTab editor={editor} />}

          {/* Tab 3: Lịch sử kiểm tra */}
          {activeTab === 'history' && isProcessMode && (
            <div style={cardStyle}>
              <div style={{ ...headerStyle, cursor: 'default' }}>
                <span style={headerTextStyle}>Lịch sử kiểm tra & Đánh giá</span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #EADCC9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày đánh giá gần nhất</span>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>{formData.last_checked_date || 'Chưa thực hiện đánh giá'}</span>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Kết quả đánh giá gần nhất</span>
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: formData.last_result === 'Đạt' ? '#16a34a' : (formData.last_result === 'Không đạt' ? '#dc2626' : '#475569')
                    }}>
                      {formData.last_result || 'Chưa đánh giá'}
                    </span>
                  </div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>STT</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Ngày kiểm tra</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Người đánh giá</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Kết quả</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.last_checked_date ? (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>1</td>
                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#1e293b' }}>{formData.last_checked_date}</td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>{formData.approver || 'Hệ thống'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 'bold',
                              backgroundColor: formData.last_result === 'Đạt' ? '#dcfce7' : '#fee2e2',
                              color: formData.last_result === 'Đạt' ? '#15803d' : '#b91c1c'
                            }}>
                              {formData.last_result}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>Đánh giá định kỳ theo quy trình ISO</td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            Chưa có dữ liệu lịch sử kiểm tra được ghi nhận.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Tài liệu liên quan */}
          <ProcessTemplatesTab editor={editor} />

        </div>
      )}

      {/* --- PREVIEW MODAL: HIGH-FIDELITY PDF/A4 PRINT PREVIEW (G7.CL -QT01 Template Format) --- */}
      {showPdfPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#f1f5f9',
            width: '95%',
            maxWidth: '1000px',
            height: '92vh',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Modal Toolbar Header */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: '#7B5233',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #623f25'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '1rem', fontFamily: 'sans-serif' }}>Xem trước tài liệu in (PDF Preview)</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleDownloadDoc}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1.5px solid #7B5233',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📥 Tải file Word
                </button>
                <button
                  onClick={handlePrintPdf}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1.5px solid #7B5233',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🖨️ In tài liệu
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Modal Content Scroll Area - Visual A4 page style */}
            <div style={{
              flex: 1,
              padding: '30px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}>
              {/* Virtual A4 Page */}
              <div id="pdf-preview-document-root" className="print-document" style={{
                fontFamily: '"Times New Roman", Times, serif',
                color: 'black',
                lineHeight: '1.5',
                fontSize: '12pt',
                width: '210mm',
                boxSizing: 'border-box'
              }}>
                <style dangerouslySetInnerHTML={{ __html: `
                  .print-document, .print-document * {
                    font-family: "Times New Roman", Times, serif !important;
                  }
                  .a4-page {
                    background-color: white;
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm 15mm;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    box-sizing: border-box;
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                  }
                  .cover-border-box {
                    border: 2px solid black;
                    padding: 24px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-sizing: border-box;
                  }
                  table.no-border, table.no-border tr, table.no-border td {
                    border: none !important;
                  }
                  @media print {
                    .a4-page {
                      width: 100% !important;
                      min-height: unset !important;
                      height: auto !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      display: flex !important;
                      flex-direction: column !important;
                      justify-content: space-between !important;
                      page-break-after: always !important;
                    }
                    .a4-page:last-child {
                      page-break-after: avoid !important;
                    }
                    .cover-border-box {
                      height: 250mm !important;
                      box-sizing: border-box !important;
                      flex: none !important;
                    }
                  }
                ` }} />

                 {/* PAGE 1: COVER PAGE */}
                <div className="a4-page">
                   {/* Outer Border Box */}
                   <div className="cover-border-box">
                     {/* Top Header Table */}
                     <table className="header-table" style={{
                       width: '100%',
                       borderCollapse: 'collapse',
                       border: '1.5px solid black',
                       marginBottom: '20px'
                     }}>
                       <tbody>
                         <tr>
                           <td className="header-logo-cell" style={{
                             width: '30%',
                             textAlign: 'center',
                             padding: '10px',
                             verticalAlign: 'middle',
                             borderRight: '1.5px solid black'
                           }}>
                             <img src={logoCty} alt="Logo" style={{ height: '55px', objectFit: 'contain' }} />
                           </td>
                           <td style={{
                             width: '70%',
                             textAlign: 'center',
                             padding: '10px',
                             fontWeight: 'bold',
                             fontSize: '14pt',
                             textTransform: 'uppercase',
                             verticalAlign: 'middle',
                             letterSpacing: '0.5px'
                           }}>
                             CÔNG TY CỔ PHẦN VINA G7
                           </td>
                         </tr>
                       </tbody>
                     </table>

                     <div className="word-only-spacer" style={{ display: 'none' }}></div>

                     {/* Middle: Title & Metadata */}
                     <div style={{ textAlign: 'center', margin: '40px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <h1 style={{
                         fontSize: '18pt',
                         fontWeight: 'bold',
                         lineHeight: '1.4',
                         marginBottom: '30px',
                         textTransform: 'uppercase'
                       }}>
                         {formData.name || '---'}
                       </h1>

                       <table className="dashed-table" style={{
                         width: '75%',
                         margin: '0 auto',
                         borderCollapse: 'collapse',
                         border: '1px dashed black',
                         fontSize: '11pt',
                         textAlign: 'left'
                       }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold', width: '45%' }}>Mã hiệu:</td>
                            <td style={{ border: '1px dashed black', padding: '8px', width: '55%' }}>{formData.code || '---'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Lần ban hành:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.version || '01'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Ngày ban hành:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.issue_date || '---'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Bộ phận thực hiện:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.folder || 'QLCL'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="word-only-spacer2" style={{ display: 'none' }}></div>

                    {/* Bottom: Approval Block */}
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1.5px solid black',
                      textAlign: 'center',
                      fontSize: '11pt',
                      marginTop: 'auto'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '25%' }}>TRÁCH NHIỆM</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '30%' }}>HỌ TÊN</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '25%' }}>CHỨC VỤ</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '20%' }}>KÝ TÊN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>Biên soạn</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.issuer || '---'}</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>Người soạn thảo</td>
                          <td style={{ border: '1.5px solid black', padding: '10px', height: '40px' }}></td>
                        </tr>
                        <tr>
                          <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>Trưởng phòng duyệt</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.approver || '---'}</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>Trưởng phòng</td>
                          <td style={{ border: '1.5px solid black', padding: '10px', height: '40px' }}></td>
                        </tr>
                        {formData.document_level === 'Cấp công ty' && (
                          <tr>
                            <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>BGĐ phê duyệt</td>
                            <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.approver_bgd || '---'}</td>
                            <td style={{ border: '1.5px solid black', padding: '10px' }}>Ban Giám Đốc</td>
                            <td style={{ border: '1.5px solid black', padding: '10px', height: '40px' }}></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Cover Page Running Footer */}
                  <table className="no-border" style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '10px',
                    fontSize: '9pt',
                    fontStyle: 'italic'
                  }}>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'left', width: '30%' }}>
                          Mã hiệu: {formData.code || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày ban hành: {formData.issue_date || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày hiệu chỉnh:
                        </td>
                        <td style={{ textAlign: 'right', width: '20%' }}>
                          Lần ban hành: {formData.version || '01'} | Trang 1
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PAGE 2: REVISION LOGS */}
                <div className="a4-page" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {/* Revision logs table */}
                    <h4 style={{ margin: '0 0 16px 0', textTransform: 'uppercase', fontSize: '12pt', fontWeight: 'bold', textAlign: 'center' }}>
                      Theo dõi sửa đổi nội dung tài liệu
                    </h4>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid black',
                      marginBottom: '20px',
                      fontSize: '11pt',
                      textAlign: 'center'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', height: '34px' }}>
                          <th style={{ border: '1px solid black', padding: '6px', width: '10%' }}>Số TT</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '20%' }}>Ngày Sửa</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '55%' }}>Nội Dung Sửa Đổi</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '15%' }}>Trang Số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 18 }).map((_, idx) => {
                          const log = (formData.revision_logs || [])[idx] || {};
                          return (
                            <tr key={idx} style={{ height: '32px' }}>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{log.rev_date || '\u00A0'}</td>
                              <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>{log.content || '\u00A0'}</td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{log.page_no || '\u00A0'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Page 2 Running Footer */}
                  <table className="no-border" style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '20px',
                    fontSize: '9pt',
                    fontStyle: 'italic'
                  }}>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'left', width: '30%' }}>
                          Mã hiệu: {formData.code || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày ban hành: {formData.issue_date || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày hiệu chỉnh:
                        </td>
                        <td style={{ textAlign: 'right', width: '20%' }}>
                          Lần ban hành: {formData.version || '01'} | Trang 2
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PAGE 3+: CONTENT PAGES */}
                <div className="a4-page" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ flex: 1 }}>

                    {/* Dynamic A4 Sections content renderer */}
                    {Object.keys(formData.sections || {})
                      .filter(key => !key.startsWith('__'))
                      .map((sectionKey, sIdx) => {
                        const isFlowchart = formData.section_types?.[sectionKey] === 'flowchart';
                        const html = formData.sections[sectionKey] || '';

                        if (isFlowchart) {
                          return (
                            <React.Fragment key={sectionKey}>
                              {/* 1. Flowchart Diagram & table */}
                              <div style={{ marginBottom: '24px', pageBreakBefore: 'always' }}>
                                <h3 style={{
                                  fontSize: '13pt',
                                  fontWeight: 'bold',
                                  margin: '0 0 10px 0',
                                  borderBottom: '1px solid black',
                                  paddingBottom: '2px'
                                }}>
                                  {sIdx + 1}. {sectionKey}
                                </h3>

                                <div style={{ marginBottom: '20px' }}>
                                  <FlowchartTable steps={formData.steps || []} />
                                </div>

                                {/* Explanations section details (Times New Roman formatted) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                  {(formData.steps || []).map((step, idx) => {
                                    const stepLabel = (stepDisplayLabels[step.step_number] || '').replace(/^B/, 'Bước ') || `Bước ${step.step_number}`;
                                    return (
                                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '11.5pt', color: 'black' }}>
                                          {stepLabel}: {step.name}
                                        </div>
                                        {step.instructions ? (
                                          <div
                                            dangerouslySetInnerHTML={{ __html: step.instructions }}
                                            style={{ paddingLeft: '16px', color: 'black', fontSize: '11pt' }}
                                          />
                                        ) : (
                                          <div style={{ paddingLeft: '16px', color: '#777', fontStyle: 'italic', fontSize: '10.5pt' }}>
                                            (Chưa có giải thích cho bước này)
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 2. Visual user manual (only if there are work instructions configured) */}
                              {isProcessMode && (formData.work_instructions || []).map((inst, instIdx) => (
                                <div key={inst.id || instIdx} style={{ marginBottom: '24px', pageBreakBefore: 'always' }}>
                                  <h3 style={{
                                    fontSize: '13pt',
                                    fontWeight: 'bold',
                                    margin: '0 0 16px 0',
                                    borderBottom: '1px solid black',
                                    paddingBottom: '2px'
                                  }}>
                                    {sIdx + 1}.{instIdx + 1}. {inst.title || `Hướng dẫn thực hiện ${instIdx + 1}`}
                                  </h3>

                                  <div className="instruction-grid" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                  }}>
                                    {(inst.steps || []).map((step, idx) => {
                                      const images = step.image_urls || [];
                                      return (
                                        <div key={idx} className="instruction-card" style={{
                                          border: '1px solid black',
                                          padding: '12px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '10px'
                                        }}>
                                          {/* Work description */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                              border: '1px solid black',
                                              fontSize: '9.5pt',
                                              fontWeight: 'bold',
                                              padding: '3px 10px',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              Bước {step.step_number}
                                            </span>
                                            <span style={{ fontSize: '11pt', fontWeight: 'bold' }}>{step.name || '(Chưa nhập công việc)'}</span>
                                          </div>

                                          {/* Images row/grid */}
                                          {images.length > 0 ? (
                                            <div style={{
                                              display: 'grid',
                                              gridTemplateColumns: `repeat(${images.length}, 1fr)`,
                                              gap: '10px',
                                              marginTop: '4px'
                                            }}>
                                              {images.map((imgUrl, imgIdx) => (
                                                <div
                                                  key={imgIdx}
                                                  style={{
                                                    height: '140px',
                                                    border: '1px solid black',
                                                    overflow: 'hidden',
                                                    backgroundColor: '#f8fafc'
                                                  }}
                                                >
                                                  <img
                                                    src={imgUrl}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    alt={`hinh ${imgIdx + 1}`}
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div style={{ fontSize: '10pt', color: '#64748b', fontStyle: 'italic', paddingLeft: '8px' }}>
                                              (Chưa có hình ảnh minh họa cho bước này)
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {(!inst.steps || inst.steps.length === 0) && (
                                      <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>
                                        Chưa có bước hướng dẫn nào được cấu hình trong tài liệu này.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </React.Fragment>
                          );
                        } else {
                          return (
                            <div key={sectionKey} style={{ marginBottom: '24px' }}>
                              <h3 style={{
                                fontSize: '13pt',
                                fontWeight: 'bold',
                                margin: '0 0 6px 0',
                                borderBottom: '1px solid black',
                                paddingBottom: '2px'
                              }}>
                                {sIdx + 1}. {sectionKey}
                              </h3>
                              {html ? (
                                <div
                                  dangerouslySetInnerHTML={{ __html: html.replace(/✔\s*/g, '- ').replace(/✓\s*/g, '- ') }}
                                  style={{ paddingLeft: '8px', fontSize: '11.5pt' }}
                                />
                              ) : (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic', paddingLeft: '8px', fontSize: '11pt' }}>
                                  (Chưa có nội dung thiết lập cho mục này)
                                </div>
                              )}
                            </div>
                          );
                        }
                      })}
                  </div>

                  {/* Khung chữ ký phê duyệt hàng ngang căn đều ở dưới cùng tài liệu */}
                  <DocumentBottomSignatures
                    documentLevel={formData.document_level || 'Cấp phòng'}
                    author={formData.issuer || formData.editor || formData.owner || loggedInUser.full_name || loggedInUser.username || ''}
                    approver={formData.approver || ''}
                    approverBgd={formData.approver_bgd || ''}
                    approverCustomer={formData.approver_customer || ''}
                    department={formData.folder || ''}
                    status={formData.status}
                    issueDate={formData.issue_date}
                  />

                  {/* Page 2+ Running Footer */}
                  <table className="no-border" style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '20px',
                    fontSize: '9pt',
                    fontStyle: 'italic'
                  }}>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'left', width: '30%' }}>
                          Mã hiệu: {formData.code || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày ban hành: {formData.issue_date || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày hiệu chỉnh:
                        </td>
                        <td style={{ textAlign: 'right', width: '20%' }}>
                          Lần ban hành: {formData.version || '01'} | Trang 3
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CHỌN TÀI LIỆU TỪ HỆ THỐNG --- */}
      {showSystemTemplatesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            width: '90%',
            maxWidth: '900px',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(45, 26, 18, 0.15)',
            border: '1px solid #EADCC9',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#2d1a12' }}>
                Thêm tài liệu từ hệ thống
              </h3>
              <button
                type="button"
                onClick={() => setShowSystemTemplatesModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  fontWeight: '300'
                }}
              >
                ✕
              </button>
            </div>

            {/* Search and Filters Bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Nhập mã tài liệu"
                  value={searchTemplateQuery}
                  onChange={(e) => setSearchTemplateQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px 10px 36px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    outline: 'none',
                    color: '#1e293b'
                  }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  🔍
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSystemTemplatesFilterOpen(!systemTemplatesFilterOpen)}
                style={{
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: systemTemplatesFilterOpen ? '#FAF6F0' : 'white',
                  color: '#7B5233',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem'
                }}
                title="Lọc phòng ban"
              >
                🎛️
              </button>
            </div>

            {/* Department dropdown (if filter is open) */}
            {systemTemplatesFilterOpen && (
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b' }}>Phòng ban / Thư mục:</span>
                <select
                  value={systemTemplatesDepartmentFilter}
                  onChange={(e) => setSystemTemplatesDepartmentFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: 'white',
                    color: '#1e293b',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Tất cả phòng ban</option>
                  {Array.from(new Set(systemTemplates.map(st => st.folder).filter(Boolean))).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Table */}
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={(() => {
                          const isSearchActive = searchTemplateQuery.trim() !== '' || systemTemplatesDepartmentFilter !== '';
                          const listToCompare = isSearchActive
                            ? systemTemplates.filter(st => {
                                const matchSearch = (st.code && st.code.toLowerCase().includes(searchTemplateQuery.toLowerCase())) ||
                                  (st.name && st.name.toLowerCase().includes(searchTemplateQuery.toLowerCase()));
                                const matchDept = systemTemplatesDepartmentFilter === '' || st.folder === systemTemplatesDepartmentFilter;
                                return matchSearch && matchDept;
                              })
                            : systemTemplates.filter(st => tempCheckedIds.includes(st.id));

                          return listToCompare.length > 0 && listToCompare.every(st => tempCheckedIds.includes(st.id));
                        })()}
                        onChange={() => {
                          const isSearchActive = searchTemplateQuery.trim() !== '' || systemTemplatesDepartmentFilter !== '';
                          const listToCompare = isSearchActive
                            ? systemTemplates.filter(st => {
                                const matchSearch = (st.code && st.code.toLowerCase().includes(searchTemplateQuery.toLowerCase())) ||
                                  (st.name && st.name.toLowerCase().includes(searchTemplateQuery.toLowerCase()));
                                const matchDept = systemTemplatesDepartmentFilter === '' || st.folder === systemTemplatesDepartmentFilter;
                                return matchSearch && matchDept;
                              })
                            : systemTemplates.filter(st => tempCheckedIds.includes(st.id));

                          const allChecked = listToCompare.length > 0 && listToCompare.every(st => tempCheckedIds.includes(st.id));
                          if (allChecked) {
                            const idsToRemove = listToCompare.map(st => st.id);
                            setTempCheckedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
                          } else {
                            const newIds = [...tempCheckedIds];
                            listToCompare.forEach(st => {
                              if (!newIds.includes(st.id)) {
                                newIds.push(st.id);
                              }
                            });
                            setTempCheckedIds(newIds);
                          }
                        }}
                      />
                    </th>
                    <th style={{ padding: '10px 12px', width: '120px', color: '#7B5233', fontWeight: 'bold' }}>Mã</th>
                    <th style={{ padding: '10px 12px', color: '#7B5233', fontWeight: 'bold' }}>Tên tài liệu</th>
                    <th style={{ padding: '10px 12px', width: '150px', color: '#7B5233', fontWeight: 'bold' }}>phòng ban</th>
                    <th style={{ padding: '10px 12px', width: '100px', color: '#7B5233', fontWeight: 'bold' }}>trạng thái</th>
                    <th style={{ padding: '10px 12px', width: '120px', color: '#7B5233', fontWeight: 'bold' }}>ngày ban hành</th>
                    <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const isSearchActive = searchTemplateQuery.trim() !== '' || systemTemplatesDepartmentFilter !== '';
                    const listToShow = systemTemplates.filter(st => {
                      if (!isSearchActive) {
                        return tempCheckedIds.includes(st.id);
                      }
                      const matchSearch = (st.code && st.code.toLowerCase().includes(searchTemplateQuery.toLowerCase())) ||
                        (st.name && st.name.toLowerCase().includes(searchTemplateQuery.toLowerCase()));
                      const matchDept = systemTemplatesDepartmentFilter === '' || st.folder === systemTemplatesDepartmentFilter;
                      return matchSearch && matchDept;
                    });

                    if (listToShow.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            {!isSearchActive
                              ? "Chưa có tài liệu nào được chọn. Vui lòng nhập mã tài liệu tìm kiếm để chọn thêm."
                              : "Không tìm thấy tài liệu phù hợp."
                            }
                          </td>
                        </tr>
                      );
                    }

                    return listToShow.map(st => (
                      <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={tempCheckedIds.includes(st.id)}
                            onChange={() => {
                              if (tempCheckedIds.includes(st.id)) {
                                setTempCheckedIds(prev => prev.filter(id => id !== st.id));
                              } else {
                                setTempCheckedIds(prev => [...prev, st.id]);
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                          {st.code}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          {st.name}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {st.folder || '---'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            backgroundColor: st.status === 'Hiệu lực' || st.status === 'Đang lưu hành' ? '#dcfce7' : '#fee2e2',
                            color: st.status === 'Hiệu lực' || st.status === 'Đang lưu hành' ? '#15803d' : '#b91c1c'
                          }}>
                            {st.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {st.issue_date || '---'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (st.file_path) {
                                window.open(api.defaults.baseURL.replace('/api/v1', '') + '/' + st.file_path, '_blank');
                              } else {
                                alert("Tài liệu này chưa đính kèm file gốc.");
                              }
                            }}
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#7B5233',
                              cursor: 'pointer',
                              fontSize: '1.05rem',
                              padding: '2px'
                            }}
                            title="Xem file gốc"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowSystemTemplatesModal(false)}
                style={{
                  padding: '8px 20px',
                  border: '1.5px solid #7B5233',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#7B5233',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleUpdateSystemTemplates}
                style={{
                  padding: '8px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#4A301C',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  boxShadow: '0 2px 4px rgba(74, 48, 28, 0.15)'
                }}
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ISOProcessEditorView;
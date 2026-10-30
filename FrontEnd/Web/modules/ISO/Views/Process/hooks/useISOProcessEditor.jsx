import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { removeDiacritics, isGenericNameText, generateNextQTCode } from '../utils/isoUtils';
import logoCty from '../utils/logoCty';

const useISOProcessEditor = ({ setCustomTitle, setCustomSubtitle, setCustomScreenCode, screenCode, title, subtitle, navigate, id, location }) => {
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const isProcessMode = true;
  const backPath = isProcessMode ? '/admin/iso-processes' : '/admin/iso-documents';
  const isEditMode = id && id !== 'new';

  // Screen routing states: 'overview' (M├án h├¼nh 1), 'step_instructions' (ß║ónh 4)
  const [currentScreen, setCurrentScreen] = useState('overview');
  const [activeTab, setActiveTab] = useState('content');
  const [zoomScale, setZoomScale] = useState(1.0);
  const [activeMenu, setActiveMenu] = useState('Mß╗Ñc ─æ├¡ch');
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
    file_path: '',
    status: 'Hiß╗çu lß╗▒c',
    folder: '', // display_at
    doc_type: '', // note
    document_level: '',
    iso_document_id: '',
    iso_document_code: '',
    iso_document_name: '',
    revision_logs: [
      { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }
    ],
    sections: {},
    section_types: {},
    steps: [],
    instruction_steps: [],
    work_instructions: [],
    related_templates: []
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
          console.error('Lß╗ùi khi tß║úi danh s├ích t├ái liß╗çu hß╗ç thß╗æng:', err);
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

    showFeedback('info', '─Éang tß║úi l├¬n t├ái liß╗çu ─æ├¡nh k├¿m...');
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
              file_name: res.file_name || file.name,
              original_file_name: res.file_name || file.name,
              file_path: res.file_path
            };
          }
          return t;
        })
      }));
      showFeedback('success', 'Tß║úi l├¬n t├ái liß╗çu ─æ├¡nh k├¿m th├ánh c├┤ng!');
    } catch (err) {
      console.error('Lß╗ùi khi upload t├ái liß╗çu ─æ├¡nh k├¿m:', err);
      showFeedback('error', err.response?.data?.detail || 'Kh├┤ng thß╗â tß║úi l├¬n t├ái liß╗çu ─æ├¡nh k├¿m');
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
    showFeedback('success', 'Đã xóa file đính kèm chính!');
  };

  const handleUploadChildFiles = async (e, templateId) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const formDataPay = new FormData();
    files.forEach(file => {
      formDataPay.append('files', file);
    });

    showFeedback('info', `Đang tải lên ${files.length} tệp con đính kèm...`);
    try {
      const res = await api.post('/iso-documents/upload-multiple-attachments', formDataPay, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newUploadedFiles = res.data?.files || res.files || [];
      if (!newUploadedFiles.length) {
        showFeedback('warning', 'Không có tệp con nào được tải lên hợp lệ.');
        return;
      }

      setFormData(prev => ({
        ...prev,
        related_templates: (prev.related_templates || []).map(t => {
          if (t.id === templateId) {
            const currentSubFiles = Array.isArray(t.sub_files) ? [...t.sub_files] : [];
            return {
              ...t,
              sub_files: [...currentSubFiles, ...newUploadedFiles]
            };
          }
          return t;
        })
      }));
      showFeedback('success', `Đã tải lên thành công ${newUploadedFiles.length} tệp con đính kèm!`);
    } catch (err) {
      console.error('Lỗi khi upload tệp con đính kèm:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể tải lên tệp con đính kèm');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteChildFile = (templateId, childFileId) => {
    setFormData(prev => ({
      ...prev,
      related_templates: (prev.related_templates || []).map(t => {
        if (t.id === templateId) {
          const updatedSubFiles = (t.sub_files || []).filter(f => f.id !== childFileId);
          return {
            ...t,
            sub_files: updatedSubFiles
          };
        }
        return t;
      })
    }));
    showFeedback('success', 'Đã xóa tệp con đính kèm!');
  };

  const handleAddRelatedTemplate = () => {
    const newId = `template_${Date.now()}`;
    const nextIdx = (formData.related_templates || []).length + 1;
    const suffix = `BM${String(nextIdx).padStart(2, '0')}`;
    const procCode = (formData.new_code || formData.code || 'G7.QL.QT01').trim();
    const newT = {
      id: newId,
      code: `${procCode}-${suffix}`,
      title: `Biểu mẫu ${suffix}`,
      scope: 'Tất cả',
      note: '',
      file_name: '',
      file_path: '',
      sub_files: [],
      storage_location: formData.department_name || 'Ban Quản trị Chất lượng & ISO (QLCL)',
      retention_period: '03 năm'
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
    showFeedback('success', '─É├ú x├│a t├ái liß╗çu li├¬n quan!');
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
          scope: st.folder || 'Tß║Ñt cß║ú',
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
    showFeedback('success', '─É├ú cß║¡p nhß║¡t danh s├ích t├ái liß╗çu li├¬n quan!');
  };

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const data = await api.get('/screens');
        setSystemScreens(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lß╗ùi khi tß║úi danh s├ích m├án h├¼nh:', err);
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
        const expectedDefaultName = `Bã░ß╗øc mß╗øi ${cleanNum}`;
        if (step.name && step.name.startsWith("Bã░ß╗øc mß╗øi") && step.name !== expectedDefaultName) {
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
          name: `Bã░ß╗øc mß╗øi ${nextStepNum}`,
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
        steps[index] = { ...steps[index], transition: { next_step: null, name: "Ho├án tß║Ñt", node_type: "terminal" } };
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
          name: `Bã░ß╗øc mß╗øi ${nextStepNum}`,
          node_type: 'task',
          assignee_role: 'QC',
          transition: null,
          fail_path: []
        };
        steps.push(newStep);
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Kh├┤ng ─æß╗ông ├¢", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Kh├┤ng", return_to_step: nextStepNum }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: nextStepNum } : { ...fp });
        }
        steps[index] = { ...currentStep, fail_path: newFailPath, has_branch: true };
        setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
        return { ...prev, steps };
      } else if (val === 'custom') {
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Hß╗ºy bß╗Å / Trß║ú h├áng", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Kh├┤ng", return_to_step: null, node_type: "terminal" }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: null, node_type: "terminal", name: fp.name || "Hß╗ºy bß╗Å / Trß║ú h├áng" } : { ...fp });
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
          newFailPath = [{ name: "Xß╗¡ l├¢ lß╗ùi", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Kh├┤ng", return_to_step: stepNum }];
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
    let shapeIcon = '­ƒôä';

    if (isTerminal) {
      cardBg = '#F0FDF4';
      cardBorder = '1.5px solid #16a34a';
      cardRadius = '24px';
      shapeIcon = '­ƒÅü';
    } else if (isDecision) {
      cardBg = '#FFFBEB';
      cardBorder = '1.5px solid #d97706';
      cardRadius = '8px';
      shapeIcon = '­ƒöÂ';
    } else if (isCondition) {
      cardBg = '#FAF5FF';
      cardBorder = '1.5px solid #7c3aed';
      cardRadius = '8px';
      shapeIcon = 'ÔÿÂ';
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
              getStepFailPath(step)[0].name || 'Hß╗ºy bß╗Å',
              true
            )
          }

          {isDecision && step.transition && step.transition.next_step === null &&
            renderCustomOutcomeNode(
              `step-card-${step.step_number}-custom-yes`,
              step.transition.node_type || 'terminal',
              step.transition.name || 'Ho├án tß║Ñt',
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
                <span style={{ fontSize: '0.55rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold', marginTop: '2px' }}>ÔÜá´©Å Thiß║┐u Yes</span>
              )}
              {isDecision && !hasNo && (
                <span style={{ fontSize: '0.55rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold', marginTop: '2px' }}>ÔÜá´©Å Thiß║┐u No</span>
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
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>─É├║ng:</span>
                <select
                  value={step.transition?.next_step === null ? 'custom' : (step.transition?.next_step || '')}
                  onChange={(e) => handleQuickTransitionChange(idx, e.target.value)}
                  style={{ padding: '1px', border: '1px solid #b7ebc6', borderRadius: '3px', fontSize: '0.65rem', backgroundColor: 'white', maxWidth: '90px' }}
                >
                  <option value="">-- Hß║┐t --</option>
                  <option value="new_step">Ô×ò Bã░ß╗øc mß╗øi...</option>
                  <option value="custom">Ô£ì´©Å T├╣y chß╗ënh...</option>
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
                  <option value="">-- Hß║┐t --</option>
                  <option value="new_step">Ô×ò Bã░ß╗øc mß╗øi...</option>
                  <option value="custom">Ô£ì´©Å T├╣y chß╗ënh...</option>
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
              <div>Ô×ö Nh├ính 1: B3</div>
              <div>Ô×ö Nh├ính 2: B4</div>
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
              <span style={{ fontSize: '0.62rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>ÔÜá´©Å Thiß║┐u bã░ß╗øc tiß║┐p theo</span>
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
            <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Ô×ö Bã░ß╗øc tiß║┐p:</span>
            <select
              value={step.transition?.next_step === null ? 'custom' : (step.transition?.next_step || '')}
              onChange={(e) => handleQuickTransitionChange(idx, e.target.value)}
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.68rem', backgroundColor: 'white' }}
            >
              <option value="">-- Mß║Àc ─æß╗ïnh --</option>
              <option value="new_step">Ô×ò Tß║ío bã░ß╗øc mß╗øi...</option>
              <option value="custom">Ô£ì´©Å T├╣y chß╗ënh...</option>
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
      setCustomTitle('Quß║ún l├¢ quy tr├¼nh');
      setCustomSubtitle(isEditMode ? 'Nh├ón sß╗▒ - Chß╗ënh sß╗¡a Quy tr├¼nh' : 'Nh├ón sß╗▒ - Th├¬m mß╗øi Quy tr├¼nh');
      setCustomScreenCode(isEditMode ? 'AD55' : 'AD18');
    } else {
      setCustomTitle('Quß║ún l├¢ mß║½u t├ái liß╗çu');
      setCustomSubtitle(isEditMode ? 'Nh├ón sß╗▒ - Chß╗ënh sß╗¡a Mß║½u ISO' : 'Nh├ón sß╗▒ - Th├¬m mß╗øi Mß║½u ISO');
      setCustomScreenCode(isEditMode ? 'AD17.1' : 'AD17');
    }

    if (location.state && location.state.parsedData) {
      const parsed = location.state.parsedData;
      // Lß║Ñy nguy├¬n danh s├ích sections tß╗½ parser ÔÇô kh├┤ng th├¬m bß╗øt
      const newSections = { ...(parsed.sections || {}) };
      const newSectionTypes = {};

      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsed.section_types?.[key] || 'text';
      });

      generateNextQTCode(isProcessMode).then(nextCode => {
        const parsedName = parsed.name || '';
        const isGenericName = isGenericNameText(parsedName);
        const resolvedCode = (parsed.code || '').trim() || (parsed.symbol || '').trim() || nextCode || 'G7.CL -QT01';
        setFormData({
          id: null,
          code: resolvedCode,
          new_code: resolvedCode,
          name: isGenericName ? '' : parsedName,
          version: parsed.version || '01',
          issue_date: parsed.issue_date || new Date().toISOString().split('T')[0],
          issuer: parsed.issuer || '',
          editor: loggedInUser.full_name || loggedInUser.username || '',
          approver: parsed.approver || '',
          owner: parsed.issuer || parsed.owner || '',
          file_path: parsed.file_path || '',
          status: parsed.status || 'Hiß╗çu lß╗▒c',
          folder: parsed.folder || '',
          doc_type: parsed.doc_type || '',
          document_level: parsed.document_level || '',
          revision_logs: parsed.revision_logs && parsed.revision_logs.length > 0 ? parsed.revision_logs : [
            { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }
          ],
          sections: {
            ...newSections,
            ...(parsed.html_content ? { '__full_html__': parsed.html_content } : {})
          },
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
            title: 'Hã░ß╗øng dß║½n thß╗▒c hiß╗çn quy tr├¼nh',
            scope: 'Tß║Ñt cß║ú',
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
      showFeedback('success', '─É├ú b├│c t├ích tß╗▒ ─æß╗Öng dß╗» liß╗çu tß╗½ file Word th├ánh c├┤ng!');
    } else if (isEditMode) {
      fetchDocDetails();
    } else {
      generateNextQTCode(isProcessMode).then(nextCode => {
        setFormData(prev => ({
          ...prev,
          code: nextCode,
          new_code: nextCode
        }));
      });
    }
  }, [id]);

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
          title: 'Hã░ß╗øng dß║½n thß╗▒c hiß╗çn quy tr├¼nh',
          steps: convertedSteps
        }];
      }

      let relatedTemplates = (data.related_templates && data.related_templates.length > 0) ? [...data.related_templates] : [];
      if (receivedSections['__metadata_related_templates__']) {
        try {
          const parsed = JSON.parse(receivedSections['__metadata_related_templates__']);
          if (Array.isArray(parsed) && parsed.length > 0) {
            relatedTemplates = parsed;
          }
        } catch (e) {
          console.error('Error parsing related templates metadata:', e);
        }
        delete receivedSections['__metadata_related_templates__'];
      }

      // Sections ─æã░ß╗úc lß║Ñy nguy├¬n tß╗½ DB ÔÇô kh├┤ng merge th├¬m key cß╗æ ─æß╗ïnh

      Object.keys(receivedSections).forEach(key => {
        if (sectionTypes[key] === undefined) {
          sectionTypes[key] = (key === 'Nß╗Öi dung' && isProcessMode) ? 'flowchart' : 'text';
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
        file_path: data.file_path || '',
        status: data.status || 'Hiß╗çu lß╗▒c',
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
          template_files: step.template_files || step.transition?.template_files || '',
          standard: step.standard || step.transition?.standard || '',
          node_type: step.transition?.node_type || step.node_type || 'task',
          has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
          fail_path: step.transition?.fail_path || step.fail_path || [],
          image_url: step.transition?.image_url || ''
        })),
        instruction_steps: instructionSteps,
        work_instructions: workInstructions,
        related_templates: relatedTemplates
      });
      if (relatedTemplates && relatedTemplates.length > 0) {
        setSelectedTemplateId(relatedTemplates[0].id);
      }

      const validSecKeys = Object.keys(receivedSections).filter(k => !k.startsWith('__'));
      if (validSecKeys.length > 0 && (!activeMenu || !validSecKeys.includes(activeMenu))) {
        setActiveMenu(validSecKeys[0]);
      }
    } catch (error) {
      console.error('Lß╗ùi khi tß║úi chi tiß║┐t quy tr├¼nh:', error);
      showFeedback('error', 'Kh├┤ng thß╗â tß║úi chi tiß║┐t quy tr├¼nh tß╗½ hß╗ç thß╗æng');
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
      showFeedback('error', 'Chß╗ë hß╗ù trß╗ú tß║úi l├¬n tß╗çp ─æß╗ïnh dß║íng Word (.doc, .docx)');
      return;
    }

    if (fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Hß╗ç thß╗æng chß╗ë hß╗ù trß╗ú ph├ón t├¡ch tß╗▒ ─æß╗Öng ─æß╗ïnh dß║íng Word (.docx). Vui l├▓ng chuyß╗ân ─æß╗òi tß╗çp (.doc) sang (.docx) trã░ß╗øc khi tß║úi l├¬n.');
      return;
    }

    const formDataPay = new FormData();
    formDataPay.append('file', file);

    setUploadLoading(true);
    showFeedback('info', '─Éang tß║úi l├¬n v├á ph├ón t├¡ch t├ái liß╗çu quy tr├¼nh mß╗øi...');

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

      if (parsedData.html_content) {
        newSections.__full_html__ = parsedData.html_content;
      }

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
        code: parsedData.code || prev.code,
        version: parsedData.version || prev.version || '01',
        file_path: parsedData.file_path || prev.file_path,
        docx_path: parsedData.file_path || prev.docx_path,
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
        work_instructions: workInstructionsMapped,
        updated_at: Date.now()
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
      name: `Bước ${nextStepNum}`,
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
      title: `hã░ß╗øng dß║½n ${maxAa + 1}`,
      scope: 'Tß║Ñt cß║ú',
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
    if (window.confirm("Bß║ín c├│ chß║»c chß║»n muß╗æn x├│a hã░ß╗øng dß║½n n├áy c├╣ng to├án bß╗Ö c├íc bã░ß╗øc v├á h├¼nh ß║únh?")) {
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
    if (window.confirm("Bß║ín c├│ chß║»c chß║»n muß╗æn x├│a bã░ß╗øc n├áy?")) {
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
      alert("Tr├¼nh duyß╗çt chß║Àn mß╗ƒ cß╗¡a sß╗ò mß╗øi. Vui l├▓ng cho ph├®p popup ─æß╗â xuß║Ñt PDF.");
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
          <title>${formData.name || 'Quy tr├¼nh ISO'}</title>
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

    const rawCode = (formData.new_code || '').trim() || (formData.code || '').trim() || (formData.symbol || '').trim();
    const effCode = rawCode || 'G7.CL -QT01';
    const rawLogs = Array.isArray(formData.revision_logs) ? formData.revision_logs : [];
    const validLogs = rawLogs.filter(l => l && (l.content || l.rev_date || l.seq_no));
    let effVer = (formData.version || '01').trim();
    let effDate = (formData.issue_date || '').trim();
    if (validLogs.length > 0) {
      const seqNums = validLogs.map(l => Number(l.seq_no)).filter(n => !isNaN(n) && n > 0);
      const maxSeq = seqNums.length > 0 ? Math.max(...seqNums) : validLogs.length;
      effVer = String(maxSeq).padStart(2, '0');
      for (let i = validLogs.length - 1; i >= 0; i--) {
        const d = validLogs[i].rev_date;
        if (d && String(d).trim()) {
          effDate = String(d).trim();
          break;
        }
      }
    }
    if (/^\d+$/.test(effVer)) effVer = effVer.padStart(2, '0');
    if (!effDate) effDate = (formData.issue_date || '15/10/2026').trim();

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

    const dividers = clone.querySelectorAll('.iso-doc-page-break-divider');
    dividers.forEach(div => {
      const br = document.createElement("p");
      br.style.pageBreakBefore = "always";
      br.style.clear = "both";
      br.innerHTML = "&nbsp;";
      if (div.parentNode) {
        div.parentNode.replaceChild(br, div);
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
          <title>${formData.name || 'Quy tr├¼nh ISO'}</title>
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
              mso-footer: f1;
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
            .word-only-spacer, .word-only-spacer2 {
              display: none !important;
              height: 0 !important;
            }
            table.MsoFooter {
              width: 100%;
              border-collapse: collapse;
              border: none !important;
              border-top: 1.0pt solid windowtext !important;
              font-family: 'Times New Roman', serif;
              font-size: 10pt;
              font-style: normal;
            }
            table.MsoFooter td {
              border: none !important;
              padding: 3pt 0 !important;
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
            table.MsoFooter, table.MsoFooter tr, table.MsoFooter td {
              border: none !important;
              mso-border-alt: none !important;
              mso-border-top-alt: none !important;
              mso-border-bottom-alt: none !important;
              mso-border-left-alt: none !important;
              mso-border-right-alt: none !important;
            }
            table.MsoFooter {
              border-top: 1.0pt solid windowtext !important;
              mso-border-top-alt: 1.0pt solid windowtext !important;
            }
          </style>
        </head>
        <body>
          <div class="Section1">
            ${html}
          </div>
          <!-- Real Word Footer pinned to bottom margin of every page (Khong co ke khung o, chi co duong ke ngang don o tren) -->
          <div style="mso-element:footer" id="f1">
            <table class="MsoFooter" border="0" cellspacing="0" cellpadding="0" style="width:100%; border-collapse:collapse; border:none !important; mso-border-alt:none !important; border-top:1.0pt solid windowtext !important; mso-border-top-alt:1.0pt solid windowtext !important; font-family:'Times New Roman',serif; font-size:10pt; color:#0D0D0D; margin-top:4pt;">
              <tr style="border:none !important; mso-border-alt:none !important;">
                <td style="border:none !important; mso-border-alt:none !important; padding:3pt 0; text-align:left; width:28%;">Mã hiệu: ${effCode}</td>
                <td style="border:none !important; mso-border-alt:none !important; padding:3pt 0; text-align:center; width:22%;">Lần ban hành: ${effVer}</td>
                <td style="border:none !important; mso-border-alt:none !important; padding:3pt 0; text-align:center; width:28%;">Ngày ban hành: ${effDate}</td>
                <td style="border:none !important; mso-border-alt:none !important; padding:3pt 0; text-align:right; width:22%;">Trang: <span style="mso-field-code: PAGE ">1</span>/<span style="mso-field-code: NUMPAGES ">${pages?.length || 6}</span></td>
              </tr>
            </table>
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
        name: nodeType === 'decision' ? `Kiểm tra ${nextStepNum}` : nodeType === 'terminal' ? `Kết thúc` : `Bước ${nextStepNum}`,
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
  const handleSaveForm = async (options = {}) => {
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
        const tFiles = step.template_files || step.transition?.template_files || '';
        const std = step.standard || step.transition?.standard || '';
        const nextTransition = {
          ...(step.transition || {}),
          template_files: tFiles,
          standard: std,
          node_type: step.node_type || 'task',
          has_branch: step.has_branch || false,
          fail_path: getStepFailPath(step),
          image_url: step.image_url || ''
        };
        return {
          ...step,
          template_files: tFiles,
          standard: std,
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
      showFeedback('success', res?.message || 'Lưu tài liệu quy trình ISO thành công!');

      if (res?.revision_logs && res.revision_logs.length > 0) {
        setFormData(prev => ({
          ...prev,
          revision_logs: res.revision_logs
        }));
      }

      if (!options?.stayOnPage) {
        setTimeout(() => {
          navigate(backPath);
        }, 1000);
      }
      return res;

    } catch (error) {
      console.error('Lỗi khi lưu quy trình:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi lưu trữ dữ liệu quy trình');
      throw error;
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

  return {
    uploadLoading, setUploadLoading,
    currentScreen, setCurrentScreen,
    activeTab, setActiveTab,
    zoomScale, setZoomScale,
    activeMenu, setActiveMenu,
    selectedStepIdx, setSelectedStepIdx,
    flowchartMode, setFlowchartMode,
    infoExpanded, setInfoExpanded,
    selectedInstructionId, setSelectedInstructionId,
    showStepPopup, setShowStepPopup,
    isEditingStep, setIsEditingStep,
    editingStepIdx, setEditingStepIdx,
    stepForm, setStepForm,
    stepsAccordionExpanded, setStepsAccordionExpanded,
    historyAccordionExpanded, setHistoryAccordionExpanded,
    explanationExpanded, setExplanationExpanded,
    showPdfPreview, setShowPdfPreview,
    autoPrintTriggered, setAutoPrintTriggered,
    formData, setFormData,
    loading, setLoading,
    message, setMessage,
    systemScreens, setSystemScreens,
    isScreenDropdownOpen, setIsScreenDropdownOpen,
    selectedTemplateId, setSelectedTemplateId,
    showSystemTemplatesModal, setShowSystemTemplatesModal,
    systemTemplates, setSystemTemplates,
    searchTemplateQuery, setSearchTemplateQuery,
    systemTemplatesFilterOpen, setSystemTemplatesFilterOpen,
    systemTemplatesDepartmentFilter, setSystemTemplatesDepartmentFilter,
    tempCheckedIds, setTempCheckedIds,
    fileInputRef,
    flowchartCanvasRef,
    loggedInUser,
    isProcessMode,
    data,
    file,
    res,
    newId,
    data,
    failPath,
    currStep,
    next,
    failPath,
    visited,
    currStep,
    maxLeftChainLength,
    failPath,
    visited,
    currStep,
    stepDisplayLabels,
    container,
    dx,
    dy,
    label,
    steps,
    newStep,
    steps,
    currentStep,
    failPath,
    newStep,
    stepNum,
    isSelected,
    isDecision,
    url,
    data,
    file,
    match,
    newStep,
    newStep,
    c,
    num,
    step,
    url,
    img,
    canvas,
    width,
    height,
    img,
    br,
    table,
    tr,
    td,
    url,
    a,
    steps,
    role,
    failPath,
    currStep,
    next,
    role,
    failPath,
    visited,
    currStep,
    next,
    pos,
    newStep,
    idx,
    url,
    res,
    cardBorderColor,
    accentColor,
    cardStyle,
    headerStyle,
    headerTextStyle,
    isStepSelected,
    handleSetFlowchartMode,
    fetchSystemTemplates,
    handleUploadAttachment,
    handleUploadChildFiles,
    handleDeleteChildFile,
    handleDeleteAttachment,
    handleAddRelatedTemplate,
    handleDeleteRelatedTemplate,
    handleUpdateRelatedTemplate,
    handleOpenSystemTemplatesModal,
    handleUpdateSystemTemplates,
    fetchScreens,
    handleToggleScreen,
    getSidestepsInfo,
    getMaxLeftChainLength,
    getStepDisplayLabels,
    mainSteps,
    handleCanvasMouseDown,
    handleMouseMove,
    handleMouseUp,
    newSteps,
    handleQuickTransitionChange,
    handleQuickFailPathChange,
    renderSingleStepCard,
    fetchDocDetails,
    convertedSteps,
    showFeedback,
    handleInputChange,
    handleWordUpload,
    stepsMapped,
    instructionStepsMapped,
    handleSectionChange,
    getSectionHint,
    handleAddStep,
    getStepFailPath,
    handleUpdateStep,
    handleRemoveStep,
    handleAddInstructionStep,
    nextStepNum,
    handleUpdateInstructionStep,
    handleRemoveInstructionStep,
    nextSteps,
    handleInstructionImageUpload,
    handleAddWorkInstruction,
    generatedCode,
    handleUpdateWorkInstructionTitle,
    nextInstructions,
    handleUpdateWorkInstructionScope,
    nextInstructions,
    handleUpdateWorkInstructionNote,
    nextInstructions,
    handleRemoveWorkInstruction,
    nextInstructions,
    handleOpenAddStepPopup,
    nextNum,
    handleOpenEditStepPopup,
    handleSaveStep,
    nextInstructions,
    handleRemoveWorkInstructionStep,
    nextInstructions,
    nextSteps,
    handleReorderStepInPopup,
    nextInstructions,
    handlePopupImageUpload,
    handlePrintPdf,
    svgToPngDataUrl,
    handleDownloadDoc,
    cleanFlexboxStyles,
    handleAutoLayoutClassic,
    getSidesteps,
    getNodeDimensions,
    handlePositionsChange,
    handleAddStepFromCanvas,
    handleNodeSelect,
    handleImageUpload,
    triggerDownload,
    handleSaveForm,
    flattenedInstructionSteps,
    isEditMode: id && id !== 'new',
    isProcessMode: true,
    navigate,
    id,
  };
};

export default useISOProcessEditor;
import React, { useState, useEffect, useMemo, useRef } from 'react';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import { Camera, X, Image as ImageIcon, Check, RotateCcw, Search, Plus, Pencil, ChevronDown, ChevronUp, AlertCircle, Eye, Info } from 'lucide-react';
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import FlowchartTable from '../../../../Web/modules/ISO/Views/FlowchartTable';

const FirstArticleInspectionView = () => {
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);

  // Core states
  const [activeStage, setActiveStage] = useState('');
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [isPoSearching, setIsPoSearching] = useState(false);
  const [poNotFound, setPoNotFound] = useState(false);
  const [recentPOs, setRecentPOs] = useState([]);
  const [activePOs, setActivePOs] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Loaded PO & items
  const [poHeader, setPoHeader] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [selectedItemCode, setSelectedItemCode] = useState('');

  // Equipments / Machines
  const [machines, setMachines] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [selectedMachineCode, setSelectedMachineCode] = useState('');
  const [selectedMachineName, setSelectedMachineName] = useState('');
  const [checklistResults, setChecklistResults] = useState([]); // Array of { step, title, status: 'pass'|'fail', note: '', images: [] }

  // ISO Processes match states
  const [isoProcesses, setIsoProcesses] = useState([]);
  const [matchedProcess, setMatchedProcess] = useState(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processModalTab, setProcessModalTab] = useState('quick'); // 'quick' or 'detail'
  const [selectedProcessDetails, setSelectedProcessDetails] = useState(null);
  const [isDetailInspectionOpen, setIsDetailInspectionOpen] = useState(false);
  const [detailIdx, setDetailIdx] = useState(null);
  const [detailSteps, setDetailSteps] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Quantities
  const [producedQty, setProducedQty] = useState(10);
  const [sampledQty, setSampledQty] = useState(5);
  const [rejectedQty, setRejectedQty] = useState(0);

  // Defect Tracking
  const [defectTypes, setDefectTypes] = useState([]);
  const [activeDefects, setActiveDefects] = useState([{ defectId: '', quantity: 1 }]);

  // Lọc danh mục lỗi theo công đoạn của tài khoản
  const myStageDefects = useMemo(() => {
    const userStages = user?.stageNames || [];
    return defectTypes.filter(t => {
      // Nếu tài khoản không được gán công đoạn nào, hiển thị tất cả
      if (userStages.length === 0) return true;
      if (!t.stage) return true; // Nếu lỗi không gán công đoạn cụ thể, hiển thị cho mọi công đoạn

      let defectStages = [];
      try {
        defectStages = t.stage.startsWith('[') ? JSON.parse(t.stage) : [t.stage];
      } catch (e) {
        defectStages = [t.stage];
      }
      if (defectStages.length === 0) return true;

      return defectStages.some(ds => {
        return userStages.some(us => {
          const uNorm = us.toLowerCase().trim();
          const dNorm = ds.toLowerCase().trim();
          return uNorm === dNorm || uNorm.includes(dNorm) || dNorm.includes(uNorm);
        });
      });
    });
  }, [defectTypes, user]);

  // Phân chia lỗi QA track (needs_tracking === true) và lỗi còn lại
  const qaTrackedDefects = useMemo(() => {
    return myStageDefects.filter(t => t.needs_tracking === true);
  }, [myStageDefects]);

  const remainingDefects = useMemo(() => {
    return myStageDefects.filter(t => t.needs_tracking !== true);
  }, [myStageDefects]);

  // Lọc máy móc theo công đoạn của tài khoản khớp với bộ phận
  const filteredMachines = useMemo(() => {
    const userStages = user?.stageNames || [];
    // Nếu tài khoản không được gán công đoạn nào, hiển thị tất cả
    if (userStages.length === 0) {
      if (activeStage) {
        return machines.filter(m => {
          if (!m.department) return false;
          const sNorm = activeStage.toLowerCase().replace(/\s+/g, '');
          const dNorm = m.department.toLowerCase().replace(/\s+/g, '');
          return sNorm === dNorm || sNorm.includes(dNorm) || dNorm.includes(sNorm);
        });
      }
      return machines;
    }
    return machines.filter(m => {
      if (!m.department) return false;
      return userStages.some(stage => {
        const sNorm = stage.toLowerCase().replace(/\s+/g, '');
        const dNorm = m.department.toLowerCase().replace(/\s+/g, '');
        return sNorm === dNorm || sNorm.includes(dNorm) || dNorm.includes(sNorm);
      });
    });
  }, [machines, user, activeStage]);

  // Lọc PO hoạt động theo từ khóa tìm kiếm (poSearchTerm)
  const filteredPOs = useMemo(() => {
    if (!poSearchTerm) return activePOs;
    const term = poSearchTerm.toLowerCase().trim();
    return activePOs.filter(po =>
      (po.po_code || '').toLowerCase().includes(term) ||
      (po.supplier_name || '').toLowerCase().includes(term)
    );
  }, [activePOs, poSearchTerm]);

  // Modals & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageConfig, setMessageConfig] = useState({ type: 'success', title: '', message: '' });

  // Note Modal for checklist steps
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [tempStepNote, setTempStepNote] = useState('');

  // Image Upload Target for checklist step row
  const [uploadTarget, setUploadTarget] = useState(null); // { stepIndex, imgIndex }
  const [isUploading, setIsUploading] = useState(false);

  // History List
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [expandedInfoCard, setExpandedInfoCard] = useState(true);

  // 1. Initial configuration & fetches
  useEffect(() => {
    // Determine default stage from user account stage_name or department/role
    if (user?.stage_name) {
      setActiveStage(user.stage_name);
    } else {
      const userDept = (user?.department_name || user?.role_name || '').toLowerCase();
      if (userDept.includes('định hình') || userDept.includes('shaping')) {
        setActiveStage('Định hình');
      } else if (userDept.includes('lắp ráp') || userDept.includes('assembly')) {
        setActiveStage('Lắp ráp');
      } else if (userDept.includes('sơn') || userDept.includes('paint')) {
        setActiveStage('Sơn');
      } else if (userDept.includes('đóng gói') || userDept.includes('pack')) {
        setActiveStage('Đóng gói');
      } else if (userDept.includes('sau đóng gói')) {
        setActiveStage('Sau đóng gói');
      } else {
        setActiveStage('Định hình'); // Default choice
      }
    }

    // Load recent POs from localStorage
    const saved = JSON.parse(localStorage.getItem('recent_po_searches') || '[]');
    setRecentPOs(saved);

    // Fetch Machines list from /api/v1/machines
    const fetchMachines = async () => {
      try {
        const res = await apiClient.get('machines/');
        if (Array.isArray(res.data)) {
          setMachines(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách máy móc:', err);
      }
    };

    // Fetch Equipments list to map user manual steps
    const fetchEquipments = async () => {
      try {
        const res = await apiClient.get('equipments/');
        if (Array.isArray(res.data)) {
          setEquipments(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách thiết bị:', err);
      }
    };

    // Fetch Defect Types
    const fetchDefectTypes = async () => {
      try {
        const url = user?.id ? `/inspections/defect-types?user_id=${user.id}` : '/inspections/defect-types';
        const res = await apiClient.get(url);
        if (Array.isArray(res.data)) {
          setDefectTypes(res.data);
        }
      } catch (err) {
        console.error('Lỗi tải danh mục lỗi:', err);
      }
    };

    // Fetch active POs list (4 months window)
    const fetchActivePOs = async () => {
      try {
        const res = await apiClient.get('purchase-order-items/active-pos');
        if (Array.isArray(res.data)) {
          setActivePOs(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách PO hoạt động:', err);
      }
    };

    // Fetch active ISO processes list
    const fetchIsoProcesses = async () => {
      try {
        const res = await apiClient.get('iso-documents/processes');
        if (Array.isArray(res.data)) {
          setIsoProcesses(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách quy trình ISO:', err);
      }
    };

    fetchMachines();
    fetchEquipments();
    fetchDefectTypes();
    fetchActivePOs();
    fetchIsoProcesses();
    fetchTodayHistory();
  }, [user]);

  // Hook to match process based on machine selection or current page route
  useEffect(() => {
    if (isoProcesses.length === 0) {
      setMatchedProcess(null);
      return;
    }
    let match = null;
    if (selectedMachineCode) {
      match = isoProcesses.find(p => {
        const displayList = p.display_at ? p.display_at.split(',').map(s => s.trim().toUpperCase()) : [];
        return displayList.includes(selectedMachineCode.toUpperCase());
      });
    }
    if (!match) {
      match = isoProcesses.find(p => {
        const displayList = p.display_at ? p.display_at.split(',').map(s => s.trim().toLowerCase()) : [];
        return displayList.includes('/inspection-first-article');
      });
    }
    setMatchedProcess(match || null);
  }, [isoProcesses, selectedMachineCode]);

  // Hook to fetch matching process details (diagram and sections content)
  useEffect(() => {
    if (!matchedProcess) {
      setSelectedProcessDetails(null);
      return;
    }
    const fetchProcessDetails = async () => {
      try {
        const res = await apiClient.get(`iso-documents/processes/${matchedProcess.id}/details`);
        if (res.data) {
          setSelectedProcessDetails(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết quy trình ISO:', err);
      }
    };
    fetchProcessDetails();
  }, [matchedProcess]);

  // Hook to dynamically synchronize checklistResults (samples) with sampledQty (min 1, max 5) and matching process steps
  useEffect(() => {
    // Determine the steps source
    let stepsSource = [];
    if (selectedProcessDetails) {
      let allSteps = [];
      if (selectedProcessDetails.sections && selectedProcessDetails.sections['__metadata_work_instructions__']) {
        try {
          const parsed = JSON.parse(selectedProcessDetails.sections['__metadata_work_instructions__']);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstInstruction = parsed[0];
            allSteps = (firstInstruction.steps || []).map(s => ({
              ...s,
              work_instruction_title: firstInstruction.title
            }));
          }
        } catch (err) {
          allSteps = [];
        }
      }
      stepsSource = allSteps.length > 0 ? allSteps : (selectedProcessDetails.steps || []);
    } else {
      // Fallback from machine selection
      const eq = equipments.find(e => e.code === selectedMachineCode || e.name === selectedMachineName);
      let steps = [];
      if (eq && eq.user_manual_steps) {
        try {
          steps = JSON.parse(eq.user_manual_steps || '[]');
        } catch (err) {
          steps = [];
        }
      }
      if (steps.length === 0 && selectedMachineName) {
        const mac = machines.find(m => m.code === selectedMachineCode);
        if (mac && mac.notes) {
          const noteSteps = mac.notes.split(/[;\n,]+/).map(s => s.trim()).filter(Boolean);
          steps = noteSteps.map((s, idx) => ({ step: idx + 1, title: s }));
        }
      }
      if (steps.length === 0) {
        steps = [{ step: 1, title: 'Kiểm tra hoạt động chung của máy' }];
      }
      stepsSource = steps;
    }

    const numSamples = Math.min(5, Math.max(1, sampledQty));

    setChecklistResults(prev => {
      const newResults = [];
      for (let i = 0; i < numSamples; i++) {
        const existingSample = prev[i] || null;
        
        const mappedSteps = stepsSource.map((s, idx) => {
          const stepNum = s.step_number || s.step || idx + 1;
          const stepTitle = s.name || s.title || `Bước ${stepNum}`;
          
          const existingStep = existingSample && existingSample.steps
            ? existingSample.steps.find(st => st.step === stepNum)
            : null;
            
          return {
            step: stepNum,
            title: stepTitle,
            status: existingStep ? existingStep.status : 'pass',
            note: existingStep ? existingStep.note : '',
            images: existingStep ? existingStep.images : [],
            instructions: s.instructions || ''
          };
        });

        const hasStepFailure = mappedSteps.some(st => st.status === 'fail');
        const overallStatus = existingSample ? (hasStepFailure ? 'fail' : existingSample.status) : (hasStepFailure ? 'fail' : 'pass');

        newResults.push({
          sampleNum: i + 1,
          title: `Mẫu số ${i + 1}`,
          status: overallStatus,
          note: existingSample ? existingSample.note : '',
          images: existingSample ? existingSample.images : [],
          steps: mappedSteps
        });
      }
      return newResults;
    });
  }, [sampledQty, selectedProcessDetails, selectedMachineCode, selectedMachineName, equipments, machines]);

  // Fetch today's inspection logs
  const fetchTodayHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const res = await apiClient.get(`inspections/stage?month=${month}&year=${year}&limit=100`);
      if (Array.isArray(res.data)) {
        // Filter for "mau-dau-tien" and today's date
        const todayStr = now.toISOString().slice(0, 10);
        const filtered = res.data.filter(item =>
          item.inspection_type === 'mau-dau-tien' &&
          item.created_at && item.created_at.slice(0, 10) === todayStr
        );
        setHistoryList(filtered);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử kiểm tra:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // 2. Search PO Handler
  const handleSearchPO = async (codeOverride) => {
    const searchCode = (codeOverride || poSearchTerm).trim().toUpperCase();
    if (!searchCode) return;
    setIsPoSearching(true);
    setPoNotFound(false);
    try {
      // 1. Fetch Order Header details
      const resHeader = await apiClient.get(`orders/code/${searchCode}`);
      const order = resHeader.data;

      if (!order) {
        setPoNotFound(true);
        setPoItems([]);
        setPoHeader(null);
        setSelectedItemCode('');
        return;
      }

      const aggregated = {};
      const addPart = (code, name, qty, opts = {}) => {
        const key = (name || code || '').trim();
        if (!key) return;

        // Loại bỏ mã sản phẩm cha (như 2-30-BRO, 2-42-BRO)
        const isProductSku = /^[A-Z0-9\-_]+$/.test(key) && key.includes('-');
        if (isProductSku) return;

        // Bỏ các loại ván ghép, ván ép, ván MDF, ván HMR (nguyên vật liệu thô)
        const nameLower = key.toLowerCase();
        if (opts.is_raw_material || 
            opts.exclude_production || 
            nameLower.startsWith('ván') || 
            nameLower.includes('veneer') ||
            nameLower.includes('mdf') ||
            nameLower.includes('hmr')) {
          return;
        }

        if (!aggregated[key]) {
          aggregated[key] = {
            item_code: key,
            item_name: key,
            quantity: qty || 0
          };
        } else {
          aggregated[key].quantity = Math.max(aggregated[key].quantity, qty || 0);
        }
      };

      // A. Load from PO Items (Excel PurchaseOrderItems)
      try {
        const resItems = await apiClient.get(`purchase-order-items/by-po/${searchCode}`);
        if (resItems.data && Array.isArray(resItems.data)) {
          resItems.data.forEach(it => {
            addPart(it.item_code, it.item_name, it.quantity || 0, {
              is_raw_material: it.is_raw_material,
              exclude_production: it.exclude_production
            });
          });
        }
      } catch (err) {
        console.log('No purchase order items:', err);
      }

      // B. Load from Plan Handover details
      if (order.plan_id) {
        try {
          const resPlan = await apiClient.get(`plans/${order.plan_id}?limit=0`);
          const planDetail = resPlan.data || {};
          if (planDetail.bom_details && Array.isArray(planDetail.bom_details.handover)) {
            const filteredHandover = planDetail.bom_details.handover.filter(item => {
              const names = Array.isArray(item.order_names) ? item.order_names : [];
              return names.map(n => n.trim().toUpperCase()).includes(searchCode);
            });
            filteredHandover.forEach(it => {
              addPart(it.name, it.name, it.quantity || 0, {
                is_raw_material: it.is_raw_material,
                exclude_production: it.exclude_production
              });
            });
          }
        } catch (planErr) {
          console.error('Lỗi khi tải chi tiết kế hoạch sản xuất:', planErr);
        }
      }

      // C. Load from PO products BOM elements (including sub-elements)
      try {
        const resProducts = await apiClient.get(`orders/by-code/${searchCode}/products`);
        const productsData = resProducts.data || {};
        if (Array.isArray(productsData.items)) {
          productsData.items.forEach(it => {
            addPart(it.sku, it.name, 0);
          });
        }
        if (Array.isArray(productsData.products)) {
          productsData.products.forEach(p => {
            if (Array.isArray(p.elements)) {
              p.elements.forEach(el => {
                addPart(el.sku, el.name, el.quantity || 0, {
                  is_raw_material: el.is_raw_material,
                  exclude_production: el.exclude_production
                });
              });
            }
          });
        }
      } catch (prodErr) {
        console.error('Lỗi khi tải danh sách sản phẩm BOM:', prodErr);
      }

      const items = Object.values(aggregated).map((it, idx) => ({
        id: `po_item_${idx}_${Date.now()}`,
        ...it
      }));

      if (items.length === 0) {
        setPoNotFound(true);
        setPoItems([]);
        setPoHeader(null);
        setSelectedItemCode('');
        return;
      }

      // Populate PO details
      setPoHeader({
        po_code: searchCode,
        supplier_name: order.customer || 'N/A',
        order_date: order.create_date || '',
        delivery_date: order.estimated_date || ''
      });
      setPoItems(items);
      if (items.length > 0) {
        setSelectedItemCode(items[0].item_code || '');
        if (items[0].quantity) {
          setProducedQty(items[0].quantity);
        }
      }

      // Add to recent search histories
      let list = JSON.parse(localStorage.getItem('recent_po_searches') || '[]');
      list = [searchCode, ...list.filter(x => x !== searchCode)].slice(0, 5);
      localStorage.setItem('recent_po_searches', JSON.stringify(list));
      setRecentPOs(list);

    } catch (err) {
      console.error('Lỗi khi tìm PO:', err);
      setPoNotFound(true);
      setPoItems([]);
      setPoHeader(null);
    } finally {
      setIsPoSearching(false);
    }
  };

  // 3. Equipment / Machine Selection Handler
  const handleSelectMachine = (code) => {
    setSelectedMachineCode(code);
    const mac = machines.find(m => m.code === code);
    if (mac) {
      setSelectedMachineName(mac.name || '');
    } else {
      setSelectedMachineName('');
    }
  };

  // 4. Image Upload & Camera handlers
  const triggerCamera = (sampleIndex, stepIndex, imgIndex) => {
    setUploadTarget({ sampleIndex, stepIndex, imgIndex, isDetail: false });
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadTarget) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('screen-bugs/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = res.data.url;

      if (uploadTarget.isDetail) {
        setDetailSteps(prev => {
          const next = [...prev];
          next[uploadTarget.stepIndex] = {
            ...next[uploadTarget.stepIndex],
            images: [imageUrl]
          };
          return next;
        });
      } else {
        setChecklistResults(prev => {
          const next = [...prev];
          const sample = { ...next[uploadTarget.sampleIndex] };
          const steps = [...sample.steps];
          const step = { ...steps[uploadTarget.stepIndex] };
          step.images = [imageUrl];
          steps[uploadTarget.stepIndex] = step;
          sample.steps = steps;
          
          const allStepImages = [];
          steps.forEach(s => {
            if (s.images?.[0]) {
              allStepImages.push(s.images[0]);
            }
          });
          sample.images = allStepImages;
          
          next[uploadTarget.sampleIndex] = sample;
          return next;
        });
      }

    } catch (err) {
      console.error('Lỗi khi tải hình ảnh lên:', err);
      setMessageConfig({ type: 'error', title: 'Lỗi upload', message: 'Không thể upload ảnh kiểm tra. Vui lòng thử lại!' });
      setIsMessageOpen(true);
    } finally {
      setIsUploading(false);
      setUploadTarget(null);
    }
  };

  const removePhoto = (sampleIndex, stepIndex, imgIndex) => {
    setChecklistResults(prev => {
      const next = [...prev];
      const sample = { ...next[sampleIndex] };
      const steps = [...sample.steps];
      const step = { ...steps[stepIndex] };
      step.images = [];
      steps[stepIndex] = step;
      sample.steps = steps;
      
      const allStepImages = [];
      steps.forEach(s => {
        if (s.images?.[0]) {
          allStepImages.push(s.images[0]);
        }
      });
      sample.images = allStepImages;
      
      next[sampleIndex] = sample;
      return next;
    });
  };

  // 5. Checklist Step Notes & Guideline Popups
  const openDetailInspectionModal = (idx) => {
    const sample = checklistResults[idx];
    setDetailIdx(idx);
    setDetailSteps(sample.steps.map(s => ({
      ...s,
      images: [...s.images]
    })));
    setIsDetailInspectionOpen(true);
  };

  const saveDetailInspection = () => {
    setChecklistResults(prev => {
      const next = [...prev];
      const sample = { ...next[detailIdx] };
      sample.steps = detailSteps;

      // Automatically determine overall sample status: fail if any step is fail
      const hasStepFailure = detailSteps.some(s => s.status === 'fail');
      sample.status = hasStepFailure ? 'fail' : 'pass';

      // Automatically compose sample note: join notes of all steps
      sample.note = detailSteps.map(s => s.note?.trim()).filter(Boolean).join('; ');

      // Extract all step images into sample.images for outer display
      const allStepImages = [];
      detailSteps.forEach(s => {
        if (s.images?.[0]) {
          allStepImages.push(s.images[0]);
        }
      });
      sample.images = allStepImages;

      next[detailIdx] = sample;
      return next;
    });
    setIsDetailInspectionOpen(false);
    setDetailIdx(null);
  };

  // 6. Defect tracking handlers
  const handleAddDefect = () => {
    setActiveDefects([...activeDefects, { defectId: '', quantity: 1 }]);
  };

  const handleRemoveDefect = (idx) => {
    setActiveDefects(activeDefects.filter((_, i) => i !== idx));
  };

  const handleUpdateDefect = (idx, field, value) => {
    const next = [...activeDefects];
    next[idx][field] = value;
    setActiveDefects(next);
  };

  // 7. Form submission
  const handleSaveInspection = async () => {
    if (!poHeader) {
      setMessageConfig({ type: 'error', title: 'Lỗi', message: 'Vui lòng tìm kiếm và chọn mã PO hợp lệ.' });
      setIsMessageOpen(true);
      return;
    }
    if (!selectedMachineCode) {
      setMessageConfig({ type: 'error', title: 'Lỗi', message: 'Vui lòng chọn Mã máy móc thực hiện.' });
      setIsMessageOpen(true);
      return;
    }
    if (!selectedItemCode) {
      setMessageConfig({ type: 'error', title: 'Lỗi', message: 'Vui lòng chọn linh kiện/sản phẩm chi tiết.' });
      setIsMessageOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      // Gather all photos
      const allPhotos = [];
      checklistResults.forEach(sampleRow => {
        if (sampleRow.steps) {
          sampleRow.steps.forEach(stepRow => {
            if (stepRow.images) {
              stepRow.images.forEach(img => {
                if (img) allPhotos.push(img);
              });
            }
          });
        }
      });

      // Filter defects with valid selected IDs
      const validDefects = activeDefects
        .filter(d => d.defectId)
        .map(d => {
          const found = defectTypes.find(t => t.id.toString() === d.defectId.toString());
          return {
            defect_id: d.defectId,
            defect_name: found ? found.name : `Lỗi #${d.defectId}`,
            quantity: d.quantity
          };
        });

      // Determine conclusion: fails if SL loại > 0 or any step/sample is fail
      const hasStepFailure = checklistResults.some(r => r.status === 'fail');
      const isConclusionPass = (rejectedQty === 0) && !hasStepFailure;

      const payload = {
        inspection_type: 'mau-dau-tien',
        batch_no: poHeader.po_code,
        product_sku: selectedItemCode,
        inspector_name: user?.full_name || 'Người kiểm tra Mobile',
        conclusion: isConclusionPass ? 'pass' : 'fail',
        notes: `Phiếu kiểm tra mẫu đầu tiên công đoạn ${activeStage}`,
        data_json: JSON.stringify({
          stage: activeStage,
          machine_code: selectedMachineCode,
          machine_name: selectedMachineName,
          quantity_produced: producedQty,
          quantity_sampled: sampledQty,
          quantity_rejected: rejectedQty,
          checklist_results: checklistResults.map(r => ({
            sampleNum: r.sampleNum,
            title: r.title,
            status: r.status,
            note: r.note,
            images: r.images,
            steps: r.steps.map(s => ({
              step: s.step,
              title: s.title,
              status: s.status,
              note: s.note,
              images: s.images
            }))
          })),
          defects: validDefects
        }),
        images_json: JSON.stringify({ 'Ảnh kiểm tra mẫu': allPhotos })
      };

      await apiClient.post('inspections/stage', payload);

      setMessageConfig({
        type: 'success',
        title: 'Thành công',
        message: 'Đã lưu kết quả kiểm tra mẫu đầu tiên thành công!'
      });
      setIsMessageOpen(true);

      // Reset form
      handleResetForm();
      fetchTodayHistory();

    } catch (err) {
      console.error('Lỗi khi lưu phiếu kiểm tra mẫu:', err);
      const serverDetail = err.response?.data?.detail;
      const msg = typeof serverDetail === 'string' ? serverDetail : (err.message || 'Lỗi lưu dữ liệu lên server.');
      setMessageConfig({ type: 'error', title: 'Lỗi lưu trữ', message: msg });
      setIsMessageOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForm = () => {
    setPoHeader(null);
    setPoItems([]);
    setSelectedItemCode('');
    setSelectedMachineCode('');
    setSelectedMachineName('');
    setChecklistResults([]);
    setProducedQty(10);
    setSampledQty(5);
    setRejectedQty(0);
    setActiveDefects([{ defectId: '', quantity: 1 }]);
    setPoSearchTerm('');
  };

  const formatDisplayTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    try {
      const d = new Date(dateTimeStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <Layout>
      <div style={{ backgroundColor: '#FAF6F0', minHeight: '100vh', paddingBottom: '100px', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="Kiểm tra mẫu đầu tiên" />

        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 1. Khung Tìm Kiếm PO & Trình chọn Công đoạn */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1.5px solid #7B5233', display: 'flex', flexDirection: 'column', gap: '12px' }}>


            {/* Ô tìm kiếm PO */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '4px' }}>Mã PO</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={poSearchTerm}
                    onChange={(e) => {
                      setPoSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Chọn hoặc nhập tìm kiếm mã PO..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #7B5233', fontSize: '13px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                  />
                  {poSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setPoSearchTerm('');
                        setPoHeader(null);
                        setPoItems([]);
                        setSelectedItemCode('');
                      }}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleSearchPO()}
                  disabled={isPoSearching}
                  style={{ width: '42px', height: '38px', borderRadius: '8px', border: 'none', backgroundColor: '#7B5233', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Search size={18} color="#fff" />
                </button>
              </div>

              {/* Suggestions Dropdown list */}
              {isDropdownOpen && (
                <>
                  <div
                    onClick={() => setIsDropdownOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    border: '1px solid #7B5233',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {filteredPOs.length === 0 ? (
                      <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                        Không tìm thấy PO nào
                      </div>
                    ) : (
                      filteredPOs.map((po) => (
                        <div
                          key={po.po_code}
                          onClick={() => {
                            setPoSearchTerm(po.po_code);
                            handleSearchPO(po.po_code);
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            fontSize: '12px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            color: '#4B301E'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FAF6F0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span style={{ fontWeight: 'bold', color: '#7B5233' }}>{po.po_code}</span> - {po.supplier_name} ({po.po_date})
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
              {poNotFound && <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 'bold', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={13} /> Không tìm thấy mã PO nào trùng khớp</div>}
            </div>

            {/* Pills 5 lịch sử PO tìm kiếm gần nhất */}
            {recentPOs.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {recentPOs.map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      setPoSearchTerm(code);
                      handleSearchPO(code);
                    }}
                    style={{ padding: '4px 10px', borderRadius: '12px', border: '1px solid #7B5233', backgroundColor: '#FAF6F0', color: '#7B5233', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Thẻ Thông tin kiểm tra */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #7B5233', overflow: 'visible' }}>
            <div
              onClick={() => setExpandedInfoCard(!expandedInfoCard)}
              style={{ padding: '12px 16px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #7B5233', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#4B301E' }}>Thông tin kiểm tra</span>
                {matchedProcess ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProcessModalOpen(true);
                    }}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#4B301E',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Xem QTKT
                  </button>
                ) : (
                  selectedMachineCode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const mac = machines.find(x => x.code === selectedMachineCode);
                        const eq = equipments.find(x => x.code === selectedMachineCode || (mac && x.name === mac.name));
                        if (eq) {
                          setMessageConfig({
                            type: 'info',
                            title: `QTKT - ${eq.name}`,
                            message: eq.user_manual_steps ? `Các hạng mục kiểm tra kỹ thuật chuẩn: \n${JSON.parse(eq.user_manual_steps).map((s, i) => `${i + 1}. ${s.title}`).join('\n')}` : 'Chưa cấu hình tài liệu quy trình kiểm tra chất lượng của máy này ở Admin.'
                          });
                          setIsMessageOpen(true);
                        } else if (mac && mac.notes) {
                          setMessageConfig({
                            type: 'info',
                            title: `Ghi chú thiết bị - ${mac.name}`,
                            message: `Các tiêu chí ghi chú của thiết bị:\n${mac.notes}`
                          });
                          setIsMessageOpen(true);
                        } else {
                          setMessageConfig({
                            type: 'info',
                            title: 'Thông tin quy trình',
                            message: 'Chưa có thông tin tài liệu quy trình kiểm tra chất lượng hoặc ghi chú của máy này.'
                          });
                          setIsMessageOpen(true);
                        }
                      }}
                      style={{ padding: '2px 8px', border: 'none', borderRadius: '4px', backgroundColor: '#7B5233', color: '#fff', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      Xem QTKT
                    </button>
                ) )}
              </div>
              {expandedInfoCard ? <ChevronUp size={18} color="#4B301E" /> : <ChevronDown size={18} color="#4B301E" />}
            </div>

            {expandedInfoCard && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Chọn máy móc thiết bị */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '4px' }}>Mã máy</label>
                    <select
                      value={selectedMachineCode}
                      onChange={(e) => handleSelectMachine(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #7B5233', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="">-- Chọn mã --</option>
                      {filteredMachines.map(m => (
                        <option key={m.code} value={m.code}>{m.code}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '4px' }}>Tên máy móc</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedMachineName}
                      placeholder="Chọn mã máy để hiển thị..."
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', outline: 'none', color: '#64748b' }}
                    />
                  </div>
                </div>

                {/* Chọn chi tiết sản phẩm linh kiện từ PO */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '4px' }}>Chi tiết (Mặt hàng)</label>
                  <select
                    value={selectedItemCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedItemCode(val);
                      const found = poItems.find(x => x.item_code === val);
                      if (found && found.quantity) {
                        setProducedQty(found.quantity);
                      }
                    }}
                    disabled={!poHeader}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #7B5233', fontSize: '13px', outline: 'none', backgroundColor: !poHeader ? '#f1f5f9' : '#fff' }}
                  >
                    {!poHeader ? (
                      <option value="">-- Vui lòng tìm kiếm PO trước --</option>
                    ) : (
                      <>
                        <option value="">-- Chọn mặt hàng chi tiết --</option>
                        {poItems.map(item => (
                          <option key={item.id} value={item.item_code}>
                            {item.item_name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* SL Sản xuất - SL Lấy mẫu - SL Loại */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* SL Sản xuất */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '4px' }}>SL sản xuất</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <button onClick={() => setProducedQty(Math.max(1, producedQty - 1))} style={{ width: '28px', height: '32px', borderRadius: '6px 0 0 6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>-</button>
                      <input
                        type="number"
                        value={producedQty}
                        onChange={(e) => setProducedQty(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ flex: 1, height: '32px', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', borderLeft: 'none', borderRight: 'none', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', width: '30px' }}
                      />
                      <button onClick={() => setProducedQty(producedQty + 1)} style={{ width: '28px', height: '32px', borderRadius: '0 6px 6px 0', border: 'none', backgroundColor: '#7B5233', color: '#fff', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>

                  {/* SL Lấy mẫu */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '4px' }}>SL lấy mẫu</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <button onClick={() => setSampledQty(Math.max(1, sampledQty - 1))} style={{ width: '28px', height: '32px', borderRadius: '6px 0 0 6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>-</button>
                      <input
                        type="number"
                        value={sampledQty}
                        onChange={(e) => setSampledQty(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ flex: 1, height: '32px', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', borderLeft: 'none', borderRight: 'none', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', width: '30px' }}
                      />
                      <button onClick={() => setSampledQty(sampledQty + 1)} style={{ width: '28px', height: '32px', borderRadius: '0 6px 6px 0', border: 'none', backgroundColor: '#7B5233', color: '#fff', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>

                  {/* SL Loại */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '4px' }}>SL loại</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <button onClick={() => setRejectedQty(Math.max(0, rejectedQty - 1))} style={{ width: '28px', height: '32px', borderRadius: '6px 0 0 6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>-</button>
                      <input
                        type="number"
                        value={rejectedQty}
                        onChange={(e) => setRejectedQty(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ flex: 1, height: '32px', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', borderLeft: 'none', borderRight: 'none', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', width: '30px' }}
                      />
                      <button onClick={() => setRejectedQty(rejectedQty + 1)} style={{ width: '28px', height: '32px', borderRadius: '0 6px 6px 0', border: 'none', backgroundColor: '#7B5233', color: '#fff', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                </div>

                {/* Bảng checklist Kết quả kiểm tra */}
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#4B301E', display: 'block', marginBottom: '6px' }}>Kết quả kiểm tra chi tiết</label>

                  {checklistResults.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '12px' }}>
                      Vui lòng chọn Mã máy để tải các bước hướng dẫn kỹ thuật kiểm tra.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #e8e1d5', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FAF6F0', color: '#7B5233', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #e8e1d5' }}>
                            <th style={{ padding: '8px', width: '40px', textAlign: 'center' }}>STT</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Tiêu chí đo/kiểm</th>
                            <th style={{ padding: '8px', width: '60px', textAlign: 'center' }}>Đạt/Lỗi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checklistResults.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < checklistResults.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <td style={{ padding: '8px', fontSize: '12px', fontWeight: 'bold', color: '#4B301E', textAlign: 'center' }}>{row.sampleNum}</td>
                              <td style={{ padding: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#4B301E', display: 'block', fontWeight: '600' }}>{row.title}</span>
                                {row.note && <span style={{ fontSize: '10px', color: '#b45309', display: 'block', marginTop: '2px', fontStyle: 'italic' }}>* {row.note}</span>}

                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                  {row.steps.map((step, stepIdx) => {
                                    const imgPath = step.images?.[0] || null;
                                    const fullUrl = imgPath ? `${apiClient.defaults.baseURL.split('/api/v1')[0]}${imgPath}` : null;
                                    return (
                                      <div
                                        key={stepIdx}
                                        onClick={() => {
                                          if (imgPath) {
                                            setPreviewUrl(fullUrl);
                                          } else {
                                            triggerCamera(idx, stepIdx, 0); // sampleIndex, stepIndex, imgIndex
                                          }
                                        }}
                                        style={{ width: '38px', height: '38px', borderRadius: '6px', border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                                        title={`Bước ${step.step}: ${step.title}`}
                                      >
                                        {fullUrl ? (
                                          <>
                                            <img src={fullUrl} alt={`Step ${step.step}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removePhoto(idx, stepIdx, 0); // sampleIndex, stepIndex, imgIndex
                                              }}
                                              style={{ position: 'absolute', top: '1px', right: '1px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                              <X size={8} />
                                            </button>
                                          </>
                                        ) : (
                                          <Camera size={14} color="#94a3b8" />
                                        )}
                                      </div>
                                    );
                                  })}

                                  <button
                                    onClick={() => openDetailInspectionModal(idx)}
                                    style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c6d5e' }}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <button
                                  onClick={() => {
                                    setChecklistResults(prev => {
                                      const next = [...prev];
                                      next[idx].status = next[idx].status === 'pass' ? 'fail' : 'pass';
                                      return next;
                                    });
                                  }}
                                  style={{
                                    padding: '4px 8px', borderRadius: '6px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                                    backgroundColor: row.status === 'pass' ? '#e8f5e9' : '#ffebee',
                                    color: row.status === 'pass' ? '#2e7d32' : '#c62828'
                                  }}
                                >
                                  {row.status === 'pass' ? 'Đạt' : 'Lỗi'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Thẻ Theo dõi xu hướng lỗi */}
                <div style={{ backgroundColor: '#FAF6F0', borderRadius: '12px', padding: '12px', border: '1px solid #7B5233', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B301E', display: 'block' }}>Theo dõi xu hướng lỗi</label>

                  {activeDefects.map((def, idx) => {
                    // Lọc ra những lỗi chưa được chọn ở các dòng khác
                    const usedIds = activeDefects
                      .filter((_, i) => i !== idx)
                      .map(d => String(d.defectId))
                      .filter(Boolean);

                    // Dòng đầu tiên (idx === 0) chỉ hiện các lỗi QA track (needs_tracking === true)
                    // Các dòng sau (idx > 0) hiện các lỗi còn lại
                    const sourceList = idx === 0 ? qaTrackedDefects : remainingDefects;
                    const availableDefects = sourceList.filter(t => !usedIds.includes(String(t.id)));

                    return (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={def.defectId}
                          onChange={(e) => handleUpdateDefect(idx, 'defectId', e.target.value)}
                          style={{ flex: 2, padding: '8px', borderRadius: '6px', border: `1px solid ${def.defectId ? '#7B5233' : '#cbd5e1'}`, fontSize: '12px', outline: 'none', backgroundColor: '#fff' }}
                        >
                          <option value="">-- {idx === 0 ? 'Chọn lỗi QA track' : 'Chọn lỗi khác'} --</option>
                          {/* Hiện lỗi đang được chọn + những lỗi chưa chọn */}
                          {def.defectId && !availableDefects.find(t => String(t.id) === String(def.defectId)) && (() => {
                            const current = defectTypes.find(t => String(t.id) === String(def.defectId));
                            return current ? <option key={current.id} value={current.id}>{current.name} ({current.code || 'N/A'})</option> : null;
                          })()}
                          {availableDefects.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.code || 'N/A'})</option>
                          ))}
                        </select>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button onClick={() => handleUpdateDefect(idx, 'quantity', Math.max(1, def.quantity - 1))} style={{ width: '22px', height: '26px', borderRadius: '4px 0 0 4px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer', fontSize: '12px' }}>-</button>
                          <div style={{ flex: 1, height: '26px', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fff' }}>{def.quantity}</div>
                          <button onClick={() => handleUpdateDefect(idx, 'quantity', def.quantity + 1)} style={{ width: '22px', height: '26px', borderRadius: '0 4px 4px 0', border: 'none', backgroundColor: '#7B5233', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>+</button>
                        </div>

                        {activeDefects.length > 1 && (
                          <button
                            onClick={() => handleRemoveDefect(idx)}
                            style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', padding: '2px', cursor: 'pointer' }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Chỉ hiện nút "Ghi nhận lỗi khác" nếu còn lỗi còn lại chưa được chọn */}
                  {remainingDefects.length > 0 && activeDefects.slice(1).filter(d => d.defectId).length < remainingDefects.length && (
                    <button
                      onClick={handleAddDefect}
                      style={{ border: 'none', backgroundColor: 'transparent', color: '#7B5233', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', width: 'fit-content', marginTop: '4px' }}
                    >
                      <Plus size={12} /> Ghi nhận lỗi khác
                    </button>
                  )}
                </div>

                {/* Nút Xác nhận / Hủy */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <button
                    onClick={handleSaveInspection}
                    disabled={isSaving}
                    style={{ flex: 1, backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    <Check size={16} /> Xác nhận
                  </button>
                  <button
                    onClick={handleResetForm}
                    style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    <RotateCcw size={16} /> Hủy
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* 3. Bảng Lịch sử kiểm tra trong ngày */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #7B5233', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #7B5233', fontWeight: '900', color: '#4B301E', fontSize: '14px' }}>
              Lịch sử kiểm tra trong ngày
            </div>

            {isHistoryLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Đang tải lịch sử...</div>
            ) : historyList.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Chưa có phiếu kiểm tra mẫu nào được lưu hôm nay.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fcfcfc', borderBottom: '1px solid #e8e1d5', color: '#7c6d5e', fontSize: '11px', fontWeight: 'bold' }}>
                      <th style={{ padding: '10px 16px' }}>Mặt hàng</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>PO</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>TG</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', color: '#4B301E' }}>{item.product_sku}</td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', color: '#7c6d5e', textAlign: 'center' }}>{item.batch_no}</td>
                        <td style={{ padding: '10px 16px', fontSize: '11px', color: '#7c6d5e', textAlign: 'center' }}>{formatDisplayTime(item.created_at)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 'bold', fontSize: '11px',
                            color: item.conclusion === 'pass' ? '#2e7d32' : '#c62828',
                            backgroundColor: item.conclusion === 'pass' ? '#e8f5e9' : '#ffebee',
                            padding: '2px 6px', borderRadius: '4px'
                          }}>
                            {item.conclusion === 'pass' ? 'ĐẠT' : 'LỖI'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Note Editor Modal */}
        {editingStepIndex !== null && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setEditingStepIndex(null)} />
            <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '340px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4B301E' }}>Ghi chú tiêu chí kiểm tra</span>
                <button onClick={() => setEditingStepIndex(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}><X size={16} color="#94a3b8" /></button>
              </div>
              <textarea
                rows="4"
                value={tempStepNote}
                onChange={(e) => setTempStepNote(e.target.value)}
                placeholder="Nhập chi tiết thông số đo đạc, độ cong vênh hoặc lỗi quan sát được..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #7B5233', fontSize: '13px', outline: 'none', resize: 'none' }}
              />
              <button
                onClick={saveStepNote}
                style={{ width: '100%', padding: '12px', border: 'none', backgroundColor: '#7B5233', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Lưu ghi chú
              </button>
            </div>
          </div>
        )}

        {/* Hướng dẫn kiểm tra Modal */}
        {isDetailInspectionOpen && detailIdx !== null && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '360px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1.5px solid #7B5233',
              boxShadow: '0 8px 32px rgba(45, 26, 18, 0.15)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#FAF6F0',
                borderBottom: '1px solid #EADCC9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#4B301E' }}>Hướng dẫn kiểm tra</span>
                <button
                  onClick={() => setIsDetailInspectionOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#7B5233', fontWeight: 'bold', textTransform: 'uppercase' }}>Mẫu kiểm tra</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4B301E', display: 'block', marginTop: '2px' }}>
                    Chi tiết Mẫu số {detailIdx + 1}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '50vh', paddingRight: '4px' }}>
                  {detailSteps.map((stepRow, stepIdx) => {
                    const imgPath = stepRow.images?.[0] || null;
                    const fullUrl = imgPath ? `${apiClient.defaults.baseURL.split('/api/v1')[0]}${imgPath}` : null;
                    const itemLabel = `${stepRow.title}`;

                    return (
                      <div key={stepIdx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px dashed #EADCC9', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B301E' }}>
                              Bước {stepRow.step}: {itemLabel}
                            </span>
                            {stepRow.instructions && (
                              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px', fontStyle: 'italic' }}>
                                * HD: {stepRow.instructions}
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => {
                              setDetailSteps(prev => {
                                const next = [...prev];
                                next[stepIdx] = {
                                  ...next[stepIdx],
                                  status: next[stepIdx].status === 'pass' ? 'fail' : 'pass'
                                };
                                return next;
                              });
                            }}
                            style={{
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              cursor: 'pointer',
                              backgroundColor: stepRow.status === 'pass' ? '#e6f4ea' : '#fce8e6',
                              color: stepRow.status === 'pass' ? '#137333' : '#c5221f',
                              marginLeft: '8px'
                            }}
                          >
                            {stepRow.status === 'pass' ? 'Đạt' : 'Lỗi'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                          <div
                            onClick={() => {
                              if (imgPath) {
                                setPreviewUrl(fullUrl);
                              } else {
                                setUploadTarget({ isDetail: true, stepIndex: stepIdx, imgIndex: 0 });
                                fileInputRef.current.click();
                              }
                            }}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '8px',
                              border: '1px dashed #cbd5e1',
                              backgroundColor: '#f8fafc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            {fullUrl ? (
                              <>
                                <img src={fullUrl} alt="step" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailSteps(prev => {
                                      const next = [...prev];
                                      next[stepIdx] = {
                                        ...next[stepIdx],
                                        images: []
                                      };
                                      return next;
                                    });
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <X size={8} />
                                </button>
                              </>
                            ) : (
                              <Camera size={16} color="#94a3b8" />
                            )}
                          </div>

                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              value={stepRow.note || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDetailSteps(prev => {
                                  const next = [...prev];
                                  next[stepIdx] = {
                                    ...next[stepIdx],
                                    note: val
                                  };
                                  return next;
                                });
                              }}
                              placeholder="Nhập ghi chú cho bước này..."
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                fontSize: '12px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid #EADCC9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B301E' }}>Kết quả tổng thể mẫu</span>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '13px',
                    color: detailSteps.some(s => s.status === 'fail') ? '#c5221f' : '#137333',
                    backgroundColor: detailSteps.some(s => s.status === 'fail') ? '#fce8e6' : '#e6f4ea',
                    padding: '4px 12px',
                    borderRadius: '6px'
                  }}>
                    {detailSteps.some(s => s.status === 'fail') ? 'LỖI' : 'ĐẠT'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={saveDetailInspection}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      backgroundColor: '#7B5233',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Xác nhận
                  </button>
                  <button
                    onClick={() => setIsDetailInspectionOpen(false)}
                    style={{
                      padding: '10px 16px',
                      border: '1.5px solid #7B5233',
                      backgroundColor: 'white',
                      color: '#7B5233',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Xem QTKT Quy Trình Kiểm Tra Modal */}
        {isProcessModalOpen && selectedProcessDetails && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '360px',
              height: '80vh',
              border: '1.5px solid #7B5233',
              boxShadow: '0 8px 32px rgba(45, 26, 18, 0.15)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#FAF6F0',
                borderBottom: '1px solid #EADCC9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#4B301E' }}>Quy trình kiểm tra</span>
                  <span style={{ fontSize: '11px', color: '#7B5233', fontWeight: 'bold' }}>{selectedProcessDetails.name}</span>
                </div>
                <button
                  onClick={() => setIsProcessModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF8F5' }}>
                <button
                  onClick={() => setProcessModalTab('quick')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    borderBottom: processModalTab === 'quick' ? '2px solid #7B5233' : 'none',
                    backgroundColor: 'transparent',
                    color: processModalTab === 'quick' ? '#7B5233' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Hướng dẫn nhanh
                </button>
                <button
                  onClick={() => setProcessModalTab('detail')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    borderBottom: processModalTab === 'detail' ? '2px solid #7B5233' : 'none',
                    backgroundColor: 'transparent',
                    color: processModalTab === 'detail' ? '#7B5233' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Quy trình chi tiết
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {processModalTab === 'quick' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(() => {
                      let workInstructionsList = [];
                      if (selectedProcessDetails && selectedProcessDetails.sections && selectedProcessDetails.sections['__metadata_work_instructions__']) {
                        try {
                          workInstructionsList = JSON.parse(selectedProcessDetails.sections['__metadata_work_instructions__']);
                        } catch (err) {
                          workInstructionsList = [];
                        }
                      }

                      if (workInstructionsList.length > 0) {
                        return workInstructionsList.map((inst, instIdx) => (
                          <div key={inst.id || instIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', width: '100%' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#7B5233', backgroundColor: '#FAF6F0', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #7B5233' }}>
                              {inst.title || `Hướng dẫn thực hiện ${instIdx + 1}`}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '8px' }}>
                              {(inst.steps || []).map((step, sIdx) => (
                                <div key={step.id || sIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #7B5233',
                                    backgroundColor: '#FAF6F0',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                  }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block' }}>
                                      Bước {step.step_number}
                                    </span>
                                    {step.name && (
                                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B301E', display: 'block', marginTop: '2px' }}>
                                        {step.name}
                                      </span>
                                    )}
                                    {step.instructions && (
                                      <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                                        {step.instructions}
                                      </p>
                                    )}
                                    {step.checklist && step.checklist.length > 0 && (
                                      <div style={{ marginTop: '6px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                                        {step.checklist.map((c, cIdx) => (
                                          <span key={cIdx} style={{ fontSize: '10px', color: '#475569', display: 'block', margin: '2px 0' }}>
                                            • {c}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {sIdx < inst.steps.length - 1 && (
                                    <div style={{ width: '2px', height: '16px', backgroundColor: '#7B5233', margin: '4px 0' }} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      }

                      // Fallback to process flowchart steps
                      const steps = selectedProcessDetails.steps || [];
                      if (steps.length > 0) {
                        return steps.map((step, sIdx) => (
                          <div key={step.id || sIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #7B5233',
                              backgroundColor: '#FAF6F0',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block' }}>
                                Bước {step.step_number} [{step.assignee_role || 'QC'}]
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B301E', display: 'block', marginTop: '2px' }}>
                                {step.name}
                              </span>
                              {step.instructions && (
                                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                                  {step.instructions}
                                </p>
                              )}
                              {step.checklist && step.checklist.length > 0 && (
                                <div style={{ marginTop: '6px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                                  {step.checklist.map((c, cIdx) => (
                                    <span key={cIdx} style={{ fontSize: '10px', color: '#475569', display: 'block', margin: '2px 0' }}>
                                      • {c}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {sIdx < steps.length - 1 && (
                              <div style={{ width: '2px', height: '16px', backgroundColor: '#7B5233', margin: '4px 0' }} />
                            )}
                          </div>
                        ));
                      }

                      return (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '12px', padding: '24px 0' }}>
                          Không có các bước hướng dẫn thực hiện hoặc lưu đồ nào được thiết lập.
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#f1f5f9', padding: '16px 8px', borderRadius: '8px' }}>
                    <div style={{
                      backgroundColor: 'white',
                      padding: '24px 16px',
                      borderRadius: '4px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                      border: '1px solid #cbd5e1',
                      fontFamily: 'Inter, sans-serif',
                      color: '#000'
                    }}>
                      
                      {/* Outer Border Frame */}
                      <div style={{ border: '1.5px solid #000', padding: '16px 12px', minHeight: '520px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          {/* Logo and Company Header Table */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', marginBottom: '24px' }}>
                            <tbody>
                              <tr>
                                <td style={{ width: '30%', border: '1.5px solid #000', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#00529c', lineHeight: '1.1' }}>PHU TAI</div>
                                    <div style={{ fontSize: '6px', color: '#e06000', fontWeight: 'bold' }}>VINA G7 JSC</div>
                                  </div>
                                </td>
                                <td style={{ width: '70%', border: '1.5px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: '#000', textTransform: 'uppercase', verticalAlign: 'middle' }}>
                                  CÔNG TY CỔ PHẦN VINA G7
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Centered Title */}
                          <div style={{ textAlign: 'center', margin: '30px 0 20px 0' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
                              {selectedProcessDetails.name}
                            </h2>
                          </div>

                          {/* Metadata Details Table (Dashed borders centered) */}
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                            <table style={{ width: '80%', borderCollapse: 'collapse', border: '1.5px dashed #000', fontSize: '11px' }}>
                              <tbody>
                                <tr>
                                  <td style={{ width: '45%', border: '1.5px dashed #000', padding: '6px 10px', fontWeight: 'bold' }}>Mã hiệu:</td>
                                  <td style={{ width: '55%', border: '1.5px dashed #000', padding: '6px 10px' }}>{selectedProcessDetails.code}</td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1.5px dashed #000', padding: '6px 10px', fontWeight: 'bold' }}>Lần ban hành:</td>
                                  <td style={{ border: '1.5px dashed #000', padding: '6px 10px' }}>01</td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1.5px dashed #000', padding: '6px 10px', fontWeight: 'bold' }}>Ngày ban hành:</td>
                                  <td style={{ border: '1.5px dashed #000', padding: '6px 10px' }}>{selectedProcessDetails.issue_date || '2026-07-07'}</td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1.5px dashed #000', padding: '6px 10px', fontWeight: 'bold' }}>Bộ phận thực hiện:</td>
                                  <td style={{ border: '1.5px dashed #000', padding: '6px 10px' }}>{selectedProcessDetails.display_at || '/inspection-first-article'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Responsibility Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '10px', textAlign: 'center' }}>
                          <thead>
                            <tr style={{ fontWeight: 'bold' }}>
                              <th style={{ border: '1.5px solid #000', padding: '6px', width: '25%' }}>TRÁCH NHIỆM</th>
                              <th style={{ border: '1.5px solid #000', padding: '6px', width: '35%' }}>HỌ TÊN</th>
                              <th style={{ border: '1.5px solid #000', padding: '6px', width: '20%' }}>CHỨC VỤ</th>
                              <th style={{ border: '1.5px solid #000', padding: '6px', width: '20%' }}>KÝ TÊN</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ border: '1.5px solid #000', padding: '6px', fontWeight: 'bold' }}>Biên soạn</td>
                              <td style={{ border: '1.5px solid #000', padding: '6px' }}>{selectedProcessDetails.editor || 'ĐẶNG VĂN NAM'}</td>
                              <td style={{ border: '1.5px solid #000', padding: '6px' }}>a</td>
                              <td style={{ border: '1.5px solid #000', padding: '6px' }}></td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #000', padding: '6px', fontWeight: 'bold' }}>Phê duyệt</td>
                              <td style={{ border: '1.5px solid #000', padding: '6px' }}>{selectedProcessDetails.approver || 'a'}</td>
                              <td style={{ border: '1.5px solid #000', padding: '6px' }}>á</td>
                              <td style={{ border: '1.5px solid #000', padding: '6px' }}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Info line */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '9px',
                        fontStyle: 'italic',
                        color: '#000',
                        marginTop: '8px',
                        padding: '0 4px'
                      }}>
                        <span>Mã hiệu: {selectedProcessDetails.code}</span>
                        <span>Ngày ban hành: {selectedProcessDetails.issue_date || '2026-07-07'}</span>
                        <span>Ngày hiệu chỉnh: </span>
                        <span>Lần ban hành: 01 | Trang 1</span>
                      </div>

                      {/* Content Sections */}
                      <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                        {(() => {
                          const visibleSections = Object.entries(selectedProcessDetails.sections || {})
                            .filter(([secName]) => !secName.startsWith('__'));
                          
                          let sectionTypes = {};
                          if (selectedProcessDetails.sections && selectedProcessDetails.sections['__metadata_section_types__']) {
                            try {
                              sectionTypes = JSON.parse(selectedProcessDetails.sections['__metadata_section_types__']);
                            } catch (e) {}
                          }

                          let workInstructions = [];
                          if (selectedProcessDetails.sections && selectedProcessDetails.sections['__metadata_work_instructions__']) {
                            try {
                              workInstructions = JSON.parse(selectedProcessDetails.sections['__metadata_work_instructions__']);
                            } catch (e) {}
                          }

                          const getFullImgUrl = (imgUrl) => {
                            if (!imgUrl) return '';
                            if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) return imgUrl;
                            return `${apiClient.defaults.baseURL.split('/api/v1')[0]}${imgUrl}`;
                          };

                          if (visibleSections.length > 0) {
                            return visibleSections.map(([secName, content], sIdx) => {
                              const isFlowchart = sectionTypes[secName] === 'flowchart';

                              if (isFlowchart) {
                                return (
                                  <React.Fragment key={secName}>
                                    {/* 1. Flowchart Diagram */}
                                    <div style={{ marginBottom: '24px' }}>
                                      <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7B5233', borderBottom: '1px solid #EADCC9', paddingBottom: '4px', marginBottom: '8px' }}>
                                        {sIdx + 1}. {secName}
                                      </h4>
                                      
                                      <div style={{ marginBottom: '20px' }}>
                                        <FlowchartTable steps={selectedProcessDetails.steps || []} />
                                      </div>

                                      {/* Explanations section details */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                        {(selectedProcessDetails.steps || []).map((step, idx) => {
                                          const stepLabel = `Bước ${step.step_number}`;
                                          return (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                              <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '11px', color: 'black' }}>
                                                {stepLabel}: {step.name}
                                              </div>
                                              {step.instructions ? (
                                                <div 
                                                  dangerouslySetInnerHTML={{ __html: step.instructions }} 
                                                  style={{ paddingLeft: '16px', color: 'black', fontSize: '11px', lineHeight: '1.4' }}
                                                />
                                              ) : (
                                                <div style={{ paddingLeft: '16px', color: '#777', fontStyle: 'italic', fontSize: '10.5px' }}>
                                                  (Chưa có giải thích cho bước này)
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* 2. Visual work manual */}
                                    {workInstructions.map((inst, instIdx) => (
                                      <div key={inst.id || instIdx} style={{ marginBottom: '24px', marginTop: '20px' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7B5233', borderBottom: '1px solid #EADCC9', paddingBottom: '4px', marginBottom: '8px' }}>
                                          {sIdx + 1}.{instIdx + 1}. {inst.title || `Hướng dẫn thực hiện ${instIdx + 1}`}
                                        </h4>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                          {(inst.steps || []).map((step, idx) => {
                                            const images = step.image_urls || [];
                                            return (
                                              <div key={idx} style={{ border: '1px solid black', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                  <span style={{ border: '1px solid black', fontSize: '10px', fontWeight: 'bold', padding: '3px 10px', whiteSpace: 'nowrap' }}>
                                                    Bước {step.step_number}
                                                  </span>
                                                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{step.name || '(Chưa nhập công việc)'}</span>
                                                </div>
                                                {images.length > 0 ? (
                                                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${images.length}, 1fr)`, gap: '10px', marginTop: '4px' }}>
                                                    {images.map((imgUrl, imgIdx) => (
                                                      <div key={imgIdx} style={{ height: '140px', border: '1px solid black', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                                                        <img src={getFullImgUrl(imgUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`hinh ${imgIdx + 1}`} />
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', paddingLeft: '8px' }}>
                                                    (Chưa có hình ảnh minh họa cho bước này)
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </React.Fragment>
                                );
                              } else {
                                return (
                                  <div key={secName} style={{ marginBottom: '12px' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7B5233', borderBottom: '1px solid #EADCC9', paddingBottom: '4px', marginBottom: '8px' }}>
                                      {sIdx + 1}. {secName}
                                    </h4>
                                    <div
                                      dangerouslySetInnerHTML={{ __html: content }}
                                      style={{
                                        fontSize: '11px',
                                        lineHeight: '1.5',
                                        color: '#334155',
                                        overflowX: 'auto'
                                      }}
                                    />
                                  </div>
                                );
                              }
                            });
                          }
                          return (
                            <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '11px', padding: '16px 0' }}>
                              Chưa cấu hình nội dung tài liệu chi tiết.
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 16px', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsProcessModalOpen(false)}
                  style={{
                    padding: '8px 20px',
                    border: 'none',
                    backgroundColor: '#7B5233',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Message Alert Modal */}
        <MessageModal
          isOpen={isMessageOpen}
          type={messageConfig.type}
          title={messageConfig.title}
          message={messageConfig.message}
          onConfirm={() => setIsMessageOpen(false)}
        />

        {/* Full-screen Image Preview Modal */}
        {previewUrl && (
          <div 
            onClick={() => setPreviewUrl(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100000,
              cursor: 'zoom-out'
            }}
          >
            <div style={{ position: 'relative', maxWidth: '95%', maxHeight: '95%' }} onClick={(e) => e.stopPropagation()}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} 
              />
              <button
                onClick={() => setPreviewUrl(null)}
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '0px',
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                <X size={20} color="#333" />
              </button>
            </div>
          </div>
        )}

        {/* Hidden File Input for Image Capture */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />

      </div>
    </Layout>
  );
};

export default FirstArticleInspectionView;

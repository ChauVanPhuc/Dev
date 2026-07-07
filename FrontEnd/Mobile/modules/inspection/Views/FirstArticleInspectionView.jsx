import React, { useState, useEffect, useMemo, useRef } from 'react';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import { Camera, X, Image as ImageIcon, Check, RotateCcw, Search, Plus, Pencil, ChevronDown, ChevronUp, AlertCircle, Eye, Info } from 'lucide-react';
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';

const FirstArticleInspectionView = () => {
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);

  // Core states
  const [activeStage, setActiveStage] = useState('');
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [isPoSearching, setIsPoSearching] = useState(false);
  const [poNotFound, setPoNotFound] = useState(false);
  const [recentPOs, setRecentPOs] = useState([]);

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

    fetchMachines();
    fetchEquipments();
    fetchDefectTypes();
    fetchTodayHistory();
  }, [user]);

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
      const res = await apiClient.get(`purchase-order-items/by-po/${searchCode}`);
      const items = res.data;

      if (!items || items.length === 0) {
        setPoNotFound(true);
        setPoItems([]);
        setPoHeader(null);
        setSelectedItemCode('');
        return;
      }

      // Populate PO details
      setPoHeader({
        po_code: searchCode,
        supplier_name: items[0].supplier_name || 'N/A',
        order_date: items[0].po_date || '',
        delivery_date: items[0].requested_delivery_date || ''
      });
      setPoItems(items);
      if (items.length > 0) {
        setSelectedItemCode(items[0].item_code || '');
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

      // Load operating guidelines steps from matching equipment or machine notes
      const eq = equipments.find(e => e.code === code || e.name === mac.name);
      let steps = [];
      if (eq && eq.user_manual_steps) {
        try {
          steps = JSON.parse(eq.user_manual_steps || '[]');
        } catch (err) {
          steps = [];
        }
      }

      if (steps.length === 0 && mac.notes) {
        // Fallback: split machine notes by semicolon/comma/newline
        const noteSteps = mac.notes.split(/[;\n,]+/).map(s => s.trim()).filter(Boolean);
        steps = noteSteps.map((s, idx) => ({ step: idx + 1, title: s }));
      }

      if (steps.length === 0) {
        steps = [{ step: 1, title: 'Kiểm tra hoạt động chung của máy' }];
      }

      const newChecklist = steps.map((s, idx) => ({
        step: s.step || idx + 1,
        title: s.title || '',
        status: 'pass', // Default all steps as passed
        note: '',
        images: []
      }));
      setChecklistResults(newChecklist);
    } else {
      setSelectedMachineName('');
      setChecklistResults([]);
    }
  };

  // 4. Image Upload & Camera handlers
  const triggerCamera = (stepIndex, imgIndex) => {
    setUploadTarget({ stepIndex, imgIndex });
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

      // Update checklist state
      setChecklistResults(prev => {
        const next = [...prev];
        const step = { ...next[uploadTarget.stepIndex] };
        const newImages = [...(step.images || [])];
        newImages[uploadTarget.imgIndex] = imageUrl;
        step.images = newImages;
        next[uploadTarget.stepIndex] = step;
        return next;
      });

    } catch (err) {
      console.error('Lỗi khi tải hình ảnh lên:', err);
      setMessageConfig({ type: 'error', title: 'Lỗi upload', message: 'Không thể upload ảnh kiểm tra. Vui lòng thử lại!' });
      setIsMessageOpen(true);
    } finally {
      setIsUploading(false);
      setUploadTarget(null);
    }
  };

  const removePhoto = (stepIndex, imgIndex) => {
    setChecklistResults(prev => {
      const next = [...prev];
      const step = { ...next[stepIndex] };
      const newImages = [...(step.images || [])];
      newImages[imgIndex] = null;
      step.images = newImages.filter(x => x !== null);
      next[stepIndex] = step;
      return next;
    });
  };

  // 5. Checklist Step Notes Popups
  const openNoteModal = (idx) => {
    setEditingStepIndex(idx);
    setTempStepNote(checklistResults[idx].note || '');
  };

  const saveStepNote = () => {
    setChecklistResults(prev => {
      const next = [...prev];
      next[editingStepIndex].note = tempStepNote;
      return next;
    });
    setEditingStepIndex(null);
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
      checklistResults.forEach(r => {
        if (r.images) {
          r.images.forEach(img => {
            if (img) allPhotos.push(img);
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

      // Determine conclusion: fails if SL loại > 0 or any step is fail
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
            step: r.step,
            title: r.title,
            status: r.status,
            note: r.note,
            images: r.images
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
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '4px' }}>Mã PO</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={poSearchTerm}
                  onChange={(e) => setPoSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchPO()}
                  placeholder="Nhập mã PO (vd: APT0081)..."
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #7B5233', fontSize: '13px', outline: 'none' }}
                />
                <button
                  onClick={() => handleSearchPO()}
                  disabled={isPoSearching}
                  style={{ width: '42px', height: '38px', borderRadius: '8px', border: 'none', backgroundColor: '#7B5233', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Search size={18} color="#fff" />
                </button>
              </div>
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
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1.5px solid #7B5233', overflow: 'hidden' }}>
            <div
              onClick={() => setExpandedInfoCard(!expandedInfoCard)}
              style={{ padding: '12px 16px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #7B5233', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#4B301E' }}>Thông tin kiểm tra</span>
                {selectedMachineCode && (
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
                )}
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
                      {machines.map(m => (
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
                    onChange={(e) => setSelectedItemCode(e.target.value)}
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
                            {item.item_code} - {item.item_name}
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
                              <td style={{ padding: '8px', fontSize: '12px', fontWeight: 'bold', color: '#4B301E', textAlign: 'center' }}>{row.step}</td>
                              <td style={{ padding: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#4B301E', display: 'block', fontWeight: '600' }}>{row.title}</span>
                                {row.note && <span style={{ fontSize: '10px', color: '#b45309', display: 'block', marginTop: '2px', fontStyle: 'italic' }}>* {row.note}</span>}

                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                                  {[0, 1, 2].map((imgIdx) => {
                                    const imgPath = row.images ? row.images[imgIdx] : null;
                                    const fullUrl = imgPath ? `${apiClient.defaults.baseURL.split('/api/v1')[0]}${imgPath}` : null;
                                    return (
                                      <div
                                        key={imgIdx}
                                        onClick={() => !imgPath && triggerCamera(idx, imgIdx)}
                                        style={{ width: '38px', height: '38px', borderRadius: '6px', border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                                      >
                                        {fullUrl ? (
                                          <>
                                            <img src={fullUrl} alt="check" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removePhoto(idx, imgIdx);
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
                                    onClick={() => openNoteModal(idx)}
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

        {/* Message Alert Modal */}
        <MessageModal
          isOpen={isMessageOpen}
          type={messageConfig.type}
          title={messageConfig.title}
          message={messageConfig.message}
          onConfirm={() => setIsMessageOpen(false)}
        />

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

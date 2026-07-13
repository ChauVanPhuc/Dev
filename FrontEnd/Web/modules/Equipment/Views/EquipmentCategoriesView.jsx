import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, Trash2, Edit, Search, Filter, Layers, FileUp, FileDown, X, Save, AlertTriangle, HelpCircle, CheckCircle, Upload } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';

const EquipmentCategoriesView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();

  const [equipments, setEquipments] = useState([]);
  const [selectedCategoryNode, setSelectedCategoryNode] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [manualSteps, setManualSteps] = useState([]);
  const [newStepText, setNewStepText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOtherMenu, setShowOtherMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const { toast } = useToast();
  const setMessage = (msg) => {
    if (msg && msg.text) {
      toast(msg.type, msg.text);
    }
  };
  
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const [activeImageSlot, setActiveImageSlot] = useState(0);
  const imageInputRef = useRef(null);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchFormData, setBatchFormData] = useState({ name: '', type: 'Vật lý' });
  const [batchLoading, setBatchLoading] = useState(false);

  const [systemUsers, setSystemUsers] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);

  const fetchSystemUsersAndRoles = async () => {
    try {
      const usersRes = await api.get('/accounts/?page=1&size=1000');
      if (usersRes && Array.isArray(usersRes.items)) {
        setSystemUsers(usersRes.items);
      }
      const rolesRes = await api.get('/roles/');
      if (Array.isArray(rolesRes)) {
        setSystemRoles(rolesRes);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng và vai trò:', error);
    }
  };

  // Custom confirmation popup state
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'delete', // 'add', 'edit', 'delete'
    onConfirm: null
  });

  const defaultForm = {
    name: '', code: '', type: 'Vật lý', status: 'Bình thường',
    purchase_date: new Date().toISOString().split('T')[0],
    maintenance_cycle: 30, department: 'Quản lý chất lượng',
    owner_name: '', calibration_date: '', handover_date: new Date().toISOString().split('T')[0],
    check_date: '', attachment_pdf: '', images: '', user_manual_steps: '[]'
  };
  const [formData, setFormData] = useState({ ...defaultForm });

  // Image helpers (JSON array storage)
  const parseImages = (imagesStr) => {
    if (!imagesStr || !imagesStr.trim()) return [];
    try {
      const parsed = JSON.parse(imagesStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [imagesStr];
  };
  const serializeImages = (imagesArr) => {
    let lastIdx = -1;
    for (let i = imagesArr.length - 1; i >= 0; i--) {
      if (imagesArr[i] && imagesArr[i].trim()) { lastIdx = i; break; }
    }
    if (lastIdx === -1) return '';
    return JSON.stringify(imagesArr.slice(0, lastIdx + 1));
  };
  const isImageValid = (img) => {
    if (!img) return false;
    const clean = String(img).trim().toLowerCase();
    return clean !== '' && clean !== 'null' && clean !== 'undefined' && clean !== 'none';
  };

  const fetchEquipments = async () => {
    try {
      const data = await api.get('/equipments/');
      setEquipments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách thiết bị:', error);
    }
  };

  useEffect(() => {
    setCustomScreenCode('AD37.1');
    setCustomTitle('Danh sách thiết bị');
    setCustomSubtitle('Phân loại thiết bị theo nhóm và quản lý hướng dẫn vận hành SOP.');
    fetchEquipments();
    fetchSystemUsersAndRoles();
  }, []);

  // Computed categories tree
  const computedCategoryTree = useMemo(() => {
    const treeMap = {};
    const term = searchTerm.toLowerCase().trim();

    let filteredList = equipments;
    if (term) {
      const matchingUserNames = systemUsers
        .filter(u => u.employee_id && u.employee_id.toLowerCase().includes(term))
        .map(u => u.full_name);

      filteredList = equipments.filter(eq => 
        (eq.code && eq.code.toLowerCase().includes(term)) ||
        (eq.name && eq.name.toLowerCase().includes(term)) ||
        (eq.owner_name && (
          eq.owner_name.toLowerCase().includes(term) ||
          matchingUserNames.includes(eq.owner_name)
        ))
      );
    }

    filteredList.forEach(eq => {
      const type = eq.type || 'Khác';
      const name = eq.name || 'Không tên';
      if (!treeMap[type]) treeMap[type] = new Set();
      treeMap[type].add(name);
    });
    const tree = Object.keys(treeMap).map((type, index) => ({
      id: `cat-${index}`, name: type, children: Array.from(treeMap[type])
    }));
    return tree;
  }, [equipments, searchTerm, systemUsers]);

  const filteredUsers = useMemo(() => {
    if (!formData.department) return systemUsers;
    const deptLower = formData.department.toLowerCase();
    return systemUsers.filter(user => {
      const roleLower = (user.role_name || '').toLowerCase();
      const nameLower = (user.full_name || '').toLowerCase();
      
      const matchRole = roleLower.includes(deptLower) || 
                        (deptLower === 'sx' && roleLower.includes('sản xuất')) ||
                        (deptLower === 'sản xuất' && roleLower.includes('sx')) ||
                        (deptLower === 'qc' && roleLower.includes('quản lý chất lượng')) ||
                        (deptLower === 'quản lý chất lượng' && roleLower.includes('qc'));
                        
      const matchPrefix = nameLower.startsWith(deptLower + ' -') || 
                          (deptLower === 'sản xuất' && nameLower.startsWith('sx -')) ||
                          (deptLower === 'quản lý chất lượng' && nameLower.startsWith('qc -'));
      
      return matchRole || matchPrefix;
    });
  }, [systemUsers, formData.department]);

  // Auto-select first category
  useEffect(() => {
    if (computedCategoryTree.length > 0) {
      const allChildren = computedCategoryTree.flatMap(c => c.children);
      if (!selectedCategoryNode || !allChildren.includes(selectedCategoryNode)) {
        setSelectedCategoryNode(allChildren[0] || null);
      }
    } else {
      setSelectedCategoryNode(null);
    }
  }, [computedCategoryTree]);

  // Sync manual steps
  useEffect(() => {
    if (selectedCategoryNode) {
      const firstEq = equipments.find(e => e.name === selectedCategoryNode);
      if (firstEq) {
        setSelectedEquipment(firstEq);
        try { setManualSteps(JSON.parse(firstEq.user_manual_steps || '[]')); } catch { setManualSteps([]); }
      } else {
        setSelectedEquipment(null);
        setManualSteps([]);
      }
    }
  }, [selectedCategoryNode, equipments]);

  const persistManualStepsToDb = async (updatedSteps) => {
    const matched = equipments.filter(eq => eq.name === selectedCategoryNode);
    const stepsJson = JSON.stringify(updatedSteps);
    try {
      for (const eq of matched) {
        await api.put(`/equipments/${eq.id}`, { ...eq, user_manual_steps: stepsJson });
      }
      fetchEquipments();
    } catch (error) {
      console.error('Lỗi khi lưu các bước hướng dẫn vận hành:', error);
    }
  };

  const handleAddManualStep = async () => {
    if (!newStepText.trim()) return;
    const updated = [...manualSteps, { step: manualSteps.length + 1, title: newStepText, image_url: null }];
    setManualSteps(updated);
    setNewStepText('');
    await persistManualStepsToDb(updated);
  };

  const handleRemoveManualStep = async (stepIndex) => {
    const updated = manualSteps.filter((_, idx) => idx !== stepIndex).map((s, idx) => ({ ...s, step: idx + 1 }));
    setManualSteps(updated);
    await persistManualStepsToDb(updated);
  };

  // CRUD handlers
  const openAddModal = () => {
    const nextCode = `EQP-${String(equipments.length + 1).padStart(3, '0')}`;
    setEditingEquipment(null);
    setFormData({ ...defaultForm, code: nextCode });
    setShowModal(true);
  };

  const openEditModal = (eq) => {
    setEditingEquipment(eq);
    setFormData({
      name: eq.name || '', code: eq.code || '', type: eq.type || 'Đo lường',
      status: eq.status || 'Bình thường', purchase_date: eq.purchase_date || '',
      maintenance_cycle: eq.maintenance_cycle || 30, department: eq.department || '',
      owner_name: eq.owner_name || '', calibration_date: eq.calibration_date || '',
      handover_date: eq.handover_date || '', check_date: eq.check_date || '',
      attachment_pdf: eq.attachment_pdf || '', images: eq.images || '',
      user_manual_steps: eq.user_manual_steps || '[]'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên và mã thiết bị.' });
      return;
    }

    setConfirmModal({
      show: true,
      title: editingEquipment ? 'Xác nhận cập nhật' : 'Xác nhận thêm mới',
      message: editingEquipment 
        ? `Bạn có chắc muốn lưu các thay đổi cho thiết bị "${formData.name}" (${formData.code})?`
        : `Bạn có chắc muốn thêm thiết bị mới "${formData.name}" (${formData.code}) vào hệ thống?`,
      type: editingEquipment ? 'edit' : 'add',
      onConfirm: async () => {
        // Clean empty strings to null for date/optional fields (Pydantic rejects "")
        const payload = { ...formData };
        ['purchase_date', 'calibration_date', 'handover_date', 'check_date'].forEach(key => {
          if (!payload[key] || payload[key] === '') payload[key] = null;
        });
        if (payload.maintenance_cycle !== null && payload.maintenance_cycle !== undefined) {
          payload.maintenance_cycle = parseInt(payload.maintenance_cycle) || 30;
        } else {
          payload.maintenance_cycle = 30;
        }
        if (!payload.attachment_pdf) payload.attachment_pdf = null;
        if (!payload.images) payload.images = null;
        try {
          if (editingEquipment) {
            await api.put(`/equipments/${editingEquipment.id}`, payload);
            setMessage({ type: 'success', text: 'Đã cập nhật thiết bị thành công.' });
          } else {
            await api.post('/equipments/', payload);
            setMessage({ type: 'success', text: 'Đã thêm thiết bị mới thành công.' });
          }
          setShowModal(false);
          fetchEquipments();
        } catch (error) {
          const detail = error.response?.data?.detail;
          const errMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(', ') : 'Không thể lưu thiết bị.');
          setMessage({ type: 'error', text: errMsg });
        }
      }
    });
  };

  const handleDelete = async (eq) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa thiết bị',
      message: `Bạn có chắc muốn xóa thiết bị "${eq.name}" (${eq.code})? Hành động này sẽ xóa vĩnh viễn thiết bị và không thể hoàn tác.`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/equipments/${eq.id}`);
          setMessage({ type: 'success', text: `Đã xóa thiết bị ${eq.code} thành công.` });
          fetchEquipments();
        } catch (error) {
          setMessage({ type: 'error', text: 'Không thể xóa thiết bị.' });
        }
      }
    });
  };

  const generateNextCode = (currentEquipments) => {
    let maxNum = 0;
    currentEquipments.forEach(eq => {
      if (eq.code && eq.code.startsWith('EQP-')) {
        const num = parseInt(eq.code.split('-')[1]);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `EQP-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const openBatchEditModal = () => {
    if (!selectedCategoryNode) return;
    const firstEq = matchedEquipments[0] || {};
    setBatchFormData({
      name: selectedCategoryNode,
      type: firstEq.type || 'Vật lý',
      totalQuantity: matchedEquipments.length,
      status: firstEq.status || 'Bình thường'
    });
    setShowBatchModal(true);
  };

  const handleSaveBatch = async () => {
    if (!batchFormData.name.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên thiết bị.' });
      return;
    }

    const currentQty = matchedEquipments.length;
    const targetQty = batchFormData.totalQuantity;

    setConfirmModal({
      show: true,
      title: 'Xác nhận chỉnh sửa thông tin nhóm',
      message: `Bạn có chắc muốn cập nhật nhóm thiết bị "${selectedCategoryNode}" thành tên "${batchFormData.name}"? Số lượng sẽ thay đổi từ ${currentQty} thành ${targetQty}.`,
      type: 'edit',
      onConfirm: async () => {
        setBatchLoading(true);
        try {
          const numToUpdate = Math.min(currentQty, targetQty);
          
          for (let i = 0; i < numToUpdate; i++) {
            const eq = matchedEquipments[i];
            const payload = { 
              ...eq, 
              name: batchFormData.name.trim(), 
              type: batchFormData.type,
              status: batchFormData.status
            };
            ['purchase_date', 'calibration_date', 'handover_date', 'check_date'].forEach(key => {
              if (!payload[key] || payload[key] === '') payload[key] = null;
            });
            if (payload.maintenance_cycle !== null && payload.maintenance_cycle !== undefined) {
              payload.maintenance_cycle = parseInt(payload.maintenance_cycle) || 30;
            }
            await api.put(`/equipments/${eq.id}`, payload);
          }

          if (targetQty > currentQty) {
            const addCount = targetQty - currentQty;
            let tempEquipments = [...equipments];
            
            for (let i = 0; i < addCount; i++) {
              const nextCode = generateNextCode(tempEquipments);
              const newEq = {
                name: batchFormData.name.trim(),
                code: nextCode,
                type: batchFormData.type,
                status: batchFormData.status,
                purchase_date: null,
                maintenance_cycle: 30,
                department: matchedEquipments[0]?.department || null,
                owner_name: null,
                calibration_date: null,
                handover_date: null,
                check_date: null,
                attachment_pdf: null,
                images: null,
                user_manual_steps: matchedEquipments[0]?.user_manual_steps || '[]'
              };
              const res = await api.post('/equipments/', newEq);
              if (res && res.id) {
                tempEquipments.push(res);
              }
            }
          }

          if (targetQty < currentQty) {
            const deleteCount = currentQty - targetQty;
            for (let i = 0; i < deleteCount; i++) {
              const eqToDelete = matchedEquipments[currentQty - 1 - i];
              await api.delete(`/equipments/${eqToDelete.id}`);
            }
          }
          
          setMessage({ type: 'success', text: 'Cập nhật thông tin nhóm thiết bị thành công.' });
          setSelectedCategoryNode(batchFormData.name.trim());
          setShowBatchModal(false);
          fetchEquipments();
        } catch (error) {
          console.error("Lỗi cập nhật thông tin nhóm:", error);
          setMessage({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật thông tin nhóm thiết bị.' });
        } finally {
          setBatchLoading(false);
        }
      }
    });
  };

  const handleDeleteImage = (index) => {
    const currentImages = parseImages(formData.images);
    while (currentImages.length <= index) currentImages.push('');
    currentImages[index] = '';
    setFormData({ ...formData, images: serializeImages(currentImages) });
  };

  const matchedEquipments = useMemo(() => {
    let list = equipments.filter(eq => eq.name === selectedCategoryNode);

    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const matchingUserNames = systemUsers
        .filter(u => u.employee_id && u.employee_id.toLowerCase().includes(term))
        .map(u => u.full_name);

      list = list.filter(eq => 
        (eq.code && eq.code.toLowerCase().includes(term)) ||
        (eq.name && eq.name.toLowerCase().includes(term)) ||
        (eq.owner_name && (
          eq.owner_name.toLowerCase().includes(term) ||
          matchingUserNames.includes(eq.owner_name)
        ))
      );
    }
    return list;
  }, [equipments, selectedCategoryNode, searchTerm, systemUsers]);

  // Styles
  const btnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' };
  const thStyle = { padding: '8px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textAlign: 'left', textTransform: 'uppercase' };

  return (
    <div style={{ padding: '5px 20px 20px' }}>
      {/* Toolbar */}
      <PageToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Nhập Họ và tên hoặc Mã NV"
        extraActions={[
          {
            label: 'Quản lý thiết bị',
            icon: <Layers size={14} />,
            onClick: () => navigate('/admin/equipment')
          },
          {
            label: 'Lịch sử kiểm tra, hiệu chuẩn',
            icon: <Layers size={14} />,
            onClick: () => navigate('/admin/equipment/history')
          },
          {
            label: 'Thông tin đào tạo',
            icon: <Layers size={14} />,
            onClick: () => navigate('/admin/equipment/training')
          }
        ]}
        onExport={() => {}} // Placeholder or export handler if exists
        onCreate={() => navigate('/admin/equipment/handover')}
        createLabel="Bàn giao"
        hasWritePermission={true}
      />



      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
        {/* Left panel: tree view */}
        <div className="card" style={{ width: '320px', padding: '20px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>Danh sách thiết bị</h3>
            <button onClick={openAddModal} style={{ ...btnStyle, padding: '4px 10px', fontSize: '12px', gap: '4px' }}><Plus size={12} /> Thêm</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            {computedCategoryTree.map(cat => (
              <div key={cat.id}>
                <div style={{ fontWeight: '800', color: '#7B5233', fontSize: '14px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChevronDown size={16} /> {cat.name}
                </div>
                <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {cat.children.map(child => {
                    return (
                      <div key={child} onClick={() => setSelectedCategoryNode(child)}
                        style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s',
                          backgroundColor: selectedCategoryNode === child ? '#FAF6F0' : 'transparent',
                          color: selectedCategoryNode === child ? '#7B5233' : '#475569',
                          border: selectedCategoryNode === child ? '1px solid #cbd5e1' : '1px solid transparent',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px'
                        }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{child}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="card" style={{ flex: 1, padding: '24px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>
              Thông tin thiết bị: {selectedCategoryNode || '—'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {selectedCategoryNode && matchedEquipments.length > 0 && (
                <button 
                  onClick={openBatchEditModal}
                  style={{ ...btnStyle, padding: '4px 10px', fontSize: '12px', gap: '4px' }}
                >
                  <Edit size={12} /> Chỉnh sửa thông tin nhóm
                </button>
              )}
              <div 
                onClick={() => setInfoCollapsed(!infoCollapsed)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', transition: 'background-color 0.2s' }}
                title={infoCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                {infoCollapsed ? <ChevronDown size={22} color="#7B5233" strokeWidth={2.5} /> : <ChevronUp size={22} color="#7B5233" strokeWidth={2.5} />}
              </div>
            </div>
          </div>

          {/* Equipment info */}
          {selectedEquipment && !infoCollapsed && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div className="form-group"><label>Tên thiết bị</label><input type="text" className="form-control disabled-input" value={selectedCategoryNode} disabled /></div>
              <div className="form-group"><label>Loại thiết bị</label><input type="text" className="form-control disabled-input" value={selectedEquipment?.type || 'Khác'} disabled /></div>
              <div className="form-group"><label>Số lượng tổng</label><input type="number" className="form-control disabled-input" value={matchedEquipments.length} disabled /></div>
              <div className="form-group"><label>Trạng thái</label><input type="text" className="form-control disabled-input" value={selectedEquipment?.status || 'Bình thường'} disabled /></div>
            </div>
          )}

          {/* Equipment table */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#334155' }}>
                Danh sách chi tiết thiết bị
              </h4>
              <div 
                onClick={() => setListCollapsed(!listCollapsed)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', transition: 'background-color 0.2s' }}
                title={listCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                {listCollapsed ? <ChevronDown size={22} color="#7B5233" strokeWidth={2.5} /> : <ChevronUp size={22} color="#7B5233" strokeWidth={2.5} />}
              </div>
            </div>
            {!listCollapsed && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <th style={thStyle}>Mã</th>
                    <th style={thStyle}>Tên</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thStyle}>Người sở hữu</th>
                    <th style={thStyle}>Ảnh</th>
                    <th style={{ ...thStyle, width: '100px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedEquipments.map((eq) => {
                    const imgs = parseImages(eq.images).filter(i => isImageValid(i));
                    return (
                      <tr key={eq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', color: '#7B5233' }}>{eq.code}</td>
                        <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600' }}>{eq.name}</td>
                        <td style={{ padding: '8px 12px', fontSize: '12px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: eq.status === 'Bình thường' ? '#dcfce7' : '#fee2e2', color: eq.status === 'Bình thường' ? '#15803d' : '#b91c1c', fontWeight: '700', fontSize: '10px' }}>{eq.status}</span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '13px' }}>{eq.owner_name || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {imgs.length > 0 ? imgs.slice(0, 3).map((img, idx) => (
                              <div key={idx} style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                              </div>
                            )) : <span style={{ fontSize: '11px', color: '#94a3b8' }}>Chưa có</span>}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                            <Edit size={14} onClick={() => openEditModal(eq)} style={{ cursor: 'pointer', color: '#7B5233' }} />
                            <Trash2 size={14} onClick={() => handleDelete(eq)} style={{ cursor: 'pointer', color: '#ef4444' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {matchedEquipments.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Không có thiết bị chi tiết nào thuộc nhóm này.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Manual steps builder */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#334155' }}>
                Hướng dẫn sử dụng
              </h4>
              <div 
                onClick={() => setManualCollapsed(!manualCollapsed)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', transition: 'background-color 0.2s' }}
                title={manualCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                {manualCollapsed ? <ChevronDown size={22} color="#7B5233" strokeWidth={2.5} /> : <ChevronUp size={22} color="#7B5233" strokeWidth={2.5} />}
              </div>
            </div>
            {!manualCollapsed && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                  {manualSteps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '15px', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 15px', backgroundColor: '#f8fafc' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: '#7B5233', color: '#fff', width: '24px', height: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{step.step}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155', flex: 1 }}>{step.title}</span>
                      <button type="button" onClick={() => handleRemoveManualStep(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="text" placeholder="Nhập nội dung bước vận hành tiếp theo..." value={newStepText} onChange={(e) => setNewStepText(e.target.value)} className="form-control" style={{ flex: 1 }} />
                  <button type="button" onClick={handleAddManualStep} style={{ ...btnStyle, padding: '10px 20px' }}><Plus size={16} /> Thêm bước</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowModal(false)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '30px', width: '700px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>
                {editingEquipment ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'}
              </h3>
              <X size={22} onClick={() => setShowModal(false)} style={{ cursor: 'pointer', color: '#94a3b8' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group"><label>Tên thiết bị *</label>
                <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
              <div className="form-group"><label>Mã thiết bị *</label>
                <input type="text" className="form-control" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} /></div>
              <div className="form-group"><label>Loại thiết bị</label>
                <select className="form-control" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                  <option value="Vật lý">Vật lý</option><option value="Điện tử">Điện tử</option>
                </select></div>
              <div className="form-group"><label>Trạng thái</label>
                <select className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="Bình thường">Bình thường</option><option value="Cần thay mới">Cần thay mới</option><option value="Bảo trì">Bảo trì</option><option value="Chưa kiểm tra">Chưa kiểm tra</option>
                </select></div>
              <div className="form-group"><label>Bộ phận</label>
                <select className="form-control" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value, owner_name: ''})}>
                  <option value="">-- Chọn bộ phận --</option>
                  {systemRoles.map((role) => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                  {systemRoles.length === 0 && (
                    <>
                      <option value="Quản lý chất lượng">Quản lý chất lượng</option>
                      <option value="Tổ đóng gói">Tổ đóng gói</option>
                      <option value="Tổ chà nhám">Tổ chà nhám</option>
                      <option value="Sản xuất">Sản xuất</option>
                    </>
                  )}
                </select></div>
              <div className="form-group"><label>Người sở hữu</label>
                <select className="form-control" value={formData.owner_name} onChange={(e) => setFormData({...formData, owner_name: e.target.value})}>
                  <option value="">-- Chọn nhân viên --</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={user.full_name}>{user.full_name} ({user.employee_id})</option>
                  ))}
                  {systemUsers.length === 0 && (
                    <>
                      <option value="Nguyễn Văn A">Nguyễn Văn A</option>
                      <option value="Nguyễn Văn B">Nguyễn Văn B</option>
                      <option value="Nguyễn Văn C">Nguyễn Văn C</option>
                      <option value="Nguyễn Văn D">Nguyễn Văn D</option>
                    </>
                  )}
                </select></div>
              <div className="form-group"><label>Ngày bàn giao</label>
                <input type="date" className="form-control" value={formData.handover_date} onChange={(e) => setFormData({...formData, handover_date: e.target.value})} /></div>
              <div className="form-group"><label>Ngày kiểm tra</label>
                <input type="date" className="form-control" value={formData.check_date} onChange={(e) => setFormData({...formData, check_date: e.target.value})} /></div>
            </div>

            {/* Image upload - 3 slots */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '8px' }}>Ảnh thiết bị (Tối đa 3 ảnh)</label>
              <input type="file" ref={imageInputRef} accept="image/*" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const currentImages = parseImages(formData.images);
                    while (currentImages.length <= activeImageSlot) currentImages.push('');
                    currentImages[activeImageSlot] = reader.result;
                    setFormData({ ...formData, images: serializeImages(currentImages) });
                  };
                  reader.readAsDataURL(file);
                }
              }} style={{ display: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {[0, 1, 2].map(slot => {
                  const imgList = parseImages(formData.images);
                  const img = imgList[slot];
                  return (
                    <div key={slot} onClick={() => { setActiveImageSlot(slot); imageInputRef.current.click(); }}
                      style={{ height: '120px', border: '2px dashed #cbd5e1', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                      {isImageValid(img) ? (
                        <>
                          <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteImage(slot); }}
                            style={{ position: 'absolute', top: '6px', right: '6px', backgroundColor: '#ef4444', color: '#fff', border: 'none', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload size={20} color="#94a3b8" />
                          <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{slot === 0 ? 'Ảnh chính' : `Ảnh ${slot + 1}`}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 24px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#64748b' }}>Hủy bỏ</button>
              <button onClick={handleSave} style={{ ...btnStyle, padding: '10px 24px', borderRadius: '10px' }}><Save size={16} /> {editingEquipment ? 'Cập nhật' : 'Thêm mới'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Edit Modal */}
      {showBatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowBatchModal(false)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '30px', width: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>
                Chỉnh sửa thông tin nhóm thiết bị
              </h3>
              <X size={22} onClick={() => setShowBatchModal(false)} style={{ cursor: 'pointer', color: '#94a3b8' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Tên thiết bị *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={batchFormData.name} 
                  onChange={(e) => setBatchFormData({...batchFormData, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Loại thiết bị</label>
                <select 
                  className="form-control" 
                  value={batchFormData.type} 
                  onChange={(e) => setBatchFormData({...batchFormData, type: e.target.value})}
                >
                  <option value="Vật lý">Vật lý</option>
                  <option value="Điện tử">Điện tử</option>
                </select>
              </div>
              <div className="form-group">
                <label>Số lượng tổng</label>
                <input 
                  type="number" 
                  min="1" 
                  className="form-control" 
                  value={batchFormData.totalQuantity} 
                  onChange={(e) => setBatchFormData({...batchFormData, totalQuantity: Math.max(1, parseInt(e.target.value) || 1)})} 
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Trạng thái</label>
                <select 
                  className="form-control" 
                  value={batchFormData.status} 
                  onChange={(e) => setBatchFormData({...batchFormData, status: e.target.value})}
                >
                  <option value="Bình thường">Bình thường</option>
                  <option value="Cần thay mới">Cần thay mới</option>
                  <option value="Bảo trì">Bảo trì</option>
                  <option value="Chưa kiểm tra">Chưa kiểm tra</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowBatchModal(false)} 
                disabled={batchLoading}
                style={{ padding: '10px 24px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#64748b' }}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSaveBatch} 
                disabled={batchLoading}
                style={{ ...btnStyle, padding: '10px 24px', borderRadius: '10px' }}
              >
                <Save size={16} /> {batchLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}>
            
            {/* Icon */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
              backgroundColor: confirmModal.type === 'delete' ? '#fee2e2' : (confirmModal.type === 'add' ? '#dcfce7' : '#e0f2fe'),
              color: confirmModal.type === 'delete' ? '#ef4444' : (confirmModal.type === 'add' ? '#22c55e' : '#0ea5e9')
            }}>
              {confirmModal.type === 'delete' ? <AlertTriangle size={28} /> : (confirmModal.type === 'add' ? <CheckCircle size={28} /> : <HelpCircle size={28} />)}
            </div>

            {/* Title & Message */}
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              {confirmModal.title}
            </h4>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5', fontWeight: '500' }}>
              {confirmModal.message}
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                style={{ flex: 1, padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#475569', transition: 'all 0.15s' }}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={async () => {
                  setConfirmModal(prev => ({ ...prev, show: false }));
                  if (confirmModal.onConfirm) await confirmModal.onConfirm();
                }}
                style={{
                  flex: 1, padding: '10px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#fff', transition: 'all 0.15s',
                  backgroundColor: confirmModal.type === 'delete' ? '#ef4444' : '#7B5233'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentCategoriesView;

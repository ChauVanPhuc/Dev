import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Trash2, Edit, Search, Filter, Layers, FileUp, FileDown, X, Save, AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';
import '@styles/components.css';

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
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeImageSlot, setActiveImageSlot] = useState(0);
  const imageInputRef = useRef(null);

  // Custom confirmation popup state
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'delete', // 'add', 'edit', 'delete'
    onConfirm: null
  });

  const defaultForm = {
    name: '', code: '', type: 'Đo lường', status: 'Bình thường',
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
  }, []);

  // Computed categories tree
  const computedCategoryTree = useMemo(() => {
    const treeMap = {};
    equipments.forEach(eq => {
      const type = eq.type || 'Khác';
      const name = eq.name || 'Không tên';
      if (!treeMap[type]) treeMap[type] = new Set();
      treeMap[type].add(name);
    });
    const tree = Object.keys(treeMap).map((type, index) => ({
      id: `cat-${index}`, name: type, children: Array.from(treeMap[type])
    }));
    return tree.length > 0 ? tree : [
      { id: 'mech', name: 'Thiết bị cơ', children: ['Thước cặp', 'Thước đo'] },
      { id: 'elec', name: 'Thiết bị điện tử', children: ['Thước cặp số', 'Máy đo độ ẩm'] }
    ];
  }, [equipments]);

  // Auto-select first category
  useEffect(() => {
    if (computedCategoryTree.length > 0) {
      const allChildren = computedCategoryTree.flatMap(c => c.children);
      if (!selectedCategoryNode || !allChildren.includes(selectedCategoryNode)) {
        setSelectedCategoryNode(allChildren[0] || null);
      }
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

  const handleDeleteImage = (index) => {
    const currentImages = parseImages(formData.images);
    while (currentImages.length <= index) currentImages.push('');
    currentImages[index] = '';
    setFormData({ ...formData, images: serializeImages(currentImages) });
  };

  const matchedEquipments = equipments.filter(eq => eq.name === selectedCategoryNode);

  // Styles
  const btnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' };
  const thStyle = { padding: '8px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textAlign: 'left', textTransform: 'uppercase' };

  return (
    <div style={{ padding: '5px 20px 20px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9', width: '100%', marginBottom: '10px', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} size={16} />
            <input type="text" placeholder="Nhập Họ và tên hoặc Mã NV" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 38px', border: '1.5px solid #EADCC9', borderRadius: '8px', outline: 'none', fontSize: '13px', backgroundColor: '#fff', color: '#7B5233' }} />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', border: 'none', background: 'none', cursor: 'pointer', color: '#7B5233' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"></path></svg>
          </button>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', border: 'none', background: 'none', cursor: 'pointer', color: '#7B5233' }}>
            <Filter size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowOtherMenu(!showOtherMenu)} style={btnStyle}><Layers size={14} /> Khác</button>
            {showOtherMenu && (
              <div style={{ position: 'absolute', top: '100%', right: '0', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '220px', padding: '8px 0', marginTop: '5px' }}>
                <div onClick={() => { navigate('/admin/equipment'); setShowOtherMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }} className="dropdown-hover">Quản lý thiết bị</div>
                <div onClick={() => { navigate('/admin/equipment/history'); setShowOtherMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }} className="dropdown-hover">Lịch sử kiểm tra, hiệu chuẩn</div>
                <div onClick={() => { navigate('/admin/equipment/training'); setShowOtherMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }} className="dropdown-hover">Thông tin đào tạo</div>
              </div>
            )}
          </div>
          <button style={btnStyle}><FileUp size={14} /> Nhập dữ liệu</button>
          <button style={btnStyle}><FileDown size={14} /> Xuất dữ liệu</button>
          <button onClick={() => navigate('/admin/equipment/handover')} style={btnStyle}><Plus size={14} /> Bàn giao</button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div style={{ padding: '12px 20px', borderRadius: '12px', marginBottom: '15px', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '600' }}>{message.text}</span>
          <X size={18} onClick={() => setMessage({type:'', text:''})} style={{ cursor: 'pointer', opacity: 0.5 }} />
        </div>
      )}

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
                    const firstMatchingEq = equipments.find(e => e.name === child);
                    return (
                      <div key={child} onClick={() => setSelectedCategoryNode(child)}
                        style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s',
                          backgroundColor: selectedCategoryNode === child ? '#FAF6F0' : 'transparent',
                          color: selectedCategoryNode === child ? '#7B5233' : '#475569',
                          border: selectedCategoryNode === child ? '1px solid #cbd5e1' : '1px solid transparent',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px'
                        }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{child}</span>
                        {firstMatchingEq && (
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <Edit size={13} onClick={(e) => { e.stopPropagation(); openEditModal(firstMatchingEq); }} style={{ cursor: 'pointer', color: '#7B5233' }} />
                            <Trash2 size={13} onClick={(e) => { e.stopPropagation(); handleDelete(firstMatchingEq); }} style={{ cursor: 'pointer', color: '#ef4444' }} />
                          </div>
                        )}
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
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '900', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
            Thông tin thiết bị: {selectedCategoryNode || '—'}
          </h3>

          {/* Equipment info */}
          {selectedEquipment && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div className="form-group"><label>Tên thiết bị</label><input type="text" className="form-control disabled-input" value={selectedCategoryNode} disabled /></div>
              <div className="form-group"><label>Loại thiết bị</label><input type="text" className="form-control disabled-input" value={selectedEquipment?.type || 'Khác'} disabled /></div>
              <div className="form-group"><label>Số lượng tổng</label><input type="number" className="form-control disabled-input" value={matchedEquipments.length} disabled /></div>
              <div className="form-group"><label>Trạng thái</label><input type="text" className="form-control disabled-input" value={selectedEquipment?.status || 'Bình thường'} disabled /></div>
            </div>
          )}

          {/* Equipment table */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#334155' }}>Danh sách chi tiết thiết bị</h4>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <th style={thStyle}>Mã</th>
                  <th style={thStyle}>Tên</th>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={thStyle}>Người sở hữu</th>
                  <th style={thStyle}>Ảnh</th>
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
                    </tr>
                  );
                })}
                {matchedEquipments.length === 0 && (
                  <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Không có thiết bị chi tiết nào thuộc nhóm này.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Manual steps builder */}
          <div>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '800', color: '#334155' }}>Hướng dẫn sử dụng</h4>
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
                  <option value="Đo lường">Đo lường</option><option value="Sản xuất">Sản xuất</option><option value="Khác">Khác</option>
                </select></div>
              <div className="form-group"><label>Trạng thái</label>
                <select className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="Bình thường">Bình thường</option><option value="Cần thay mới">Cần thay mới</option><option value="Bảo trì">Bảo trì</option><option value="Chưa kiểm tra">Chưa kiểm tra</option>
                </select></div>
              <div className="form-group"><label>Phòng ban</label>
                <input type="text" className="form-control" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} /></div>
              <div className="form-group"><label>Người sở hữu</label>
                <input type="text" className="form-control" value={formData.owner_name} onChange={(e) => setFormData({...formData, owner_name: e.target.value})} /></div>
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

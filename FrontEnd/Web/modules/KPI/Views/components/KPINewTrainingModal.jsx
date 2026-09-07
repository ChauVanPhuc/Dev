import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Trash2, Search, Check, Users, ShieldCheck } from 'lucide-react';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

/**
 * Modal KPINewTrainingModal (Tab 4 - Tạo/Chỉnh sửa Kế hoạch Đào tạo & Upload File Đính Kèm)
 * 1. Dấu X ở góc phải màn hình
 * 2. Mã khóa học chỉ đọc (read-only) không cho chỉnh sửa
 * 3. Upload nhiều file đính kèm
 * 4. List danh sách đối tượng tham gia QLCL chọn nhiều có tìm kiếm
 */
const KPINewTrainingModal = ({ isOpen, onClose, planData, onSave }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    code: `KH-ĐT-0${Math.floor(Math.random() * 90) + 10}`,
    name: '',
    time: '2026-09-15',
    teacher: 'Phạm Văn Trưởng QC',
    status: 'Sắp diễn ra'
  });

  // Selected participants (multi-select)
  const [selectedTargets, setSelectedTargets] = useState(['Nhân viên QC mới & Tổ trưởng']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTarget, setSearchTarget] = useState('');
  const [staffOptions, setStaffOptions] = useState([]);
  const dropdownRef = useRef(null);

  // Uploaded files list (multi-file)
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Default QLCL staff fallback list
  const defaultQlclStaff = [
    { full_name: 'Phạm Văn Trưởng QC', position: 'Trưởng phòng QLCL', department: 'Phòng QA/QC' },
    { full_name: 'Đặng Văn Nam', position: 'Kỹ thuật viên OQC', department: 'Phòng QA/QC', employee_id: 'LCL_001' },
    { full_name: 'Đặng Quý Hải', position: 'Kỹ thuật viên IQC', department: 'Phòng QA/QC', employee_id: 'LCL_002' },
    { full_name: 'Hà Đình Thành', position: 'Kỹ thuật viên PQC', department: 'Phòng QA/QC', employee_id: 'LCL_003' },
    { full_name: 'Đậu Thị Tâm', position: 'Nhân viên QC', department: 'QC Định Hình - Lắp Ráp', employee_id: 'LCL_004' },
    { full_name: 'Huỳnh Hoàng Sơn', position: 'Kỹ thuật viên PQC', department: 'QC Sơn - Đóng Gói', employee_id: 'LCL_005' },
    { full_name: 'Hồ Sỹ Khẩn', position: 'Tổ trưởng QC', department: 'Phòng QA/QC', employee_id: 'LCL_006' },
    { full_name: 'Phan Thị Lượng', position: 'Nhân viên QC', department: 'QC Sơn - Đóng Gói', employee_id: 'LCL_007' },
    { full_name: 'Đỗ Hữu Phúc', position: 'Nhân viên QC', department: 'QC Sơn - Đóng Gói', employee_id: 'LCL_008' },
    { full_name: 'Phạm Thị Mai', position: 'Nhân viên QC', department: 'QC Sơn - Đóng Gói', employee_id: 'LCL_009' },
    { full_name: 'Nguyễn Thị Mỹ Kim', position: 'Nhân viên QC', department: 'QC Sơn - Đóng Gói', employee_id: 'LCL_010' },
    { full_name: 'Lê Hoàng Anh', position: 'Kỹ thuật viên OQC', department: 'Phòng QA/QC', employee_id: 'NV_QLCL_004' },
    { full_name: 'Ngô Diễm My', position: 'Trưởng nhóm PQC', department: 'Phòng QA/QC', employee_id: 'NV_IT_002' },
    { full_name: 'Nhân viên QC mới & Tổ trưởng', position: 'Nhóm QLCL', department: 'Phòng QA/QC' },
    { full_name: 'Tổ trưởng QC & KCS', position: 'Bộ phận QLCL', department: 'Phòng QA/QC' }
  ];

  // Fetch accounts & KPI staff list to populate dropdown options
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const [accRes, kpiRes] = await Promise.allSettled([
          api.get('/accounts/?size=1000'),
          api.get('/kpi-management/employees')
        ]);

        const map = new Map();
        // Add defaults first
        defaultQlclStaff.forEach(s => map.set(s.full_name, s));

        if (accRes.status === 'fulfilled' && accRes.value) {
          const items = accRes.value?.items || (Array.isArray(accRes.value) ? accRes.value : []);
          items.forEach(acc => {
            if (acc.full_name) {
              const dept = acc.department || acc.department_name || '';
              const isQlcl = dept.toUpperCase().includes('QC') || dept.toUpperCase().includes('QA') || dept.toUpperCase().includes('QLCL') || dept.toUpperCase().includes('CHẤT LƯỢNG');
              if (isQlcl || !map.has(acc.full_name)) {
                map.set(acc.full_name, {
                  full_name: acc.full_name,
                  position: acc.role_name || acc.permission_name || 'Nhân sự QLCL',
                  department: dept || 'Phòng QA/QC',
                  employee_id: acc.employee_id
                });
              }
            }
          });
        }

        if (kpiRes.status === 'fulfilled' && kpiRes.value) {
          const items = kpiRes.value?.items || (Array.isArray(kpiRes.value) ? kpiRes.value : []);
          items.forEach(emp => {
            if (emp.full_name && !map.has(emp.full_name)) {
              map.set(emp.full_name, {
                full_name: emp.full_name,
                position: emp.position || 'Kỹ thuật viên',
                department: emp.department || 'Phòng QA/QC',
                employee_id: emp.employee_id
              });
            }
          });
        }

        setStaffOptions(Array.from(map.values()));
      } catch (e) {
        setStaffOptions(defaultQlclStaff);
      }
    };

    fetchStaff();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Populate data when editing
  useEffect(() => {
    if (planData) {
      setFormData({
        code: planData.code || 'KH-ĐT-01',
        name: planData.name || '',
        time: planData.time || '2026-09-15',
        teacher: planData.teacher || 'Phạm Văn Trưởng QC',
        status: planData.status || 'Sắp diễn ra'
      });

      // Parse target participants
      if (planData.target) {
        if (Array.isArray(planData.target)) {
          setSelectedTargets(planData.target);
        } else if (typeof planData.target === 'string') {
          setSelectedTargets(planData.target.split(',').map(s => s.trim()).filter(Boolean));
        }
      } else {
        setSelectedTargets(['Nhân viên QC mới & Tổ trưởng']);
      }

      // Parse files
      if (Array.isArray(planData.files) && planData.files.length > 0) {
        setSelectedFiles(planData.files);
      } else if (planData.fileName) {
        setSelectedFiles([{
          id: 1,
          name: planData.fileName,
          size: planData.fileSize || '1.24 MB',
          url: planData.fileUrl || null
        }]);
      } else {
        setSelectedFiles([]);
      }
    } else {
      setFormData({
        code: `KH-ĐT-0${Math.floor(Math.random() * 90) + 10}`,
        name: '',
        time: '2026-09-15',
        teacher: 'Phạm Văn Trưởng QC',
        status: 'Sắp diễn ra'
      });
      setSelectedTargets(['Nhân viên QC mới & Tổ trưởng']);
      setSelectedFiles([]);
    }
  }, [planData, isOpen]);

  // Target toggle handler
  const handleToggleTarget = (name) => {
    setSelectedTargets(prev => {
      if (prev.includes(name)) {
        return prev.filter(t => t !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleSelectAllQlcl = () => {
    const qlclNames = staffOptions.map(s => s.full_name);
    setSelectedTargets(qlclNames);
  };

  const handleClearTargets = () => {
    setSelectedTargets([]);
  };

  // Multi-file upload handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const newFiles = filesArray.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fileObject: file,
        url: URL.createObjectURL(file)
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = null;
  };

  const handleRemoveFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetString = selectedTargets.length > 0 ? selectedTargets.join(', ') : 'Tất cả nhân sự QLCL';
    const mainFileName = selectedFiles.length > 0 ? selectedFiles.map(f => f.name).join(', ') : (planData?.fileName || 'TaiLieuDaoTao_ISO.pdf');
    const mainFileUrl = selectedFiles.length > 0 ? selectedFiles[0].url : (planData?.fileUrl || null);

    if (onSave) {
      onSave({
        ...formData,
        id: planData ? planData.id : undefined,
        target: targetString,
        targetList: selectedTargets,
        files: selectedFiles,
        fileName: mainFileName,
        fileUrl: mainFileUrl,
        fileObject: selectedFiles[0]?.fileObject || null,
        fileSize: selectedFiles.length > 0 ? selectedFiles[0].size : '1.24 MB'
      });
    }
    onClose();
  };

  // Filter staff options for search
  const filteredStaffOptions = staffOptions.filter(s => {
    const q = searchTarget.toLowerCase();
    return (s.full_name || '').toLowerCase().includes(q) ||
           (s.position || '').toLowerCase().includes(q) ||
           (s.employee_id || '').toLowerCase().includes(q);
  });
  // Render compact target badges
  const renderTargetBadges = () => {
    if (selectedTargets.length === 0) {
      return <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>Chọn nhân viên / nhóm QLCL...</span>;
    }

    if (selectedTargets.length >= 6 && staffOptions.length > 0 && selectedTargets.length >= staffOptions.length - 2) {
      return (
        <span
          style={{
            backgroundColor: '#5D3B32',
            color: '#FFFFFF',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '0.73rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ✨ Tất cả {selectedTargets.length} nhân sự QLCL
        </span>
      );
    }

    if (selectedTargets.length > 2) {
      const visible = selectedTargets.slice(0, 2);
      const remaining = selectedTargets.length - 2;
      return (
        <>
          {visible.map((target, idx) => (
            <span
              key={idx}
              style={{
                backgroundColor: '#FAF6F0',
                border: '1px solid #EADCC9',
                color: '#7B5233',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.73rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {target}
              <X
                size={12}
                style={{ cursor: 'pointer', color: '#7B5233' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTarget(target);
                }}
              />
            </span>
          ))}
          <span
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1D4ED8',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.73rem',
              fontWeight: '700'
            }}
          >
            +{remaining} nhân sự khác
          </span>
        </>
      );
    }

    return selectedTargets.map((target, idx) => (
      <span
        key={idx}
        style={{
          backgroundColor: '#FAF6F0',
          border: '1px solid #EADCC9',
          color: '#7B5233',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.73rem',
          fontWeight: '700',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {target}
        <X
          size={12}
          style={{ cursor: 'pointer', color: '#7B5233' }}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleTarget(target);
          }}
        />
      </span>
    ));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box'
    }} onClick={onClose}>
      
      <div style={{
        margin: 'auto',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* 1. Header: Title on Left, Close X pinned on Far Right */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FAF6F0',
          width: '100%',
          boxSizing: 'border-box',
          flexShrink: 0
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#5D3B32', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📚 {planData ? 'Chỉnh sửa Kế hoạch Đào tạo' : 'Tạo Kế hoạch Đào tạo mới'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E2E8F0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
          
          {/* Row 1: Code (Read-Only) & Teacher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Mã khóa học *
              </label>
              <input
                type="text"
                value={formData.code}
                readOnly
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  fontWeight: '700',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Giảng viên / Đơn vị phụ trách *
              </label>
              <input
                type="text"
                value={formData.teacher}
                onChange={(e) => setFormData(prev => ({ ...prev, teacher: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          {/* Row 2: Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Tên chương trình đào tạo *
            </label>
            <input
              type="text"
              placeholder="VD: Huấn luyện Quy trình kiểm định ISO 9001:2015"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* Row 3: Target (Searchable Multi-Select List of QLCL Staff) & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px' }}>
            
            {/* Custom Multi-Select Dropdown for QLCL Staff */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Đối tượng tham gia (Nhân sự QLCL) *
              </label>
              
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  width: '100%',
                  minHeight: '38px',
                  maxHeight: '74px',
                  overflowY: 'auto',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.8rem',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', flex: 1 }}>
                  {renderTargetBadges()}
                </div>
                {selectedTargets.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearTargets();
                    }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px' }}
                    title="Xóa tất cả chọn"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown Menu Popup */}
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 10000,
                  maxHeight: '250px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* Search box & quick select toolbar */}
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FAF6F0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '4px 8px', borderRadius: '4px', border: '1px solid #EADCC9' }}>
                      <Search size={14} color="#7B5233" />
                      <input
                        type="text"
                        value={searchTarget}
                        onChange={(e) => setSearchTarget(e.target.value)}
                        placeholder="Tìm kiếm tên, vị trí hoặc mã NV..."
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.78rem', fontFamily: 'inherit' }}
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <button
                        type="button"
                        onClick={handleSelectAllQlcl}
                        style={{ border: 'none', background: 'none', color: '#7B5233', fontWeight: '800', cursor: 'pointer', padding: 0 }}
                      >
                        ✓ Chọn tất cả QLCL
                      </button>
                      <button
                        type="button"
                        onClick={handleClearTargets}
                        style={{ border: 'none', background: 'none', color: '#EF4444', fontWeight: '800', cursor: 'pointer', padding: 0 }}
                      >
                        ✕ Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Option list */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                    {filteredStaffOptions.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>
                        Không tìm thấy nhân sự QLCL phù hợp
                      </div>
                    ) : (
                      filteredStaffOptions.map((staff, idx) => {
                        const label = staff.full_name;
                        const isSelected = selectedTargets.includes(label);
                        return (
                          <div
                            key={idx}
                            onClick={() => handleToggleTarget(label)}
                            style={{
                              padding: '6px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                              fontSize: '0.78rem',
                              transition: 'background-color 0.15s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Controlled by row onClick
                                style={{ cursor: 'pointer', accentColor: '#7B5233' }}
                              />
                              <span style={{ fontWeight: isSelected ? '700' : '500', color: isSelected ? '#7B5233' : '#1E293B' }}>
                                {label}
                              </span>
                              {staff.position && (
                                <span style={{ fontSize: '0.68rem', color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>
                                  {staff.position}
                                </span>
                              )}
                            </div>
                            {isSelected && <Check size={14} color="#7B5233" strokeWidth={3} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Thời gian tổ chức *
              </label>
              <input
                type="date"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          {/* Row 4: Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Trạng thái khóa học *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="Sắp diễn ra">Sắp diễn ra</option>
              <option value="Đang mở đăng ký">Đang mở đăng ký</option>
              <option value="Đang diễn ra">Đang diễn ra</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
            </select>
          </div>

          {/* Row 5: Multi-file Upload Zone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Upload Tài liệu huấn luyện (Cho phép đính kèm nhiều file PDF / DOCX / XLSX)
            </label>
            
            <div style={{
              border: '2px dashed #CBD5E1',
              borderRadius: '8px',
              padding: '14px',
              textAlign: 'center',
              backgroundColor: '#FAF6F0',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
              <Upload size={24} style={{ color: '#7B5233', marginBottom: '4px' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#5D3B32' }}>
                Nhấp vào đây hoặc kéo thả file vào đây để chọn (Có thể chọn nhiều file)
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                Hỗ trợ định dạng .PDF, .DOCX, .XLSX, .PNG, .JPG (Tối đa 25MB/file)
              </div>
            </div>

            {/* List of uploaded files */}
            {selectedFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                <div style={{ fontSize: '0.73rem', fontWeight: '800', color: '#5D3B32' }}>
                  Danh sách file đã chọn ({selectedFiles.length} tệp):
                </div>
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      <FileText size={16} color="#7B5233" />
                      <span style={{ fontWeight: '700', color: '#1E293B' }}>{file.name}</span>
                      {file.size && (
                        <span style={{ fontSize: '0.68rem', color: '#64748B' }}>({file.size})</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#EF4444',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Xóa file này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '7px 18px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{ padding: '7px 22px', border: 'none', borderRadius: '6px', backgroundColor: '#5D3B32', color: '#FFFFFF', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {planData ? 'Cập nhật kế hoạch' : 'Lưu kế hoạch đào tạo'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default KPINewTrainingModal;

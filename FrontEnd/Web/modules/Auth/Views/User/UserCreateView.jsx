import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

// Icons mapping for screens
import {
  SCREEN_ICONS,
  PERM_RANK,
  LEGACY_RANK_MAP,
  parseDbPermission,
  permissionLevels
} from './components/UserScreenConfig';
import { buildPermissionGroupsFromSidebar, getGroupIcon } from './utils/permissionUtils';

const UserCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/users/create');

  // Cập nhật tiêu đề trang lên Layout Header
  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
  
  // Dữ liệu từ API
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [factories, setFactories] = useState([]);
  const [stages, setStages] = useState([]);
  
  // Trạng thái Form
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role_id: '',
    department_id: '',
    permission_id: '',
    factory_id: '',
    factory_name: '',
    stage_ids: [], // danh sách ID công đoạn được chọn
    permission_level: '', // Quyền hạn: Công Nhân, Nhân Viên, Quản Lý, Trưởng Phòng
    is_mobile_allowed: true, // Quyền truy cập ứng dụng Mobile
    status: 'Đang sử dụng'
  });


  const toggleMobileAccess = () => {
    setFormData(prev => ({
      ...prev,
      is_mobile_allowed: !prev.is_mobile_allowed
    }));
  };

  const toggleStatus = () => {
    setFormData(prev => ({
      ...prev,
      status: prev.status === 'Đang sử dụng' ? 'Dừng hoạt động' : 'Đang sử dụng'
    }));
  };

  // Trạng thái phân quyền chi tiết (screen_key -> [action, action, ...])
  const [screenPermissions, setScreenPermissions] = useState({});
  const [sidebarItems, setSidebarItems] = useState([]);
  const [screens, setScreens] = useState([]);
  // Lưu trữ phân quyền resolved ban đầu từ API để so sánh khi save
  const initialResolvedPerms = React.useRef({});

  const dynamicWebGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'web', screens);
  }, [sidebarItems, screens]);

  const dynamicMobileGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'mobile', screens);
  }, [sidebarItems, screens]);

  const [activeTab, setActiveTab] = useState('web');
  const [expandedGroups, setExpandedGroups] = useState({ 'web_0': true, 'mobile_0': true });
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Selected factory state for Phạm vi phụ trách
  const [selectedFactory, setSelectedFactory] = useState('');

  const getFactoryCode = (stageName) => {
    if (!stageName) return 'NM1';
    const match = stageName.match(/^(NM\d+)/i);
    return match ? match[1].toUpperCase() : 'NM1';
  };

  const uniqueFactories = useMemo(() => {
    const list = new Set();
    stages.forEach(s => {
      list.add(getFactoryCode(s.name));
    });
    return Array.from(list).sort();
  }, [stages]);

  const [syncing, setSyncing] = useState(false);

  const handleAutoSync = async () => {
    if (!formData.employee_id) {
      return;
    }
    setSyncing(true);
    try {
      const response = await api.get(`/employees/by-code/${formData.employee_id}`);
      const employee = response.data || response;
      
      setFormData(prev => {
        const fetchedName = employee.full_name;
        const generatedUser = generateUsername(fetchedName);
        return {
          ...prev,
          full_name: fetchedName,
          phone: prev.phone || employee.phone || '',
          email: prev.email || employee.email || '',
          username: generatedUser,
          role_id: employee.role_id ? String(employee.role_id) : prev.role_id,
          permission_id: employee.permission_id ? String(employee.permission_id) : prev.permission_id
        };
      });
      setToastMessage('Đồng bộ dữ liệu nhân sự thành công!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi đồng bộ hoặc mã nhân viên không tồn tại.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  const generateNoCodeEmployeeId = async () => {
    try {
      const accounts = await api.get('/accounts/');
      let maxNum = 0;
      accounts.forEach(acc => {
        const empId = acc.employee_id || '';
        if (empId.startsWith('SF')) {
          const num = parseInt(empId.slice(2), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const nextNum = maxNum + 1;
      const nextStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
      setFormData(prev => ({
        ...prev,
        employee_id: `SF${nextStr}`
      }));
      setToastMessage(`Đã sinh mã nhân viên mặc định: SF${nextStr}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setFormData(prev => ({
        ...prev,
        employee_id: 'SF01'
      }));
    }
  };

  useEffect(() => {
    if (uniqueFactories.length > 0) {
      if (!selectedFactory || !uniqueFactories.includes(selectedFactory)) {
        setSelectedFactory(uniqueFactories[0]);
      }
    } else {
      setSelectedFactory('');
    }
  }, [uniqueFactories, selectedFactory]);

  const filteredStages = useMemo(() => {
    if (!selectedFactory) return stages;
    const matching = stages.filter(s => getFactoryCode(s.name) === selectedFactory);
    const seen = new Set();
    const result = [];
    for (const s of matching) {
      const cleanName = s.name.replace(/^NM\d+\s*[-:]\s*/i, '').trim();
      if (!seen.has(cleanName)) {
        seen.add(cleanName);
        result.push({
          ...s,
          displayName: cleanName
        });
      }
    }
    return result;
  }, [stages, selectedFactory]);

  // 1. Tải danh mục Roles, Factories, Sidebar và Screens khi mount
  useEffect(() => {
    const initData = async () => {
      try {
        const [rolesRes, sidebarRes, screensRes, factoriesRes, permsRes] = await Promise.all([
          api.get('/roles/'),
          api.get('/system/sidebar/all'),
          api.get('/screens'),
          api.get('/hr/factory-structures').catch(() => []),
          api.get('/permissions/?include_inactive=false').catch(() => [])
        ]);
        setRoles(rolesRes || []);
        setSidebarItems(sidebarRes || []);
        setScreens(screensRes || []);
        if (permsRes && permsRes.length > 0) {
          setPermissions(permsRes);
        }
        
        const parsedFactories = (factoriesRes && factoriesRes.length > 0) 
          ? factoriesRes 
          : [
              { id: 1, structure_name: 'Văn Phòng', structure_code: 'VP' },
              { id: 2, structure_name: 'Nhà máy 1', structure_code: 'NM1' },
              { id: 3, structure_name: 'Nhà máy 2', structure_code: 'NM2' }
            ];
        setFactories(parsedFactories);

        // Khởi tạo phân quyền ban đầu: mặc định là 'none' (Chặn)
        const webGroups = buildPermissionGroupsFromSidebar(sidebarRes || [], 'web', screensRes || []);
        const mobileGroups = buildPermissionGroupsFromSidebar(sidebarRes || [], 'mobile', screensRes || []);

        const initialPerms = {};
        webGroups.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = ['none'];
          });
        });
        mobileGroups.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = ['none'];
          });
        });
        initialResolvedPerms.current = JSON.parse(JSON.stringify(initialPerms));
        setScreenPermissions(initialPerms);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
      }
    };
    initData();
  }, []);

  // 1.1 Tự động load quyền mặc định khi thay đổi Role, Permission, Level để cập nhật UI
  useEffect(() => {
    const fetchDefaultPermissions = async () => {
      try {
        const queryParams = [];
        if (formData.role_id) queryParams.push(`role_id=${formData.role_id}`);
        if (formData.permission_id) queryParams.push(`permission_id=${formData.permission_id}`);
        if (formData.permission_level) queryParams.push(`permission_level=${encodeURIComponent(formData.permission_level)}`);
        
        const url = `/accounts/permissions/default?${queryParams.join('&')}`;
        const res = await api.get(url);
        const dbPerms = res.permissions || {};
        
        const initialPerms = {};
        dynamicWebGroups.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
          });
        });
        dynamicMobileGroups.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
          });
        });
        
        initialResolvedPerms.current = JSON.parse(JSON.stringify(initialPerms));
        setScreenPermissions(initialPerms);
      } catch (err) {
        console.error('Lỗi khi tải phân quyền mặc định:', err);
      }
    };
    
    if (formData.role_id || formData.permission_id || formData.permission_level) {
      fetchDefaultPermissions();
    }
  }, [formData.role_id, formData.permission_id, formData.permission_level, dynamicWebGroups, dynamicMobileGroups]);

  // 2. Khi Role (Phòng Ban) thay đổi -> Lấy danh sách Departments (Bộ Phận) và Permissions (Vị Trí)
  useEffect(() => {
    if (formData.role_id) {
      // Load departments (Bộ phận)
      api.get(`/departments/?role_id=${formData.role_id}`)
        .then(data => setDepartments(Array.isArray(data) ? data : []))
        .catch(err => {
          console.error('Lỗi khi tải Departments:', err);
          setDepartments([]);
        });

      // Load permissions (Vị trí): lấy danh sách tất cả các vị trí đang hoạt động trong hệ thống
      api.get('/permissions/?include_inactive=false')
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setPermissions(data);
          }
        })
        .catch(err => {
          console.error('Lỗi khi tải Permissions:', err);
        });

      setFormData(prev => ({
        ...prev,
        department_id: '',
        permission_id: '', // Để trống để người dùng chủ động chọn vị trí mong muốn
        stage_ids: []
      }));
      setStages([]);
    } else {
      setDepartments([]);
      setStages([]);
      setFormData(prev => ({ ...prev, department_id: '', permission_id: '', stage_ids: [] }));
    }
  }, [formData.role_id]);


  // 3. Khi Permission thay đổi -> Lấy danh sách Stages (có fallback tự động nếu trống)
  useEffect(() => {
    if (formData.permission_id) {
      const fetchStages = async () => {
        try {
          let data = await api.get(`/permissions/${formData.permission_id}/stages`);
          if (!data || data.length === 0) {
            data = await api.get('/stages/');
          }
          setStages(Array.isArray(data) ? data : []);
          setFormData(prev => ({ ...prev, stage_ids: [] }));
        } catch (err) {
          console.error('Lỗi khi tải Stages:', err);
          try {
            const fallback = await api.get('/stages/');
            setStages(Array.isArray(fallback) ? fallback : []);
          } catch (e) {}
        }
      };
      fetchStages();
    } else {
      setStages([]);
    }
  }, [formData.permission_id]);

  // Mở rộng các nhóm accordion tự động khi tìm kiếm
  useEffect(() => {
    if (searchQuery) {
      const nextExpanded = { ...expandedGroups };
      dynamicWebGroups.forEach((group, index) => {
        const hasMatch = group.screens.some(s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.key.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (hasMatch) {
          nextExpanded[`web_${index}`] = true;
        }
      });
      dynamicMobileGroups.forEach((group, index) => {
        const hasMatch = group.screens.some(s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.key.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (hasMatch) {
          nextExpanded[`mobile_${index}`] = true;
        }
      });
      setExpandedGroups(nextExpanded);
    }
  }, [searchQuery, dynamicWebGroups, dynamicMobileGroups]);

  const generateUsername = (fullName) => {
    if (!fullName) return '';
    const removeVietnameseTones = (str) => {
      str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
      str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
      str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
      str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
      str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
      str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
      str = str.replace(/đ/g,"d");
      str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
      str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
      str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
      str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
      str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
      str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
      str = str.replace(/Đ/g, "D");
      return str;
    };
    
    const cleanName = removeVietnameseTones(fullName).trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length === 0) return '';
    
    const firstName = parts[parts.length - 1];
    let middleAndLastName = '';
    if (parts.length > 1) {
      middleAndLastName += parts[0].charAt(0).toUpperCase();
      for (let i = 1; i < parts.length - 1; i++) {
        middleAndLastName += parts[i].charAt(0).toUpperCase();
      }
    }
    
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const randomNum = Math.floor(100 + Math.random() * 900); 
    
    return `${formattedFirstName}${middleAndLastName}${randomNum}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Validate phone: only allow digits, + sign
    if (name === 'phone') {
      const cleaned = value.replace(/[^0-9+]/g, '');
      // Only allow + at the beginning
      const sanitized = cleaned.charAt(0) === '+' 
        ? '+' + cleaned.slice(1).replace(/\+/g, '') 
        : cleaned.replace(/\+/g, '');
      setFormData(prev => ({ ...prev, phone: sanitized }));
      return;
    }
    setFormData(prev => {
      const updates = { [name]: value };
      if (name === 'full_name') {
        updates.username = generateUsername(value);
      }
      return {
        ...prev,
        ...updates
      };
    });
  };

  const handleStageCheckboxChange = (stageId, checked) => {
    setFormData(prev => {
      const currentIds = prev.stage_ids || [];
      if (checked) {
        return { ...prev, stage_ids: [...currentIds, stageId] };
      } else {
        return { ...prev, stage_ids: currentIds.filter(id => id !== stageId) };
      }
    });
  };

  // Logic kiểm soát checkbox độc lập
  const isCheckboxChecked = (screenKey, levelKey) => {
    const currentPerms = screenPermissions[screenKey] || [];
    if (levelKey === 'none') {
      return currentPerms.includes('none') || currentPerms.length === 0;
    }
    return currentPerms.includes(levelKey);
  };

  const handleCheckboxClick = (screenKey, clickedLevel) => {
    setScreenPermissions(prev => {
      const currentPerms = prev[screenKey] || [];
      let newPerms = [];

      if (clickedLevel === 'none') {
        newPerms = ['none'];
      } else {
        const filtered = currentPerms.filter(p => p !== 'none');
        if (filtered.includes(clickedLevel)) {
          newPerms = filtered.filter(p => p !== clickedLevel);
        } else {
          newPerms = [...filtered, clickedLevel];
        }
        if (newPerms.length === 0) {
          newPerms = ['none'];
        }
      }

      return {
        ...prev,
        [screenKey]: newPerms
      };
    });
  };

  // Logic radio toggle Cho phép / Không cho phép ở header nhóm cha
  const isGroupAllowed = (groupIdx, isMobile = false) => {
    const groups = isMobile ? dynamicMobileGroups : dynamicWebGroups;
    const group = groups[groupIdx];
    if (!group) return false;
    return group.screens.some(s => {
      const perms = screenPermissions[s.key] || [];
      return perms.length > 0 && !perms.includes('none');
    });
  };

  const handleGroupToggle = (groupIdx, allow, isMobile = false) => {
    const groups = isMobile ? dynamicMobileGroups : dynamicWebGroups;
    const group = groups[groupIdx];
    if (!group) return;
    setScreenPermissions(prev => {
      const next = { ...prev };
      group.screens.forEach(s => {
        next[s.key] = allow ? ['read'] : ['none'];
      });
      return next;
    });
  };

  const isRowAllChecked = (screenKey) => {
    const current = screenPermissions[screenKey] || [];
    const lvlKeys = ['read', 'create', 'edit', 'delete', 'approve', 'export_import'];
    return lvlKeys.every(lvl => current.includes(lvl));
  };

  const handleRowAllClick = (screenKey) => {
    setScreenPermissions(prev => {
      const isAll = isRowAllChecked(screenKey);
      return {
        ...prev,
        [screenKey]: isAll ? ['none'] : ['read', 'create', 'edit', 'delete', 'approve', 'export_import']
      };
    });
  };

  const isHeaderChecked = (screensInGroup, levelKey) => {
    if (screensInGroup.length === 0) return false;
    if (levelKey === 'all') {
      const actions = ['read', 'create', 'edit', 'delete', 'approve', 'export_import'];
      return screensInGroup.every(scr => {
        const cur = screenPermissions[scr.key] || [];
        return actions.every(act => cur.includes(act));
      });
    }
    return screensInGroup.every(scr => {
      const cur = screenPermissions[scr.key] || [];
      return cur.includes(levelKey);
    });
  };

  const handleHeaderToggle = (screensInGroup, levelKey) => {
    setScreenPermissions(prev => {
      const next = { ...prev };
      
      if (levelKey === 'all') {
        const actions = ['read', 'create', 'edit', 'delete', 'approve', 'export_import'];
        let allSelected = true;
        screensInGroup.forEach(scr => {
          const cur = prev[scr.key] || [];
          actions.forEach(act => {
            if (!cur.includes(act)) allSelected = false;
          });
        });
        
        screensInGroup.forEach(scr => {
          next[scr.key] = allSelected ? ['none'] : [...actions];
        });
      } else {
        let allSelected = true;
        screensInGroup.forEach(scr => {
          const cur = prev[scr.key] || [];
          if (!cur.includes(levelKey)) allSelected = false;
        });
        
        screensInGroup.forEach(scr => {
          const cur = prev[scr.key] || [];
          const filtered = cur.filter(p => p !== 'none');
          let nextPerms = [];
          if (allSelected) {
            nextPerms = filtered.filter(p => p !== levelKey);
          } else {
            if (!filtered.includes(levelKey)) {
              nextPerms = [...filtered, levelKey];
            } else {
              nextPerms = filtered;
            }
          }
          next[scr.key] = nextPerms.length === 0 ? ['none'] : nextPerms;
        });
      }
      
      return next;
    });
  };

  const renderPermissionButton = ({ label, isChecked, onClick, isDisabled = false }) => {
    if (isDisabled) {
      return (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '32px',
            borderRadius: '6px',
            border: '1.5px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            color: '#94A3B8',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'not-allowed',
            userSelect: 'none',
            width: '95px',
            boxSizing: 'border-box'
          }}
        >
          <span>🚫</span> {label}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '32px',
          borderRadius: '6px',
          border: isChecked ? '1.5px solid #10B981' : '1.5px solid #EADCC9',
          backgroundColor: isChecked ? '#EBFDF5' : '#FFFFFF',
          color: isChecked ? '#047857' : '#2D1A12',
          fontSize: '0.78rem',
          fontWeight: '700',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          width: '95px',
          boxSizing: 'border-box',
          outline: 'none'
        }}
      >
        <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '3px',
          border: isChecked ? '1.5px solid #10B981' : '1.5px solid #EADCC9',
          backgroundColor: isChecked ? '#10B981' : 'transparent',
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isChecked && (
            <span style={{
              width: '3px',
              height: '6px',
              border: 'solid white',
              borderWidth: '0 1.5px 1.5px 0',
              transform: 'rotate(45deg)',
              marginBottom: '1px'
            }} />
          )}
        </span>
        {label}
      </button>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.phone || !formData.phone.trim()) {
      toast('warning', 'Nhắc nhở: Chưa nhập Số điện thoại cho tài khoản (không bắt buộc).');
    }
    setShowConfirmModal(true);
  };

  const handleConfirmCreate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Làm sạch dữ liệu trước khi gửi
      const dataToSend = { 
        ...formData,
        username: (formData.username && formData.username.trim()) ? formData.username.trim() : (formData.full_name ? generateUsername(formData.full_name) : ''),
        full_name: (formData.full_name && formData.full_name.trim()) ? formData.full_name.trim() : null,
        email: (formData.email && formData.email.trim()) ? formData.email.trim() : null,
        phone: (formData.phone && formData.phone.trim()) ? formData.phone.trim() : null,
        is_active: formData.status === 'Đang sử dụng',
        is_mobile_allowed: formData.is_mobile_allowed
      };

      if (!dataToSend.phone) delete dataToSend.phone;
      if (!dataToSend.email) delete dataToSend.email;
      if (!dataToSend.employee_id) delete dataToSend.employee_id;
      
      // Chuyển các trường ID từ chuỗi rỗng thành số hoặc null
      ['role_id', 'department_id', 'permission_id', 'factory_id'].forEach(field => {
        if (!dataToSend[field] || dataToSend[field] === '') {
          dataToSend[field] = null;
        } else {
          dataToSend[field] = parseInt(dataToSend[field], 10);
        }
      });

      // Kiểm tra xem Chức vụ được chọn có phải NV SX hoặc NV QC không
      const selectedPerm = permissions.find(p => p.id === dataToSend.permission_id);
      const isProductionOrQC = selectedPerm && (selectedPerm.name === 'NV SX' || selectedPerm.name === 'NV QC');

      if (isProductionOrQC) {
        dataToSend.permission_level = null;
        // Chuyển danh sách stage_ids thành integers hoặc null
        if (dataToSend.stage_ids && dataToSend.stage_ids.length > 0) {
          dataToSend.stage_ids = dataToSend.stage_ids.map(id => parseInt(id, 10));
          dataToSend.stage_id = dataToSend.stage_ids[0];
        } else {
          dataToSend.stage_ids = null;
          dataToSend.stage_id = null;
        }
      } else {
        dataToSend.stage_ids = null;
        dataToSend.stage_id = null;
        if (!dataToSend.permission_level || dataToSend.permission_level === '') {
          dataToSend.permission_level = null;
        }
      }

      console.log('Gửi dữ liệu tạo tài khoản:', dataToSend);
      
      // 1. Tạo tài khoản (POST)
      const newAccount = await api.post('/accounts/', dataToSend);
      const newId = newAccount.id;

      // 2. Chuẩn bị bảng phân quyền chi tiết (Chỉ lưu các override thực tế so với mặc định)
      const permissionsToSave = {};
      const initialPerms = initialResolvedPerms.current || {};
      Object.keys(screenPermissions).forEach(key => {
        const currentPerms = screenPermissions[key] || [];
        const initialPermsForKey = initialPerms[key] || [];
        
        const currentSorted = [...currentPerms].sort().join(',');
        const initialSorted = [...initialPermsForKey].sort().join(',');
        
        if (currentSorted !== initialSorted) {
          permissionsToSave[key] = currentPerms.includes('none') || currentPerms.length === 0 
            ? 'none' 
            : currentPerms.join(',');
        }
      });

      // 3. Đồng bộ phân quyền màn hình chi tiết (PUT)
      await api.put(`/accounts/${newId}/permissions`, {
        permissions: permissionsToSave
      });

      setSuccess(true);
      setToastMessage('Tạo mới tài khoản và phân quyền thành công!');
      setTimeout(() => {
        setToastMessage(null);
        navigate('/admin/users');
      }, 2000);
    } catch (err) {
      console.error('Lỗi khi tạo tài khoản:', err);
      let detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(item => `${item.loc?.[item.loc?.length - 1] || 'Trường'}: ${item.msg}`).join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        detail = JSON.stringify(detail);
      }
      const errMsg = detail || 'Có lỗi xảy ra khi tạo tài khoản. Hãy kiểm tra lại dữ liệu.';
      setError(errMsg);
      toast('error', errMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="user-create-container">
      <div className="create-content-wrapper">
        {error && <div className="error-message">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}
        {toastMessage && <div className="success-message" style={{ backgroundColor: '#EBFDF5', color: '#047857', padding: '10px 16px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', border: '1px solid #A7F3D0', fontWeight: '600' }}>{toastMessage}</div>}
        
        <form onSubmit={handleSubmit} className="create-form-vertical-layout">
          
          {/* CARD 1: THÔNG TIN NGƯỜI DÙNG & PHÂN QUYỀN PHÂN CẤP */}
          <div className="account-info-card card" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1.5px solid #F5EDE4', paddingBottom: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#FAF6F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233',
                border: '1.5px solid #EADCC9',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#7B5233' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 className="section-title" style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>Thông tin người dùng</h3>
                  <button 
                    type="button" 
                    className="btn-link-sync" 
                    onClick={generateNoCodeEmployeeId} 
                  >
                    Tạo tài khoản không có mã nhân viên
                  </button>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#8C7B72', fontWeight: 500 }}>Nhập thông tin người dùng và tài khoản đăng nhập hệ thống.</span>
              </div>
            </div>

            <div className="account-info-grid">
              {/* Cột trái: Avatar & Nút thao tác nhanh */}
              <div className="avatar-actions-column">
                <div className="avatar-wrapper">
                  <div className="avatar-circle">
                    {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="user-name-subtitle">{formData.full_name || 'Họ và tên'}</div>
                </div>
                
                <div className="avatar-buttons">
                  <button 
                    type="button" 
                    className={`btn-action-custom btn-status ${formData.status === 'Đang sử dụng' ? 'active' : 'suspended'}`}
                    onClick={toggleStatus}
                  >
                    <span className="status-indicator-dot"></span>
                    {formData.status === 'Đang sử dụng' ? 'Kích hoạt' : 'Tạm dừng hoạt động'}
                  </button>

                  <button 
                    type="button" 
                    className={`btn-action-custom btn-status ${formData.is_mobile_allowed ? 'active' : 'suspended'}`}
                    onClick={toggleMobileAccess}
                    style={{ marginTop: '8px', backgroundColor: formData.is_mobile_allowed ? '#EFF6FF' : '#FEF2F2', color: formData.is_mobile_allowed ? '#1D4ED8' : '#DC2626', borderColor: formData.is_mobile_allowed ? '#BFDBFE' : '#FCA5A5' }}
                  >
                    <span className="status-indicator-dot" style={{ backgroundColor: formData.is_mobile_allowed ? '#2563EB' : '#DC2626' }}></span>
                    {formData.is_mobile_allowed ? 'Cho phép vào Mobile' : 'Chặn vào Mobile'}
                  </button>
                </div>
              </div>

              {/* Cột phải: Các trường nhập liệu & Phân quyền phân cấp */}
              <div className="inputs-column">
                <div className="form-inputs-grid">
                  <div className="form-group">
                    <label>Mã nhân viên</label>
                    <div className="input-with-button">
                      <input 
                        type="text" 
                        name="employee_id" 
                        placeholder="VD: 1245" 
                        value={formData.employee_id}
                        onChange={handleChange}
                        onBlur={handleAutoSync}
                        required
                      />
                      <button 
                        type="button" 
                        className="btn-sync-input" 
                        onClick={handleAutoSync} 
                        title="Đồng bộ thông tin tự động"
                        disabled={syncing}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Họ và tên</label>
                    <input 
                      type="text" 
                      name="full_name" 
                      placeholder="VD: Nguyễn Văn A" 
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tên đăng nhập (Username)</label>
                    <input 
                      type="text" 
                      name="username" 
                      placeholder="VD: anv01" 
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="VD: anv01@mail.com" 
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Số điện thoại <span style={{ fontSize: '0.75rem', color: '#8C7B72', fontWeight: 'normal' }}>(Không bắt buộc)</span></label>
                    <input 
                      type="tel" 
                      name="phone" 
                      placeholder="VD: 0987654321 hoặc +84987654321" 
                      value={formData.phone}
                      onChange={handleChange}
                      inputMode="tel"
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="*******" 
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Đường phân cách ngang mỏng */}
                <div style={{ borderTop: '1.5px solid #F5EDE4', margin: '20px 0' }}></div>

                {/* PHÂN QUYỀN PHÂN CẤP */}
                <div style={{ width: '100%', boxSizing: 'border-box' }}>
                  <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', borderBottom: '1.5px solid #F5EDE4', paddingBottom: '12px', marginBottom: '20px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#FAF6F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#7B5233',
                      border: '1.5px solid #EADCC9',
                      flexShrink: 0
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#7B5233' }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <h3 className="section-title" style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>Phân quyền 4 tầng</h3>
                      <span style={{ fontSize: '0.78rem', color: '#8C7B72', fontWeight: 500 }}>Thiết lập cấu trúc: Phòng Ban → Bộ Phận → Vị Trí → Nhà Máy.</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 18px', marginBottom: '20px' }}>
                    {/* 1. Phòng Ban */}
                    <div className="form-group">
                      <label>1. Phòng Ban <span className="required" style={{ color: '#E11D48' }}>*</span></label>
                      <select name="role_id" value={formData.role_id} onChange={handleChange} required>
                        <option value="">-- Chọn Phòng Ban --</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Bộ Phận */}
                    <div className={`form-group ${!formData.role_id ? 'disabled' : ''}`}>
                      <label>2. Bộ Phận</label>
                      <select 
                        name="department_id" 
                        value={formData.department_id} 
                        onChange={handleChange}
                        disabled={!formData.role_id}
                      >
                        <option value="">-- Chọn Bộ Phận --</option>
                        {departments?.map(d => (
                          <option key={d.id} value={d.id}>{d.name || d.code}</option>
                        ))}
                      </select>
                      {!formData.role_id && <small className="hint">Hãy chọn Phòng Ban trước</small>}
                    </div>

                    {/* 3. Vị Trí / Chức Vụ */}
                    <div className={`form-group ${!formData.role_id ? 'disabled' : ''}`}>
                      <label>3. Vị Trí / Chức Vụ <span className="required" style={{ color: '#E11D48' }}>*</span></label>
                      <select 
                        name="permission_id" 
                        value={formData.permission_id} 
                        onChange={handleChange} 
                        disabled={!formData.role_id}
                        required
                      >
                        <option value="">-- Chọn Vị Trí / Chức Vụ --</option>
                        {permissions.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {!formData.role_id && <small className="hint">Hãy chọn Phòng Ban trước</small>}
                    </div>

                    {/* 4. Nhà Máy */}
                    <div className="form-group">
                      <label>4. Nhà Máy</label>
                      <select 
                        name="factory_id" 
                        value={formData.factory_id} 
                        onChange={(e) => {
                          const selId = e.target.value;
                          const found = factories.find(f => String(f.id) === String(selId));
                          setFormData(prev => ({
                            ...prev,
                            factory_id: selId,
                            factory_name: found ? (found.structure_name || found.name || found.structure_code) : ''
                          }));
                        }}
                      >
                        <option value="">-- Chọn Nhà Máy --</option>
                        {factories.map(f => (
                          <option key={f.id} value={f.id}>{f.structure_name || f.name || f.structure_code}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* PHÂN QUYỀN CHI TIẾT: CÔNG ĐOẠN PHỤ TRÁCH */}
                  {formData.permission_id && (
                    (() => {
                      const selectedPerm = permissions.find(p => p.id === parseInt(formData.permission_id));
                      const isProductionOrQC = selectedPerm && (selectedPerm.name === 'NV SX' || selectedPerm.name === 'NV QC');

                      if (isProductionOrQC && stages.length > 0) {
                        return (
                          <div style={{ borderTop: '1.5px solid #F5EDE4', paddingTop: '20px', marginTop: '10px' }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                width: '100%', 
                                marginBottom: '12px',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div>
                                    <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#5D4037', margin: 0 }}>
                                        Phạm vi phụ trách (Công đoạn sản xuất)
                                    </label>
                                    <div style={{ fontSize: '0.75rem', color: '#8C7A6B', marginTop: '2px' }}>
                                        Chọn công đoạn tùy theo nhà máy để chọn phạm vi phụ trách.
                                    </div>
                                </div>
                                
                                {/* Factory Selector */}
                                {uniqueFactories.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7B5233' }}>Chọn nhà máy</span>
                                        <div style={{ display: 'inline-flex', border: '1px solid #EADCC9', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FAF6F0' }}>
                                            {uniqueFactories.map(fac => {
                                                const isActive = selectedFactory === fac;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={fac}
                                                        onClick={() => setSelectedFactory(fac)}
                                                        style={{
                                                            padding: '6px 16px',
                                                            border: 'none',
                                                            backgroundColor: isActive ? '#7B5233' : 'transparent',
                                                            color: isActive ? '#FFFFFF' : '#7B5233',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s',
                                                            borderLeft: fac !== uniqueFactories[0] ? '1px solid #EADCC9' : 'none'
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            border: `1.5px solid ${isActive ? '#FFFFFF' : '#7B5233'}`,
                                                            backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                                                            display: 'inline-block'
                                                        }} />
                                                        {fac}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="stages-checkbox-grid">
                              {filteredStages.map(s => (
                                <label key={s.id} className="stage-checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                                  <input 
                                    type="checkbox"
                                    checked={formData.stage_ids.includes(s.id)}
                                    onChange={(e) => handleStageCheckboxChange(s.id, e.target.checked)}
                                    style={{ margin: 0, width: '15px', height: '15px', accentColor: '#7B5233', cursor: 'pointer' }}
                                  />
                                  <span>{s.displayName || s.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>



          {/* PHẦN 3: PHÂN QUYỀN CHI TIẾT TRÊN TỪNG MÀN HÌNH */}
          <div className="permissions-card card">
            <div className="card-header-row">
              <h3 className="section-title">Phân quyền chi tiết</h3>
              
              <div className="permissions-header-actions">
                <div className="search-box-wrapper">
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Tìm nhanh màn hình..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-field"
                  />
                </div>
              </div>
            </div>

            {/* Platform selection tabs */}
            <div className="permissions-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #FAF6F0', paddingBottom: '12px', marginTop: '10px' }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'web' ? 'active' : ''}`}
                onClick={() => setActiveTab('web')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: activeTab === 'web' ? '#7B5233' : '#FAF6F0',
                  color: activeTab === 'web' ? '#FFFFFF' : '#7B5233',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  outline: 'none'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Phân quyền Web
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'mobile' ? 'active' : ''}`}
                onClick={() => setActiveTab('mobile')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: activeTab === 'mobile' ? '#7B5233' : '#FAF6F0',
                  color: activeTab === 'mobile' ? '#FFFFFF' : '#7B5233',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  outline: 'none'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                Phân quyền Mobile
              </button>
            </div>

            <div className="accordion-list">
              {(() => {
                const isMobileTab = activeTab === 'mobile';
                const activeGroups = isMobileTab ? dynamicMobileGroups : dynamicWebGroups;

                // Kiểm định số màn hình tìm kiếm khớp
                const totalMatches = activeGroups.reduce((sum, group) => {
                  const matches = group.screens.filter(s =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.key.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  return sum + matches.length;
                }, 0);

                if (searchQuery && totalMatches === 0) {
                  return (
                    <div className="empty-search-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <p>Không tìm thấy màn hình nào phù hợp với từ khóa tìm kiếm.</p>
                    </div>
                  );
                }

                return activeGroups.map((group, groupIdx) => {
                  const screensInGroup = group.screens.filter(s =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.key.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (searchQuery && screensInGroup.length === 0) {
                    return null;
                  }

                  const isAllowed = isGroupAllowed(groupIdx, isMobileTab);
                  const isExpanded = !!expandedGroups[`${activeTab}_${groupIdx}`];

                  return (
                    <div key={groupIdx} className={`accordion-group ${isExpanded ? 'is-expanded' : ''} ${isAllowed ? 'group-allowed' : 'group-blocked'}`}>
                      {/* Accordion Header */}
                      <div 
                        className="accordion-header"
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [`${activeTab}_${groupIdx}`]: !prev[`${activeTab}_${groupIdx}`] }))}
                      >
                        <div className="accordion-header-left">
                          <span className={`chevron-icon ${isExpanded ? 'rotated' : ''}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </span>
                          <span className="group-icon-wrapper">
                            {getGroupIcon(group.title)}
                          </span>
                          <h4 className="group-title">{group.title}</h4>
                        </div>

                        {/* Cho phép / Không cho phép Radio toggles */}
                        <div className="group-allow-toggle" onClick={(e) => e.stopPropagation()}>
                          <label className={`radio-label ${isAllowed ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name={`group-allow-${activeTab}-${groupIdx}`} 
                              checked={isAllowed} 
                              onChange={() => handleGroupToggle(groupIdx, true, isMobileTab)}
                            />
                            <span className="radio-custom"></span>
                            Cho phép
                          </label>
                          <label className={`radio-label ${!isAllowed ? 'active-blocked' : ''}`}>
                            <input 
                              type="radio" 
                              name={`group-allow-${activeTab}-${groupIdx}`} 
                              checked={!isAllowed} 
                              onChange={() => handleGroupToggle(groupIdx, false, isMobileTab)}
                            />
                            <span className="radio-custom"></span>
                            Không cho phép
                          </label>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="accordion-body">
                          {isAllowed ? (
                            <div className="accordion-body-list">

                              {screensInGroup.map((screen, sIdx) => {
                                const isRowAll = isRowAllChecked(screen.key);
                                return (
                                  <div key={sIdx} className="permission-screen-row" style={{ padding: '12px 16px', borderBottom: '1px solid #FAF6F0' }}>
                                    <div className="screen-info-left">
                                      <div className="screen-icon-box">
                                        {SCREEN_ICONS[screen.key] || (
                                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                          </svg>
                                        )}
                                      </div>
                                      <div className="screen-text-details">
                                        <div className="screen-title-row">
                                          <span className="screen-title-name">{screen.name}</span>
                                          <code className="screen-title-key">{screen.key}</code>
                                        </div>
                                        <p className="screen-desc-paragraph">{screen.desc}</p>
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 95px)', gap: '8px' }}>
                                      {renderPermissionButton({
                                        label: 'Tất cả',
                                        isChecked: isRowAll,
                                        onClick: () => handleRowAllClick(screen.key)
                                      })}
                                      {permissionLevels.map((lvl) => {
                                        const isChecked = isCheckboxChecked(screen.key, lvl.key);
                                        return (
                                          <React.Fragment key={lvl.key}>
                                            {renderPermissionButton({
                                              label: lvl.label,
                                              isChecked: isChecked,
                                              onClick: () => handleCheckboxClick(screen.key, lvl.key)
                                            })}
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="group-blocked-message">
                              🚫 Nhóm này đang bị chặn truy cập. Chọn "Cho phép" ở trên để bắt đầu phân quyền chi tiết.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* HÀNG NÚT BẤM DƯỚI CÙNG */}
          <div className="form-actions-row">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/users')}>Hủy bỏ</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Xác nhận tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>

      {/* Toast thông báo popup đẹp */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#047857',
          color: '#FFFFFF',
          padding: '14px 24px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(4, 120, 87, 0.2)',
          fontWeight: '800',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 99999,
          animation: 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}

      {showConfirmModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom animate-slide-down" style={{ maxWidth: '450px' }}>
            <div className="modal-header-custom">
              <h4>Xác nhận tạo tài khoản</h4>
              <button 
                type="button" 
                className="btn-close-modal" 
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-custom" style={{ padding: '24px 20px', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#5D4037', fontWeight: '600', lineHeight: '1.4' }}>
                  Bạn có chắc chắn muốn tiến hành tạo tài khoản người dùng mới này cùng cấu hình phân quyền chi tiết không?
                </div>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleConfirmCreate}
                disabled={loading}
              >
                {loading ? 'Đang lưu...' : 'Xác nhận tạo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .user-create-container { width: 100%; padding-bottom: 50px; height: auto !important; overflow-y: visible !important; }
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down { animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .create-content-wrapper { width: 100%; }
        .create-form-vertical-layout { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .card { background: white; border-radius: 12px; border: 1px solid #EADCC9; box-shadow: 0 6px 20px rgba(123, 82, 51, 0.03); }
        .section-title { font-size: 1.05rem; color: #7B5233; margin: 0; font-weight: 800; }
        
        /* PHẦN 1: THÔNG TIN NGƯỜI DÙNG CARD */
        .account-info-card { padding: 16px 24px; }
        .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1.5px solid #F5EDE4; padding-bottom: 8px; }
        
        .account-info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 24px; align-items: start; }
        
        /* Cột Trái: Avatar & Trạng thái */
        .avatar-actions-column { display: flex; flex-direction: column; align-items: center; gap: 12px; border-right: 1.5px solid #F5EDE4; padding-right: 24px; }
        .avatar-wrapper { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
        .avatar-circle { width: 84px; height: 84px; background-color: #7B5233; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 800; box-shadow: 0 4px 12px rgba(123, 82, 51, 0.12); border: 3px solid #FAF6F0; user-select: none; }
        .user-name-subtitle { font-size: 0.95rem; font-weight: 800; color: #2D1A12; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        
        .avatar-buttons { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .btn-action-custom { display: flex; align-items: center; justify-content: center; width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease; border: 1.5px solid #EADCC9; background: white; color: #5D4037; outline: none; }
        .btn-action-custom:hover { background-color: #FAF6F0; border-color: #C8B2A6; }
        
        .btn-status.active { background-color: #E8F5E9; border-color: #A5D6A7; color: #2E7D32; }
        .btn-status.suspended { background-color: #FFEBEE; border-color: #FFCDD2; color: #C62828; }
        .status-indicator-dot { width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; display: inline-block; }
        .btn-status.active .status-indicator-dot { background-color: #2E7D32; }
        .btn-status.suspended .status-indicator-dot { background-color: #C62828; }
        
        /* Cột Phải: Các Inputs */
        .inputs-column { flex: 1; width: 100%; }
        .form-inputs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 18px; }
        .form-inputs-grid .full-width-span { grid-column: span 3; }
        .form-inputs-grid .span-two-columns { grid-column: span 2; }

        /* Modal popup CSS */
        .modal-backdrop-custom {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-content-custom {
          background: #FFFFFF;
          border-radius: 12px;
          border: 1px solid #EADCC9;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 10px 30px rgba(123, 82, 51, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-header-custom {
          padding: 16px 20px;
          border-bottom: 1.5px solid #F5EDE4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #FAF8F5;
        }
        .modal-header-custom h4 {
          margin: 0;
          color: #7B5233;
          font-size: 1.1rem;
          font-weight: 800;
        }
        .btn-close-modal {
          background: none;
          border: none;
          color: #8C7B72;
          font-size: 1.1rem;
          cursor: pointer;
          transition: color 0.2s;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }
        .btn-close-modal:hover {
          color: #7B5233;
        }
        .modal-body-custom {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .modal-footer-custom {
          padding: 14px 20px;
          border-top: 1.5px solid #F5EDE4;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background-color: #FAF8F5;
        }
        
        .form-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
        .input-with-button { position: relative; display: flex; align-items: center; width: 100%; }
        .input-with-button input { width: 100%; padding-right: 32px; }
        .btn-sync-input {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: 32px;
          border: none;
          background: transparent;
          color: #7B5233;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .btn-sync-input:hover {
          color: #5D3E26;
        }
        .form-group.disabled { opacity: 0.6; }
        .form-group label { font-size: 0.8rem; font-weight: 700; color: #5D4037; }
        .form-group input, .form-group select { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #EADCC9; font-size: 0.85rem; outline: none; transition: all 0.2s; background-color: white; font-weight: 500; color: #2D1A12; width: 100%; box-sizing: border-box; }
        .form-group input:focus, .form-group select:focus { border-color: #7B5233; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        
        .hint { font-size: 0.78rem; color: #8C7B72; margin-top: 2px; font-weight: 500; }
        .empty-stages-hint { padding: 10px; border: 1.5px dashed #EADCC9; border-radius: 8px; background-color: #FAF8F5; color: #8C7B72; font-size: 0.82rem; text-align: center; font-weight: 500; }
        .stages-checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; padding: 12px; border: 1.5px solid #EADCC9; border-radius: 8px; background-color: #FAF8F5; }
        .stage-checkbox-item { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; color: #2D1A12; }
        .stage-checkbox-item input[type="checkbox"] { width: 14px; height: 14px; accent-color: #7B5233; cursor: pointer; margin: 0; }
        
        /* PHẦN 2: PHÂN QUYỀN CARD */
        .permissions-card { padding: 16px 24px; margin-top: 0px; }
        .permissions-header-actions { display: flex; align-items: center; gap: 12px; }
        
        .search-box-wrapper { position: relative; display: flex; align-items: center; width: 220px; }
        .search-box-wrapper .search-icon { position: absolute; left: 10px; color: #8D6E63; pointer-events: none; }
        .search-box-wrapper .search-input-field { width: 100%; padding: 6px 10px 6px 30px; border: 1.5px solid #EADCC9; border-radius: 8px; font-size: 0.82rem; outline: none; transition: all 0.2s; color: #2D1A12; font-weight: 500; }
        .search-box-wrapper .search-input-field:focus { border-color: #7B5233; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        
        /* Accordion List */
        .accordion-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
        .accordion-group { background: #FFFFFF; border: 1.5px solid #EADCC9; border-radius: 10px; overflow: hidden; transition: all 0.2s ease; }
        .accordion-group.is-expanded { border-color: #C8B2A6; box-shadow: 0 4px 12px rgba(123, 82, 51, 0.03); }
        
        .accordion-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: linear-gradient(135deg, #FAF8F5 0%, #FAF6F0 100%); cursor: pointer; user-select: none; gap: 20px; }
        .accordion-header:hover { background-color: #F5EDE4; background-image: none; }
        
        .accordion-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .chevron-icon { display: flex; align-items: center; color: #7B5233; transition: transform 0.2s ease; transform: rotate(0deg); }
        .chevron-icon.rotated { transform: rotate(90deg); }
        
        .group-icon-wrapper { display: flex; align-items: center; justify-content: center; color: #7B5233; background-color: #FAF6F0; width: 30px; height: 30px; border-radius: 6px; border: 1px solid #EADCC9; flex-shrink: 0; }
        .accordion-header:hover .group-icon-wrapper { background-color: #7B5233; color: white; border-color: #7B5233; }
        .group-title { margin: 0; font-size: 0.95rem; font-weight: 800; color: #2D1A12; }
        
        /* Allow/Block Radio Buttons */
        .group-allow-toggle { display: flex; gap: 8px; align-items: center; }
        .radio-label { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.78rem; font-weight: 700; color: #8C7B72; padding: 4px 10px; border-radius: 6px; border: 1.5px solid #EADCC9; background-color: #FFFFFF; transition: all 0.2s; user-select: none; }
        .radio-label input[type="radio"] { display: none; }
        .radio-custom { width: 6px; height: 6px; border-radius: 50%; background-color: transparent; border: 2px solid #8C7B72; transition: all 0.2s; display: inline-block; }
        
        .radio-label.active { background-color: #ECFDF5; border-color: #A7F3D0; color: #065F46; }
        .radio-label.active .radio-custom { border-color: #065F46; background-color: #065F46; }
        
        .radio-label.active-blocked { background-color: #FEF2F2; border-color: #FECACA; color: #991B1B; }
        .radio-label.active-blocked .radio-custom { border-color: #991B1B; background-color: #991B1B; }
        
        /* Accordion Body screens list */
        .accordion-body { padding: 0; background-color: #FFFFFF; border-top: 1.5px solid #F5EDE4; }
        .accordion-body-list { display: flex; flex-direction: column; padding: 0 0 0 16px; }
        
        .permission-screen-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px 8px 10px; border-bottom: 1.5px solid #FAF6F0; gap: 20px; }
        .permission-screen-row:last-child { border-bottom: none; }
        .permission-screen-row:hover { background-color: #FAF8F5; }
        
        .screen-info-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .screen-icon-box { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background-color: #FAF6F0; color: #7B5233; border: 1px solid #EADCC9; flex-shrink: 0; }
        .permission-screen-row:hover .screen-icon-box { background-color: #7B5233; color: white; border-color: #7B5233; }
        
        .screen-text-details { flex: 1; min-width: 0; }
        .screen-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
        .screen-title-name { font-size: 0.88rem; font-weight: 800; color: #2D1A12; }
        .screen-title-key { font-size: 0.7rem; color: #8D6E63; background-color: #F8F5F2; padding: 1px 4px; border-radius: 4px; border: 0.5px solid #EADCC9; font-weight: 500; font-family: monospace; }
        .screen-desc-paragraph { font-size: 0.75rem; color: #757575; margin: 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        /* Checkboxes styling */
        .screen-checkboxes-container { display: flex; align-items: center; gap: 16px; width: 660px; flex-shrink: 0; justify-content: space-between; }
        .checkboxes-allowed-group { display: flex; gap: 6px; flex: 1; justify-content: flex-start; }
        .checkboxes-blocked-group { width: 80px; display: flex; justify-content: flex-end; }
        
        .perm-checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #5D4037; padding: 5px 10px; border-radius: 6px; border: 1.5px solid #EADCC9; background-color: #FFFFFF; transition: all 0.2s; user-select: none; white-space: nowrap; }
        .perm-checkbox-label input[type="checkbox"] { display: none; }
        .checkbox-custom { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid #EADCC9; background-color: white; position: relative; transition: all 0.15s; display: inline-block; }
        
        .perm-checkbox-label.checked { border-color: color-mix(in srgb, var(--theme-color) 40%, white); background-color: color-mix(in srgb, var(--theme-color) 12%, white); color: var(--theme-color); }
        .perm-checkbox-label.checked .checkbox-custom { border-color: var(--theme-color); background-color: var(--theme-color); }
        .perm-checkbox-label.checked .checkbox-custom::after { content: ''; position: absolute; left: 3.5px; top: 0.5px; width: 3px; height: 6px; border: solid white; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }
        
        .perm-checkbox-label.is-blocked-type.checked-blocked { border-color: #FECACA; background-color: #FEF2F2; color: #DC2626; }
        .perm-checkbox-label.is-blocked-type.checked-blocked .checkbox-custom.red-border { border-color: #DC2626; background-color: #DC2626; }
        .perm-checkbox-label.is-blocked-type.checked-blocked .checkbox-custom.red-border::after { content: ''; position: absolute; left: 3.5px; top: 0.5px; width: 3px; height: 6px; border: solid white; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }
        
        .group-blocked-message { padding: 14px; text-align: center; font-size: 0.8rem; font-weight: 700; color: #991B1B; background-color: #FEF2F2; border-radius: 8px; border: 1.5px dashed #FECACA; margin: 10px 16px; }
        
        .empty-search-state { text-align: center; padding: 40px 20px; color: #8C7B72; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .empty-search-state p { margin: 0; font-size: 0.85rem; font-weight: 600; }
        
        /* HÀNG NÚT BẤM DƯỚI CÙNG */
        .form-actions-row { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1.5px solid #F5EDE4; margin-top: 4px; }
        .btn { padding: 8px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.82rem; transition: all 0.2s; outline: none; }
        .btn-primary { background-color: #7B5233; color: white; border: none; box-shadow: 0 4px 12px rgba(123, 82, 51, 0.12); }
        .btn-primary:hover:not(:disabled) { background-color: #5D3E26; transform: translateY(-1px); }
        .btn-primary:disabled { background-color: #D3C1B4; cursor: not-allowed; box-shadow: none; color: white; }
        .btn-outline { background: white; border: 1.5px solid #EADCC9; color: #7B5233; }
        .btn-outline:hover { background-color: #FAF6F0; border-color: #C8B2A6; }
        
        .error-message { background-color: #FFEBEE; color: #C62828; padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 0.82rem; border: 1px solid #FFCDD2; font-weight: 600; }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .account-info-grid { grid-template-columns: 1fr; gap: 20px; }
          .avatar-actions-column { border-right: none; border-bottom: 1.5px solid #F5EDE4; padding-right: 0; padding-bottom: 20px; width: 100%; }
          .avatar-buttons { flex-direction: row; width: 100%; justify-content: center; }
          .btn-action-custom { width: auto; min-width: 160px; }
        }
        
        @media (max-width: 1280px) {
          .permission-screen-row { flex-direction: column; align-items: stretch; gap: 12px; }
          .screen-checkboxes-container { width: 100%; max-width: 100%; }
        }
        
        @media (max-width: 768px) {
          .form-inputs-grid { grid-template-columns: 1fr; }
          .form-inputs-grid .full-width-span { grid-column: span 1; }
          .form-inputs-grid .span-two-columns { grid-column: span 1; }
          .avatar-buttons { flex-direction: column; }
          .btn-action-custom { width: 100%; }
          .permissions-header-actions { flex-direction: column; align-items: stretch; width: 100%; }
          .search-box-wrapper { width: 100%; }
          .accordion-header { flex-direction: column; align-items: stretch; gap: 10px; }
          .group-allow-toggle { justify-content: space-between; }
          .checkboxes-allowed-group { flex-wrap: wrap; }
        }
      `}} />
    </div>
  );
};

export default UserCreate;

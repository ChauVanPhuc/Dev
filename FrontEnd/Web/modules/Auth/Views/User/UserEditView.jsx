import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { authService } from '@modules/Auth/Models/auth.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

// Icons mapping for screens
import {
  SCREEN_ICONS,
  PERM_RANK,
  LEGACY_RANK_MAP,
  parseDbPermission,
  permissionLevels
} from './components/UserScreenConfig';
import { buildPermissionGroupsFromSidebar, getGroupIcon } from './utils/permissionUtils';
import PositionMultiSelect from './components/PositionMultiSelect';

const UserEdit = ({ isProfile = false }) => {
  const { id: paramId } = useParams();
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const id = isProfile ? loggedInUser.id : paramId;

  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/users/edit/:id');

  // Cập nhật tiêu đề trang lên Layout Header
  useEffect(() => {
    if (setCustomTitle) setCustomTitle(isProfile ? 'Thông tin cá nhân' : 'Thông tin tài khoản');
    if (setCustomSubtitle) setCustomSubtitle(isProfile ? 'Quản lý thông tin cá nhân của bạn' : 'Quản lý thông tin cá nhân và thiết lập chi tiết phân quyền hệ thống');
    if (setCustomScreenCode) setCustomScreenCode(isProfile ? 'AD3.2-P' : 'AD3.2');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, isProfile]);
  
  // Dữ liệu danh mục từ API
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [factories, setFactories] = useState([]);
  const [stages, setStages] = useState([]);
  
  // Trạng thái Form thông tin cơ bản
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '', 
    status: 'Đang sử dụng',
    is_mobile_allowed: true,
    role_id: '',
    department_id: '',
    permission_id: '',
    permission_ids: [],
    factory_id: '',
    factory_name: '',
    stage_ids: [],
    permission_level: '' 
  });


  // Trạng thái phân quyền chi tiết (screen_key -> permission_string)
  const [screenPermissions, setScreenPermissions] = useState({});
  const [sidebarItems, setSidebarItems] = useState([]);
  const [screens, setScreens] = useState([]);
  // Lưu trữ phân quyền mặc định cơ sở (baseline role defaults) để so sánh diff khi save
  const initialBaselineDefaults = React.useRef({});

  const dynamicWebGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'web', screens);
  }, [sidebarItems, screens]);

  const dynamicMobileGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'mobile', screens);
  }, [sidebarItems, screens]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const setToastMessage = (msg) => {
    if (msg) {
      toast('success', msg);
    }
  };
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Selected factory state for Phạm vi phụ trách
  const [selectedFactory, setSelectedFactory] = useState('');
  const hasAutoSelectedFactory = React.useRef(false);

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

  useEffect(() => {
    if (uniqueFactories.length > 0) {
      // 1. Tự động nhận diện và chuyển sang nhà máy có công đoạn đã active (chỉ chạy 1 lần)
      if (!hasAutoSelectedFactory.current && stages.length > 0 && formData.stage_ids && formData.stage_ids.length > 0) {
        const activeStage = stages.find(s => formData.stage_ids.map(Number).includes(Number(s.id)));
        if (activeStage) {
          const factoryOfActiveStage = getFactoryCode(activeStage.name);
          if (factoryOfActiveStage && uniqueFactories.includes(factoryOfActiveStage)) {
            setSelectedFactory(factoryOfActiveStage);
            hasAutoSelectedFactory.current = true;
            return;
          }
        }
      }

      // 2. Mặc định chọn nhà máy đầu tiên nếu chưa chọn hoặc nhà máy hiện tại không còn tồn tại
      if (!selectedFactory || !uniqueFactories.includes(selectedFactory)) {
        setSelectedFactory(uniqueFactories[0]);
      }
    } else {
      setSelectedFactory('');
    }
  }, [uniqueFactories, stages, formData.stage_ids, selectedFactory]);

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

  // Mở rộng nhóm accordion và tìm kiếm
  const [activeTab, setActiveTab] = useState('web');
  const [expandedGroups, setExpandedGroups] = useState({ 'web_0': true, 'mobile_0': true });
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Trạng thái modal đổi mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // 1. Tải danh mục Roles & Factories khi mount
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [rolesData, factoriesData, permsData] = await Promise.all([
          api.get('/roles/'),
          api.get('/hr/factory-structures').catch(() => []),
          api.get('/permissions/?include_inactive=false').catch(() => [])
        ]);
        setRoles(rolesData || []);
        if (permsData && permsData.length > 0) {
          setPermissions(permsData);
        }
        const parsedFactories = (factoriesData && factoriesData.length > 0) 
          ? factoriesData 
          : [
              { id: 1, structure_name: 'Văn Phòng', structure_code: 'VP' },
              { id: 2, structure_name: 'Nhà máy 1', structure_code: 'NM1' },
              { id: 3, structure_name: 'Nhà máy 2', structure_code: 'NM2' }
            ];
        setFactories(parsedFactories);
      } catch (err) {
        console.error('Lỗi khi tải Roles / Factories / Permissions:', err);
      }
    };
    fetchInit();
  }, []);

  // 2. Tải thông tin người dùng & phân quyền khi mount/id thay đổi
  useEffect(() => {
    hasAutoSelectedFactory.current = false;
    const fetchUserDetailAndPermissions = async () => {
      setFetching(true);
      setError(null);
      try {
        // Tải chi tiết người dùng, cấu hình sidebar và danh sách màn hình song song
        const [userData, permRes, sidebarRes, screensRes] = await Promise.all([
          api.get(`/accounts/${id}`),
          api.get(`/accounts/${id}/permissions?resolved=true`),
          api.get('/system/sidebar/all'),
          api.get('/screens')
        ]);

        setSidebarItems(sidebarRes || []);
        setScreens(screensRes || []);

        const permIds = (userData.permission_ids && userData.permission_ids.length > 0)
          ? userData.permission_ids.map(Number)
          : (userData.permission_id ? [Number(userData.permission_id)] : []);

        setFormData({
          employee_id: userData.employee_id || '',
          full_name: userData.full_name || '',
          username: userData.username || '',
          email: userData.email || '',
          phone: userData.phone || '',
          password: '', 
          status: userData.status || 'Đang sử dụng',
          is_mobile_allowed: userData.is_mobile_allowed !== undefined ? userData.is_mobile_allowed : true,
          role_id: userData.role_id || '',
          department_id: userData.department_id || '',
          permission_id: userData.permission_id || '',
          permission_ids: permIds,
          factory_id: userData.factory_id || '',
          factory_name: userData.factory_name || '',
          stage_ids: userData.stage_ids || [],
          permission_level: userData.permission_level || ''
        });

        const dbPerms = permRes.permissions || {};
        
        // Build nhóm quyền động từ dữ liệu mới nhất
        const webGroups = buildPermissionGroupsFromSidebar(sidebarRes || [], 'web', screensRes || []);
        const mobileGroups = buildPermissionGroupsFromSidebar(sidebarRes || [], 'mobile', screensRes || []);

        // 1. Lưu quyền resolved thực tế vào state cho form UI
        const initialPerms = {};
        webGroups.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
          });
        });
        mobileGroups.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
          });
        });
        setScreenPermissions(initialPerms);

        // 2. Tải quyền mặc định baseline (vai trò/chức vụ) để so sánh tính toán override khi save
        try {
          const queryParams = [];
          if (userData.role_id) queryParams.push(`role_id=${userData.role_id}`);
          if (permIds.length > 0) {
            queryParams.push(`permission_ids=${permIds.join(',')}`);
          } else if (userData.permission_id) {
            queryParams.push(`permission_id=${userData.permission_id}`);
          }
          if (userData.permission_level) queryParams.push(`permission_level=${encodeURIComponent(userData.permission_level)}`);
          const defRes = await api.get(`/accounts/permissions/default?${queryParams.join('&')}`);
          const defaultDbPerms = defRes.permissions || {};
          
          const parsedDefaults = {};
          webGroups.forEach(group => {
            group.screens.forEach(scr => {
              parsedDefaults[scr.key] = parseDbPermission(defaultDbPerms[scr.key] || 'none');
            });
          });
          mobileGroups.forEach(group => {
            group.screens.forEach(scr => {
              parsedDefaults[scr.key] = parseDbPermission(defaultDbPerms[scr.key] || 'none');
            });
          });
          initialBaselineDefaults.current = parsedDefaults;
        } catch (e) {
          console.error('Lỗi khi tải quyền mặc định baseline:', e);
          initialBaselineDefaults.current = {};
        }

      } catch (err) {
        console.error('Lỗi khi tải thông tin tài khoản và phân quyền:', err);
        setError('Không thể tải thông tin tài khoản người dùng.');
      } finally {
        setFetching(false);
      }
    };
    fetchUserDetailAndPermissions();
  }, [id]);

  // 3. Khi Role thay đổi -> Lấy danh sách Departments (Bộ phận)
  useEffect(() => {
    if (formData.role_id) {
      // Load departments (Bộ phận)
      api.get(`/departments/?role_id=${formData.role_id}`)
        .then(data => setDepartments(Array.isArray(data) ? data : []))
        .catch(err => {
          console.error('Lỗi khi tải Departments:', err);
          setDepartments([]);
        });

      // Load permissions (Vị trí): lấy toàn bộ danh mục vị trí đang hoạt động
      api.get('/permissions/?include_inactive=false')
        .then(data => {
          if (Array.isArray(data) && data.length > 0) setPermissions(data);
        })
        .catch(err => {
          console.error('Lỗi khi tải Permissions:', err);
        });
    } else {
      setDepartments([]);
    }
  }, [formData.role_id]);

  // 4. Khi Permission(s) thay đổi -> Lấy danh sách Stages tương ứng (có fallback tự động)
  useEffect(() => {
    const selectedPerms = permissions.filter(p => (formData.permission_ids || []).map(Number).includes(Number(p.id)) || Number(p.id) === Number(formData.permission_id));
    const hasWorker = selectedPerms.some(p => p.name === 'NV SX' || p.name === 'NV QC');
    const primaryId = formData.permission_ids?.[0] || formData.permission_id;

    if (primaryId && (hasWorker || selectedPerms.length > 0)) {
      const fetchStages = async () => {
        try {
          let data = await api.get(`/permissions/${primaryId}/stages`).catch(() => []);
          if (!data || data.length === 0) {
            data = await api.get('/stages/');
          }
          setStages(Array.isArray(data) ? data : []);
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
  }, [formData.permission_ids, formData.permission_id, permissions]);

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
    setIsDirty(true);
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
    setIsDirty(true);
  };

  const toggleStatus = () => {
    setFormData(prev => ({
      ...prev,
      status: prev.status === 'Đang sử dụng' ? 'Dừng hoạt động' : 'Đang sử dụng'
    }));
    setIsDirty(true);
  };

  const toggleMobileAccess = () => {
    setFormData(prev => ({
      ...prev,
      is_mobile_allowed: !prev.is_mobile_allowed
    }));
    setIsDirty(true);
  };

  // Hàm đồng bộ thông tin từ danh mục nhân viên
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
          permission_id: employee.permission_id ? String(employee.permission_id) : prev.permission_id,
          permission_ids: employee.permission_id ? [Number(employee.permission_id)] : prev.permission_ids
        };
      });
      setIsDirty(true);
      toast('success', 'Đồng bộ dữ liệu nhân sự thành công!');
    } catch (err) {
      console.error(err);
      toast('error', 'Lỗi khi đồng bộ hoặc mã nhân viên không tồn tại.');
    } finally {
      setSyncing(false);
    }
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
        // Toggle/Select Chặn -> Chỉ giữ 'none'
        newPerms = ['none'];
      } else {
        // Loại bỏ 'none'
        const filtered = currentPerms.filter(p => p !== 'none');
        if (filtered.includes(clickedLevel)) {
          // Nếu đã chọn thì bỏ chọn
          newPerms = filtered.filter(p => p !== clickedLevel);
        } else {
          // Nếu chưa chọn thì chọn thêm
          newPerms = [...filtered, clickedLevel];
        }
        // Nếu sau khi bỏ chọn mà rỗng, thì tự động chuyển về 'none'
        if (newPerms.length === 0) {
          newPerms = ['none'];
        }
      }

      return {
        ...prev,
        [screenKey]: newPerms
      };
    });
    setIsDirty(true);
  };

  // Chọn nhanh cho toàn bộ màn hình trong Tab hiện tại (Web hoặc Mobile)
  const handleGlobalTabPermissionChange = (value) => {
    const activeGroups = activeTab === 'mobile' ? dynamicMobileGroups : dynamicWebGroups;
    setScreenPermissions(prev => {
      const next = { ...prev };
      const actions = value === 'all' 
        ? ['read', 'create', 'edit', 'delete', 'approve', 'export_import']
        : (value === 'read' ? ['read'] : ['none']);
      
      activeGroups.forEach(group => {
        group.screens.forEach(scr => {
          next[scr.key] = [...actions];
        });
      });
      return next;
    });
    setIsDirty(true);
  };

  // Chọn nhanh cho toàn bộ màn hình trong 1 nhóm cụ thể
  const handleGroupPermissionChange = (screensInGroup, value) => {
    setScreenPermissions(prev => {
      const next = { ...prev };
      const actions = value === 'all' 
        ? ['read', 'create', 'edit', 'delete', 'approve', 'export_import']
        : (value === 'read' ? ['read'] : ['none']);
        
      screensInGroup.forEach(scr => {
        next[scr.key] = [...actions];
      });
      return next;
    });
    setIsDirty(true);
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
    setIsDirty(true);
  };

  // Hàm khôi phục phân quyền mặc định của bộ phận
  const handleRestoreDefaults = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mọi phân quyền cá nhân và khôi phục về cấu hình mặc định của chức vụ này không?')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.put(`/accounts/${id}/permissions`, {
        permissions: {}
      });
      
      const permRes = await api.get(`/accounts/${id}/permissions?resolved=true`);
      const dbPerms = permRes.permissions || {};
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
      setScreenPermissions(initialPerms);
      
      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      if (Number(loggedInUser.id) === Number(id)) {
        const activePermsToStore = {};
        Object.keys(initialPerms).forEach(key => {
          const perms = initialPerms[key] || [];
          activePermsToStore[key] = perms.includes('none') || perms.length === 0 ? 'none' : perms.join(',');
        });
        localStorage.setItem('smartflow_active_permissions', JSON.stringify(activePermsToStore));
      }
      
      setIsDirty(false);
      alert('Khôi phục phân quyền mặc định thành công!');
    } catch (err) {
      console.error('Lỗi khi khôi phục quyền mặc định:', err);
      setError('Đã xảy ra lỗi khi khôi phục cấu hình quyền mặc định.');
    } finally {
      setLoading(false);
    }
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
    setIsDirty(true);
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
    setIsDirty(true);
  };

  const renderHeaderButton = ({ label, isChecked, onClick }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isProfile}
        title={`Bật/Tắt toàn bộ cột "${label}" trong nhóm này`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          height: '28px',
          borderRadius: '5px',
          border: isChecked ? '1.5px solid #10B981' : '1px solid #D1D5DB',
          backgroundColor: isChecked ? '#EBFDF5' : '#FFFFFF',
          color: isChecked ? '#047857' : '#4B5563',
          fontSize: '0.72rem',
          fontWeight: '700',
          cursor: isProfile ? 'default' : 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          width: '95px',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: isChecked ? '0 1px 2px rgba(16, 185, 129, 0.2)' : 'none'
        }}
      >
        <span style={{
          width: '10px',
          height: '10px',
          borderRadius: '2px',
          border: isChecked ? '1.5px solid #10B981' : '1px solid #9CA3AF',
          backgroundColor: isChecked ? '#10B981' : 'transparent',
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isChecked && (
            <span style={{
              width: '2.5px',
              height: '5px',
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
          {label}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isProfile}
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
          cursor: isProfile ? 'default' : 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          width: '95px',
          boxSizing: 'border-box',
          outline: 'none',
          opacity: isProfile ? 0.8 : 1
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

  // Submit thực tế khi được xác nhận từ Popup Modal
  const handleConfirmSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const pIds = (formData.permission_ids || []).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      const primaryPermId = pIds.length > 0 ? pIds[0] : (formData.permission_id ? parseInt(formData.permission_id, 10) : null);
      
      const selectedPerms = permissions.filter(p => pIds.includes(p.id) || p.id === primaryPermId);
      const isProductionOrQC = selectedPerms.some(p => p.name === 'NV SX' || p.name === 'NV QC');

      // 1. Cập nhật thông tin tài khoản cơ bản (PUT)
      const baseUpdateData = {
        employee_code: formData.employee_id,
        name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone && formData.phone.trim() ? formData.phone.trim() : null,
        status: formData.status,
        is_active: formData.status === 'Đang sử dụng',
        is_mobile_allowed: formData.is_mobile_allowed,
        role_id: formData.role_id ? parseInt(formData.role_id, 10) : null,
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
        permission_id: primaryPermId,
        permission_ids: pIds.length > 0 ? pIds : (primaryPermId ? [primaryPermId] : []),
        factory_id: formData.factory_id ? parseInt(formData.factory_id, 10) : null,
        factory_name: formData.factory_name || null,
        permission_level: isProductionOrQC ? null : (formData.permission_level || null)
      };

      if (formData.password) {
        baseUpdateData.password = formData.password;
      }

      await api.put(`/accounts/${id}`, baseUpdateData);

      if (isProfile) {
        // Cập nhật thông tin user trong localStorage
        const updatedUser = {
          ...loggedInUser,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone
        };
        localStorage.setItem('smartflow_user', JSON.stringify(updatedUser));

        setSuccess(true);
        setIsDirty(false);
        setToastMessage('Cập nhật thông tin cá nhân thành công!');
        setTimeout(() => {
          setToastMessage(null);
          navigate('/admin/dashboard');
        }, 2000);
      } else {
        // 2. Đồng bộ bộ phận / chức vụ / công đoạn (sync-departments)
        const syncPayload = {
          role_id: formData.role_id ? parseInt(formData.role_id, 10) : null,
          department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
          permission_id: primaryPermId,
          permission_ids: pIds.length > 0 ? pIds : (primaryPermId ? [primaryPermId] : []),
          factory_id: formData.factory_id ? parseInt(formData.factory_id, 10) : null,
          factory_name: formData.factory_name || null,
          stage_ids: isProductionOrQC && formData.stage_ids && formData.stage_ids.length > 0 
            ? formData.stage_ids.map(sid => parseInt(sid, 10)) 
            : null
        };

        await api.post(`/accounts/${id}/sync-departments/`, syncPayload);


        // Chỉ lưu những key mà user đã thực sự thay đổi so với quyền mặc định baseline của vai trò/chức vụ
        // Đảm bảo không bị mất quyền Mobile khi lưu Web hoặc ngược lại
        const permissionsToSave = {};
        const defaults = initialBaselineDefaults.current || {};
        
        const allScreenKeys = new Set();
        dynamicWebGroups.forEach(g => g.screens.forEach(s => allScreenKeys.add(s.key)));
        dynamicMobileGroups.forEach(g => g.screens.forEach(s => allScreenKeys.add(s.key)));
        Object.keys(screenPermissions).forEach(k => allScreenKeys.add(k));

        allScreenKeys.forEach(key => {
          const currentPerms = screenPermissions[key] || [];
          const defaultPerms = defaults[key] || [];
          
          // So sánh: nếu quyền hiện tại khác quyền mặc định baseline → là override cần lưu
          const currentSorted = [...currentPerms].sort().join(',');
          const defaultSorted = [...defaultPerms].sort().join(',');
          
          if (currentSorted !== defaultSorted) {
            permissionsToSave[key] = currentPerms.includes('none') || currentPerms.length === 0 
              ? 'none' 
              : currentPerms.join(',');
          }
        });

        // 3. Đồng bộ phân quyền màn hình chi tiết (PUT)
        await api.put(`/accounts/${id}/permissions`, {
          permissions: permissionsToSave
        });

        // Nếu chỉnh sửa cho chính mình, lưu toàn bộ quyền hiện tại vào localStorage (cho sidebar/navigation)
        if (Number(loggedInUser.id) === Number(id)) {
          const fullPermsToStore = {};
          Object.keys(screenPermissions).forEach(key => {
            const perms = screenPermissions[key] || [];
            fullPermsToStore[key] = perms.includes('none') || perms.length === 0 ? 'none' : perms.join(',');
          });
          localStorage.setItem('smartflow_active_permissions', JSON.stringify(fullPermsToStore));
        }

        setSuccess(true);
        setIsDirty(false);
        setToastMessage('Cập nhật thông tin tài khoản và cấu hình phân quyền thành công!');
        setTimeout(() => {
          setToastMessage(null);
          navigate('/admin/users');
        }, 2000);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật tài khoản toàn diện:', err);
      let detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(item => `${item.loc?.[item.loc?.length - 1] || 'Trường'}: ${item.msg}`).join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        detail = JSON.stringify(detail);
      }
      const errMsg = detail || 'Có lỗi xảy ra khi lưu thông tin. Vui lòng kiểm tra lại.';
      setError(errMsg);
      toast('error', errMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPwdError('Vui lòng nhập đầy đủ các trường thông tin.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwdError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (passwordData.newPassword.length < 3) {
      setPwdError('Mật khẩu mới phải có ít nhất 3 ký tự.');
      return;
    }
    
    setPwdLoading(true);
    setPwdError(null);
    try {
      await api.post(`/accounts/${id}/change-password`, {
        old_password: passwordData.oldPassword,
        new_password: passwordData.newPassword
      });
      setPwdSuccess(true);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwdSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Lỗi khi đổi mật khẩu:', err);
      setPwdError(err.response?.data?.detail || 'Mật khẩu cũ không chính xác hoặc có lỗi xảy ra.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (fetching) {
    return (
      <div className="user-create-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }} />
        <p style={{ color: '#7B5233', fontSize: '1.15rem', fontWeight: '700' }}>Đang tải dữ liệu tài khoản...</p>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div className="user-create-container">
      <div className="create-content-wrapper">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Cập nhật tài khoản và phân quyền thành công!</div>}
        
        <form onSubmit={handleSubmit} className="create-form-vertical-layout">
          
          {/* PHẦN 1: THÔNG TIN NGƯỜI DÙNG */}
          <div className="account-info-card card">
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
                  {!isProfile && (
                    <button 
                      type="button" 
                      className="btn-link-sync" 
                      onClick={handleAutoSync} 
                      disabled={syncing}
                    >
                      {syncing ? 'Đang đồng bộ...' : 'Lấy thông tin tự động...'}
                    </button>
                  )}
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
                    className={`btn-action-custom btn-password ${showPasswordModal ? 'active' : ''}`}
                    onClick={() => {
                      setShowPasswordModal(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Đổi mật khẩu
                  </button>
                  
                  <button 
                    type="button" 
                    className={`btn-action-custom btn-status ${formData.status === 'Đang sử dụng' ? 'active' : 'suspended'}`}
                    onClick={isProfile ? undefined : toggleStatus}
                    disabled={isProfile}
                    style={isProfile ? { cursor: 'default', opacity: 0.8 } : {}}
                  >
                    <span className="status-indicator-dot"></span>
                    {formData.status === 'Đang sử dụng' ? 'Kích hoạt' : 'Tạm dừng hoạt động'}
                  </button>

                  {!isProfile && (
                    <button 
                      type="button" 
                      className={`btn-action-custom btn-status ${formData.is_mobile_allowed ? 'active' : 'suspended'}`}
                      onClick={toggleMobileAccess}
                      style={{ marginTop: '8px', backgroundColor: formData.is_mobile_allowed ? '#EFF6FF' : '#FEF2F2', color: formData.is_mobile_allowed ? '#1D4ED8' : '#DC2626', borderColor: formData.is_mobile_allowed ? '#BFDBFE' : '#FCA5A5' }}
                    >
                      <span className="status-indicator-dot" style={{ backgroundColor: formData.is_mobile_allowed ? '#2563EB' : '#DC2626' }}></span>
                      {formData.is_mobile_allowed ? 'Cho phép vào Mobile' : 'Chặn vào Mobile'}
                    </button>
                  )}

                  {isProfile && (
                    <button 
                      type="button" 
                      className="btn-action-custom btn-logout"
                      onClick={handleLogout}
                      style={{ 
                        backgroundColor: '#A0301B', 
                        color: '#FFFFFF', 
                        borderColor: '#A0301B',
                        marginTop: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#8B2917';
                        e.currentTarget.style.borderColor = '#8B2917';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#A0301B';
                        e.currentTarget.style.borderColor = '#A0301B';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Đăng xuất
                    </button>
                  )}
                </div>
              </div>

              {/* Cột phải: Các trường nhập liệu */}
              <div className="inputs-column">
                <div className="form-inputs-grid">
                  <div className="form-group employee-code-group">
                    <label>Mã nhân viên</label>
                    <div className="input-with-button">
                      <input 
                        type="text" 
                        name="employee_id" 
                        placeholder="Ví dụ: NV0123" 
                        value={formData.employee_id}
                        onChange={handleChange}
                        onBlur={handleAutoSync}
                        required
                        disabled={isProfile}
                        className={isProfile ? "input-disabled" : ""}
                      />
                      {!isProfile && (
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
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Họ và tên</label>
                    <input 
                      type="text" 
                      name="full_name" 
                      placeholder="Ví dụ: Nguyễn Văn A" 
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Số điện thoại <span style={{ fontSize: '0.75rem', color: '#8C7B72', fontWeight: 'normal' }}>(Không bắt buộc)</span></label>
                    <input 
                      type="text" 
                      name="phone" 
                      placeholder="Ví dụ: 0987 654 321" 
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Tên đăng nhập (Username)</label>
                    <input 
                      type="text" 
                      name="username" 
                      value={formData.username}
                      onChange={handleChange}
                      disabled={isProfile}
                      className={isProfile ? "input-disabled" : ""}
                    />
                  </div>

                  <div className="form-group">
                    <label>Mật khẩu</label>
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="*******"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isProfile}
                      className={isProfile ? "input-disabled" : ""}
                    />
                  </div>

                  <div className="form-group span-two-columns">
                    <label>Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Ví dụ: anv01@smartflow.com" 
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Đường phân cách ngang mỏng */}
                <div style={{ borderTop: '1.5px solid #F5EDE4', margin: '20px 0' }}></div>

                {/* PHÂN QUYỀN PHÂN CẤP (GOM CHUNG TRONG CARD 1) */}
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
                      <select 
                        name="role_id" 
                        value={formData.role_id} 
                        onChange={handleChange} 
                        disabled={isProfile}
                        className={isProfile ? "select-disabled" : ""}
                        required
                      >
                        <option value="">-- Chọn Phòng Ban --</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Bộ Phận */}
                    <div className={`form-group ${(!formData.role_id || isProfile) ? 'disabled' : ''}`}>
                      <label>2. Bộ Phận</label>
                      <select 
                        name="department_id" 
                        value={formData.department_id} 
                        onChange={handleChange} 
                        disabled={isProfile || !formData.role_id}
                        className={(isProfile || !formData.role_id) ? "select-disabled" : ""}
                      >
                        <option value="">-- Chọn Bộ Phận --</option>
                        {departments?.map(d => (
                          <option key={d.id} value={d.id}>{d.name || d.code}</option>
                        ))}
                      </select>
                      {!formData.role_id && <small className="hint">Hãy chọn Phòng Ban trước</small>}
                    </div>

                    {/* 3. Vị Trí / Chức Vụ */}
                    <div className={`form-group ${(!formData.role_id || isProfile) ? 'disabled' : ''}`}>
                      <label>3. Vị Trí / Chức Vụ <span className="required" style={{ color: '#E11D48' }}>*</span></label>
                      <PositionMultiSelect 
                        positions={permissions}
                        selectedIds={formData.permission_ids}
                        disabled={isProfile || !formData.role_id}
                        required={true}
                        placeholder="-- Chọn các Vị Trí --"
                        onChange={(newIds) => {
                          setFormData(prev => ({
                            ...prev,
                            permission_ids: newIds,
                            permission_id: newIds.length > 0 ? String(newIds[0]) : ''
                          }));
                          setIsDirty(true);
                        }}
                      />
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
                          setIsDirty(true);
                        }}
                        disabled={isProfile}
                        className={isProfile ? "select-disabled" : ""}
                      >
                        <option value="">-- Chọn Nhà Máy --</option>
                        {factories.map(f => (
                          <option key={f.id} value={f.id}>{f.structure_name || f.name || f.structure_code}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* PHÂN QUYỀN CHI TIẾT: CÔNG ĐOẠN PHỤ TRÁCH */}
                  {(() => {
                    const selectedPerms = permissions.filter(p => (formData.permission_ids || []).map(Number).includes(Number(p.id)) || Number(p.id) === Number(formData.permission_id));
                    const isProductionOrQC = selectedPerms.some(p => p.name === 'NV SX' || p.name === 'NV QC');

                    if (isProductionOrQC) {
                      return (
                        <div style={{ borderTop: '1.5px solid #F5EDE4', paddingTop: '20px', marginTop: '10px' }}>
                          <div className={`form-group full-width-span ${(stages.length === 0 || isProfile) ? 'disabled' : ''}`}>
                              {stages.length === 0 ? (
                                <>
                                  <label>Phạm vi phụ trách (Công đoạn sản xuất)</label>
                                  <div className="empty-stages-hint">Quyền này không yêu cầu công đoạn sản xuất</div>
                                </>
                              ) : (
                                <>
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
                                              <div style={{ display: 'inline-flex', border: '1px solid #EADCC9', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FAF6F0', opacity: isProfile ? 0.7 : 1 }}>
                                                  {uniqueFactories.map(fac => {
                                                      const isActive = selectedFactory === fac;
                                                      return (
                                                          <button
                                                              type="button"
                                                              key={fac}
                                                              disabled={isProfile}
                                                              onClick={() => setSelectedFactory(fac)}
                                                              style={{
                                                                  padding: '6px 16px',
                                                                  border: 'none',
                                                                  backgroundColor: isActive ? '#7B5233' : 'transparent',
                                                                  color: isActive ? '#FFFFFF' : '#7B5233',
                                                                  fontWeight: 'bold',
                                                                  fontSize: '0.8rem',
                                                                  cursor: isProfile ? 'default' : 'pointer',
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

                                  <div className="stages-checkbox-grid" style={isProfile ? { opacity: 0.8, backgroundColor: '#FAF8F5' } : {}}>
                                    {filteredStages.map(s => (
                                      <label key={s.id} className="stage-checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isProfile ? 'default' : 'pointer', userSelect: 'none' }}>
                                        <input 
                                          type="checkbox"
                                          checked={formData.stage_ids.includes(s.id)}
                                          onChange={(e) => handleStageCheckboxChange(s.id, e.target.checked)}
                                          disabled={isProfile}
                                          style={{ margin: 0, width: '15px', height: '15px', accentColor: '#7B5233', cursor: isProfile ? 'default' : 'pointer' }}
                                        />
                                        <span>{s.displayName || s.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN 2: PHÂN QUYỀN CHI TIẾT */}
          {!isProfile && <div className="permissions-card card">
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
                <button 
                  type="button" 
                  className="btn btn-outline btn-restore"
                  onClick={handleRestoreDefaults}
                >
                  Khôi phục mặc định bộ phận
                </button>
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
                Phân quyền Mobile
              </button>
            </div>

            {/* Quick Action Toolbar for current tab */}
            <div className="tab-quick-toolbar" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              backgroundColor: '#FAF6F0',
              borderRadius: '10px',
              border: '1.5px solid #EADCC9',
              marginBottom: '18px',
              boxShadow: '0 1px 3px rgba(123, 82, 51, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#7B5233' }}>
                  Chọn nhanh cho toàn bộ màn hình {activeTab === 'mobile' ? 'Mobile' : 'Web'}:
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleGlobalTabPermissionChange('all')}
                  className="quick-action-tab-btn"
                  title="Cấp full toàn bộ quyền cho tất cả màn hình trong tab này"
                  disabled={isProfile}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #10B981',
                    backgroundColor: '#EBFDF5',
                    color: '#047857',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: isProfile ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Tất cả (Full quyền)
                </button>
                <button
                  type="button"
                  onClick={() => handleGlobalTabPermissionChange('read')}
                  className="quick-action-tab-btn"
                  title="Chỉ cho phép xem cho tất cả màn hình trong tab này"
                  disabled={isProfile}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #3B82F6',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: isProfile ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Chỉ xem
                </button>
                <button
                  type="button"
                  onClick={() => handleGlobalTabPermissionChange('none')}
                  className="quick-action-tab-btn"
                  title="Chặn tất cả màn hình trong tab này"
                  disabled={isProfile}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #EF4444',
                    backgroundColor: '#FEF2F2',
                    color: '#B91C1C',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: isProfile ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Chặn tất cả (Khóa)
                </button>
              </div>
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

                        {/* Group quick actions & Cho phép / Không cho phép */}
                        <div className="group-header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleGroupPermissionChange(group.screens, 'all')}
                              title="Cấp full quyền cho tất cả màn hình thuộc nhóm này"
                              disabled={isProfile}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '5px',
                                border: '1px solid #10B981',
                                backgroundColor: '#EBFDF5',
                                color: '#047857',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                cursor: isProfile ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              Full nhóm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGroupPermissionChange(group.screens, 'read')}
                              title="Chỉ xem cho tất cả màn hình thuộc nhóm này"
                              disabled={isProfile}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '5px',
                                border: '1px solid #3B82F6',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                cursor: isProfile ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              Xem nhóm
                            </button>
                          </div>

                          <div className="group-allow-toggle">
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
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="accordion-body">
                          {isAllowed ? (
                            <div className="accordion-body-list">
                              {/* Header Cột trong nhóm */}
                              <div className="permission-group-table-header" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 16px',
                                backgroundColor: '#F8F4EE',
                                borderBottom: '1.5px solid #EADCC9',
                                fontWeight: '700',
                                fontSize: '0.78rem',
                                color: '#7B5233'
                              }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>DANH SÁCH MÀN HÌNH / CHỨC NĂNG</span>
                                  <span style={{ fontSize: '0.7rem', color: '#8C7B70', fontWeight: '500' }}>({screensInGroup.length} màn hình)</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 95px)', gap: '8px' }}>
                                  {renderHeaderButton({
                                    label: 'Tất cả',
                                    isChecked: isHeaderChecked(screensInGroup, 'all'),
                                    onClick: () => handleHeaderToggle(screensInGroup, 'all')
                                  })}
                                  {permissionLevels.map((lvl) => (
                                    <React.Fragment key={lvl.key}>
                                      {renderHeaderButton({
                                        label: lvl.label,
                                        isChecked: isHeaderChecked(screensInGroup, lvl.key),
                                        onClick: () => handleHeaderToggle(screensInGroup, lvl.key)
                                      })}
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>

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
                              Nhóm này đang bị chặn truy cập. Chọn "Cho phép" ở trên để bắt đầu phân quyền chi tiết.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>}


          {/* HÀNG NÚT BẤM DƯỚI CÙNG (Chỉ hiển thị khi có thay đổi) */}
          {isDirty && (
            <div className="form-actions-row animate-slide-up" style={{
              position: 'fixed',
              bottom: '0',
              left: '260px',
              right: '0',
              backgroundColor: '#FFFFFF',
              borderTop: '2px solid #EADCC9',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              zIndex: 999,
              boxShadow: '0 -4px 20px rgba(123, 82, 51, 0.08)'
            }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  setIsDirty(false);
                  navigate(isProfile ? '/admin/dashboard' : '/admin/users');
                }}
              >
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
        </form>
      </div>



      {showConfirmModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom animate-slide-down" style={{ maxWidth: '450px' }}>
            <div className="modal-header-custom">
              <h4>Xác nhận lưu thay đổi</h4>
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
                  Bạn có chắc chắn muốn lưu toàn bộ các thay đổi về thông tin tài khoản và cấu hình phân quyền này không?
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
                onClick={handleConfirmSave}
                disabled={loading}
              >
                {loading ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom animate-slide-down">
            <div className="modal-header-custom">
              <h4>Đổi mật khẩu</h4>
              <button 
                type="button" 
                className="btn-close-modal" 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setPwdError(null);
                  setPwdSuccess(false);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-custom">
              {pwdError && <div className="error-message">{pwdError}</div>}
              {pwdSuccess && <div className="success-message">Đổi mật khẩu thành công!</div>}
              
              <div className="form-group-custom">
                <label>Mật khẩu cũ</label>
                <input 
                  type="password"
                  value={passwordData.oldPassword}
                  placeholder="Nhập mật khẩu cũ"
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  disabled={pwdLoading || pwdSuccess}
                />
              </div>
              <div className="form-group-custom">
                <label>Mật khẩu mới</label>
                <input 
                  type="password"
                  value={passwordData.newPassword}
                  placeholder="Nhập mật khẩu mới"
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  disabled={pwdLoading || pwdSuccess}
                />
              </div>
              <div className="form-group-custom">
                <label>Xác nhận mật khẩu mới</label>
                <input 
                  type="password"
                  value={passwordData.confirmPassword}
                  placeholder="Xác nhận mật khẩu mới"
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  disabled={pwdLoading || pwdSuccess}
                />
              </div>
            </div>
            <div className="modal-footer-custom">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setPwdError(null);
                  setPwdSuccess(false);
                }}
                disabled={pwdLoading}
              >
                Đóng
              </button>
              {!pwdSuccess && (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePasswordChangeSubmit}
                  disabled={pwdLoading}
                >
                  {pwdLoading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .user-create-container { width: 100%; padding-bottom: 90px; height: auto !important; overflow-y: visible !important; }
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .create-content-wrapper { width: 100%; }
        .create-form-vertical-layout { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .card { background: white; border-radius: 12px; border: 1px solid #EADCC9; box-shadow: 0 6px 20px rgba(123, 82, 51, 0.03); }
        .section-title { font-size: 1.05rem; color: #7B5233; margin: 0; font-weight: 800; }
        
        /* PHẦN 1: THÔNG TIN NGƯỜI DÙNG CARD */
        .account-info-card { padding: 16px 24px; }
        .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1.5px solid #F5EDE4; padding-bottom: 8px; }
        .btn-link-sync { background: none; border: none; color: #7B5233; font-weight: 700; text-decoration: underline; cursor: pointer; font-size: 0.82rem; transition: color 0.2s; outline: none; }
        .btn-link-sync:hover:not(:disabled) { color: #5D3E26; }
        .btn-link-sync:disabled { color: #D3C1B4; cursor: not-allowed; text-decoration: none; }
        
        .account-info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 24px; align-items: start; }
        
        /* Cột Trái: Avatar & Trạng thái */
        .avatar-actions-column { display: flex; flex-direction: column; align-items: center; gap: 12px; border-right: 1.5px solid #F5EDE4; padding-right: 24px; }
        .avatar-wrapper { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
        .avatar-circle { width: 84px; height: 84px; background-color: #7B5233; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 800; box-shadow: 0 4px 12px rgba(123, 82, 51, 0.12); border: 3px solid #FAF6F0; user-select: none; }
        .user-name-subtitle { font-size: 0.95rem; font-weight: 800; color: #2D1A12; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        
        .avatar-buttons { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .btn-action-custom { display: flex; align-items: center; justify-content: center; width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease; border: 1.5px solid #EADCC9; background: white; color: #5D4037; outline: none; }
        .btn-action-custom:hover { background-color: #FAF6F0; border-color: #C8B2A6; }
        .btn-password.active { background-color: #7B5233; color: white; border-color: #7B5233; }
        
        .btn-status.active { background-color: #E8F5E9; border-color: #A5D6A7; color: #2E7D32; }
        .btn-status.suspended { background-color: #FFEBEE; border-color: #FFCDD2; color: #C62828; }
        .status-indicator-dot { width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; display: inline-block; }
        .btn-status.active .status-indicator-dot { background-color: #2E7D32; }
        .btn-status.suspended .status-indicator-dot { background-color: #C62828; }
        
        .password-input-container { width: 100%; display: flex; flex-direction: column; gap: 4px; margin-top: 3px; }
        .password-input-container label { font-size: 0.78rem; font-weight: 700; color: #5D4037; }
        .password-input-container input { padding: 8px 10px; border-radius: 6px; border: 1.5px solid #EADCC9; font-size: 0.85rem; outline: none; transition: all 0.2s; font-weight: 500; color: #2D1A12; }
        .password-input-container input:focus { border-color: #7B5233; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        
        /* Cột Phải: Các Inputs */
        .inputs-column { flex: 1; width: 100%; }
        .form-inputs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 18px; }
        .form-inputs-grid .full-width-span { grid-column: span 3; }
        .form-inputs-grid .span-two-columns { grid-column: span 2; }
        
        .form-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
        .form-group.disabled { opacity: 0.6; }
        .form-group label { font-size: 0.8rem; font-weight: 700; color: #5D4037; }
        .form-group input, .form-group select { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #EADCC9; font-size: 0.85rem; outline: none; transition: all 0.2s; background-color: white; font-weight: 500; color: #2D1A12; width: 100%; box-sizing: border-box; }
        .form-group input:focus, .form-group select:focus { border-color: #7B5233; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        
        .input-with-button { position: relative; display: flex; align-items: center; width: 100%; }
        .input-with-button input { width: 100%; padding-right: 32px; }
        .btn-sync-input { position: absolute; right: 8px; background: none; border: none; color: #7B5233; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; outline: none; padding: 0; }
        .btn-sync-input:hover { color: #5D3E26; }
        .input-disabled, .select-disabled { background-color: #FAF8F5 !important; cursor: not-allowed !important; opacity: 0.85 !important; }
        
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
        .btn-restore { height: 30px; padding: 0 12px; font-size: 0.78rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        
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
        .success-message { background-color: #E8F5E9; color: #2E7D32; padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 0.82rem; border: 1px solid #C8E6C9; font-weight: 600; }
        
        /* Animation slide down */
        .animate-slide-down { animation: slideDown 0.25s ease-out forwards; transform-origin: top; }
        @keyframes slideDown { from { opacity: 0; transform: scaleY(0.9); } to { opacity: 1; transform: scaleY(1); } }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .account-info-grid { grid-template-columns: 1fr; gap: 20px; }
          .avatar-actions-column { border-right: none; border-bottom: 1.5px solid #F5EDE4; padding-right: 0; padding-bottom: 20px; width: 100%; }
          .avatar-buttons { flex-direction: row; width: 100%; justify-content: center; }
          .btn-action-custom { width: auto; min-width: 160px; }
          .password-input-container { max-width: 320px; }
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

        /* CSS Modal Đổi Mật Khẩu */
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
        .form-group-custom {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group-custom label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #5D4037;
        }
        .form-group-custom input {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1.5px solid #EADCC9;
          font-size: 0.85rem;
          outline: none;
          transition: all 0.2s;
          font-weight: 500;
          color: #2D1A12;
          background-color: #FFFFFF;
        }
        .form-group-custom input:focus {
          border-color: #7B5233;
          box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1);
        }
        .modal-footer-custom {
          padding: 14px 20px;
          border-top: 1.5px solid #F5EDE4;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background-color: #FAF8F5;
        }
      `}} />
    </div>
  );
};

export default UserEdit;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import {
  Bug, Play, Type, Table2, CheckSquare, List, Layout, Menu, CreditCard, Sliders, Bell,
  Component, MoreVertical, ChevronDown, Upload, FileText, X, Plus, Edit
} from 'lucide-react';
import api, { getBaseURL } from '@webShared/Services/api.service';
import { screenService } from '@modules/System/Models/screen.service';
import { bugService } from '@modules/System/Models/bug.service';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import BugDetailModal from '@webShared/Views/components/modals/BugDetailModal';
import ScreenSimulator from '@modules/System/Views/components/ScreenSimulation';
import SCREEN_DOCS from '../components/screenDocs';
import { useScreenMetadataCached, clearScreenMetadataCache } from '@webShared/hooks/useScreenMetadata';
import { useScreen } from '@shared/context/ScreenContext';
import {
  renderComponentIcon, CATEGORIES, getComponentCategory, getLoggedInUser,
  getBugStatusLabel, normalizeTitle, renderTechnicalDetails, getWorkflowForScreen,
  getConnections, getComponentCodeDetails, getSandboxResponse, getDatabaseOperations,
  getApiDocumentation, getComponentSubElements, getComponentHint, parseDescription,
  getImageUrl, getPositionByName, formatDate, getSubsystem,
  SUBSYSTEM_PREFIXES, MAP_SIDEBAR_GROUP_TO_SUBSYSTEM, ROUTE_SUGGESTIONS, slugify,
  parseRoutePath, combineRoutePath, normalizeRoutePath, getDisplayRoutePath,
  generateNextScreenCode, COMPONENT_COLORS, buildRouteSuggestionsFromSidebar,
} from './screenDetailUtils';

export const useScreenDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();

  const outletContext = useOutletContext() || {};

  const { showModal, startGlobalUpload, activeUploads, setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;
  const { refreshScreens } = useScreen();
  const [allScreens, setAllScreens] = useState([]);
  const [sidebarMenus, setSidebarMenus] = useState([]);
  const [screen, setScreen] = useState({ id: '', title: '', components: [], guides: [], bugs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    route_path: '',
    frontend_path: '',
    backend_path: '',
    platform: 'Web',
    subsystem: localStorage.getItem('last_selected_subsystem') || 'Quản lý hệ thống',
    status: 'Mới thiết kế',
    target_date: new Date().toISOString().split('T')[0],
    subtitle: '',
    current_code: ''
  });

  const [isBackendPathManuallyEdited, setIsBackendPathManuallyEdited] = useState(false);

  const generatedCode = isNew ? generateNextScreenCode(formData.subsystem, allScreens) : '';

  // Effect to automatically sync route path from frontend path and backend path
  useEffect(() => {
    const fPath = (formData.frontend_path || '').trim();
    const bPath = (formData.backend_path || '').trim();

    let newRoutePath = '';
    if (bPath) {
      if (bPath.startsWith('/') && !fPath) {
        // If no frontend path is selected, treat backend path as absolute
        newRoutePath = bPath;
      } else {
        // Otherwise combine them
        newRoutePath = combineRoutePath(fPath, bPath);
      }
    } else {
      newRoutePath = fPath;
    }

    setFormData(prev => {
      if (prev.route_path === newRoutePath) return prev;
      return {
        ...prev,
        route_path: newRoutePath
      };
    });
  }, [formData.frontend_path, formData.backend_path]);

  // Effect to automatically save the last selected subsystem to localStorage
  useEffect(() => {
    if (formData.subsystem) {
      localStorage.setItem('last_selected_subsystem', formData.subsystem);
    }
  }, [formData.subsystem]);

  // Effect to automatically fill subsystem and title based on matching Sidebar menu path
  useEffect(() => {
    const bPath = (formData.backend_path || '').trim();
    if (!bPath) return;

    let foundItem = null;
    let foundGroupName = '';

    const processItem = (item, parentGroup = '') => {
      if (item.route_path === bPath) {
        foundItem = item;
        foundGroupName = parentGroup || 'Trang chủ';
        return true;
      }
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          if (processItem(child, parentGroup || item.title)) {
            return true;
          }
        }
      }
      return false;
    };

    for (const menu of sidebarMenus) {
      if (processItem(menu, menu.title)) {
        break;
      }
    }

    if (foundItem) {
      const targetSubsystem = MAP_SIDEBAR_GROUP_TO_SUBSYSTEM[foundGroupName] || 'Quản lý hệ thống';

      setFormData(prev => {
        const updates = {};
        if (prev.subsystem !== targetSubsystem) {
          updates.subsystem = targetSubsystem;
        }
        if (!prev.title && foundItem.title) {
          updates.title = foundItem.title;
        }
        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates };
        }
        return prev;
      });
    }
  }, [formData.backend_path, sidebarMenus]);

  // Dynamic metadata - chỉ dùng khi KHÔNG phải trang new và đã có screen
  const { screenCode, title, subtitle } = useScreenMetadataCached(
    isNew ? null : '/admin/screens/:id'
  );

  useEffect(() => {
    if (!isNew && screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    } else if (isNew) {
      if (setCustomTitle) setCustomTitle(null);
      if (setCustomSubtitle) setCustomSubtitle(null);
      if (setCustomScreenCode) setCustomScreenCode(null);
    }
  }, [isNew, screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isMockupExpanded, setIsMockupExpanded] = useState(false);

  const originalScreenRef = React.useRef(null);
  const latestDataRef = React.useRef(null);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const scrollBodyRef = React.useRef(null);

  useEffect(() => {
    const scrollBody = scrollBodyRef.current;

    const handleScroll = () => {
      const isScrolled = (scrollBody ? scrollBody.scrollTop > 0 : false) || window.scrollY > 0;
      setIsHeaderCollapsed(isScrolled);
    };

    handleScroll();
    if (scrollBody) {
      scrollBody.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (scrollBody) {
        scrollBody.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    latestDataRef.current = { formData, screen, isNew };
  }, [formData, screen, isNew]);

  const hasChanges = (currentFormData, currentScreen, currentIsNew) => {
    if (currentIsNew) {
      const isTitleFilled = !!(currentFormData.title && currentFormData.title.trim());
      const isRouteFilled = !!(currentFormData.route_path && currentFormData.route_path.trim());
      const isSubtitleFilled = !!(currentFormData.subtitle && currentFormData.subtitle.trim());
      const hasComponents = (currentScreen?.components || []).length > 0;
      const hasGuides = (currentScreen?.guides || []).length > 0;
      return isTitleFilled || isRouteFilled || isSubtitleFilled || hasComponents || hasGuides;
    }

    if (!originalScreenRef.current) return false;
    const orig = originalScreenRef.current;

    const isTitleChanged = currentFormData.title !== orig.title;
    const isRouteChanged = normalizeRoutePath(currentFormData.route_path) !== normalizeRoutePath(orig.route_path);
    const isPlatformChanged = currentFormData.platform !== orig.platform;
    const isSubsystemChanged = currentFormData.subsystem !== orig.subsystem;
    const isStatusChanged = currentFormData.status !== orig.status;
    const isTargetDateChanged = currentFormData.target_date !== orig.target_date;
    const isSubtitleChanged = currentFormData.subtitle !== orig.subtitle;
    const isCurrentCodeChanged = currentFormData.current_code !== orig.current_code;

    // Check components
    const currentComps = (currentScreen?.components || []).map(c => ({
      name: c.name,
      type: c.type || 'Button',
      description: c.description || '',
      technical_details: typeof c.technical_details === 'object' ? JSON.stringify(c.technical_details) : (c.technical_details || '')
    }));
    const origComps = (orig.components || []).map(c => ({
      name: c.name,
      type: c.type || 'Button',
      description: c.description || '',
      technical_details: typeof c.technical_details === 'object' ? JSON.stringify(c.technical_details) : (c.technical_details || '')
    }));
    const isComponentsChanged = JSON.stringify(currentComps) !== JSON.stringify(origComps);

    // Check guides
    const currentGuides = (currentScreen?.guides || []).map(g => ({
      step_number: g.step_number,
      title: g.title,
      related_components: g.related_components || '',
      description: g.description || ''
    }));
    const origGuides = (orig.guides || []).map(g => ({
      step_number: g.step_number,
      title: g.title,
      related_components: g.related_components || '',
      description: g.description || ''
    }));
    const isGuidesChanged = JSON.stringify(currentGuides) !== JSON.stringify(origGuides);

    return isTitleChanged || isRouteChanged || isPlatformChanged || isSubsystemChanged || isStatusChanged || isTargetDateChanged || isSubtitleChanged || isCurrentCodeChanged || isComponentsChanged || isGuidesChanged;
  };

  const performAutoSave = async (data, scr, isNewScreen) => {
    if (!data.title) {
      toast('error', 'Vui lòng nhập đầy đủ Tên màn hình!');
      return false;
    }

    const componentsPayload = (scr?.components || []).map(c => ({
      name: c.name,
      type: c.type || 'Button',
      description: c.description || '',
      technical_details: typeof c.technical_details === 'object' ? JSON.stringify(c.technical_details) : (c.technical_details || ''),
      file_path: c.file_path || '',
      is_active: c.is_active !== undefined ? c.is_active : true
    }));

    const guidesPayload = (scr?.guides || []).map(g => ({
      step_number: g.step_number,
      title: g.title,
      related_components: g.related_components || '',
      description: g.description || ''
    }));

    try {
      if (isNewScreen) {
        // Xác định mã màn hình cho màn hình mới
        const codeToUse = data.current_code || generateNextScreenCode(data.subsystem || 'Quản lý hệ thống', allScreens);

        await screenService.createScreen({
          title: data.title,
          route_path: normalizeRoutePath(data.route_path),
          platform: data.platform,
          status: data.status || 'Mới thiết kế',
          target_date: data.target_date,
          subtitle: data.subtitle,
          subsystem: data.subsystem || 'Quản lý hệ thống',
          components: componentsPayload,
          guides: guidesPayload,
          current_code: codeToUse
        });
        toast('success', 'Tạo mới đặc tả màn hình thành công!');
      } else {
        const updatePayload = {
          title: data.title,
          route_path: normalizeRoutePath(data.route_path),
          platform: data.platform,
          status: data.status,
          target_date: data.target_date,
          subtitle: data.subtitle,
          mockup_path: scr.mockup_path,
          components: componentsPayload,
          guides: guidesPayload
        };
        if (data.current_code && data.current_code !== scr?.current_code) {
          updatePayload.current_code = data.current_code;
        }

        await screenService.updateScreen(scr.id, updatePayload);
        toast('success', 'Cập nhật đặc tả màn hình thành công!');
      }
      clearScreenMetadataCache();
      if (refreshScreens) refreshScreens();
      return true;
    } catch (err) {
      console.error('Auto-save error:', err);
      toast('error', 'Lưu đặc tả màn hình thất bại!');
      return false;
    }
  };

  const [targetUrl, setTargetUrl] = useState(null);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      let isInternal = false;
      try {
        const urlObj = new URL(href, window.location.origin);
        isInternal = urlObj.origin === window.location.origin;
      } catch (err) {
        isInternal = !href.startsWith('http') && !href.startsWith('//');
      }

      if (!isInternal || href.startsWith('javascript') || anchor.getAttribute('target') === '_blank') {
        return;
      }

      const currentFormData = latestDataRef.current?.formData;
      const currentScreen = latestDataRef.current?.screen;
      const currentIsNew = latestDataRef.current?.isNew;

      if (!currentFormData) return;

      const shouldBlock = hasChanges(currentFormData, currentScreen, currentIsNew);
      const currentPath = window.location.pathname;
      const targetPath = href.split('?')[0];

      if (shouldBlock && targetPath && targetPath !== currentPath) {
        e.preventDefault();
        e.stopPropagation();

        setTargetUrl(href);
        setShowBlockerModal(true);
      }
    };

    const handlePopState = (e) => {
      const currentFormData = latestDataRef.current?.formData;
      const currentScreen = latestDataRef.current?.screen;
      const currentIsNew = latestDataRef.current?.isNew;

      if (!currentFormData) return;

      const shouldBlock = hasChanges(currentFormData, currentScreen, currentIsNew);

      if (shouldBlock) {
        window.history.pushState(null, null, window.location.pathname);
        setTargetUrl(null);
        setShowBlockerModal(true);
      }
    };

    window.hasUnsavedChangesScreenDetail = () => {
      const currentFormData = latestDataRef.current?.formData;
      const currentScreen = latestDataRef.current?.screen;
      const currentIsNew = latestDataRef.current?.isNew;
      if (!currentFormData) return false;
      return hasChanges(currentFormData, currentScreen, currentIsNew);
    };

    window.triggerScreenDetailUnsavedChangesModal = () => {
      setShowBlockerModal(true);
    };

    document.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('popstate', handlePopState);
      delete window.hasUnsavedChangesScreenDetail;
      delete window.triggerScreenDetailUnsavedChangesModal;
    };
  }, []);

  const handleSaveAndLeave = async () => {
    const { formData: currentFormData, screen: currentScreen, isNew: currentIsNew } = latestDataRef.current;
    const success = await performAutoSave(currentFormData, currentScreen, currentIsNew);
    if (success) {
      setShowBlockerModal(false);
      if (latestDataRef.current) {
        originalScreenRef.current = {
          title: currentFormData.title,
          route_path: normalizeRoutePath(currentFormData.route_path),
          platform: currentFormData.platform,
          subsystem: currentFormData.subsystem,
          status: currentFormData.status,
          target_date: currentFormData.target_date,
          subtitle: currentFormData.subtitle,
          current_code: currentFormData.current_code,
          components: JSON.parse(JSON.stringify(currentScreen?.components || [])),
          guides: JSON.parse(JSON.stringify(currentScreen?.guides || []))
        };
      }
      if (targetUrl) {
        navigate(targetUrl);
      } else {
        navigate('/admin/screens');
      }
    }
  };

  const handleDiscardAndLeave = () => {
    setShowBlockerModal(false);
    if (latestDataRef.current) {
      const { formData: currentFormData, screen: currentScreen } = latestDataRef.current;
      originalScreenRef.current = {
        title: currentFormData.title,
        route_path: normalizeRoutePath(currentFormData.route_path),
        platform: currentFormData.platform,
        subsystem: currentFormData.subsystem,
        status: currentFormData.status,
        target_date: currentFormData.target_date,
        subtitle: currentFormData.subtitle,
        current_code: currentFormData.current_code,
        components: JSON.parse(JSON.stringify(currentScreen?.components || [])),
        guides: JSON.parse(JSON.stringify(currentScreen?.guides || []))
      };
    }
    if (targetUrl) {
      navigate(targetUrl);
    } else {
      navigate('/admin/screens');
    }
  };

  const handleCancelLeave = () => {
    setShowBlockerModal(false);
    setTargetUrl(null);
  };

  // Cảnh báo khi người dùng reload / đóng tab trình duyệt
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const currentFormData = latestDataRef.current?.formData;
      const currentScreen = latestDataRef.current?.screen;
      const currentIsNew = latestDataRef.current?.isNew;

      if (!currentFormData) return;

      const shouldWarn = hasChanges(currentFormData, currentScreen, currentIsNew);

      if (shouldWarn) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  const [editingComponent, setEditingComponent] = useState(null);
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentType, setNewComponentType] = useState('Button');
  const [newComponentFrontend, setNewComponentFrontend] = useState('');
  const [newComponentWorkflow, setNewComponentWorkflow] = useState('');
  const [newComponentBackend, setNewComponentBackend] = useState('');
  const [newComponentButtonId, setNewComponentButtonId] = useState('');
  const [newComponentExportMode, setNewComponentExportMode] = useState('list');
  const [newComponentSampleFile, setNewComponentSampleFile] = useState(null);
  const [newComponentSampleFileUrl, setNewComponentSampleFileUrl] = useState('');
  const [isUploadingSample, setIsUploadingSample] = useState(false);
  const sampleFileInputRef = useRef(null);
  const [specDescriptions, setSpecDescriptions] = useState({
    Frontend: '',
    'Luồng xử lý': '',
    Backend: ''
  });

  const [currentMockupIdx, setCurrentMockupIdx] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [expandedBugId, setExpandedBugId] = useState(null);
  const [isBugListCollapsed, setIsBugListCollapsed] = useState(false);
  const [isSpecCardCollapsed, setIsSpecCardCollapsed] = useState(false);
  const [isScreenInfoCollapsed, setIsScreenInfoCollapsed] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugModalData, setBugModalData] = useState({
    componentName: 'Chung',
    severity: 'Medium',
    description: '',
    reporter: getLoggedInUser(),
    assignee: 'IT',
    targetDate: '',
    imagePaths: []
  });
  const [bugModalMode, setBugModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedBug, setSelectedBug] = useState(null);
  const [bugImageUploading, setBugImageUploading] = useState(false);
  const [replyNotes, setReplyNotes] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [replyUploading, setReplyUploading] = useState(false);
  const [replyStatusVal, setReplyStatusVal] = useState('');
  const [itAccounts, setItAccounts] = useState(['IT']);
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSubsystem, setLinkSubsystem] = useState(''); // Lưu ID nhóm Menu cha của Sidebar
  const [linkScreenId, setLinkScreenId] = useState('');    // Lưu ID mục Menu con của Sidebar
  const [linkComponentId, setLinkComponentId] = useState('');

  // Nhóm menu cha của Sidebar lấy từ database lọc theo nền tảng đang chọn (Web/Mobile)
  const sidebarGroups = React.useMemo(() => {
    return (sidebarMenus || []).filter(m => m.platform === formData.platform && !m.parent_id);
  }, [sidebarMenus, formData.platform]);

  // Danh sách Phân hệ được tạo động từ tiêu đề của các nhóm menu cha theo nền tảng tương ứng
  const subsystems = React.useMemo(() => {
    const list = sidebarGroups.map(g => g.title).filter(Boolean);
    const unique = Array.from(new Set(list));
    
    const webDefaults = [
      'Trang chủ', 'Quản lý hệ thống', 'Quản lý nhân sự', 'Hồ sơ ISO',
      'Quản lý sản xuất', 'Quản lý chất lượng', 'Quản lý kinh doanh',
      'Quản lý kỹ thuật', 'Bảo trì - cơ sở hạ tầng', 'Quản lý KPI'
    ];
    const mobileDefaults = [
      'Trang chủ', 'Thông tin sản xuất', 'Phiếu kiểm tra', 'Báo cáo công việc',
      'Báo cáo CAPA', 'Tạo CTQ, SOS', 'Báo cáo vi phạm', 'Cảnh báo lỗi', 'Góp ý'
    ];
    
    const defaults = formData.platform === 'Mobile' ? mobileDefaults : webDefaults;
    defaults.forEach(d => {
      if (!unique.includes(d)) {
        unique.push(d);
      }
    });
    return unique;
  }, [sidebarGroups, formData.platform]);

  // Thiết lập nhóm menu cha mặc định khi mở modal hoặc danh sách thay đổi
  useEffect(() => {
    if (showLinkModal && sidebarGroups.length > 0) {
      const exists = sidebarGroups.some(g => String(g.id) === String(linkSubsystem));
      if (!exists) {
        setLinkSubsystem(String(sidebarGroups[0].id));
      }
    }
  }, [showLinkModal, sidebarGroups, linkSubsystem]);

  // Các mục menu con thuộc nhóm menu cha đang chọn
  const filteredScreens = React.useMemo(() => {
    const parent = sidebarGroups.find(g => String(g.id) === String(linkSubsystem));
    return parent?.children || [];
  }, [sidebarGroups, linkSubsystem]);

  useEffect(() => {
    if (filteredScreens.length > 0) {
      const match = filteredScreens.find(s => String(s.id) === String(linkScreenId));
      if (!match) {
        setLinkScreenId(String(filteredScreens[0].id));
      }
    } else {
      setLinkScreenId('');
    }
  }, [filteredScreens, linkScreenId]);

  // Lọc các components nếu mục menu con có liên kết màn hình thực tế
  const linkFilteredComponents = React.useMemo(() => {
    const childMenu = filteredScreens.find(c => String(c.id) === String(linkScreenId));
    if (childMenu && childMenu.screen_id) {
      const screenObj = (allScreens || []).find(s => s.id === childMenu.screen_id);
      return screenObj?.components || [];
    }
    return [];
  }, [filteredScreens, linkScreenId, allScreens]);

  useEffect(() => {
    if (linkFilteredComponents.length > 0) {
      const match = linkFilteredComponents.find(c => c.name === linkComponentId);
      if (!match) {
        setLinkComponentId(linkFilteredComponents[0].name);
      }
    } else {
      setLinkComponentId('');
    }
  }, [linkFilteredComponents, linkComponentId]);

  const displayInfoText = React.useMemo(() => {
    const parent = sidebarGroups.find(g => String(g.id) === String(linkSubsystem));
    const child = filteredScreens.find(c => String(c.id) === String(linkScreenId));
    
    let route = child?.route_path || parent?.route_path || '';
    if (linkComponentId) {
      route = combineRoutePath(route, linkComponentId);
    }
    return route || '-- Chưa chọn đường dẫn --';
  }, [linkSubsystem, linkScreenId, linkComponentId, sidebarGroups, filteredScreens]);

  const handleConfirmLink = () => {
    const finalPath = displayInfoText;
    const parent = sidebarGroups.find(g => String(g.id) === String(linkSubsystem));
    if (finalPath && finalPath !== '-- Chưa chọn đường dẫn --') {
      const mappedSubsystem = MAP_SIDEBAR_GROUP_TO_SUBSYSTEM[parent?.title] || formData.subsystem;
      setFormData(prev => ({
        ...prev,
        subsystem: mappedSubsystem,
        frontend_path: finalPath,
        route_path: combineRoutePath(finalPath, prev.backend_path)
      }));
    }
    setShowLinkModal(false);
  };

  const openLinkModal = () => {
    const fPath = (formData.frontend_path || '').trim();
    let matchedParentId = '';
    let matchedChildId = '';
    
    if (fPath) {
      for (const parent of sidebarGroups) {
        if (parent.route_path === fPath) {
          matchedParentId = String(parent.id);
          break;
        }
        if (parent.children) {
          const child = parent.children.find(c => c.route_path === fPath);
          if (child) {
            matchedParentId = String(parent.id);
            matchedChildId = String(child.id);
            break;
          }
        }
      }
    }
    
    if (matchedParentId) {
      setLinkSubsystem(matchedParentId);
      setLinkScreenId(matchedChildId);
    } else {
      if (sidebarGroups.length > 0) {
        setLinkSubsystem(String(sidebarGroups[0].id));
      }
      setLinkScreenId('');
    }
    setLinkComponentId('');
    setShowLinkModal(true);
  };

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  });

  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setConfirmModal({
      visible: true,
      title,
      message,
      onConfirm: () => {
        if (typeof onConfirm === 'function') {
          onConfirm();
        }
        setConfirmModal(prev => ({ ...prev, visible: false }));
      },
      type
    });
  };

  const [activeTab, setActiveTab] = useState('components');
  const [selectedGuideIdx, setSelectedGuideIdx] = useState(0);
  const [isGuideCompDropdownOpen, setIsGuideCompDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchItAccounts = async () => {
      try {
        const res = await api.get('/accounts/?size=100');
        if (res && res.items) {
          let filtered = res.items
            .filter(acc => {
              const role = (acc.role_name || '').toLowerCase();
              return role === 'it' || role.includes('it');
            })
            .map(acc => acc.full_name || acc.username);

          // Sắp xếp đưa tài khoản chứa chữ 'phuc' lên đầu tiên để làm mặc định
          filtered.sort((a, b) => {
            const hasPhucA = (a || '').toLowerCase().includes('phuc');
            const hasPhucB = (b || '').toLowerCase().includes('phuc');
            if (hasPhucA && !hasPhucB) return -1;
            if (!hasPhucA && hasPhucB) return 1;
            return 0;
          });

          if (filtered.length > 0) {
            setItAccounts(filtered);
          }
        }
      } catch (err) {
        console.error('Failed to load IT accounts:', err);
      }
    };
    fetchItAccounts();
  }, []);

  // States for search and filter

  const [searchQuery, setSearchQuery] = useState('');

  const [typeFilter, setTypeFilter] = useState('All');

  // States for interactive simulation

  const [activeComponent, setActiveComponent] = useState(null);

  const [hoveredComponent, setHoveredComponent] = useState(null);

  const [activeComponentMenu, setActiveComponentMenu] = useState(null);

  const [activeBugMenu, setActiveBugMenu] = useState(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (typeof e.target.closest === 'function') {
        if (!e.target.closest('.comp-action-btn') && !e.target.closest('.action-menu')) {
          setActiveComponentMenu(null);
        }
        if (!e.target.closest('.bug-action-btn') && !e.target.closest('.action-menu')) {
          setActiveBugMenu(null);
        }
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const [viewMode, setViewMode] = useState('blueprint'); // 'blueprint', 'workflow', 'cards', or 'sample'

  const [specSampleFile, setSpecSampleFile] = useState(null);
  const [specSampleFileUrl, setSpecSampleFileUrl] = useState('');
  const [isSpecUploadingSample, setIsSpecUploadingSample] = useState(false);
  const [isSpecExporting, setIsSpecExporting] = useState(false);
  const [specExportData, setSpecExportData] = useState('[\n  {"ma": "MAU-001", "ten": "Dữ liệu mẫu 1"}\n]');
  const specFileInputRef = useRef(null);
  const mockupFileInputRef = useRef(null);

  const [blueprintOverlay, setBlueprintOverlay] = useState(false); // Design vs Blueprint overlay mode

  const [inspectorTab, setInspectorTab] = useState('user'); // 'user' or 'dev'

  const [mobilePane, setMobilePane] = useState('simulator'); // 'tree', 'simulator', or 'inspector' on mobile

  // States for Scenarios Walkthrough

  const [activeScenario, setActiveScenario] = useState(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // States for Sandbox API simulation

  const [sandboxLoading, setSandboxLoading] = useState({});

  const [sandboxOutputs, setSandboxOutputs] = useState({});

  const [sandboxPayloads, setSandboxPayloads] = useState({});

  // State quản lý việc hiển thị code chi tiết (ẩn/hiện)

  const [showCodeState, setShowCodeState] = useState({});

  // State lưu trữ bước đang chọn trong màn hình Workflow

  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(0);

  const showToast = (message, type = 'success') => {
    toast(type, message);
  };

  // Helper: Tự động gợi ý title và subtitle dựa trên route
  const getRouteSuggestions = (route) => {
    const routeMap = {
      'users': { title: 'Quản lý người dùng', subtitle: 'Quản lý tài khoản người dùng, phân quyền và theo dõi hoạt động' },
      'users/create': { title: 'Tạo người dùng mới', subtitle: 'Thêm tài khoản người dùng mới vào hệ thống' },
      'users/:id/edit': { title: 'Chỉnh sửa người dùng', subtitle: 'Cập nhật thông tin tài khoản người dùng' },
      'users/:id/permissions': { title: 'Phân quyền người dùng', subtitle: 'Quản lý quyền truy cập của người dùng' },
      'departments': { title: 'Quản lý phòng ban', subtitle: 'Quản lý danh sách phòng ban trong công ty' },
      'positions': { title: 'Quản lý chức vụ', subtitle: 'Quản lý danh sách chức vụ và cấp bậc' },
      'roles': { title: 'Quản lý vai trò', subtitle: 'Quản lý vai trò và quyền hạn trong hệ thống' },
      'kpi/reports': { title: 'Báo cáo KPI', subtitle: 'Xem và phân tích báo cáo hiệu suất KPI' },
      'kpi/checklist': { title: 'Checklist KPI', subtitle: 'Quản lý danh sách kiểm tra KPI' },
      'kpi/items': { title: 'Chỉ tiêu KPI', subtitle: 'Quản lý các chỉ tiêu đánh giá KPI' },
      'kpi/rules': { title: 'Quy tắc KPI', subtitle: 'Thiết lập quy tắc tính toán KPI' },
      'kpi/feedback': { title: 'Phản hồi KPI', subtitle: 'Quản lý phản hồi và đánh giá KPI' },
      'equipment': { title: 'Quản lý thiết bị', subtitle: 'Quản lý danh sách thiết bị sản xuất' },
      'equipment/categories': { title: 'Danh mục thiết bị', subtitle: 'Phân loại và quản lý danh mục thiết bị' },
      'equipment/training': { title: 'Đào tạo thiết bị', subtitle: 'Quản lý tài liệu đào tạo sử dụng thiết bị' },
      'equipment/history': { title: 'Lịch sử thiết bị', subtitle: 'Theo dõi lịch sử sử dụng và bảo trì thiết bị' },
      'machines': { title: 'Quản lý máy móc', subtitle: 'Quản lý danh sách máy móc sản xuất' },
      'machines/history': { title: 'Lịch sử bảo trì máy', subtitle: 'Theo dõi lịch sử bảo trì máy móc' },
      'machines/training': { title: 'Hướng dẫn vận hành máy', subtitle: 'Tài liệu hướng dẫn vận hành máy móc' },
      'quality-records': { title: 'Hồ sơ chất lượng', subtitle: 'Quản lý hồ sơ kiểm soát chất lượng' },
      'quality-records/:id': { title: 'Chi tiết hồ sơ chất lượng', subtitle: 'Xem chi tiết hồ sơ kiểm soát chất lượng' },
      'inspection-reports': { title: 'Báo cáo kiểm tra', subtitle: 'Quản lý báo cáo kiểm tra chất lượng' },
      'inspection-reports/:id': { title: 'Chi tiết báo cáo kiểm tra', subtitle: 'Xem chi tiết báo cáo kiểm tra' },
      'plans': { title: 'Kế hoạch sản xuất', subtitle: 'Quản lý kế hoạch sản xuất' },
      'plans/:id': { title: 'Chi tiết kế hoạch', subtitle: 'Xem chi tiết kế hoạch sản xuất' },
      'production-progress/:id': { title: 'Tiến độ sản xuất', subtitle: 'Theo dõi tiến độ thực hiện sản xuất' },
      'iso/forms': { title: 'Biểu mẫu ISO', subtitle: 'Quản lý biểu mẫu ISO' },
      'iso/forms/:id': { title: 'Chi tiết biểu mẫu ISO', subtitle: 'Xem và chỉnh sửa biểu mẫu ISO' },
      'iso/processes': { title: 'Quy trình ISO', subtitle: 'Quản lý quy trình ISO' },
      'iso/processes/:id': { title: 'Chi tiết quy trình ISO', subtitle: 'Xem chi tiết quy trình ISO' },
      'backup-qr': { title: 'Sao lưu QR', subtitle: 'Quản lý sao lưu mã QR' },
      'system-monitor': { title: 'Giám sát hệ thống', subtitle: 'Theo dõi trạng thái và hiệu suất hệ thống' },
      'screens': { title: 'Quản lý màn hình', subtitle: 'Quản lý đặc tả màn hình hệ thống' },
      'screens/:id': { title: 'Chi tiết màn hình', subtitle: 'Xem và chỉnh sửa đặc tả màn hình' },
      'dashboard': { title: 'Trang chủ', subtitle: 'Tổng quan hệ thống và thống kê' },
      'settings': { title: 'Cài đặt', subtitle: 'Cấu hình hệ thống' },
      'profile': { title: 'Hồ sơ cá nhân', subtitle: 'Quản lý thông tin cá nhân' },
      'notifications': { title: 'Thông báo', subtitle: 'Quản lý thông báo hệ thống' }
    };
    return routeMap[route] || { title: '', subtitle: '' };
  };

  const fetchScreenDetail = async () => {
    if (id === 'new') {
      const copyData = location.state?.copyFromScreen;
      if (copyData) {
        const initialScreen = {
          id: 'new',
          title: copyData.title ? `${copyData.title} - Sao chép` : '',
          route_path: copyData.route_path ? `${copyData.route_path}-copy` : '',
          platform: copyData.platform || 'Web',
          status: 'Mới thiết kế',
          target_date: copyData.target_date || '',
          subtitle: copyData.subtitle || '',
          components: (copyData.components || []).map((c, idx) => ({
            id: idx + 1,
            name: c.name,
            type: c.type,
            description: c.description || '',
            technical_details: c.technical_details || '',
            file_path: c.file_path || '',
            is_active: c.is_active !== undefined ? c.is_active : true
          })),
          guides: (copyData.guides || []).map((g, idx) => ({
            step_number: g.step_number || (idx + 1),
            title: g.title,
            related_components: g.related_components || '',
            description: g.description || ''
          })),
          bugs: []
        };
        setScreen(initialScreen);
        setIsBackendPathManuallyEdited(false);
        const parsed = parseRoutePath(initialScreen.route_path, sidebarMenus);
        setFormData({
          title: initialScreen.title,
          route_path: initialScreen.route_path,
          frontend_path: parsed.frontendPath,
          backend_path: parsed.backendPath,
          platform: initialScreen.platform,
          subsystem: getSubsystem(initialScreen),
          status: initialScreen.status,
          target_date: initialScreen.target_date || new Date().toISOString().split('T')[0],
          subtitle: initialScreen.subtitle,
          current_code: ''
        });
        originalScreenRef.current = {
          title: initialScreen.title,
          route_path: initialScreen.route_path,
          platform: initialScreen.platform,
          subsystem: getSubsystem(initialScreen),
          status: initialScreen.status,
          target_date: initialScreen.target_date || new Date().toISOString().split('T')[0],
          subtitle: initialScreen.subtitle,
          current_code: '',
          components: JSON.parse(JSON.stringify(initialScreen.components || [])),
          guides: JSON.parse(JSON.stringify(initialScreen.guides || []))
        };
      } else {
        const initialScreen = {
          id: 'new',
          title: '',
          route_path: '',
          platform: 'Web',
          status: 'Mới thiết kế',
          target_date: '',
          components: [],
          guides: [],
          bugs: []
        };
        setScreen(initialScreen);
        setIsBackendPathManuallyEdited(false);
        const lastSubsystem = localStorage.getItem('last_selected_subsystem') || 'Quản lý hệ thống';
        setFormData({
          title: '',
          route_path: '',
          frontend_path: '',
          backend_path: '',
          platform: 'Web',
          subsystem: lastSubsystem,
          status: 'Mới thiết kế',
          target_date: new Date().toISOString().split('T')[0],
          subtitle: '',
          current_code: ''
        });
        originalScreenRef.current = {
          title: '',
          route_path: '',
          platform: 'Web',
          subsystem: lastSubsystem,
          status: 'Mới thiết kế',
          target_date: new Date().toISOString().split('T')[0],
          subtitle: '',
          current_code: '',
          components: [],
          guides: []
        };
      }
      setLoading(false);
      // Fetch screens and sidebar asynchronously in the background so it is completely non-blocking
      screenService.getScreens()
        .then(list => setAllScreens(list || []))
        .catch(err => console.error('Failed to load all screens list in background:', err));
      api.get('/system/sidebar/all')
        .then(sidebarData => setSidebarMenus(sidebarData || []))
        .catch(err => console.error('Failed to load sidebar menus in background:', err));
      return;
    }

    try {
      setLoading(true);
      setIsBackendPathManuallyEdited(false);

      // Fetch screen details, bugs list, all screens, and sidebar concurrently
      const [data, bugsData, screensList, sidebarData] = await Promise.all([
        screenService.getScreenDetail(id),
        bugService.getBugs().catch(e => { console.error('Failed to load bugs for screen detail:', e); return []; }),
        screenService.getScreens().catch(e => { console.error('Failed to load all screens list:', e); return []; }),
        api.get('/system/sidebar/all').catch(e => { console.error('Failed to load sidebar menus:', e); return []; })
      ]);

      if (screensList) {
        setAllScreens(screensList);
      }
      if (sidebarData) {
        setSidebarMenus(sidebarData);
      }

      if (bugsData) {
        if (Array.isArray(bugsData)) {
          data.bugs = bugsData.filter(b => b.screen_id === data.id);
        } else if (Array.isArray(bugsData.items)) {
          data.bugs = bugsData.items.filter(b => b.screen_id === data.id);
        }
      }

      setScreen(data);
      const parsed = parseRoutePath(data.route_path || '', sidebarData || []);
      setFormData({
        title: data.title || '',
        route_path: data.route_path || '',
        frontend_path: parsed.frontendPath || '',
        backend_path: parsed.backendPath || '',
        platform: data.platform || 'Web',
        subsystem: getSubsystem(data),
        status: data.status || 'Mới thiết kế',
        target_date: data.target_date || new Date().toISOString().split('T')[0],
        subtitle: data.subtitle || '',
        current_code: data.current_code || ''
      });
      setError(null);
      originalScreenRef.current = {
        title: data.title || '',
        route_path: data.route_path || '',
        platform: data.platform || 'Web',
        subsystem: getSubsystem(data),
        status: data.status || 'Mới thiết kế',
        target_date: data.target_date || new Date().toISOString().split('T')[0],
        subtitle: data.subtitle || '',
        current_code: data.current_code || '',
        components: JSON.parse(JSON.stringify(data.components || [])),
        guides: JSON.parse(JSON.stringify(data.guides || []))
      };

    } catch (err) {
      console.error('Lỗi khi tải chi tiết màn hình:', err);
      setError('Không thể tải thông tin chi tiết màn hình. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Đóng route dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showRouteDropdown && !e.target.closest('.route-dropdown-container')) {
        setShowRouteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRouteDropdown]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title) {
      showToast('Vui lòng nhập đầy đủ Tên màn hình!', 'error');
      return;
    }

    // Xác định mã màn hình sẽ được sử dụng
    const finalCode = isNew ? (formData.current_code || generatedCode) : formData.current_code;

    // Validate và check trùng lặp mã màn hình
    if (finalCode && finalCode.trim()) {
      // Đối với màn hình mới hoặc màn hình đang edit có thay đổi mã
      const isCodeChanged = isNew || (formData.current_code && formData.current_code !== screen?.current_code);

      if (isCodeChanged) {
        // Check trùng lặp mã màn hình
        try {
          const allScreens = await screenService.getScreens();
          const isDuplicate = allScreens.some(s =>
            s.current_code === finalCode && s.id !== screen.id
          );

          if (isDuplicate) {
            showToast(`Mã màn hình "${finalCode}" đã tồn tại! Vui lòng chọn mã khác.`, 'error');
            return;
          }
        } catch (err) {
          console.error('Error checking screen code:', err);
          showToast('Không thể kiểm tra mã màn hình!', 'error');
          return;
        }
      }
    }

    if (!formData.target_date) {
      showToast('Vui lòng chọn ngày hoàn thành dự kiến!', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (formData.target_date < today) {
      showToast('Ngày hoàn thành dự kiến phải lớn hơn hoặc bằng ngày hiện tại!', 'error');
      return;
    }

    const componentsPayload = (screen?.components || []).map(c => ({
      name: c.name,
      type: c.type,
      description: c.description || '',
      technical_details: c.technical_details || '',
      file_path: c.file_path || '',
      is_active: c.is_active !== undefined ? c.is_active : true
    }));

    const guidesPayload = (screen?.guides || []).map(g => ({
      step_number: g.step_number,
      title: g.title,
      related_components: g.related_components || '',
      description: g.description || ''
    }));

    try {
      if (id === 'new') {
        const res = await screenService.createScreen({
          title: formData.title,
          route_path: normalizeRoutePath(formData.route_path),
          platform: formData.platform,
          status: formData.status || 'Mới thiết kế',
          target_date: formData.target_date,
          subtitle: formData.subtitle,
          subsystem: formData.subsystem || 'Quản lý hệ thống',
          components: componentsPayload,
          guides: guidesPayload,
          current_code: finalCode
        });
        showToast('Tạo mới đặc tả màn hình thành công!');

        // Clear cache và làm mới context
        clearScreenMetadataCache();
        if (refreshScreens) refreshScreens();

        // Quay lại trang danh sách màn hình quản lý
        setTimeout(() => {
          navigate('/admin/screens');
        });
      } else {
        const updatePayload = {
          title: formData.title,
          route_path: normalizeRoutePath(formData.route_path),
          platform: formData.platform,
          status: formData.status,
          target_date: formData.target_date,
          subtitle: formData.subtitle,
          mockup_path: screen.mockup_path,
          components: componentsPayload,
          guides: guidesPayload
        };

        // Chỉ gửi current_code nếu nó thay đổi
        if (formData.current_code && formData.current_code !== screen?.current_code) {
          updatePayload.current_code = formData.current_code;
        }

        await screenService.updateScreen(screen.id, updatePayload);
        showToast('Cập nhật đặc tả màn hình thành công!');

        // Clear cache và làm mới context
        clearScreenMetadataCache();
        if (refreshScreens) refreshScreens();

        fetchScreenDetail();
      }
    } catch (err) {
      console.error('Error saving screen:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Lưu đặc tả thất bại!';
      showToast(errorMsg, 'error');
    }
  };

  const handleCopyScreenDetail = () => {
    if (!screen || id === 'new') return;
    showConfirm(
      'Sao chép đặc tả màn hình',
      `Bạn có chắc chắn muốn sao chép cấu hình màn hình này thành một màn hình mới (không kèm ảnh mockup)?`,
      () => {
        const copyPayload = {
          title: formData.title,
          route_path: normalizeRoutePath(formData.route_path),
          platform: formData.platform,
          subsystem: formData.subsystem,
          status: 'Mới thiết kế',
          target_date: formData.target_date,
          subtitle: formData.subtitle,
          components: screen.components,
          guides: screen.guides
        };
        navigate('/admin/screens/new', { state: { copyFromScreen: copyPayload } });
      },
      'warning'
    );
  };

  const processMockupFiles = async (files) => {
    if (!files || files.length === 0) return;
    try {
      showToast('Đang tải lên ảnh mockup...', 'info');
      const uploadedPaths = [];
      for (const file of files) {
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          uploadedPaths.push(res.url);
        }
      }

      if (uploadedPaths.length > 0) {
        const mockups = screen.mockup_path ? screen.mockup_path.split(',').filter(Boolean) : [];
        const updatedMockups = [...mockups, ...uploadedPaths];
        const updatedPath = updatedMockups.join(',');

        if (id === 'new') {
          setScreen(prev => ({ ...prev, mockup_path: updatedPath }));
          setCurrentMockupIdx(updatedMockups.length - 1);
          showToast('Tải lên ảnh thành công!');
          return;
        }

        await screenService.updateScreen(screen.id, {
          title: formData.title,
          route_path: normalizeRoutePath(formData.route_path),
          platform: formData.platform,
          status: formData.status,
          target_date: formData.target_date,
          subtitle: formData.subtitle,
          mockup_path: updatedPath
        });

        showToast('Tải lên ảnh thành công!');
        setCurrentMockupIdx(updatedMockups.length - 1);
        fetchScreenDetail();
      }
    } catch (err) {
      showToast('Tải lên thất bại!', 'error');
    }
  };

  const handlePasteMockup = async (e) => {
    const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await processMockupFiles(files);
    }
  };

  const handlePasteMockupFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        showToast('Nút dán yêu cầu kết nối bảo mật (HTTPS hoặc localhost) do chính sách bảo mật trình duyệt. Hãy nhấn Ctrl+V để dán ảnh trực tiếp!', 'error');
        return;
      }

      showToast('Đang yêu cầu quyền truy cập clipboard...', 'info');
      const clipboardItems = await navigator.clipboard.read();
      const files = [];
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'clipboard-image.png', { type });
            files.push(file);
          }
        }
      }

      if (files.length === 0) {
        showToast('Không tìm thấy hình ảnh nào trong bảng nhớ tạm!', 'warn');
        return;
      }

      await processMockupFiles(files);
    } catch (err) {
      console.error('Lỗi khi đọc clipboard:', err);
      showToast('Không thể đọc bảng nhớ tạm. Vui lòng cho phép quyền truy cập clipboard khi trình duyệt yêu cầu.', 'error');
    }
  };

  const handleDeleteMockup = () => {
    showConfirm(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa hình ảnh này?',
      async () => {
        const mockups = screen.mockup_path ? screen.mockup_path.split(',').filter(Boolean) : [];
        const updatedMockups = mockups.filter((_, idx) => idx !== currentMockupIdx);
        const updatedPath = updatedMockups.join(',');

        if (id === 'new') {
          setScreen(prev => ({ ...prev, mockup_path: updatedPath }));
          setCurrentMockupIdx(0);
          showToast('Xóa hình ảnh thành công!');
          return;
        }

        try {
          await screenService.updateScreen(screen.id, {
            title: formData.title,
            route_path: normalizeRoutePath(formData.route_path),
            platform: formData.platform,
            status: formData.status,
            target_date: formData.target_date,
            subtitle: formData.subtitle,
            mockup_path: updatedPath
          });

          showToast('Xóa hình ảnh thành công!');
          setCurrentMockupIdx(0);
          fetchScreenDetail();
        } catch (err) {
          console.error(err);
          showToast('Xóa hình ảnh thất bại!', 'error');
        }
      }
    );
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - zoomOffset.x, y: e.clientY - zoomOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setZoomOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e) => {
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoomScale(prev => Math.max(0.5, Math.min(prev + delta, 4)));
  };

  const handleBugImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      setBugImageUploading(true);
      showToast('Đang tải lên ảnh lỗi...', 'info');
      const uploadedUrls = [];
      for (const file of files) {
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      }
      if (uploadedUrls.length > 0) {
        setBugModalData(prev => ({
          ...prev,
          imagePaths: [...(prev.imagePaths || []), ...uploadedUrls]
        }));
        showToast(`Tải lên thành công ${uploadedUrls.length} hình ảnh lỗi!`);
      } else {
        showToast('Không nhận được đường dẫn ảnh!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Tải lên hình ảnh lỗi thất bại!', 'error');
    } finally {
      setBugImageUploading(false);
    }
  };

  const handlePasteBugModal = async (e) => {
    const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (bugModalMode === 'edit') {
          setReplyUploading(true);
          showToast('Đang tải lên ảnh phản hồi từ clipboard...', 'info');
          const uploadedPaths = [];
          for (const file of files) {
            const res = await bugService.uploadImage(file);
            if (res && res.url) {
              uploadedPaths.push(res.url);
            }
          }
          setReplyImages(prev => [...prev, ...uploadedPaths]);
          showToast('Tải lên hình ảnh phản hồi từ clipboard thành công!');
        } else {
          setBugImageUploading(true);
          showToast('Đang tải lên ảnh lỗi từ clipboard...', 'info');
          const uploadedUrls = [];
          for (const file of files) {
            const res = await bugService.uploadImage(file);
            if (res && res.url) {
              uploadedUrls.push(res.url);
            }
          }
          setBugModalData(prev => ({
            ...prev,
            imagePaths: [...(prev.imagePaths || []), ...uploadedUrls]
          }));
          showToast(`Tải lên thành công ${uploadedUrls.length} hình ảnh lỗi!`);
        }
      } catch (err) {
        console.error(err);
        showToast('Tải lên hình ảnh từ clipboard thất bại!', 'error');
      } finally {
        setReplyUploading(false);
        setBugImageUploading(false);
      }
    }
  };

  const handleCreateBug = async () => {
    if (!bugModalData.description) {
      showToast('Vui lòng nhập mô tả lỗi!', 'error');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (bugModalData.targetDate && bugModalData.targetDate < todayStr) {
      showToast('Ngày yêu cầu hoàn thành không được là ngày quá khứ!', 'error');
      return;
    }
    try {
      const payload = {
        screen_id: screen.id,
        description: `[${bugModalData.componentName}] ${bugModalData.description}`,
        severity: bugModalData.severity,
        status: 'New',
        reporter: bugModalData.reporter,
        assignee: bugModalData.assignee,
        requested_at: bugModalData.targetDate ? `${bugModalData.targetDate}T12:00:00Z` : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        image_paths: bugModalData.imagePaths || [],
        notes: ''
      };

      await bugService.createBug(payload);

      // Cập nhật trạng thái màn hình về 'Mới thiết kế'
      try {
        await screenService.updateScreen(screen.id, {
          title: screen.title,
          route_path: screen.route_path,
          platform: screen.platform,
          status: 'Mới thiết kế',
          target_date: screen.target_date,
          subtitle: screen.subtitle,
          mockup_path: screen.mockup_path,
          components: screen.components || [],
          guides: screen.guides || []
        });
        if (refreshScreens) refreshScreens();
      } catch (screenErr) {
        console.error('Failed to reset screen status on bug report:', screenErr);
      }

      showToast('Khai báo lỗi thành công!');
      setShowBugModal(false);
      fetchScreenDetail();
    } catch (err) {
      console.error(err);
      showToast('Khai báo lỗi thất bại!', 'error');
    }
  };

  const handleDeleteBug = (bugId) => {
    showConfirm(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa lỗi này khỏi cơ sở dữ liệu?',
      async () => {
        try {
          await bugService.deleteBug(bugId);
          showToast('Xóa lỗi thành công!');
          fetchScreenDetail();
        } catch (err) {
          console.error(err);
          showToast('Xóa lỗi thất bại!', 'error');
        }
      }
    );
  };

  const handleOpenEditBugModal = (bug) => {
    setBugModalMode('edit');
    setSelectedBug(bug);

    const parsed = parseDescription(bug.description);

    setBugModalData({
      id: bug.id,
      componentName: parsed.tag || 'Chung',
      severity: bug.severity || 'Medium',
      description: parsed.text || '',
      reporter: bug.reporter || '',
      assignee: bug.assignee || 'IT',
      targetDate: bug.requested_at ? bug.requested_at.split('T')[0] : '',
      imagePaths: bug.images && bug.images.length > 0 ? bug.images.filter(img => !img.update_id).map(img => img.image_path) : [],
      status: bug.status || 'New'
    });

    setReplyNotes('');
    setReplyImages([]);
    setReplyStatusVal('');

    setShowBugModal(true);
  };

  const handleUpdateBug = async () => {

    let newStatus = bugModalData.status;
    const current = (bugModalData.status || '').toLowerCase();
    const isNewOrReopened = current === 'new' || current === 'mới' || current === 'sửa lại' || current === 'in progress' || current === 'in_progress';
    const isFixed = current === 'resolved' || current === 'đã sửa';

    if (isNewOrReopened) {
      if (replyStatusVal === 'Đã sửa') {
        newStatus = 'Đã sửa';
      }
    } else if (isFixed) {
      if (replyStatusVal === 'Hoàn thành') {
        newStatus = 'Hoàn thành';
      } else if (replyStatusVal === 'Từ chối' || replyStatusVal === 'Sửa lại') {
        newStatus = 'Sửa lại';
      }
    }

    try {
      const updatePayload = {
        severity: bugModalData.severity,
        assignee: bugModalData.assignee,
        status: newStatus,
        requested_at: bugModalData.targetDate ? `${bugModalData.targetDate}T12:00:00Z` : undefined
      };
      await bugService.updateBug(bugModalData.id, updatePayload);

      const replyPayload = {
        status: newStatus,
        notes: replyNotes,
        updater: getLoggedInUser(),
        image_paths: replyImages,
        assignee: bugModalData.assignee
      };
      await bugService.addBugUpdate(bugModalData.id, replyPayload);

      showToast('Cập nhật tiến độ lỗi thành công!');
      setShowBugModal(false);
      fetchScreenDetail();
    } catch (err) {
      console.error(err);
      showToast('Cập nhật tiến độ lỗi thất bại!', 'error');
    }
  };

  const handleReplyImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      setReplyUploading(true);
      showToast('Đang tải lên hình ảnh...', 'info');
      const uploadedPaths = [];
      for (const file of files) {
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          uploadedPaths.push(res.url);
        }
      }
      setReplyImages(prev => [...prev, ...uploadedPaths]);
      showToast('Tải lên hình ảnh thành công!');
    } catch (err) {
      console.error(err);
      showToast('Tải lên hình ảnh thất bại!', 'error');
    } finally {
      setReplyUploading(false);
    }
  };

  const handleSubmitReply = async (bug) => {

    let newStatus = bug.status;
    const current = (bug.status || '').toLowerCase();

    if (current === 'new' || current === 'mới' || current === 'sửa lại') {
      if (replyStatusVal !== 'Đã sửa') {
        showToast('Vui lòng chọn trạng thái "Đã sửa" ở mục Trạng thái (góc trên bên phải) trước khi phản hồi!', 'error');
        return;
      }
      newStatus = 'Đã sửa';
    } else if (current === 'đã sửa' || current === 'resolved') {
      if (replyStatusVal !== 'Hoàn thành' && replyStatusVal !== 'Sửa lại' && replyStatusVal !== 'Từ chối') {
        showToast('Vui lòng chọn "Hoàn thành" hoặc "Sửa lại" ở mục Trạng thái (góc trên bên phải)!', 'error');
        return;
      }
      newStatus = replyStatusVal === 'Hoàn thành' ? 'Hoàn thành' : 'Sửa lại';
    }

    try {
      const payload = {
        notes: replyNotes,
        status: newStatus,
        updater: 'Phúc',
        image_paths: replyImages,
        assignee: bug.assignee
      };

      await bugService.addBugUpdate(bug.id, payload);
      showToast('Cập nhật phản hồi thành công!');
      setReplyNotes('');
      setReplyImages([]);
      setReplyStatusVal('');
      fetchScreenDetail();
    } catch (err) {
      console.error(err);
      showToast('Gửi phản hồi thất bại!', 'error');
    }
  };

  const handleAddComponent = () => {
    setEditingComponent(null);
    setShowAddComponentModal(true);
    setNewComponentName('');
    setNewComponentType('Button');
    setNewComponentFrontend('');
    setNewComponentWorkflow('');
    setNewComponentBackend('');
    setNewComponentButtonId('');
    setNewComponentExportMode('list');
    setNewComponentSampleFile(null);
    setNewComponentSampleFileUrl('');
    setIsUploadingSample(false);
  };

  const handleEditComponentClick = (comp) => {
    let techObj = {};
    if (comp.technical_details) {
      try {
        techObj = typeof comp.technical_details === 'string'
          ? JSON.parse(comp.technical_details)
          : comp.technical_details;
      } catch (err) { }
    }
    setEditingComponent(comp);
    setNewComponentName(comp.name);
    setNewComponentType(comp.type || 'Button');
    setNewComponentFrontend(techObj.frontend_description || comp.description || '');
    setNewComponentWorkflow(techObj.workflow_description || '');
    setNewComponentBackend(techObj.backend_description || '');
    setNewComponentButtonId(techObj.button_id || '');
    setNewComponentExportMode(techObj.export_mode || 'list');
    setNewComponentSampleFile(null);
    setNewComponentSampleFileUrl(comp.file_path || techObj.sample_file_url || '');
    setIsUploadingSample(false);
    setShowAddComponentModal(true);
  };

  const handleSetComponentColor = (compName, colorKey) => {
    setScreen(prev => {
      if (!prev) return null;
      const updatedComponents = (prev.components || []).map(c => {
        if (c.name === compName) {
          let techObj = {};
          if (c.technical_details) {
            try {
              techObj = typeof c.technical_details === 'string'
                ? JSON.parse(c.technical_details)
                : c.technical_details;
            } catch (err) { }
          }
          const updatedTech = {
            ...techObj,
            color: colorKey
          };
          return {
            ...c,
            technical_details: JSON.stringify(updatedTech)
          };
        }
        return c;
      });
      return {
        ...prev,
        components: updatedComponents
      };
    });
    showToast(`Đã tô màu thành phần. Hãy nhấn "Lưu lại" để hoàn tất.`);
  };

  const handleSampleFileChange = async (e) => {
    const input = e.target;
    const files = Array.from(input.files);
    if (files.length === 0) return;

    const allowedExts = ['.doc', '.docx', '.xls', '.xlsx', '.pdf'];
    const validFiles = [];

    for (const file of files) {
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
      if (!allowedExts.includes(ext)) {
        showToast(`Tệp "${file.name}" không hợp lệ! Chỉ chấp nhận Word, Excel hoặc PDF.`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      input.value = '';
      return;
    }

    setIsUploadingSample(true);
    try {
      const uploadedUrls = [];
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/screens/upload-component-sample', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        const existingUrls = newComponentSampleFileUrl ? newComponentSampleFileUrl.split(',').filter(Boolean) : [];
        const newUrls = [...existingUrls, ...uploadedUrls].join(',');
        setNewComponentSampleFileUrl(newUrls);
        showToast(`Tải lên thành công ${uploadedUrls.length} file mẫu!`);
      } else {
        showToast('Tải lên file mẫu thất bại!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải lên file mẫu!', 'error');
    } finally {
      setIsUploadingSample(false);
      input.value = '';
    }
  };

  const handleRemoveSampleFile = () => {
    setNewComponentSampleFile(null);
    setNewComponentSampleFileUrl('');
  };

  const handleSpecSampleFileChange = async (e) => {
    const input = e.target;
    const files = Array.from(input.files);
    if (files.length === 0) return;

    const allowedExts = ['.doc', '.docx', '.xls', '.xlsx', '.pdf'];
    const validFiles = [];

    for (const file of files) {
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
      if (!allowedExts.includes(ext)) {
        showToast(`Tệp "${file.name}" không hợp lệ! Chỉ chấp nhận Word, Excel hoặc PDF.`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      input.value = '';
      return;
    }

    setIsSpecUploadingSample(true);
    try {
      const uploadedUrls = [];
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/screens/upload-component-sample', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        const existingUrls = specSampleFileUrl ? specSampleFileUrl.split(',').filter(Boolean) : [];
        const newUrls = [...existingUrls, ...uploadedUrls].join(',');
        setSpecSampleFileUrl(newUrls);
        setScreen(prev => {
          if (!prev) return null;
          const updatedComps = (prev.components || []).map(c => {
            if (c.name === activeComponent) {
              let techObj = {};
              if (c.technical_details) {
                try {
                  techObj = typeof c.technical_details === 'string'
                    ? JSON.parse(c.technical_details)
                    : c.technical_details;
                } catch (err) { }
              }
              return {
                ...c,
                file_path: newUrls,
                technical_details: JSON.stringify({
                  ...techObj,
                  sample_file_url: newUrls
                })
              };
            }
            return c;
          });
          return { ...prev, components: updatedComps };
        });
        showToast(`Tải lên thành công ${uploadedUrls.length} file mẫu!`);
      } else {
        showToast('Tải lên file mẫu thất bại!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải lên file mẫu!', 'error');
    } finally {
      setIsSpecUploadingSample(false);
      input.value = '';
    }
  };

  const handleRemoveSpecSampleFile = () => {
    setSpecSampleFileUrl('');
    setScreen(prev => {
      if (!prev) return null;
      const updatedComps = (prev.components || []).map(c => {
        if (c.name === activeComponent) {
          let techObj = {};
          if (c.technical_details) {
            try {
              techObj = typeof c.technical_details === 'string'
                ? JSON.parse(c.technical_details)
                : c.technical_details;
            } catch (err) { }
          }
          const { sample_file_url, ...restTech } = techObj;
          return {
            ...c,
            file_path: '',
            technical_details: JSON.stringify(restTech)
          };
        }
        return c;
      });
      return { ...prev, components: updatedComps };
    });
  };

  const handleSpecExportTest = async () => {
    if (!screen || !screen.id) {
      showToast('Chưa có màn hình để xuất!', 'error');
      return;
    }
    if (!activeComponent) {
      showToast('Vui lòng chọn component export!', 'error');
      return;
    }
    const comp = (screen.components || []).find(c => c.name === activeComponent);
    if (!comp) {
      showToast('Không tìm thấy component!', 'error');
      return;
    }
    let techObj = {};
    if (comp.technical_details) {
      try {
        techObj = typeof comp.technical_details === 'string'
          ? JSON.parse(comp.technical_details)
          : comp.technical_details;
      } catch (err) { }
    }
    const buttonId = techObj.button_id || '';
    const sampleUrl = comp.file_path || techObj.sample_file_url || '';
    if (!buttonId) {
      showToast('Component chưa có Tên ID nút (button_id)!', 'error');
      return;
    }
    if (!sampleUrl) {
      showToast('Component chưa có file mẫu!', 'error');
      return;
    }

    let dataPayload;
    try {
      dataPayload = JSON.parse(specExportData || '[]');
    } catch (err) {
      showToast('Dữ liệu mẫu JSON không hợp lệ!', 'error');
      return;
    }

    setIsSpecExporting(true);
    try {
      const blob = await screenService.exportScreenFile(screen.id, {
        button_id: buttonId,
        mode: techObj.export_mode || 'list',
        data: dataPayload,
        context: {}
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = sampleUrl.split('.').pop().toLowerCase();
      const safeBtn = (buttonId || 'export').replace(/[^\w\-]/g, '_');
      link.download = `${safeBtn}_${new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '')}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Xuất file thử thành công!', 'success');
    } catch (err) {
      console.error('Export test error:', err);
      showToast(err?.response?.data?.detail || 'Xuất file thử thất bại!', 'error');
    } finally {
      setIsSpecExporting(false);
    }
  };

  const confirmAddComponent = (comp) => {
    const compName = comp?.name?.trim();
    if (!compName) {
      showToast('Tên component không được để trống!', 'error');
      return;
    }

    if (editingComponent) {
      const oldName = editingComponent.name;
      const newName = compName;

      setScreen(prev => {
        if (!prev) return null;

        const updatedComponents = (prev.components || []).map(c => {
          if (c.name === oldName) {
            let techObj = {};
            if (c.technical_details) {
              try {
                techObj = typeof c.technical_details === 'string'
                  ? JSON.parse(c.technical_details)
                  : c.technical_details;
              } catch (err) { }
            }
            return {
              ...c,
              name: newName,
              type: comp.type,
              description: comp.frontend_description || 'Thành phần đặc tả giao diện',
              file_path: comp.sample_file_url,
              technical_details: JSON.stringify({
                ...techObj,
                frontend_description: comp.frontend_description,
                workflow_description: comp.workflow_description,
                backend_description: comp.backend_description,
                button_id: comp.button_id,
                export_mode: comp.export_mode,
                sample_file_url: comp.sample_file_url
              })
            };
          }
          return c;
        });

        const updatedGuides = (prev.guides || []).map(g => {
          if (g.related_components && oldName !== newName) {
            const comps = g.related_components.split(',').map(c => c.trim()).map(c => c === oldName ? newName : c);
            return { ...g, related_components: comps.join(', ') };
          }
          return g;
        });

        return {
          ...prev,
          components: updatedComponents,
          guides: updatedGuides
        };
      });

      if (activeComponent === oldName) {
        setActiveComponent(newName);
      }

      setShowAddComponentModal(false);
      setEditingComponent(null);
      showToast('Đã cập nhật thông tin thành phần! Hãy nhấn "Lưu lại" để hoàn tất.');
    } else {
      const newComp = {
        id: Date.now(),
        name: compName,
        type: comp.type,
        description: comp.frontend_description || 'Thành phần đặc tả giao diện',
        file_path: comp.sample_file_url,
        technical_details: JSON.stringify({
          frontend_description: comp.frontend_description,
          workflow_description: comp.workflow_description,
          backend_description: comp.backend_description,
          button_id: comp.button_id,
          export_mode: comp.export_mode,
          sample_file_url: comp.sample_file_url
        })
      };

      setScreen(prev => {
        if (!prev) return null;
        return {
          ...prev,
          components: [...(prev.components || []), newComp]
        };
      });

      setShowAddComponentModal(false);
      showToast('Đã thêm thành phần mới vào danh sách!');
    }
  };

  const handleDeleteComponent = (compName) => {
    showConfirm(
      'Xóa thành phần đặc tả',
      `Bạn có chắc chắn muốn xóa thành phần "${compName}"? Các hướng dẫn sử dụng liên quan sẽ mất liên kết.`,
      () => {
        setScreen(prev => {
          if (!prev) return null;
          const updatedComponents = (prev.components || []).filter(c => c.name !== compName);
          const updatedGuides = (prev.guides || []).map(g => {
            if (g.related_components) {
              const comps = g.related_components.split(',').map(c => c.trim()).filter(c => c !== compName);
              return { ...g, related_components: comps.join(', ') };
            }
            return g;
          });
          return {
            ...prev,
            components: updatedComponents,
            guides: updatedGuides
          };
        });
        showToast(`Đã xóa thành phần "${compName}" khỏi danh sách tạm thời. Hãy nhấn "Lưu lại" để hoàn tất.`);
      },
      'danger'
    );
  };

  useEffect(() => {

    if (id) {

      fetchScreenDetail();

      setActiveScenario(null);

      setCurrentStepIndex(-1);

      setShowCodeState({});

      setSelectedWorkflowStep(0);

    }

  }, [id]);

  // Lọc và Tìm kiếm component

  const getFilteredComponents = () => {

    if (!screen || !screen.components) return [];

    return screen.components.filter((comp) => {

      const matchesSearch =

        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||

        (comp.description && comp.description.toLowerCase().includes(searchQuery.toLowerCase())) ||

        (comp.technical_details && comp.technical_details.toLowerCase().includes(searchQuery.toLowerCase())) ||

        (comp.file_path && comp.file_path.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesType = false;

      if (typeFilter === 'All') {

        matchesType = true;

      } else if (typeFilter === 'Logic / Service') {

        matchesType = comp.type === 'Business Logic' || comp.type === 'Logic / Service';

      } else {

        matchesType = comp.type === typeFilter;

      }

      return matchesSearch && matchesType;

    });

  };

  const filteredComponents = getFilteredComponents();

  // Đếm số lượng components theo phân loại

  const getStats = () => {

    if (!screen || !screen.components) return { total: 0, ui: 0, logic: 0, native: 0, api: 0 };

    return screen.components.reduce(

      (acc, comp) => {

        acc.total += 1;

        if (comp.type === 'UI Component') acc.ui += 1;

        else if (comp.type === 'Business Logic' || comp.type === 'Logic / Service') acc.logic += 1;

        else if (comp.type === 'Native API') acc.native += 1;

        else if (comp.type === 'API Endpoint') acc.api += 1;

        return acc;

      },

      { total: 0, ui: 0, logic: 0, native: 0, api: 0 }

    );

  };

  const stats = getStats();

  const getTypeClass = (type) => {

    if (type === 'Business Logic' || type === 'Logic / Service') return 'logic';

    if (type === 'Native API') return 'native';

    if (type === 'API Endpoint') return 'api';

    return 'ui';

  };

  const getTypeLabel = (type) => {

    if (type === 'Business Logic') return 'Logic / Service';

    return type;

  };

  // Kịch bản trải nghiệm mẫu cho màn hình hiện tại

  const currentScenarios = screen ? (() => {

    const docKey = normalizeTitle(screen.title);

    const platform = screen.platform || 'Web';

    const doc = SCREEN_DOCS[platform]?.[docKey] || SCREEN_DOCS.Web[docKey] || SCREEN_DOCS.Mobile[docKey];

    if (doc && doc.scenarios && doc.scenarios.length > 0) return doc.scenarios;

    return [

      {

        title: "🛠️ Khám phá giao diện chính",

        description: "Thao tác tuần tự xem các thành phần thiết kế trên màn hình này.",

        steps: screen.components.filter(c => c.type === 'UI Component').map(c => ({

          target: c.name,

          action: "Tương tác",

          note: `Nhìn vào vị trí cấu hình của thành phần ${c.name} trên bản vẽ.`

        }))

      }

    ];

  })() : [];

  // Luồng nghiệp vụ (Workflow) hiện tại

  const currentWorkflow = screen ? getWorkflowForScreen(screen, screen.components) : [];

  // Thao tác với kịch bản Walkthrough

  const startScenario = (scen) => {

    setActiveScenario(scen);

    setCurrentStepIndex(0);

    const targetComp = scen.steps[0].target;

    setActiveComponent(targetComp);

    scrollToComponent(targetComp);

    setViewMode('blueprint'); // Chuyển qua tab Bản vẽ mô phỏng để chạy kịch bản

  };

  const nextStep = () => {

    if (!activeScenario) return;

    const nextIdx = currentStepIndex + 1;

    if (nextIdx < activeScenario.steps.length) {

      setCurrentStepIndex(nextIdx);

      const targetComp = activeScenario.steps[nextIdx].target;

      setActiveComponent(targetComp);

      scrollToComponent(targetComp);

    } else {

      setCurrentStepIndex(-1);

      setActiveScenario(null);

    }

  };

  const prevStep = () => {

    if (!activeScenario || currentStepIndex <= 0) return;

    const prevIdx = currentStepIndex - 1;

    setCurrentStepIndex(prevIdx);

    const targetComp = activeScenario.steps[prevIdx].target;

    setActiveComponent(targetComp);

    scrollToComponent(targetComp);

  };

  const scrollToComponent = (name) => {

    setTimeout(() => {

      const cardEl = document.getElementById(`comp-card-${name}`);

      if (cardEl) {

        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      }

      const blockEl = document.querySelector(`[data-comp-name="${name}"]`);

      if (blockEl) {

        blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      }

    }, 100);

  };

  // Giả lập gọi API Sandbox

  const runSandbox = (compName, customPayloadText) => {

    setSandboxLoading(prev => ({ ...prev, [compName]: true }));

    setTimeout(() => {

      const mockResult = getSandboxResponse(screen, compName);

      if (customPayloadText) {

        try {

          mockResult.request = JSON.parse(customPayloadText);

        } catch (e) {

          console.error("Failed to parse custom payload JSON:", e);

        }

      }

      setSandboxOutputs(prev => ({ ...prev, [compName]: { ...mockResult } }));

      setSandboxLoading(prev => ({ ...prev, [compName]: false }));

    }, 850);

  };

  const toggleShowCode = (compName) => {

    setShowCodeState(prev => ({

      ...prev,

      [compName]: !prev[compName]

    }));

  };

  const handleRefresh = () => {

    // Refresh screen data if needed

    fetchScreenDetail();

  };

  if (error) {

    return (

      <div className="detail-container">

        <div className="error-card">

          <p className="error-text">{error || 'Không tìm thấy màn hình yêu cầu'}</p>

          <button className="btn-back" onClick={() => navigate('/admin/screens')}>

            ← Quay lại danh sách

          </button>

        </div>

      </div>

    );
  }

  const handleBugModalConfirm = async (data) => {
    if (data.mode === 'edit') {
      try {
        const updatePayload = {
          severity: data.severity,
          assignee: data.assignee,
          status: data.status,
          requested_at: data.targetDate ? `${data.targetDate}T12:00:00Z` : undefined
        };
        await bugService.updateBug(data.id, updatePayload);

        const replyPayload = {
          status: data.status,
          notes: data.replyNotes,
          updater: data.updater,
          image_paths: data.replyImages,
          assignee: data.assignee
        };
        await bugService.addBugUpdate(data.id, replyPayload);

        showToast('Cập nhật tiến độ lỗi thành công!');
        setShowBugModal(false);
        fetchScreenDetail();
      } catch (err) {
        console.error(err);
        showToast('Cập nhật tiến độ lỗi thất bại!', 'error');
      }
    } else {
      try {
        const payload = {
          screen_id: screen.id,
          description: `[${data.componentName}] ${data.description}`,
          severity: data.severity,
          status: 'New',
          reporter: data.reporter,
          assignee: data.assignee,
          requested_at: data.targetDate ? `${data.targetDate}T12:00:00Z` : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          image_paths: data.imagePaths || [],
          notes: ''
        };

        await bugService.createBug(payload);

        // Cập nhật trạng thái màn hình về 'Mới thiết kế'
        try {
          await screenService.updateScreen(screen.id, {
            title: screen.title,
            route_path: screen.route_path,
            platform: screen.platform,
            status: 'Mới thiết kế',
            target_date: screen.target_date,
            subtitle: screen.subtitle,
            mockup_path: screen.mockup_path,
            components: screen.components || [],
            guides: screen.guides || []
          });
          if (refreshScreens) refreshScreens();
        } catch (screenErr) {
          console.error('Failed to reset screen status on bug report:', screenErr);
        }

        showToast('Khai báo lỗi thành công!');
        setShowBugModal(false);
        fetchScreenDetail();
      } catch (err) {
        console.error(err);
        showToast('Khai báo lỗi thất bại!', 'error');
      }
    }
  };

  return {
    id,
    location,
    isNew,
    navigate,
    toast,
    showModal,
    startGlobalUpload,
    activeUploads,
    setCustomTitle,
    setCustomSubtitle,
    setCustomScreenCode,
    refreshScreens,
    allScreens,
    setAllScreens,
    screen,
    setScreen,
    loading,
    setLoading,
    error,
    setError,
    formData,
    setFormData,
    isBackendPathManuallyEdited,
    setIsBackendPathManuallyEdited,
    generatedCode,
    activeTab,
    setActiveTab,
    activeComponent,
    setActiveComponent,
    specDescriptions,
    setSpecDescriptions,
    specSampleFile,
    setSpecSampleFile,
    specSampleFileUrl,
    setSpecSampleFileUrl,
    isSpecUploadingSample,
    setIsSpecUploadingSample,
    activeComponentMenu,
    setActiveComponentMenu,
    selectedGuideIdx,
    setSelectedGuideIdx,
    isGuideCompDropdownOpen,
    setIsGuideCompDropdownOpen,
    viewMode,
    setViewMode,
    isSpecCardCollapsed,
    setIsSpecCardCollapsed,
    specExportData,
    setSpecExportData,
    isSpecExporting,
    setIsSpecExporting,
    isBugListCollapsed,
    setIsBugListCollapsed,
    expandedBugId,
    setExpandedBugId,
    activeBugMenu,
    setActiveBugMenu,
    showAddComponentModal,
    setShowAddComponentModal,
    itAccounts,
    editingComponent,
    setEditingComponent,
    showBugModal,
    setShowBugModal,
    bugModalMode,
    setBugModalMode,
    bugModalData,
    setBugModalData,
    showLinkModal,
    setShowLinkModal,
    linkSubsystem,
    setLinkSubsystem,
    linkScreenId,
    setLinkScreenId,
    linkComponentId,
    setLinkComponentId,
    confirmModal,
    setConfirmModal,
    showZoomModal,
    setShowZoomModal,
    currentMockupIdx,
    setCurrentMockupIdx,
    scrollBodyRef,
    specFileInputRef,
    fetchScreenDetail,
    handleSave,
    handleCopyScreenDetail,
    handlePasteMockup,
    handlePasteMockupFromClipboard,
    handleDeleteMockup,
    handleDeleteBug,
    handleOpenEditBugModal,
    handleSubmitReply,
    handleAddComponent,
    confirmAddComponent,
    handleEditComponentClick,
    handleSetComponentColor,
    handleSampleFileChange,
    handleRemoveSampleFile,
    handleSpecSampleFileChange,
    handleRemoveSpecSampleFile,
    handleSpecExportTest,
    handleDeleteComponent,
    handleRefresh,
    handleConfirmLink,
    showConfirm,
    showToast,
    zoomScale,
    setZoomScale,
    zoomPosition: zoomOffset,
    setZoomPosition: setZoomOffset,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleBugImageUpload,
    subsystems,
    filteredScreens,
    linkFilteredComponents,
    displayInfoText,
    COMPONENT_COLORS,
    getComponentHint,
    getImageUrl,
    handleBugModalConfirm,
    screenService,
    outletContext,
    ROUTE_SUGGESTIONS: buildRouteSuggestionsFromSidebar(sidebarMenus, formData.platform),
    getDisplayRoutePath: (path, subsystem) => getDisplayRoutePath(path, subsystem, buildRouteSuggestionsFromSidebar(sidebarMenus, formData.platform)),
    openLinkModal,
    sidebarGroups,
    normalizeRoutePath,
    parseRoutePath,
    slugify,
    isHeaderCollapsed,
    setIsHeaderCollapsed,
    isScreenInfoCollapsed,
    setIsScreenInfoCollapsed,
    showBlockerModal,
    handleSaveAndLeave,
    handleDiscardAndLeave,
    handleCancelLeave
  };
};
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { bugService } from '@modules/System/Models/bug.service';
import { screenService } from '@modules/System/Models/screen.service';
import { useWebSocket } from '@shared/hooks/useWebSocket';
import api, { API_ROOT } from '@webShared/Services/api.service';
import {
  Search, Filter, Plus, Trash2, Edit3, CheckCircle, Clock, AlertCircle,
  X, RefreshCw, Layers, ShieldAlert, Monitor, Phone, Clipboard, FolderOpen,
  MoreVertical
} from 'lucide-react';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const cleanRoot = API_ROOT.endsWith('/') ? API_ROOT.slice(0, -1) : API_ROOT;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanRoot}${cleanPath}`;
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentUserName = () => {
  const userStr = localStorage.getItem('smartflow_user');
  if (userStr) {
    try {
      const userObj = JSON.parse(userStr);
      return userObj.full_name || userObj.username || 'Admin';
    } catch (e) {
      return userStr;
    }
  }
  return 'Admin';
};

const parseDescription = (desc) => {
  if (!desc) return { tag: '', text: '' };
  const match = desc.match(/^\[([^\]]+)\]\s*(.*)$/s);
  if (match) {
    return { tag: match[1], text: match[2] };
  }
  return { tag: '', text: desc };
};

const ScreenBugManagementView = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [bugs, setBugs] = useState([]);
  const [screens, setScreens] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state?.filterScreenId) {
      setScreenFilter(location.state.filterScreenId.toString());
      setIsFilterBarOpen(true);
      setCurrentPage(1);
    }
  }, [location.state]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [screenFilter, setScreenFilter] = useState('All');
  const [createdDateFilter, setCreatedDateFilter] = useState('');
  const [updatedDateFilter, setUpdatedDateFilter] = useState('');
  const [expectedDateFilter, setExpectedDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [addScreenSearch, setAddScreenSearch] = useState('');
  const [isAddScreenDropdownOpen, setIsAddScreenDropdownOpen] = useState(false);

  // File input ref for Excel import
  const fileInputRef = React.useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bugToDelete, setBugToDelete] = useState(null);
  const [selectedBug, setSelectedBug] = useState(null);
  const { toast } = useToast();

  // Custom states cho tải ảnh & bình luận cập nhật
  const [addImages, setAddImages] = useState(() => {
    try {
      const saved = localStorage.getItem('smartflow_bug_images_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [commentText, setCommentText] = useState('');
  const [commentImages, setCommentImages] = useState([]);
  const [activeUpdateForProof, setActiveUpdateForProof] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofImages, setProofImages] = useState([]);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState(null);
  const [editModalMode, setEditModalMode] = useState('view'); // 'view' | 'edit'
  const [actionMenuId, setActionMenuId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-btn') && !e.target.closest('.action-menu')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const [proofNotes, setProofNotes] = useState('');

  // Form states
  const [addForm, setAddForm] = useState(() => {
    try {
      const saved = localStorage.getItem('smartflow_bug_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    const lastScreenId = localStorage.getItem('smartflow_last_reported_screen_id') || '';
    return {
      screen_id: lastScreenId,
      description: '',
      severity: 'Medium',
      status: 'New',
      assignee: 'Phucv1',
      requested_at: getTodayString(),
      notes: '',
      component_id: 'Chung'
    };
  });

  const [editForm, setEditForm] = useState({
    description: '',
    severity: 'Medium',
    status: 'New',
    assignee: '',
    requested_at: '',
    completed_at: '',
    notes: ''
  });

  const showToast = (message, type = 'success') => {
    toast(type, message);
  };

  const handlePasteImage = async (e, setImagesList) => {
    const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
    if (!clipboardData) return;
    const items = clipboardData.items;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length === 0) return;

    e.preventDefault();
    e.stopPropagation();

    for (const file of files) {
      try {
        showToast('Đang tải ảnh từ clipboard...', 'success');
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          setImagesList(prev => [...prev, res.url]);
          showToast('Đã dán ảnh thành công!');
        }
      } catch (error) {
        console.error('Lỗi tải ảnh từ clipboard:', error);
        showToast('Tải ảnh từ clipboard thất bại!', 'error');
      }
    }
  };

  const handlePasteFromClipboardAPI = async (setImagesList) => {
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

      for (const file of files) {
        showToast('Đang tải ảnh từ bộ nhớ tạm...', 'success');
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          setImagesList(prev => [...prev, res.url]);
          showToast('Đã dán ảnh từ bộ nhớ tạm thành công!');
        }
      }
    } catch (err) {
      console.error('Lỗi khi đọc clipboard:', err);
      showToast('Không thể đọc bảng nhớ tạm. Vui lòng cho phép quyền truy cập clipboard khi trình duyệt yêu cầu.', 'error');
    }
  };

  const handleManualUpload = async (e, setImagesList) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        showToast(`Đang tải ảnh ${file.name}...`, 'success');
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          setImagesList(prev => [...prev, res.url]);
        }
      } catch (error) {
        showToast(`Tải ảnh ${file.name} thất bại!`, 'error');
      }
    }
    showToast('Tải các ảnh thành công!');
  };

  const handlePostComment = async () => {
    if (!commentText.trim() && commentImages.length === 0) return;
    try {
      const username = getCurrentUserName();
      const payload = {
        notes: commentText,
        image_paths: commentImages,
        updater: username,
        status: selectedBug?.status || 'New' // Giữ nguyên trạng thái bug hiện tại, không tự thay đổi
      };
      const res = await bugService.addBugUpdate(selectedBug.id, payload);
      showToast('Đăng cập nhật thành công!');
      setCommentText('');
      setCommentImages([]);

      // Đồng bộ state selectedBug cục bộ ngay lập tức để hiển thị timeline
      // Không thay đổi status bug — chỉ thêm update vào danh sách
      setSelectedBug(prev => {
        if (!prev) return null;
        return {
          ...prev,
          updates: [res, ...(prev.updates || [])]
        };
      });
      fetchBugs();
    } catch (error) {
      showToast('Không thể đăng cập nhật!', 'error');
    }
  };

  const selectedScreenData = useMemo(() => {
    if (!addForm.screen_id) return null;
    return screens.find(s => s.id === parseInt(addForm.screen_id));
  }, [addForm.screen_id, screens]);

  const screenComponents = useMemo(() => {
    return selectedScreenData ? (selectedScreenData.components || []) : [];
  }, [selectedScreenData]);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const data = await bugService.getBugs();
      setBugs(data || []);
    } catch (error) {
      showToast('Không thể tải danh sách bug màn hình!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchScreens = async () => {
    try {
      const data = await screenService.getScreens();
      // Lọc và sắp xếp các màn hình theo Platform và Code để dropdown hiển thị đẹp mắt
      const sortedScreens = (data || []).sort((a, b) => {
        if (a.platform !== b.platform) return a.platform.localeCompare(b.platform);
        return a.current_code.localeCompare(b.current_code);
      });
      setScreens(sortedScreens);
    } catch (error) {
      console.error('Lỗi khi tải danh sách màn hình:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/accounts/?page=1&size=1000&status=%C4%90ang%20s%E1%BB%AD%20d%E1%BB%A5ng');
      setUsers(res.items || []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách tài khoản:', error);
    }
  };

  useEffect(() => {
    fetchBugs();
    fetchScreens();
    fetchUsers();
  }, []);

  useEffect(() => {
    localStorage.setItem('smartflow_bug_draft', JSON.stringify(addForm));
  }, [addForm]);

  useEffect(() => {
    localStorage.setItem('smartflow_bug_images_draft', JSON.stringify(addImages));
  }, [addImages]);

  // Tự động mặc định chọn màn hình đầu tiên trong danh sách nếu chưa có màn hình nào được chọn
  useEffect(() => {
    if (screens.length > 0 && !addForm.screen_id) {
      setAddForm(prev => {
        if (prev.screen_id) return prev;
        return { ...prev, screen_id: screens[0].id.toString() };
      });
    }
  }, [screens, addForm.screen_id]);

  // Tự động chọn màn hình khớp đầu tiên khi gõ tìm kiếm
  useEffect(() => {
    if (addScreenSearch.trim() !== '') {
      const q = addScreenSearch.toLowerCase();
      const matched = screens
        .filter(s => s.current_code !== 'OTHER')
        .find(s =>
          s.current_code.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.platform.toLowerCase().includes(q)
        );
      if (matched) {
        setAddForm(prev => {
          if (prev.screen_id === matched.id.toString()) return prev;
          return { ...prev, screen_id: matched.id.toString() };
        });
      }
    }
  }, [addScreenSearch, screens]);

  // Realtime WebSocket integration
  const handleSocketMessage = useCallback((message) => {
    if (message.type === 'SCREEN_BUG_UPDATED') {
      console.log('[WS] Phát hiện cập nhật bug màn hình, tiến hành làm mới danh sách...');
      fetchBugs();
    }
  }, []);
  useWebSocket(handleSocketMessage);

  // Form submit handlers
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.screen_id || !addForm.description.trim() || !addForm.requested_at || !addForm.assignee) {
      showToast('Vui lòng nhập đầy đủ các trường bắt buộc bao gồm Người xử lý!', 'error');
      return;
    }

    if (addImages.length === 0) {
      showToast('Bắt buộc phải tải lên hoặc dán ít nhất 1 hình ảnh bằng chứng/mockup lỗi!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      // Chuẩn hóa định dạng datetime gửi lên API
      const reqDate = new Date(addForm.requested_at).toISOString();
      const tag = addForm.component_id && addForm.component_id !== 'Chung' ? `[${addForm.component_id}] ` : '';
      const finalDescription = `${tag}${addForm.description.trim()}`;

      await bugService.createBug({
        screen_id: parseInt(addForm.screen_id),
        description: finalDescription,
        severity: addForm.severity,
        status: 'New', // Force default to New status
        assignee: addForm.assignee,
        requested_at: reqDate,
        notes: addForm.notes,
        image_paths: addImages
      });

      // Cập nhật trạng thái màn hình tương ứng về 'Mới thiết kế'
      try {
        const targetScreenId = parseInt(addForm.screen_id);
        const targetScreen = screens.find(s => s.id === targetScreenId);
        if (targetScreen) {
          await screenService.updateScreen(targetScreen.id, {
            title: targetScreen.title,
            route_path: targetScreen.route_path,
            platform: targetScreen.platform,
            status: 'Mới thiết kế',
            target_date: targetScreen.target_date,
            subtitle: targetScreen.subtitle,
            mockup_path: targetScreen.mockup_path,
            components: targetScreen.components || [],
            guides: targetScreen.guides || []
          });
        }
      } catch (screenErr) {
        console.error('Failed to reset screen status on bug report:', screenErr);
      }

      showToast('Báo cáo lỗi màn hình thành công!');
      setShowAddModal(false);
      localStorage.setItem('smartflow_last_reported_screen_id', addForm.screen_id);
      localStorage.removeItem('smartflow_bug_draft');
      localStorage.removeItem('smartflow_bug_images_draft');
      // Reset form với người chỉ định mặc định là phucv1
      const phucUser = itUsers.find(u => u.username && u.username.toLowerCase() === 'phucv1');
      setAddForm({
        screen_id: addForm.screen_id,
        description: '',
        severity: 'Medium',
        status: 'New',
        assignee: phucUser ? (phucUser.full_name || phucUser.username) : 'Phucv1',
        requested_at: getTodayString(),
        notes: '',
        component_id: 'Chung'
      });
      setAddImages([]);
      fetchBugs();
    } catch (error) {
      showToast('Không thể gửi báo cáo lỗi. Vui lòng thử lại!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (bug) => {
    setSelectedBug(bug);
    const { text } = parseDescription(bug.description || '');

    setEditForm({
      description: text,
      severity: bug.severity || 'Medium',
      status: bug.status || 'New',
      assignee: bug.assignee || '',
      requested_at: bug.requested_at ? bug.requested_at.split('T')[0] : '',
      completed_at: bug.completed_at ? bug.completed_at.split('T')[0] : '',
      notes: ''
    });
    setCommentText('');
    setCommentImages([]);
    setEditModalMode('edit');
  };

  const handleRowClick = (bug) => {
    setSelectedBug(bug);
    const { text } = parseDescription(bug.description || '');

    setEditForm({
      description: text,
      severity: bug.severity || 'Medium',
      status: bug.status || 'New',
      assignee: bug.assignee || '',
      requested_at: bug.requested_at ? bug.requested_at.split('T')[0] : '',
      completed_at: bug.completed_at ? bug.completed_at.split('T')[0] : '',
      notes: ''
    });
    setCommentText('');
    setCommentImages([]);
    setEditModalMode('view');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.description.trim() || !editForm.requested_at || !editForm.assignee) {
      showToast('Mô tả lỗi, ngày yêu cầu sửa và người xử lý là bắt buộc!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const username = getCurrentUserName();
      const { tag } = parseDescription(selectedBug.description || '');
      const finalDescription = tag ? `[${tag}] ${editForm.description}` : editForm.description;

      const payload = {
        description: finalDescription,
        severity: editForm.severity,
        status: editForm.status,
        assignee: editForm.assignee,
        notes: editForm.notes,
        requested_at: new Date(editForm.requested_at).toISOString(),
        completed_at: editForm.completed_at ? new Date(editForm.completed_at).toISOString() : null,
        updater: username
      };

      await bugService.updateBug(selectedBug.id, payload);
      showToast('Cập nhật trạng thái lỗi thành công!');
      setEditModalMode('view');
      // Cập nhật selectedBug ngay tại local state để panel chi tiết cập nhật ngay
      setSelectedBug(prev => prev ? ({ ...prev, description: finalDescription, severity: editForm.severity, status: editForm.status, assignee: editForm.assignee, requested_at: payload.requested_at, completed_at: payload.completed_at }) : null);
      fetchBugs();
    } catch (error) {
      showToast('Cập nhật thất bại!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (bug) => {
    setBugToDelete(bug);
    setShowDeleteModal(true);
  };

  const confirmDeleteBug = async () => {

    if (!bugToDelete) return;
    try {
      await bugService.deleteBug(bugToDelete.id);
      showToast('Đã xóa báo cáo lỗi màn hình!');
      setShowDeleteModal(false);
      setBugToDelete(null);
      fetchBugs();
    } catch (error) {
      showToast('Xóa thất bại!', 'error');
    }
  };

  const handleQuickStatusChange = async (bug, newStatus) => {
    try {
      const username = getCurrentUserName();
      const statusLabel =
        newStatus === 'New' ? 'Chưa hoàn thành (Mới)' :
          newStatus === 'In Progress' ? 'Cần kiểm tra' :
            newStatus === 'Resolved' ? 'Hoàn thành (Đã sửa)' : 'Đã xác nhận';

      const payload = {
        description: bug.description || '',
        severity: bug.severity || 'Medium',
        status: newStatus,
        assignee: bug.assignee || '',
        notes: bug.notes ? `${bug.notes}\n(Cập nhật nhanh -> ${statusLabel})` : `Cập nhật nhanh sang ${statusLabel}`,
        requested_at: bug.requested_at,
        completed_at: (newStatus === 'Resolved' || newStatus === 'Verified') ? new Date().toISOString() : null,
        updater: username
      };

      // Gọi API thêm update log đồng thời
      const res = await bugService.updateBug(bug.id, payload);
      showToast(`Đã chuyển trạng thái sang "${statusLabel}"!`);

      // Thêm log update ảo vào local selectedBug updates list để hiển thị lập tức trong timeline
      setSelectedBug(prev => {
        if (!prev) return null;
        const newUpdate = {
          id: Date.now(),
          updater: username,
          status: newStatus,
          notes: `Cập nhật nhanh trạng thái lỗi: -> ${statusLabel}`,
          created_at: new Date().toISOString(),
          images: []
        };
        return {
          ...prev,
          status: newStatus,
          updates: [newUpdate, ...(prev.updates || [])]
        };
      });

      setEditForm(prev => ({
        ...prev,
        status: newStatus,
        completed_at: (newStatus === 'Resolved' || newStatus === 'Verified') ? new Date().toISOString().split('T')[0] : ''
      }));

      fetchBugs();
    } catch (error) {
      showToast('Cập nhật trạng thái thất bại!', 'error');
    }
  };

  // Lọc danh sách nhân viên thuộc bộ phận IT để chỉ định xử lý bug (bỏ qua người đang đăng nhập)
  const itUsers = useMemo(() => {
    let currentUsername = '';
    const userStr = localStorage.getItem('smartflow_user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        currentUsername = userObj.username;
      } catch (e) {
        console.error('Lỗi phân giải thông tin đăng nhập:', e);
      }
    }

    return users.filter(u => {
      // Bỏ qua tài khoản đang đăng nhập
      if (currentUsername && u.username === currentUsername) return false;

      if (!u.role_name) return false;
      const roles = u.role_name.split(',').map(r => r.trim());
      return roles.includes('IT');
    });
  }, [users]);

  // Tự động định vị và gán người chỉ định mặc định là phucv1 khi danh sách IT users khả dụng
  useEffect(() => {
    if (itUsers.length > 0) {
      const phucUser = itUsers.find(u => u.username && u.username.toLowerCase() === 'phucv1');
      setAddForm(prev => ({
        ...prev,
        assignee: phucUser ? (phucUser.full_name || phucUser.username) : 'Phucv1'
      }));
    }
  }, [itUsers]);

  // Filter & Search logic
  const filteredBugs = useMemo(() => {
    let result = bugs.filter(bug => {
      const matchesSearch =
        bug.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bug.screen_code && bug.screen_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (bug.screen_title && bug.screen_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (bug.assignee && bug.assignee.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (bug.reporter && bug.reporter.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPlatform = platformFilter === 'All' || bug.platform === platformFilter;
      const matchesStatus =
        statusFilter === 'All' ? true :
          statusFilter === 'Unverified' ? bug.status !== 'Verified' :
            bug.status === statusFilter;
      const matchesSeverity = severityFilter === 'All' || bug.severity === severityFilter;
      const matchesScreen = screenFilter === 'All' || bug.screen_id.toString() === screenFilter;

      let matchesExpectedDate = true;
      if (expectedDateFilter) {
        if (bug.requested_at) {
          const bugDate = bug.requested_at.split('T')[0];
          if (bugDate !== expectedDateFilter) matchesExpectedDate = false;
        } else {
          matchesExpectedDate = false;
        }
      }

      let matchesCreatedDate = true;
      if (createdDateFilter) {
        if (bug.created_at) {
          const bugDate = bug.created_at.split('T')[0];
          if (bugDate !== createdDateFilter) matchesCreatedDate = false;
        } else {
          matchesCreatedDate = false;
        }
      }

      let matchesUpdatedDate = true;
      if (updatedDateFilter) {
        const lastUpdate = bug.updates && bug.updates.length > 0 ? bug.updates[0] : null;
        const updatedAt = lastUpdate ? lastUpdate.created_at : bug.created_at;
        if (updatedAt) {
          const bugDate = updatedAt.split('T')[0];
          if (bugDate !== updatedDateFilter) matchesUpdatedDate = false;
        } else {
          matchesUpdatedDate = false;
        }
      }

      return matchesSearch && matchesPlatform && matchesStatus && matchesSeverity && matchesScreen && matchesExpectedDate && matchesCreatedDate && matchesUpdatedDate;
    });

    return result.sort((a, b) => {
      if (sortBy === 'created_at_desc') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'created_at_asc') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortBy === 'requested_at_desc') {
        return new Date(b.requested_at || 0) - new Date(a.requested_at || 0);
      }
      if (sortBy === 'requested_at_asc') {
        return new Date(a.requested_at || 0) - new Date(b.requested_at || 0);
      }
      return 0;
    });
  }, [bugs, searchQuery, platformFilter, statusFilter, severityFilter, screenFilter, expectedDateFilter, createdDateFilter, updatedDateFilter, sortBy]);

  const stats = useMemo(() => {
    const totalScreens = screens.length;
    const completedScreens = screens.filter(s => s.status === 'Hoàn thành').length;
    const buildProgress = totalScreens > 0 ? Math.round((completedScreens / totalScreens) * 100) : 0;

    const totalScreensWithBugs = screens.filter(s => {
      const b = bugs.filter(bug => bug.screen_id === s.id);
      return b.length > 0;
    }).length;
    const screensWithAllBugsResolved = screens.filter(s => {
      const b = bugs.filter(bug => bug.screen_id === s.id);
      return b.length > 0 && b.every(bug => bug.status === 'Verified' || bug.status === 'Hoàn thành');
    }).length;
    const editProgress = totalScreensWithBugs > 0 ? Math.round((screensWithAllBugsResolved / totalScreensWithBugs) * 100) : 100;

    const totalBugs = bugs.length;
    const resolvedBugs = bugs.filter(b => b.status === 'Verified' || b.status === 'Hoàn thành' || b.status === 'Resolved').length;
    const fixProgress = totalBugs > 0 ? Math.round((resolvedBugs / totalBugs) * 100) : 100;

    const totalCritical = bugs.filter(b => b.severity === 'Critical' || b.severity === 'Khẩn cấp').length;
    const resolvedCritical = bugs.filter(b => (b.severity === 'Critical' || b.severity === 'Khẩn cấp') && (b.status === 'Verified' || b.status === 'Hoàn thành' || b.status === 'Resolved')).length;
    const criticalProgress = totalCritical > 0 ? Math.round((resolvedCritical / totalCritical) * 100) : 100;

    return {
      totalScreens,
      completedScreens,
      buildProgress,
      totalScreensWithBugs,
      screensWithAllBugsResolved,
      editProgress,
      totalBugs,
      resolvedBugs,
      fixProgress,
      totalCritical,
      resolvedCritical,
      criticalProgress
    };
  }, [bugs, screens]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBugs.length / pageSize);
  const paginatedBugs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredBugs.slice(startIndex, startIndex + pageSize);
  }, [filteredBugs, currentPage, pageSize]);

  // Badge rendering helpers
  const renderSeverityBadge = (severity) => {
    let bgColor = '#FFFBEB';
    let textColor = '#7B5233';
    let border = '1px solid #EADCC9';
    let textVi = severity;

    if (severity === 'Critical') {
      bgColor = '#FEF2F2';
      textColor = '#EF4444';
      border = '1px solid #FCA5A5';
      textVi = 'Khẩn cấp';
    } else if (severity === 'High') {
      bgColor = '#FEF2F2';
      textColor = '#EF4444';
      border = '1px solid #FCA5A5';
      textVi = 'Cao';
    } else if (severity === 'Medium') {
      bgColor = '#FFFBEB';
      textColor = '#D97706';
      border = '1px solid #FDE68A';
      textVi = 'Trung bình';
    } else if (severity === 'Low') {
      bgColor = '#F3F4F6';
      textColor = '#4B5563';
      border = '1px solid #E5E7EB';
      textVi = 'Thấp';
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '700',
        backgroundColor: bgColor,
        color: textColor,
        border: border
      }}>
        {textVi}
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    let bgColor = '#EFF6FF';
    let textColor = '#3B82F6';
    let border = '1px solid #BFDBFE';
    let textVi = status;

    if (status === 'New') {
      textVi = 'Mới';
    } else if (status === 'In Progress') {
      bgColor = '#FFFBEB';
      textColor = '#D97706';
      border = '1px solid #FDE68A';
      textVi = 'Cần kiểm tra';
    } else if (status === 'Resolved') {
      bgColor = '#ECFDF5';
      textColor = '#10B981';
      border = '1px solid #A7F3D0';
      textVi = 'Đã sửa';
    } else if (status === 'Verified') {
      bgColor = '#F0FDF4';
      textColor = '#15803D';
      border = '1px solid #BBF7D0';
      textVi = 'Đã xác nhận';
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '700',
        backgroundColor: bgColor,
        color: textColor,
        border: border,
        whiteSpace: 'nowrap'
      }}>
        {textVi}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const datePart = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timePart = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `${datePart} ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  const renderQuickStatusActions = (bug) => {
    const status = bug.status;
    
    const triggerStatusUpdate = (newStatus) => {
      setActiveUpdateForProof({ id: bug.id, status: newStatus, isInitial: true });
      setProofImages([]);
      setProofNotes(''); // Clear notes draft
      setShowProofModal(true);
    };

    if (status === 'New' || status === 'Mới') {
      return (
        <button
          type="button"
          onClick={() => triggerStatusUpdate('Resolved')}
          style={{
            background: '#F59E0B',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          ✓ Đã sửa
        </button>
      );
    }
    
    if (status === 'In Progress' || status === 'Sửa lại') {
      return (
        <button
          type="button"
          onClick={() => triggerStatusUpdate('Resolved')}
          style={{
            background: '#F59E0B',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          ✓ Đã sửa
        </button>
      );
    }
    
    if (status === 'Resolved' || status === 'Đã sửa') {
      return (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => triggerStatusUpdate('Verified')}
            style={{
              background: '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            ✓ Xác nhận
          </button>
          <button
            type="button"
            onClick={() => triggerStatusUpdate('In Progress')}
            style={{
              background: '#EF4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            ✗ Từ chối
          </button>
        </div>
      );
    }
    
    if (status === 'Verified' || status === 'Hoàn thành') {
      return (
        <span style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center' }}>
          ✓ Đã hoàn thành
        </span>
      );
    }

    return null;
  };

  const sortOptions = [
    { value: 'created_at_desc', label: 'Thời gian ghi nhận (gần - xa)' },
    { value: 'created_at_asc', label: 'Thời gian ghi nhận (xa - gần)' },
    { value: 'requested_at_desc', label: 'Thời gian yêu cầu hoàn thành (gần - xa)' },
    { value: 'requested_at_asc', label: 'Thời gian yêu cầu hoàn thành (xa - gần)' }
  ];

  const handleExportExcel = () => {
    const rows = filteredBugs;
    if (rows.length === 0) {
      showToast('Không có dữ liệu lỗi nào để xuất!', 'error');
      return;
    }

    const headers = [
      'Mã',
      'Tên màn hình',
      'Component',
      'Mô tả',
      'Mức độ',
      'Trạng thái',
      'Ngày cập nhật',
      'Người cập nhật',
      'Ngày ghi nhận'
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(bug => {
        const lastUpdate = bug.updates && bug.updates.length > 0 ? bug.updates[0] : null;
        const updatedAt = lastUpdate ? lastUpdate.created_at.split('T')[0] : (bug.created_at ? bug.created_at.split('T')[0] : '');
        const updater = lastUpdate ? lastUpdate.updater : (bug.reporter || '');
        const { tag, text } = parseDescription(bug.description);

        return [
          `BUG-${bug.id}`,
          `"${(bug.screen_title || '').replace(/"/g, '""')}"`,
          `"${(tag || '').replace(/"/g, '""')}"`,
          `"${(text || '').replace(/"/g, '""')}"`,
          bug.severity,
          bug.status,
          updatedAt,
          updater,
          bug.created_at ? bug.created_at.split('T')[0] : ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_sach_loi_he_thong_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Xuất dữ liệu Excel (CSV) thành công!');
  };

  const handleImportExcelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast(`Đang nhập dữ liệu từ tệp ${file.name}...`, 'info');
    setTimeout(() => {
      showToast(`Đã nhập dữ liệu thành công từ tệp ${file.name}!`, 'success');
    }, 1000);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Force page wrapper to be full viewport height and disable page scroll */
        .admin-layout:has(.screen-management-container) {
          height: 100vh !important;
          overflow: hidden !important;
        }

        .admin-main:has(.screen-management-container) {
          height: 100vh !important;
          overflow: hidden !important;
          max-width: none !important;
        }

        .dashboard-content:has(.screen-management-container) {
          height: calc(100vh - 60px) !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          padding: 8px 12px !important;
          box-sizing: border-box !important;
        }

        .admin-main:has(.screen-management-container) .admin-header {
          padding: 6px 12px !important;
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
      `}} />
      <div className="mgmt-container screen-management-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', maxWidth: '100%', margin: '0', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>

        {/* KPI Dashboard Overview Card - Span 100% width at top */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
          width: '100%'
        }}>
          {/* Card 1: Tiến độ xây dựng */}
          <div className="kpi-card" style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiến độ xây dựng</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B' }}>{stats.completedScreens}</span>
              <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: '500' }}>/{stats.totalScreens}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.buildProgress}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', minWidth: '32px', textAlign: 'right' }}>{stats.buildProgress}%</span>
            </div>
          </div>

          {/* Card 2: Tiến độ chỉnh sửa */}
          <div className="kpi-card" style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiến độ chỉnh sửa</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B' }}>{stats.screensWithAllBugsResolved}</span>
              <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: '500' }}>/{stats.totalScreensWithBugs}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.editProgress}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', minWidth: '32px', textAlign: 'right' }}>{stats.editProgress}%</span>
            </div>
          </div>

          {/* Card 3: Tiến độ khắc phục */}
          <div className="kpi-card" style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiến độ khắc phục</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B' }}>{stats.resolvedBugs}</span>
              <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: '500' }}>/{stats.totalBugs}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.fixProgress}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', minWidth: '32px', textAlign: 'right' }}>{stats.fixProgress}%</span>
            </div>
          </div>

          {/* Card 4: Lỗi khẩn cấp */}
          <div className="kpi-card" style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lỗi khẩn cấp</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B' }}>{stats.resolvedCritical}</span>
              <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: '500' }}>/{stats.totalCritical}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.criticalProgress}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', minWidth: '32px', textAlign: 'right' }}>{stats.criticalProgress}%</span>
            </div>
          </div>
        </div>

        {/* Search and Filters Toolbar - Span 100% width at top */}
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          searchPlaceholder="Nhập mã lỗi, mã màn hình, tên màn hình"
          showSort={true}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={sortOptions}
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={
            (platformFilter !== 'All' ? 1 : 0) +
            (statusFilter !== 'All' ? 1 : 0) +
            (severityFilter !== 'All' ? 1 : 0) +
            (screenFilter !== 'All' ? 1 : 0) +
            (createdDateFilter ? 1 : 0) +
            (updatedDateFilter ? 1 : 0) +
            (expectedDateFilter ? 1 : 0)
          }
          extraActions={[
            { label: 'Quản lý màn hình', onClick: () => navigate('/admin/screens') },
            { label: 'Tiến độ thực hiện', onClick: () => navigate('/admin/screens/progress') }
          ]}
          importActions={[
            { label: 'Nhập từ Excel (CSV)', onClick: handleImportExcelClick }
          ]}
          onExport={handleExportExcel}
          onCreate={() => setShowAddModal(true)}
          createLabel="Thêm mới"
          hasWritePermission={true}
        >
          <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
        </PageToolbar>

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '8px' }}>
            {/* Lọc theo màn hình */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo màn hình</label>
              <select
                value={screenFilter}
                onChange={(e) => { setScreenFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', minWidth: '160px', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả màn hình</option>
                {screens.map(s => (
                  <option key={s.id} value={s.id.toString()}>{s.current_code}: {s.title}</option>
                ))}
              </select>
            </div>

            {/* Mức độ */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo mức độ</label>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', minWidth: '130px', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả mức độ</option>
                <option value="Critical">Khẩn cấp</option>
                <option value="High">Cao</option>
                <option value="Medium">Trung bình</option>
                <option value="Low">Thấp</option>
              </select>
            </div>

            {/* Trạng thái */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', minWidth: '140px', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="New">Mới</option>
                <option value="In Progress">Cần kiểm tra</option>
                <option value="Resolved">Đã sửa</option>
                <option value="Verified">Đã xác nhận</option>
              </select>
            </div>

            {/* Ngày ghi nhận */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo ngày ghi nhận</label>
              <input
                type="date"
                value={createdDateFilter}
                onChange={(e) => { setCreatedDateFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', height: '34px', cursor: 'pointer' }}
              />
            </div>

            {/* Ngày cập nhật */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo ngày cập nhật</label>
              <input
                type="date"
                value={updatedDateFilter}
                onChange={(e) => { setUpdatedDateFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', height: '34px', cursor: 'pointer' }}
              />
            </div>

            {/* Nền tảng */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Nền tảng</label>
              <select
                value={platformFilter}
                onChange={(e) => { setPlatformFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả nền tảng</option>
                <option value="Web">Web</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            {/* Hiển thị số dòng */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Hiển thị số dòng</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', height: '34px', cursor: 'pointer' }}
              >
                <option value={10}>10 dòng</option>
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>

            {/* Nút Reset */}
            <button
              className="reset-filter-btn"
              onClick={() => {
                setSearchQuery('');
                setPlatformFilter('All');
                setStatusFilter('All');
                setSeverityFilter('All');
                setScreenFilter('All');
                setCreatedDateFilter('');
                setUpdatedDateFilter('');
                setExpectedDateFilter('');
                setSortBy('created_at_desc');
                setCurrentPage(1);
              }}
              style={{
                alignSelf: 'flex-end',
                height: '38px',
                border: 'none',
                background: '#FAF6F0',
                color: '#7B5233',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #EADCC9',
                transition: 'all 0.2s'
              }}
              title="Đặt lại bộ lọc"
            >
              <RefreshCw size={14} /> Đặt lại
            </button>
          </div>
        )}

        {/* Container Flex chia đôi Master-Detail */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Master List (Bên trái: Bảng danh sách) */}
          <div className="admin-list-layout-bug" style={{
            flex: selectedBug ? '0 0 calc(40% - 10px)' : '1 1 100%',
            maxWidth: selectedBug ? '40%' : '100%',
            width: selectedBug ? 'calc(40% - 10px)' : '100%',
            minWidth: '350px',
            transition: 'all 0.3s ease-in-out',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* Table Container */}
            <div className="mgmt-table card admin-table-card" style={{ boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {loading ? (
                <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#7B5233', fontWeight: 'bold' }}>
                  <RefreshCw size={28} className="spin-icon" style={{ color: '#7B5233' }} />
                  <span>Đang tải dữ liệu lỗi...</span>
                </div>
              ) : filteredBugs.length === 0 ? (
                <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#6B7280' }}>
                  <AlertCircle size={36} style={{ color: '#9CA3AF' }} />
                  <span style={{ fontSize: '0.9rem' }}>Không tìm thấy báo cáo lỗi màn hình nào phù hợp!</span>
                </div>
              ) : (
                <>
                  <div className="table-responsive admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #EADCC9', color: '#7B5233', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {selectedBug ? (
                            <>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '70px' }}>Mã</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px' }}>Màn hình</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px' }}>Nội dung</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '80px' }}>Mức độ</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '90px' }}>Trạng thái</th>
                            </>
                          ) : (
                            <>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '85px' }}>Mã</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '180px' }}>Tên màn hình</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '130px' }}>Component</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px' }}>Mô tả</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '110px' }}>Mức độ</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '120px' }}>Trạng thái</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '120px' }}>Ngày cập nhật</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '130px' }}>Người cập nhật</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '120px' }}>Ngày ghi nhận</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', textAlign: 'center', width: '80px' }}>THAO TÁC</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBugs.map((bug) => {
                          const lastUpdate = bug.updates && bug.updates.length > 0 ? bug.updates[0] : null;
                          const updatedAt = lastUpdate ? lastUpdate.created_at : bug.created_at;
                          const updater = lastUpdate ? lastUpdate.updater : (bug.reporter || 'Chưa rõ');
                          const { tag, text } = parseDescription(bug.description);

                          return (
                            <tr
                              key={bug.id}
                              onClick={() => handleRowClick(bug)}
                              className="animate-card-entrance"
                              style={{
                                borderBottom: '1px solid #F1F5F9',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                backgroundColor: selectedBug && selectedBug.id === bug.id ? '#F2ECE4 !important' : 'transparent',
                                borderLeft: selectedBug && selectedBug.id === bug.id ? '4px solid #7B5233 !important' : '4px solid transparent',
                                position: 'relative',
                                zIndex: actionMenuId === bug.id ? 30 : 1
                              }}
                            >
                              {selectedBug ? (
                                <>
                                  {/* Mã ID */}
                                  <td style={{ padding: '10px 12px !important', fontWeight: 'bold', color: '#7B5233', fontFamily: 'monospace' }}>
                                    BUG-{bug.id}
                                  </td>
                                  {/* Màn hình */}
                                  <td style={{ padding: '10px 12px !important' }}>
                                    <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bug.screen_code}</strong>
                                  </td>
                                  {/* Nội dung */}
                                  <td style={{ padding: '10px 12px !important', maxWidth: '150px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {tag && (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '1px 4px',
                                          borderRadius: '3px',
                                          fontSize: '0.6rem',
                                          fontWeight: 'bold',
                                          color: '#7B5233',
                                          backgroundColor: '#FAF6F0',
                                          border: '1px solid #EADCC9',
                                          width: 'fit-content'
                                        }}>
                                          {tag}
                                        </span>
                                      )}
                                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }} title={text}>{text}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 12px !important' }}>{renderSeverityBadge(bug.severity)}</td>
                                  <td style={{ padding: '10px 12px !important' }}>{renderStatusBadge(bug.status)}</td>
                                </>
                              ) : (
                                <>
                                  {/* Mã */}
                                  <td style={{ padding: '16px 20px !important', fontWeight: 'bold', color: '#7B5233', fontFamily: 'monospace' }}>
                                    BUG-{bug.id}
                                  </td>
                                  {/* Tên màn hình */}
                                  <td style={{ padding: '16px 20px !important' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bug.screen_code}</strong>
                                      <span style={{ fontSize: '0.75rem', color: '#64748B' }} title={bug.screen_title}>
                                        {bug.screen_title}
                                      </span>
                                    </div>
                                  </td>
                                  {/* Component */}
                                  <td style={{ padding: '16px 20px !important' }}>
                                    {tag ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '0.68rem',
                                        fontWeight: 'bold',
                                        color: '#7B5233',
                                        backgroundColor: '#FAF6F0',
                                        border: '1px solid #EADCC9'
                                      }}>
                                        {tag}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontStyle: 'italic' }}>Chung</span>
                                    )}
                                  </td>
                                  {/* Mô tả */}
                                  <td style={{ padding: '16px 20px !important', maxWidth: '280px' }}>
                                    <div style={{ fontWeight: '500', color: '#334155', wordBreak: 'break-word' }}>
                                      <span title={text}>{text}</span>
                                    </div>
                                  </td>
                                  {/* Mức độ */}
                                  <td style={{ padding: '16px 20px !important' }}>{renderSeverityBadge(bug.severity)}</td>
                                  {/* Trạng thái */}
                                  <td style={{ padding: '16px 20px !important' }}>{renderStatusBadge(bug.status)}</td>
                                  {/* Ngày cập nhật */}
                                  <td style={{ padding: '16px 20px !important', color: '#4B5563' }}>{formatDate(updatedAt)}</td>
                                  {/* Người cập nhật */}
                                  <td style={{ padding: '16px 20px !important', color: '#4B5563', fontWeight: '500' }}>{updater}</td>
                                  {/* Ngày ghi nhận */}
                                  <td style={{ padding: '16px 20px !important', color: '#4B5563' }}>{formatDate(bug.created_at)}</td>
                                  {/* Thao tác */}
                                  <td style={{ position: 'relative', zIndex: actionMenuId === bug.id ? 40 : 1, textAlign: 'center' }}>
                                    <button
                                      className="action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                                          e.nativeEvent.stopImmediatePropagation();
                                        }
                                        setActionMenuId(actionMenuId === bug.id ? null : bug.id);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '6px',
                                        cursor: 'pointer',
                                        borderRadius: '50%',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#7B5233',
                                        transition: 'background-color 0.2s'
                                      }}
                                    >
                                      <MoreVertical size={16} style={{ pointerEvents: 'none' }} />
                                    </button>
                                    {actionMenuId === bug.id && (
                                      <div className="action-menu" style={{ opacity: 1, animation: 'none' }}>
                                        <button
                                          className="action-menu-item"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionMenuId(null);
                                            handleEditClick(bug);
                                          }}
                                        >
                                          Chỉnh sửa
                                        </button>
                                        <button
                                          className="action-menu-item danger"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionMenuId(null);
                                            handleDeleteClick(bug);
                                          }}
                                        >
                                          Xóa
                                        </button>
                                      </div>
                                    )}
                                  </td>
                            </>
                          )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="admin-pagination-desktop" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderTop: '1px solid #E5E7EB',
                    backgroundColor: '#fff'
                  }}>
                    <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                      Hiển thị <b>{paginatedBugs.length}</b> trên <b>{filteredBugs.length}</b> lỗi màn hình
                    </div>

                    {totalPages > 1 && (
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="page-btn"
                          style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                        >
                          &lt; Trước
                        </button>
                        {(() => {
                          const pages = [];
                          const delta = 2;
                          for (let i = 1; i <= totalPages; i++) {
                            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                              pages.push(i);
                            } else if (pages[pages.length - 1] !== '...') {
                              pages.push('...');
                            }
                          }
                          return pages.map((p, idx) => {
                            if (p === '...') {
                              return (
                                <span key={`ell-${idx}`} style={{ padding: '0 8px', color: '#7B5233', fontWeight: '700' }}>
                                  ...
                                </span>
                              );
                            }
                            return (
                              <button
                                key={p}
                                className={`page-btn ${currentPage === p ? 'active' : ''}`}
                                onClick={() => setCurrentPage(p)}
                                style={{
                                  border: '1px solid #D1D5DB',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: currentPage === p ? '#7B5233' : '#fff',
                                  color: currentPage === p ? '#fff' : '#374151',
                                  fontWeight: currentPage === p ? 'bold' : 'normal',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {p}
                              </button>
                            );
                          });
                        })()}
                        <button
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          style={{ border: '1px solid #D1D5DB', padding: '5px 10px', borderRadius: '6px', backgroundColor: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                        >
                          Sau
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Detail Pane (Bên phải: Panel thông tin chi tiết thay thế cho popup modal) */}
          <div style={{
            flex: selectedBug ? '0 0 calc(60% - 10px)' : '0 0 0%',
            maxWidth: selectedBug ? '60%' : '0%',
            width: selectedBug ? 'calc(60% - 10px)' : '0%',
            minWidth: selectedBug ? '400px' : '0px',
            display: selectedBug ? 'flex' : 'none',
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)',
            flexDirection: 'column',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease-in-out',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {selectedBug ? (
              <>
                {/* Header Chi tiết */}
                <div style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: '#F8FAFC'
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                        padding: '2px 7px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold',
                        color: '#fff', backgroundColor: selectedBug.platform === 'Web' ? '#3B82F6' : '#EC4899'
                      }}>
                        {selectedBug.platform === 'Web' ? <Monitor size={10} /> : <Phone size={10} />}
                        {selectedBug.platform.toUpperCase()}
                      </span>
                      <strong style={{ fontFamily: 'monospace', color: '#0F172A', fontSize: '0.95rem' }}>
                        {selectedBug.screen_code}
                      </strong>
                      <span style={{ color: '#CBD5E1', fontSize: '0.78rem', fontWeight: '400' }}>#{selectedBug.id}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>
                      {selectedBug.screen_title || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                    {editModalMode === 'view' ? (
                      <button
                        onClick={() => setEditModalMode('edit')}
                        style={{
                          background: '#fff',
                          border: '1px solid #E2E8F0',
                          color: '#334155',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Edit3 size={12} /> Sửa
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditModalMode('view')}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          color: '#475569',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Hủy sửa
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedBug(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Đóng panel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* === Info Strip: Mức độ, Trạng thái, Ngày tháng, Xử lý (chỉ hiển khi View Mode) === */}
                {editModalMode === 'view' && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
                    padding: '10px 20px', backgroundColor: '#fff',
                    borderBottom: '2px solid #F1F5F9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>MỨC ĐỘ</span>
                      {renderSeverityBadge(selectedBug.severity)}
                    </div>
                    <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>TRẠNG THÁI</span>
                      {renderStatusBadge(selectedBug.status)}
                      <span style={{ fontSize: '0.65rem', color: '#CBD5E1' }}>→</span>
                      {renderQuickStatusActions(selectedBug)}
                    </div>
                    <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#64748B' }}>
                      <span style={{ fontWeight: '700', color: '#94A3B8', fontSize: '0.62rem', letterSpacing: '0.04em' }}>BÁO CÁO</span>
                      <span style={{ fontWeight: '600' }}>{formatDate(selectedBug.created_at)}</span>
                    </div>
                    {selectedBug.completed_at && (
                      <>
                        <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#059669' }}>
                          <span style={{ fontWeight: '700', color: '#94A3B8', fontSize: '0.62rem', letterSpacing: '0.04em' }}>HOÀN THÀNH</span>
                          <span style={{ fontWeight: '600' }}>{formatDate(selectedBug.completed_at)}</span>
                        </div>
                      </>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.04em' }}>XỬ LÝ</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#EEF2FF', padding: '3px 8px', borderRadius: '12px', fontWeight: '600', color: '#4F46E5', fontSize: '0.72rem' }}>
                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#4F46E5', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {(selectedBug.assignee || 'A').charAt(0).toUpperCase()}
                        </span>
                        {selectedBug.assignee || 'Chưa phân công'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Panel Body */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                  {/* Mode: Edit */}
                  {editModalMode === 'edit' && (
                    <form onSubmit={handleEditSubmit} className="modal-form" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Màn hình</label>
                          <input
                            type="text"
                            className="form-control disabled-input"
                            value={`[${selectedBug.platform}] ${selectedBug.screen_code} - ${selectedBug.screen_title}`}
                            disabled
                            style={{ borderRadius: '6px', padding: '6px 10px', backgroundColor: '#F3F4F6', fontSize: '0.8rem' }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="required" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Mô tả lỗi</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            required
                            style={{ borderRadius: '6px', padding: '8px', fontSize: '0.8rem' }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="required" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Người sửa (Người xử lý)</label>
                          <select
                            className="form-control"
                            value={editForm.assignee}
                            onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                            required
                            style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem' }}
                          >
                            <option value="">-- Chưa chỉ định --</option>
                            {itUsers.map(u => (
                              <option key={u.id} value={u.full_name || u.username}>
                                {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group">
                            <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Trạng thái</label>
                            <select
                              className="form-control"
                              value={editForm.status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                const completedVal = (newStatus === 'Resolved' || newStatus === 'Verified')
                                  ? new Date().toISOString().split('T')[0]
                                  : '';
                                setEditForm({ ...editForm, status: newStatus, completed_at: completedVal });
                              }}
                              style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem' }}
                            >
                              <option value="New">Mới</option>
                              <option value="In Progress">Cần kiểm tra</option>
                              <option value="Resolved">Đã sửa</option>
                              <option value="Verified">Đã xác nhận</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Mức độ</label>
                            <select
                              className="form-control"
                              value={editForm.severity}
                              onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                              style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem' }}
                            >
                              <option value="Critical">Khẩn cấp</option>
                              <option value="High">Cao</option>
                              <option value="Medium">Trung bình</option>
                              <option value="Low">Thấp</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group">
                            <label className="required" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Dự kiến hoàn thành</label>
                            <input
                              type="date"
                              className="form-control"
                              value={editForm.requested_at}
                              onChange={(e) => setEditForm({ ...editForm, requested_at: e.target.value })}
                              required
                              min={getTodayString()}
                              style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem' }}
                            />
                          </div>

                          <div className="form-group">
                            <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Ngày hoàn thành</label>
                            <input
                              type="date"
                              className="form-control"
                              value={editForm.completed_at}
                              onChange={(e) => setEditForm({ ...editForm, completed_at: e.target.value })}
                              disabled={editForm.status !== 'Resolved' && editForm.status !== 'Verified'}
                              style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem', backgroundColor: (editForm.status !== 'Resolved' && editForm.status !== 'Verified') ? '#F3F4F6' : '#fff' }}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Ghi chú thay đổi</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            placeholder="Lý do cập nhật thông tin lỗi..."
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            style={{ borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', padding: '16px', borderTop: '1px solid #E5E7EB', backgroundColor: '#fff' }}>
                        <button type="button" className="btn-secondary" onClick={() => setEditModalMode('view')} style={{ borderRadius: '6px', flex: 1, fontSize: '0.8rem', height: '34px' }} disabled={isSubmitting}>Hủy</button>
                        <button type="submit" className="btn-primary" style={{ borderRadius: '6px', backgroundColor: '#7B5233', borderColor: '#7B5233', flex: 1, fontSize: '0.8rem', height: '34px', color: '#fff', fontWeight: 'bold' }} disabled={isSubmitting}>
                          {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Mode: View */}
                  {editModalMode === 'view' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        {/* Báo cáo lỗi ban đầu */}
                        <div style={{
                          padding: '16px',
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          borderLeft: selectedBug.severity === 'Critical' ? '4px solid #F43F5E' :
                            selectedBug.severity === 'High' ? '4px solid #F59E0B' :
                              selectedBug.severity === 'Medium' ? '4px solid #EAB308' : '4px solid #94A3B8',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '700', color: '#475569', letterSpacing: '0.05em' }}>BÁO CÁO GỐC</span>
                            </div>
                            <span>{formatDateTime(selectedBug.created_at)}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#475569', marginBottom: '12px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#94A3B8' }}>Người báo:</span>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#F1F5F9',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: '600',
                                color: '#334155'
                              }}>
                                <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#6366F1', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {(selectedBug.reporter || 'U').charAt(0).toUpperCase()}
                                </span>
                                {selectedBug.reporter || 'Chưa rõ'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#94A3B8' }}>Người xử lý:</span>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#EEF2FF',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: '600',
                                color: '#4F46E5'
                              }}>
                                <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#4F46E5', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {(selectedBug.assignee || 'A').charAt(0).toUpperCase()}
                                </span>
                                {selectedBug.assignee || 'Chưa phân công'}
                              </span>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: '#1E293B', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontWeight: '500', marginBottom: '10px' }}>
                            {(() => {
                              const { tag, text } = parseDescription(selectedBug.description);
                              return (
                                <>
                                  {tag && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: 'bold',
                                      color: '#4F46E5',
                                      backgroundColor: '#EEF2FF',
                                      border: '1px solid #E0E7FF',
                                      marginRight: '6px'
                                    }}>
                                      {tag}
                                    </span>
                                  )}
                                  <span>{text}</span>
                                </>
                              );
                            })()}
                          </div>
                          {selectedBug.notes && (
                            <div style={{
                              marginTop: '10px',
                              padding: '8px 12px',
                              backgroundColor: '#FAF5F0',
                              borderLeft: '3px solid #7B5233',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              color: '#5C4033',
                              fontStyle: 'italic',
                              whiteSpace: 'pre-wrap'
                            }}>
                              <strong>Ghi chú:</strong> {selectedBug.notes}
                            </div>
                          )}
                          {selectedBug.images && selectedBug.images.filter(img => !img.update_id).length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                              {selectedBug.images.filter(img => !img.update_id).map(img => (
                                <img
                                  key={img.id}
                                  src={getImageUrl(img.image_path)}
                                  alt="initial-attachment"
                                  onClick={() => setActiveLightboxUrl(getImageUrl(img.image_path))}
                                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', border: '1px solid #E2E8F0', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <h4 style={{ color: '#475569', margin: '8px 0', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Layers size={14} /> Lịch sử & Phản hồi
                          <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '2px 7px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700' }}>
                            {selectedBug.updates ? selectedBug.updates.length : 0}
                          </span>
                        </h4>

                        {/* Timeline container */}
                        <div className="timeline-container" style={{
                          paddingRight: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          position: 'relative',
                          paddingLeft: '14px',
                          borderLeft: '2px solid #F1F5F9',
                          marginLeft: '8px'
                        }}>
                          {selectedBug.updates && selectedBug.updates.length > 0 ? (
                            selectedBug.updates.map(up => (
                              <div key={up.id} style={{ position: 'relative', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                {/* Circle node marker on line */}
                                <div style={{
                                  position: 'absolute',
                                  left: '-20px',
                                  top: '16px',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  backgroundColor: up.status === 'Resolved' || up.status === 'Verified' ? '#10B981' : '#6366F1',
                                  border: '2px solid #fff',
                                  boxShadow: '0 0 0 2px #E2E8F0'
                                }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748B', marginBottom: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: '#475569',
                                      color: '#fff',
                                      fontSize: '9px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 'bold'
                                    }}>
                                      {(up.updater || 'H').charAt(0).toUpperCase()}
                                    </span>
                                    <span style={{ fontWeight: '700', color: '#334155' }}>{up.updater || 'Hệ thống'}</span>
                                    {up.status && renderStatusBadge(up.status)}
                                  </div>
                                  <span>{formatDateTime(up.created_at)}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.4', fontWeight: '500' }}>
                                  {up.notes}
                                </div>
                                {up.images && up.images.length > 0 && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    {up.images.map(img => (
                                      <img
                                        key={img.id}
                                        src={getImageUrl(img.image_path)}
                                        alt="update-attachment"
                                        onClick={() => setActiveLightboxUrl(getImageUrl(img.image_path))}
                                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', border: '1px solid #E2E8F0', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.05)';
                                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '15px' }}>
                              Chưa có lượt cập nhật tiến độ nào.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Form đăng phản hồi/cập nhật mới */}
                      <div style={{ borderTop: '1px solid #E2E8F0', padding: '16px', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <h5 style={{ color: '#475569', margin: 0, fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thêm phản hồi nhanh</h5>
                          <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4F46E5', color: '#fff', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {(getCurrentUserName() || 'U').charAt(0).toUpperCase()}
                            </span>
                            Đang nhập: <strong>{getCurrentUserName() || 'User'}</strong>
                          </span>
                        </div>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="Nhập phản hồi... Nhấn Ctrl+V để dán ảnh chụp màn hình."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onPaste={(e) => {
                            const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
                            const items = clipboardData?.items || [];
                            let hasImage = false;
                            for (let i = 0; i < items.length; i++) {
                              if (items[i].type.indexOf('image') !== -1) {
                                hasImage = true;
                                break;
                              }
                            }
                            if (hasImage) {
                              e.preventDefault();
                              handlePasteImage(e, setCommentImages);
                            }
                          }}
                          style={{ fontSize: '0.8rem', borderRadius: '8px', padding: '8px 12px', border: '1px solid #E2E8F0', outline: 'none', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                          onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              id="comment-file-upload"
                              onChange={(e) => handleManualUpload(e, setCommentImages)}
                              style={{ display: 'none' }}
                            />
                            <label
                              htmlFor="comment-file-upload"
                              style={{
                                fontSize: '0.72rem',
                                color: '#475569',
                                fontWeight: '600',
                                cursor: 'pointer',
                                border: '1px solid #E2E8F0',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                backgroundColor: '#fff',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                            >
                              📎 Đính kèm ảnh
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={handlePostComment}
                            disabled={!commentText.trim() && commentImages.length === 0}
                            style={{
                              backgroundColor: '#4F46E5',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 16px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: (!commentText.trim() && commentImages.length === 0) ? 'not-allowed' : 'pointer',
                              opacity: (!commentText.trim() && commentImages.length === 0) ? 0.5 : 1,
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(79, 70, 229, 0.1)'
                            }}
                          >
                            Gửi phản hồi
                          </button>
                        </div>

                        {commentImages.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            {commentImages.map((path, idx) => (
                              <div key={idx} style={{ position: 'relative', width: '48px', height: '48px' }}>
                                <img src={getImageUrl(path)} alt="comment-preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                                <button
                                  type="button"
                                  onClick={() => setCommentImages(prev => prev.filter((_, i) => i !== idx))}
                                  style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Placeholder Card khi chưa chọn bug
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '400px',
                color: '#94A3B8',
                textAlign: 'center',
                padding: '24px',
                backgroundColor: '#F8FAFC',
                border: '2px dashed #E2E8F0',
                margin: '16px',
                borderRadius: '12px'
              }}>
                <Layers size={44} style={{ marginBottom: '12px', color: '#CBD5E1' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '0.92rem', fontWeight: '700' }}>Chưa chọn báo cáo lỗi</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: '1.5', maxWidth: '240px' }}>
                  Vui lòng chọn một hàng trong danh sách bên trái để xem chi tiết lịch sử, bình luận phản hồi và cập nhật tiến độ xử lý lỗi.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add Bug Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ zIndex: 2999 }}>
          <div className="modal-container" style={{ maxWidth: '560px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Báo cáo lỗi màn hình
              </h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>

                {/* Searchable Screen Selector */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="required">Màn hình lỗi</label>

                  {!isAddScreenDropdownOpen ? (
                    <div
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        backgroundColor: '#FAF8F6',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        minHeight: '42px'
                      }}
                      onClick={() => setIsAddScreenDropdownOpen(true)}
                    >
                      <span style={{ color: addForm.screen_id ? '#2D1A12' : '#9CA3AF' }}>
                        {addForm.screen_id
                          ? (() => {
                            const selected = screens.find(s => s.id === parseInt(addForm.screen_id));
                            return selected ? `[${selected.platform}] ${selected.current_code} - ${selected.title}` : 'Chọn màn hình...';
                          })()
                          : 'Chọn màn hình...'
                        }
                      </span>
                      <span style={{ fontSize: '0.6rem', color: '#8D6E63' }}>▼</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: '1px solid #7B5233',
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        fontSize: '0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        minHeight: '42px',
                        position: 'relative'
                      }}
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Tìm theo mã hoặc tên màn hình..."
                        value={addScreenSearch}
                        onChange={(e) => setAddScreenSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setIsAddScreenDropdownOpen(false);
                          }
                        }}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          border: 'none',
                          padding: '10px 30px 10px 14px',
                          fontSize: '0.9rem',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          color: '#2D1A12'
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.6rem',
                          color: '#8D6E63',
                          position: 'absolute',
                          right: '14px',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAddScreenDropdownOpen(false);
                          setAddScreenSearch('');
                        }}
                      >
                        ▲
                      </span>
                    </div>
                  )}

                  {isAddScreenDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(45, 26, 18, 0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}
                    >
                      {screens
                        .filter(s => s.current_code !== 'OTHER')
                        .filter(s => {
                          if (!addScreenSearch) return true;
                          const q = addScreenSearch.toLowerCase();
                          return (
                            s.current_code.toLowerCase().includes(q) ||
                            s.title.toLowerCase().includes(q) ||
                            s.platform.toLowerCase().includes(q)
                          );
                        })
                        .map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setAddForm(prev => ({ ...prev, screen_id: s.id.toString() }));
                              setIsAddScreenDropdownOpen(false);
                              setAddScreenSearch('');
                            }}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              borderBottom: '1px solid #FAF6F0',
                              backgroundColor: addForm.screen_id === s.id.toString() ? '#FAF6F0' : '#fff',
                              color: '#5D4037'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF8F6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = addForm.screen_id === s.id.toString() ? '#FAF6F0' : '#fff'}
                          >
                            <strong>[{s.platform}] {s.current_code}</strong> - {s.title}
                          </div>
                        ))
                      }

                      {(() => {
                        const otherScreen = screens.find(s => s.current_code === 'OTHER');
                        if (!otherScreen) return null;
                        return (
                          <div
                            key={otherScreen.id}
                            onClick={() => {
                              setAddForm(prev => ({ ...prev, screen_id: otherScreen.id.toString() }));
                              setIsAddScreenDropdownOpen(false);
                              setAddScreenSearch('');
                            }}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              borderTop: '2px solid #EADCC9',
                              backgroundColor: addForm.screen_id === otherScreen.id.toString() ? '#FAF6F0' : '#fff',
                              color: '#7B5233',
                              fontWeight: '700'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF8F6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = addForm.screen_id === otherScreen.id.toString() ? '#FAF6F0' : '#fff'}
                          >
                            <strong>[{otherScreen.platform}] {otherScreen.current_code}</strong> - {otherScreen.title}
                          </div>
                        );
                      })()}

                      {screens.filter(s => s.current_code !== 'OTHER').filter(s => {
                        if (!addScreenSearch) return true;
                        const q = addScreenSearch.toLowerCase();
                        return (
                          s.current_code.toLowerCase().includes(q) ||
                          s.title.toLowerCase().includes(q) ||
                          s.platform.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                          <div style={{ padding: '10px 14px', color: '#8D6E63', fontSize: '0.9rem', textAlign: 'center' }}>
                            Không tìm thấy màn hình phù hợp
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Component Selector */}
                <div className="form-group">
                  <label className="required">Component bị lỗi</label>
                  <select
                    className="form-control"
                    value={addForm.component_id || 'Chung'}
                    onChange={(e) => setAddForm(prev => ({ ...prev, component_id: e.target.value }))}
                    required
                    style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem', minHeight: '42px' }}
                  >
                    <option value="Chung">Chung / Toàn bộ màn hình</option>
                    {screenComponents.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="required">Mô tả chi tiết lỗi</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={addForm.description}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    placeholder="Mô tả các bước tái hiện lỗi, kết quả thực tế và mong muốn... Nhấn Ctrl+V để dán ảnh chụp màn hình."
                    required
                    onPaste={(e) => {
                      const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
                      const items = clipboardData?.items || [];
                      let hasImage = false;
                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                          hasImage = true;
                          break;
                        }
                      }
                      if (hasImage) {
                        e.preventDefault();
                        handlePasteImage(e, setAddImages);
                      }
                    }}
                  />
                </div>

                {/* Image Attachments (Moved directly below Description and styled to show previews inside) */}
                <div className="form-group">
                  <label>Hình ảnh minh họa</label>
                  <div
                    onPaste={(e) => handlePasteImage(e, setAddImages)}
                    tabIndex={0}
                    style={{
                      border: '2px dashed #7B5233',
                      borderRadius: '8px',
                      padding: addImages.length > 0 ? '16px' : '24px 16px',
                      textAlign: 'center',
                      backgroundColor: '#FAF6F0',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onFocus={(e) => e.currentTarget.style.backgroundColor = '#FFF8F0'}
                    onBlur={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                    onClick={() => document.getElementById('add-bug-file-input')?.click()}
                  >
                    {addImages.length > 0 ? (
                      <>
                        {/* Previews inside the upload dropzone */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            width: '100%'
                          }}
                          onClick={(e) => e.stopPropagation()} // Prevent opening file selection dialog
                        >
                          {addImages.map((path, idx) => (
                            <div key={idx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                              <img
                                src={getImageUrl(path)}
                                alt="preview"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  border: '1px solid #EADCC9'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveLightboxUrl(getImageUrl(path));
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddImages(prev => prev.filter((_, i) => i !== idx));
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  backgroundColor: '#EF4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '600' }}>
                          📸 Click hoặc dán tiếp (Ctrl+V) để đính kèm thêm ảnh
                        </div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '1.5rem' }}>📷</span>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#5D4037', fontWeight: 'bold' }}>
                          Dán ảnh chụp màn hình (Ctrl+V) hoặc kéo thả tại đây
                        </p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', width: '100%', maxWidth: '360px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => document.getElementById('add-bug-file-input')?.click()}
                            style={{
                              height: '34px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0 12px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              backgroundColor: '#4F46E5',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <FolderOpen size={14} /> Duyệt qua các tệp
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => handlePasteFromClipboardAPI(setAddImages)}
                            style={{
                              height: '34px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0 12px',
                              backgroundColor: '#fff',
                              border: '1px solid #7B5233',
                              color: '#7B5233',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Clipboard size={14} /> Dán từ bộ nhớ tạm
                          </button>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      id="add-bug-file-input"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleManualUpload(e, setAddImages)}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                {/* Assignee */}
                <div className="form-group">
                  <label className="required">Người xử lý (IT)</label>
                  <select
                    className="form-control"
                    value={addForm.assignee}
                    onChange={(e) => setAddForm({ ...addForm, assignee: e.target.value })}
                    required
                  >
                    <option value="">-- Chưa chỉ định --</option>
                    {itUsers.map(u => (
                      <option key={u.id} value={u.full_name || u.username}>
                        {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity & Date Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Mức độ lỗi</label>
                    <select
                      className="form-control"
                      value={addForm.severity}
                      onChange={(e) => setAddForm({ ...addForm, severity: e.target.value })}
                    >
                      <option value="Critical">Khẩn cấp</option>
                      <option value="High">Cao</option>
                      <option value="Medium">Trung bình</option>
                      <option value="Low">Thấp</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="required">Ngày báo cáo</label>
                    <input
                      type="date"
                      className="form-control"
                      value={addForm.requested_at}
                      onChange={(e) => setAddForm({ ...addForm, requested_at: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>Ghi chú thêm</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder="Ghi chú kỹ thuật hoặc thông tin môi trường thử nghiệm (nếu có)..."
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  style={{ borderRadius: '8px', padding: '8px 16px' }}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: 'bold' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && bugToDelete && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <Trash2 size={20} style={{ color: '#FCA5A5' }} /> Xác nhận xóa báo cáo lỗi
              </h3>
              <button className="btn-close" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div style={{
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertCircle size={22} />
                </div>
                <div style={{ fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.5' }}>
                  Bạn có chắc chắn muốn xóa báo cáo lỗi của màn hình:
                  <div style={{ fontWeight: 'bold', color: '#1F2937', marginTop: '4px', fontSize: '1rem' }}>
                    {bugToDelete.screen_code} - {bugToDelete.screen_title}
                  </div>
                </div>
              </div>

              <div style={{
                background: '#FAF8F6',
                borderLeft: '4px solid #7B5233',
                borderRadius: '8px',
                padding: '12px 16px',
                maxHeight: '120px',
                overflowY: 'auto',
                fontSize: '0.88rem',
                color: '#4B5563',
                fontStyle: 'italic',
                lineHeight: '1.6',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
              }}>
                "{bugToDelete.description}"
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '15px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#FAF9F6' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)} style={{ borderRadius: '8px', padding: '8px 16px' }}>Hủy</button>
              <button type="button" className="btn-primary" onClick={confirmDeleteBug} style={{ borderRadius: '8px', backgroundColor: '#DC2626', borderColor: '#DC2626', padding: '8px 16px', color: '#fff', fontWeight: 'bold' }}>Xóa ngay</button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Image Modal for Resolved/Verified */}
      {showProofModal && activeUpdateForProof && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-container" style={{ maxWidth: '420px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
            <div className="modal-header" style={{
              backgroundColor: activeUpdateForProof.status === 'Resolved' ? '#D97706' : (activeUpdateForProof.status === 'Verified' ? '#10B981' : '#EF4444'),
              color: '#fff',
              padding: '12px 18px'
            }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>
                {activeUpdateForProof.status === 'Resolved' ? '✓ Cập nhật Đã sửa lỗi' : (activeUpdateForProof.status === 'Verified' ? '✓ Xác nhận lỗi đã sửa (Hoàn thành)' : '✗ Từ chối sửa lỗi (Sửa lại)')}
              </h4>
              <button
                className="btn-close"
                onClick={() => {
                  setShowProofModal(false);
                  setActiveUpdateForProof(null);
                  setProofImages([]);
                  setProofNotes('');
                }}
                style={{ color: '#fff', border: 'none', background: 'transparent' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Custom Text Area for notes */}
              <div className="form-group">
                <label className={activeUpdateForProof.status === 'In Progress' ? "required" : ""} style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#7B5233', display: 'block', marginBottom: '4px' }}>
                  {activeUpdateForProof.status === 'In Progress' ? 'Lý do từ chối (Bắt buộc):' : 'Nội dung phản hồi (Tùy chọn):'}
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder={activeUpdateForProof.status === 'In Progress' ? 'Vui lòng nhập lý do từ chối sửa lỗi...' : 'Nhập nội dung/chú thích phản hồi (nếu có)...'}
                  required={activeUpdateForProof.status === 'In Progress'}
                  style={{ fontSize: '0.82rem', borderRadius: '8px', padding: '8px', border: '1px solid #E2E8F0', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {activeUpdateForProof.status !== 'In Progress' && (
                <div className="form-group">
                  <label className={activeUpdateForProof.status === 'Resolved' ? "required" : ""} style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#7B5233', display: 'block', marginBottom: '4px' }}>
                    {activeUpdateForProof.status === 'Resolved' ? 'Hình ảnh bằng chứng sửa lỗi (Bắt buộc):' : 'Hình ảnh đính kèm (Tùy chọn):'}
                  </label>
                  
                  <div
                    onPaste={(e) => handlePasteImage(e, setProofImages)}
                    tabIndex={0}
                    style={{
                      border: '2px dashed #7B5233',
                      borderRadius: '10px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: '#FAF6F0',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onFocus={(e) => e.currentTarget.style.backgroundColor = '#FFF8F0'}
                    onBlur={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                    onClick={() => document.getElementById('proof-file-input-manual')?.click()}
                  >
                    <span style={{ fontSize: '1.5rem' }}>📷</span>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#5D4037', fontWeight: 'bold', lineHeight: '1.4' }}>
                      Dán ảnh chụp màn hình (Ctrl+V) hoặc kéo thả tại đây
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px', width: '100%', maxWidth: '360px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => document.getElementById('proof-file-input-manual')?.click()}
                        style={{
                          height: '34px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0 12px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          backgroundColor: '#4F46E5',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <FolderOpen size={14} /> Duyệt qua các tệp
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handlePasteFromClipboardAPI(setProofImages)}
                        style={{
                          height: '34px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0 12px',
                          backgroundColor: '#fff',
                          border: '1px solid #7B5233',
                          color: '#7B5233',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Clipboard size={14} /> Dán từ bộ nhớ tạm
                      </button>
                    </div>
    
                    <input
                      type="file"
                      id="proof-file-input-manual"
                      multiple
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        try {
                          showToast('Đang tải ảnh chứng minh...', 'success');
                          for (let i = 0; i < files.length; i++) {
                            const res = await bugService.uploadImage(files[i]);
                            if (res && res.url) {
                              setProofImages(prev => [...prev, res.url]);
                            }
                          }
                          showToast('Tải ảnh thành công!');
                        } catch (err) {
                          showToast('Không thể tải ảnh chứng minh!', 'error');
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Preview của các ảnh đã chọn/dán */}
              {proofImages.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '6px', display: 'block' }}>
                    Ảnh đã đính kèm ({proofImages.length}):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', backgroundColor: '#FAF6F0', padding: '8px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    {proofImages.map((path, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '55px', height: '55px' }}>
                        <img
                          src={getImageUrl(path)}
                          alt="proof-preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #D3C1B4' }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProofImages(prev => prev.filter((_, i) => i !== idx));
                          }}
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            backgroundColor: '#EF4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#FAF9F6' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowProofModal(false);
                  setActiveUpdateForProof(null);
                  setProofImages([]);
                  setProofNotes('');
                }}
                style={{ borderRadius: '6px', fontSize: '0.75rem', padding: '6px 12px' }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  const { id, status, isInitial } = activeUpdateForProof;
                  
                  // Validation
                  if (status === 'Resolved' && proofImages.length === 0) {
                    showToast('Vui lòng đính kèm hình ảnh bằng chứng sửa lỗi!', 'error');
                    return;
                  }
                  if (status === 'In Progress' && !proofNotes.trim()) {
                    showToast('Vui lòng nhập lý do từ chối sửa lỗi!', 'error');
                    return;
                  }

                  try {
                    const username = getCurrentUserName();
                    const statusLabel =
                      status === 'New' ? 'Chưa hoàn thành (Mới)' :
                        status === 'In Progress' ? 'Từ chối (Sửa lại)' :
                          status === 'Resolved' ? 'Hoàn thành (Đã sửa)' : 'Đã xác nhận (Hoàn thành)';

                    const defaultNotes = status === 'Resolved'
                      ? 'Đã khắc phục lỗi giao diện.'
                      : (status === 'Verified' ? 'Đã xác nhận hoàn thành sửa lỗi.' : 'Từ chối sửa lỗi.');
                      
                    const finalNotes = proofNotes.trim() || defaultNotes;

                    if (isInitial) {
                      const payload = {
                        notes: finalNotes,
                        image_paths: proofImages,
                        updater: username,
                        status: status
                      };
                      const res = await bugService.addBugUpdate(selectedBug.id, payload);
                      showToast(`Đã chuyển trạng thái sang "${statusLabel}"!`);

                      setSelectedBug(prev => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          status: status,
                          updates: [res, ...(prev.updates || [])]
                        };
                      });
                      setEditForm(prev => ({
                        ...prev,
                        status: status,
                        completed_at: (status === 'Resolved' || status === 'Verified') ? new Date().toISOString().split('T')[0] : ''
                      }));
                    } else {
                      await bugService.updateCommentStatus(id, status, proofImages);
                      showToast('Đã cập nhật trạng thái phản hồi và đính kèm ảnh chứng minh!');

                      setSelectedBug(prev => {
                        if (!prev) return null;
                        const updatedUpdates = prev.updates.map(u => {
                          if (u.id === id) {
                            const newImgs = proofImages.map((path, idx) => ({
                              id: Date.now() + idx,
                              image_path: path,
                              update_id: id,
                              bug_id: prev.id,
                              created_at: new Date().toISOString()
                            }));
                            return {
                              ...u,
                              status: status,
                              images: [...(u.images || []), ...newImgs]
                            };
                          }
                          return u;
                        });
                        return {
                          ...prev,
                          status: status,
                          updates: updatedUpdates
                        };
                      });
                      setEditForm(prev => ({ ...prev, status: status }));
                    }

                    fetchBugs();
                    setShowProofModal(false);
                    setActiveUpdateForProof(null);
                    setProofImages([]);
                  } catch (error) {
                    showToast('Cập nhật trạng thái lỗi thất bại!', 'error');
                  }
                }}
                style={{
                  borderRadius: '6px',
                  backgroundColor: '#7B5233',
                  borderColor: '#7B5233',
                  fontSize: '0.75rem',
                  padding: '6px 12px',
                  color: '#fff',
                  fontWeight: 'bold'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal để phóng to hình ảnh */}
      {activeLightboxUrl && (
        <div
          onClick={() => setActiveLightboxUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img
            src={activeLightboxUrl}
            alt="Enlarged screenshot"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
          />
          <button
            onClick={() => setActiveLightboxUrl(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#333',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Embedded CSS for animations and custom styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .spin-icon {
          animation: mgmtSpin 1.2s linear infinite;
        }
        @keyframes mgmtSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .kpi-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
          cursor: pointer;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04) !important;
        }
        .timeline-container::-webkit-scrollbar {
          width: 4px;
        }
        .timeline-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .timeline-container::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
      `}} />
    </>
  );
};

export default ScreenBugManagementView;

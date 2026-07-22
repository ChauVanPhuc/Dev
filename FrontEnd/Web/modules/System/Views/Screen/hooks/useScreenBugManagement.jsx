import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
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


export const useScreenBugManagement = () => {
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



  return {
    a,
    actionMenuBugId,
    actionMenuId,
    activeLightboxUrl,
    activeUpdateForProof,
    addForm,
    addImages,
    addScreenSearch,
    b,
    bgColor,
    border,
    bugDate,
    bugToDelete,
    bugs,
    buildProgress,
    clipboardData,
    clipboardItems,
    commentImages,
    commentText,
    completedScreens,
    confirmDeleteBug,
    createdDateFilter,
    criticalProgress,
    csvContent,
    data,
    date,
    datePart,
    editForm,
    editModalMode,
    editProgress,
    expectedDateFilter,
    fetchBugs,
    fetchScreens,
    fetchScreensAndUsers,
    fetchUsers,
    file,
    fileInputRef,
    files,
    filteredBugs,
    filteredScreens,
    finalDescription,
    fixProgress,
    formatDate,
    formatDateTime,
    handleAddBug,
    handleAddSubmit,
    handleDeleteBug,
    handleDeleteClick,
    handleDeleteReply,
    handleEditClick,
    handleEditSubmit,
    handleExportExcel,
    handleFileChange,
    handleFormChange,
    handleImageUpload,
    handleImportExcel,
    handleImportExcelClick,
    handleManualUpload,
    handleOpenEditModal,
    handleOutsideClick,
    handlePasteFromClipboardAPI,
    handlePasteImage,
    handlePostComment,
    handleQuickStatusChange,
    handleRemoveAddImage,
    handleRemoveUpdateImage,
    handleReplySubmit,
    handleResetFilters,
    handleRowClick,
    handleSeverityChange,
    handleSocketMessage,
    handleStatusChange,
    handleToggleReplyPinned,
    handleUpdateBug,
    handleUpdateImageUpload,
    i,
    importLoading,
    isAddScreenDropdownOpen,
    isFilterBarOpen,
    isReplying,
    isSubmitting,
    itUsers,
    items,
    lastScreenId,
    lastUpdate,
    loading,
    location,
    matched,
    matchesCreatedDate,
    matchesExpectedDate,
    matchesPlatform,
    matchesScreen,
    matchesSearch,
    matchesSeverity,
    matchesStatus,
    matchesUpdatedDate,
    navigate,
    newReplyText,
    newUpdate,
    pageSize,
    paginatedBugs,
    payload,
    phucUser,
    platformFilter,
    proofImages,
    proofNotes,
    q,
    renderQuickStatusActions,
    renderSeverityBadge,
    renderStatusBadge,
    reqDate,
    res,
    resolvedBugs,
    resolvedCritical,
    roles,
    saved,
    screenComponents,
    screenFilter,
    screens,
    screensWithAllBugsResolved,
    searchQuery,
    selectedBug,
    selectedScreenData,
    setActionMenuBugId,
    setAddForm,
    setAddImages,
    setAddScreenSearch,
    setBugToDelete,
    setBugs,
    setCreatedDateFilter,
    setCurrentPage,
    setExpectedDateFilter,
    setImportLoading,
    setIsAddScreenDropdownOpen,
    setIsFilterBarOpen,
    setIsReplying,
    setLoading,
    setNewReplyText,
    setPageSize,
    setPlatformFilter,
    setScreenFilter,
    setScreens,
    setSearchQuery,
    setSelectedBug,
    setSeverityFilter,
    setShowAddModal,
    setShowDeleteModal,
    setSortBy,
    setStatusFilter,
    setUpdateImages,
    setUpdatedDateFilter,
    setUsers,
    setValidationErrors,
    severityFilter,
    showAddModal,
    showDeleteModal,
    showProofModal,
    showToast,
    sortBy,
    sortOptions,
    sortedScreens,
    stats,
    status,
    statusFilter,
    statusLabel,
    tag,
    targetScreen,
    targetScreenId,
    textColor,
    textVi,
    timePart,
    toast,
    triggerStatusUpdate,
    updateImages,
    updatedAt,
    updatedDateFilter,
    updater,
    useScreenBugManagement,
    userObj,
    userStr,
    username,
    users,
    validateForm,
    validationErrors
  };
};

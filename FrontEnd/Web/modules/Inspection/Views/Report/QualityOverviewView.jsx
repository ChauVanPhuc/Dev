import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Filter, Edit, FileText, ChevronLeft, ChevronRight, CheckCircle2, X, Eye, RotateCcw, XCircle, Layers, Package, CheckCheck } from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

const QualityOverviewView = () => {
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};

  // Cấu hình động mã màn hình, tên màn hình từ Database
  const { screenCode, title, subtitle, loading: metaLoading } = useScreenMetadataCached('/admin/quality');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Quản lý chất lượng');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'CL1: Hiển thị danh sách các công việc tồn đọng cần xử lý');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'CL1');
  }, [title, subtitle, screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');
  
  const { toast } = useToast();
  
  // Modal Chi tiết / Xác nhận
  const [selectedTask, setSelectedTask] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);
  const [cancelingTask, setCancelingTask] = useState(false);
  const [isCancelInspectionModalOpen, setIsCancelInspectionModalOpen] = useState(false);
  const [cancelConfirmModal, setCancelConfirmModal] = useState({
    isOpen: false,
    task: null
  });
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState('');

  // Trạng thái chỉnh sửa trên Modal Chi tiết
  const [modalResult, setModalResult] = useState('pass');
  const [modalAction, setModalAction] = useState('chap-nhan');
  const [handlingInfo, setHandlingInfo] = useState('');

  // Đồng bộ trạng thái khi mở hoặc chuyển phiếu kiểm tra
  useEffect(() => {
    if (selectedTask) {
      const isPass = selectedTask.result === 'Đạt' || selectedTask.result === 'pass';
      setModalResult(isPass ? 'pass' : 'fail');
      setModalAction(selectedTask.action || 'chap-nhan');

      let parsedJson = null;
      if (selectedTask.data_json) {
        try {
          parsedJson = typeof selectedTask.data_json === 'string' ? JSON.parse(selectedTask.data_json) : selectedTask.data_json;
        } catch (e) {}
      }
      setHandlingInfo(selectedTask.handling_info || parsedJson?.handling_info || '');
    }
  }, [selectedTask]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch dữ liệu công việc tồn đọng từ Backend (toàn bộ phiếu chưa xác nhận)
  const fetchPendingTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get('/inspections/pending');
      if (Array.isArray(data)) {
        setPendingTasks(data);
      } else {
        setPendingTasks([]);
      }
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      setPendingTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const baseApi = (api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    const origin = baseApi || window.location.origin;
    return `${origin}${cleanPath}`;
  };

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  // Lọc tìm kiếm & Sắp xếp danh sách phiếu chưa xác nhận
  const filteredTasks = useMemo(() => {
    let result = [...pendingTasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(task => {
        return (
          (task.ticket_code && task.ticket_code.toLowerCase().includes(q)) ||
          (task.task_name && task.task_name.toLowerCase().includes(q)) ||
          (task.category && task.category.toLowerCase().includes(q)) ||
          (task.stage && task.stage.toLowerCase().includes(q)) ||
          (task.inspection_type && task.inspection_type.toLowerCase().includes(q)) ||
          (task.part_name && task.part_name.toLowerCase().includes(q)) ||
          (task.batch_no && task.batch_no.toLowerCase().includes(q)) ||
          (task.notes && task.notes.toLowerCase().includes(q))
        );
      });
    }

    if (sortOption === 'name_asc') {
      result.sort((a, b) => (a.task_name || '').localeCompare(b.task_name || ''));
    } else if (sortOption === 'name_desc') {
      result.sort((a, b) => (b.task_name || '').localeCompare(a.task_name || ''));
    } else if (sortOption === 'date_asc') {
      result.sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date));
    } else {
      // date_desc mặc định
      result.sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date));
    }

    return result;
  }, [pendingTasks, searchQuery, sortOption]);

  // Phân trang
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredTasks.slice(start, start + limit);
  }, [filteredTasks, currentPage, limit]);

  const totalPages = Math.ceil(filteredTasks.length / limit) || 1;

  // Vị trí của phiếu đang chọn trong danh sách lọc
  const currentTaskIndex = useMemo(() => {
    if (!selectedTask) return -1;
    return filteredTasks.findIndex(t => t.id === selectedTask.id);
  }, [selectedTask, filteredTasks]);

  const goToPreviousTask = () => {
    if (currentTaskIndex > 0) {
      setSelectedTask(filteredTasks[currentTaskIndex - 1]);
    }
  };

  const goToNextTask = () => {
    if (currentTaskIndex < filteredTasks.length - 1) {
      setSelectedTask(filteredTasks[currentTaskIndex + 1]);
    }
  };

  // Lắng nghe phím mũi tên Trái / Phải để di chuyển phiếu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedTask) return;
      const activeTag = document.activeElement?.tagName?.toUpperCase();
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousTask();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextTask();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTask, currentTaskIndex, filteredTasks]);

  // Tự động phân rã danh sách chi tiết / phôi kiểm tra thành List Table
  const cleanCabinetTag = (tag) => {
    if (!tag) return '';
    return String(tag).replace(/^[A-Za-z0-9]+-\d+(?:-[A-Za-z0-9]+)?\s*\|\s*/i, '').trim();
  };

  const partsList = useMemo(() => {
    if (!selectedTask) return [];

    let parsedJson = null;
    if (selectedTask.data_json) {
      try {
        parsedJson = typeof selectedTask.data_json === 'string' ? JSON.parse(selectedTask.data_json) : selectedTask.data_json;
      } catch (e) {}
    }

    // 1. Nếu có mảng details/items từ API hoặc data_json
    let rawItems = [];
    if (Array.isArray(selectedTask.details) && selectedTask.details.length > 0) {
      rawItems = selectedTask.details;
    } else if (Array.isArray(selectedTask.parts_details) && selectedTask.parts_details.length > 0) {
      rawItems = selectedTask.parts_details;
    } else if (parsedJson?.partsDetails && Array.isArray(parsedJson.partsDetails) && parsedJson.partsDetails.length > 0) {
      rawItems = parsedJson.partsDetails;
    } else if (parsedJson?.parts_details && Array.isArray(parsedJson.parts_details) && parsedJson.parts_details.length > 0) {
      rawItems = parsedJson.parts_details;
    } else if (parsedJson?.items && Array.isArray(parsedJson.items) && parsedJson.items.length > 0) {
      rawItems = parsedJson.items;
    }

    if (rawItems.length > 0) {
      return rawItems.map((it, idx) => ({
        stt: String(idx + 1).padStart(2, '0'),
        name: it.part_name || it.name || it.product || 'Chi tiết',
        spec: it.specification || it.spec || selectedTask.specification || 'Tiêu chuẩn',
        cabinet: cleanCabinetTag(it.cabinet || it.product_label || it.badge || it.product_name || it.product_sku || it.sku || ''),
        qty: it.plan_qty || it.qty || ''
      }));
    }

    // 2. Phân rã từ chuỗi part_name (hỗ trợ phân tách bởi dấu phẩy, chấm phẩy hoặc xuống dòng)
    const rawPartName = (selectedTask.part_name || selectedTask.product_sku || '').trim();
    const defaultCabinet = cleanCabinetTag(parsedJson?.cabinet || parsedJson?.product_label || parsedJson?.badge || '');
    const defaultQty = selectedTask.required_qty || parsedJson?.requiredQty || '';

    if (!rawPartName || rawPartName === 'N/A') {
      return [{
        stt: '01',
        name: selectedTask.task_name || 'Chi tiết kiểm tra',
        spec: selectedTask.specification || 'Tiêu chuẩn',
        cabinet: defaultCabinet,
        qty: defaultQty
      }];
    }

    // Tách các chi tiết nếu có dấu phẩy hoặc xuống dòng
    const names = rawPartName
      .split(/[\n\r;]|,\s*(?=[A-ZÀ-Ỹa-z0-9])/)
      .map(s => s.trim())
      .filter(Boolean);

    const rawSpec = (selectedTask.specification || '').trim();
    const specs = rawSpec.includes(',') 
      ? rawSpec.split(',').map(s => s.trim()).filter(Boolean) 
      : [];

    if (names.length === 0) {
      return [{
        stt: '01',
        name: rawPartName,
        spec: rawSpec || 'Tiêu chuẩn',
        cabinet: defaultCabinet,
        qty: defaultQty
      }];
    }

    return names.map((pName, idx) => {
      const pSpec = specs[idx] || (specs.length === 1 ? specs[0] : (rawSpec || 'Tiêu chuẩn'));
      return {
        stt: String(idx + 1).padStart(2, '0'),
        name: pName,
        spec: pSpec,
        cabinet: defaultCabinet,
        qty: defaultQty
      };
    });
  }, [selectedTask]);

  // Xử lý xác nhận phiếu và tự động chuyển sang đơn tiếp theo
  const handleConfirmTask = async (task) => {
    if (!task) return;
    setConfirming(true);
    try {
      const taskType = task.type || 'input';
      await api.post(`/inspections/confirm/${taskType}/${task.id}`, {
        result: modalResult,
        action: modalAction,
        handling_info: handlingInfo
      });
      toast('success', `Đã xác nhận thành công phiếu #${task.ticket_code || task.id}!`);

      // Tự động chuyển sang phiếu tiếp theo
      const remaining = filteredTasks.filter(t => t.id !== task.id);
      setPendingTasks(prev => prev.filter(t => t.id !== task.id));
      if (remaining.length > 0) {
        const nextIdx = Math.min(Math.max(currentTaskIndex, 0), remaining.length - 1);
        setSelectedTask(remaining[nextIdx]);
      } else {
        setSelectedTask(null);
        toast('success', 'Đã hoàn tất duyệt toàn bộ phiếu tồn đọng!');
      }
      fetchPendingTasks();
    } catch (error) {
      console.error('Error confirming inspection:', error);
      toast('error', 'Lỗi khi xác nhận phiếu kiểm tra: ' + (error.response?.data?.detail || error.message));
    } finally {
      setConfirming(false);
    }
  };

  // Xác nhận hủy hồ sơ kiểm tra và tự động chuyển sang đơn tiếp theo
  const handleExecuteCancelInspection = async () => {
    if (!selectedTask) return;
    setCancelingTask(true);
    try {
      const taskType = selectedTask.type || 'input';
      await api.post(`/inspections/cancel-inspection/${taskType}/${selectedTask.id}`, {
        handling_info: handlingInfo,
        reason: 'Quản lý chất lượng hủy hồ sơ'
      });
      toast('success', `Đã hủy hồ sơ #${selectedTask.ticket_code || selectedTask.id} thành công!`);
      setIsCancelInspectionModalOpen(false);

      // Tự động chuyển sang phiếu tiếp theo
      const remaining = filteredTasks.filter(t => t.id !== selectedTask.id);
      setPendingTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      if (remaining.length > 0) {
        const nextIdx = Math.min(Math.max(currentTaskIndex, 0), remaining.length - 1);
        setSelectedTask(remaining[nextIdx]);
      } else {
        setSelectedTask(null);
      }
      fetchPendingTasks();
    } catch (error) {
      console.error('Error canceling inspection:', error);
      toast('error', 'Lỗi khi hủy hồ sơ: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCancelingTask(false);
    }
  };

  // Mở popup xác nhận hủy trả hàng chuẩn giao diện dự án
  const handleCancelReturn = (task) => {
    if (!task) return;
    setCancelConfirmModal({
      isOpen: true,
      task: task
    });
  };

  // Xác nhận thực hiện hủy trả hàng
  const handleConfirmCancelReturn = async () => {
    const task = cancelConfirmModal.task;
    if (!task) return;

    setCancelingId(task.id);
    try {
      await api.post(`/inspections/cancel-return/${task.id}`);
      toast('success', `Đã hủy trả hàng thành công cho phiếu #${task.ticket_code || task.id}!`);
      // Cập nhật selectedTask nếu đang mở
      setSelectedTask(prev => {
        if (prev && prev.id === task.id) {
          return {
            ...prev,
            action: 'chap-nhan',
            notes: prev.notes ? `${prev.notes} - [Đã hủy trả hàng]` : '[Đã hủy trả hàng]'
          };
        }
        return prev;
      });
      setCancelConfirmModal({ isOpen: false, task: null });
      fetchPendingTasks();
    } catch (error) {
      console.error('Error canceling return:', error);
      toast('error', 'Lỗi khi hủy trả hàng: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCancelingId(null);
    }
  };

  // ─── CHỨC NĂNG XÁC NHẬN NHANH HỒ SƠ ĐẠT & KHÔNG TRẢ HÀNG ───
  // Điều kiện: Phiếu có kết quả ĐẠT và hành động xử lý khác 'Trả hàng'
  const isEligibleForQuickConfirm = (task) => {
    if (!task) return false;
    const isPass = task.result === 'Đạt' || task.result === 'pass';
    const isNotReturn = task.action !== 'tra-ve';
    return isPass && isNotReturn;
  };

  // Danh sách các phiếu đủ điều kiện xác nhận nhanh trong toàn bộ danh sách chờ
  const eligibleQuickPassTasks = useMemo(() => {
    return pendingTasks.filter(isEligibleForQuickConfirm);
  }, [pendingTasks]);

  // Modal xác nhận nhanh đơn lẻ từng dòng
  const [quickConfirmModal, setQuickConfirmModal] = useState({
    isOpen: false,
    task: null
  });
  const [quickConfirming, setQuickConfirming] = useState(false);

  // Modal Popup List xác nhận nhanh hàng loạt
  const [isBatchQuickModalOpen, setIsBatchQuickModalOpen] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [batchFilterType, setBatchFilterType] = useState('all');
  const [batchFilterAction, setBatchFilterAction] = useState('all');
  const [batchConfirming, setBatchConfirming] = useState(false);

  // Mở modal xác nhận nhanh 1 phiếu
  const handleOpenQuickConfirmSingle = (task) => {
    if (!task) return;
    setQuickConfirmModal({
      isOpen: true,
      task: task
    });
  };

  // Mở Popup List xác nhận nhanh toàn bộ phiếu ĐẠT (tự động tick chọn tất cả phiếu ĐẠT)
  const handleOpenBatchQuickModal = () => {
    if (eligibleQuickPassTasks.length === 0) {
      toast('info', 'Hiện tại không có phiếu ĐẠT nào cần xác nhận nhanh.');
      return;
    }
    setSelectedBatchIds(new Set(eligibleQuickPassTasks.map(t => t.id)));
    setBatchSearchQuery('');
    setBatchFilterType('all');
    setBatchFilterAction('all');
    setIsBatchQuickModalOpen(true);
  };

  // Chọn/bỏ chọn 1 phiếu trong danh sách Popup List
  const handleToggleBatchItem = (id) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Danh sách các loại kiểm tra duy nhất có trong các phiếu ĐẠT
  const availableBatchInspectionTypes = useMemo(() => {
    const map = {};
    eligibleQuickPassTasks.forEach(t => {
      const info = getCategoryBadgeInfo(t.category, t.stage, t.inspection_type);
      const lbl = info.label;
      map[lbl] = (map[lbl] || 0) + 1;
    });
    return Object.entries(map).map(([label, count]) => ({ label, count }));
  }, [eligibleQuickPassTasks]);

  // Danh sách các hành động duy nhất có trong các phiếu ĐẠT
  const availableBatchActions = useMemo(() => {
    const map = {};
    eligibleQuickPassTasks.forEach(t => {
      const act = t.action || 'chap-nhan';
      map[act] = (map[act] || 0) + 1;
    });
    const actionLabels = {
      'chap-nhan': 'Chấp nhận',
      'cach-ly': 'Cách ly',
      'tra-ve': 'Trả hàng'
    };
    return Object.entries(map).map(([actionKey, count]) => ({
      key: actionKey,
      label: actionLabels[actionKey] || actionKey,
      count
    }));
  }, [eligibleQuickPassTasks]);

  // Lọc tìm kiếm & bộ lọc bên trong Popup List
  const filteredBatchTasks = useMemo(() => {
    let result = eligibleQuickPassTasks;

    // 1. Lọc từ khóa
    if (batchSearchQuery.trim()) {
      const q = batchSearchQuery.toLowerCase().trim();
      result = result.filter(t => 
        (t.ticket_code && t.ticket_code.toLowerCase().includes(q)) ||
        (t.task_name && t.task_name.toLowerCase().includes(q)) ||
        (t.part_name && t.part_name.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.batch_no && t.batch_no.toLowerCase().includes(q))
      );
    }

    // 2. Lọc loại kiểm tra
    if (batchFilterType !== 'all') {
      result = result.filter(t => {
        const info = getCategoryBadgeInfo(t.category, t.stage, t.inspection_type);
        return info.label === batchFilterType;
      });
    }

    // 3. Lọc hành động
    if (batchFilterAction !== 'all') {
      result = result.filter(t => (t.action || 'chap-nhan') === batchFilterAction);
    }

    return result;
  }, [eligibleQuickPassTasks, batchSearchQuery, batchFilterType, batchFilterAction]);

  // Trạng thái bộ lọc có đang hoạt động hay không
  const isBatchFilterActive = Boolean(batchSearchQuery.trim() || batchFilterType !== 'all' || batchFilterAction !== 'all');

  // Đặt lại toàn bộ bộ lọc trong popup
  const handleResetBatchFilters = () => {
    setBatchSearchQuery('');
    setBatchFilterType('all');
    setBatchFilterAction('all');
  };

  // Khi bộ lọc thay đổi, tự động đồng bộ danh sách đã chọn CHỈ gồm các phiếu đang hiển thị sau lọc
  useEffect(() => {
    if (!isBatchQuickModalOpen) return;
    setSelectedBatchIds(new Set(filteredBatchTasks.map(t => t.id)));
  }, [batchSearchQuery, batchFilterType, batchFilterAction, isBatchQuickModalOpen]);

  // Trạng thái chọn của danh sách đang hiển thị
  const isAllFilteredSelected = filteredBatchTasks.length > 0 && filteredBatchTasks.every(t => selectedBatchIds.has(t.id));
  const someFilteredSelected = filteredBatchTasks.some(t => selectedBatchIds.has(t.id));

  // Chọn tất cả hoặc bỏ chọn tất cả các phiếu đang hiển thị theo bộ lọc
  const handleToggleFilteredBatch = () => {
    if (filteredBatchTasks.length === 0) return;
    if (isAllFilteredSelected) {
      // Đang chọn đủ các phiếu đang lọc -> Bỏ chọn tất cả
      setSelectedBatchIds(new Set());
    } else {
      // Tích chọn tất cả: CHỈ những cái đang lọc thôi!
      setSelectedBatchIds(new Set(filteredBatchTasks.map(t => t.id)));
    }
  };

  // Thực thi xác nhận nhanh 1 phiếu
  const handleExecuteQuickConfirmSingle = async () => {
    const t = quickConfirmModal.task;
    if (!t) return;
    setQuickConfirming(true);
    try {
      const taskType = t.type || 'input';
      await api.post(`/inspections/confirm/${taskType}/${t.id}`, {});
      toast('success', `Đã duyệt nhanh thành công hồ sơ #${t.ticket_code || t.id}!`);
      setQuickConfirmModal({ isOpen: false, task: null });
      fetchPendingTasks();
    } catch (error) {
      console.error('Error in single quick confirm:', error);
      toast('error', 'Lỗi khi xác nhận nhanh: ' + (error.response?.data?.detail || error.message));
    } finally {
      setQuickConfirming(false);
    }
  };

  // Thực thi xác nhận các phiếu đã chọn từ Popup List hàng loạt
  const handleExecuteBatchConfirm = async () => {
    // CHỈ lấy các ID vừa được tick chọn vừa nằm trong danh sách đang lọc (nếu có bộ lọc)
    const validFilteredIds = Array.from(selectedBatchIds).filter(id => 
      !isBatchFilterActive || filteredBatchTasks.some(t => t.id === id)
    );

    if (validFilteredIds.length === 0) {
      toast('warning', 'Vui lòng chọn ít nhất 1 phiếu kiểm tra để xác nhận.');
      return;
    }

    setBatchConfirming(true);
    try {
      const res = await api.post('/inspections/confirm-batch', { ids: validFilteredIds });
      toast('success', res.data?.message || `Đã xác nhận nhanh thành công ${validFilteredIds.length} phiếu ĐẠT!`);
      setIsBatchQuickModalOpen(false);
      fetchPendingTasks();
    } catch (error) {
      console.error('Error batch confirming inspections:', error);
      toast('error', 'Lỗi khi xác nhận nhanh hàng loạt: ' + (error.response?.data?.detail || error.message));
    } finally {
      setBatchConfirming(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Cấu hình hiển thị nhãn và màu sắc cho cột Loại kiểm tra tường minh, trực quan
  function getCategoryBadgeInfo(category, stage, inspectionType) {
    const typeKey = (inspectionType || category || '').toLowerCase().trim();
    const stageName = (stage || '').trim();

    // 1. Kiểm tra mẫu đầu (First Sample / FAI)
    if (
      typeKey.includes('first_sample') ||
      typeKey.includes('mẫu đầu') ||
      typeKey.includes('mau-dau') ||
      typeKey.includes('mẫu-đầu')
    ) {
      let sub = stageName;
      if (sub.toLowerCase() === 'nhập kho/đầu vào' || sub.toLowerCase() === 'nhập kho') {
        sub = 'Đầu vào NVL';
      }
      return {
        label: 'Kiểm tra mẫu đầu',
        subText: sub || null,
        bg: '#EFF6FF',
        border: '#BFDBFE',
        text: '#1D4ED8',
        dotColor: '#3B82F6',
      };
    }

    // 2. Nhập kho / Đầu vào (Inbound)
    if (
      typeKey.includes('nhap-kho') ||
      typeKey.includes('nhập kho') ||
      typeKey.includes('dau-vao') ||
      typeKey.includes('đầu vào') ||
      typeKey.includes('input')
    ) {
      let sub = stageName;
      if (sub.toLowerCase() === 'nhap-kho' || sub.toLowerCase() === 'nhập kho') {
        sub = null;
      }
      return {
        label: 'Kiểm tra nhập kho',
        subText: sub || null,
        bg: '#ECFDF5',
        border: '#A7F3D0',
        text: '#047857',
        dotColor: '#10B981',
      };
    }

    // 3. Tái kiểm tra (Re-inspection)
    if (
      typeKey.includes('re_inspect') ||
      typeKey.includes('tai-kiem') ||
      typeKey.includes('tái kiểm') ||
      typeKey.includes('reinspect')
    ) {
      return {
        label: 'Tái kiểm tra',
        subText: stageName || null,
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#B45309',
        dotColor: '#F59E0B',
      };
    }

    // 4. Kiểm tra quy trình (Process)
    if (typeKey.includes('quy-trinh') || typeKey.includes('quy trình') || typeKey.includes('process')) {
      return {
        label: 'Kiểm tra quy trình',
        subText: stageName || null,
        bg: '#F0F9FF',
        border: '#BAE6FD',
        text: '#0369A1',
        dotColor: '#0284C7',
      };
    }

    // 5. Đo thông số: Độ ẩm / Kích thước / Ngoại quan
    if (typeKey.includes('do-am') || typeKey.includes('độ ẩm')) {
      return {
        label: 'Đo độ ẩm',
        subText: stageName || null,
        bg: '#FDF4FF',
        border: '#F5D0FE',
        text: '#A21CAF',
        dotColor: '#D946EF',
      };
    }
    if (typeKey.includes('kich-thuoc') || typeKey.includes('kích thước')) {
      return {
        label: 'Đo kích thước',
        subText: stageName || null,
        bg: '#FEF2F2',
        border: '#FECACA',
        text: '#B91C1C',
        dotColor: '#EF4444',
      };
    }
    if (typeKey.includes('ngoai-quan') || typeKey.includes('ngoại quan')) {
      return {
        label: 'Kiểm tra ngoại quan',
        subText: stageName || null,
        bg: '#F0FDF4',
        border: '#BBF7D0',
        text: '#15803D',
        dotColor: '#22C55E',
      };
    }

    // 6. Công đoạn sản xuất hoặc mặc định
    return {
      label: category && category !== 'Kiểm tra phiếu' ? category : (stageName ? `CĐ: ${stageName}` : 'Kiểm tra công đoạn'),
      subText: stageName && stageName !== category ? stageName : null,
      bg: '#FAF5FF',
      border: '#E9D5FF',
      text: '#7E22CE',
      dotColor: '#A855F7',
    };
  };

  const renderCategoryBadge = (task) => {
    if (!task) return null;
    const info = getCategoryBadgeInfo(task.category, task.stage, task.inspection_type);

    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '600',
            backgroundColor: info.bg,
            border: `1px solid ${info.border}`,
            color: info.text,
            lineHeight: 1.3,
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: info.dotColor, flexShrink: 0 }}></span>
          <span>{info.label}</span>
        </span>
        {info.subText && (
          <span 
            style={{ 
              fontSize: '0.72rem', 
              color: '#6B7280', 
              paddingLeft: '4px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '3px',
              fontWeight: 500
            }}
            title={`Công đoạn: ${info.subText}`}
          >
            <span style={{ color: '#9CA3AF' }}>↳</span>
            <span>{info.subText}</span>
          </span>
        )}
      </div>
    );
  };

  const renderActionBadge = (task) => {
    if (!task) return null;
    const action = task.action || 'chap-nhan';
    const isPass = task.result === 'Đạt' || task.result === 'pass';

    if (action === 'tra-ve') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '700',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            lineHeight: 1.3,
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444', flexShrink: 0 }}></span>
          <span>Trả hàng</span>
        </span>
      );
    }

    if (action === 'cach-ly') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '700',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#D97706',
            lineHeight: 1.3,
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B', flexShrink: 0 }}></span>
          <span>Cách ly</span>
        </span>
      );
    }

    // action === 'chap-nhan'
    if (!isPass) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '700',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1D4ED8',
            lineHeight: 1.3,
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6', flexShrink: 0 }}></span>
          <span>Chấp nhận / Tự xử lý</span>
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: '700',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#059669',
          lineHeight: 1.3,
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }}></span>
        <span>Chấp nhận</span>
      </span>
    );
  };

  // Tối ưu hiển thị Chi tiết / Phôi kiểm tra gọn gàng, loại bỏ trùng lặp và phân tách các chi tiết rõ ràng
  const renderCleanBatchTaskName = (t) => {
    const rawTaskName = (t.task_name || '').trim();
    const rawPartName = (t.part_name || '').trim();

    // Kiểm tra xem task_name có phải là dạng mặc định "Xác nhận hồ sơ kiểm tra #..." không
    const isBoilerplate = rawTaskName.toLowerCase().startsWith('xác nhận hồ sơ');

    // Xác định danh sách các chi tiết thực tế
    let parts = [];
    if (rawPartName && rawPartName !== 'N/A') {
      // Phân tách chi tiết nếu có dấu phẩy hoặc xuống dòng
      parts = rawPartName
        .split(/[\n\r;]|,\s*(?=[A-ZÀ-Ỹa-z0-9])/)
        .map(s => s.trim())
        .filter(Boolean);
    } else if (isBoilerplate) {
      // Nếu part_name rỗng nhưng task_name có dạng "Xác nhận hồ sơ kiểm tra #DA123 (Tên chi tiết)"
      const match = rawTaskName.match(/\((.*?)\)/);
      if (match && match[1]) {
        parts = match[1]
          .split(/[\n\r;]|,\s*(?=[A-ZÀ-Ỹa-z0-9])/)
          .map(s => s.trim())
          .filter(Boolean);
      }
    }

    // Nếu không tách được gì, dùng rawTaskName hoặc rawPartName sạch
    if (parts.length === 0) {
      const fallbackText = isBoilerplate 
        ? rawTaskName.replace(/^xác nhận hồ sơ kiểm tra\s*#?[a-zA-Z0-9_\-]*\s*/i, '').replace(/^\(|\)$/g, '').trim() || rawTaskName
        : rawTaskName;
      return (
        <div style={{ fontWeight: 600, color: '#2D1A12', fontSize: '0.83rem', lineHeight: 1.35 }}>
          {fallbackText || 'Chi tiết kiểm tra'}
        </div>
      );
    }

    // Nếu là tên việc có ý nghĩa riêng biệt (không phải boilerplate Xác nhận hồ sơ...)
    const customTaskTitle = (!isBoilerplate && rawTaskName && rawTaskName !== rawPartName) ? rawTaskName : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {customTaskTitle && (
          <div style={{ fontWeight: 700, color: '#7B5233', fontSize: '0.83rem', marginBottom: '2px' }}>
            {customTaskTitle}
          </div>
        )}
        {parts.length === 1 ? (
          <div style={{ fontWeight: 600, color: '#2D1A12', fontSize: '0.83rem', lineHeight: 1.35 }}>
            {parts[0]}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {parts.map((item, pIdx) => (
              <div key={pIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.35 }}>
                <span style={{ color: '#059669', fontSize: '0.75rem', marginTop: '1px', flexShrink: 0 }}>•</span>
                <span style={{ fontWeight: 600, color: '#2D1A12', fontSize: '0.82rem' }}>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="gold-layout" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .badge-chualam {
          background-color: #FEF2F2;
          color: #EF4444;
          border: 1px solid #FCA5A5;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        .btn-toolbar-custom {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background-color: #7B5233;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-toolbar-custom:hover {
          background-color: #5D3E26;
        }
        .btn-secondary-custom {
          background-color: #FAF6F0;
          color: #7B5233;
          border: 1px solid #EADCC9;
        }
        .btn-secondary-custom:hover {
          background-color: #F2ECE4;
        }
        .edit-action-btn {
          color: #7B5233;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        .edit-action-btn:hover {
          background-color: #FAF6F0;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(3px);
        }
        .modal-flank-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 860px;
          padding: 0 14px;
          box-sizing: border-box;
        }
        .modal-flank-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #FAF6F0;
          border: 1.5px solid #EADCC9;
          color: #7B5233;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.08);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
          z-index: 1010;
        }
        .modal-flank-btn:hover:not(:disabled) {
          background-color: #FFFFFF;
          border-color: #7B5233;
          color: #5D3E26;
          transform: scale(1.12);
          box-shadow: 0 8px 24px rgba(123, 82, 51, 0.28);
        }
        .modal-flank-btn:active:not(:disabled) {
          transform: scale(0.94);
        }
        .modal-flank-btn:disabled {
          opacity: 0.28;
          cursor: not-allowed;
          box-shadow: none;
        }
        @media (max-width: 880px) {
          .modal-flank-container {
            padding: 0 4px !important;
          }
          .modal-flank-btn {
            position: absolute !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 40px !important;
            height: 40px !important;
            background-color: #FFFFFF !important;
          }
          .modal-flank-btn.prev {
            left: 8px !important;
          }
          .modal-flank-btn.next {
            right: 8px !important;
          }
        }
        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          width: 92%;
          max-width: 720px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          position: relative;
        }
      ` }} />

      {/* STICKY TOP ZONE */}
      <div className="sticky-top-zone">
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Mã phiếu, tên phiếu"
          showSort={true}
          sortOptions={[
            { value: 'date_desc', label: 'Mới nhất' },
            { value: 'date_asc', label: 'Cũ nhất' },
            { value: 'name_asc', label: 'Tên: A-Z' },
            { value: 'name_desc', label: 'Tên: Z-A' }
          ]}
          sortValue={sortOption}
          onSortChange={(val) => setSortOption(val)}
          showFilter={true}
          isFilterOpen={false}
          onFilterToggle={() => {}}
          extraActions={[
            {
              icon: <CheckCircle2 size={16} color="#059669" />,
              label: 'Xác nhận nhanh phiếu ĐẠT',
              badge: eligibleQuickPassTasks.length,
              badgeColor: '#10B981',
              onClick: handleOpenBatchQuickModal
            }
          ]}
          importActions={[
            { label: 'Nhập excel', onClick: () => {} }
          ]}
          onExport={() => {}}
          onCreate={() => {}}
          createLabel="Thêm tài liệu"
          hasWritePermission={true}
        />
      </div>

      {/* TABLE AREA */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card">
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className="spinner"></div>
                <span style={{ color: '#8D6E63', fontWeight: 600 }}>Đang tải danh sách phiếu chưa xác nhận...</span>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                <span style={{ color: '#8D6E63', fontWeight: 600 }}>Không có phiếu kiểm tra tồn đọng cần xác nhận.</span>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                      <th style={{ minWidth: '220px' }}>TÊN VIỆC</th>
                      <th style={{ width: '180px' }}>LOẠI KIỂM TRA</th>
                      <th style={{ width: '140px' }}>NGƯỜI KIỂM TRA</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>MỨC ĐỘ ƯU TIÊN</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>TRẠNG THÁI</th>
                      <th style={{ width: '160px', textAlign: 'center' }}>HÀNH ĐỘNG XỬ LÝ</th>
                      <th style={{ width: '155px', textAlign: 'center' }}>NGÀY GHI NHẬN</th>
                      <th>GHI CHÚ</th>
                      <th style={{ width: '160px', textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task, idx) => {
                      const sttDisplay = String((currentPage - 1) * limit + idx + 1).padStart(2, '0');
                      return (
                        <tr 
                          key={task.id || idx} 
                          onClick={() => setSelectedTask(task)}
                          style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        >
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>{sttDisplay}</td>
                          <td style={{ fontWeight: '700', color: '#2D1A12' }}>{task.task_name}</td>
                          <td style={{ verticalAlign: 'middle' }}>{renderCategoryBadge(task)}</td>
                          <td style={{ fontWeight: '600', color: '#2D1A12' }}>
                            <span style={{
                              display: 'inline-block',
                              backgroundColor: '#F3F4F6',
                              color: '#374151',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}>
                              {task.inspector_name || 'QC'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>{task.priority || 3}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge-chualam">Chưa Làm</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {renderActionBadge(task)}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '0.82rem' }}>
                            {formatDateTime(task.recorded_date)}
                          </td>
                          <td style={{ color: '#6B7280', fontSize: '0.85rem' }}>{task.notes}</td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                              {isEligibleForQuickConfirm(task) && (
                                <button
                                  type="button"
                                  className="btn-quick-confirm-table"
                                  title="Xác nhận nhanh hồ sơ ĐẠT"
                                  onClick={() => handleOpenQuickConfirmSingle(task)}
                                  disabled={quickConfirming}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    backgroundColor: '#ECFDF5',
                                    color: '#059669',
                                    border: '1px solid #A7F3D0',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: quickConfirming ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#059669';
                                    e.currentTarget.style.color = '#FFFFFF';
                                    e.currentTarget.style.borderColor = '#059669';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ECFDF5';
                                    e.currentTarget.style.color = '#059669';
                                    e.currentTarget.style.borderColor = '#A7F3D0';
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Duyệt nhanh</span>
                                </button>
                              )}
                              {task.action === 'tra-ve' && (
                                <button
                                  type="button"
                                  className="btn-cancel-return-table"
                                  title="Hủy trả hàng"
                                  onClick={() => handleCancelReturn(task)}
                                  disabled={cancelingId === task.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    backgroundColor: '#FFFBEB',
                                    color: '#D97706',
                                    border: '1px solid #FCD34D',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: cancelingId === task.id ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <RotateCcw size={12} className={cancelingId === task.id ? 'animate-spin' : ''} />
                                  <span>{cancelingId === task.id ? 'Đang hủy...' : 'Hủy trả'}</span>
                                </button>
                              )}
                              <Edit 
                                size={16} 
                                className="edit-action-btn"
                                title="Xem chi tiết & Xác nhận"
                                onClick={() => setSelectedTask(task)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION - DESKTOP STICKY BOTTOM */}
              <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Show <b>{filteredTasks.length > 0 ? (currentPage - 1) * limit + 1 : 0}</b> to <b>{Math.min(currentPage * limit, filteredTasks.length)}</b> of <b>{filteredTasks.length}</b> results
                </div>
                <div className="pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL CHI TIẾT & XÁC NHẬN PHIẾU */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-flank-container" onClick={(e) => e.stopPropagation()}>
            {/* NÚT ĐIỀU HƯỚNG BÊN HÔNG TRÁI (<) */}
            <button
              type="button"
              className="modal-flank-btn prev"
              onClick={goToPreviousTask}
              disabled={currentTaskIndex <= 0}
              title="Hồ sơ trước (Phím mũi tên ←)"
              aria-label="Hồ sơ trước"
              style={{ marginRight: '14px' }}
            >
              <ChevronLeft size={26} />
            </button>

            {/* MODAL CONTENT */}
            <div className="modal-content" style={{ flex: 1, maxWidth: '740px', margin: 0 }}>
              {/* MODAL HEADER */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 22px',
                backgroundColor: '#FAF6F0',
                borderBottom: '1.5px solid #EADCC9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#7B5233',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(123, 82, 51, 0.25)',
                    flexShrink: 0
                  }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.18rem', fontWeight: 800, letterSpacing: '-0.2px' }}>
                      Chi tiết phiếu kiểm tra
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 600, marginTop: '2px' }}>
                      Mã phiếu: <strong style={{ color: '#2D1A12' }}>#{selectedTask.ticket_code || selectedTask.id}</strong>
                    </div>
                  </div>
                </div>

                {/* CHỈ SỐ HỒ SƠ, KẾT QUẢ & NÚT ĐÓNG */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* CHỈ SỐ THỨ TỰ HỒ SƠ */}
                  {filteredTasks.length > 0 && currentTaskIndex >= 0 && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #EADCC9',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: '#7B5233',
                        letterSpacing: '0.2px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                      title={`Đang xem hồ sơ ${currentTaskIndex + 1} trên tổng số ${filteredTasks.length} hồ sơ`}
                    >
                      {currentTaskIndex + 1} / {filteredTasks.length}
                    </div>
                  )}

                  {/* CHỈNH SỬA KẾT QUẢ ĐẠT / KHÔNG ĐẠT */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Kết quả:
                    </span>
                    <div style={{
                      display: 'inline-flex',
                      backgroundColor: '#F3F4F6',
                      padding: '2px',
                      borderRadius: '20px',
                      border: '1px solid #E5E7EB',
                      gap: '2px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setModalResult('pass');
                          if (modalAction === 'tra-ve') setModalAction('chap-nhan');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 10px',
                          borderRadius: '16px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: modalResult === 'pass' ? '1.5px solid #A7F3D0' : '1.5px solid transparent',
                          backgroundColor: modalResult === 'pass' ? '#ECFDF5' : 'transparent',
                          color: modalResult === 'pass' ? '#059669' : '#6B7280',
                          boxShadow: modalResult === 'pass' ? '0 1px 2px rgba(16, 185, 129, 0.2)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Đạt
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalResult('fail');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 10px',
                          borderRadius: '16px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: modalResult === 'fail' ? '1.5px solid #FECACA' : '1.5px solid transparent',
                          backgroundColor: modalResult === 'fail' ? '#FEF2F2' : 'transparent',
                          color: modalResult === 'fail' ? '#DC2626' : '#6B7280',
                          boxShadow: modalResult === 'fail' ? '0 1px 2px rgba(239, 68, 68, 0.2)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <XCircle size={14} />
                        Không đạt
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedTask(null)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '1.5px solid #EADCC9',
                      backgroundColor: '#FFFFFF',
                      color: '#8D6E63',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEE2E2';
                      e.currentTarget.style.color = '#DC2626';
                      e.currentTarget.style.borderColor = '#FCA5A5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.color = '#8D6E63';
                      e.currentTarget.style.borderColor = '#EADCC9';
                    }}
                    title="Đóng (Esc)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

            {/* MODAL BODY */}
            {confirmSuccessMsg ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                <CheckCircle2 size={54} style={{ margin: '0 auto 12px auto', display: 'block', color: '#10B981' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{confirmSuccessMsg}</div>
              </div>
            ) : (
              <div style={{ padding: '20px 22px', maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
                {/* CARD THÔNG TIN TỔNG QUAN (3 DÒNG x 3 CỘT) */}
                <div style={{
                  backgroundColor: '#FCFBF9',
                  border: '1.5px solid #EADCC9',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px 16px',
                  fontSize: '0.88rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      MÃ LÔ / PO
                    </span>
                    <strong style={{ color: '#7B5233', fontSize: '0.92rem' }}>
                      {selectedTask.batch_no || 'N/A'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      LOẠI KIỂM TRA
                    </span>
                    <div>{renderCategoryBadge(selectedTask)}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      NGƯỜI KIỂM TRA QC
                    </span>
                    <strong style={{ color: '#2D1A12' }}>
                      {selectedTask.inspector_name || 'QC'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      NGÀY GHI NHẬN
                    </span>
                    <span style={{ color: '#2D1A12', fontWeight: 600 }}>
                      {formatDateTime(selectedTask.recorded_date)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      TRẠNG THÁI
                    </span>
                    <div>
                      <span className="badge-chualam">Chưa Làm</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      HÀNH ĐỘNG XỬ LÝ
                    </span>
                    <select
                      value={modalAction}
                      onChange={(e) => setModalAction(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1.5px solid #EADCC9',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        backgroundColor: '#FAF6F0',
                        color: '#7B5233',
                        cursor: 'pointer',
                        outline: 'none',
                        width: '100%',
                        maxWidth: '180px'
                      }}
                    >
                      <option value="chap-nhan">{modalResult === 'fail' ? 'Chấp nhận / Tự xử lý' : 'Chấp nhận'}</option>
                      <option value="cach-ly">Cách ly</option>
                      <option value="tra-ve">Trả hàng</option>
                    </select>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      SL CẦN KIỂM (LÔ)
                    </span>
                    <strong style={{ color: '#059669', fontSize: '0.92rem' }}>
                      {Number(selectedTask.required_qty || 0).toLocaleString()}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      SL MẪU KIỂM TRA (AQL)
                    </span>
                    <strong style={{ color: '#1D4ED8', fontSize: '0.92rem' }}>
                      {Number(selectedTask.sample_qty || 0).toLocaleString()}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      SỐ LỖI PHÁT HIỆN
                    </span>
                    <strong style={{ color: (selectedTask.error_qty > 0) ? '#DC2626' : '#059669', fontSize: '0.92rem' }}>
                      {Number(selectedTask.error_qty || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* BẢNG DANH SÁCH CHI TIẾT / PHÔI KIỂM TRA (LIST TABLE) */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '0.82rem',
                    color: '#7B5233',
                    fontWeight: 800,
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>
                    <Layers size={15} color="#7B5233" />
                    <span>Danh sách chi tiết / phôi kiểm tra ({partsList.length})</span>
                  </div>

                  <div style={{
                    border: '1.5px solid #EADCC9',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1.5px solid #EADCC9' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '46px' }}>STT</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', minWidth: '130px' }}>TÊN CHI TIẾT / PHÔI</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '140px' }}>QUY CÁCH / THÔNG SỐ</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', minWidth: '180px' }}>TÊN TỦ (SKU)</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '90px' }}>SL KẾ HOẠCH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partsList.map((p, idx) => (
                          <tr 
                            key={idx} 
                            style={{ 
                              borderBottom: idx < partsList.length - 1 ? '1px solid #F3EBE1' : 'none',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FCF9F6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                          >
                            <td style={{ padding: '9px 10px', color: '#8D6E63', fontWeight: 700, textAlign: 'center', verticalAlign: 'middle' }}>
                              {p.stt}
                            </td>
                            <td style={{ padding: '9px 12px', color: '#2D1A12', fontWeight: 700, verticalAlign: 'middle', lineHeight: 1.4 }}>
                              {p.name}
                            </td>
                            <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                              <span style={{
                                display: 'inline-block',
                                backgroundColor: '#FAF6F0',
                                color: '#7B5233',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #EADCC9',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}>
                                {p.spec}
                              </span>
                            </td>
                            <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                              {p.cabinet ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  fontSize: '0.76rem',
                                  padding: '2px 8px',
                                  borderRadius: '5px',
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  fontWeight: 600,
                                  border: '1px solid #BFDBFE',
                                  whiteSpace: 'nowrap'
                                }} title={p.cabinet}>
                                  {p.cabinet}
                                </span>
                              ) : (
                                <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#4B5563' }}>
                              {p.qty ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  backgroundColor: '#F3F4F6',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  color: '#374151'
                                }}>
                                  {Number(p.qty).toLocaleString()}
                                </span>
                              ) : (
                                <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* THÔNG TIN XỬ LÝ */}
                <div style={{ marginBottom: '16px', fontSize: '0.88rem' }}>
                  <label style={{
                    fontSize: '0.76rem',
                    color: '#7B5233',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    Thông tin xử lý / Biện pháp khắc phục
                  </label>
                  <textarea
                    value={handlingInfo}
                    onChange={(e) => setHandlingInfo(e.target.value)}
                    placeholder="Nhập phương án xử lý, biện pháp khắc phục sự cố, hướng dẫn tái kiểm tra..."
                    rows={3}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #EADCC9',
                      backgroundColor: '#FFFFFF',
                      color: '#2D1A12',
                      fontSize: '0.86rem',
                      lineHeight: '1.45',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7B5233';
                      e.target.style.boxShadow = '0 0 0 3px rgba(123, 82, 51, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#EADCC9';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* GHI CHÚ */}
                <div style={{ marginBottom: '16px', fontSize: '0.88rem' }}>
                  <div style={{ fontSize: '0.76rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Ghi chú
                  </div>
                  <div style={{
                    background: '#FAF6F0',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #EADCC9',
                    color: '#4B5563',
                    lineHeight: 1.4
                  }}>
                    {selectedTask.notes || 'Không có ghi chú thêm.'}
                  </div>
                </div>

                {/* HÌNH ẢNH MINH CHỨNG NẾU CÓ */}
                {(selectedTask.image_path_1 || selectedTask.image_path_2 || selectedTask.image_path_3) && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.76rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Hình ảnh minh chứng
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {[selectedTask.image_path_1, selectedTask.image_path_2, selectedTask.image_path_3].filter(Boolean).map((img, idx) => {
                        const imgUrl = getImageUrl(img);
                        return (
                          <a 
                            key={idx} 
                            href={imgUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <img 
                              src={imgUrl}
                              alt="Minh chứng"
                              style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #EADCC9', cursor: 'pointer', transition: 'transform 0.15s' }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODAL FOOTER */}
            {!confirmSuccessMsg && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 22px',
                backgroundColor: '#FAF6F0',
                borderTop: '1.5px solid #EADCC9'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsCancelInspectionModalOpen(true)}
                    disabled={confirming || cancelingTask}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1.5px solid #FCA5A5',
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: (confirming || cancelingTask) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!confirming && !cancelingTask) {
                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                        e.currentTarget.style.borderColor = '#EF4444';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!confirming && !cancelingTask) {
                        e.currentTarget.style.backgroundColor = '#FEF2F2';
                        e.currentTarget.style.borderColor = '#FCA5A5';
                      }
                    }}
                    title="Hủy hồ sơ này khỏi danh sách quản lý chất lượng"
                  >
                    <XCircle size={15} />
                    {cancelingTask ? 'Đang hủy...' : 'Hủy hồ sơ'}
                  </button>

                  {selectedTask.action === 'tra-ve' && (
                    <button
                      type="button"
                      onClick={() => handleCancelReturn(selectedTask)}
                      disabled={confirming || cancelingId === selectedTask.id || cancelingTask}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#FEF3C7',
                        border: '1.5px solid #FDE68A',
                        color: '#B45309',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: (confirming || cancelingId === selectedTask.id || cancelingTask) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FDE68A'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FEF3C7'}
                      title="Hủy trả hàng và chuyển sang Chấp nhận / Tự xử lý"
                    >
                      <RotateCcw size={15} className={cancelingId === selectedTask.id ? 'animate-spin' : ''} />
                      {cancelingId === selectedTask.id ? 'Đang hủy...' : 'Hủy trả hàng'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    disabled={confirming || cancelingTask}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: '1.5px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#4B5563',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: (confirming || cancelingTask) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmTask(selectedTask)}
                    disabled={confirming || cancelingTask}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: (confirming || cancelingTask) ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#047857'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  >
                    <CheckCircle2 size={16} />
                    {confirming ? 'Đang xác nhận...' : 'Xác nhận hồ sơ'}
                  </button>
                </div>
              </div>
            )}
            </div>

            {/* NÚT ĐIỀU HƯỚNG BÊN HÔNG PHẢI (>) */}
            <button
              type="button"
              className="modal-flank-btn next"
              onClick={goToNextTask}
              disabled={currentTaskIndex >= filteredTasks.length - 1}
              title="Hồ sơ sau (Phím mũi tên →)"
              aria-label="Hồ sơ sau"
              style={{ marginLeft: '14px' }}
            >
              <ChevronRight size={26} />
            </button>
          </div>
        </div>
      )}
      {/* POPUP XÁC NHẬN HỦY HỒ SƠ KIỂM TRA */}
      <BeautifulConfirmModal
        isOpen={isCancelInspectionModalOpen}
        onClose={() => setIsCancelInspectionModalOpen(false)}
        onConfirm={handleExecuteCancelInspection}
        title="Xác nhận hủy hồ sơ kiểm tra"
        message={`Bạn có chắc chắn muốn hủy hồ sơ kiểm tra #${selectedTask?.ticket_code || selectedTask?.id} không?\n\n• Phiếu này sẽ bị ẩn khỏi danh sách hồ sơ chất lượng (/admin/quality-records).\n• Thông tin vẫn được lưu trữ trong hệ thống với trạng thái đã hủy.`}
        confirmText={cancelingTask ? 'Đang hủy...' : 'Đồng ý hủy hồ sơ'}
        cancelText="Không hủy"
        type="danger"
      />

      {/* POPUP XÁC NHẬN HỦY TRẢ HÀNG CHUẨN DỰ ÁN */}
      <BeautifulConfirmModal
        isOpen={cancelConfirmModal.isOpen}
        onClose={() => setCancelConfirmModal({ isOpen: false, task: null })}
        onConfirm={handleConfirmCancelReturn}
        title="Xác nhận hủy trả hàng"
        message={`Bạn có chắc chắn muốn hủy trả hàng cho phiếu #${cancelConfirmModal.task?.ticket_code || cancelConfirmModal.task?.id} không?\nPhiếu sẽ được chuyển sang hành động 'Chấp nhận / Tự xử lý'.`}
        confirmText={cancelingId ? 'Đang xử lý...' : 'Đồng ý hủy trả'}
        cancelText="Hủy bỏ"
        type="warning"
      />

      {/* POPUP XÁC NHẬN NHANH 1 HỒ SƠ ĐẠT TỪ TỪNG DÒNG */}
      <BeautifulConfirmModal
        isOpen={quickConfirmModal.isOpen}
        onClose={() => setQuickConfirmModal({ isOpen: false, task: null })}
        onConfirm={handleExecuteQuickConfirmSingle}
        title="Xác nhận nhanh hồ sơ kiểm tra"
        message={`Bạn có chắc chắn muốn duyệt nhanh hồ sơ kiểm tra #${quickConfirmModal.task?.ticket_code || quickConfirmModal.task?.id} không?\n\n• Tên việc: ${quickConfirmModal.task?.task_name || 'N/A'}\n• Kết quả kiểm tra: ĐẠT\n• Phương án xử lý: Chấp nhận`}
        confirmText={quickConfirming ? 'Đang duyệt...' : 'Xác nhận duyệt'}
        cancelText="Hủy bỏ"
        type="success"
      />

      {/* POPUP LIST XÁC NHẬN NHANH TOÀN BỘ PHIẾU ĐẠT TỪ MỤC KHÁC */}
      {isBatchQuickModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBatchQuickModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '1120px', width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              backgroundColor: '#FAF6F0',
              borderBottom: '1.5px solid #EADCC9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  border: '1.5px solid #A7F3D0',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(16, 185, 129, 0.15)',
                  flexShrink: 0
                }}>
                  <CheckCheck size={22} color="#059669" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.18rem', fontWeight: 800, letterSpacing: '-0.2px' }}>
                    Xác nhận nhanh hồ sơ kiểm tra ĐẠT
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 600, marginTop: '2px' }}>
                    Danh sách các phiếu có kết quả ĐẠT và không trả hàng để duyệt đồng loạt
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '0.82rem'
                }}>
                  Đã chọn: {selectedBatchIds.size} / {isBatchFilterActive ? filteredBatchTasks.length : eligibleQuickPassTasks.length} phiếu
                </span>
                <button 
                  onClick={() => setIsBatchQuickModalOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1.5px solid #EADCC9',
                    backgroundColor: '#FFFFFF',
                    color: '#8D6E63',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEE2E2';
                    e.currentTarget.style.color = '#DC2626';
                    e.currentTarget.style.borderColor = '#FCA5A5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#8D6E63';
                    e.currentTarget.style.borderColor = '#EADCC9';
                  }}
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
              {/* TOP CONTROLS: SEARCH, FILTERS & SMART SELECTION */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px',
                padding: '10px 14px',
                backgroundColor: '#FCFBF9',
                border: '1px solid #EADCC9',
                borderRadius: '10px'
              }}>
                {/* LEFT: SEARCH & DROPDOWN FILTERS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                  {/* Search Box */}
                  <div style={{ position: 'relative', width: '270px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63' }} />
                    <input
                      type="text"
                      placeholder="Lọc mã phiếu, tên chi tiết, PO..."
                      value={batchSearchQuery}
                      onChange={(e) => setBatchSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 12px 7px 32px',
                        borderRadius: '8px',
                        border: batchSearchQuery.trim() ? '1.5px solid #059669' : '1px solid #EADCC9',
                        fontSize: '0.83rem',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                        color: '#2D1A12'
                      }}
                    />
                  </div>

                  {/* Filter by Inspection Type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={batchFilterType}
                      onChange={(e) => setBatchFilterType(e.target.value)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: batchFilterType !== 'all' ? '1.5px solid #059669' : '1px solid #EADCC9',
                        backgroundColor: batchFilterType !== 'all' ? '#ECFDF5' : '#FFFFFF',
                        color: batchFilterType !== 'all' ? '#047857' : '#7B5233',
                        fontSize: '0.83rem',
                        fontWeight: 600,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">Tất cả loại kiểm tra ({eligibleQuickPassTasks.length})</option>
                      {availableBatchInspectionTypes.map(item => (
                        <option key={item.label} value={item.label}>
                          {item.label} ({item.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={batchFilterAction}
                      onChange={(e) => setBatchFilterAction(e.target.value)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: batchFilterAction !== 'all' ? '1.5px solid #059669' : '1px solid #EADCC9',
                        backgroundColor: batchFilterAction !== 'all' ? '#ECFDF5' : '#FFFFFF',
                        color: batchFilterAction !== 'all' ? '#047857' : '#7B5233',
                        fontSize: '0.83rem',
                        fontWeight: 600,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">Tất cả hành động ({eligibleQuickPassTasks.length})</option>
                      {availableBatchActions.map(item => (
                        <option key={item.key} value={item.key}>
                          {item.label} ({item.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset Filters Button */}
                  {isBatchFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetBatchFilters}
                      title="Đặt lại bộ lọc về mặc định"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #FCA5A5',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Đặt lại</span>
                    </button>
                  )}
                </div>

                {/* RIGHT: SELECTION TOGGLE BUTTON & RESULT COUNT */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 600 }}>
                    Hiển thị: <strong style={{ color: '#7B5233' }}>{filteredBatchTasks.length}</strong> / {eligibleQuickPassTasks.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleFilteredBatch}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #EADCC9',
                      backgroundColor: '#FAF6F0',
                      color: '#7B5233',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F2ECE4'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                  >
                    {isAllFilteredSelected 
                      ? (isBatchFilterActive ? 'Bỏ chọn các phiếu đang lọc' : 'Bỏ chọn tất cả') 
                      : (isBatchFilterActive ? `Chọn tất cả đang lọc (${filteredBatchTasks.length})` : 'Chọn tất cả')}
                  </button>
                </div>
              </div>

              {/* LIST TABLE */}
              <div style={{
                border: '1.5px solid #EADCC9',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                maxHeight: '480px',
                overflowY: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1.5px solid #EADCC9', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ width: '42px', padding: '10px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          ref={el => {
                            if (el) el.indeterminate = !isAllFilteredSelected && someFilteredSelected;
                          }}
                          onChange={handleToggleFilteredBatch}
                          title={isAllFilteredSelected ? 'Bỏ chọn tất cả đang hiển thị' : 'Chọn tất cả đang hiển thị'}
                          style={{ cursor: 'pointer', accentColor: '#059669', width: '16px', height: '16px' }}
                        />
                      </th>
                      <th style={{ width: '48px', padding: '10px 6px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.78rem' }}>STT</th>
                      <th style={{ width: '110px', padding: '10px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.78rem' }}>MÃ PHIẾU</th>
                      <th style={{ minWidth: '360px', padding: '10px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.78rem' }}>CHI TIẾT / PHÔI KIỂM TRA</th>
                      <th style={{ width: '165px', padding: '10px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.78rem' }}>LOẠI KIỂM TRA</th>
                      <th style={{ width: '95px', padding: '10px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.78rem' }}>KẾT QUẢ</th>
                      <th style={{ width: '125px', padding: '10px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.78rem' }}>HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatchTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#9CA3AF' }}>
                          <div>Không tìm thấy phiếu nào phù hợp với bộ lọc hiện tại.</div>
                          {isBatchFilterActive && (
                            <button
                              type="button"
                              onClick={handleResetBatchFilters}
                              style={{
                                marginTop: '10px',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid #EADCC9',
                                backgroundColor: '#FAF6F0',
                                color: '#7B5233',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Xóa bộ lọc để xem tất cả
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredBatchTasks.map((t, idx) => {
                        const isChecked = selectedBatchIds.has(t.id);
                        return (
                          <tr
                            key={t.id}
                            onClick={() => handleToggleBatchItem(t.id)}
                            style={{
                              backgroundColor: isChecked ? '#F0FDF4' : '#FFFFFF',
                              borderBottom: idx < filteredBatchTasks.length - 1 ? '1px solid #F3EBE1' : 'none',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            <td style={{ textAlign: 'center', padding: '10px 10px', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleBatchItem(t.id)}
                                style={{ cursor: 'pointer', accentColor: '#059669', width: '15px', height: '15px' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center', padding: '10px 6px', color: '#8D6E63', fontWeight: 700, verticalAlign: 'middle' }}>
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#7B5233', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              #{t.ticket_code || t.id}
                            </td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                              {renderCleanBatchTaskName(t)}
                            </td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                              {renderCategoryBadge(t)}
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                backgroundColor: '#ECFDF5',
                                color: '#059669',
                                border: '1px solid #A7F3D0',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.76rem'
                              }}>
                                <CheckCircle2 size={12} />
                                Đạt
                              </span>
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                              {renderActionBadge(t)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 22px',
              backgroundColor: '#FAF6F0',
              borderTop: '1.5px solid #EADCC9'
            }}>
              <div style={{ fontSize: '0.84rem', color: '#7B5233', fontWeight: 600 }}>
                Đã chọn: <strong style={{ color: '#047857', fontSize: '0.95rem' }}>{selectedBatchIds.size}</strong> / {isBatchFilterActive ? `${filteredBatchTasks.length} phiếu đang lọc` : `${eligibleQuickPassTasks.length} phiếu`}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsBatchQuickModalOpen(false)}
                  disabled={batchConfirming}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1.5px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#4B5563',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBatchConfirm}
                  disabled={batchConfirming || selectedBatchIds.size === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: selectedBatchIds.size === 0 ? '#9CA3AF' : '#059669',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: (batchConfirming || selectedBatchIds.size === 0) ? 'not-allowed' : 'pointer',
                    boxShadow: selectedBatchIds.size === 0 ? 'none' : '0 2px 4px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBatchIds.size > 0 && !batchConfirming) e.currentTarget.style.backgroundColor = '#047857';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBatchIds.size > 0 && !batchConfirming) e.currentTarget.style.backgroundColor = '#059669';
                  }}
                >
                  <CheckCheck size={16} className={batchConfirming ? 'animate-spin' : ''} />
                  <span>{batchConfirming ? 'Đang duyệt...' : `Xác nhận duyệt (${selectedBatchIds.size} phiếu)`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityOverviewView;


import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Filter, Edit, FileText, ChevronLeft, ChevronRight, CheckCircle2, X, Eye, RotateCcw, XCircle, Layers, Package, CheckCheck, MoreVertical, Info, Image as ImageIcon, ClipboardList, AlertTriangle, Keyboard, HelpCircle, Loader2, Save, UploadCloud, Plus, PlusCircle, History, Clock, ArrowRight, User } from 'lucide-react';
import api from '@webShared/Services/api.service';
import * as XLSX from 'xlsx';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import SopStepsTable from './components/SopStepsTable';
import AccountQualityTab from './components/AccountQualityTab';
import '@styles/components.css';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import 'bootstrap/dist/css/bootstrap-utilities.min.css';
import './QualityOverviewView.mobile.css';

const AVAILABLE_STAGES = [
  'Định hình',
  'Tạo phôi',
  'Lắp ráp',
  'Sơn',
  'Đóng gói',
  'Nhập kho/Đầu vào',
  'Lưu kho'
];

const normalizeStage = (val) => {
  if (!val) return '';
  const clean = String(val).trim();
  const lower = clean.toLowerCase();
  if (lower === 'nhập kho' || lower === 'đầu vào' || lower === 'nhap kho' || lower === 'dau vao' || lower.includes('nhập kho/đầu vào')) {
    return 'Nhập kho/Đầu vào';
  }
  const found = AVAILABLE_STAGES.find(s => s.toLowerCase() === lower);
  return found || clean;
};

const normalizeInspectionType = (typeKey, category) => {
  const k = (typeKey || category || '').toLowerCase().trim();
  if (k.includes('first_sample') || k.includes('mẫu đầu') || k.includes('mau-dau') || k.includes('mẫu-đầu') || k.includes('mẫu lần đầu')) return 'first_sample';
  if (k.includes('daily') || k.includes('hang-ngay') || k.includes('hằng ngày')) return 'daily';
  if (k.includes('re_inspect') || k.includes('tai-kiem') || k.includes('tái kiểm') || k.includes('reinspect') || k.includes('kiểm tra lại')) return 're_inspect';
  if (k.includes('parameter') || k.includes('thông số') || k.includes('thong-so') || k.includes('do-am') || k.includes('kich-thuoc') || k.includes('ngoai-quan')) return 'parameter';
  if (k.includes('process') || k.includes('quy-trinh') || k.includes('quy trình')) return 'process';
  if (k.includes('qa') || k.includes('vấn đáp') || k.includes('van-dap')) return 'qa';
  if (k.includes('nhap-kho') || k.includes('nhập kho') || k.includes('dau-vao') || k.includes('đầu vào') || k.includes('input')) return 'input';
  if (k.includes('stage') || k.includes('công đoạn')) return 'stage';
  return typeKey || 'first_sample';
};

const getImageStemKey = (img) => {
  if (!img || typeof img !== 'string') return '';
  const clean = img.trim().split('?')[0].split('#')[0].replace(/\\/g, '/');
  const filename = clean.split('/').pop();
  if (!filename) return '';
  const dotIdx = filename.lastIndexOf('.');
  return dotIdx > 0 ? filename.substring(0, dotIdx).toLowerCase() : filename.toLowerCase();
};

const deduplicateInspectionImages = (imgs) => {
  if (!Array.isArray(imgs)) return [];
  const stemMap = new Map();
  imgs.filter(Boolean).forEach(img => {
    if (typeof img !== 'string' || !img.trim()) return;
    const cleanImg = img.trim();
    if (cleanImg.includes('qc_phoi_1') || cleanImg.includes('qc_phoi_2') || cleanImg.includes('qc_phoi_3')) return;

    const stem = getImageStemKey(cleanImg);
    if (!stem) return;

    if (!stemMap.has(stem)) {
      stemMap.set(stem, cleanImg);
    } else {
      const existing = stemMap.get(stem);
      if (existing.toLowerCase().endsWith('.webp') && cleanImg.toLowerCase().endsWith('.jpg')) {
        stemMap.set(stem, cleanImg);
      }
    }
  });
  return Array.from(stemMap.values());
};

const handleInspectionImageError = (e) => {
  const currentSrc = e.target?.src || '';
  if (currentSrc.toLowerCase().includes('.webp') && !e.target.dataset.triedJpg) {
    e.target.dataset.triedJpg = 'true';
    e.target.src = currentSrc.replace(/\.webp($|\?)/i, '.jpg$1');
    return;
  }
  e.target.onerror = null;
  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23A89F91" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="%23FAF7F2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
};

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

  const [activeMainTab, setActiveMainTab] = useState('tasks'); // 'tasks' | 'accounts'
  const [pendingTasks, setPendingTasks] = useState([]);
  const [accountCount, setAccountCount] = useState(0);
  const [accountTabRefreshTrigger, setAccountTabRefreshTrigger] = useState(0);

  // Đếm số lượng tài khoản kiểm tra viên duy nhất trong danh sách tồn đọng
  const distinctAccountCount = useMemo(() => {
    if (!Array.isArray(pendingTasks)) return 0;
    const s = new Set();
    pendingTasks.forEach(t => {
      const name = (t.inspector_name || 'QC Hệ thống').trim();
      if (name) s.add(name);
    });
    return s.size;
  }, [pendingTasks]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');

  // Filter states cho thanh công cụ và bộ lọc nâng cao
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [filterResult, setFilterResult] = useState('all'); // 'all' | 'pass' | 'fail'
  const [filterAction, setFilterAction] = useState('all'); // 'all' | 'chap-nhan' | 'cach-ly' | 'tra-ve'
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | category name
  const [filterStage, setFilterStage] = useState('all'); // 'all' | stage name
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();

  // Trích xuất thông tin tài khoản đăng nhập hiện tại để ghi nhận Audit Trail
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('smartflow_user');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }, []);
  const currentEditorName = currentUser.full_name || currentUser.name || currentUser.username || 'QC Administrator';
  const currentEditorRole = currentUser.role_name || currentUser.role || 'Quản lý QC';
  
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
  const [actionMenuId, setActionMenuId] = useState(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);

  // Đóng Action Menu khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = () => {
      setActionMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Trạng thái chỉnh sửa trên Modal Chi tiết
  const [modalResult, setModalResult] = useState('pass');
  const [modalAction, setModalAction] = useState('chap-nhan');
  const [modalInspectionType, setModalInspectionType] = useState('first_sample');
  const [modalStage, setModalStage] = useState('');
  const [modalStatus, setModalStatus] = useState('Chưa Làm');
  const [modalParameter, setModalParameter] = useState('do_am');
  const [formTypes, setFormTypes] = useState([]);
  const [parameterOptions, setParameterOptions] = useState([]);
  const [savingTask, setSavingTask] = useState(false);
  const [handlingInfo, setHandlingInfo] = useState('');
  const [modalTab, setModalTab] = useState('info'); // 'info' | 'details' | 'history'
  const [modalHistory, setModalHistory] = useState([]); // Lịch sử chỉnh sửa phiếu (Audit Trail)
  const [previewImgUrl, setPreviewImgUrl] = useState(null);
  const [fallbackSteps, setFallbackSteps] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  const [modalImages, setModalImages] = useState([]);
  const [handlingImages, setHandlingImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingHandlingImages, setIsUploadingHandlingImages] = useState(false);
  const [isDraggingHandlingImages, setIsDraggingHandlingImages] = useState(false);
  const fileInputRef = useRef(null);
  const handlingFileInputRef = useRef(null);

  // Trạng thái kiểm tra thay đổi chưa lưu (Dirty Check) & Popup xác nhận lưu
  const [showUnsavedConfirmModal, setShowUnsavedConfirmModal] = useState(false);
  const initialFormValuesRef = useRef(null);

  // Tải danh mục loại phiếu kiểm tra và thông số đo từ Database
  useEffect(() => {
    let isMounted = true;
    // 1. Tải danh mục loại phiếu kiểm tra
    api.get('/inspection-form-types')
      .then((res) => {
        const data = res?.data !== undefined ? res.data : res;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const activeTypes = data.filter(t => t.is_active !== false);
          if (activeTypes.length > 0) {
            setFormTypes(activeTypes);
          }
        }
      })
      .catch((err) => console.warn('Không thể tải /inspection-form-types:', err));

    // 2. Tải danh mục thông số kiểm tra
    api.get('/inspection-parameters')
      .then((res) => {
        const data = res?.data !== undefined ? res.data : res;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setParameterOptions(data);
        }
      })
      .catch((err) => console.warn('Không thể tải /inspection-parameters:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Tải danh mục loại phiếu kiểm tra và thông số đo từ Database
  useEffect(() => {
    let isMounted = true;
    // 1. Tải danh mục loại phiếu kiểm tra
    api.get('/inspection-form-types')
      .then((res) => {
        const data = res?.data !== undefined ? res.data : res;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const activeTypes = data.filter(t => t.is_active !== false);
          if (activeTypes.length > 0) {
            setFormTypes(activeTypes);
          }
        }
      })
      .catch((err) => console.warn('Không thể tải /inspection-form-types:', err));

    // 2. Tải danh mục thông số kiểm tra
    api.get('/inspection-parameters')
      .then((res) => {
        const data = res?.data !== undefined ? res.data : res;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setParameterOptions(data);
        }
      })
      .catch((err) => console.warn('Không thể tải /inspection-parameters:', err));

    return () => {
      isMounted = false;
    };
  }, []);

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
      const rawType = selectedTask.inspection_type || parsedJson?.inspection_type || '';
      setModalInspectionType(normalizeInspectionType(rawType, selectedTask.category));

      const rawStage = selectedTask.stage || selectedTask.stage_name || parsedJson?.stage || parsedJson?.stage_name || parsedJson?.step_name || '';
      setModalStage(normalizeStage(rawStage));

      const rawParam = selectedTask.parameter || parsedJson?.parameter || 'do_am';
      setModalParameter(rawParam);

      setModalStatus(selectedTask.status || parsedJson?.status || 'Chưa Làm');
      setHandlingInfo(selectedTask.handling_info || parsedJson?.handling_info || '');

      // Khởi tạo danh sách ảnh xử lý / biện pháp khắc phục
      const rawHandlingImgs = selectedTask.handling_images || parsedJson?.handling_images || [];
      let initHandlingImgs = [];
      if (Array.isArray(rawHandlingImgs)) {
        initHandlingImgs = rawHandlingImgs;
      } else if (typeof rawHandlingImgs === 'string') {
        try {
          const parsedH = JSON.parse(rawHandlingImgs);
          if (Array.isArray(parsedH)) initHandlingImgs = parsedH;
        } catch (e) {
          if (rawHandlingImgs.trim()) initHandlingImgs = [rawHandlingImgs];
        }
      }
      initHandlingImgs = deduplicateInspectionImages(initHandlingImgs);
      setHandlingImages(initHandlingImgs);

      setModalTab('info');
      setPreviewImgUrl(null);
      setFallbackSteps([]);

      // Khởi tạo lịch sử chỉnh sửa (Audit Trail)
      const hist = selectedTask.edit_history || parsedJson?.edit_history || [];
      setModalHistory(Array.isArray(hist) ? hist : []);

      // Khởi tạo danh sách ảnh minh chứng từ selectedTask (có khử trùng lặp thông minh)
      const rawImgs = [];
      if (Array.isArray(selectedTask.images)) {
        selectedTask.images.forEach(img => rawImgs.push(img));
      } else if (typeof selectedTask.images === 'string') {
        try {
          const parsed = JSON.parse(selectedTask.images);
          if (Array.isArray(parsed)) parsed.forEach(img => rawImgs.push(img));
        } catch (e) {}
      }

      [selectedTask.image_path_1, selectedTask.image_path_2, selectedTask.image_path_3].forEach(img => {
        if (img) rawImgs.push(img);
      });
      if (selectedTask.images_json) {
        try {
          const pImg = typeof selectedTask.images_json === 'string' ? JSON.parse(selectedTask.images_json) : selectedTask.images_json;
          if (Array.isArray(pImg)) {
            pImg.forEach(img => rawImgs.push(img));
          } else if (pImg?.images && Array.isArray(pImg.images)) {
            pImg.images.forEach(img => rawImgs.push(img));
          } else if (pImg && typeof pImg === 'object') {
            Object.values(pImg).forEach(val => {
              if (Array.isArray(val)) val.forEach(v => rawImgs.push(v));
              else if (typeof val === 'string') rawImgs.push(val);
            });
          }
        } catch (e) {}
      }
      if (parsedJson?.images && Array.isArray(parsedJson.images)) {
        parsedJson.images.forEach(img => rawImgs.push(img));
      }
      if (parsedJson?.steps && typeof parsedJson.steps === 'object') {
        Object.values(parsedJson.steps).forEach(st => {
          if (st?.photo) rawImgs.push(st.photo);
          if (Array.isArray(st?.images)) st.images.forEach(img => rawImgs.push(img));
        });
      }
      const initImgs = deduplicateInspectionImages(rawImgs);
      setModalImages(initImgs);

      // Lưu snapshot giá trị ban đầu để kiểm tra thay đổi chưa lưu (Dirty Check)
      initialFormValuesRef.current = {
        taskId: selectedTask.id,
        result: isPass ? 'pass' : 'fail',
        action: selectedTask.action || 'chap-nhan',
        inspection_type: normalizeInspectionType(rawType, selectedTask.category),
        stage: normalizeStage(rawStage),
        parameter: rawParam,
        status: selectedTask.status || parsedJson?.status || 'Chưa Làm',
        handling_info: (selectedTask.handling_info || parsedJson?.handling_info || '').trim(),
        handling_images: [...initHandlingImgs],
        modal_images: [...initImgs]
      };
    }
  }, [selectedTask]);

  // Trích xuất dữ liệu chi tiết của phiếu từ data_json
  const parsedTaskData = useMemo(() => {
    if (!selectedTask?.data_json) return {};
    try {
      return typeof selectedTask.data_json === 'string' ? JSON.parse(selectedTask.data_json) : selectedTask.data_json;
    } catch (e) {
      return {};
    }
  }, [selectedTask]);

  // Tự động nạp quy trình SOP theo công đoạn nếu phiếu kiểm tra chưa lưu danh sách bước
  useEffect(() => {
    if (!selectedTask) {
      setFallbackSteps([]);
      setLoadingSteps(false);
      return;
    }

    const rawSteps = parsedTaskData?.steps || selectedTask?.steps;
    if (rawSteps && ((Array.isArray(rawSteps) && rawSteps.length > 0) || (typeof rawSteps === 'object' && Object.keys(rawSteps).length > 0))) {
      setFallbackSteps([]);
      setLoadingSteps(false);
      return;
    }

    let isMounted = true;
    setLoadingSteps(true);

    const fetchFallbackGuide = async () => {
      try {
        const stageName = selectedTask.stage || parsedTaskData?.stage || '';
        const stageIdMap = {
          'nhập kho/đầu vào': 1,
          'nhap kho/dau vao': 1,
          'nhập kho': 1,
          'đầu vào': 1,
          'tạo phôi': 2,
          'tao phoi': 2,
          'định hình': 3,
          'dinh hinh': 3,
          'lắp ráp': 4,
          'lap rap': 4,
          'sơn': 5,
          'son': 5,
          'đóng gói': 6,
          'dong goi': 6,
          'lưu kho': 7,
          'luu kho': 7
        };
        const normalizedStage = (stageName || '').trim().toLowerCase();
        let targetStageId = selectedTask.stage_id || parsedTaskData?.stage_id || stageIdMap[normalizedStage] || null;

        if (!targetStageId && stageName) {
          try {
            const stagesRes = await api.get('/stages');
            const stagesList = Array.isArray(stagesRes?.data) ? stagesRes.data : (Array.isArray(stagesRes) ? stagesRes : []);
            const found = stagesList.find(s => s.name?.toLowerCase() === normalizedStage || s.code?.toLowerCase() === normalizedStage);
            if (found) targetStageId = found.id;
          } catch (err) {}
        }

        const mode = selectedTask.inspection_type || parsedTaskData?.mode || 'first_sample';
        let guideData = null;

        if (targetStageId) {
          try {
            const res = await api.get(`/inspection-guides/mobile/${mode}?stage_id=${targetStageId}`);
            guideData = res?.data !== undefined ? res.data : res;
          } catch (e) {}
        }

        if (!guideData || !guideData.steps || guideData.steps.length === 0) {
          try {
            const allGuidesRes = await api.get('/inspection-guides?doc_type=HDKT&limit=50');
            const allGuides = Array.isArray(allGuidesRes?.data) ? allGuidesRes.data : (Array.isArray(allGuidesRes) ? allGuidesRes : (allGuidesRes?.items || []));
            const matchedGuide = allGuides.find(g => {
              const gName = (g.name || '').toLowerCase();
              return normalizedStage && (gName.includes(normalizedStage) || normalizedStage.includes(gName));
            });
            if (matchedGuide) {
              const singleRes = await api.get(`/inspection-guides/${matchedGuide.id}`);
              guideData = singleRes?.data !== undefined ? singleRes.data : singleRes;
            }
          } catch (e) {}
        }

        if (isMounted && guideData && Array.isArray(guideData.steps) && guideData.steps.length > 0) {
          const isTaskPass = selectedTask.result === 'Đạt' || selectedTask.result === 'pass';
          const formatted = guideData.steps.map((st, idx) => ({
            step_no: st.step_no || idx + 1,
            title: st.title || `Bước ${idx + 1}`,
            standard: st.standard || st.content || '',
            result: isTaskPass ? 'pass' : (st.result || 'pass'),
            note: st.note || ''
          }));
          setFallbackSteps(formatted);
        } else if (isMounted) {
          setFallbackSteps([]);
        }
      } catch (err) {
        if (isMounted) setFallbackSteps([]);
      } finally {
        if (isMounted) setLoadingSteps(false);
      }
    };

    fetchFallbackGuide();

    return () => {
      isMounted = false;
    };
  }, [selectedTask, parsedTaskData]);

  // Danh sách hình ảnh minh chứng đầy đủ
  const taskImages = modalImages;

  // Danh sách các bước kiểm tra SOP (Hướng dẫn kiểm tra)
  const taskSteps = useMemo(() => {
    const rawSteps = parsedTaskData?.steps || selectedTask?.steps;
    if (rawSteps) {
      if (Array.isArray(rawSteps) && rawSteps.length > 0) return rawSteps;
      if (typeof rawSteps === 'object' && Object.keys(rawSteps).length > 0) {
        return Object.entries(rawSteps).map(([k, val], idx) => ({
          step_no: idx + 1,
          title: val.title || val.name || val.description || k,
          standard: val.standard || val.content || val.value || '',
          result: val.result || (val.status === 'FAIL' ? 'fail' : 'pass'),
          note: val.note || ''
        }));
      }
    }
    return fallbackSteps;
  }, [parsedTaskData, selectedTask, fallbackSteps]);

  // Danh sách lỗi phát hiện nếu có
  const taskErrors = useMemo(() => {
    const rawErrors = parsedTaskData?.errors || selectedTask?.errors;
    if (!Array.isArray(rawErrors)) return [];
    return rawErrors.filter(e => {
      const q = Number(e.qty || e.quantity || 0);
      return q > 0;
    });
  }, [parsedTaskData, selectedTask]);

  // Lịch sử timeline hoàn chỉnh (tự động bổ sung mốc khởi tạo phiếu kiểm tra ban đầu)
  const fullTimelineHistory = useMemo(() => {
    if (!selectedTask) return [];
    const list = Array.isArray(modalHistory) ? [...modalHistory] : [];

    // Kiểm tra xem đã có bản ghi khởi tạo phiếu (create) chưa
    const hasCreate = list.some(item => item.action_type === 'create');
    if (!hasCreate) {
      const inspectorName = selectedTask.inspector_name || selectedTask.inspector || parsedTaskData?.inspector_name || selectedTask.created_by_name || 'Lê Thị Hồng Nhung';
      const department = selectedTask.department || parsedTaskData?.department || 'Phòng Quản lý Chất lượng (QC)';
      const poNo = selectedTask.po_no || parsedTaskData?.po_no || selectedTask.batch_no || '';
      const stageName = selectedTask.stage || selectedTask.stage_name || parsedTaskData?.stage || '';
      const resultVal = selectedTask.result || 'fail';
      const isPass = resultVal === 'Đạt' || resultVal === 'pass';
      const createdTime = selectedTask.created_at || selectedTask.inspection_date || selectedTask.date || '';

      const creationEntry = {
        id: 'init_create_' + (selectedTask.id || '0'),
        action_type: 'create',
        action_label: 'Khởi tạo phiếu kiểm tra',
        user_name: inspectorName,
        user_role: 'QC Kiểm tra',
        department: department,
        timestamp: createdTime,
        initial_data: {
          ticket_code: selectedTask.ticket_code || `#${selectedTask.id}`,
          po_no: poNo,
          stage: stageName,
          result: isPass ? 'Đạt' : 'Không đạt',
          sample_qty: selectedTask.sample_qty || selectedTask.inspected_qty || parsedTaskData?.sample_qty || parsedTaskData?.inspected_qty || 0,
          error_qty: taskErrors.reduce((sum, e) => sum + (Number(e.qty || e.quantity || 0)), 0),
          notes: selectedTask.notes || parsedTaskData?.notes || ''
        },
        note: selectedTask.notes || 'Phiếu kiểm tra được khởi tạo từ ứng dụng Mobile QC tại xưởng sản xuất.'
      };

      list.push(creationEntry);
    }

    return list;
  }, [modalHistory, selectedTask, parsedTaskData, taskErrors]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(30);

  // Fetch dữ liệu công việc tồn đọng từ Backend (toàn bộ phiếu chưa xác nhận)
  const fetchPendingTasks = async () => {
    setLoading(true);
    setAccountTabRefreshTrigger(prev => prev + 1);
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
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    let normalized = path.replace(/\\/g, '/');
    if (normalized.startsWith('uploads/')) {
      normalized = `static/${normalized}`;
    }
    const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const baseApi = (api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    const origin = baseApi || window.location.origin;
    return `${origin}${cleanPath}`;
  };

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  // Danh sách công đoạn & phân loại thực tế từ dữ liệu
  const uniqueStages = useMemo(() => {
    const set = new Set();
    pendingTasks.forEach(t => {
      const st = t.stage || t.stage_name;
      if (st && String(st).trim()) set.add(String(st).trim());
    });
    return Array.from(set).sort();
  }, [pendingTasks]);

  const uniqueCategories = useMemo(() => {
    const set = new Set();
    pendingTasks.forEach(t => {
      const cat = t.category || t.inspection_type;
      if (cat && String(cat).trim()) set.add(String(cat).trim());
    });
    return Array.from(set).sort();
  }, [pendingTasks]);

  const activeFiltersCount = useMemo(() => {
    return (filterResult !== 'all' ? 1 : 0) +
      (filterAction !== 'all' ? 1 : 0) +
      (filterCategory !== 'all' ? 1 : 0) +
      (filterStage !== 'all' ? 1 : 0);
  }, [filterResult, filterAction, filterCategory, filterStage]);

  const handleResetFilters = () => {
    setFilterResult('all');
    setFilterAction('all');
    setFilterCategory('all');
    setFilterStage('all');
    setCurrentPage(1);
  };

  // Lọc tìm kiếm & Sắp xếp danh sách phiếu chưa xác nhận
  const filteredTasks = useMemo(() => {
    let result = [...pendingTasks];

    // 1. Tìm kiếm văn bản
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

    // 2. Lọc theo kết quả kiểm tra
    if (filterResult !== 'all') {
      result = result.filter(task => {
        const isPass = task.result === 'Đạt' || task.result === 'pass';
        return filterResult === 'pass' ? isPass : !isPass;
      });
    }

    // 3. Lọc theo hành động xử lý
    if (filterAction !== 'all') {
      result = result.filter(task => {
        const action = task.action || 'chap-nhan';
        return action === filterAction;
      });
    }

    // 4. Lọc theo phân loại
    if (filterCategory !== 'all') {
      result = result.filter(task => {
        const cat = (task.category || task.inspection_type || '').toLowerCase();
        return cat.includes(filterCategory.toLowerCase());
      });
    }

    // 5. Lọc theo công đoạn
    if (filterStage !== 'all') {
      result = result.filter(task => {
        const st = (task.stage || task.stage_name || '').toLowerCase();
        return st === filterStage.toLowerCase();
      });
    }

    // 6. Sắp xếp
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
  }, [pendingTasks, searchQuery, sortOption, filterResult, filterAction, filterCategory, filterStage]);

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

    const rawPartName = (selectedTask.part_name || selectedTask.product_sku || '').trim();
    const defaultCabinet = cleanCabinetTag(parsedJson?.cabinet || parsedJson?.product_label || parsedJson?.badge || '');
    const defaultQty = selectedTask.required_qty || parsedJson?.requiredQty || '';

    // Tách các chi tiết từ part_name nếu có dấu phẩy hoặc xuống dòng
    const names = (rawPartName && rawPartName !== 'N/A')
      ? rawPartName
          .split(/[\n\r;]|,\s*(?=[A-ZÀ-Ỹa-z0-9])/)
          .map(s => s.trim())
          .filter(Boolean)
      : [];

    const rawSpec = (selectedTask.specification || '').trim();
    const specs = rawSpec.includes(',') 
      ? rawSpec.split(',').map(s => s.trim()).filter(Boolean) 
      : [];

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
      let list = rawItems.map((it, idx) => ({
        stt: String(idx + 1).padStart(2, '0'),
        name: it.part_name || it.name || it.product || 'Chi tiết',
        spec: it.specification || it.spec || selectedTask.specification || 'Tiêu chuẩn',
        cabinet: cleanCabinetTag(it.cabinet || it.product_label || it.badge || it.product_name || it.product_sku || it.sku || ''),
        qty: it.plan_qty || it.qty || ''
      }));

      // Tự động bổ sung nếu part_name có nhiều chi tiết mà rawItems bị thiếu (khớp 100% ngoài và trong)
      if (names.length > 0) {
        const existingNamesLower = list.map(it => (it.name || '').toLowerCase().trim());
        names.forEach((pName, pIdx) => {
          const pNameLower = pName.toLowerCase().trim();
          const alreadyExists = existingNamesLower.some(existing => 
            existing === pNameLower || existing.includes(pNameLower) || pNameLower.includes(existing)
          );
          if (!alreadyExists) {
            const pSpec = specs[pIdx] || (specs.length === 1 ? specs[0] : (rawSpec || 'Tiêu chuẩn'));
            list.push({
              stt: String(list.length + 1).padStart(2, '0'),
              name: pName,
              spec: pSpec,
              cabinet: defaultCabinet,
              qty: defaultQty
            });
          }
        });
        list = list.map((it, idx) => ({
          ...it,
          stt: String(idx + 1).padStart(2, '0')
        }));
      }

      return list;
    }

    // 2. Phân rã từ chuỗi part_name (hỗ trợ phân tách bởi dấu phẩy, chấm phẩy hoặc xuống dòng khi không có rawItems)
    if (!rawPartName || rawPartName === 'N/A') {
      return [{
        stt: '01',
        name: selectedTask.task_name || 'Chi tiết kiểm tra',
        spec: selectedTask.specification || 'Tiêu chuẩn',
        cabinet: defaultCabinet,
        qty: defaultQty
      }];
    }

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

  // Upload hình ảnh xử lý / biện pháp khắc phục lên máy chủ
  const handleHandlingImageFiles = async (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      toast('error', 'Vui lòng chỉ chọn tệp hình ảnh (JPEG, PNG, WEBP, v.v.)');
      return;
    }

    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        toast('error', `Tệp "${file.name}" vượt quá dung lượng cho phép (10MB).`);
        return;
      }
    }

    setIsUploadingHandlingImages(true);
    try {
      const formData = new FormData();
      fileList.forEach(file => {
        formData.append('files', file);
      });

      const response = await api.post('/inspections/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response && response.paths && Array.isArray(response.paths)) {
        setHandlingImages(prev => {
          const next = [...prev];
          response.paths.forEach(p => {
            if (!next.includes(p)) next.push(p);
          });
          return next;
        });
        toast('success', `Đã tải lên ${response.paths.length} ảnh xử lý / biện pháp khắc phục thành công!`);
      } else if (response && response.path) {
        setHandlingImages(prev => [...prev, response.path]);
        toast('success', 'Đã tải lên ảnh xử lý / biện pháp khắc phục thành công!');
      } else {
        toast('warning', 'Không nhận được đường dẫn ảnh từ máy chủ.');
      }
    } catch (error) {
      console.error('Error uploading handling images:', error);
      toast('error', 'Lỗi khi tải ảnh xử lý lên máy chủ: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsUploadingHandlingImages(false);
      if (handlingFileInputRef.current) {
        handlingFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveHandlingImage = (indexToRemove) => {
    setHandlingImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleHandlingDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHandlingImages(true);
  };

  const handleHandlingDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHandlingImages(false);
  };

  const handleHandlingDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHandlingImages(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleHandlingImageFiles(e.dataTransfer.files);
    }
  };

  // Giữ fallback cho modalImages nếu cần
  const handleRemoveImage = (indexToRemove) => {
    setModalImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Lắng nghe sự kiện Paste (Ctrl+V) từ Clipboard để dán ảnh vào mục "Thông tin xử lý / Biện pháp khắc phục"
  useEffect(() => {
    if (!selectedTask) return;

    const handlePaste = (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      const files = [];

      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type && item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              const ext = (blob.type && blob.type.split('/')[1]) || 'png';
              const fileName = `handling_paste_${Date.now()}_${i + 1}.${ext}`;
              const file = new File([blob], fileName, { type: blob.type || 'image/png' });
              files.push(file);
            }
          }
        }
      } else if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const f = clipboardData.files[i];
          if (f.type && f.type.startsWith('image/')) {
            files.push(f);
          }
        }
      }

      // Nếu có tệp hình ảnh từ clipboard thì upload vào Thông tin xử lý ngay
      if (files.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        if (isUploadingHandlingImages) {
          toast('warning', 'Đang tải ảnh trước đó lên máy chủ, vui lòng đợi giây lát...');
          return;
        }
        toast('info', 'Đã nhận ảnh từ Clipboard, đang tải lên Thông tin xử lý...');
        handleHandlingImageFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [selectedTask, isUploadingHandlingImages]);

  // Lưu thay đổi thông tin phiếu kiểm tra (loại phiếu, công đoạn, kết quả, xử lý, thông số, hình ảnh)
  const handleSaveTask = async (task) => {
    if (!task) return;
    setSavingTask(true);
    try {
      const taskType = task.type || 'input';
      const response = await api.post(`/inspections/update-record/${taskType}/${task.id}`, {
        inspection_type: modalInspectionType,
        stage: modalStage,
        result: modalResult,
        action: modalAction,
        handling_info: handlingInfo,
        handling_images: handlingImages,
        images: modalImages,
        updated_by: currentEditorName,
        user_role: currentEditorRole,
        parameter: modalInspectionType === 'parameter' ? modalParameter : undefined
      });
      toast('success', `Đã lưu cập nhật phiếu #${task.ticket_code || task.id} thành công!`);

      // Cập nhật lại snapshot sau khi lưu thành công
      initialFormValuesRef.current = {
        taskId: task.id,
        result: modalResult,
        action: modalAction,
        inspection_type: modalInspectionType,
        stage: modalStage,
        parameter: modalParameter,
        status: modalStatus,
        handling_info: (handlingInfo || '').trim(),
        handling_images: [...handlingImages],
        modal_images: [...modalImages]
      };

      const updatedHistory = response?.edit_history || (Array.isArray(response?.data?.edit_history) ? response.data.edit_history : null);
      if (updatedHistory) {
        setModalHistory(updatedHistory);
      }

      // Cập nhật selectedTask
      setSelectedTask(prev => prev ? {
        ...prev,
        inspection_type: modalInspectionType,
        stage: modalStage,
        result: modalResult,
        action: modalAction,
        handling_info: handlingInfo,
        handling_images: handlingImages,
        image_path_1: modalImages[0] || null,
        image_path_2: modalImages[1] || null,
        image_path_3: modalImages[2] || null,
        images: modalImages,
        images_json: JSON.stringify(modalImages),
        edit_history: updatedHistory || prev.edit_history,
        parameter: modalInspectionType === 'parameter' ? modalParameter : prev.parameter,
        category: getCategoryBadgeInfo(null, modalStage, modalInspectionType)?.label || prev.category
      } : null);

      // Cập nhật danh sách pendingTasks
      setPendingTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            inspection_type: modalInspectionType,
            stage: modalStage,
            result: modalResult,
            action: modalAction,
            handling_info: handlingInfo,
            handling_images: handlingImages,
            image_path_1: modalImages[0] || null,
            image_path_2: modalImages[1] || null,
            image_path_3: modalImages[2] || null,
            images: modalImages,
            images_json: JSON.stringify(modalImages),
            edit_history: updatedHistory || t.edit_history,
            parameter: modalInspectionType === 'parameter' ? modalParameter : t.parameter,
            category: getCategoryBadgeInfo(null, modalStage, modalInspectionType)?.label || t.category
          };
        }
        return t;
      }));
      return true;
    } catch (error) {
      console.error('Error saving inspection task:', error);
      toast('error', 'Lỗi khi lưu phiếu kiểm tra: ' + (error.response?.data?.detail || error.message));
      return false;
    } finally {
      setSavingTask(false);
    }
  };

  // Kiểm tra xem người dùng có thay đổi dữ liệu chưa lưu hay không
  const checkHasUnsavedChanges = () => {
    if (!selectedTask || !initialFormValuesRef.current) return false;
    if (initialFormValuesRef.current.taskId !== selectedTask.id) return false;

    const init = initialFormValuesRef.current;
    if (modalResult !== init.result) return true;
    if (modalAction !== init.action) return true;
    if (modalInspectionType !== init.inspection_type) return true;
    if (modalStage !== init.stage) return true;
    if (modalStatus !== init.status) return true;
    if (modalInspectionType === 'parameter' && modalParameter !== init.parameter) return true;
    if ((handlingInfo || '').trim() !== (init.handling_info || '').trim()) return true;

    const curImgs = handlingImages || [];
    const initImgs = init.handling_images || [];
    if (curImgs.length !== initImgs.length) return true;
    for (let i = 0; i < curImgs.length; i++) {
      if (curImgs[i] !== initImgs[i]) return true;
    }

    const curModImgs = modalImages || [];
    const initModImgs = init.modal_images || [];
    if (curModImgs.length !== initModImgs.length) return true;
    for (let i = 0; i < curModImgs.length; i++) {
      if (curModImgs[i] !== initModImgs[i]) return true;
    }

    return false;
  };

  // Đóng modal có kiểm tra xác nhận lưu nếu có chỉnh sửa
  const handleRequestCloseModal = () => {
    if (confirming || cancelingTask) return;
    if (checkHasUnsavedChanges()) {
      setShowUnsavedConfirmModal(true);
    } else {
      setSelectedTask(null);
    }
  };

  // Xác nhận lưu thay đổi và đóng modal
  const handleSaveAndCloseFromConfirm = async () => {
    const success = await handleSaveTask(selectedTask);
    if (success) {
      setShowUnsavedConfirmModal(false);
      setSelectedTask(null);
    }
  };

  // Bỏ qua thay đổi và đóng modal ngay
  const handleDiscardAndCloseFromConfirm = () => {
    setShowUnsavedConfirmModal(false);
    setSelectedTask(null);
  };

  // Xử lý xác nhận phiếu và tự động chuyển sang đơn tiếp theo
  const handleConfirmTask = async (task) => {
    if (!task) return;
    setConfirming(true);
    try {
      const taskType = task.type || 'input';
      await api.post(`/inspections/confirm/${taskType}/${task.id}`, {
        result: modalResult,
        action: modalAction,
        handling_info: handlingInfo,
        handling_images: handlingImages,
        inspection_type: modalInspectionType,
        stage: modalStage,
        status: 'Đã xong',
        images: modalImages,
        updated_by: currentEditorName,
        confirmed_by_name: currentEditorName,
        user_role: currentEditorRole,
        parameter: modalInspectionType === 'parameter' ? modalParameter : undefined
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
        reason: 'Quản lý chất lượng hủy hồ sơ',
        updated_by: currentEditorName,
        cancelled_by_name: currentEditorName,
        user_role: currentEditorRole
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

  // ─── HỆ THỐNG PHÍM TẮT THAO TÁC NHANH TOÀN CỤC (F1, F2, F3, F4, F5, ESC, ENTER, ARROWS) ───
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toUpperCase();
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      // 1. Phím chức năng F1..F5 luôn chặn hành vi mặc định của trình duyệt (Help, Search, Refresh, etc.)
      if (['F1', 'F2', 'F3', 'F4', 'F5'].includes(e.key)) {
        e.preventDefault();
      }

      // TRƯỜNG HỢP A: ĐANG MỞ LIGHTBOX XEM ẢNH PHÓNG TO
      if (previewImgUrl) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setPreviewImgUrl(null);
        }
        return;
      }

      // TRƯỜNG HỢP B: ĐANG MỞ POPUP XÁC NHẬN HỦY HỒ SƠ
      if (isCancelInspectionModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsCancelInspectionModalOpen(false);
        } else if (e.key === 'Enter' || e.key === 'F1') {
          e.preventDefault();
          if (!cancelingTask) {
            handleExecuteCancelInspection();
          }
        }
        return;
      }

      // TRƯỜNG HỢP C: ĐANG MỞ POPUP XÁC NHẬN HỦY TRẢ HÀNG
      if (cancelConfirmModal.isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setCancelConfirmModal({ isOpen: false, task: null });
        } else if (e.key === 'Enter' || e.key === 'F1') {
          e.preventDefault();
          if (!cancelingId) {
            handleConfirmCancelReturn();
          }
        }
        return;
      }

      // TRƯỜNG HỢP D: ĐANG MỞ POPUP DUYỆT HÀNG LOẠT (BATCH QUICK MODAL)
      if (isBatchQuickModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsBatchQuickModalOpen(false);
        } else if (e.key === 'Enter' || e.key === 'F1') {
          e.preventDefault();
          if (!batchConfirming && selectedBatchIds.size > 0) {
            handleExecuteBatchConfirm();
          }
        }
        return;
      }

      // TRƯỜNG HỢP E: ĐANG MỞ POPUP HƯỚNG DẪN PHÍM TẮT
      if (showShortcutsModal) {
        if (e.key === 'Escape' || e.key === '?' || e.key === 'F1') {
          e.preventDefault();
          setShowShortcutsModal(false);
        }
        return;
      }

      // TRƯỜNG HỢP F: ĐANG MỞ POPUP CHI TIẾT HỒ SƠ KIỂM TRA (SELECTED TASK)
      if (selectedTask) {
        // Nếu người dùng đang gõ ghi chú trong textarea, cho phép bấm Enter để xuống dòng
        if (isInputFocused && e.key === 'Enter' && activeTag === 'TEXTAREA') {
          return;
        }

        // F1 hoặc Enter: Xác nhận hồ sơ (Duyệt)
        if (e.key === 'F1' || (e.key === 'Enter' && !isInputFocused)) {
          e.preventDefault();
          if (!confirming && !cancelingTask) {
            handleConfirmTask(selectedTask);
          }
          return;
        }

        // F2: Mở popup hủy hồ sơ
        if (e.key === 'F2') {
          e.preventDefault();
          if (!confirming && !cancelingTask) {
            setIsCancelInspectionModalOpen(true);
          }
          return;
        }

        // F3: Đổi nhanh Đạt <-> Không đạt (Toggle Pass/Fail)
        if (e.key === 'F3') {
          e.preventDefault();
          setModalResult(prev => {
            const nextResult = prev === 'pass' ? 'fail' : 'pass';
            if (nextResult === 'pass' && modalAction === 'tra-ve') {
              setModalAction('chap-nhan');
            }
            return nextResult;
          });
          return;
        }

        // Ctrl+S hoặc F8: Lưu thay đổi thông tin phiếu kiểm tra
        if (((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) || e.key === 'F8') {
          e.preventDefault();
          if (!savingTask && !confirming && !cancelingTask) {
            handleSaveTask(selectedTask);
          }
          return;
        }

        // F4: Hủy trả hàng (nếu hồ sơ có hành động trả về)
        if (e.key === 'F4') {
          e.preventDefault();
          if (selectedTask.action === 'tra-ve' && !confirming && !cancelingId && !cancelingTask) {
            handleCancelReturn(selectedTask);
          }
          return;
        }

        // Escape: Đóng modal chi tiết hoặc đóng popup xác nhận
        if (e.key === 'Escape') {
          e.preventDefault();
          if (showUnsavedConfirmModal) {
            setShowUnsavedConfirmModal(false);
            return;
          }
          if (isCancelInspectionModalOpen) {
            setIsCancelInspectionModalOpen(false);
            return;
          }
          if (!confirming && !cancelingTask) {
            handleRequestCloseModal();
          }
          return;
        }

        // ArrowLeft: Hồ sơ trước đó
        if (e.key === 'ArrowLeft' && !isInputFocused) {
          e.preventDefault();
          goToPreviousTask();
          return;
        }

        // ArrowRight: Hồ sơ tiếp theo
        if (e.key === 'ArrowRight' && !isInputFocused) {
          e.preventDefault();
          goToNextTask();
          return;
        }

        // Tab: Chuyển tuần tự giữa 3 tab Thông tin -> Chi tiết -> Lịch sử -> Thông tin
        if (e.key === 'Tab' && !isInputFocused) {
          e.preventDefault();
          setModalTab(prev => {
            if (prev === 'info') return 'details';
            if (prev === 'details') return 'history';
            return 'info';
          });
          return;
        }

        return;
      }

      // TRƯỜNG HỢP G: MÀN HÌNH DANH SÁCH CHÍNH (CHƯA MỞ POPUP)
      // F1: Mở popup duyệt nhanh hàng loạt phiếu ĐẠT
      if (e.key === 'F1') {
        e.preventDefault();
        handleOpenBatchQuickModal();
        return;
      }

      // F2 hoặc /: Focus nhanh vào ô tìm kiếm
      if (e.key === 'F2' || (e.key === '/' && !isInputFocused)) {
        e.preventDefault();
        const searchInput = document.querySelector('.page-toolbar__search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Mũi tên xuống: Di chuyển chọn dòng kế tiếp trong bảng
      if (e.key === 'ArrowDown' && !isInputFocused) {
        e.preventDefault();
        setFocusedRowIndex(prev => Math.min(prev + 1, Math.max(paginatedTasks.length - 1, 0)));
        return;
      }

      // Mũi tên lên: Di chuyển chọn dòng trước đó trong bảng
      if (e.key === 'ArrowUp' && !isInputFocused) {
        e.preventDefault();
        setFocusedRowIndex(prev => Math.max(prev - 1, 0));
        return;
      }

      // Enter: Mở xem chi tiết hồ sơ đang được chọn
      if (e.key === 'Enter' && !isInputFocused) {
        if (focusedRowIndex >= 0 && focusedRowIndex < paginatedTasks.length) {
          e.preventDefault();
          setSelectedTask(paginatedTasks[focusedRowIndex]);
          return;
        }
      }

      // F5: Tải lại danh sách phiếu chưa xác nhận
      if (e.key === 'F5') {
        e.preventDefault();
        fetchPendingTasks();
        toast('info', 'Đang làm mới danh sách hồ sơ kiểm tra...');
        return;
      }

      // ?: Mở bảng phím tắt trợ giúp
      if (e.key === '?' && !isInputFocused) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // Escape khi đang focus ô tìm kiếm: blur ra ngoài
      if (e.key === 'Escape' && isInputFocused) {
        document.activeElement?.blur();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    selectedTask, savingTask, confirming, cancelingTask, cancelingId, modalResult, modalAction,
    previewImgUrl, isCancelInspectionModalOpen, cancelConfirmModal, isBatchQuickModalOpen,
    batchConfirming, showShortcutsModal, currentTaskIndex, filteredTasks, selectedBatchIds,
    focusedRowIndex, paginatedTasks
  ]);

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

    // 5. Kiểm tra thông số (Parameter)
    if (
      typeKey.includes('parameter') ||
      typeKey.includes('thông số') ||
      typeKey.includes('thong-so') ||
      typeKey.includes('do-am') ||
      typeKey.includes('độ ẩm') ||
      typeKey.includes('kich-thuoc') ||
      typeKey.includes('kích thước') ||
      typeKey.includes('ngoai-quan') ||
      typeKey.includes('ngoại quan')
    ) {
      return {
        label: 'Kiểm tra thông số',
        subText: stageName || null,
        bg: '#F5F3FF',
        border: '#DDD6FE',
        text: '#7C3AED',
        dotColor: '#8B5CF6',
      };
    }

    // 6. Vấn đáp (QA)
    if (typeKey.includes('qa') || typeKey.includes('vấn đáp') || typeKey.includes('van-dap')) {
      return {
        label: 'Vấn đáp',
        subText: stageName || null,
        bg: '#FFF1F2',
        border: '#FECDD3',
        text: '#BE123C',
        dotColor: '#F43F5E',
      };
    }

    // 7. Công đoạn sản xuất hoặc mặc định
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

  // Trích xuất mã phiếu từ ticket_code hoặc parse từ task_name
  const getTicketCode = (t) => {
    if (t.ticket_code) return t.ticket_code;
    const rawTaskName = (t.task_name || '').trim();
    const tcMatch = rawTaskName.match(/#([A-Za-z0-9_\-]+)/);
    return tcMatch ? tcMatch[1] : '';
  };

  // Tối ưu hiển thị Nội dung gọn gàng: "Xác nhận phiếu kiểm tra" + chi tiết thực tế
  const renderCleanBatchTaskName = (t) => {
    const rawTaskName = (t.task_name || '').trim();
    const rawPartName = (t.part_name || '').trim();

    // Kiểm tra xem task_name có phải là dạng mặc định "Xác nhận hồ sơ kiểm tra #..." không
    const isBoilerplate = rawTaskName.toLowerCase().startsWith('xác nhận hồ sơ');

    // Xác định danh sách các chi tiết thực tế
    let parts = [];
    if (rawPartName && rawPartName !== 'N/A') {
      parts = rawPartName
        .split(/[\n\r;]|,\s*(?=[A-ZÀ-Ỹa-z0-9])/)
        .map(s => s.trim())
        .filter(Boolean);
    } else if (isBoilerplate) {
      const match = rawTaskName.match(/\((.*?)\)/);
      if (match && match[1]) {
        parts = match[1]
          .split(/[\n\r;]|,\s*(?=[A-ZÀ-Ỹa-z0-9])/)
          .map(s => s.trim())
          .filter(Boolean);
      }
    }

    // Label chính: "Xác nhận phiếu kiểm tra" cho boilerplate, hoặc tên việc gốc
    const mainLabel = isBoilerplate ? 'Xác nhận phiếu kiểm tra' : rawTaskName;

    // Nếu không tách được chi tiết
    if (parts.length === 0) {
      const fallbackText = isBoilerplate 
        ? rawTaskName.replace(/^xác nhận hồ sơ kiểm tra\s*#?[a-zA-Z0-9_\-]*\s*/i, '').replace(/^\(|\)$/g, '').trim()
        : '';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.72rem', color: '#8D7B6F', fontWeight: 600 }}>{mainLabel}</span>
          {fallbackText && (
            <div style={{ fontWeight: 600, color: '#2D1A12', fontSize: '0.83rem', lineHeight: 1.35 }}>
              {fallbackText}
            </div>
          )}
        </div>
      );
    }

    // Nếu là tên việc có ý nghĩa riêng biệt (không phải boilerplate)
    const customTaskTitle = (!isBoilerplate && rawTaskName && rawTaskName !== rawPartName) ? rawTaskName : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{ fontSize: '0.72rem', color: '#8D7B6F', fontWeight: 600 }}>
          {isBoilerplate ? 'Xác nhận phiếu kiểm tra' : (customTaskTitle || '')}
        </span>
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

  const renderStatusBadge = (status) => {
    const s = (status || 'Chưa Làm').trim();
    if (s === 'Đang Làm') {
      return <span className="badge-danglam">Đang Làm</span>;
    }
    if (s === 'Đã xong' || s === 'Hoàn thành') {
      return <span className="badge-daxong">{s}</span>;
    }
    if (s === 'Chờ xác nhận') {
      return <span className="badge-choxacnhan">Chờ xác nhận</span>;
    }
    return <span className="badge-chualam">{s}</span>;
  };

  // Xuất dữ liệu danh sách phiếu tồn đọng ra file Excel
  const handleExportExcel = async () => {
    if (!filteredTasks || filteredTasks.length === 0) {
      toast('warning', 'Không có dữ liệu phiếu tồn đọng để xuất.');
      return;
    }
    setIsExporting(true);
    try {
      const exportData = filteredTasks.map((task, index) => {
        const ticketCode = getTicketCode(task) ? `#${getTicketCode(task)}` : (task.id ? `#${task.id}` : '');
        const poNumber = task.batch_no || task.po_number || task.po || '';
        
        // Nội dung kiểm tra
        let taskContent = task.part_name || task.task_name || '';
        if (taskContent.toLowerCase().startsWith('xác nhận hồ sơ')) {
          const match = taskContent.match(/\((.*?)\)/);
          if (match && match[1]) {
            taskContent = match[1];
          }
        }

        const catInfo = getCategoryBadgeInfo(task.category, task.stage, task.inspection_type);
        const categoryLabel = catInfo?.label || task.category || 'daily';
        const stageLabel = task.stage || task.stage_name || '';
        const inspector = task.inspector_name || 'QC';
        const priority = task.priority || 3;
        const status = task.status || 'Chưa Làm';
        const isPass = task.result === 'Đạt' || task.result === 'pass';
        const resultLabel = isPass ? 'Đạt' : 'Không đạt';
        
        let actionLabel = 'Chấp nhận';
        if (task.action === 'tra-ve') actionLabel = 'Trả hàng';
        else if (task.action === 'cach-ly') actionLabel = 'Cách ly';
        else if (!isPass) actionLabel = 'Chấp nhận / Tự xử lý';

        const recordedDate = task.recorded_date ? new Date(task.recorded_date).toLocaleString('vi-VN') : '';
        const requiredQty = task.required_qty || 0;
        const sampleQty = task.sample_qty || 0;
        const errorQty = task.error_qty || 0;
        const notes = (task.notes || '').trim();
        const cleanNotes = /^ch[ờo]\s*x[áa]c\s*nh[ậa]n/i.test(notes) ? '' : notes;
        const handlingNotes = (task.handling_notes || '').trim();

        return {
          'STT': index + 1,
          'Mã phiếu': ticketCode,
          'Đơn hàng (PO)': poNumber,
          'Nội dung kiểm tra': taskContent,
          'Phân loại': categoryLabel,
          'Công đoạn': stageLabel,
          'Người kiểm tra (QC)': inspector,
          'Mức độ ưu tiên': priority,
          'Kết quả': resultLabel,
          'Trạng thái': status,
          'Hành động xử lý': actionLabel,
          'SL cần kiểm (Lô)': requiredQty,
          'SL mẫu kiểm tra': sampleQty,
          'Số lỗi phát hiện': errorQty,
          'Ngày ghi nhận': recordedDate,
          'Ghi chú': cleanNotes,
          'Biện pháp xử lý': handlingNotes
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 6 },   // STT
        { wch: 14 },  // Mã phiếu
        { wch: 16 },  // Đơn hàng (PO)
        { wch: 30 },  // Nội dung kiểm tra
        { wch: 18 },  // Phân loại
        { wch: 16 },  // Công đoạn
        { wch: 22 },  // Người kiểm tra (QC)
        { wch: 14 },  // Mức độ ưu tiên
        { wch: 14 },  // Kết quả
        { wch: 14 },  // Trạng thái
        { wch: 22 },  // Hành động xử lý
        { wch: 16 },  // SL cần kiểm
        { wch: 16 },  // SL mẫu kiểm tra
        { wch: 16 },  // Số lỗi phát hiện
        { wch: 20 },  // Ngày ghi nhận
        { wch: 35 },  // Ghi chú
        { wch: 35 }   // Biện pháp xử lý
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DS Phiếu Tồn Đọng CL1");
      
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(workbook, `Danh_Sach_Phieu_Ton_Dong_CL1_${dateStr}.xlsx`);
      toast('success', `Đã xuất thành công ${filteredTasks.length} phiếu tồn đọng ra file Excel!`);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      toast('error', 'Không thể xuất file Excel. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="gold-layout" style={{ fontFamily: "'Outfit', 'Inter', sans-serif", position: 'relative' }}>
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
        .badge-danglam {
          background-color: #FFFBEB;
          color: #D97706;
          border: 1px solid #FDE68A;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        .badge-daxong {
          background-color: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        .badge-choxacnhan {
          background-color: #EFF6FF;
          color: #2563EB;
          border: 1px solid #BFDBFE;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        .kbd-shortcut {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
          padding: 2px 5px;
          font-size: 0.68rem;
          font-weight: 700;
          line-height: 1;
          border-radius: 4px;
          margin-left: 6px;
          background-color: #EFEAE3;
          color: #5D4037;
          border: 1px solid #D8CCC0;
          box-shadow: 0 1px 0 rgba(93, 64, 55, 0.06);
          user-select: none;
          letter-spacing: 0.2px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .kbd-shortcut-primary {
          background-color: rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.32);
          box-shadow: none;
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
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10050 !important;
          backdrop-filter: blur(3px);
        }
        .modal-flank-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 1240px;
          padding: 0 14px;
          box-sizing: border-box;
        }
        .modal-flank-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #FAF7F2;
          border: 1px solid #E0D6CB;
          color: #7B5233;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(93, 64, 55, 0.08);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
          z-index: 1010;
        }
        .modal-flank-btn:hover:not(:disabled) {
          background-color: #FFFFFF;
          border-color: #8B5E3C;
          color: #5D4037;
          transform: scale(1.08);
          box-shadow: 0 6px 16px rgba(93, 64, 55, 0.14);
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
        .quality-main-nav-wrapper {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .quality-main-nav-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background-color: #F5EFE8;
          padding: 3px 4px;
          border-radius: 10px;
          border: 1px solid #E8DDD0;
          height: 38px;
          min-height: 38px;
          box-sizing: border-box;
          max-width: 100%;
        }
        .quality-nav-tab-btn {
          height: 30px;
          padding: 0 14px;
          border-radius: 7px;
          border: 1px solid transparent;
          outline: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.83rem;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: all 0.15s ease;
          background-color: transparent;
          color: #78716C;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .quality-nav-tab-btn.active {
          border-color: #DFD2C4;
          font-weight: 700;
          background-color: #FFFFFF;
          color: #5D3B32;
          box-shadow: 0 1px 3px rgba(45, 26, 18, 0.08);
        }
        .quality-nav-tab-btn .tab-count-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 10px;
          background-color: #EAE3DA;
          color: #64748B;
        }
        .quality-nav-tab-btn.active .tab-count-badge {
          background-color: #FAF0E6;
          color: #7B5233;
          border: 1px solid #EADCC9;
        }
        .desktop-tab-label {
          display: inline;
        }
        .mobile-tab-label {
          display: none;
        }
        @media (max-width: 768px) {
          .gold-layout {
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          .quality-main-nav-wrapper {
            position: -webkit-sticky !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 60 !important;
            background-color: #FAF7F2 !important;
            padding: 6px 4px 4px 4px !important;
            margin-bottom: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .quality-main-nav-pill {
            width: 100% !important;
            display: flex !important;
          }
          .quality-nav-tab-btn {
            flex: 1 1 50% !important;
            justify-content: center !important;
            padding: 0 6px !important;
            font-size: 0.8rem !important;
            gap: 5px !important;
          }
          .desktop-tab-label {
            display: none !important;
          }
          .mobile-tab-label {
            display: inline !important;
          }
          .sticky-top-zone {
            top: 48px !important;
          }
        }
      ` }} />

      {/* MAIN NAVIGATION TABS */}
      <div className="quality-main-nav-wrapper">
        <div className="quality-main-nav-pill">
          <button
            type="button"
            className={`quality-nav-tab-btn ${activeMainTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('tasks')}
          >
            <FileText size={14} style={{ color: activeMainTab === 'tasks' ? '#7B5233' : '#94A3B8' }} />
            <span className="desktop-tab-label">Theo danh sách phiếu tồn đọng</span>
            <span className="mobile-tab-label">Theo phiếu</span>
            <span className="tab-count-badge">
              {pendingTasks.length}
            </span>
          </button>

          <button
            type="button"
            className={`quality-nav-tab-btn ${activeMainTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('accounts')}
          >
            <User size={14} style={{ color: activeMainTab === 'accounts' ? '#7B5233' : '#94A3B8' }} />
            <span className="desktop-tab-label">Theo tài khoản kiểm tra viên</span>
            <span className="mobile-tab-label">Theo tài khoản</span>
            <span className="tab-count-badge">
              {accountCount || distinctAccountCount}
            </span>
          </button>
        </div>
      </div>

      {activeMainTab === 'accounts' ? (
        <AccountQualityTab
          pendingTasks={pendingTasks}
          onSelectTask={(task) => setSelectedTask(task)}
          refreshTrigger={accountTabRefreshTrigger}
          onUpdateAccountCount={(cnt) => setAccountCount(cnt)}
        />
      ) : (
        <>
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
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          onExport={handleExportExcel}
          isExporting={isExporting}
          exportLabel="Xuất dữ liệu"
          extraActions={[
            {
              icon: <CheckCircle2 size={16} color="#059669" />,
              label: 'Xác nhận nhanh phiếu ĐẠT (F1)',
              badge: eligibleQuickPassTasks.length,
              badgeColor: '#10B981',
              onClick: handleOpenBatchQuickModal
            },
            {
              icon: <Keyboard size={16} color="#7B5233" />,
              label: 'Phím tắt (?)',
              onClick: () => setShowShortcutsModal(true)
            }
          ]}
          hasWritePermission={true}
        />

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar quality-filter-bar" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'flex-end',
            backgroundColor: '#FFFDF9',
            border: '1px solid #EADCC9',
            borderRadius: '12px',
            padding: '12px 14px',
            marginTop: '8px',
            marginBottom: '10px',
            boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)'
          }}>
            {/* Kết quả kiểm tra */}
            <div className="filter-field-group" style={{ minWidth: '130px', flex: '1 1 130px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                Kết quả kiểm tra
              </label>
              <select
                value={filterResult}
                onChange={(e) => {
                  setFilterResult(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.85rem' }}
              >
                <option value="all">Tất cả kết quả</option>
                <option value="pass">✓ Đạt (Pass)</option>
                <option value="fail">✗ Không đạt (Fail)</option>
              </select>
            </div>

            {/* Hành động xử lý */}
            <div className="filter-field-group" style={{ minWidth: '130px', flex: '1 1 130px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                Hành động xử lý
              </label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.85rem' }}
              >
                <option value="all">Tất cả hành động</option>
                <option value="chap-nhan">Chấp nhận</option>
                <option value="cach-ly">Cách ly</option>
                <option value="tra-ve">Trả hàng</option>
              </select>
            </div>

            {/* Phân loại */}
            {uniqueCategories.length > 0 && (
              <div className="filter-field-group" style={{ minWidth: '140px', flex: '1 1 140px' }}>
                <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                  Phân loại
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-dropdown-input"
                  style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.85rem' }}
                >
                  <option value="all">Tất cả phân loại</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Công đoạn */}
            {uniqueStages.length > 0 && (
              <div className="filter-field-group" style={{ minWidth: '140px', flex: '1 1 140px' }}>
                <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                  Công đoạn
                </label>
                <select
                  value={filterStage}
                  onChange={(e) => {
                    setFilterStage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-dropdown-input"
                  style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.85rem' }}
                >
                  <option value="all">Tất cả công đoạn</option>
                  {uniqueStages.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Nút xóa lọc */}
            {activeFiltersCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1px dashed #E0D6CB',
                    backgroundColor: '#FAF6F0',
                    color: '#8B5E3C',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Xóa lọc ({activeFiltersCount})</span>
                </button>
              </div>
            )}
          </div>
        )}
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
                      <th style={{ width: '120px' }}>PO</th>
                      <th style={{ minWidth: '220px' }}>NỘI DUNG</th>
                      <th style={{ width: '180px' }}>PHIẾU KIỂM TRA</th>
                      <th style={{ width: '140px' }}>NGƯỜI KIỂM TRA</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>MỨC ĐỘ ƯU TIÊN</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>TRẠNG THÁI</th>
                      <th style={{ width: '160px', textAlign: 'center' }}>HÀNH ĐỘNG XỬ LÝ</th>
                      <th style={{ width: '155px', textAlign: 'center' }}>NGÀY GHI NHẬN</th>
                      <th>GHI CHÚ</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task, idx) => {
                      const sttDisplay = String((currentPage - 1) * limit + idx + 1).padStart(2, '0');
                      const isRowFocused = focusedRowIndex === idx;
                      return (
                        <tr 
                          key={task.id || idx} 
                          onClick={() => {
                            setFocusedRowIndex(idx);
                            setSelectedTask(task);
                          }}
                          onMouseEnter={() => setFocusedRowIndex(idx)}
                          style={{ 
                            cursor: 'pointer', 
                            transition: 'all 0.15s ease',
                            position: actionMenuId === task.id ? 'relative' : 'static',
                            zIndex: actionMenuId === task.id ? 45 : 1,
                            backgroundColor: isRowFocused ? '#FAF4EE' : undefined,
                            boxShadow: isRowFocused ? 'inset 3px 0 0 #7B5233' : undefined
                          }}
                        >
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>{sttDisplay}</td>
                          <td style={{ verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600', color: '#3E2723', fontSize: '0.84rem' }}>{task.batch_no || '—'}</div>
                            {getTicketCode(task) && (
                              <div style={{ fontSize: '0.72rem', color: '#8D7B6F', fontWeight: 600, marginTop: '2px' }}>#{getTicketCode(task)}</div>
                            )}
                          </td>
                          <td style={{ fontWeight: '700', color: '#2D1A12' }}>{renderCleanBatchTaskName(task)}</td>
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
                            {renderStatusBadge(task.status)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {renderActionBadge(task)}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '0.82rem' }}>
                            {formatDateTime(task.recorded_date)}
                          </td>
                          <td style={{ color: '#6B7280', fontSize: '0.85rem' }}>{(() => { const n = (task.notes || '').trim(); return /^ch[ờo]\s*x[áa]c\s*nh[ậa]n/i.test(n) ? '' : n; })()}</td>
                          <td 
                            style={{ 
                              position: 'relative', 
                              textAlign: 'center', 
                              zIndex: actionMenuId === task.id ? 100 : 1 
                            }} 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="action-btn"
                              title="Thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === task.id ? null : task.id);
                              }}
                              style={{
                                backgroundColor: actionMenuId === task.id ? '#FAF6F0' : 'transparent',
                                color: actionMenuId === task.id ? '#7B5233' : '#9CA3AF'
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {actionMenuId === task.id && (
                              <div 
                                className="action-menu" 
                                style={{ 
                                  right: '4px', 
                                  left: 'auto',
                                  transform: 'none', 
                                  top: (idx >= paginatedTasks.length - 2 && paginatedTasks.length > 2) ? 'auto' : 'calc(100% + 2px)',
                                  bottom: (idx >= paginatedTasks.length - 2 && paginatedTasks.length > 2) ? 'calc(100% + 2px)' : 'auto',
                                  minWidth: '145px',
                                  width: 'max-content',
                                  padding: '5px',
                                  background: '#FFFFFF',
                                  border: '1px solid #EADCC9',
                                  borderRadius: '10px',
                                  boxShadow: '0 10px 25px -3px rgba(45, 26, 18, 0.12), 0 4px 10px -2px rgba(45, 26, 18, 0.06)',
                                  zIndex: 1000
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(null);
                                    setSelectedTask(task);
                                  }}
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    padding: '7px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: '#4B5563',
                                    borderRadius: '6px',
                                    whiteSpace: 'nowrap',
                                    width: '100%'
                                  }}
                                >
                                  <Eye size={14} color="#7B5233" />
                                  <span>Xem chi tiết</span>
                                </button>

                                {isEligibleForQuickConfirm(task) && (
                                  <button
                                    type="button"
                                    className="action-menu-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuId(null);
                                      handleOpenQuickConfirmSingle(task);
                                    }}
                                    disabled={quickConfirming}
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px', 
                                      padding: '7px 12px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      color: '#059669',
                                      borderRadius: '6px',
                                      whiteSpace: 'nowrap',
                                      width: '100%'
                                    }}
                                  >
                                    <CheckCircle2 size={14} color="#059669" />
                                    <span>Duyệt nhanh</span>
                                  </button>
                                )}

                                {task.action === 'tra-ve' && (
                                  <button
                                    type="button"
                                    className="action-menu-item warn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionMenuId(null);
                                      handleCancelReturn(task);
                                    }}
                                    disabled={cancelingId === task.id}
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px', 
                                      padding: '7px 12px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      color: '#D97706',
                                      borderRadius: '6px',
                                      whiteSpace: 'nowrap',
                                      width: '100%'
                                    }}
                                  >
                                    <RotateCcw size={14} color="#D97706" />
                                    <span>Hủy trả hàng</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* GIAO DIỆN THẺ DI ĐỘNG (MOBILE CARDS LIST) */}
              <div className="mobile-only mgmt-cards-container quality-mobile-container">
                {paginatedTasks.map((task, idx) => {
                  const sttDisplay = String((currentPage - 1) * limit + idx + 1).padStart(2, '0');
                  const ticket = getTicketCode(task);
                  const isPass = task.result === 'Đạt' || task.result === 'pass';
                  const isQuickEligible = isEligibleForQuickConfirm(task);
                  const isReturn = task.action === 'tra-ve';

                  return (
                    <div
                      key={task.id || idx}
                      className="quality-mobile-card animate-card-entrance"
                      onClick={() => {
                        setFocusedRowIndex(idx);
                        setSelectedTask(task);
                      }}
                    >
                      {/* HEADER */}
                      <div className="quality-card-header">
                        <div className="quality-card-header-left">
                          <span className="quality-card-stt">#{sttDisplay}</span>
                          {task.batch_no && (
                            <span className="quality-card-batch">PO: {task.batch_no}</span>
                          )}
                          {ticket && (
                            <span className="quality-card-ticket">#{ticket}</span>
                          )}
                        </div>
                        <div className="quality-card-header-right">
                          {renderStatusBadge(task.status)}
                          {renderActionBadge(task)}
                        </div>
                      </div>

                      {/* TITLE / CHI TIẾT */}
                      <h4 className="quality-card-title">
                        {renderCleanBatchTaskName(task)}
                      </h4>

                      {/* BADGE: PHIẾU KIỂM TRA & KẾT QUẢ */}
                      <div className="quality-card-badge-row">
                        {renderCategoryBadge(task)}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          backgroundColor: isPass ? '#ECFDF5' : '#FEF2F2',
                          color: isPass ? '#059669' : '#DC2626',
                          border: isPass ? '1px solid #A7F3D0' : '1px solid #FECACA'
                        }}>
                          {isPass ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{isPass ? 'Đạt' : 'Không đạt'}</span>
                        </span>
                      </div>

                      {/* META GRID */}
                      <div className="quality-card-meta-grid">
                        <div className="quality-card-meta-item">
                          <span className="quality-card-meta-label">QC:</span>
                          <span className="quality-card-meta-val">{task.inspector_name || 'QC'}</span>
                        </div>
                        <div className="quality-card-meta-item">
                          <span className="quality-card-meta-label">Ưu tiên:</span>
                          <span className="quality-card-meta-val">{task.priority || 3}</span>
                        </div>
                        <div className="quality-card-meta-item">
                          <span className="quality-card-meta-label">Ngày:</span>
                          <span className="quality-card-meta-val">{formatDateTime(task.recorded_date)}</span>
                        </div>
                        <div className="quality-card-meta-item">
                          <span className="quality-card-meta-label">Lỗi:</span>
                          <span className="quality-card-meta-val" style={{ color: (task.error_qty > 0) ? '#DC2626' : '#059669' }}>
                            {task.error_qty || 0}
                          </span>
                        </div>
                      </div>

                      {/* GHI CHÚ */}
                      {task.notes && (() => {
                        const n = task.notes.trim();
                        if (/^ch[ờo]\s*x[áa]c\s*nh[ậa]n/i.test(n)) return null;
                        return (
                          <div className="quality-card-note">
                            {n}
                          </div>
                        );
                      })()}

                      {/* ACTION BUTTONS TRÊN CARD */}
                      <div className="quality-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="quality-btn-mobile btn-detail"
                          onClick={() => {
                            setFocusedRowIndex(idx);
                            setSelectedTask(task);
                          }}
                        >
                          <Eye size={15} color="#7B5233" />
                          <span>Chi tiết</span>
                        </button>

                        {isQuickEligible && (
                          <button
                            type="button"
                            className="quality-btn-mobile btn-quick-confirm"
                            disabled={quickConfirming}
                            onClick={() => handleOpenQuickConfirmSingle(task)}
                          >
                            <CheckCircle2 size={15} color="#059669" />
                            <span>Duyệt nhanh</span>
                          </button>
                        )}

                        {isReturn && (
                          <button
                            type="button"
                            className="quality-btn-mobile btn-cancel-return"
                            disabled={cancelingId === task.id}
                            onClick={() => handleCancelReturn(task)}
                          >
                            <RotateCcw size={15} color="#D97706" />
                            <span>Hủy trả</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION - DESKTOP STICKY BOTTOM */}
              <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{filteredTasks.length > 0 ? (currentPage - 1) * limit + 1 : 0} - {Math.min(currentPage * limit, filteredTasks.length)}</b> trên <b>{filteredTasks.length}</b> phiếu kiểm tra
                </div>
                {totalPages > 1 && (
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button 
                      className="page-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      title="Trang trước"
                    >
                      <ChevronLeft size={14} />
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
                            <span key={`ell-${idx}`} style={{ padding: '0 4px', color: '#8D6E63', fontWeight: '700' }}>
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={p}
                            className={`page-btn ${currentPage === p ? 'active' : ''}`}
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </button>
                        );
                      });
                    })()}
                    <button 
                      className="page-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      title="Trang sau"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>

      {/* PAGINATION - MOBILE STICKY BOTTOM */}
      {!selectedTask && !isBatchQuickModalOpen && totalPages > 1 && (
        <div className="pagination-mobile-sticky mobile-only">
          <button
            type="button"
            className="page-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#7B5233', whiteSpace: 'nowrap' }}>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="page-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

              </>
      )}

      {/* MODAL CHI TIẾT & XÁC NHẬN PHIẾU */}
      {selectedTask && (
        <div className="modal-overlay" onClick={handleRequestCloseModal} style={{ zIndex: 10050 }}>
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
            <div className="modal-content" style={{ flex: 1, maxWidth: '1080px', margin: 0 }}>
              {/* Bottom Sheet Drag Indicator cho Mobile */}
              <div className="mobile-modal-drag-indicator mobile-only" />

              {/* MODAL HEADER */}
              <div className="quality-modal-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 22px',
                backgroundColor: '#FAF7F2',
                borderBottom: '1px solid #E8DFD5',
                position: 'relative'
              }}>
                <div className="quality-modal-header-top" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#8B5E3C',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(139, 94, 60, 0.22)',
                    flexShrink: 0
                  }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, color: '#5D4037', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Chi tiết phiếu kiểm tra
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#8D7B6F', fontWeight: 500, marginTop: '2px' }}>
                      Mã phiếu: <strong style={{ color: '#3E2723' }}>#{selectedTask.ticket_code || selectedTask.id}</strong>
                    </div>
                  </div>
                </div>

                {/* CHỈ SỐ HỒ SƠ, ĐIỀU HƯỚNG PREV/NEXT, KẾT QUẢ ĐẠT/KHÔNG ĐẠT & NÚT ĐÓNG (GỐC PHẢI) */}
                <div className="quality-modal-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Điều hướng nhanh giữa các phiếu */}
                  {filteredTasks.length > 0 && currentTaskIndex >= 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={goToPreviousTask}
                        disabled={currentTaskIndex <= 0}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid #E0D6CB',
                          backgroundColor: '#FFFFFF',
                          color: '#5D4037',
                          cursor: currentTaskIndex <= 0 ? 'not-allowed' : 'pointer',
                          opacity: currentTaskIndex <= 0 ? 0.35 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Hồ sơ trước (Phím mũi tên ←)"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E0D6CB',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#6D4C41',
                          whiteSpace: 'nowrap'
                        }}
                        title={`Đang xem hồ sơ ${currentTaskIndex + 1} trên tổng số ${filteredTasks.length} hồ sơ`}
                      >
                        {currentTaskIndex + 1} / {filteredTasks.length}
                      </div>
                      <button
                        type="button"
                        onClick={goToNextTask}
                        disabled={currentTaskIndex >= filteredTasks.length - 1}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid #E0D6CB',
                          backgroundColor: '#FFFFFF',
                          color: '#5D4037',
                          cursor: currentTaskIndex >= filteredTasks.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: currentTaskIndex >= filteredTasks.length - 1 ? 0.35 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Hồ sơ sau (Phím mũi tên →)"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  {/* CHỈNH SỬA KẾT QUẢ ĐẠT / KHÔNG ĐẠT (1 NÚT DUY NHẤT CLICK ĐỔI TRẠNG THÁI) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#8D7B6F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Kết quả:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setModalResult(prev => {
                          const nextResult = prev === 'pass' ? 'fail' : 'pass';
                          if (nextResult === 'pass' && modalAction === 'tra-ve') {
                            setModalAction('chap-nhan');
                          }
                          return nextResult;
                        });
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: modalResult === 'pass' ? '1px solid #A7F3D0' : '1px solid #FECACA',
                        backgroundColor: modalResult === 'pass' ? '#ECFDF5' : '#FEF2F2',
                        color: modalResult === 'pass' ? '#059669' : '#DC2626',
                        transition: 'all 0.15s ease',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = modalResult === 'pass' ? '#D1FAE5' : '#FEE2E2';
                        e.currentTarget.style.borderColor = modalResult === 'pass' ? '#6EE7B7' : '#FCA5A5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = modalResult === 'pass' ? '#ECFDF5' : '#FEF2F2';
                        e.currentTarget.style.borderColor = modalResult === 'pass' ? '#A7F3D0' : '#FECACA';
                      }}
                      title={`Bấm để chuyển sang ${modalResult === 'pass' ? 'Không đạt' : 'Đạt'} (Phím tắt F3)`}
                    >
                      {modalResult === 'pass' ? (
                        <>
                          <CheckCircle2 size={15} />
                          <span>Đạt</span>
                          <kbd className="kbd-shortcut" style={{ fontSize: '0.72rem', padding: '1px 5px', marginLeft: '4px' }}>F3</kbd>
                        </>
                      ) : (
                        <>
                          <XCircle size={15} />
                          <span>Không đạt</span>
                          <kbd className="kbd-shortcut" style={{ fontSize: '0.72rem', padding: '1px 5px', marginLeft: '4px' }}>F3</kbd>
                        </>
                      )}
                    </button>
                  </div>

                  {/* NÚT ĐÓNG GÓC PHẢI (DẤU X & PHÍM TẮT ESC) */}
                  <button 
                    type="button"
                    className="quality-modal-close-btn"
                    onClick={handleRequestCloseModal}
                    style={{
                      height: '32px',
                      padding: '0 8px',
                      borderRadius: '8px',
                      border: '1px solid #E0D6CB',
                      backgroundColor: '#FFFFFF',
                      color: '#8D7B6F',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                      marginLeft: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5EFE8';
                      e.currentTarget.style.color = '#3E2723';
                      e.currentTarget.style.borderColor = '#8B5E3C';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.color = '#8D7B6F';
                      e.currentTarget.style.borderColor = '#E0D6CB';
                    }}
                    title="Đóng (Esc)"
                    aria-label="Đóng (Esc)"
                  >
                    <X size={16} />
                    <kbd className="kbd-shortcut desktop-only" style={{ fontSize: '0.72rem', padding: '1px 5px', marginLeft: '1px' }}>Esc</kbd>
                  </button>
                </div>
              </div>

              {/* TAB NAVIGATION */}
              {!confirmSuccessMsg && (
                <div className="quality-modal-tabs" style={{
                  display: 'flex',
                  borderBottom: '1px solid #E8DFD5',
                  backgroundColor: '#FAF7F2',
                  padding: '0 22px',
                  gap: '6px'
                }}>
                  <button
                    type="button"
                    className="quality-modal-tab-btn"
                    onClick={() => setModalTab('info')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 16px',
                      border: 'none',
                      borderBottom: modalTab === 'info' ? '2.5px solid #8B5E3C' : '2.5px solid transparent',
                      backgroundColor: 'transparent',
                      color: modalTab === 'info' ? '#5D4037' : '#8D7B6F',
                      fontWeight: modalTab === 'info' ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Info size={16} />
                    <span>Thông tin</span>
                    {taskImages.length > 0 && (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        backgroundColor: '#EFEAE3',
                        color: '#5D4037',
                        border: '1px solid #D8CCC0',
                        fontWeight: 600
                      }}>
                        <span className="desktop-only" style={{ display: 'inline' }}>{taskImages.length} ảnh</span>
                        <span className="mobile-only" style={{ display: 'none' }}>{taskImages.length}</span>
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="quality-modal-tab-btn"
                    onClick={() => setModalTab('details')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 16px',
                      border: 'none',
                      borderBottom: modalTab === 'details' ? '2.5px solid #8B5E3C' : '2.5px solid transparent',
                      backgroundColor: 'transparent',
                      color: modalTab === 'details' ? '#5D4037' : '#8D7B6F',
                      fontWeight: modalTab === 'details' ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Layers size={16} />
                    <span>Chi tiết</span>
                    {partsList.length > 0 && (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        backgroundColor: '#EFEAE3',
                        color: '#5D4037',
                        border: '1px solid #D8CCC0',
                        fontWeight: 600
                      }}>
                        {partsList.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="quality-modal-tab-btn"
                    onClick={() => setModalTab('history')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 16px',
                      border: 'none',
                      borderBottom: modalTab === 'history' ? '2.5px solid #8B5E3C' : '2.5px solid transparent',
                      backgroundColor: 'transparent',
                      color: modalTab === 'history' ? '#5D4037' : '#8D7B6F',
                      fontWeight: modalTab === 'history' ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <History size={16} />
                    <span>Lịch sử</span>
                    {modalHistory.length > 0 && (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        backgroundColor: modalTab === 'history' ? '#8B5E3C' : '#EFEAE3',
                        color: modalTab === 'history' ? '#FFFFFF' : '#5D4037',
                        border: '1px solid #D8CCC0',
                        fontWeight: 700
                      }}>
                        {modalHistory.length}
                      </span>
                    )}
                  </button>
                </div>
              )}

            {/* MODAL BODY */}
            {confirmSuccessMsg ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                <CheckCircle2 size={54} style={{ margin: '0 auto 12px auto', display: 'block', color: '#10B981' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{confirmSuccessMsg}</div>
              </div>
            ) : (
              <div className="quality-modal-body" style={{ padding: '22px 26px', maxHeight: 'calc(88vh - 130px)', overflowY: 'auto' }}>
                {modalTab === 'info' && (
                  <>
                    {/* CARD THÔNG TIN TỔNG QUAN */}
                    <div className="quality-overview-grid">
                      <div>
                        <span style={{ fontSize: '0.74rem', color: '#8D7B6F', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                          MÃ LÔ / PO
                        </span>
                        <strong style={{ color: '#3E2723', fontSize: '0.92rem' }}>
                          {selectedTask.batch_no || 'N/A'}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.74rem', color: '#8D7B6F', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                          PHIẾU KIỂM TRA
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <select
                            value={modalInspectionType}
                            onChange={(e) => setModalInspectionType(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #D8CCC0',
                              fontSize: '0.82rem',
                              fontWeight: '600',
                              backgroundColor: '#FFFFFF',
                              color: '#5D4037',
                              cursor: 'pointer',
                              outline: 'none',
                              width: '100%'
                            }}
                          >
                            {formTypes.length > 0 ? (
                              formTypes.map(t => (
                                <option key={t.code || t.id} value={t.code}>{t.name}</option>
                              ))
                            ) : (
                              <>
                                <option value="first_sample">Kiểm tra mẫu lần đầu</option>
                                <option value="re_inspect">Kiểm tra lại</option>
                                <option value="parameter">Kiểm tra thông số</option>
                                <option value="process">Kiểm tra quy trình</option>
                                <option value="qa">Vấn đáp</option>
                                <option value="daily">Ghi nhận lỗi hằng ngày</option>
                              </>
                            )}
                            {modalInspectionType && !formTypes.some(t => t.code === modalInspectionType) && !['first_sample', 're_inspect', 'parameter', 'process', 'qa', 'daily'].includes(modalInspectionType) && (
                              <option value={modalInspectionType}>↳ {modalInspectionType}</option>
                            )}
                          </select>

                          {/* KHI LOẠI PHIẾU LÀ KIỂM TRA THÔNG SỐ: HIỂN THỊ CHỌN THÔNG SỐ (ẢNH 3) */}
                          {modalInspectionType === 'parameter' && (
                            <div style={{
                              padding: '6px 8px',
                              backgroundColor: '#FDFBF9',
                              border: '1px solid #E6DCD1',
                              borderRadius: '8px',
                              marginTop: '2px'
                            }}>
                              <label style={{ 
                                fontSize: '0.73rem', 
                                color: '#6D4C41', 
                                fontWeight: 700, 
                                display: 'block', 
                                marginBottom: '4px' 
                              }}>
                                Chọn thông số <span style={{ color: '#EF4444' }}>*</span>
                              </label>
                              <select
                                value={modalParameter}
                                onChange={(e) => setModalParameter(e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #8B5E3C',
                                  fontSize: '0.82rem',
                                  fontWeight: '600',
                                  backgroundColor: '#FFFFFF',
                                  color: '#3E2723',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  width: '100%',
                                  boxShadow: '0 1px 3px rgba(139, 94, 60, 0.08)'
                                }}
                              >
                                {parameterOptions.length > 0 ? (
                                  parameterOptions.map(p => (
                                    <option key={p.code || p.id} value={p.code}>{p.name}</option>
                                  ))
                                ) : (
                                  <>
                                    <option value="do_am">Độ ẩm</option>
                                    <option value="nhiet_do">Nhiệt độ</option>
                                    <option value="anh_sang">Ánh sáng</option>
                                    <option value="do_bong_son">Độ bóng sơn</option>
                                    <option value="do_day_mang_son">Độ dày màng sơn</option>
                                  </>
                                )}
                                {modalParameter && !parameterOptions.some(p => p.code === modalParameter) && !['do_am', 'nhiet_do', 'anh_sang', 'do_bong_son', 'do_day_mang_son'].includes(modalParameter) && (
                                  <option value={modalParameter}>{modalParameter}</option>
                                )}
                              </select>
                            </div>
                          )}

                          <select
                            value={normalizeStage(modalStage)}
                            onChange={(e) => setModalStage(e.target.value)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #E0D6CB',
                              fontSize: '0.78rem',
                              fontWeight: '500',
                              backgroundColor: '#FAF7F2',
                              color: '#6D4C41',
                              cursor: 'pointer',
                              outline: 'none',
                              width: '100%'
                            }}
                          >
                            <option value="">↳ Không gắn CĐ</option>
                            {AVAILABLE_STAGES.map(st => (
                              <option key={st} value={st}>↳ {st}</option>
                            ))}
                            {modalStage && !AVAILABLE_STAGES.some(st => st.toLowerCase() === modalStage.toLowerCase()) && (
                              <option value={modalStage}>↳ {modalStage}</option>
                            )}
                          </select>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.74rem', color: '#8D7B6F', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                          NGƯỜI KIỂM TRA QC
                        </span>
                        <strong style={{ color: '#3E2723' }}>
                          {selectedTask.inspector_name || 'QC'}
                        </strong>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.74rem', color: '#8D7B6F', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                          NGÀY GHI NHẬN
                        </span>
                        <span style={{ color: '#3E2723', fontWeight: 600 }}>
                          {formatDateTime(selectedTask.recorded_date)}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.74rem', color: '#8D7B6F', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                          TRẠNG THÁI
                        </span>
                        <div style={{ marginTop: '2px' }}>
                          {renderStatusBadge(selectedTask.status)}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.74rem', color: '#8D7B6F', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                          HÀNH ĐỘNG XỬ LÝ
                        </span>
                        <select
                          value={modalAction}
                          onChange={(e) => setModalAction(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #D8CCC0',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            backgroundColor: '#FFFFFF',
                            color: '#5D4037',
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

                      <div className="quality-kpi-chip quality-kpi-chip-green">
                        <span className="quality-kpi-label">
                          SL CẦN KIỂM (LÔ)
                        </span>
                        <strong className="quality-kpi-value quality-kpi-value-green">
                          {Number(selectedTask.required_qty || 0).toLocaleString()}
                        </strong>
                      </div>

                      <div className="quality-kpi-chip quality-kpi-chip-blue">
                        <span className="quality-kpi-label">
                          SL MẪU KIỂM TRA
                        </span>
                        <strong className="quality-kpi-value quality-kpi-value-blue">
                          {Number(selectedTask.sample_qty || 0).toLocaleString()}
                        </strong>
                      </div>

                      <div className={`quality-kpi-chip ${selectedTask.error_qty > 0 ? 'quality-kpi-chip-red' : 'quality-kpi-chip-green'}`}>
                        <span className="quality-kpi-label">
                          SỐ LỖI PHÁT HIỆN
                        </span>
                        <strong className={`quality-kpi-value ${selectedTask.error_qty > 0 ? 'quality-kpi-value-red' : 'quality-kpi-value-green'}`}>
                          {Number(selectedTask.error_qty || 0).toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    {/* THÔNG TIN XỬ LÝ / BIỆN PHÁP KHẮC PHỤC */}
                    <div className="quality-modal-card-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#6D4C41',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: 0
                        }}>
                          <ClipboardList size={15} color="#8B5E3C" />
                          <span>Thông tin xử lý / Biện pháp khắc phục</span>
                        </label>
                      </div>

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
                          border: '1px solid #D8CCC0',
                          backgroundColor: '#FFFFFF',
                          color: '#3E2723',
                          fontSize: '0.86rem',
                          lineHeight: '1.45',
                          resize: 'vertical',
                          outline: 'none',
                          fontFamily: 'inherit',
                          marginBottom: '10px',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#8B5E3C';
                          e.target.style.boxShadow = '0 0 0 3px rgba(139, 94, 60, 0.12)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#D8CCC0';
                          e.target.style.boxShadow = 'none';
                        }}
                      />

                      {/* Input ẩn để chọn tệp ảnh xử lý */}
                      <input
                        type="file"
                        ref={handlingFileInputRef}
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleHandlingImageFiles(e.target.files);
                          }
                        }}
                      />

                      {/* Danh sách ảnh xử lý + Ô vuông Thêm ảnh chuẩn ảnh 2 */}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
                        {handlingImages.map((img, idx) => {
                          const imgUrl = getImageUrl(img);
                          return (
                            <div
                              key={idx}
                              style={{
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid #E0D6CB',
                                backgroundColor: '#FAF7F2',
                                boxShadow: '0 1px 3px rgba(93,64,55,0.06)',
                                transition: 'transform 0.15s, box-shadow 0.15s'
                              }}
                            >
                              <img
                                src={imgUrl}
                                alt={`Ảnh xử lý ${idx + 1}`}
                                onError={handleInspectionImageError}
                                style={{ width: '92px', height: '92px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                                onClick={() => setPreviewImgUrl(imgUrl)}
                                title="Nhấp để xem ảnh lớn"
                                onMouseEnter={(e) => {
                                  e.currentTarget.parentElement.style.transform = 'scale(1.03)';
                                  e.currentTarget.parentElement.style.boxShadow = '0 4px 10px rgba(93,64,55,0.14)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.parentElement.style.transform = 'scale(1)';
                                  e.currentTarget.parentElement.style.boxShadow = '0 1px 3px rgba(93,64,55,0.06)';
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveHandlingImage(idx);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(239, 68, 68, 0.92)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                                  transition: 'background-color 0.15s, transform 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#DC2626';
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.92)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Xóa ảnh xử lý này"
                              >
                                <X size={13} />
                              </button>
                              <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: 'rgba(62, 39, 35, 0.75)',
                                color: '#FFFFFF',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                textAlign: 'center',
                                padding: '2px 0',
                                pointerEvents: 'none'
                              }}>
                                Ảnh {idx + 1}
                              </div>
                            </div>
                          );
                        })}

                        {/* Ô thêm ảnh dạng vuông chuẩn ảnh 2 (luôn hiển thị để thêm ảnh / dán ảnh) */}
                        <div
                          onClick={() => !isUploadingHandlingImages && handlingFileInputRef.current?.click()}
                          onDragOver={handleHandlingDragOver}
                          onDragLeave={handleHandlingDragLeave}
                          onDrop={handleHandlingDrop}
                          style={{
                            width: '92px',
                            height: '92px',
                            borderRadius: '10px',
                            border: isDraggingHandlingImages ? '2px dashed #8B5E3C' : '1.5px dashed #D8CCC0',
                            backgroundColor: isDraggingHandlingImages ? '#F5EFE8' : '#FAF7F2',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isUploadingHandlingImages ? 'not-allowed' : 'pointer',
                            color: '#8D7B6F',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            if (!isUploadingHandlingImages) {
                              e.currentTarget.style.borderColor = '#8B5E3C';
                              e.currentTarget.style.backgroundColor = '#F5EFE8';
                              e.currentTarget.style.color = '#5D4037';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isUploadingHandlingImages) {
                              e.currentTarget.style.borderColor = '#D8CCC0';
                              e.currentTarget.style.backgroundColor = '#FAF7F2';
                              e.currentTarget.style.color = '#8D7B6F';
                            }
                          }}
                          title="Thêm ảnh xử lý, kéo thả hoặc dán ảnh (Ctrl+V)"
                        >
                          {isUploadingHandlingImages ? (
                            <>
                              <Loader2 size={24} className="animate-spin" color="#8B5E3C" />
                              <span style={{ fontSize: '0.68rem', color: '#8B5E3C', marginTop: '4px' }}>Đang tải...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={24} strokeWidth={1.75} color="#8D7B6F" />
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6D4C41', marginTop: '4px' }}>Thêm ảnh</span>
                              <span style={{ fontSize: '0.68rem', color: '#9E9385', marginTop: '1px' }}>Ctrl+V</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* GHI CHÚ */}
                    <div className="quality-modal-note-card">
                      <div style={{
                        fontSize: '0.76rem',
                        color: '#B45309',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Info size={15} color="#D97706" />
                        <span>Ghi chú từ kiểm tra QC</span>
                      </div>
                      <div style={{
                        color: '#78350F',
                        fontSize: '0.86rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        fontWeight: 500
                      }}>
                        {selectedTask.notes || parsedTaskData?.note || 'Không có ghi chú thêm.'}
                      </div>
                    </div>

                    {/* HÌNH ẢNH MINH CHỨNG */}
                    <div className="quality-modal-card-section">
                      <div style={{
                        fontSize: '0.76rem',
                        color: '#6D4C41',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ImageIcon size={14} color="#8B5E3C" />
                          <span>Hình ảnh minh chứng ({modalImages.length})</span>
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#EFEAE3',
                          color: '#6D4C41',
                          border: '1px solid #D8CCC0',
                          fontWeight: 600
                        }}>
                          Từ Mobile QC
                        </span>
                      </div>

                      {modalImages.length > 0 ? (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {modalImages.map((img, idx) => {
                            const imgUrl = getImageUrl(img);
                            return (
                              <div
                                key={idx}
                                style={{
                                  position: 'relative',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1px solid #E0D6CB',
                                  backgroundColor: '#FAF7F2',
                                  boxShadow: '0 1px 3px rgba(93,64,55,0.06)',
                                  transition: 'transform 0.15s, box-shadow 0.15s'
                                }}
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Minh chứng QC ${idx + 1}`}
                                  onError={handleInspectionImageError}
                                  style={{ width: '92px', height: '92px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                                  onClick={() => setPreviewImgUrl(imgUrl)}
                                  title="Nhấp để xem ảnh lớn"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.parentElement.style.transform = 'scale(1.03)';
                                    e.currentTarget.parentElement.style.boxShadow = '0 4px 10px rgba(93,64,55,0.14)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.parentElement.style.transform = 'scale(1)';
                                    e.currentTarget.parentElement.style.boxShadow = '0 1px 3px rgba(93,64,55,0.06)';
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  backgroundColor: 'rgba(62, 39, 35, 0.75)',
                                  color: '#FFFFFF',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  textAlign: 'center',
                                  padding: '2px 0',
                                  pointerEvents: 'none'
                                }}>
                                  Minh chứng {idx + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{
                          padding: '20px 16px',
                          backgroundColor: '#FAF7F2',
                          borderRadius: '8px',
                          border: '1px dashed #D8CCC0',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}>
                          <ImageIcon size={28} color="#A89F91" style={{ opacity: 0.6 }} />
                          <div style={{ color: '#6D4C41', fontSize: '0.82rem', fontWeight: 600 }}>
                            Không có ảnh minh chứng từ Mobile QC
                          </div>
                          <div style={{ color: '#8D7B6F', fontSize: '0.74rem' }}>
                            Phiếu kiểm tra này không đính kèm ảnh chụp tại xưởng khi tạo phiếu.
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {modalTab === 'details' && (
                  <>
                    {/* TAB CHI TIẾT */}
                    {/* BẢNG DANH SÁCH CHI TIẾT / PHÔI KIỂM TRA (LIST TABLE) */}
                    <div style={{ marginBottom: '14px' }}>
                      {/* BẢNG DANH SÁCH CHI TIẾT TRÊN DESKTOP */}
                      <div className="desktop-only">
                        <div className="quality-parts-header" style={{
                          fontSize: '0.82rem',
                          color: '#5D4037',
                          fontWeight: 700,
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          width: '100%'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              backgroundColor: '#EFEAE3',
                              border: '1px solid #D8CCC0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Layers size={14} color="#8B5E3C" />
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#5D4037', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Chi tiết / phôi kiểm tra
                            </span>
                          </div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: '#EFEAE3',
                            color: '#5D4037',
                            border: '1px solid #D8CCC0',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            {partsList.length} chi tiết
                          </span>
                        </div>

                        <div className="sop-standard-scroll" style={{
                          border: '1px solid #E8DFD5',
                          borderRadius: '12px',
                          overflowX: 'auto',
                          overflowY: 'auto',
                          WebkitOverflowScrolling: 'touch',
                          backgroundColor: '#FFFFFF',
                          maxHeight: '280px',
                          boxShadow: '0 2px 8px -2px rgba(93,64,55,0.05), 0 1px 4px -1px rgba(93,64,55,0.03)'
                        }}>
                          <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#FAF7F2', borderBottom: '1.5px solid #E8DFD5' }}>
                                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6D4C41', fontWeight: 700, fontSize: '0.74rem', width: '56px', letterSpacing: '0.4px' }}>STT</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6D4C41', fontWeight: 700, fontSize: '0.74rem', minWidth: '130px', letterSpacing: '0.4px' }}>TÊN CHI TIẾT / PHÔI</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6D4C41', fontWeight: 700, fontSize: '0.74rem', width: '140px', letterSpacing: '0.4px' }}>QUY CÁCH / THÔNG SỐ</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6D4C41', fontWeight: 700, fontSize: '0.74rem', minWidth: '180px', letterSpacing: '0.4px' }}>TÊN TỦ (SKU)</th>
                                <th style={{ padding: '10px 10px', textAlign: 'center', color: '#6D4C41', fontWeight: 700, fontSize: '0.74rem', width: '100px', letterSpacing: '0.4px' }}>SL KẾ HOẠCH</th>
                              </tr>
                            </thead>
                            <tbody>
                              {partsList.map((p, idx) => (
                                <tr 
                                  key={idx} 
                                  style={{ 
                                    borderBottom: idx < partsList.length - 1 ? '1px solid #F5EFE8' : 'none',
                                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FDFCF9',
                                    transition: 'background-color 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7F3EE'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FDFCF9'}
                                >
                                  <td style={{ padding: '9px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '6px',
                                      backgroundColor: '#EFEAE3',
                                      color: '#5D4037',
                                      fontWeight: 700,
                                      fontSize: '0.75rem',
                                      border: '1px solid #D8CCC0'
                                    }}>
                                      {p.stt}
                                    </span>
                                  </td>
                                  <td style={{ padding: '9px 12px', color: '#3E2723', fontWeight: 700, verticalAlign: 'middle', lineHeight: 1.4 }}>
                                    {p.name}
                                  </td>
                                  <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      backgroundColor: '#FAF7F2',
                                      color: '#5D4037',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #E5DDD3',
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
                                        backgroundColor: '#F5EFE8',
                                        color: '#5D4037',
                                        fontWeight: 600,
                                        border: '1px solid #D8CCC0',
                                        whiteSpace: 'nowrap'
                                      }} title={p.cabinet}>
                                        {p.cabinet}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#A8998D', fontSize: '0.8rem' }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '9px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#5D4037' }}>
                                    {p.qty ? (
                                      <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        backgroundColor: '#EFEAE3',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        color: '#5D4037',
                                        border: '1px solid #D8CCC0'
                                      }}>
                                        {Number(p.qty).toLocaleString()}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#A8998D', fontSize: '0.8rem' }}>—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* GIAO DIỆN THẺ CHI TIẾT TRÊN MOBILE: GỌN GÀNG, ĐỒNG BỘ VỚI SOP VÀ DANH SÁCH LỖI */}
                      <div className="mobile-only quality-parts-mobile-card-wrapper">
                        <div className="quality-parts-mobile-card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="quality-parts-mobile-icon-box">
                              <Layers size={14} color="#8B5E3C" />
                            </div>
                            <span className="quality-parts-mobile-title">
                              Chi tiết / phôi kiểm tra
                            </span>
                          </div>
                          <span className="quality-parts-mobile-badge">
                            {partsList.length} chi tiết
                          </span>
                        </div>

                        <div className="quality-parts-mobile-list">
                          {partsList.map((p, idx) => (
                            <div key={idx} className="quality-part-item-row">
                              <div className="quality-part-item-top">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                  <span className="quality-part-stt-chip">{p.stt}</span>
                                  <span className="quality-part-item-name">{p.name}</span>
                                </div>
                                {p.qty ? (
                                  <span className="quality-part-qty-chip">
                                    <span style={{ opacity: 0.75, fontSize: '0.68rem', fontWeight: 600 }}>SL:</span> {Number(p.qty).toLocaleString()}
                                  </span>
                                ) : null}
                              </div>
                              <div className="quality-part-item-meta">
                                {p.spec && (
                                  <span className="quality-part-spec-chip">
                                    <span style={{ color: '#8D7B6F', fontSize: '0.7rem', fontWeight: 500 }}>Quy cách:</span>
                                    <strong>{p.spec}</strong>
                                  </span>
                                )}
                                {p.cabinet && (
                                  <span className="quality-part-cabinet-chip">
                                    <span style={{ color: '#8D7B6F', fontSize: '0.7rem', fontWeight: 500 }}>Tủ:</span>
                                    <strong>{p.cabinet}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* HƯỚNG DẪN KIỂM TRA (CÁC BƯỚC KIỂM TRA SOP) */}
                    <SopStepsTable
                      steps={taskSteps}
                      loading={loadingSteps}
                    />

                    {/* DANH SÁCH LỖI PHÁT HIỆN NẾU CÓ */}
                    {taskErrors.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{
                          fontSize: '0.82rem',
                          color: '#991B1B',
                          fontWeight: 800,
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            backgroundColor: '#FEE2E2',
                            border: '1px solid #FECDD3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}>
                            <AlertTriangle size={14} color="#DC2626" />
                          </div>
                          <span>Danh sách lỗi phát hiện</span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: '#FEE2E2',
                            color: '#B91C1C',
                            border: '1px solid #FCA5A5'
                          }}>
                            {taskErrors.length} lỗi
                          </span>
                        </div>
                        <div className="sop-standard-scroll" style={{
                          border: '1px solid #FECDD3',
                          borderRadius: '12px',
                          overflowX: 'auto',
                          overflowY: 'auto',
                          WebkitOverflowScrolling: 'touch',
                          backgroundColor: '#FFFFFF',
                          maxHeight: '260px',
                          boxShadow: '0 2px 8px -2px rgba(220,38,38,0.06)'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#FFF5F5', borderBottom: '1.5px solid #FECDD3' }}>
                                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', width: '56px', letterSpacing: '0.4px' }}>STT</th>
                                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.4px' }}>TÊN LỖI / NỘI DUNG</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', width: '115px', letterSpacing: '0.4px' }}>SL GHI NHẬN</th>
                              </tr>
                            </thead>
                            <tbody>
                              {taskErrors.map((err, idx) => (
                                <tr 
                                  key={idx} 
                                  style={{ 
                                    borderBottom: idx < taskErrors.length - 1 ? '1px solid #FEE2E2' : 'none',
                                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FFFBFB',
                                    transition: 'background-color 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FFFBFB'}
                                >
                                  <td style={{ padding: '9px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '6px',
                                      backgroundColor: '#FEE2E2',
                                      color: '#DC2626',
                                      fontWeight: 800,
                                      fontSize: '0.75rem',
                                      border: '1px solid #FECDD3'
                                    }}>
                                      {String(idx + 1).padStart(2, '0')}
                                    </span>
                                  </td>
                                  <td style={{ padding: '9px 14px', color: '#1E293B', fontWeight: 700, verticalAlign: 'middle' }}>
                                    {err.name || err.defect_name || err.code || 'Lỗi'}
                                    {err.note && (
                                      <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 400, marginTop: '2px' }}>
                                        {err.note}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '9px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '3px 10px',
                                      borderRadius: '9999px',
                                      backgroundColor: '#FEE2E2',
                                      color: '#DC2626',
                                      fontWeight: 800,
                                      fontSize: '0.78rem',
                                      border: '1px solid #FCA5A5'
                                    }}>
                                      {err.qty || err.quantity || 1}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {modalTab === 'history' && (
                  <div style={{ padding: '4px 0 16px 0' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '18px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #E8DFD5'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          backgroundColor: '#EFEAE3',
                          border: '1px solid #D8CCC0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <History size={16} color="#8B5E3C" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4A3319' }}>
                            Nhật ký chỉnh sửa & kiểm tra (Audit Trail)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#8D7B6F' }}>
                            Tự động lưu vết lịch sử thay đổi thông tin phiếu kiểm tra
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        backgroundColor: '#F5EFE8',
                        color: '#6D4C41',
                        border: '1px solid #D8CCC0',
                        fontWeight: 600
                      }}>
                        {fullTimelineHistory.length} mốc sự kiện
                      </span>
                    </div>

                    {fullTimelineHistory.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        backgroundColor: '#FAF7F2',
                        borderRadius: '12px',
                        border: '1px dashed #D8CCC0',
                        color: '#8D7B6F'
                      }}>
                        <Clock size={36} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.4 }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#5D4037' }}>
                          Chưa có lịch sử chỉnh sửa
                        </div>
                        <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                          Mọi thay đổi về kết quả, công đoạn, hành động, hình ảnh hoặc trạng thái khi lưu sẽ được tự động ghi lại tại đây.
                        </div>
                      </div>
                    ) : (
                      <div style={{ position: 'relative', paddingLeft: '24px' }}>
                        {/* Continuous vertical timeline line */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          bottom: '24px',
                          left: '11px',
                          width: '2px',
                          backgroundColor: '#E5DDD3'
                        }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {fullTimelineHistory.map((item, idx) => {
                            const isCreate = item.action_type === 'create';
                            const isConfirm = item.action_type === 'confirm';
                            const isCancel = item.action_type === 'cancel';
                            const badgeColor = isCreate ? '#8B5E3C' : (isConfirm ? '#059669' : (isCancel ? '#DC2626' : '#8B5E3C'));
                            const badgeBg = isCreate ? '#F7F2EB' : (isConfirm ? '#ECFDF5' : (isCancel ? '#FEF2F2' : '#F5EFE8'));
                            const badgeBorder = isCreate ? '#DFD1C2' : (isConfirm ? '#A7F3D0' : (isCancel ? '#FECDD3' : '#D8CCC0'));

                            // Format date
                            let formattedTime = item.timestamp || '';
                            let relativeTime = '';
                            try {
                              if (item.timestamp) {
                                const dateObj = new Date(item.timestamp);
                                const day = String(dateObj.getDate()).padStart(2, '0');
                                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                const year = dateObj.getFullYear();
                                const hours = String(dateObj.getHours()).padStart(2, '0');
                                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                                formattedTime = `${hours}:${minutes} ${day}/${month}/${year}`;

                                const diffMs = Date.now() - dateObj.getTime();
                                const diffMins = Math.floor(diffMs / 60000);
                                if (diffMins < 1) relativeTime = 'Vừa xong';
                                else if (diffMins < 60) relativeTime = `${diffMins} phút trước`;
                                else {
                                  const diffHours = Math.floor(diffMins / 60);
                                  if (diffHours < 24) relativeTime = `${diffHours} giờ trước`;
                                  else {
                                    const diffDays = Math.floor(diffHours / 24);
                                    relativeTime = `${diffDays} ngày trước`;
                                  }
                                }
                              }
                            } catch (e) {}

                            return (
                              <div key={item.id || idx} style={{ position: 'relative' }}>
                                {/* Timeline Dot Icon */}
                                <div style={{
                                  position: 'absolute',
                                  left: '-24px',
                                  top: '12px',
                                  transform: 'translate(-50%, 0)',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: badgeBg,
                                  border: `2px solid ${badgeColor}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                  zIndex: 2
                                }}>
                                  {isCreate ? (
                                    <PlusCircle size={13} color="#8B5E3C" />
                                  ) : isConfirm ? (
                                    <CheckCircle2 size={12} color="#059669" />
                                  ) : isCancel ? (
                                    <XCircle size={12} color="#DC2626" />
                                  ) : (
                                    <Edit size={11} color="#8B5E3C" />
                                  )}
                                </div>

                                {/* Timeline Card Content */}
                                <div style={{
                                  backgroundColor: '#FFFFFF',
                                  border: `1px solid ${isCreate ? '#E2D6CA' : '#E8DFD5'}`,
                                  borderRadius: '12px',
                                  padding: '14px 16px',
                                  boxShadow: '0 1px 4px rgba(93,64,55,0.04)',
                                  transition: 'all 0.15s ease'
                                }}>
                                  {/* Card Header */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    marginBottom: '10px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontWeight: 700,
                                        color: '#3E2723',
                                        fontSize: '0.86rem'
                                      }}>
                                        <User size={14} color="#8B5E3C" />
                                        {item.user_name || (isCreate ? 'Lê Thị Hồng Nhung' : 'QC Administrator')}
                                      </span>

                                      {(item.department || item.user_role) && (
                                        <span style={{
                                          fontSize: '0.72rem',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: isCreate ? '#F7F2EB' : '#F5EFE8',
                                          color: isCreate ? '#7B5233' : '#6D4C41',
                                          border: `1px solid ${isCreate ? '#DFD1C2' : '#E0D6CB'}`,
                                          fontWeight: 600
                                        }}>
                                          {item.department || item.user_role}
                                        </span>
                                      )}

                                      <span style={{
                                        fontSize: '0.76rem',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: badgeBg,
                                        color: badgeColor,
                                        border: `1px solid ${badgeBorder}`,
                                        fontWeight: 700
                                      }}>
                                        {item.action_label || (isCreate ? 'Khởi tạo phiếu kiểm tra' : isConfirm ? 'Xác nhận duyệt' : isCancel ? 'Hủy hồ sơ' : 'Chỉnh sửa')}
                                      </span>
                                    </div>

                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      fontSize: '0.76rem',
                                      color: '#8D7B6F'
                                    }}>
                                      {relativeTime && (
                                        <span style={{
                                          backgroundColor: '#FAF7F2',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid #E8DFD5',
                                          fontWeight: 600
                                        }}>
                                          {relativeTime}
                                        </span>
                                      )}
                                      <span>{formattedTime}</span>
                                    </div>
                                  </div>

                                  {/* Timeline Item Content: Creation Details or Changes Diff List */}
                                  {isCreate ? (
                                    <div style={{
                                      backgroundColor: '#FAF7F2',
                                      border: '1px solid #E6DCD2',
                                      borderRadius: '8px',
                                      padding: '10px 12px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px'
                                    }}>
                                      <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                                        gap: '8px',
                                        fontSize: '0.78rem'
                                      }}>
                                        {item.initial_data?.ticket_code && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#8D7B6F', fontWeight: 600 }}>Mã phiếu:</span>
                                            <span style={{ fontWeight: 700, color: '#4E342E' }}>{item.initial_data.ticket_code}</span>
                                          </div>
                                        )}
                                        {item.initial_data?.po_no && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#8D7B6F', fontWeight: 600 }}>Đơn hàng (PO):</span>
                                            <span style={{ fontWeight: 700, color: '#4E342E' }}>{item.initial_data.po_no}</span>
                                          </div>
                                        )}
                                        {item.initial_data?.stage && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#8D7B6F', fontWeight: 600 }}>Công đoạn:</span>
                                            <span style={{ fontWeight: 600, color: '#4E342E' }}>{item.initial_data.stage}</span>
                                          </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: '#8D7B6F', fontWeight: 600 }}>Kết quả ban đầu:</span>
                                          <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            padding: '1px 7px',
                                            borderRadius: '4px',
                                            backgroundColor: (item.initial_data?.result === 'Đạt' || item.initial_data?.result === 'pass') ? '#DCFCE7' : '#FEE2E2',
                                            color: (item.initial_data?.result === 'Đạt' || item.initial_data?.result === 'pass') ? '#15803D' : '#B91C1C',
                                            border: `1px solid ${(item.initial_data?.result === 'Đạt' || item.initial_data?.result === 'pass') ? '#86EFAC' : '#FCA5A5'}`
                                          }}>
                                            {item.initial_data?.result || (selectedTask?.result === 'pass' || selectedTask?.result === 'Đạt' ? 'Đạt' : 'Không đạt')}
                                          </span>
                                        </div>
                                        {item.initial_data?.sample_qty !== undefined && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#8D7B6F', fontWeight: 600 }}>SL mẫu kiểm:</span>
                                            <span style={{ fontWeight: 700, color: '#4E342E' }}>{item.initial_data.sample_qty} sp</span>
                                          </div>
                                        )}
                                        {item.initial_data?.error_qty !== undefined && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#8D7B6F', fontWeight: 600 }}>Số lỗi phát hiện:</span>
                                            <span style={{
                                              fontWeight: 700,
                                              color: Number(item.initial_data.error_qty) > 0 ? '#DC2626' : '#16A34A'
                                            }}>
                                              {item.initial_data.error_qty} lỗi
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {item.note && (
                                        <div style={{
                                          marginTop: '2px',
                                          fontSize: '0.76rem',
                                          color: '#6D4C41',
                                          backgroundColor: '#FFFFFF',
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          border: '1px dashed #DFD1C2',
                                          lineHeight: 1.4
                                        }}>
                                          <strong style={{ color: '#5D4037' }}>Ghi chú:</strong> {item.note}
                                        </div>
                                      )}
                                    </div>
                                  ) : Array.isArray(item.changes) && item.changes.length > 0 ? (
                                    <div style={{
                                      backgroundColor: '#FAF7F2',
                                      border: '1px solid #EAE2D8',
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px'
                                    }}>
                                      {item.changes.map((ch, cIdx) => (
                                        <div key={cIdx} style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          fontSize: '0.8rem',
                                          lineHeight: 1.4,
                                          flexWrap: 'wrap'
                                        }}>
                                          <span style={{
                                            fontWeight: 700,
                                            color: '#5D4037',
                                            minWidth: '130px'
                                          }}>
                                            {ch.label || ch.field}:
                                          </span>

                                          <span style={{
                                            color: '#991B1B',
                                            backgroundColor: '#FEE2E2',
                                            border: '1px solid #FECDD3',
                                            padding: '1px 7px',
                                            borderRadius: '5px',
                                            fontSize: '0.76rem',
                                            textDecoration: 'line-through',
                                            fontWeight: 500
                                          }}>
                                            {ch.old_val || '(Trống)'}
                                          </span>

                                          <ArrowRight size={12} color="#8D7B6F" style={{ flexShrink: 0 }} />

                                          <span style={{
                                            color: '#065F46',
                                            backgroundColor: '#D1FAE5',
                                            border: '1px solid #A7F3D0',
                                            padding: '1px 7px',
                                            borderRadius: '5px',
                                            fontSize: '0.76rem',
                                            fontWeight: 700
                                          }}>
                                            {ch.new_val}
                                          </span>
                                        </div>
                                      ))}

                                      {/* Note / Handling note if present alongside changes */}
                                      {item.note && (
                                        <div style={{
                                          marginTop: '4px',
                                          fontSize: '0.76rem',
                                          color: '#6D4C41',
                                          backgroundColor: '#FFFFFF',
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          border: '1px dashed #E0D6CB'
                                        }}>
                                          <strong>Ghi chú:</strong> {item.note}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.78rem', color: '#8D7B6F', fontStyle: 'italic' }}>
                                      {isConfirm ? 'Đã xác nhận đạt và hoàn tất hồ sơ kiểm tra.' : (item.note || 'Không có ghi chú thay đổi chi tiết.')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MODAL FOOTER */}
            {!confirmSuccessMsg && (
              <>
                {/* 1. FOOTER DÀNH CHO DESKTOP: BỐ CỤC 1 HÀNG CHUẨN */}
                <div className="quality-modal-footer desktop-only" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 20px',
                  backgroundColor: '#FAF7F2',
                  borderTop: '1px solid #E8DFD5',
                  gap: '12px'
                }}>
                  <div className="quality-modal-footer-left">
                    <button
                      type="button"
                      onClick={() => setIsCancelInspectionModalOpen(true)}
                      disabled={confirming || cancelingTask}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        height: '38px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        border: '1px solid #D8CCC0',
                        backgroundColor: '#FFFFFF',
                        color: '#5D4037',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: (confirming || cancelingTask) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (!confirming && !cancelingTask) {
                          e.currentTarget.style.backgroundColor = '#FEF2F2';
                          e.currentTarget.style.borderColor = '#FECDD3';
                          e.currentTarget.style.color = '#DC2626';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!confirming && !cancelingTask) {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#D8CCC0';
                          e.currentTarget.style.color = '#5D4037';
                        }
                      }}
                      title="Hủy hồ sơ này khỏi danh sách quản lý chất lượng (F2)"
                    >
                      <XCircle size={15} style={{ flexShrink: 0, opacity: 0.75 }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{cancelingTask ? 'Đang hủy...' : 'Hủy hồ sơ'}</span>
                      <kbd className="kbd-shortcut">F2</kbd>
                    </button>

                    {selectedTask.action === 'tra-ve' && (
                      <button
                        type="button"
                        onClick={() => handleCancelReturn(selectedTask)}
                        disabled={confirming || cancelingId === selectedTask.id || cancelingTask}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          height: '38px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D8CCC0',
                          color: '#5D4037',
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          cursor: (confirming || cancelingId === selectedTask.id || cancelingTask) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          if (!confirming && cancelingId !== selectedTask.id && !cancelingTask) {
                            e.currentTarget.style.backgroundColor = '#FFFBEB';
                            e.currentTarget.style.borderColor = '#FDE68A';
                            e.currentTarget.style.color = '#D97706';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!confirming && cancelingId !== selectedTask.id && !cancelingTask) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#D8CCC0';
                            e.currentTarget.style.color = '#5D4037';
                          }
                        }}
                        title="Hủy trả hàng và chuyển sang Chấp nhận / Tự xử lý (F4)"
                      >
                        <RotateCcw size={15} style={{ flexShrink: 0, opacity: 0.75 }} className={cancelingId === selectedTask.id ? 'animate-spin' : ''} />
                        <span style={{ whiteSpace: 'nowrap' }}>{cancelingId === selectedTask.id ? 'Đang hủy...' : 'Hủy trả hàng'}</span>
                        <kbd className="kbd-shortcut">F4</kbd>
                      </button>
                    )}
                  </div>

                  <div className="quality-modal-footer-right">
                    <button
                      type="button"
                      className="btn-confirm-main"
                      onClick={() => handleConfirmTask(selectedTask)}
                      disabled={confirming || cancelingTask}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        height: '38px',
                        padding: '0 20px',
                        borderRadius: '8px',
                        border: '1px solid #047857',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: (confirming || cancelingTask) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (!confirming && !cancelingTask) {
                          e.currentTarget.style.backgroundColor = '#047857';
                          e.currentTarget.style.borderColor = '#047857';
                          e.currentTarget.style.boxShadow = '0 2px 5px rgba(5, 150, 105, 0.35)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!confirming && !cancelingTask) {
                          e.currentTarget.style.backgroundColor = '#059669';
                          e.currentTarget.style.borderColor = '#059669';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(5, 150, 105, 0.25)';
                        }
                      }}
                    >
                      <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{confirming ? 'Đang xác nhận...' : 'Xác nhận hồ sơ'}</span>
                      <kbd className="kbd-shortcut kbd-shortcut-primary">F1</kbd>
                    </button>
                  </div>
                </div>

                {/* 2. FOOTER DÀNH CHO MOBILE: GỌN GÀNG 1 HÀNG (ĐÃ BỎ NÚT LƯU VÀ ĐÓNG THEO YÊU CẦU) */}
                <div className="quality-modal-footer-mobile mobile-only">
                  <div className="quality-modal-footer-mobile-row">
                    <button
                      type="button"
                      className="btn-modal-mobile-cancel"
                      onClick={() => setIsCancelInspectionModalOpen(true)}
                      disabled={confirming || cancelingTask}
                      title="Hủy hồ sơ này khỏi danh sách quản lý chất lượng"
                    >
                      <XCircle size={15} />
                      <span>{cancelingTask ? 'Đang hủy...' : 'Hủy hồ sơ'}</span>
                    </button>

                    {selectedTask.action === 'tra-ve' && (
                      <button
                        type="button"
                        className="btn-modal-mobile-cancel-return"
                        onClick={() => handleCancelReturn(selectedTask)}
                        disabled={confirming || cancelingId === selectedTask.id || cancelingTask}
                        title="Hủy trả hàng và chuyển sang Chấp nhận / Tự xử lý"
                      >
                        <RotateCcw size={15} className={cancelingId === selectedTask.id ? 'animate-spin' : ''} />
                        <span>{cancelingId === selectedTask.id ? 'Đang hủy...' : 'Hủy trả'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-modal-mobile-confirm"
                      onClick={() => handleConfirmTask(selectedTask)}
                      disabled={confirming || cancelingTask}
                      title="Xác nhận phê duyệt hồ sơ chất lượng"
                    >
                      <CheckCircle2 size={17} />
                      <span>{confirming ? 'Đang xác nhận...' : 'Xác nhận hồ sơ'}</span>
                    </button>
                  </div>
                </div>
              </>
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

            {/* LIGHTBOX XEM ẢNH PHÓNG TO */}
            {previewImgUrl && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}
                onClick={() => setPreviewImgUrl(null)}
              >
                <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
                  <img
                    src={previewImgUrl}
                    alt="Xem ảnh lớn"
                    onError={handleInspectionImageError}
                    style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewImgUrl(null)}
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '-12px',
                      backgroundColor: '#FFFFFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      color: '#1F2937'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP XÁC NHẬN LƯU THAY ĐỔI KHI ĐÓNG (DIRTY CHECK) */}
      {showUnsavedConfirmModal && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 10050, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowUnsavedConfirmModal(false)}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '92%',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px 24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              position: 'relative',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Nút X đóng popup xác nhận */}
            <button
              type="button"
              onClick={() => setShowUnsavedConfirmModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E2E8F0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
              title="Đóng thông báo (Ở lại)"
            >
              <X size={16} />
            </button>

            {/* Icon cảnh báo / hỏi lưu */}
            <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)'
              }}>
                <AlertTriangle size={32} />
              </div>
            </div>

            {/* Tiêu đề & Thông điệp */}
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: '0 0 10px 0' }}>
              Lưu thay đổi trước khi đóng?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Phiếu kiểm tra <strong style={{ color: '#3E2723' }}>#{selectedTask?.ticket_code || selectedTask?.id}</strong> có những thay đổi chưa được lưu. Bạn có muốn lưu lại trước khi đóng không?
            </p>

            {/* Các nút lựa chọn */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Nút 1: Lưu và đóng */}
              <button
                type="button"
                onClick={handleSaveAndCloseFromConfirm}
                disabled={savingTask}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#059669',
                  border: '1px solid #047857',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: savingTask ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!savingTask) e.currentTarget.style.backgroundColor = '#047857';
                }}
                onMouseLeave={(e) => {
                  if (!savingTask) e.currentTarget.style.backgroundColor = '#059669';
                }}
              >
                <Save size={16} />
                <span>{savingTask ? 'Đang lưu...' : 'Lưu và đóng'}</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Nút 2: Không lưu (Bỏ qua) */}
                <button
                  type="button"
                  onClick={handleDiscardAndCloseFromConfirm}
                  disabled={savingTask}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: savingTask ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!savingTask) e.currentTarget.style.backgroundColor = '#FEE2E2';
                  }}
                  onMouseLeave={(e) => {
                    if (!savingTask) e.currentTarget.style.backgroundColor = '#FEF2F2';
                  }}
                >
                  Không lưu
                </button>

                {/* Nút 3: Ở lại tiếp tục chỉnh sửa */}
                <button
                  type="button"
                  onClick={() => setShowUnsavedConfirmModal(false)}
                  disabled={savingTask}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: savingTask ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!savingTask) e.currentTarget.style.backgroundColor = '#E2E8F0';
                  }}
                  onMouseLeave={(e) => {
                    if (!savingTask) e.currentTarget.style.backgroundColor = '#F1F5F9';
                  }}
                >
                  Ở lại
                </button>
              </div>
            </div>
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
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(16, 185, 129, 0.15)',
                  flexShrink: 0
                }}>
                  <CheckCheck size={22} color="#059669" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.18rem', fontWeight: 700, letterSpacing: '-0.2px' }}>
                    Xác nhận nhanh hồ sơ kiểm tra ĐẠT
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
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
              <div className="batch-quick-controls" style={{
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
              <div className="batch-quick-table-scroll" style={{
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
                      <th style={{ width: '165px', padding: '10px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.78rem' }}>PHIẾU KIỂM TRA</th>
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
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #E2E8F0'
            }}>
              <div style={{ fontSize: '0.84rem', color: '#64748B', fontWeight: 500 }}>
                Đã chọn: <strong style={{ color: '#059669', fontSize: '0.95rem' }}>{selectedBatchIds.size}</strong> / {isBatchFilterActive ? `${filteredBatchTasks.length} phiếu đang lọc` : `${eligibleQuickPassTasks.length} phiếu`}
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
      {/* POPUP HƯỚNG DẪN PHÍM TẮT NHANH (CHEAT SHEET) */}
      {showShortcutsModal && (
        <div className="modal-overlay" onClick={() => setShowShortcutsModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', width: '92%', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}
          >
            {/* HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#F1F5F9',
                  color: '#0F172A',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Keyboard size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                    Phím tắt thao tác nhanh
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
                    Trang Quản lý chất lượng (/admin/quality)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#6B7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* BODY */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* SECTION 1 */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} /> Trong Popup Chi tiết hồ sơ
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {[
                    { key: 'F1 hoặc Enter', desc: 'Xác nhận duyệt hồ sơ (tự động chuyển sang hồ sơ tiếp theo)', color: 'green' },
                    { key: 'Ctrl+S hoặc F8', desc: 'Lưu các thay đổi hồ sơ (không duyệt hoàn tất)', color: 'amber' },
                    { key: 'F2', desc: 'Hủy hồ sơ kiểm tra này', color: 'red' },
                    { key: 'F3', desc: 'Chuyển đổi nhanh kết quả Đạt ↔ Không đạt', color: 'gray' },
                    { key: 'F4', desc: 'Hủy trạng thái trả hàng (nếu đang là trả hàng)', color: 'amber' },
                    { key: 'Ctrl+V', desc: 'Dán ảnh chụp màn hình từ Clipboard vào hồ sơ', color: 'gray' },
                    { key: '← / →', desc: 'Xem hồ sơ trước đó / hồ sơ tiếp theo', color: 'gray' },
                    { key: 'Tab', desc: 'Chuyển đổi giữa 2 tab: Thông tin chung ↔ Chi tiết', color: 'gray' },
                    { key: 'Esc', desc: 'Đóng popup chi tiết', color: 'gray' }
                  ].map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', backgroundColor: '#FAF8F5', borderRadius: '6px', border: '1px solid #EFE6DC' }}>
                      <span style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>{s.desc}</span>
                      <kbd className={`kbd-shortcut kbd-shortcut-${s.color}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2 */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 800, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} /> Màn hình Danh sách chính
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {[
                    { key: 'F1', desc: 'Mở popup duyệt nhanh hàng loạt hồ sơ ĐẠT', color: 'green' },
                    { key: 'F2 hoặc /', desc: 'Focus nhanh vào ô tìm kiếm hồ sơ', color: 'gray' },
                    { key: '↑ / ↓', desc: 'Di chuyển chọn dòng trong danh sách', color: 'gray' },
                    { key: 'Enter', desc: 'Mở xem chi tiết hồ sơ đang chọn', color: 'gray' },
                    { key: 'F5', desc: 'Tải lại / Làm mới danh sách phiếu tồn đọng', color: 'gray' },
                    { key: '?', desc: 'Mở bảng trợ giúp phím tắt này', color: 'gray' }
                  ].map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', backgroundColor: '#FAF8F5', borderRadius: '6px', border: '1px solid #EFE6DC' }}>
                      <span style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>{s.desc}</span>
                      <kbd className={`kbd-shortcut kbd-shortcut-${s.color}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ padding: '12px 20px', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đã hiểu (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityOverviewView;


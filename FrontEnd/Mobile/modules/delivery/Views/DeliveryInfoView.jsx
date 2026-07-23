import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import Tabs from '@mobile/Shared/Views/components/ui/Tabs'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard'
import DataTable from '@mobile/Shared/Views/components/ui/DataTable'
import PalletCardModal from '@modules/delivery/Views/components/PalletCardModal'
import { Plus, Truck, Package, Filter, ArrowDownWideNarrow, History, X, Check, ClipboardCheck, Search, ArrowLeftRight, FileSpreadsheet } from 'lucide-react'
import useAuthStore from '@modules/auth/Models/authModel'
import { usePlanController } from '@modules/production/Controllers/planController'
import { useWebSocket } from '@shared/hooks/useWebSocket'
import useUiStore from '@shared/store/uiStore'
import { useDeliveryController } from '@modules/delivery/Controllers/deliveryController'
import * as XLSX from 'xlsx'

// Helper trích xuất số Cont từ mã PO (Ví dụ "APT-0060-09" -> "APT-0060")
const getContName = (orderName) => {
  if (!orderName) return '';
  const parts = orderName.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return orderName;
};// Helper định dạng ngày giờ kiểm tra (Ví dụ "15:26 04/06/2026")
const formatInspectedAt = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    const pad = (num) => String(num).padStart(2, '0');
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    const date = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    
    return `${hours}:${mins} ${date}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};
// Global memory cache to implement Stale-While-Revalidate pattern and speed up navigation back
const deliveryInfoCache = {};

/**
 * MH2 - Thông tin bàn giao
 * DeliveryInfo Screen
 * Màn hình Thông tin bàn giao làm theo thiết kế mới.
 */

const getInspectionRoute = (insp) => {
  if (!insp) return '/inspection-first-article';
  const stageNorm = (insp.stage || '').toLowerCase();
  if (stageNorm.includes('đầu vào') || stageNorm.includes('inbound') || stageNorm.includes('dau vao')) {
    return '/input-inspection';
  }
  return '/inspection-first-article';
};

const DeliveryInfo = () => {
  const { plans, fetchPlans, fetchDeliveriesByPlan, fetchPlanDetail } = usePlanController()
  const { fetchReturnsByPlan, fetchInspectionsByPlan, fetchPartProducts, fetchDeliveryDetail } = useDeliveryController()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, permissions } = useAuthStore()
  const [activeTab, setActiveTab] = useState('plan')
  const [selectedPlanId, setSelectedPlanId] = useState(() => location.state?.planId || '')
  const [selectedCont, setSelectedCont] = useState('ALL')
  const [currentPlan, setCurrentPlan] = useState(null)
  
  const pageHeaderRef = useRef(null)
  const stickyHeaderRef = useRef(null)
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(150)

  useEffect(() => {
    if (!stickyHeaderRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setStickyHeaderHeight(entry.target.offsetHeight);
      }
    });
    observer.observe(stickyHeaderRef.current);
    return () => observer.disconnect();
  }, []);
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [returns, setReturns] = useState([]) // Danh sách phiếu trả hàng
  // Map kết quả KT: key = part_name.toLowerCase(), value = inspection object
  const [inspectionMap, setInspectionMap] = useState({})
  const [visibleCount, setVisibleCount] = useState(30)
  const [visibleOrderCount, setVisibleOrderCount] = useState(10) // Pagination cho Orders
 
  // Bộ lọc nâng cao cho danh sách phiếu bàn giao
  const [typeFilter, setTypeFilter] = useState('ALL') // 'ALL' | 'HANDOVER' | 'RECEIVE'
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchAndFilter, setShowSearchAndFilter] = useState(false)
 
  // State cho Thẻ Pallet Modal
  const [palletModal, setPalletModal] = useState({ isOpen: false, data: null })
  const [inspectionsModal, setInspectionsModal] = useState({ isOpen: false, partName: '', insps: [], navState: {} })
  const [palletPartProducts, setPalletPartProducts] = useState([])
 
  // [DEBUG] Theo dõi trạng thái kết nối WS
  const [wsStatus, setWsStatus] = useState('connecting')
 
  // Xác định quyền QC để đổi logic "Tạo nhanh" - Đồng bộ với DeliveryReceive
  const userRoleStr = [
    user?.permission_description,
    user?.permission_name,
    user?.role_description,
    user?.role_name,
    user?.full_name,
    user?.username
  ].filter(Boolean).join(' ').toLowerCase().normalize('NFC');
 
  const isQC = userRoleStr.includes('qc') || userRoleStr.includes('kiểm tra');
  const isAdmin = userRoleStr.includes('admin') || userRoleStr.includes('it') || userRoleStr.includes('bgd');
  const isProduction = userRoleStr.includes('sản xuất') || userRoleStr.includes('sx');
  
  const userPerm = permissions?.['mobile_delivery-create'];
  const hasCreatePermission = isAdmin || (userPerm && userPerm !== 'none' && userPerm.split(',').map(p => p.trim()).includes('create'));

  const userStageName = (isAdmin 
    ? (user?.activeStageName || '') 
    : (user?.activeStageName || user?.stage_name || '')
  ).trim();

  const userStageDesc = (isAdmin
    ? (user?.activeStageDescription === 'Tất cả công đoạn' ? '' : (user?.activeStageDescription || ''))
    : (user?.activeStageDescription === 'Tất cả công đoạn' ? '' : (user?.activeStageDescription || user?.stage_description || user?.stage_name || ''))
  ).trim();

  const showStageSelect = isAdmin || (user?.stageNames && user.stageNames.length > 1);
  const [headerHeight, setHeaderHeight] = useState(showStageSelect ? 94 : 58);
  useEffect(() => {
    if (!pageHeaderRef.current) return;
    setHeaderHeight(pageHeaderRef.current.offsetHeight);
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeaderHeight(entry.target.offsetHeight);
      }
    });
    observer.observe(pageHeaderRef.current);
    return () => observer.disconnect();
  }, []);

  const stickyTop = `${headerHeight}px`;
  
  const headerOffset = headerHeight;
  const cardStickyOffset = headerOffset + stickyHeaderHeight;
  const tableHeaderStickyOffset = cardStickyOffset + 56; // 56px is the estimated height of the card header

  // Hàm so sánh linh hoạt hỗ trợ viết tắt và so khớp mờ cho QC
  const isMatchStage = (userS, deliveryS) => {
    if (!userS || !deliveryS) return false;
    const u = String(userS || '').toLowerCase().normalize('NFC').replace(/\s+/g, '');
    const d = String(deliveryS || '').toLowerCase().normalize('NFC').replace(/\s+/g, '');
    // Bỏ tiền tố 'qc' ra khỏi stage của user khi so khớp với stage sản xuất
    const uClean = u.replace(/^qc/, '');
    return uClean.includes(d) || d.includes(uClean);
  };

  // Tính số lượng phiếu cần xử lý (badge báo đỏ)
  const pendingActionBadge = useMemo(() => {
    if (!Array.isArray(deliveries)) return 0;
    const count = deliveries.filter(d => {
      const isMyDelivery = isMatchStage(userStageDesc, d.delivery_stage);
      const isMyReceiving = isMatchStage(userStageDesc, d.receiving_stage);

      if (isMyDelivery && d.status === 'Chờ Xác Nhận') return true;
      if (isMyReceiving) {
        if (isQC) return d.status === 'Chờ Kiểm Tra';
        return d.status === 'Chờ Nhận Hàng';
      }
      return false;
    }).length;
    
    console.log('[Badge Calculation] isQC:', isQC, 'userStageDesc:', userStageDesc, 'pendingActionBadge:', count);
    return count;
  }, [deliveries, userStageDesc, isQC]);

  const tabs = [
    { id: 'plan', label: 'Kế hoạch', icon: ClipboardCheck, badge: null },
    { id: 'delivery', label: 'Bàn giao', icon: Truck, badge: pendingActionBadge > 0 ? pendingActionBadge : null }
  ]

  // [Realtime Fallback] Lắng nghe thông báo từ useUiStore để tự động làm mới ngay cả khi WebSocket lỗi
  const latestNotifId = useUiStore(state => state.latestNotificationId);
  useEffect(() => {
    if (latestNotifId && selectedPlanId) {
      console.log('[Fallback Refresh] New notification detected, refreshing list...');
      fetchDeliveriesByPlan(selectedPlanId).then(list => {
        setDeliveries(list || []);
      });
    }
  }, [latestNotifId, selectedPlanId, fetchDeliveriesByPlan]);
  useEffect(() => {
    const loadData = async () => {
      const stage = userStageDesc || userStageName || ''
      await fetchPlans(stage)
      setLoading(false)
    }
    loadData()
  }, [fetchPlans, userStageDesc, userStageName])

  const orderMatchesCont = useCallback((orderId, targetCont) => {
    if (!orderId) return false;
    const plan = plans.find(p => p.id.toString() === selectedPlanId);
    if (!plan || !plan.orders) return false;
    const order = plan.orders.find(o => o.id.toString() === orderId.toString());
    return order ? getContName(order.name) === targetCont : false;
  }, [plans, selectedPlanId]);

  const selectedOrderIdsString = useMemo(() => {
    if (!selectedCont || selectedCont === 'ALL') return null;
    const plan = plans.find(p => p.id.toString() === selectedPlanId);
    if (!plan || !plan.orders) return null;
    const matchedOrders = plan.orders.filter(o => getContName(o.name) === selectedCont);
    return matchedOrders.map(o => o.id).join(',');
  }, [plans, selectedPlanId, selectedCont]);

  useEffect(() => {
    const loadDeliveries = async () => {
      if (selectedPlanId) {
        const cacheKey = `${selectedPlanId}_${selectedOrderIdsString || 'all'}`
        const cached = deliveryInfoCache[cacheKey]

        if (cached) {
          // Render cached data immediately to avoid loading spinner
          setCurrentPlan(cached.currentPlan)
          setDeliveries(cached.deliveries)
          setReturns(cached.returns)
          setInspectionMap(cached.inspectionMap)
          setLoading(false)
        } else {
          setLoading(true)
        }

        const rawStage = userStageDesc || userStageName || ''
        const stageToFilter = rawStage.toLowerCase().includes('đóng gói') ? null : rawStage

        try {
          console.log('[DEBUG Frontend] Calling fetchPlanDetail with selectedOrderIdsString:', selectedOrderIdsString);
          const detail = await fetchPlanDetail(selectedPlanId, stageToFilter, null, false, selectedOrderIdsString)
          console.log('[DEBUG Frontend] fetchPlanDetail returned detail:', detail);

          const deliveryList = await fetchDeliveriesByPlan(selectedPlanId)

          // Load danh sách phiếu trả hàng
          let returnsData = []
          try {
            returnsData = await fetchReturnsByPlan(selectedPlanId)
          } catch (err) {
            console.error('Lỗi tải danh sách trả hàng:', err)
          }

          // Load kết quả kiểm tra (nhẹ, giữ lại)
          const inspectionsData = await fetchInspectionsByPlan(selectedPlanId, stageToFilter || '')
          const map = {}
          ;(inspectionsData || []).forEach(insp => {
            const key = (insp.part_name || '').trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ')
            if (!map[key]) map[key] = []
            map[key].push(insp)
          })

          // Update state
          setCurrentPlan(detail)
          setDeliveries(deliveryList || [])
          setReturns(returnsData || [])
          setInspectionMap(map)

          // Save cache
          deliveryInfoCache[cacheKey] = {
            currentPlan: detail,
            deliveries: deliveryList || [],
            returns: returnsData || [],
            inspectionMap: map
          }
        } catch (err) {
          console.error('[Load Error]:', err)
        } finally {
          setLoading(false)
        }
      }
    }
    loadDeliveries()
  }, [selectedPlanId, selectedOrderIdsString, userStageName, userStageDesc, fetchDeliveriesByPlan, fetchPlanDetail])

  // Reset phân trang và Cont khi đổi KHSX
  useEffect(() => {
    setVisibleCount(30)
    setVisibleOrderCount(10)
    setSelectedCont('ALL')
  }, [selectedPlanId])

  // Hàm rút gọn tên kế hoạch để hiển thị trên Mobile
  const formatPlanLabel = (name) => {
    if (!name) return 'Không tên';
    if (name.includes('KẾ HOẠCH SẢN XUẤT')) {
      // Tìm các chuỗi có định dạng dd/mm
      const dates = name.match(/\d{2}\/\d{2}/g);
      if (dates && dates.length >= 2) {
        return `KHSX: ${dates[0]} - ${dates[1]}`;
      }
      return name.replace('KẾ HOẠCH SẢN XUẤT - ', 'KHSX: ');
    }
    return name;
  };

  // Sắp xếp plans theo Mới nhất (Năm giảm, Tháng giảm)
  const sortedPlans = Array.isArray(plans) ? [...plans].sort((a, b) => {
    const yearA = a.year || 0;
    const yearB = b.year || 0;
    const monthA = a.month || 0;
    const monthB = b.month || 0;
    
    if (yearA !== yearB) return yearB - yearA;
    return monthB - monthA;
  }) : [];

  // Map plans ra dữ liệu select với kiểm tra an toàn
  const planOptions = sortedPlans.map(p => ({
    label: formatPlanLabel(p.name),
    fullLabel: p.name, // Lưu lại tên đầy đủ nếu cần dùng sau này
    value: p.id ? p.id.toString() : ''
  }))

  const contOptions = useMemo(() => {
    const plan = plans.find(p => p.id.toString() === selectedPlanId)
    if (!plan || !plan.orders) return [{ label: 'Tất cả Cont', value: 'ALL' }]
    
    const conts = new Set()
    plan.orders.forEach(o => {
      const contName = getContName(o.name)
      if (contName) conts.add(contName)
    })
    
    const sortedConts = Array.from(conts).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    })
    
    return [
      { label: 'Tất cả Cont', value: 'ALL' },
      ...sortedConts.map(c => ({
        label: c,
        value: c
      }))
    ]
  }, [plans, selectedPlanId])

  /**
   * [Realtime] Hàm làm mới toàn bộ dữ liệu trang
   * Được gọi khi: Chọn KHSX mới, Chuyển Tab hoặc nhận tín hiệu WebSocket
   */
  const refreshData = useCallback(async (planId) => {
    const targetId = planId || selectedPlanId;
    if (!targetId) return;

    const stageToFilter = userStageDesc || userStageName;
    
    try {
      console.log('[DEBUG Frontend] refreshData - Calling fetchPlanDetail with selectedOrderIdsString:', selectedOrderIdsString);
      // [OPTIMIZED] Gọi song song để tăng tốc độ phản hồi
      const [list, detail, returnsData] = await Promise.all([
        fetchDeliveriesByPlan(targetId),
        fetchPlanDetail(targetId, stageToFilter, null, false, selectedOrderIdsString),
        fetchReturnsByPlan(targetId).catch(err => {
          console.error('Lỗi tải danh sách trả hàng trong refreshData:', err);
          return [];
        })
      ]);
      
      if (list) setDeliveries(list);
      if (detail) setCurrentPlan(detail);
      if (returnsData) setReturns(returnsData);
      
      // Load kết quả kiểm tra (giữ lại logic cũ)
      const inspectionsData = await fetchInspectionsByPlan(targetId, stageToFilter || '');
      const map = {};
      (inspectionsData || []).forEach(insp => {
        const key = (insp.part_name || '').trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
        if (!map[key]) map[key] = [];
        map[key].push(insp);
      });
      setInspectionMap(map);
    } catch (err) {
      console.error('[Refresh Error]:', err);
    }
  }, [selectedPlanId, selectedOrderIdsString, userStageDesc, userStageName, fetchDeliveriesByPlan, fetchPlanDetail]);

  const handleShowPalletCard = async (ticket) => {
    try {
      const matchedDelivery = deliveries.find(d => d.id === ticket.id)
      if (!matchedDelivery) return

      setLoading(true)
      const fullDetail = await fetchDeliveryDetail(ticket.id)

      const partProductsData = await fetchPartProducts(selectedPlanId, matchedDelivery.part_name || '', matchedDelivery.specification || '')
      setPalletPartProducts(partProductsData || [])

      const palletData = {
        ...matchedDelivery,
        ...fullDetail,
        plan_name: currentPlan?.name || '',
        user_name: user?.name || user?.username || ''
      }
      setPalletModal({ isOpen: true, data: palletData })
    } catch (error) {
      console.error('Error loading pallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    if (activeTab === 'plan') {
      if (!filteredAndSortedParts || filteredAndSortedParts.length === 0) {
        alert("Không có dữ liệu kế hoạch để xuất Excel.");
        return;
      }
      const headers = [
        "STT",
        "Tên Chi Tiết",
        "Số Lượng Kế Hoạch (BOM)",
        "Số Lượng Thực Giao",
        "Số Lượng Dư Thừa (+dư)",
        "Trạng Thái",
        "Ngày"
      ];
      const rows = filteredAndSortedParts.map((row, idx) => [
        idx + 1,
        row.displayName || row.name || "",
        row.quantity || 0,
        row.delivered - (row.residual || 0),
        row.residual || 0,
        row.status || "",
        row.date || ""
      ]);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 8 },   // STT
        { wch: 30 },  // Tên Chi Tiết
        { wch: 25 },  // Số Lượng Kế Hoạch (BOM)
        { wch: 20 },  // Số Lượng Thực Giao
        { wch: 20 },  // Số Lượng Dư Thừa (+dư)
        { wch: 18 },  // Trạng Thái
        { wch: 15 }   // Ngày
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Tiến độ chi tiết linh kiện");
      XLSX.writeFile(wb, `Tien_do_linh_kien_${new Date().toISOString().slice(0,10)}.xlsx`);
    } else {
      if (!filteredAndSortedDeliveries || filteredAndSortedDeliveries.length === 0) {
        alert("Không có dữ liệu bàn giao để xuất Excel.");
        return;
      }
      const headers = [
        "STT",
        "Mã Phiếu",
        "Tên Chi Tiết",
        "Quy Cách",
        "Công Đoạn Giao",
        "Công Đoạn Nhận",
        "Số Lượng Giao",
        "Số Lượng Nhận",
        "Số Lượng Trả",
        "Số Lượng Lỗi",
        "Trạng Thái",
        "Thời Gian Lập",
        "Ghi Chú"
      ];
      const rows = filteredAndSortedDeliveries.map((row, idx) => [
        idx + 1,
        `DLV-${row.id}`,
        row.part_name || "",
        row.specification || "",
        row.delivery_stage || "",
        row.receiving_stage || "",
        row.quantity_total || 0,
        row.quantity_received || 0,
        row.quantity_returned || 0,
        row.quantity_error || 0,
        row.status || "",
        row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : "",
        row.note || ""
      ]);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 8 },   // STT
        { wch: 15 },  // Mã Phiếu
        { wch: 25 },  // Tên Chi Tiết
        { wch: 20 },  // Quy Cách
        { wch: 20 },  // Công Đoạn Giao
        { wch: 20 },  // Công Đoạn Nhận
        { wch: 15 },  // Số Lượng Giao
        { wch: 15 },  // Số Lượng Nhận
        { wch: 15 },  // Số Lượng Trả
        { wch: 15 },  // Số Lượng Lỗi
        { wch: 18 },  // Trạng Thái
        { wch: 22 },  // Thời Gian Lập
        { wch: 30 }   // Ghi Chú
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Danh sách bàn giao");
      XLSX.writeFile(wb, `Danh_sach_ban_giao_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
  };

  const handleSocketMessage = useCallback((message) => {
    console.log('[WS Message Received]:', message);
    console.log('[WS Debug] isQC:', isQC, 'userStageDesc:', userStageDesc, 'selectedPlanId:', selectedPlanId);
    
    // Các sự kiện cần tải lại dữ liệu: 
    // - NEW_DELIVERY: Có người vừa tạo phiếu mới
    // - QC_CONFIRMED: QC vừa xác nhận đạt/không đạt
    // - DELIVERY_RECEIVED: Bộ phận nhận đã xác nhận nhận hàng
    const refreshEvents = ['NEW_DELIVERY', 'QC_CONFIRMED', 'DELIVERY_RECEIVED', 'UPDATE_DELIVERY'];
    
    if (refreshEvents.includes(message.type)) {
      const planToFetch = selectedPlanId || (planOptions.length > 0 ? planOptions[0].value : null);
      if (planToFetch) {
        console.log('[Realtime] Triggering auto-refresh for Plan:', planToFetch);
        refreshData(planToFetch);
      } else {
        console.log('[Realtime] No plan to fetch, skipping refresh');
      }
    }
  }, [selectedPlanId, planOptions, refreshData, isQC, userStageDesc]);

  // [Realtime] Lắng nghe sự kiện từ WebSocket
  const socket = useWebSocket(handleSocketMessage);

  useEffect(() => {
    if (!socket) return;
    const updateStatus = () => {
      if (socket.readyState === WebSocket.OPEN) setWsStatus('online');
      else if (socket.readyState === WebSocket.CONNECTING) setWsStatus('connecting');
      else setWsStatus('offline');
    };

    updateStatus();
    socket.addEventListener('open', updateStatus);
    socket.addEventListener('close', updateStatus);
    socket.addEventListener('error', updateStatus);

    return () => {
      socket.removeEventListener('open', updateStatus);
      socket.removeEventListener('close', updateStatus);
      socket.removeEventListener('error', updateStatus);
    };
  }, [socket]);

  // Gán giá trị mặc định khi plans đã tải
  useEffect(() => {
    if (planOptions.length > 0 && !selectedPlanId) {
      setSelectedPlanId(planOptions[0].value)
    }
  }, [planOptions, selectedPlanId])

  // State cho bộ lọc & sắp xếp
  const [filterModal, setFilterModal] = useState(false)
  const [sortModal, setSortModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('DEFAULT')

  // Reset bộ lọc & sắp xếp khi chuyển tab
  useEffect(() => {
    setStatusFilter('ALL')
    setTypeFilter('ALL')
    setSearchQuery('')
    setSortOrder(activeTab === 'plan' ? 'DEFAULT' : 'DATE_DESC')
  }, [activeTab])

  // [OPTIMIZED] Hàm gom nhóm đã được tối ưu, tính toán tại Backend
  const getAggregatedParts = useCallback(() => {
    if (!currentPlan) return []
    const partMap = {}

    if (currentPlan.bom_details && Array.isArray(currentPlan.bom_details.handover)) {
      currentPlan.bom_details.handover.forEach(item => {
        const key = item.displayName || item.name;

        if (!partMap[key]) {
          partMap[key] = {
            ...item,
            displayName: key,
            quantity: item.quantity || 0,
            delivered: item.delivered || 0,
            residual: item.residual || 0,
            specifications: item.specification 
              ? [{ spec: item.specification, orderNames: item.order_names || [] }] 
              : [],
            date: (currentPlan.finished_date && !isNaN(new Date(currentPlan.finished_date).getTime()))
              ? new Date(currentPlan.finished_date).toLocaleDateString('vi-VN')
              : new Date().toLocaleDateString('vi-VN')
          };
        } else {
          // Cộng dồn số lượng Kế hoạch và Thực tế cho các chi tiết cùng tên
          partMap[key].quantity += (item.quantity || 0);
          partMap[key].delivered += (item.delivered || 0);
          partMap[key].residual += (item.residual || 0);
          if (item.specification) {
            const existingSpecObj = partMap[key].specifications.find(s => s.spec === item.specification);
            if (existingSpecObj) {
              // Gộp orderNames mới vào, tránh trùng lặp
              const newNames = item.order_names || [];
              newNames.forEach(name => {
                if (!existingSpecObj.orderNames.includes(name)) {
                  existingSpecObj.orderNames.push(name);
                }
              });
            } else {
              partMap[key].specifications.push({ spec: item.specification, orderNames: item.order_names || [] });
            }
          }
        }
      });
    }

    // Tính toán trạng thái chung cho tất cả các phần tử trong partMap
    Object.values(partMap).forEach(part => {
      let currentStatus = 'Chờ giao';
      const actualDelivered = part.delivered - (part.residual || 0);
      if (actualDelivered >= part.quantity) {
        currentStatus = 'Hoàn thành';
      } else if (actualDelivered > 0) {
        currentStatus = 'Đang giao';
      }
      part.status = currentStatus;
    });

    return Object.values(partMap);
  }, [currentPlan])

  const displayOrders = useMemo(() => {
    if (!currentPlan?.orders) return [];
    
    const userStageNorm = userStageDesc.toLowerCase().trim();
    
    let filteredOrders = [];
    currentPlan.orders.forEach(o => {
        const validProducts = (o.products || []).filter(p => {
             const checkTree = (nodes) => {
                 if (!nodes || !Array.isArray(nodes)) return false;
                 for (let n of nodes) {
                     const inS = (n.input_stage || '').toLowerCase().trim();
                     const outS = (n.output_stage || '').toLowerCase().trim();
                     if (inS === userStageNorm || outS === userStageNorm) return true;
                     if (inS.includes(userStageNorm) || outS.includes(userStageNorm)) return true;
                     if (checkTree(n.parts)) return true;
                 }
                 return false;
             }
             // Nếu user không có stage (admin), hoặc là công đoạn Đóng gói/ĐG, hoặc product có chứa stage trong BOM tree
             return !userStageNorm || userStageNorm.includes('đóng gói') || userStageNorm.includes('đg') || checkTree(p.bom_details);
        });
        
        if (validProducts.length > 0) {
            filteredOrders.push({
                ...o,
                products: validProducts
            });
        }
    });

    let result = [...filteredOrders];

    if (selectedCont && selectedCont !== 'ALL') {
      result = result.filter(o => getContName(o.name) === selectedCont);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => {
        const orderMatch = (o.name || '').toLowerCase().includes(q) || (o.customer || '').toLowerCase().includes(q);
        const hasProductMatch = o.products?.some(p => 
          (p.name || '').toLowerCase().includes(q) || 
          (p.sku || '').toLowerCase().includes(q)
        );
        return orderMatch || hasProductMatch;
      });
    }
    return result;
  }, [currentPlan, searchQuery, userStageDesc, selectedCont]);

  const pagedDisplayOrders = useMemo(() => {
    return displayOrders.slice(0, visibleOrderCount);
  }, [displayOrders, visibleOrderCount]);

  const aggregatedParts = useMemo(() => {
    return getAggregatedParts()
  }, [getAggregatedParts])

  const filteredAndSortedParts = useMemo(() => {
    let result = [...aggregatedParts]

    // 1. Lọc theo trạng thái
    if (statusFilter !== 'ALL') {
      result = result.filter(part => part.status === statusFilter)
    }

    // 1.5 Lọc theo tìm kiếm nhanh (searchQuery)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(part => 
        (part.displayName || part.name || '').toLowerCase().includes(q)
      );
    }

    // 2. Sắp xếp
    if (sortOrder === 'NAME_ASC') {
      result.sort((a, b) => (a.displayName || a.name || '').localeCompare(b.displayName || b.name || ''))
    } else if (sortOrder === 'NAME_DESC') {
      result.sort((a, b) => (b.displayName || b.name || '').localeCompare(a.displayName || a.name || ''))
    } else if (sortOrder === 'QTY_DESC') {
      result.sort((a, b) => {
        const valA = a.delivered || 0;
        const valB = b.delivered || 0;
        if (valA !== valB) return valB - valA;
        return (b.quantity || 0) - (a.quantity || 0);
      });
    } else if (sortOrder === 'QTY_ASC') {
      result.sort((a, b) => {
        const valA = a.delivered || 0;
        const valB = b.delivered || 0;
        if (valA !== valB) return valA - valB;
        return (a.quantity || 0) - (b.quantity || 0);
      });
    }

    return result
  }, [aggregatedParts, statusFilter, sortOrder, searchQuery])

  const displayParts = useMemo(() => {
    return filteredAndSortedParts.slice(0, visibleCount)
  }, [filteredAndSortedParts, visibleCount])

  const filteredAndSortedDeliveries = useMemo(() => {
    let result = deliveries;

    // Lọc theo Cont được chọn
    if (selectedCont && selectedCont !== 'ALL') {
      result = result.filter(d => {
        if (d.order_id && orderMatchesCont(d.order_id, selectedCont)) return true;
        if (d.details && d.details.some(det => det.order_id && orderMatchesCont(det.order_id, selectedCont))) return true;
        return false;
      });
    }

    // 1. Lọc theo trạm của user và phân loại phiếu (Giao đi / Nhận về)
    if (isAdmin) {
      if (userStageDesc) {
        result = result.filter(d => {
          const matchesOutgoing = isMatchStage(userStageDesc, d.delivery_stage);
          const matchesIncoming = isMatchStage(userStageDesc, d.receiving_stage);

          if (typeFilter === 'HANDOVER') {
            return matchesOutgoing;
          } else if (typeFilter === 'RECEIVE') {
            return matchesIncoming;
          } else {
            return matchesOutgoing || matchesIncoming;
          }
        });
      }
    } else {
      const assignedStageDescs = [
        ...(user?.stageDescriptions || []),
        user?.stage_description,
        userStageDesc
      ].filter(Boolean).map(s => s.trim().toLowerCase());

      const assignedStageNames = [
        ...(user?.stageNames || []),
        user?.stage_name,
        userStageName
      ].filter(Boolean).map(s => s.trim().toLowerCase());

      const allAssignedStages = Array.from(new Set([...assignedStageDescs, ...assignedStageNames]));

      result = result.filter(d => {
        // Kiểm tra xem ID người dùng có khớp với người giao, người nhận hay QC không
        const isUserRelated = 
          (d.sx_delivery && d.sx_delivery === user?.id) || 
          (d.sx_receipt && d.sx_receipt === user?.id) || 
          (d.qc_receipt && d.qc_receipt === user?.id);

        // Kiểm tra xem công đoạn của phiếu có thuộc các công đoạn được gán của user không
        const isStageRelated = allAssignedStages.some(stageStr => 
          isMatchStage(stageStr, d.delivery_stage) || 
          isMatchStage(stageStr, d.receiving_stage)
        );

        if (!isUserRelated && !isStageRelated) {
          return false;
        }

        // Lọc tiếp theo Giao đi (HANDOVER) / Nhận về (RECEIVE) dựa trên công đoạn hoạt động hiện tại (userStageDesc)
        if (userStageDesc) {
          const matchesOutgoing = isMatchStage(userStageDesc, d.delivery_stage);
          const matchesIncoming = isMatchStage(userStageDesc, d.receiving_stage);

          if (typeFilter === 'HANDOVER') {
            return matchesOutgoing;
          } else if (typeFilter === 'RECEIVE') {
            return matchesIncoming;
          }
        }
        
        return true;
      });
    }

    // 2. Lọc theo trạng thái
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'Hoàn thành') {
        result = result.filter(d => d.status === 'Hoàn thành' || d.status === 'Đã Nhận');
      } else {
        result = result.filter(d => d.status === statusFilter);
      }
    }

    // 3. Lọc theo ô tìm kiếm nhanh (searchQuery)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d => {
        const idMatch = `dlv-${d.id}`.includes(q) || String(d.id).includes(q);
        const partMatch = (d.part_name || '').toLowerCase().includes(q);
        const specMatch = (d.specification || '').toLowerCase().includes(q);
        const stageMatch = (d.delivery_stage || '').toLowerCase().includes(q) || (d.receiving_stage || '').toLowerCase().includes(q);
        return idMatch || partMatch || specMatch || stageMatch;
      });
    }

    // 4. Sắp xếp
    const getStatusPriority = (status) => {
      const s = (status || '').toLowerCase();
      if (s.includes('chờ nhận') || s.includes('chờ kiểm') || s.includes('chờ xác')) {
        return 1;
      }
      return 0;
    };

    if (sortOrder === 'DATE_DESC') {
      result.sort((a, b) => {
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) return pB - pA;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (sortOrder === 'DATE_ASC') {
      result.sort((a, b) => {
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) return pB - pA;
        return new Date(a.created_at) - new Date(b.created_at);
      });
    } else if (sortOrder === 'QTY_DESC') {
      result.sort((a, b) => {
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) return pB - pA;
        return (b.quantity_received || b.quantity_total || 0) - (a.quantity_received || a.quantity_total || 0);
      });
    } else if (sortOrder === 'QTY_ASC') {
      result.sort((a, b) => {
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) return pB - pA;
        return (a.quantity_received || a.quantity_total || 0) - (b.quantity_received || b.quantity_total || 0);
      });
    } else {
      result.sort((a, b) => {
        const pA = getStatusPriority(a.status);
        const pB = getStatusPriority(b.status);
        if (pA !== pB) return pB - pA;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }

    return result
  }, [deliveries, userStageDesc, typeFilter, statusFilter, searchQuery, sortOrder, isAdmin, userStageName, user, selectedCont, orderMatchesCont])

  // Helper cho màu sắc trạng thái (Đồng bộ với Tracking)
  const getStatusColor = (status) => {
    switch (status) {
      case 'Chờ Xác Nhận': return { bg: '#fef2f2', border: '#fecaca', text: '#ef4444' };
      case 'Chờ Kiểm Tra':
        return { bg: '#eff6ff', border: '#bfdbfe', text: '#3b82f6' };
      case 'Chờ Nhận Hàng': return { bg: '#fff7ed', border: '#fed7aa', text: '#f97316' };
      case 'Hoàn thành':
      case 'Đã Nhận':
        return { bg: '#f0fdf4', border: '#bbf7d0', text: '#22c55e' };
      default: return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' };
    }
  };

  const tableColumns = [
    {
      header: 'chi tiết',
      key: 'name',
      render: (row) => (
        <div style={{ fontWeight: '700', color: 'var(--text-main)', padding: '8px 0', textAlign: 'left' }}>
          {row.displayName || row.name}
        </div>
      )
    },
    {
      header: 'Số lượng',
      key: 'plan_qty',
      nowrap: true,
      render: (row) => {
        const actualDelivered = row.delivered - (row.residual || 0);
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '800', color: 'var(--accent-color)' }}>{actualDelivered}</div>
            {row.residual > 0 && (
              <div style={{ fontSize: '0.62rem', color: '#b45309', fontWeight: '800', marginTop: '-2px' }}>
                +{row.residual} dư
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', marginTop: '2px' }}>KH: {row.quantity}</div>
          </div>
        );
      }
    },
    {
      header: 'KT',
      key: 'kt',
      nowrap: true,
      render: (row) => {
        const key = (row.displayName || row.name || '').trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
        const allInsps = inspectionMap[key] || [];
        const partName = row.displayName || row.name;
        const stageToFilter = userStageDesc || userStageName;
        const isAllCont = !selectedCont || selectedCont === 'ALL';

        // Lọc inspections theo Cont đã chọn
        const insps = isAllCont 
          ? allInsps 
          : allInsps.filter(insp => {
              if (!insp.cont_name) return true; // Bản ghi cũ (không có cont_name) luôn hiển thị
              return getContName(insp.cont_name) === selectedCont;
            });

        const resolvedFallbackCont = isAllCont
          ? (row.specifications?.[0]?.orderNames?.[0] || currentPlan?.orders?.[0]?.name || currentPlan?.name || '')
          : selectedCont;
        
        const navState = { 
          partName, 
          planId: selectedPlanId, 
          stage: stageToFilter,
          contName: resolvedFallbackCont,
          specifications: row.specifications || [],
          inspections: insps
        };

        // [NEW] Phân quyền hiển thị: Ưu tiên nhận diện QC trước, sau đó mới đến Sản xuất
        const uRole = (user?.role_name || '').toLowerCase();
        const uPerm = (user?.permission_name || '').toLowerCase();
        const uStage = userStageDesc.toLowerCase();
        
        // Nếu là QC hoặc Quản lý chất lượng -> Có toàn quyền KT
        const isQC = uRole.includes('qc') || uRole.includes('chất lượng') || 
                     uPerm.includes('qc') || uPerm.includes('chất lượng');
        
        // Nếu KHÔNG PHẢI QC -> Chỉ được xem (tương đương Sản xuất)
        const isProduction = !isQC;

        const btnBase = {
          width: 'clamp(50px, 18vw, 65px)',
          padding: 'clamp(3px, 1vw, 5px) 0',
          borderRadius: '8px',
          fontWeight: '800',
          fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          border: 'none',
          display: 'block',
          position: 'relative'
        };

        // Helper: Trích số Cont từ "Cont 60" → "60"
        const getContNum = (contName) => {
          if (!contName) return '';
          const parts = contName.split('-');
          if (parts.length >= 2) {
            return `${parts[0]}-${parts[1]}`;
          }
          return contName;
        };

        // Helper: Render badge Cont ở góc dưới
        const renderContBadge = (insp) => {
          if (!isAllCont) return null; // Không hiển thị badge khi đã chọn Cont cụ thể
          if (!insp.cont_name) return null; // Không hiển thị badge khi chưa gắn Cont
          const contNum = getContNum(insp.cont_name);
          return (
            <span style={{
              position: 'absolute',
              bottom: '1px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.45)',
              color: '#fff',
              fontSize: '0.48rem',
              fontWeight: '900',
              borderRadius: '3px',
              padding: '0px 2px',
              lineHeight: '1.2',
              whiteSpace: 'nowrap'
            }}>
              {contNum}
            </span>
          );
        };

        // Lấy 1 cái mới nhất duy nhất
        const newestInsp = insps.length > 0 ? insps[insps.length - 1] : null;
        const hasMore = insps.length > 1;
        const moreCount = insps.length - 1;

        const showMoreBtn = hasMore && (
          <button
            onClick={() => setInspectionsModal({ isOpen: true, partName, insps, navState })}
            style={{
              ...btnBase,
              background: '#f1f5f9',
              color: '#475569',
              border: '1.2px dashed #cbd5e1',
              padding: '2.5px 0',
              fontSize: '0.62rem',
              fontWeight: '800'
            }}
          >
            +{moreCount} xem
          </button>
        );

        if (isProduction) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
              {insps.length === 0 ? (
                <div style={{ 
                  padding: 'clamp(4px, 1vw, 6px) clamp(4px, 1vw, 8px)', 
                  borderRadius: '6px', 
                  fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)', 
                  fontWeight: '800',
                  backgroundColor: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0',
                  width: 'clamp(50px, 18vw, 65px)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  Chưa KT
                </div>
              ) : (
                <>
                  {(() => {
                    const isDat = newestInsp.result === 'Đạt';
                    return (
                      <button
                        onClick={() => navigate(getInspectionRoute(newestInsp), { state: { ...navState, viewOnly: true, inspection: newestInsp } })}
                        style={{ ...btnBase, background: isDat ? '#86efac' : '#fca5a5', color: isDat ? '#14532d' : '#7f1d1d' }}
                      >
                        {isDat ? '✓ Đạt' : '✗ KĐ'}
                        {renderContBadge(newestInsp)}
                      </button>
                    );
                  })()}
                  {showMoreBtn}
                </>
              )}
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            {newestInsp && (() => {
              const isDat = newestInsp.result === 'Đạt';
              return (
                <button
                  onClick={() => navigate(getInspectionRoute(newestInsp), { state: { ...navState, viewOnly: true, inspection: newestInsp } })}
                  style={{ ...btnBase, background: isDat ? '#86efac' : '#fca5a5', color: isDat ? '#14532d' : '#7f1d1d' }}
                >
                  {isDat ? '✓ Đạt' : '✗ KĐ'}
                  {renderContBadge(newestInsp)}
                </button>
              );
            })()}

            {showMoreBtn}
            
            <button
              onClick={() => { console.log('[DEBUG DeliveryInfoView navState]', navState); navigate('/inspection-first-article', { state: navState }); }}
              style={{ 
                ...btnBase, 
                background: insps.length > 0 ? 'transparent' : '#93c5fd', 
                color: insps.length > 0 ? '#93c5fd' : '#fff',
                border: insps.length > 0 ? '1.5px solid #93c5fd' : 'none'
              }}
            >
              {insps.length > 0 ? '+ KT' : 'Chưa KT'}
            </button>
          </div>
        );
      }
    },
    {
      header: 'Trạng thái',
      key: 'status',
      render: (row) => {
        const colors = getStatusColor(row.status === 'Hoàn thành' ? 'Hoàn thành' : (row.status === 'Đang giao' ? 'Chờ Kiểm Tra' : 'Default'));
        return (
          <span style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            padding: '3px clamp(4px, 1.5vw, 8px)',
            borderRadius: '10px',
            fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)',
            fontWeight: '700',
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}>
            {row.status}
          </span>
        )
      }
    }
  ]

  const getProductDeliveredQty = useCallback((productName, orderId) => {
    if (!Array.isArray(deliveries)) return { actual: 0, residual: 0 };
    let actualSum = 0;
    let residualSum = 0;
    deliveries.forEach(d => {
      // 1. Kiểm tra trực tiếp trên delivery chính
      if (d.order_id === orderId && (d.part_name || '').toLowerCase() === productName.toLowerCase()) {
        const total = (d.quantity_received || d.quantity_total || 0);
        const res = (d.residual || 0);
        actualSum += (total - res);
        residualSum += res;
      }
      // 2. Kiểm tra trong chi tiết details
      if (Array.isArray(d.details)) {
        d.details.forEach(detail => {
          if (detail.order_id === orderId && (detail.part_name || '').toLowerCase() === productName.toLowerCase()) {
            actualSum += (detail.quantity || 0);
          }
        });
      }
    });
    return { actual: actualSum, residual: residualSum };
  }, [deliveries]);

  const getProductStatus = useCallback((delivered, quantity) => {
    if (delivered >= quantity) return 'Hoàn thành';
    if (delivered > 0) return 'Đang giao';
    return 'Chờ giao';
  }, []);

  const poColumns = [
    {
      header: 'chi tiết',
      key: 'name',
      render: (row) => (
        <div style={{ fontWeight: '700', color: 'var(--text-main)', padding: '8px 0', textAlign: 'left' }}>
          {row.name || row.sku}
        </div>
      )
    },
    {
      header: 'Số lượng',
      key: 'plan_qty',
      nowrap: true,
      render: (row) => {
        const { actual, residual } = getProductDeliveredQty(row.name || row.sku || '', row.orderId);
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '800', color: 'var(--accent-color)' }}>{actual}</div>
            {residual > 0 && (
              <div style={{ fontSize: '0.62rem', color: '#b45309', fontWeight: '800', marginTop: '-2px' }}>
                +{residual} dư
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', marginTop: '2px' }}>KH: {row.quantity || 0}</div>
          </div>
        );
      }
    },
    {
      header: 'KT',
      key: 'kt',
      nowrap: true,
      render: (row) => {
        const key = (row.name || row.sku || '').trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
        const allInsps = inspectionMap[key] || [];
        const partName = row.name || row.sku;
        const stageToFilter = userStageDesc || userStageName;
        
        // Lọc inspections theo Cont/PO của row
        const insps = allInsps.filter(insp => {
          if (!insp.cont_name) return true;
          return insp.cont_name === row.orderName || getContName(insp.cont_name) === getContName(row.orderName);
        });

        const navState = { 
          partName, 
          planId: selectedPlanId, 
          stage: stageToFilter,
          contName: row.orderName || '',
          specifications: [],
          inspections: insps
        };

        const uRole = (user?.role_name || '').toLowerCase();
        const uPerm = (user?.permission_name || '').toLowerCase();
        const uStage = userStageDesc.toLowerCase();
        
        const isQC = uRole.includes('qc') || uRole.includes('chất lượng') || 
                     uPerm.includes('qc') || uPerm.includes('chất lượng');
        
        const isProduction = !isQC;

        const btnBase = {
          width: 'clamp(50px, 18vw, 65px)',
          padding: 'clamp(3px, 1vw, 5px) 0',
          borderRadius: '8px',
          fontWeight: '800',
          fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          border: 'none',
          display: 'block',
          position: 'relative'
        };

        const getContNum = (contName) => {
          if (!contName) return '';
          const parts = contName.split('-');
          if (parts.length >= 2) {
            return `${parts[0]}-${parts[1]}`;
          }
          return contName;
        };

        const renderContBadge = (insp) => {
          if (!insp.cont_name) return null;
          const contNum = getContNum(insp.cont_name);
          return (
            <span style={{
              position: 'absolute',
              bottom: '1px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.45)',
              color: '#fff',
              fontSize: '0.48rem',
              fontWeight: '900',
              borderRadius: '3px',
              padding: '0px 2px',
              lineHeight: '1.2',
              whiteSpace: 'nowrap'
            }}>
              {contNum}
            </span>
          );
        };

        const newestInsp = insps.length > 0 ? insps[insps.length - 1] : null;
        const hasMore = insps.length > 1;
        const moreCount = insps.length - 1;

        const showMoreBtn = hasMore && (
          <button
            onClick={() => setInspectionsModal({ isOpen: true, partName, insps, navState })}
            style={{
              ...btnBase,
              background: '#f1f5f9',
              color: '#475569',
              border: '1.2px dashed #cbd5e1',
              padding: '2.5px 0',
              fontSize: '0.62rem',
              fontWeight: '800'
            }}
          >
            +{moreCount} xem
          </button>
        );

        if (isProduction) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
              {insps.length === 0 ? (
                <div style={{ 
                  padding: 'clamp(4px, 1vw, 6px) clamp(4px, 1vw, 8px)', 
                  borderRadius: '6px', 
                  fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)', 
                  fontWeight: '800',
                  backgroundColor: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0',
                  width: 'clamp(50px, 18vw, 65px)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  Chưa KT
                </div>
              ) : (
                <>
                  {(() => {
                    const isDat = newestInsp.result === 'Đạt';
                    return (
                      <button
                        onClick={() => navigate(getInspectionRoute(newestInsp), { state: { ...navState, viewOnly: true, inspection: newestInsp } })}
                        style={{ ...btnBase, background: isDat ? '#86efac' : '#fca5a5', color: isDat ? '#14532d' : '#7f1d1d' }}
                      >
                        {isDat ? '✓ Đạt' : '✗ KĐ'}
                        {renderContBadge(newestInsp)}
                      </button>
                    );
                  })()}
                  {showMoreBtn}
                </>
              )}
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            {newestInsp && (() => {
              const isDat = newestInsp.result === 'Đạt';
              return (
                <button
                  onClick={() => navigate(getInspectionRoute(newestInsp), { state: { ...navState, viewOnly: true, inspection: newestInsp } })}
                  style={{ ...btnBase, background: isDat ? '#86efac' : '#fca5a5', color: isDat ? '#14532d' : '#7f1d1d' }}
                >
                  {isDat ? '✓ Đạt' : '✗ KĐ'}
                  {renderContBadge(newestInsp)}
                </button>
              );
            })()}

            {showMoreBtn}
            
            <button
              onClick={() => { console.log('[DEBUG DeliveryInfoView navState]', navState); navigate('/inspection-first-article', { state: navState }); }}
              style={{ 
                ...btnBase, 
                background: insps.length > 0 ? 'transparent' : '#93c5fd', 
                color: insps.length > 0 ? '#93c5fd' : '#fff',
                border: insps.length > 0 ? '1.5px solid #93c5fd' : 'none'
              }}
            >
              {insps.length > 0 ? '+ KT' : 'Chưa KT'}
            </button>
          </div>
        );
      }
    },
    {
      header: 'Trạng thái',
      key: 'status',
      render: (row) => {
        const { actual } = getProductDeliveredQty(row.name || row.sku || '', row.orderId);
        const status = getProductStatus(actual, row.quantity || 0);
        const colors = getStatusColor(status === 'Hoàn thành' ? 'Hoàn thành' : (status === 'Đang giao' ? 'Chờ Kiểm Tra' : 'Default'));
        return (
          <span style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            padding: '3px clamp(4px, 1.5vw, 8px)',
            borderRadius: '10px',
            fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)',
            fontWeight: '700',
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}>
            {status}
          </span>
        );
      }
    }
  ];

  const SelectionModal = ({ isOpen, onClose, title, options, value, onChange }) => {
    if (!isOpen) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '24px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={24} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map(opt => (
              <button 
                key={opt.value} 
                onClick={() => { onChange(opt.value); onClose(); }} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  backgroundColor: value === opt.value ? 'rgba(124, 82, 59, 0.05)' : 'transparent', 
                  border: value === opt.value ? '1px solid var(--primary-color)' : '1px solid #f1f5f9' 
                }}
              >
                <span style={{ fontWeight: value === opt.value ? '800' : '600', color: value === opt.value ? 'var(--primary-color)' : '#475569' }}>
                  {opt.label}
                </span>
                {value === opt.value && <Check size={20} color="var(--primary-color)" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  };

  const DeliveryTicketCard = ({ delivery, getStatusColor, onShowPallet, returns = [] }) => {
    const lastClickRef = useRef(0);
    const clickTimerRef = useRef(null);

    const handleInteraction = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastClickRef.current < 350) {
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        onShowPallet(delivery);
        lastClickRef.current = 0;
      } else {
        lastClickRef.current = now;
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => {
          if (lastClickRef.current !== 0) {
            // Navigate to delivery receive page with returns state
            const isCompleted = delivery.status === 'Hoàn thành' || delivery.status === 'Đã Nhận';
            navigate(`/delivery-receive/${delivery.id}`, {
              state: {
                hasReturns: returns && returns.length > 0 && !isCompleted,
                returns: returns,
                activeTab: delivery.status === 'Trả Hàng' ? 'returns' : undefined
              }
            });
          }
          clickTimerRef.current = null;
        }, 300);
      }
    };

    const colors = getStatusColor(delivery.status || 'Chờ xác nhận');
    const dt = new Date(delivery.created_at || Date.now());
    const isCompleted = delivery.status === 'Hoàn thành' || delivery.status === 'Đã Nhận';
    const hasReturns = (delivery.quantity_returned && delivery.quantity_returned > 0) || (returns && returns.length > 0);

    return (
      <div
        className="delivery-card-item"
        onClick={handleInteraction}
        style={{
          backgroundColor: hasReturns ? '#fffbeb' : '#fff',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: hasReturns ? '0 4px 12px rgba(217, 119, 6, 0.15)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: hasReturns ? '2px solid #d97706' : '1px solid #f1f5f9',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '800', color: '#1e293b' }}>DLV-{delivery.id}</span>
            {hasReturns && (
              <div style={{
                backgroundColor: '#fef3c7',
                color: '#d97706',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ArrowLeftRight size={12} />
                Trả {delivery.quantity_returned || 0}
              </div>
            )}
          </div>
          <div style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            {delivery.status || 'Chờ xác nhận'}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <div>
            <div style={{ color: '#64748b', marginBottom: '4px' }}>Tên chi tiết: <span style={{ color: '#1e293b', fontWeight: '600' }}>{delivery.part_name || 'Không xác định'}</span></div>
            {delivery.specification && (
              <div style={{ color: '#64748b', marginBottom: '4px' }}>Quy cách: <span style={{ color: '#1e293b' }}>{delivery.specification}</span></div>
            )}
            <div style={{ color: '#64748b' }}>Ngày: <span style={{ color: '#1e293b' }}>{dt.toLocaleDateString('vi-VN')}</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#64748b', marginBottom: '4px' }}>Số lượng</div>
            <div style={{ color: 'var(--accent-color)', fontWeight: '800', fontSize: '1.1rem' }}>{delivery.quantity_received || delivery.quantity_total || 0}</div>
            {delivery.residual && delivery.residual > 0 && (
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>{delivery.quantity_total || delivery.quantity_received || 0} giao, {delivery.residual} dư</div>
            )}
          </div>
        </div>
        
        {/* Nút truy cập thẻ pallet nhanh */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowPallet(delivery);
            }}
            style={{
              backgroundColor: 'rgba(124, 82, 59, 0.08)',
              border: '1.5px solid var(--primary-color)',
              color: 'var(--primary-color)',
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            Thẻ Pallet
          </button>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      {/* Sticky Parent Container: Wraps both PageHeader and all filter/navigation tools to keep them pinned together */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--bg-cream)', margin: 0, padding: 0 }}>
        <PageHeader
          headerRef={pageHeaderRef}
          title="G7 - Smart Flow"
          subTitle={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              MB2 | Thông tin bàn giao
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: wsStatus === 'online' ? '#22c55e' : wsStatus === 'connecting' ? '#f59e0b' : '#ef4444',
                boxShadow: wsStatus === 'online' ? '0 0 8px #22c55e' : 'none'
              }} />
            </div>
          }
        />

        {/* Header container */}
        <div 
          ref={stickyHeaderRef}
          style={{
            backgroundColor: 'var(--bg-cream)',
            paddingTop: '20px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            paddingRight: '16px',
            boxShadow: '0 4px 6px -4px rgba(0,0,0,0.05)', // Subtle shadow to separate when scrolling
            borderBottom: '1px solid rgba(0,0,0,0.03)'
          }}
        >
          {/* Header: Tiêu đề + Nút Tạo nhanh trên cùng 1 hàng */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Kế hoạch bàn giao
            </h2>
            {hasCreatePermission && (
              <button
                id="delivery-create-btn"
                onClick={() => {
                  navigate('/delivery-create', { state: { planId: selectedPlanId } });
                }}
                style={{
                  backgroundColor: 'var(--accent-color)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} strokeWidth={3} /> Tạo nhanh
              </button>
            )}
          </div>

          {/* Thanh chuyển đổi Tabs */}
          <div id="delivery-tabs" style={{ marginBottom: '12px' }}>
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Thanh Lọc (Filter Bar) - Ngay dưới Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div id="delivery-plan-select" style={{ flex: 1 }}>
              <CustomSelect
                value={selectedPlanId}
                options={planOptions.length > 0 ? planOptions : [{ label: 'Đang tải...', value: '' }]}
                onChange={setSelectedPlanId}
              />
            </div>

            <div id="delivery-po-select" style={{ flex: 1 }}>
              <CustomSelect
                value={selectedCont}
                options={contOptions}
                onChange={setSelectedCont}
              />
            </div>

            <button 
              id="delivery-filter-btn"
              onClick={() => setShowSearchAndFilter(!showSearchAndFilter)} 
              style={{ 
                background: showSearchAndFilter ? 'rgba(124, 82, 59, 0.08)' : 'none', 
                border: 'none', 
                padding: '6px', 
                borderRadius: '10px',
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer', 
                position: 'relative' 
              }}
            >
              <Filter size={26} color={showSearchAndFilter || statusFilter !== 'ALL' || searchQuery ? 'var(--primary-color)' : '#7c5438'} strokeWidth={1.5} />
              {(statusFilter !== 'ALL' || searchQuery || typeFilter !== 'ALL') && (
                <div style={{ position: 'absolute', top: 4, right: 4, width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', border: '2px solid #fff' }} />
              )}
            </button>

            <button 
              id="delivery-sort-btn"
              onClick={() => setSortModal(true)} 
              style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <ArrowDownWideNarrow size={26} color={(sortOrder !== 'DEFAULT' && sortOrder !== 'DATE_DESC') ? 'var(--primary-color)' : '#7c5438'} strokeWidth={1.5} />
            </button>

            {/* Ẩn nút Xuất Excel theo yêu cầu của user
            <button 
              id="delivery-excel-btn"
              onClick={handleExportExcel} 
              style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              title="Xuất Excel"
            >
              <FileSpreadsheet size={26} color="#15803d" strokeWidth={1.5} />
            </button>
            */}
          </div>

          {/* Expandable Advanced Filters and Search Panel */}
          {showSearchAndFilter && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '8px 12px',
              marginBottom: '8px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
              animation: 'slideDown 0.25s ease-out'
            }}>
              {/* 1. Search Bar */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder={activeTab === 'plan' ? "Tìm linh kiện, đơn hàng, SKU..." : "Tìm mã phiếu, tên chi tiết, quy cách..."}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 32px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    boxSizing: 'border-box'
                  }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Quick Filter Tags */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Thanh', 'Ngang', 'Đứng', 'Cửa', 'Ván'].map(tag => {
                  const isActive = searchQuery.toLowerCase().trim() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(isActive ? '' : tag)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        border: isActive ? 'none' : '1px solid #e2e8f0',
                        backgroundColor: isActive ? 'var(--primary-color)' : '#fff',
                        color: isActive ? '#fff' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 2px 4px rgba(124, 82, 59, 0.15)' : 'none'
                      }}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>

              {/* 2. Status Pills and 3. Type Filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                  {(activeTab === 'plan' ? [
                    { label: 'Tất cả', value: 'ALL' },
                    { label: 'Chờ giao', value: 'Chờ giao' },
                    { label: 'Đang giao', value: 'Đang giao' },
                    { label: 'Hoàn thành', value: 'Hoàn thành' }
                  ] : [
                    { label: 'Tất cả', value: 'ALL' },
                    { label: 'Chờ xác nhận', value: 'Chờ Xác Nhận' },
                    { label: 'Chờ QC', value: 'Chờ Kiểm Tra' },
                    { label: 'Chờ nhận', value: 'Chờ Nhận Hàng' },
                    { label: 'Hoàn thành', value: 'Hoàn thành' }
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        border: statusFilter === opt.value ? 'none' : '1px solid #e2e8f0',
                        backgroundColor: statusFilter === opt.value ? 'var(--primary-color)' : '#f1f5f9',
                        color: statusFilter === opt.value ? '#fff' : '#475569',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'delivery' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { id: 'ALL', label: 'Tất cả phiếu' },
                      { id: 'HANDOVER', label: 'Giao đi' },
                      { id: 'RECEIVE', label: 'Nhận về' }
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setTypeFilter(type.id)}
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          border: typeFilter === type.id ? 'none' : '1px solid #e2e8f0',
                          backgroundColor: typeFilter === type.id ? 'var(--primary-color)' : '#f1f5f9',
                          color: typeFilter === type.id ? '#fff' : '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="page-content"
        style={{
          padding: '0 16px 20px 16px',
          flex: 1,
          position: 'relative',
          backgroundColor: 'var(--bg-cream)', // Sử dụng màu nền hệ thống
          minHeight: `calc(100dvh - ${headerHeight + stickyHeaderHeight}px - env(safe-area-inset-bottom, 0px) - 24px)`,
        }}
      >
        {/* Dữ liệu hiển thị dựa trên Tab */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Skeleton Header */}
            <div style={{ height: '100px', backgroundColor: '#fff', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />
            {/* Skeleton Rows */}
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ 
                height: '60px', 
                backgroundColor: '#fff', 
                borderRadius: '12px', 
                animation: `pulse 1.5s infinite ${i * 0.1}s`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: '12px'
              }}>
                <div style={{ width: '40%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
                <div style={{ width: '20%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
                <div style={{ width: '20%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }} />
                <div style={{ width: '20%', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '10px' }} />
              </div>
            ))}
            <style>{`
              @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
              }
            `}</style>
          </div>
        ) : activeTab === 'plan' ? (
          // TAB KẾ HOẠCH: Hiển thị bảng tổng hợp tiến độ
          <div id="delivery-parts-table" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {currentPlan?.orders && Array.isArray(currentPlan.orders) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pagedDisplayOrders.length > 0 ? (
                  <>
                    {pagedDisplayOrders.map(order => (
                      <CollapsibleCard
                        key={order.id}
                        title={order.name}
                        defaultOpen={false}
                      >
                        <DataTable 
                          columns={poColumns} 
                          data={(order.products || []).map(p => ({ 
                            ...p, 
                            orderId: order.id, 
                            orderName: order.name 
                          }))} 
                        />
                      </CollapsibleCard>
                    ))}
                    {visibleOrderCount < displayOrders.length && (
                      <button
                        onClick={() => setVisibleOrderCount(prev => prev + 10)}
                        style={{
                          width: '100%', padding: '12px', marginTop: '4px',
                          backgroundColor: '#f1f5f9', color: '#475569',
                          border: '1px solid #cbd5e1', borderRadius: '10px',
                          fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        Xem thêm {displayOrders.length - visibleOrderCount} Đơn hàng
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    &quot;Không có đơn hàng nào phù hợp với tìm kiếm&quot;
                  </div>
                )}
              </div>
            ) : aggregatedParts.length > 0 ? (
              <CollapsibleCard
                title="CHI TIẾT"
                defaultOpen={true}
                extra={aggregatedParts.length > 0 ? aggregatedParts[0].date : ''}
                stickyHeader={true}
                stickyTopOffset={cardStickyOffset}
              >
                <DataTable 
                  columns={tableColumns} 
                  data={displayParts} 
                  stickyHeader={true}
                  stickyTopOffset={tableHeaderStickyOffset}
                />
                
                {aggregatedParts.length > visibleCount && (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <button
                      onClick={() => setVisibleCount(prev => prev + 30)}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: '#fff',
                        border: '1.5px solid var(--accent-color)',
                        color: 'var(--accent-color)',
                        borderRadius: '12px',
                        fontWeight: '800',
                        fontSize: '0.9rem'
                      }}
                    >
                      Xem thêm ({aggregatedParts.length - visibleCount} sản phẩm)
                    </button>
                  </div>
                )}
              </CollapsibleCard>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20px' }}>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', textAlign: 'center', fontStyle: 'italic' }}>
                  &quot;Không có dữ liệu chi tiết / đơn hàng cho KHSX này&quot;
                </p>
              </div>
            )}
          </div>
        ) : (
          // TAB BÀN GIAO: Danh sách các thẻ phiếu biên nhận
          <div id="delivery-tickets-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Phiếu Bàn Giao Section */}
            {filteredAndSortedDeliveries.length > 0 ? (
              filteredAndSortedDeliveries.map(delivery => {
                // Check if this delivery has any returns
                // Return should match: part_name, plan_id, from_stage = receiving_stage, to_stage = delivery_stage
                const deliveryReturns = returns.filter(r => {
                  if (r.delivery_id) return r.delivery_id === delivery.id;
                  return (
                    r.part_name === delivery.part_name &&
                    r.plan_id === delivery.plan_id &&
                    r.from_stage === delivery.receiving_stage &&
                    r.to_stage === delivery.delivery_stage
                  );
                });

                return (
                  <DeliveryTicketCard
                    key={delivery.id}
                    delivery={delivery}
                    getStatusColor={getStatusColor}
                    onShowPallet={handleShowPalletCard}
                    returns={deliveryReturns}
                  />
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                <p>&quot;Không có phiếu bàn giao nào phù hợp với bộ lọc.&quot;</p>
              </div>
            )}
          </div>
        )}
      </div>

      <SelectionModal 
        isOpen={filterModal} 
        onClose={() => setFilterModal(false)} 
        title="Trạng thái" 
        options={activeTab === 'plan' ? [
          { label: 'Tất cả', value: 'ALL' },
          { label: 'Chờ giao', value: 'Chờ giao' },
          { label: 'Đang giao', value: 'Đang giao' },
          { label: 'Hoàn thành', value: 'Hoàn thành' }
        ] : [
          { label: 'Tất cả', value: 'ALL' },
          { label: 'Chờ Kiểm Tra', value: 'Chờ Kiểm Tra' },
          { label: 'Đã Nhận / Hoàn thành', value: 'Hoàn thành' },
          { label: 'Chờ Nhận Hàng', value: 'Chờ Nhận Hàng' },
          { label: 'Chờ Xác Nhận', value: 'Chờ Xác Nhận' }
        ]} 
        value={statusFilter} 
        onChange={setStatusFilter} 
      />
      <SelectionModal 
        isOpen={sortModal} 
        onClose={() => setSortModal(false)} 
        title="Sắp xếp" 
        options={activeTab === 'plan' ? [
          { label: 'Mặc định', value: 'DEFAULT' },
          { label: 'Tên chi tiết (A-Z)', value: 'NAME_ASC' },
          { label: 'Tên chi tiết (Z-A)', value: 'NAME_DESC' },
          { label: 'SL giao giảm dần', value: 'QTY_DESC' },
          { label: 'SL giao tăng dần', value: 'QTY_ASC' }
        ] : [
          { label: 'Ngày tạo mới nhất', value: 'DATE_DESC' },
          { label: 'Ngày tạo cũ nhất', value: 'DATE_ASC' },
          { label: 'SL thực nhận giảm dần', value: 'QTY_DESC' },
          { label: 'SL thực nhận tăng dần', value: 'QTY_ASC' }
        ]} 
        value={sortOrder} 
        onChange={setSortOrder} 
      />

      {palletModal.isOpen && (
        <PalletCardModal
          isOpen={palletModal.isOpen}
          onClose={() => setPalletModal({ isOpen: false, data: null })}
          data={palletModal.data}
          partProducts={palletPartProducts}
        />
      )}

      {inspectionsModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '360px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #4a2c1d 0%, #78523b 100%)',
              color: '#fff'
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase' }}>
                  Lịch sử kiểm tra
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', marginTop: '2px' }}>
                  {inspectionsModal.partName}
                </div>
              </div>
              <button
                onClick={() => setInspectionsModal({ isOpen: false, partName: '', insps: [], navState: {} })}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {inspectionsModal.insps.map((insp, idx) => {
                  const isDat = insp.result === 'Đạt';
                  const dateFormatted = formatInspectedAt(insp.inspected_at);
                  return (
                    <button
                      key={insp.id || idx}
                      onClick={() => {
                        setInspectionsModal({ isOpen: false, partName: '', insps: [], navState: {} });
                        navigate(getInspectionRoute(insp), { state: { ...inspectionsModal.navState, viewOnly: true, inspection: insp } });
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Dòng 1: Kết quả & Container */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.75rem',
                          background: isDat ? '#dcfce7' : '#fee2e2',
                          color: isDat ? '#15803d' : '#b91c1c'
                        }}>
                          {isDat ? '✓ Đạt' : '✗ Không đạt'}
                        </span>
                        
                        {insp.cont_name && (
                          <span style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            border: '1px solid #e2e8f0'
                          }}>
                            {insp.cont_name}
                          </span>
                        )}
                      </div>

                      {/* Dòng 2: Quy cách */}
                      {insp.specification && (
                        <div style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: '700' }}>
                          <span style={{ color: '#64748b', fontWeight: '600' }}>Quy cách: </span>
                          {insp.specification}
                        </div>
                      )}

                      {/* Dòng 3: Ngày giờ kiểm tra */}
                      {dateFormatted && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: '600' }}>Thời gian:</span>
                          <span>{dateFormatted}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default DeliveryInfo

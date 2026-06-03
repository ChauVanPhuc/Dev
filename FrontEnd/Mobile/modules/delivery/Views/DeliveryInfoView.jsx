import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import Tabs from '@mobile/Shared/Views/components/ui/Tabs'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard'
import DataTable from '@mobile/Shared/Views/components/ui/DataTable'
import PalletCardModal from '@modules/delivery/Views/components/PalletCardModal'
import { Plus, Truck, Package, Filter, ArrowDownWideNarrow, History, X, Check, ClipboardCheck, Search, ArrowLeftRight } from 'lucide-react'
import useAuthStore from '@modules/auth/Models/authModel'
import { usePlanController } from '@modules/production/Controllers/planController'
import { useWebSocket } from '@shared/hooks/useWebSocket'
import useUiStore from '@shared/store/uiStore'
import apiClient from '@shared/services/api'

/**
 * MH2 - Thông tin bàn giao
 * DeliveryInfo Screen
 * Màn hình Thông tin bàn giao làm theo thiết kế mới.
 */
const DeliveryInfo = () => {
  const { plans, fetchPlans, fetchDeliveriesByPlan, fetchPlanDetail } = usePlanController()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('plan')
  const [selectedPlanId, setSelectedPlanId] = useState('')
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
  const isAdmin = userRoleStr.includes('admin');
  const isProduction = userRoleStr.includes('sản xuất') || userRoleStr.includes('sx');

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
      await fetchPlans()
      setLoading(false)
    }
    loadData()
  }, [fetchPlans])

  useEffect(() => {
    const loadDeliveries = async () => {
      if (selectedPlanId) {
        setLoading(true)
        const rawStage = userStageDesc || userStageName || ''
        const stageToFilter = rawStage.toLowerCase().includes('đóng gói') ? null : rawStage

        try {
          const detail = await fetchPlanDetail(selectedPlanId, stageToFilter)
          setCurrentPlan(detail)

          const deliveryList = await fetchDeliveriesByPlan(selectedPlanId)
          setDeliveries(deliveryList || [])

          // Load danh sách phiếu trả hàng
          try {
            const returnsResp = await apiClient.get(`/returns/${selectedPlanId}`)
            setReturns(returnsResp.data || [])
          } catch (err) {
            console.error('Lỗi tải danh sách trả hàng:', err)
            setReturns([])
          }

          // Load kết quả kiểm tra (nhẹ, giữ lại)
          const inspRes = await apiClient.get(`/inspections/plan/${selectedPlanId}?stage=${encodeURIComponent(stageToFilter || '')}`)
          const map = {}
          ;(inspRes.data || []).forEach(insp => {
            const key = (insp.part_name || '').trim().toLowerCase()
            if (!map[key]) map[key] = []
            map[key].push(insp)
          })
          setInspectionMap(map)
        } catch (err) {
          console.error('[Load Error]:', err)
        } finally {
          setLoading(false)
        }
      }
    }
    loadDeliveries()
  }, [selectedPlanId, userStageName, userStageDesc, fetchDeliveriesByPlan, fetchPlanDetail])

  // Reset phân trang khi đổi KHSX
  useEffect(() => {
    setVisibleCount(30)
    setVisibleOrderCount(10)
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

  /**
   * [Realtime] Hàm làm mới toàn bộ dữ liệu trang
   * Được gọi khi: Chọn KHSX mới, Chuyển Tab hoặc nhận tín hiệu WebSocket
   */
  const refreshData = useCallback(async (planId) => {
    const targetId = planId || selectedPlanId;
    if (!targetId) return;

    const stageToFilter = userStageDesc || userStageName;
    
    try {
      // [OPTIMIZED] Gọi song song để tăng tốc độ phản hồi
      const [list, detail, returnsResp] = await Promise.all([
        fetchDeliveriesByPlan(targetId),
        fetchPlanDetail(targetId, stageToFilter),
        apiClient.get(`/returns/${targetId}`).catch(err => {
          console.error('Lỗi tải danh sách trả hàng trong refreshData:', err);
          return { data: [] };
        })
      ]);
      
      if (list) setDeliveries(list);
      if (detail) setCurrentPlan(detail);
      if (returnsResp && returnsResp.data) setReturns(returnsResp.data);
      
      // Load kết quả kiểm tra (giữ lại logic cũ)
      const inspRes = await apiClient.get(`/inspections/plan/${targetId}?stage=${encodeURIComponent(stageToFilter || '')}`);
      const map = {};
      (inspRes.data || []).forEach(insp => {
        const key = (insp.part_name || '').trim().toLowerCase();
        if (!map[key]) map[key] = [];
        map[key].push(insp);
      });
      setInspectionMap(map);
    } catch (err) {
      console.error('[Refresh Error]:', err);
    }
  }, [selectedPlanId, userStageDesc, userStageName, fetchDeliveriesByPlan, fetchPlanDetail]);

  const handleShowPalletCard = async (ticket) => {
    try {
      const matchedDelivery = deliveries.find(d => d.id === ticket.id)
      if (!matchedDelivery) return

      const params = new URLSearchParams()
      params.append('part_name', matchedDelivery.part_name || '')
      if (matchedDelivery.specification) {
        params.append('spec', matchedDelivery.specification)
      }
      const res = await apiClient.get(`/plans/${selectedPlanId}/part-products?${params.toString()}`)
      setPalletPartProducts(res.data || [])

      const palletData = {
        ...matchedDelivery,
        plan_name: currentPlan?.name || '',
        user_name: user?.name || user?.username || ''
      }
      setPalletModal({ isOpen: true, data: palletData })
    } catch (error) {
      console.error('Error loading pallet data:', error)
    }
  }

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
            date: (currentPlan.finished_date && !isNaN(new Date(currentPlan.finished_date).getTime()))
              ? new Date(currentPlan.finished_date).toLocaleDateString('vi-VN')
              : new Date().toLocaleDateString('vi-VN')
          };
        } else {
          // Cộng dồn số lượng Kế hoạch và Thực tế cho các chi tiết cùng tên
          partMap[key].quantity += (item.quantity || 0);
          partMap[key].delivered += (item.delivered || 0);
        }
      });
    }

    // Tính toán trạng thái chung cho tất cả các phần tử trong partMap
    Object.values(partMap).forEach(part => {
      let currentStatus = 'Chờ giao';
      if (part.delivered >= part.quantity) {
        currentStatus = 'Hoàn thành';
      } else if (part.delivered > 0) {
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
             // Nếu user không có stage (admin) hoặc product có chứa stage trong BOM tree
             return !userStageNorm || checkTree(p.bom_details);
        });
        
        if (validProducts.length > 0) {
            filteredOrders.push({
                ...o,
                products: validProducts
            });
        }
    });

    let result = [...filteredOrders];
    
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
  }, [currentPlan, searchQuery, userStageDesc]);

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
    if (sortOrder === 'DATE_DESC') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortOrder === 'DATE_ASC') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (sortOrder === 'QTY_DESC') {
      result.sort((a, b) => (b.quantity_received || b.quantity_total || 0) - (a.quantity_received || a.quantity_total || 0))
    } else if (sortOrder === 'QTY_ASC') {
      result.sort((a, b) => (a.quantity_received || a.quantity_total || 0) - (b.quantity_received || b.quantity_total || 0))
    } else {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return result
  }, [deliveries, userStageDesc, typeFilter, statusFilter, searchQuery, sortOrder, isAdmin, userStageName, user])

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
      render: (row) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '800', color: 'var(--accent-color)' }}>{row.delivered}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', marginTop: '2px' }}>KH: {row.quantity}</div>
        </div>
      )
    },
    {
      header: 'KT',
      key: 'kt',
      nowrap: true,
      render: (row) => {
        const key = (row.displayName || row.name || '').trim().toLowerCase();
        const insps = inspectionMap[key] || [];
        const partName = row.displayName || row.name;
        const stageToFilter = userStageDesc || userStageName;
        const navState = { partName, planId: selectedPlanId, stage: stageToFilter };

        // [NEW] Phân quyền hiển thị: Ưu tiên nhận diện QC trước, sau đó mới đến Sản xuất
        const uRole = (user?.role_name || '').toLowerCase();
        const uPerm = (user?.permission_name || '').toLowerCase();
        const uStage = userStageDesc.toLowerCase();
        
        // Nếu là QC hoặc Quản lý chất lượng -> Có toàn quyền KT
        const isQC = uRole.includes('qc') || uRole.includes('chất lượng') || 
                     uPerm.includes('qc') || uPerm.includes('chất lượng');
        
        // Nếu KHÔNG PHẢI QC và thuộc các nhóm sản xuất -> Chỉ được xem
        const isProduction = !isQC && (
                             uRole.includes('sản xuất') || 
                             uPerm.includes('sản xuất') || 
                             uStage.includes('sản xuất') ||
                             uStage.includes('định hình') ||
                             uStage.includes('lắp ráp')
                            );

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
          display: 'block'
        };

        if (isProduction) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
              {insps.length === 0 && (
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
              )}
              {insps.map((insp, idx) => {
                const isDat = insp.result === 'Đạt';
                return (
                  <button
                    key={insp.id || idx}
                    onClick={() => navigate('/input-inspection', { state: { ...navState, viewOnly: true, inspection: insp } })}
                    style={{ ...btnBase, background: isDat ? '#86efac' : '#fca5a5', color: isDat ? '#14532d' : '#7f1d1d' }}
                  >
                    {isDat ? '✓ Đạt' : '✗ KĐ'}
                  </button>
                );
              })}
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            {/* Hiển thị tất cả các lượt đã KT */}
            {insps.map((insp, idx) => {
              const isDat = insp.result === 'Đạt';
              return (
                <button
                  key={insp.id || idx}
                  onClick={() => navigate('/input-inspection', { state: { ...navState, viewOnly: true, inspection: insp } })}
                  style={{ ...btnBase, background: isDat ? '#86efac' : '#fca5a5', color: isDat ? '#14532d' : '#7f1d1d' }}
                >
                  {isDat ? '✓ Đạt' : '✗ KĐ'}
                </button>
              );
            })}
            
            {/* Nút KT mới (luôn hiển thị hoặc hiển thị "+ KT" nếu đã có kết quả) */}
            <button
              onClick={() => navigate('/input-inspection', { state: navState })}
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

  const poColumns = [
    {
      header: 'Mã SP',
      key: 'name',
      render: (row) => (
        <div style={{ fontWeight: '700', color: 'var(--text-main)', padding: '8px 0', textAlign: 'left' }}>
          {row.name || row.sku}
        </div>
      )
    },
    {
      header: 'KH',
      key: 'quantity',
      nowrap: true,
      render: (row) => (
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          {row.quantity || 0}
        </div>
      )
    },
    {
      header: 'Tiến độ',
      key: 'progress',
      nowrap: true,
      render: (row) => {
        const prog = Math.round(row.progress || 0);
        return (
          <div style={{ textAlign: 'center', fontWeight: '800', color: prog >= 100 ? 'var(--status-success)' : 'var(--text-main)' }}>
            {prog}%
          </div>
        )
      }
    },
    {
      header: 'Trạng thái',
      key: 'status',
      render: (row) => {
        const prog = Math.round(row.progress || 0);
        const txt = prog >= 100 ? 'Hoàn thành' : (prog > 0 ? 'Đang làm' : 'Chờ làm');
        const color = prog >= 100 ? 'var(--status-success)' : (prog > 0 ? 'var(--accent-color)' : '#94a3b8');
        return (
          <div style={{ textAlign: 'center', color }}>
            {txt}
          </div>
        )
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
            {!isQC && (
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

            <button 
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
              onClick={() => setSortModal(true)} 
              style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <ArrowDownWideNarrow size={26} color={(sortOrder !== 'DEFAULT' && sortOrder !== 'DATE_DESC') ? 'var(--primary-color)' : '#7c5438'} strokeWidth={1.5} />
            </button>
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
                        progress={order.order_progress * 100}
                        defaultOpen={false}
                      >
                        <DataTable columns={poColumns} data={order.products || []} />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
    </Layout>
  )
}

export default DeliveryInfo

import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search, ArrowUpDown, Filter, Plus, Copy, MoreHorizontal, Upload, Download,
  ArrowRight, ArrowLeft, Trash2, CheckCircle2, Layers, Building2, Wrench, Settings,
  Grid, PlusCircle, Check, X, ShieldAlert, Sparkles, RefreshCw, Calendar, Edit3, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import api from '@webShared/Services/api.service';

/**
 * View: Cấu hình Quy trình sản xuất (/admin/production-routing)
 * Match 100% Ảnh 1 (Kho Tổ theo Tab 3), Ảnh 2 & Ảnh 3 (Bảng Kế Hoạch Thực Hiện 15 Cột)
 */
const ProductionRoutingView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;
  const { toast } = useToast();

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-routing');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  const [activeTab, setActiveTab] = useState('routing');
  const [searchTerm, setSearchTerm] = useState('');
  const [isKhoTổCollapsed, setIsKhoTổCollapsed] = useState(false);
  const [isPipelineCollapsed, setIsPipelineCollapsed] = useState(false);

  const [routingsList, setRoutingsList] = useState([
    {
      id: 'QT-TU-01',
      code: 'QT-TU-01',
      name: 'Quy trình sản xuất Tủ áo & Tủ trang trí',
      category: 'Tủ gỗ',
      isDefault: true,
      appliedCount: 12,
      nodes: []
    },
    {
      id: 'QT-BAN-01',
      code: 'QT-BAN-01',
      name: 'Quy trình sản xuất Bàn ăn & Bàn làm việc',
      category: 'Bàn gỗ',
      isDefault: false,
      appliedCount: 8,
      nodes: []
    },
    {
      id: 'QT-GIUONG-01',
      code: 'QT-GIUONG-01',
      name: 'Quy trình sản xuất Giường ngủ King & Queen Size',
      category: 'Giường gỗ',
      isDefault: false,
      appliedCount: 5,
      nodes: []
    }
  ]);

  const [selectedRoutingId, setSelectedRoutingId] = useState('QT-TU-01');
  const [activeNodeId, setActiveNodeId] = useState(1);

  const currentRouting = useMemo(() => {
    return routingsList.find(r => r.id === selectedRoutingId) || routingsList[0] || {
      id: 'QT-TU-01',
      code: 'QT-TU-01',
      name: 'Quy trình sản xuất Tủ áo & Tủ trang trí',
      category: 'Tủ gỗ',
      isDefault: true,
      appliedCount: 12,
      nodes: []
    };
  }, [routingsList, selectedRoutingId]);

  const [teamsList, setTeamsList] = useState([]);
  const [routingTeamsMap, setRoutingTeamsMap] = useState({});

  const defaultProducts = useMemo(() => [
    { id: 1, code: 'SP-TU-001', name: 'Tủ áo gỗ sồi 4 cánh âm tường', routingCode: 'QT-TU-01', applyDate: '01/08/2026', status: 'Đang áp dụng' },
    { id: 2, code: 'SP-TU-002', name: 'Tủ áo gỗ gõ đỏ 3 cánh cổ điển', routingCode: 'QT-TU-01', applyDate: '02/08/2026', status: 'Đang áp dụng' },
    { id: 3, code: 'SP-TU-003', name: 'Tủ trang trí phòng khách gỗ xoan đào', routingCode: 'QT-TU-01', applyDate: '03/08/2026', status: 'Đang áp dụng' },
    { id: 4, code: 'SP-TU-004', name: 'Tủ rượu cánh kính đèn LED cao cấp', routingCode: 'QT-TU-01', applyDate: '04/08/2026', status: 'Đang áp dụng' },
    { id: 5, code: 'SP-TU-005', name: 'Tủ quần áo âm tường thông minh', routingCode: 'QT-TU-01', applyDate: '05/08/2026', status: 'Đang áp dụng' },
    { id: 6, code: 'SP-TU-006', name: 'Tủ chè khảm trai truyền thống', routingCode: 'QT-TU-01', applyDate: '06/08/2026', status: 'Đang áp dụng' },
    { id: 7, code: 'SP-TU-007', name: 'Tủ sách gỗ óc chó 5 tầng', routingCode: 'QT-TU-01', applyDate: '07/08/2026', status: 'Đang áp dụng' },
    { id: 8, code: 'SP-TU-008', name: 'Tủ giày dép gỗ cao su xuất khẩu', routingCode: 'QT-TU-01', applyDate: '08/08/2026', status: 'Đang áp dụng' },
    { id: 9, code: 'SP-TU-009', name: 'Tủ đựng đồ sơ sinh gỗ công nghiệp MDF', routingCode: 'QT-TU-01', applyDate: '09/08/2026', status: 'Đang áp dụng' },
    { id: 10, code: 'SP-TU-010', name: 'Tủ bếp trên dưới gỗ tần bì', routingCode: 'QT-TU-01', applyDate: '10/08/2026', status: 'Đang áp dụng' },
    { id: 11, code: 'SP-TU-011', name: 'Tủ lavabo phòng tắm chống nước', routingCode: 'QT-TU-01', applyDate: '11/08/2026', status: 'Đang áp dụng' },
    { id: 12, code: 'SP-TU-012', name: 'Tủ trưng bày sản phẩm showroom', routingCode: 'QT-TU-01', applyDate: '12/08/2026', status: 'Đang áp dụng' },

    { id: 13, code: 'SP-BAN-001', name: 'Bàn ăn gỗ sồi 6 ghế tròn', routingCode: 'QT-BAN-01', applyDate: '01/08/2026', status: 'Đang áp dụng' },
    { id: 14, code: 'SP-BAN-002', name: 'Bàn làm việc giám đốc gỗ gõ đỏ', routingCode: 'QT-BAN-01', applyDate: '02/08/2026', status: 'Đang áp dụng' },
    { id: 15, code: 'SP-BAN-003', name: 'Bàn trà phòng khách chân sắt sơn tĩnh điện', routingCode: 'QT-BAN-01', applyDate: '03/08/2026', status: 'Đang áp dụng' },
    { id: 16, code: 'SP-BAN-004', name: 'Bàn trang điểm kèm gương LED cảm ứng', routingCode: 'QT-BAN-01', applyDate: '04/08/2026', status: 'Đang áp dụng' },
    { id: 17, code: 'SP-BAN-005', name: 'Bàn họp hội trường 12 chỗ gỗ công nghiệp', routingCode: 'QT-BAN-01', applyDate: '05/08/2026', status: 'Đang áp dụng' },
    { id: 18, code: 'SP-BAN-006', name: 'Bàn học sinh gấp gọn thông minh', routingCode: 'QT-BAN-01', applyDate: '06/08/2026', status: 'Đang áp dụng' },
    { id: 19, code: 'SP-BAN-007', name: 'Bàn bar chân cao nhà bếp tân cổ điển', routingCode: 'QT-BAN-01', applyDate: '07/08/2026', status: 'Đang áp dụng' },
    { id: 20, code: 'SP-BAN-008', name: 'Bàn sofa mặt đá nhân tạo cao cấp', routingCode: 'QT-BAN-01', applyDate: '08/08/2026', status: 'Đang áp dụng' },

    { id: 21, code: 'SP-GIUONG-001', name: 'Giường ngủ gỗ gõ đỏ 1m8x2m hoàng gia', routingCode: 'QT-GIUONG-01', applyDate: '01/08/2026', status: 'Đang áp dụng' },
    { id: 22, code: 'SP-GIUONG-002', name: 'Giường ngủ bọc nệm đầu giường 1m6x2m', routingCode: 'QT-GIUONG-01', applyDate: '02/08/2026', status: 'Đang áp dụng' },
    { id: 23, code: 'SP-GIUONG-003', name: 'Giường tầng trẻ em đa năng kèm cầu trượt', routingCode: 'QT-GIUONG-01', applyDate: '03/08/2026', status: 'Đang áp dụng' },
    { id: 24, code: 'SP-GIUONG-004', name: 'Giường gấp thông minh có ngăn kéo âm', routingCode: 'QT-GIUONG-01', applyDate: '04/08/2026', status: 'Đang áp dụng' },
    { id: 25, code: 'SP-GIUONG-005', name: 'Giường bệt kiểu Nhật gỗ sồi bọc vải', routingCode: 'QT-GIUONG-01', applyDate: '05/08/2026', status: 'Đang áp dụng' }
  ], []);

  const extractDòngHàngKey = (category, code, name) => {
    const text = `${category || ''} ${code || ''} ${name || ''}`.toUpperCase();
    const seriesList = ['APT', 'ATL', 'FOL', 'ADV', 'TPH', 'HOR', 'EYC', 'COV', 'TIN', 'BEZ', 'MBC', 'TU', 'BAN', 'GIUONG'];
    for (const s of seriesList) {
      if (text.includes(s)) return s;
    }
    if (category) {
      const cleaned = category.replace(/Dòng hàng/gi, '').trim();
      if (cleaned) return cleaned;
    }
    return '';
  };

  const [appliedProducts, setAppliedProducts] = useState(defaultProducts);
  const [allMasterProducts, setAllMasterProducts] = useState([]);
  const [totalMasterProducts, setTotalMasterProducts] = useState(0);
  const [masterCategories, setMasterCategories] = useState([]);
  const [routingAssignedMap, setRoutingAssignedMap] = useState({});

  // PRODUCT FILTER & SELECTION STATES
  const [productScopeFilter, setProductScopeFilter] = useState('assigned'); // 'assigned' | 'all' | 'unassigned'
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductSkus, setSelectedProductSkus] = useState([]);
  const [openActionMenuSku, setOpenActionMenuSku] = useState(null);
  const [productPage, setProductPage] = useState(0);
  const [productRowsPerPage, setProductRowsPerPage] = useState(15);

  useEffect(() => {
    setProductPage(0);
  }, [selectedRoutingId, productSearchTerm, productScopeFilter, productCategoryFilter]);

  // Load Routing Assigned Products & All Master Products
  useEffect(() => {
    const fetchProductsData = async () => {
      try {
        const [mpRes, mcRes, rpRes] = await Promise.all([
          api.get('/master-products/?limit=100000'),
          api.get('/master-categories/'),
          api.get(`/production/routings/${selectedRoutingId}/products`)
        ]);
        const mpData = (mpRes && mpRes.items) ? mpRes.items : (Array.isArray(mpRes) ? mpRes : []);
        const mpTotal = (mpRes && mpRes.total) ? mpRes.total : mpData.length;
        const mcData = Array.isArray(mcRes) ? mcRes : (mcRes?.data || []);
        const rpData = Array.isArray(rpRes) ? rpRes : (rpRes?.data || []);

        if (mpData.length > 0) setAllMasterProducts(mpData);
        setTotalMasterProducts(mpTotal);
        if (mcData.length > 0) setMasterCategories(mcData);

        const assignedMap = {};
        rpData.forEach(r => {
          assignedMap[r.product_sku] = selectedRoutingId;
        });
        setRoutingAssignedMap(assignedMap);
      } catch (e) {
        console.warn('Lỗi fetch sản phẩm nâng cao:', e);
      }
    };
    fetchProductsData();
  }, [selectedRoutingId]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    masterCategories.forEach(c => { if (c.name) set.add(c.name); });
    defaultProducts.forEach(p => { if (p.category) set.add(p.category); });
    allMasterProducts.forEach(p => {
      const c = p.category_name || p.master_category?.name;
      if (c) set.add(c);
    });
    return Array.from(set);
  }, [masterCategories, defaultProducts, allMasterProducts]);

  const currentRoutingCategorySeries = useMemo(() => {
    return extractDòngHàngKey(currentRouting?.category, currentRouting?.code, currentRouting?.name);
  }, [currentRouting]);

  const allProductsListFormatted = useMemo(() => {
    const rCode = selectedRoutingId || currentRouting?.code || 'QT-TU-01';

    if (allMasterProducts.length > 0) {
      return allMasterProducts.map((p, idx) => {
        const catName = p.category_name || p.master_category?.name || extractDòngHàngKey(null, p.sku, p.name) || 'Sản phẩm mẫu';
        const assignedCode = routingAssignedMap[p.sku];
        const isAssignedToThis = assignedCode === rCode || assignedCode === currentRouting?.code;

        return {
          id: p.id || idx + 1,
          code: p.sku,
          name: p.name || p.sku,
          category: catName,
          routingCode: assignedCode || (isAssignedToThis ? rCode : '---'),
          isAssignedToThis: Boolean(isAssignedToThis),
          applyDate: p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '01/08/2026',
          status: isAssignedToThis ? 'Đang áp dụng' : (assignedCode ? `Gán ${assignedCode}` : 'Chưa gán')
        };
      });
    }

    return defaultProducts.map(p => {
      const assignedCode = routingAssignedMap[p.code] || p.routingCode;
      const isAssignedToThis = assignedCode === rCode ||
        (!assignedCode && currentRoutingCategorySeries && extractDòngHàngKey(p.category, p.code, p.name) === currentRoutingCategorySeries);

      return {
        ...p,
        category: p.category || extractDòngHàngKey(null, p.code, p.name) || 'Tất cả',
        isAssignedToThis: Boolean(isAssignedToThis),
        routingCode: assignedCode || (isAssignedToThis ? rCode : '---'),
        status: isAssignedToThis ? 'Đang áp dụng' : (assignedCode ? `Gán ${assignedCode}` : 'Chưa gán')
      };
    });
  }, [allMasterProducts, routingAssignedMap, selectedRoutingId, currentRouting, defaultProducts, currentRoutingCategorySeries]);

  const assignedToThisCount = useMemo(() => {
    return allProductsListFormatted.filter(p => p.isAssignedToThis).length;
  }, [allProductsListFormatted]);

  const filteredAppliedProducts = useMemo(() => {
    let list = allProductsListFormatted;

    // 1. Filter by Scope
    if (productScopeFilter === 'assigned') {
      list = list.filter(p => p.isAssignedToThis);
    } else if (productScopeFilter === 'unassigned') {
      list = list.filter(p => !p.isAssignedToThis && p.routingCode === '---');
    }

    // 2. Filter by Category / Dòng hàng
    if (productCategoryFilter !== 'ALL') {
      list = list.filter(p => (p.category || '').toUpperCase().includes(productCategoryFilter.toUpperCase()));
    }

    // 3. Search Term
    if (productSearchTerm.trim()) {
      const term = productSearchTerm.trim().toLowerCase();
      list = list.filter(
        p => (p.code || '').toLowerCase().includes(term) || (p.name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [allProductsListFormatted, productScopeFilter, productCategoryFilter, productSearchTerm]);

  const totalProductPages = useMemo(() => {
    return Math.ceil(filteredAppliedProducts.length / productRowsPerPage) || 1;
  }, [filteredAppliedProducts.length, productRowsPerPage]);

  const paginatedAppliedProducts = useMemo(() => {
    const start = productPage * productRowsPerPage;
    return filteredAppliedProducts.slice(start, start + productRowsPerPage);
  }, [filteredAppliedProducts, productPage, productRowsPerPage]);

  // HANDLERS FOR ASSIGN / UNASSIGN
  const handleAssignSingleProduct = async (productSku) => {
    const rCode = selectedRoutingId || currentRouting?.code;
    try {
      await api.post(`/production/routings/${rCode}/products/assign`, { skus: [productSku] });
    } catch (e) {
      console.warn('Assign API error (fallback state):', e);
    }
    setRoutingAssignedMap(prev => ({ ...prev, [productSku]: rCode }));
    if (toast) toast('success', `Đã gán sản phẩm ${productSku} vào Quy trình ${rCode}!`);
  };

  const handleUnassignSingleProduct = async (productSku) => {
    const rCode = selectedRoutingId || currentRouting?.code;
    try {
      await api.delete(`/production/routings/${rCode}/products/${productSku}`);
    } catch (e) {
      console.warn('Unassign API error (fallback state):', e);
    }
    setRoutingAssignedMap(prev => {
      const next = { ...prev };
      delete next[productSku];
      return next;
    });
    if (toast) toast('success', `Đã gỡ sản phẩm ${productSku} khỏi Quy trình!`);
  };

  const handleChangeRoutingForProduct = async (productSku, newRoutingCode) => {
    if (!newRoutingCode) return;
    try {
      await api.post(`/production/routings/${newRoutingCode}/products/assign`, { skus: [productSku] });
      setRoutingAssignedMap(prev => ({ ...prev, [productSku]: newRoutingCode }));
      if (toast) toast('success', `Đã chuyển sản phẩm ${productSku} sang Quy trình ${newRoutingCode}`);
    } catch (e) {
      console.warn('Change routing API error:', e);
      if (toast) toast('error', `Lỗi chuyển Quy trình: ${e?.response?.data?.detail || e.message}`);
    }
  };

  const handleBulkAssignProducts = async () => {
    if (selectedProductSkus.length === 0) return;
    const rCode = selectedRoutingId || currentRouting?.code;
    try {
      await api.post(`/production/routings/${rCode}/products/assign`, { skus: selectedProductSkus });
    } catch (e) {
      console.warn('Bulk assign API error:', e);
    }
    setRoutingAssignedMap(prev => {
      const next = { ...prev };
      selectedProductSkus.forEach(sku => { next[sku] = rCode; });
      return next;
    });
    if (toast) toast('success', `Đã gán ${selectedProductSkus.length} sản phẩm đã chọn vào Quy trình ${rCode}!`);
    setSelectedProductSkus([]);
  };

  const handleAutoAssignSameCategory = async () => {
    const rCode = selectedRoutingId || currentRouting?.code;
    const routingKey = (currentRouting && currentRouting.numericId) ? currentRouting.numericId : rCode;

    // Ưu tiên dùng category_id thật (dữ liệu có cấu trúc) thay vì đoán theo text SKU/tên
    if (currentRouting?.categoryId) {
      try {
        const res = await api.post(`/production/routings/${routingKey}/products/assign-by-category`, {
          category_id: currentRouting.categoryId
        });
        const items = Array.isArray(res) ? res : (res?.data || []);
        setRoutingAssignedMap(prev => {
          const next = { ...prev };
          items.forEach(i => { next[i.product_sku] = rCode; });
          return next;
        });
        if (toast) toast('success', `Đã tự động gán ${items.length} sản phẩm thuộc Dòng hàng "${currentRouting.categoryName || currentRouting.category}" vào Quy trình ${rCode}!`);
        return;
      } catch (e) {
        console.warn('Auto assign by category API error, fallback to heuristic:', e);
      }
    }

    // Fallback: quy trình chưa gắn category_id -> dùng đối chiếu text tạm thời
    const sameCatProds = allProductsListFormatted.filter(p => {
      if (!currentRoutingCategorySeries) return true;
      return (p.category || '').toUpperCase().includes(currentRoutingCategorySeries.toUpperCase()) ||
        (p.code || '').toUpperCase().includes(currentRoutingCategorySeries.toUpperCase());
    });

    if (sameCatProds.length === 0) {
      if (toast) toast('warning', 'Không tìm thấy sản phẩm nào khớp với Dòng hàng này!');
      return;
    }

    const skusToAssign = sameCatProds.map(p => p.code);
    try {
      await api.post(`/production/routings/${rCode}/products/assign`, { skus: skusToAssign });
    } catch (e) {
      console.warn('Auto assign API error:', e);
    }

    setRoutingAssignedMap(prev => {
      const next = { ...prev };
      skusToAssign.forEach(sku => { next[sku] = rCode; });
      return next;
    });
    if (toast) toast('success', `Đã tự động gán ${skusToAssign.length} sản phẩm Dòng hàng vào Quy trình ${rCode}!`);
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      const allSkus = filteredAppliedProducts.map(p => p.code);
      setSelectedProductSkus(allSkus);
    } else {
      setSelectedProductSkus([]);
    }
  };

  const handleToggleSelectProduct = (sku) => {
    setSelectedProductSkus(prev =>
      prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]
    );
  };


  const [isBackendLoaded, setIsBackendLoaded] = useState(false);

  const currentRoutingTeams = useMemo(() => {
    return routingTeamsMap[selectedRoutingId] || [];
  }, [routingTeamsMap, selectedRoutingId]);

  const currentFactoryTeamsGrouped = useMemo(() => {
    const map = {};
    currentRoutingTeams.forEach(t => {
      const fac = t.factory || 'Nhà máy 1';
      if (!map[fac]) {
        map[fac] = {
          factory: fac,
          color: fac === 'Nhà máy 1' ? '#2D1A12' : fac === 'Nhà máy 2' ? '#D97706' : '#3B82F6',
          teams: []
        };
      }
      map[fac].teams.push(t);
    });
    return Object.values(map);
  }, [currentRoutingTeams]);

  const validPipelineNodes = useMemo(() => {
    if (!currentRouting || !currentRouting.nodes) return currentRoutingTeams;
    if (['QT-TU-01', 'QT-BAN-01', 'QT-GIUONG-01'].includes(selectedRoutingId) && currentRouting.nodes.length === 0) {
      return currentRoutingTeams;
    }
    return currentRouting.nodes;
  }, [currentRouting, currentRoutingTeams, selectedRoutingId]);

  const [allExecutionPlanRows, setAllExecutionPlanRows] = useState([]);

  const [showAddRoutingModal, setShowAddRoutingModal] = useState(false);
  const [newRoutingForm, setNewRoutingForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    category: '',
    desc: '',
    autoAssign: true
  });

  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận xóa',
    onConfirm: null
  });

  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState({
    factory: '',
    teamCode: 'TO-NM1-501',
    teamName: '',
    selectedStages: [],
    members: 10,
    desc: ''
  });

  // Danh sách nhà máy lấy từ CSDL cấu hình (hr_factory_structures)
  const [factoryStructures, setFactoryStructures] = useState([]);

  const factoryStagesMap = useMemo(() => ({
    'Nhà máy 1': [
      'Tổ tạo phôi',
      'Tổ định hình 1',
      'Tổ định hình 2',
      'Tổ lắp ráp 1',
      'Tổ sấy gỗ & kho nguyên liệu'
    ],
    'Nhà máy 2': [
      'Tổ định hình 3',
      'Tổ định hình 4',
      'Tổ dán nẹp & phay CNC',
      'Tổ sơn PU 1',
      'Tổ sơn PU 2'
    ],
    'Nhà máy 3': [
      'Tổ QC kiểm định',
      'Đóng gói 1',
      'Đóng gói 2',
      'Tổ bọc màng PE & xếp pallet'
    ],
    'Nhà máy 4': [
      'Tổ phụ kiện kim loại',
      'Tổ gia công kim loại & hàn khung',
      'Tổ sơn mạ & xử lý kim loại'
    ]
  }), []);

  // 5 công đoạn sản xuất chuẩn hóa cho Tổ sản xuất
  const STANDARD_PRODUCTION_STAGES = useMemo(() => [
    'Tạo Phôi',
    'Định Hình',
    'Lắp Ráp',
    'Sơn',
    'Đóng Gói'
  ], []);

  const availableStagesForFactory = useMemo(() => {
    return STANDARD_PRODUCTION_STAGES;
  }, [STANDARD_PRODUCTION_STAGES]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, routingsRes, factoryRes] = await Promise.all([
          api.get('/production/teams'),
          api.get('/production/routings'),
          api.get('/hr/factory-structures').catch(() => [])
        ]);

        // Cập nhật danh sách nhà máy từ CSDL cấu hình
        const rawFactories = Array.isArray(factoryRes) ? factoryRes : (factoryRes?.data || []);
        if (rawFactories.length > 0) {
          setFactoryStructures(rawFactories);
        }
        const productsRes = [];
        const stagesRes = [];

        const rawTeams = Array.isArray(teamsRes) ? teamsRes : (teamsRes && teamsRes.data) ? teamsRes.data : [];
        const rawRoutings = Array.isArray(routingsRes) ? routingsRes : (routingsRes && routingsRes.data) ? routingsRes.data : [];
        const rawProducts = Array.isArray(productsRes) ? productsRes : (productsRes && productsRes.data) ? productsRes.data : [];
        const rawStages = Array.isArray(stagesRes) ? stagesRes : (stagesRes && stagesRes.data) ? stagesRes.data : [];

        if (Array.isArray(rawStages) && rawStages.length > 0) {
          const names = rawStages.map(s => s.stage_name || s.name || s.code).filter(Boolean);
          if (names.length > 0) {
            setBomStages(prev => Array.from(new Set([...prev, ...names])));
          }
        }

        let loadedTeams = [];
        if (Array.isArray(rawTeams) && rawTeams.length > 0) {
          loadedTeams = rawTeams.map(t => ({
            id: t.id,
            teamCode: t.team_code,
            teamName: t.team_name,
            factory: t.factory,
            members: t.members_count || 10,
            desc: t.description || '',
            color: t.color || (t.factory === 'Nhà máy 1' ? '#2D1A12' : t.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6')
          }));

          setTeamsList(loadedTeams);
        }

        let parsedRoutings = [];
        if (Array.isArray(rawRoutings) && rawRoutings.length > 0) {
          const newTeamsMap = {};
          parsedRoutings = rawRoutings.map(r => {
            const dbNodes = (r.nodes || []).map(n => ({
              id: n.id || n.team_id,
              teamCode: n.team_code,
              teamName: n.team_name,
              factory: n.factory,
              members: 10,
              desc: `Tổ phụ trách công đoạn ${n.team_name}`,
              color: n.color || (n.factory === 'Nhà máy 1' ? '#2D1A12' : n.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6')
            }));

            const isPreset = ['QT-TU-01', 'QT-BAN-01', 'QT-GIUONG-01'].includes(r.routing_code);
            const effectiveNodes = dbNodes.length > 0 ? dbNodes : (isPreset ? loadedTeams : []);
            newTeamsMap[r.routing_code] = effectiveNodes;

            return {
              id: r.routing_code,
              numericId: r.id,
              code: r.routing_code,
              name: r.routing_name,
              category: r.category || r.category_name || '',
              categoryId: r.category_id || null,
              categoryName: r.category_name || r.category || '',
              isDefault: r.is_default,
              appliedCount: r.applied_count || 0,
              nodes: effectiveNodes
            };
          });

          setRoutingTeamsMap(newTeamsMap);
          setRoutingsList(parsedRoutings);
          if (parsedRoutings.length > 0 && !parsedRoutings.some(r => r.id === selectedRoutingId || r.code === selectedRoutingId)) {
            setSelectedRoutingId(parsedRoutings[0].id || parsedRoutings[0].code);
          }
        }

        const curR = (parsedRoutings && parsedRoutings.length > 0)
          ? (parsedRoutings.find(r => r.id === selectedRoutingId || r.code === selectedRoutingId) || parsedRoutings[0])
          : currentRouting;

        const seriesKey = extractDòngHàngKey(curR?.category, curR?.code, curR?.name);

        if (seriesKey) {
          try {
            const mpRes = await api.get(`/master-products/?q=${seriesKey}&limit=5000`);
            const mpData = (mpRes && mpRes.items) ? mpRes.items : (Array.isArray(mpRes) ? mpRes : []);
            if (Array.isArray(mpData) && mpData.length > 0) {
              const masterProds = mpData.map((item, idx) => ({
                id: item.id || idx + 1,
                code: item.sku,
                name: item.name || item.sku,
                applyDate: item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '01/08/2026',
                routingCode: curR?.code || selectedRoutingId,
                category: curR?.category || seriesKey,
                status: 'Đang áp dụng'
              }));
              setAppliedProducts(prev => {
                const otherProds = prev.filter(p => !p.code.toUpperCase().includes(seriesKey.toUpperCase()));
                return [...otherProds, ...masterProds];
              });
            }
          } catch (e) {
            console.warn('Lỗi fetch master products cho Dòng hàng:', e);
          }
        }
      } catch (err) {
        console.warn('Lỗi fetch dữ liệu backend:', err);
      }
    };
    fetchData();
  }, [selectedRoutingId]);

  const activeNodeObj = useMemo(() => {
    return validPipelineNodes.find(n => n.id === activeNodeId) || validPipelineNodes[0] || null;
  }, [validPipelineNodes, activeNodeId]);

  const filteredExecutionPlanRows = useMemo(() => {
    if (validPipelineNodes.length === 0) return [];

    let rows = allExecutionPlanRows.filter(
      r => r.routingId === currentRouting.id && (!activeNodeObj || r.teamCode === activeNodeObj.teamCode)
    );

    const validTeamCodes = new Set(validPipelineNodes.map(n => n.teamCode));
    rows = rows.filter(r => validTeamCodes.has(r.teamCode));

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        r => r.partName.toLowerCase().includes(term) ||
          r.partSku.toLowerCase().includes(term) ||
          r.partType.toLowerCase().includes(term) ||
          r.material.toLowerCase().includes(term)
      );
    }
    return rows;
  }, [allExecutionPlanRows, currentRouting.id, activeNodeObj, searchTerm, validPipelineNodes]);

  const handleAddTeamToPipeline = (team) => {
    const isExist = currentRouting.nodes.some(n => n.teamCode === team.teamCode);
    if (isExist) {
      if (toast) toast('warning', `Tổ ${team.teamName} đã có trên chuỗi quy trình này!`);
      return;
    }

    const newNode = {
      id: Date.now(),
      teamCode: team.teamCode,
      teamName: team.teamName,
      factory: team.factory,
      color: team.factory === 'Nhà máy 1' ? '#2D1A12' : team.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6'
    };

    const updatedRoutings = routingsList.map(r => {
      if (r.id === currentRouting.id) {
        return { ...r, nodes: [...r.nodes, newNode] };
      }
      return r;
    });

    setRoutingsList(updatedRoutings);
    setActiveNodeId(newNode.id);
    if (toast) toast('success', `Đã thêm ${team.teamName} vào chuỗi luồng!`);
  };

  const handleMoveNode = (nodeId, direction) => {
    const nodes = [...currentRouting.nodes];
    const index = nodes.findIndex(n => n.id === nodeId);
    if (index === -1) return;

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nodes.length) return;

    const temp = nodes[index];
    nodes[index] = nodes[targetIndex];
    nodes[targetIndex] = temp;

    setRoutingsList(routingsList.map(r => r.id === currentRouting.id ? { ...r, nodes } : r));
  };

  const handleRemoveNode = (nodeId) => {
    if (currentRouting.nodes.length <= 1) {
      if (toast) toast('warning', 'Quy trình phải có ít nhất 1 tổ sản xuất!');
      return;
    }
    const updatedNodes = currentRouting.nodes.filter(n => n.id !== nodeId);
    setRoutingsList(routingsList.map(r => r.id === currentRouting.id ? { ...r, nodes: updatedNodes } : r));
    if (activeNodeId === nodeId) setActiveNodeId(updatedNodes[0].id);
  };

  const handleCopyRouting = async () => {
    const newCode = `QT-COPY-${Date.now().toString().slice(-4)}`;
    try {
      if (currentRouting.numericId) {
        await api.post(`/production/routings/${currentRouting.numericId}/duplicate`);
      }
    } catch (e) {
      console.warn('Sao chép local state:', e);
    }
    const newRouting = {
      ...currentRouting,
      id: newCode,
      code: newCode,
      name: `${currentRouting.name} (Bản sao)`,
      isDefault: false,
      appliedCount: 0,
      nodes: currentRouting.nodes.map(n => ({ ...n, id: Date.now() + Math.random() }))
    };
    setRoutingsList([...routingsList, newRouting]);
    setSelectedRoutingId(newCode);
    if (toast) toast('success', `Đã sao chép thành công Quy trình ${newCode}!`);
  };

  const handleOpenAddTeamModal = () => {
    // Lấy nhà máy đầu tiên từ CSDL cấu hình, fallback hardcoded nếu chưa có
    const defaultFac = (factoryStructures.length > 0)
      ? (factoryStructures[0].structure_name || 'Nhà máy 1')
      : 'Nhà máy 1';
    const facCode = (factoryStructures.length > 0)
      ? (factoryStructures[0].structure_code || 'NM1')
      : 'NM1';
    const code = `TO-${facCode}-${Math.floor(100 + Math.random() * 900)}`;
    const firstStage = (STANDARD_PRODUCTION_STAGES && STANDARD_PRODUCTION_STAGES[0]) || 'Tạo Phôi';
    setNewTeamForm({
      factory: defaultFac,
      teamCode: code,
      teamName: '',
      selectedStages: [firstStage],
      members: 10,
      desc: ''
    });
    setIsStageDropdownOpen(false);
    setShowAddTeamModal(true);
  };

  const handleCreateNewTeam = async (e) => {
    e.preventDefault();
    const finalTeamName = (newTeamForm.teamName && newTeamForm.teamName.trim())
      ? newTeamForm.teamName.trim()
      : ((newTeamForm.selectedStages && newTeamForm.selectedStages.length > 0) ? newTeamForm.selectedStages.join(', ') : 'Tổ sản xuất');

    if (!finalTeamName) {
      if (toast) toast('warning', 'Vui lòng nhập Tên tổ sản xuất hoặc chọn Công đoạn!');
      return;
    }
    const tCode = newTeamForm.teamCode || `TO-NM1-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      team_code: tCode,
      team_name: finalTeamName,
      factory: newTeamForm.factory || 'Nhà máy 1',
      members_count: Number(newTeamForm.members) || 10,
      description: newTeamForm.desc || 'Tổ sản xuất mới',
      color: newTeamForm.factory === 'Nhà máy 1' ? '#2D1A12' : newTeamForm.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6'
    };

    try {
      const res = await api.post('/production/teams', payload);
      const created = (res && res.id) ? res : (res && res.data ? res.data : (res || {}));
      const newTeamObj = {
        id: created.id || Date.now(),
        teamCode: created.team_code || tCode,
        teamName: created.team_name || finalTeamName,
        factory: created.factory || newTeamForm.factory,
        members: created.members_count || 10,
        stages: newTeamForm.selectedStages || [],
        desc: created.description || ''
      };

      // Gọi API thêm tổ vào quy trình (tạo routing_node trong CSDL)
      const routingKey = (currentRouting && currentRouting.id) || selectedRoutingId || 'QT-TU-01';
      const rObj = routingsList.find(r => r.id === routingKey || r.code === routingKey);
      const targetRoutingId = (rObj && rObj.numericId) ? rObj.numericId : routingKey;
      try {
        await api.post(`/production/routings/${targetRoutingId}/nodes`, { team_id: newTeamObj.id });
      } catch (nodeErr) {
        console.warn('Lỗi tạo routing node:', nodeErr);
      }

      const currentList = currentRoutingTeams || [];
      const updatedTeamsList = [...currentList, newTeamObj];
      setRoutingTeamsMap(prev => ({
        ...prev,
        [routingKey]: updatedTeamsList
      }));
      setTeamsList(prev => [...(prev || []), newTeamObj]);

      setRoutingsList(prevRoutings => prevRoutings.map(r => {
        if (r.id === routingKey) {
          const exists = (r.nodes || []).some(n => n.teamCode === newTeamObj.teamCode);
          if (!exists) {
            return {
              ...r,
              nodes: [...(r.nodes || []), {
                id: newTeamObj.id,
                teamCode: newTeamObj.teamCode,
                teamName: newTeamObj.teamName,
                factory: newTeamObj.factory,
                color: newTeamObj.factory === 'Nhà máy 1' ? '#2D1A12' : newTeamObj.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6'
              }]
            };
          }
        }
        return r;
      }));

      setShowAddTeamModal(false);
      setNewTeamForm({ factory: 'Nhà máy 1', teamCode: '', teamName: '', members: 10, desc: '' });
      if (toast) toast('success', `Đã lưu CSDL thành công Tổ ${newTeamForm.teamName} (${tCode})!`);
    } catch (err) {
      console.error('Lỗi khi lưu Tổ vào CSDL:', err);
      const fallbackObj = {
        id: Date.now(),
        teamCode: tCode,
        teamName: newTeamForm.teamName,
        factory: newTeamForm.factory,
        members: Number(newTeamForm.members) || 10,
        desc: newTeamForm.desc || 'Tổ sản xuất mới'
      };
      const routingKey = (currentRouting && currentRouting.id) || selectedRoutingId || 'QT-TU-01';
      const currentList = currentRoutingTeams || [];
      setRoutingTeamsMap(prev => ({
        ...prev,
        [routingKey]: [...currentList, fallbackObj]
      }));
      setShowAddTeamModal(false);
      const msg = err?.response?.data?.detail || err?.message || 'Lỗi server khi lưu';
      if (toast) toast('warning', `Lỗi kết nối CSDL: ${msg}`);
    }
  };

  const handleOpenAddRoutingModal = async () => {
    // Fetch mã QTSX-xx tự tăng tiếp theo từ CSDL
    let nextCode = 'QTSX-01';
    let nextNum = 1;
    try {
      const res = await api.get('/production/routings/next-code');
      if (res && res.next_code) {
        nextCode = res.next_code;
        nextNum = res.next_num || 1;
      }
    } catch (e) {
      console.warn('Lỗi lấy mã QTSX tiếp theo:', e);
      // Fallback: tính từ danh sách hiện tại
      const maxNum = routingsList.reduce((max, r) => {
        const m = (r.code || '').match(/QTSX-(\d+)/);
        return m ? Math.max(max, parseInt(m[1])) : max;
      }, 0);
      nextCode = `QTSX-${String(maxNum + 1).zfill ? String(maxNum + 1).padStart(2, '0') : String(maxNum + 1).padStart(2, '0')}`;
    }
    const firstCat = masterCategories[0];
    setNewRoutingForm({
      code: nextCode,
      name: `Quy trình sản xuất mới ${nextNum}`,
      categoryId: firstCat ? firstCat.id : '',
      category: firstCat ? firstCat.name : '',
      desc: 'Mô tả chi tiết quy trình sản xuất mới',
      autoAssign: true
    });
    setShowAddRoutingModal(true);
  };

  const handleCreateNewRouting = async (e) => {
    e.preventDefault();
    if (!newRoutingForm.name || !newRoutingForm.code) {
      if (toast) toast('warning', 'Vui lòng nhập Mã và Tên quy trình!');
      return;
    }

    const selectedCat = masterCategories.find(c => String(c.id) === String(newRoutingForm.categoryId));
    const payload = {
      routing_code: newRoutingForm.code,
      routing_name: newRoutingForm.name,
      category: selectedCat ? selectedCat.name : (newRoutingForm.category || ''),
      category_id: newRoutingForm.categoryId ? Number(newRoutingForm.categoryId) : null,
      description: newRoutingForm.desc || '',
      is_default: false,
      applied_count: 0,
      auto_assign_products: Boolean(newRoutingForm.autoAssign)
    };

    try {
      const res = await api.post('/production/routings', payload);
      const rawRes = Array.isArray(res) ? res : (res && res.data) ? res.data : [];
      if (Array.isArray(rawRes) && rawRes.length > 0) {
        const parsedRoutings = rawRes.map(r => ({
          id: r.routing_code,
          numericId: r.id,
          code: r.routing_code,
          name: r.routing_name,
          category: r.category || r.category_name || '',
          categoryId: r.category_id || null,
          categoryName: r.category_name || r.category || '',
          isDefault: r.is_default,
          appliedCount: r.applied_count || 0,
          nodes: (r.nodes || []).map(n => ({
            id: n.id || n.team_id,
            teamCode: n.team_code,
            teamName: n.team_name,
            factory: n.factory,
            color: n.color || '#2D1A12'
          }))
        }));
        setRoutingsList(parsedRoutings);
      } else {
        const newObj = {
          id: newRoutingForm.code,
          code: newRoutingForm.code,
          name: newRoutingForm.name,
          category: newRoutingForm.category,
          isDefault: false,
          appliedCount: 0,
          nodes: []
        };
        setRoutingsList(prev => [...prev, newObj]);
      }

      setSelectedRoutingId(newRoutingForm.code);
      setShowAddRoutingModal(false);
      if (toast) toast('success', `Đã tạo CSDL thành công Quy trình ${newRoutingForm.code}!`);
    } catch (err) {
      console.error('Lỗi tạo quy trình:', err);
      const fallbackObj = {
        id: newRoutingForm.code,
        code: newRoutingForm.code,
        name: newRoutingForm.name,
        category: newRoutingForm.category,
        isDefault: false,
        appliedCount: 0,
        nodes: []
      };
      setRoutingsList(prev => [...prev, fallbackObj]);
      setSelectedRoutingId(newRoutingForm.code);
      setShowAddRoutingModal(false);
      if (toast) toast('success', `Đã khởi tạo Quy trình ${newRoutingForm.code}!`);
    }
  };

  const handleDeleteCurrentRouting = () => {
    if (routingsList.length <= 1) {
      if (toast) toast('warning', 'Không thể xóa quy trình duy nhất còn lại!');
      return;
    }
    const targetRouting = currentRouting;

    setConfirmModalState({
      isOpen: true,
      title: 'Xác nhận xóa Quy trình sản xuất',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn Quy trình "${targetRouting.name}" (${targetRouting.code}) khỏi CSDL hệ thống?`,
      confirmText: 'Xóa Quy trình',
      onConfirm: async () => {
        try {
          const deleteId = targetRouting.numericId || targetRouting.id || targetRouting.code;
          if (deleteId) {
            await api.delete(`/production/routings/${deleteId}`);
          }
        } catch (e) {
          console.warn('Lỗi gọi API xóa quy trình:', e);
        }

        const remaining = routingsList.filter(r => r.id !== targetRouting.id && r.code !== targetRouting.code);
        setRoutingsList(remaining);
        if (remaining.length > 0) {
          setSelectedRoutingId(remaining[0].id || remaining[0].code);
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        if (toast) toast('info', `Đã xóa Quy trình ${targetRouting.code} thành công!`);
      }
    });
  };

  const handleDeleteTeamFromRouting = (teamId) => {
    const routingKey = selectedRoutingId || 'QT-TU-01';
    const teamObj = (currentRoutingTeams || []).find(t => t.id === teamId || t.teamCode === teamId) || {};
    const tName = teamObj.teamName || 'Tổ sản xuất';
    const tCode = teamObj.teamCode || '';

    setConfirmModalState({
      isOpen: true,
      title: 'Xác nhận xóa Tổ khỏi Quy trình',
      message: `Bạn có chắc chắn muốn xóa Tổ "${tName}" ${tCode ? `(${tCode})` : ''} khỏi Quy trình ${routingKey}?`,
      confirmText: 'Xóa Tổ khỏi quy trình',
      onConfirm: async () => {
        try {
          const rObj = routingsList.find(r => r.id === routingKey || r.code === routingKey);
          const targetId = (rObj && rObj.numericId) ? rObj.numericId : routingKey;
          await api.delete(`/production/routings/${targetId}/nodes/${tCode || teamId}`);
        } catch (e) {
          console.warn('Lỗi gọi API xóa node backend:', e);
        }

        setRoutingTeamsMap(prev => {
          const currentList = prev[routingKey] || currentRoutingTeams || [];
          return {
            ...prev,
            [routingKey]: currentList.filter(t => t.id !== teamId && t.teamCode !== tCode)
          };
        });

        setRoutingsList(prevRoutings => prevRoutings.map(r => {
          if (r.id === routingKey || r.code === routingKey) {
            return {
              ...r,
              nodes: (r.nodes || []).filter(n => n.id !== teamId && n.team_id !== teamId && n.teamCode !== tCode)
            };
          }
          return r;
        }));

        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        if (toast) toast('info', `Đã xóa Tổ ${tName} khỏi Quy trình ${routingKey}`);
      }
    });
  };

  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({
    startDate: '01/08/2026',
    endDate: '15/08/2026',
    partType: '',
    stageFrom: '',
    stageTo: '',
    partName: '',
    quantity: '0/1000',
    unit: 'Cái',
    dimensions: '',
    volume: '0.1',
    material: '',
    partSku: '',
    status: 'Chờ sản xuất'
  });

  const handleCreatePlanRow = (e) => {
    e.preventDefault();
    if (!newPlanForm.partName) {
      if (toast) toast('warning', 'Vui lòng nhập Tên thành phẩm/Chi tiết!');
      return;
    }
    const idx = currentRouting.nodes.findIndex(n => n.id === activeNodeObj?.id);
    const nextNode = currentRouting.nodes[idx + 1];

    const newRow = {
      id: Date.now(),
      routingId: currentRouting.id,
      teamCode: activeNodeObj?.teamCode || 'TO-DH-01',
      startDate: newPlanForm.startDate || '01/08/2026',
      endDate: newPlanForm.endDate || '15/08/2026',
      teamName: activeNodeObj?.teamName || 'Tổ Định hình 1',
      partType: newPlanForm.partType || 'Chi tiết gia công',
      stageFrom: newPlanForm.stageFrom || (activeNodeObj?.teamName || 'Định hình'),
      stageTo: newPlanForm.stageTo || (nextNode ? nextNode.teamName : 'Kho thành phẩm'),
      partName: newPlanForm.partName,
      quantity: newPlanForm.quantity || '0/1000',
      unit: newPlanForm.unit || 'Cái',
      dimensions: newPlanForm.dimensions || '12*70*600',
      volume: newPlanForm.volume || '0.1',
      material: newPlanForm.material || 'Gỗ sồi',
      partSku: newPlanForm.partSku ? newPlanForm.partSku.toUpperCase() : `SKU-${Date.now().toString().slice(-4)}`,
      status: newPlanForm.status || 'Chờ sản xuất'
    };

    setAllExecutionPlanRows([...allExecutionPlanRows, newRow]);
    setShowAddPlanModal(false);
    setNewPlanForm({
      startDate: '01/08/2026',
      endDate: '15/08/2026',
      partType: '',
      stageFrom: '',
      stageTo: '',
      partName: '',
      quantity: '0/1000',
      unit: 'Cái',
      dimensions: '',
      volume: '0.1',
      material: '',
      partSku: '',
      status: 'Chờ sản xuất'
    });
    if (toast) toast('success', 'Đã thêm thành công dòng kế hoạch mới!');
  };

  const handleDeletePlanRow = (id) => {
    setAllExecutionPlanRows(allExecutionPlanRows.filter(r => r.id !== id));
    if (toast) toast('info', 'Đã xóa dòng kế hoạch');
  };

  return (
    <div className="production-routing-container" style={{ padding: '20px 24px', backgroundColor: '#FAF6F0', minHeight: 'calc(100vh - 110px)', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        borderBottom: '2px solid #EADCC9',
        paddingBottom: '12px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {[
            { id: 'routing', label: 'Quy trình' },
            { id: 'products', label: 'Danh sách sản phẩm' },
            { id: 'workshops', label: 'Danh sách tổ' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.98rem',
                fontWeight: activeTab === tab.id ? '800' : '600',
                color: activeTab === tab.id ? '#2D1A12' : '#6B7280',
                borderBottom: activeTab === tab.id ? '3.5px solid #2D1A12' : '3.5px solid transparent',
                paddingBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleOpenAddRoutingModal}
            style={{
              padding: '8px 18px',
              backgroundColor: '#5D3B32',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(93, 59, 50, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} /> Tạo quy trình mới
          </button>

          <button
            onClick={handleCopyRouting}
            style={{
              padding: '8px 18px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #2D1A12',
              borderRadius: '8px',
              color: '#2D1A12',
              fontWeight: '800',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2D1A12'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFF'; e.currentTarget.style.color = '#2D1A12'; }}
          >
            <Copy size={16} /> Sao chép quy trình
          </button>

          <button
            onClick={handleDeleteCurrentRouting}
            title="Xóa Quy trình hiện tại"
            style={{
              padding: '8px 14px',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: '8px',
              color: '#DC2626',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
          >
            <Trash2 size={16} /> Xóa quy trình
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1.5px solid #EADCC9',
        padding: '14px 20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(45, 26, 18, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={18} color="#5D3B32" /> Chọn Quy trình:
          </span>
          <select
            value={selectedRoutingId}
            onChange={(e) => {
              setSelectedRoutingId(e.target.value);
              const found = routingsList.find(r => r.id === e.target.value);
              if (found && found.nodes.length > 0) {
                setActiveNodeId(found.nodes[0].id);
              }
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1.5px solid #EADCC9',
              backgroundColor: '#FAF6F0',
              fontWeight: '800',
              color: '#2D1A12',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '340px'
            }}
          >
            {routingsList.map(r => (
              <option key={r.id} value={r.id}>
                {r.code} - {r.name} ({r.nodes.length} Tổ trên luồng)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 12px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
            Đang áp dụng cho {assignedToThisCount.toLocaleString('vi-VN')} sản phẩm
          </span>
        </div>
      </div>

      {activeTab === 'routing' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '20px 24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isKhoTổCollapsed ? '0px' : '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={18} color="#5D3B32" /> Kho Tổ sản xuất (Cấu hình từ Tab "Danh sách tổ" - Bấm chọn Tổ để thêm vào Chuỗi luồng):
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setActiveTab('workshops')}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: '#FAF6F0',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '6px',
                    color: '#5D3B32',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Settings size={14} /> Quản lý danh sách tổ
                </button>
                <button
                  onClick={() => setIsKhoTổCollapsed(prev => !prev)}
                  title={isKhoTổCollapsed ? "Mở rộng Kho Tổ" : "Thu gọn Kho Tổ"}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: isKhoTổCollapsed ? '#5D3B32' : '#FAF6F0',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '6px',
                    color: isKhoTổCollapsed ? '#FFFFFF' : '#5D3B32',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isKhoTổCollapsed ? (
                    <>
                      <ChevronDown size={14} /> Mở rộng Kho Tổ
                    </>
                  ) : (
                    <>
                      <ChevronUp size={14} /> Thu gọn
                    </>
                  )}
                </button>
              </div>
            </div>

            {!isKhoTổCollapsed && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                {currentFactoryTeamsGrouped.length === 0 ? (
                  <div style={{ color: '#9CA3AF', fontSize: '0.88rem' }}>Chưa có Tổ nào trong danh sách tổ của quy trình này. Vui lòng thêm bên Tab "Danh sách tổ".</div>
                ) : (
                  currentFactoryTeamsGrouped.map(fac => (
                    <div key={fac.factory}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#6B7280', marginBottom: '10px' }}>
                        {fac.factory}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {fac.teams.map(t => {
                          const isInRouting = validPipelineNodes.some(n => n.teamCode === t.teamCode);
                          return (
                            <button
                              key={t.teamCode}
                              onClick={() => handleAddTeamToPipeline({ ...t, factory: fac.factory })}
                              title={`Click để thêm ${t.teamName} vào quy trình`}
                              style={{
                                border: 'none',
                                backgroundColor: fac.color,
                                color: '#FFFFFF',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: isInRouting ? 1 : 0.75,
                                boxShadow: isInRouting ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = isInRouting ? '1' : '0.75'}
                            >
                              {t.teamName}
                              {isInRouting ? <Check size={14} /> : <Plus size={14} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPipelineCollapsed ? '0px' : '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#D97706" /> Chuỗi Quy trình Chuyển tiếp giữa các Tổ (Nhấp chọn Tổ để lọc Bảng kế hoạch bên dưới):
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: '600' }}>
                  Dùng nút ← → để đổi thứ tự
                </span>
                <button
                  onClick={() => setIsPipelineCollapsed(prev => !prev)}
                  title={isPipelineCollapsed ? "Mở rộng Chuỗi Quy trình" : "Thu gọn Chuỗi Quy trình"}
                  style={{
                    padding: '5px 12px',
                    backgroundColor: isPipelineCollapsed ? '#5D3B32' : '#FAF6F0',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '6px',
                    color: isPipelineCollapsed ? '#FFFFFF' : '#5D3B32',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isPipelineCollapsed ? (
                    <>
                      <ChevronDown size={14} /> Mở rộng Chuỗi
                    </>
                  ) : (
                    <>
                      <ChevronUp size={14} /> Thu gọn
                    </>
                  )}
                </button>
              </div>
            </div>

            {!isPipelineCollapsed && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: validPipelineNodes.length === 0 ? 'center' : 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                minHeight: '80px',
                padding: '12px 0'
              }}>
                {validPipelineNodes.length === 0 ? (
                  <div style={{ color: '#9CA3AF', fontSize: '0.88rem', padding: '20px', textAlign: 'center', fontWeight: '600' }}>
                    Chưa có Tổ nào trong chuỗi luồng quy trình này. Vui lòng chọn Tổ ở khối "Kho Tổ sản xuất" phía trên để đưa vào chuỗi.
                  </div>
                ) : (
                  <>
                    {validPipelineNodes.map((node, idx, arr) => {
                      const isActive = activeNodeId === node.id;
                      return (
                        <React.Fragment key={node.id}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div
                              onClick={() => setActiveNodeId(node.id)}
                              style={{
                                backgroundColor: node.color || '#2D1A12',
                                color: '#FFFFFF',
                                padding: '12px 24px',
                                borderRadius: '10px',
                                fontWeight: '800',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                boxShadow: isActive ? `0 0 0 3px #10B981, 0 4px 14px ${node.color}55` : '0 4px 10px rgba(45, 26, 18, 0.12)',
                                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                userSelect: 'none'
                              }}
                            >
                              <span>{node.teamName}</span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.25)', paddingLeft: '8px' }}>
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 'left'); }}
                                    title="Di chuyển sang trái"
                                    style={{ border: 'none', background: 'transparent', color: '#FFF', cursor: 'pointer', padding: '2px' }}
                                  >
                                    <ArrowLeft size={14} />
                                  </button>
                                )}
                                {idx < arr.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 'right'); }}
                                    title="Di chuyển sang phải"
                                    style={{ border: 'none', background: 'transparent', color: '#FFF', cursor: 'pointer', padding: '2px' }}
                                  >
                                    <ArrowRight size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }}
                                  title="Xóa tổ khỏi chuỗi"
                                  style={{ border: 'none', background: 'transparent', color: '#F87171', cursor: 'pointer', padding: '2px', marginLeft: '2px' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>

                            {isActive && (
                              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#10B981', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                                Đang chọn
                              </span>
                            )}
                          </div>

                          <ArrowRight size={24} color="#9CA3AF" />
                        </React.Fragment>
                      );
                    })}

                    <div style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      padding: '12px 24px',
                      borderRadius: '10px',
                      fontWeight: '800',
                      fontSize: '0.95rem',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle2 size={18} /> Kho thành phẩm
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '20px 24px',
            boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '380px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Kế hoạch thực hiện</span>
                {activeNodeObj && (
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '3px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                    Công đoạn: {activeNodeObj.teamName}
                  </span>
                )}
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#5D3B32', backgroundColor: '#FAF6F0', padding: '3px 10px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                  SKU: {currentRouting.code}
                </span>
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Tìm chi tiết, mã SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.82rem' }}
                  />
                </div>
                <button
                  onClick={() => setShowAddPlanModal(true)}
                  style={{ padding: '7px 16px', background: '#5D3B32', border: 'none', borderRadius: '6px', color: '#FFF', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(93,59,50,0.2)' }}
                >
                  <Plus size={16} /> Thêm mới
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', height: filteredExecutionPlanRows.length === 0 ? '100%' : 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '45px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày bắt đầu (dự kiến)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày kết thúc (dự kiến)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tổ</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '120px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Loại</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '100px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn giao</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '100px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn nhận</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên thành phẩm</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '90px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Số lượng</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '60px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Đơn vị</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '100px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Quy cách (mm)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', width: '85px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Khối lượng (m3)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Vật liệu</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '140px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Mã thành phẩm</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '100px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Trạng thái</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '60px', fontWeight: '700' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExecutionPlanRows.length === 0 ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: 'center', padding: '3.5rem 2.5rem', color: '#94A3B8', fontWeight: '600' }}>
                        Không có dữ liệu kế hoạch cho công đoạn {activeNodeObj?.teamName || 'hiện tại'}. Nhấp nút "+ Thêm mới" để bổ sung.
                      </td>
                    </tr>
                  ) : (
                    filteredExecutionPlanRows.map((r, idx) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B', fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{r.startDate}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{r.endDate}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1E293B' }}>{r.teamName}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{r.partType}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{r.stageFrom}</td>
                        <td style={{ padding: '8px 10px', color: '#0284C7', fontWeight: '700' }}>{r.stageTo}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0F172A' }}>{r.partName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#1E293B' }}>{r.quantity}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{r.unit}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#475569' }}>{r.dimensions}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#334155' }}>{r.volume}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{r.material}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: '800', color: '#5D3B32' }}>{r.partSku}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            backgroundColor: '#FEF3C7',
                            color: '#D97706',
                            border: '1px solid #FDE68A'
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeletePlanRow(r.id)}
                            title="Xóa dòng kế hoạch"
                            style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
        }}>
          {/* Top Search & Filter Bar for Products */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1.5px solid #EADCC9',
            backgroundColor: '#FAF6F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#2D1A12' }}>
                  Danh sách Sản phẩm áp dụng Quy trình: <span style={{ color: '#7B5233' }}>{currentRouting.name} ({currentRouting.code})</span>
                </span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                  Quản lý gán sản phẩm từ mọi Dòng hàng vào Quy trình sản xuất này (Tổng số {totalMasterProducts.toLocaleString('vi-VN')} sản phẩm)
                </span>
              </div>

              {/* Action Buttons: Auto-assign & Bulk assign */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleAutoAssignSameCategory}
                  title="Tự động gán tất cả sản phẩm thuộc cùng Dòng hàng vào quy trình này"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', borderRadius: '8px', border: '1px solid #7B5233',
                    backgroundColor: '#FFFFFF', color: '#7B5233', fontWeight: 'bold',
                    fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <Sparkles size={14} />
                  <span>Tự động gán SP Dòng hàng</span>
                </button>

                {selectedProductSkus.length > 0 && (
                  <button
                    onClick={handleBulkAssignProducts}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '7px 14px', borderRadius: '8px', border: 'none',
                      backgroundColor: '#7B5233', color: '#FFFFFF', fontWeight: 'bold',
                      fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(123, 82, 51, 0.2)'
                    }}
                  >
                    <PlusCircle size={14} />
                    <span>Gán {selectedProductSkus.length} SP đã chọn</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scope Filter Tabs & Category Filter & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '8px', borderTop: '1px solid #EADCC9' }}>
              {/* Scope filter buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', padding: '4px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                <button
                  onClick={() => setProductScopeFilter('assigned')}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: '6px',
                    fontSize: '0.78rem', fontWeight: productScopeFilter === 'assigned' ? 800 : 600,
                    backgroundColor: productScopeFilter === 'assigned' ? '#7B5233' : 'transparent',
                    color: productScopeFilter === 'assigned' ? '#FFFFFF' : '#4B5563',
                    cursor: 'pointer'
                  }}
                >
                  Đã gán cho QT này
                </button>
                <button
                  onClick={() => setProductScopeFilter('all')}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: '6px',
                    fontSize: '0.78rem', fontWeight: productScopeFilter === 'all' ? 800 : 600,
                    backgroundColor: productScopeFilter === 'all' ? '#7B5233' : 'transparent',
                    color: productScopeFilter === 'all' ? '#FFFFFF' : '#4B5563',
                    cursor: 'pointer'
                  }}
                >
                  Tất cả sản phẩm ({totalMasterProducts.toLocaleString('vi-VN')})
                </button>
                <button
                  onClick={() => setProductScopeFilter('unassigned')}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: '6px',
                    fontSize: '0.78rem', fontWeight: productScopeFilter === 'unassigned' ? 800 : 600,
                    backgroundColor: productScopeFilter === 'unassigned' ? '#7B5233' : 'transparent',
                    color: productScopeFilter === 'unassigned' ? '#FFFFFF' : '#4B5563',
                    cursor: 'pointer'
                  }}
                >
                  Chưa gán quy trình
                </button>
              </div>

              {/* Category Filter Dropdown & Search Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Category selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter size={14} style={{ color: '#6B7280' }} />
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => { setProductCategoryFilter(e.target.value); setProductPage(0); }}
                    style={{
                      padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #EADCC9',
                      fontSize: '0.8rem', fontWeight: 'bold', outline: 'none', backgroundColor: '#FFFFFF', color: '#374151'
                    }}
                  >
                    <option value="ALL">-- Tất cả Dòng hàng --</option>
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Rows per page selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <select
                    value={productRowsPerPage}
                    onChange={(e) => { setProductRowsPerPage(Number(e.target.value)); setProductPage(0); }}
                    style={{
                      padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #EADCC9',
                      fontSize: '0.8rem', fontWeight: 'bold', outline: 'none', backgroundColor: '#FFFFFF', color: '#374151'
                    }}
                  >
                    <option value={15}>15 dòng</option>
                    <option value={30}>30 dòng</option>
                    <option value={50}>50 dòng</option>
                    <option value={100}>100 dòng</option>
                  </select>
                </div>

                {/* Reset button */}
                {(productCategoryFilter !== 'ALL' || productScopeFilter !== 'all' || productSearchTerm || productRowsPerPage !== 15) && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductCategoryFilter('ALL');
                      setProductScopeFilter('all');
                      setProductSearchTerm('');
                      setProductRowsPerPage(15);
                      setProductPage(0);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #EADCC9',
                      backgroundColor: '#FAF6F0',
                      color: '#7B5233',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                )}

                {/* Search input */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Tìm SKU, tên sản phẩm..."
                    value={productSearchTerm}
                    onChange={(e) => { setProductSearchTerm(e.target.value); setProductPage(0); }}
                    style={{ width: '100%', padding: '6px 26px 6px 30px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.8rem' }}
                  />
                  {productSearchTerm && (
                    <button
                      onClick={() => { setProductSearchTerm(''); setProductPage(0); }}
                      style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product Table Body */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '420px', backgroundColor: '#FFFDF9', padding: '0 12px 12px 12px' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ color: '#8B5E3C' }}>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '12px 14px', width: '45px', textAlign: 'center', borderRadius: '8px 0 0 8px' }}>
                    <input
                      type="checkbox"
                      checked={selectedProductSkus.length > 0 && selectedProductSkus.length === filteredAppliedProducts.length}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '12px 14px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', width: '55px' }}>STT</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '12px 14px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', width: '180px' }}>MÃ SẢN PHẨM (SKU)</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '12px 14px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase' }}>TÊN SẢN PHẨM</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '12px 14px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', width: '140px' }}>DÒNG HÀNG</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '12px 14px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', width: '160px' }}>QUY TRÌNH HÀM</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '12px 14px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', width: '120px', textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '12px 14px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', width: '130px', textAlign: 'center', borderRadius: '0 8px 8px 0' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppliedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontWeight: '600', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #F3EBE1' }}>
                      {productSearchTerm ? 'Không tìm thấy sản phẩm nào phù hợp với từ khóa.' : 'Chưa có sản phẩm nào trong danh mục lọc.'}
                    </td>
                  </tr>
                ) : (
                  paginatedAppliedProducts.map((p, idx) => {
                    const isSelected = selectedProductSkus.includes(p.code);
                    return (
                      <tr key={p.code + idx} style={{ backgroundColor: isSelected ? '#FAF6F0' : '#FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', border: '1px solid #F3EBE1', borderRadius: '10px' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'center', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1', borderLeft: '1px solid #F3EBE1' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectProduct(p.code)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 14px', color: '#6B7280', fontWeight: '600', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                          {productPage * productRowsPerPage + idx + 1}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '800', color: '#374151', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                          {p.code}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#111827', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#4B5563', fontWeight: '600', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                          <span style={{ backgroundColor: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {p.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0284C7', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                          {p.routingCode}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '16px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            backgroundColor: p.isAssignedToThis ? '#ECFDF5' : (p.routingCode !== '---' ? '#EFF6FF' : '#F3F4F6'),
                            color: p.isAssignedToThis ? '#10B981' : (p.routingCode !== '---' ? '#2563EB' : '#6B7280'),
                            border: `1px solid ${p.isAssignedToThis ? '#A7F3D0' : (p.routingCode !== '---' ? '#BFDBFE' : '#E5E7EB')}`
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1', borderRight: '1px solid #F3EBE1', position: 'relative' }}>
                          {p.isAssignedToThis ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                onClick={() => setOpenActionMenuSku(openActionMenuSku === p.code ? null : p.code)}
                                style={{ border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#7B5233', padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Thao tác"
                              >
                                ⋮
                              </button>
                              {openActionMenuSku === p.code && (
                                <div style={{ position: 'absolute', top: '38px', right: 0, zIndex: 20, backgroundColor: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: '140px', overflow: 'hidden', textAlign: 'left' }}>
                                  <button
                                    onClick={() => { handleUnassignSingleProduct(p.code); setOpenActionMenuSku(null); }}
                                    style={{ width: '100%', border: 'none', background: 'transparent', color: '#EF4444', padding: '8px 12px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}
                                  >
                                    Gỡ gán
                                  </button>
                                  <div style={{ padding: '4px 12px', fontSize: '0.7rem', color: '#9CA3AF', borderTop: '1px solid #F3EBE1' }}>Đổi quy trình</div>
                                  {routingsList.filter(r => r.id !== selectedRoutingId && r.code !== selectedRoutingId).map(r => (
                                    <button
                                      key={r.id}
                                      onClick={() => { handleChangeRoutingForProduct(p.code, r.code); setOpenActionMenuSku(null); }}
                                      style={{ width: '100%', border: 'none', background: 'transparent', color: '#374151', padding: '6px 12px', fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                      {r.code}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (p.routingCode && p.routingCode !== '---') {
                                  setConfirmModalState({
                                    isOpen: true,
                                    title: 'Xác nhận đổi Quy trình sản xuất',
                                    message: `Sản phẩm "${p.name}" (${p.code}) đang thuộc Quy trình ${p.routingCode}. Bạn có chắc muốn chuyển sang Quy trình ${selectedRoutingId || currentRouting?.code}?`,
                                    confirmText: 'Xác nhận chuyển',
                                    onConfirm: async () => {
                                      await handleAssignSingleProduct(p.code);
                                      setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                                    }
                                  });
                                } else {
                                  handleAssignSingleProduct(p.code);
                                }
                              }}
                              style={{ border: '1px solid #7B5233', backgroundColor: '#FAF6F0', color: '#7B5233', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                              title="Gán sản phẩm vào quy trình này"
                            >
                              + Gán vào QT
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer matching reference screenshot */}
          <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #F3EBE1', backgroundColor: '#FFFDF9' }}>
            <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
              Hiển thị <b>{filteredAppliedProducts.length > 0 ? productPage * productRowsPerPage + 1 : 0} - {Math.min((productPage + 1) * productRowsPerPage, filteredAppliedProducts.length)}</b> trên <b>{filteredAppliedProducts.length.toLocaleString('vi-VN')}</b> sản phẩm
            </div>

            <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                className="page-btn"
                onClick={() => setProductPage(p => Math.max(0, p - 1))}
                disabled={productPage === 0}
              >
                <ChevronLeft size={14} />
              </button>

              {(() => {
                const pages = [];
                const maxButtons = 5;
                let start = Math.max(0, productPage - 2);
                let end = Math.min(totalProductPages - 1, start + maxButtons - 1);
                if (end - start + 1 < maxButtons) {
                  start = Math.max(0, end - maxButtons + 1);
                }

                for (let i = start; i <= end; i++) {
                  const isActive = i === productPage;
                  pages.push(
                    <button
                      key={i}
                      className={`page-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setProductPage(i)}
                    >
                      {i + 1}
                    </button>
                  );
                }
                return pages;
              })()}

              <button
                className="page-btn"
                onClick={() => setProductPage(p => Math.min(totalProductPages - 1, p + 1))}
                disabled={productPage >= totalProductPages - 1}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workshops' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
        }}>
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1.5px solid #EADCC9',
            backgroundColor: '#FAF6F0'
          }}>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: '#2D1A12' }}>
                Danh sách Tổ thuộc Quy trình: {currentRouting.code} ({currentRouting.name})
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                Danh sách tổ ở tab này sẽ hiển thị trực tiếp ở khối "Kho Tổ sản xuất" ở Tab Quy trình (Ảnh 1)
              </span>
            </div>

            <button
              onClick={handleOpenAddTeamModal}
              style={{
                padding: '8px 18px',
                backgroundColor: '#5D3B32',
                border: 'none',
                borderRadius: '8px',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={18} /> Thêm tổ vào quy trình
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '140px' }}>Mã tổ</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '220px' }}>Tên tổ</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '160px' }}>Tên nhà máy</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800' }}>Mô tả công việc & Năng lực</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentRoutingTeams.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontWeight: '600' }}>
                      Chưa có Tổ nào thuộc Quy trình này. Nhấp nút "Thêm tổ vào quy trình" góc trên để bổ sung.
                    </td>
                  </tr>
                ) : (
                  currentRoutingTeams.map((t, idx) => (
                    <tr key={t.id || t.teamCode} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '800', color: '#5D3B32' }}>{t.teamCode}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#1F2937' }}>{t.teamName}</td>
                      <td style={{ padding: '12px 16px', color: '#4B5563', fontWeight: '700' }}>{t.factory}</td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>{t.desc}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteTeamFromRouting(t.id)}
                          title="Xóa tổ khỏi quy trình"
                          style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddTeamModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '460px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1.5px solid #EADCC9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>
                Thêm Tổ vào Quy trình {currentRouting.code}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTeamModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewTeam}>
              {/* FIELD 1 (ĐƯA LÊN ĐẦU & XÁM KHÔNG CẦN NHẬP): Mã Tổ Tự động Khởi tạo */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mã Tổ sản xuất (Tự động khởi tạo)
                </label>
                <input
                  type="text"
                  disabled
                  readOnly
                  value={newTeamForm.teamCode || `TO-NM1-${Math.floor(100 + Math.random() * 900)}`}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #D1D5DB',
                    backgroundColor: '#F3F4F6',
                    color: '#4B5563',
                    outline: 'none',
                    fontSize: '0.88rem',
                    fontWeight: '800',
                    fontFamily: 'monospace',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              {/* FIELD 2: Thuộc Nhà máy / Xưởng */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Thuộc Nhà máy / Xưởng *
                </label>
                <select
                  value={newTeamForm.factory}
                  onChange={(e) => {
                    const fac = e.target.value;
                    const facObj = factoryStructures.find(f => f.structure_name === fac);
                    const facCode = facObj ? facObj.structure_code : (fac.replace(/\D/g, '') ? `NM${fac.replace(/\D/g, '')}` : 'NM1');
                    const defaultStage = 'Tạo Phôi';
                    setNewTeamForm({
                      ...newTeamForm,
                      factory: fac,
                      teamCode: `TO-${facCode}-${Math.floor(100 + Math.random() * 900)}`,
                      teamName: '',
                      selectedStages: [defaultStage],
                      desc: ''
                    });
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontWeight: '700' }}
                >
                  {factoryStructures.length > 0 ? (
                    factoryStructures.map((fs, idx) => (
                      <option key={fs.id || idx} value={fs.structure_name}>
                        {fs.structure_name} ({fs.structure_code})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Nhà máy 1">Nhà máy 1</option>
                      <option value="Nhà máy 2">Nhà máy 2</option>
                      <option value="Nhà máy 3">Nhà máy 3</option>
                      <option value="Nhà máy 4">Nhà máy 4</option>
                    </>
                  )}
                </select>
              </div>

              {/* FIELD 3: Tên Tổ sản xuất (Lọc theo Nhà máy đã chọn) */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Tên Tổ sản xuất (Lọc theo {newTeamForm.factory}) *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* BỘ CHỌN CÔNG ĐOẠN ĐA CHỌN (MULTI-SELECT DROPDOWN) */}
                  <div style={{ position: 'relative', width: '50%' }}>
                    <button
                      type="button"
                      onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #EADCC9',
                        outline: 'none',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        backgroundColor: '#FAF6F0',
                        color: '#2D1A12',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '4px' }}>
                        {(newTeamForm.selectedStages && newTeamForm.selectedStages.length > 0)
                          ? newTeamForm.selectedStages.join(', ')
                          : '-- Chọn công đoạn --'}
                      </span>
                      <ChevronDown size={16} style={{ flexShrink: 0, color: '#5D3B32' }} />
                    </button>

                    {isStageDropdownOpen && (
                      <>
                        <div
                          onClick={() => setIsStageDropdownOpen(false)}
                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          backgroundColor: '#FFFFFF',
                          border: '1.5px solid #EADCC9',
                          borderRadius: '8px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                          zIndex: 1100,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          padding: '4px 0'
                        }}>
                          {availableStagesForFactory.map((stage, idx) => {
                            const isChecked = (newTeamForm.selectedStages || []).includes(stage);
                            return (
                              <label
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  fontSize: '0.84rem',
                                  fontWeight: isChecked ? '800' : '600',
                                  color: isChecked ? '#5D3B32' : '#374151',
                                  backgroundColor: isChecked ? '#FAF6F0' : 'transparent',
                                  borderBottom: idx < availableStagesForFactory.length - 1 ? '1px solid #F9FAFB' : 'none'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const current = newTeamForm.selectedStages || [];
                                    let updated = [];
                                    if (e.target.checked) {
                                      updated = [...current, stage];
                                    } else {
                                      updated = current.filter(s => s !== stage);
                                    }
                                    setNewTeamForm({
                                      ...newTeamForm,
                                      selectedStages: updated
                                    });
                                  }}
                                  style={{ accentColor: '#5D3B32', width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span>{stage}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Hoặc nhập tên Tổ..."
                    value={newTeamForm.teamName}
                    onChange={(e) => setNewTeamForm({ ...newTeamForm, teamName: e.target.value })}
                    style={{ width: '50%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* FIELD 4: Mô tả công việc & Năng lực */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mô tả công việc & Năng lực
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuyên gia công phay & dán nẹp"
                  value={newTeamForm.desc}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, desc: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFF', color: '#5D3B32', fontWeight: '700', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#5D3B32', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}
                >
                  Thêm Tổ mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddRoutingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '460px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1.5px solid #EADCC9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>
                Tạo Quy trình sản xuất mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRoutingModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewRouting}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mã Quy trình sản xuất *
                </label>
                <input
                  type="text"
                  required
                  disabled
                  readOnly
                  value={newRoutingForm.code}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #D1D5DB',
                    backgroundColor: '#F3F4F6',
                    color: '#4B5563',
                    outline: 'none',
                    fontSize: '0.88rem',
                    fontWeight: '800',
                    fontFamily: 'monospace',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Tên Quy trình sản xuất *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy trình sản xuất Tủ bếp gỗ tự nhiên"
                  value={newRoutingForm.name}
                  onChange={(e) => setNewRoutingForm({ ...newRoutingForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontWeight: '700' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Dòng hàng *
                </label>
                <select
                  value={newRoutingForm.categoryId}
                  onChange={(e) => {
                    const cat = masterCategories.find(c => String(c.id) === String(e.target.value));
                    setNewRoutingForm({ ...newRoutingForm, categoryId: e.target.value, category: cat ? cat.name : '' });
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontWeight: '700' }}
                >
                  <option value="">-- Chọn Dòng hàng --</option>
                  {masterCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({(cat.product_count || 0).toLocaleString('vi-VN')} SP)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FAF6F0', padding: '10px 12px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                <input
                  type="checkbox"
                  id="autoAssignOnCreate"
                  checked={newRoutingForm.autoAssign}
                  onChange={(e) => setNewRoutingForm({ ...newRoutingForm, autoAssign: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="autoAssignOnCreate" style={{ fontSize: '0.8rem', fontWeight: '600', color: '#5D3B32', cursor: 'pointer' }}>
                  Tự động gán tất cả sản phẩm thuộc Dòng hàng này vào Quy trình ngay khi tạo
                </label>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mô tả quy trình
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả quy trình..."
                  value={newRoutingForm.desc}
                  onChange={(e) => setNewRoutingForm({ ...newRoutingForm, desc: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRoutingModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFF', color: '#5D3B32', fontWeight: '700', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#5D3B32', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}
                >
                  Lưu Quy Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModalState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            width: '440px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1.5px solid #FCA5A5',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              border: '2px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#DC2626'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: '800', color: '#1F2937' }}>
              {confirmModalState.title || 'Xác nhận thực hiện'}
            </h3>

            <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.5' }}>
              {confirmModalState.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: '1.5px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModalState.onConfirm) confirmModalState.onConfirm();
                }}
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                }}
              >
                {confirmModalState.confirmText || 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductionRoutingView;


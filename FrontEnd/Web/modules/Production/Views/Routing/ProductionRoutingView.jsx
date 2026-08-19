import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search, ArrowUpDown, Filter, Plus, Copy, MoreHorizontal, Upload, Download,
  ArrowRight, ArrowLeft, Trash2, CheckCircle2, Layers, Building2, Wrench, Settings,
  Grid, PlusCircle, Check, X, ShieldAlert, Sparkles, RefreshCw, Calendar, Edit3, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Users, List, LayoutGrid, Save
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
  const [selectedFactoryTab, setSelectedFactoryTab] = useState('ALL');
  const [selectedTeamFactoryFilter, setSelectedTeamFactoryFilter] = useState('ALL');
  const [selectedTeamStageFilter, setSelectedTeamStageFilter] = useState('ALL');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isKhoTổCollapsed, setIsKhoTổCollapsed] = useState(false);
  const [factoryStructures, setFactoryStructures] = useState([]);
  const [bomStages, setBomStages] = useState([]);
  const [dbStages, setDbStages] = useState([]);

  // Chế độ gom nhóm và lọc công đoạn trực quan
  const [factoryStageTabMap, setFactoryStageTabMap] = useState({});
  const [catalogViewMode, setCatalogViewMode] = useState('ROWS'); // 'ROWS' (hàng ngang siêu gọn) | 'GRID' (lưới ô)
  const [pipelineViewMode, setPipelineViewMode] = useState('STAGE_GROUPED'); // 'STAGE_GROUPED' (gom theo công đoạn) | 'STEPS' (từng bước tuần tự)

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
    const currentRoutingCategorySeries = currentRouting?.line || currentRouting?.category || '';
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

  const FACTORY_PALETTE = ['#4A2E27', '#5D3B32', '#6D4C3D', '#795548', '#8D6E63', '#3E2723'];
  const getFactoryColor = (facName, index = 0) => {
    if (!facName) return FACTORY_PALETTE[index % FACTORY_PALETTE.length];
    if (facName.includes('1') || facName.includes('NM1')) return '#4A2E27';
    if (facName.includes('2') || facName.includes('NM2')) return '#5D3B32';
    if (facName.includes('3') || facName.includes('NM3')) return '#6D4C3D';
    if (facName.includes('4') || facName.includes('NM4')) return '#795548';
    return FACTORY_PALETTE[index % FACTORY_PALETTE.length];
  };

  const currentFactoryStagesTeamsGrouped = useMemo(() => {
    const rawFactories = (factoryStructures.length > 0)
      ? factoryStructures.map(f => f.structure_name)
      : ['Vaniti Phân Xưởng 1', 'Vaniti Phân Xưởng 2', 'Vaniti Phân Xưởng 3'];
    const uniqueFacs = Array.from(new Set(rawFactories)).filter(f => !f.toLowerCase().includes('văn phòng') && !f.toLowerCase().includes('van phong'));

    const sourceTeams = teamsList.length > 0 ? teamsList : currentRoutingTeams;
    
    // Stages from database (7 standard stages) or fallback list
    const stagesToUse = (dbStages && dbStages.length > 0) ? dbStages : [
      { id: 1, code: 'CD01', name: 'Nhập Kho/Đầu Vào', sequence: 1 },
      { id: 2, code: 'CD02', name: 'Tạo Phôi', sequence: 2 },
      { id: 3, code: 'CD03', name: 'Định Hình', sequence: 3 },
      { id: 4, code: 'CD04', name: 'Lắp Ráp', sequence: 4 },
      { id: 5, code: 'CD05', name: 'Sơn', sequence: 5 },
      { id: 6, code: 'CD06', name: 'Đóng Gói', sequence: 6 },
      { id: 7, code: 'CD07', name: 'Lưu Kho', sequence: 7 }
    ];

    const result = uniqueFacs.map((fac, idx) => {
      // Find all teams belonging to this factory
      const facTeams = sourceTeams.filter(t => {
        let tFac = t.factory;
        if (tFac === fac) return true;
        if (tFac && (tFac.includes('1') && fac.includes('1') || tFac.includes('2') && fac.includes('2') || tFac.includes('3') && fac.includes('3'))) return true;
        if (t.teamCode && (t.teamCode.includes('NM1') && fac.includes('1') || t.teamCode.includes('NM2') && fac.includes('2') || t.teamCode.includes('NM3') && fac.includes('3'))) return true;
        return false;
      });

      // Group these teams by Stage
      const stageGroups = stagesToUse.map(stg => {
        const sName = stg.name || stg.stage_name;
        const sId = stg.id;
        
        const matchedTeams = facTeams.filter(t => {
          const tStageId = t.stageId ?? t.stage_id;
          const tStageName = t.stageName || t.stage_name;

          // Priority 1: match on explicit Stage ID
          if (tStageId != null && tStageId !== '') {
            return Number(tStageId) === Number(sId);
          }
          // Priority 2: match on explicit Stage Name
          if (tStageName) {
            return tStageName.trim().toLowerCase() === sName.trim().toLowerCase();
          }

          // Fuzzy fallback only when both stageId and stageName are missing
          const tText = `${t.teamCode || ''} ${t.teamName || ''}`.toLowerCase();
          const sLower = sName.toLowerCase();
          if ((sLower.includes('nhập kho') || sLower.includes('đầu vào')) && (tText.includes('nhap') || tText.includes('nhập') || tText.includes('dau vao') || tText.includes('vật tư'))) return true;
          if ((sLower.includes('phôi') || sLower.includes('phoi')) && (tText.includes('phoi') || tText.includes('phôi') || tText.includes('xẻ'))) return true;
          if (sLower.includes('định hình') && (tText.includes('dinhhinh') || tText.includes('định hình') || tText.includes('cnc') || tText.includes('nẹp') || tText.includes('khoan') || tText.includes('uốn') || tText.includes('bào') || tText.includes('phay'))) return true;
          if (sLower.includes('lắp ráp') && (tText.includes('laprap') || tText.includes('lắp ráp') || tText.includes('lắp') || tText.includes('hàn') || tText.includes('module') || tText.includes('nệm') || tText.includes('nem') || tText.includes('han'))) return true;
          if (sLower.includes('sơn') && (tText.includes('son') || tText.includes('sơn') || tText.includes('sontd'))) return true;
          if (sLower.includes('đóng gói') && (tText.includes('donggoi') || tText.includes('đóng gói') || tText.includes('gói') || tText.includes('pallet') || tText.includes('pe') || tText.includes('bọc màng'))) return true;
          if ((sLower.includes('lưu kho') || sLower.includes('thành phẩm')) && (tText.includes('luukho') || tText.includes('lưu kho') || tText.includes('thành phẩm') || tText.includes('kho-tp'))) return true;
          return false;
        });

        return {
          stageId: sId,
          stageCode: stg.code,
          stageName: sName,
          stageSequence: stg.sequence || 0,
          teams: matchedTeams
        };
      });

      // Unassigned / other teams
      const assignedTeamIds = new Set(stageGroups.flatMap(sg => sg.teams.map(t => t.id || t.teamCode)));
      const unassignedTeams = facTeams.filter(t => !assignedTeamIds.has(t.id || t.teamCode));
      if (unassignedTeams.length > 0) {
        stageGroups.push({
          stageId: null,
          stageCode: 'OTHER',
          stageName: 'Tổ công đoạn khác',
          stageSequence: 99,
          teams: unassignedTeams
        });
      }

      return {
        factory: fac,
        color: getFactoryColor(fac, idx),
        totalTeams: facTeams.length,
        teams: facTeams,
        stages: stageGroups
      };
    });

    return result;
  }, [teamsList, currentRoutingTeams, factoryStructures, dbStages]);

  const currentFactoryTeamsGrouped = useMemo(() => {
    return currentFactoryStagesTeamsGrouped.map(fg => ({
      factory: fg.factory,
      color: fg.color,
      teams: fg.teams
    }));
  }, [currentFactoryStagesTeamsGrouped]);

  const filteredTeamsForTab = useMemo(() => {
    const source = teamsList.length > 0 ? teamsList : currentRoutingTeams;
    return source.filter(t => {
      const matchFactory = selectedTeamFactoryFilter === 'ALL' || t.factory === selectedTeamFactoryFilter;
      if (!matchFactory) return false;

      const matchStage = selectedTeamStageFilter === 'ALL' ||
        (t.stageId && String(t.stageId) === String(selectedTeamStageFilter)) ||
        (t.stageName && t.stageName === selectedTeamStageFilter);
      if (!matchStage) return false;

      if (teamSearchQuery.trim()) {
        const q = teamSearchQuery.trim().toLowerCase();
        const code = (t.teamCode || '').toLowerCase();
        const name = (t.teamName || '').toLowerCase();
        const desc = (t.desc || t.description || '').toLowerCase();
        const fac = (t.factory || '').toLowerCase();
        const stg = (t.stageName || '').toLowerCase();
        return code.includes(q) || name.includes(q) || desc.includes(q) || fac.includes(q) || stg.includes(q);
      }
      return true;
    });
  }, [teamsList, currentRoutingTeams, selectedTeamFactoryFilter, selectedTeamStageFilter, teamSearchQuery]);

  const validPipelineNodes = useMemo(() => {
    if (!currentRouting || !currentRouting.nodes) return currentRoutingTeams;
    if (['QT-TU-01', 'QT-BAN-01', 'QT-GIUONG-01'].includes(selectedRoutingId) && currentRouting.nodes.length === 0) {
      return currentRoutingTeams;
    }
    return currentRouting.nodes;
  }, [currentRouting, currentRoutingTeams, selectedRoutingId]);

  const factoryPipelineGroups = useMemo(() => {
    const rawFactories = (factoryStructures.length > 0)
      ? factoryStructures.map(f => f.structure_name)
      : ['Vaniti Phân Xưởng 1', 'Vaniti Phân Xưởng 2', 'Vaniti Phân Xưởng 3'];
    const uniqueFacs = Array.from(new Set(rawFactories)).filter(f => !f.toLowerCase().includes('văn phòng') && !f.toLowerCase().includes('van phong'));

    return uniqueFacs.map((facName, idx) => {
      const facNodes = (validPipelineNodes || []).filter(n => {
        const nFac = n.factory;
        if (nFac === facName) return true;
        if (nFac === 'Nhà máy 1' && facName.includes('1')) return true;
        if (nFac === 'Nhà máy 2' && facName.includes('2')) return true;
        if (nFac === 'Nhà máy 3' && facName.includes('3')) return true;
        if (nFac === 'Nhà máy 4' && facName.includes('4')) return true;
        return false;
      });
      return {
        factory: facName,
        color: getFactoryColor(facName, idx),
        nodes: facNodes
      };
    });
  }, [factoryStructures, validPipelineNodes]);

  // Gom cụm các mắt xích theo Công đoạn để hiển thị chuỗi quy trình cực kỳ trực quan
  const factoryPipelineStageClusters = useMemo(() => {
    return factoryPipelineGroups.map(fg => {
      const clusters = [];
      let currentCluster = null;

      (fg.nodes || []).forEach((node, nodeIdx) => {
        const matchingTeam = teamsList.find(t => (t.teamCode && t.teamCode === node.teamCode) || (t.numericId && Number(t.numericId) === Number(node.teamId)));
        const officialStageName = matchingTeam?.stageName || node.stageName || (node.stageId ? `Công đoạn ${node.stageId}` : 'Chưa phân công đoạn');
        const officialStageId = matchingTeam?.stageId ?? node.stageId;
        const normalizedNode = { ...node, stageName: officialStageName, stageId: officialStageId, originalIndex: nodeIdx };

        if (!currentCluster || currentCluster.stageName !== officialStageName) {
          currentCluster = {
            stageId: officialStageId,
            stageName: officialStageName,
            nodes: [normalizedNode]
          };
          clusters.push(currentCluster);
        } else {
          currentCluster.nodes.push(normalizedNode);
        }
      });

      return {
        factory: fg.factory,
        color: fg.color,
        totalNodes: (fg.nodes || []).length,
        clusters: clusters
      };
    });
  }, [factoryPipelineGroups, teamsList]);

  const factoryTeamCounts = useMemo(() => {
    const source = teamsList.length > 0 ? teamsList : currentRoutingTeams;
    const counts = { ALL: source.length };
    (factoryStructures || []).forEach(f => {
      counts[f.structure_name] = 0;
    });
    currentFactoryTeamsGrouped.forEach(fg => {
      counts[fg.factory] = fg.teams.length;
    });
    return counts;
  }, [teamsList, currentRoutingTeams, factoryStructures, currentFactoryTeamsGrouped]);

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

  // 7 công đoạn sản xuất chuẩn hóa từ CSDL cho Tổ sản xuất
  const STANDARD_PRODUCTION_STAGES = useMemo(() => [
    'Nhập Kho/Đầu Vào',
    'Tạo Phôi',
    'Định Hình',
    'Lắp Ráp',
    'Sơn',
    'Đóng Gói',
    'Lưu Kho'
  ], []);

  const availableStagesForFactory = useMemo(() => {
    if (dbStages && dbStages.length > 0) {
      return dbStages.map(s => s.name || s.stage_name).filter(Boolean);
    }
    return STANDARD_PRODUCTION_STAGES;
  }, [dbStages, STANDARD_PRODUCTION_STAGES]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, routingsRes, factoryRes, stagesRes] = await Promise.all([
          api.get('/production/teams'),
          api.get('/production/routings'),
          api.get('/hr/factory-structures').catch(() => []),
          api.get('/stages').catch(() => [])
        ]);

        // Cập nhật danh sách nhà máy sản xuất từ CSDL cấu hình (loại bỏ Văn phòng / VP)
        const rawFactories = Array.isArray(factoryRes) ? factoryRes : (factoryRes?.data || []);
        const productionFactories = rawFactories.filter(f => {
          const code = (f.structure_code || '').toUpperCase();
          const name = (f.structure_name || '').toLowerCase();
          return code !== 'VP' && !name.includes('văn phòng') && !name.includes('van phong');
        });
        if (productionFactories.length > 0) {
          setFactoryStructures(productionFactories);
        }

        const rawTeams = Array.isArray(teamsRes) ? teamsRes : (teamsRes && teamsRes.data) ? teamsRes.data : [];
        const rawRoutings = Array.isArray(routingsRes) ? routingsRes : (routingsRes && routingsRes.data) ? routingsRes.data : [];
        const rawStages = Array.isArray(stagesRes) ? stagesRes : (stagesRes && stagesRes.data) ? stagesRes.data : [];

        if (Array.isArray(rawStages) && rawStages.length > 0) {
          const sortedStages = [...rawStages].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
          setDbStages(sortedStages);
          const names = sortedStages.map(s => s.stage_name || s.name || s.code).filter(Boolean);
          if (names.length > 0) {
            setBomStages(prev => Array.from(new Set([...prev, ...names])));
          }
        }

        let loadedTeams = [];
        if (Array.isArray(rawTeams) && rawTeams.length > 0) {
          loadedTeams = rawTeams.map((t, idx) => ({
            id: t.id ? String(t.id) : (t.team_code || `team-${idx}`),
            numericId: t.id,
            teamCode: t.team_code,
            teamName: t.team_name,
            factory: t.factory,
            stageId: t.stage_id,
            stageName: t.stage_name,
            members: t.members_count || 10,
            desc: t.description || '',
            color: t.color || (t.factory === 'Nhà máy 1' ? '#4A2E27' : t.factory === 'Nhà máy 2' ? '#5D3B32' : '#6D4C3D')
          }));

          setTeamsList(loadedTeams);
        }

        let parsedRoutings = [];
        if (Array.isArray(rawRoutings) && rawRoutings.length > 0) {
          const newTeamsMap = {};
          parsedRoutings = rawRoutings.map(r => {
            const dbNodes = (r.nodes || []).map((n, idx) => ({
              id: n.id ? String(n.id) : (n.team_code ? `${r.routing_code}-${n.team_code}-${idx}` : `node-${idx}`),
              numericId: n.id,
              teamId: n.team_id,
              teamCode: n.team_code,
              teamName: n.team_name,
              factory: n.factory,
              stageId: n.stage_id,
              stageName: n.stage_name,
              stepOrder: n.step_order || (idx + 1),
              members: 10,
              desc: `Tổ phụ trách công đoạn ${n.stage_name || n.team_name}`,
              color: n.color || (n.factory === 'Nhà máy 1' ? '#4A2E27' : n.factory === 'Nhà máy 2' ? '#5D3B32' : '#6D4C3D')
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
    if (!validPipelineNodes || validPipelineNodes.length === 0) return null;
    return validPipelineNodes.find(n =>
      Boolean(activeNodeId) && (
        String(n.id) === String(activeNodeId) ||
        (n.teamCode && n.teamCode === activeNodeId)
      )
    ) || validPipelineNodes[0] || null;
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

  const [isSavingRouting, setIsSavingRouting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSaveCurrentRouting = async () => {
    if (!currentRouting) return;
    const routingIdentifier = currentRouting.numericId !== undefined && currentRouting.numericId !== null
      ? currentRouting.numericId
      : (currentRouting.code || currentRouting.id);

    setIsSavingRouting(true);
    try {
      const nodesToSave = (currentRouting.nodes || []).map((node, idx) => ({
        team_id: node.teamId || node.numericId || (typeof node.id === 'number' ? node.id : null),
        team_code: node.teamCode || node.code,
        stage_id: node.stageId,
        stage_name: node.stageName,
        step_order: idx + 1,
        factory: node.factory,
        color: node.color
      }));

      const payload = {
        routing_name: currentRouting.name,
        line: currentRouting.line || currentRouting.category,
        category: currentRouting.category,
        category_id: currentRouting.categoryId,
        description: currentRouting.description,
        is_default: currentRouting.isDefault,
        nodes: nodesToSave
      };

      const res = await api.put(`/production/routings/${routingIdentifier}/save-full`, payload);

      const rawRoutings = Array.isArray(res) ? res : (res && res.data) ? res.data : [];
      if (Array.isArray(rawRoutings) && rawRoutings.length > 0) {
        const newTeamsMap = {};
        const parsed = rawRoutings.map(r => {
          const dbNodes = (r.nodes || []).map((n, idx) => ({
            id: n.id ? String(n.id) : (n.team_code ? `${r.routing_code}-${n.team_code}-${idx}` : `node-${idx}`),
            numericId: n.id,
            teamId: n.team_id,
            teamCode: n.team_code,
            teamName: n.team_name,
            factory: n.factory,
            stageId: n.stage_id,
            stageName: n.stage_name,
            stepOrder: n.step_order || (idx + 1),
            members: 10,
            desc: `Tổ phụ trách công đoạn ${n.stage_name || n.team_name}`,
            color: n.color || (n.factory === 'Nhà máy 1' ? '#4A2E27' : n.factory === 'Nhà máy 2' ? '#5D3B32' : '#6D4C3D')
          }));
          newTeamsMap[r.routing_code] = dbNodes;
          return {
            id: r.routing_code,
            numericId: r.id,
            code: r.routing_code,
            name: r.routing_name,
            line: r.line,
            category: r.category || r.category_name || '',
            categoryId: r.category_id || null,
            categoryName: r.category_name || r.category || '',
            isDefault: r.is_default,
            appliedCount: r.applied_count || 0,
            nodes: dbNodes
          };
        });
        setRoutingsList(parsed);
        setRoutingTeamsMap(newTeamsMap);
      }

      setHasUnsavedChanges(false);
      if (toast) toast('success', `Đã lưu toàn bộ cấu hình Quy trình "${currentRouting.name}" vào CSDL thành công!`);
    } catch (err) {
      console.error('Lỗi khi lưu quy trình:', err);
      if (toast) toast('error', `Lỗi lưu quy trình: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsSavingRouting(false);
    }
  };

  const handleAddTeamToPipeline = async (team) => {
    const isExist = (currentRouting.nodes || []).some(n => n.teamCode === team.teamCode);
    if (isExist) {
      if (toast) toast('warning', `Tổ ${team.teamName} đã có trên chuỗi quy trình này!`);
      return;
    }

    const matchingTeam = teamsList.find(t => (t.teamCode && t.teamCode === team.teamCode) || (t.numericId && Number(t.numericId) === Number(team.numericId || team.id)));
    const sId = matchingTeam?.stageId ?? team.stageId ?? team.stage_id;
    const sName = matchingTeam?.stageName || team.stageName || team.stage_name || (dbStages.find(s => Number(s.id) === Number(sId))?.name) || 'Chưa phân công đoạn';

    const newNode = {
      id: Date.now(),
      numericId: null,
      teamId: team.numericId || team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      factory: team.factory,
      stageId: sId,
      stageName: sName,
      color: getFactoryColor(team.factory)
    };

    const updatedRoutings = routingsList.map(r => {
      if (r.id === currentRouting.id || r.code === currentRouting.code) {
        return { ...r, nodes: [...(r.nodes || []), newNode] };
      }
      return r;
    });

    setRoutingsList(updatedRoutings);
    setActiveNodeId(newNode.teamCode || newNode.id);
    setHasUnsavedChanges(true);

    try {
      if (currentRouting.numericId && (team.numericId || team.id)) {
        const teamIdToSend = team.numericId || (typeof team.id === 'number' ? team.id : null);
        if (teamIdToSend) {
          await api.post(`/production/routings/${currentRouting.numericId}/nodes`, { team_id: teamIdToSend });
        }
      }
    } catch (e) {
      console.warn('Lỗi lưu node vào backend:', e);
    }

    if (toast) toast('success', `Đã thêm ${team.teamName} vào chuỗi luồng! Bấm "Lưu quy trình" để lưu cố định.`);
  };

  const handleToggleTeamInPipeline = async (team) => {
    const isExist = (currentRouting.nodes || []).some(n => n.teamCode === team.teamCode);
    if (isExist) {
      handleRemoveNode(team.teamCode || team.id);
    } else {
      handleAddTeamToPipeline(team);
    }
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
    setHasUnsavedChanges(true);
  };

  const handleMoveFactoryNode = async (factoryName, nodeId, direction) => {
    const allNodes = [...(currentRouting.nodes || [])];
    const facNodes = allNodes.filter(n => (n.factory || 'Nhà máy 1') === (factoryName || 'Nhà máy 1'));
    const index = facNodes.findIndex(n => String(n.id) === String(nodeId) || (n.teamCode && n.teamCode === nodeId));
    if (index === -1) return;

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= facNodes.length) return;

    const temp = facNodes[index];
    facNodes[index] = facNodes[targetIndex];
    facNodes[targetIndex] = temp;

    let fPointer = 0;
    const newAllNodes = allNodes.map(n => {
      if ((n.factory || 'Nhà máy 1') === (factoryName || 'Nhà máy 1')) {
        const item = facNodes[fPointer];
        fPointer++;
        return item;
      }
      return n;
    });

    setRoutingsList(routingsList.map(r => r.id === currentRouting.id ? { ...r, nodes: newAllNodes } : r));
    setHasUnsavedChanges(true);

    try {
      if (currentRouting.numericId) {
        const orderedNodeIds = newAllNodes.map(n => n.numericId || n.id).filter(id => typeof id === 'number');
        if (orderedNodeIds.length > 0) {
          await api.put(`/production/routings/${currentRouting.numericId}/nodes/reorder`, {
            ordered_node_ids: orderedNodeIds
          });
        }
      }
    } catch (e) {
      console.warn('Lỗi lưu thứ tự node:', e);
    }
  };

  const handleMoveFactoryCluster = async (factoryName, clusterIndex, direction) => {
    const fGroup = factoryPipelineStageClusters.find(fg => fg.factory === factoryName);
    if (!fGroup || !fGroup.clusters) return;

    const clusters = fGroup.clusters;
    const targetClusterIndex = direction === 'left' ? clusterIndex - 1 : clusterIndex + 1;
    if (targetClusterIndex < 0 || targetClusterIndex >= clusters.length) return;

    const reorderedClusters = [...clusters];
    const temp = reorderedClusters[clusterIndex];
    reorderedClusters[clusterIndex] = reorderedClusters[targetClusterIndex];
    reorderedClusters[targetClusterIndex] = temp;

    const reorderedFacNodes = reorderedClusters.flatMap(c => (c.nodes || []).map(n => {
      const { originalIndex, ...rest } = n;
      return rest;
    }));

    const allNodes = [...(currentRouting.nodes || [])];
    let fPointer = 0;
    const newAllNodes = allNodes.map(n => {
      if ((n.factory || 'Nhà máy 1') === (factoryName || 'Nhà máy 1')) {
        const item = reorderedFacNodes[fPointer];
        fPointer++;
        return item;
      }
      return n;
    });

    setRoutingsList(routingsList.map(r => r.id === currentRouting.id ? { ...r, nodes: newAllNodes } : r));
    setHasUnsavedChanges(true);

    try {
      if (currentRouting.numericId) {
        const orderedNodeIds = newAllNodes.map(n => n.numericId || n.id).filter(id => typeof id === 'number');
        if (orderedNodeIds.length > 0) {
          await api.put(`/production/routings/${currentRouting.numericId}/nodes/reorder`, {
            ordered_node_ids: orderedNodeIds
          });
        }
      }
    } catch (e) {
      console.warn('Lỗi lưu thứ tự công đoạn:', e);
    }

    if (toast) toast('info', `Đã chuyển vị trí công đoạn "${temp.stageName}"! Bấm "Lưu quy trình" để ghi nhận.`);
  };

  const handleAssignProductsByLine = async (lineCode) => {
    if (!lineCode || lineCode === 'ALL') return;
    const targetRoutingNumericId = currentRouting?.numericId;
    if (!targetRoutingNumericId) {
      if (toast) toast('warning', 'Không tìm thấy ID quy trình trong CSDL!');
      return;
    }
    try {
      const res = await api.post(`/production/routings/${targetRoutingNumericId}/products/assign-by-line`, { line: lineCode });
      const count = res?.assigned_count || 0;
      if (toast) toast('success', `Đã gán thành công ${count} sản phẩm thuộc Dòng hàng "${lineCode}" vào Quy trình!`);
      setRoutingsList(prev => prev.map(r => r.id === currentRouting.id ? { ...r, appliedCount: (r.appliedCount || 0) + count } : r));
    } catch (err) {
      console.error('Lỗi gán sản phẩm theo dòng hàng:', err);
      if (toast) toast('error', 'Lỗi gán sản phẩm theo dòng hàng!');
    }
  };

  const handleRemoveNode = async (nodeId) => {
    if (currentRouting.nodes.length <= 1) {
      if (toast) toast('warning', 'Quy trình phải có ít nhất 1 tổ sản xuất!');
      return;
    }
    const nodeObj = currentRouting.nodes.find(n => String(n.id) === String(nodeId) || (n.teamCode && n.teamCode === nodeId));
    const updatedNodes = currentRouting.nodes.filter(n => String(n.id) !== String(nodeId) && (!n.teamCode || n.teamCode !== nodeId));
    setRoutingsList(routingsList.map(r => r.id === currentRouting.id ? { ...r, nodes: updatedNodes } : r));
    setHasUnsavedChanges(true);

    if ((String(activeNodeId) === String(nodeId) || (nodeObj && activeNodeObj?.teamCode === nodeObj.teamCode)) && updatedNodes.length > 0) {
      setActiveNodeId(updatedNodes[0].teamCode || updatedNodes[0].id);
    }

    try {
      if (currentRouting.numericId) {
        const nodeRef = (nodeObj && nodeObj.numericId) ? nodeObj.numericId : ((nodeObj && nodeObj.teamCode) ? nodeObj.teamCode : nodeId);
        await api.delete(`/production/routings/${currentRouting.numericId}/nodes/${nodeRef}`);
      }
    } catch (e) {
      console.warn('Lỗi xóa node trên backend:', e);
    }
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
      ? (factoryStructures[0].structure_name || 'Vaniti Phân Xưởng 1')
      : 'Vaniti Phân Xưởng 1';
    const facCode = (factoryStructures.length > 0)
      ? (factoryStructures[0].structure_code || 'NM1')
      : 'NM1';
    const code = `TO-${facCode}-${Math.floor(100 + Math.random() * 900)}`;
    const firstStage = (dbStages && dbStages.length > 0) ? dbStages[0] : { id: 1, code: 'CD01', name: 'Nhập Kho/Đầu Vào' };
    const firstStageName = firstStage.name || firstStage.stage_name || 'Nhập Kho/Đầu Vào';

    setNewTeamForm({
      factory: defaultFac,
      stageId: firstStage.id,
      stageName: firstStageName,
      teamCode: code,
      teamName: `Tổ ${firstStageName}`,
      selectedStages: [firstStageName],
      members: 10,
      desc: `Tổ sản xuất thuộc công đoạn ${firstStageName}`
    });
    setIsStageDropdownOpen(false);
    setShowAddTeamModal(true);
  };

  const handleCreateNewTeam = async (e) => {
    e.preventDefault();
    const finalTeamName = (newTeamForm.teamName && newTeamForm.teamName.trim())
      ? newTeamForm.teamName.trim()
      : (newTeamForm.stageName ? `Tổ ${newTeamForm.stageName}` : 'Tổ sản xuất');

    if (!finalTeamName) {
      if (toast) toast('warning', 'Vui lòng nhập Tên tổ sản xuất hoặc chọn Công đoạn!');
      return;
    }
    const tCode = newTeamForm.teamCode || `TO-NM1-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      team_code: tCode,
      team_name: finalTeamName,
      factory: newTeamForm.factory || 'Vaniti Phân Xưởng 1',
      stage_id: newTeamForm.stageId ? Number(newTeamForm.stageId) : null,
      stage_name: newTeamForm.stageName || null,
      members_count: Number(newTeamForm.members) || 10,
      description: newTeamForm.desc || `Tổ sản xuất ${finalTeamName}`,
      color: getFactoryColor(newTeamForm.factory)
    };

    try {
      const res = await api.post('/production/teams', payload);
      const created = (res && res.id) ? res : (res && res.data ? res.data : (res || {}));
      const newTeamObj = {
        id: created.id ? String(created.id) : String(Date.now()),
        numericId: created.id,
        teamCode: created.team_code || tCode,
        teamName: created.team_name || finalTeamName,
        factory: created.factory || newTeamForm.factory,
        stageId: created.stage_id || newTeamForm.stageId,
        stageName: created.stage_name || newTeamForm.stageName,
        members: created.members_count || 10,
        stages: newTeamForm.selectedStages || [],
        desc: created.description || '',
        color: getFactoryColor(newTeamForm.factory)
      };

      // Gọi API thêm tổ vào quy trình (tạo routing_node trong CSDL)
      const routingKey = (currentRouting && currentRouting.id) || selectedRoutingId || 'QT-TU-01';
      const rObj = routingsList.find(r => r.id === routingKey || r.code === routingKey);
      const targetRoutingId = (rObj && rObj.numericId) ? rObj.numericId : routingKey;
      try {
        if (targetRoutingId && newTeamObj.numericId) {
          await api.post(`/production/routings/${targetRoutingId}/nodes`, { team_id: newTeamObj.numericId });
        }
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
        if (r.id === routingKey || r.code === routingKey) {
          const exists = (r.nodes || []).some(n => n.teamCode === newTeamObj.teamCode);
          if (!exists) {
            return {
              ...r,
              nodes: [...(r.nodes || []), {
                id: newTeamObj.id,
                numericId: newTeamObj.numericId,
                teamId: newTeamObj.numericId,
                teamCode: newTeamObj.teamCode,
                teamName: newTeamObj.teamName,
                factory: newTeamObj.factory,
                stageId: newTeamObj.stageId,
                stageName: newTeamObj.stageName,
                color: getFactoryColor(newTeamObj.factory)
              }]
            };
          }
        }
        return r;
      }));

      setShowAddTeamModal(false);
      setNewTeamForm({ factory: 'Vaniti Phân Xưởng 1', teamCode: '', teamName: '', stageId: null, stageName: '', members: 10, desc: '' });
      if (toast) toast('success', `Đã lưu CSDL thành công Tổ ${newTeamForm.teamName} (${tCode})!`);
    } catch (err) {
      console.error('Lỗi khi lưu Tổ vào CSDL:', err);
      const fallbackObj = {
        id: Date.now(),
        teamCode: tCode,
        teamName: newTeamForm.teamName,
        factory: newTeamForm.factory,
        stageId: newTeamForm.stageId,
        stageName: newTeamForm.stageName,
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

  const handleDeleteTeam = (team) => {
    if (!team) return;
    const tId = team.id !== undefined ? team.id : (team.numericId || team.teamCode);
    const tCode = team.teamCode || '';
    const tName = team.teamName || 'Tổ sản xuất';
    const tFactory = team.factory || 'Nhà máy';

    setConfirmModalState({
      isOpen: true,
      title: 'Xác nhận xóa Tổ sản xuất',
      message: `Bạn có chắc chắn muốn xóa "${tName}" ${tCode ? `(${tCode})` : ''} thuộc ${tFactory}? Thao tác này sẽ xóa tổ khỏi hệ thống và gỡ khỏi các quy trình liên quan.`,
      confirmText: 'Xóa Tổ sản xuất',
      onConfirm: async () => {
        try {
          await api.delete(`/production/teams/${tId}`);
        } catch (e) {
          console.warn('Lỗi gọi API xóa tổ backend:', e);
        }

        // Cập nhật danh sách tổ toàn cục
        setTeamsList(prev => prev.filter(t => t.id !== tId && t.teamCode !== tCode && t.id !== team.id));

        // Cập nhật danh sách tổ trong từng quy trình
        setRoutingTeamsMap(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            next[k] = (next[k] || []).filter(t => t.id !== tId && t.teamCode !== tCode && t.id !== team.id);
          });
          return next;
        });

        // Cập nhật node trong routingsList
        setRoutingsList(prevRoutings => prevRoutings.map(r => ({
          ...r,
          nodes: (r.nodes || []).filter(n => n.id !== tId && n.team_id !== tId && n.teamCode !== tCode && n.id !== team.id)
        })));

        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        if (toast) toast('info', `Đã xóa "${tName}" thành công!`);
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
            { id: 'routing', label: 'Quy trình sản xuất', icon: Layers },
            { id: 'products', label: 'Danh sách sản phẩm áp dụng', icon: Grid },
            { id: 'workshops', label: 'Danh mục Tổ sản xuất', icon: Building2 },
          ].map(tab => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.94rem',
                  fontWeight: isTabActive ? '800' : '600',
                  color: isTabActive ? '#2D1A12' : '#6B7280',
                  borderBottom: isTabActive ? '3px solid #5D3B32' : '3px solid transparent',
                  paddingBottom: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isTabActive ? '#5D3B32' : '#9CA3AF'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab !== 'workshops' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleSaveCurrentRouting}
              disabled={isSavingRouting}
              title="Lưu toàn bộ cấu hình thứ tự tổ và quy trình vào CSDL"
              style={{
                padding: '8px 18px',
                background: hasUnsavedChanges
                  ? 'linear-gradient(135deg, #15803D 0%, #166534 100%)'
                  : 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
                border: hasUnsavedChanges ? '1.5px solid #86EFAC' : 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '0.86rem',
                cursor: isSavingRouting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: hasUnsavedChanges
                  ? '0 0 14px rgba(34, 197, 94, 0.45), 0 2px 8px rgba(21, 128, 61, 0.3)'
                  : '0 2px 8px rgba(46, 125, 50, 0.25)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {isSavingRouting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Đang lưu CSDL...
                </>
              ) : (
                <>
                  <Save size={16} /> Lưu quy trình
                  {hasUnsavedChanges && (
                    <span style={{
                      backgroundColor: '#FEF08A',
                      color: '#854D0E',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      marginLeft: '2px',
                      border: '1px solid #FDE047'
                    }}>
                      Chưa lưu
                    </span>
                  )}
                </>
              )}
            </button>

            <button
              onClick={handleOpenAddRoutingModal}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #5D3B32 0%, #3D2218 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(93, 59, 50, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} /> Tạo quy trình mới
            </button>

            <button
              onClick={handleCopyRouting}
              style={{
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #EADCC9',
                borderRadius: '8px',
                color: '#5D3B32',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF6F0'; e.currentTarget.style.borderColor = '#D6C2AC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.borderColor = '#EADCC9'; }}
            >
              <Copy size={15} /> Sao chép quy trình
            </button>

            <button
              onClick={handleDeleteCurrentRouting}
              title="Xóa Quy trình hiện tại"
              style={{
                padding: '8px 14px',
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FEE2E2',
                borderRadius: '8px',
                color: '#DC2626',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
            >
              <Trash2 size={15} /> Xóa quy trình
            </button>
          </div>
        )}
      </div>

      {activeTab !== 'workshops' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1.5px solid #EADCC9',
          padding: '14px 20px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 3px 12px rgba(45, 26, 18, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#FAF6F0',
              border: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5D3B32'
            }}>
              <Layers size={16} />
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#2D1A12' }}>
              Quy trình đang chọn:
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
                padding: '8px 14px',
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
            <span style={{
              fontSize: '0.82rem',
              fontWeight: '700',
              color: '#5D3B32',
              backgroundColor: '#FAF6F0',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid #EADCC9',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={14} color="#5D3B32" />
              Đang áp dụng cho <strong>{assignedToThisCount.toLocaleString('vi-VN')}</strong> sản phẩm
            </span>
          </div>
        </div>
      )}

      {activeTab === 'routing' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Factory Scope Switcher Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'ALL', label: 'Tất cả nhà máy', desc: 'Toàn bộ xưởng', icon: '🏢' },
              ...((factoryStructures.length > 0 ? factoryStructures : [
                { structure_name: 'Vaniti Phân Xưởng 1', structure_code: 'NM1', description: 'Gỗ tự nhiên' },
                { structure_name: 'Vaniti Phân Xưởng 2', structure_code: 'NM2', description: 'Ván CN & MDF' },
                { structure_name: 'Vaniti Phân Xưởng 3', structure_code: 'NM3', description: 'Cơ khí & Kim loại' }
              ]).filter(f => (f.structure_code || '').toUpperCase() !== 'VP' && !(f.structure_name || '').toLowerCase().includes('văn phòng')).map(f => ({
                id: f.structure_name,
                label: f.structure_name,
                desc: f.structure_code ? `Mã: ${f.structure_code}` : (f.description || f.structure_type || 'Xưởng sản xuất'),
                icon: '🏭'
              })))
            ].map(fTab => {
              const isSelected = selectedFactoryTab === fTab.id;
              const fGroup = factoryPipelineGroups.find(fg => fg.factory === fTab.id);
              const nodeCount = fTab.id === 'ALL'
                ? (validPipelineNodes || []).length
                : (fGroup?.nodes?.length || 0);

              return (
                <button
                  key={fTab.id}
                  onClick={() => setSelectedFactoryTab(fTab.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #5D3B32' : '1.5px solid #EADCC9',
                    background: isSelected
                      ? 'linear-gradient(135deg, #3D251E 0%, #25140E 100%)'
                      : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#4B5563',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    minWidth: '150px',
                    boxShadow: isSelected
                      ? '0 6px 16px rgba(45, 26, 18, 0.2)'
                      : '0 2px 4px rgba(0,0,0,0.02)',
                    transform: isSelected ? 'translateY(-1px)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: '800', color: isSelected ? '#FFFFFF' : '#1F2937' }}>
                      {fTab.icon} {fTab.label}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      padding: '1px 7px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.22)' : '#FAF6F0',
                      color: isSelected ? '#FFFFFF' : '#5D3B32',
                      border: isSelected ? 'none' : '1px solid #EADCC9'
                    }}>
                      {nodeCount} tổ
                    </span>
                  </div>
                  <span style={{ fontSize: '0.73rem', color: isSelected ? 'rgba(255,255,255,0.75)' : '#78716C' }}>
                    {fTab.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kho Tổ Sản Xuất */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #EADCC9',
            padding: '18px 22px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(45, 26, 18, 0.03)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isKhoTổCollapsed ? '0px' : '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  backgroundColor: '#FAF6F0',
                  border: '1px solid #EADCC9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5D3B32'
                }}>
                  <Building2 size={16} />
                </div>
                <span>Kho Tổ sản xuất <span style={{ fontWeight: '500', color: '#78716C', fontSize: '0.82rem' }}>(Nhấp để thêm/bớt Tổ vào chuỗi luồng sản xuất):</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setActiveTab('workshops')}
                  style={{
                    padding: '6px 13px',
                    backgroundColor: '#FAF6F0',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    color: '#5D3B32',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#5D3B32'; e.currentTarget.style.color = '#FFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAF6F0'; e.currentTarget.style.color = '#5D3B32'; }}
                >
                  <Settings size={14} /> Quản lý danh sách tổ
                </button>
                <button
                  onClick={() => setIsKhoTổCollapsed(prev => !prev)}
                  title={isKhoTổCollapsed ? "Mở rộng Kho Tổ" : "Thu gọn Kho Tổ"}
                  style={{
                    padding: '6px 13px',
                    backgroundColor: isKhoTổCollapsed ? '#5D3B32' : '#FAF6F0',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    color: isKhoTổCollapsed ? '#FFFFFF' : '#5D3B32',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
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
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {currentFactoryStagesTeamsGrouped
                  .filter(fac => selectedFactoryTab === 'ALL' || selectedFactoryTab === fac.factory)
                  .map(fac => {
                    const currentFacStageTab = factoryStageTabMap[fac.factory] || 'ALL';
                    const displayedStages = fac.stages.filter(s => {
                      if (currentFacStageTab === 'ALL') return true;
                      return String(s.stageId) === String(currentFacStageTab) || s.stageName === currentFacStageTab;
                    });

                    return (
                      <div key={fac.factory} style={{
                        backgroundColor: '#FAF7F2',
                        padding: '16px 18px',
                        borderRadius: '12px',
                        border: '1px solid #E8DCce',
                        borderLeft: `5px solid ${fac.color}`
                      }}>
                        {/* Factory Header & View Switcher */}
                        <div style={{
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #EADCC9',
                          paddingBottom: '10px',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1rem' }}>🏭</span>
                            <span style={{ fontSize: '0.94rem', fontWeight: '800', color: fac.color }}>{fac.factory}</span>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              color: '#78716C',
                              backgroundColor: '#FFFFFF',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              border: '1px solid #E5D7C7'
                            }}>
                              {fac.totalTeams} tổ • {fac.stages.filter(s => s.teams.length > 0).length}/7 công đoạn
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* View Switcher: Rows vs Grid */}
                            <div style={{
                              display: 'inline-flex',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '8px',
                              border: '1px solid #EADCC9',
                              padding: '2px'
                            }}>
                              <button
                                type="button"
                                onClick={() => setCatalogViewMode('ROWS')}
                                title="Chế độ Hàng ngang phân cấp (Gọn gàng nhất)"
                                style={{
                                  border: 'none',
                                  backgroundColor: catalogViewMode === 'ROWS' ? '#5D3B32' : 'transparent',
                                  color: catalogViewMode === 'ROWS' ? '#FFFFFF' : '#78716C',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <List size={13} /> Hàng ngang
                              </button>
                              <button
                                type="button"
                                onClick={() => setCatalogViewMode('GRID')}
                                title="Chế độ Lưới cột"
                                style={{
                                  border: 'none',
                                  backgroundColor: catalogViewMode === 'GRID' ? '#5D3B32' : 'transparent',
                                  color: catalogViewMode === 'GRID' ? '#FFFFFF' : '#78716C',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <LayoutGrid size={13} /> Lưới cột
                              </button>
                            </div>

                            {/* Add team to factory button */}
                            <button
                              type="button"
                              onClick={() => {
                                const facDigits = fac.factory.replace(/\D/g, '');
                                const facCode = facDigits ? `NM${facDigits}` : 'NM1';
                                const firstStage = (dbStages && dbStages.length > 0) ? dbStages[0] : { id: 1, name: 'Nhập Kho/Đầu Vào' };
                                const firstStageName = firstStage.name || firstStage.stage_name || 'Nhập Kho/Đầu Vào';
                                setNewTeamForm({
                                  factory: fac.factory,
                                  stageId: firstStage.id,
                                  stageName: firstStageName,
                                  teamCode: `TO-${facCode}-${Math.floor(100 + Math.random() * 900)}`,
                                  teamName: `Tổ ${firstStageName}`,
                                  selectedStages: [firstStageName],
                                  members: 10,
                                  desc: `Tổ sản xuất thuộc ${fac.factory}`
                                });
                                setShowAddTeamModal(true);
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#5D3B32',
                                fontSize: '0.78rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Plus size={14} /> Thêm tổ
                            </button>
                          </div>
                        </div>

                        {/* Stage Quick-Filter Pills */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          overflowX: 'auto',
                          paddingBottom: '8px',
                          marginBottom: '10px'
                        }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#8C7A6B', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0, marginRight: '4px' }}>
                            Công đoạn:
                          </span>
                          <button
                            type="button"
                            onClick={() => setFactoryStageTabMap(prev => ({ ...prev, [fac.factory]: 'ALL' }))}
                            style={{
                              border: currentFacStageTab === 'ALL' ? '1.5px solid #5D3B32' : '1px solid #EADCC9',
                              backgroundColor: currentFacStageTab === 'ALL' ? '#5D3B32' : '#FFFFFF',
                              color: currentFacStageTab === 'ALL' ? '#FFFFFF' : '#4B5563',
                              padding: '3px 9px',
                              borderRadius: '20px',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Tất cả ({fac.totalTeams})
                          </button>
                          {fac.stages.map((stg, stgIdx) => {
                            const isTabActive = currentFacStageTab === String(stg.stageId) || currentFacStageTab === stg.stageName;
                            return (
                              <button
                                key={stg.stageId || stg.stageCode || stgIdx}
                                type="button"
                                onClick={() => setFactoryStageTabMap(prev => ({ ...prev, [fac.factory]: isTabActive ? 'ALL' : (stg.stageId || stg.stageName) }))}
                                style={{
                                  border: isTabActive ? `1.5px solid ${fac.color}` : '1px solid #EADCC9',
                                  backgroundColor: isTabActive ? fac.color : '#FFFFFF',
                                  color: isTabActive ? '#FFFFFF' : (stg.teams.length > 0 ? '#1F2937' : '#9CA3AF'),
                                  padding: '3px 9px',
                                  borderRadius: '20px',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>{stgIdx + 1}. {stg.stageName}</span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  opacity: isTabActive ? 0.9 : 0.7,
                                  backgroundColor: isTabActive ? 'rgba(255,255,255,0.25)' : '#F3E8DB',
                                  color: isTabActive ? '#FFFFFF' : '#78716C',
                                  padding: '1px 5px',
                                  borderRadius: '10px'
                                }}>
                                  {stg.teams.length}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* STAGE CATALOG: ROWS MODE (Gọn gàng nhất) */}
                        {catalogViewMode === 'ROWS' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {displayedStages.map((stg, stgIdx) => (
                              <div
                                key={stg.stageId || stg.stageCode || stg.stageName}
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '9px',
                                  border: '1px solid #EADCC9',
                                  padding: '8px 12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                  flexWrap: 'wrap'
                                }}
                              >
                                {/* Stage Badge on Left */}
                                <div style={{
                                  minWidth: '170px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '7px',
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#FAF6F0',
                                    border: `1.5px solid ${fac.color}`,
                                    color: fac.color,
                                    fontSize: '0.72rem',
                                    fontWeight: '800',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {stg.stageSequence || (stgIdx + 1)}
                                  </span>
                                  <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12' }}>
                                    {stg.stageName}
                                  </span>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    color: stg.teams.length > 0 ? fac.color : '#9CA3AF',
                                    backgroundColor: '#FAF6F0',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    border: '1px solid #EADCC9'
                                  }}>
                                    {stg.teams.length}
                                  </span>
                                </div>

                                {/* Teams Horizontal Pills Container */}
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                                  {stg.teams.length === 0 ? (
                                    <span style={{ fontSize: '0.74rem', color: '#A8A29E', fontStyle: 'italic' }}>
                                      Chưa có tổ nào gán vào công đoạn này
                                    </span>
                                  ) : (
                                    stg.teams.map(t => {
                                      const isInRouting = (validPipelineNodes || []).some(n => n.teamCode === t.teamCode);
                                      return (
                                        <button
                                          key={t.teamCode}
                                          type="button"
                                          onClick={() => handleAddTeamToPipeline({ ...t, factory: fac.factory, stageId: stg.stageId, stageName: stg.stageName })}
                                          title={isInRouting ? `Đang có trong chuỗi luồng. Bấm để thêm lại nếu cần` : `Bấm để thêm ${t.teamName} (${stg.stageName}) vào chuỗi luồng`}
                                          style={{
                                            border: isInRouting ? `1.5px solid ${fac.color}` : '1.5px dashed #D6C2AC',
                                            backgroundColor: isInRouting ? fac.color : '#FFFFFF',
                                            color: isInRouting ? '#FFFFFF' : '#2D1A12',
                                            padding: '4px 9px',
                                            borderRadius: '6px',
                                            fontWeight: '700',
                                            fontSize: '0.78rem',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: isInRouting ? `0 2px 5px ${fac.color}25` : 'none',
                                            transition: 'all 0.15s ease'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isInRouting) {
                                              e.currentTarget.style.borderColor = fac.color;
                                              e.currentTarget.style.backgroundColor = '#FAF6F0';
                                              e.currentTarget.style.color = fac.color;
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isInRouting) {
                                              e.currentTarget.style.borderColor = '#D6C2AC';
                                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                                              e.currentTarget.style.color = '#2D1A12';
                                            }
                                          }}
                                        >
                                          <span>{t.teamName}</span>
                                          <span style={{ fontSize: '0.68rem', opacity: 0.75, fontFamily: 'monospace' }}>
                                            ({t.teamCode})
                                          </span>
                                          {isInRouting ? (
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              width: '15px',
                                              height: '15px',
                                              borderRadius: '50%',
                                              backgroundColor: 'rgba(255,255,255,0.25)',
                                              flexShrink: 0
                                            }}>
                                              <Check size={10} strokeWidth={3} />
                                            </span>
                                          ) : (
                                            <Plus size={11} color="#9CA3AF" style={{ flexShrink: 0 }} />
                                          )}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>

                                {/* Quick Add Button for this stage */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const facDigits = fac.factory.replace(/\D/g, '');
                                    const facCode = facDigits ? `NM${facDigits}` : 'NM1';
                                    setNewTeamForm({
                                      factory: fac.factory,
                                      stageId: stg.stageId,
                                      stageName: stg.stageName,
                                      teamCode: `TO-${facCode}-${Math.floor(100 + Math.random() * 900)}`,
                                      teamName: `Tổ ${stg.stageName}`,
                                      selectedStages: [stg.stageName],
                                      members: 10,
                                      desc: `Tổ sản xuất thuộc công đoạn ${stg.stageName}`
                                    });
                                    setShowAddTeamModal(true);
                                  }}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#78716C',
                                    fontSize: '0.72rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    flexShrink: 0
                                  }}
                                >
                                  <Plus size={12} /> Thêm tổ
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* STAGE CATALOG: GRID MODE */
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '12px'
                          }}>
                            {displayedStages.map(stg => (
                              <div
                                key={stg.stageId || stg.stageCode || stg.stageName}
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '10px',
                                  border: '1px solid #EADCC9',
                                  padding: '10px 12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderBottom: '1px dashed #F0E6D8',
                                  paddingBottom: '5px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{
                                      width: '7px',
                                      height: '7px',
                                      borderRadius: '50%',
                                      backgroundColor: fac.color,
                                      display: 'inline-block'
                                    }} />
                                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12' }}>
                                      {stg.stageName}
                                    </span>
                                  </div>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    color: stg.teams.length > 0 ? '#5D3B32' : '#9CA3AF',
                                    backgroundColor: '#FAF6F0',
                                    padding: '1px 6px',
                                    borderRadius: '8px',
                                    border: '1px solid #EADCC9'
                                  }}>
                                    {stg.teams.length}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '36px' }}>
                                  {stg.teams.length === 0 ? (
                                    <div style={{
                                      fontSize: '0.74rem',
                                      color: '#A8A29E',
                                      fontStyle: 'italic',
                                      padding: '6px 4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between'
                                    }}>
                                      <span>Chưa có tổ</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const facDigits = fac.factory.replace(/\D/g, '');
                                          const facCode = facDigits ? `NM${facDigits}` : 'NM1';
                                          setNewTeamForm({
                                            factory: fac.factory,
                                            stageId: stg.stageId,
                                            stageName: stg.stageName,
                                            teamCode: `TO-${facCode}-${Math.floor(100 + Math.random() * 900)}`,
                                            teamName: `Tổ ${stg.stageName}`,
                                            selectedStages: [stg.stageName],
                                            members: 10,
                                            desc: `Tổ sản xuất thuộc công đoạn ${stg.stageName}`
                                          });
                                          setShowAddTeamModal(true);
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          color: '#5D3B32',
                                          fontSize: '0.72rem',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          textDecoration: 'underline'
                                        }}
                                      >
                                        + Thêm
                                      </button>
                                    </div>
                                  ) : (
                                    stg.teams.map(t => {
                                      const isInRouting = (validPipelineNodes || []).some(n => n.teamCode === t.teamCode);
                                      return (
                                        <button
                                          key={t.teamCode}
                                          type="button"
                                          onClick={() => handleAddTeamToPipeline({ ...t, factory: fac.factory, stageId: stg.stageId, stageName: stg.stageName })}
                                          title={isInRouting ? `Đang có trong chuỗi luồng. Bấm để thêm lại nếu cần` : `Bấm để thêm ${t.teamName} (${stg.stageName}) vào chuỗi luồng`}
                                          style={{
                                            border: isInRouting ? `1.5px solid ${fac.color}` : '1.5px dashed #D6C2AC',
                                            backgroundColor: isInRouting ? fac.color : '#FFFFFF',
                                            color: isInRouting ? '#FFFFFF' : '#374151',
                                            padding: '6px 10px',
                                            borderRadius: '7px',
                                            fontWeight: '700',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '6px',
                                            boxShadow: isInRouting ? `0 2px 6px ${fac.color}30` : 'none',
                                            transition: 'all 0.15s ease',
                                            textAlign: 'left'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isInRouting) {
                                              e.currentTarget.style.borderColor = fac.color;
                                              e.currentTarget.style.backgroundColor = '#FAF6F0';
                                              e.currentTarget.style.color = fac.color;
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isInRouting) {
                                              e.currentTarget.style.borderColor = '#D6C2AC';
                                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                                              e.currentTarget.style.color = '#374151';
                                            }
                                          }}
                                        >
                                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.teamName}</span>
                                            <span style={{ fontSize: '0.68rem', opacity: 0.75, fontFamily: 'monospace' }}>{t.teamCode}</span>
                                          </div>
                                          {isInRouting ? (
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              width: '16px',
                                              height: '16px',
                                              borderRadius: '50%',
                                              backgroundColor: 'rgba(255,255,255,0.25)',
                                              flexShrink: 0
                                            }}>
                                              <Check size={10} strokeWidth={3} />
                                            </span>
                                          ) : (
                                            <Plus size={12} color="#9CA3AF" style={{ flexShrink: 0 }} />
                                          )}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Isolated Factory Pipelines */}
          {factoryPipelineStageClusters
            .filter(fGroup => selectedFactoryTab === 'ALL' || selectedFactoryTab === fGroup.factory)
            .map((fGroup) => (
              <div
                key={fGroup.factory}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: `1.5px solid ${fGroup.color || '#5D3B32'}35`,
                  padding: '18px 22px',
                  marginBottom: '22px',
                  boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
                }}
              >
                {/* Pipeline Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{
                      backgroundColor: fGroup.color,
                      color: '#FFF',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '0.84rem'
                    }}>
                      🏭 {fGroup.factory}
                    </span>
                    <span style={{ fontSize: '0.94rem', fontWeight: '800', color: '#1F2937' }}>
                      Chuỗi Luồng Sản xuất ({fGroup.totalNodes} Tổ • {fGroup.clusters.length} Công đoạn)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#5D3B32', backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
                      ✓ Khép kín 100% tại {fGroup.factory}
                    </span>
                  </div>

                  {/* View Mode Toggle: Stage Grouped vs Sequential Steps */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      display: 'inline-flex',
                      backgroundColor: '#FAF6F0',
                      borderRadius: '8px',
                      border: '1px solid #EADCC9',
                      padding: '2px'
                    }}>
                      <button
                        type="button"
                        onClick={() => setPipelineViewMode('STAGE_GROUPED')}
                        title="Gom nhóm các tổ theo từng Công đoạn"
                        style={{
                          border: 'none',
                          backgroundColor: pipelineViewMode === 'STAGE_GROUPED' ? '#5D3B32' : 'transparent',
                          color: pipelineViewMode === 'STAGE_GROUPED' ? '#FFFFFF' : '#78716C',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Layers size={13} /> Gom theo Công đoạn
                      </button>
                      <button
                        type="button"
                        onClick={() => setPipelineViewMode('STEPS')}
                        title="Xem chi tiết từng bước tuần tự"
                        style={{
                          border: 'none',
                          backgroundColor: pipelineViewMode === 'STEPS' ? '#5D3B32' : 'transparent',
                          color: pipelineViewMode === 'STEPS' ? '#FFFFFF' : '#78716C',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <ArrowRight size={13} /> Từng bước tuần tự
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pipeline Body */}
                <div style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  flexWrap: 'wrap',
                  gap: '8px',
                  minHeight: '60px',
                  padding: '4px 0'
                }}>
                  {fGroup.totalNodes === 0 ? (
                    <div style={{
                      color: '#9CA3AF',
                      fontSize: '0.84rem',
                      padding: '16px',
                      backgroundColor: '#FAF7F2',
                      borderRadius: '8px',
                      border: '1.5px dashed #E5D7C7',
                      width: '100%',
                      textAlign: 'center'
                    }}>
                      Chưa có tổ nào được cấu hình cho {fGroup.factory}. Hãy nhấp chọn các tổ từ <strong>Kho Tổ sản xuất</strong> phía trên để đưa vào chuỗi.
                    </div>
                  ) : pipelineViewMode === 'STAGE_GROUPED' ? (
                    /* VIEW 1: STAGE GROUPED PIPELINE (Gom theo công đoạn) */
                    <>
                      {fGroup.clusters.map((cluster, cIdx) => (
                        <React.Fragment key={`${cluster.stageName}-${cIdx}`}>
                          {/* Stage Process Cluster Card */}
                          <div style={{
                            minWidth: '170px',
                            maxWidth: '220px',
                            borderRadius: '10px',
                            border: `1.5px solid ${fGroup.color}35`,
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                          }}>
                            {/* Cluster Header with Stage Title, Count, and Stage Reorder Buttons */}
                            <div style={{
                              padding: '5px 8px',
                              backgroundColor: fGroup.color,
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '4px'
                            }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: '800', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                                <span style={{
                                  backgroundColor: 'rgba(255,255,255,0.25)',
                                  width: '17px',
                                  height: '17px',
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.66rem',
                                  flexShrink: 0
                                }}>
                                  {cIdx + 1}
                                </span>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cluster.stageName}>
                                  {cluster.stageName}
                                </span>
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                <span style={{
                                  fontSize: '0.64rem',
                                  fontWeight: '700',
                                  backgroundColor: 'rgba(255,255,255,0.22)',
                                  padding: '1px 5px',
                                  borderRadius: '8px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {cluster.nodes.length} tổ
                                </span>
                                {cIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleMoveFactoryCluster(fGroup.factory, cIdx, 'left'); }}
                                    title={`Chuyển cả công đoạn "${cluster.stageName}" sang trước`}
                                    style={{
                                      border: 'none',
                                      background: 'rgba(255,255,255,0.22)',
                                      color: '#FFFFFF',
                                      cursor: 'pointer',
                                      borderRadius: '3px',
                                      padding: '1px 3px',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <ArrowLeft size={10} />
                                  </button>
                                )}
                                {cIdx < fGroup.clusters.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleMoveFactoryCluster(fGroup.factory, cIdx, 'right'); }}
                                    title={`Chuyển cả công đoạn "${cluster.stageName}" ra sau`}
                                    style={{
                                      border: 'none',
                                      background: 'rgba(255,255,255,0.22)',
                                      color: '#FFFFFF',
                                      cursor: 'pointer',
                                      borderRadius: '3px',
                                      padding: '1px 3px',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <ArrowRight size={10} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Teams inside this Stage */}
                            <div style={{ padding: '5px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, backgroundColor: '#FAF7F2' }}>
                              {cluster.nodes.map((node) => {
                                const isActive = Boolean(activeNodeId) && (
                                  String(node.id) === String(activeNodeId) ||
                                  (node.teamCode && node.teamCode === activeNodeId)
                                );
                                return (
                                  <div
                                    key={node.teamCode || node.id}
                                    onClick={() => setActiveNodeId(node.teamCode || node.id)}
                                    style={{
                                      padding: '4px 7px',
                                      borderRadius: '6px',
                                      backgroundColor: isActive ? '#5D3B32' : '#FFFFFF',
                                      color: isActive ? '#FFFFFF' : '#2D1A12',
                                      border: isActive ? '1.5px solid #5D3B32' : '1px solid #EADCC9',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '5px',
                                      boxShadow: isActive ? '0 2px 6px rgba(93,59,50,0.25)' : '0 1px 2px rgba(0,0,0,0.02)',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                                      <span style={{
                                        fontSize: '0.78rem',
                                        fontWeight: '800',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }} title={node.teamName}>
                                        {node.teamName}
                                      </span>
                                      <span style={{
                                        fontSize: '0.64rem',
                                        opacity: isActive ? 0.85 : 0.65,
                                        fontFamily: 'monospace'
                                      }}>
                                        {node.teamCode}
                                      </span>
                                    </div>

                                    {/* Action Buttons: Move Team & Remove */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                      {node.originalIndex > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleMoveFactoryNode(fGroup.factory, node.id, 'left'); }}
                                          title="Chuyển tổ lên trước"
                                          style={{
                                            border: 'none',
                                            background: isActive ? 'rgba(255,255,255,0.25)' : '#F3E8DB',
                                            color: isActive ? '#FFF' : '#5D3B32',
                                            cursor: 'pointer',
                                            borderRadius: '3px',
                                            padding: '1px 3px',
                                            display: 'inline-flex',
                                            alignItems: 'center'
                                          }}
                                        >
                                          <ArrowLeft size={10} />
                                        </button>
                                      )}
                                      {node.originalIndex < fGroup.totalNodes - 1 && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleMoveFactoryNode(fGroup.factory, node.id, 'right'); }}
                                          title="Chuyển tổ ra sau"
                                          style={{
                                            border: 'none',
                                            background: isActive ? 'rgba(255,255,255,0.25)' : '#F3E8DB',
                                            color: isActive ? '#FFF' : '#5D3B32',
                                            cursor: 'pointer',
                                            borderRadius: '3px',
                                            padding: '1px 3px',
                                            display: 'inline-flex',
                                            alignItems: 'center'
                                          }}
                                        >
                                          <ArrowRight size={10} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }}
                                        title="Xóa tổ khỏi quy trình"
                                        style={{
                                          border: 'none',
                                          background: 'rgba(239,68,68,0.15)',
                                          color: '#DC2626',
                                          cursor: 'pointer',
                                          borderRadius: '3px',
                                          padding: '1px 3px',
                                          display: 'inline-flex',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Stage Connector Arrow */}
                          {cIdx < fGroup.clusters.length - 1 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              alignSelf: 'center',
                              flexShrink: 0
                            }}>
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#FAF6F0',
                                border: '1.2px solid #EADCC9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}>
                                <ArrowRight size={11} color={fGroup.color} />
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </>
                  ) : (
                    /* VIEW 2: INDIVIDUAL SEQUENTIAL STEPS */
                    <>
                      {fGroup.clusters.flatMap(c => c.nodes).map((node, idx, arr) => {
                        const nodeKey = node.teamCode || node.id || `node-${idx}`;
                        const isActive = Boolean(activeNodeId) && (
                          String(node.id) === String(activeNodeId) ||
                          (node.teamCode && node.teamCode === activeNodeId)
                        );
                        return (
                          <React.Fragment key={nodeKey}>
                            {/* Step Card */}
                            <div
                              onClick={() => setActiveNodeId(node.teamCode || node.id)}
                              style={{
                                width: '160px',
                                borderRadius: '8px',
                                border: isActive ? '2px solid #5D3B32' : '1.5px solid #EADCC9',
                                backgroundColor: isActive ? '#FFFFFF' : '#FAF6F0',
                                boxShadow: isActive
                                  ? '0 3px 10px rgba(93, 59, 50, 0.18), 0 0 0 2px rgba(93, 59, 50, 0.15)'
                                  : '0 1px 4px rgba(0,0,0,0.02)',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                transform: isActive ? 'translateY(-2px)' : 'none'
                              }}
                            >
                              {/* Step Top Bar */}
                              <div style={{
                                padding: '4px 6px',
                                backgroundColor: isActive ? '#5D3B32' : (fGroup.color || '#6D4C3D'),
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <span style={{ fontSize: '0.66rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span>B.{idx + 1}</span>
                                  {node.stageName && (
                                    <span style={{
                                      fontSize: '0.62rem',
                                      backgroundColor: 'rgba(255,255,255,0.22)',
                                      padding: '1px 4px',
                                      borderRadius: '4px',
                                      fontWeight: '700'
                                    }}>
                                      {node.stageName}
                                    </span>
                                  )}
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleMoveFactoryNode(fGroup.factory, node.id, 'left'); }}
                                      title="Chuyển lên trước"
                                      style={{
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: '#FFF',
                                        cursor: 'pointer',
                                        borderRadius: '3px',
                                        padding: '1px 3px',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <ArrowLeft size={10} />
                                    </button>
                                  )}
                                  {idx < arr.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleMoveFactoryNode(fGroup.factory, node.id, 'right'); }}
                                      title="Chuyển ra sau"
                                      style={{
                                        border: 'none',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: '#FFF',
                                        cursor: 'pointer',
                                        borderRadius: '3px',
                                        padding: '1px 3px',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <ArrowRight size={10} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }}
                                    title="Xóa tổ khỏi chuỗi"
                                    style={{
                                      border: 'none',
                                      background: 'rgba(239,68,68,0.3)',
                                      color: '#FFF',
                                      cursor: 'pointer',
                                      borderRadius: '3px',
                                      padding: '1px 3px',
                                      marginLeft: '2px',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>

                              {/* Step Content */}
                              <div style={{
                                padding: '6px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '5px'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                                  <div style={{
                                    fontWeight: '800',
                                    fontSize: '0.78rem',
                                    color: '#2D1A12',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }} title={node.teamName}>
                                    {node.teamName}
                                  </div>
                                  <div style={{ fontSize: '0.64rem', color: '#78716C', fontFamily: 'monospace' }}>
                                    {node.teamCode}
                                  </div>
                                </div>
                                {isActive && (
                                  <span style={{
                                    fontSize: '0.62rem',
                                    fontWeight: '800',
                                    color: '#5D3B32',
                                    backgroundColor: '#F5EBE1',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid #D6C2AC',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}>
                                    ✓ Chọn
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Circular Arrow Connector */}
                            {idx < arr.length - 1 && (
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#FAF6F0',
                                border: '1.2px solid #EADCC9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                alignSelf: 'center',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}>
                                <ArrowRight size={11} color="#78716C" />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            ))}

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
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
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
                        <td style={{ padding: '8px 10px', color: '#5D3B32', fontWeight: '700' }}>{r.stageTo}</td>
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
                            backgroundColor: '#FAF6F0',
                            color: '#5D3B32',
                            border: '1px solid #EADCC9'
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
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#5D3B32', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                          {p.routingCode}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '16px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            backgroundColor: p.isAssignedToThis ? '#FAF6F0' : '#F9FAFB',
                            color: p.isAssignedToThis ? '#5D3B32' : '#6B7280',
                            border: `1px solid ${p.isAssignedToThis ? '#D6C2AC' : '#E5E7EB'}`
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
          borderRadius: '16px',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(45, 26, 18, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header Bar */}
          <div style={{
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1.5px solid #EADCC9',
            backgroundColor: '#FAF6F0',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#5D3B32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 3px 8px rgba(93, 59, 50, 0.25)'
              }}>
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.08rem', fontWeight: '800', color: '#2D1A12', letterSpacing: '-0.01em' }}>
                    Danh mục Tổ sản xuất theo Nhà máy
                  </span>
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    color: '#5D3B32',
                    backgroundColor: '#EADCC9',
                    padding: '2px 9px',
                    borderRadius: '12px'
                  }}>
                    {filteredTeamsForTab.length} / {(teamsList.length > 0 ? teamsList : currentRoutingTeams).length} Tổ
                  </span>
                </div>
                <span style={{ display: 'block', fontSize: '0.82rem', color: '#78716C', marginTop: '2px' }}>
                  Quản trị cơ cấu các tổ sản xuất theo từng phân xưởng. Dữ liệu dùng chung trực tiếp cho toàn bộ Quy trình sản xuất.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleOpenAddTeamModal}
                style={{
                  padding: '9px 20px',
                  backgroundColor: '#5D3B32',
                  border: 'none',
                  borderRadius: '9px',
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 3px 10px rgba(93, 59, 50, 0.28)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#432921'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#5D3B32'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Plus size={18} /> Thêm tổ sản xuất mới
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div style={{
            padding: '14px 24px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #EAE0D5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                placeholder="Tìm mã tổ, tên tổ, năng lực..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9',
                  backgroundColor: '#FAF6F0',
                  fontSize: '0.85rem',
                  color: '#2D1A12',
                  outline: 'none',
                  transition: 'all 0.15s'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#5D3B32'; e.target.style.backgroundColor = '#FFFFFF'; }}
                onBlur={(e) => { e.target.style.borderColor = '#EADCC9'; e.target.style.backgroundColor = '#FAF6F0'; }}
              />
              {teamSearchQuery && (
                <button
                  onClick={() => setTeamSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Controls: Stage Filter & Factory Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Stage Filter Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#5D3B32' }}>Công đoạn:</span>
                <select
                  value={selectedTeamStageFilter}
                  onChange={(e) => setSelectedTeamStageFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #EADCC9',
                    backgroundColor: '#FAF6F0',
                    color: '#2D1A12',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">Tất cả công đoạn</option>
                  {(dbStages.length > 0 ? dbStages : [
                    { id: 1, name: 'Nhập Kho/Đầu Vào' },
                    { id: 2, name: 'Tạo Phôi' },
                    { id: 3, name: 'Định Hình' },
                    { id: 4, name: 'Lắp Ráp' },
                    { id: 5, name: 'Sơn' },
                    { id: 6, name: 'Đóng Gói' },
                    { id: 7, name: 'Lưu Kho' }
                  ]).map(s => {
                    const sName = s.name || s.stage_name;
                    return (
                      <option key={s.id || sName} value={sName}>
                        {s.code ? `[${s.code}] ` : ''}{sName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Factory Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'Tất cả nhà máy' },
                  ...((factoryStructures.length > 0 ? factoryStructures : [
                    { structure_name: 'Vaniti Phân Xưởng 1' },
                    { structure_name: 'Vaniti Phân Xưởng 2' },
                    { structure_name: 'Vaniti Phân Xưởng 3' }
                  ]).filter(f => (f.structure_code || '').toUpperCase() !== 'VP' && !(f.structure_name || '').toLowerCase().includes('văn phòng')).map(f => ({
                    id: f.structure_name,
                    label: f.structure_name
                  })))
                ].map(fTab => {
                  const isSelected = selectedTeamFactoryFilter === fTab.id;
                  const count = factoryTeamCounts[fTab.id] || 0;
                  const pillColor = fTab.id === 'ALL' ? '#5D3B32' : getFactoryColor(fTab.id);

                  return (
                    <button
                      key={fTab.id}
                      onClick={() => setSelectedTeamFactoryFilter(fTab.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: isSelected ? `1.5px solid ${pillColor}` : '1.5px solid #EADCC9',
                        backgroundColor: isSelected ? pillColor : '#FAF6F0',
                        color: isSelected ? '#FFFFFF' : '#4B5563',
                        fontWeight: isSelected ? '800' : '600',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {fTab.id !== 'ALL' && (
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#FFFFFF' : pillColor,
                          display: 'inline-block'
                        }} />
                      )}
                      <span>{fTab.label}</span>
                      <span style={{
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.28)' : '#E5D7C7',
                        color: isSelected ? '#FFFFFF' : '#2D1A12',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: '800'
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#3A241D', color: '#FFFFFF' }}>
                  <th style={{ padding: '13px 18px', fontWeight: '800', width: '150px', whiteSpace: 'nowrap', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mã tổ
                  </th>
                  <th style={{ padding: '13px 18px', fontWeight: '800', width: '200px', whiteSpace: 'nowrap', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tên tổ sản xuất
                  </th>
                  <th style={{ padding: '13px 18px', fontWeight: '800', width: '160px', whiteSpace: 'nowrap', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Công đoạn
                  </th>
                  <th style={{ padding: '13px 18px', fontWeight: '800', width: '190px', whiteSpace: 'nowrap', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nhà máy trực thuộc
                  </th>
                  <th style={{ padding: '13px 18px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mô tả công việc & Năng lực
                  </th>
                  <th style={{ padding: '13px 18px', fontWeight: '800', width: '90px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTeamsForTab.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Building2 size={36} color="#D1D5DB" />
                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#6B7280' }}>
                          Không tìm thấy Tổ sản xuất nào phù hợp
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>
                          Thử thay đổi bộ lọc nhà máy, công đoạn hoặc từ khóa tìm kiếm.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeamsForTab.map((t, idx) => {
                    const facColor = getFactoryColor(t.factory);
                    const teamColor = t.color || facColor;
                    const stageDisplay = t.stageName || (dbStages.find(s => s.id === t.stageId)?.name) || 'Tạo Phôi';

                    return (
                      <tr
                        key={t.id || t.teamCode}
                        style={{
                          borderBottom: '1px solid #F3EDE5',
                          backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFF6EC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF'; }}
                      >
                        {/* Mã tổ */}
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            backgroundColor: '#F3EDE6',
                            borderRadius: '6px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            fontWeight: '800',
                            fontSize: '0.82rem',
                            color: '#5D3B32',
                            border: '1px solid #E5D7C7',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap'
                          }}>
                            {t.teamCode}
                          </span>
                        </td>

                        {/* Tên tổ */}
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: teamColor,
                              flexShrink: 0,
                              boxShadow: `0 0 0 2px ${teamColor}33`
                            }} />
                            <span style={{ fontWeight: '800', color: '#1F2937', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                              {t.teamName}
                            </span>
                          </div>
                        </td>

                        {/* Công đoạn */}
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#FAF6F0',
                            color: '#5D3B32',
                            border: '1px solid #EADCC9',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#5D3B32' }} />
                            {stageDisplay}
                          </span>
                        </td>

                        {/* Nhà máy trực thuộc */}
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: `${facColor}12`,
                            color: facColor,
                            border: `1.5px solid ${facColor}35`,
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            whiteSpace: 'nowrap'
                          }}>
                            🏭 {t.factory}
                          </span>
                        </td>

                        {/* Mô tả công việc & Năng lực */}
                        <td style={{ padding: '14px 18px', color: '#4B5563', fontSize: '0.86rem', lineHeight: '1.45' }}>
                          {t.desc || t.description || 'Chưa có mô tả chi tiết'}
                        </td>

                        {/* Thao tác */}
                        <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleDeleteTeam(t)}
                            title="Xóa tổ sản xuất khỏi hệ thống"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: '1px solid #FEE2E2',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#DC2626';
                              e.currentTarget.style.color = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#DC2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#FEF2F2';
                              e.currentTarget.style.color = '#DC2626';
                              e.currentTarget.style.borderColor = '#FEE2E2';
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
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
              {/* FIELD 1: Mã Tổ Tự động Khởi tạo */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mã Tổ sản xuất (Tự động khởi tạo)
                </label>
                <input
                  type="text"
                  disabled
                  readOnly
                  value={newTeamForm.teamCode || 'TO-NM1-501'}
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
                  Thuộc Nhà máy / Phân xưởng *
                </label>
                <select
                  value={newTeamForm.factory}
                  onChange={(e) => {
                    const fac = e.target.value;
                    const facObj = factoryStructures.find(f => f.structure_name === fac);
                    const facCode = facObj ? facObj.structure_code : (fac.replace(/\D/g, '') ? `NM${fac.replace(/\D/g, '')}` : 'NM1');
                    setNewTeamForm({
                      ...newTeamForm,
                      factory: fac,
                      teamCode: `TO-${facCode}-${Math.floor(100 + Math.random() * 900)}`
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
                      <option value="Vaniti Phân Xưởng 1">Vaniti Phân Xưởng 1 (NM1)</option>
                      <option value="Vaniti Phân Xưởng 2">Vaniti Phân Xưởng 2 (NM2)</option>
                      <option value="Vaniti Phân Xưởng 3">Vaniti Phân Xưởng 3 (NM3)</option>
                    </>
                  )}
                </select>
              </div>

              {/* FIELD 3: Thuộc Công đoạn sản xuất */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Thuộc Công đoạn sản xuất *
                </label>
                <select
                  value={newTeamForm.stageId || ''}
                  onChange={(e) => {
                    const sId = Number(e.target.value);
                    const stg = dbStages.find(s => s.id === sId);
                    const sName = stg ? (stg.name || stg.stage_name) : 'Tạo Phôi';
                    setNewTeamForm(prev => ({
                      ...prev,
                      stageId: sId,
                      stageName: sName,
                      teamName: prev.teamName.startsWith('Tổ ') ? `Tổ ${sName}` : prev.teamName,
                      selectedStages: [sName],
                      desc: `Tổ sản xuất thuộc công đoạn ${sName}`
                    }));
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontWeight: '700', backgroundColor: '#FAF6F0' }}
                >
                  {(dbStages.length > 0 ? dbStages : [
                    { id: 1, code: 'CD01', name: 'Nhập Kho/Đầu Vào' },
                    { id: 2, code: 'CD02', name: 'Tạo Phôi' },
                    { id: 3, code: 'CD03', name: 'Định Hình' },
                    { id: 4, code: 'CD04', name: 'Lắp Ráp' },
                    { id: 5, code: 'CD05', name: 'Sơn' },
                    { id: 6, code: 'CD06', name: 'Đóng Gói' },
                    { id: 7, code: 'CD07', name: 'Lưu Kho' }
                  ]).map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.code ? `[${stg.code}] ` : ''}{stg.name || stg.stage_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* FIELD 4: Tên Tổ sản xuất */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Tên Tổ sản xuất *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tổ Tạo Phôi 1, Tổ Sơn tĩnh điện, Tổ Lắp ráp..."
                  value={newTeamForm.teamName}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, teamName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #EADCC9',
                    outline: 'none',
                    fontSize: '0.88rem',
                    fontWeight: '600'
                  }}
                />

                {/* Gợi ý chọn nhanh tên theo Công đoạn */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#78716C', fontWeight: '600' }}>Gợi ý nhanh:</span>
                  {availableStagesForFactory.map((stgName, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => {
                        const matchedStg = dbStages.find(s => (s.name || s.stage_name || '').toLowerCase() === stgName.toLowerCase());
                        setNewTeamForm(prev => ({
                          ...prev,
                          stageId: matchedStg ? matchedStg.id : prev.stageId,
                          stageName: matchedStg ? (matchedStg.name || matchedStg.stage_name) : stgName,
                          teamName: `Tổ ${stgName}`,
                          selectedStages: [stgName],
                          desc: `Tổ sản xuất thuộc công đoạn ${stgName}`
                        }));
                      }}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid #EADCC9',
                        backgroundColor: '#FAF6F0',
                        color: '#5D3B32',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                      title={`Điền nhanh "Tổ ${stgName}"`}
                    >
                      + Tổ {stgName}
                    </button>
                  ))}
                </div>
              </div>

              {/* FIELD 5: Mô tả công việc & Năng lực */}
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

      {showAddPlanModal && (
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
          zIndex: 1050,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '560px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '1px solid #EADCC9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #EADCC9', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#5D3B32' }}>
                Thêm Dòng Kế Hoạch Sản Xuất
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPlanModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#8C7A6B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePlanRow} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '4px' }}>
                  Tên thành phẩm / Chi tiết *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cánh tủ áo trên, Mặt bàn làm việc..."
                  value={newPlanForm.partName}
                  onChange={(e) => setNewPlanForm(prev => ({ ...prev, partName: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #EADCC9', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '4px' }}>
                    Mã SKU / Chi tiết
                  </label>
                  <input
                    type="text"
                    placeholder="VD: CT-001"
                    value={newPlanForm.partSku}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, partSku: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #EADCC9', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '4px' }}>
                    Loại chi tiết
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Chi tiết gỗ mộc"
                    value={newPlanForm.partType}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, partType: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #EADCC9', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '4px' }}>
                    Số lượng
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 0/500"
                    value={newPlanForm.quantity}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, quantity: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #EADCC9', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '4px' }}>
                    Quy cách (mm)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 20*600*1200"
                    value={newPlanForm.dimensions}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, dimensions: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #EADCC9', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFF', color: '#5D3B32', fontWeight: '700', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#5D3B32', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}
                >
                  Thêm Dòng Kế Hoạch
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


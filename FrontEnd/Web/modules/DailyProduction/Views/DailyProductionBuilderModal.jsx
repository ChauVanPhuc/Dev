import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Search, CheckSquare, Square, ChevronDown, ChevronRight,
  Layers, Plus, Filter, Check, RefreshCw, Trash2, FileSpreadsheet
} from 'lucide-react';
import { dailyProductionService } from '../Services/dailyProduction.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const DailyProductionBuilderModal = ({
  isOpen,
  onClose,
  onSaved,
  initialDate,
  initialFactory,
  editingBatch = null,
  metadata = {}
}) => {
  const { toast } = useToast();

  // Danh mục động lấy 100% từ Database thông qua API /api/v1/daily-production/metadata
  const dbFactories = useMemo(() => metadata?.factories || [], [metadata]);
  const dbSections = useMemo(() => metadata?.sections || [], [metadata]);
  const dbPlans = useMemo(() => metadata?.plans || [], [metadata]);

  const defaultFactory = useMemo(() => {
    if (initialFactory && initialFactory !== 'ALL') return initialFactory;
    if (dbFactories.length > 0) return dbFactories[0].code;
    return '';
  }, [initialFactory, dbFactories]);

  const defaultSection = useMemo(() => {
    if (dbSections.length > 0) return dbSections[0].value;
    return '';
  }, [dbSections]);

  // 1. Khai báo TẤT CẢ Hooks ở đầu Component (Tuân thủ tuyệt đối AGENTS.md)
  const [planDate, setPlanDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [factory, setFactory] = useState(defaultFactory);
  const [sectionName, setSectionName] = useState(defaultSection);
  const [batchTitle, setBatchTitle] = useState('');
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
  const [lineColorSummary, setLineColorSummary] = useState('');
  const [status, setStatus] = useState('PUBLISHED');
  const [notes, setNotes] = useState('');

  // Bộ lọc và Danh sách PO gốc & Cont lẻ bên trái (Lấy từ bảng orders, products, product_plans)
  const [containerGroups, setContainerGroups] = useState([]);
  const [totalStats, setTotalStats] = useState({ total_root_pos: 0, total_containers: 0 });
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [leftFactoryFilter, setLeftFactoryFilter] = useState('ALL');
  const [leftPlanFilter, setLeftPlanFilter] = useState('');
  const [expandedRoots, setExpandedRoots] = useState({});
  const [rangeInputs, setRangeInputs] = useState({});
  const [selectedOrderCodes, setSelectedOrderCodes] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [expandedContainers, setExpandedContainers] = useState({});

  // Danh sách chi tiết BOM bên phải để Custom (Lấy từ bảng bom_details & products)
  const [items, setItems] = useState([]);
  const [cabinets, setCabinets] = useState([]);
  const [expandedCabinets, setExpandedCabinets] = useState({});
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [hideUnselectedRows, setHideUnselectedRows] = useState(false);

  // Tải danh sách PO gốc & Cont con từ Database
  const fetchAvailableContainers = useCallback(async () => {
    setLoadingContainers(true);
    try {
      const res = await dailyProductionService.getAvailableContainers({
        plan_date: planDate,
        search: poSearch.trim() || undefined,
        factory: leftFactoryFilter !== 'ALL' ? leftFactoryFilter : undefined,
        plan_id: leftPlanFilter ? parseInt(leftPlanFilter, 10) : undefined
      });
      const groups = res?.groups || [];
      setContainerGroups(groups);
      setTotalStats({
        total_root_pos: res?.total_root_pos ?? groups.length,
        total_containers: res?.total_containers ?? 0
      });
      // Mặc định mở 4 nhóm PO đầu tiên để người dùng thấy ngay danh sách Cont lẻ
      if (groups.length > 0) {
        setExpandedRoots(prev => {
          if (Object.keys(prev).length > 0) return prev;
          const initExp = {};
          groups.slice(0, 4).forEach(g => {
            initExp[g.root_po] = true;
          });
          return initExp;
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách Cont từ CSDL:', err);
      toast?.error('Không thể tải danh sách đơn hàng / Cont từ cơ sở dữ liệu.');
    } finally {
      setLoadingContainers(false);
    }
  }, [planDate, poSearch, leftFactoryFilter, leftPlanFilter, toast]);

  // Khởi tạo dữ liệu khi mở Workspace (Tạo mới hoặc Sửa)
  useEffect(() => {
    if (!isOpen) return;
    if (editingBatch) {
      setPlanDate(editingBatch.plan_date || initialDate || new Date().toISOString().slice(0, 10));
      setFactory(editingBatch.factory || defaultFactory);
      setSectionName(editingBatch.section_name || defaultSection);
      setBatchTitle(editingBatch.batch_title || '');
      setIsTitleManuallyEdited(true);
      setLineColorSummary(editingBatch.line_color_summary || '');
      setStatus(editingBatch.status || 'PUBLISHED');
      setNotes(editingBatch.notes || '');
      setSelectedOrderCodes(editingBatch.selected_orders || []);
      setSelectedProductIds([]);
      const allItems = editingBatch.items || [];
      setItems(allItems);

      // Nhóm components theo cabinet
      const cabHeaders = allItems.filter(it => it.row_type === 'CABINET_HEADER');
      const compsByCab = {};
      allItems.filter(it => it.row_type === 'DETAIL_ITEM').forEach(comp => {
        const key = `${comp.cabinet_code}__${comp.color_code}`;
        if (!compsByCab[key]) compsByCab[key] = [];
        compsByCab[key].push(comp);
      });

      if (cabHeaders.length > 0) {
        setCabinets(cabHeaders.map(it => {
          const key = `${it.cabinet_code}__${it.color_code}`;
          return {
            cabinet_code: it.cabinet_code,
            cont_code: it.cont_code,
            color_code: it.color_code,
            total_cabinet_qty: it.base_planned_qty || it.custom_planned_qty,
            custom_planned_qty: it.custom_planned_qty,
            source_orders_text: it.source_orders_text,
            components: compsByCab[key] || [],
            note: it.note
          };
        }));
      }
    } else {
      setPlanDate(initialDate || new Date().toISOString().slice(0, 10));
      setFactory(defaultFactory);
      setSectionName(defaultSection);
      setBatchTitle('');
      setIsTitleManuallyEdited(false);
      setLineColorSummary('');
      setStatus('PUBLISHED');
      setNotes('');
      setSelectedOrderCodes([]);
      setSelectedProductIds([]);
      setItems([]);
      setCabinets([]);
      setExpandedCabinets({});
      setSelectedColors([]);
    }
  }, [isOpen, editingBatch, initialDate, defaultFactory, defaultSection]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableContainers();
    }
  }, [isOpen, fetchAvailableContainers]);

  // Hàm gọi API Preview gộp Cont: Luôn nạp chi tiết components sẵn sàng cho chức năng Colab
  const triggerPreviewMerge = useCallback(async (ordersToMerge, secName, facName, colorFilterList, productIdsToMerge) => {
    if (!ordersToMerge || ordersToMerge.length === 0) {
      setItems([]);
      setCabinets([]);
      if (!isTitleManuallyEdited) setBatchTitle('');
      setLineColorSummary('');
      return;
    }

    setLoadingPreview(true);

    try {
      const res = await dailyProductionService.previewMergedContainers({
        order_codes: ordersToMerge,
        product_ids: productIdsToMerge && productIdsToMerge.length > 0 ? productIdsToMerge : undefined,
        section_name: secName,
        factory: facName,
        color_filter: colorFilterList && colorFilterList.length > 0 ? colorFilterList : null,
        include_bom: true
      });

      if (!isTitleManuallyEdited || !batchTitle) {
        setBatchTitle(res?.batch_title || ordersToMerge.join('; '));
      }
      setLineColorSummary(res?.line_color_summary || '');
      setAvailableColors(res?.available_colors || []);
      setCabinets(res?.cabinets || []);
      setItems(res?.items || []);
    } catch (err) {
      console.error('Lỗi khi tổng hợp từ các Cont đã chọn:', err);
      toast?.error('Lỗi khi tổng hợp từ các Cont đã chọn.');
    } finally {
      setLoadingPreview(false);
    }
  }, [batchTitle, isTitleManuallyEdited, toast]);

  // Key định danh cho từng dòng mã tủ
  const getCabKey = useCallback((cab, idx) => {
    return `${cab.cabinet_code || ''}__${cab.color_code || ''}__${idx}`;
  }, []);

  // Chức năng Colab: Mở/Đóng xem chi tiết linh kiện của 1 mã tủ
  const handleToggleCabinetColab = useCallback((cabKey) => {
    setExpandedCabinets(prev => ({ ...prev, [cabKey]: !prev[cabKey] }));
  }, []);

  // Mở tất cả chi tiết Colab
  const handleExpandAllCabinets = useCallback(() => {
    const allExp = {};
    cabinets.forEach((c, idx) => {
      allExp[getCabKey(c, idx)] = true;
    });
    setExpandedCabinets(allExp);
  }, [cabinets, getCabKey]);

  // Thu gọn tất cả chi tiết Colab
  const handleCollapseAllCabinets = useCallback(() => {
    setExpandedCabinets({});
  }, []);

  // Sửa nhanh số lượng sản xuất của 1 mã tủ -> Tự động tính lại SLKH của tất cả linh kiện con
  const handleChangeCabinetPlannedQty = useCallback((cabIndex, valStr) => {
    const num = Math.max(0, parseInt(valStr || '0', 10) || 0);
    setCabinets(prev => {
      const next = [...prev];
      const targetCab = next[cabIndex];
      if (!targetCab) return prev;

      const updatedComps = (targetCab.components || []).map(comp => {
        const setVal = parseFloat(comp.set_qty || 1);
        return {
          ...comp,
          custom_planned_qty: Math.round(setVal * num)
        };
      });

      next[cabIndex] = {
        ...targetCab,
        custom_planned_qty: num,
        components: updatedComps
      };
      return next;
    });

    setItems(prev => {
      if (!prev || prev.length === 0) return prev;
      const targetCab = cabinets[cabIndex];
      if (!targetCab) return prev;
      return prev.map(it => {
        if (it.cabinet_code === targetCab.cabinet_code && it.color_code === targetCab.color_code) {
          if (it.row_type === 'CABINET_HEADER') {
            return { ...it, custom_planned_qty: num };
          } else {
            const setVal = parseFloat(it.set_qty || 1);
            return { ...it, custom_planned_qty: Math.round(setVal * num) };
          }
        }
        return it;
      });
    });
  }, [cabinets]);

  // Colab sub-item: Bật/Tắt hiển thị 1 linh kiện con của tủ kèm Cascade (chọn/bỏ chọn cho toàn bộ cấp con bên dưới)
  const handleToggleComponentVisible = useCallback((cabIndex, compIndex) => {
    setCabinets(prev => {
      const next = [...prev];
      const targetCab = next[cabIndex];
      if (!targetCab) return prev;
      const comps = [...(targetCab.components || [])];
      const targetComp = comps[compIndex];
      if (!targetComp) return prev;

      const newVis = !targetComp.is_visible;
      const targetStt = String(targetComp.stt_code || '').trim();

      // Cập nhật dòng hiện tại và TẤT CẢ các dòng con có STT bắt đầu bằng targetStt + '.'
      const updatedComps = comps.map((c, idx) => {
        if (idx === compIndex) return { ...c, is_visible: newVis };
        const cStt = String(c.stt_code || '').trim();
        if (targetStt && cStt.startsWith(targetStt + '.')) {
          return { ...c, is_visible: newVis };
        }
        return c;
      });

      next[cabIndex] = { ...targetCab, components: updatedComps };
      return next;
    });
  }, []);

  // Chọn nhanh theo bậc (Bậc 1: Cụm tổng; Bậc 2: Cụm phụ; Bậc 3: Toàn bộ chi tiết)
  const handleSelectByLevelInCabinet = useCallback((cabIndex, targetLevel) => {
    setCabinets(prev => {
      const next = [...prev];
      const targetCab = next[cabIndex];
      if (!targetCab) return prev;
      const comps = (targetCab.components || []).map(comp => {
        const parts = String(comp.stt_code || '').trim().split('.');
        const depth = parts.length;
        if (targetLevel === 'ALL') return { ...comp, is_visible: true };
        if (targetLevel === 'NONE') return { ...comp, is_visible: false };
        if (targetLevel === 1) return { ...comp, is_visible: depth === 1 };
        if (targetLevel === 2) return { ...comp, is_visible: depth <= 2 };
        if (targetLevel === 3) return { ...comp, is_visible: depth <= 3 };
        return comp;
      });
      next[cabIndex] = { ...targetCab, components: comps };
      return next;
    });
  }, []);

  // Colab sub-item: Chọn / bỏ chọn tất cả linh kiện của 1 tủ
  const handleToggleAllComponentsInCabinet = useCallback((cabIndex, visibleState) => {
    setCabinets(prev => {
      const next = [...prev];
      const targetCab = next[cabIndex];
      if (!targetCab) return prev;
      const comps = (targetCab.components || []).map(c => ({ ...c, is_visible: visibleState }));
      next[cabIndex] = { ...targetCab, components: comps };
      return next;
    });
  }, []);

  // Colab sub-item: Sửa số lượng của 1 linh kiện con
  const handleChangeComponentQty = useCallback((cabIndex, compIndex, valStr) => {
    const num = Math.max(0, parseInt(valStr || '0', 10) || 0);
    setCabinets(prev => {
      const next = [...prev];
      const targetCab = next[cabIndex];
      if (!targetCab) return prev;
      const comps = [...(targetCab.components || [])];
      comps[compIndex] = {
        ...comps[compIndex],
        custom_planned_qty: num
      };
      next[cabIndex] = { ...targetCab, components: comps };
      return next;
    });
  }, []);

  // Colab sub-item: Sửa ghi chú của 1 linh kiện con
  const handleChangeComponentNote = useCallback((cabIndex, compIndex, noteVal) => {
    setCabinets(prev => {
      const next = [...prev];
      const targetCab = next[cabIndex];
      if (!targetCab) return prev;
      const comps = [...(targetCab.components || [])];
      comps[compIndex] = {
        ...comps[compIndex],
        note: noteVal
      };
      next[cabIndex] = { ...targetCab, components: comps };
      return next;
    });
  }, []);

  // Toggle chọn 1 Cont lẻ (và toàn bộ các sản phẩm con của nó)
  const handleToggleSubContainer = useCallback((sc) => {
    const orderCode = sc.order_code;
    const prodIds = (sc.products || []).map(p => p.product_id);

    const isOrderChecked = selectedOrderCodes.includes(orderCode);
    const areAllProdsChecked = prodIds.length > 0 && prodIds.every(id => selectedProductIds.includes(id));

    let nextOrders;
    let nextProdIds;

    if (isOrderChecked && areAllProdsChecked) {
      // Đang chọn đầy đủ -> Bỏ chọn Cont và toàn bộ sản phẩm bên trong
      nextOrders = selectedOrderCodes.filter(c => c !== orderCode);
      nextProdIds = selectedProductIds.filter(id => !prodIds.includes(id));
    } else {
      // Chưa chọn hoặc chọn 1 phần -> Chọn đầy đủ Cont và tất cả sản phẩm
      nextOrders = Array.from(new Set([...selectedOrderCodes, orderCode]));
      nextProdIds = Array.from(new Set([...selectedProductIds, ...prodIds]));
    }

    setSelectedOrderCodes(nextOrders);
    setSelectedProductIds(nextProdIds);
    triggerPreviewMerge(nextOrders, sectionName, factory, selectedColors, nextProdIds);
  }, [selectedOrderCodes, selectedProductIds, sectionName, factory, selectedColors, triggerPreviewMerge]);

  // Toggle chọn 1 sản phẩm chi tiết (Level 3: Chọn sâu thêm 1 bậc từng sản phẩm trong Cont)
  const handleToggleSingleProduct = useCallback((sc, prod) => {
    const orderCode = sc.order_code;
    const prodId = prod.product_id;
    const allProdsInSc = sc.products || [];

    const isChecked = selectedProductIds.includes(prodId);
    const nextProdIds = isChecked
      ? selectedProductIds.filter(id => id !== prodId)
      : [...selectedProductIds, prodId];

    // Kiểm tra Cont này còn sản phẩm nào được chọn hay không
    const remainingInSc = allProdsInSc.filter(p => nextProdIds.includes(p.product_id));
    let nextOrders = [...selectedOrderCodes];
    if (remainingInSc.length > 0) {
      if (!nextOrders.includes(orderCode)) nextOrders.push(orderCode);
    } else {
      nextOrders = nextOrders.filter(c => c !== orderCode);
    }

    setSelectedProductIds(nextProdIds);
    setSelectedOrderCodes(nextOrders);
    triggerPreviewMerge(nextOrders, sectionName, factory, selectedColors, nextProdIds);
  }, [selectedProductIds, selectedOrderCodes, sectionName, factory, selectedColors, triggerPreviewMerge]);

  // Chọn / Bỏ chọn toàn bộ Cont con của 1 PO gốc
  const handleToggleAllInRoot = useCallback((group) => {
    const subContainers = group.sub_containers || [];
    const subCodes = subContainers.map(sc => sc.order_code);
    const allGroupProdIds = [];
    subContainers.forEach(sc => {
      (sc.products || []).forEach(p => allGroupProdIds.push(p.product_id));
    });

    const allOrdersChecked = subCodes.length > 0 && subCodes.every(c => selectedOrderCodes.includes(c));
    const allProdsChecked = allGroupProdIds.length > 0 && allGroupProdIds.every(id => selectedProductIds.includes(id));

    let nextOrders;
    let nextProdIds;

    if (allOrdersChecked && allProdsChecked) {
      nextOrders = selectedOrderCodes.filter(c => !subCodes.includes(c));
      nextProdIds = selectedProductIds.filter(id => !allGroupProdIds.includes(id));
    } else {
      nextOrders = Array.from(new Set([...selectedOrderCodes, ...subCodes]));
      nextProdIds = Array.from(new Set([...selectedProductIds, ...allGroupProdIds]));
    }

    setSelectedOrderCodes(nextOrders);
    setSelectedProductIds(nextProdIds);
    triggerPreviewMerge(nextOrders, sectionName, factory, selectedColors, nextProdIds);
  }, [selectedOrderCodes, selectedProductIds, sectionName, factory, selectedColors, triggerPreviewMerge]);

  // Chọn nhanh theo khoảng số Cont (VD: nhập "3-4" hoặc "1~8")
  const handleApplyRangeSelect = useCallback((group) => {
    const rawRange = (rangeInputs[group.root_po] || '').trim();
    if (!rawRange) return;
    const match = rawRange.match(/^(\d+)\s*[-~to]+\s*(\d+)$/i);
    let targetScs = [];
    if (match) {
      const startNum = parseInt(match[1], 10);
      const endNum = parseInt(match[2], 10);
      const minN = Math.min(startNum, endNum);
      const maxN = Math.max(startNum, endNum);
      targetScs = (group.sub_containers || []).filter(sc => sc.suffix_num >= minN && sc.suffix_num <= maxN);
    } else {
      const nums = rawRange.split(/[,;\s]+/).map(x => parseInt(x, 10)).filter(n => !isNaN(n));
      targetScs = (group.sub_containers || []).filter(sc => nums.includes(sc.suffix_num));
    }

    if (targetScs.length === 0) {
      toast?.warning(`Không tìm thấy Cont nào trong khoảng "${rawRange}" của ${group.root_po}`);
      return;
    }

    const targetCodes = targetScs.map(sc => sc.order_code);
    const targetProdIds = [];
    targetScs.forEach(sc => {
      (sc.products || []).forEach(p => targetProdIds.push(p.product_id));
    });

    const nextOrders = Array.from(new Set([...selectedOrderCodes, ...targetCodes]));
    const nextProdIds = Array.from(new Set([...selectedProductIds, ...targetProdIds]));

    setSelectedOrderCodes(nextOrders);
    setSelectedProductIds(nextProdIds);
    triggerPreviewMerge(nextOrders, sectionName, factory, selectedColors, nextProdIds);
    toast?.success(`Đã chọn gộp thêm ${targetCodes.length} Cont của ${group.root_po}`);
  }, [rangeInputs, selectedOrderCodes, selectedProductIds, sectionName, factory, selectedColors, triggerPreviewMerge, toast]);

  // Đổi Cụm chi tiết / Công đoạn từ CSDL
  const handleApplySectionPreset = useCallback((newSection) => {
    setSectionName(newSection);
    if (selectedOrderCodes.length > 0) {
      triggerPreviewMerge(selectedOrderCodes, newSection, factory, selectedColors, selectedProductIds);
    }
  }, [selectedOrderCodes, factory, selectedColors, selectedProductIds, triggerPreviewMerge]);

  // Lọc theo Màu sơn
  const handleToggleColorFilter = useCallback((color) => {
    setSelectedColors(prev => {
      const next = prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color];
      if (selectedOrderCodes.length > 0) {
        triggerPreviewMerge(selectedOrderCodes, sectionName, factory, next, selectedProductIds);
      }
      return next;
    });
  }, [selectedOrderCodes, sectionName, factory, selectedProductIds, triggerPreviewMerge]);

  // Custom: Bật / Tắt hiển thị 1 dòng
  const handleToggleItemVisible = useCallback((targetIndex) => {
    setItems(prev => {
      const next = [...prev];
      const target = { ...next[targetIndex] };
      const newVis = !target.is_visible;
      target.is_visible = newVis;
      next[targetIndex] = target;

      if (target.row_type === 'CABINET_HEADER') {
        for (let i = targetIndex + 1; i < next.length; i++) {
          if (next[i].row_type === 'CABINET_HEADER') break;
          next[i] = { ...next[i], is_visible: newVis };
        }
      }
      return next;
    });
  }, []);

  // Custom: Chỉnh sửa số lượng SLKH
  const handleChangePlannedQty = useCallback((targetIndex, valStr) => {
    const num = Math.max(0, parseInt(valStr || '0', 10) || 0);
    setItems(prev => {
      const next = [...prev];
      const target = { ...next[targetIndex], custom_planned_qty: num };
      next[targetIndex] = target;

      if (target.row_type === 'CABINET_HEADER') {
        for (let i = targetIndex + 1; i < next.length; i++) {
          if (next[i].row_type === 'CABINET_HEADER') break;
          const setVal = parseFloat(next[i].set_qty || 1);
          next[i] = {
            ...next[i],
            custom_planned_qty: Math.round(setVal * num)
          };
        }
      }
      return next;
    });
  }, []);

  // Custom: Chỉnh sửa trường bất kỳ trên dòng
  const handleChangeItemField = useCallback((targetIndex, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[targetIndex] = { ...next[targetIndex], [field]: value };
      return next;
    });
  }, []);

  // Custom: Thêm 1 dòng chi tiết bổ sung (lấy ngữ cảnh từ dòng gần nhất, không gán cứng)
  const handleAddCustomRow = useCallback(() => {
    const lastCab = [...items].reverse().find(it => it.row_type === 'CABINET_HEADER');
    const lastDetail = [...items].reverse().find(it => it.row_type === 'DETAIL_ITEM');
    const newRow = {
      row_type: 'DETAIL_ITEM',
      cont_code: lastCab?.cont_code || '',
      color_code: lastCab?.color_code || (availableColors[0] || ''),
      cabinet_code: lastCab?.cabinet_code || '',
      stt_code: '+',
      material_name: lastDetail?.material_name || '',
      item_name: '',
      dim_thick: lastDetail?.dim_thick || '',
      dim_width: '',
      dim_length: '',
      set_qty: 1,
      base_planned_qty: lastCab?.custom_planned_qty || 1,
      custom_planned_qty: lastCab?.custom_planned_qty || 1,
      completed_qty: 0,
      is_visible: true,
      is_custom_row: true,
      source_orders_text: 'Bổ sung trực tiếp',
      note: '',
      sort_order: items.length + 1
    };
    setItems(prev => [...prev, newRow]);
  }, [items, availableColors]);

  // Xóa dòng custom
  const handleRemoveRow = useCallback((targetIndex) => {
    setItems(prev => prev.filter((_, idx) => idx !== targetIndex));
  }, []);

  // Chọn / Bỏ chọn tất cả dòng
  const handleSelectAllItems = useCallback((visibleState) => {
    setItems(prev => prev.map(it => ({ ...it, is_visible: visibleState })));
  }, []);

  // Danh sách mã tủ hiển thị sau khi lọc tìm kiếm trên bảng phải
  const filteredCabinets = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return cabinets.map((cab, idx) => ({ cab, originalIndex: idx })).filter(({ cab }) => {
      if (!q) return true;
      const cabCode = (cab.cabinet_code || '').toLowerCase();
      const contCode = (cab.cont_code || '').toLowerCase();
      const colorCode = (cab.color_code || '').toLowerCase();
      const orders = (cab.source_orders_text || '').toLowerCase();
      const note = (cab.note || '').toLowerCase();
      const compMatch = (cab.components || []).some(comp =>
        (comp.item_name || '').toLowerCase().includes(q) ||
        (comp.material_name || '').toLowerCase().includes(q) ||
        (comp.stt_code || '').toLowerCase().includes(q)
      );
      return cabCode.includes(q) || contCode.includes(q) || colorCode.includes(q) || orders.includes(q) || note.includes(q) || compMatch;
    });
  }, [cabinets, itemSearch]);

  const statsSummary = useMemo(() => {
    const totalCabQty = cabinets.reduce((sum, c) => sum + (parseInt(c.custom_planned_qty, 10) || 0), 0);
    let totalComps = 0;
    let visibleComps = 0;
    cabinets.forEach(c => {
      (c.components || []).forEach(comp => {
        totalComps++;
        if (comp.is_visible) visibleComps++;
      });
    });
    return {
      cabinetsCount: cabinets.length,
      totalCabinetsQty: totalCabQty,
      visibleDetailsCount: visibleComps,
      totalDetailsCount: totalComps
    };
  }, [cabinets]);

  // Lưu Bảng "Hôm nay sản xuất gì"
  const handleSaveBatch = async () => {
    if (!batchTitle.trim()) {
      toast?.warning('Vui lòng chọn ít nhất 1 Cont hoặc nhập tiêu đề bảng sản xuất hôm nay.');
      return;
    }
    if (cabinets.length === 0) {
      toast?.warning('Chưa có mã tủ nào được chọn. Hãy chọn Cont bên trái.');
      return;
    }

    setSaving(true);
    try {
      const userObj = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      let itemsToSubmit = [];
      let sortOrder = 1;

      cabinets.forEach((c) => {
        // 1. Thêm dòng Header của tủ
        itemsToSubmit.push({
          row_type: 'CABINET_HEADER',
          cont_code: c.cont_code || '',
          color_code: c.color_code || '',
          cabinet_code: c.cabinet_code || '',
          stt_code: c.cabinet_code || '',
          material_name: '',
          item_name: `Tủ ${c.cabinet_code}` + (c.color_code ? ` (${c.color_code})` : ''),
          dim_thick: '',
          dim_width: '',
          dim_length: '',
          set_qty: 1.0,
          base_planned_qty: c.total_cabinet_qty || 0,
          custom_planned_qty: c.custom_planned_qty !== undefined ? c.custom_planned_qty : (c.total_cabinet_qty || 0),
          completed_qty: 0,
          is_visible: true,
          is_custom_row: false,
          source_orders_text: c.source_orders_text || '',
          note: c.note || '',
          sort_order: sortOrder++
        });

        // 2. Thêm các chi tiết linh kiện con thuộc tủ đó
        (c.components || []).forEach(comp => {
          itemsToSubmit.push({
            ...comp,
            sort_order: sortOrder++
          });
        });
      });

      const payload = {
        plan_date: planDate,
        factory,
        section_name: sectionName,
        batch_title: batchTitle.trim(),
        line_color_summary: lineColorSummary.trim(),
        selected_orders: selectedOrderCodes,
        status,
        notes,
        created_by: userObj.username || 'Admin',
        items: itemsToSubmit
      };

      let saved;
      if (editingBatch && editingBatch.id) {
        saved = await dailyProductionService.updateBatch(editingBatch.id, payload);
        toast?.success('Đã cập nhật bảng "Hôm nay sản xuất gì" thành công!');
      } else {
        saved = await dailyProductionService.createBatch(payload);
        toast?.success('Đã tạo bảng "Hôm nay sản xuất gì" thành công!');
      }
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu bảng sản xuất ngày:', err);
      toast?.error(err?.response?.data?.detail || 'Không thể lưu bảng sản xuất ngày.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="daily-builder-workspace">
      {/* HEADER WORKSPACE */}
      <div className="daily-builder-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="daily-btn-outline"
            onClick={onClose}
            style={{ padding: '7px 12px' }}
          >
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>

          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#7B5233',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Layers size={20} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#2D1A12' }}>
              {editingBatch
                ? `Chỉnh Sửa Bảng SX Hôm Nay (${editingBatch.batch_code})`
                : 'Thiết Lập Gộp Cont & Custom "Hôm Nay Sản Xuất Gì"'}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.79rem', color: '#786452' }}>
              Bước 1: Tick chọn các Cont lẻ từ Database ở cột bên trái &rarr; Bước 2: Tick chọn / chỉnh sửa các chi tiết BOM hiển thị sản xuất hôm nay ở bên phải
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="daily-btn-outline"
            onClick={fetchAvailableContainers}
            title="Tải lại danh sách PO & Cont từ Database"
          >
            <RefreshCw size={15} /> Tải lại PO/Cont
          </button>
          <button
            type="button"
            className="daily-btn-primary"
            disabled={saving}
            onClick={handleSaveBatch}
          >
            <Check size={17} />
            {saving
              ? 'Đang lưu...'
              : (editingBatch ? 'Lưu Cập Nhật Bảng SX' : 'Lưu & Phát Hành "Hôm Nay Sản Xuất Gì"')}
          </button>
        </div>
      </div>

      {/* BODY: 2 PANELS (TRÁI: CÂY PO & CONT LẺ | PHẢI: BẢNG CUSTOM BOM) */}
      <div className="daily-builder-body">
        {/* PANEL TRÁI: LIST PO GỐC & CHỌN GỘP TỪNG CONT LẺ */}
        <div className="daily-builder-left">
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #EADCC9', background: '#FAF7F2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#2D1A12' }}>
                1. CHỌN CONT LẺ ĐỂ GỘP ({selectedOrderCodes.length} Cont đã chọn)
              </span>
              {selectedOrderCodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderCodes([]);
                    setSelectedProductIds([]);
                    setItems([]);
                    if (!isTitleManuallyEdited) setBatchTitle('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#DC2626',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Bỏ chọn hết
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.74rem', color: '#786452', marginBottom: 8, fontWeight: 600 }}>
              Dữ liệu CSDL: <b>{totalStats.total_root_pos} PO gốc</b> ({totalStats.total_containers} Cont/Đơn hàng)
            </div>

            {/* Bộ lọc Nhà máy & Kế hoạch SX cho danh sách PO bên trái */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              <select
                className="daily-prod-select"
                style={{ width: '100%', fontSize: '0.78rem', padding: '5px 8px' }}
                value={leftFactoryFilter}
                onChange={(e) => setLeftFactoryFilter(e.target.value)}
              >
                <option value="ALL">Tất cả Nhà máy</option>
                {dbFactories.map(f => (
                  <option key={f.code} value={f.code}>
                    {f.code} {f.name && f.name !== f.code ? `- ${f.name}` : ''}
                  </option>
                ))}
              </select>

              <select
                className="daily-prod-select"
                style={{ width: '100%', fontSize: '0.78rem', padding: '5px 8px' }}
                value={leftPlanFilter}
                onChange={(e) => setLeftPlanFilter(e.target.value)}
              >
                <option value="">Tất cả Kế hoạch SX</option>
                {dbPlans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.plan_code} ({p.orders_count} đơn)
                  </option>
                ))}
              </select>
            </div>

            {/* Tìm kiếm mã PO / Cont */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                className="daily-prod-input"
                style={{ width: '100%', paddingLeft: 32, fontSize: '0.82rem' }}
                placeholder="Tìm mã PO hoặc Cont (VD: APT-0074, 0084...)"
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Danh sách cây PO Gốc -> Các Cont lẻ */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {loadingContainers ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#7B5233', fontWeight: 600 }}>
                Đang tải danh sách PO & Cont lẻ từ CSDL...
              </div>
            ) : containerGroups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#786452' }}>
                Không tìm thấy đơn hàng / Cont nào khớp bộ lọc.
              </div>
            ) : (
              containerGroups.map(group => {
                const isExp = !!expandedRoots[group.root_po];
                const subCodes = (group.sub_containers || []).map(sc => sc.order_code);
                const selectedInGroupCount = subCodes.filter(c => selectedOrderCodes.includes(c)).length;
                const allSelected = subCodes.length > 0 && selectedInGroupCount === subCodes.length;

                return (
                  <div key={group.root_po} className="po-root-card">
                    <div
                      className={`po-root-header ${isExp ? 'expanded' : ''}`}
                      onClick={() => setExpandedRoots(prev => ({ ...prev, [group.root_po]: !prev[group.root_po] }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {isExp ? <ChevronDown size={16} color="#7B5233" /> : <ChevronRight size={16} color="#7B5233" />}
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#2D1A12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {group.root_po}
                        </span>
                        <span style={{
                          fontSize: '0.71rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 99,
                          background: selectedInGroupCount > 0 ? '#7B5233' : '#EADCC9',
                          color: selectedInGroupCount > 0 ? '#FFFFFF' : '#5D3E26',
                          flexShrink: 0
                        }}>
                          {selectedInGroupCount}/{group.total_containers} Cont
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontSize: '0.73rem', color: '#786452', fontWeight: 600 }}>
                          {group.total_cabinets} tủ
                        </span>
                        <button
                          type="button"
                          className="daily-btn-outline"
                          style={{ padding: '3px 7px', fontSize: '0.71rem' }}
                          onClick={() => handleToggleAllInRoot(group)}
                        >
                          {allSelected ? 'Bỏ hết' : 'Gộp cả PO'}
                        </button>
                      </div>
                    </div>

                    {isExp && (
                      <div>
                        {/* Thanh nhập nhanh khoảng Cont (VD: 1-4 hoặc 3~4) */}
                        {group.total_containers > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 10px',
                            background: '#FDFBF7',
                            borderBottom: '1px dashed #EADCC9'
                          }}>
                            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#7B5233', whiteSpace: 'nowrap' }}>
                              Khoảng Cont:
                            </span>
                            <input
                              type="text"
                              className="daily-prod-input"
                              style={{ width: 92, padding: '3px 7px', fontSize: '0.76rem' }}
                              placeholder="VD: 1-3, 5"
                              value={rangeInputs[group.root_po] || ''}
                              onChange={(e) => setRangeInputs(prev => ({ ...prev, [group.root_po]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleApplyRangeSelect(group);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="daily-btn-outline"
                              style={{ padding: '3px 8px', fontSize: '0.73rem' }}
                              onClick={() => handleApplyRangeSelect(group)}
                            >
                              Chọn
                            </button>
                          </div>
                        )}

                        {/* Lưới từng Cont lẻ & Chi tiết Sản phẩm con bên trong (Sâu thêm 1 bậc) */}
                        <div className="po-sub-grid">
                          {(group.sub_containers || []).map(sc => {
                            const prods = sc.products || [];
                            const selectedProdsInSc = prods.filter(p => selectedProductIds.includes(p.product_id));
                            const isAllChecked = prods.length > 0
                              ? selectedProdsInSc.length === prods.length
                              : selectedOrderCodes.includes(sc.order_code);
                            const isPartiallyChecked = prods.length > 0 && selectedProdsInSc.length > 0 && selectedProdsInSc.length < prods.length;
                            const isChecked = isAllChecked || isPartiallyChecked || selectedOrderCodes.includes(sc.order_code);
                            const isContExpanded = !!expandedContainers[sc.order_code];
                            const selectedQtyInSc = selectedProdsInSc.reduce((sum, p) => sum + (p.quantity || 0), 0);

                            return (
                              <div
                                key={sc.order_code}
                                className={`po-sub-item ${isChecked ? 'checked' : ''} ${isContExpanded ? 'expanded' : ''}`}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, cursor: 'pointer', flex: 1 }}
                                    onClick={() => handleToggleSubContainer(sc)}
                                  >
                                    {isAllChecked ? (
                                      <CheckSquare size={15} color="#7B5233" style={{ flexShrink: 0 }} />
                                    ) : isPartiallyChecked ? (
                                      <div style={{
                                        width: 15,
                                        height: 15,
                                        borderRadius: 3,
                                        background: '#D97706',
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        lineHeight: 1,
                                        flexShrink: 0
                                      }}>
                                        –
                                      </div>
                                    ) : (
                                      <Square size={15} color="#9CA3AF" style={{ flexShrink: 0 }} />
                                    )}
                                    <span style={{ fontWeight: 800, fontSize: '0.81rem', color: '#2D1A12', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {sc.order_code}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                    <span style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: isChecked ? '#7B5233' : '#6B7280',
                                      background: isChecked ? '#F4ECE1' : '#F3F4F6',
                                      padding: '1px 5px',
                                      borderRadius: 4
                                    }}>
                                      {isPartiallyChecked ? `${selectedQtyInSc}/${sc.total_cabinets} tủ` : `${sc.total_cabinets} tủ`}
                                    </span>

                                    {/* Nút bấm mở rộng chọn chi tiết sâu thêm 1 bậc */}
                                    {prods.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedContainers(prev => ({
                                            ...prev,
                                            [sc.order_code]: !prev[sc.order_code]
                                          }));
                                        }}
                                        style={{
                                          background: isContExpanded ? '#7B5233' : '#FAF3EB',
                                          color: isContExpanded ? '#FFFFFF' : '#7B5233',
                                          border: '1px solid #DECBB4',
                                          borderRadius: 4,
                                          padding: '2px 5px',
                                          fontSize: '0.67rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 2
                                        }}
                                        title="Xem & chọn chi tiết từng sản phẩm trong Cont"
                                      >
                                        {prods.length} SP
                                        {isContExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {sc.colors && sc.colors.length > 0 && (
                                  <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>
                                    Màu: {sc.colors.join(', ')} {sc.factory ? `• ${sc.factory}` : ''}
                                  </div>
                                )}

                                {!isContExpanded && sc.product_summary && (
                                  <div
                                    style={{
                                      fontSize: '0.68rem',
                                      color: '#786452',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      cursor: 'pointer'
                                    }}
                                    title={`${sc.product_summary} (Nhấn để chọn chi tiết)`}
                                    onClick={() => setExpandedContainers(prev => ({ ...prev, [sc.order_code]: true }))}
                                  >
                                    {sc.product_summary}
                                  </div>
                                )}

                                {sc.is_scheduled_today && (
                                  <div style={{
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    color: '#B45309',
                                    background: '#FEF3C7',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    marginTop: 2,
                                    width: 'fit-content'
                                  }}>
                                    Đã có lịch hôm nay
                                  </div>
                                )}

                                {/* LEVEL 3: DANH SÁCH CHI TIẾT TỪNG SẢN PHẨM TRONG CONT (SÂU THÊM 1 BẬC) */}
                                {isContExpanded && prods.length > 0 && (
                                  <div className="po-prod-list" onClick={(e) => e.stopPropagation()}>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      color: '#7B5233',
                                      marginBottom: 2
                                    }}>
                                      <span>Chọn chi tiết ({selectedProdsInSc.length}/{prods.length} sản phẩm):</span>
                                      <button
                                        type="button"
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#7B5233',
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          textDecoration: 'underline'
                                        }}
                                        onClick={() => handleToggleSubContainer(sc)}
                                      >
                                        {isAllChecked ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                                      </button>
                                    </div>

                                    {prods.map(prod => {
                                      const isProdChecked = selectedProductIds.includes(prod.product_id);
                                      return (
                                        <div
                                          key={prod.product_id}
                                          className={`po-prod-item ${isProdChecked ? 'checked' : ''}`}
                                          onClick={() => handleToggleSingleProduct(sc, prod)}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                            {isProdChecked ? (
                                              <CheckSquare size={13} color="#7B5233" style={{ flexShrink: 0 }} />
                                            ) : (
                                              <Square size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
                                            )}
                                            <div style={{ minWidth: 0 }}>
                                              <div style={{
                                                fontWeight: 700,
                                                color: '#2D1A12',
                                                fontSize: '0.73rem',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                              }} title={prod.name || prod.sku}>
                                                {prod.cabinet_code || prod.name || prod.sku}
                                              </div>
                                              {prod.sku && prod.sku !== prod.cabinet_code && (
                                                <div style={{ fontSize: '0.66rem', color: '#6B7280' }}>
                                                  SKU: {prod.sku} {prod.color ? `• Màu ${prod.color}` : ''}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <span style={{
                                            fontSize: '0.71rem',
                                            fontWeight: 800,
                                            color: isProdChecked ? '#15803D' : '#6B7280',
                                            background: isProdChecked ? '#DCFCE7' : '#E5E7EB',
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            flexShrink: 0
                                          }}>
                                            {prod.quantity} cái
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL PHẢI: CUSTOM HÔM NAY SẢN XUẤT GÌ (CHỌN ĐỂ HIỂN THỊ) */}
        <div className="daily-builder-right">
          {/* Thông tin Header của Bảng Liệt Kê */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #EADCC9',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 8,
            flexShrink: 0
          }}>
            <div className="daily-builder-form-grid-4">
              <div>
                <label className="daily-field-label">
                  Ngày sản xuất
                </label>
                <input
                  type="date"
                  className="daily-prod-input"
                  style={{ width: '100%' }}
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                />
              </div>

              <div>
                <label className="daily-field-label">
                  Nhà máy (Từ CSDL)
                </label>
                <select
                  className="daily-prod-select"
                  style={{ width: '100%' }}
                  value={factory}
                  onChange={(e) => {
                    const nextFac = e.target.value;
                    setFactory(nextFac);
                    if (selectedOrderCodes.length > 0) {
                      triggerPreviewMerge(selectedOrderCodes, sectionName, nextFac, selectedColors);
                    }
                  }}
                >
                  {dbFactories.map(f => (
                    <option key={f.code} value={f.code}>
                      {f.code} {f.name && f.name !== f.code ? `(${f.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="daily-field-label">
                  Cụm chi tiết / Công đoạn (Từ CSDL)
                </label>
                <select
                  className="daily-prod-select"
                  style={{ width: '100%' }}
                  value={sectionName}
                  onChange={(e) => handleApplySectionPreset(e.target.value)}
                >
                  {dbSections.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="daily-field-label">
                  Dòng hàng / Màu / Nhà máy
                </label>
                <input
                  type="text"
                  className="daily-prod-input"
                  style={{ width: '100%' }}
                  placeholder="Tự động tổng hợp từ các Cont đã chọn..."
                  value={lineColorSummary}
                  onChange={(e) => setLineColorSummary(e.target.value)}
                />
              </div>
            </div>

            <div className="daily-builder-form-grid-2">
              <div>
                <label className="daily-field-label">
                  Tiêu đề Cont gộp hiển thị trên phiếu (Tự động rút gọn từ Cont đã chọn, có thể sửa tay)
                </label>
                <input
                  type="text"
                  className="daily-prod-input"
                  style={{ width: '100%', fontWeight: 800, color: '#7B5233' }}
                  placeholder="Chọn Cont bên trái để tự động điền (VD: APT-0063-03~04; APT-0074-01~02...)"
                  value={batchTitle}
                  onChange={(e) => {
                    setBatchTitle(e.target.value);
                    setIsTitleManuallyEdited(true);
                  }}
                />
              </div>
              <div>
                <label className="daily-field-label">
                  Ghi chú bảng sản xuất
                </label>
                <input
                  type="text"
                  className="daily-prod-input"
                  style={{ width: '100%' }}
                  placeholder="Ghi chú ca chạy / tổ phụ trách..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Bộ lọc Màu sơn nhanh nếu có nhiều màu */}
            {availableColors.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#7B5233' }}>
                  Lọc màu sơn trong các Cont đã chọn:
                </span>
                {availableColors.map(clr => {
                  const active = selectedColors.includes(clr);
                  return (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => handleToggleColorFilter(clr)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 99,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: active ? '1.5px solid #7B5233' : '1px solid #DECBB4',
                        background: active ? '#7B5233' : '#FAF7F2',
                        color: active ? '#FFFFFF' : '#2D1A12'
                      }}
                    >
                      {clr}
                    </button>
                  );
                })}
                {selectedColors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedColors([]);
                      triggerPreviewMerge(selectedOrderCodes, sectionName, factory, []);
                    }}
                    style={{ fontSize: '0.74rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Hiện tất cả màu
                  </button>
                )}
              </div>
            )}
          </div>

          {/* THANH ĐIỀU KHIỂN BẢNG MÃ TỦ & COLAB LINH KIỆN */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 8,
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#FAF3E8',
                border: '1px solid #D8C4AC',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#5D3E26'
              }}>
                <Layers size={15} color="#7B5233" />
                <span>DANH SÁCH MÃ TỦ SẢN XUẤT HÔM NAY ({cabinets.length} mã • {statsSummary.totalCabinetsQty} tủ)</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="daily-btn-outline"
                onClick={handleExpandAllCabinets}
                disabled={cabinets.length === 0}
                style={{ padding: '4px 9px', fontSize: '0.75rem', fontWeight: 700 }}
              >
                <ChevronDown size={14} /> Mở tất cả chi tiết
              </button>
              <button
                type="button"
                className="daily-btn-outline"
                onClick={handleCollapseAllCabinets}
                disabled={cabinets.length === 0}
                style={{ padding: '4px 9px', fontSize: '0.75rem', fontWeight: 700 }}
              >
                <ChevronRight size={14} /> Thu gọn tất cả
              </button>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  className="daily-prod-input"
                  style={{ paddingLeft: 26, width: 170, fontSize: '0.78rem', padding: '4px 8px 4px 26px' }}
                  placeholder="Lọc mã tủ, chi tiết..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* BẢNG TỔNG HỢP MÃ TỦ & COLAB CHI TIẾT LINH KIỆN */}
          <div style={{
            flex: 1,
            background: '#FFFFFF',
            border: '1px solid #D8C4AC',
            borderRadius: 10,
            overflow: 'auto',
            minHeight: 0
          }}>
            {loadingPreview ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#7B5233', fontWeight: 700 }}>
                Đang tổng hợp danh sách mã tủ từ các Cont đã chọn...
              </div>
            ) : filteredCabinets.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#786452' }}>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', marginBottom: 6, color: '#2D1A12' }}>
                  {cabinets.length === 0 ? 'Chưa có mã tủ nào được chọn' : 'Không tìm thấy mã tủ / chi tiết nào khớp từ khóa'}
                </div>
                <div style={{ fontSize: '0.84rem' }}>
                  {cabinets.length === 0
                    ? 'Hãy tick chọn các Cont lẻ ở cột bên trái (VD: APT-0042-01, ADV-0410...) để hệ thống tổng hợp danh sách sản xuất!'
                    : 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tìm kiếm.'}
                </div>
              </div>
            ) : (
              <table className="factory-sheet-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ width: 55 }}>#</th>
                    <th style={{ minWidth: 150 }}>MÃ TỦ / SẢN PHẨM</th>
                    <th style={{ width: 100 }}>MÃ QUY CÁCH</th>
                    <th style={{ width: 80 }}>MÀU SƠN</th>
                    <th style={{ minWidth: 220 }}>GỘP TỪ CÁC CONT LẺ</th>
                    <th style={{ width: 95 }}>SL GỐC</th>
                    <th style={{ width: 150 }}>SL HÔM NAY (SỬA ĐƯỢC)</th>
                    <th style={{ minWidth: 140 }}>GHI CHÚ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCabinets.map(({ cab, originalIndex: idx }) => {
                    const cabKey = getCabKey(cab, idx);
                    const isExpanded = !!expandedCabinets[cabKey];
                    const comps = cab.components || [];

                    return (
                      <React.Fragment key={cabKey}>
                        <tr className={`factory-sheet-row-cabinet ${isExpanded ? 'is-colab-open' : ''}`}>
                          <td
                            style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleToggleCabinetColab(cabKey)}
                            title={isExpanded ? 'Thu gọn chi tiết' : `Bấm để mở chi tiết (${comps.length} linh kiện)`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <span style={{ display: 'inline-flex', color: '#7B5233' }}>
                                {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                              </span>
                              <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{idx + 1}</span>
                            </div>
                          </td>
                          <td
                            style={{ fontWeight: 800, color: '#2D1A12', fontSize: '0.94rem', cursor: 'pointer' }}
                            onClick={() => handleToggleCabinetColab(cabKey)}
                            title={isExpanded ? 'Thu gọn chi tiết' : `Bấm để mở chi tiết (${comps.length} linh kiện)`}
                          >
                            Tủ {cab.cabinet_code}
                            <span style={{ fontSize: '0.74rem', color: '#7B5233', fontWeight: 600, marginLeft: 6 }}>
                              ({comps.length} LK)
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge-model-code" title="Mã dòng / quy cách của tủ">
                              {cab.cont_code || '—'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge-color-tag">
                              {cab.color_code || '—'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {(cab.source_orders_breakdown && cab.source_orders_breakdown.length > 0) ? (
                                cab.source_orders_breakdown.map((src, sIdx) => (
                                  <span key={sIdx} className="badge-source-cont">
                                    {src.order_code} <b>({src.quantity} bộ)</b>
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: '#7B5233' }}>{cab.source_orders_text}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#6B7280' }}>
                            {cab.total_cabinet_qty} bộ
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              className="daily-prod-input"
                              style={{
                                width: 85,
                                padding: '4px 8px',
                                textAlign: 'center',
                                fontWeight: 800,
                                color: '#15803D',
                                fontSize: '0.98rem',
                                background: '#FFFFFF',
                                border: '1.5px solid #15803D'
                              }}
                              value={cab.custom_planned_qty ?? 0}
                              onChange={(e) => handleChangeCabinetPlannedQty(idx, e.target.value)}
                              title="Sửa SL tủ hôm nay sẽ tự động tính lại số lượng của các linh kiện bên dưới"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="daily-prod-input"
                              style={{ width: '100%', padding: '4px 8px', fontSize: '0.82rem' }}
                              placeholder="Ghi chú ca chạy / phôi / sơn..."
                              value={cab.note || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCabinets(prev => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], note: val };
                                  return next;
                                });
                              }}
                            />
                          </td>
                        </tr>

                        {/* DÒNG COLAB XỔ RA CHI TIẾT LINH KIỆN BOM */}
                        {isExpanded && (
                          <tr className="cabinet-colab-row">
                            <td colSpan={8}>
                              <div className="cabinet-colab-container">
                                <div className="cabinet-nested-header sticky-header">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 800, color: '#7B5233', fontSize: '0.82rem' }}>
                                      ⚡ CHI TIẾT LINH KIỆN (BOM) CỦA TỦ {cab.cabinet_code} ({cab.color_code})
                                    </span>
                                    <span style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                                      — Định mức theo <b>{cab.custom_planned_qty ?? 0}</b> bộ tủ hôm nay
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', marginRight: 2 }}>
                                      Chọn bậc:
                                    </span>
                                    <button
                                      type="button"
                                      className="daily-btn-outline"
                                      style={{ padding: '2px 7px', fontSize: '0.71rem' }}
                                      onClick={() => handleSelectByLevelInCabinet(idx, 'ALL')}
                                    >
                                      Tất cả
                                    </button>
                                    <button
                                      type="button"
                                      className="daily-btn-outline"
                                      style={{ padding: '2px 7px', fontSize: '0.71rem' }}
                                      onClick={() => handleSelectByLevelInCabinet(idx, 1)}
                                      title="Chỉ chọn các cụm Bậc 1 (STT: 1, 2, 3...)"
                                    >
                                      Bậc 1 (Cụm chính)
                                    </button>
                                    <button
                                      type="button"
                                      className="daily-btn-outline"
                                      style={{ padding: '2px 7px', fontSize: '0.71rem' }}
                                      onClick={() => handleSelectByLevelInCabinet(idx, 2)}
                                      title="Chọn Bậc 1 & 2 (STT: 1, 1.1, 1.2...)"
                                    >
                                      Bậc 1 & 2
                                    </button>
                                    <button
                                      type="button"
                                      className="daily-btn-outline"
                                      style={{ padding: '2px 7px', fontSize: '0.71rem' }}
                                      onClick={() => handleSelectByLevelInCabinet(idx, 3)}
                                      title="Chọn Bậc 3 (Toàn bộ chi tiết linh kiện)"
                                    >
                                      Bậc 3
                                    </button>
                                    <button
                                      type="button"
                                      className="daily-btn-outline"
                                      style={{ padding: '2px 7px', fontSize: '0.71rem', color: '#DC2626' }}
                                      onClick={() => handleSelectByLevelInCabinet(idx, 'NONE')}
                                    >
                                      Bỏ chọn
                                    </button>
                                  </div>
                                </div>

                                {comps.length === 0 ? (
                                  <div style={{ padding: '12px 16px', background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 6, fontSize: '0.8rem', color: '#786452', textAlign: 'center' }}>
                                    Chưa có dữ liệu định mức BOM cho mã tủ này trong CSDL.
                                  </div>
                                ) : (
                                  <table className="cabinet-nested-table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: 45 }}>Hiển thị</th>
                                        <th style={{ width: 62 }}>STT</th>
                                        <th style={{ minWidth: 160 }}>Sản phẩm / Chi tiết</th>
                                        <th style={{ minWidth: 140 }}>Nguyên liệu</th>
                                        <th style={{ width: 55 }}>Dày</th>
                                        <th style={{ width: 55 }}>Rộng</th>
                                        <th style={{ width: 55 }}>Dài</th>
                                        <th style={{ width: 45 }}>Set</th>
                                        <th style={{ width: 85 }}>SLKH (Hôm nay)</th>
                                        <th style={{ minWidth: 130 }}>Ghi chú</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {comps.map((comp, cIdx) => {
                                        const sttStr = String(comp.stt_code || '').trim();
                                        const depth = sttStr ? sttStr.split('.').length : 1;
                                        const rowClass = [
                                          depth === 1 ? 'colab-row-level-1' : (depth === 2 ? 'colab-row-level-2' : 'colab-row-level-3'),
                                          !comp.is_visible ? 'row-hidden' : ''
                                        ].filter(Boolean).join(' ');

                                        return (
                                          <tr key={cIdx} className={rowClass}>
                                            <td style={{ textAlign: 'center' }}>
                                              <input
                                                type="checkbox"
                                                checked={!!comp.is_visible}
                                                onChange={() => handleToggleComponentVisible(idx, cIdx)}
                                                style={{ width: 15, height: 15, accentColor: '#7B5233', cursor: 'pointer' }}
                                                title={`Chọn/Bỏ chọn chi tiết này (Bậc ${depth})`}
                                              />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                              <span className={`badge-level-stt lvl-${Math.min(depth, 3)}`}>
                                                {sttStr || cIdx + 1}
                                              </span>
                                            </td>
                                            <td style={{
                                              paddingLeft: depth === 1 ? 10 : (depth === 2 ? 22 : 38),
                                              fontWeight: depth === 1 ? 800 : (depth === 2 ? 700 : 500),
                                              color: depth === 1 ? '#2D1A12' : (depth === 2 ? '#3E2A1D' : '#523B2A')
                                            }}>
                                              {depth === 2 && <span className="tree-connector-guide">├─ </span>}
                                              {depth >= 3 && <span className="tree-connector-guide">│  └─ </span>}
                                              <span>{comp.item_name}</span>
                                            </td>
                                            <td style={{ color: '#4A2E18' }}>
                                              {comp.material_name || '—'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{comp.dim_thick || '—'}</td>
                                            <td style={{ textAlign: 'center' }}>{comp.dim_width || '—'}</td>
                                            <td style={{ textAlign: 'center' }}>{comp.dim_length || '—'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{comp.set_qty}</td>
                                            <td style={{ textAlign: 'center' }}>
                                              <input
                                                type="number"
                                                min="0"
                                                className="daily-prod-input"
                                                style={{
                                                  width: 72,
                                                  padding: '2px 4px',
                                                  textAlign: 'center',
                                                  fontSize: '0.82rem',
                                                  fontWeight: 800,
                                                  color: '#15803D'
                                                }}
                                                value={comp.custom_planned_qty ?? 0}
                                                onChange={(e) => handleChangeComponentQty(idx, cIdx, e.target.value)}
                                              />
                                            </td>
                                            <td>
                                              <input
                                                type="text"
                                                className="daily-prod-input"
                                                style={{ width: '100%', padding: '2px 6px', fontSize: '0.78rem' }}
                                                placeholder="Ghi chú chi tiết..."
                                                value={comp.note || ''}
                                                onChange={(e) => handleChangeComponentNote(idx, cIdx, e.target.value)}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER WORKSPACE */}
      <div className="daily-builder-footer">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontSize: '0.85rem' }}>
          <span>
            Đã gộp: <b style={{ color: '#7B5233' }}>{selectedOrderCodes.length} Cont</b>
            {selectedProductIds.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: '#B45309', marginLeft: 4 }}>
                ({selectedProductIds.length} sản phẩm đã chọn)
              </span>
            )}
          </span>
          <span>•</span>
          <span>
            Mã tủ chạy hôm nay: <b>{statsSummary.cabinetsCount} mã ({statsSummary.totalCabinetsQty} bộ tủ)</b>
          </span>
          <span>•</span>
          <span>
            Chi tiết chọn hiển thị: <b style={{ color: '#15803D' }}>{statsSummary.visibleDetailsCount}</b> / {statsSummary.totalDetailsCount} dòng BOM
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="daily-btn-outline" onClick={onClose}>
            Quay lại danh sách
          </button>
          <button
            type="button"
            className="daily-btn-primary"
            disabled={saving}
            onClick={handleSaveBatch}
          >
            <Check size={17} />
            {saving ? 'Đang lưu...' : (editingBatch ? 'Lưu Cập Nhật Bảng SX Hôm Nay' : 'Lưu & Phát Hành "Hôm Nay Sản Xuất Gì"')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyProductionBuilderModal;

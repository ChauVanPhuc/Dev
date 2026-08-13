import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Pencil, Download, Upload, Send, ArrowLeft, ChevronDown, Eye, Plus, ArrowRight
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { planService } from '@modules/Plan/Models/plan.service';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

/**
 * View: Quản lý Lệnh sản xuất (/admin/production-orders)
 * Xây dựng hoàn chỉnh Tab "Quy trình - Kế hoạch":
 * 1. Khối "Quy trình sản xuất": Chuỗi công đoạn chính (Khối chữ nhật) + Nút chọn công đoạn active màu xanh lá chuối.
 *    Khối công đoạn con/tổ máy (Khối Oval xanh dương) nằm trong viền bo.
 * 2. Khối "Kế hoạch thực hiện": Bảng 15 cột chuẩn ERP + Nút "+ Thêm mới".
 */
const ProductionOrdersView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = outletContext;
  const { toast } = useToast();

  // View Mode: 'list' (Danh sách Lệnh SX) | 'create' (Chi tiết/Tạo Lệnh SX)
  const [viewMode, setViewMode] = useState('list');
  // Edit Mode: true = Chỉnh sửa lệnh có sẵn | false = Tạo lệnh mới
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [sortValue, setSortValue] = useState('time_desc');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const activeFiltersCount = [filterStatus, filterPriority, filterDateFrom, filterDateTo].filter(Boolean).length;

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterPriority, filterDateFrom, filterDateTo]);

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-orders');

  // Đặt Tiêu đề, Subtitle và Nút "Quay lại" trực tiếp lên Thanh Nav Cố Định (admin-header)
  useEffect(() => {
    if (viewMode === 'create') {
      const titleSub = isEditMode ? `${screenCode || 'SX02'}.1: Chi tiết lệnh sản xuất` : `${screenCode || 'SX02'}.1: Tạo lệnh sản xuất`;
      if (setCustomTitle) setCustomTitle(title || 'Lệnh sản xuất');
      if (setCustomSubtitle) setCustomSubtitle(titleSub);
      if (setCustomScreenCode) setCustomScreenCode(`${screenCode || 'SX02'}.1`);
      if (setHeaderExtra) {
        setHeaderExtra(
          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              padding: '7px 16px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #5D3B32',
              borderRadius: '8px',
              color: '#5D3B32',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5D3B32';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#5D3B32';
            }}
          >
            <ArrowLeft size={16} /> Quay lại danh sách Lệnh SX
          </button>
        );
      }
    } else {
      if (setCustomTitle) setCustomTitle(title || 'Lệnh sản xuất');
      if (setCustomSubtitle) setCustomSubtitle(subtitle || 'Danh sách lệnh sản xuất');
      if (setCustomScreenCode) setCustomScreenCode(screenCode || 'SX02');
      if (setHeaderExtra) setHeaderExtra(null);
    }

    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [viewMode, isEditMode, setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, title, subtitle, screenCode]);

  // State dữ liệu danh sách Lệnh sản xuất
  const [ordersList, setOrdersList] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Danh sách các PO Mua hàng từ /admin/purchase-requisitions phục vụ gợi ý
  const [purchaseRequisitions, setPurchaseRequisitions] = useState([]);
  const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const poDropdownRef = useRef(null);

  // Form Thông tin chung
  const [orderForm, setOrderForm] = useState({
    code: '',
    orderId: '',
    priority: 'Bình thường',
    startDate: '',
    endDate: '',
    status: 'Đang sản xuất'
  });

  // Active Main Tab bên dưới Thông tin chung
  const [activeMainTab, setActiveMainTab] = useState('order_info');

  // Bảng 1: Thông tin đơn hàng (Top Table)
  const [orderProducts, setOrderProducts] = useState([]);

  // Bảng 2: Chi tiết sản phẩm (Bottom Card & Table)
  const [productDetails, setProductDetails] = useState([]);

  // Sản phẩm đang được chọn ở Bảng 1 để lọc Bảng 2
  const [selectedProductCode, setSelectedProductCode] = useState(null);

  // Danh sách công đoạn mặc định khớp 1:1 với bảng 'stages' trong CSDL
  const defaultDbStages = [
    'NM1 - Tạo phôi 1',
    'NM1 - Định hình mặt tiền 1',
    'NM1 - Định hình tủ 1',
    'NM1 - Lắp ráp mặt tiền 1',
    'NM1 - Lắp ráp tủ 1',
    'NM1 - Sơn Pallet 1',
    'NM1 - Sơn treo 1',
    'NM1 - Đóng gói 1',
    'NM1 - QC / Kiểm định 1',
    'NM2 - Định hình mặt tiền 2',
    'NM2 - Định hình tủ 2',
    'NM2 - Lắp ráp mặt tiền 2',
    'NM2 - Lắp ráp tủ 2',
    'NM2 - Sơn Pallet 2',
    'NM2 - Sơn treo 2',
    'NM2 - Đóng gói 2',
    'NM3 - Tạo phôi 3',
    'NM3 - Định hình 3',
    'NM3 - Lắp ráp 3',
    'NM3 - Sơn 3',
    'NM3 - Đóng gói 3'
  ];

  // State danh sách công đoạn phục vụ Dropdown chọn Công đoạn giao / nhận (Load từ bảng DB 'stages')
  const [stageOptions, setStageOptions] = useState(defaultDbStages);

  // Fetch danh sách công đoạn từ DB (bảng stages) - Lấy nguyên bản từ CSDL
  useEffect(() => {
    const fetchStagesFromDb = async () => {
      try {
        const res = await api.get('/stages/').catch(() => api.get('/stages')).catch(() => null);
        if (res && Array.isArray(res) && res.length > 0) {
          const rawDbStages = res
            .map(s => (s.name || s.stage_name || '').trim())
            .filter(Boolean);
          const uniqueDbStages = Array.from(new Set(rawDbStages));
          if (uniqueDbStages.length > 0) {
            setStageOptions(uniqueDbStages);
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách công đoạn từ DB:', err);
      }
    };
    fetchStagesFromDb();
  }, []);

  // Trích xuất danh sách Nhà máy DUY NHẤT từ danh sách công đoạn (ví dụ: ['NM1', 'NM2', 'NM3'])
  const uniqueFactories = useMemo(() => {
    const extracted = stageOptions.map(stg => {
      const parts = stg.split(' - ');
      return parts.length > 1 ? parts[0].trim() : '';
    }).filter(Boolean);
    const unique = Array.from(new Set(extracted));
    return unique.length > 0 ? unique : ['NM1', 'NM2', 'NM3'];
  }, [stageOptions]);

  // Hàm lọc danh sách công đoạn chỉ thuộc về một Nhà máy cụ thể (ví dụ: 'NM1')
  const getStagesForFactory = (factoryName, allStages = stageOptions) => {
    if (!factoryName) return allStages;
    const facClean = factoryName.trim().toUpperCase();
    const filtered = (allStages || []).filter(stg => {
      const upper = (stg || '').toUpperCase();
      return upper.startsWith(facClean + ' -') || upper.startsWith(facClean + ' ') || upper.startsWith(facClean + '-');
    });
    return filtered.length > 0 ? filtered : allStages;
  };

  // Hàm ánh xạ / chuyển đổi công đoạn tương ứng cho Nhà máy đích
  const mapStageToFactory = (currentStageName, targetFactory, allStages = stageOptions) => {
    const targetStages = getStagesForFactory(targetFactory, allStages);
    if (!currentStageName || !targetStages || targetStages.length === 0) {
      return (targetStages && targetStages[0]) || currentStageName || '';
    }

    // Lấy phần tên lõi (bỏ tiền tố NM)
    let coreName = currentStageName;
    if (currentStageName.includes(' - ')) {
      coreName = currentStageName.split(' - ').slice(1).join(' - ').trim();
    }
    const coreBase = coreName.replace(/\s*\d+$/, '').trim().toLowerCase();

    // Tìm trong targetStages
    const matched = targetStages.find(stg => {
      const stgCore = stg.includes(' - ') ? stg.split(' - ').slice(1).join(' - ').toLowerCase() : stg.toLowerCase();
      return stgCore.includes(coreBase) || coreBase.includes(stgCore.replace(/\s*\d+$/, ''));
    });

    return matched || targetStages[0];
  };

  // Xử lý đổi Nhà máy SX cho một sản phẩm (Tự động chuyển đổi công đoạn các linh kiện BOM ăn theo Nhà máy mới)
  const handleChangeProductFactory = (pCode, newFactory) => {
    setOrderProducts(prev => prev.map(p => {
      if (p.productCode === pCode) {
        return { ...p, factory: newFactory };
      }
      return p;
    }));

    setProductDetails(prev => {
      const currentList = prev.filter(d => d.parentCode === pCode);
      const listToMap = currentList.length > 0
        ? currentList
        : (displayedProductDetails.filter(d => d.parentCode === pCode));

      const updatedDetails = listToMap.map(det => ({
        ...det,
        stageFrom: mapStageToFactory(det.stageFrom, newFactory, stageOptions),
        stageTo: mapStageToFactory(det.stageTo, newFactory, stageOptions)
      }));

      const otherDetails = prev.filter(d => d.parentCode !== pCode);
      return [...otherDetails, ...updatedDetails];
    });

    if (toast) toast('info', `Đã chuyển sản phẩm ${pCode} sang ${newFactory} và cập nhật các công đoạn BOM tương ứng.`);
  };

  // --- STATE VÀ LOGIC CHO TAB QUY TRÌNH - KẾ HOẠCH (ĐỘNG THEO SẢN PHẨM & CÔNG ĐOẠN) ---
  const [activeStage, setActiveStage] = useState('Định hình');
  const mainStages = ['Tạo phôi', 'Định hình', 'Lắp ráp', 'Sơn', 'Đóng gói', 'Lưu kho'];
  const [customScheduleRows, setCustomScheduleRows] = useState([]);

  // Hàm chuyển đổi ngày dd/mm/yyyy <-> yyyy-mm-dd (có xử lý ISO datetime)
  const toISODate = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) {
      return val.split('T')[0].trim();
    }
    if (val.includes('-') && val.length === 10) return val;
    const parts = (val || '').split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return val;
  };
  const toDisplayDate = (val) => {
    if (!val) return '';
    if (val.includes('/')) return val;
    const cleanVal = (typeof val === 'string' && val.includes('T') ? val.split('T')[0] : val) || '';
    const parts = cleanVal.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    return val;
  };

  // Lấy danh sách Đơn bán hàng từ module Purchasing (/admin/purchase-requisitions)
  useEffect(() => {
    const fetchPOList = async () => {
      try {
        const res = await purchasingService.getRequisitions({ limit: 100, order_type: 'Đơn bán hàng' }).catch(() => null);
        if (res && res.items) {
          const salesOrders = res.items.filter(item => {
            const typeStr = (item.order_type || item.type || '').toLowerCase();
            return !typeStr || typeStr.includes('bán');
          });
          setPurchaseRequisitions(salesOrders);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách Đơn bán hàng:', err);
      }
    };
    fetchPOList();
  }, []);

  // Xử lý đóng dropdown PO khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (poDropdownRef.current && !poDropdownRef.current.contains(event.target)) {
        setIsPoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gọi API lấy danh sách LỆNH SẢN XUẤT cho bảng chính
  const fetchProductionOrders = async () => {
    try {
      setLoading(true);
      
      const res = await planService.getPlans(1, 20, searchTerm, 'all', sortValue === 'time_asc' ? 'asc' : 'desc').catch(() => null);
      let allOrders = [];

      if (res && res.items && res.items.length > 0) {
        res.items.forEach((plan, pIdx) => {
          if (plan.orders && plan.orders.length > 0) {
            plan.orders.forEach((ord, oIdx) => {
              const totalQty = ord.products ? ord.products.reduce((acc, p) => acc + (p.quantity || 0), 0) : 50;
              const orderCode = ord.name || ord.order_code || `DH-2026-${100 + oIdx}`;
              const cleanCode = orderCode.replace(/^LSX-?/i, '');
              const priorityText = ord.is_priority === 1 || ord.priority === 'Cao' ? 'Cao' : (ord.priority || 'Bình thường');

              const rawStatus = ord.status ?? ord.order_status;
              let statusText;
              if (rawStatus == null) {
                statusText = 'Đang sản xuất';
              } else if (['Đang sản xuất', 'Hoàn thành', 'Chờ sản xuất'].includes(rawStatus)) {
                statusText = rawStatus;
              } else if (['0', '1', '3'].includes(String(rawStatus))) {
                statusText = { '0': 'Chờ sản xuất', '1': 'Đang sản xuất', '3': 'Hoàn thành' }[String(rawStatus)];
              } else {
                statusText = String(rawStatus);
              }
              const rawStart = ord.start_date || ord.order_date || plan.estimated_date || plan.start_date || '';
              const rawEnd = ord.end_date || ord.delivery_date || ord.estimated_date || plan.finished_date || plan.end_date || '';

              allOrders.push({
                id: ord.id || `${plan.id}-${oIdx}`,
                planId: plan.id,
                code: cleanCode,
                orderNo: orderCode,
                customer: ord.customer || plan.customer || 'Khách hàng hệ thống',
                totalProducts: ord.products ? ord.products.length : 1,
                planQty: totalQty,
                startDate: toISODate(rawStart) || '2026-08-01',
                endDate: toISODate(rawEnd) || '2026-08-15',
                priority: priorityText,
                status: statusText,
                note: ord.customer || '',
                products: ord.products || []
              });
            });
          }
        });
      }



      let filtered = allOrders;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(item =>
          item.code.toLowerCase().includes(term) ||
          item.orderNo.toLowerCase().includes(term) ||
          item.customer.toLowerCase().includes(term) ||
          item.status.toLowerCase().includes(term)
        );
      }

      setOrdersList(filtered);
      setTotal(filtered.length);
    } catch (err) {
      console.warn('Lỗi tải danh sách Lệnh sản xuất:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionOrders();
  }, [page, pageSize, searchTerm, sortValue]);

  // Bộ sinh linh kiện BOM đầy đủ 7 - 8 dòng linh kiện thành phần chuẩn ERP động theo Sản phẩm
  const generateBomForProduct = (pCode, pName = '', qtyVal = 50) => {
    const codeUpper = (pCode || '').toUpperCase();
    const nameUpper = (pName || '').toUpperCase();
    const displayName = pName || pCode || 'Sản phẩm';

    // 1. Bàn (Table / Desk) -> 7 dòng linh kiện Bàn
    if (codeUpper.includes('TABLE') || nameUpper.includes('TABLE') || nameUpper.includes('BÀN') || nameUpper.includes('DESK')) {
      return [
        { id: `${pCode}-1`, parentCode: pCode, type: 'Mặt bàn', stageFrom: 'Định hình', stageTo: 'Sơn PU', compCode: `${pCode}-MAT`, compName: `Mặt bàn gỗ sồi ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Gỗ Sồi (Oak)', spec: '25*900*1500', volume: 3.2, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-2`, parentCode: pCode, type: 'Chân bàn', stageFrom: 'Tiện gỗ', stageTo: 'Lắp ráp', compCode: `${pCode}-CHAN`, compName: `Chân bàn vót nhọn ${displayName}`, quantity: `0/${qtyVal * 4}`, unit: 'Cái', material: 'Gỗ Sồi (Oak)', spec: '60*60*720', volume: 2.1, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-3`, parentCode: pCode, type: 'Diềm bàn', stageFrom: 'Cắt mộng', stageTo: 'Lắp ráp', compCode: `${pCode}-DIEM`, compName: `Diềm khung bàn ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Sồi (Oak)', spec: '25*70*1400', volume: 1.1, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-4`, parentCode: pCode, type: 'Giằng ngang', stageFrom: 'Cắt mộng', stageTo: 'Lắp ráp', compCode: `${pCode}-GIANG`, compName: `Thanh giằng chịu lực ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Sồi (Oak)', spec: '25*70*800', volume: 0.8, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-5`, parentCode: pCode, type: 'Ke liên kết', stageFrom: 'Lắp phụ kiện', stageTo: 'Đóng gói', compCode: `${pCode}-KE`, compName: `Bộ ke kim loại liên kết chân`, quantity: `0/${qtyVal * 4}`, unit: 'Bộ', material: 'Thép 3mm', spec: '50*50*50', volume: 0.2, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-6`, parentCode: pCode, type: 'Nẹp viền', stageFrom: 'Dán nẹp', stageTo: 'Hoàn thiện', compCode: `${pCode}-NEP`, compName: `Nẹp viền mặt bàn gỗ tự nhiên`, quantity: `0/${qtyVal}`, unit: 'Bộ', material: 'Gỗ Sồi (Oak)', spec: '10*25*4800', volume: 0.4, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-7`, parentCode: pCode, type: 'Đế đinh chân', stageFrom: 'Lắp đóng gói', stageTo: 'Đóng gói', compCode: `${pCode}-DE`, compName: `Đế cao su tăng chỉnh chân bàn`, quantity: `0/${qtyVal * 4}`, unit: 'Cái', material: 'Cao su + Thép', spec: 'M8*30', volume: 0.1, note: '', status: 'Chờ sản xuất' }
      ];
    }

    // 2. Ghế (Chair / Stool / Bench) -> 7 dòng linh kiện Ghế
    if (codeUpper.includes('CHAIR') || nameUpper.includes('CHAIR') || nameUpper.includes('GHẾ') || nameUpper.includes('STOOL') || nameUpper.includes('BENCH')) {
      return [
        { id: `${pCode}-1`, parentCode: pCode, type: 'Nan tựa', stageFrom: 'Uốn cong', stageTo: 'Lắp ráp', compCode: `${pCode}-TUA-01`, compName: `Nan tựa lưng uốn cong ${displayName}`, quantity: `0/${qtyVal * 3}`, unit: 'Nan', material: 'Gỗ Tần Bì (Ash)', spec: '12*40*450', volume: 0.5, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-2`, parentCode: pCode, type: 'Khung tựa', stageFrom: 'Định hình', stageTo: 'Lắp ráp', compCode: `${pCode}-TUA-02`, compName: `Khung viền tựa lưng ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Bộ', material: 'Gỗ Tần Bì (Ash)', spec: '25*45*500', volume: 0.8, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-3`, parentCode: pCode, type: 'Mặt nệm', stageFrom: 'Định hình', stageTo: 'Bọc đệm', compCode: `${pCode}-MAT-01`, compName: `Mặt đệm mút bọc da PU ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Cái', material: 'Mút K43 + Da PU', spec: '50*420*420', volume: 1.2, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-4`, parentCode: pCode, type: 'Chân trước', stageFrom: 'Định hình', stageTo: 'Chà nhám', compCode: `${pCode}-CHF-01`, compName: `Chân ghế trước vót nhọn ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Cái', material: 'Gỗ Tần Bì (Ash)', spec: '40*40*450', volume: 0.8, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-5`, parentCode: pCode, type: 'Chân sau', stageFrom: 'Định hình', stageTo: 'Chà nhám', compCode: `${pCode}-CHS-01`, compName: `Chân ghế sau uốn cong ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Cái', material: 'Gỗ Tần Bì (Ash)', spec: '40*50*850', volume: 1.4, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-6`, parentCode: pCode, type: 'Giằng dọc', stageFrom: 'Cắt mộng', stageTo: 'Lắp khung', compCode: `${pCode}-GIANG-01`, compName: `Thanh giằng dọc chịu lực ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Tần Bì (Ash)', spec: '25*30*400', volume: 0.4, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-7`, parentCode: pCode, type: 'Giằng ngang', stageFrom: 'Cắt mộng', stageTo: 'Lắp khung', compCode: `${pCode}-GIANG-02`, compName: `Thanh giằng ngang liên kết ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Tần Bì (Ash)', spec: '25*30*380', volume: 0.4, note: '', status: 'Chờ sản xuất' }
      ];
    }

    // 3. Giường / Đầu giường (Headboard / Bed) -> 7 dòng linh kiện
    if (codeUpper.includes('HEADBOARD') || nameUpper.includes('HEADBOARD') || nameUpper.includes('BED') || nameUpper.includes('GIƯỜNG')) {
      return [
        { id: `${pCode}-1`, parentCode: pCode, type: 'Khung chính', stageFrom: 'Cắt hộp', stageTo: 'Bọc nỉ', compCode: `${pCode}-KHUNG-01`, compName: `Khung ván chịu lực đầu giường ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Bộ', material: 'Gỗ Thông + MDF', spec: '35*1200*1800', volume: 12.0, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-2`, parentCode: pCode, type: 'Mút đệm', stageFrom: 'Cắt mút', stageTo: 'May bọc', compCode: `${pCode}-MUT-01`, compName: `Mút đệm múi đầu giường ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Memory Foam', spec: '40*1150*1750', volume: 3.5, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-3`, parentCode: pCode, type: 'Áo nỉ bọc', stageFrom: 'May công nghiệp', stageTo: 'Bắn đinh', compCode: `${pCode}-VAI-01`, compName: `Vải nỉ cao cấp may múi ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Áo', material: 'Vải Nỉ Nhung', spec: '1400*2200', volume: 1.5, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-4`, parentCode: pCode, type: 'Chân giường', stageFrom: 'Tiện gỗ', stageTo: 'Sơn PU', compCode: `${pCode}-CHAN-01`, compName: `Chân đầu giường gỗ tự nhiên ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Cái', material: 'Gỗ Sồi (Oak)', spec: '60*60*250', volume: 0.9, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-5`, parentCode: pCode, type: 'Vách tựa', stageFrom: 'Cắt ván', stageTo: 'Lắp ráp', compCode: `${pCode}-VACH-01`, compName: `Tấm ván tựa lưng hậu ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Plywood 9mm', spec: '9*1100*1700', volume: 2.2, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-6`, parentCode: pCode, type: 'Nẹp inox', stageFrom: 'Cắt kim loại', stageTo: 'Đính nẹp', compCode: `${pCode}-NEP-01`, compName: `Nẹp inox mạ vàng trang trí ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Inox 304', spec: '2*20*1800', volume: 0.2, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-7`, parentCode: pCode, type: 'Đế đinh nhựa', stageFrom: 'Lắp đóng gói', stageTo: 'Đóng gói', compCode: `${pCode}-DE-01`, compName: `Đế đinh nhựa chống trầy sàn ${displayName}`, quantity: `0/${qtyVal * 4}`, unit: 'Cái', material: 'Nhựa ABS', spec: '20*20*10', volume: 0.05, note: '', status: 'Chờ sản xuất' }
      ];
    }

    // 4. Hộc kéo / Ngăn kéo (Drawer / Drawer Side / FOL...) -> 7 dòng linh kiện
    if (codeUpper.includes('DRAWER') || nameUpper.includes('DRAWER') || codeUpper.includes('FOL') || codeUpper.includes('SIDE')) {
      return [
        { id: `${pCode}-1`, parentCode: pCode, type: 'Thành hộc trái', stageFrom: 'Xẻ gỗ', stageTo: 'Khoan lỗ', compCode: `${pCode}-LEFT-01`, compName: `Thành ngăn kéo bên trái 12mm ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Cái', material: 'Gỗ Thông ép', spec: '12*70*600', volume: 0.4, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-2`, parentCode: pCode, type: 'Thành hộc phải', stageFrom: 'Xẻ gỗ', stageTo: 'Khoan lỗ', compCode: `${pCode}-RIGHT-01`, compName: `Thành ngăn kéo bên phải 12mm ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Cái', material: 'Gỗ Thông ép', spec: '12*70*600', volume: 0.4, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-3`, parentCode: pCode, type: 'Mặt hộc trước', stageFrom: 'Sơn PU', stageTo: 'Lắp ráp', compCode: `${pCode}-FAC-01`, compName: `Tấm mặt hộc kéo soi chỉ ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'MDF Kháng ẩm 18mm', spec: '18*180*580', volume: 0.8, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-4`, parentCode: pCode, type: 'Thành sau hộc', stageFrom: 'Cắt gỗ', stageTo: 'Khoan chốt', compCode: `${pCode}-BACK-01`, compName: `Thành sau ngăn kéo 12mm ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Cái', material: 'Gỗ Thông ép', spec: '12*70*550', volume: 0.3, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-5`, parentCode: pCode, type: 'Đáy hộc kéo', stageFrom: 'Cắt ván', stageTo: 'Chạy rãnh', compCode: `${pCode}-BOT-01`, compName: `Tấm đáy hộc kéo ván ép ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Plywood 4mm', spec: '4*580*580', volume: 0.6, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-6`, parentCode: pCode, type: 'Nẹp chỉ viền', stageFrom: 'Dán chỉ', stageTo: 'Hoàn thiện', compCode: `${pCode}-NEP-01`, compName: `Nẹp chỉ Veneer sồi ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Mét', material: 'Veneer Sồi', spec: '1*15*2400', volume: 0.1, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-7`, parentCode: pCode, type: 'Ray trượt', stageFrom: 'Lắp phụ kiện', stageTo: 'Đóng gói', compCode: `${pCode}-RAY-01`, compName: `Bộ ray trượt âm giảm chấn DTC ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Bộ', material: 'Thép mạ kẽm', spec: '45*450', volume: 0.5, note: '', status: 'Chờ sản xuất' }
      ];
    }

    // 5. Các dòng Tủ / Đồ gỗ nội thất (Nightstand / Vanity / Cabinet / APT...) -> 8 dòng linh kiện đầy đủ
    return [
      { id: `${pCode}-1`, parentCode: pCode, type: 'Mặt tủ', stageFrom: 'Định hình', stageTo: 'Sơn PU', compCode: `${pCode}-MAT-01`, compName: `Mặt gỗ sồi tự nhiên ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Gỗ Sồi (Oak)', spec: '18*450*1200', volume: 2.5, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-2`, parentCode: pCode, type: 'Cánh tủ', stageFrom: 'Cắt CNC', stageTo: 'Lắp ráp', compCode: `${pCode}-CANH-01`, compName: `Cánh tủ ván soi chỉ nghệ thuật ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Cái', material: 'MDF Chống ẩm', spec: '15*380*650', volume: 1.8, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-3`, parentCode: pCode, type: 'Chân tủ', stageFrom: 'Tiện gỗ', stageTo: 'Lắp ráp', compCode: `${pCode}-CHAN-01`, compName: `Cụm chân gỗ tròn vót nhọn ${displayName}`, quantity: `0/${qtyVal * 4}`, unit: 'Cái', material: 'Gỗ Cao su', spec: '50*50*150', volume: 0.6, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-4`, parentCode: pCode, type: 'Vách hông trái', stageFrom: 'Định hình', stageTo: 'Khoan cam', compCode: `${pCode}-HONG-01`, compName: `Tấm vách hông bên trái ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'MDF Kháng ẩm 17mm', spec: '17*400*750', volume: 1.05, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-5`, parentCode: pCode, type: 'Vách hông phải', stageFrom: 'Định hình', stageTo: 'Khoan cam', compCode: `${pCode}-HONG-02`, compName: `Tấm vách hông bên phải ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'MDF Kháng ẩm 17mm', spec: '17*400*750', volume: 1.05, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-6`, parentCode: pCode, type: 'Tấm đáy tủ', stageFrom: 'Cắt ván', stageTo: 'Khoan lỗ', compCode: `${pCode}-DAY-01`, compName: `Tấm ván đáy tủ liên kết ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'MDF Kháng ẩm 17mm', spec: '17*450*1160', volume: 1.6, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-7`, parentCode: pCode, type: 'Khung đố nóc', stageFrom: 'Chạy chỉ', stageTo: 'Lắp ráp', compCode: `${pCode}-DO-01`, compName: `Thanh đố ngang nóc chịu lực ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Sồi (Oak)', spec: '25*50*1160', volume: 0.7, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-8`, parentCode: pCode, type: 'Tấm hậu tủ', stageFrom: 'Cắt ván', stageTo: 'Đóng hậu', compCode: `${pCode}-HAU-01`, compName: `Tấm hậu tủ phủ Melamine ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Plywood 5mm', spec: '5*700*1160', volume: 0.9, note: '', status: 'Chờ sản xuất' }
    ];
  };

  // Xử lý nạp DỮ LIỆU ĐỘNG từ Đơn mua hàng (/admin/purchase-requisitions)
  const handleSelectPurchaseRequisition = async (reqObj) => {
    if (!reqObj) return;

    setLoadingDetail(true);
    try {
      const fullReq = await purchasingService.getRequisitionById(reqObj.id).catch(() => reqObj);
      const itemsList = (fullReq && fullReq.items) ? fullReq.items : [];

      const poCodeVal = reqObj.po_code || fullReq.po_code || '';
      const orderDateVal = (reqObj.order_date || fullReq.order_date) 
        ? (reqObj.order_date || fullReq.order_date).split('T')[0]
        : '';
      const deliveryDateVal = (reqObj.delivery_date || fullReq.delivery_date) 
        ? (reqObj.delivery_date || fullReq.delivery_date).split('T')[0]
        : '';

      setOrderForm(prev => ({
        ...prev,
        code: prev.code || poCodeVal,
        orderId: poCodeVal,
        priority: reqObj.priority || fullReq.priority || 'Bình thường',
        startDate: orderDateVal,
        endDate: deliveryDateVal,
        status: reqObj.status || fullReq.status || 'Đang sản xuất'
      }));

      // Bảng 1: Mặt hàng trong Đơn mua hàng
      const defaultFac = uniqueFactories[0] || 'NM1';
      const mappedProducts = itemsList.map((it, idx) => {
        const qty = Number(it.quantity) || 0;
        const spare = Math.ceil(qty * 0.05);
        const code = it.item_code || `SKU-${idx + 1}`;
        return {
          id: it.id || idx + 1,
          productCode: code,
          productName: it.item_name || 'Mặt hàng mua',
          lineType: it.type || it.content || reqObj.supplier_name || 'Nội thất',
          factory: defaultFac,
          orderQty: qty,
          spareQty: spare,
          totalQty: qty + spare,
          unit: it.unit || 'Bộ',
          startDate: toISODate(orderDateVal) || '2026-08-01',
          endDate: toISODate(deliveryDateVal) || '2026-08-15',
          deliveryDate: toISODate(it.requested_delivery_date ? it.requested_delivery_date.split('T')[0] : deliveryDateVal) || '2026-08-15',
          drawingCode: `BV-${code}`
        };
      });

      // Bảng 2: Nạp linh kiện BOM gắn trực tiếp với parentCode = productCode và khớp theo Nhà máy
      const mappedBomParts = itemsList.flatMap((it, idx) => {
        const qty = Number(it.quantity) || 0;
        const code = it.item_code || `SKU-${idx + 1}`;
        const baseBom = generateBomForProduct(code, it.item_name, qty);
        return baseBom.map(b => ({
          ...b,
          stageFrom: mapStageToFactory(b.stageFrom, defaultFac, stageOptions),
          stageTo: mapStageToFactory(b.stageTo, defaultFac, stageOptions)
        }));
      });

      setOrderProducts(mappedProducts);
      setProductDetails(mappedBomParts);

      // Mặc định chọn Sản phẩm ĐẦU TIÊN để lọc Bảng 2
      if (mappedProducts.length > 0) {
        setSelectedProductCode(mappedProducts[0].productCode);
      }

      if (toast) toast('success', `Đã nạp ${mappedProducts.length} mặt hàng từ Đơn mua hàng ${poCodeVal}`);
    } catch (err) {
      console.warn('Lỗi nạp dữ liệu từ Purchase Requisition:', err);
    } finally {
      setLoadingDetail(false);
      setIsPoDropdownOpen(false);
    }
  };

  // Xử lý nạp DỮ LIỆU ĐỘNG khi xem/sửa Lệnh sản xuất sẵn có (CHẾ ĐỘ EDIT)
  const handleOpenOrderDetail = async (item) => {
    setIsEditMode(true); // Đánh dấu là chế độ chỉnh sửa Lệnh có sẵn
    setEditingOrderId(item.id || item.code);

    setOrderForm({
      code: item.code,
      orderId: item.orderNo,
      priority: item.priority,
      startDate: toISODate(item.startDate) || '2026-08-01',
      endDate: toISODate(item.endDate) || '2026-08-15',
      status: item.status
    });

    setViewMode('create');
    setLoadingDetail(true);

    try {
      let formattedProducts = [];
      let formattedBomParts = [];

      // Helper trích xuất nhà máy của sản phẩm một cách chính xác
      const extractFactory = (p) => {
        if (p.factory) return p.factory;
        if (p.factory_code) return p.factory_code;
        if (p.bom_details && p.bom_details.length > 0) {
          for (const b of p.bom_details) {
            const stageStr = b.input_stage || b.output_stage || b.stageFrom || b.stageTo || '';
            if (stageStr.includes(' - ')) {
              const prefix = stageStr.split(' - ')[0].trim();
              if (prefix.startsWith('NM')) {
                return prefix;
              }
            }
          }
        }
        return uniqueFactories[0] || 'NM1';
      };

      if (item.products && item.products.length > 0) {
        formattedProducts = item.products.map((p, idx) => {
          const qty = Number(p.quantity || p.order_qty) || 0;
          const spare = p.spare_qty !== undefined ? Number(p.spare_qty) : Math.ceil(qty * 0.05);
          const total = p.total_qty !== undefined ? Number(p.total_qty) : (qty + spare);
          const code = p.sku || p.productCode || `SP-${idx + 1}`;
          const prodFactory = extractFactory(p);
          return {
            id: p.id || idx + 1,
            productCode: code,
            productName: p.name || p.productName || 'Sản phẩm sản xuất',
            lineType: p.category || p.lineType || p.group_name || 'Nội thất',
            factory: prodFactory,
            orderQty: qty,
            spareQty: spare,
            totalQty: total,
            unit: p.unit || 'Cái',
            startDate: toISODate(p.startDate || item.startDate) || '2026-08-01',
            endDate: toISODate(p.endDate || item.endDate) || '2026-08-15',
            deliveryDate: toISODate(p.deliveryDate || item.endDate) || '2026-08-15',
            drawingCode: p.drawingCode || p.drawing_code || `BV-${code}`
          };
        });

        item.products.forEach((p, idx) => {
          const pCode = p.sku || p.productCode || `SP-${idx + 1}`;
          const prodFactory = extractFactory(p);
          if (p.bom_details && p.bom_details.length > 0) {
            p.bom_details.forEach((b, bIdx) => {
              const delivered = Number(b.delivered || b.delivered_qty || 0);
              const planned = Number(b.planned || b.quantity || p.quantity || 0);
              const rawFrom = b.input_stage || b.stageFrom || 'Định hình';
              const rawTo = b.output_stage || b.stageTo || 'Lắp ráp';
              const finalFrom = (rawFrom.startsWith(prodFactory + ' - ') || rawFrom.startsWith(prodFactory + ' '))
                ? rawFrom
                : mapStageToFactory(rawFrom, prodFactory, stageOptions);
              const finalTo = (rawTo.startsWith(prodFactory + ' - ') || rawTo.startsWith(prodFactory + ' '))
                ? rawTo
                : mapStageToFactory(rawTo, prodFactory, stageOptions);

              formattedBomParts.push({
                id: b.id || `${p.id}-${bIdx}`,
                parentCode: pCode,
                type: b.type || b.component_type || 'Linh kiện',
                stageFrom: finalFrom,
                stageTo: finalTo,
                compCode: b.sku || b.compCode || `COMP-${bIdx + 1}`,
                compName: b.name || b.compName || 'Cụm chi tiết',
                quantity: `${delivered}/${planned}`,
                unit: b.unit || 'Cái',
                material: b.material || 'Gỗ / MDF',
                spec: b.specification || b.spec || 'Tiêu chuẩn SX',
                volume: b.volume || 1,
                note: b.description || b.note || '',
                status: b.status || (delivered >= planned && planned > 0 ? 'Hoàn thành' : 'Chờ sản xuất')
              });
            });
          } else {
            // Sinh linh kiện BOM đầy đủ 7-8 dòng cho từng sản phẩm và gắn theo factory
            const generated = generateBomForProduct(pCode, p.name, p.quantity || 50);
            formattedBomParts.push(...generated.map(b => ({
              ...b,
              stageFrom: mapStageToFactory(b.stageFrom, prodFactory, stageOptions),
              stageTo: mapStageToFactory(b.stageTo, prodFactory, stageOptions)
            })));
          }
        });
      }

      setOrderProducts(formattedProducts);
      setProductDetails(formattedBomParts);

      if (formattedProducts.length > 0) {
        setSelectedProductCode(formattedProducts[0].productCode);
      }
    } catch (err) {
      console.warn('Lỗi tải chi tiết Lệnh sản xuất:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Khởi tạo TRỐNG 100% & CHO PHÉP SỬA TẤT CẢ TỪ ĐẦU khi nhấp + Thêm tài liệu (CHẾ ĐỘ TẠO MỚI)
  const handleOpenCreateOrder = () => {
    setIsEditMode(false); // Đánh dấu là chế độ Tạo mới Lệnh sản xuất
    setEditingOrderId(null);
    setOrderForm({
      code: '',
      orderId: '',
      priority: 'Bình thường',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'Đang sản xuất'
    });
    setOrderProducts([]);
    setProductDetails([]);
    setSelectedProductCode(null);
    setViewMode('create');
  };

  // Xử lý lưu thông tin Lệnh SX mới hoặc Cập nhật Lệnh SX sẵn có
  const handleSaveOrder = async () => {
    if (!orderForm.code && !orderForm.orderId) {
      if (toast) toast('warning', 'Vui lòng nhập Mã lệnh sản xuất hoặc Mã đơn hàng!');
      return;
    }

    const statusToOrderStatus = {
      'Đang sản xuất': 1,
      'Hoàn thành': 3,
      'Chờ sản xuất': 0
    };

    const productsDetails = orderProducts.map(p => {
      const targetFac = p.factory || uniqueFactories[0] || 'NM1';
      let childrenDetails = productDetails.filter(d => d.parentCode === p.productCode);
      if (childrenDetails.length === 0) {
        const generated = generateBomForProduct(p.productCode, p.productName, p.orderQty || 50);
        childrenDetails = generated.map(b => ({
          ...b,
          stageFrom: mapStageToFactory(b.stageFrom, targetFac, stageOptions),
          stageTo: mapStageToFactory(b.stageTo, targetFac, stageOptions)
        }));
      }

      const children = childrenDetails.map(d => {
        const parts = (d.quantity || '').toString().split('/');
        const planned = parseInt(parts[parts.length - 1] || '0', 10) || Number(p.orderQty) || 1;
        return {
          name: d.compName || d.type || 'Chi tiết',
          sku: d.compCode || `${p.productCode}-${d.id}`,
          quantity: planned,
          unit: d.unit || 'Cái',
          specification: [d.spec, d.material].filter(Boolean).join(' - '),
          input_stage: d.stageFrom || 'Định hình',
          output_stage: d.stageTo || 'Lắp ráp',
          description: d.note || '',
          children: []
        };
      });
      return {
        name: p.productName || p.productCode,
        sku: p.productCode,
        factory: targetFac,
        quantity: Number(p.totalQty) || Number(p.orderQty) || 1,
        bom_details: children
      };
    });

    try {
      setLoading(true);

      if (isEditMode && editingOrderId) {
        const existing = ordersList.find(o => o.id === editingOrderId);
        const startDateStr = toISODate(orderForm.startDate) || new Date().toISOString().split('T')[0];
        const endDateStr = toISODate(orderForm.endDate) || startDateStr;

        const updatePayload = {
          plan_id: existing?.planId || null,
          order_status: statusToOrderStatus[orderForm.status] ?? 1,
          is_priority: orderForm.priority === 'Cao' ? 1 : 0,
          estimated_date: endDateStr,
          note: orderForm.status,
          products_details: productsDetails
        };

        const updated = await api.put(`/orders/${Number(editingOrderId) || editingOrderId}`, updatePayload).catch(() => null);
        if (!updated) {
          setLoading(false);
          if (toast) toast('error', 'Không thể cập nhật Lệnh sản xuất!');
          return;
        }
        if (toast) toast('success', 'Đã cập nhật thông tin Lệnh sản xuất thành công!');
        await fetchProductionOrders();
        setViewMode('list');
        return;
      }

      const statusToPlanStatus = {
        'Đang sản xuất': 1,
        'Hoàn thành': 2,
        'Chờ sản xuất': 0
      };

      const startDateStr = toISODate(orderForm.startDate) || new Date().toISOString().split('T')[0];
      const endDateStr = toISODate(orderForm.endDate) || startDateStr;
      const planStartDate = new Date(startDateStr);

      const planPayload = {
        code: `KHSX-${orderForm.code || orderForm.orderId}`,
        name: `Lệnh sản xuất ${orderForm.code || orderForm.orderId}`,
        month: planStartDate.getMonth() + 1,
        year: planStartDate.getFullYear(),
        estimated_date: startDateStr,
        finished_date: endDateStr,
        status: statusToPlanStatus[orderForm.status] ?? 1
      };

      const planRes = await planService.createPlan(planPayload).catch(() => null);
      const planId = planRes && (planRes.id || planRes.plan_id);
      if (!planId) {
        setLoading(false);
        if (toast) toast('error', 'Không thể tạo kế hoạch sản xuất!');
        return;
      }

      const orderPayload = {
        order_code: orderForm.code || orderForm.orderId,
        customer: 'Khách hàng',
        plan_id: planId,
        order_status: statusToOrderStatus[orderForm.status] ?? 1,
        is_priority: orderForm.priority === 'Cao' ? 1 : 0,
        estimated_date: endDateStr,
        note: orderForm.status,
        products_details: productsDetails
      };

      const savedOrder = await api.post('/orders/', orderPayload).catch(() => null);
      if (!savedOrder) {
        setLoading(false);
        if (toast) toast('error', 'Không thể lưu Lệnh sản xuất!');
        return;
      }

      if (toast) toast('success', 'Đã lưu Lệnh sản xuất mới thành công!');
      await fetchProductionOrders();
      setViewMode('list');
    } catch (err) {
      console.warn('Lỗi lưu Lệnh sản xuất:', err);
      if (toast) toast('error', 'Lưu Lệnh sản xuất thất bại!');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let res = ordersList;
    if (filterStatus) res = res.filter(o => o.status === filterStatus);
    if (filterPriority) res = res.filter(o => o.priority === filterPriority);
    if (filterDateFrom) res = res.filter(o => o.startDate >= filterDateFrom);
    if (filterDateTo) res = res.filter(o => o.endDate <= filterDateTo);
    return res;
  }, [ordersList, filterStatus, filterPriority, filterDateFrom, filterDateTo]);

  const sortedOrders = useMemo(() => {
    const res = [...filteredOrders];
    if (sortValue === 'code_asc') res.sort((a, b) => a.code.localeCompare(b.code));
    if (sortValue === 'code_desc') res.sort((a, b) => b.code.localeCompare(a.code));
    return res;
  }, [filteredOrders, sortValue]);

  const totalCount = sortedOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(page * pageSize, totalCount);
  const currentItems = sortedOrders.slice((page - 1) * pageSize, page * pageSize);

  const filteredPOList = useMemo(() => {
    // CHỈ LỌC VÀ LẤY ĐƠN BÁN HÀNG (Loại bỏ các Đơn mua hàng)
    const salesOnly = purchaseRequisitions.filter(po => {
      const typeStr = (po.order_type || po.type || '').toLowerCase();
      if (typeStr.includes('mua')) return false;
      return true;
    });

    if (!poSearch.trim()) return salesOnly.slice(0, 15);
    const term = poSearch.toLowerCase();
    return salesOnly.filter(po =>
      (po.po_code && po.po_code.toLowerCase().includes(term)) ||
      (po.supplier_name && po.supplier_name.toLowerCase().includes(term)) ||
      (po.customer && po.customer.toLowerCase().includes(term)) ||
      (po.order_code && po.order_code.toLowerCase().includes(term))
    ).slice(0, 15);
  }, [purchaseRequisitions, poSearch]);

  // Thông tin Sản phẩm & Nhà máy đang được chọn ở Bảng 1
  const currentProduct = useMemo(() => {
    return orderProducts.find(p => p.productCode === selectedProductCode) || orderProducts[0] || null;
  }, [orderProducts, selectedProductCode]);

  const currentFactory = useMemo(() => {
    return currentProduct?.factory || uniqueFactories[0] || 'NM1';
  }, [currentProduct, uniqueFactories]);

  const currentFactoryStages = useMemo(() => {
    return getStagesForFactory(currentFactory, stageOptions);
  }, [currentFactory, stageOptions]);

  // Lọc Bảng 2 ("Chi tiết sản phẩm") theo Sản phẩm đang được chọn ở Bảng 1
  const displayedProductDetails = useMemo(() => {
    if (!selectedProductCode) return productDetails;
    const filtered = productDetails.filter(det => det.parentCode === selectedProductCode);
    if (filtered.length > 0) return filtered;
    
    // Nếu chưa có chi tiết cho sản phẩm được chọn, sinh bộ 7-8 dòng chi tiết BOM đầy đủ và map theo Nhà máy
    const targetProd = orderProducts.find(p => p.productCode === selectedProductCode);
    const qtyVal = targetProd ? targetProd.orderQty : 50;
    const targetFac = targetProd?.factory || currentFactory;
    const baseBom = generateBomForProduct(selectedProductCode, targetProd?.productName, qtyVal);
    return baseBom.map(b => ({
      ...b,
      stageFrom: mapStageToFactory(b.stageFrom, targetFac, stageOptions),
      stageTo: mapStageToFactory(b.stageTo, targetFac, stageOptions)
    }));
  }, [productDetails, selectedProductCode, orderProducts, currentFactory, stageOptions]);

  // Xử lý cập nhật Công đoạn giao / nhận khi người dùng chỉnh sửa trong Bảng Chi tiết sản phẩm
  const handleUpdateDetStage = (detId, field, newValue) => {
    setProductDetails(prev => {
      const exists = prev.some(d => d.id === detId);
      if (exists) {
        return prev.map(d => (d.id === detId ? { ...d, [field]: newValue } : d));
      } else {
        const updatedList = displayedProductDetails.map(d => (d.id === detId ? { ...d, [field]: newValue } : d));
        return [...prev.filter(p => p.parentCode !== selectedProductCode), ...updatedList];
      }
    });
  };

  // --- LOGIC TAB QUY TRÌNH - KẾ HOẠCH (ĐỘNG THEO SẢN PHẨM & CÔNG ĐOẠN) ---
  // 1. Tự sinh Công đoạn con / Tổ máy (Oval xanh dương) ĐỘNG theo loại sản phẩm và công đoạn được chọn
  const dynamicSubStages = useMemo(() => {
    const pCode = selectedProductCode || (orderProducts[0] ? orderProducts[0].productCode : null);
    const prodObj = orderProducts.find(p => p.productCode === pCode);
    const pName = prodObj ? prodObj.productName : '';
    const codeUpper = (pCode || '').toUpperCase();
    const nameUpper = (pName || '').toUpperCase();

    const isTable = codeUpper.includes('TABLE') || nameUpper.includes('TABLE') || nameUpper.includes('BÀN') || nameUpper.includes('DESK');
    const isChair = codeUpper.includes('CHAIR') || nameUpper.includes('CHAIR') || nameUpper.includes('GHẾ') || nameUpper.includes('STOOL');
    const isBed = codeUpper.includes('BED') || nameUpper.includes('HEADBOARD') || nameUpper.includes('GIƯỜNG');

    if (activeStage === 'Tạo phôi') {
      return [{ id: 1, name: 'Xẻ phôi gỗ' }, { id: 2, name: 'Bào 4 mặt' }];
    } else if (activeStage === 'Định hình') {
      if (isTable) return [{ id: 1, name: 'Cắt mặt bàn CNC' }, { id: 2, name: 'Tiện chân bàn' }, { id: 3, name: 'Chạy diềm' }];
      if (isChair) return [{ id: 1, name: 'Uốn nan tựa' }, { id: 2, name: 'Vót nhọn chân ghế' }, { id: 3, name: 'Đánh mộng' }];
      if (isBed) return [{ id: 1, name: 'Cắt ván khung' }, { id: 2, name: 'Định hình vách' }, { id: 3, name: 'Cắt mút đệm' }];
      return [{ id: 1, name: 'Cắt ván CNC' }, { id: 2, name: 'Dán viền nẹp' }, { id: 3, name: 'Khoan chốt cam' }];
    } else if (activeStage === 'Lắp ráp') {
      if (isTable) return [{ id: 1, name: 'Lắp khung diềm bàn' }, { id: 2, name: 'Bắt ke liên kết chân' }];
      if (isChair) return [{ id: 1, name: 'Lắp khung ghế' }, { id: 2, name: 'Bọc nệm da' }];
      return [{ id: 1, name: 'Khoan chốt cam' }, { id: 2, name: 'Lắp cụm khung' }];
    } else if (activeStage === 'Sơn') {
      return [{ id: 1, name: 'Sơn lót PU 1' }, { id: 2, name: 'Chà nhám xả bả' }, { id: 3, name: 'Sơn bóng PU' }];
    } else if (activeStage === 'Đóng gói') {
      return [{ id: 1, name: 'Bọc màng PE chống trầy' }, { id: 2, name: 'Dán tem QR Barcode' }, { id: 3, name: 'Đóng thùng Carton' }];
    } else if (activeStage === 'Lưu kho') {
      return [{ id: 1, name: 'Kiểm tra QC thành phẩm' }, { id: 2, name: 'Nhập kho thành phẩm' }];
    }
    return [{ id: 1, name: 'Thực hiện công đoạn' }];
  }, [activeStage, selectedProductCode, orderProducts]);

  // 2. Tự động lọc và nạp dữ liệu Linh kiện/Kế hoạch ĐỘNG theo sản phẩm đang chọn và công đoạn active
  const routingDisplayItems = useMemo(() => {
    const pCode = selectedProductCode || (orderProducts[0] ? orderProducts[0].productCode : null);
    const targetProd = orderProducts.find(p => p.productCode === pCode);
    const pName = targetProd ? targetProd.productName : (pCode || 'Sản phẩm');
    const bomItems = displayedProductDetails || [];

    const todayStr = orderForm.startDate || new Date().toISOString().split('T')[0];
    const endStr = toISODate(orderForm.endDate) || '2026-08-15';

    if (activeStage === 'Tạo phôi') {
      const rawItems = bomItems.filter(i => (i.unit === 'm3' || (i.material || '').toLowerCase().includes('gỗ') || (i.compName || '').toLowerCase().includes('gỗ') || (i.compName || '').toLowerCase().includes('phôi')));
      if (rawItems.length > 0) {
        return rawItems.map((r, idx) => ({
          ...r,
          id: `route-${r.id || idx}`,
          startDate: todayStr,
          endDate: endStr,
          team: 'Tổ Tạo phôi',
          type: 'Phôi gỗ thô',
          stageFrom: 'Tạo phôi',
          stageTo: 'Định hình',
          status: r.status || 'Chờ sản xuất'
        }));
      }
      return [
        { id: 'raw-1', compCode: `${pCode || 'SKU'}-RAW-01`, compName: `Gỗ sồi xẻ phôi thô cho ${pName}`, quantity: '0/2', unit: 'm3', material: 'Gỗ Sồi (Oak)', spec: '30*150*1800', volume: 0.8, team: 'Tổ Tạo phôi', type: 'Phôi gỗ thô', stageFrom: 'Tạo phôi', stageTo: 'Định hình', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' },
        { id: 'raw-2', compCode: `${pCode || 'SKU'}-RAW-02`, compName: `Ván công nghiệp xẻ thanh cho ${pName}`, quantity: '0/5', unit: 'Tấm', material: 'MDF Chống ẩm', spec: '18*1220*2440', volume: 1.2, team: 'Tổ Tạo phôi', type: 'Ván thô', stageFrom: 'Tạo phôi', stageTo: 'Định hình', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' }
      ];
    }

    if (activeStage === 'Định hình') {
      const detailItems = bomItems.filter(i => !((i.compName || '').toLowerCase().includes('thùng') || (i.compName || '').toLowerCase().includes('pe')));
      return detailItems.map((r, idx) => ({
        ...r,
        id: `route-${r.id || idx}`,
        startDate: todayStr,
        endDate: endStr,
        team: 'Tổ Định hình',
        type: r.type || 'Linh kiện gia công',
        stageFrom: 'Định hình',
        stageTo: 'Lắp ráp',
        status: r.status || 'Chờ sản xuất'
      }));
    }

    if (activeStage === 'Lắp ráp') {
      const mainItems = bomItems.filter(i => (i.compName || '').toLowerCase().includes('mặt') || (i.compName || '').toLowerCase().includes('khung') || (i.compName || '').toLowerCase().includes('chân') || (i.compName || '').toLowerCase().includes('cánh'));
      const listToUse = mainItems.length > 0 ? mainItems : bomItems.slice(0, 4);
      return listToUse.map((r, idx) => ({
        ...r,
        id: `route-${r.id || idx}`,
        startDate: todayStr,
        endDate: endStr,
        team: 'Tổ Lắp ráp',
        type: 'Cụm lắp ráp',
        stageFrom: 'Lắp ráp',
        stageTo: 'Sơn',
        status: r.status || 'Chờ sản xuất'
      }));
    }

    if (activeStage === 'Sơn') {
      const mainStructure = bomItems.filter(i => (i.compName || '').toLowerCase().includes('mặt') || (i.compName || '').toLowerCase().includes('khung') || (i.compName || '').toLowerCase().includes('cánh'));
      const listToUse = mainStructure.length > 0 ? mainStructure.slice(0, 3) : bomItems.slice(0, 2);
      return listToUse.map((r, idx) => ({
        ...r,
        id: `route-${r.id || idx}`,
        startDate: todayStr,
        endDate: endStr,
        team: 'Tổ Sơn PU',
        type: 'Khung/Mặt hoàn thiện',
        stageFrom: 'Sơn',
        stageTo: 'Đóng gói',
        status: r.status || 'Chờ sản xuất'
      }));
    }

    if (activeStage === 'Đóng gói') {
      return [
        { id: 'pack-1', compCode: `PK-CARTON-${pCode || '01'}`, compName: `Thùng Carton in logo thương hiệu cho ${pName}`, quantity: `0/${targetProd?.totalQty || 50}`, unit: 'Bộ', material: 'Giấy sóng 5 lớp', spec: '600*800*1200', volume: 0.5, team: 'Tổ Đóng gói', type: 'Thùng đóng gói', stageFrom: 'Đóng gói', stageTo: 'Lưu kho', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' },
        { id: 'pack-2', compCode: `PK-PE-${pCode || '02'}`, compName: `Mút xốp PE foam bảo vệ góc cho ${pName}`, quantity: `0/${targetProd?.totalQty || 50}`, unit: 'Bộ', material: 'EPE Foam 5mm', spec: 'Tiêu chuẩn', volume: 0.1, team: 'Tổ Đóng gói', type: 'Vật liệu bảo vệ', stageFrom: 'Đóng gói', stageTo: 'Lưu kho', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' },
        { id: 'pack-3', compCode: `PK-LABEL-${pCode || '03'}`, compName: `Tem nhãn QR Barcode & Thẻ bảo hành ${pName}`, quantity: `0/${targetProd?.totalQty || 50}`, unit: 'Bộ', material: 'Decal bóc dán', spec: 'A5', volume: 0.01, team: 'Tổ Đóng gói', type: 'Nhãn tem QR', stageFrom: 'Đóng gói', stageTo: 'Lưu kho', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' }
      ];
    }

    if (activeStage === 'Lưu kho') {
      return [
        {
          id: `finished-${pCode || '01'}`,
          compCode: pCode || 'SKU-001',
          compName: `${pName} (Sản phẩm hoàn chỉnh)`,
          quantity: `0/${targetProd?.totalQty || 50}`,
          unit: targetProd?.unit || 'Bộ',
          material: targetProd?.material || 'Gỗ Sồi + MDF',
          spec: targetProd?.spec || 'Hoàn chỉnh',
          volume: 1.0,
          team: 'Kho thành phẩm',
          type: 'Thành phẩm hoàn chỉnh',
          stageFrom: 'Kho thành phẩm',
          stageTo: 'Xuất hàng',
          startDate: todayStr,
          endDate: endStr,
          status: 'Hoàn thành'
        }
      ];
    }

    return bomItems;
  }, [activeStage, displayedProductDetails, selectedProductCode, orderProducts, orderForm]);

  const combinedScheduleRows = useMemo(() => {
    const customForCurrentStage = customScheduleRows.filter(r => r.stageFrom === activeStage);
    return [...routingDisplayItems, ...customForCurrentStage];
  }, [routingDisplayItems, customScheduleRows, activeStage]);

  const handleAddScheduleRow = () => {
    const newRow = {
      id: Date.now(),
      startDate: orderForm.startDate || new Date().toISOString().split('T')[0],
      endDate: toISODate(orderForm.endDate) || '2026-08-15',
      team: 'Tổ mới',
      type: 'Chi tiết mới',
      stageFrom: activeStage,
      stageTo: activeStage === 'Đóng gói' ? 'Lưu kho' : 'Công đoạn tiếp',
      compName: 'Dòng kế hoạch bổ sung',
      quantity: '0/10',
      unit: 'Cái',
      spec: '15*200*600',
      volume: 1,
      material: 'Gỗ Sồi',
      compCode: `ADV-${Date.now().toString().slice(-4)}`,
      status: 'Chờ sản xuất'
    };
    setCustomScheduleRows([...customScheduleRows, newRow]);
    if (toast) toast('success', 'Đã thêm dòng kế hoạch mới thành công!');
  };

  const handleExport = () => {
    if (toast) toast('info', 'Xuất danh sách Lệnh sản xuất');
  };

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">
        
        {/* MÀN HÌNH 1: DANH SÁCH LỆNH SẢN XUẤT */}
        {viewMode === 'list' && (
          <>
            <PageToolbar
              searchValue={searchTerm}
              onSearchChange={(val) => { setSearchTerm(val); setPage(1); }}
              searchPlaceholder="Tìm mã lệnh, đơn hàng, khách hàng..."
              showSort={true}
              sortOptions={[
                { value: 'time_desc', label: 'Mới nhất' },
                { value: 'time_asc', label: 'Cũ nhất' },
                { value: 'code_asc', label: 'Mã lệnh (A → Z)' },
                { value: 'code_desc', label: 'Mã lệnh (Z → A)' }
              ]}
              sortValue={sortValue}
              onSortChange={(val) => { setSortValue(val); setPage(1); }}
              showFilter={true}
              isFilterOpen={isFilterBarOpen}
              onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
              activeFiltersCount={activeFiltersCount}
              importActions={[]}
              onExport={handleExport}
              onCreate={handleOpenCreateOrder}
              createLabel="Thêm tài liệu"
              hasWritePermission={true}
              extraActions={[
                {
                  label: 'Khác',
                  icon: null,
                  onClick: () => {}
                }
              ]}
            />

            {isFilterBarOpen && (
              <div className="filter-bar" style={{ margin: '0 0 20px 0', padding: '16px 20px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #EADCC9', boxShadow: '0 2px 8px rgba(45,26,18,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'nowrap' }}>
                  <div style={{ flex: '1 1 0', minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Trạng thái</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="">Tất cả</option>
                      <option value="Đang sản xuất">Đang sản xuất</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="Chờ sản xuất">Chờ sản xuất</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 0', minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Mức độ ưu tiên</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="">Tất cả</option>
                      <option value="Cao">Cao</option>
                      <option value="Bình thường">Bình thường</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 0', minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Từ ngày</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                  <div style={{ flex: '1 1 0', minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Đến ngày</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                  <div style={{ flex: '1 1 0', minWidth: '100px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Số lượng dòng</label>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFFFFF' }}
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                      style={{ padding: '8px 16px', border: '1.5px solid #D1D5DB', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#5D3B32', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Đặt lại
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-list-layout">
              <div className="mgmt-table card admin-table-card">
                <div className="table-responsive desktop-only admin-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                        <th style={{ textAlign: 'center', width: '50px', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>STT</th>
                        <th style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Mã lệnh</th>
                        <th style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Đơn hàng</th>
                        <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Tổng số sản phẩm</th>
                        <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Số lượng kế hoạch</th>
                        <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Thời gian bắt đầu</th>
                        <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Thời gian kết thúc</th>
                        <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Mức độ ưu tiên</th>
                        <th style={{ textAlign: 'center', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Trạng thái</th>
                        <th style={{ textAlign: 'center', width: '70px', backgroundColor: '#6D4C3D', color: '#FFFFFF', fontWeight: '700' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && currentItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                            Đang tải dữ liệu lệnh sản xuất...
                          </td>
                        </tr>
                      ) : currentItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                            Chưa có dữ liệu lệnh sản xuất phù hợp
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((item, index) => {
                          const sttVal = (page - 1) * pageSize + index + 1;
                          return (
                            <tr key={item.id || index}>
                              <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>{sttVal}</td>
                              <td
                                onClick={() => handleOpenOrderDetail(item)}
                                style={{ fontWeight: '800', color: '#2D1A12', cursor: 'pointer' }}
                                title="Nhấp để xem chi tiết Lệnh SX"
                              >
                                {item.code}
                              </td>
                              <td style={{ color: '#475569', fontWeight: '600' }}>{item.orderNo}</td>
                              <td style={{ textAlign: 'center', fontWeight: '700', color: '#334155' }}>{item.totalProducts}</td>
                              <td style={{ textAlign: 'center', fontWeight: '800', color: '#2D1A12' }}>{item.planQty}</td>
                              <td style={{ textAlign: 'center', color: '#64748B' }}>{toDisplayDate(item.startDate)}</td>
                              <td style={{ textAlign: 'center', color: '#64748B' }}>{toDisplayDate(item.endDate)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  backgroundColor: item.priority === 'Cao' ? '#FEF2F2' : item.priority === 'Bình thường' ? '#FFFBEB' : '#F1F5F9',
                                  color: item.priority === 'Cao' ? '#EF4444' : item.priority === 'Bình thường' ? '#D97706' : '#64748B',
                                  border: `1px solid ${item.priority === 'Cao' ? '#FCA5A5' : item.priority === 'Bình thường' ? '#FDE68A' : '#CBD5E1'}`
                                }}>
                                  {item.priority}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  backgroundColor: item.status === 'Hoàn thành' ? '#ECFDF5' : item.status === 'Đang sản xuất' ? '#EFF6FF' : '#FFFBEB',
                                  color: item.status === 'Hoàn thành' ? '#10B981' : item.status === 'Đang sản xuất' ? '#3B82F6' : '#D97706',
                                  border: `1px solid ${item.status === 'Hoàn thành' ? '#A7F3D0' : item.status === 'Đang sản xuất' ? '#BFDBFE' : '#FDE68A'}`
                                }}>
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenOrderDetail(item)}
                                  style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                                  title="Chỉnh sửa lệnh"
                                >
                                  <Pencil size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="admin-pagination-desktop desktop-only">
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Show <b>{startIndex}</b> to <b>{endIndex}</b> of <b>{totalCount}</b> results
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="page-btn"
                      >
                        Previous
                      </button>
                      {(() => {
                        const pages = [];
                        const delta = 2;
                        for (let i = 1; i <= totalPages; i++) {
                          if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
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
                              className={`page-btn ${page === p ? 'active' : ''}`}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                        className="page-btn"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        )}

        {/* MÀN HÌNH 2: TẠO/CHI TIẾT LỆNH SẢN XUẤT */}
        {viewMode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* KHUNG 1: Thông tin chung */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #EADCC9',
              padding: '18px 24px',
              boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#2D1A12' }}>
                  Thông tin chung {orderForm.code ? `(${orderForm.code})` : ''}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button style={{
                    padding: '8px 16px',
                    backgroundColor: '#8D6E63',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Upload size={16} /> Nhập danh sách
                  </button>

                  <button style={{
                    padding: '8px 16px',
                    backgroundColor: '#8D6E63',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Download size={16} /> Xuất lệnh
                  </button>

                  <button style={{
                    padding: '8px 16px',
                    backgroundColor: '#65A30D',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Send size={16} /> Chuyển thông tin
                  </button>

                  <button
                    onClick={handleSaveOrder}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: '#5D3B32',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(93, 59, 50, 0.2)'
                    }}
                  >
                    Lưu thông tin
                  </button>
                </div>
              </div>

              {/* Form Grid 6 Ô Nhập (Mã lệnh & Trạng thái: CHO PHÉP SỬA khi Tạo Mới; KHÔNG CHO SỬA khi Edit) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                
                {/* 1. Mã lệnh: Tạo Mới -> ĐƯỢC CHỈNH SỬA | Edit -> READONLY NỀN XÁM */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Mã lệnh</label>
                  <input
                    type="text"
                    placeholder="Nhập mã lệnh..."
                    value={orderForm.code}
                    readOnly={isEditMode}
                    onChange={(e) => setOrderForm({ ...orderForm, code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1.5px solid #D1D5DB',
                      borderRadius: '8px',
                      backgroundColor: isEditMode ? '#E5E7EB' : '#FFFFFF',
                      fontWeight: '700',
                      fontSize: '0.88rem',
                      color: '#1F2937',
                      outline: 'none',
                      cursor: isEditMode ? 'not-allowed' : 'text'
                    }}
                  />
                </div>

                {/* 2. Mã đơn hàng */}
                <div ref={poDropdownRef} style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>
                    Mã đơn hàng
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Chọn mã đơn hàng..."
                      value={orderForm.orderId}
                      onFocus={() => setIsPoDropdownOpen(true)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOrderForm({ ...orderForm, orderId: val });
                        setPoSearch(val);
                        setIsPoDropdownOpen(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 32px 8px 12px',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        outline: 'none',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    <ChevronDown
                      size={18}
                      onClick={() => setIsPoDropdownOpen(!isPoDropdownOpen)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', cursor: 'pointer' }}
                    />
                  </div>

                  {isPoDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #EADCC9',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(45,26,18,0.12)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      zIndex: 100
                    }}>
                      <div style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '800', color: '#7B5233', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                        Danh sách Đơn bán hàng (/admin/purchase-requisitions)
                      </div>
                      {filteredPOList.length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '0.82rem', color: '#94A3B8', textAlign: 'center' }}>
                          Không tìm thấy đơn bán hàng phù hợp
                        </div>
                      ) : (
                        filteredPOList.map((po) => (
                          <div
                            key={po.id}
                            onClick={() => handleSelectPurchaseRequisition(po)}
                            style={{
                              padding: '9px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #F3F4F6',
                              display: 'flex',
                              justify: 'space-between',
                              alignItems: 'center',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                          >
                            <div>
                              <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.88rem' }}>{po.po_code}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{po.supplier_name || 'Đơn mua hàng'}</div>
                            </div>
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: '700' }}>
                              {po.item_count ? `${po.item_count} món` : 'Chọn'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Mức độ ưu tiên */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Mức độ ưu tiên</label>
                  <select
                    value={orderForm.priority}
                    onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFF' }}
                  >
                    <option value="Cao">Cao</option>
                    <option value="Bình thường">Bình thường</option>
                    <option value="Thấp">Thấp</option>
                  </select>
                </div>

                {/* 4. Thời gian bắt đầu */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Thời gian bắt đầu</label>
                  <input
                    type="date"
                    value={orderForm.startDate}
                    onChange={(e) => setOrderForm({ ...orderForm, startDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFF' }}
                  />
                </div>

                {/* 5. Thời gian hoàn thành dự kiến */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Thời gian hoàn thành dự kiến</label>
                  <input
                    type="date"
                    value={orderForm.endDate}
                    onChange={(e) => setOrderForm({ ...orderForm, endDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', color: '#1F2937', outline: 'none', backgroundColor: '#FFF' }}
                  />
                </div>

                {/* 6. Trạng thái: Tạo Mới -> ĐƯỢC CHỈNH SỬA (Select) | Edit -> READONLY NỀN XÁM */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '5px' }}>Trạng thái</label>
                  {isEditMode ? (
                    <input
                      type="text"
                      readOnly
                      value={orderForm.status}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        backgroundColor: '#E5E7EB',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        outline: 'none',
                        cursor: 'not-allowed'
                      }}
                    />
                  ) : (
                    <select
                      value={orderForm.status}
                      onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        outline: 'none',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <option value="Đang sản xuất">Đang sản xuất</option>
                      <option value="Chờ phân bổ">Chờ phân bổ</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                    </select>
                  )}
                </div>

              </div>
            </div>

            {/* THANH 4 TAB ĐIỀU HƯỚNG BÊN DƯỚI THÔNG TIN CHUNG */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '2px solid #EADCC9', paddingLeft: '4px', marginBottom: '2px' }}>
              <button
                onClick={() => setActiveMainTab('order_info')}
                style={{
                  padding: '8px 4px',
                  backgroundColor: 'transparent',
                  color: activeMainTab === 'order_info' ? '#5D3B32' : '#6B7280',
                  border: 'none',
                  borderBottom: activeMainTab === 'order_info' ? '3px solid #5D3B32' : '3px solid transparent',
                  fontWeight: activeMainTab === 'order_info' ? '800' : '600',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                  transition: 'all 0.2s'
                }}
              >
                Thông tin đơn hàng
              </button>

              <button
                onClick={() => setActiveMainTab('material_bom')}
                style={{
                  padding: '8px 4px',
                  backgroundColor: 'transparent',
                  color: activeMainTab === 'material_bom' ? '#5D3B32' : '#6B7280',
                  border: 'none',
                  borderBottom: activeMainTab === 'material_bom' ? '3px solid #5D3B32' : '3px solid transparent',
                  fontWeight: activeMainTab === 'material_bom' ? '800' : '600',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                  transition: 'all 0.2s'
                }}
              >
                Định mức vật tư
              </button>

              <button
                onClick={() => setActiveMainTab('routing_plan')}
                style={{
                  padding: '8px 4px',
                  backgroundColor: 'transparent',
                  color: activeMainTab === 'routing_plan' ? '#5D3B32' : '#6B7280',
                  border: 'none',
                  borderBottom: activeMainTab === 'routing_plan' ? '3px solid #5D3B32' : '3px solid transparent',
                  fontWeight: activeMainTab === 'routing_plan' ? '800' : '600',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                  transition: 'all 0.2s'
                }}
              >
                Quy trình - Kế hoạch
              </button>

              <button
                onClick={() => setActiveMainTab('transfer_slip')}
                style={{
                  padding: '8px 4px',
                  backgroundColor: 'transparent',
                  color: activeMainTab === 'transfer_slip' ? '#5D3B32' : '#6B7280',
                  border: 'none',
                  borderBottom: activeMainTab === 'transfer_slip' ? '3px solid #5D3B32' : '3px solid transparent',
                  fontWeight: activeMainTab === 'transfer_slip' ? '800' : '600',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                  transition: 'all 0.2s'
                }}
              >
                Phiếu luân chuyển
              </button>
            </div>

            {/* NỘI DUNG THEO TAB ĐƯỢC CHỌN */}
            {activeMainTab === 'order_info' ? (
              <>
                {/* BẢNG 1: BẢNG "THÔNG TIN ĐƠN HÀNG" (NHẤN VÀO DÒNG SẢN PHẨM ĐỂ CHỌN) */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1.5px solid #EADCC9',
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
                }}>
                  {loadingDetail ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: '#7B5233', fontWeight: '700' }}>
                      Đang nạp chi tiết từ Đơn bán hàng (/admin/purchase-requisitions)...
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                            <th style={{ padding: '9px 10px', textAlign: 'center', width: '45px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                            <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Mã sản phẩm</th>
                            <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên sản phẩm</th>
                            <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Dòng hàng</th>
                            <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', minWidth: '110px' }}>Nhà máy SX</th>
                            <th style={{ padding: '9px 10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Số lượng đặt</th>
                            <th style={{ padding: '9px 10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Dự phòng</th>
                            <th style={{ padding: '9px 10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tổng số lượng sản xuất</th>
                            <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Đơn vị</th>
                            <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày bắt đầu (dự kiến)</th>
                            <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày kết thúc (dự kiến)</th>
                            <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày giao hàng dự kiến</th>
                            <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700' }}>Mã bản vẽ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderProducts.length === 0 ? (
                            <tr>
                              <td colSpan={13} style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                                Chưa có mặt hàng. Nhập hoặc chọn <b>Mã đơn hàng</b> ở trên để nạp tự động từ Đơn bán hàng (/admin/purchase-requisitions).
                              </td>
                            </tr>
                          ) : (
                            orderProducts.map((p, idx) => {
                              const isSelected = selectedProductCode === p.productCode;
                              return (
                                <tr
                                  key={p.id || idx}
                                  onClick={() => setSelectedProductCode(p.productCode)}
                                  title="Nhấp để xem chi tiết linh kiện BOM bên dưới"
                                  style={{
                                    borderBottom: '1px solid #EADCC9',
                                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                                    borderLeft: isSelected ? '4px solid #5D3B32' : '4px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.15s ease'
                                  }}
                                >
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>{idx + 1}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: '800', color: isSelected ? '#5D3B32' : '#2D1A12' }}>{p.productCode || '---'}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{p.productName || '---'}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: '600', color: '#475569' }}>{p.lineType || '---'}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={p.factory || uniqueFactories[0] || 'NM1'}
                                      onChange={(e) => handleChangeProductFactory(p.productCode, e.target.value)}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1.5px solid #EADCC9',
                                        fontSize: '0.82rem',
                                        fontWeight: '700',
                                        color: '#5D3B32',
                                        backgroundColor: '#FAF6F0',
                                        outline: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {uniqueFactories.map(fac => (
                                        <option key={fac} value={fac}>{fac}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#1F2937' }}>{p.orderQty !== undefined ? p.orderQty : 0}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#1F2937' }}>{p.spareQty !== undefined ? p.spareQty : 0}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>{p.totalQty !== undefined ? p.totalQty : 0}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>{p.unit || 'Bộ'}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{toDisplayDate(p.startDate) || '---'}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{toDisplayDate(p.endDate) || '---'}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{toDisplayDate(p.deliveryDate) || '---'}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: '#2D1A12' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} title="Xem bản vẽ kỹ thuật">
                                      <Eye size={14} style={{ color: '#475569' }} /> {p.drawingCode || '---'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* KHUNG 2: KHUNG CARD "CHI TIẾT SẢN PHẨM" - NẠP ĐẦY ĐỦ 8 DÒNG LINH KIỆN BOM CHUẨN ERP */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1.5px solid #EADCC9',
                  padding: '16px 20px',
                  boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>Chi tiết sản phẩm</span>
                      {selectedProductCode && (
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#5D3B32', backgroundColor: '#FAF6F0', padding: '3px 10px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                          SKU: {selectedProductCode}
                        </span>
                      )}
                      {currentFactory && (
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1E3A8A', backgroundColor: '#EFF6FF', padding: '3px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                          Nhà máy: {currentFactory}
                        </span>
                      )}
                    </h3>
                  </div>

                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '420px', border: '1px solid #EADCC9', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'center', width: '45px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Loại</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn giao</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn nhận</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Mã thành phẩm</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên thành phẩm</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Số lượng</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Đơn vị</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Vật liệu</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Quy cách (mm)</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Khối lượng (m3)</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ghi chú</th>
                          <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#6D4C3D', padding: '9px 10px', textAlign: 'center', fontWeight: '700' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedProductDetails.length === 0 ? (
                          <tr>
                            <td colSpan={13} style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                              Chưa chọn sản phẩm ở bảng trên.
                            </td>
                          </tr>
                        ) : (
                          displayedProductDetails.map((det, idx) => (
                            <tr key={det.id || idx} style={{ borderBottom: '1px solid #EADCC9' }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{det.type || '---'}</td>
                              <td style={{ padding: '4px 6px' }}>
                                <select
                                  value={det.stageFrom || (currentFactoryStages[0] || stageOptions[0] || '')}
                                  onChange={(e) => handleUpdateDetStage(det.id, 'stageFrom', e.target.value)}
                                  style={{
                                    width: '100%',
                                    minWidth: '110px',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1.5px solid #EADCC9',
                                    fontSize: '0.82rem',
                                    fontWeight: '600',
                                    color: '#2D1A12',
                                    backgroundColor: '#FFFFFF',
                                    outline: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {currentFactoryStages.map((stg, sIdx) => (
                                    <option key={sIdx} value={stg}>{stg}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: '4px 6px' }}>
                                <select
                                  value={det.stageTo || (currentFactoryStages[1] || currentFactoryStages[0] || stageOptions[1] || '')}
                                  onChange={(e) => handleUpdateDetStage(det.id, 'stageTo', e.target.value)}
                                  style={{
                                    width: '100%',
                                    minWidth: '110px',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1.5px solid #EADCC9',
                                    fontSize: '0.82rem',
                                    fontWeight: '600',
                                    color: '#2D1A12',
                                    backgroundColor: '#FFFFFF',
                                    outline: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {currentFactoryStages.map((stg, sIdx) => (
                                    <option key={sIdx} value={stg}>{stg}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: '800', color: '#2D1A12' }}>{det.compCode || '---'}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{det.compName || '---'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#1F2937' }}>{det.quantity || '0/0'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>{det.unit || 'Cái'}</td>
                              <td style={{ padding: '8px 10px', color: '#334155' }}>{det.material || '---'}</td>
                              <td style={{ padding: '8px 10px', color: '#475569' }}>{det.spec || '---'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{det.volume !== undefined ? det.volume : '1'}</td>
                              <td style={{ padding: '8px 10px', color: '#94A3B8' }}>{det.note || '---'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 9px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  backgroundColor: det.status === 'Hoàn thành' ? '#ECFDF5' : '#FFFBEB',
                                  color: det.status === 'Hoàn thành' ? '#10B981' : '#D97706',
                                  border: `1px solid ${det.status === 'Hoàn thành' ? '#A7F3D0' : '#FDE68A'}`
                                }}>
                                  {det.status || 'Chờ sản xuất'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : activeMainTab === 'routing_plan' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* KHUNG 1: QUY TRÌNH SẢN XUẤT */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1.5px solid #EADCC9',
                  padding: '20px 24px',
                  boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
                }}>
                  <h3 style={{ margin: '0 0 18px 0', fontSize: '1.18rem', fontWeight: '800', color: '#2D1A12' }}>
                    Quy trình sản xuất
                  </h3>

                  {/* Sơ đồ Công đoạn chính (Khối chữ nhật) */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {mainStages.map((stg, idx) => {
                      const isActive = activeStage === stg;
                      return (
                        <React.Fragment key={stg}>
                          <div
                            onClick={() => setActiveStage(stg)}
                            style={{
                              padding: '12px 28px',
                              borderRadius: '10px',
                              backgroundColor: isActive ? '#A3E635' : '#FAF6F0',
                              border: isActive ? '2.5px solid #65A30D' : '1.5px solid #EADCC9',
                              color: isActive ? '#1F2937' : '#4B5563',
                              fontWeight: '800',
                              fontSize: '1.05rem',
                              cursor: 'pointer',
                              boxShadow: isActive ? '0 4px 12px rgba(163, 230, 53, 0.35)' : 'none',
                              transition: 'all 0.2s ease',
                              userSelect: 'none'
                            }}
                          >
                            {stg}
                          </div>
                          {idx < mainStages.length - 1 && (
                            <ArrowRight size={22} style={{ color: '#4B5563', margin: '0 4px' }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Sơ đồ Công đoạn con / Tổ máy (Khối Oval Xanh Dương) ĐỘNG */}
                  <div style={{
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '12px',
                    padding: '24px 32px',
                    backgroundColor: '#FFFFFF',
                    minHeight: '100px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      {dynamicSubStages.map((sub, sIdx, arr) => (
                        <React.Fragment key={sub.id || sIdx}>
                          <div style={{
                            padding: '12px 32px',
                            borderRadius: '9999px',
                            backgroundColor: '#7DD3FC',
                            border: '1.5px solid #0284C7',
                            color: '#0F172A',
                            fontWeight: '800',
                            fontSize: '1rem',
                            boxShadow: '0 2px 8px rgba(125, 211, 252, 0.3)'
                          }}>
                            {sub.name}
                          </div>
                          {sIdx < arr.length - 1 && (
                            <ArrowRight size={24} style={{ color: '#475569' }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                {/* KHUNG 2: KẾ HOẠCH THỰC HIỆN ĐỘNG THEO CÔNG ĐOẠN & SẢN PHẨM */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1.5px solid #EADCC9',
                  padding: '20px 24px',
                  boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>Kế hoạch thực hiện</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '3px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                        Công đoạn: {activeStage}
                      </span>
                      {selectedProductCode && (
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#5D3B32', backgroundColor: '#FAF6F0', padding: '3px 10px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                          SKU: {selectedProductCode}
                        </span>
                      )}
                    </h3>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px', marginBottom: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                          <th style={{ padding: '9px 10px', textAlign: 'center', width: '45px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                          <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày bắt đầu (dự kiến)</th>
                          <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày kết thúc (dự kiến)</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tổ</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Loại</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn giao</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn nhận</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên thành phẩm</th>
                          <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Số lượng</th>
                          <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Đơn vị</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Quy cách (mm)</th>
                          <th style={{ padding: '9px 10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Khối lượng (m3)</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Vật liệu</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Mã thành phẩm</th>
                          <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedScheduleRows.length === 0 ? (
                          <tr>
                            <td colSpan={15} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                              Không có dữ liệu linh kiện cho công đoạn {activeStage}. Nhấp nút "+ Thêm mới" bên dưới để bổ sung.
                            </td>
                          </tr>
                        ) : (
                          combinedScheduleRows.map((r, idx) => (
                            <tr key={r.id || idx} style={{ borderBottom: '1px solid #EADCC9', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{r.startDate || '---'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{r.endDate || '---'}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{r.team || '---'}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{r.type || '---'}</td>
                              <td style={{ padding: '8px 10px', color: '#475569' }}>{r.stageFrom || '---'}</td>
                              <td style={{ padding: '8px 10px', color: '#475569' }}>{r.stageTo || '---'}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{r.compName || '---'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#1F2937' }}>{r.quantity || '0/0'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>{r.unit || '---'}</td>
                              <td style={{ padding: '8px 10px', color: '#475569' }}>{r.spec || '---'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{r.volume !== undefined ? r.volume : '0'}</td>
                              <td style={{ padding: '8px 10px', color: '#334155' }}>{r.material || '---'}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '800', color: '#2D1A12' }}>{r.compCode || '---'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 9px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  backgroundColor: r.status === 'Hoàn thành' ? '#ECFDF5' : '#FFFBEB',
                                  color: r.status === 'Hoàn thành' ? '#10B981' : '#D97706',
                                  border: `1px solid ${r.status === 'Hoàn thành' ? '#A7F3D0' : '#FDE68A'}`
                                }}>
                                  {r.status || 'Chờ sản xuất'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleAddScheduleRow}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      backgroundColor: '#FAF6F0',
                      border: '1.5px solid #EADCC9',
                      borderRadius: '8px',
                      color: '#5D3B32',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EADCC9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                  >
                    <Plus size={15} /> Thêm mới
                  </button>

                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1.5px solid #EADCC9',
                minHeight: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                fontSize: '0.88rem',
                fontWeight: '600',
                boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
              }}>
                Nội dung tạm thời trống
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default ProductionOrdersView;

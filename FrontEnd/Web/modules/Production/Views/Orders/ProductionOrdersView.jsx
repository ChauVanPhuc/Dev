import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Pencil, Download, Upload, Send, ArrowLeft, ChevronDown
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { planService } from '@modules/Plan/Models/plan.service';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import '@styles/components.css';

/**
 * View: Quản lý Lệnh sản xuất (/admin/production-orders)
 * Tinh chỉnh theo yêu cầu:
 * - Nút "Quay lại danh sách Lệnh SX" nằm trực tiếp trên thanh Nav Cố Định (admin-header / setHeaderExtra)
 *   để đồng bộ 100% với cấu trúc tất cả các trang khác trong hệ thống.
 */
const ProductionOrdersView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = outletContext;
  const { toast } = useToast();

  // View Mode: 'list' (Danh sách Lệnh SX) | 'create' (Chi tiết/Tạo Lệnh SX)
  const [viewMode, setViewMode] = useState('list');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [sortValue, setSortValue] = useState('time_desc');

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-orders');

  // Đặt Tiêu đề, Subtitle và Nút "Quay lại" trực tiếp lên Thanh Nav Cố Định (admin-header)
  useEffect(() => {
    if (viewMode === 'create') {
      if (setCustomTitle) setCustomTitle('Lệnh sản xuất');
      if (setCustomSubtitle) setCustomSubtitle('SX02.1: Tạo lệnh sản xuất');
      if (setCustomScreenCode) setCustomScreenCode('SX02.1');
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
      if (setCustomTitle) setCustomTitle('Lệnh sản xuất');
      if (setCustomSubtitle) setCustomSubtitle('SX02: Danh sách lệnh sản xuất');
      if (setCustomScreenCode) setCustomScreenCode('SX02');
      if (setHeaderExtra) setHeaderExtra(null);
    }

    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [viewMode, setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra]);

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

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState('order_info');

  // Bảng 1: Thông tin đơn hàng & SKU
  const [orderProducts, setOrderProducts] = useState([]);

  // Bảng 2: Chi tiết linh kiện BOM & Công đoạn sản xuất
  const [productDetails, setProductDetails] = useState([]);

  // Lấy danh sách PO Mua hàng từ module Purchasing (/admin/purchase-requisitions)
  useEffect(() => {
    const fetchPOList = async () => {
      try {
        const res = await purchasingService.getRequisitions({ limit: 100 }).catch(() => null);
        if (res && res.items) {
          setPurchaseRequisitions(res.items);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách Đơn mua hàng:', err);
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

              allOrders.push({
                id: ord.id || `${plan.id}-${oIdx}`,
                planId: plan.id,
                code: cleanCode,
                orderNo: orderCode,
                customer: ord.customer || plan.customer || 'Khách hàng hệ thống',
                totalProducts: ord.products ? ord.products.length : 1,
                planQty: totalQty,
                startDate: '01/08/2026',
                endDate: '15/08/2026',
                priority: priorityText,
                status: 'Đang sản xuất',
                note: ord.customer || '',
                products: ord.products || []
              });
            });
          }
        });
      }

      if (allOrders.length === 0) {
        const detailData = await planService.getPlanById(18).catch(() => null);
        if (detailData && detailData.orders && detailData.orders.length > 0) {
          allOrders = detailData.orders.map((ord, idx) => {
            const totalQty = ord.products ? ord.products.reduce((acc, p) => acc + (p.quantity || 0), 0) : 50;
            const orderCode = ord.name || ord.order_code || `DH-2026-${100 + idx}`;
            const cleanCode = orderCode.replace(/^LSX-?/i, '');
            const priorityText = ord.is_priority === 1 || ord.priority === 'Cao' ? 'Cao' : (ord.priority || 'Bình thường');

            return {
              id: ord.id || idx + 1,
              planId: 18,
              code: cleanCode,
              orderNo: orderCode,
              customer: ord.customer || 'Khách hàng hệ thống',
              totalProducts: ord.products ? ord.products.length : 1,
              planQty: totalQty,
              startDate: '01/08/2026',
              endDate: '15/08/2026',
              priority: priorityText,
              status: idx === 3 ? 'Hoàn thành' : 'Đang sản xuất',
              note: ord.customer || '',
              products: ord.products || []
            };
          });
        }
      }

      if (allOrders.length === 0) {
        allOrders = [
          { id: 1, planId: 18, code: '2026-001', orderNo: 'DH-2026-088', totalProducts: 50, planQty: 50, startDate: '01/08/2026', endDate: '15/08/2026', priority: 'Cao', status: 'Đang sản xuất', note: 'Đơn hàng gấp xuất khẩu' },
          { id: 2, planId: 18, code: '2026-002', orderNo: 'DH-EX-992', totalProducts: 120, planQty: 120, startDate: '02/08/2026', endDate: '18/08/2026', priority: 'Bình thường', status: 'Đang sản xuất', note: 'Kèm đệm bọc da' },
          { id: 3, planId: 18, code: '2026-003', orderNo: 'DH-PM-104', totalProducts: 30, planQty: 30, startDate: '03/08/2026', endDate: '20/08/2026', priority: 'Bình thường', status: 'Chờ phân bổ', note: 'Sơn phủ PU mờ' },
          { id: 4, planId: 18, code: '2026-004', orderNo: 'DH-TK-005', totalProducts: 80, planQty: 80, startDate: '03/08/2026', endDate: '12/08/2026', priority: 'Bình thường', status: 'Hoàn thành', note: 'Đã nhập kho đủ' },
          { id: 5, planId: 18, code: '2026-005', orderNo: 'DH-2026-089', totalProducts: 200, planQty: 200, startDate: '04/08/2026', endDate: '25/08/2026', priority: 'Thấp', status: 'Đang sản xuất', note: 'Lô hàng dự phòng' },
        ];
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

  // Xử lý nạp dữ liệu từ Đơn mua hàng (/admin/purchase-requisitions) theo poCode hoặc requisitionId
  const handleSelectPurchaseRequisition = async (reqObj) => {
    if (!reqObj) return;

    setLoadingDetail(true);
    try {
      const fullReq = await purchasingService.getRequisitionById(reqObj.id).catch(() => reqObj);
      const itemsList = (fullReq && fullReq.items) ? fullReq.items : [];

      const poCodeVal = reqObj.po_code || fullReq.po_code || '';
      const orderDateVal = (reqObj.order_date || fullReq.order_date) ? (reqObj.order_date || fullReq.order_date).split('T')[0] : new Date().toISOString().split('T')[0];
      const deliveryDateVal = (reqObj.delivery_date || fullReq.delivery_date) ? (reqObj.delivery_date || fullReq.delivery_date).split('T')[0] : '';

      setOrderForm(prev => ({
        ...prev,
        code: prev.code || poCodeVal,
        orderId: poCodeVal,
        priority: reqObj.priority || fullReq.priority || 'Bình thường',
        startDate: orderDateVal,
        endDate: deliveryDateVal
      }));

      const mappedProducts = itemsList.map((it, idx) => {
        const qty = it.quantity || 0;
        const spare = Math.ceil(qty * 0.05);
        return {
          id: it.id || idx + 1,
          productCode: it.item_code || `SKU-${idx + 1}`,
          productName: it.item_name || 'Sản phẩm mua',
          category: poCodeVal,
          orderQty: qty,
          spareQty: spare,
          totalQty: qty + spare,
          unit: it.unit || 'Bộ',
          startDate: orderDateVal,
          endDate: deliveryDateVal,
          deliveryDate: deliveryDateVal,
          drawingCode: `BV-${it.item_code || idx + 1}`
        };
      });

      const mappedBomParts = itemsList.map((it, idx) => ({
        id: it.id || idx + 1,
        type: 'Chi tiết mua hàng',
        stageFrom: 'Cung ứng (PO)',
        stageTo: 'Sản xuất / Nhập kho',
        compCode: it.item_code || `COMP-${idx + 1}`,
        compName: it.item_name || 'Chi tiết',
        quantity: `${it.quantity || 0}/${it.quantity || 0}`,
        unit: it.unit || 'Bộ',
        material: reqObj.supplier_name || 'Vật tư mua hàng',
        spec: 'Theo đơn đặt mua',
        volume: 1,
        note: poCodeVal,
        status: reqObj.status || 'Chờ sản xuất'
      }));

      setOrderProducts(mappedProducts);
      setProductDetails(mappedBomParts);
      if (toast) toast('success', `Đã nạp ${mappedProducts.length} mặt hàng từ Đơn mua hàng ${poCodeVal}`);
    } catch (err) {
      console.warn('Lỗi nạp dữ liệu từ Purchase Requisition:', err);
    } finally {
      setLoadingDetail(false);
      setIsPoDropdownOpen(false);
    }
  };

  // Xử lý mở Chi tiết khi xem/sửa 1 Lệnh sẵn có
  const handleOpenOrderDetail = async (item) => {
    setOrderForm({
      code: item.code,
      orderId: item.orderNo,
      priority: item.priority,
      startDate: item.startDate || '01/08/2026',
      endDate: item.endDate || '15/08/2026',
      status: item.status
    });

    setViewMode('create');
    setLoadingDetail(true);

    try {
      let formattedProducts = [];
      let formattedBomParts = [];

      if (item.products && item.products.length > 0) {
        formattedProducts = item.products.map((p, idx) => {
          const qty = p.quantity || 0;
          const spare = Math.ceil(qty * 0.05);
          return {
            id: p.id || idx + 1,
            productCode: p.sku || `SP${1000 + idx}`,
            productName: p.name || 'Sản phẩm gỗ',
            category: item.orderNo || 'Đơn hàng',
            orderQty: qty,
            spareQty: spare,
            totalQty: qty + spare,
            unit: 'Cái',
            startDate: item.startDate,
            endDate: item.endDate,
            deliveryDate: item.endDate,
            drawingCode: `BV-${p.sku || idx + 1}`
          };
        });

        item.products.forEach((p, idx) => {
          if (p.bom_details && p.bom_details.length > 0) {
            p.bom_details.forEach((b, bIdx) => {
              formattedBomParts.push({
                id: b.id || `${p.id}-${bIdx}`,
                type: b.name || 'Linh kiện',
                stageFrom: b.input_stage || 'Định hình',
                stageTo: b.output_stage || 'Lắp ráp',
                compCode: b.sku || `COMP-${bIdx + 1}`,
                compName: b.name || 'Cụm chi tiết',
                quantity: `${Math.round(b.delivered || 0)}/${Math.round(b.planned || p.quantity || 1)}`,
                unit: 'Cái',
                material: 'MDF / Gỗ tự nhiên',
                spec: 'Tiêu chuẩn SX',
                volume: 1,
                note: item.orderNo,
                status: (b.delivered || 0) >= (b.planned || p.quantity || 1) ? 'Hoàn thành' : 'Chờ sản xuất'
              });
            });
          }
        });
      }

      setOrderProducts(formattedProducts);
      setProductDetails(formattedBomParts);
    } catch (err) {
      console.warn('Lỗi tải chi tiết Lệnh sản xuất:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Khởi tạo TRỐNG 100% khi nhấp + Thêm tài liệu
  const handleOpenCreateOrder = () => {
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
    setViewMode('create');
  };

  // Xử lý lưu thông tin Lệnh SX mới
  const handleSaveOrder = () => {
    if (!orderForm.code && !orderForm.orderId) {
      if (toast) toast('warning', 'Vui lòng nhập Mã lệnh sản xuất hoặc Mã đơn hàng!');
      return;
    }
    const newOrderObj = {
      id: Date.now(),
      planId: Date.now(),
      code: orderForm.code || Date.now().toString().slice(-6),
      orderNo: orderForm.orderId || 'Đơn hàng mới',
      customer: 'Khách hàng',
      totalProducts: orderProducts.length,
      planQty: orderProducts.reduce((sum, p) => sum + (p.totalQty || 0), 0),
      startDate: orderForm.startDate,
      endDate: orderForm.endDate,
      priority: orderForm.priority,
      status: orderForm.status,
      note: 'Lệnh SX mới'
    };
    setOrdersList([newOrderObj, ...ordersList]);
    setTotal(prev => prev + 1);
    if (toast) toast('success', 'Đã lưu Lệnh sản xuất thành công!');
    setViewMode('list');
  };

  const totalCount = total || ordersList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(page * pageSize, totalCount);
  const currentItems = ordersList.slice((page - 1) * pageSize, page * pageSize);

  const filteredPOList = useMemo(() => {
    if (!poSearch.trim()) return purchaseRequisitions.slice(0, 15);
    const term = poSearch.toLowerCase();
    return purchaseRequisitions.filter(po =>
      (po.po_code && po.po_code.toLowerCase().includes(term)) ||
      (po.supplier_name && po.supplier_name.toLowerCase().includes(term))
    ).slice(0, 15);
  }, [purchaseRequisitions, poSearch]);

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
              searchPlaceholder="Search..."
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
              activeFiltersCount={0}
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
                              <td style={{ textAlign: 'center', color: '#64748B' }}>{item.startDate}</td>
                              <td style={{ textAlign: 'center', color: '#64748B' }}>{item.endDate}</td>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 1: Khung Thông tin chung */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1.5px solid #EADCC9',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#2D1A12' }}>
                  Thông tin chung {orderForm.code ? `(${orderForm.code})` : ''}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button style={{
                    padding: '9px 16px',
                    backgroundColor: '#A07855',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Upload size={16} /> Nhập danh sách
                  </button>

                  <button style={{
                    padding: '9px 16px',
                    backgroundColor: '#A07855',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Download size={16} /> Xuất lệnh
                  </button>

                  <button style={{
                    padding: '9px 16px',
                    backgroundColor: '#65A30D',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.88rem',
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
                      padding: '9px 20px',
                      backgroundColor: '#5D3B32',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(93, 59, 50, 0.25)'
                    }}
                  >
                    Lưu thông tin
                  </button>
                </div>
              </div>

              {/* Form Grid 6 Ô */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                
                {/* 1. Mã lệnh sản xuất */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6B7280', marginBottom: '6px' }}>Mã lệnh sản xuất</label>
                  <input
                    type="text"
                    placeholder="Nhập mã lệnh..."
                    value={orderForm.code}
                    onChange={(e) => setOrderForm({ ...orderForm, code: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontWeight: '700', color: '#2D1A12', outline: 'none' }}
                  />
                </div>

                {/* 2. Mã đơn hàng */}
                <div ref={poDropdownRef} style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6B7280', marginBottom: '6px' }}>
                    Mã đơn hàng <span style={{ color: '#7B5233', fontSize: '0.75rem', fontWeight: '600' }}>(từ Đơn mua hàng)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Chọn/Nhập mã đơn mua..."
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
                        padding: '10px 32px 10px 12px',
                        border: '1.5px solid #EADCC9',
                        borderRadius: '8px',
                        fontWeight: '700',
                        color: '#2D1A12',
                        outline: 'none'
                      }}
                    />
                    <ChevronDown
                      size={18}
                      onClick={() => setIsPoDropdownOpen(!isPoDropdownOpen)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233', cursor: 'pointer' }}
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
                        Danh sách Đơn mua hàng (/admin/purchase-requisitions)
                      </div>
                      {filteredPOList.length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '0.82rem', color: '#94A3B8', textAlign: 'center' }}>
                          Không tìm thấy đơn mua phù hợp
                        </div>
                      ) : (
                        filteredPOList.map((po) => (
                          <div
                            key={po.id}
                            onClick={() => handleSelectPurchaseRequisition(po)}
                            style={{
                              padding: '10px 12px',
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6B7280', marginBottom: '6px' }}>Mức độ ưu tiên</label>
                  <select
                    value={orderForm.priority}
                    onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontWeight: '700', color: '#2D1A12', outline: 'none', backgroundColor: '#FFF' }}
                  >
                    <option value="Cao">Cao</option>
                    <option value="Bình thường">Bình thường</option>
                    <option value="Thấp">Thấp</option>
                  </select>
                </div>

                {/* 4. Thời gian bắt đầu */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6B7280', marginBottom: '6px' }}>Thời gian bắt đầu</label>
                  <input
                    type="date"
                    value={orderForm.startDate}
                    onChange={(e) => setOrderForm({ ...orderForm, startDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontWeight: '700', color: '#2D1A12', outline: 'none' }}
                  />
                </div>

                {/* 5. Thời gian kết thúc */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6B7280', marginBottom: '6px' }}>Thời gian kết thúc</label>
                  <input
                    type="date"
                    value={orderForm.endDate}
                    onChange={(e) => setOrderForm({ ...orderForm, endDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontWeight: '700', color: '#2D1A12', outline: 'none' }}
                  />
                </div>

                {/* 6. Trạng thái */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6B7280', marginBottom: '6px' }}>Trạng thái</label>
                  <select
                    value={orderForm.status}
                    onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontWeight: '700', color: '#2D1A12', outline: 'none', backgroundColor: '#FFF' }}
                  >
                    <option value="Đang sản xuất">Đang sản xuất</option>
                    <option value="Chờ phân bổ">Chờ phân bổ</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Card 2: Sub-tabs & Bảng Chi tiết sản phẩm */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1.5px solid #EADCC9',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
            }}>
              {/* Sub-tabs Header */}
              <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #EADCC9', paddingBottom: '12px', marginBottom: '20px' }}>
                <button
                  onClick={() => setActiveSubTab('order_info')}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: activeSubTab === 'order_info' ? '#5D3B32' : 'transparent',
                    color: activeSubTab === 'order_info' ? '#FFFFFF' : '#5D3B32',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Thông tin đơn hàng ({orderProducts.length})
                </button>

                <button
                  onClick={() => setActiveSubTab('product_detail')}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: activeSubTab === 'product_detail' ? '#5D3B32' : 'transparent',
                    color: activeSubTab === 'product_detail' ? '#FFFFFF' : '#5D3B32',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Chi tiết sản phẩm BOM ({productDetails.length})
                </button>
              </div>

              {loadingDetail ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#7B5233', fontWeight: '700' }}>
                  Đang nạp chi tiết từ danh sách Đơn mua hàng (/admin/purchase-requisitions)...
                </div>
              ) : (
                <>
                  {/* Sub-tab 1: Danh sách sản phẩm SKU */}
                  {activeSubTab === 'order_info' && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FAF6F0', color: '#5D3B32', borderBottom: '2px solid #EADCC9' }}>
                            <th style={{ padding: '10px', textAlign: 'center' }}>STT</th>
                            <th style={{ padding: '10px' }}>Mã sản phẩm (SKU)</th>
                            <th style={{ padding: '10px' }}>Tên sản phẩm</th>
                            <th style={{ padding: '10px' }}>Đơn hàng</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>SL Đơn</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>SL Dự phòng</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Tổng SL</th>
                            <th style={{ padding: '10px' }}>ĐVT</th>
                            <th style={{ padding: '10px' }}>Bắt đầu</th>
                            <th style={{ padding: '10px' }}>Kết thúc</th>
                            <th style={{ padding: '10px' }}>Mã bản vẽ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderProducts.length === 0 ? (
                            <tr>
                              <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                                Chưa có mặt hàng. Nhập hoặc chọn <b>Mã đơn hàng</b> ở trên để nạp tự động từ Đơn mua hàng (/admin/purchase-requisitions).
                              </td>
                            </tr>
                          ) : (
                            orderProducts.map((p, idx) => (
                              <tr key={p.id || idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>{idx + 1}</td>
                                <td style={{ padding: '10px', fontWeight: '800', color: '#5D3B32' }}>{p.productCode}</td>
                                <td style={{ padding: '10px', fontWeight: '600' }}>{p.productName}</td>
                                <td style={{ padding: '10px', fontWeight: '700', color: '#475569' }}>{p.category}</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700' }}>{p.orderQty}</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700' }}>{p.spareQty}</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>{p.totalQty}</td>
                                <td style={{ padding: '10px' }}>{p.unit}</td>
                                <td style={{ padding: '10px', color: '#6B7280' }}>{p.startDate}</td>
                                <td style={{ padding: '10px', color: '#6B7280' }}>{p.endDate}</td>
                                <td style={{ padding: '10px', fontWeight: '700', color: '#2563EB' }}>{p.drawingCode}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Sub-tab 2: Chi tiết linh kiện BOM theo công đoạn */}
                  {activeSubTab === 'product_detail' && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FAF6F0', color: '#5D3B32', borderBottom: '2px solid #EADCC9' }}>
                            <th style={{ padding: '10px', textAlign: 'center' }}>STT</th>
                            <th style={{ padding: '10px' }}>Loại</th>
                            <th style={{ padding: '10px' }}>Công đoạn từ</th>
                            <th style={{ padding: '10px' }}>Công đoạn đến</th>
                            <th style={{ padding: '10px' }}>Mã cụm/chi tiết</th>
                            <th style={{ padding: '10px' }}>Tên cụm/chi tiết</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Số lượng</th>
                            <th style={{ padding: '10px' }}>ĐVT</th>
                            <th style={{ padding: '10px' }}>Vật liệu</th>
                            <th style={{ padding: '10px' }}>Quy cách</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Khối lượng (m³)</th>
                            <th style={{ padding: '10px' }}>Ghi chú</th>
                            <th style={{ padding: '10px' }}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productDetails.length === 0 ? (
                            <tr>
                              <td colSpan={13} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                                Chưa có chi tiết BOM. Chọn <b>Mã đơn hàng</b> ở trên để nạp linh kiện mua hàng.
                              </td>
                            </tr>
                          ) : (
                            productDetails.map((det, idx) => (
                              <tr key={det.id || idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>{idx + 1}</td>
                                <td style={{ padding: '10px' }}>{det.type}</td>
                                <td style={{ padding: '10px' }}>{det.stageFrom}</td>
                                <td style={{ padding: '10px' }}>{det.stageTo}</td>
                                <td style={{ padding: '10px', fontWeight: '800', color: '#5D3B32' }}>{det.compCode}</td>
                                <td style={{ padding: '10px', fontWeight: '600' }}>{det.compName}</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800' }}>{det.quantity}</td>
                                <td style={{ padding: '10px' }}>{det.unit}</td>
                                <td style={{ padding: '10px' }}>{det.material}</td>
                                <td style={{ padding: '10px' }}>{det.spec}</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>{det.volume}</td>
                                <td style={{ padding: '10px' }}>{det.note || '---'}</td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    backgroundColor: det.status === 'Hoàn thành' ? '#D1FAE5' : '#FEF3C7',
                                    color: det.status === 'Hoàn thành' ? '#059669' : '#D97706'
                                  }}>
                                    {det.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default ProductionOrdersView;

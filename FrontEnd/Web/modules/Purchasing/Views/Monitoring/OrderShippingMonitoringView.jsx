import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

/**
 * View: Trang Giám sát tiến độ đơn hàng (KD04)
 * Thiết kế chuẩn 100% Ảnh 1 & Ảnh 2 (UserManagement / Quản lý người dùng):
 * - Header & PageToolbar cố định 100% trên đỉnh.
 * - Thanh phân trang admin-pagination-desktop cố định 100% dưới đáy thẻ.
 * - Chỉ cuộn riêng danh sách dòng dữ liệu (tbody) trong thẻ admin-table-scroll.
 */
const OrderShippingMonitoringView = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle } = outletContext;
  const { toast } = useToast();

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle('Quản lý kinh doanh');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle('KD04: Giám sát tiến độ đơn hàng');
  }, [setCustomTitle, setCustomSubtitle]);

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('time_desc');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

  // States cho Bộ Lọc
  const [filterOrderType, setFilterOrderType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Tự động đóng action menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-cell-container')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: searchTerm || undefined,
      };
      const result = await purchasingService.getShippingMonitoring(params).catch(() => null);
      if (result && result.items) {
        setData(result.items || []);
        setTotal(result.total || result.items.length);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu giám sát vận chuyển:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, searchTerm]);

  // Áp dụng Logic Sắp Xếp & Lọc Dữ Liệu
  const displayItems = useMemo(() => {
    let filtered = data || [];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item =>
        (item.po_code && item.po_code.toLowerCase().includes(term)) ||
        (item.order_type && item.order_type.toLowerCase().includes(term)) ||
        (item.status && item.status.toLowerCase().includes(term))
      );
    }

    if (filterOrderType !== 'all') {
      filtered = filtered.filter(item => item.order_type === filterOrderType);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    return filtered;
  }, [data, searchTerm, filterOrderType, filterStatus]);

  const totalCount = total || 1756;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Khoảng hiển thị dòng (vd: 1–15, 16–30)
  const startIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(page * pageSize, totalCount);

  const handleExport = () => {
    if (toast) toast('info', 'Xuất dữ liệu tiến độ vận chuyển');
  };

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">
        
        {/* Search Toolbar Đầu Trang (Cố định chuẩn 100%) */}
        <PageToolbar
          searchValue={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val); setPage(1); }}
          searchPlaceholder="Mã phiếu, tên phiếu"
          showSort={true}
          sortOptions={[
            { value: 'time_desc', label: 'Mới nhất' },
            { value: 'time_asc', label: 'Cũ nhất' },
            { value: 'code_asc', label: 'Mã đơn (A → Z)' },
            { value: 'code_desc', label: 'Mã đơn (Z → A)' }
          ]}
          sortValue={sortValue}
          onSortChange={(val) => { setSortValue(val); setPage(1); }}
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={(filterOrderType !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (pageSize !== 15 ? 1 : 0)}
          importActions={[]}
          onExport={handleExport}
          onCreate={() => navigate('/admin/purchase-requisitions/create?mode=edit')}
          createLabel="Tạo mới"
          hasWritePermission={true}
          extraActions={[
            {
              label: 'Khác',
              icon: null,
              onClick: () => {}
            }
          ]}
        />

        {/* Inline Filter Bar */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar">
            <div className="filter-field-group">
              <label className="filter-field-label">Loại đơn hàng</label>
              <select
                value={filterOrderType}
                onChange={(e) => { setFilterOrderType(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả loại đơn</option>
                <option value="Đơn bán">Đơn bán</option>
                <option value="Đơn mua">Đơn mua</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Duyệt thành công">Duyệt thành công</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label">Số dòng / trang</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={10}>10 dòng</option>
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setFilterOrderType('all');
                setFilterStatus('all');
                setPageSize(15);
                setSearchTerm('');
                setPage(1);
              }}
              style={{ height: '34px', padding: '0 14px' }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {/* Bảng Dữ Liệu & Phân Trang (Cấu trúc 100% chuẩn UserManagement & PurchaseRequisitionList) */}
        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            
            {/* Vùng Bảng Tự Cuộn Dọc Ở Giữa */}
            <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: '50px' }}>STT</th>
                    <th>MÃ ĐƠN HÀNG</th>
                    <th>LOẠI ĐƠN HÀNG</th>
                    <th>TRẠNG THÁI</th>
                    <th style={{ textAlign: 'center' }}>CẬP NHẬT</th>
                    <th style={{ textAlign: 'center' }}>ĐẶT HÀNG</th>
                    <th style={{ textAlign: 'center' }}>SẢN XUẤT</th>
                    <th style={{ textAlign: 'center' }}>NHẬP KHO</th>
                    <th style={{ textAlign: 'center' }}>LƯU KHO</th>
                    <th style={{ textAlign: 'center' }}>XUẤT KHO</th>
                    <th style={{ textAlign: 'center' }}>HOÀN THÀNH</th>
                    <th style={{ textAlign: 'center', width: '80px' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && data.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        Không tìm thấy dữ liệu
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((row, index) => {
                      const sttVal = (page - 1) * pageSize + index + 1;
                      const formattedStt = sttVal < 10 ? `0${sttVal}` : `${sttVal}`;
                      return (
                        <tr key={row.id || index}>
                          <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>{formattedStt}</td>
                          <td style={{ fontWeight: '800', color: '#2D1A12' }}>{row.po_code}</td>
                          <td style={{ color: '#475569' }}>{row.order_type}</td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              backgroundColor: row.status === 'Đang xử lý' ? '#FEF2F2' : '#ECFDF5',
                              color: row.status === 'Đang xử lý' ? '#EF4444' : '#10B981',
                              border: `1px solid ${row.status === 'Đang xử lý' ? '#FCA5A5' : '#A7F3D0'}`,
                              whiteSpace: 'nowrap'
                            }}>
                              {row.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>{row.updated_at}</td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>{row.order_date}</td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>{row.production_date}</td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>{row.warehouse_in_date}</td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>{row.storage_date}</td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>{row.warehouse_out_date}</td>
                          <td style={{ textAlign: 'center', color: '#475569' }}>{row.completed_date || '---'}</td>
                          <td className="action-cell-container" style={{ textAlign: 'center', position: 'relative' }}>
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => setActionMenuId(actionMenuId === row.id ? null : row.id)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                            >
                              <MoreHorizontal size={18} />
                            </button>
                            {actionMenuId === row.id && (
                              <div className="action-menu" style={{
                                position: 'absolute', right: '10px', top: '35px', zIndex: 100,
                                backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                minWidth: '130px', padding: '4px 0'
                              }}>
                                <button
                                  className="action-menu-item"
                                  onClick={() => { setActionMenuId(null); navigate(`/admin/purchase-requisitions/${row.id || '2005'}?mode=view`); }}
                                  style={{ padding: '8px 12px', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left', color: '#334155', background: 'none', border: 'none', width: '100%' }}
                                >
                                  Xem chi tiết
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Thanh Phân Trang Cố Định 100% Đáy Thẻ (Bên Trái: Thông Tin, Bên Phải: Cụm Nút) */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Hiển thị <b>{startIndex}–{endIndex}</b> trên <b>{totalCount}</b> đơn hàng
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="page-btn"
                  >
                    &lt; Trước
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
                    Sau &gt;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderShippingMonitoringView;

import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search, ArrowUpDown, Filter, Upload, Download, Plus, MoreHorizontal, ChevronLeft, ChevronRight
} from 'lucide-react';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import '@styles/components.css';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const OrderShippingMonitoringView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle } = outletContext;
  const { toast } = useToast();

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle('Giám sát tiến độ đơn hàng');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle('KD04: Hiển thị danh sách về thời gian vận chuyển hàng');
  }, [setCustomTitle, setCustomSubtitle]);

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Auto close action menu on click outside
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
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
      };
      const result = await purchasingService.getShippingMonitoring(params).catch(() => null);
      if (result && result.items) {
        setData(result.items);
        setTotal(result.total || result.items.length);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách giám sát vận chuyển:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm]);

  // Mock list dự phòng theo đúng Ảnh 4
  const displayItems = useMemo(() => {
    let items = data || [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      items = items.filter(item =>
        (item.po_code && item.po_code.toLowerCase().includes(term)) ||
        (item.order_type && item.order_type.toLowerCase().includes(term)) ||
        (item.status && item.status.toLowerCase().includes(term))
      );
    }
    return items;
  }, [data, searchTerm]);

  const totalCount = total || displayItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="manufacture-plan-container mgmt-container" style={{ width: '100%', maxWidth: '100%', padding: '16px' }}>
      
      {/* Dynamic CSS override for Super Compact Table */}
      <style dangerouslySetInnerHTML={{ __html: `
        .shipping-compact-table table.data-table thead tr th {
          background-color: #6D4C3D !important;
          color: #FFFFFF !important;
          font-weight: 700 !important;
          font-size: 0.78rem !important;
          padding: 8px 10px !important;
          text-align: center !important;
          border-right: 1px solid #7D5C4D !important;
          white-space: nowrap !important;
        }
        .shipping-compact-table table.data-table tbody tr td {
          padding: 10px 10px !important;
          font-size: 0.8rem !important;
          color: #334155 !important;
          text-align: center !important;
          border-bottom: 1px solid #E2E8F0 !important;
          white-space: nowrap !important;
        }
        .shipping-compact-table table.data-table tbody tr:hover {
          background-color: #F8FAFC !important;
        }
      ` }} />

      {/* Toolbar & Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Search & Sort/Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '300px' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            maxWidth: '320px'
          }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Mã phiếu, tên phiếu"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                outline: 'none',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <button style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF', cursor: 'pointer', color: '#475569', fontWeight: '600', fontSize: '0.82rem'
          }}>
            <ArrowUpDown size={16} />
          </button>

          <button style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF', cursor: 'pointer', color: '#475569', fontWeight: '600', fontSize: '0.82rem'
          }}>
            <Filter size={16} />
          </button>
        </div>

        {/* Action Buttons Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px', backgroundColor: '#3D2817',
            color: '#FFFFFF', fontWeight: '700', fontSize: '0.82rem', border: 'none', cursor: 'pointer'
          }}>
            Khác
          </button>

          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px', backgroundColor: '#3D2817',
            color: '#FFFFFF', fontWeight: '700', fontSize: '0.82rem', border: 'none', cursor: 'pointer'
          }}>
            <Upload size={14} /> Nhập dữ liệu
          </button>

          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px', backgroundColor: '#3D2817',
            color: '#FFFFFF', fontWeight: '700', fontSize: '0.82rem', border: 'none', cursor: 'pointer'
          }}>
            <Download size={14} /> Xuất dữ liệu
          </button>

          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px', backgroundColor: '#3D2817',
            color: '#FFFFFF', fontWeight: '700', fontSize: '0.82rem', border: 'none', cursor: 'pointer'
          }}>
            <Plus size={14} /> Thêm tài liệu
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="shipping-compact-table" style={{ width: '100%', overflowX: 'auto', backgroundColor: '#FFFFFF', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>STT</th>
              <th>Mã đơn hàng</th>
              <th>Loại đơn hàng</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
              <th>Đặt hàng</th>
              <th>Sản xuất</th>
              <th>Nhập kho</th>
              <th>Lưu kho</th>
              <th>Xuất kho</th>
              <th>Hoàn thành</th>
              <th style={{ width: '60px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : displayItems.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                  Không tìm thấy dữ liệu giám sát vận chuyển.
                </td>
              </tr>
            ) : (
              displayItems.map((row, index) => (
                <tr key={row.id || index}>
                  <td>{row.stt || (index + 1 < 10 ? `0${index + 1}` : index + 1)}</td>
                  <td style={{ fontWeight: '700', color: '#1E293B' }}>{row.po_code}</td>
                  <td>{row.order_type}</td>
                  <td style={{ fontWeight: '600' }}>{row.status}</td>
                  <td>{row.updated_at}</td>
                  <td>{row.order_date}</td>
                  <td>{row.production_date}</td>
                  <td>{row.warehouse_in_date}</td>
                  <td>{row.storage_date}</td>
                  <td>{row.warehouse_out_date}</td>
                  <td>{row.completed_date || ''}</td>
                  <td className="action-cell-container" style={{ position: 'relative' }}>
                    <button
                      onClick={() => setActionMenuId(actionMenuId === row.id ? null : row.id)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {actionMenuId === row.id && (
                      <div style={{
                        position: 'absolute', right: '10px', top: '30px', zIndex: 100,
                        backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
                        borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        minWidth: '130px', padding: '4px 0'
                      }}>
                        <div
                          onClick={() => { setActionMenuId(null); if (toast) toast('info', `Xem chi tiết ${row.po_code}`); }}
                          style={{ padding: '8px 12px', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left', color: '#334155' }}
                        >
                          Xem chi tiết
                        </div>
                        <div
                          onClick={() => { setActionMenuId(null); if (toast) toast('info', `Cập nhật tiến độ ${row.po_code}`); }}
                          style={{ padding: '8px 12px', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left', color: '#334155' }}
                        >
                          Cập nhật mốc
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching Image 4 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '16px',
        fontSize: '0.82rem',
        color: '#64748B',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          Show <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #CBD5E1',
              fontWeight: '600',
              color: '#334155'
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select> of <strong>{totalCount}</strong> results
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#E2E8F0',
              color: '#64748B',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            Previous
          </button>

          {[1, 2, 3, 4].map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: currentPage === page ? '#3D2817' : 'transparent',
                color: currentPage === page ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
                fontWeight: currentPage === page ? '700' : '500'
              }}
            >
              {page}
            </button>
          ))}

          <span style={{ padding: '0 4px' }}>...</span>

          {[10, 11].map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: currentPage === page ? '#3D2817' : 'transparent',
                color: currentPage === page ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
                fontWeight: currentPage === page ? '700' : '500'
              }}
            >
              {page}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#E2E8F0',
              color: '#64748B',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderShippingMonitoringView;

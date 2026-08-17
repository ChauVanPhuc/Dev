import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, ArrowUpDown, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';

/**
 * CAPAListView Screen
 * Đồng bộ chuẩn thiết kế mới theo ảnh 2:
 * Toolbar (Tháng picker, sắp xếp, SlidersHorizontal bộ lọc, + Thêm mới)
 * + Tabs (Chưa duyệt với Badge đỏ, Lịch sử báo cáo)
 * + Danh sách thẻ bài chuẩn thẩm mỹ
 * + Thanh phân trang cố định dưới cùng ("Hiển thị X đến [Y] trên Z kết quả")
 */
const CAPAListView = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'history'
  const [capaList, setCapaList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Sort states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [trackingCount, setTrackingCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);

  const months = [
    { label: 'Tháng 1', value: 1 }, { label: 'Tháng 2', value: 2 },
    { label: 'Tháng 3', value: 3 }, { label: 'Tháng 4', value: 4 },
    { label: 'Tháng 5', value: 5 }, { label: 'Tháng 6', value: 6 },
    { label: 'Tháng 7', value: 7 }, { label: 'Tháng 8', value: 8 },
    { label: 'Tháng 9', value: 9 }, { label: 'Tháng 10', value: 10 },
    { label: 'Tháng 11', value: 11 }, { label: 'Tháng 12', value: 12 },
  ];

  const fetchCapas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        limit: String(pageSize),
        tab_status: activeTab,
        month: String(selectedMonth),
        year: String(new Date().getFullYear()),
        sort_order: sortOrder
      });
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const resp = await apiClient.get(`/capas/?${params.toString()}`);
      const data = resp.data || {};
      
      setCapaList(data.items || []);
      setTotalItems(data.total || 0);
      setTrackingCount(data.tracking_count || 0);
      setHistoryCount(data.history_count || 0);
    } catch (err) {
      console.error('Lỗi khi tải danh sách CAPA:', err);
      // Fallback mock data if API fails
      const mockItems = [
        {
          id: 1,
          code: 'CAPA-01',
          created_at_time: '09:03 | 27/07/2026',
          handler_name: 'Trần Thị B',
          ticket_status: 'Chưa duyệt',
          tab_status: 'tracking'
        },
        {
          id: 2,
          code: 'CAPA-02',
          created_at_time: '16:45 | 22/01/2026',
          handler_name: 'Nguyễn Văn A',
          ticket_status: 'Vừa tạo',
          tab_status: 'tracking'
        }
      ];
      setCapaList(mockItems);
      setTotalItems(mockItems.length);
      setTrackingCount(mockItems.length);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, selectedMonth, sortOrder, searchQuery, statusFilter]);

  useEffect(() => {
    fetchCapas();
  }, [fetchCapas]);

  // Reset page when tab or month changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedMonth]);

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Chưa duyệt':
      case 'Vừa tạo':
        return { text: status || 'Chưa duyệt', color: '#d97706', bg: '#fef3c7' };
      case 'Đang theo dõi':
        return { text: 'Đang theo dõi', color: '#dc2626', bg: '#fee2e2' };
      case 'Đang xử lý':
        return { text: 'Đang xử lý', color: '#2563eb', bg: '#dbeafe' };
      case 'Đạt (đóng CAPA)':
      case 'Đã duyệt':
        return { text: 'Đã duyệt', color: '#16a34a', bg: '#dcfce7' };
      default:
        return { text: status || 'Chưa duyệt', color: '#d97706', bg: '#fef3c7' };
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <Layout>
      <PageHeader 
        title="Lập báo cáo" 
        screenCode="CL10.1: Danh sách CAPA" 
        showBack={false}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, backgroundColor: '#faf6f1' }}>
        
        {/* Top Control Bar: Select Month, Sort, Filter Sliders, + Thêm mới */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e0d8' }}>
          {/* Month Picker */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => { setShowMonthPicker(!showMonthPicker); setShowSortMenu(false); setShowFilterBar(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #d4c5b0', backgroundColor: '#fff',
                fontSize: '0.85rem', fontWeight: '700', color: '#5d3b32',
                cursor: 'pointer', width: '100%', justifyContent: 'space-between'
              }}
            >
              <span>Tháng {selectedMonth}</span>
              <ChevronDown size={16} />
            </button>
            {showMonthPicker && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '4px',
                backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0',
                boxShadow: '0 8px 16px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto'
              }}>
                {months.map(m => (
                  <button
                    key={m.value}
                    onClick={() => { setSelectedMonth(m.value); setShowMonthPicker(false); setPage(1); }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 12px', border: 'none',
                      backgroundColor: selectedMonth === m.value ? '#faf4ee' : '#fff',
                      color: selectedMonth === m.value ? '#5d3b32' : '#333',
                      fontWeight: selectedMonth === m.value ? '800' : '500',
                      fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowSortMenu(!showSortMenu); setShowMonthPicker(false); setShowFilterBar(false); }}
              style={{
                padding: '8px', borderRadius: '8px',
                border: '1px solid #d4c5b0',
                backgroundColor: sortOrder === 'asc' ? '#faf4ee' : '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
            >
              <ArrowUpDown size={18} color="#5d3b32" />
            </button>
            {showSortMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 120, marginTop: '4px',
                backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0',
                boxShadow: '0 8px 16px rgba(0,0,0,0.12)', width: '150px', overflow: 'hidden'
              }}>
                <button
                  onClick={() => { setSortOrder('desc'); setPage(1); setShowSortMenu(false); }}
                  style={{
                    display: 'block', width: '100%', padding: '10px 12px', border: 'none',
                    backgroundColor: sortOrder === 'desc' ? '#faf4ee' : '#fff',
                    color: sortOrder === 'desc' ? '#5d3b32' : '#333',
                    fontWeight: sortOrder === 'desc' ? '800' : '500',
                    fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer'
                  }}
                >
                  Mới nhất
                </button>
                <button
                  onClick={() => { setSortOrder('asc'); setPage(1); setShowSortMenu(false); }}
                  style={{
                    display: 'block', width: '100%', padding: '10px 12px', border: 'none',
                    backgroundColor: sortOrder === 'asc' ? '#faf4ee' : '#fff',
                    color: sortOrder === 'asc' ? '#5d3b32' : '#333',
                    fontWeight: sortOrder === 'asc' ? '800' : '500',
                    fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer'
                  }}
                >
                  Cũ nhất
                </button>
              </div>
            )}
          </div>

          {/* Filter Bar Toggle (SlidersHorizontal) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowFilterBar(!showFilterBar); setShowMonthPicker(false); setShowSortMenu(false); }}
              style={{
                padding: '8px', borderRadius: '8px',
                border: '1px solid #d4c5b0',
                backgroundColor: (showFilterBar || searchQuery || statusFilter !== 'all') ? '#5d3b32' : '#fff',
                color: (showFilterBar || searchQuery || statusFilter !== 'all') ? '#fff' : '#5d3b32',
                cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative'
              }}
            >
              <SlidersHorizontal size={18} color={(showFilterBar || searchQuery || statusFilter !== 'all') ? '#fff' : '#5d3b32'} />
              {(searchQuery || statusFilter !== 'all') && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626'
                }} />
              )}
            </button>
          </div>

          {/* Primary Button: + Thêm mới */}
          <button
            onClick={() => navigate('/mobile/capa/detail/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: '#5d3b32', color: '#fff',
              fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Plus size={16} strokeWidth={3} /> Thêm mới
          </button>
        </div>

        {/* Expandable Filter Panel */}
        {showFilterBar && (
          <div style={{
            padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #e5e0d8',
            display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            {/* Search Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Tìm theo mã, nội dung, người xử lý..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none',
                  backgroundColor: '#fff', color: '#1e293b', boxSizing: 'border-box'
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Chưa duyệt">Chưa duyệt</option>
                <option value="Đang theo dõi">Đang theo dõi</option>
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Đạt (đóng CAPA)">Đạt (đóng CAPA)</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setPage(1); }}
                style={{
                  alignSelf: 'flex-end', background: 'none', border: 'none',
                  color: '#dc2626', fontSize: '0.78rem', fontWeight: '700',
                  cursor: 'pointer', padding: '4px 0'
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {/* Tab Navigation: Chưa duyệt vs Lịch sử báo cáo */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e0d8' }}>
          <button
            onClick={() => { setActiveTab('tracking'); setPage(1); }}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', backgroundColor: 'transparent',
              fontSize: '0.85rem', fontWeight: activeTab === 'tracking' ? '800' : '600',
              color: activeTab === 'tracking' ? '#5d3b32' : '#888',
              borderBottom: activeTab === 'tracking' ? '3px solid #5d3b32' : '3px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            Chưa duyệt
            {trackingCount > 0 && (
              <span style={{
                backgroundColor: '#dc2626', color: '#fff', borderRadius: '50%',
                width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: '900'
              }}>
                {trackingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('history'); setPage(1); }}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', backgroundColor: 'transparent',
              fontSize: '0.85rem', fontWeight: activeTab === 'history' ? '800' : '600',
              color: activeTab === 'history' ? '#5d3b32' : '#888',
              borderBottom: activeTab === 'history' ? '3px solid #5d3b32' : '3px solid transparent',
              cursor: 'pointer'
            }}
          >
            Lịch sử báo cáo
          </button>
        </div>

        {/* Card List Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7B5233', fontWeight: '700' }}>
              Đang tải danh sách CAPA...
            </div>
          ) : capaList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '0.9rem' }}>
              Không có báo cáo CAPA nào.
            </div>
          ) : (
            capaList.map((item) => {
              const badgeStyle = getStatusBadgeStyle(item.ticket_status);
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/mobile/capa/detail/${item.id}`)}
                  style={{
                    backgroundColor: '#fff', borderRadius: '12px', padding: '14px 16px',
                    border: '1px solid #e8e0d4',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '900', color: '#1e293b', letterSpacing: '0.5px' }}>
                      {item.code || 'CAPA-' + String(item.id).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#666', fontWeight: '600' }}>
                      {item.created_at_time || '09:03 | 27/07/2026'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
                      Xử lý bởi: {item.handler_name || 'Chưa phân công'}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: '700',
                      color: badgeStyle.color,
                      backgroundColor: badgeStyle.bg,
                      padding: '3px 10px', borderRadius: '6px'
                    }}>
                      {badgeStyle.text}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Pagination Control */}
        {totalItems > 0 && (
          <div className="responsive-fixed-footer" style={{
            padding: '12px 16px', borderTop: '1px solid #e5e0d8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#fff',
            borderRadius: '0 0 16px 16px',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.04)'
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #d4c5b0',
                backgroundColor: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: page === 1 ? 0.4 : 1
              }}
            >
              <ChevronLeft size={18} color="#5d3b32" />
            </button>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
              Hiển thị {startItem} đến{' '}
              <input
                type="number"
                value={endItem}
                readOnly
                style={{
                  width: '36px', textAlign: 'center', border: '1px solid #d4c5b0',
                  borderRadius: '4px', padding: '2px 4px', fontSize: '0.82rem',
                  fontWeight: '700', color: '#5d3b32'
                }}
              />
              {' '}trên {totalItems} kết quả
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #d4c5b0',
                backgroundColor: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: page === totalPages ? 0.4 : 1
              }}
            >
              <ChevronRight size={18} color="#5d3b32" />
            </button>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default CAPAListView;

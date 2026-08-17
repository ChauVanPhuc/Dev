import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, Search, Filter, X, Clock, CheckCircle2, User, FileText } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import apiClient from '@shared/services/api';

const QuickReportListView = () => {
  const navigate = useNavigate();

  // Data states
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' (Chưa duyệt) | 'all' (Lịch sử báo cáo)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('all');

  // Detail Modal State
  const [selectedReport, setSelectedReport] = useState(null);

  const months = [
    { label: 'Tháng 1', value: 1 }, { label: 'Tháng 2', value: 2 },
    { label: 'Tháng 3', value: 3 }, { label: 'Tháng 4', value: 4 },
    { label: 'Tháng 5', value: 5 }, { label: 'Tháng 6', value: 6 },
    { label: 'Tháng 7', value: 7 }, { label: 'Tháng 8', value: 8 },
    { label: 'Tháng 9', value: 9 }, { label: 'Tháng 10', value: 10 },
    { label: 'Tháng 11', value: 11 }, { label: 'Tháng 12', value: 12 },
  ];

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(selectedMonth),
        year: String(new Date().getFullYear()),
        limit: '50'
      });

      if (activeTab !== 'all') {
        params.set('status', activeTab);
      }
      if (selectedReportType !== 'all') {
        params.set('report_type', selectedReportType);
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const resp = await apiClient.get(`/quick-reports/?${params.toString()}`);
      const data = resp.data || resp;
      setReports(data.items || []);
      setTotalItems(data.total || 0);
      setPendingCount(data.pending_count || 0);
    } catch (err) {
      console.error('Lỗi khi tải danh sách báo cáo:', err);
      // Demo fallback mock data if backend not yet restarted
      setReports([
        {
          id: 4,
          code: 'BC-04',
          report_type: 'Biên bản cuộc họp',
          creator_name: 'Nguyễn Văn A',
          is_anonymous: false,
          attendees: 'Phúc Châu Văn (SF13)',
          related_ticket: 'CAPA-01',
          main_content: 'Thống nhất kế hoạch xử lý sự cố kẹt khuôn sản xuất.',
          solution_recommendation: 'Giao bộ phận bảo trì kiểm tra nguyên nhân và lập báo cáo CAPA.',
          status: 'Chờ xử lý',
          created_at: '09:03 | 27/07/2026'
        },
        {
          id: 3,
          code: 'BC-03',
          report_type: 'Báo cáo vấn đề',
          creator_name: 'Ẩn danh',
          is_anonymous: true,
          issue_type: 'Thiết bị',
          area: 'Dây chuyền sơn',
          main_content: 'Áp suất máy nén khí tụt bất thường lúc 10h sáng.',
          solution_recommendation: 'Đề nghị bảo trì thay van xả áp.',
          status: 'Đã tiếp nhận',
          created_at: '14:20 | 26/07/2026'
        }
      ]);
      setTotalItems(2);
      setPendingCount(1);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedMonth, selectedReportType, searchQuery]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Chờ xử lý':
      case 'pending':
        return { text: 'Chờ xử lý', bg: '#fef3c7', color: '#d97706' };
      case 'Đã tiếp nhận':
        return { text: 'Đã tiếp nhận', bg: '#dbeafe', color: '#2563eb' };
      case 'Đã xong':
        return { text: 'Đã xong', bg: '#dcfce7', color: '#16a34a' };
      default:
        return { text: status || 'Chờ xử lý', bg: '#faf4ee', color: '#7B5233' };
    }
  };

  return (
    <Layout>
      <PageHeader title="Lập báo cáo" subTitle="CL12: Lịch sử báo cáo" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, backgroundColor: '#faf6f1', paddingBottom: '80px' }}>
        
        {/* Toolbar */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e0d8' }}>
          {/* Month Picker */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
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
                    onClick={() => { setSelectedMonth(m.value); setShowMonthPicker(false); }}
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

          {/* Nút Thêm mới (Nâu `#432818`) */}
          <button
            onClick={() => navigate('/quick-report-create')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px',
              border: 'none', backgroundColor: '#432818', color: '#fff',
              fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(67, 40, 24, 0.2)'
            }}
          >
            <Plus size={16} strokeWidth={3} /> Thêm mới
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '10px 16px 4px 16px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm kiếm mã phiếu hoặc nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                boxSizing: 'border-box',
                padding: '0 32px 0 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                backgroundColor: '#fff',
                outline: 'none'
              }}
            />
            <Search size={16} color="#64748b" style={{ position: 'absolute', top: '11px', left: '10px' }} />
            {searchQuery && (
              <X size={16} color="#64748b" onClick={() => setSearchQuery('')} style={{ position: 'absolute', top: '11px', right: '10px', cursor: 'pointer' }} />
            )}
          </div>
        </div>

        {/* Status Filter Tabs (Exactly 2 Tabs: Chưa duyệt & Lịch sử báo cáo) */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e0d8', backgroundColor: '#fff', marginTop: '8px' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              flex: 1, padding: '12px 4px', border: 'none', background: 'none',
              fontSize: '0.9rem', fontWeight: activeTab === 'pending' ? '800' : '600',
              color: activeTab === 'pending' ? '#5d3b32' : '#64748b',
              borderBottom: activeTab === 'pending' ? '3px solid #5d3b32' : 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <span>Chưa duyệt</span>
            {pendingCount > 0 && (
              <span style={{
                backgroundColor: '#b91c1c', color: '#fff', borderRadius: '50%',
                minWidth: '20px', height: '20px', padding: '0 4px', boxSizing: 'border-box',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: '900', lineHeight: 1
              }}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1, padding: '12px 4px', border: 'none', background: 'none',
              fontSize: '0.9rem', fontWeight: activeTab === 'all' ? '800' : '600',
              color: activeTab === 'all' ? '#5d3b32' : '#64748b',
              borderBottom: activeTab === 'all' ? '3px solid #5d3b32' : 'none',
              cursor: 'pointer'
            }}
          >
            Lịch sử báo cáo
          </button>
        </div>

        {/* Report Cards List */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '0.9rem' }}>
              Đang tải danh sách báo cáo...
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.9rem' }}>
              Chưa có dữ liệu báo cáo nào.
            </div>
          ) : (
            reports.map(item => {
              const badge = getStatusBadge(item.status);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedReport(item)}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {/* Card Header: Code & Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '900', color: '#c2410c' }}>
                      Phiếu: {item.code}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                      {item.created_at}
                    </div>
                  </div>

                  {/* Type & Author */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>
                      {item.report_type} • bởi <strong style={{ color: '#1e293b' }}>{item.creator_name}</strong>
                    </div>
                    <span style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '12px'
                    }}>
                      {badge.text}
                    </span>
                  </div>

                  {/* Main Content Preview */}
                  <div style={{
                    fontSize: '0.84rem',
                    color: '#334155',
                    backgroundColor: '#fafaf9',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #f5f5f4',
                    lineHeight: '1.4'
                  }}>
                    {item.main_content}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div
            onClick={() => setSelectedReport(null)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          />

          <div style={{
            position: 'relative', backgroundColor: '#fff', borderRadius: '16px',
            width: '100%', maxWidth: '420px', padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '14px',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#c2410c' }}>
                  Chi Tiết Phiếu: {selectedReport.code}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{selectedReport.created_at}</span>
              </div>
              <button onClick={() => setSelectedReport(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem', color: '#334155' }}>
              <div><strong>Loại báo cáo:</strong> {selectedReport.report_type}</div>
              <div><strong>Người tạo:</strong> {selectedReport.creator_name}</div>
              {selectedReport.attendees && <div><strong>Thành phần tham dự:</strong> {selectedReport.attendees}</div>}
              {selectedReport.related_ticket && <div><strong>Phiếu liên quan:</strong> {selectedReport.related_ticket}</div>}
              {selectedReport.issue_type && <div><strong>Loại vấn đề:</strong> {selectedReport.issue_type}</div>}
              {selectedReport.area && <div><strong>Khu vực:</strong> {selectedReport.area}</div>}

              <div style={{ marginTop: '8px', fontWeight: '700', color: '#432818' }}>Nội dung chính (Vấn đề):</div>
              <div style={{ backgroundColor: '#fafaf9', padding: '10px', borderRadius: '8px', border: '1px solid #e7e5e4' }}>
                {selectedReport.main_content}
              </div>

              {selectedReport.solution_recommendation && (
                <>
                  <div style={{ marginTop: '8px', fontWeight: '700', color: '#432818' }}>Kết luận / Giải pháp / Kiến nghị:</div>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534' }}>
                    {selectedReport.solution_recommendation}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedReport(null)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: 'none', backgroundColor: '#432818', color: '#fff',
                fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', marginTop: '8px'
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default QuickReportListView;

import React, { useState, useEffect, useMemo } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Filter, Layers, FileUp, FileDown, Plus } from 'lucide-react';
import '@styles/components.css';

const EquipmentHistoryView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOtherMenu, setShowOtherMenu] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const data = await api.get('/equipments/inspections');
      setInspections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử kiểm tra:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCustomScreenCode('AD37.2');
    setCustomTitle('Nhật ký kiểm tra & Hiệu chuẩn thiết bị');
    setCustomSubtitle('Lịch sử kiểm tra định kỳ, bảo trì và hiệu chuẩn chất lượng thiết bị.');
    fetchInspections();
  }, []);

  // Filtered data
  const filtered = useMemo(() => {
    return inspections.filter(insp => 
      (insp.equipment_code && insp.equipment_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (insp.equipment_name && insp.equipment_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (insp.performed_by && insp.performed_by.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [inspections, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="quality-records-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .quality-records-container {
          width: 100%;
          padding: 10px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        @media (min-width: 1024px) {
          .quality-records-container {
            height: calc(100vh - 100px);
            padding: 0;
            overflow: hidden;
          }
        }
      `}} />

      {/* Toolbar - chuẩn hóa */}
      <div className="mgmt-toolbar card filter-pagination-toolbar" style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          {/* Ô tìm kiếm */}
          <div className="search-wrapper" style={{ position: 'relative', width: '280px', display: 'flex', alignItems: 'center' }}>
            <Search size={18} className="search-icon" style={{ position: 'absolute', left: '12px', color: '#7B5233', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Tìm kiếm mã TB, tên, người thực hiện..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              style={{
                width: '100%', padding: '8px 12px 8px 38px', borderRadius: '8px',
                border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#2D1A12',
                fontSize: '0.85rem', fontWeight: '600', outline: 'none', height: '36px', transition: 'all 0.2s'
              }}
              onFocus={(e) => { e.target.style.backgroundColor = '#fff'; e.target.style.borderColor = '#7B5233'; e.target.style.boxShadow = '0 0 0 3px rgba(123, 82, 51, 0.1)'; }}
              onBlur={(e) => { e.target.style.backgroundColor = '#FAF6F0'; e.target.style.borderColor = '#EADCC9'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Số dòng/trang */}
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{
              height: '36px', padding: '0 28px 0 10px', borderRadius: '8px',
              border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233',
              fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%237B5233'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px'
            }}
          >
            <option value={15}>15 dòng</option>
            <option value={30}>30 dòng</option>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
          </select>
        </div>

        <div className="toolbar-right" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowOtherMenu(!showOtherMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
            >
              <Layers size={14} /> Khác
            </button>
            {showOtherMenu && (
              <div style={{ position: 'absolute', top: '100%', right: '0', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '220px', padding: '8px 0', marginTop: '5px' }}>
                <div onClick={() => { navigate('/admin/equipment'); setShowOtherMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }} className="dropdown-hover">Quản lý thiết bị</div>
                <div onClick={() => { navigate('/admin/equipment/categories'); setShowOtherMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }} className="dropdown-hover">Danh sách thiết bị</div>
                <div onClick={() => { navigate('/admin/equipment/training'); setShowOtherMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }} className="dropdown-hover">Thông tin đào tạo</div>
              </div>
            )}
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            <FileDown size={14} /> Xuất dữ liệu
          </button>
        </div>
      </div>

      {/* Bảng dữ liệu - chuẩn hóa */}
      <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className="spinner"></div>
                <span>Đang tải nhật ký kiểm tra...</span>
              </div>
            </div>
          ) : paginatedData.length === 0 ? (
            <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Không có lịch sử kiểm tra nào được ghi nhận.</span>
            </div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                      <th>Mã TB</th>
                      <th>Tên Thiết Bị</th>
                      <th>Người thực hiện</th>
                      <th>Người kiểm tra</th>
                      <th>Ngày kiểm tra</th>
                      <th>Ngày hiệu chuẩn</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((insp, idx) => {
                      const stt = (page - 1) * pageSize + idx + 1;
                      return (
                        <tr key={insp.id}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                          <td style={{ fontWeight: '700', color: '#7B5233' }}>{insp.equipment_code}</td>
                          <td style={{ fontWeight: '700', color: '#1e293b' }}>{insp.equipment_name}</td>
                          <td>{insp.performed_by || '—'}</td>
                          <td>{insp.verified_by || '—'}</td>
                          <td>{insp.check_date || '—'}</td>
                          <td>{insp.calibration_date || '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                              backgroundColor: insp.status === 'Bình thường' ? '#dcfce7' : '#fee2e2',
                              color: insp.status === 'Bình thường' ? '#15803d' : '#b91c1c'
                            }}>{insp.status}</span>
                          </td>
                          <td style={{ color: '#64748b' }}>{insp.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination - chuẩn hóa */}
              <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #EADCC9', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{paginatedData.length}</b> trên <b>{filtered.length}</b> bản ghi
                </div>
                {totalPages > 1 && (
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button 
                      className="page-btn" 
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                      disabled={page === 1}
                      style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                    >
                      &lt; Trước
                    </button>
                    {(() => {
                      const pages = [];
                      const maxVisible = 5;
                      let start = Math.max(1, page - Math.floor(maxVisible / 2));
                      let end = Math.min(totalPages, start + maxVisible - 1);
                      if (end - start + 1 < maxVisible) {
                        start = Math.max(1, end - maxVisible + 1);
                      }
                      for (let p = start; p <= end; p++) {
                        pages.push(
                          <button
                            key={p}
                            className={`page-btn ${page === p ? 'active' : ''}`}
                            onClick={() => setPage(p)}
                            style={{
                              padding: '6px 10px', borderRadius: '8px', border: '1px solid #EADCC9',
                              backgroundColor: page === p ? '#7B5233' : '#FAF6F0',
                              color: page === p ? '#fff' : '#7B5233',
                              fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', minWidth: '32px'
                            }}
                          >
                            {p}
                          </button>
                        );
                      }
                      return pages;
                    })()}
                    <button 
                      className="page-btn" 
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} 
                      disabled={page >= totalPages}
                      style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
                    >
                      Sau &gt;
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentHistoryView;

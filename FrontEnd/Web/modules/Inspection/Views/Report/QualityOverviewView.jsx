import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Filter, Edit, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const QualityOverviewView = () => {
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};

  // Cấu hình động mã màn hình, tên màn hình từ Database
  const { screenCode, title, subtitle, loading: metaLoading } = useScreenMetadataCached('/admin/quality');

  useEffect(() => {
    if (setCustomTitle && title) setCustomTitle(title);
    if (setCustomSubtitle && subtitle) setCustomSubtitle(subtitle);
    if (setCustomScreenCode && screenCode) setCustomScreenCode(screenCode);
  }, [title, subtitle, screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch dữ liệu công việc tồn đọng từ Backend (chỉ phiếu chưa xác nhận trong 24h)
  const fetchPendingTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get('/inspections/pending');
      if (Array.isArray(data)) {
        setPendingTasks(data);
      }
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  // Lọc tìm kiếm & gộp thành một công việc duy nhất
  const filteredTasks = useMemo(() => {
    if (pendingTasks.length === 0) return [];
    
    const summaryTask = {
      stt: "01",
      task_name: "Xác nhận hồ sơ kiểm tra",
      category: "Kiểm tra phiếu",
      priority: 3,
      status: "Chưa Làm",
      recorded_date: new Date(),
      completion_date: new Date(),
      notes: ""
    };
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (!summaryTask.task_name.toLowerCase().includes(q) && 
          !summaryTask.category.toLowerCase().includes(q)) {
        return [];
      }
    }
    
    return [summaryTask];
  }, [pendingTasks, searchQuery]);

  // Phân trang (ở đây chỉ có tối đa 1 dòng nên đơn giản)
  const paginatedTasks = useMemo(() => {
    return filteredTasks;
  }, [filteredTasks]);

  const totalPages = 1;

  const handleRowClick = () => {
    navigate('/admin/reports?unconfirmed_24h=true');
  };

  return (
    <div className="quality-records-container" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .badge-chualam {
          background-color: #FEF2F2;
          color: #EF4444;
          border: 1px solid #FCA5A5;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        .btn-toolbar-custom {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background-color: #7B5233;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-toolbar-custom:hover {
          background-color: #5D3E26;
        }
        .btn-secondary-custom {
          background-color: #FAF6F0;
          color: #7B5233;
          border: 1px solid #EADCC9;
        }
        .btn-secondary-custom:hover {
          background-color: #F2ECE4;
        }
        .edit-action-btn {
          color: #7B5233;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        .edit-action-btn:hover {
          background-color: #FAF6F0;
        }
      ` }} />

      {/* TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '320px' }}>
          <input 
            type="text" 
            placeholder="Mã phiếu, tên phiếu" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #EADCC9',
              outline: 'none',
              fontSize: '0.85rem',
              fontFamily: 'inherit'
            }}
          />
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: '#8D6E63' }} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn-toolbar-custom btn-secondary-custom">
            <Filter size={16} /> Lọc
          </button>
          <button className="btn-toolbar-custom btn-secondary-custom">Khác</button>
          <button className="btn-toolbar-custom btn-secondary-custom">Nhập dữ liệu</button>
          <button className="btn-toolbar-custom btn-secondary-custom">Xuất dữ liệu</button>
          <button className="btn-toolbar-custom">+ Thêm tài liệu</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="admin-list-layout" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="mgmt-table card admin-table-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className="spinner"></div>
                <span style={{ color: '#8D6E63', fontWeight: 600 }}>Đang tải công việc tồn đọng...</span>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                <span style={{ color: '#8D6E63', fontWeight: 600 }}>Không có công việc cần xử lý.</span>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                      <th style={{ minWidth: '220px' }}>Tên việc</th>
                      <th style={{ width: '150px' }}>Loại</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Mức độ ưu tiên</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>Ngày ghi nhận</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>Ngày hoàn thành</th>
                      <th>Ghi chú</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task) => (
                      <tr 
                        key={task.stt} 
                        onClick={() => handleRowClick()}
                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                      >
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>{task.stt}</td>
                        <td style={{ fontWeight: '700', color: '#2D1A12' }}>{task.task_name}</td>
                        <td style={{ fontWeight: '500', color: '#7B5233' }}>{task.category}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>{task.priority}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-chualam">Chưa Làm</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>
                          {new Date(task.recorded_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>
                          {new Date(task.completion_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td style={{ color: '#6B7280', fontSize: '0.85rem' }}>{task.notes}</td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <Edit 
                            size={16} 
                            className="edit-action-btn"
                            onClick={() => handleRowClick()}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #EADCC9', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{paginatedTasks.length}</b> trên <b>{filteredTasks.length}</b> công việc
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px',
                        border: '1px solid #EADCC9',
                        background: currentPage === 1 ? '#F9F6F0' : '#fff',
                        borderRadius: '6px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        color: '#7B5233'
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #EADCC9',
                          background: currentPage === i + 1 ? '#7B5233' : '#fff',
                          color: currentPage === i + 1 ? '#fff' : '#7B5233',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '6px',
                        border: '1px solid #EADCC9',
                        background: currentPage === totalPages ? '#F9F6F0' : '#fff',
                        borderRadius: '6px',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        color: '#7B5233'
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualityOverviewView;

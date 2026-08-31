import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Filter, Edit, FileText, ChevronLeft, ChevronRight, CheckCircle2, X, Eye } from 'lucide-react';
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
    if (setCustomTitle) setCustomTitle(title || 'Quản lý chất lượng');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'CL1: Hiển thị danh sách các công việc tồn đọng cần xử lý');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'CL1');
  }, [title, subtitle, screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');
  
  // Modal Chi tiết / Xác nhận
  const [selectedTask, setSelectedTask] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState('');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch dữ liệu công việc tồn đọng từ Backend (toàn bộ phiếu chưa xác nhận)
  const fetchPendingTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get('/inspections/pending');
      if (Array.isArray(data)) {
        setPendingTasks(data);
      } else {
        setPendingTasks([]);
      }
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      setPendingTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  // Lọc tìm kiếm & Sắp xếp danh sách phiếu chưa xác nhận
  const filteredTasks = useMemo(() => {
    let result = [...pendingTasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(task => {
        return (
          (task.ticket_code && task.ticket_code.toLowerCase().includes(q)) ||
          (task.task_name && task.task_name.toLowerCase().includes(q)) ||
          (task.category && task.category.toLowerCase().includes(q)) ||
          (task.part_name && task.part_name.toLowerCase().includes(q)) ||
          (task.batch_no && task.batch_no.toLowerCase().includes(q)) ||
          (task.notes && task.notes.toLowerCase().includes(q))
        );
      });
    }

    if (sortOption === 'name_asc') {
      result.sort((a, b) => (a.task_name || '').localeCompare(b.task_name || ''));
    } else if (sortOption === 'name_desc') {
      result.sort((a, b) => (b.task_name || '').localeCompare(a.task_name || ''));
    } else if (sortOption === 'date_asc') {
      result.sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date));
    } else {
      // date_desc mặc định
      result.sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date));
    }

    return result;
  }, [pendingTasks, searchQuery, sortOption]);

  // Phân trang
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredTasks.slice(start, start + limit);
  }, [filteredTasks, currentPage, limit]);

  const totalPages = Math.ceil(filteredTasks.length / limit) || 1;

  // Xử lý xác nhận phiếu
  const handleConfirmTask = async (task) => {
    if (!task) return;
    setConfirming(true);
    try {
      const taskType = task.type || 'input';
      await api.post(`/inspections/confirm/${taskType}/${task.id}`, {});
      setConfirmSuccessMsg(`Xác nhận thành công phiếu #${task.ticket_code || task.id}!`);
      setTimeout(() => {
        setConfirmSuccessMsg('');
        setSelectedTask(null);
        fetchPendingTasks();
      }, 1000);
    } catch (error) {
      console.error('Error confirming inspection:', error);
      alert('Lỗi khi xác nhận phiếu kiểm tra: ' + (error.response?.data?.detail || error.message));
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="gold-layout" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
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
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(3px);
        }
        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          width: 90%;
          max-width: 600px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          position: relative;
        }
      ` }} />

      {/* STICKY TOP ZONE */}
      <div className="sticky-top-zone">
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Mã phiếu, tên phiếu"
          showSort={true}
          sortOptions={[
            { value: 'date_desc', label: 'Mới nhất' },
            { value: 'date_asc', label: 'Cũ nhất' },
            { value: 'name_asc', label: 'Tên: A-Z' },
            { value: 'name_desc', label: 'Tên: Z-A' }
          ]}
          sortValue={sortOption}
          onSortChange={(val) => setSortOption(val)}
          showFilter={true}
          isFilterOpen={false}
          onFilterToggle={() => {}}
          extraActions={[
            { label: 'Hành động khác', onClick: () => {} }
          ]}
          importActions={[
            { label: 'Nhập excel', onClick: () => {} }
          ]}
          onExport={() => {}}
          onCreate={() => {}}
          createLabel="Thêm tài liệu"
          hasWritePermission={true}
        />
      </div>

      {/* TABLE AREA */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card">
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className="spinner"></div>
                <span style={{ color: '#8D6E63', fontWeight: 600 }}>Đang tải danh sách phiếu chưa xác nhận...</span>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                <span style={{ color: '#8D6E63', fontWeight: 600 }}>Không có phiếu kiểm tra tồn đọng cần xác nhận.</span>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                      <th style={{ minWidth: '220px' }}>TÊN VIỆC</th>
                      <th style={{ width: '150px' }}>LOẠI</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>MỨC ĐỘ ƯU TIÊN</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>TRẠNG THÁI</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>NGÀY GHI NHẬN</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>NGÀY HOÀN THÀNH</th>
                      <th>GHI CHÚ</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task, idx) => {
                      const sttDisplay = String((currentPage - 1) * limit + idx + 1).padStart(2, '0');
                      return (
                        <tr 
                          key={task.id || idx} 
                          onClick={() => setSelectedTask(task)}
                          style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        >
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>{sttDisplay}</td>
                          <td style={{ fontWeight: '700', color: '#2D1A12' }}>{task.task_name}</td>
                          <td style={{ fontWeight: '500', color: '#7B5233' }}>{task.category}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>{task.priority || 3}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge-chualam">Chưa Làm</span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '600' }}>
                            {formatDate(task.recorded_date)}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '600' }}>
                            {formatDate(task.completion_date)}
                          </td>
                          <td style={{ color: '#6B7280', fontSize: '0.85rem' }}>{task.notes}</td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                              <Edit 
                                size={16} 
                                className="edit-action-btn"
                                title="Xem chi tiết & Xác nhận"
                                onClick={() => setSelectedTask(task)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION - DESKTOP STICKY BOTTOM */}
              <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Show <b>{filteredTasks.length > 0 ? (currentPage - 1) * limit + 1 : 0}</b> to <b>{Math.min(currentPage * limit, filteredTasks.length)}</b> of <b>{filteredTasks.length}</b> results
                </div>
                <div className="pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL CHI TIẾT & XÁC NHẬN PHIẾU */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.2rem', fontWeight: 700 }}>
                Chi tiết phiếu kiểm tra
              </h3>
              <button 
                onClick={() => setSelectedTask(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {confirmSuccessMsg ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 12px display' }} />
                <div>{confirmSuccessMsg}</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.9rem' }}>
                  <div><strong>Mã phiếu:</strong> {selectedTask.ticket_code || selectedTask.id}</div>
                  <div><strong>Loại kiểm tra:</strong> {selectedTask.category}</div>
                  <div><strong>Tên chi tiết / phôi:</strong> {selectedTask.part_name || 'N/A'}</div>
                  <div><strong>Mã Lô / PO:</strong> {selectedTask.batch_no || 'N/A'}</div>
                  <div><strong>Ngày ghi nhận:</strong> {formatDate(selectedTask.recorded_date)}</div>
                  <div><strong>Người kiểm tra:</strong> {selectedTask.inspector_name || 'QC'}</div>
                  <div><strong>Kết quả:</strong> <span style={{ color: selectedTask.result === 'Đạt' || selectedTask.result === 'pass' ? '#059669' : '#DC2626', fontWeight: 'bold' }}>{selectedTask.result || 'Đạt'}</span></div>
                  <div><strong>Trạng thái:</strong> <span className="badge-chualam">Chưa Làm</span></div>
                </div>

                <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                  <strong>Ghi chú:</strong>
                  <div style={{ background: '#F9FAFB', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', marginTop: '4px', color: '#4B5563' }}>
                    {selectedTask.notes || 'Không có ghi chú thêm.'}
                  </div>
                </div>

                {/* HÌNH ẢNH MINH CHỨNG NẾU CÓ */}
                {(selectedTask.image_path_1 || selectedTask.image_path_2 || selectedTask.image_path_3) && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Hình ảnh minh chứng:</strong>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      {[selectedTask.image_path_1, selectedTask.image_path_2, selectedTask.image_path_3].filter(Boolean).map((img, idx) => (
                        <img 
                          key={idx}
                          src={img.startsWith('http') ? img : `${api.defaults.baseURL || ''}${img}`}
                          alt="Minh chứng"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="btn-toolbar-custom btn-secondary-custom"
                    disabled={confirming}
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => handleConfirmTask(selectedTask)}
                    className="btn-toolbar-custom"
                    disabled={confirming}
                    style={{ backgroundColor: '#059669' }}
                  >
                    <CheckCircle2 size={16} />
                    {confirming ? 'Đang xác nhận...' : 'Xác nhận hồ sơ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityOverviewView;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Search, 
  Layers, 
  ChevronRight,
  Package,
  Wrench,
  ShieldCheck
} from 'lucide-react';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';

const TechnicalDashboardView = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/master-products/technical-pending-tasks');
      setTasks(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Lỗi khi tải công việc tồn đọng:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.post('/master-products/technical-pending-tasks', {
        title: newTitle,
        assigned_to: newAssignee || 'Kỹ thuật viên'
      });
      setNewTitle('');
      setNewAssignee('');
      setShowAddModal(false);
      fetchTasks();
    } catch (err) {
      console.error('Lỗi khi tạo công việc:', err);
    }
  };

  return (
    <div style={{ backgroundColor: '#fcfaf7', minHeight: '100vh', padding: '20px' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#432818', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Quản lý kỹ thuật
        </h1>
        <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '4px 0 0 0' }}>
          KT01: Hiển thị danh sách các công việc tồn đọng cần xử lý
        </p>
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ backgroundColor: '#fff7ed', padding: '12px', borderRadius: '10px', color: '#ea580c' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Công việc tồn đọng</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#432818' }}>{tasks.filter(t => t.status !== 'Hoàn thành').length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', color: '#16a34a' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Đã hoàn thành</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#432818' }}>{tasks.filter(t => t.status === 'Hoàn thành').length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '10px', color: '#2563eb' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Quản lý sản phẩm</div>
            <button 
              onClick={() => navigate('/admin/products')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', padding: 0, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Xem danh sách SP <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Card Table: Pending Tasks */}
      <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#432818', margin: 0 }}>
            Danh sách công việc tồn đọng kỹ thuật
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#432818',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> Thêm công việc
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải công việc tồn đọng...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>Không có công việc tồn đọng nào</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#432818', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', borderRadius: '8px 0 0 0' }}>STT</th>
                  <th style={{ padding: '10px 14px' }}>Tên công việc cần xử lý</th>
                  <th style={{ padding: '10px 14px' }}>Người xử lý</th>
                  <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                  <th style={{ padding: '10px 14px', borderRadius: '0 8px 0 0', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => (
                  <tr key={task.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 14px', fontWeight: '800', color: '#1e293b' }}>{task.title}</td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontWeight: '600' }}>{task.assigned_to}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        backgroundColor: task.status === 'Hoàn thành' ? '#dcfce7' : (task.status === 'Đang xử lý' ? '#dbeafe' : '#fef3c7'),
                        color: task.status === 'Hoàn thành' ? '#15803d' : (task.status === 'Đang xử lý' ? '#1d4ed8' : '#b45309'),
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: '800'
                      }}>
                        {task.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate('/admin/products')}
                        style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', color: '#334155' }}
                      >
                        Xử lý
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#432818', marginTop: 0, marginBottom: '16px' }}>Thêm công việc tồn đọng mới</h3>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Tên công việc *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thẩm định định mức keo sơn SP B002"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Người xử lý</label>
                <input
                  type="text"
                  placeholder="Họ và tên nhân viên kỹ thuật"
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.84rem', cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{ border: 'none', background: '#432818', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.84rem', cursor: 'pointer' }}
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TechnicalDashboardView;

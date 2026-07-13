import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Plus, Trash2, Edit2, AlertTriangle, HelpCircle } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

const KPIRulesView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  
  // Search
  const [ruleSearch, setRuleSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Loaders & Alerts
  const [loadingRules, setLoadingRules] = useState(false);
  const { toast } = useToast();
  const setMessage = (msg) => {
    if (msg) {
      toast(msg.type, msg.text);
    }
  };
  const [showKhacDropdown, setShowKhacDropdown] = useState(false);
  
  // Modals & Confirmations
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    rule_code: '',
    content: '',
    points: -10,
    impact: 'Trung bình',
    note: ''
  });

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'delete',
    onConfirm: null
  });

  useEffect(() => {
    setCustomScreenCode('AD7.4');
    setCustomTitle('Quy tắc cộng trừ điểm KPI');
    setCustomSubtitle('Thiết lập luật chung cho QC báo cáo lỗi hoặc đề xuất khen thưởng.');
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const res = await api.get('/kpi-management/point-rules');
      setRules(res || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể tải cấu hình điều luật.' });
    } finally {
      setLoadingRules(false);
    }
  };

  const handleOpenAddEditModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        rule_code: rule.rule_code,
        content: rule.content,
        points: rule.points,
        impact: rule.impact,
        note: rule.note || ''
      });
    } else {
      setEditingRule(null);
      const nextNum = rules.length + 1;
      const nextCode = `RL${nextNum < 10 ? '0' + nextNum : nextNum}`;
      setFormData({
        rule_code: nextCode,
        content: '',
        points: -10,
        impact: 'Trung bình',
        note: ''
      });
    }
    setShowAddEditModal(true);
  };

  const handleSave = () => {
    if (!formData.rule_code.trim() || !formData.content.trim() || !formData.impact) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin điều luật.' });
      return;
    }

    const actionText = editingRule ? 'Cập nhật' : 'Thêm mới';
    setConfirmModal({
      show: true,
      title: `Xác nhận ${actionText}`,
      message: `Bạn có muốn ${actionText.toLowerCase()} điều luật "${formData.content}" không?`,
      type: 'add',
      onConfirm: async () => {
        try {
          if (editingRule) {
            await api.put(`/kpi-management/point-rules/${editingRule.id}`, formData);
            setMessage({ type: 'success', text: `Cập nhật điều luật thành công.` });
          } else {
            await api.post('/kpi-management/point-rules', formData);
            setMessage({ type: 'success', text: `Thêm điều luật thành công.` });
          }
          setShowAddEditModal(false);
          fetchRules();
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể lưu điều luật.' });
        }
      }
    });
  };

  const handleDelete = (rule) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa điều luật',
      message: `Bạn có chắc muốn xóa điều luật "${rule.content}" (${rule.rule_code}) khỏi hệ thống?`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/kpi-management/point-rules/${rule.id}`);
          setMessage({ type: 'success', text: 'Xóa điều luật thành công.' });
          fetchRules();
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể xóa điều luật.' });
        }
      }
    });
  };

  const filteredRules = rules.filter(rule =>
    rule.content.toLowerCase().includes(ruleSearch.toLowerCase()) ||
    rule.rule_code.toLowerCase().includes(ruleSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRules.length / itemsPerPage) || 1;
  const paginatedRules = filteredRules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '15px 20px', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
        


      {/* Selector & Actions Toolbar */}
      <div className="card" style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        
        {/* Helper info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#7B5233' }}>
            Tổng số quy tắc: {filteredRules.length}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm điều luật..." 
              value={ruleSearch}
              onChange={(e) => { setRuleSearch(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#7B5233' }} />
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowKhacDropdown(!showKhacDropdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
            >
              Khác ▾
            </button>
            {showKhacDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #EADCC9', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: '200px', display: 'flex', flexDirection: 'column', padding: '6px' }}>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Quản lý KPI (Tổng quan)</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/checklist'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Checklist công việc</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/list'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Danh sách KPI</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/feedback'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Phản hồi và nhận xét</button>
              </div>
            )}
          </div>

          <button onClick={() => handleOpenAddEditModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            <Plus size={14} /> Thêm điều luật mới
          </button>
        </div>
      </div>

      {/* Main Flat Rules Table */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card" style={{ padding: '16px' }}>
          {loadingRules ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách điều luật...</div>
          ) : filteredRules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Không có điều luật nào được cấu hình.</div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>Mã luật</th>
                    <th>Tên điều luật (Khen thưởng / Kỷ luật)</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Mức độ ảnh hưởng</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Điểm cộng / trừ</th>
                    <th>Ghi chú mô tả</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRules.map((rule) => {
                    const isNegative = rule.points < 0;
                    return (
                      <tr key={rule.id}>
                        <td style={{ fontWeight: '700', color: '#7B5233' }}>{rule.rule_code}</td>
                        <td style={{ fontWeight: '600' }}>{rule.content}</td>
                        <td style={{ textAlign: 'center' }}>
                          {rule.impact === 'Cao' ? (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#ef4444' }}>Cao</span>
                          ) : rule.impact === 'Trung bình' ? (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#d97706' }}>T.Bình</span>
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#64748b' }}>Thấp</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          <span style={{
                            padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
                            backgroundColor: isNegative ? '#fee2e2' : '#dcfce7',
                            color: isNegative ? '#ef4444' : '#15803d'
                          }}>
                            {isNegative ? '' : '+'}{rule.points} điểm
                          </span>
                        </td>
                        <td>{rule.note || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button onClick={() => handleOpenAddEditModal(rule)} style={{ display: 'flex', padding: '6px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569' }}><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete(rule)} style={{ display: 'flex', padding: '6px', borderRadius: '6px', border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="admin-pagination-desktop" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: '600' }}>
                Hiển thị <b>{filteredRules.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredRules.length)}</b> trên <b>{filteredRules.length}</b> kết quả
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', backgroundColor: '#fff', color: '#7B5233', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontWeight: '700' }}
                >
                  &lt; Trước
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button 
                    key={idx} 
                    className={`page-btn ${currentPage === idx + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(idx + 1)}
                    style={{ 
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', 
                      backgroundColor: currentPage === idx + 1 ? '#7B5233' : '#fff', 
                      color: currentPage === idx + 1 ? '#fff' : '#7B5233',
                      fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', backgroundColor: '#fff', color: '#7B5233', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontWeight: '700' }}
                >
                  Sau &gt;
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showAddEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#7B5233', fontWeight: '800', fontSize: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              {editingRule ? `Cập nhật điều luật: ${formData.rule_code}` : 'Thêm điều luật mới'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mã điều luật</label>
                <input type="text" value={formData.rule_code} onChange={(e) => setFormData({ ...formData, rule_code: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Tên điều luật (Khen thưởng / Kỷ luật)</label>
                <input type="text" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mức độ ảnh hưởng</label>
                  <select value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="Cao">Cao</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Thấp">Thấp</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Điểm số cộng/trừ</label>
                  <input type="number" placeholder="Điểm trừ nhập âm (e.g. -50)" value={formData.points} onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Ghi chú mô tả chi tiết</label>
                <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', height: '60px', resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddEditModal(false)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={handleSave} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', background: '#7B5233', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', backgroundColor: confirmModal.type === 'delete' ? '#fee2e2' : '#dcfce7', color: confirmModal.type === 'delete' ? '#ef4444' : '#22c55e' }}>
              {confirmModal.type === 'delete' ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e293b' }}>{confirmModal.title}</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={async () => { setConfirmModal(prev => ({ ...prev, show: false })); if (confirmModal.onConfirm) await confirmModal.onConfirm(); }} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#fff', backgroundColor: confirmModal.type === 'delete' ? '#ef4444' : '#7B5233' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KPIRulesView;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useOutletContext, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Download, Plus, Trash2, Camera, Lock, User, Check, 
  ChevronDown, X, Image as ImageIcon, ShieldCheck, AlertTriangle, 
  FileText, Calendar, Clock, Eye, Sparkles, CheckCircle2
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import CapaCauseModal from '@mobile/modules/capa/Views/components/CapaCauseModal';
import CapaPreventiveModal from '@mobile/modules/capa/Views/components/CapaPreventiveModal';

// Modal thêm/sửa lượt kiểm tra & đánh giá hiệu quả
const CapaEvaluationModal = ({ isOpen, onClose, onSave, initialData = null, qlclUsers = [] }) => {
  const [formData, setFormData] = useState({
    content: '',
    execution_date: new Date().toISOString().split('T')[0],
    expected: 'Đạt 100% tiêu chuẩn kỹ thuật SOP',
    executor: qlclUsers[0]?.full_name || 'Hà Minh Xuân',
    result: 'Pass',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        content: initialData.content || '',
        execution_date: initialData.execution_date || new Date().toISOString().split('T')[0],
        expected: initialData.expected || 'Đạt 100% tiêu chuẩn kỹ thuật SOP',
        executor: initialData.executor || (qlclUsers[0]?.full_name || 'Hà Minh Xuân'),
        result: initialData.result || 'Pass',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        content: '',
        execution_date: new Date().toISOString().split('T')[0],
        expected: 'Đạt 100% tiêu chuẩn kỹ thuật SOP',
        executor: qlclUsers[0]?.full_name || 'Hà Minh Xuân',
        result: 'Pass',
        notes: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    onSave(formData);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: '#432818',
          color: '#fff'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#e6d7c3" /> {initialData ? 'Chỉnh Sửa Lượt Kiểm Tra' : 'Thêm Lượt Kiểm Tra & Đánh Giá'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.83rem', fontWeight: '700', color: '#334155' }}>
              Nội dung kiểm tra <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Nhập chi tiết nội dung kiểm tra tại xưởng / chuyền..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid #cbd5e1', fontSize: '0.88rem',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.83rem', fontWeight: '700', color: '#334155' }}>
                Ngày thực hiện
              </label>
              <input
                type="date"
                value={formData.execution_date}
                onChange={(e) => setFormData({ ...formData, execution_date: e.target.value })}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.83rem', fontWeight: '700', color: '#334155' }}>
                Kết quả mong đợi
              </label>
              <input
                type="text"
                value={formData.expected}
                onChange={(e) => setFormData({ ...formData, expected: e.target.value })}
                placeholder="VD: Đạt 100% tiêu chuẩn"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.83rem', fontWeight: '700', color: '#334155' }}>
              Kết quả kiểm tra
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, result: 'Pass' })}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: `1.5px solid ${formData.result === 'Pass' ? '#16a34a' : '#cbd5e1'}`,
                  backgroundColor: formData.result === 'Pass' ? '#f0fdf4' : '#fff',
                  color: formData.result === 'Pass' ? '#15803d' : '#64748b',
                  fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: formData.result === 'Pass' ? '0 2px 6px rgba(22, 163, 74, 0.15)' : 'none'
                }}
              >
                ✓ ĐẠT
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, result: 'Fail' })}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: `1.5px solid ${formData.result === 'Fail' ? '#dc2626' : '#cbd5e1'}`,
                  backgroundColor: formData.result === 'Fail' ? '#fef2f2' : '#fff',
                  color: formData.result === 'Fail' ? '#dc2626' : '#64748b',
                  fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: formData.result === 'Fail' ? '0 2px 6px rgba(220, 38, 38, 0.15)' : 'none'
                }}
              >
                ✕ KHÔNG ĐẠT
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1',
                backgroundColor: '#fff', color: '#475569', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 20px', borderRadius: '10px', border: 'none',
                backgroundColor: '#7B5233', color: '#fff', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(123, 82, 51, 0.25)'
              }}
            >
              Lưu thông tin
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

// Modal thêm hành động khắc phục
const CapaCorrectiveModal = ({ isOpen, onClose, onSave, qlclUsers = [] }) => {
  const [formData, setFormData] = useState({
    action: '',
    time: new Date().toISOString().split('T')[0],
    handler: qlclUsers[0]?.full_name || 'Ngô Diễm My'
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.action.trim()) return;
    onSave(formData);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: '#432818',
          color: '#fff'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
            Thêm Hành Động Khắc Phục
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.83rem', fontWeight: '700', color: '#334155' }}>
              Nội dung hành động khắc phục *
            </label>
            <textarea
              rows={3}
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              placeholder="Nhập chi tiết biện pháp xử lý sự cố ngay..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.83rem', fontWeight: '700', color: '#334155' }}>Thời hạn</label>
              <input
                type="date"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.83rem', fontWeight: '700', color: '#334155' }}>Người phụ trách</label>
              <select
                value={formData.handler}
                onChange={(e) => setFormData({ ...formData, handler: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                {qlclUsers.map((u, i) => (
                  <option key={i} value={u.full_name}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>Hủy</button>
            <button type="submit" style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#7B5233', color: '#fff', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer' }}>Thêm mới</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Component chọn nhiều nhân sự QLCL
const MultiUserSelect = ({ label, selectedUsers, onChange, allUsers, placeholder = "Chọn nhân sự QLCL..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = allUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUser = (userName) => {
    if (selectedUsers.includes(userName)) {
      onChange(selectedUsers.filter(name => name !== userName));
    } else {
      onChange([...selectedUsers, userName]);
    }
  };

  const removeUser = (e, userName) => {
    e.stopPropagation();
    onChange(selectedUsers.filter(name => name !== userName));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }} ref={dropdownRef}>
      <label style={{ fontSize: '0.83rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <User size={15} color="#7B5233" />
        {label} <span style={{ color: '#dc2626' }}>*</span>
      </label>

      {/* Selected Users Chips & Trigger Field */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minHeight: '36px',
          padding: '4px 10px',
          borderRadius: '8px',
          border: isOpen ? '1.5px solid #7B5233' : '1px solid #cbd5e1',
          backgroundColor: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 2px rgba(123, 82, 51, 0.12)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {selectedUsers.length === 0 ? (
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{placeholder}</span>
        ) : (
          selectedUsers.map(name => (
            <span 
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#f5efe9',
                color: '#432818',
                fontSize: '0.78rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '16px',
                border: '1px solid #e6d7c3'
              }}
            >
              {name}
              <X 
                size={13} 
                className="hover:text-red-600" 
                onClick={(e) => removeUser(e, name)} 
                style={{ cursor: 'pointer', opacity: 0.8 }} 
              />
            </span>
          ))
        )}

        <ChevronDown size={16} color="#64748b" style={{ marginLeft: 'auto', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          zIndex: 50,
          maxHeight: '260px',
          overflowY: 'auto',
          padding: '8px'
        }}>
          <input 
            type="text"
            placeholder="Tìm kiếm người dùng QLCL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              marginBottom: '8px',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px 8px 8px', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
            <span>Danh sách nhân sự QLCL ({allUsers.length})</span>
            <span 
              onClick={(e) => {
                e.stopPropagation();
                if (selectedUsers.length === allUsers.length) onChange([]);
                else onChange(allUsers.map(u => u.full_name));
              }}
              style={{ color: '#7B5233', cursor: 'pointer', fontWeight: '700' }}
            >
              {selectedUsers.length === allUsers.length ? 'Xóa chọn' : 'Chọn tất cả'}
            </span>
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ padding: '12px', textIndent: '8px', fontSize: '0.82rem', color: '#94a3b8' }}>Không tìm thấy nhân sự nào.</div>
          ) : (
            filteredUsers.map(u => {
              const isChecked = selectedUsers.includes(u.full_name);
              return (
                <div 
                  key={u.id || u.username}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUser(u.full_name);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isChecked ? '#fdf8f4' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isChecked ? '#7B5233' : '#e2e8f0',
                      color: isChecked ? '#fff' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '800'
                    }}>
                      {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: isChecked ? '700' : '600', color: isChecked ? '#432818' : '#334155' }}>
                        {u.full_name}
                      </div>
                      {u.department_name && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{u.department_name}</div>
                      )}
                    </div>
                  </div>

                  {isChecked && <Check size={16} color="#7B5233" style={{ strokeWidth: 3 }} />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const CapaFormView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = location.state?.returnUrl || '/admin/defects?tab=capa';
  const { id } = useParams();
  const isCreate = !id || id === 'create';
  const { toast } = useToast();
  const routePath = isCreate ? '/admin/capa/create' : '/admin/capa/edit/:id';
  const { screenCode, title, subtitle } = useScreenMetadataCached(routePath);

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'plan' | 'tracking'
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);

  // Lấy người dùng đăng nhập hiện tại
  const currentUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInName = currentUser.full_name || currentUser.name || currentUser.username || 'Administrator';

  // Danh sách nhân sự QLCL
  const [qlclUsers, setQlclUsers] = useState([
    { id: 1, full_name: 'Ngô Diễm My', department_name: 'QLCL' },
    { id: 2, full_name: 'Đặng Văn Nam', department_name: 'QLCL' },
    { id: 3, full_name: 'Hà Minh Xuân', department_name: 'QLCL' },
    { id: 4, full_name: 'Dương Thị Lệ Uyên', department_name: 'QLCL' },
    { id: 5, full_name: 'Administrator', department_name: 'Quản trị viên' },
    { id: 6, full_name: 'Nguyễn Văn Tiển', department_name: 'QLCL' },
    { id: 7, full_name: 'Trần Thị Ánh', department_name: 'QLCL' },
    { id: 8, full_name: 'Huỳnh Thị Diễm Trinh', department_name: 'QLCL' }
  ]);

  // Selected Handlers & Evaluators (dạng mảng tên)
  const [selectedHandlers, setSelectedHandlers] = useState([]);
  const [selectedEvaluators, setSelectedEvaluators] = useState([]);

  // Tab 1 Form Data
  const [formData, setFormData] = useState({
    code: 'G7.CAPA.001',
    created_at_time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' | ' + new Date().toLocaleDateString('vi-VN'),
    creator_name: loggedInName,
    urgency: 'Bình thường',
    scope: 'Sản phẩm lỗi',
    issue_description: '',
    images: [],
    evaluation_time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' | ' + new Date().toLocaleDateString('vi-VN'),
    ticket_status: 'Mở', // Mặc định 'Mở', không cho chọn
  });

  // Tab 2 Data
  const [causes, setCauses] = useState([]);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [preventivePlans, setPreventivePlans] = useState([]);

  // Tab 3 Data
  const [evaluations, setEvaluations] = useState([]);

  // Image Lightbox & Modals state
  const [previewImage, setPreviewImage] = useState(null);
  const [isCauseModalOpen, setIsCauseModalOpen] = useState(false);
  const [editingCauseIdx, setEditingCauseIdx] = useState(null);
  const [isPreventiveModalOpen, setIsPreventiveModalOpen] = useState(false);
  const [editingPlanIdx, setEditingPlanIdx] = useState(null);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [editingEvalIdx, setEditingEvalIdx] = useState(null);
  const [isCorrectiveModalOpen, setIsCorrectiveModalOpen] = useState(false);

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || (isCreate ? 'Tạo báo cáo CAPA' : `Báo cáo CAPA: ${formData.code}`));
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');

    fetchAccountsList();

    if (isCreate) {
      fetchNextCode();
    } else {
      fetchDetail();
    }
  }, [id, title, subtitle, screenCode]);

  // Đồng hồ thời gian thực nhảy liên tục cho đến khi bấm Lưu (khi tạo mới)
  useEffect(() => {
    if (!isCreate) return;

    const formatCurrentTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      return `${timeStr} | ${dateStr}`;
    };

    // Set ngay lập tức
    setFormData(prev => ({ ...prev, created_at_time: formatCurrentTime() }));

    const timer = setInterval(() => {
      setFormData(prev => ({
        ...prev,
        created_at_time: formatCurrentTime()
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [isCreate]);

  // Lấy danh sách tài khoản thực tế từ Backend
  const fetchAccountsList = async () => {
    try {
      const res = await api.get('/accounts/?size=100');
      if (res && res.items && res.items.length > 0) {
        setQlclUsers(res.items.map(a => ({
          id: a.id,
          full_name: a.full_name || a.username,
          department_name: a.department_name || 'QLCL'
        })));
      }
    } catch (e) {
      console.warn('Lấy danh sách tài khoản từ API thất bại, dùng danh sách QLCL mặc định:', e);
    }
  };

  // Tự động sinh mã G7.CAPA.xxx
  const fetchNextCode = async () => {
    try {
      const res = await api.get('/capas/?limit=100');
      const count = (res?.total || res?.items?.length || 0) + 1;
      const nextCode = `G7.CAPA.${count.toString().padStart(3, '0')}`;
      setFormData(prev => ({
        ...prev,
        code: nextCode,
        creator_name: loggedInName
      }));
    } catch (e) {
      setFormData(prev => ({
        ...prev,
        code: 'G7.CAPA.001',
        creator_name: loggedInName
      }));
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/capas/${id}`);
      setFormData({
        code: data.code || 'G7.CAPA.001',
        created_at_time: data.created_at_time || '',
        creator_name: data.creator_name || loggedInName,
        urgency: data.urgency || 'Bình thường',
        scope: data.scope || 'Sản phẩm lỗi',
        issue_description: data.issue_description || '',
        images: data.images ? (typeof data.images === 'string' ? JSON.parse(data.images) : data.images) : [],
        evaluation_time: data.evaluation_time || '',
        ticket_status: data.ticket_status || 'Mở'
      });

      // Parse danh sách người xử lý & người đánh giá
      if (data.handler_name) {
        const handlerArr = data.handler_name.split(',').map(s => s.trim()).filter(Boolean);
        setSelectedHandlers(handlerArr);
      }
      if (data.evaluator_name) {
        const evalArr = data.evaluator_name.split(',').map(s => s.trim()).filter(Boolean);
        setSelectedEvaluators(evalArr);
      }

      if (data.causes_json) setCauses(typeof data.causes_json === 'string' ? JSON.parse(data.causes_json) : data.causes_json);
      if (data.corrective_actions_json) setCorrectiveActions(typeof data.corrective_actions_json === 'string' ? JSON.parse(data.corrective_actions_json) : data.corrective_actions_json);
      if (data.preventive_plans_json) setPreventivePlans(typeof data.preventive_plans_json === 'string' ? JSON.parse(data.preventive_plans_json) : data.preventive_plans_json);
      if (data.evaluations_json) setEvaluations(typeof data.evaluations_json === 'string' ? JSON.parse(data.evaluations_json) : data.evaluations_json);
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết CAPA:', err);
      toast('error', 'Không thể tải chi tiết CAPA.');
    } finally {
      setLoading(false);
    }
  };

  // Upload hình ảnh (Hỗ trợ upload nhiều ảnh cùng lúc)
  const handleImageFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Url = uploadEvent.target.result;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, base64Url]
        }));
      };
      reader.readAsDataURL(file);
    });
    toast('success', `Đã thêm ${files.length} hình ảnh minh họa`);
  };

  const handleAddImageUrl = () => {
    const urlPrompt = prompt('Nhập đường dẫn (URL) hình ảnh minh họa:');
    if (urlPrompt && urlPrompt.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, urlPrompt.trim()]
      }));
      toast('success', 'Đã thêm hình ảnh từ URL');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSave = async (statusOverride = null) => {
    if (selectedHandlers.length === 0) {
      toast('warning', 'Vui lòng chọn ít nhất 1 người xử lý thuộc QLCL.');
      return;
    }
    if (!formData.issue_description || !formData.issue_description.trim()) {
      toast('warning', 'Vui lòng nhập mô tả sự cố.');
      return;
    }

    setSaving(true);
    try {
      const handlerStr = selectedHandlers.join(', ');
      const evaluatorStr = selectedEvaluators.join(', ');
      const finalStatus = statusOverride || formData.ticket_status || 'Mở';

      const payload = {
        code: formData.code,
        created_at_time: formData.created_at_time,
        creator_name: formData.creator_name,
        handler_name: handlerStr,
        urgency: formData.urgency,
        scope: formData.scope,
        issue_description: formData.issue_description,
        images: JSON.stringify(formData.images),
        evaluator_name: evaluatorStr,
        evaluation_time: formData.evaluation_time,
        ticket_status: finalStatus,
        tab_status: finalStatus === 'Đóng' ? 'history' : 'tracking',
        causes_json: JSON.stringify(causes),
        corrective_actions_json: JSON.stringify(correctiveActions),
        preventive_plans_json: JSON.stringify(preventivePlans),
        evaluations_json: JSON.stringify(evaluations)
      };

      if (isCreate) {
        await api.post('/capas/', payload);
        toast('success', 'Đã tạo báo cáo CAPA thành công!');
      } else {
        await api.put(`/capas/${id}`, payload);
        toast('success', 'Đã cập nhật báo cáo CAPA thành công!');
      }
      navigate(returnUrl);
    } catch (err) {
      console.error('Lỗi khi lưu CAPA:', err);
      toast('error', 'Không thể lưu báo cáo CAPA.');
    } finally {
      setSaving(false);
    }
  };

  // Handlers for Cause Modal
  const handleConfirmCause = (newCauseData) => {
    if (editingCauseIdx !== null) {
      const updated = [...causes];
      updated[editingCauseIdx] = newCauseData;
      setCauses(updated);
      setEditingCauseIdx(null);
    } else {
      setCauses([...causes, newCauseData]);
    }
  };

  // Handlers for Preventive Modal
  const handleConfirmPreventive = (newPlanData) => {
    if (editingPlanIdx !== null) {
      const updated = [...preventivePlans];
      updated[editingPlanIdx] = { stt: editingPlanIdx + 1, ...newPlanData };
      setPreventivePlans(updated);
      setEditingPlanIdx(null);
    } else {
      setPreventivePlans([
        ...preventivePlans,
        { stt: preventivePlans.length + 1, ...newPlanData }
      ]);
    }
  };

  // Handlers for Evaluation Modal
  const handleConfirmEvaluation = (newEvalData) => {
    const formattedDate = newEvalData.execution_date ? new Date(newEvalData.execution_date).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
    if (editingEvalIdx !== null) {
      const updated = [...evaluations];
      updated[editingEvalIdx] = { 
        ...updated[editingEvalIdx], 
        ...newEvalData, 
        execution_date: formattedDate 
      };
      setEvaluations(updated);
      setEditingEvalIdx(null);
    } else {
      setEvaluations([
        ...evaluations,
        { id: evaluations.length + 1, ...newEvalData, execution_date: formattedDate }
      ]);
    }
  };
  const handleDeleteEvaluation = (idxToDelete) => {
    setEvaluations(evaluations.filter((_, idx) => idx !== idxToDelete));
  };

  // Export PDF / Print Handler (Gold Standard Design)
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast('error', 'Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép popup để xuất PDF!');
      return;
    }

    const handlersText = selectedHandlers.length > 0 ? selectedHandlers.join(', ') : 'Chưa chỉ định';
    const evaluatorsText = selectedEvaluators.length > 0 ? selectedEvaluators.join(', ') : 'Chưa chỉ định';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Báo Cáo CAPA - ${formData.code}</title>
        <meta charset="utf-8" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>
          @media print {
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 24px 28px;
            font-size: 12.5px;
            line-height: 1.5;
            background-color: #fff;
          }
          .brand-bar {
            display: flex;
            justify: space-between;
            align-items: center;
            padding-bottom: 12px;
            border-bottom: 3px solid #432818;
            margin-bottom: 18px;
            position: relative;
          }
          .brand-bar::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            width: 120px;
            height: 3px;
            background: linear-gradient(90deg, #d4af37, #7B5233);
          }
          .company-name {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.5px;
            color: #7B5233;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .doc-title {
            font-size: 18px;
            font-weight: 900;
            color: #432818;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: -0.3px;
          }
          .doc-meta {
            text-align: right;
          }
          .code-tag {
            display: inline-block;
            background-color: #432818;
            color: #fff;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 13px;
            letter-spacing: 0.5px;
          }
          .status-tag {
            display: inline-block;
            margin-top: 4px;
            padding: 3px 10px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 11px;
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }
          .section {
            margin-bottom: 18px;
          }
          .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: #faf6f1;
            border-left: 4px solid #7B5233;
            padding: 6px 12px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 10px;
          }
          .section-title {
            font-size: 12.5px;
            font-weight: 800;
            color: #432818;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: 0.3px;
          }
          .card-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .info-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
          }
          .info-label {
            font-size: 10.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
          }
          .info-value {
            font-size: 12.5px;
            font-weight: 700;
            color: #1e293b;
          }
          .desc-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 12.5px;
            color: #334155;
            white-space: pre-wrap;
            min-height: 40px;
            line-height: 1.6;
          }
          .why-item {
            background-color: #fff;
            border: 1px solid #e2e8f0;
            border-left: 3px solid #7B5233;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 8px;
          }
          .why-title {
            font-weight: 700;
            color: #1e293b;
            font-size: 12.5px;
          }
          .why-sub {
            margin-left: 14px;
            margin-top: 4px;
            color: #475569;
            font-size: 11.5px;
          }
          table.styled-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          table.styled-table th {
            background-color: #432818;
            color: #ffffff;
            font-weight: 700;
            padding: 8px 10px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          table.styled-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          table.styled-table tr:nth-child(even) td {
            background-color: #fcfbf9;
          }
          .badge-pass {
            background-color: #dcfce7;
            color: #15803d;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 800;
            font-size: 10.5px;
          }
          .badge-fail {
            background-color: #fee2e2;
            color: #dc2626;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 800;
            font-size: 10.5px;
          }
          .signatures {
            margin-top: 32px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            text-align: center;
            page-break-inside: avoid;
          }
          .sig-card {
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            padding: 12px;
            background-color: #faf6f1;
          }
          .sig-role {
            font-size: 11px;
            font-weight: 800;
            color: #432818;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sig-line {
            height: 50px;
          }
          .sig-name {
            font-size: 11.5px;
            font-weight: 700;
            color: #64748b;
            font-style: italic;
          }
          .footer-note {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        
        <!-- Header Thanh Thương Hiệu -->
        <div class="brand-bar">
          <div>
            <div class="company-name">Hệ Thống Quản Lý Chất Lượng SmartFlow</div>
            <h1 class="doc-title">Phiếu Hành Động CAPA</h1>
          </div>
          <div class="doc-meta">
            <div class="code-tag">${formData.code}</div>
            <div><span class="status-tag">Trạng Thái: ${formData.ticket_status || 'Mở'}</span></div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px; font-weight: 600;">Ghi nhận: ${formData.created_at_time}</div>
          </div>
        </div>

        <!-- PHẦN I: THÔNG TIN SỰ CỐ -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">I. Mô Tả Chung & Phạm Vi Sự Cố</h2>
          </div>
          <div class="card-grid" style="margin-bottom: 10px;">
            <div class="info-card">
              <div class="info-label">Người Khởi Tạo Báo Cáo</div>
              <div class="info-value">${formData.creator_name || 'Administrator'}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Người Xử Lý Chuyên Trách (QLCL)</div>
              <div class="info-value">${handlersText}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Mức Độ Nghiêm Trọng</div>
              <div class="info-value" style="color: ${formData.urgency === 'Khẩn cấp' ? '#dc2626' : '#1e293b'};">${formData.urgency || 'Bình thường'}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Phạm Vi Tác Động</div>
              <div class="info-value">${formData.scope || 'Sản phẩm lỗi'}</div>
            </div>
          </div>
          <div class="info-label" style="margin-bottom: 4px; margin-left: 2px;">Mô Tả Chi Tiết Sự Cố / Nhược Điểm Chất Lượng:</div>
          <div class="desc-box">${formData.issue_description || 'Chưa có mô tả chi tiết.'}</div>
        </div>

        <!-- PHẦN II: PHÂN TÍCH NGUYÊN NHÂN 5-WHY -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">II. Phân Tích Nguyên Nhân Gốc Rễ (5-Why)</h2>
          </div>
          ${causes.length === 0 ? '<div style="color: #94a3b8; font-style: italic; font-size: 11.5px; padding: 4px 8px;">Chưa có dữ liệu phân tích nguyên nhân.</div>' : 
            causes.map((c, i) => `
              <div class="why-item">
                <div class="why-title">${i + 1}. Nguyên nhân trực tiếp: ${c.direct_cause}</div>
                ${c.whys && c.whys.length > 0 ? c.whys.map(w => `<div class="why-sub">• Tại sao? ➔ <i>${w}</i></div>`).join('') : ''}
              </div>
            `).join('')
          }
        </div>

        <!-- PHẦN III: HÀNH ĐỘNG KHẮC PHỤC TẠM THỜI -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">III. Hành Động Khắc Phục Tạm Thời</h2>
          </div>
          <table class="styled-table">
            <thead>
              <tr>
                <th style="width: 38px; text-align: center;">STT</th>
                <th>Nội Dung Hành Động Khắc Phục</th>
                <th style="width: 110px; text-align: center;">Thời Gian</th>
                <th style="width: 130px;">Người Phụ Trách</th>
              </tr>
            </thead>
            <tbody>
              ${correctiveActions.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px;">Chưa ghi nhận hành động khắc phục nào.</td></tr>' :
                correctiveActions.map((row, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                    <td>${row.action}</td>
                    <td style="text-align: center; font-weight: 600;">${row.time}</td>
                    <td style="font-weight: 600;">${row.handler}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>

        <!-- PHẦN IV: KẾ HOẠCH PHÒNG NGỪA LÂU DÀI -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">IV. Kế Hoạch Phòng Ngừa Lâu Dài</h2>
          </div>
          <table class="styled-table">
            <thead>
              <tr>
                <th style="width: 38px; text-align: center;">STT</th>
                <th>Hành Động Cụ Thể</th>
                <th style="width: 120px;">Người Thực Hiện</th>
                <th style="width: 100px; text-align: center;">Hạn Hoàn Thành</th>
                <th>Kết Quả Mong Đợi</th>
              </tr>
            </thead>
            <tbody>
              ${preventivePlans.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 12px;">Chưa lập kế hoạch phòng ngừa.</td></tr>' :
                preventivePlans.map((row, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                    <td>${row.action}</td>
                    <td style="font-weight: 600;">${row.performer}</td>
                    <td style="text-align: center; font-weight: 600;">${row.deadline}</td>
                    <td>${row.expected_result}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>

        <!-- PHẦN V: THEO DÕI & ĐÁNH GIÁ HIỆU QUẢ -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">V. Theo Dõi & Đánh Giá Hiệu Quả Thực Tế</h2>
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">Người Đánh Giá Phê Duyệt: <span style="color: #432818;">${evaluatorsText}</span></div>
          <table class="styled-table">
            <thead>
              <tr>
                <th style="width: 38px; text-align: center;">STT</th>
                <th>Nội Dung Kiểm Tra</th>
                <th style="width: 100px; text-align: center;">Ngày Thực Hiện</th>
                <th>Kết Quả Mong Đợi</th>
                <th style="width: 80px; text-align: center;">Kết Quả</th>
              </tr>
            </thead>
            <tbody>
              ${evaluations.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 12px;">Chưa có lượt đánh giá nào.</td></tr>' :
                evaluations.map((row, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                    <td>${row.content}</td>
                    <td style="text-align: center; font-weight: 600;">${row.execution_date}</td>
                    <td>${row.expected || 'Đạt 100% tiêu chuẩn SOP'}</td>
                    <td style="text-align: center;">
                      <span class="${row.result === 'Fail' ? 'badge-fail' : 'badge-pass'}">
                        ${row.result === 'Fail' ? 'KHÔNG ĐẠT' : 'ĐẠT'}
                      </span>
                    </td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>

        <!-- CHỮ KÝ PHÊ DUYỆT (DIGITAL STAMPS) -->
        <div class="signatures">
          <div class="sig-card">
            <div class="sig-role">1. NGƯỜI LẬP BÁO CÁO</div>
            <div style="margin-top: 8px; border: 1.5px dashed #0284c7; background: #f0f9ff; padding: 8px 12px; border-radius: 8px; text-align: center;">
              <div style="font-weight: 800; color: #0284c7; font-size: 11px; letter-spacing: 0.5px;">✓ ĐÃ KÝ SỐ (TẠO PHIẾU)</div>
              <div style="font-weight: 700; color: #0369a1; font-size: 12px; margin-top: 2px;">${formData.creator_name || 'Hồ Sỹ Khẩn'}</div>
              <div style="font-size: 9px; color: #075985; margin-top: 1px;">Thời gian: ${formData.created_at ? new Date(formData.created_at).toLocaleString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</div>
            </div>
          </div>
          <div class="sig-card">
            <div class="sig-role">2. NGƯỜI XỬ LÝ (QLCL)</div>
            <div style="margin-top: 8px; border: 1.5px dashed #d97706; background: #fffbeb; padding: 8px 12px; border-radius: 8px; text-align: center;">
              <div style="font-weight: 800; color: #d97706; font-size: 11px; letter-spacing: 0.5px;">✓ ĐÃ KÝ SỐ (XỬ LÝ)</div>
              <div style="font-weight: 700; color: #b45309; font-size: 12px; margin-top: 2px;">${handlersText}</div>
              <div style="font-size: 9px; color: #78350f; margin-top: 1px;">Xác nhận hành động</div>
            </div>
          </div>
          <div class="sig-card">
            <div class="sig-role">3. TRƯỞNG PHÒNG QLCL</div>
            <div style="margin-top: 8px; border: 1.5px dashed #059669; background: #f0fdf4; padding: 8px 12px; border-radius: 8px; text-align: center;">
              <div style="font-weight: 800; color: #059669; font-size: 11px; letter-spacing: 0.5px;">✓ ĐÃ KÝ SỐ & PHÊ DUYỆT</div>
              <div style="font-weight: 700; color: #047857; font-size: 12px; margin-top: 2px;">${evaluatorsText}</div>
              <div style="font-size: 9px; color: #065f46; margin-top: 1px;">Thời gian: ${new Date().toLocaleDateString('vi-VN')}</div>
            </div>
          </div>
        </div>

        <div class="footer-note">
          Tài liệu này được trích xuất tự động từ Hệ Thống Quản Lý Chất Lượng SmartFlow v3.0 | Ngày in: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Handlers for Corrective Action Modal
  const handleConfirmCorrectiveAction = (newActionData) => {
    const formattedTime = newActionData.time ? new Date(newActionData.time).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
    setCorrectiveActions([
      ...correctiveActions,
      {
        stt: correctiveActions.length + 1,
        action: newActionData.action,
        time: formattedTime,
        handler: newActionData.handler || selectedHandlers[0] || loggedInName
      }
    ]);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#7B5233', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e6d7c3', borderTopColor: '#7B5233', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span>Đang tải dữ liệu CAPA...</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '10px 16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* Header Banner Siêu Gọn 1 Dòng */}
      <div style={{ 
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#fff', 
        padding: '6px 14px', 
        borderRadius: '10px', 
        border: '1px solid #ebdccb', 
        boxShadow: '0 2px 6px -2px rgba(67, 40, 24, 0.04)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            backgroundColor: '#7B5233', 
            color: '#fff', 
            fontSize: '0.75rem', 
            fontWeight: '800', 
            padding: '3px 8px', 
            borderRadius: '6px' 
          }}>
            {formData.code}
          </span>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#1e293b' }}>
            {isCreate ? 'Khởi Tạo Báo Cáo CAPA' : `Chi Tiết CAPA (${formData.code})`}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button
            onClick={() => navigate(returnUrl)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '5px 10px', 
              borderRadius: '7px', 
              border: '1px solid #cbd5e1', 
              backgroundColor: '#fff', 
              color: '#334155', 
              fontSize: '0.8rem', 
              fontWeight: '700', 
              cursor: 'pointer' 
            }}
          >
            <ArrowLeft size={13} /> Quay lại
          </button>

          <button
            onClick={handleExportPdf}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '5px 10px', 
              borderRadius: '7px', 
              border: '1px solid #cbd5e1', 
              backgroundColor: '#fff', 
              color: '#334155', 
              fontSize: '0.8rem', 
              fontWeight: '700', 
              cursor: 'pointer' 
            }}
          >
            <Download size={13} /> Xuất PDF
          </button>

          <button
            onClick={() => handleSave('Mở')}
            disabled={saving}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px', 
              padding: '5px 14px', 
              borderRadius: '7px', 
              border: 'none', 
              backgroundColor: '#7B5233', 
              color: '#fff', 
              fontSize: '0.82rem', 
              fontWeight: '800', 
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(123, 82, 51, 0.18)',
              opacity: saving ? 0.7 : 1
            }}
          >
            <CheckCircle2 size={14} /> {saving ? 'Đang lưu...' : (isCreate ? 'Khởi tạo CAPA' : 'Lưu thay đổi')}
          </button>
        </div>
      </div>

      {/* 3 Tabs Điều Hướng */}
      <div style={{ 
        display: 'flex', 
        backgroundColor: '#fff', 
        borderRadius: '10px', 
        padding: '3px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <button
          onClick={() => setActiveTab('general')}
          style={{ 
            flex: 1,
            padding: '7px 14px', 
            border: 'none', 
            borderRadius: '8px',
            backgroundColor: activeTab === 'general' ? '#7B5233' : 'transparent', 
            fontSize: '0.83rem', 
            fontWeight: activeTab === 'general' ? '800' : '600', 
            color: activeTab === 'general' ? '#fff' : '#64748b', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <FileText size={15} /> 1. Thông tin chung
        </button>

        <button
          onClick={() => setActiveTab('plan')}
          style={{ 
            flex: 1,
            padding: '7px 14px', 
            border: 'none', 
            borderRadius: '8px',
            backgroundColor: activeTab === 'plan' ? '#7B5233' : 'transparent', 
            fontSize: '0.83rem', 
            fontWeight: activeTab === 'plan' ? '800' : '600', 
            color: activeTab === 'plan' ? '#fff' : '#64748b', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Sparkles size={15} /> 2. Kế hoạch xử lý
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          style={{ 
            flex: 1,
            padding: '7px 14px', 
            border: 'none', 
            borderRadius: '8px',
            backgroundColor: activeTab === 'tracking' ? '#7B5233' : 'transparent', 
            fontSize: '0.83rem', 
            fontWeight: activeTab === 'tracking' ? '800' : '600', 
            color: activeTab === 'tracking' ? '#fff' : '#64748b', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldCheck size={15} /> 3. Theo dõi & Đánh giá
        </button>
      </div>

      {/* TAB 1: THÔNG TIN CHUNG */}
      {activeTab === 'general' && (
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '16px 20px', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          boxShadow: '0 2px 10px -2px rgba(0, 0, 0, 0.03)'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} color="#7B5233" /> Thông tin cơ bản sự cố
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>Các trường đánh dấu (*) là bắt buộc</span>
          </div>

          {/* Hàng 1: 3 Trường Hệ Thống (Mã phiếu, Thời gian, Người khởi tạo) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            
            {/* Mã phiếu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={13} color="#64748b" /> Mã phiếu (Khóa tự động)
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={formData.code} 
                  readOnly 
                  disabled
                  style={{ 
                    width: '100%', 
                    padding: '6px 10px 6px 32px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.83rem', 
                    backgroundColor: '#f8fafc', 
                    fontWeight: '800', 
                    color: '#1e293b',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }} 
                />
                <Lock size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Thời gian ghi nhận */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} color="#7B5233" /> Thời gian ghi nhận
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={formData.created_at_time} 
                  readOnly
                  disabled
                  style={{ 
                    width: '100%',
                    padding: '6px 10px 6px 32px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.83rem', 
                    backgroundColor: '#f8fafc',
                    fontWeight: '700',
                    color: '#1e293b',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }} 
                />
                <Clock size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Người khởi tạo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={13} color="#7B5233" /> Người khởi tạo
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={formData.creator_name} 
                  readOnly 
                  disabled
                  style={{ 
                    width: '100%', 
                    padding: '6px 10px 6px 32px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.83rem', 
                    backgroundColor: '#f8fafc', 
                    fontWeight: '700', 
                    color: '#432818',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }} 
                />
                <User size={14} color="#7B5233" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          </div>

          {/* Hàng 2: Người xử lý & Người đánh giá */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <MultiUserSelect 
              label="Người xử lý (QLCL)"
              selectedUsers={selectedHandlers}
              onChange={setSelectedHandlers}
              allUsers={qlclUsers}
              placeholder="Chọn 1 hoặc nhiều người xử lý thuộc QLCL..."
            />

            <MultiUserSelect 
              label="Người đánh giá (QLCL)"
              selectedUsers={selectedEvaluators}
              onChange={setSelectedEvaluators}
              allUsers={qlclUsers}
              placeholder="Chọn 1 hoặc nhiều người đánh giá thuộc QLCL..."
            />
          </div>

          {/* Mức độ sự cố & Phạm vi */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            
            {/* Mức độ sự cố */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Mức độ sự cố</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Khẩn cấp', 'Nghiêm trọng', 'Bình thường', 'Nhẹ'].map(item => {
                  const isChecked = formData.urgency === item;
                  return (
                    <label 
                      key={item} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        padding: '4px 10px', 
                        borderRadius: '16px', 
                        border: isChecked ? '1.5px solid #7B5233' : '1px solid #cbd5e1',
                        backgroundColor: isChecked ? '#f5efe9' : '#fff',
                        color: isChecked ? '#432818' : '#475569',
                        fontSize: '0.78rem', 
                        fontWeight: isChecked ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="urgency" 
                        checked={isChecked} 
                        onChange={() => setFormData({ ...formData, urgency: item })} 
                        style={{ accentColor: '#7B5233' }}
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Phạm vi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Phạm vi tác động</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Sản phẩm lỗi', 'Quy trình', 'Khiếu nại từ KH', 'Khác'].map(item => {
                  const isChecked = formData.scope === item;
                  return (
                    <label 
                      key={item} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        padding: '4px 10px', 
                        borderRadius: '16px', 
                        border: isChecked ? '1.5px solid #7B5233' : '1px solid #cbd5e1',
                        backgroundColor: isChecked ? '#f5efe9' : '#fff',
                        color: isChecked ? '#432818' : '#475569',
                        fontSize: '0.78rem', 
                        fontWeight: isChecked ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="scope" 
                        checked={isChecked} 
                        onChange={() => setFormData({ ...formData, scope: item })} 
                        style={{ accentColor: '#7B5233' }}
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mô tả sự cố */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
              Mô tả sự cố chi tiết <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea 
              rows={2} 
              value={formData.issue_description} 
              onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })} 
              placeholder="Nhập mô tả cụ thể về sự cố chất lượng, vị trí vi phạm, tác động..." 
              style={{ 
                padding: '8px 10px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.83rem', 
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit'
              }} 
            />
          </div>

          {/* Hình ảnh minh họa (Chọn nhiều ảnh) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Camera size={14} color="#7B5233" /> Hình ảnh minh họa đính kèm ({formData.images.length} ảnh)
              </label>

              <div style={{ display: 'flex', gap: '6px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #7B5233',
                  backgroundColor: '#f5efe9',
                  color: '#432818',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}>
                  <Camera size={13} /> Chọn ảnh từ máy
                  <input type="file" multiple accept="image/*" onChange={handleImageFileUpload} style={{ display: 'none' }} />
                </label>

                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} /> Thêm URL ảnh
                </button>
              </div>
            </div>

            {formData.images.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                {formData.images.map((imgUrl, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <img 
                      src={imgUrl} 
                      alt={`Minh họa ${idx + 1}`} 
                      onClick={() => setPreviewImage(imgUrl)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        position: 'absolute', top: '2px', right: '2px',
                        backgroundColor: 'rgba(220, 38, 38, 0.85)', color: '#fff',
                        border: 'none', borderRadius: '50%', width: '18px', height: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Xóa ảnh này"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hàng Thời gian đánh giá & Trạng thái */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} color="#7B5233" /> Thời gian đánh giá
              </label>
              <input 
                type="text" 
                value={formData.evaluation_time} 
                onChange={(e) => setFormData({ ...formData, evaluation_time: e.target.value })} 
                style={{ 
                  padding: '6px 10px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.83rem', 
                  backgroundColor: '#fff',
                  color: '#334155'
                }} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={13} color="#64748b" /> Trạng thái phiếu (Khóa tự động)
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '2px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '14px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  border: '1px solid #bbf7d0',
                  cursor: 'not-allowed'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                  Mở (Active)
                </span>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '14px',
                  backgroundColor: '#f1f5f9',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: '1px solid #e2e8f0',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }}>
                  Đóng (Closed)
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: KẾ HOẠCH XỬ LÝ */}
      {activeTab === 'plan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Section 1: Nguyên nhân */}
          <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>1. Phân tích nguyên nhân sự cố (5-Why)</h3>
              <button
                onClick={() => { setEditingCauseIdx(null); setIsCauseModalOpen(true); }}
                style={{ border: 'none', backgroundColor: '#f5efe9', color: '#7B5233', padding: '6px 12px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Thêm nguyên nhân
              </button>
            </div>

            {causes.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px' }}>Chưa có nguyên nhân nào được thêm.</div>
            ) : (
              causes.map((c, idx) => (
                <div key={idx} style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#334155' }}>{idx + 1}. {c.direct_cause}</div>
                  {c.whys && c.whys.map((w, wIdx) => (
                    <div key={wIdx} style={{ fontSize: '0.8rem', color: '#475569', marginLeft: '14px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#7B5233', fontWeight: '700' }}>• Why {wIdx + 1}:</span> {w}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Section 2: Hành động khắc phục */}
          <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>2. Hành động khắc phục tức thì</h3>
              <button
                onClick={() => setIsCorrectiveModalOpen(true)}
                style={{ border: 'none', backgroundColor: '#f5efe9', color: '#7B5233', padding: '6px 12px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Thêm hành động
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ backgroundColor: '#432818', color: '#fff', fontSize: '0.78rem' }}>
                  <th style={{ width: '40px', padding: '7px 10px', textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left' }}>Hành động khắc phục</th>
                  <th style={{ width: '110px', padding: '7px 10px', textAlign: 'center' }}>Thời hạn</th>
                  <th style={{ width: '140px', padding: '7px 10px', textAlign: 'center' }}>Người phụ trách</th>
                </tr>
              </thead>
              <tbody>
                {correctiveActions.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '7px 10px' }}>{idx + 1}</td>
                    <td style={{ padding: '7px 10px' }}>{row.action}</td>
                    <td style={{ textAlign: 'center', padding: '7px 10px' }}>{row.time}</td>
                    <td style={{ textAlign: 'center', padding: '7px 10px', fontWeight: '700', color: '#432818' }}>{row.handler}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Kế hoạch phòng ngừa */}
          <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>3. Kế hoạch phòng ngừa lâu dài</h3>
              <button
                onClick={() => { setEditingPlanIdx(null); setIsPreventiveModalOpen(true); }}
                style={{ border: 'none', backgroundColor: '#f5efe9', color: '#7B5233', padding: '6px 12px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Thêm kế hoạch phòng ngừa
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ backgroundColor: '#432818', color: '#fff', fontSize: '0.78rem' }}>
                  <th style={{ width: '40px', padding: '7px 10px', textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left' }}>Hành động phòng ngừa</th>
                  <th style={{ width: '130px', padding: '7px 10px', textAlign: 'center' }}>Người thực hiện</th>
                  <th style={{ width: '110px', padding: '7px 10px', textAlign: 'center' }}>Thời hạn</th>
                  <th style={{ padding: '7px 10px', textAlign: 'left' }}>Kết quả mong đợi</th>
                </tr>
              </thead>
              <tbody>
                {preventivePlans.map((plan, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '7px 10px' }}>{idx + 1}</td>
                    <td style={{ padding: '7px 10px' }}>{plan.action}</td>
                    <td style={{ textAlign: 'center', padding: '7px 10px', fontWeight: '700', color: '#432818' }}>{plan.performer}</td>
                    <td style={{ textAlign: 'center', padding: '7px 10px' }}>{plan.deadline}</td>
                    <td style={{ padding: '7px 10px' }}>{plan.expected_result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: THEO DÕI & ĐÁNH GIÁ */}
      {activeTab === 'tracking' && (
        <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>Lịch sử kiểm tra & Đánh giá hiệu quả định kỳ</h3>
            <button
              onClick={() => {
                setEditingEvalIdx(null);
                setIsEvalModalOpen(true);
              }}
              style={{ border: 'none', backgroundColor: '#f5efe9', color: '#7B5233', padding: '6px 12px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> Thêm lượt kiểm tra
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ backgroundColor: '#432818', color: '#fff', fontSize: '0.78rem' }}>
                <th style={{ width: '40px', padding: '7px 10px', textAlign: 'center' }}>STT</th>
                <th style={{ padding: '7px 10px', textAlign: 'left' }}>Nội dung</th>
                <th style={{ width: '110px', padding: '7px 10px', textAlign: 'center' }}>Ngày</th>
                <th style={{ padding: '7px 10px', textAlign: 'left' }}>Mong đợi</th>
                <th style={{ width: '110px', padding: '7px 10px', textAlign: 'center' }}>Kết quả</th>
                <th style={{ width: '70px', padding: '7px 10px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '16px' }}>
                    Chưa có lượt kiểm tra & đánh giá nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                evaluations.map((ev, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '7px 10px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '7px 10px', color: '#1e293b', fontWeight: '600' }}>{ev.content}</td>
                    <td style={{ textAlign: 'center', padding: '7px 10px', color: '#64748b' }}>{ev.execution_date}</td>
                    <td style={{ padding: '7px 10px', color: '#475569' }}>{ev.expected || ev.notes || 'Đạt tiêu chuẩn'}</td>
                    <td style={{ textAlign: 'center', padding: '7px 10px' }}>
                      <span style={{
                        backgroundColor: ev.result === 'Pass' ? '#f0fdf4' : '#fef2f2',
                        color: ev.result === 'Pass' ? '#15803d' : '#dc2626',
                        border: `1px solid ${ev.result === 'Pass' ? '#bbf7d0' : '#fecaca'}`,
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: '800'
                      }}>
                        {ev.result === 'Pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleDeleteEvaluation(idx)}
                          style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                          title="Xóa lượt kiểm tra"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Lightbox Modal để Xem Ảnh Phóng To */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={previewImage} alt="Enlarged" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                backgroundColor: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Cause Modal */}
      <CapaCauseModal
        isOpen={isCauseModalOpen}
        onClose={() => setIsCauseModalOpen(false)}
        onConfirm={handleConfirmCause}
        initialData={editingCauseIdx !== null ? causes[editingCauseIdx] : null}
      />

      {/* Preventive Plan Modal */}
      <CapaPreventiveModal
        isOpen={isPreventiveModalOpen}
        onClose={() => setIsPreventiveModalOpen(false)}
        onConfirm={handleConfirmPreventive}
        initialData={editingPlanIdx !== null ? preventivePlans[editingPlanIdx] : null}
      />

      {/* Evaluation Modal */}
      <CapaEvaluationModal
        isOpen={isEvalModalOpen}
        onClose={() => { setIsEvalModalOpen(false); setEditingEvalIdx(null); }}
        onSave={handleConfirmEvaluation}
        initialData={editingEvalIdx !== null ? evaluations[editingEvalIdx] : null}
        qlclUsers={qlclUsers}
      />

      {/* Corrective Action Modal */}
      <CapaCorrectiveModal
        isOpen={isCorrectiveModalOpen}
        onClose={() => setIsCorrectiveModalOpen(false)}
        onSave={handleConfirmCorrectiveAction}
        qlclUsers={qlclUsers}
      />

    </div>
  );
};

export default CapaFormView;

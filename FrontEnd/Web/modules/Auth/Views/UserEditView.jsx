import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@webShared/Services/api.service';

/**
 * View: Trang Chỉnh sửa tài khoản người dùng với logic phân cấp Role -> Permission -> Stage
 */
const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Dữ liệu danh mục từ API
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [stages, setStages] = useState([]);
  
  // Trạng thái Form
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    username: '',
    email: '',
    password: '', // Chỉ điền khi muốn đổi mật khẩu mới
    status: 'Đang sử dụng',
    role_id: '',
    permission_id: '',
    stage_ids: []
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // 1. Tải danh mục Roles khi mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await api.get('/roles/');
        setRoles(data);
      } catch (err) {
        console.error('Lỗi khi tải Roles:', err);
      }
    };
    fetchRoles();
  }, []);

  // 2. Tải thông tin người dùng hiện tại
  useEffect(() => {
    const fetchUserDetail = async () => {
      setFetching(true);
      try {
        const data = await api.get(`/accounts/${id}`);
        setFormData({
          employee_id: data.employee_id || '',
          full_name: data.full_name || '',
          username: data.username || '',
          email: data.email || '',
          password: '', // mật khẩu trống khi load
          status: data.status || 'Đang sử dụng',
          role_id: data.role_id || '',
          permission_id: data.permission_id || '',
          stage_ids: data.stage_ids || []
        });
      } catch (err) {
        console.error('Lỗi khi tải thông tin người dùng:', err);
        setError('Không thể tải thông tin người dùng.');
      } finally {
        setFetching(false);
      }
    };
    fetchUserDetail();
  }, [id]);

  // 3. Khi Role thay đổi -> Lấy danh sách Permissions của Role đó
  useEffect(() => {
    if (formData.role_id) {
      const fetchPermissions = async () => {
        try {
          const data = await api.get(`/roles/${formData.role_id}/permissions`);
          setPermissions(data);
        } catch (err) {
          console.error('Lỗi khi tải Permissions:', err);
        }
      };
      fetchPermissions();
    } else {
      setPermissions([]);
      setStages([]);
    }
  }, [formData.role_id]);

  // 4. Khi Permission thay đổi -> Lấy danh sách Stages tương ứng
  useEffect(() => {
    if (formData.permission_id) {
      const fetchStages = async () => {
        try {
          const data = await api.get(`/permissions/${formData.permission_id}/stages`);
          setStages(data);
        } catch (err) {
          console.error('Lỗi khi tải Stages:', err);
        }
      };
      fetchStages();
    } else {
      setStages([]);
    }
  }, [formData.permission_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStageCheckboxChange = (stageId, checked) => {
    setFormData(prev => {
      const currentIds = prev.stage_ids || [];
      if (checked) {
        return { ...prev, stage_ids: [...currentIds, stageId] };
      } else {
        return { ...prev, stage_ids: currentIds.filter(id => id !== stageId) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 1. Cập nhật thông tin tài khoản cơ bản (PUT)
      const baseUpdateData = {
        employee_code: formData.employee_id,
        name: formData.full_name,
        email: formData.email || null,
        status: formData.status,
        is_active: formData.status === 'Đang sử dụng'
      };

      // Chỉ gửi mật khẩu mới nếu được nhập
      if (formData.password) {
        baseUpdateData.password = formData.password;
      }

      await api.put(`/accounts/${id}`, baseUpdateData);

      // 2. Đồng bộ hóa vai trò / quyền / công đoạn (sync-departments)
      const syncPayload = {
        role_id: formData.role_id ? parseInt(formData.role_id, 10) : null,
        permission_id: formData.permission_id ? parseInt(formData.permission_id, 10) : null,
        stage_ids: formData.stage_ids && formData.stage_ids.length > 0 
          ? formData.stage_ids.map(sid => parseInt(sid, 10)) 
          : null
      };

      await api.post(`/accounts/${id}/sync-departments/`, syncPayload);

      alert('Cập nhật thông tin tài khoản thành công!');
      navigate('/admin/users');
    } catch (err) {
      console.error('Lỗi khi cập nhật tài khoản:', err);
      setError(err.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật tài khoản. Hãy kiểm tra lại dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="user-create-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <p style={{ color: '#7B5233', fontSize: '1.2rem', fontWeight: '600' }}>Đang tải dữ liệu tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="user-create-container">
      <div className="create-header">
        <button className="back-btn" onClick={() => navigate('/admin/users')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Quay lại danh sách
        </button>
        <h2 className="header-title">Chỉnh sửa tài khoản người dùng</h2>
        <p className="header-subtitle">Phân quyền theo quy trình Role &rarr; Permission &rarr; Stage</p>
      </div>

      <div className="create-content card">
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-section">
            <h3 className="section-title">Thông tin cơ bản</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Mã nhân viên</label>
                <input 
                  type="text" 
                  name="employee_id" 
                  placeholder="VD: 1245" 
                  value={formData.employee_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Họ và tên</label>
                <input 
                  type="text" 
                  name="full_name" 
                  placeholder="VD: Nguyễn Văn A" 
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Tài khoản & Bảo mật</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Tên đăng nhập (Username)</label>
                <input 
                  type="text" 
                  name="username" 
                  value={formData.username}
                  disabled
                  style={{ backgroundColor: '#F5F5F5', cursor: 'not-allowed' }}
                />
                <small className="hint">Không thể chỉnh sửa tên đăng nhập</small>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="VD: anv01@mail.com" 
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu mới (Bỏ trống nếu không đổi)</label>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleChange}
                />
                <small className="hint">Chỉ nhập khi bạn muốn thiết lập mật khẩu mới</small>
              </div>
              <div className="form-group">
                <label>Trạng thái tài khoản</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Đang sử dụng">Đang sử dụng</option>
                  <option value="Dừng hoạt động">Dừng hoạt động</option>
                  <option value="Đang chờ xóa">Đang chờ xóa</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Phân quyền phân cấp</h3>
            <div className="form-grid">
              {/* 1. Chọn Role */}
              <div className="form-group">
                <label>Vai trò (Role)</label>
                <select name="role_id" value={formData.role_id} onChange={handleChange}>
                  <option value="">-- Chọn vai trò --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Chọn Permission */}
              <div className={`form-group ${!formData.role_id ? 'disabled' : ''}`}>
                <label>Quyền hạn (Permission)</label>
                <select 
                  name="permission_id" 
                  value={formData.permission_id} 
                  onChange={handleChange} 
                  disabled={!formData.role_id}
                >
                  <option value="">-- Chọn quyền --</option>
                  {permissions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {!formData.role_id && <small className="hint">Hãy chọn Vai trò trước</small>}
              </div>

              {/* 3. Chọn Stage */}
              <div className={`form-group ${!formData.permission_id || stages.length === 0 ? 'disabled' : ''}`} style={{ gridColumn: 'span 2' }}>
                <label style={{ marginBottom: '8px', display: 'block' }}>Công đoạn phụ trách (Stages)</label>
                
                {!formData.permission_id ? (
                  <div className="empty-stages-hint">Hãy chọn Quyền trước</div>
                ) : stages.length === 0 ? (
                  <div className="empty-stages-hint">Quyền này không yêu cầu công đoạn sản xuất</div>
                ) : (
                  <div className="stages-checkbox-grid">
                    {stages.map(s => (
                      <label key={s.id} className="stage-checkbox-item">
                        <input 
                          type="checkbox"
                          checked={formData.stage_ids.includes(s.id)}
                          onChange={(e) => handleStageCheckboxChange(s.id, e.target.checked)}
                          style={{ marginRight: '8px', width: 'auto', cursor: 'pointer' }}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/users')}>Hủy bỏ</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .user-create-container { max-width: 900px; margin: 0 auto; width: 100%; }
        .create-header { margin-bottom: 30px; }
        .back-btn { display: flex; align-items: center; gap: 8px; background: none; border: none; color: #7B5233; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 20px; transition: transform 0.2s; }
        .back-btn:hover { transform: translateX(-5px); }
        .header-title { font-size: 1.8rem; color: #2D1A12; margin: 0 0 5px 0; font-weight: 700; }
        .header-subtitle { color: #888; font-size: 1rem; margin: 0; }
        .create-content { background: white; padding: 40px; border-radius: 12px; border: 1px solid #D3C1B4; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .create-form { display: flex; flex-direction: column; gap: 40px; }
        .section-title { font-size: 1.1rem; color: #7B5233; border-bottom: 1px solid #F0F0F0; padding-bottom: 10px; margin-bottom: 20px; font-weight: 700; }
        .grid-header { display: flex; align-items: center; gap: 10px; }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; position: relative; }
        .form-group.disabled { opacity: 0.6; }
        .form-group label { font-size: 0.9rem; font-weight: 600; color: #444; }
        .form-group input, .form-group select { padding: 12px 15px; border-radius: 8px; border: 1px solid #E0E0E0; font-size: 0.95rem; outline: none; transition: border-color 0.2s; background-color: white; }
        .form-group input:focus, .form-group select:focus { border-color: #7B5233; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        .form-group select:disabled { cursor: not-allowed; background-color: #F5F5F5; }
        .hint { font-size: 0.75rem; color: #999; margin-top: 2px; }
        .form-actions { display: flex; justify-content: flex-end; gap: 15px; padding-top: 20px; border-top: 1px solid #F0F0F0; }
        .btn { padding: 12px 25px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.2s; }
        .btn-primary { background-color: #7B5233; color: white; border: none; }
        .btn-primary:hover:not(:disabled) { background-color: #5D3E26; }
        .btn-primary:disabled { background-color: #ccc; cursor: not-allowed; }
        .btn-outline { background: white; border: 1px solid #E0E0E0; color: #666; }
        .btn-outline:hover { background-color: #F9F9F9; border-color: #CCC; }
        .error-message { background-color: #fdecea; color: #d32f2f; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; border: 1px solid #f5c2c7; }
        .stages-checkbox-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 15px; border: 1px solid #E0E0E0; border-radius: 8px; background-color: #FAFAFA; }
        .stage-checkbox-item { display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #333; transition: opacity 0.2s; }
        .stage-checkbox-item:hover { opacity: 0.8; }
        .empty-stages-hint { padding: 12px 15px; border: 1px dashed #E0E0E0; border-radius: 8px; background-color: #FAFAFA; color: #999; font-size: 0.9rem; text-align: center; }
        @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .create-content { padding: 20px; } .stages-checkbox-grid { grid-template-columns: repeat(2, 1fr); } }
      `}} />
    </div>
  );
};

export default UserEdit;

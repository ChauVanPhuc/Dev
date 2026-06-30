import React, { useState, useEffect, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { X, Upload, Plus } from 'lucide-react';
import '@styles/components.css';

const EquipmentHandoverView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeImageSlot, setActiveImageSlot] = useState(0);
  // Helper: parse images from stored string (JSON array or legacy single string)
  const parseImages = (imagesStr) => {
    if (!imagesStr || !imagesStr.trim()) return [];
    try {
      const parsed = JSON.parse(imagesStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    // Legacy: treat the whole string as a single image
    return [imagesStr];
  };

  // Helper: serialize images array to JSON string
  const serializeImages = (imagesArr) => {
    // Trim trailing empty slots
    let lastIdx = -1;
    for (let i = imagesArr.length - 1; i >= 0; i--) {
      if (imagesArr[i] && imagesArr[i].trim()) { lastIdx = i; break; }
    }
    if (lastIdx === -1) return '';
    return JSON.stringify(imagesArr.slice(0, lastIdx + 1));
  };

  const isImageValid = (img) => {
    if (!img) return false;
    const clean = String(img).trim().toLowerCase();
    return clean !== '' && clean !== 'null' && clean !== 'undefined' && clean !== 'none';
  };

  const handleDeleteImage = (index, e) => {
    if (e) e.stopPropagation();
    const currentImages = parseImages(formData.images);
    while (currentImages.length <= index) {
      currentImages.push('');
    }
    currentImages[index] = '';
    setFormData({ ...formData, images: serializeImages(currentImages) });
  };
  
  const [systemUsers, setSystemUsers] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
  
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    code: '',
    type: 'Đo lường',
    status: 'Bình thường',
    purchase_date: '',
    maintenance_cycle: 30,
    department: '',
    owner_name: '',
    calibration_date: '',
    handover_date: '',
    check_date: '',
    attachment_pdf: '',
    images: '',
    user_manual_steps: '[]'
  });

  // Fetch dynamic users and roles
  const fetchSystemUsersAndRoles = async () => {
    try {
      const usersRes = await api.get('/accounts/?page=1&size=1000');
      if (usersRes && Array.isArray(usersRes.items)) {
        setSystemUsers(usersRes.items);
      }
      
      const rolesRes = await api.get('/roles/');
      if (Array.isArray(rolesRes)) {
        setSystemRoles(rolesRes);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng và vai trò:', error);
    }
  };

  useEffect(() => {
    setCustomScreenCode('AD37.4');
    setCustomTitle(id ? 'Biên bản Bàn giao & Cập nhật thiết bị' : 'Khai báo & Bàn giao thiết bị mới');
    setCustomSubtitle('Khai báo thông tin thiết bị, đính kèm biên bản PDF và hình ảnh thực tế bàn giao.');
    
    fetchSystemUsersAndRoles();

    const loadEquipmentData = async () => {
      setLoading(true);
      try {
        const data = await api.get('/equipments/');
        const list = Array.isArray(data) ? data : [];
        if (id) {
          const eq = list.find(item => item.id === parseInt(id));
          if (eq) {
            setFormData({
              id: eq.id,
              name: eq.name || '',
              code: eq.code || '',
              type: eq.type || 'Đo lường',
              status: eq.status || 'Bình thường',
              purchase_date: eq.purchase_date || '',
              maintenance_cycle: eq.maintenance_cycle || 30,
              department: eq.department || '',
              owner_name: eq.owner_name || '',
              calibration_date: eq.calibration_date || '',
              handover_date: eq.handover_date || '',
              check_date: eq.check_date || '',
              attachment_pdf: eq.attachment_pdf || '',
              images: eq.images || '',
              user_manual_steps: eq.user_manual_steps || '[]'
            });
          }
        } else {
          setFormData(prev => ({
            ...prev,
            code: `EQP-${String(list.length + 1).padStart(3, '0')}`,
            purchase_date: new Date().toISOString().split('T')[0],
            handover_date: new Date().toISOString().split('T')[0],
            department: 'Quản lý chất lượng'
          }));
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu thiết bị:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEquipmentData();
  }, [id]);

  const handleSaveHandover = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    ['purchase_date', 'calibration_date', 'handover_date', 'check_date'].forEach(key => {
      if (!payload[key] || payload[key] === '') payload[key] = null;
    });
    if (payload.maintenance_cycle !== null && payload.maintenance_cycle !== undefined) {
      payload.maintenance_cycle = parseInt(payload.maintenance_cycle) || 30;
    } else {
      payload.maintenance_cycle = 30;
    }
    if (!payload.attachment_pdf) payload.attachment_pdf = null;
    if (!payload.images) payload.images = null;

    try {
      if (formData.id) {
        await api.put(`/equipments/${formData.id}`, payload);
      } else {
        await api.post('/equipments/', payload);
      }
      navigate('/admin/equipment');
    } catch (error) {
      const detail = error.response?.data?.detail;
      const errMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(', ') : 'Không thể lưu thông tin thiết bị.');
      setMessage({ type: 'error', text: errMsg });
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải thông tin thiết bị...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div className="card" style={{ padding: '24px', borderRadius: '20px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>
            {formData.id ? 'Biên bản Bàn giao & Cập nhật thiết bị' : 'Khai báo & Bàn giao thiết bị mới'}
          </h3>
          <button onClick={() => navigate('/admin/equipment')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={24} />
          </button>
        </div>

        {message.text && (
          <div style={{
            padding: '12px 20px', borderRadius: '12px', marginBottom: '15px',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontWeight: '600' }}>{message.text}</span>
            <X size={18} onClick={() => setMessage({type:'', text:''})} style={{ cursor: 'pointer', opacity: 0.5 }} />
          </div>
        )}

        <form onSubmit={handleSaveHandover} style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
          {/* Left Column: Image upload placeholders */}
          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
            <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569' }}>Ảnh thiết bị (Tối đa 3 ảnh)</label>
            
            <input 
              type="file" 
              ref={imageInputRef} 
              accept="image/*" 
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const currentImages = parseImages(formData.images);
                    while (currentImages.length <= activeImageSlot) {
                      currentImages.push('');
                    }
                    currentImages[activeImageSlot] = reader.result;
                    setFormData({ ...formData, images: serializeImages(currentImages) });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{ display: 'none' }} 
            />

            {(() => {
              const imageList = parseImages(formData.images);
              const img0 = imageList[0];
              const img1 = imageList[1];
              const img2 = imageList[2];

              return (
                <>
                  {/* Slot 0 (Main Image) */}
                  <div 
                    onClick={() => { setActiveImageSlot(0); imageInputRef.current.click(); }}
                    style={{
                      height: '180px', border: '2px dashed #cbd5e1', borderRadius: '12px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: '#f8fafc', padding: '15px', textAlign: 'center', cursor: 'pointer',
                      overflow: 'hidden', position: 'relative'
                    }}
                  >
                    {isImageValid(img0) ? (
                      <>
                        <img src={img0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteImage(0, e)}
                          style={{
                            position: 'absolute', top: '8px', right: '8px',
                            backgroundColor: '#ef4444', color: '#fff', border: 'none',
                            width: '24px', height: '24px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Tải ảnh chính lên</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>PNG, JPG kích thước tối đa 5MB</span>
                      </>
                    )}
                  </div>
                  
                  {/* Grid for Slot 1 and Slot 2 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* Slot 1 */}
                    <div 
                      onClick={() => { setActiveImageSlot(1); imageInputRef.current.click(); }}
                      style={{ 
                        height: '90px', border: '2px dashed #cbd5e1', borderRadius: '8px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        backgroundColor: '#f8fafc', cursor: 'pointer', overflow: 'hidden', position: 'relative'
                      }}
                    >
                      {isImageValid(img1) ? (
                        <>
                          <img src={img1} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteImage(1, e)}
                            style={{
                              position: 'absolute', top: '6px', right: '6px',
                              backgroundColor: '#ef4444', color: '#fff', border: 'none',
                              width: '20px', height: '20px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <Plus size={18} color="#cbd5e1" />
                      )}
                    </div>

                    {/* Slot 2 */}
                    <div 
                      onClick={() => { setActiveImageSlot(2); imageInputRef.current.click(); }}
                      style={{ 
                        height: '90px', border: '2px dashed #cbd5e1', borderRadius: '8px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        backgroundColor: '#f8fafc', cursor: 'pointer', overflow: 'hidden', position: 'relative'
                      }}
                    >
                      {isImageValid(img2) ? (
                        <>
                          <img src={img2} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteImage(2, e)}
                            style={{
                              position: 'absolute', top: '6px', right: '6px',
                              backgroundColor: '#ef4444', color: '#fff', border: 'none',
                              width: '20px', height: '20px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <Plus size={18} color="#cbd5e1" />
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Right Column: Inputs fields */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ margin: '0 0 -10px 0', fontSize: '14px', fontWeight: '900', color: '#7B5233' }}>Thông tin chi tiết biên bản</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px 20px' }}>
              <div className="form-group">
                <label className="required">Mã thiết bị</label>
                <input 
                  type="text" 
                  required 
                  value={formData.code} 
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
                  className="form-control" 
                  style={{ fontWeight: '700' }}
                />
              </div>
              <div className="form-group">
                <label className="required">Tên thiết bị</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Trạng thái thiết bị</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                  className="form-control"
                >
                  <option value="Bình thường">Bình thường</option>
                  <option value="Bảo trì">Bảo trì</option>
                  <option value="Cần thay mới">Cần thay mới</option>
                  <option value="Chưa kiểm tra">Chưa kiểm tra</option>
                </select>
              </div>
              <div className="form-group">
                <label>Bộ phận phụ trách</label>
                <select 
                  value={formData.department} 
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                  className="form-control"
                >
                  <option value="">-- Chọn bộ phận --</option>
                  {systemRoles.map((role) => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                  {systemRoles.length === 0 && (
                    <>
                      <option value="Quản lý chất lượng">Quản lý chất lượng</option>
                      <option value="Tổ đóng gói">Tổ đóng gói</option>
                      <option value="Tổ chà nhám">Tổ chà nhám</option>
                      <option value="Sản xuất">Sản xuất</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Người sở hữu (bàn giao cho)</label>
                <select 
                  value={formData.owner_name} 
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} 
                  className="form-control"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {systemUsers.map((user) => (
                    <option key={user.id} value={user.full_name}>{user.full_name} ({user.employee_id})</option>
                  ))}
                  {systemUsers.length === 0 && (
                    <>
                      <option value="Nguyễn Văn A">Nguyễn Văn A</option>
                      <option value="Nguyễn Văn B">Nguyễn Văn B</option>
                      <option value="Nguyễn Văn C">Nguyễn Văn C</option>
                      <option value="Nguyễn Văn D">Nguyễn Văn D</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Ngày hiệu chuẩn gần nhất</label>
                <input 
                  type="date" 
                  value={formData.calibration_date} 
                  onChange={(e) => setFormData({ ...formData, calibration_date: e.target.value })} 
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Ngày bàn giao</label>
                <input 
                  type="date" 
                  value={formData.handover_date} 
                  onChange={(e) => setFormData({ ...formData, handover_date: e.target.value })} 
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Ngày kiểm tra kế tiếp</label>
                <input 
                  type="date" 
                  value={formData.check_date} 
                  onChange={(e) => setFormData({ ...formData, check_date: e.target.value })} 
                  className="form-control"
                />
              </div>
            </div>

            {/* PDF Document attachment */}
            <div className="form-group">
              <label>Biên bản bàn giao đính kèm (.PDF)</label>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".pdf" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormData({ ...formData, attachment_pdf: `${file.name}|${reader.result}` });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ display: 'none' }} 
              />

              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={formData.attachment_pdf ? (formData.attachment_pdf.includes('|') ? formData.attachment_pdf.split('|')[0] : formData.attachment_pdf) : ''} 
                  onChange={(e) => setFormData({ ...formData, attachment_pdf: e.target.value })} 
                  placeholder="Ví dụ: bien_ban_ban_giao_m1.pdf" 
                  className="form-control" 
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                    backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px',
                    cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                  }}
                >
                  <Upload size={16} /> Chọn File
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => navigate('/admin/equipment')} 
                style={{
                  padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#475569',
                  border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                style={{
                  padding: '12px 30px', backgroundColor: '#7B5233', color: '#fff',
                  border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer'
                }}
              >
                Xác nhận Lưu
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipmentHandoverView;

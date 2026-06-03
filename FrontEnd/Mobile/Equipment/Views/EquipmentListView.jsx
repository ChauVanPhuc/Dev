import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, 
  Search, 
  Filter, 
  ChevronDown, 
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Settings,
  RefreshCw,
  Camera,
  Paperclip,
  Check,
  RotateCcw
} from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';

const EquipmentList = () => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('Tất cả');

  const [selectedEq, setSelectedEq] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState('Bình thường');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch data from SQL via Backend
  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const resp = await apiClient.get('/equipments/');
      setEquipments(resp.data || []);
    } catch (err) {
      console.error("Error fetching equipments:", err);
      // Fallback data if API fails for testing UI
      setEquipments([
        { id: 1, name: 'Thước đo', type: 'Đo lường', status: 'Cần thay mới' },
        { id: 2, name: 'Máy độ ẩm', type: 'Đo lường', status: 'Bình thường' },
        { id: 3, name: 'Thước đo độ cong', type: 'Đo lường', status: 'Chưa kiểm tra' },
        { id: 4, name: 'Thước kẹp', type: 'Đo lường', status: 'Bình thường' },
        { id: 5, name: 'Giá 48s', type: 'Giá kệ', status: 'Bình thường' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleEdit = (item) => {
    setSelectedEq(item);
    setNewStatus(item.status === 'Chưa kiểm tra' ? 'Bình thường' : item.status);
    setNote('');
    setPhotos([]);
    setShowModal(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedEq) return;
    try {
      setIsUpdating(true);
      await apiClient.patch(`/equipments/${selectedEq.id}/status?status=${encodeURIComponent(newStatus)}`);
      setShowModal(false);
      fetchEquipments(); // Tải lại danh sách
    } catch (err) {
      alert("Không thể cập nhật trạng thái thiết bị");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Bình thường': return '#22c55e';
      case 'Cần thay mới': return '#ef4444';
      case 'Bảo trì': return '#f59e0b';
      case 'Chưa kiểm tra': return '#7c6d5e';
      default: return '#7c6d5e';
    }
  };

  const filteredEquipments = equipments.filter(item => {
    const matchType = typeFilter === 'Tất cả' || item.type === typeFilter;
    const matchStatus = statusFilter === 'Tất cả' || item.status === statusFilter;
    return matchType && matchStatus;
  });

  const equipmentTypes = ['Tất cả', ...new Set(equipments.map(e => e.type))].filter(Boolean);
  const statusOptions = ['Tất cả', 'Bình thường', 'Cần thay mới', 'Chưa kiểm tra', 'Bảo trì'];

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="MB10 | Danh sách thiết bị" showBack={true} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
        
        {/* Filters Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>Loại thiết bị</span>
            <div style={{ position: 'relative' }}>
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e8e1d5',
                  backgroundColor: '#fff',
                  appearance: 'none',
                  fontSize: '14px',
                  color: '#4b301e',
                  fontWeight: '500'
                }}
              >
                {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c6d5e', pointerEvents: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>Trạng thái</span>
            <div style={{ position: 'relative' }}>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e8e1d5',
                  backgroundColor: '#fff',
                  appearance: 'none',
                  fontSize: '14px',
                  color: '#4b301e',
                  fontWeight: '500'
                }}
              >
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c6d5e', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Equipment Table */}
        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          border: '1px solid #e8e1d5',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#724e34', color: '#fff' }}>
                <th style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'left', fontWeight: '600' }}>Tên thiết bị</th>
                <th style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'left', fontWeight: '600' }}>Trạng thái</th>
                <th style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>Thực hiện</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: '#7c6d5e' }}>
                    <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13px' }}>Đang tải danh sách...</div>
                  </td>
                </tr>
              ) : filteredEquipments.length > 0 ? (
                filteredEquipments.map((item, idx) => (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ borderBottom: idx === filteredEquipments.length - 1 ? 'none' : '1px solid #f0ede8' }}
                  >
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#2d231a', fontWeight: '500' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{item.name}</span>
                        {item.code && <span style={{ fontSize: '11px', color: '#a3978b' }}>{item.code}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '13px', color: getStatusColor(item.status), fontWeight: '700' }}>
                      {item.status}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleEdit(item)}
                        style={{ 
                          background: 'none',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#7c6d5e',
                          margin: '0 auto',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <Pencil size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: '#7c6d5e', fontSize: '13px' }}>
                    Không tìm thấy thiết bị phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sync Button */}
        <button 
          onClick={fetchEquipments}
          style={{
            marginTop: 'auto',
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: '#4b301e',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: '700',
            fontSize: '15px'
          }}
        >
          <RefreshCw size={18} />
          Làm mới danh sách
        </button>
      </div>

      {/* Inspection Modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000
          }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                backgroundColor: '#fff',
                width: '100%',
                maxWidth: '400px',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>Kiểm tra thiết bị</h2>
                <button style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  color: '#724e34', 
                  fontWeight: '700', 
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}>
                  <Paperclip size={16} />
                  <span style={{ textDecoration: 'underline' }}>Xem HDKT</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Tên thiết bị</label>
                  <input 
                    value={selectedEq?.name || ''} 
                    readOnly 
                    placeholder="Thước đo"
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: '12px', 
                      border: '1.5px solid #f1f5f9', 
                      backgroundColor: '#f8fafc',
                      color: '#4b301e',
                      fontWeight: '600',
                      fontSize: '14px'
                    }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '8px' }}>Kết quả kiểm tra</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div 
                      onClick={() => setNewStatus('Bình thường')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid #22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff'
                      }}>
                        {newStatus === 'Bình thường' && (
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#22c55e'
                          }} />
                        )}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>Bình thường</span>
                    </div>

                    <div 
                      onClick={() => setNewStatus('Cần thay mới')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid #ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff'
                      }}>
                        {newStatus === 'Cần thay mới' && (
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#ef4444'
                          }} />
                        )}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>Cần thay mới</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>Ghi chú</label>
                <textarea 
                  placeholder="Nhập ghi chú"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ 
                    width: '100%', 
                    height: '80px', 
                    padding: '12px', 
                    borderRadius: '12px', 
                    border: '1.5px solid #e2e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '8px' }}>Ảnh minh chứng</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Photo Preview List */}
                  {photos.map((p, i) => (
                    <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <img 
                        src={p} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                      />
                      <button 
                        onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: '20px',
                          height: '20px',
                          borderRadius: '10px',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Add Photo Button */}
                  <div 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (re) => setPhotos(prev => [...prev, re.target.result]);
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '16px', 
                      backgroundColor: '#f8fafc', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '2px dashed #cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Camera size={28} color="#94a3b8" />
                    </motion.div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleSaveStatus}
                  disabled={isUpdating}
                  style={{
                    flex: 1.2,
                    padding: '14px',
                    borderRadius: '14px',
                    backgroundColor: '#4b301e',
                    color: '#fff',
                    border: 'none',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Check size={20} />
                  {isUpdating ? 'Đang lưu...' : 'Xác nhận'}
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    backgroundColor: '#fff',
                    color: '#94a3b8',
                    border: '1.5px solid #cbd5e1',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={20} />
                  Hủy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default EquipmentList;

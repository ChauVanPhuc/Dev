import React, { useState, useEffect } from 'react';
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

  return (
    <div style={{ padding: '5px 20px 20px' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #EADCC9', width: '100%', marginBottom: '10px',
        gap: '15px', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} size={16} />
            <input 
              type="text" 
              placeholder="Nhập Họ và tên hoặc Mã NV" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 12px 8px 38px', border: '1.5px solid #EADCC9', 
                borderRadius: '8px', outline: 'none', fontSize: '13px',
                backgroundColor: '#fff', color: '#7B5233'
              }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', border: 'none', background: 'none', cursor: 'pointer', color: '#7B5233' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"></path></svg>
          </button>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', border: 'none', background: 'none', cursor: 'pointer', color: '#7B5233' }}>
            <Filter size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <FileUp size={14} /> Nhập dữ liệu
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            <FileDown size={14} /> Xuất dữ liệu
          </button>
          <button 
            onClick={() => navigate('/admin/equipment/handover')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
          >
            <Plus size={14} /> Bàn giao
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>Nhật ký kiểm tra & Hiệu chuẩn thiết bị</h3>
          <button 
            onClick={() => navigate('/admin/equipment')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B5233', fontWeight: '700', fontSize: '13px' }}
          >
            Trở lại danh sách gốc
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải nhật ký kiểm tra...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Mã TB</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Tên Thiết Bị</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Người thực hiện</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Người kiểm tra</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Ngày kiểm tra</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Ngày hiệu chuẩn</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'right' }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((insp) => (
                  <tr key={insp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#7B5233' }}>{insp.equipment_code}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{insp.equipment_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{insp.performed_by || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{insp.verified_by || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{insp.check_date || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{insp.calibration_date || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800',
                        backgroundColor: insp.status === 'Bình thường' ? '#dcfce7' : '#fee2e2',
                        color: insp.status === 'Bình thường' ? '#15803d' : '#b91c1c'
                      }}>{insp.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', textAlign: 'right' }}>{insp.notes || '—'}</td>
                  </tr>
                ))}
                {inspections.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Không có lịch sử kiểm tra nào được ghi nhận.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentHistoryView;

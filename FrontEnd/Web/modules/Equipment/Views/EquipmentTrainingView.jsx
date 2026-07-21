import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Layers, FileUp, FileDown, Plus } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const EquipmentTrainingView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/equipment/training');
  const navigate = useNavigate();

  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOtherMenu, setShowOtherMenu] = useState(false);

  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/equipments/trainings');
      setTrainings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử đào tạo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

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
                <div onClick={() => { navigate('/admin/equipment/history'); setShowOtherMenu(false); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }} className="dropdown-hover">Lịch sử kiểm tra, hiệu chuẩn</div>
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
            <Plus size={14} /> Biên bản
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>Thông tin đào tạo sử dụng thiết bị</h3>
          <button 
            onClick={() => navigate('/admin/equipment')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B5233', fontWeight: '700', fontSize: '13px' }}
          >
            Trở lại danh sách gốc
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách đào tạo...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Mã TB</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Tên Thiết Bị</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Người đào tạo</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Nội dung tóm tắt</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Ngày đào tạo</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Ngày đánh giá</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>File tài liệu</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {trainings.map((train) => (
                  <tr key={train.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#7B5233' }}>{train.equipment_code}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{train.equipment_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>{train.trainer || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{train.summary || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{train.training_date || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{train.evaluation_date || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: '#A0301B', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={14} /> {train.file_name || 'tai_lieu.pdf'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/admin/equipment/training/detail/${train.id}`)}
                        style={{ padding: '6px 12px', background: '#f1f5f9', color: '#7B5233', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
                {trainings.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Không có thông tin đào tạo nào được ghi nhận.</td>
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

export default EquipmentTrainingView;

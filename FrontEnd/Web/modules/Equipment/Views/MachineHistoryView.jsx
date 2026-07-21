import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Filter, Layers, FileDown, Plus, ClipboardList } from 'lucide-react';
import '@styles/components.css';
import ExcelJS from 'exceljs';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const MachineHistoryView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/machines/history');
  const navigate = useNavigate();

  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const data = await api.get('/machines/maintenances/all');
      setMaintenances(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử bảo trì:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenances();
  }, []);

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Filtered maintenance logs
  const filteredMaintenances = useMemo(() => {
    return maintenances.filter(m => 
      m.machine_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.performed_by && m.performed_by.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [maintenances, searchTerm]);

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Lịch sử bảo trì');
      sheet.columns = [
        { header: 'Mã máy', key: 'machine_code', width: 15 },
        { header: 'Tên máy', key: 'machine_name', width: 30 },
        { header: 'Người thực hiện', key: 'performed_by', width: 20 },
        { header: 'Người kiểm chứng', key: 'verified_by', width: 20 },
        { header: 'Ngày kiểm tra', key: 'check_date', width: 15 },
        { header: 'Ngày bảo trì', key: 'maintenance_date', width: 15 },
        { header: 'Trạng thái sau bảo trì', key: 'status', width: 20 },
        { header: 'Ghi chú', key: 'notes', width: 30 }
      ];

      filteredMaintenances.forEach(m => {
        sheet.addRow({
          machine_code: m.machine_code,
          machine_name: m.machine_name,
          performed_by: m.performed_by || '',
          verified_by: m.verified_by || '',
          check_date: m.check_date || '',
          maintenance_date: m.maintenance_date || '',
          status: m.status || '',
          notes: m.notes || ''
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Lich_Su_Bao_Tri_May_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper useMemo for filtering to solve React dependency check warning
  function useMemo(fn, deps) {
    return React.useMemo(fn, deps);
  }

  return (
    <div style={{ padding: '5px 20px 20px', fontFamily: 'Inter, sans-serif' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #EADCC9', width: '100%', marginBottom: '10px',
        gap: '15px', flexWrap: 'wrap', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo mã máy hoặc tên máy..." 
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
          <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            <FileDown size={14} /> Xuất dữ liệu
          </button>
          <button 
            onClick={() => navigate('/admin/machines')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#5c3924', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
          >
            Quản lý máy móc
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>Nhật ký bảo dưỡng & Sửa chữa</h3>
          <button 
            onClick={() => navigate('/admin/machines')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B5233', fontWeight: '700', fontSize: '13px' }}
          >
            Trở lại danh sách gốc
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mgmtSpin 1s linear infinite', margin: '0 auto 15px auto' }} />
            Đang tải lịch sử bảo trì...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left', width: '120px' }}>Mã máy</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Tên máy</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Người thực hiện</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Người kiểm tra</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left', width: '120px' }}>Ngày kiểm tra</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left', width: '120px' }}>Ngày bảo trì</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left', width: '120px' }}>Kết quả</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', textAlign: 'left' }}>Nội dung bảo trì</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaintenances.map((maint) => (
                  <tr key={maint.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#7B5233' }}>{maint.machine_code}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{maint.machine_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{maint.performed_by || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{maint.verified_by || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{maint.check_date || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{maint.maintenance_date || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800',
                        backgroundColor: maint.status?.includes('bình thường') || maint.status === 'Bình thường' ? '#dcfce7' : '#fee2e2',
                        color: maint.status?.includes('bình thường') || maint.status === 'Bình thường' ? '#15803d' : '#b91c1c'
                      }}>{maint.status || 'Bình thường'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{maint.notes || '—'}</td>
                  </tr>
                ))}
                {filteredMaintenances.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      <ClipboardList size={40} style={{ margin: '0 auto 10px auto', opacity: 0.3, color: '#7B5233' }} />
                      Không tìm thấy lịch sử bảo trì nào.
                    </td>
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

export default MachineHistoryView;

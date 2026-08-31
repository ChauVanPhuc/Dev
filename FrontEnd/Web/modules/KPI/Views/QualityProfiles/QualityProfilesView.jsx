import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ShieldCheck, Search, Filter, Download, Plus, GitFork, 
  Table as TableIcon, Award, FileText, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

const mockQualityProfiles = [
  { id: 1, profile_code: 'HSQC-NM1-01', inspector_name: 'Nguyễn Văn Nam', role: 'Leader QC Công Đoạn (PQC)', factory: 'Nhà máy 1 (NM1)', line: 'Dây chuyền Đồ Gỗ XK', certification: 'ISO 9001:2015 Lead Auditor', active_tickets: 142, status: 'Đạt chuẩn' },
  { id: 2, profile_code: 'HSQC-NM1-02', inspector_name: 'Trần Thị Mai', role: 'NV Kiểm Hàng Đầu Vào (IQC)', factory: 'Nhà máy 1 (NM1)', line: 'Kho Nguyên Vật Liệu', certification: 'Chứng chỉ Đo lường & Thử nghiệm', active_tickets: 98, status: 'Đạt chuẩn' },
  { id: 3, profile_code: 'HSQC-NM2-01', inspector_name: 'Lê Hoàng Anh', role: 'Leader QC Đóng Gói (OQC)', factory: 'Nhà máy 2 (NM2)', line: 'Dây chuyền Sơn Hoàn Thiện', certification: 'Six Sigma Green Belt', active_tickets: 115, status: 'Đạt chuẩn' },
  { id: 4, profile_code: 'HSQC-NM3-01', inspector_name: 'Vũ Kim Ngân', role: 'NV Kiểm Thành Phẩm (FQC)', factory: 'Nhà máy 3 (NM3)', line: 'Kho Thành Phẩm', certification: 'Chứng nhận 5S/Kaizen Master', active_tickets: 86, status: 'Theo dõi' }
];

const QualityProfilesView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/kpi/quality-profiles');
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState(mockQualityProfiles);

  useEffect(() => {
    if (title && setCustomTitle) setCustomTitle(title);
    if (subtitle && setCustomSubtitle) setCustomSubtitle(subtitle);
    if (screenCode && setCustomScreenCode) setCustomScreenCode(screenCode);
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const filteredProfiles = profiles.filter(p =>
    p.inspector_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profile_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mgmt-container" style={{ padding: '16px 20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Action Bar (Matching Mockup 4 & 5) */}
      <div className="card" style={{
        background: '#FFFFFF',
        padding: '12px 18px',
        borderRadius: '12px',
        border: '1px solid #EADCC9',
        marginBottom: '16px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        
        {/* Left Side: Search & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Tìm mã hồ sơ, nhân sự QC, chức danh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: '#7B5233' }} />
          </div>

          <div style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0'
          }}>
            <button
              onClick={() => setViewMode('tree')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'tree' ? '#5D3B32' : 'transparent',
                color: viewMode === 'tree' ? '#FFFFFF' : '#475569',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <GitFork size={14} /> Sơ đồ cây
            </button>

            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#5D3B32' : 'transparent',
                color: viewMode === 'table' ? '#FFFFFF' : '#475569',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <TableIcon size={14} /> Danh sách bảng
            </button>
          </div>

        </div>

        {/* Right Side Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => toast('info', 'Đang cập nhật bộ lọc Hồ sơ chất lượng...')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#5D3B32', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <Filter size={14} /> Bộ lọc
          </button>

          <button
            onClick={() => toast('info', 'Tính năng Xuất Excel Hồ sơ QC đang được xử lý...')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <Download size={14} /> Xuất Excel
          </button>

          <button
            onClick={() => toast('success', 'Tạo hồ sơ chất lượng nhân sự mới...')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#5D3B32', color: '#FFFFFF', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(93, 59, 50, 0.2)' }}
          >
            <Plus size={14} /> Thêm hồ sơ QC
          </button>
        </div>

      </div>

      {/* Content Layout */}
      {viewMode === 'tree' ? (
        
        /* Mockup 4: Sơ Đồ Cây Hồ Sơ Chất Lượng */
        <div className="card" style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EADCC9',
          padding: '30px 20px',
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          
          <div style={{
            backgroundColor: '#5D3B32',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '14px 28px',
            textAlign: 'center',
            minWidth: '280px',
            boxShadow: '0 4px 12px rgba(93, 59, 50, 0.2)'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>Hệ Thống Hồ Sơ Chất Lượng QC</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Tổng chỉ số kiểm soát: <b>441 Phiếu kiểm tra</b></p>
          </div>

          <div style={{ width: '2px', height: '24px', backgroundColor: '#CBD5E1', margin: '16px 0' }}></div>

          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', width: '100%' }}>
            {profiles.map(p => (
              <div key={p.id} style={{
                backgroundColor: '#FAF6F0',
                border: '1.5px solid #7B5233',
                borderRadius: '12px',
                padding: '16px',
                width: '240px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#7B5233', textTransform: 'uppercase' }}>
                  {p.profile_code}
                </div>
                <h5 style={{ margin: '6px 0 2px 0', fontSize: '0.88rem', color: '#1E293B', fontWeight: '800' }}>
                  {p.inspector_name}
                </h5>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '8px' }}>
                  {p.role}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                  🏢 {p.factory}<br/>
                  ⚙️ {p.line}
                </div>
              </div>
            ))}
          </div>

        </div>

      ) : (

        /* Mockup 5: Bảng Hồ Sơ Chất Lượng */
        <div className="card" style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EADCC9',
          padding: '16px'
        }}>
          <div className="table-responsive desktop-only admin-table-scroll">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>STT</th>
                  <th style={{ width: '120px' }}>Mã HSQC</th>
                  <th>Nhân sự kiểm tra QC</th>
                  <th style={{ width: '180px' }}>Vị trí kiểm soát</th>
                  <th style={{ width: '140px' }}>Nhà máy</th>
                  <th style={{ width: '160px' }}>Dây chuyền</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Số phiếu kiểm</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p, idx) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '800', color: '#5D3B32' }}>{p.profile_code}</td>
                    <td style={{ fontWeight: '700', color: '#1E293B' }}>{p.inspector_name}</td>
                    <td style={{ color: '#334155' }}>{p.role}</td>
                    <td style={{ color: '#475569' }}>{p.factory}</td>
                    <td style={{ color: '#475569' }}>{p.line}</td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#5D3B32' }}>{p.active_tickets}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        backgroundColor: p.status === 'Đạt chuẩn' ? '#DCFCE7' : '#FEF3C7',
                        color: p.status === 'Đạt chuẩn' ? '#15803D' : '#D97706'
                      }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      )}

    </div>
  );
};

export default QualityProfilesView;

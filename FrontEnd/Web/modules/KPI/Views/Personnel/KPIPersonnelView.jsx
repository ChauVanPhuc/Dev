import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Users, Search, Filter, Download, Upload, Plus, GitFork, 
  Table as TableIcon, ChevronRight, User, MoreVertical, Eye, Edit2, Trash2 
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import KPITaskDetailModal from '../components/KPITaskDetailModal';
import '@styles/components.css';

/**
 * Mock Data Nhân sự & Sơ đồ tổ chức KPI / QC
 */
const initialPersonnelData = [
  { id: 1, employee_code: 'NV018', full_name: 'Nguyễn Văn Nam', position: 'Trưởng nhóm PQC', department: 'Phòng QA/QC', section: 'Tổ PQC', factory: 'Nhà máy 1 (NM1)', status: 'Hoạt động', kpi_target: 120, kpi_deducted: 40 },
  { id: 2, employee_code: 'NV025', full_name: 'Trần Thị Mai', position: 'Chuyên viên IQC', department: 'Phòng QA/QC', section: 'Tổ IQC', factory: 'Nhà máy 1 (NM1)', status: 'Hoạt động', kpi_target: 100, kpi_deducted: 10 },
  { id: 3, employee_code: 'NV032', full_name: 'Lê Hoàng Anh', position: 'Kỹ thuật viên OQC', department: 'Phòng QA/QC', section: 'Tổ OQC', factory: 'Nhà máy 2 (NM2)', status: 'Hoạt động', kpi_target: 110, kpi_deducted: 25 },
  { id: 4, employee_code: 'NV044', full_name: 'Phạm Đức Thắng', position: 'Giám sát Chất lượng', department: 'Phòng QA/QC', section: 'Ban Quản Lý QC', factory: 'Tất cả nhà máy', status: 'Hoạt động', kpi_target: 150, kpi_deducted: 15 },
  { id: 5, employee_code: 'NV051', full_name: 'Vũ Kim Ngân', position: 'Kiểm thanh FQC', department: 'Phòng QA/QC', section: 'Tổ FQC', factory: 'Nhà máy 3 (NM3)', status: 'Tạm dừng', kpi_target: 90, kpi_deducted: 5 }
];

const mockOrgTree = {
  id: 'root',
  name: 'Ban Giám Đốc & Phòng QA/QC',
  title: 'Giám Đốc Chất Lượng (QMR)',
  manager: 'Phạm Đức Thắng (NV044)',
  count: 18,
  children: [
    {
      id: 'sub_iqc',
      name: 'Bộ Phận Kiểm Hàng Đầu Vào (IQC)',
      title: 'Trưởng tổ IQC',
      manager: 'Trần Thị Mai (NV025)',
      count: 4,
      children: [
        { id: 'emp_1', name: 'Nguyễn Văn C', title: 'NV Kiểm hàng Nguyên Vật Liệu' },
        { id: 'emp_2', name: 'Đỗ Thị D', title: 'NV Kiểm bao bì nhãn mác' }
      ]
    },
    {
      id: 'sub_pqc',
      name: 'Bộ Phận Kiểm Trong Sản Xuất (PQC)',
      title: 'Trưởng tổ PQC',
      manager: 'Nguyễn Văn Nam (NV018)',
      count: 8,
      children: [
        { id: 'emp_3', name: 'Lê Văn E', title: 'NV Kiểm Công Đoạn Định Hình' },
        { id: 'emp_4', name: 'Hoàng Thi F', title: 'NV Kiểm Công Đoạn Sơn' }
      ]
    },
    {
      id: 'sub_oqc',
      name: 'Bộ Phận Kiểm Đóng Gói (OQC/FQC)',
      title: 'Trưởng tổ OQC',
      manager: 'Lê Hoàng Anh (NV032)',
      count: 6,
      children: [
        { id: 'emp_5', name: 'Vũ Kim Ngân (NV051)', title: 'NV Kiểm tra thành phẩm' }
      ]
    }
  ]
};

const KPIPersonnelView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/kpi/personnel');
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [personnelList, setPersonnelList] = useState(initialPersonnelData);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [factoryFilter, setFactoryFilter] = useState('all');

  useEffect(() => {
    if (title && setCustomTitle) setCustomTitle(title);
    if (subtitle && setCustomSubtitle) setCustomSubtitle(subtitle);
    if (screenCode && setCustomScreenCode) setCustomScreenCode(screenCode);
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const handleOpenTaskModal = (personnel) => {
    setSelectedPersonnel(personnel);
    setIsTaskModalOpen(true);
  };

  const filteredPersonnel = personnelList.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.section.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFactory = factoryFilter === 'all' || p.factory === factoryFilter;
    return matchesSearch && matchesFactory;
  });

  return (
    <div className="mgmt-container" style={{ padding: '16px 20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Action Bar (Matching Mockup 1 & 2) */}
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
        
        {/* Left Side: Search & View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm mã NV, tên nhân sự, bộ phận..."
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

          {/* View Mode Toggle Switcher: Sơ đồ cây vs Danh sách bảng */}
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
                cursor: 'pointer',
                transition: 'all 0.2s'
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
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <TableIcon size={14} /> Danh sách bảng
            </button>
          </div>

        </div>

        {/* Right Side Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              backgroundColor: isFilterOpen ? '#FAF6F0' : '#FFFFFF',
              color: '#5D3B32',
              fontWeight: '700',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Filter size={14} /> Bộ lọc
          </button>

          <button
            onClick={() => toast('info', 'Tính năng Xuất Excel đang được xử lý...')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontWeight: '700',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Xuất Excel
          </button>

          <button
            onClick={() => toast('info', 'Tính năng Nhập Excel đang được xử lý...')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontWeight: '700',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Upload size={14} /> Nhập Excel
          </button>

          <button
            onClick={() => toast('success', 'Mở form thêm mới nhân sự QC...')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#5D3B32',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(93, 59, 50, 0.2)'
            }}
          >
            <Plus size={14} /> Thêm mới
          </button>

        </div>

      </div>

      {/* Inline Filter Bar */}
      {isFilterOpen && (
        <div className="card" style={{
          backgroundColor: '#FAF6F0',
          border: '1px solid #EADCC9',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#5D3B32', marginRight: '8px' }}>
              Nhà máy:
            </label>
            <select
              value={factoryFilter}
              onChange={(e) => setFactoryFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem' }}
            >
              <option value="all">Tất cả nhà máy</option>
              <option value="Nhà máy 1 (NM1)">Nhà máy 1 (NM1)</option>
              <option value="Nhà máy 2 (NM2)">Nhà máy 2 (NM2)</option>
              <option value="Nhà máy 3 (NM3)">Nhà máy 3 (NM3)</option>
            </select>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {viewMode === 'tree' ? (
        
        /* 1. SƠ ĐỒ CÂY (ORG CHART TREE VIEW) Matching Mockup 1 */
        <div className="card" style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EADCC9',
          padding: '30px 20px',
          minHeight: '520px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowX: 'auto'
        }}>
          
          {/* Root Node */}
          <div style={{
            backgroundColor: '#5D3B32',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '14px 24px',
            textAlign: 'center',
            minWidth: '260px',
            boxShadow: '0 4px 12px rgba(93, 59, 50, 0.25)',
            marginBottom: '30px',
            position: 'relative'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>{mockOrgTree.name}</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>{mockOrgTree.title}: <b>{mockOrgTree.manager}</b></p>
            <span style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#FFEDD5', color: '#C2410C', fontSize: '0.7rem', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>
              {mockOrgTree.count} Nhân sự
            </span>
          </div>

          {/* Line Down Connector */}
          <div style={{ width: '2px', height: '24px', backgroundColor: '#CBD5E1', marginBottom: '24px' }}></div>

          {/* Second Level Nodes Grid */}
          <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', width: '100%', flexWrap: 'nowrap' }}>
            {mockOrgTree.children.map((sub) => (
              <div key={sub.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '240px' }}>
                
                {/* Node Box */}
                <div style={{
                  backgroundColor: '#FAF6F0',
                  border: '1.5px solid #7B5233',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  textAlign: 'center',
                  width: '100%',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}>
                  <h5 style={{ margin: 0, fontSize: '0.85rem', color: '#5D3B32', fontWeight: '800' }}>{sub.name}</h5>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>{sub.title}: <b>{sub.manager}</b></p>
                  <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#7B5233', fontWeight: '700' }}>
                    {sub.count} Thành viên
                  </div>
                </div>

                {/* Sub Connection Line */}
                <div style={{ width: '2px', height: '20px', backgroundColor: '#CBD5E1', margin: '8px 0' }}></div>

                {/* Leaves / Individual Staff Nodes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {sub.children.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => handleOpenTaskModal({ employee_code: child.id, full_name: child.name, position: child.title, section: sub.name, department: 'Phòng QA/QC', factory: 'Nhà máy 1 (NM1)', kpi_target: 120, kpi_deducted: 40 })}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <User size={14} color="#7B5233" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {child.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {child.title}
                        </div>
                      </div>
                      <ChevronRight size={14} color="#94A3B8" />
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>

        </div>

      ) : (

        /* 2. DANH SÁCH BẢNG (TABLE VIEW) Matching Mockup 2 */
        <div className="card" style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EADCC9',
          padding: '16px',
          overflow: 'hidden'
        }}>
          <div className="table-responsive desktop-only admin-table-scroll">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>STT</th>
                  <th style={{ width: '90px' }}>Mã NV</th>
                  <th>Họ và tên</th>
                  <th style={{ width: '150px' }}>Chức vụ</th>
                  <th style={{ width: '130px' }}>Phòng ban</th>
                  <th style={{ width: '110px' }}>Bộ phận</th>
                  <th style={{ width: '140px' }}>Nhà máy</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>KPI Đạt/Trừ</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                      Không tìm thấy nhân sự phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((p, idx) => (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenTaskModal(p)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ fontWeight: '800', color: '#5D3B32' }}>{p.employee_code}</td>
                      <td style={{ fontWeight: '700', color: '#1E293B' }}>{p.full_name}</td>
                      <td style={{ color: '#334155' }}>{p.position}</td>
                      <td style={{ color: '#475569' }}>{p.department}</td>
                      <td style={{ color: '#475569' }}>{p.section}</td>
                      <td style={{ color: '#475569' }}>{p.factory}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#334155' }}>
                          {p.kpi_target} / <span style={{ color: '#DC2626' }}>{p.kpi_deducted}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          backgroundColor: p.status === 'Hoạt động' ? '#DCFCE7' : '#F1F5F9',
                          color: p.status === 'Hoạt động' ? '#15803D' : '#64748B'
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenTaskModal(p)}
                          title="Xem thông tin chi tiết nhiệm vụ (CL03.2)"
                          style={{
                            border: 'none',
                            background: '#FAF6F0',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#5D3B32'
                          }}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* TÍCH HỢP MODAL CL03.2 */}
      <KPITaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskData={selectedPersonnel}
        onSave={(data) => {
          toast('success', `Đã lưu cập nhật nhiệm vụ cho ${data.employee_name}`);
        }}
      />

    </div>
  );
};

export default KPIPersonnelView;

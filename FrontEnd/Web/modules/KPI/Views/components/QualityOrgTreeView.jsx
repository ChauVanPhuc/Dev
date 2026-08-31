import React, { useState } from 'react';
import { Edit2, ChevronDown, ChevronRight, Shield, Building2, UserCheck, Briefcase, Calendar, Clock, AlertCircle } from 'lucide-react';

const QualityOrgTreeView = ({ employees = [], onSelectEmployee }) => {
  const [diagramTitle, setDiagramTitle] = useState('Sơ đồ chốt chặn QA/QC');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState('so_do_chot_chan');
  const [expandedNodes, setExpandedNodes] = useState(['root', 'dept_iqc', 'dept_pqc', 'dept_oqa']);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  // Group real employees or generate default structure for QC department
  const iqcMembers = employees.filter(e => (e.stage || '').toUpperCase().includes('IQC') || (e.department || '').toUpperCase().includes('ĐẦU VÀO'));
  const pqcMembers = employees.filter(e => (e.stage || '').toUpperCase().includes('PQC') || (e.stage || '').toUpperCase().includes('ĐỊNH HÌNH') || (e.stage || '').toUpperCase().includes('SƠN'));
  const oqaMembers = employees.filter(e => (e.stage || '').toUpperCase().includes('OQA') || (e.stage || '').toUpperCase().includes('ĐÓNG GÓI') || (e.stage || '').toUpperCase().includes('THÀNH PHẨM'));
  const otherMembers = employees.filter(e => !iqcMembers.includes(e) && !pqcMembers.includes(e) && !oqaMembers.includes(e));

  // Build tree nodes
  const treeData = {
    id: 'root',
    title: 'PHÒNG QUẢN LÝ CHẤT LƯỢNG (QA/QC)',
    leader: 'Nguyễn Văn Trưởng (Trưởng Phòng QC)',
    count: employees.length || 24,
    children: [
      {
        id: 'dept_iqc',
        title: 'Tổ QC Đầu Vào & Nguyên Vật Liệu (IQC)',
        leader: 'Lê Hoàng Nam (Lead IQC)',
        count: iqcMembers.length || 6,
        members: iqcMembers.length > 0 ? iqcMembers : [
          { id: 1, employee_id: 'NV_QLCL_001', full_name: 'Đặng Văn Nam', stage: 'IQC - NM1', factory: 'Nhà máy 1', department: 'Phòng QA/QC' },
          { id: 2, employee_id: 'NV_QLCL_002', full_name: 'Trần Thị Mai', stage: 'IQC - NM2', factory: 'Nhà máy 2', department: 'Phòng QA/QC' },
          { id: 3, employee_id: 'NV_QLCL_003', full_name: 'Lê Hoàng Nam', stage: 'Lead IQC', factory: 'Nhà máy 1', department: 'Phòng QA/QC' }
        ]
      },
      {
        id: 'dept_pqc',
        title: 'Tổ QC Công Đoạn Sản Xuất (PQC)',
        leader: 'Phạm Đức Duy (Lead PQC)',
        count: pqcMembers.length || 10,
        members: pqcMembers.length > 0 ? pqcMembers : [
          { id: 4, employee_id: 'NV_QLCL_004', full_name: 'Phạm Đức Duy', stage: 'PQC - Định Hình', factory: 'Nhà máy 1', department: 'Phòng QA/QC' },
          { id: 5, employee_id: 'NV_QLCL_005', full_name: 'Vũ Thị Hoa', stage: 'PQC - Sơn Mạ', factory: 'Nhà máy 2', department: 'Phòng QA/QC' },
          { id: 6, employee_id: 'NV_QLCL_006', full_name: 'Bùi Văn Hùng', stage: 'PQC - Hàn Lắp', factory: 'Nhà máy 3', department: 'Phòng QA/QC' }
        ]
      },
      {
        id: 'dept_oqa',
        title: 'Tổ QC Thành Phẩm & Đóng Gói (OQA)',
        leader: 'Nguyễn Văn Đạt (Lead OQA)',
        count: oqaMembers.length + otherMembers.length || 8,
        members: (oqaMembers.length > 0 ? [...oqaMembers, ...otherMembers] : [
          { id: 7, employee_id: 'NV_QLCL_007', full_name: 'Nguyễn Văn Đạt', stage: 'Lead OQA', factory: 'Nhà máy 1', department: 'Phòng QA/QC' },
          { id: 8, employee_id: 'NV_QLCL_008', full_name: 'Hoàng Văn Thái', stage: 'OQA Kiểm Đóng Gói', factory: 'Nhà máy 1', department: 'Phòng QA/QC' }
        ])
      }
    ]
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #EADCC9',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Top Header Controls inside Tree Canvas */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        paddingBottom: '16px',
        borderBottom: '1.5px solid #FAF0E6'
      }}>
        {/* Diagram Title with Editable pencil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isEditingTitle ? (
            <input
              type="text"
              value={diagramTitle}
              onChange={(e) => setDiagramTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
              style={{
                fontSize: '1.1rem',
                fontWeight: '800',
                color: '#2D1A12',
                border: '1.5px solid #7B5233',
                borderRadius: '6px',
                padding: '2px 8px'
              }}
            />
          ) : (
            <h3
              onClick={() => setIsEditingTitle(true)}
              style={{
                fontSize: '1.1rem',
                fontWeight: '800',
                color: '#2D1A12',
                margin: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {diagramTitle}
              <Edit2 size={16} style={{ color: '#7B5233', opacity: 0.7 }} />
            </h3>
          )}
        </div>

        {/* Scheme Selector */}
        <div>
          <select
            value={selectedScheme}
            onChange={(e) => setSelectedScheme(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1.5px solid #EADCC9',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#4A2E1B',
              backgroundColor: '#FAF6F0',
              cursor: 'pointer'
            }}
          >
            <option value="so_do_chot_chan">Sơ đồ chốt chặn QA/QC</option>
            <option value="so_do_phan_cong">Sơ đồ phân công công đoạn</option>
            <option value="so_do_nha_may">Sơ đồ bố trí theo nhà máy</option>
          </select>
        </div>
      </div>

      {/* Root Node Card (Trưởng phòng QA/QC) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          onClick={() => toggleNode('root')}
          style={{
            backgroundColor: '#32251e',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '16px 28px',
            boxShadow: '0 4px 14px rgba(50,37,30,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: 'pointer',
            minWidth: '320px',
            justify: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={24} style={{ color: '#EADCC9' }} />
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{treeData.title}</div>
              <div style={{ fontSize: '0.78rem', color: '#EADCC9', marginTop: '2px' }}>{treeData.leader}</div>
            </div>
          </div>
          <span style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            {treeData.count} nhân sự
          </span>
        </div>

        {/* Connecting Vertical Line */}
        {expandedNodes.includes('root') && (
          <div style={{ width: '2px', height: '24px', backgroundColor: '#CBD5E1' }} />
        )}
      </div>

      {/* Level 2 Sub-departments Grid */}
      {expandedNodes.includes('root') && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}>
          {treeData.children.map((subDept) => {
            const isSubExpanded = expandedNodes.includes(subDept.id);
            return (
              <div
                key={subDept.id}
                style={{
                  backgroundColor: '#FAF6F0',
                  borderRadius: '14px',
                  border: '1.5px solid #EADCC9',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Sub-dept Header */}
                <div
                  onClick={() => toggleNode(subDept.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} style={{ color: '#7B5233' }} />
                    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#2D1A12' }}>
                      {subDept.title}
                    </div>
                  </div>
                  <span style={{
                    backgroundColor: '#EADCC9',
                    color: '#7B5233',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '10px'
                  }}>
                    {subDept.count}
                  </span>
                </div>

                {/* Sub-dept leader info */}
                <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '600', paddingLeft: '26px' }}>
                  Phụ trách: {subDept.leader}
                </div>

                {/* Members list cards */}
                {isSubExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {subDept.members.map((emp) => (
                      <div
                        key={emp.id || emp.employee_id}
                        onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '10px',
                          border: '1px solid #EADCC9',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7B5233'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#EADCC9'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: '#32251e',
                            color: '#ffffff',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'center',
                            fontSize: '0.8rem'
                          }}>
                            {(emp.full_name || 'N').substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#2D1A12' }}>
                              {emp.full_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {emp.employee_id} • {emp.stage || emp.department || 'QC'}
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#E0F2FE',
                          color: '#0369A1'
                        }}>
                          {emp.factory || 'NM1'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QualityOrgTreeView;

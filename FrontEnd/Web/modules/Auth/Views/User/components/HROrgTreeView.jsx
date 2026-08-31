import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users, UserCheck, Shield, Building2, Briefcase, Info } from 'lucide-react';

const HROrgTreeView = ({ employees = [], onSelectEmployee = null }) => {
  const [expandedNodes, setExpandedNodes] = useState(['root', 'dept_qc', 'dept_prod', 'dept_plan']);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  // Mock Org Structure Data aligned with System Roles
  const orgStructure = [
    {
      id: 'root',
      title: 'BAN GIÁM ĐỐC SMARTFLOW ERP',
      leader: 'Nguyễn Văn Đạt (Tổng Giám Đốc)',
      count: 42,
      children: [
        {
          id: 'dept_qc',
          title: 'PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL / QC)',
          leader: 'Nguyễn Văn Trưởng (Trưởng Phòng QC)',
          count: 19,
          children: [
            {
              id: 'team_qc_in',
              title: 'Tổ QC Đầu Vào & Nguyên Vật Liệu (IQC)',
              count: 6,
              members: [
                { id: 'NV001', name: 'Đặng Văn Nam', role: 'Staff IQC - NM1', phone: '0981234567', status: 'Hoạt động' },
                { id: 'NV002', name: 'Trần Thị Mai', role: 'Staff IQC - NM2', phone: '0987654321', status: 'Hoạt động' },
                { id: 'NV003', name: 'Lê Hoàng Nam', role: 'Lead IQC', phone: '0912345678', status: 'Hoạt động' }
              ]
            },
            {
              id: 'team_qc_process',
              title: 'Tổ QC Công Đoạn & Thành Phẩm (PQC/OQA)',
              count: 13,
              members: [
                { id: 'NV004', name: 'Phạm Đức Duy', role: 'Staff PQC - Định Hình', phone: '0933445566', status: 'Hoạt động' },
                { id: 'NV005', name: 'Vũ Thị Hoa', role: 'Staff PQC - Sơn Mạ', phone: '0944556677', status: 'Hoạt động' },
                { id: 'NV006', name: 'Bùi Văn Hùng', role: 'Staff OQA - Kiểm Đóng Gói', phone: '0955667788', status: 'Hoạt động' }
              ]
            }
          ]
        },
        {
          id: 'dept_prod',
          title: 'KHỐI SẢN XUẤT (NM1, NM2, NM3)',
          leader: 'Lê Văn Sơn (Giám Đốc Sản Xuất)',
          count: 18,
          children: [
            {
              id: 'team_factory1',
              title: 'Phân Xưởng 1 - Cơ Khí & Định Hình',
              count: 10,
              members: [
                { id: 'NV007', name: 'Nguyễn Văn Cường', role: 'Tổ Trưởng Định Hình', phone: '0966778899', status: 'Hoạt động' },
                { id: 'NV008', name: 'Trần Văn Bình', role: 'Kỹ Thuật Máy', phone: '0977889900', status: 'Hoạt động' }
              ]
            },
            {
              id: 'team_factory2',
              title: 'Phân Xưởng 2 - Sơn Mạ & Lắp Ráp',
              count: 8,
              members: [
                { id: 'NV009', name: 'Đỗ Minh Tuấn', role: 'Tổ Trưởng Sơn Mạ', phone: '0988990011', status: 'Hoạt động' }
              ]
            }
          ]
        },
        {
          id: 'dept_plan',
          title: 'PHÒNG KẾ HOẠCH & VẬT TƯ',
          leader: 'Hoàng Thị Dung (Trưởng Phòng KH)',
          count: 5,
          children: [
            {
              id: 'team_planning',
              title: 'Bộ Phận Lập Kế Hoạch Sản Xuất',
              count: 5,
              members: [
                { id: 'NV010', name: 'Phan Văn Hải', role: 'Chuyên Viên Kế Hoạch', phone: '0999001122', status: 'Hoạt động' }
              ]
            }
          ]
        }
      ]
    }
  ];

  const renderTreeNode = (node, depth = 0) => {
    const isExpanded = expandedNodes.includes(node.id);
    const hasChildren = (node.children && node.children.length > 0) || (node.members && node.members.length > 0);

    return (
      <div key={node.id} style={{ marginLeft: depth > 0 ? '24px' : '0px', marginTop: '12px' }}>
        
        {/* Box Card cho Nút Tổ Chức - Đúng kiểu Wireframe Màn Hình 1 */}
        <div 
          onClick={() => hasChildren && toggleNode(node.id)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: depth === 0 ? '#7B5233' : (depth === 1 ? '#FAF6F0' : '#ffffff'),
            color: depth === 0 ? '#ffffff' : '#1e293b',
            borderRadius: '12px',
            border: depth === 0 ? 'none' : '1px solid #EADCC9',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            cursor: hasChildren ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasChildren && (
              <span style={{ display: 'flex', color: depth === 0 ? '#ffffff' : '#7B5233' }}>
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </span>
            )}
            {depth === 0 ? <Building2 size={20} /> : (depth === 1 ? <Shield size={18} style={{ color: '#7B5233' }} /> : <Briefcase size={16} style={{ color: '#7B5233' }} />)}
            <div>
              <div style={{ fontWeight: '800', fontSize: depth === 0 ? '14px' : '13px' }}>
                {node.title}
              </div>
              {node.leader && (
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                  Đứng đầu: {node.leader}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800',
              backgroundColor: depth === 0 ? 'rgba(255,255,255,0.2)' : '#EADCC9',
              color: depth === 0 ? '#ffffff' : '#7B5233'
            }}>
              {node.count} nhân sự
            </span>
          </div>
        </div>

        {/* Render Children (Sub-nodes or Employee members) */}
        {isExpanded && (
          <div style={{ borderLeft: '2px dashed #EADCC9', marginLeft: '16px', paddingLeft: '12px' }}>
            
            {/* Sub-departments */}
            {node.children && node.children.map(child => renderTreeNode(child, depth + 1))}

            {/* Member Employee Cards */}
            {node.members && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px', marginTop: '12px' }}>
                {node.members.map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                    style={{
                      padding: '10px 14px', backgroundColor: '#fff', borderRadius: '10px',
                      border: '1px solid #EADCC9', boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '16px', backgroundColor: '#7B5233',
                      color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                    }}>
                      {emp.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {emp.id} • {emp.role}
                      </div>
                    </div>
                    <span style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#22c55e' }} title={emp.status} />
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    );
  };

  return (
    <div style={{ padding: '10px 0', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '15px', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7B5233', fontWeight: '700', fontSize: '13px' }}>
          <Building2 size={18} />
          <span>Sơ đồ cấu trúc cây tổ chức công ty (Org Chart Tree View)</span>
        </div>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Bấm vào từng nhóm để thu gọn / mở rộng</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {orgStructure.map(rootNode => renderTreeNode(rootNode, 0))}
      </div>
    </div>
  );
};

export default HROrgTreeView;

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Layers, Factory, CheckCircle2, ShieldAlert, FileText } from 'lucide-react';

const QualityCategoryTreeSidebar = ({ onSelectCategory = null, activeCategory = 'all' }) => {
  const [expanded, setExpanded] = useState(['nm1', 'nm2', 'nm3']);

  const toggleNode = (nodeId) => {
    setExpanded(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
  };

  const treeData = [
    {
      id: 'all',
      name: 'Tất cả Hồ sơ Chất lượng',
      count: 142,
      icon: Layers
    },
    {
      id: 'nm1',
      name: 'Nhà máy 1 - Định hình & Cơ khí',
      count: 58,
      icon: Factory,
      children: [
        { id: 'nm1_iqc', name: 'Hồ sơ kiểm tra IQC Đầu vào', count: 18, type: 'iqc' },
        { id: 'nm1_pqc', name: 'Hồ sơ PQC Công đoạn Định hình', count: 25, type: 'pqc' },
        { id: 'nm1_oqa', name: 'Hồ sơ OQA Thành phẩm Xưởng 1', count: 15, type: 'oqa' }
      ]
    },
    {
      id: 'nm2',
      name: 'Nhà máy 2 - Sơn mạ & Lắp ráp',
      count: 46,
      icon: Factory,
      children: [
        { id: 'nm2_paint', name: 'Hồ sơ PQC Công đoạn Sơn mạ', count: 28, type: 'paint' },
        { id: 'nm2_pack', name: 'Hồ sơ Kiểm tra Đóng gói', count: 18, type: 'pack' }
      ]
    },
    {
      id: 'nm3',
      name: 'Nhà máy 3 - Mộc & Chế biến gỗ',
      count: 38,
      icon: Factory,
      children: [
        { id: 'nm3_wood', name: 'Hồ sơ Kiểm định Độ ẩm & Cong', count: 20, type: 'wood' },
        { id: 'nm3_final', name: 'Hồ sơ Kiểm tra Thành phẩm Mộc', count: 18, type: 'final' }
      ]
    }
  ];

  return (
    <div style={{
      width: '260px',
      minWidth: '260px',
      backgroundColor: '#fff',
      borderRight: '1px solid #EADCC9',
      borderRadius: '12px',
      padding: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        paddingBottom: '10px',
        marginBottom: '10px',
        borderBottom: '1px solid #EADCC9',
        display: 'flex', alignItems: 'center', gap: '8px',
        color: '#7B5233', fontWeight: '800', fontSize: '13px'
      }}>
        <Layers size={16} />
        <span>Phân loại Hồ sơ Chất lượng</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {treeData.map(node => {
          const isSelected = activeCategory === node.id;
          const isExpanded = expanded.includes(node.id);
          const hasChildren = node.children && node.children.length > 0;
          const IconComp = node.icon || Folder;

          return (
            <div key={node.id}>
              <div
                onClick={() => {
                  if (hasChildren) toggleNode(node.id);
                  if (onSelectCategory) onSelectCategory(node.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                  backgroundColor: isSelected ? '#7B5233' : 'transparent',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontWeight: isSelected ? '700' : '600',
                  fontSize: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {hasChildren ? (
                    isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                  ) : (
                    <span style={{ width: 14 }} />
                  )}
                  <IconComp size={15} style={{ color: isSelected ? '#ffffff' : '#7B5233', flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.name}
                  </span>
                </div>

                <span style={{
                  padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: '800',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#FAF6F0',
                  color: isSelected ? '#ffffff' : '#7B5233',
                  border: isSelected ? 'none' : '1px solid #EADCC9'
                }}>
                  {node.count}
                </span>
              </div>

              {/* Sub-children */}
              {hasChildren && isExpanded && (
                <div style={{ marginLeft: '20px', paddingLeft: '8px', borderLeft: '2px dashed #EADCC9', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {node.children.map(child => {
                    const isChildSelected = activeCategory === child.id;
                    return (
                      <div
                        key={child.id}
                        onClick={() => onSelectCategory && onSelectCategory(child.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                          backgroundColor: isChildSelected ? '#7B5233' : 'transparent',
                          color: isChildSelected ? '#ffffff' : '#475569',
                          fontSize: '11px', fontWeight: isChildSelected ? '700' : '500'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <FileText size={13} style={{ color: isChildSelected ? '#ffffff' : '#94a3b8' }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {child.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', opacity: 0.8 }}>{child.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QualityCategoryTreeSidebar;

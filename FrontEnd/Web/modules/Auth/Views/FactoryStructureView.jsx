import React, { useState, useEffect } from 'react';
import { Network, List, Edit2, Trash2, Building2 } from 'lucide-react';
import { hrService } from '../Models/hr.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import FactoryStructureModal from './FactoryStructureModal';

const FactoryStructureView = ({ diagramDropdown }) => {
  const [structures, setStructures] = useState([]);
  const [viewMode, setViewMode] = useState('chart');
  const [search, setSearch] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState(null);

  const loadData = async () => {
    try {
      const res = await hrService.getFactoryStructures();
      setStructures(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (structure) => {
    setSelectedStructure(structure);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cấu trúc nhà máy này?')) return;
    try {
      await hrService.deleteFactoryStructure(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi xóa cấu trúc.');
    }
  };

  const filteredStructures = structures.filter(struct => {
    const term = search.toLowerCase();
    return (
      struct.structure_code.toLowerCase().includes(term) ||
      struct.structure_name.toLowerCase().includes(term) ||
      struct.structure_type.toLowerCase().includes(term) ||
      (struct.department_name && struct.department_name.toLowerCase().includes(term))
    );
  });

  const roots = filteredStructures.filter(n => !n.parent_id);
  const childrenMap = {};
  filteredStructures.forEach(struct => {
    if (struct.parent_id) {
      if (!childrenMap[struct.parent_id]) childrenMap[struct.parent_id] = [];
      childrenMap[struct.parent_id].push(struct);
    }
  });

  const getTypeColor = (type) => {
    if (type === 'Nhà máy') return '#059669';
    if (type === 'Phân xưởng') return '#2563EB';
    return '#7B5233';
  };

  const TreeNode = ({ node }) => {
    const children = childrenMap[node.id] || [];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{
          backgroundColor: '#fff',
          border: '1.5px solid #EADCC9',
          borderRadius: '12px',
          padding: '12px 16px',
          width: '240px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 10,
          transition: 'all 0.2s',
          cursor: 'pointer',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(123, 82, 51, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#EADCC9'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
        onClick={() => handleEdit(node)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#FAF6F0', color: getTypeColor(node.structure_type), padding: '2px 8px', borderRadius: '12px' }}>
              {node.structure_type}
            </span>
            <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => handleEdit(node)} style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: '2px' }}>
                <Edit2 size={12} />
              </button>
              <button onClick={() => handleDelete(node.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#2D1A12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.structure_name}
          </div>
          
          <div style={{ fontSize: '0.7rem', color: '#6B7280', display: 'flex', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span>Mã: {node.structure_code}</span>
            {node.department_name && <span>• PB: {node.department_name}</span>}
          </div>

          {node.description && (
            <div style={{ fontSize: '0.7rem', color: '#6B7280', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
              {node.description}
            </div>
          )}

          <div style={{
            marginTop: '4px',
            borderTop: '1px solid #F3F4F6',
            paddingTop: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: '#7B5233'
          }}>
            <Building2 size={12} />
            <span style={{ fontWeight: 600 }}>Cấu trúc nhà máy</span>
          </div>
        </div>

        {children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div style={{ width: '2px', height: '24px', backgroundColor: '#C4B5A5', zIndex: 1 }} />
            <div style={{ display: 'flex', position: 'relative', width: '100%', justifyContent: 'center' }}>
              {children.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === children.length - 1;
                const isSingle = children.length === 1;

                return (
                  <div
                    key={child.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      flex: 1
                    }}
                  >
                    {!isSingle && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: isFirst ? '50%' : 0,
                        right: isLast ? '50%' : 0,
                        height: '2px',
                        backgroundColor: '#C4B5A5',
                        zIndex: 1
                      }} />
                    )}
                    <div style={{ width: '2px', height: '24px', backgroundColor: '#C4B5A5', zIndex: 1 }} />
                    <TreeNode node={child} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      <PageToolbar
        searchValue={search}
        onSearchChange={(val) => setSearch(val)}
        searchPlaceholder="Nhập Mã, Tên màn"
        showSort={true}
        sortOptions={[
          { value: 'code_asc', label: 'Mã tăng dần' },
          { value: 'code_desc', label: 'Mã giảm dần' }
        ]}
        showFilter={true}
        extraActions={[
          { label: 'Cấu hình nhà máy', onClick: () => {} }
        ]}
        importActions={[
          { label: 'Nhập từ file Excel', onClick: () => {} }
        ]}
        onExport={() => {}}
        onCreate={() => { setSelectedStructure(null); setModalOpen(true); }}
        createLabel="Thêm mới"
        hasWritePermission={true}
      />

      {/* Toggle Mode selectors below toolbar on the right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div style={{
          display: 'inline-flex',
          backgroundColor: '#4A2E1B',
          padding: '2px',
          borderRadius: '4px',
          border: '1px solid #4A2E1B',
          height: '28px',
          boxSizing: 'border-box'
        }}>
          <button
            onClick={() => setViewMode('chart')}
            style={{
              padding: '0 12px',
              borderRadius: '3px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: viewMode === 'chart' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'chart' ? '#4A2E1B' : '#FFFFFF',
              transition: 'all 0.15s',
              height: '100%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Xem dạng sơ đồ
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '0 12px',
              borderRadius: '3px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'table' ? '#4A2E1B' : '#FFFFFF',
              transition: 'all 0.15s',
              height: '100%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Xem dạng bảng
          </button>
        </div>
      </div>

      <div style={{ flex: 1, marginTop: '16px' }}>
        {viewMode === 'chart' ? (
          <div style={{
            backgroundColor: '#FAF8F5',
            border: '1px solid #EADCC9',
            borderRadius: '12px',
            padding: '32px 24px',
            overflowX: 'auto',
            minHeight: '480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            {/* Dropdown inside diagram card aligned to right, matching Mockup Image 4 */}
            {diagramDropdown && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '8px' }}>
                {diagramDropdown}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: '40px', width: '100%' }}>
              {roots.length === 0 ? (
                <div style={{ color: '#9CA3AF', textAlign: 'center', marginTop: '100px', fontSize: '0.9rem' }}>
                  Không tìm thấy cấu trúc nhà máy phù hợp. Nhấp "+ Thêm mới" để bắt đầu tạo cấu trúc.
                </div>
              ) : roots.map(root => (
                <TreeNode key={root.id} node={root} />
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Dropdown inside table card aligned to right, matching Mockup Image 4 */}
            {diagramDropdown && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0 16px' }}>
                {diagramDropdown}
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left', marginTop: '8px' }}>
              <thead>
                <tr style={{ backgroundColor: '#7B5233', color: '#fff' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mã</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tên cấu trúc</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Loại</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Phòng ban</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Cấu trúc cha</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStructures.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>Không tìm thấy cấu trúc nhà máy nào.</td>
                  </tr>
                ) : filteredStructures.map(struct => (
                  <tr
                    key={struct.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FDFBF7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7B5233' }}>{struct.structure_code}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1E293B' }}>{struct.structure_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        backgroundColor: '#FAF6F0', 
                        color: getTypeColor(struct.structure_type), 
                        padding: '2px 8px', 
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {struct.structure_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{struct.department_name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>{struct.parent_structure_name || 'Cấu trúc gốc'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(struct)}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: '4px' }}
                          title="Sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(struct.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FactoryStructureModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        structure={selectedStructure}
        allStructures={structures}
        onSave={loadData}
      />
    </div>
  );
};

export default FactoryStructureView;

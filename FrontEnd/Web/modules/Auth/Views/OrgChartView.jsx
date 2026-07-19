import React, { useState, useEffect } from 'react';
import { Network, List, Plus, Edit2, Trash2, User, ChevronDown, ChevronRight } from 'lucide-react';
import { hrService } from '../Models/hr.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import OrgNodeModal from './OrgNodeModal';

const OrgChartView = ({ diagramDropdown }) => {
  const [nodes, setNodes] = useState([]);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'
  const [search, setSearch] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const loadData = async () => {
    try {
      const res = await hrService.getOrgNodes();
      setNodes(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (node) => {
    setSelectedNode(node);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nút sơ đồ tổ chức này? Tất cả các liên kết con sẽ bị gỡ bỏ parent.')) return;
    try {
      await hrService.deleteOrgNode(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi xóa nút sơ đồ.');
    }
  };

  // Filter nodes for search query
  const filteredNodes = nodes.filter(node => {
    const term = search.toLowerCase();
    return (
      node.level_name.toLowerCase().includes(term) ||
      (node.department_name && node.department_name.toLowerCase().includes(term)) ||
      (node.position_name && node.position_name.toLowerCase().includes(term)) ||
      (node.section_name && node.section_name.toLowerCase().includes(term)) ||
      (node.occupants && node.occupants.some(o => o.full_name.toLowerCase().includes(term)))
    );
  });

  // Construct Tree Map
  const roots = filteredNodes.filter(n => !n.parent_id);
  const childrenMap = {};
  filteredNodes.forEach(node => {
    if (node.parent_id) {
      if (!childrenMap[node.parent_id]) childrenMap[node.parent_id] = [];
      childrenMap[node.parent_id].push(node);
    }
  });

  // Recursive Tree Node Renderer
  const TreeNode = ({ node }) => {
    const children = childrenMap[node.id] || [];
    const hasOccupant = node.occupants && node.occupants.length > 0;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        {/* Node card */}
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
            <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#FAF6F0', color: '#7B5233', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
              {node.level_name}
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
            {node.position_name || 'Vị trí chưa thiết lập'}
          </div>
          
          <div style={{ fontSize: '0.7rem', color: '#6B7280', display: 'flex', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span>PB: {node.department_name || '-'}</span>
            {node.section_name && <span>• BP: {node.section_name}</span>}
          </div>

          {/* Occupants list inside node card */}
          <div style={{
            marginTop: '4px',
            borderTop: '1px solid #F3F4F6',
            paddingTop: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: hasOccupant ? '#2D1A12' : '#9CA3AF'
          }}>
            <User size={12} style={{ color: hasOccupant ? '#7B5233' : '#9CA3AF' }} />
            <span style={{ fontWeight: hasOccupant ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasOccupant ? node.occupants.map(o => o.full_name).join(', ') : 'Vị trí trống'}
            </span>
          </div>
        </div>

        {/* Children Render block */}
        {children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Vertical connector from parent to horizontal line */}
            <div style={{ width: '2px', height: '24px', backgroundColor: '#C4B5A5', zIndex: 1 }} />

            {/* Horizontal line and children rows */}
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
                    {/* Horizontal branch line */}
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

                    {/* Vertical line pointing down to child card */}
                    <div style={{ width: '2px', height: '24px', backgroundColor: '#C4B5A5', zIndex: 1 }} />

                    {/* Recursive TreeNode render */}
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
      {/* Toolbar using PageToolbar */}
      <PageToolbar
        searchValue={search}
        onSearchChange={(val) => setSearch(val)}
        searchPlaceholder="Nhập Mã, Tên màn"
        showSort={true}
        sortOptions={[
          { value: 'level_asc', label: 'Cấp tăng dần' },
          { value: 'level_desc', label: 'Cấp giảm dần' }
        ]}
        showFilter={true}
        extraActions={[
          { label: 'Cấu hình sơ đồ', onClick: () => {} }
        ]}
        importActions={[
          { label: 'Nhập từ file Excel', onClick: () => {} }
        ]}
        onExport={() => {}}
        onCreate={() => { setSelectedNode(null); setModalOpen(true); }}
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

      {/* Main Workspace content */}
      <div style={{ flex: 1, marginTop: '16px' }}>
        {viewMode === 'chart' ? (
          /* Visual hierarchy diagram tree view */
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
                  Không tìm thấy sơ đồ tổ chức phù hợp. Nhấp "+ Thêm mới" để bắt đầu tạo sơ đồ.
                </div>
              ) : roots.map(root => (
                <TreeNode key={root.id} node={root} />
              ))}
            </div>
          </div>
        ) : (
          /* Standard table grid view */
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
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Cấp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Phòng ban</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Vị trí</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Bộ phận</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Họ tên đương nhiệm</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Cấp trên</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>Không tìm thấy nút sơ đồ tổ chức nào.</td>
                  </tr>
                ) : filteredNodes.map(node => (
                  <tr
                    key={node.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FDFBF7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7B5233' }}>{node.level_name}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1E293B' }}>{node.department_name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{node.position_name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{node.section_name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#2D1A12', fontWeight: 600 }}>
                      {node.occupants && node.occupants.length > 0 ? node.occupants.map(o => o.full_name).join(', ') : 'Vị trí trống'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>{node.parent_level_name || 'Nút gốc'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(node)}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: '4px' }}
                          title="Sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(node.id)}
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

      {/* Org Node Modal popup NS02 */}
      <OrgNodeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        node={selectedNode}
        allNodes={nodes}
        onSave={loadData}
      />
    </div>
  );
};

export default OrgChartView;

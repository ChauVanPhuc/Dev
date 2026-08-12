import React, { useState, useEffect, useMemo } from 'react';
import { Network, List, Plus, Minus, Edit2, Trash2, User, ChevronDown, ChevronRight } from 'lucide-react';
import { hrService } from '../../Models/hr.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import OrgNodeModal from './OrgNodeModal';

const getLevelNumber = (levelName) => {
  const match = (levelName || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
};

const OrgChartView = ({ diagramDropdown }) => {
  const [nodes, setNodes] = useState([]);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'
  const [search, setSearch] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  // Tree interaction state
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [zoom, setZoom] = useState(1);

  const containerRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const [treeSize, setTreeSize] = useState({ width: 0, height: 0 });

  const updateTreeSize = () => {
    if (contentRef.current) {
      const width = contentRef.current.scrollWidth || contentRef.current.offsetWidth;
      const height = contentRef.current.scrollHeight || contentRef.current.offsetHeight;
      if (width > 0 && height > 0) {
        setTreeSize({ width, height });
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(updateTreeSize, 100);
    return () => clearTimeout(timer);
  }, [nodes, collapsedIds, viewMode]);

  const handleFitScreen = () => {
    if (!containerRef.current || !contentRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const contentWidth = treeSize.width || contentRef.current.scrollWidth;
    const contentHeight = treeSize.height || contentRef.current.scrollHeight;
    if (contentWidth > 0 && contentHeight > 0) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
      const widthRatio = (containerWidth - 80) / contentWidth;
      const heightRatio = (containerHeight - 80) / contentHeight;
      let newZoom = Math.min(widthRatio, heightRatio);
      newZoom = Math.floor(newZoom * 100) / 100;
      newZoom = Math.max(0.3, Math.min(1.5, newZoom));
      setZoom(newZoom);
    }
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
  const filteredNodes = useMemo(() => {
    const term = search.toLowerCase();
    return nodes.filter(node => {
      return (
        node.level_name.toLowerCase().includes(term) ||
        (node.department_name && node.department_name.toLowerCase().includes(term)) ||
        (node.position_name && node.position_name.toLowerCase().includes(term)) ||
        (node.section_name && node.section_name.toLowerCase().includes(term)) ||
        (node.occupants && node.occupants.some(o => o.full_name.toLowerCase().includes(term)))
      );
    });
  }, [nodes, search]);

  const paginatedNodes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredNodes.slice(startIndex, startIndex + pageSize);
  }, [filteredNodes, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredNodes.length / pageSize);

  const roots = useMemo(() => filteredNodes.filter(n => !n.parent_id), [filteredNodes]);
  const childrenMap = useMemo(() => {
    const map = {};
    filteredNodes.forEach(node => {
      if (node.parent_id) {
        if (!map[node.parent_id]) map[node.parent_id] = [];
        map[node.parent_id].push(node);
      }
    });
    return map;
  }, [filteredNodes]);

  // Default collapse nodes at level 3+ to keep chart compact on first load
  const hasInitialized = React.useRef(false);
  useEffect(() => {
    if (nodes.length && !hasInitialized.current) {
      hasInitialized.current = true;
      const toCollapse = new Set();
      nodes.forEach(node => {
        if (getLevelNumber(node.level_name) >= 3) {
          toCollapse.add(node.id);
        }
      });
      setCollapsedIds(toCollapse);
    }
  }, [nodes]);

  const toggleCollapse = (nodeId) => {
    const next = new Set(collapsedIds);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    setCollapsedIds(next);
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(filteredNodes.map(n => n.id)));

  // Recursive Tree Node Renderer
  const TreeNode = ({ node }) => {
    const children = childrenMap[node.id] || [];
    const hasChildren = children.length > 0;
    const hasOccupant = node.occupants && node.occupants.length > 0;
    const isCollapsed = search.trim() ? false : collapsedIds.has(node.id);
    
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

          {/* Collapse/expand toggle when node has children */}
          {hasChildren && (
            <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                title={isCollapsed ? 'Mở rộng cấp dưới' : 'Thu gọn cấp dưới'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: isCollapsed ? '#FAF6F0' : '#F3F4F6',
                  border: '1px solid #EADCC9',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: '#7B5233',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span>{isCollapsed ? `${children.length} cấp dưới` : 'Thu gọn'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Children Render block */}
        {hasChildren && !isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'max-content', minWidth: '100%' }}>
            {/* Vertical connector from parent to horizontal line */}
            <div style={{ width: '2px', height: '24px', backgroundColor: '#C4B5A5', zIndex: 1 }} />

            {/* Horizontal line and children rows */}
            <div style={{ display: 'flex', position: 'relative', width: 'max-content', justifyContent: 'center' }}>
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
                      flex: '0 0 auto'
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
        searchPlaceholder="Nhập bộ phận, vị trí, họ tên..."
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

      {/* View controls: chart actions + toggle mode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '12px' }}>
        {viewMode === 'chart' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={expandAll}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #EADCC9',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Mở rộng tất cả
            </button>
            <button
              onClick={collapseAll}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #EADCC9',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Thu gọn tất cả
            </button>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EADCC9', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff' }}>
              <button
                onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))}
                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#7B5233', display: 'flex', alignItems: 'center' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ padding: '0 6px', fontSize: '0.75rem', fontWeight: 600, color: '#4A2E1B', minWidth: '36px', textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(2, parseFloat((z + 0.1).toFixed(1))))}
                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#7B5233', display: 'flex', alignItems: 'center' }}
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => setZoom(1)}
                style={{ background: 'none', border: 'none', borderLeft: '1px solid #EADCC9', padding: '0 8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: '#7B5233', height: '100%' }}
              >
                Reset
              </button>
              <button
                onClick={handleFitScreen}
                style={{ background: 'none', border: 'none', borderLeft: '1px solid #EADCC9', padding: '0 8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: '#7B5233', height: '100%' }}
                title="Tự động phóng to/thu nhỏ sơ đồ vừa khung màn hình"
              >
                Vừa khung
              </button>
            </div>
          </div>
        )}

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
            onClick={() => { setViewMode('chart'); setCurrentPage(1); }}
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
            onClick={() => { setViewMode('table'); setCurrentPage(1); }}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginTop: '8px' }}>
        {viewMode === 'chart' ? (
          /* Visual hierarchy diagram tree view */
          <div 
            ref={containerRef}
            style={{
              backgroundColor: '#FAF8F5',
              border: '1px solid #EADCC9',
              borderRadius: '12px',
              padding: '32px 24px',
              overflow: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              gap: '24px'
            }}>
            {/* Dropdown inside diagram card aligned to right, matching Mockup Image 4 */}
            {diagramDropdown && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '8px' }}>
                {diagramDropdown}
              </div>
            )}

            {/* Wrapper that scales layout box according to visual zoom */}
            <div style={{
              width: treeSize.width ? `${treeSize.width * zoom}px` : 'auto',
              height: treeSize.height ? `${treeSize.height * zoom}px` : 'auto',
              margin: '0 auto',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div 
                ref={contentRef}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  justifyContent: 'center', 
                  alignItems: 'flex-start', 
                  gap: '40px', 
                  width: 'max-content', 
                  transform: `scale(${zoom})`, 
                  transformOrigin: 'top left',
                  flexShrink: 0
                }}>
                {roots.length === 0 ? (
                  <div style={{ color: '#9CA3AF', textAlign: 'center', marginTop: '100px', fontSize: '0.9rem' }}>
                    Không tìm thấy sơ đồ tổ chức phù hợp. Nhấp "+ Thêm mới" để bắt đầu tạo sơ đồ.
                  </div>
                ) : roots.map(root => (
                  <TreeNode key={root.id} node={root} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Standard table grid view */
          <div className="admin-list-layout">
            <div className="mgmt-table card admin-table-card">
              {/* Dropdown inside table card aligned to right, matching Mockup Image 4 */}
              {diagramDropdown && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0 16px' }}>
                  {diagramDropdown}
                </div>
              )}

              <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cấp</th>
                      <th>Phòng ban</th>
                      <th>Vị trí</th>
                      <th>Bộ phận</th>
                      <th>Họ tên đương nhiệm</th>
                      <th>Cấp trên</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNodes.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>Không tìm thấy nút sơ đồ tổ chức nào.</td>
                      </tr>
                    ) : paginatedNodes.map(node => (
                      <tr key={node.id}>
                        <td style={{ fontWeight: 700, color: '#7B5233' }}>{node.level_name}</td>
                        <td style={{ fontWeight: 600 }}>{node.department_name || '-'}</td>
                        <td>{node.position_name || '-'}</td>
                        <td>{node.section_name || '-'}</td>
                        <td style={{ fontWeight: 600 }}>
                          {node.occupants && node.occupants.length > 0 ? node.occupants.map(o => o.full_name).join(', ') : 'Vị trí trống'}
                        </td>
                        <td>{node.parent_level_name || 'Nút gốc'}</td>
                        <td>
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
            </div>

            {/* Phân trang */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Hiển thị <b>{paginatedNodes.length}</b> trên <b>{filteredNodes.length}</b> kết quả
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="page-btn"
                  >
                    &lt; Trước
                  </button>
                  {(() => {
                    const pageButtons = [];
                    for (let i = 1; i <= totalPages; i++) {
                      pageButtons.push(
                        <button
                          key={i}
                          className={`page-btn ${currentPage === i ? 'active' : ''}`}
                          onClick={() => setCurrentPage(i)}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pageButtons;
                  })()}
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="page-btn"
                  >
                    Sau &gt;
                  </button>
                </div>
              )}
            </div>
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

import os

file_path = "FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Normalize line endings to LF for consistent matching
content = content.replace("\r\n", "\n")

# 0. Update React imports
target_react = "import React, { useState, useEffect } from 'react';"
replacement_react = "import React, { useState, useEffect, useMemo } from 'react';"

if target_react in content:
    content = content.replace(target_react, replacement_react)
    print("React imports updated successfully.")
else:
    print("WARNING: React import statement not found.")

# 1. Update imports
target_import = "import { ArrowLeft, Save, AlertCircle, FileText, GitBranch } from 'lucide-react';"
replacement_import = "import { ArrowLeft, Save, AlertCircle, FileText, GitBranch, ChevronUp, ChevronDown, Search, Filter, Download, ExternalLink, Eye, Printer, RefreshCw, BookOpen, Settings } from 'lucide-react';"

if target_import in content:
    content = content.replace(target_import, replacement_import)
    print("Imports updated successfully.")
else:
    print("WARNING: Import statement not found.")

# 2. Update state variables
target_state = """  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });"""

replacement_state = """  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Tab management & Tab 3 States
  const [activeFormTab, setActiveFormTab] = useState('config'); // 'config' | 'preview' | 'processes'
  const [processes, setProcesses] = useState([]);
  const [procLoading, setProcLoading] = useState(false);
  const [procSearchQuery, setProcSearchQuery] = useState('');
  const [procDeptFilter, setProcDeptFilter] = useState('All');
  const [procStatusFilter, setProcStatusFilter] = useState('All');
  const [procDateFilter, setProcDateFilter] = useState('');
  const [procPage, setProcPage] = useState(1);

  const fetchProcesses = async () => {
    setProcLoading(true);
    try {
      const data = await api.get('/iso-documents/processes');
      // Client-side filter: only show processes using this template
      const filtered = (data || []).filter(p => p.iso_document_id === parseInt(id));
      setProcesses(filtered);
    } catch (e) {
      console.error('Lỗi khi tải danh sách quy trình:', e);
      showFeedback('error', 'Không thể tải danh sách tài liệu đang sử dụng mẫu này');
    } finally {
      setProcLoading(false);
    }
  };

  useEffect(() => {
    if (activeFormTab === 'processes' && isEditMode) {
      fetchProcesses();
    }
  }, [activeFormTab, id]);

  const getDeptAbbrev = (symbolText, codeText) => {
    const textToMatch = symbolText || codeText || '';
    const match = textToMatch.match(/G7\\.([A-Z0-9]+)[-.]/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    return '---';
  };

  const DEPT_MAP = {
    'CL': 'Chất lượng',
    'SX': 'Sản xuất',
    'KT': 'Kỹ thuật',
    'KHO': 'Kho',
    'IT': 'IT',
    'BGD': 'Ban Giám Đốc'
  };

  const getDeptName = (abbrev) => {
    return DEPT_MAP[abbrev] || abbrev || 'Chưa phân loại';
  };

  // Extract unique departments from the filtered list of processes
  const availableDepts = useMemo(() => {
    const depts = new Set();
    processes.forEach(p => {
      depts.add(getDeptAbbrev(p.symbol, p.code));
    });
    return Array.from(depts);
  }, [processes]);

  // Filters & Pagination for Processes
  const filteredProcesses = useMemo(() => {
    return processes.filter(p => {
      // 1. Search Query
      if (procSearchQuery) {
        const query = procSearchQuery.toLowerCase();
        const codeMatch = p.code && p.code.toLowerCase().includes(query);
        const nameMatch = p.name && p.name.toLowerCase().includes(query);
        if (!codeMatch && !nameMatch) return false;
      }
      // 2. Department Filter
      if (procDeptFilter !== 'All') {
        const deptAbbrev = getDeptAbbrev(p.symbol, p.code);
        if (deptAbbrev !== procDeptFilter) return false;
      }
      // 3. Status Filter
      if (procStatusFilter !== 'All') {
        if (p.status !== procStatusFilter) return false;
      }
      // 4. Date Filter
      if (procDateFilter) {
        if (p.issue_date !== procDateFilter) return false;
      }
      return true;
    });
  }, [processes, procSearchQuery, procDeptFilter, procStatusFilter, procDateFilter]);

  const procPageSize = 10;
  const totalProcPages = Math.ceil(filteredProcesses.length / procPageSize) || 1;

  const paginatedProcesses = useMemo(() => {
    const start = (procPage - 1) * procPageSize;
    return filteredProcesses.slice(start, start + procPageSize);
  }, [filteredProcesses, procPage, procPageSize]);"""

if target_state in content:
    content = content.replace(target_state, replacement_state)
    print("States updated successfully.")
else:
    print("WARNING: State variables target not found.")

# 3. Update return layout at top
target_top = """      {/* 1. Màn hình chính */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>"""

replacement_top = """      {/* Tab Navigation */}
      <div className="iso-tabs-container" style={{
        display: 'flex',
        gap: '32px',
        borderBottom: '2px solid #EADCC9',
        paddingBottom: '0px',
        marginBottom: '16px',
        width: '100%',
        backgroundColor: '#FAF8F5'
      }}>
        <div 
          className={`iso-tab-item ${activeFormTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveFormTab('config')}
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: activeFormTab === 'config' ? '#7B5233' : '#8D6E63',
            cursor: 'pointer',
            padding: '10px 4px',
            position: 'relative',
            transition: 'all 0.2s',
            borderBottom: activeFormTab === 'config' ? '3px solid #7B5233' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Cấu hình tài liệu
        </div>
        <div 
          className={`iso-tab-item ${activeFormTab === 'preview' ? 'active' : ''}`}
          onClick={() => {
            if (isEditMode) {
              setActiveFormTab('preview');
            } else {
              showFeedback('info', 'Vui lòng lưu mẫu tài liệu trước khi xem mẫu.');
            }
          }}
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: activeFormTab === 'preview' ? '#7B5233' : '#8D6E63',
            cursor: isEditMode ? 'pointer' : 'not-allowed',
            padding: '10px 4px',
            position: 'relative',
            transition: 'all 0.2s',
            borderBottom: activeFormTab === 'preview' ? '3px solid #7B5233' : '3px solid transparent',
            marginBottom: '-2px',
            opacity: isEditMode ? 1 : 0.5
          }}
        >
          Xem mẫu
        </div>
        <div 
          className={`iso-tab-item ${activeFormTab === 'processes' ? 'active' : ''}`}
          onClick={() => {
            if (isEditMode) {
              setActiveFormTab('processes');
            } else {
              showFeedback('info', 'Vui lòng lưu mẫu tài liệu trước khi xem danh sách.');
            }
          }}
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: activeFormTab === 'processes' ? '#7B5233' : '#8D6E63',
            cursor: isEditMode ? 'pointer' : 'not-allowed',
            padding: '10px 4px',
            position: 'relative',
            transition: 'all 0.2s',
            borderBottom: activeFormTab === 'processes' ? '3px solid #7B5233' : '3px solid transparent',
            marginBottom: '-2px',
            opacity: isEditMode ? 1 : 0.5
          }}
        >
          Danh sách tài liệu
        </div>
      </div>

      {/* 1. Màn hình chính */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        {activeFormTab === 'config' && (
          <>"""

if target_top in content:
    content = content.replace(target_top, replacement_top)
    print("Top layout container updated successfully.")
else:
    print("WARNING: Top main layout container not found.")

# 4. Update return layout at bottom
target_bottom = """            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ISOFormEditorView;"""

replacement_bottom = """            </div>
          </div>
        </div>
        </>
      )}

      {/* Tab 2: Xem mẫu */}
      {activeFormTab === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          {/* Action Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
            <button
              onClick={() => {
                if (!formData.file_path) {
                  showFeedback('error', 'Không tìm thấy tệp tin Word gốc trên hệ thống');
                  return;
                }
                const downloadUrl = `${api.defaults.baseURL.replace(/\/api\/v1\/?$/, '')}/api/v1/iso-documents/${formData.id}/download-docx`;
                window.open(downloadUrl, '_blank');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#7B5233',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Download size={16} /> Tải tệp tin Word gốc (.docx)
            </button>
          </div>

          {/* Simulated A4 Page Container */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            borderRadius: '8px',
            padding: '40px 60px',
            maxWidth: '900px',
            margin: '0 auto',
            width: '100%',
            minHeight: '1120px',
            fontFamily: 'Inter, sans-serif',
            color: '#1F2937',
            lineHeight: '1.6'
          }}>
            {/* Header Table */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '2px solid #000',
              marginBottom: '32px'
            }}>
              <tbody>
                <tr>
                  <td style={{
                    border: '1px solid #000',
                    padding: '12px',
                    width: '25%',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    color: '#000'
                  }}>
                    G7 GLOBAL
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '12px',
                    width: '50%',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    color: '#000',
                    textTransform: 'uppercase'
                  }}>
                    {formData.name || 'TÊN TÀI LIỆU'}
                  </td>
                  <td style={{
                    border: '1px solid #000',
                    padding: '8px 12px',
                    width: '25%',
                    fontSize: '0.78rem',
                    color: '#000'
                  }}>
                    <div style={{ marginBottom: '4px' }}><b>Mã mẫu:</b> {formData.code || '---'}</div>
                    <div style={{ marginBottom: '4px' }}><b>Ký hiệu:</b> {formData.symbol || '---'}</div>
                    <div style={{ marginBottom: '4px' }}><b>Phiên bản:</b> {formData.version || '01'}</div>
                    <div><b>Ngày BH:</b> {formData.issue_date || '---'}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Document Content Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.keys(formData.sections || {})
                .filter(key => !key.startsWith('__'))
                .map((sectionName, sIdx) => {
                  const htmlContent = formData.sections[sectionName] || '';
                  return (
                    <div key={sIdx} style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: '16px' }}>
                      <h3 style={{
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        color: '#7B5233',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {sIdx + 1}. {sectionName}
                      </h3>
                      <div 
                        className="iso-preview-section-content"
                        dangerouslySetInnerHTML={{ __html: htmlContent || '<em style="color:#9CA3AF">Không có nội dung</em>' }}
                        style={{
                          fontSize: '0.85rem',
                          color: '#374151',
                          paddingLeft: '12px'
                        }}
                      />
                    </div>
                  );
                })}
            </div>

            {/* Revision logs inside document if exists */}
            {formData.revision_logs && formData.revision_logs.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <h3 style={{
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  color: '#7B5233',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  LỊCH SỬ THEO DÕI SỬA ĐỔI TÀI LIỆU
                </h3>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.78rem',
                  border: '1px solid #E5E7EB'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>Lần Sửa</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>Ngày Sửa</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>Nội dung sửa đổi</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>Trang</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #E5E7EB', fontWeight: 'bold' }}>Người sửa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.revision_logs.map((log, lIdx) => (
                      <tr key={lIdx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #E5E7EB' }}>{log.seq_no}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #E5E7EB' }}>{log.rev_date || '---'}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #E5E7EB' }}>{log.content || 'Ban hành lần đầu'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #E5E7EB' }}>{log.page_no || 'Tất cả'}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #E5E7EB' }}>{log.modifier || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Danh sách tài liệu */}
      {activeFormTab === 'processes' && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <span style={headerTextStyle}>Danh sách quy trình áp dụng</span>
            <button 
              onClick={fetchProcesses}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: '#7B5233',
                fontWeight: 'bold'
              }}
            >
              <RefreshCw size={14} className={procLoading ? 'spin' : ''} /> Tải lại dữ liệu
            </button>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#fff', borderTop: '1px solid #EADCC9' }}>
            {/* Filter toolbar */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '16px'
            }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#8D6E63' }} />
                <input 
                  type="text" 
                  value={procSearchQuery}
                  onChange={(e) => {
                    setProcSearchQuery(e.target.value);
                    setProcPage(1);
                  }}
                  placeholder="Tìm theo mã hoặc tên quy trình..."
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '8px 12px 8px 34px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    color: '#1F2937'
                  }}
                />
              </div>

              {/* Department filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4B5563', textTransform: 'uppercase' }}>Phòng ban</span>
                <select
                  value={procDeptFilter}
                  onChange={(e) => {
                    setProcDeptFilter(e.target.value);
                    setProcPage(1);
                  }}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    color: '#1F2937'
                  }}
                >
                  <option value="All">Tất cả phòng ban</option>
                  {Object.keys(DEPT_MAP).map(deptKey => (
                    <option key={deptKey} value={deptKey}>{DEPT_MAP[deptKey]}</option>
                  ))}
                </select>
              </div>

              {/* Issue Date filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4B5563', textTransform: 'uppercase' }}>BH Ngày</span>
                <input 
                  type="date"
                  value={procDateFilter}
                  onChange={(e) => {
                    setProcDateFilter(e.target.value);
                    setProcPage(1);
                  }}
                  style={{
                    height: '36px',
                    padding: '0 8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    color: '#1F2937'
                  }}
                />
              </div>

              {/* Status filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4B5563', textTransform: 'uppercase' }}>Trạng thái</span>
                <select
                  value={procStatusFilter}
                  onChange={(e) => {
                    setProcStatusFilter(e.target.value);
                    setProcPage(1);
                  }}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    color: '#1F2937'
                  }}
                >
                  <option value="All">Tất cả trạng thái</option>
                  <option value="Nháp">Nháp</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Đang lưu hành">Đang lưu hành</option>
                  <option value="Đang điều chỉnh">Đang điều chỉnh</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {procLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', fontSize: '0.85rem', color: '#64748b' }}>
                Đang tải danh sách quy trình...
              </div>
            ) : filteredProcesses.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', fontSize: '0.85rem', color: '#64748b' }}>
                Không tìm thấy quy trình thực tế nào.
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', color: '#7B5233', height: '40px' }}>
                        <th style={{ padding: '10px 12px', width: '50px', fontWeight: 'bold' }}>STT</th>
                        <th style={{ padding: '10px 12px', width: '120px', fontWeight: 'bold' }}>Mã quy trình</th>
                        <th style={{ padding: '10px 12px', width: '120px', fontWeight: 'bold' }}>Ký hiệu</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold' }}>Tên quy trình</th>
                        <th style={{ padding: '10px 12px', width: '150px', fontWeight: 'bold' }}>Phòng ban</th>
                        <th style={{ padding: '10px 12px', width: '150px', fontWeight: 'bold' }}>Người biên soạn</th>
                        <th style={{ padding: '10px 12px', width: '120px', fontWeight: 'bold' }}>Ngày ban hành</th>
                        <th style={{ padding: '10px 12px', width: '130px', fontWeight: 'bold', textAlign: 'center' }}>Trạng thái</th>
                        <th style={{ padding: '10px 12px', width: '140px', fontWeight: 'bold', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProcesses.map((p, pIdx) => {
                        const deptAbbrev = getDeptAbbrev(p.symbol, p.code);
                        const displayIdx = (procPage - 1) * procPageSize + pIdx + 1;
                        
                        // Status styling
                        const statusColors = 
                          p.status === 'Đang lưu hành' ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' } :
                          p.status === 'Đang điều chỉnh' ? { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' } :
                          p.status === 'Chờ duyệt' ? { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' } :
                          { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' }; // Nháp

                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', height: '48px' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#64748b' }}>{displayIdx}</td>
                            <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1F2937' }}>{p.code}</td>
                            <td style={{ padding: '10px 12px', color: '#4B5563' }}>{p.symbol || '---'}</td>
                            <td style={{ padding: '10px 12px', fontWeight: '600', color: '#7B5233' }}>{p.name}</td>
                            <td style={{ padding: '10px 12px', color: '#4B5563' }}>{getDeptName(deptAbbrev)}</td>
                            <td style={{ padding: '10px 12px', color: '#4B5563' }}>{p.editor || '---'}</td>
                            <td style={{ padding: '10px 12px', color: '#4B5563' }}>{p.issue_date || '---'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.73rem',
                                fontWeight: 'bold',
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                border: `1px solid ${statusColors.border}`
                              }}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => navigate(`/admin/iso-processes/edit/${p.id}`)}
                                  title="Xem quy trình"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '4px',
                                    border: '1px solid #7B5233',
                                    color: '#7B5233',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => navigate(`/admin/iso-processes/edit/${p.id}?print=true`)}
                                  title="Tải xuống dạng PDF"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '4px',
                                    border: '1px solid #7B5233',
                                    color: '#fff',
                                    backgroundColor: '#7B5233',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <Printer size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalProcPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Hiển thị <b>{paginatedProcesses.length}</b> trên <b>{filteredProcesses.length}</b> quy trình
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setProcPage(prev => Math.max(prev - 1, 1))}
                        disabled={procPage === 1}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: procPage === 1 ? '#F3F4F6' : '#fff',
                          color: procPage === 1 ? '#9CA3AF' : '#374151',
                          cursor: procPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.78rem'
                        }}
                      >
                        Trang trước
                      </button>
                      <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#4B5563', padding: '0 8px' }}>
                        Trang <b>{procPage}</b> / {totalProcPages}
                      </span>
                      <button
                        onClick={() => setProcPage(prev => Math.min(prev + 1, totalProcPages))}
                        disabled={procPage === totalProcPages}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: procPage === totalProcPages ? '#F3F4F6' : '#fff',
                          color: procPage === totalProcPages ? '#9CA3AF' : '#374151',
                          cursor: procPage === totalProcPages ? 'not-allowed' : 'pointer',
                          fontSize: '0.78rem'
                        }}
                      >
                        Trang sau
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ISOFormEditorView;"""

if target_bottom in content:
    content = content.replace(target_bottom, replacement_bottom)
    print("Bottom layout container updated successfully.")
else:
    print("WARNING: Bottom layout target not found.")

# Write back with native platform line endings handled automatically by open()
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Modification done!")

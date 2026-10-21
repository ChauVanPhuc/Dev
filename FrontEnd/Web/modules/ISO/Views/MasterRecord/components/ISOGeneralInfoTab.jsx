import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { 
  FileText, Search, Layers, ChevronRight, X, CheckCircle2, 
  Sparkles, FileSpreadsheet, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { 
  formatClassificationText, 
  renderClassificationBadge, 
  renderDocStatusBadge 
} from './isoMasterRecordUtils';

const DEPARTMENT_OPTIONS = [
  { code: 'HCNS', name: 'Hành chính Nhân sự' },
  { code: 'BGĐ', name: 'Ban Giám Đốc' },
  { code: 'KD', name: 'Kinh doanh' },
  { code: 'SX', name: 'Sản xuất' },
  { code: 'QC', name: 'Kiểm soát chất lượng (QC)' },
  { code: 'KHO', name: 'Kho vận' },
  { code: 'KT', name: 'Kế toán' },
  { code: 'KTH', name: 'Kỹ thuật' }
];

export const ISOGeneralInfoTab = ({
  detailRecord = {},
  selectedChildDoc = null,
  groupChildDocs = [],
  handleSelectChildDoc,
  isEditing = false,
  editFormData = {},
  setEditFormData,
  formatDateOnly = (d) => d || '---',
  loadTab2Doc,
  setSelectedWordDoc,
  onSelectProcess
}) => {
  const currentRecord = isEditing ? editFormData : (selectedChildDoc || detailRecord);
  const docLevel = currentRecord.document_level || (currentRecord.classification?.toUpperCase().includes('TÀI LIỆU') ? 'Cấp công ty' : 'Cấp phòng');
  const sourceStatusVal = currentRecord.source_status || 'Đã có hồ sơ';
  const creator = currentRecord.created_by || 'Ban ISO';
  const approver = currentRecord.approver || (docLevel === 'Cấp công ty' ? 'Ban Giám Đốc' : 'Trưởng phòng');
  
  const formattedEdition = currentRecord.edition 
    ? currentRecord.edition.toString().replace(/^[^\d]*/, '').trim() || currentRecord.edition 
    : '1';

  const selectedChildKey = selectedChildDoc?.source_row_id 
    ? `rec_${selectedChildDoc.source_row_id}` 
    : (selectedChildDoc?.id ? `rec_${selectedChildDoc.id}` : (selectedChildDoc?.relative_path || selectedChildDoc?.file_name || ''));

  // --- AUTO-SUGGEST DỮ LIỆU TỪ QUY TRÌNH ISO HIỆU LỰC ---
  const [activeProcesses, setActiveProcesses] = useState([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState(null); // 'code' | 'name' | null
  const [searchFilterText, setSearchFilterText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const codeInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // Tải danh sách quy trình ISO khi mở chế độ chỉnh sửa/tạo mới
  useEffect(() => {
    if (isEditing) {
      let isMounted = true;
      const fetchActiveProcesses = async () => {
        try {
          setLoadingProcesses(true);
          const res = await api.get('/iso-documents/processes');
          const list = Array.isArray(res) ? res : (res?.data || []);
          // Lọc các quy trình có trạng thái là "Hiệu lực"
          const valid = list.filter(p => {
            const st = (p.status || '').toLowerCase().trim();
            return st === 'hiệu lực' || st.includes('hiệu lực');
          });
          if (isMounted) setActiveProcesses(valid);
        } catch (err) {
          console.error('Lỗi tải quy trình hiệu lực:', err);
        } finally {
          if (isMounted) setLoadingProcesses(false);
        }
      };
      fetchActiveProcesses();
      return () => { isMounted = false; };
    }
  }, [isEditing]);

  // Click outside listener để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) &&
        codeInputRef.current && 
        !codeInputRef.current.contains(e.target) &&
        nameInputRef.current && 
        !nameInputRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lọc quy trình hiệu lực theo từ khóa tìm kiếm
  const filteredProcesses = useMemo(() => {
    if (!activeProcesses || activeProcesses.length === 0) return [];
    const term = (searchFilterText || '').trim().toLowerCase();
    if (!term) return activeProcesses;
    return activeProcesses.filter(p => {
      const c = (p.code || '').toLowerCase();
      const n = (p.name || '').toLowerCase();
      const d = (p.department_name || '').toLowerCase();
      const docMatch = (p.documents || []).some(doc => 
        (doc.code || '').toLowerCase().includes(term) ||
        (doc.name || '').toLowerCase().includes(term)
      );
      return c.includes(term) || n.includes(term) || d.includes(term) || docMatch;
    });
  }, [activeProcesses, searchFilterText]);

  // Xử lý khi click chọn quy trình: Điền thông tin CỦA QUY TRÌNH vào form
  const handleSelectProcess = (proc) => {
    setIsDropdownOpen(false);
    setActiveSearchField(null);
    if (typeof onSelectProcess === 'function') {
      onSelectProcess(proc);
    } else {
      setEditFormData(prev => ({
        ...prev,
        suggested_doc_code: proc.code || '',
        item_code: proc.code || '',
        document_name: proc.name || '',
        classification: proc.document_type || 'Quy trình',
        department_in_charge: proc.department_name || prev.department_in_charge,
        document_level: proc.document_level || prev.document_level || 'Cấp phòng',
        edition: proc.edition || proc.version || '01',
        management_group: proc.management_group || prev.management_group || proc.code,
        identified_forms_count: String(proc.documents_count || (proc.documents ? proc.documents.length : 0)),
        process_id: proc.id,
        approver: proc.approver || prev.approver
      }));
    }
  };

  // Render dropdown gợi ý kết quả quy trình hiệu lực
  const renderProcessDropdown = () => {
    if (!isDropdownOpen) return null;

    return (
      <div
        ref={dropdownRef}
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: activeSearchField === 'code' ? 'auto' : 0,
          width: activeSearchField === 'code' ? '460px' : '100%',
          marginTop: '4px',
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #EADCC9',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(45, 26, 18, 0.15)',
          zIndex: 9999,
          maxHeight: '320px',
          overflowY: 'auto'
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#FAF6F0',
          borderBottom: '1px solid #EADCC9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#7B5233' }}>
            <Layers size={14} color="#7B5233" />
            <span>QUY TRÌNH ISO HIỆU LỰC ({filteredProcesses.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(false)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>

        {loadingProcesses ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
            Đang tải danh sách quy trình hiệu lực...
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
            {activeProcesses.length === 0 
              ? 'Chưa có quy trình ISO nào có trạng thái "Hiệu lực" trong hệ thống.' 
              : 'Không tìm thấy quy trình hiệu lực nào khớp với từ khóa tìm kiếm.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredProcesses.map(proc => {
              const docCount = proc.documents_count || (proc.documents ? proc.documents.length : 0);
              return (
                <div
                  key={proc.id}
                  onClick={() => handleSelectProcess(proc)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        backgroundColor: '#FAF6F0',
                        color: '#7B5233',
                        border: '1px solid #EADCC9',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}>
                        {proc.code}
                      </span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1E293B' }}>
                        {proc.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.74rem', color: '#64748b' }}>
                      <span>Phòng: <strong>{proc.department_name || '---'}</strong></span>
                      <span>•</span>
                      <span>Cấp: {proc.document_level || 'Cấp phòng'}</span>
                      <span>•</span>
                      <span>Biên soạn: {proc.editor || proc.owner || '---'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {docCount >= 2 ? (
                      <span style={{
                        backgroundColor: '#ECFDF5',
                        color: '#047857',
                        border: '1px solid #A7F3D0',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        {docCount} mẫu (Chọn mẫu)
                      </span>
                    ) : docCount === 1 ? (
                      <span style={{
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        border: '1px solid #BFDBFE',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        1 mẫu (Mặc định)
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: '#F8FAFC',
                        color: '#64748b',
                        border: '1px solid #E2E8F0',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        Quy trình
                      </span>
                    )}
                    <ChevronRight size={14} color="#94a3b8" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="iso-viewer-tab-content">
      <div className="iso-info-grid-container">

        {/* 1. Bộ chọn tài liệu con trong nhóm: Dropdown chọn tài liệu */}
        <div className="iso-child-doc-selector-container">
          <div className="iso-child-doc-selector-label">
            <FileText size={16} color="#7B5233" />
            <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.84rem' }}>Tài liệu:</span>
          </div>
          <select
            className="iso-child-doc-select"
            value={selectedChildKey}
            onChange={(e) => {
              const val = e.target.value;
              const found = groupChildDocs.find((c, idx) => {
                const k = c.source_row_id 
                  ? `rec_${c.source_row_id}` 
                  : (c.id ? `rec_${c.id}` : (c.relative_path || c.file_name || `idx_${idx}`));
                return k === val;
              });
              if (found) handleSelectChildDoc(found);
            }}
          >
            {groupChildDocs.map((c, idx) => {
              const k = c.source_row_id 
                ? `rec_${c.source_row_id}` 
                : (c.id ? `rec_${c.id}` : (c.relative_path || c.file_name || `idx_${idx}`));
              const codePrefix = c.source_code ? `[${c.source_code}] ` : '';
              const docTitle = c.document_name || c.file_name || `Tài liệu ${idx + 1}`;
              const ext = c.ext ? ` (.${c.ext})` : '';
              const cls = c.classification ? ` [${formatClassificationText(c.classification)}]` : '';
              return (
                <option key={k} value={k}>
                  {codePrefix}{docTitle}{ext}{cls}
                </option>
              );
            })}
          </select>
        </div>

        {/* 2. Grid 12 cột hiển thị các trường thông tin */}
        <div className="iso-general-grid">

          {/* HÀNG 1: Mã mục / Nguồn | Mã tài liệu / Quy trình | Phân loại | Lần ban hành */}
          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">MÃ MỤC / NGUỒN *</label>
            {isEditing ? (
              <input 
                type="text" 
                className="iso-input-edit" 
                style={{ fontWeight: '700', color: '#7B5233' }}
                value={editFormData.source_code ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, source_code: e.target.value })}
                placeholder="VD: K014, K001..."
              />
            ) : (
              <div className="iso-readonly-val-box" style={{ fontWeight: '700', color: '#7B5233' }}>
                {currentRecord.source_code || '---'}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-3" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="iso-readonly-label">MÃ TÀI LIỆU / QUY TRÌNH</label>
              {isEditing && (
                <span 
                  onClick={() => {
                    setSearchFilterText('');
                    setActiveSearchField('code');
                    setIsDropdownOpen(prev => !prev);
                  }}
                  style={{ fontSize: '0.7rem', color: '#7B5233', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                  title="Tìm kiếm quy trình ISO hiệu lực"
                >
                  <Search size={11} /> Gợi ý QT
                </span>
              )}
            </div>
            {isEditing ? (
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  ref={codeInputRef}
                  type="text" 
                  className="iso-input-edit" 
                  style={{ fontWeight: '700', color: '#7B5233' }}
                  value={editFormData.suggested_doc_code ?? editFormData.item_code ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditFormData({ ...editFormData, suggested_doc_code: val, item_code: val });
                    setSearchFilterText(val);
                    setActiveSearchField('code');
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setSearchFilterText(editFormData.suggested_doc_code || editFormData.item_code || '');
                    setActiveSearchField('code');
                    setIsDropdownOpen(true);
                  }}
                  placeholder="VD: QT01..."
                />
                {activeSearchField === 'code' && renderProcessDropdown()}
              </div>
            ) : (
              <div className="iso-readonly-val-box" style={{ fontWeight: '700', color: '#7B5233' }}>
                {currentRecord.suggested_doc_code || currentRecord.item_code || detailRecord.suggested_doc_code || '---'}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">PHÂN LOẠI</label>
            {isEditing ? (
              <select 
                className="iso-input-edit"
                value={editFormData.classification || 'TÀI LIỆU'}
                onChange={(e) => setEditFormData({ ...editFormData, classification: e.target.value })}
              >
                <option value="TÀI LIỆU">Tài liệu</option>
                <option value="BIỂU MẪU">Biểu mẫu</option>
                <option value="HỒ SƠ">Hồ sơ</option>
              </select>
            ) : (
              <div className="iso-readonly-val-box">
                {formatClassificationText(currentRecord.classification)}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">LẦN BAN HÀNH</label>
            {isEditing ? (
              <input 
                type="text" 
                className="iso-input-edit" 
                style={{ fontWeight: '600' }}
                value={editFormData.edition ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, edition: e.target.value })}
                placeholder="VD: 1, 2..."
              />
            ) : (
              <div className="iso-readonly-val-box" style={{ fontWeight: '600' }}>
                {formattedEdition}
              </div>
            )}
          </div>

          {/* HÀNG 2: Tên tài liệu */}
          <div className="iso-readonly-field iso-col-12" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="iso-readonly-label">TÊN TÀI LIỆU</label>
              {isEditing && (
                <span 
                  onClick={() => {
                    setSearchFilterText('');
                    setActiveSearchField('name');
                    setIsDropdownOpen(prev => !prev);
                  }}
                  style={{ fontSize: '0.7rem', color: '#7B5233', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                  title="Tìm kiếm quy trình ISO hiệu lực"
                >
                  <Search size={11} /> Tìm theo tên QT hiệu lực
                </span>
              )}
            </div>
            {isEditing ? (
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  name="document_name"
                  className="iso-input-edit" 
                  style={{ fontWeight: '700', color: '#2D1A12', fontSize: '0.96rem' }}
                  value={editFormData.document_name ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditFormData({ ...editFormData, document_name: val });
                    setSearchFilterText(val);
                    setActiveSearchField('name');
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setSearchFilterText(editFormData.document_name || '');
                    setActiveSearchField('name');
                    setIsDropdownOpen(true);
                  }}
                  placeholder="Nhập tên tài liệu / quy trình..."
                  required
                />
                {activeSearchField === 'name' && renderProcessDropdown()}
              </div>
            ) : (
              <div className="iso-readonly-val-box" style={{ fontWeight: '700', color: '#2D1A12', fontSize: '0.96rem' }}>
                {currentRecord.document_name || currentRecord.file_name || '---'}
              </div>
            )}
          </div>

          {/* HÀNG 3: Nhóm tài liệu quản lý | Phòng ban */}
          <div className="iso-readonly-field iso-col-4">
            <label className="iso-readonly-label">NHÓM TÀI LIỆU QUẢN LÝ</label>
            {isEditing ? (
              <input 
                type="text" 
                className="iso-input-edit" 
                value={editFormData.management_group ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, management_group: e.target.value })}
                placeholder="VD: TL-K014..."
              />
            ) : (
              <div className="iso-readonly-val-box">
                {currentRecord.management_group || '---'}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-8">
            <label className="iso-readonly-label">PHÒNG BAN</label>
            {isEditing ? (
              <select
                className="iso-input-edit"
                value={editFormData.department_in_charge || ''}
                onChange={(e) => setEditFormData({ ...editFormData, department_in_charge: e.target.value })}
              >
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d.code} value={d.name}>{d.name} ({d.code})</option>
                ))}
                {!DEPARTMENT_OPTIONS.some(d => d.name === editFormData.department_in_charge) && editFormData.department_in_charge && (
                  <option value={editFormData.department_in_charge}>{editFormData.department_in_charge}</option>
                )}
              </select>
            ) : (
              <div className="iso-readonly-val-box">
                {currentRecord.department_in_charge || '---'}
              </div>
            )}
          </div>

          {/* HÀNG 4: Quy tắc ứng xử (PA) | Luật liên quan */}
          <div className="iso-readonly-field iso-col-6">
            <label className="iso-readonly-label">QUY TẮC ỨNG XỬ (PA)</label>
            {isEditing ? (
              <input 
                type="text" 
                className="iso-input-edit" 
                value={editFormData.code_of_conduct ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, code_of_conduct: e.target.value })}
                placeholder="Nhập quy tắc ứng xử..."
              />
            ) : (
              <div className="iso-readonly-val-box">
                {currentRecord.code_of_conduct || '---'}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-6">
            <label className="iso-readonly-label">LUẬT LIÊN QUAN</label>
            {isEditing ? (
              <input 
                type="text" 
                className="iso-input-edit" 
                value={editFormData.management_doc ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, management_doc: e.target.value })}
                placeholder="Nhập luật hoặc tài liệu viện dẫn liên quan..."
              />
            ) : (
              <div className="iso-readonly-val-box">
                {currentRecord.management_doc || '---'}
              </div>
            )}
          </div>

          {/* HÀNG 5: Số mục hồ sơ đi kèm | Số mục hồ sơ liên quan | Cấp tài liệu | Hiện trạng nguồn */}
          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">SỐ MỤC HỒ SƠ ĐI KÈM</label>
            {isEditing ? (
              <input 
                type="number" 
                min="0"
                className="iso-input-edit" 
                style={{ fontWeight: '700', color: '#7B5233' }}
                value={editFormData.attached_records_count ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, attached_records_count: e.target.value })}
              />
            ) : (
              <div className="iso-readonly-val-box" style={{ fontWeight: '700', color: '#7B5233' }}>
                {currentRecord.attached_records_count || '0'}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">SỐ BIỂU MẪU NHẬN DIỆN</label>
            {isEditing ? (
              <input 
                type="number" 
                min="0"
                className="iso-input-edit" 
                style={{ fontWeight: '700', color: '#7B5233' }}
                value={editFormData.identified_forms_count ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, identified_forms_count: e.target.value })}
              />
            ) : (
              <div className="iso-readonly-val-box" style={{ fontWeight: '700', color: '#7B5233' }}>
                {currentRecord.identified_forms_count || (currentRecord.form_code ? '1' : '0')}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">CẤP TÀI LIỆU</label>
            {isEditing ? (
              <select 
                className="iso-input-edit" 
                value={editFormData.document_level || docLevel}
                onChange={(e) => setEditFormData({ ...editFormData, document_level: e.target.value })}
              >
                <option value="Cấp công ty">Cấp công ty</option>
                <option value="Cấp phòng">Cấp phòng</option>
              </select>
            ) : (
              <div className="iso-readonly-val-box">
                {docLevel}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">HIỆN TRẠNG NGUỒN</label>
            {isEditing ? (
              <input
                type="text"
                className="iso-input-edit"
                value={editFormData.source_status || 'Đã có hồ sơ'}
                onChange={(e) => setEditFormData({ ...editFormData, source_status: e.target.value })}
              />
            ) : (
              <div className="iso-readonly-val-box" style={{ color: '#4B5563' }}>
                {sourceStatusVal}
              </div>
            )}
          </div>

          {/* HÀNG 6: Ngày ban hành | Ngày hiệu chỉnh | Người tạo | Người duyệt */}
          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">NGÀY BAN HÀNH</label>
            {isEditing ? (
              <input 
                type="text" 
                className="iso-input-edit" 
                value={editFormData.issue_date ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, issue_date: e.target.value })}
                placeholder="DD/MM/YYYY"
              />
            ) : (
              <div className="iso-readonly-val-box">
                {formatDateOnly(currentRecord.issue_date)}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">NGÀY HIỆU CHỈNH</label>
            {isEditing ? (
              <input 
                type="text" 
                className="iso-input-edit" 
                value={editFormData.last_modified_date ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, last_modified_date: e.target.value })}
                placeholder="DD/MM/YYYY"
              />
            ) : (
              <div className="iso-readonly-val-box">
                {formatDateOnly(currentRecord.last_modified_date)}
              </div>
            )}
          </div>

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">NGƯỜI TẠO</label>
            <div className="iso-readonly-val-box">
              {creator}
            </div>
          </div>

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">NGƯỜI DUYỆT</label>
            <div className="iso-readonly-val-box">
              {approver}
            </div>
          </div>

          {/* HÀNG 7: Ghi chú */}
          <div className="iso-readonly-field iso-col-12">
            <label className="iso-readonly-label">GHI CHÚ / KẾT QUẢ XÁC NHẬN</label>
            {isEditing ? (
              <textarea 
                className="iso-input-edit iso-input-textarea" 
                rows={4}
                style={{
                  minHeight: '84px',
                  lineHeight: '1.5',
                  padding: '8px 12px',
                  resize: 'vertical',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                value={editFormData.notes ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Nhập ghi chú thêm..."
              />
            ) : (
              <div 
                className="iso-readonly-val-box iso-readonly-val-multiline" 
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  minHeight: '84px',
                  lineHeight: '1.5',
                  padding: '8px 12px',
                  alignItems: 'flex-start'
                }}
              >
                {currentRecord.notes || '---'}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
export default ISOGeneralInfoTab;

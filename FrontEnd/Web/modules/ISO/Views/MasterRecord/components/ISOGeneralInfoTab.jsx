import React from 'react';
import { FileText } from 'lucide-react';
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
  formatDateOnly = (d) => d || '---'
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

          <div className="iso-readonly-field iso-col-3">
            <label className="iso-readonly-label">MÃ TÀI LIỆU / QUY TRÌNH</label>
            {isEditing ? (
              <input 
                type="text" 
                className="iso-input-edit" 
                style={{ fontWeight: '700', color: '#7B5233' }}
                value={editFormData.suggested_doc_code ?? editFormData.item_code ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, suggested_doc_code: e.target.value, item_code: e.target.value })}
                placeholder="VD: QT01..."
              />
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
          <div className="iso-readonly-field iso-col-12">
            <label className="iso-readonly-label">TÊN TÀI LIỆU</label>
            {isEditing ? (
              <input 
                type="text" 
                name="document_name"
                className="iso-input-edit" 
                style={{ fontWeight: '700', color: '#2D1A12', fontSize: '0.96rem' }}
                value={editFormData.document_name ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, document_name: e.target.value })}
                placeholder="Nhập tên tài liệu / quy trình..."
                required
              />
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

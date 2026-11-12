// UnitOfMeasureFormModal.jsx - Popup Thêm mới / Chỉnh sửa đơn vị tính
import React, { useState, useEffect } from 'react';
import { Scale } from 'lucide-react';
import unitOfMeasureService from '../services/unitOfMeasure.service';

export const UnitOfMeasureFormModal = ({
  show = false,
  isEdit = false,
  unit = null,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    code: '',
    full_name: '',
    precision: '',
    status: 'ACTIVE'
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Khởi tạo form data khi mở modal
  useEffect(() => {
    if (show) {
      if (isEdit && unit) {
        setFormData({
          code: unit.code || '',
          full_name: unit.full_name || '',
          precision: unit.precision !== undefined ? String(unit.precision) : '0',
          status: unit.status || 'ACTIVE'
        });
      } else {
        // Khi tạo mới: các ô input phải để trống, không tự điền dữ liệu mẫu
        setFormData({
          code: '',
          full_name: '',
          precision: '',
          status: 'ACTIVE'
        });
      }
      setErrors({});
      setSaving(false);
    }
  }, [show, isEdit, unit]);

  if (!show) return null;

  const validate = () => {
    const newErrors = {};

    // 1. Kiểm tra Tên đơn vị tính
    const cleanCode = (formData.code || '').trim();
    if (!cleanCode) {
      newErrors.code = 'Vui lòng nhập tên đơn vị tính';
    } else {
      const isDuplicate = unitOfMeasureService.isCodeDuplicate(cleanCode, isEdit && unit ? unit.id : null);
      if (isDuplicate) {
        newErrors.code = `Tên đơn vị tính "${cleanCode}" đã tồn tại trong hệ thống`;
      }
    }

    // 2. Kiểm tra Độ chính xác
    if (formData.precision === '' || formData.precision === null || formData.precision === undefined) {
      newErrors.precision = 'Vui lòng nhập độ chính xác';
    } else {
      const prec = Number(formData.precision);
      if (isNaN(prec) || prec < 0 || !Number.isInteger(prec)) {
        newErrors.precision = 'Độ chính xác phải là số nguyên không âm (≥ 0)';
      } else if (prec > 6) {
        newErrors.precision = 'Độ chính xác tối đa cho phép là 6 chữ số thập phân';
      }
    }

    // 3. Trạng thái
    if (!formData.status) {
      newErrors.status = 'Vui lòng chọn trạng thái';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        code: formData.code.trim(),
        full_name: (formData.full_name || '').trim(),
        precision: Number(formData.precision),
        status: formData.status
      });
      onClose();
    } catch (err) {
      // Error handled by parent or hook
      setErrors(prev => ({
        ...prev,
        submit: err.message || 'Lỗi khi lưu dữ liệu'
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="exp-modal-overlay" onClick={onClose}>
      <div 
        className="exp-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        {/* Header Modal */}
        <div className="exp-modal-header">
          <h3 className="exp-modal-title">
            <Scale size={18} color="#7B5233" />
            <span>{isEdit ? 'Chỉnh sửa đơn vị tính' : 'Thêm mới đơn vị tính'}</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center' }}
            title="Đóng"
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>×</span>
          </button>
        </div>

        {/* Body Modal với Grid 2 cột */}
        <form onSubmit={handleSubmit}>
          <div className="exp-modal-body">
            <div className="uom-form-grid">
              {/* Tên đơn vị tính (Bắt buộc) */}
              <div className="uom-form-group">
                <label className="uom-form-label">
                  Tên đơn vị tính <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`uom-form-input ${errors.code ? 'error' : ''}`}
                  placeholder="Ví dụ: m3, Kg, cái, Tấm..."
                  value={formData.code}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, code: e.target.value }));
                    if (errors.code) setErrors(prev => ({ ...prev, code: null }));
                  }}
                  autoFocus
                />
                {errors.code && <div className="uom-field-error">{errors.code}</div>}
              </div>

              {/* Tên đơn vị tính đầy đủ (Không bắt buộc) */}
              <div className="uom-form-group">
                <label className="uom-form-label">
                  Tên đơn vị tính đầy đủ
                </label>
                <input
                  type="text"
                  className="uom-form-input"
                  placeholder="Ví dụ: Mét khối, Kilogram..."
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, full_name: e.target.value }));
                  }}
                />
                <div className="uom-field-hint">Để trống nếu không có tên đầy đủ</div>
              </div>

              {/* Độ chính xác (Bắt buộc) */}
              <div className="uom-form-group">
                <label className="uom-form-label">
                  Độ chính xác (số thập phân) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  step="1"
                  className={`uom-form-input ${errors.precision ? 'error' : ''}`}
                  placeholder="0 (số nguyên) hoặc 1-6"
                  value={formData.precision}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, precision: e.target.value }));
                    if (errors.precision) setErrors(prev => ({ ...prev, precision: null }));
                  }}
                />
                {errors.precision && <div className="uom-field-error">{errors.precision}</div>}
                {!errors.precision && (
                  <div className="uom-field-hint">0: Chỉ số nguyên; 4: Cho phép 4 chữ số thập phân</div>
                )}
              </div>

              {/* Trạng thái (Bắt buộc) */}
              <div className="uom-form-group">
                <label className="uom-form-label">
                  Trạng thái <span className="required">*</span>
                </label>
                <select
                  className={`uom-form-select ${errors.status ? 'error' : ''}`}
                  value={formData.status}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, status: e.target.value }));
                    if (errors.status) setErrors(prev => ({ ...prev, status: null }));
                  }}
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
                {errors.status && <div className="uom-field-error">{errors.status}</div>}
              </div>
            </div>

            {errors.submit && (
              <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#FEF2F2', borderRadius: '6px', color: '#DC2626', fontSize: '0.8rem' }}>
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer Modal: chỉ có 2 nút Hủy và Lưu */}
          <div className="exp-modal-footer">
            <button
              type="button"
              className="exp-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="exp-btn-brown"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnitOfMeasureFormModal;

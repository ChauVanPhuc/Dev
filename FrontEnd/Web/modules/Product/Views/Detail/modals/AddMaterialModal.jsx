import React, { useState, useEffect } from 'react';
import { X, Package, Tag, Hash, Palette, Layers, Truck, FileText } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const AddMaterialModal = ({ productId, editMaterial = null, defaultGroupType = 'VẬT TƯ HÀNG TRẮNG', nextStt = 1, onClose, onSuccess }) => {
  const modalMeta = useScreenMetadataCached('/admin/product/detail/modal/add-material');
  
  const [groupType, setGroupType] = useState(editMaterial?.group_type || defaultGroupType);
  const [stt, setStt] = useState(editMaterial?.stt || nextStt);
  const [materialCode, setMaterialCode] = useState(editMaterial?.material_code || '');
  const [materialName, setMaterialName] = useState(editMaterial?.material_name || editMaterial?.name || '');
  const [color, setColor] = useState(editMaterial?.color || '');
  const [quota, setQuota] = useState(editMaterial?.quota || editMaterial?.quantity || 1);
  const [unit, setUnit] = useState(editMaterial?.unit || 'Con');
  const [supplier, setSupplier] = useState(editMaterial?.supplier || '');
  const [note, setNote] = useState(editMaterial?.note || '');
  const [loading, setLoading] = useState(false);

  // Auto-generate code if empty when material name changes
  useEffect(() => {
    if (!editMaterial && materialName.trim() && !materialCode) {
      const cleanName = materialName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const prefix = groupType === 'VẬT TƯ SAU SƠN' ? 'VTS' : 'VTT';
      setMaterialCode(`${prefix}-${cleanName.slice(0, 8)}`);
    }
  }, [materialName, groupType, editMaterial, materialCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!materialName.trim()) return;

    try {
      setLoading(true);
      const payload = {
        group_type: groupType,
        stt: parseInt(stt) || 1,
        material_code: materialCode.trim() || `VT-${materialName.trim().slice(0, 6).toUpperCase()}`,
        material_name: materialName.trim(),
        color: color.trim(),
        quota: float(quota) || 1.0,
        unit: unit.trim() || 'Cái',
        supplier: supplier.trim(),
        note: note.trim()
      };

      if (editMaterial && editMaterial.id) {
        await api.put(`/master-products/materials-item/${editMaterial.id}`, payload);
      } else {
        await api.post(`/master-products/${productId}/materials`, payload);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu thông tin vật tư:', err);
    } finally {
      setLoading(false);
    }
  };

  function float(val) {
    const p = parseFloat(val);
    return isNaN(p) ? 1.0 : p;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '16px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#432818', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={22} color="#7B5233" />
              {editMaterial ? 'Chỉnh sửa vật tư BOM' : (modalMeta.title || 'Thêm vật tư BOM')}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Quản lý định mức phụ kiện hàng trắng, vật tư sau sơn và nguyên vật liệu đóng gói
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Nhóm vật tư & STT */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Phân nhóm vật tư *
              </label>
              <select
                value={groupType}
                onChange={e => setGroupType(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none', backgroundColor: '#F8FAFC', fontWeight: '700', color: '#7B5233' }}
              >
                <option value="Vật tư lắp ráp">Vật tư lắp ráp</option>
                <option value="Sơn">Sơn</option>
                <option value="Sơn Lót">Sơn Lót</option>
                <option value="Sơn Bóng">Sơn Bóng</option>
                <option value="Sơn UV">Sơn UV</option>
                <option value="Sơn UV Plywood">Sơn UV Plywood</option>
                <option value="Sơn Dặm Glaze">Sơn Dặm Glaze</option>
                <option value="Bao bì, đóng gói">Bao bì, đóng gói</option>
                <option value="Vật tư đi kèm">Vật tư đi kèm</option>
                <option value="Vật tư dùng chung">Vật tư dùng chung</option>
                <option value="Vật tư lắp ráp (LR3-ADV)">Vật tư lắp ráp (LR3-ADV)</option>
                <option value="VẬT TƯ HÀNG TRẮNG">VẬT TƯ HÀNG TRẮNG</option>
                <option value="VẬT TƯ SAU SƠN">VẬT TƯ SAU SƠN</option>
                {groupType && ![
                  'Vật tư lắp ráp', 'Sơn', 'Sơn Lót', 'Sơn Bóng', 'Sơn UV', 'Sơn UV Plywood',
                  'Sơn Dặm Glaze', 'Bao bì, đóng gói', 'Vật tư đi kèm', 'Vật tư dùng chung',
                  'Vật tư lắp ráp (LR3-ADV)', 'VẬT TƯ HÀNG TRẮNG', 'VẬT TƯ SAU SƠN'
                ].includes(groupType) && (
                  <option value={groupType}>{groupType}</option>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                STT *
              </label>
              <input
                type="number"
                min="1"
                required
                value={stt}
                onChange={e => setStt(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '700', outline: 'none', textAlign: 'center' }}
              />
            </div>
          </div>

          {/* Tên vật tư */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Tên vật tư / Phụ kiện *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Chốt 6*25, Vis 4*30 răng thưa, Bản lề 45⁰..."
              value={materialName}
              onChange={e => setMaterialName(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none', fontWeight: '600' }}
            />
          </div>

          {/* Mã vật tư & Màu sắc */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Mã vật tư
              </label>
              <input
                type="text"
                placeholder="Tự động sinh nếu để trống..."
                value={materialCode}
                onChange={e => setMaterialCode(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Màu sắc / Xi mạ
              </label>
              <input
                type="text"
                placeholder="VD: 7 màu, Niken, Đen, Trắng..."
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* Số lượng / Định mức & Đơn vị tính */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Định mức / Số lượng *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.0001"
                required
                value={quota}
                onChange={e => setQuota(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '800', color: '#7B5233', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Đơn vị tính *
              </label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="Con">Con</option>
                <option value="Cái">Cái</option>
                <option value="Bộ">Bộ</option>
                <option value="Cặp">Cặp</option>
                <option value="Tấm">Tấm</option>
                <option value="Cuộn">Cuộn</option>
                <option value="mm">mm</option>
                <option value="m">m (mét)</option>
                <option value="kg">kg (ký)</option>
                <option value="Bịch">Bịch</option>
              </select>
            </div>
          </div>

          {/* Nhà cung cấp & Ghi chú */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Nhà cung cấp
              </label>
              <input
                type="text"
                placeholder="VD: Tycoon, Hafele, Vinag7..."
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Ghi chú phụ kiện
              </label>
              <input
                type="text"
                placeholder="Ghi chú quy cách hoặc đóng gói..."
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '9px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '0.84rem', cursor: 'pointer', color: '#475569' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ border: 'none', background: '#5D3B32', color: '#fff', padding: '9px 22px', borderRadius: '8px', fontWeight: '700', fontSize: '0.84rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(93,59,50,0.2)' }}
            >
              {loading ? 'Đang lưu...' : (editMaterial ? 'Lưu thay đổi' : 'Thêm vật tư')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddMaterialModal;

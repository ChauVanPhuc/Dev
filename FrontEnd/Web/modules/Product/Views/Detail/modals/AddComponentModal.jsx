import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '700',
  color: '#2D1A12',
  marginBottom: '6px',
};

const inputBaseStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #EADCC9',
  borderRadius: '8px',
  fontSize: '0.88rem',
  fontWeight: '600',
  color: '#2D1A12',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const whiteInputStyle = {
  ...inputBaseStyle,
  backgroundColor: '#FFFFFF',
};

const greyInputStyle = {
  ...inputBaseStyle,
  backgroundColor: '#F1ECE6', // Light beige-grey matching mockup fields
  border: '1.5px solid #D9C5B2',
};

const AddComponentModal = ({ productId, product, bomRows = [], parentId = null, onClose, onSuccess, mode = 'detail' }) => {
  const modalMeta = useScreenMetadataCached('/admin/product/detail/modal/add-component');
  // Option lists
  const root = bomRows[0];
  const parentOptions = [
    ...(root ? [{ id: String(root.id || ''), name: `Sản phẩm (STT gốc)${root.compName ? ' - ' + root.compName : ''}`, stt: root.stt || '1' }] : []),
    ...bomRows.slice(1)
      .filter(r => r.stt)
      .map(r => ({ id: String(r.id || r.compCode), name: `${r.stt} - ${r.compName || 'Không tên'}`, stt: r.stt }))
  ];

  const [loaiOptions, setLoaiOptions] = useState([{ value: '', label: 'Sản phẩm (STT gốc)' }]);
  const stageOptions = [
    'Tạo phôi',
    'Định hình',
    'Chà nhám',
    'Sơn',
    'Sơn Pallet',
    'Sơn treo',
    'Lắp ráp',
    'QC / Kiểm định',
    'Đóng gói',
    'Lưu kho'
  ];
  const materialOptions = ['MDF', 'Gỗ Sồi', 'Gỗ thông', 'HDF', 'Ván ép', 'Kim loại'];
  const [colorOptions, setColorOptions] = useState(['Tự nhiên', 'Màu WOA', 'Màu sồi', 'Trắng', 'Đen']);

  // Form states
  const [selectedParent, setSelectedParent] = useState(parentId || (bomRows[0] ? String(bomRows[0].id) : ''));
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Cái');
  const [selectedLoai, setSelectedLoai] = useState('');
  const [type, setType] = useState('');
  const [detailName, setDetailName] = useState('');
  const [inputStage, setInputStage] = useState('Định hình');
  const [outputStage, setOutputStage] = useState('Lắp ráp');
  const [length, setLength] = useState('12');
  const [width, setWidth] = useState('12');
  const [height, setHeight] = useState('15');
  const [volume, setVolume] = useState('5');
  const [material, setMaterial] = useState('MDF');
  const [color, setColor] = useState('Tự nhiên');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailSuggestions, setDetailSuggestions] = useState([]);
  const [detailMetaMap, setDetailMetaMap] = useState({});
  const [loaiSearch, setLoaiSearch] = useState('');
  const [showLoaiMenu, setShowLoaiMenu] = useState(false);
  const [showNameMenu, setShowNameMenu] = useState(false);
  const selectingLoaiRef = useRef(false);
  const selectingNameRef = useRef(false);

  // Load danh sách màu sắc từ paint_color_samples
  useEffect(() => {
    const loadColors = async () => {
      try {
        const res = await api.get('/master-products/paint-color-suggestions').catch(() => null);
        if (res && res.color_names && res.color_names.length > 0) {
          setColorOptions(res.color_names);
        }
      } catch (err) {
        console.warn('Lỗi lấy bảng màu:', err);
      }
    };
    loadColors();
  }, []);

  // Load danh sách Loại từ master_product_details (các tên chi tiết đồng thời là parent)
  useEffect(() => {
    const loadLoai = async () => {
      try {
        const res = await api.get('/master-products/detail-suggestions').catch(() => null);
        if (res) {
          const detailSet = new Set(res.detail_names || []);
          const parents = (res.parent_names || []).filter(n => detailSet.has(n));
          setLoaiOptions([
            { value: '', label: 'Sản phẩm (STT gốc)' },
            ...parents.map(n => ({ value: n, label: n }))
          ]);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách loại:', err);
      }
    };
    loadLoai();
  }, []);

  // Fetch tên chi tiết con theo Loại đã chọn
  useEffect(() => {
    const fetchDetails = async () => {
      const parentName = selectedLoai || '';
      const url = parentName
        ? `/master-products/detail-suggestions?parent_name=${encodeURIComponent(parentName)}`
        : '/master-products/detail-suggestions';
      try {
        const res = await api.get(url).catch(() => null);
        if (res) {
          setDetailSuggestions(res.detail_names || []);
          setDetailMetaMap(res.detail_meta_map || {});
        }
      } catch (err) {
        console.warn('Lỗi lấy tên chi tiết con:', err);
      }
    };
    fetchDetails();
  }, [selectedLoai]);

  // type của dòng BOM mới: theo Loại hoặc theo Tên chi tiết nếu Loại là gốc
  useEffect(() => {
    if (selectedLoai === '') {
      setType(detailName || '');
    } else {
      setType(selectedLoai);
    }
  }, [selectedLoai, detailName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!detailName.trim()) return;

    try {
      setLoading(true);
      const specStr = `${length || 0}*${width || 0}*${height || 0}`;

      const parentObj = parentOptions.find(o => String(o.id) === String(selectedParent));
      const parentStt = parentObj ? parentObj.stt : '';

      if (mode === 'create') {
        onSuccess({
          parentId: selectedParent || null,
          parentStt,
          quantity: parseFloat(quantity),
          unit,
          type,
          detailName,
          inputStage,
          outputStage,
          length,
          width,
          height,
          volume: parseFloat(volume),
          material,
          color,
          note,
          specStr
        });
      } else {
        let sku;
        if (!parentStt) {
          const rootCount = bomRows.filter(r => !r.stt.includes('.')).length;
          sku = `ADV691.${rootCount + 1}`;
        } else {
          const siblings = bomRows.filter(r => r.stt.startsWith(`${parentStt}.`) && r.stt.split('.').length === parentStt.split('.').length + 1);
          const nextSubNum = siblings.length + 1;
          sku = `ADV691.${parentStt}.${nextSubNum}`;
        }

        await api.post(`/master-products/${productId}/bom-details`, {
          parent_id: selectedParent || null,
          name: detailName,
          sku,
          quantity: parseFloat(quantity),
          unit,
          component_type: type,
          input_stage: inputStage,
          output_stage: outputStage,
          specification: specStr,
          material,
          color,
          volume: parseFloat(volume),
          description: note
        });

        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Lỗi khi thêm thành phần mới:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(45, 26, 18, 0.45)', // Custom brown shadow backdrop
      backdropFilter: 'blur(3px)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '580px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        border: '1.5px solid #EADCC9'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #EADCC9'
        }}>
          <h3 style={{ fontSize: '1.38rem', fontWeight: '900', color: '#2D1A12', margin: 0 }}>
            {modalMeta.screenCode ? `${modalMeta.screenCode}: ` : ''}
            {modalMeta.title || 'Thêm thành phần'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#2D1A12',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '4px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* ROW 1: Thành phẩm, Số lượng, Đơn vị */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Thành phẩm</label>
                <select value={selectedParent} onChange={e => setSelectedParent(e.target.value)} style={whiteInputStyle}>
                  {parentOptions.map((opt, i) => (
                    <option key={i} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Số lượng</label>
                <input
                  type="number" min="1" step="any" required
                  value={quantity} onChange={e => setQuantity(e.target.value)}
                  style={greyInputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Đơn vị</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} style={greyInputStyle}>
                  <option value="Cái">Cái</option>
                  <option value="Tấm">Tấm</option>
                  <option value="Bộ">Bộ</option>
                  <option value="m2">m2</option>
                  <option value="m3">m3</option>
                </select>
              </div>
            </div>

            {/* ROW 2: Loại, Tên chi tiết */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Loại *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Nhấp chọn hoặc gõ loại..."
                    value={loaiSearch}
                    onFocus={() => setShowLoaiMenu(true)}
                    onChange={(e) => {
                      setLoaiSearch(e.target.value);
                      setSelectedLoai('');
                      setShowLoaiMenu(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        if (selectingLoaiRef.current) return;
                        const exact = loaiOptions.find(o => o.value.toLowerCase() === loaiSearch.trim().toLowerCase() || o.label.toLowerCase() === loaiSearch.trim().toLowerCase());
                        if (exact) {
                          setSelectedLoai(exact.value);
                          setLoaiSearch(exact.label);
                        } else {
                          setSelectedLoai(loaiSearch);
                        }
                        setShowLoaiMenu(false);
                      }, 150);
                    }}
                    style={whiteInputStyle}
                  />
                  {showLoaiMenu && (() => {
                    const query = (loaiSearch || '').toLowerCase().trim();
                    const filtered = query
                      ? loaiOptions.filter(o => o.label.toLowerCase().includes(query) || o.value.toLowerCase().includes(query)).slice(0, 100)
                      : loaiOptions.slice(0, 100);
                    if (filtered.length === 0) return null;
                    return (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                        backgroundColor: '#FFFFFF', border: '1.5px solid #EADCC9', borderRadius: '8px',
                        boxShadow: '0 8px 16px rgba(45, 26, 18, 0.15)', maxHeight: '400px', overflowY: 'auto', zIndex: 3000
                      }}>
                        {filtered.map((opt, idx) => (
                          <div
                            key={idx}
                            onMouseDown={() => {
                              selectingLoaiRef.current = true;
                              setLoaiSearch(opt.label);
                              setSelectedLoai(opt.value);
                              setShowLoaiMenu(false);
                              setTimeout(() => { selectingLoaiRef.current = false; }, 300);
                            }}
                            style={{
                              padding: '8px 12px', fontSize: '0.82rem', fontWeight: '600', color: '#2D1A12',
                              cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Tên chi tiết *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhấp chọn hoặc gõ tên chi tiết..."
                  value={detailName}
                  onFocus={() => setShowNameMenu(true)}
                  onChange={(e) => {
                    setDetailName(e.target.value);
                    setShowNameMenu(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (selectingNameRef.current) return;
                      const match = detailSuggestions.find(s => s.toLowerCase() === detailName.trim().toLowerCase());
                      if (match) {
                        const meta = detailMetaMap[match] || {};
                        setDetailName(match);
                        setQuantity(meta.quantity || 1);
                        setUnit(meta.unit || 'Cái');
                        setInputStage(meta.input_stage || 'Định hình');
                        setOutputStage(meta.output_stage || 'Lắp ráp');
                        setMaterial(meta.material || 'MDF');
                        setLength(String(meta.length || '12'));
                        setWidth(String(meta.width || '12'));
                        setHeight(String(meta.height || '15'));
                        setVolume(String(meta.volume || '5'));
                      }
                      setShowNameMenu(false);
                    }, 150);
                  }}
                  style={whiteInputStyle}
                />
                {showNameMenu && (
                  (() => {
                    const query = (detailName || '').toLowerCase().trim();
                    const filtered = query
                      ? detailSuggestions.filter(s => s.toLowerCase().includes(query)).slice(0, 100)
                      : detailSuggestions.slice(0, 100);
                    if (filtered.length === 0) return null;
                    return (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                        backgroundColor: '#FFFFFF', border: '1.5px solid #EADCC9', borderRadius: '8px',
                        boxShadow: '0 8px 16px rgba(45, 26, 18, 0.15)', maxHeight: '400px', overflowY: 'auto', zIndex: 3000
                      }}>
                        {filtered.map((item, idx) => (
                          <div
                            key={idx}
                            onMouseDown={() => {
                              selectingNameRef.current = true;
                              const meta = detailMetaMap[item] || {};
                              setDetailName(item);
                              setQuantity(meta.quantity || 1);
                              setUnit(meta.unit || 'Cái');
                              setInputStage(meta.input_stage || 'Định hình');
                              setOutputStage(meta.output_stage || 'Lắp ráp');
                              setMaterial(meta.material || 'MDF');
                              setLength(String(meta.length || '12'));
                              setWidth(String(meta.width || '12'));
                              setHeight(String(meta.height || '15'));
                              setVolume(String(meta.volume || '5'));
                              setShowNameMenu(false);
                              setTimeout(() => { selectingNameRef.current = false; }, 300);
                            }}
                            style={{
                              padding: '8px 12px', fontSize: '0.82rem', fontWeight: '600', color: '#2D1A12',
                              cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* ROW 3: Công đoạn giao, Công đoạn nhận, Quy cách, Khối lượng */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.8fr 1.2fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Công đoạn giao</label>
                <select value={inputStage} onChange={e => setInputStage(e.target.value)} style={greyInputStyle}>
                  {stageOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Công đoạn nhận</label>
                <select value={outputStage} onChange={e => setOutputStage(e.target.value)} style={greyInputStyle}>
                  {stageOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quy cách (mm)</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="number" placeholder="Dài" required
                    value={length} onChange={e => setLength(e.target.value)}
                    style={{ ...whiteInputStyle, padding: '10px 4px', textAlign: 'center' }}
                  />
                  <input
                    type="number" placeholder="Rộng" required
                    value={width} onChange={e => setWidth(e.target.value)}
                    style={{ ...whiteInputStyle, padding: '10px 4px', textAlign: 'center' }}
                  />
                  <input
                    type="number" placeholder="Cao" required
                    value={height} onChange={e => setHeight(e.target.value)}
                    style={{ ...whiteInputStyle, padding: '10px 4px', textAlign: 'center' }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Khối lượng (m3)</label>
                <input
                  type="number" placeholder="Volume" step="any" required
                  value={volume} onChange={e => setVolume(e.target.value)}
                  style={greyInputStyle}
                />
              </div>
            </div>

            {/* ROW 4: Vật liệu, Màu sắc */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Vật liệu *</label>
                <select value={material} onChange={e => setMaterial(e.target.value)} style={whiteInputStyle}>
                  {materialOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Màu sắc *</label>
                <select value={color} onChange={e => setColor(e.target.value)} style={whiteInputStyle}>
                  {colorOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 5: Ghi chú */}
            <div>
              <label style={labelStyle}>Ghi chú</label>
              <textarea
                rows="3"
                placeholder="Nhập ghi chú kỹ thuật..."
                value={note} onChange={e => setNote(e.target.value)}
                style={{ ...whiteInputStyle, resize: 'none' }}
              />
            </div>

            {/* ROW 6: Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '10px'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '11px 26px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #2D1A12',
                  borderRadius: '8px',
                  color: '#2D1A12',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '11px 32px',
                  backgroundColor: '#432818',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 10px rgba(67, 40, 24, 0.2)'
                }}
              >
                {loading ? 'Đang thêm...' : 'Xác nhận'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default AddComponentModal;

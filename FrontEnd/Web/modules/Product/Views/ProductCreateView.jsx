import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { ArrowLeft, Save, Plus, Trash2, Copy, FileSpreadsheet, AlertCircle } from 'lucide-react';

const ProductCreate = () => {
  const navigate = useNavigate();
  const pasteAreaRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Thông tin sản phẩm chính
  const [productData, setProductData] = useState({
    name: '',
    sku: '',
    length: 0,
    width: 0,
    height: 0,
    material: '',
    description: ''
  });

  // Danh sách BOM (dạng bảng phẳng)
  const [bomRows, setBomRows] = useState([
    { id: Date.now(), level: 1, name: '', quantity: 1, unit: 'Cái', material: '', length: 0, width: 0, height: 0, input_stage: '', output_stage: '', waste_ratio: 0, is_raw_material: false, exclude_production: false }
  ]);

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const updateRow = (id, field, value) => {
    setBomRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addRows = (count = 1) => {
    const newRows = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      level: 1,
      name: '',
      quantity: 1,
      unit: 'Cái',
      material: '',
      length: 0,
      width: 0,
      height: 0,
      input_stage: '',
      output_stage: '',
      waste_ratio: 0,
      is_raw_material: false,
      exclude_production: false
    }));
    setBomRows(prev => [...prev, ...newRows]);
  };

  const removeRow = (id) => {
    if (bomRows.length === 1) return;
    setBomRows(prev => prev.filter(row => row.id !== id));
  };

  const handlePasteExcel = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split('\n');
    let firstRowProductInfo = null;

    const newRows = lines.map((line, index) => {
      const cells = line.split('\t');
      if (cells.length < 8) return null; 

      // 1. Tự động nhận diện cột Đơn vị làm mốc (uIdx)
      let uIdx = -1;
      const unitKeywords = ['cái', 'm3', 'bộ', 'pcs', 'mét', 'kg', 'tấm', 'thanh'];
      for (let i = 0; i < Math.min(cells.length, 15); i++) {
        const val = (cells[i] || '').toLowerCase().trim();
        if (unitKeywords.includes(val)) {
          uIdx = i;
          break;
        }
      }

      const unitIdx = uIdx > 0 ? uIdx : 8;
      const nameIdx = unitIdx - 1;
      const skuIdx = unitIdx - 2;
      const specIdx = unitIdx + 1;
      const qtyIdx = unitIdx + 2;
      const wasteIdx = unitIdx + 3;

      // 2. Lấy thông tin sản phẩm chính từ dòng đầu tiên
      // Dựa trên ảnh: cells[0] là SKU (FOL...), cells[1] là Tên (Wooden...)
      if (!firstRowProductInfo && cells[0] && cells[1]) {
        firstRowProductInfo = {
          sku: cells[0],
          name: cells[1],
          length: 0, width: 0, height: 0, material: ''
        };
      }

      // 3. Ánh xạ chi tiết BOM
      const childSku = cells[skuIdx]?.trim() || '';
      const childName = cells[nameIdx]?.trim() || '';
      const childUnit = cells[unitIdx]?.trim() || 'Cái';
      
      if (!childName || childName === 'Tên chi tiết' || childName === 'Tên mặt hàng') return null;

      const childSpec = cells[specIdx] || '';
      let cl = 0, cw = 0, ch = 0;
      const cdims = childSpec.match(/(\d+(\.\d+)?)/g);
      if (cdims && cdims.length >= 3) {
        cl = parseFloat(cdims[0]);
        cw = parseFloat(cdims[1]);
        ch = parseFloat(cdims[2]);
        
        // Cập nhật kích thước cho sản phẩm chính từ chi tiết đầu tiên có quy cách (thường là bao quát)
        if (firstRowProductInfo && firstRowProductInfo.length === 0) {
          firstRowProductInfo.length = cl;
          firstRowProductInfo.width = cw;
          firstRowProductInfo.height = ch;
        }
      }

      // Tự động xác định Bậc (Level) dựa trên Mã chi tiết (số dấu chấm)
      // .1 -> Bậc 1, 1.1 -> Bậc 2. Nên Level = dotCount
      const dotCount = (childSku.match(/\./g) || []).length;
      const autoLevel = dotCount;

      return {
        id: Date.now() + index,
        level: autoLevel,
        sku: childSku,
        name: childName,
        quantity: parseFloat(cells[qtyIdx]) || 1,
        unit: childUnit,
        material: childSpec, 
        length: cl,
        width: cw,
        height: ch,
        waste_ratio: parseFloat(cells[wasteIdx]) || 0,
        description: cells[wasteIdx + 2] || '', 
        input_stage: (cells[cells.length - 1] || '').trim(), // Đổi lại: R là CĐ vào
        output_stage: (cells[cells.length - 2] || '').trim(), // Đổi lại: Q là CĐ ra
        is_raw_material: line.toLowerCase().includes('có'),
        exclude_production: false
      };
    }).filter(r => r !== null);

    if (newRows.length > 0) {
      // Tự động điền thông tin sản phẩm chính
      if (firstRowProductInfo) {
        setProductData(prev => ({
          ...prev,
          ...firstRowProductInfo
        }));
      }

      // Cập nhật bảng BOM
      if (bomRows.length === 1 && !bomRows[0].name) {
        setBomRows(newRows);
      } else {
        setBomRows(prev => [...prev, ...newRows]);
      }
      setShowPasteModal(false);
      setPasteText('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productData.name || !productData.sku) {
      alert("Vui lòng nhập tên và mã SKU sản phẩm chính");
      return;
    }

    setLoading(true);
    try {
      // Chuyển đổi bảng phẳng sang cấu trúc cây nếu cần (Backend hiện tại có vẻ nhận mảng phẳng hoặc cây)
      // Dựa trên code cũ, backend nhận master_bom_details. 
      // Tôi sẽ gửi mảng phẳng, backend thường sẽ tự xử lý level.
      const payload = {
        ...productData,
        master_bom_details: bomRows.filter(r => r.name.trim() !== '')
      };

      await api.post('/master-products/', payload);
      alert('Tạo sản phẩm mẫu thành công!');
      navigate('/manufacture/products');
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#F3F4F6', minHeight: '100vh' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate('/manufacture/products')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B7280' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0 }}>Thêm BOM Sản Phẩm Mới</h1>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Nhập liệu nhanh theo dạng bảng Excel</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowPasteModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
          >
            <FileSpreadsheet size={18} /> Dán từ Excel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#A0301B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 6px rgba(160, 48, 27, 0.2)' }}
          >
            <Save size={18} /> {loading ? 'Đang lưu...' : 'Lưu dữ liệu'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* SECTION 1: THÔNG TIN CHUNG */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#374151', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', backgroundColor: '#A0301B', borderRadius: '2px' }} />
            Thông tin sản phẩm chính
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '5px' }}>Tên Sản Phẩm *</label>
              <input type="text" name="name" value={productData.name} onChange={handleProductChange} placeholder="Vd: Tủ bếp gỗ Sồi" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '5px' }}>Mã SKU *</label>
              <input type="text" name="sku" value={productData.sku} onChange={handleProductChange} placeholder="Vd: TB-001" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '5px' }}>Dài (L)</label>
                <input type="number" name="length" value={productData.length} onChange={handleProductChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '5px' }}>Rộng (W)</label>
                <input type="number" name="width" value={productData.width} onChange={handleProductChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '5px' }}>Cao (H)</label>
                <input type="number" name="height" value={productData.height} onChange={handleProductChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: BẢNG BOM */}
        <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '16px', backgroundColor: '#10B981', borderRadius: '2px' }} />
              Chi tiết cấu trúc BOM (Linh kiện & Vật tư)
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => addRows(1)} style={{ padding: '6px 12px', backgroundColor: 'white', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={14} /> Thêm 1 dòng</button>
              <button onClick={() => addRows(5)} style={{ padding: '6px 12px', backgroundColor: 'white', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={14} /> Thêm 5 dòng</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '10px', textAlign: 'center', width: '40px', color: '#6B7280' }}>STT</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '50px' }}>Bậc</th>
                  <th style={{ padding: '10px', textAlign: 'left', width: '120px' }}>Mã chi tiết</th>
                  <th style={{ padding: '10px', textAlign: 'left', minWidth: '180px' }}>Tên linh kiện *</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '50px' }}>SL</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '70px' }}>ĐVT</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '130px' }}>Kích thước (D-R-C)</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '60px' }}>Hao hụt</th>
                  <th style={{ padding: '10px', textAlign: 'left', width: '120px' }}>CĐ Vào</th>
                  <th style={{ padding: '10px', textAlign: 'left', width: '120px' }}>CĐ Ra</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '50px' }}>NVL?</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {bomRows.map((row, index) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#9CA3AF' }}>{index + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={row.level} onChange={(e) => updateRow(row.id, 'level', parseInt(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid #E5E7EB', borderRadius: '4px', textAlign: 'center', backgroundColor: '#F3F4F6', fontWeight: 'bold' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={row.sku} onChange={(e) => updateRow(row.id, 'sku', e.target.value)} placeholder="Mã..." style={{ width: '100%', padding: '6px', border: '1px solid transparent', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {/* Hiệu ứng thụt lề theo Bậc */}
                        {[...Array(Math.max(0, row.level - 1))].map((_, i) => (
                          <div key={i} style={{ width: '15px', height: '1px', borderBottom: '1px dashed #D1D5DB' }} />
                        ))}
                        <input 
                          type="text" 
                          value={row.name} 
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)} 
                          placeholder="Nhập tên..." 
                          style={{ 
                            flex: 1, 
                            padding: '6px', 
                            border: '1px solid transparent', 
                            backgroundColor: row.name ? 'transparent' : '#FFFBEB', 
                            borderRadius: '4px',
                            fontWeight: row.level === 1 ? '700' : '400',
                            color: row.level === 1 ? '#A0301B' : '#374151'
                          }} 
                        />
                      </div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={row.quantity} onChange={(e) => updateRow(row.id, 'quantity', parseFloat(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid transparent', textAlign: 'center', fontWeight: 'bold' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={row.unit} onChange={(e) => updateRow(row.id, 'unit', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid transparent', textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <input type="number" value={row.length} onChange={(e) => updateRow(row.id, 'length', parseFloat(e.target.value))} placeholder="D" style={{ width: '33%', padding: '4px', border: '1px solid #F3F4F6', textAlign: 'center', fontSize: '11px' }} />
                        <input type="number" value={row.width} onChange={(e) => updateRow(row.id, 'width', parseFloat(e.target.value))} placeholder="R" style={{ width: '33%', padding: '4px', border: '1px solid #F3F4F6', textAlign: 'center', fontSize: '11px' }} />
                        <input type="number" value={row.height} onChange={(e) => updateRow(row.id, 'height', parseFloat(e.target.value))} placeholder="C" style={{ width: '33%', padding: '4px', border: '1px solid #F3F4F6', textAlign: 'center', fontSize: '11px' }} />
                      </div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={row.waste_ratio} onChange={(e) => updateRow(row.id, 'waste_ratio', parseFloat(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid transparent', textAlign: 'center', color: '#6B7280' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={row.input_stage} onChange={(e) => updateRow(row.id, 'input_stage', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid transparent', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={row.output_stage} onChange={(e) => updateRow(row.id, 'output_stage', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid transparent', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input type="checkbox" checked={row.is_raw_material} onChange={(e) => updateRow(row.id, 'is_raw_material', e.target.checked)} />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => removeRow(row.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '5px' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ padding: '15px 20px', backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '20px', fontSize: '12px', color: '#6B7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><AlertCircle size={14} /> Có thể dán dữ liệu từ file Excel (STT-Cấp-Tên-SL-Đơn vị...)</span>
            <span style={{ marginLeft: 'auto' }}>Tổng số dòng: {bomRows.length}</span>
          </div>
        </div>
      </div>

      {/* PASTE MODAL */}
      {showPasteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '800px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0 }}>Dán dữ liệu từ Excel</h2>
              <button onClick={() => setShowPasteModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9CA3AF' }}>&times;</button>
            </div>
            
            <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '15px' }}>
              Copy các dòng trong Excel (từ cột <b>Cấp</b> đến cột <b>Không SX</b>) rồi dán vào ô bên dưới:
            </p>
            
            <textarea 
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Dán dữ liệu tại đây..."
              style={{ width: '100%', height: '300px', padding: '15px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', fontFamily: 'monospace', outline: 'none', backgroundColor: '#F9FAFB' }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowPasteModal(false)} style={{ padding: '10px 20px', backgroundColor: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Hủy bỏ</button>
              <button 
                onClick={handlePasteExcel}
                style={{ padding: '10px 24px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
              >
                Xác nhận Nhập
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input:focus {
          border-color: #A0301B !important;
          outline: none;
          background-color: white !important;
          box-shadow: 0 0 0 2px rgba(160, 48, 27, 0.1);
        }
        tr:hover {
          background-color: #FFF7F6 !important;
        }
      `}</style>
    </div>
  );
};

export default ProductCreate;

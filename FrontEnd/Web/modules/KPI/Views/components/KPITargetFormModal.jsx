import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

/**
 * Modal Thêm mới / Chỉnh sửa Mục tiêu KPI (Tab 2 - CRUD Chỉ số công việc)
 * Tối ưu theo yêu cầu sếp:
 * 1. Đơn vị tính chọn trước
 * 2. Ngưỡng đạt: Toán tử (>=, <=, =) + Ô NHẬP SỐ + Badge Đơn vị tính CỐ ĐỊNH bên phải
 * 3. Trọng số: Ô NHẬP SỐ + Badge % CỐ ĐỊNH bên phải
 */
const KPITargetFormModal = ({ isOpen, onClose, targetData, onSave }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    dept: 'IQC - QC Kiểm Tra Nhập Kho',
    unit: '%',
    operator: '>=',
    targetVal: '95',
    weight: '20',
    description: ''
  });

  // Bản đồ gợi ý giá trị số cho các đơn vị tính
  const PRESETS_BY_UNIT = {
    '%': [
      { op: '>=', val: '98' },
      { op: '>=', val: '95' },
      { op: '<', val: '0.5' },
      { op: '=', val: '100' }
    ],
    'claim': [
      { op: '=', val: '0' },
      { op: '<=', val: '1' }
    ],
    'báo cáo': [
      { op: '>=', val: '1' },
      { op: '>=', val: '2' },
      { op: '=', val: '100%' }
    ],
    'buổi': [
      { op: '>=', val: '1' },
      { op: '=', val: '2' }
    ],
    'lỗi': [
      { op: '=', val: '0' },
      { op: '<=', val: '2' }
    ],
    'đơn': [
      { op: '=', val: '0' },
      { op: '>=', val: '100%' }
    ],
    'điểm': [
      { op: '>=', val: '90' },
      { op: '>=', val: '85' }
    ],
    'ca': [
      { op: '>=', val: '1' }
    ],
    'giờ': [
      { op: '<=', val: '24' },
      { op: '<=', val: '48' }
    ]
  };

  // Default fallback matching system config 'Danh mục Bộ phận'
  const [dbDepartments, setDbDepartments] = useState([
    { code: 'IQC', name: 'QC Kiểm Tra Nhập Kho' },
    { code: 'QA', name: 'Nhân Viên Kiểm Soát Quy Trình' },
    { code: 'PQC1', name: 'QC Định Hình - Lắp Ráp' },
    { code: 'PQC2', name: 'QC Sơn - Đóng Gói' },
    { code: 'FQC', name: 'QC Final' }
  ]);

  // Default fallback matching system config 'Danh mục Công đoạn SX' (/stages/)
  const [dbStages, setDbStages] = useState([
    { code: 'CD01', name: 'Nhập Kho/Đầu Vào' },
    { code: 'CD02', name: 'Tạo Phôi' },
    { code: 'CD03', name: 'Định Hình' },
    { code: 'CD04', name: 'Lắp Ráp' },
    { code: 'CD05', name: 'Sơn' },
    { code: 'CD06', name: 'Đóng Gói' },
    { code: 'CD07', name: 'Lưu Kho' }
  ]);

  // Fetch real departments and stages from System Config APIs `/departments` & `/stages`
  useEffect(() => {
    const fetchSystemConfigs = async () => {
      try {
        const [deptResp, stageResp] = await Promise.all([
          api.get('/departments/').catch(() => null),
          api.get('/stages/').catch(() => null)
        ]);

        if (deptResp && Array.isArray(deptResp) && deptResp.length > 0) {
          const mapped = deptResp.map(d => ({
            code: d.code || '',
            name: d.name || ''
          }));
          setDbDepartments(mapped);
        } else {
          const empResp = await api.get('/kpi-management/employees').catch(() => null);
          if (empResp && Array.isArray(empResp) && empResp.length > 0) {
            const deptsFromEmp = Array.from(new Set(empResp.map(e => e.department).filter(Boolean)));
            if (deptsFromEmp.length > 0) {
              setDbDepartments(deptsFromEmp.map(d => ({ code: '', name: d })));
            }
          }
        }

        if (stageResp && Array.isArray(stageResp) && stageResp.length > 0) {
          const mappedStages = stageResp
            .filter(s => s.is_active !== false)
            .map(s => ({
              code: s.code || '',
              name: s.name || ''
            }));
          if (mappedStages.length > 0) {
            setDbStages(mappedStages);
          }
        }
      } catch (err) {
        console.error('Error loading system configs (departments/stages):', err);
      }
    };

    fetchSystemConfigs();
  }, []);

  // Parse existing target string e.g. ">= 95%", "0 claim", "Đúng hạn" into operator + targetVal
  const parseTargetStr = (str, unit) => {
    if (!str) return { operator: '>=', targetVal: '95' };
    
    let op = '>=';
    let val = str.trim();

    if (val.startsWith('>=')) { op = '>='; val = val.substring(2); }
    else if (val.startsWith('<=')) { op = '<='; val = val.substring(2); }
    else if (val.startsWith('>')) { op = '>'; val = val.substring(1); }
    else if (val.startsWith('<')) { op = '<'; val = val.substring(1); }
    else if (val.startsWith('=')) { op = '='; val = val.substring(1); }
    else if (/^\d+/.test(val)) { op = '='; }

    // Strip trailing unit string if present
    if (unit && val.endsWith(unit)) {
      val = val.substring(0, val.length - unit.length);
    }
    val = val.replace(/%/g, '').trim();

    return { operator: op, targetVal: val || '95' };
  };

  // Helper khớp linh hoạt nhãn bộ phận với danh sách dbDepartments
  const findMatchingDeptLabel = (rawDept) => {
    if (!rawDept) return null;
    const searchStr = String(rawDept).toLowerCase().trim();
    const match = dbDepartments.find(d => {
      const fullLabel = d.code ? `${d.code} - ${d.name}` : d.name;
      return (
        fullLabel.toLowerCase() === searchStr ||
        (d.code && d.code.toLowerCase() === searchStr) ||
        (d.name && d.name.toLowerCase() === searchStr) ||
        fullLabel.toLowerCase().includes(searchStr) ||
        searchStr.includes(d.name.toLowerCase())
      );
    });
    if (match) {
      return match.code ? `${match.code} - ${match.name}` : match.name;
    }
    return rawDept;
  };

  useEffect(() => {
    const defaultDept = dbDepartments[0] 
      ? (dbDepartments[0].code ? `${dbDepartments[0].code} - ${dbDepartments[0].name}` : dbDepartments[0].name)
      : 'IQC - QC Kiểm Tra Nhập Kho';

    if (targetData) {
      const rawWeight = (targetData.weight || '20').toString().replace(/%/g, '').trim();
      const unitVal = targetData.unit || '%';
      const parsedTarget = parseTargetStr(targetData.target, unitVal);
      const matchedDept = findMatchingDeptLabel(targetData.dept || targetData.department);

      setFormData({
        code: targetData.code || 'KPI01',
        name: targetData.name || targetData.content || '',
        dept: matchedDept || defaultDept,
        unit: unitVal,
        operator: targetData.operator || parsedTarget.operator,
        targetVal: targetData.target_val || parsedTarget.targetVal,
        weight: rawWeight,
        description: targetData.description || targetData.calc_method || '',
        data_source: targetData.data_source || 'inspection',
        calc_method: targetData.calc_method || 'avg_ticket_rate',
        stage_filter: targetData.stage_filter || '',
        type_filter: targetData.type_filter || '',
        employee_field: targetData.employee_field || 'inspector_name',
        penalty_factor: targetData.penalty_factor || 2.0,
        denominator: targetData.denominator || 26.0,
        no_data_behavior: targetData.no_data_behavior || 'full_score'
      });
    } else {
      setFormData({
        code: `KPI${Math.floor(Math.random() * 89) + 10}`,
        name: '',
        dept: defaultDept,
        unit: '%',
        operator: '>=',
        targetVal: '95',
        weight: '20',
        description: '',
        data_source: 'inspection',
        calc_method: 'avg_ticket_rate',
        stage_filter: '',
        type_filter: '',
        employee_field: 'inspector_name',
        penalty_factor: 2.0,
        denominator: 26.0,
        no_data_behavior: 'full_score'
      });
    }
  }, [targetData, dbDepartments]);

  // Handler khi thay đổi Đơn vị tính
  const handleUnitChange = (newUnit) => {
    const defaultPresets = PRESETS_BY_UNIT[newUnit] || [];
    const firstPreset = defaultPresets[0] || { op: '>=', val: '1' };

    setFormData(prev => ({
      ...prev,
      unit: newUnit,
      operator: firstPreset.op,
      targetVal: firstPreset.val
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Construct full target text e.g. ">= 95%" or "0 claim" or ">= 1 buổi"
    const opPrefix = formData.operator ? `${formData.operator} ` : '';
    const unitSuffix = formData.unit ? ` ${formData.unit}` : '';
    const fullTargetText = `${opPrefix}${formData.targetVal}${unitSuffix}`.trim().replace(/\s+/g, ' ');

    const numericWeight = formData.weight.toString().replace(/%/g, '').trim();
    const finalWeightStr = numericWeight ? `${numericWeight}%` : '20%';

    if (onSave) {
      onSave({ 
        ...formData, 
        target: fullTargetText,
        weight: finalWeightStr,
        id: targetData ? targetData.id : Date.now() 
      });
    }
    onClose();
  };

  // Preset list for currently selected unit
  const currentPresets = PRESETS_BY_UNIT[formData.unit] || PRESETS_BY_UNIT['%'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box'
    }} onClick={onClose}>
      
      <div style={{
        margin: 'auto',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #EADCC9',
          backgroundColor: '#FAF6F0'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#5D3B32', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {targetData ? 'Chỉnh sửa Chỉ số KPI' : 'Thiết lập Mục tiêu KPI Mới'}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#7B5233' }}>
              Cấu hình chỉ số công việc và công thức tính toán tự động cho nhân sự QC
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ border: 'none', background: '#EFE5DC', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5D3B32', transition: 'all 0.2s' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form - Scrollable if screen is small */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          {/* Group 1: Thông tin chỉ số & Ngưỡng mục tiêu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Row 1: Mã KPI & Tên chỉ số công việc */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                  Mã chỉ số KPI <span style={{ color: '#A04020' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: '700', color: '#1E293B', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                  Tên chỉ số công việc <span style={{ color: '#A04020' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Tỷ lệ hàng đạt lần đầu FTY / Tỷ lệ hoàn thành kế hoạch CAPA"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            {/* Row 3: Đơn vị tính -> Ngưỡng đạt -> Trọng số (%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 0.9fr', gap: '12px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#5D3B32', marginBottom: '4px' }}>
                  1. Chọn Đơn vị tính <span style={{ color: '#A04020' }}>*</span>
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #5D3B32', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAF6F0' }}
                >
                  <option value="%">% (Phần trăm)</option>
                  <option value="claim">claim (Số vụ khiếu nại)</option>
                  <option value="báo cáo">báo cáo (Báo cáo QC)</option>
                  <option value="buổi">buổi (Đào tạo / Họp)</option>
                  <option value="lỗi">lỗi (Số lượng lỗi phát hiện)</option>
                  <option value="đơn">đơn (Đơn hàng / Lô hàng)</option>
                  <option value="điểm">điểm (Thang điểm đánh giá)</option>
                  <option value="ca">ca (Ca làm việc)</option>
                  <option value="giờ">giờ (Thời gian xử lý)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                  2. Ngưỡng đạt chỉ số <span style={{ color: '#A04020' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                  <select 
                    value={formData.operator}
                    onChange={(e) => setFormData(prev => ({ ...prev, operator: e.target.value }))}
                    style={{ padding: '8px 6px', border: 'none', borderRight: '1px solid #CBD5E1', backgroundColor: '#FAF6F0', fontSize: '0.82rem', fontWeight: '800', color: '#5D3B32', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value=">=">&ge;</option>
                    <option value="<=">&le;</option>
                    <option value="=">=</option>
                    <option value="<">&lt;</option>
                    <option value=">">&gt;</option>
                    <option value="">---</option>
                  </select>
                  <input
                    type="text"
                    placeholder="95"
                    value={formData.targetVal}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetVal: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: 'none', fontSize: '0.85rem', outline: 'none', textAlign: 'center', fontWeight: '700', color: '#1E293B', boxSizing: 'border-box' }}
                    required
                  />
                  <span style={{ padding: '8px 10px', backgroundColor: '#FAF6F0', color: '#5D3B32', fontWeight: '800', fontSize: '0.8rem', borderLeft: '1px solid #CBD5E1', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {formData.unit}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                  3. Trọng số điểm <span style={{ color: '#A04020' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="20"
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                    style={{ width: '100%', padding: '8px 8px', border: 'none', fontSize: '0.85rem', outline: 'none', textAlign: 'right', fontWeight: '700', color: '#1E293B', boxSizing: 'border-box' }}
                    required
                  />
                  <span style={{ padding: '8px 10px', backgroundColor: '#FAF6F0', color: '#5D3B32', fontWeight: '800', fontSize: '0.85rem', borderLeft: '1px solid #CBD5E1', userSelect: 'none' }}>
                    %
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Group 2: CARD CẤU HÌNH NGUỒN DỮ LIỆU & CÔNG THỨC ĐỘNG (NÂU GỖ TÔN NỀN NHÀ) */}
          <div style={{
            backgroundColor: '#FAF6F0',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #EADCC9',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#5D3B32', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Cấu Hình Nguồn Dữ Liệu & Công Thức Động
              </div>
              <span style={{ fontSize: '0.68rem', backgroundColor: '#EFE5DC', color: '#5D3B32', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                Engine Tự Động
              </span>
            </div>

            {/* Row Nguồn dữ liệu & Phương pháp tính */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                  Nguồn dữ liệu truy vấn <span style={{ color: '#A04020' }}>*</span>
                </label>
                <select
                  value={formData.data_source || 'inspection'}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_source: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: '600', color: '#1E293B', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="inspection">Phiếu kiểm tra QC sản xuất</option>
                  <option value="capa">Phiếu khắc phục sự cố CAPA</option>
                  <option value="violation">Biên bản vi phạm & Điểm thưởng</option>
                  <option value="training">Kế hoạch đào tạo & Đánh giá</option>
                  <option value="claim">Khiếu nại từ Khách hàng</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                  Phương pháp tính điểm <span style={{ color: '#A04020' }}>*</span>
                </label>
                <select
                  value={formData.calc_method || 'avg_ticket_rate'}
                  onChange={(e) => setFormData(prev => ({ ...prev, calc_method: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: '600', color: '#1E293B', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="avg_ticket_rate">TB cộng % Đạt từng phiếu (Mẫu - Lỗi)</option>
                  <option value="completion_ratio">Tỷ lệ hoàn thành đúng hạn (%)</option>
                  <option value="count_penalty">Trừ điểm theo lượt vi phạm (100% - N × phạt)</option>
                  <option value="attendance_days">Tỷ lệ ngày công thực tế (Ngày / Mẫu số)</option>
                  <option value="inverse_count">Trừ điểm theo vụ claim (100% - N × phạt)</option>
                </select>
              </div>
            </div>

            {/* Row Điều kiện lọc bổ sung (Nếu nguồn là Inspection) */}
            {formData.data_source === 'inspection' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                    Lọc theo Công đoạn SX
                  </label>
                  <select
                    value={formData.stage_filter || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, stage_filter: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: '600', outline: 'none', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">-- Tất cả công đoạn (Không lọc) --</option>
                    <optgroup label="Danh mục Công đoạn SX (Hệ thống)">
                      {dbStages.map((stg, idx) => (
                        <option key={stg.code || idx} value={stg.name || stg.code}>
                          {stg.code ? `[${stg.code}] ${stg.name}` : stg.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Nhóm công đoạn phổ biến">
                      <option value="Nhập Kho/Đầu Vào,Nhập Kho,Đầu Vào,IQC">Nhập Kho / Đầu Vào (IQC)</option>
                      <option value="Tạo Phôi,Định Hình,Lắp Ráp,Sơn">Công đoạn Sản xuất (PQC)</option>
                      <option value="Đóng Gói,Final,Lưu Kho">Đóng Gói, Final & Lưu Kho</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                    Phân loại kiểm tra
                  </label>
                  <select
                    value={formData.type_filter || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, type_filter: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: '600', outline: 'none', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">-- Tất cả loại kiểm tra --</option>
                    <option value="first_sample">Mẫu đầu tiên (First sample)</option>
                    <option value="patrol">Kiểm tra tuần tra (Patrol)</option>
                    <option value="final">Final / OQC xuất hàng (Final)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Row Cấu hình hệ số phạt & Mẫu số & Trường nhân sự */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {(formData.calc_method === 'count_penalty' || formData.calc_method === 'inverse_count') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                    Hệ số trừ điểm (% / lần)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.penalty_factor || '2.0'}
                    onChange={(e) => setFormData(prev => ({ ...prev, penalty_factor: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {formData.calc_method === 'attendance_days' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                    Số ngày công quy chuẩn
                  </label>
                  <input
                    type="number"
                    value={formData.denominator || '26'}
                    onChange={(e) => setFormData(prev => ({ ...prev, denominator: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                  Xử lý khi thiếu dữ liệu
                </label>
                <select
                  value={formData.no_data_behavior || 'full_score'}
                  onChange={(e) => setFormData(prev => ({ ...prev, no_data_behavior: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: '600', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="full_score">Tính 100% Đạt (Mặc định)</option>
                  <option value="zero_score">Tính 0% Đạt</option>
                  <option value="no_data">Hiển thị "Chưa có dữ liệu"</option>
                  <option value="target_value">Gán bằng Ngưỡng đạt</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
                  Trường đối soát Nhân viên
                </label>
                <select
                  value={formData.employee_field || 'inspector_name'}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_field: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: '600', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="inspector_name">QC Kiểm tra (inspector_name)</option>
                  <option value="employee_id">Mã nhân viên (employee_id)</option>
                  <option value="handler_name">Người xử lý (handler_name)</option>
                  <option value="all">Tính chung toàn bộ nhân sự (all)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Quick Presets Badge Chips */}
          {currentPresets.length > 0 && (
            <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '8px 12px', border: '1px solid #EADCC9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#5D3B32', fontWeight: '700', marginBottom: '4px' }}>
                Gợi ý chọn nhanh ngưỡng đạt mẫu cho "{formData.unit}":
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {currentPresets.map((p, idx) => {
                  const label = `${p.op} ${p.val} ${formData.unit}`.trim();
                  const isSelected = formData.operator === p.op && formData.targetVal === p.val;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, operator: p.op, targetVal: p.val }))}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #5D3B32' : '1px solid #EADCC9',
                        backgroundColor: isSelected ? '#5D3B32' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#5D3B32',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mô tả chi tiết */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4A3E3B', marginBottom: '4px' }}>
              Mô tả chi tiết & Hướng dẫn đo lường
            </label>
            <textarea
              rows={2}
              placeholder="VD: Đo lường tỷ lệ sản phẩm đạt tiêu chuẩn chất lượng QC không bị trả lại tại công đoạn PQC..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Modal Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#5D3B32',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(93, 59, 50, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              {targetData ? 'Cập nhật KPI' : 'Lưu chỉ số KPI'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default KPITargetFormModal;

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

  useEffect(() => {
    if (targetData) {
      const rawWeight = (targetData.weight || '20').toString().replace(/%/g, '').trim();
      const unitVal = targetData.unit || '%';
      const parsedTarget = parseTargetStr(targetData.target, unitVal);

      setFormData({
        code: targetData.code || 'KPI01',
        name: targetData.name || targetData.content || '',
        dept: targetData.dept || targetData.department || (dbDepartments[0]?.name || 'IQC - QC Kiểm Tra Nhập Kho'),
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
      const firstDeptLabel = dbDepartments[0] 
        ? (dbDepartments[0].code ? `${dbDepartments[0].code} - ${dbDepartments[0].name}` : dbDepartments[0].name)
        : 'IQC - QC Kiểm Tra Nhập Kho';

      setFormData({
        code: `KPI${Math.floor(Math.random() * 89) + 10}`,
        name: '',
        dept: firstDeptLabel,
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
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
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
        borderRadius: '12px',
        width: '100%',
        maxWidth: '540px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FAF6F0'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#5D3B32', fontWeight: '800' }}>
            {targetData ? '✏️ Chỉnh sửa Chỉ số KPI' : '➕ Thêm Mục tiêu KPI mới'}
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Row 1: Mã KPI & Bộ phận áp dụng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Mã KPI *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Bộ phận áp dụng
              </label>
              <select
                value={formData.dept}
                onChange={(e) => setFormData(prev => ({ ...prev, dept: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              >
                {dbDepartments.map((deptItem, idx) => {
                  const label = deptItem.code ? `${deptItem.code} - ${deptItem.name}` : deptItem.name;
                  return (
                    <option key={idx} value={label}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Row 2: Tên chỉ số công việc */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Tên chỉ số công việc *
            </label>
            <input
              type="text"
              placeholder="VD: Tỷ lệ hàng đạt lần đầu FTY"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* Row 3: BƯỚC 1: Đơn vị tính -> BƯỚC 2: Ngưỡng đạt -> BƯỚC 3: Trọng số (%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.9fr', gap: '10px' }}>
            
            {/* 1. Chọn Đơn vị tính trước */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#5D3B32', marginBottom: '3px' }}>
                1. Đơn vị tính *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => handleUnitChange(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1.5px solid #5D3B32', fontSize: '0.8rem', fontWeight: '700', color: '#5D3B32', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAF6F0' }}
              >
                <option value="%">% (Phần trăm)</option>
                <option value="claim">claim (Khiếu nại)</option>
                <option value="báo cáo">báo cáo</option>
                <option value="buổi">buổi (Đào tạo/Họp)</option>
                <option value="lỗi">lỗi (Số lỗi)</option>
                <option value="đơn">đơn (Đơn hàng)</option>
                <option value="điểm">điểm (Thang điểm)</option>
                <option value="ca">ca (Ca làm việc)</option>
                <option value="giờ">giờ (Thời gian)</option>
              </select>
            </div>

            {/* 2. Ngưỡng đạt: [Chọn toán tử] + [Gõ số] + [Badge đơn vị cố định] */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                2. Ngưỡng đạt *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                <select 
                  value={formData.operator}
                  onChange={(e) => setFormData(prev => ({ ...prev, operator: e.target.value }))}
                  style={{ padding: '6px 4px', border: 'none', borderRight: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontSize: '0.78rem', fontWeight: '800', color: '#334155', outline: 'none', cursor: 'pointer' }}
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
                  style={{ width: '100%', padding: '6px 8px', border: 'none', fontSize: '0.8rem', outline: 'none', textAlign: 'center', fontWeight: '700', color: '#1E293B', boxSizing: 'border-box' }}
                  required
                />
                <span style={{ padding: '6px 8px', backgroundColor: '#F1F5F9', color: '#5D3B32', fontWeight: '800', fontSize: '0.78rem', borderLeft: '1px solid #CBD5E1', whiteSpace: 'nowrap', userSelect: 'none' }}>
                  {formData.unit}
                </span>
              </div>
            </div>

            {/* 3. Trọng số: chỉ nhập số, % cố định bên phải */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                3. Trọng số *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="20"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  style={{ width: '100%', padding: '6px 6px', border: 'none', fontSize: '0.8rem', outline: 'none', textAlign: 'right', fontWeight: '700', color: '#1E293B', boxSizing: 'border-box' }}
                  required
                />
                <span style={{ padding: '6px 8px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: '800', fontSize: '0.8rem', borderLeft: '1px solid #CBD5E1', userSelect: 'none' }}>
                  %
                </span>
              </div>
            </div>

          </div>

          {/* SECTION: ⚡ CAU HINH NGUON DU LIEU & CONG THUC DONG (15 TRUONG) */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚡ Cấu Hình Nguồn Dữ Liệu & Công Thức Động
            </div>

            {/* Row Nguồn dữ liệu & Phương pháp tính */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Nguồn dữ liệu (Data Source) *
                </label>
                <select
                  value={formData.data_source || 'inspection'}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_source: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: '700', color: '#0F172A', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="inspection">📋 Phiếu kiểm tra QC (input_inspections)</option>
                  <option value="capa">🔧 Phiếu CAPA khắc phục (capas)</option>
                  <option value="violation">⚠️ Biên bản vi phạm (award_disciplines)</option>
                  <option value="training">📚 Kế hoạch đào tạo (kpi_training_plans)</option>
                  <option value="claim">📑 Khiếu nại khách hàng (customer_claims)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Phương pháp tính (Calc Method) *
                </label>
                <select
                  value={formData.calc_method || 'avg_ticket_rate'}
                  onChange={(e) => setFormData(prev => ({ ...prev, calc_method: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: '700', color: '#0F172A', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="avg_ticket_rate">TB cộng % Đạt từng phiếu (Mẫu - Lỗi)</option>
                  <option value="completion_ratio">Tỷ lệ hoàn thành đúng hạn (%)</option>
                  <option value="count_penalty">Trừ % theo số lượt vi phạm (100% - N × phạt)</option>
                  <option value="attendance_days">Tỷ lệ ngày công làm việc (Ngày/Mẫu số)</option>
                  <option value="inverse_count">Trừ % theo số vụ claim (100% - N × phạt)</option>
                </select>
              </div>
            </div>

            {/* Row Điều kiện lọc bổ sung */}
            {formData.data_source === 'inspection' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                    Lọc theo Công đoạn (stage_filter)
                  </label>
                  <select
                    value={formData.stage_filter || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, stage_filter: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem', fontWeight: '700', outline: 'none', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">-- Tất cả công đoạn (Không lọc) --</option>
                    <optgroup label="🏭 Danh mục Công đoạn SX (Từ Cấu hình hệ thống)">
                      {dbStages.map((stg, idx) => (
                        <option key={stg.code || idx} value={stg.name || stg.code}>
                          {stg.code ? `[${stg.code}] ${stg.name}` : stg.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📦 Nhóm công đoạn phổ biến">
                      <option value="Nhập Kho/Đầu Vào,Nhập Kho,Đầu Vào,IQC">Nhập Kho / Đầu Vào (IQC / Vật tư)</option>
                      <option value="Tạo Phôi,Định Hình,Lắp Ráp,Sơn">Công đoạn Sản xuất (PQC)</option>
                      <option value="Đóng Gói,Final,Lưu Kho">Đóng Gói, Final & Lưu Kho</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                    Loại kiểm tra áp dụng (type_filter)
                  </label>
                  <select
                    value={formData.type_filter || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, type_filter: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem', fontWeight: '700', outline: 'none', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="">-- Tất cả các loại kiểm tra --</option>
                    <option value="first_sample">Mẫu đầu tiên (first_sample)</option>
                    <option value="patrol">Kiểm tra tuần tra (patrol)</option>
                    <option value="final">Final / OQC xuất hàng (final)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Row Cấu hình hệ số phạt & mẫu số & hành vi khi thiếu dữ liệu */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {(formData.calc_method === 'count_penalty' || formData.calc_method === 'inverse_count') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                    Hệ số phạt (%/lần)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.penalty_factor || '2.0'}
                    onChange={(e) => setFormData(prev => ({ ...prev, penalty_factor: e.target.value }))}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem', fontWeight: '700', outline: 'none' }}
                  />
                </div>
              )}

              {formData.calc_method === 'attendance_days' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                    Mẫu số ngày công (ngày)
                  </label>
                  <input
                    type="number"
                    value={formData.denominator || '26'}
                    onChange={(e) => setFormData(prev => ({ ...prev, denominator: e.target.value }))}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem', fontWeight: '700', outline: 'none' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Xử lý khi thiếu dữ liệu
                </label>
                <select
                  value={formData.no_data_behavior || 'full_score'}
                  onChange={(e) => setFormData(prev => ({ ...prev, no_data_behavior: e.target.value }))}
                  style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="full_score">Tính 100% Đạt (Mặc định)</option>
                  <option value="zero_score">Tính 0%</option>
                  <option value="no_data">Hiển thị "Chưa có dữ liệu"</option>
                  <option value="target_value">Gán bằng Ngưỡng đạt</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Trường khớp dữ liệu Nhân viên
                </label>
                <select
                  value={formData.employee_field || 'inspector_name'}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_field: e.target.value }))}
                  style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.75rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                  title="Chọn cột trong CSDL dùng để xác định dữ liệu của nhân viên được tính KPI"
                >
                  <option value="inspector_name">Tên QC Kiểm tra (inspector_name)</option>
                  <option value="employee_id">Mã nhân viên (employee_id)</option>
                  <option value="handler_name">Tên Người xử lý (handler_name)</option>
                  <option value="all">Tính chung toàn bộ nhân sự (all)</option>
                </select>
              </div>
            </div>

          </div>

          {/* Quick Preset Chips - Thân thiện với đơn vị tính đang chọn */}
          {currentPresets.length > 0 && (
            <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '8px 12px', border: '1px solid #EADCC9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#7B5233', fontWeight: '700', marginBottom: '4px' }}>
                <Sparkles size={12} /> Bấm chọn nhanh giá trị mẫu cho "{formData.unit}":
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
                        padding: '3px 9px',
                        fontSize: '0.72rem',
                        borderRadius: '5px',
                        border: '1px solid #EADCC9',
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

          {/* Mô tả */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Mô tả chi tiết / Phương pháp đo
            </label>
            <textarea
              rows={2}
              placeholder="VD: Đo lường tỷ lệ sản phẩm không bị trả lại tại công đoạn PQC..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '6px 16px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{ padding: '6px 20px', border: 'none', borderRadius: '6px', backgroundColor: '#5D3B32', color: '#FFFFFF', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Lưu chỉ số KPI
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default KPITargetFormModal;

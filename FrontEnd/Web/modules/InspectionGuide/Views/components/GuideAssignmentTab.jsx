import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, ShieldCheck, ChevronDown, Check, BarChart3, X, AlertTriangle } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

export const INSPECTION_TYPE_OPTIONS = [
  {
    value: 'first_sample',
    label: 'Kiểm tra mẫu lần đầu',
    desc: 'Phiếu kiểm tra sản phẩm mẫu đầu chuyền trước khi bắt đầu sản xuất',
    badge: 'Mẫu lần đầu',
    color: '#0284C7',
    bg: '#F0F9FF'
  },
  {
    value: 're_inspect',
    label: 'Kiểm tra lại',
    desc: 'Phiếu tái kiểm tra các lô sản phẩm đã qua khắc phục / xử lý lại',
    badge: 'Kiểm tra lại',
    color: '#D97706',
    bg: '#FFFBEB'
  },
  {
    value: 'parameter',
    label: 'Kiểm tra thông số',
    desc: 'Phiếu đo đạc và kiểm tra thông số kỹ thuật (độ ẩm, nhiệt độ...)',
    badge: 'Thông số',
    color: '#7C3AED',
    bg: '#F5F3FF'
  },
  {
    value: 'process',
    label: 'Kiểm tra quy trình',
    desc: 'Phiếu kiểm soát tuân thủ quy trình và thao tác công đoạn',
    badge: 'Quy trình',
    color: '#059669',
    bg: '#ECFDF5'
  },
  {
    value: 'qa',
    label: 'Vấn đáp',
    desc: 'Phiếu vấn đáp và đánh giá kiến thức nghiệp vụ QA/QC',
    badge: 'Vấn đáp',
    color: '#E11D48',
    bg: '#FFF1F2'
  },
  {
    value: 'input_inspection',
    label: 'Nhập kho nguyên liệu (IQC)',
    desc: 'Kiểm tra gỗ phôi, ván MDF, phụ kiện kim khí, vật tư đầu vào',
    badge: 'IQC Đầu vào',
    color: '#7B5233',
    bg: '#FAF6F0'
  },
  {
    value: 'packaging_inspection',
    label: 'Sau đóng gói (OQC)',
    desc: 'Kiểm tra bao bì đóng gói, tem nhãn thành phẩm trước khi xuất xưởng',
    badge: 'OQC Đóng gói',
    color: '#0891B2',
    bg: '#ECFEFF'
  }
];

export const NORMALIZE_MAP = {
  'dau-vao': 'input_inspection',
  'dau_vao': 'input_inspection',
  'sau-dong-goi': 'packaging_inspection',
  'sau_dong_goi': 'packaging_inspection',
  'mau-dau-tien': 'first_sample',
  'mau_dau_tien': 'first_sample',
  'quy-trinh': 'process',
  'quy_trinh': 'process',
  'do-am': 'parameter',
  'bam-dinh': 'parameter',
  'thong_so': 'parameter',
  'kiem_tra_lai': 're_inspect',
  're-inspect': 're_inspect',
  'van_dap': 'qa',
};

const GuideAssignmentTab = ({ guideId, initialAssignments = [], initialGuideParameters = [], onSaved, compact = false, themeColor = '#7B5233' }) => {
  const { toast } = useToast();
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Parameters state
  const [allParameters, setAllParameters] = useState([]);
  const [selectedParamIds, setSelectedParamIds] = useState(new Set());
  const [loadingParams, setLoadingParams] = useState(false);
  const [paramDropdownOpen, setParamDropdownOpen] = useState(false);
  const paramDropdownRef = useRef(null);

  // Stage state
  const [stages, setStages] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState(null);

  // Conflict state (Ràng buộc 1 HDKT per cặp Loại phiếu & Công đoạn)
  const [conflicts, setConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Check assignment conflicts whenever selectedTypes or selectedStageId changes
  useEffect(() => {
    if (!guideId || selectedTypes.size === 0) {
      setConflicts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingConflicts(true);
      try {
        const payload = {
          assignments: Array.from(selectedTypes).map(type => ({
            inspection_type: type,
            product_id: null,
            category_id: null,
            stage_id: selectedStageId || null,
            is_active: true
          }))
        };
        const res = await api.post(`/inspection-guides/${guideId}/check-conflicts`, payload);
        if (res && res.has_conflict) {
          setConflicts(res.conflicts || []);
        } else {
          setConflicts([]);
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra xung đột phân công:', err);
      } finally {
        setCheckingConflicts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [guideId, selectedTypes, selectedStageId]);

  // Initialize from props
  useEffect(() => {
    const types = new Set();
    (initialAssignments || []).forEach(a => {
      const normalized = NORMALIZE_MAP[a.inspection_type] || a.inspection_type;
      if (normalized) types.add(normalized);
    });
    setSelectedTypes(types);
    // Extract stage_id from first assignment (shared across all types)
    const firstWithStage = (initialAssignments || []).find(a => a.stage_id);
    if (firstWithStage) setSelectedStageId(firstWithStage.stage_id);
  }, [initialAssignments]);

  // Initialize guide parameters from props
  useEffect(() => {
    const ids = new Set();
    (initialGuideParameters || []).forEach(gp => {
      if (gp.parameter_id) ids.add(gp.parameter_id);
    });
    setSelectedParamIds(ids);
  }, [initialGuideParameters]);

  // Load parameters from API
  useEffect(() => {
    const fetchParams = async () => {
      setLoadingParams(true);
      try {
        const res = await api.get('/inspection-parameters');
        setAllParameters(Array.isArray(res) ? res : []);
      } catch (err) {
        console.warn('Lỗi tải danh sách thông số:', err);
      } finally {
        setLoadingParams(false);
      }
    };
    fetchParams();
  }, []);

  const [typeOptions, setTypeOptions] = useState(INSPECTION_TYPE_OPTIONS);

  // Load customizable inspection form types from API
  useEffect(() => {
    const fetchFormTypes = async () => {
      try {
        const res = await api.get('/inspection-form-types');
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) {
          setTypeOptions(list.map(t => ({
            value: t.code,
            label: t.name,
            desc: t.description || '',
            badge: t.short_name || t.name,
            color: t.color || '#0284C7',
            bg: t.bg_color || '#F0F9FF'
          })));
        }
      } catch (err) {
        console.warn('Lỗi tải danh mục loại phiếu kiểm tra:', err);
      }
    };
    fetchFormTypes();
  }, []);

  // Load stages from API
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await api.get('/stages/').catch(() => api.get('/stages'));
        setStages(Array.isArray(res) ? res : (res?.items || []));
      } catch (err) {
        console.warn('Lỗi tải danh sách công đoạn:', err);
      }
    };
    fetchStages();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (paramDropdownRef.current && !paramDropdownRef.current.contains(e.target)) {
        setParamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasParameterType = selectedTypes.has('parameter');

  const toggleType = (value) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const toggleParam = (paramId) => {
    setSelectedParamIds(prev => {
      const next = new Set(prev);
      if (next.has(paramId)) {
        next.delete(paramId);
      } else {
        next.add(paramId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedTypes.size === 0) {
      if (toast) toast('warning', 'Vui lòng chọn ít nhất 1 loại phiếu kiểm tra.');
      return;
    }
    if (conflicts.length > 0) {
      if (toast) toast('error', conflicts[0].message);
      return;
    }
    setSaving(true);
    try {
      // Save assignments
      const assignPayload = {
        assignments: Array.from(selectedTypes).map(type => ({
          inspection_type: type,
          product_id: null,
          category_id: null,
          stage_id: selectedStageId || null,
          is_active: true
        }))
      };
      await api.post(`/inspection-guides/${guideId}/assign`, assignPayload);

      // Save parameters if "parameter" type is selected
      if (hasParameterType) {
        await api.post(`/inspection-guides/${guideId}/parameters`, {
          parameter_ids: Array.from(selectedParamIds)
        });
      } else {
        // Clear parameters if parameter type is removed
        await api.post(`/inspection-guides/${guideId}/parameters`, {
          parameter_ids: []
        });
      }

      if (toast) toast('success', 'Đã lưu cấu hình liên kết thành công!');
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Lỗi lưu cấu hình:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  // Selected type options for badges
  const selectedTypeOptions = useMemo(() => {
    return typeOptions.filter(opt => selectedTypes.has(opt.value));
  }, [selectedTypes, typeOptions]);

  // ===== COMPACT MODE (inline in header) =====
  if (compact) {
    const isAllParamsSelected = allParameters.length > 0 && allParameters.every(p => selectedParamIds.has(p.id));

    return (
      <div>
        {/* Row: ComboBox Loại phiếu + Công đoạn + (nếu có Thông số: ComboBox Thông số) + Nút Lưu */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasParameterType ? '1.2fr 1fr 1.3fr auto' : '1.2fr 1fr auto',
          gap: 12,
          alignItems: 'end'
        }}>
          {/* 1. ComboBox Loại phiếu */}
          <div>
            <label style={{
              display: 'block', fontSize: 11.5, fontWeight: 700,
              color: themeColor, textTransform: 'uppercase', marginBottom: 6
            }}>
              Loại phiếu kiểm tra áp dụng *
            </label>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: dropdownOpen ? `1.5px solid ${themeColor}` : '1px solid #D1D5DB',
                  backgroundColor: '#FAF8F6',
                  cursor: 'pointer',
                  height: 42,
                  boxSizing: 'border-box'
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: selectedTypes.size > 0 ? '#2D1A12' : '#9CA3AF',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {selectedTypes.size > 0
                    ? `Đã chọn ${selectedTypes.size} loại phiếu`
                    : 'Chọn loại phiếu...'
                  }
                </span>
                <ChevronDown size={16} color={themeColor} style={{
                  flexShrink: 0, marginLeft: 6,
                  transition: 'transform 0.2s',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }} />
              </div>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  backgroundColor: '#FFF',
                  borderRadius: 12,
                  border: '1.5px solid #EADCC9',
                  boxShadow: '0 12px 32px rgba(123, 82, 51, 0.15)',
                  zIndex: 50,
                  overflow: 'hidden'
                }}>
                  {typeOptions.map(opt => {
                    const isSelected = selectedTypes.has(opt.value);
                    return (
                      <div
                        key={opt.value}
                        onClick={() => toggleType(opt.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 14px', cursor: 'pointer',
                          backgroundColor: isSelected ? opt.bg : 'transparent',
                          borderBottom: '1px solid #F8F4F0',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? opt.bg : 'transparent'; }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: isSelected ? `2px solid ${opt.color}` : '2px solid #CBD5E1',
                          backgroundColor: isSelected ? opt.color : '#FFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isSelected && <Check size={11} color="#FFF" strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#2D1A12' }}>{opt.label}</div>
                        </div>
                        <span style={{
                          padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          backgroundColor: isSelected ? opt.color : '#E2E8F0',
                          color: isSelected ? '#FFF' : '#64748B'
                        }}>
                          {opt.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. Công đoạn */}
          <div>
            <label style={{
              display: 'block', fontSize: 11.5, fontWeight: 700,
              color: '#64748B', textTransform: 'uppercase', marginBottom: 6
            }}>
              Công đoạn áp dụng
            </label>
            <select
              value={selectedStageId || ''}
              onChange={e => setSelectedStageId(e.target.value ? Number(e.target.value) : null)}
              style={{
                width: '100%',
                height: 42,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                backgroundColor: '#FAF8F6',
                fontSize: 13,
                fontWeight: 600,
                color: '#2D1A12',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              <option value="">Tất cả công đoạn</option>
              {stages.map(stg => (
                <option key={stg.id} value={stg.id}>
                  {stg.name || stg.stage_name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. ComboBox Thông số đo áp dụng (chỉ hiển thị khi chọn loại Kiểm tra thông số) */}
          {hasParameterType && (
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 11.5, fontWeight: 700,
                color: '#7C3AED', textTransform: 'uppercase', marginBottom: 6
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BarChart3 size={13} /> Thông số đo áp dụng
                </span>
                {allParameters.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: '#7C3AED', backgroundColor: '#F5F3FF',
                    padding: '1px 6px', borderRadius: 10,
                    border: '1px solid #DDD6FE', textTransform: 'none'
                  }}>
                    {selectedParamIds.size === 0
                      ? 'Chưa chọn'
                      : isAllParamsSelected
                        ? 'Tất cả'
                        : `${selectedParamIds.size}/${allParameters.length}`}
                  </span>
                )}
              </label>

              <div ref={paramDropdownRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setParamDropdownOpen(!paramDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: paramDropdownOpen ? '1.5px solid #7C3AED' : '1px solid #D1D5DB',
                    backgroundColor: '#FAF8F6',
                    cursor: 'pointer',
                    height: 42,
                    boxSizing: 'border-box',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: selectedParamIds.size > 0 ? '#5B21B6' : '#9CA3AF',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {loadingParams
                      ? 'Đang tải thông số...'
                      : selectedParamIds.size === 0
                        ? 'Chọn thông số đo...'
                        : isAllParamsSelected
                          ? `Tất cả thông số (${allParameters.length})`
                          : `Đã chọn ${selectedParamIds.size} thông số`}
                  </span>
                  <ChevronDown size={16} color="#7C3AED" style={{
                    flexShrink: 0, marginLeft: 6,
                    transition: 'transform 0.2s',
                    transform: paramDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                  }} />
                </div>

                {paramDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    minWidth: 280,
                    marginTop: 4,
                    backgroundColor: '#FFF',
                    borderRadius: 12,
                    border: '1.5px solid #DDD6FE',
                    boxShadow: '0 12px 32px rgba(124, 58, 237, 0.15)',
                    zIndex: 60,
                    overflow: 'hidden'
                  }}>
                    {/* Header: Select All / Deselect All */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', backgroundColor: '#FAF5FF',
                      borderBottom: '1px solid #EDE9FE', fontSize: 11.5, fontWeight: 700
                    }}>
                      <span style={{ color: '#6B21A8' }}>
                        Thông số ({allParameters.length})
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allIds = allParameters.map(p => p.id);
                          setSelectedParamIds(isAllParamsSelected ? new Set() : new Set(allIds));
                        }}
                        style={{
                          background: 'none', border: 'none',
                          color: '#7C3AED', cursor: 'pointer',
                          fontSize: 11, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 4,
                          backgroundColor: '#EDE9FE'
                        }}
                      >
                        {isAllParamsSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                      </button>
                    </div>

                    {/* Param List */}
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {allParameters.length === 0 ? (
                        <div style={{ padding: 14, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                          Chưa có thông số nào
                        </div>
                      ) : (
                        allParameters.map(param => {
                          const isChecked = selectedParamIds.has(param.id);
                          return (
                            <div
                              key={param.id}
                              onClick={() => toggleParam(param.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 12px', cursor: 'pointer',
                                backgroundColor: isChecked ? '#F5F3FF' : 'transparent',
                                borderBottom: '1px solid #FAF5FF',
                                transition: 'background-color 0.15s'
                              }}
                              onMouseEnter={e => { if (!isChecked) e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
                              onMouseLeave={e => { if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <div style={{
                                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                border: isChecked ? '2px solid #7C3AED' : '2px solid #CBD5E1',
                                backgroundColor: isChecked ? '#7C3AED' : '#FFF',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {isChecked && <Check size={11} color="#FFF" strokeWidth={3} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 12.5, fontWeight: isChecked ? 700 : 600,
                                  color: isChecked ? '#5B21B6' : '#2D1A12',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                  {param.name}
                                </div>
                                <div style={{ fontSize: 10.5, color: '#94A3B8' }}>{param.code}</div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                {param.unit && (
                                  <span style={{
                                    fontSize: 10.5, fontWeight: 700,
                                    color: '#7C3AED', backgroundColor: '#EDE9FE',
                                    padding: '1px 5px', borderRadius: 4
                                  }}>
                                    {param.unit}
                                  </span>
                                )}
                                {(param.default_min != null || param.default_max != null) && (
                                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                                    {param.default_min ?? '—'} ~ {param.default_max ?? '—'}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Nút Lưu */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || conflicts.length > 0}
            title={conflicts.length > 0 ? conflicts[0].message : ''}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: conflicts.length > 0 ? '#9CA3AF' : themeColor,
              color: '#FFF',
              fontWeight: 700,
              fontSize: 13,
              cursor: (saving || conflicts.length > 0) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 42,
              opacity: saving ? 0.7 : 1,
              boxShadow: conflicts.length > 0 ? 'none' : `0 2px 6px ${themeColor}30`,
              whiteSpace: 'nowrap'
            }}
          >
            <Save size={15} /> {saving ? 'Lưu...' : 'Lưu liên kết'}
          </button>
        </div>

        {/* Warning banner if conflict detected */}
        {conflicts.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 8,
            backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
            color: '#991B1B', fontSize: 12, fontWeight: 600,
            marginTop: 10
          }}>
            <AlertTriangle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
            <span>{conflicts[0].message}</span>
          </div>
        )}

        {/* Selected Badges (Loại phiếu + Thông số đo) */}
        {(selectedTypeOptions.length > 0 || (hasParameterType && selectedParamIds.size > 0)) && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10
          }}>
            {/* Loại phiếu badges */}
            {selectedTypeOptions.map(opt => (
              <span
                key={opt.value}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px',
                  borderRadius: 5,
                  fontSize: 11.5, fontWeight: 700,
                  backgroundColor: opt.bg,
                  color: opt.color,
                  border: `1px solid ${opt.color}25`
                }}
              >
                {opt.badge}
                <X size={12} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => toggleType(opt.value)} />
              </span>
            ))}

            {/* Separator if both exist */}
            {selectedTypeOptions.length > 0 && hasParameterType && selectedParamIds.size > 0 && (
              <span style={{ width: 1, height: 16, backgroundColor: '#CBD5E1', margin: '0 4px' }} />
            )}

            {/* Parameter badges */}
            {hasParameterType && allParameters.filter(p => selectedParamIds.has(p.id)).map(p => (
              <span
                key={p.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px',
                  borderRadius: 5,
                  fontSize: 11, fontWeight: 700,
                  backgroundColor: '#F5F3FF',
                  color: '#6D28D9',
                  border: '1px solid #DDD6FE'
                }}
              >
                <BarChart3 size={10} color="#7C3AED" />
                {p.name} {p.unit ? `(${p.unit})` : ''}
                <X
                  size={12}
                  style={{ cursor: 'pointer', opacity: 0.6 }}
                  onClick={() => toggleParam(p.id)}
                />
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== FULL MODE (standalone card) =====
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      border: '1px solid #EADCC9',
      padding: 24,
      boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid #F1F5F9'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#2D1A12', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#7B5233" /> Cấu hình Liên kết Loại phiếu Kiểm tra
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: 13.5 }}>
            Chỉ định hướng dẫn này sẽ tự động xuất hiện khi công nhân/QC mở loại phiếu kiểm tra nào trên xưởng.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || conflicts.length > 0}
          title={conflicts.length > 0 ? conflicts[0].message : ''}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: conflicts.length > 0 ? '#9CA3AF' : '#7B5233',
            color: '#FFF',
            fontWeight: 700,
            fontSize: 13,
            cursor: (saving || conflicts.length > 0) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: saving ? 0.7 : 1,
            boxShadow: conflicts.length > 0 ? 'none' : '0 2px 6px rgba(123, 82, 51, 0.2)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>

      {/* Warning banner if conflict detected in Full Mode */}
      {conflicts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 8,
          backgroundColor: '#FEF2F2', border: '1.5px solid #FCA5A5',
          color: '#991B1B', fontSize: 13, fontWeight: 600,
          marginBottom: 18, maxWidth: 640
        }}>
          <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
          <span>{conflicts[0].message}</span>
        </div>
      )}

      {/* ComboBox Multi-select */}
      <div style={{ marginBottom: hasParameterType ? 0 : 0 }}>
        <label style={{
          display: 'block', fontSize: 11.5, fontWeight: 700,
          color: '#7B5233', textTransform: 'uppercase', marginBottom: 8
        }}>
          Loại phiếu kiểm tra áp dụng *
        </label>

        <div ref={dropdownRef} style={{ position: 'relative', maxWidth: 520 }}>
          {/* Trigger */}
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 10,
              border: dropdownOpen ? '1.5px solid #7B5233' : '1.5px solid #D1D5DB',
              backgroundColor: dropdownOpen ? '#FFF' : '#FAF8F6',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: 42,
              boxSizing: 'border-box'
            }}
          >
            <span style={{
              fontSize: 13.5, fontWeight: 600,
              color: selectedTypes.size > 0 ? '#2D1A12' : '#9CA3AF'
            }}>
              {selectedTypes.size > 0
                ? `Đã chọn ${selectedTypes.size} loại phiếu`
                : 'Chọn loại phiếu kiểm tra...'
              }
            </span>
            <ChevronDown size={18} color="#7B5233" style={{
              transition: 'transform 0.2s',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }} />
          </div>

          {/* Dropdown Panel */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: '#FFF',
              borderRadius: 12,
              border: '1.5px solid #EADCC9',
              boxShadow: '0 12px 32px rgba(123, 82, 51, 0.15)',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              {typeOptions.map(opt => {
                const isSelected = selectedTypes.has(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleType(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? opt.bg : 'transparent',
                      borderBottom: '1px solid #F8F4F0',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: isSelected ? `2px solid ${opt.color}` : '2px solid #CBD5E1',
                      backgroundColor: isSelected ? opt.color : '#FFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}>
                      {isSelected && <Check size={13} color="#FFF" strokeWidth={3} />}
                    </div>
                    {/* Label */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#2D1A12' }}>{opt.label}</div>
                      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>{opt.desc}</div>
                    </div>
                    {/* Badge */}
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                      backgroundColor: isSelected ? opt.color : '#E2E8F0',
                      color: isSelected ? '#FFF' : '#64748B',
                      flexShrink: 0
                    }}>
                      {opt.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected badges */}
        {selectedTypeOptions.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12
          }}>
            {selectedTypeOptions.map(opt => (
              <span
                key={opt.value}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px 4px 10px',
                  borderRadius: 6,
                  fontSize: 12, fontWeight: 700,
                  backgroundColor: opt.bg,
                  color: opt.color,
                  border: `1px solid ${opt.color}25`
                }}
              >
                {opt.badge}
                <X
                  size={13}
                  style={{ cursor: 'pointer', opacity: 0.6 }}
                  onClick={() => toggleType(opt.value)}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Công đoạn áp dụng */}
      <div style={{ marginTop: 18 }}>
        <label style={{
          display: 'block', fontSize: 11.5, fontWeight: 700,
          color: '#64748B', textTransform: 'uppercase', marginBottom: 8
        }}>
          Công đoạn áp dụng
        </label>
        <select
          value={selectedStageId || ''}
          onChange={e => setSelectedStageId(e.target.value ? Number(e.target.value) : null)}
          style={{
            width: '100%',
            maxWidth: 520,
            height: 42,
            padding: '8px 14px',
            borderRadius: 10,
            border: '1.5px solid #D1D5DB',
            backgroundColor: '#FAF8F6',
            fontSize: 13.5,
            fontWeight: 600,
            color: '#2D1A12',
            boxSizing: 'border-box',
            cursor: 'pointer'
          }}
        >
          <option value="">Tất cả công đoạn</option>
          {stages.map(stg => (
            <option key={stg.id} value={stg.id}>
              {stg.name || stg.stage_name}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>
          Chọn công đoạn cụ thể hoặc để "Tất cả" nếu áp dụng cho mọi công đoạn.
        </div>
      </div>

      {/* Parameter Selection ComboBox — only visible when "parameter" type is selected */}
      {hasParameterType && (
        <div style={{ marginTop: 18 }}>
          <label style={{
            display: 'block', fontSize: 11.5, fontWeight: 700,
            color: '#7C3AED', textTransform: 'uppercase', marginBottom: 8
          }}>
            <BarChart3 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Thông số đo áp dụng
          </label>

          <div ref={paramDropdownRef} style={{ position: 'relative', maxWidth: 520 }}>
            {/* Trigger */}
            <div
              onClick={() => setParamDropdownOpen(!paramDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 10,
                border: paramDropdownOpen ? '1.5px solid #7C3AED' : '1.5px solid #D1D5DB',
                backgroundColor: paramDropdownOpen ? '#FFF' : '#FAF8F6',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: 42,
                boxSizing: 'border-box'
              }}
            >
              <span style={{
                fontSize: 13.5, fontWeight: 600,
                color: selectedParamIds.size > 0 ? '#5B21B6' : '#9CA3AF'
              }}>
                {loadingParams
                  ? 'Đang tải thông số...'
                  : selectedParamIds.size === 0
                    ? 'Chọn thông số đo...'
                    : selectedParamIds.size === allParameters.length
                      ? `Tất cả thông số (${allParameters.length})`
                      : `Đã chọn ${selectedParamIds.size} thông số`}
              </span>
              <ChevronDown size={18} color="#7C3AED" style={{
                transition: 'transform 0.2s',
                transform: paramDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }} />
            </div>

            {/* Dropdown Panel */}
            {paramDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                backgroundColor: '#FFF',
                borderRadius: 12,
                border: '1.5px solid #DDD6FE',
                boxShadow: '0 12px 32px rgba(124, 58, 237, 0.15)',
                zIndex: 50,
                overflow: 'hidden'
              }}>
                {/* Header: Select All / Deselect All */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', backgroundColor: '#FAF5FF',
                  borderBottom: '1px solid #EDE9FE', fontSize: 12, fontWeight: 700
                }}>
                  <span style={{ color: '#6B21A8' }}>
                    Danh sách thông số ({allParameters.length})
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const allIds = allParameters.map(p => p.id);
                      const isAll = allIds.every(id => selectedParamIds.has(id));
                      setSelectedParamIds(isAll ? new Set() : new Set(allIds));
                    }}
                    style={{
                      background: 'none', border: 'none',
                      color: '#7C3AED', cursor: 'pointer',
                      fontSize: 11.5, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 4,
                      backgroundColor: '#EDE9FE'
                    }}
                  >
                    {allParameters.length > 0 && allParameters.every(p => selectedParamIds.has(p.id)) ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                  </button>
                </div>

                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {allParameters.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                      Chưa có thông số nào trong hệ thống.
                    </div>
                  ) : (
                    allParameters.map(param => {
                      const isChecked = selectedParamIds.has(param.id);
                      return (
                        <div
                          key={param.id}
                          onClick={() => toggleParam(param.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', cursor: 'pointer',
                            backgroundColor: isChecked ? '#F5F3FF' : 'transparent',
                            borderBottom: '1px solid #FAF5FF',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={e => { if (!isChecked) e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
                          onMouseLeave={e => { if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div style={{
                            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                            border: isChecked ? '2px solid #7C3AED' : '2px solid #CBD5E1',
                            backgroundColor: isChecked ? '#7C3AED' : '#FFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isChecked && <Check size={13} color="#FFF" strokeWidth={3} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: isChecked ? 700 : 600, color: isChecked ? '#5B21B6' : '#2D1A12' }}>{param.name}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{param.code}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {param.unit && (
                              <span style={{
                                padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                backgroundColor: '#EDE9FE', color: '#7C3AED'
                              }}>
                                {param.unit}
                              </span>
                            )}
                            {(param.default_min != null || param.default_max != null) && (
                              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                                {param.default_min ?? '—'} ~ {param.default_max ?? '—'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected parameter badges */}
          {hasParameterType && selectedParamIds.size > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {allParameters.filter(p => selectedParamIds.has(p.id)).map(p => (
                <span
                  key={p.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 9px', borderRadius: 6,
                    fontSize: 11.5, fontWeight: 700,
                    backgroundColor: '#F5F3FF', color: '#6D28D9',
                    border: '1px solid #DDD6FE'
                  }}
                >
                  <BarChart3 size={11} color="#7C3AED" />
                  {p.name} {p.unit ? `(${p.unit})` : ''}
                  <X
                    size={12}
                    style={{ cursor: 'pointer', opacity: 0.6 }}
                    onClick={() => toggleParam(p.id)}
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GuideAssignmentTab;

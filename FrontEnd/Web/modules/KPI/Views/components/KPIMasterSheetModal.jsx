import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X, Save, RotateCcw, FileSpreadsheet, Search, RefreshCw, CheckCircle2,
  AlertCircle, Edit3, Filter
} from 'lucide-react';
import apiClient from '@shared/services/api';

/**
 * Chuyển chuỗi phần trăm hoặc số về tỷ lệ thập phân chuẩn Excel (ví dụ "95.0%" -> 0.95, "95" -> 0.95, "0.0%" -> 0.0)
 */
const parsePercentToRatio = (rawVal, operator = '>') => {
  const isLess = String(operator || '').includes('<');
  if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
    return isLess ? 0.0 : 1.0;
  }
  if (typeof rawVal === 'number') {
    if (rawVal === 0) return 0.0;
    if (Math.abs(rawVal) <= 0.015) return rawVal;
    return rawVal / 100.0;
  }
  const s = String(rawVal).trim().replace(',', '.');
  if (!s || s.toLowerCase().includes('chưa')) {
    return isLess ? 0.0 : 1.0;
  }
  const matches = s.match(/-?\d+(?:\.\d+)?/g);
  if (matches && matches.length > 0) {
    const val = parseFloat(matches[matches.length - 1]);
    if (isNaN(val)) return isLess ? 0.0 : 1.0;
    if (val === 0) return 0.0;
    if (Math.abs(val) <= 0.015 && !s.includes('%')) return val;
    return val / 100.0;
  }
  return isLess ? 0.0 : 1.0;
};

/**
 * Định dạng tỷ lệ thập phân sang hiển thị % giống Excel ("95.0%", "0.0%", "0.5%", "0.28%")
 */
const formatRatioDisplay = (ratio) => {
  const num = Number(ratio || 0);
  if (num === 0) return '0.0%';
  const pct = num * 100.0;
  if (Math.abs(pct - Number(pct.toFixed(1))) > 1e-4) {
    return `${pct.toFixed(2).replace(/\.?0+$/, '')}%`;
  }
  return `${pct.toFixed(1)}%`;
};

/**
 * Bóc số thuần từ chuỗi hiển thị % để khi user click vào ô sẽ sửa số cực nhanh ("95.0%" -> "95", "0.5%" -> "0.5")
 */
const stripPercentForEdit = (displayStr) => {
  if (displayStr === null || displayStr === undefined) return '';
  const s = String(displayStr).replace('%', '').trim();
  const num = parseFloat(s);
  if (isNaN(num)) return s;
  return String(num);
};

/**
 * Công thức tính toán chuẩn 100% theo công thức Excel của Sheet "Bảng đánh giá KPI nhân viên CL"
 */
const computeRowFormula = (ptsInput, operatorInput, targetInput, actualInput) => {
  const parsedPts = parseFloat(String(ptsInput ?? '').replace(',', '.'));
  const pts = isNaN(parsedPts) ? 0 : Math.max(0, parsedPts);
  const weight = Number((pts / 100.0).toFixed(2));
  const op = String(operatorInput || '>=').trim();
  const kRatio = parsePercentToRatio(targetInput, op);
  const lRatio = parsePercentToRatio(actualInput, op);

  let mRatio = 1.0;
  if (op.includes('<')) {
    if (lRatio <= 0) {
      mRatio = 1.0;
    } else {
      mRatio = kRatio > 0 ? Math.min(2.0, kRatio / lRatio) : 1.0;
    }
  } else {
    mRatio = kRatio > 0 ? lRatio / kRatio : 1.0;
  }

  const completionRate = Number((mRatio * 100.0).toFixed(1));
  const pointScore = Number(((pts / 100.0) * mRatio * 100.0).toFixed(2));

  let resultLabel = 'Không đạt';
  if (pointScore >= pts * 1.04 - 1e-6) {
    resultLabel = 'Vượt';
  } else if (pointScore >= pts * 0.95 - 1e-6) {
    resultLabel = 'Đạt';
  }

  return {
    pts,
    weight,
    operator: op,
    target_num: kRatio,
    actual_num: lRatio,
    completion_rate: completionRate,
    point_score: pointScore,
    result_label: resultLabel
  };
};

/**
 * Component Input duy nhất chỉ mount tại đúng 1 ô đang được click (Single Active Cell).
 * Giữ state gõ phím cục bộ để không gây re-render toàn bảng, và dùng focus({ preventScroll: true })
 * chống nhảy thanh cuộn 100%.
 */
const ActiveCellEditor = ({
  initialValue,
  align = 'right',
  bold = false,
  color = '#111827',
  multiline = false,
  minHeight = '76px',
  onCommit,
  onCancel
}) => {
  const [val, setVal] = useState(String(initialValue ?? ''));
  const inputRef = useRef(null);
  const committedRef = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      try {
        el.focus({ preventScroll: true });
        if (!multiline && typeof el.select === 'function') {
          el.select();
        } else if (multiline && typeof el.setSelectionRange === 'function') {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      } catch (_) {
        el.focus();
      }
    }
  }, [multiline]);

  const commitNow = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(val);
  };

  if (multiline) {
    return (
      <textarea
        ref={inputRef}
        rows={4}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commitNow}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commitNow();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            committedRef.current = true;
            onCancel();
          }
        }}
        placeholder="Nhập nội dung (Shift+Enter để xuống dòng, Enter để hoàn tất)..."
        style={{
          width: '100%',
          minHeight: minHeight || '76px',
          height: '100%',
          padding: '5px 7px',
          border: '2px solid #D97706',
          borderRadius: '4px',
          backgroundColor: '#FFFFFF',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '0.86rem',
          fontWeight: bold ? '700' : '400',
          textAlign: align,
          color,
          lineHeight: '1.4',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
          boxShadow: '0 0 0 2px rgba(217, 119, 6, 0.2)'
        }}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commitNow}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitNow();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          committedRef.current = true;
          onCancel();
        }
      }}
      style={{
        width: '100%',
        height: '26px',
        padding: '2px 6px',
        border: '2px solid #D97706',
        borderRadius: '4px',
        backgroundColor: '#FFFFFF',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '0.88rem',
        fontWeight: bold ? '700' : '500',
        textAlign: align,
        color,
        outline: 'none',
        boxSizing: 'border-box',
        boxShadow: '0 0 0 2px rgba(217, 119, 6, 0.2)'
      }}
    />
  );
};

const tdBaseStyle = {
  fontFamily: '"Times New Roman", Times, serif',
  fontSize: '0.88rem',
  borderRight: '1px solid #9CA3AF',
  borderBottom: '1px solid #9CA3AF',
  padding: '4px 6px',
  verticalAlign: 'middle',
  color: '#111827',
  boxSizing: 'border-box',
  height: '32px'
};

const staticCellBoxStyle = {
  width: '100%',
  minHeight: '24px',
  padding: '2px 5px',
  border: '1px dashed rgba(123, 82, 51, 0.28)',
  borderRadius: '4px',
  backgroundColor: 'rgba(255, 255, 255, 0.65)',
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  userSelect: 'none'
};

/**
 * Component con render cụm dòng KPI của 1 nhân sự, được bọc React.memo
 * để khi sửa 1 nhân sự thì 28 nhân sự còn lại KHÔNG bị re-render (0ms lag).
 */
const EmployeeKPIGroup = React.memo(
  ({
    emp,
    empIdx,
    showFeedbackCols,
    activeCellForEmp,
    onActivateCell,
    onCommitCell,
    onCancelCell,
    onRequestResetRow
  }) => {
    const kpis = Array.isArray(emp.kpis) && emp.kpis.length > 0 ? emp.kpis : [];
    const rowSpanCount = kpis.length;
    const isExceed105 = Number(emp.total_score || 0) > 105.0;
    // Chỉ những người nào vượt 105% mới có màu xanh, còn lại toàn bộ nền màu trắng
    const rowBg = isExceed105
      ? (empIdx % 2 === 0 ? '#D1FAE5' : '#C6F6D5')
      : '#FFFFFF';

    const mergedBoxMinHeight = `${Math.max(72, rowSpanCount * 32 - 12)}px`;

    const renderCellContent = (kIdx, field, displayStr, rawEditVal, options = {}) => {
      const { align = 'right', bold = false, color = '#111827', placeholder = '', multiline = false } = options;
      const isEditing =
        activeCellForEmp &&
        activeCellForEmp.kIdx === kIdx &&
        activeCellForEmp.field === field;

      if (isEditing) {
        return (
          <ActiveCellEditor
            initialValue={rawEditVal}
            align={align}
            bold={bold}
            color={color}
            multiline={multiline}
            minHeight={multiline ? mergedBoxMinHeight : undefined}
            onCommit={(newVal) => onCommitCell(emp.employee_id, kIdx, field, newVal)}
            onCancel={onCancelCell}
          />
        );
      }

      const isEmpty = displayStr === null || displayStr === undefined || String(displayStr) === '';
      return (
        <div
          onClick={() => onActivateCell(emp.employee_id, kIdx, field)}
          title="Nhấp chuột để sửa trực tiếp"
          style={{
            ...staticCellBoxStyle,
            minHeight: multiline ? mergedBoxMinHeight : '24px',
            height: multiline ? '100%' : undefined,
            alignItems: multiline ? 'flex-start' : 'center',
            padding: multiline ? '6px 8px' : '2px 5px',
            justifyContent:
              align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
            fontWeight: bold ? '700' : '400',
            color: isEmpty ? '#9CA3AF' : color
          }}
        >
          <span
            style={
              multiline
                ? {
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: '1.42',
                  width: '100%',
                  textAlign: 'left'
                }
                : {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
            }
          >
            {isEmpty ? placeholder : displayStr}
          </span>
        </div>
      );
    };

    return (
      <>
        {kpis.map((kpi, kIdx) => {
          const isDirty = Boolean(kpi.is_dirty);
          const isCustom = Boolean(kpi.is_custom || isDirty);

          const labelTrimmed = String(kpi.result_label || '').trim();
          let resColor = '#000000'; // Chữ Đạt luôn là màu đen theo yêu cầu
          let resBg = 'transparent';
          if (labelTrimmed === 'Vượt') {
            resColor = '#047857';
            resBg = '#ECFDF5';
          } else if (labelTrimmed === 'Không đạt') {
            resColor = '#DC2626';
            resBg = '#FEF2F2';
          } else {
            // Mặc định và "Đạt": Chữ màu đen #000000
            resColor = '#000000';
            resBg = 'transparent';
          }

          const editableCellBg = isDirty
            ? '#FEF3C7'
            : isCustom
              ? '#FFFBEB'
              : isExceed105
                ? (empIdx % 2 === 0 ? '#C6F6D5' : '#B8F0CB')
                : '#FFFFFF';

          return (
            <tr key={`${emp.employee_id}_row_${kIdx}`} style={{ backgroundColor: rowBg }}>
              {kIdx === 0 && (
                <>
                  {/* Col A: STT */}
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      borderLeft: '1px solid #9CA3AF',
                      textAlign: 'center',
                      fontWeight: '700',
                      backgroundColor: rowBg
                    }}
                  >
                    {emp.stt}
                  </td>

                  {/* Col C: Họ và Tên */}
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      textAlign: 'left',
                      fontWeight: '700',
                      backgroundColor: rowBg
                    }}
                  >
                    <div>{emp.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: '400' }}>
                      #{emp.employee_id}
                    </div>
                  </td>

                  {/* Col D: Nhóm */}
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      textAlign: 'center',
                      backgroundColor: rowBg
                    }}
                  >
                    {emp.group_name}
                  </td>

                  {/* Col E: Phân tổ / Vị trí */}
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      textAlign: 'center',
                      backgroundColor: rowBg
                    }}
                  >
                    {emp.stage_desc}
                  </td>
                </>
              )}

              {/* Col F: Mã KPI + nút khôi phục nhanh nếu dòng đã custom */}
              <td
                style={{
                  ...tdBaseStyle,
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#4B5563',
                  backgroundColor: isCustom ? '#FFFBEB' : isExceed105 ? rowBg : '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span>{kpi.kpi_code}</span>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() =>
                        onRequestResetRow({
                          type: 'ROW',
                          empId: emp.employee_id,
                          kpiCode: kpi.kpi_code,
                          content: kpi.content
                        })
                      }
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#D97706',
                        cursor: 'pointer',
                        padding: '0 2px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="Đang dùng giá trị điều chỉnh trong Bảng tạm. Nhấn để khôi phục dòng này về tự động."
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </td>

              {/* Col G: Chỉ số đánh giá */}
              <td style={{ ...tdBaseStyle, backgroundColor: editableCellBg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: '700', color: '#4B5563', flexShrink: 0 }}>
                    {kpi.index_no}.
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {renderCellContent(kIdx, 'content', kpi.content || '', kpi.content || '', {
                      align: 'left',
                      bold: false
                    })}
                  </div>
                </div>
              </td>

              {/* Col H: Trọng số */}
              <td style={{ ...tdBaseStyle, backgroundColor: editableCellBg }}>
                {renderCellContent(
                  kIdx,
                  'weight',
                  Number(kpi.weight || 0).toFixed(2),
                  Number(kpi.weight || 0).toFixed(2),
                  { align: 'center', bold: false }
                )}
              </td>

              {/* Col I: Điểm */}
              <td style={{ ...tdBaseStyle, backgroundColor: editableCellBg }}>
                {renderCellContent(kIdx, 'pts', kpi.pts, kpi.pts, {
                  align: 'center',
                  bold: true
                })}
              </td>

              {/* Col J: Phép đối chiếu */}
              <td style={{ ...tdBaseStyle, backgroundColor: editableCellBg }}>
                {activeCellForEmp &&
                  activeCellForEmp.kIdx === kIdx &&
                  activeCellForEmp.field === 'operator' ? (
                  <select
                    autoFocus
                    value={kpi.operator || '>='}
                    onChange={(e) => onCommitCell(emp.employee_id, kIdx, 'operator', e.target.value)}
                    onBlur={onCancelCell}
                    style={{
                      width: '100%',
                      height: '26px',
                      border: '2px solid #D97706',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      fontFamily: '"Times New Roman", Times, serif',
                      fontSize: '0.88rem',
                      textAlign: 'center',
                      fontWeight: '700',
                      color: '#111827',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="=">=</option>
                  </select>
                ) : (
                  <div
                    onClick={() => onActivateCell(emp.employee_id, kIdx, 'operator')}
                    title="Nhấp chuột để chọn phép đối chiếu"
                    style={{
                      ...staticCellBoxStyle,
                      justifyContent: 'center',
                      fontWeight: '700',
                      color: '#111827'
                    }}
                  >
                    <span>{kpi.operator || '>='}</span>
                  </div>
                )}
              </td>

              {/* Col K: Mục tiêu tháng */}
              <td style={{ ...tdBaseStyle, backgroundColor: editableCellBg }}>
                {renderCellContent(
                  kIdx,
                  'target_display',
                  kpi.target_display || '95.0%',
                  stripPercentForEdit(kpi.target_display),
                  { align: 'right', bold: false }
                )}
              </td>

              {/* Col L: Kết quả thực hiện */}
              <td
                style={{
                  ...tdBaseStyle,
                  backgroundColor: isDirty ? '#FDE68A' : isCustom ? '#FEF3C7' : isExceed105 ? (empIdx % 2 === 0 ? '#C6F6D5' : '#B8F0CB') : '#FFFFFF'
                }}
              >
                {renderCellContent(
                  kIdx,
                  'actual_display',
                  kpi.actual_display || '100.0%',
                  stripPercentForEdit(kpi.actual_display),
                  { align: 'right', bold: true, color: '#7B5233' }
                )}
              </td>

              {/* Col M: Tỷ lệ hoàn thành */}
              <td style={{ ...tdBaseStyle, backgroundColor: isExceed105 ? (empIdx % 2 === 0 ? '#C1F2D6' : '#B8ECCF') : '#FFFFFF' }}>
                {renderCellContent(
                  kIdx,
                  'completion_rate',
                  `${Number(kpi.completion_rate || 0).toFixed(1)}%`,
                  Number(kpi.completion_rate || 0).toFixed(1),
                  { align: 'right', bold: false }
                )}
              </td>

              {/* Col N: Điểm số từng mục */}
              <td style={{ ...tdBaseStyle, backgroundColor: isExceed105 ? (empIdx % 2 === 0 ? '#C1F2D6' : '#B8ECCF') : '#FFFFFF' }}>
                {renderCellContent(
                  kIdx,
                  'point_score',
                  Number(kpi.point_score || 0).toFixed(2),
                  Number(kpi.point_score || 0).toFixed(2),
                  { align: 'right', bold: true }
                )}
              </td>

              {/* Col O: Tổng điểm nhân sự (rowSpan) */}
              {kIdx === 0 && (
                <td
                  rowSpan={rowSpanCount}
                  style={{
                    ...tdBaseStyle,
                    textAlign: 'center',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    color: Number(emp.total_score || 0) >= 95 ? '#047857' : '#B45309',
                    backgroundColor: rowBg
                  }}
                >
                  {Number(emp.total_score || 0).toFixed(2)}
                </td>
              )}

              {/* Col P: Kết quả (Vượt / Đạt / Không đạt) */}
              <td
                style={{
                  ...tdBaseStyle,
                  textAlign: 'center',
                  fontWeight: '700',
                  color: resColor,
                  backgroundColor: resBg
                }}
              >
                {kpi.result_label}
              </td>

              {/* Các cột Phản hồi & Ghi chú (Q, R, S, T, U) gộp theo nhân sự và lấy từ /admin/kpi/staff-evaluations */}
              {showFeedbackCols && kIdx === 0 && (
                <>
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      verticalAlign: 'top',
                      backgroundColor: editableCellBg
                    }}
                  >
                    {renderCellContent(
                      0,
                      'achievement',
                      emp.achievement ?? kpi.achievement ?? '',
                      emp.achievement ?? kpi.achievement ?? '',
                      {
                        align: 'left',
                        multiline: true,
                        placeholder: 'Nhập thành tích nổi bật...'
                      }
                    )}
                  </td>
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      verticalAlign: 'top',
                      backgroundColor: editableCellBg
                    }}
                  >
                    {renderCellContent(
                      0,
                      'difficulty',
                      emp.difficulty ?? kpi.difficulty ?? '',
                      emp.difficulty ?? kpi.difficulty ?? '',
                      {
                        align: 'left',
                        multiline: true,
                        placeholder: 'Nhập tồn tại / khó khăn...'
                      }
                    )}
                  </td>
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      verticalAlign: 'top',
                      backgroundColor: editableCellBg
                    }}
                  >
                    {renderCellContent(
                      0,
                      'action_plan',
                      emp.action_plan ?? kpi.action_plan ?? '',
                      emp.action_plan ?? kpi.action_plan ?? '',
                      {
                        align: 'left',
                        multiline: true,
                        placeholder: 'Nhập kế hoạch hành động...'
                      }
                    )}
                  </td>
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      verticalAlign: 'top',
                      backgroundColor: editableCellBg
                    }}
                  >
                    {renderCellContent(
                      0,
                      'proposal',
                      emp.proposal ?? kpi.proposal ?? '',
                      emp.proposal ?? kpi.proposal ?? '',
                      {
                        align: 'left',
                        multiline: true,
                        placeholder: 'Nhập đề xuất / kiến nghị...'
                      }
                    )}
                  </td>
                  <td
                    rowSpan={rowSpanCount}
                    style={{
                      ...tdBaseStyle,
                      verticalAlign: 'top',
                      backgroundColor: editableCellBg
                    }}
                  >
                    {renderCellContent(
                      0,
                      'note',
                      emp.note ?? kpi.note ?? '',
                      emp.note ?? kpi.note ?? '',
                      {
                        align: 'left',
                        multiline: true,
                        placeholder: 'Nhập ghi chú...'
                      }
                    )}
                  </td>
                </>
              )}
            </tr>
          );
        })}
      </>
    );
  }
);

const KPIMasterSheetModal = ({
  isOpen,
  onClose,
  defaultMonth = '2026-11',
  defaultFactory = '',
  onSaved
}) => {
  // 1. Khai báo toàn bộ State & Hooks ở đầu Component (Chuẩn AGENTS.md)
  const [selectedPeriod, setSelectedPeriod] = useState(defaultMonth || '2026-11');
  const [scope, setScope] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [showFeedbackCols, setShowFeedbackCols] = useState(true);

  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dirtyMap, setDirtyMap] = useState({});
  const [activeCell, setActiveCell] = useState(null); // { empId, kIdx, field }
  const [toastMsg, setToastMsg] = useState(null);
  const [confirmResetModal, setConfirmResetModal] = useState(null);

  const { monthNum, yearNum } = useMemo(() => {
    const parts = String(selectedPeriod || '2026-11').split('-');
    return {
      yearNum: parseInt(parts[0], 10) || 2026,
      monthNum: parseInt(parts[1], 10) || 11
    };
  }, [selectedPeriod]);

  const showToast = useCallback((type, text) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // 2. Hàm tải dữ liệu Bảng Tổng Hợp KPI
  const fetchMasterSheet = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/quality-employees/kpi/master-sheet', {
        params: {
          month: monthNum,
          year: yearNum,
          scope,
          factory: defaultFactory || 'ALL'
        }
      });
      const list = Array.isArray(res.data?.employees) ? res.data.employees : [];
      setEmployeesData(list);
      setDirtyMap({});
      setActiveCell(null);
    } catch (err) {
      console.error('Lỗi tải Bảng Tổng Hợp KPI:', err);
      showToast('error', 'Không thể tải dữ liệu Bảng Tổng Hợp KPI. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }, [isOpen, monthNum, yearNum, scope, defaultFactory, showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchMasterSheet();
    }
  }, [isOpen, fetchMasterSheet]);

  // 3. Danh sách các Nhóm (Cột D) để lọc nhanh
  const availableGroups = useMemo(() => {
    const s = new Set();
    employeesData.forEach((emp) => {
      if (emp.group_name) s.add(emp.group_name);
    });
    return Array.from(s);
  }, [employeesData]);

  // 4. Lọc danh sách nhân sự theo từ khóa và Nhóm
  const filteredEmployees = useMemo(() => {
    return employeesData.filter((emp) => {
      if (groupFilter !== 'ALL' && emp.group_name !== groupFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchName = (emp.full_name || '').toLowerCase().includes(q);
        const matchId = String(emp.employee_id || '').toLowerCase().includes(q);
        const matchStage = (emp.stage_desc || '').toLowerCase().includes(q);
        const matchKpi = (emp.kpis || []).some(
          (k) => (k.kpi_code || '').toLowerCase().includes(q) || (k.content || '').toLowerCase().includes(q)
        );
        return matchName || matchId || matchStage || matchKpi;
      }
      return true;
    });
  }, [employeesData, groupFilter, searchTerm]);

  // 5. Thống kê tổng quan trên thanh Header
  const sheetStats = useMemo(() => {
    const totalEmps = filteredEmployees.length;
    let totalRows = 0;
    let customCount = 0;
    let sumTotalScore = 0;

    filteredEmployees.forEach((emp) => {
      sumTotalScore += Number(emp.total_score || 0);
      (emp.kpis || []).forEach((k) => {
        totalRows += 1;
        if (k.is_custom) customCount += 1;
      });
    });

    const avgScore = totalEmps > 0 ? (sumTotalScore / totalEmps).toFixed(2) : '0.00';
    const dirtyCount = Object.keys(dirtyMap).length;
    return { totalEmps, totalRows, customCount, avgScore, dirtyCount };
  }, [filteredEmployees, dirtyMap]);

  // 6. Kích hoạt chế độ sửa cho đúng 1 ô được click
  const handleActivateCell = useCallback((empId, kIdx, field) => {
    setActiveCell({ empId: String(empId), kIdx, field });
  }, []);

  const handleCancelCell = useCallback(() => {
    setActiveCell(null);
  }, []);

  // 7. Commit giá trị khi người dùng nhấn Enter hoặc rời khỏi ô đang sửa
  const handleCommitCell = useCallback(
    (employeeId, rowIndex, field, rawVal) => {
      setActiveCell((prev) =>
        prev && String(prev.empId) === String(employeeId) && prev.kIdx === rowIndex && prev.field === field
          ? null
          : prev
      );

      let updatedDirtyRecord = null;
      let dirtyKey = null;

      setEmployeesData((prev) =>
        prev.map((emp) => {
          if (String(emp.employee_id) !== String(employeeId)) return emp;

          const isFeedbackField = ['achievement', 'difficulty', 'action_plan', 'proposal', 'note'].includes(field);
          const nextEmpFeedback = {
            achievement: isFeedbackField && field === 'achievement' ? rawVal : (emp.achievement ?? ''),
            difficulty: isFeedbackField && field === 'difficulty' ? rawVal : (emp.difficulty ?? ''),
            action_plan: isFeedbackField && field === 'action_plan' ? rawVal : (emp.action_plan ?? ''),
            proposal: isFeedbackField && field === 'proposal' ? rawVal : (emp.proposal ?? ''),
            note: isFeedbackField && field === 'note' ? rawVal : (emp.note ?? '')
          };

          let newEmpTotal = 0;
          const updatedKpis = (emp.kpis || []).map((row, idx) => {
            if (idx !== rowIndex) {
              newEmpTotal += Number(row.point_score || 0);
              return isFeedbackField ? { ...row, [field]: rawVal } : row;
            }

            const nextRow = {
              ...row,
              ...nextEmpFeedback,
              is_custom: true,
              is_dirty: true
            };

            if (field === 'weight') {
              const wNum = parseFloat(String(rawVal).replace(',', '.'));
              const newPts = isNaN(wNum) ? nextRow.pts : Math.round((wNum <= 1.5 ? wNum * 100 : wNum) * 10) / 10;
              const calc = computeRowFormula(newPts, nextRow.operator, nextRow.target_display, nextRow.actual_display);
              Object.assign(nextRow, calc);
            } else if (field === 'pts') {
              const calc = computeRowFormula(rawVal, nextRow.operator, nextRow.target_display, nextRow.actual_display);
              Object.assign(nextRow, calc);
            } else if (field === 'operator') {
              const calc = computeRowFormula(nextRow.pts, rawVal, nextRow.target_display, nextRow.actual_display);
              Object.assign(nextRow, calc);
            } else if (field === 'target_display') {
              const valStr = String(rawVal).trim();
              const numVal = parseFloat(valStr.replace('%', '').replace(',', '.').trim());
              const targetRatio = isNaN(numVal)
                ? parsePercentToRatio(valStr, nextRow.operator)
                : numVal === 0
                  ? 0.0
                  : numVal / 100.0;
              const displayStr = formatRatioDisplay(targetRatio);
              const calc = computeRowFormula(nextRow.pts, nextRow.operator, displayStr, nextRow.actual_display);
              Object.assign(nextRow, calc, { target_display: displayStr });
            } else if (field === 'actual_display') {
              const valStr = String(rawVal).trim();
              const numVal = parseFloat(valStr.replace('%', '').replace(',', '.').trim());
              const actualRatio = isNaN(numVal)
                ? parsePercentToRatio(valStr, nextRow.operator)
                : numVal === 0
                  ? 0.0
                  : numVal / 100.0;
              const displayStr = formatRatioDisplay(actualRatio);
              const calc = computeRowFormula(nextRow.pts, nextRow.operator, nextRow.target_display, displayStr);
              Object.assign(nextRow, calc, { actual_display: displayStr });
            } else if (field === 'completion_rate') {
              const mPct = Math.max(0, parseFloat(String(rawVal).replace('%', '').replace(',', '.')) || 0);
              const pts = Number(nextRow.pts || 20);
              const weight = Number((pts / 100.0).toFixed(2));
              const pointScore = Number((weight * mPct).toFixed(2));
              let resultLabel = 'Không đạt';
              if (pointScore >= pts * 1.04 - 1e-6) resultLabel = 'Vượt';
              else if (pointScore >= pts * 0.95 - 1e-6) resultLabel = 'Đạt';
              Object.assign(nextRow, {
                completion_rate: Number(mPct.toFixed(1)),
                point_score: pointScore,
                result_label: resultLabel
              });
            } else if (field === 'point_score') {
              const pScore = Math.max(0, parseFloat(String(rawVal).replace(',', '.')) || 0);
              const pts = Number(nextRow.pts || 20);
              const weight = pts > 0 ? pts / 100.0 : 0.2;
              const mPct = weight > 0 ? Number((pScore / weight).toFixed(1)) : 100.0;
              let resultLabel = 'Không đạt';
              if (pScore >= pts * 1.04 - 1e-6) resultLabel = 'Vượt';
              else if (pScore >= pts * 0.95 - 1e-6) resultLabel = 'Đạt';
              Object.assign(nextRow, {
                point_score: Number(pScore.toFixed(2)),
                completion_rate: mPct,
                result_label: resultLabel
              });
            } else {
              nextRow[field] = rawVal;
            }

            newEmpTotal += Number(nextRow.point_score || 0);

            const normActualRatio = parsePercentToRatio(nextRow.actual_display, nextRow.operator);
            const normTargetRatio = parsePercentToRatio(nextRow.target_display, nextRow.operator);
            dirtyKey = `${employeeId}__${nextRow.kpi_code || idx}`;
            updatedDirtyRecord = {
              employee_id: String(employeeId),
              kpi_code: nextRow.kpi_code,
              kpi_item_id: nextRow.kpi_item_id || null,
              month: monthNum,
              year: yearNum,
              custom_actual: formatRatioDisplay(normActualRatio),
              custom_score: Number(nextRow.completion_rate || 100),
              custom_weight: Number(nextRow.pts || 20),
              custom_operator: nextRow.operator,
              custom_target: formatRatioDisplay(normTargetRatio),
              custom_unit: '%',
              custom_content: nextRow.content,
              achievement: nextRow.achievement || '',
              difficulty: nextRow.difficulty || '',
              action_plan: nextRow.action_plan || '',
              proposal: nextRow.proposal || '',
              note: nextRow.note || '',
              reason: 'Chỉnh sửa trực tiếp trên Bảng Tổng Hợp KPI'
            };

            return nextRow;
          });

          return {
            ...emp,
            ...nextEmpFeedback,
            total_score: Number(newEmpTotal.toFixed(2)),
            kpis: updatedKpis
          };
        })
      );

      if (dirtyKey && updatedDirtyRecord) {
        const k = dirtyKey;
        const rec = updatedDirtyRecord;
        setDirtyMap((prevDirty) => ({
          ...prevDirty,
          [k]: rec
        }));
      }
    },
    [monthNum, yearNum]
  );

  // 8. Lưu toàn bộ thay đổi vào bảng chung kpi_employee_custom_results
  const handleSaveAllChanges = useCallback(async (silent = false) => {
    const dirtyItems = Object.values(dirtyMap);
    if (dirtyItems.length === 0) {
      if (!silent) showToast('info', 'Tất cả dữ liệu trên bảng đã được đồng bộ, không có thay đổi mới.');
      return true;
    }

    setSaving(true);
    try {
      await apiClient.post('/kpi-management/custom-results/batch', {
        month: monthNum,
        year: yearNum,
        modified_by: 'Quản lý QLCL',
        items: dirtyItems
      });
      setDirtyMap({});
      if (!silent) {
        showToast('success', `Đã lưu ${dirtyItems.length} mục chỉnh sửa vào bảng tạm KPI (kpi_employee_custom_results)!`);
      }
      if (typeof onSaved === 'function') onSaved();
      return true;
    } catch (err) {
      console.error('Lỗi lưu Bảng tạm KPI:', err);
      showToast('error', err.response?.data?.detail || 'Không thể lưu thay đổi KPI. Vui lòng thử lại!');
      return false;
    } finally {
      setSaving(false);
    }
  }, [dirtyMap, monthNum, yearNum, showToast, onSaved]);

  // 9. Khôi phục 1 dòng hoặc toàn bộ tháng về dữ liệu tự động từ CSDL gốc
  const executeResetCustomResults = useCallback(async () => {
    if (!confirmResetModal) return;
    setSaving(true);
    try {
      if (confirmResetModal.type === 'ALL') {
        await apiClient.delete('/kpi-management/custom-results', {
          params: {
            employee_id: 'ALL',
            kpi_code: 'ALL',
            month: monthNum,
            year: yearNum
          }
        });
        showToast('success', `Đã xóa bảng tạm và khôi phục dữ liệu tự động từ CSDL cho Tháng ${monthNum}/${yearNum}!`);
      } else if (confirmResetModal.type === 'ROW') {
        await apiClient.delete('/kpi-management/custom-results', {
          params: {
            employee_id: confirmResetModal.empId,
            kpi_code: confirmResetModal.kpiCode,
            month: monthNum,
            year: yearNum
          }
        });
        showToast('success', `Đã khôi phục mục ${confirmResetModal.kpiCode} về kết quả tính tự động!`);
      }
      setConfirmResetModal(null);
      await fetchMasterSheet();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      console.error('Lỗi khôi phục KPI tự động:', err);
      showToast('error', 'Không thể khôi phục dữ liệu gốc. Vui lòng thử lại!');
    } finally {
      setSaving(false);
    }
  }, [confirmResetModal, monthNum, yearNum, fetchMasterSheet, showToast, onSaved]);

  // 10. Xuất file Excel (.xlsx) đồng bộ 100% với Bảng tạm hiện tại
  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      if (Object.keys(dirtyMap).length > 0) {
        const ok = await handleSaveAllChanges(true);
        if (!ok) {
          setExporting(false);
          return;
        }
      }

      const response = await apiClient.post(
        '/quality-employees/kpi/export-excel',
        {
          month: monthNum,
          year: yearNum,
          scope,
          factory: defaultFactory || null
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const paddedMonth = String(monthNum).padStart(2, '0');
      link.setAttribute('download', `CL_KPI_Thang_${paddedMonth}_${yearNum}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast('success', `Đã xuất file CL_KPI_Thang_${paddedMonth}_${yearNum}.xlsx đồng bộ 100% với bảng hiện tại!`);
    } catch (err) {
      console.error('Lỗi xuất Excel KPI:', err);
      showToast('error', 'Không thể xuất file Excel. Vui lòng kiểm tra kết nối!');
    } finally {
      setExporting(false);
    }
  }, [dirtyMap, handleSaveAllChanges, monthNum, yearNum, scope, defaultFactory, showToast]);

  if (!isOpen) return null;

  // Dùng border-collapse: separate + border-spacing: 0 để sticky header + rowSpan không bị giật/nhảy khi cuộn
  const thRow1Style = {
    position: 'sticky',
    top: 0,
    zIndex: 25,
    backgroundColor: '#B3E1CB',
    color: '#111827',
    fontFamily: '"Times New Roman", Times, serif',
    fontWeight: '700',
    fontSize: '0.84rem',
    borderTop: '1px solid #6B7280',
    borderRight: '1px solid #6B7280',
    borderBottom: '1px solid #6B7280',
    padding: '6px 6px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    height: '34px',
    boxSizing: 'border-box'
  };

  const thRow2Style = {
    position: 'sticky',
    top: '34px',
    zIndex: 24,
    backgroundColor: '#B3E1CB',
    color: '#111827',
    fontFamily: '"Times New Roman", Times, serif',
    fontWeight: '700',
    fontSize: '0.84rem',
    borderRight: '1px solid #6B7280',
    borderBottom: '1.5px solid #4B5563',
    padding: '6px 6px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    height: '38px',
    boxSizing: 'border-box'
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FAF7F2',
          width: '98vw',
          height: '95vh',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1.5px solid #EADCC9',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP HEADER BAR (GOLD DESIGN SYSTEM) ── */}
        <div
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #4A2E1B 0%, #7B5233 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileSpreadsheet size={20} color="#FDE68A" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', letterSpacing: '0.2px' }}>
                  BẢNG TỔNG HỢP KPI&apos;S THÁNG {String(monthNum).padStart(2, '0')}/{yearNum} (MÃ: G7.QLCL-KPI)
                </h2>
                <span
                  style={{
                    backgroundColor: 'rgba(253, 230, 138, 0.2)',
                    border: '1px solid rgba(253, 230, 138, 0.5)',
                    color: '#FDE68A',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: '700'
                  }}
                >
                  Chỉnh sửa trực tiếp & Đồng bộ Bảng tạm KPI
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#E5E7EB' }}>
                Click trực tiếp vào bất kỳ ô nào (Chỉ số, Trọng số, Điểm, Phép đối chiếu, Mục tiêu, Kết quả thực hiện, Tỷ lệ HT, Điểm số, Phản hồi) để nhập số mới.
              </p>
            </div>
          </div>

          {/* Cụm nút hành động bên phải */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {sheetStats.dirtyCount > 0 && (
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #F59E0B',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Edit3 size={13} />
                {sheetStats.dirtyCount} mục vừa sửa chưa lưu
              </span>
            )}

            <button
              type="button"
              onClick={() => setConfirmResetModal({ type: 'ALL' })}
              disabled={saving || loading}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.35)',
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Xóa các chỉnh sửa tạm của tháng này để lấy lại số tính tự động từ CSDL gốc"
            >
              <RotateCcw size={15} />
              <span>Khôi phục tự động</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAllChanges(false)}
              disabled={saving || loading}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: sheetStats.dirtyCount > 0 ? '#F59E0B' : '#10B981',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              <Save size={15} />
              <span>{saving ? 'Đang lưu...' : `Lưu Bảng Tạm${sheetStats.dirtyCount > 0 ? ` (${sheetStats.dirtyCount})` : ''}`}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #A7F3D0',
                backgroundColor: '#047857',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              <FileSpreadsheet size={15} />
              <span>{exporting ? 'Đang xuất...' : 'Xuất Excel (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── FILTER & CONTROL TOOLBAR ── */}
        <div
          style={{
            padding: '8px 20px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#4A2E1B' }}>Kỳ KPI:</span>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#1F2937',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#4A2E1B' }}>Phạm vi:</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#1F2937',
                  outline: 'none'
                }}
              >
                <option value="ALL">Tất cả (QLCL + QCSX)</option>
                <option value="QLCL_ONLY">Khối QLCL</option>
                <option value="QCSX_ONLY">Khối QCSX</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="#7B5233" />
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#1F2937',
                  outline: 'none'
                }}
              >
                <option value="ALL">Tất cả các Nhóm ({availableGroups.length})</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative', minWidth: '230px' }}>
              <Search
                size={14}
                color="#9CA3AF"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên NV, mã NV, mã KPI, nội dung..."
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 10px 0 30px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="button"
              onClick={fetchMasterSheet}
              disabled={loading}
              style={{
                height: '32px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #EADCC9',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                fontSize: '0.78rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={13} />
              <span>Tải lại</span>
            </button>
          </div>

          {/* Thống kê nhanh & Ẩn/Hiện cột Phản hồi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#4A2E1B',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={showFeedbackCols}
                onChange={(e) => setShowFeedbackCols(e.target.checked)}
                style={{ accentColor: '#7B5233', cursor: 'pointer' }}
              />
              <span>Hiện cột Phản hồi & Ghi chú (Q → U)</span>
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.78rem',
                backgroundColor: '#FAF6F0',
                padding: '4px 12px',
                borderRadius: '8px',
                border: '1px solid #EADCC9'
              }}
            >
              <span>
                Nhân sự: <b style={{ color: '#7B5233' }}>{sheetStats.totalEmps}</b>
              </span>
              <span>•</span>
              <span>
                Dòng KPI: <b>{sheetStats.totalRows}</b>
              </span>
              <span>•</span>
              <span>
                Đã tùy chỉnh:{' '}
                <b style={{ color: sheetStats.customCount > 0 ? '#D97706' : '#059669' }}>{sheetStats.customCount}</b>
              </span>
              <span>•</span>
              <span>
                Điểm TB: <b style={{ color: '#047857' }}>{sheetStats.avgScore}</b>
              </span>
            </div>
          </div>
        </div>

        {/* ── TOAST THÔNG BÁO NỔI ── */}
        {toastMsg && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor:
                toastMsg.type === 'error' ? '#FEE2E2' : toastMsg.type === 'info' ? '#FEF3C7' : '#DCFCE7',
              color: toastMsg.type === 'error' ? '#DC2626' : toastMsg.type === 'info' ? '#B45309' : '#15803D',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              fontSize: '0.82rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            {toastMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* ── BANNER TIÊU ĐỀ BIỂU MẪU G7 ── */}
        <div
          style={{
            padding: '6px 20px',
            backgroundColor: '#FFFDF9',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: '"Times New Roman", Times, serif',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1F2937' }}>
            CÔNG TY CỔ PHẦN VI NA G7 — PHÒNG QUẢN LÝ CHẤT LƯỢNG (Bộ phận: Quản lý chất lượng)
          </div>
          <div style={{ fontSize: '0.78rem', color: '#7B5233', fontFamily: 'Inter, sans-serif', fontWeight: '600' }}>
            ✏️ Nhấp chuột vào ô bất kỳ để sửa trực tiếp và nhấn <b>Enter</b> (hoặc click sang ô khác)
          </div>
        </div>

        {/* ── SPREADSHEET WORKSPACE (CHỐNG NHẢY SCROLL VỚI overflowAnchor: 'none') ── */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            overflowAnchor: 'none',
            backgroundColor: '#FFFFFF',
            padding: 0
          }}
        >
          {loading ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233',
                gap: '10px'
              }}
            >
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                Đang tổng hợp dữ liệu KPI từ CSDL & Bảng tạm...
              </div>
            </div>
          ) : (
            <div style={{ minWidth: showFeedbackCols ? '2110px' : '1350px', overflowAnchor: 'none' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  tableLayout: 'fixed',
                  backgroundColor: '#FFFFFF',
                  overflowAnchor: 'none'
                }}
              >
                <colgroup>
                  <col style={{ width: '44px' }} /> {/* A: STT */}
                  <col style={{ width: '155px' }} /> {/* B: Họ và Tên */}
                  <col style={{ width: '98px' }} /> {/* C: Nhóm */}
                  <col style={{ width: '120px' }} /> {/* D: Phân tổ / Vị trí */}
                  <col style={{ width: '105px' }} /> {/* E: Mã KPI */}
                  <col style={{ width: '320px' }} /> {/* F: Chỉ số đánh giá */}
                  <col style={{ width: '68px' }} /> {/* G: Trọng số */}
                  <col style={{ width: '64px' }} /> {/* H: Điểm */}
                  <col style={{ width: '72px' }} /> {/* I: Phép đối chiếu */}
                  <col style={{ width: '88px' }} /> {/* J: Mục tiêu tháng */}
                  <col style={{ width: '96px' }} /> {/* K: Kết quả thực hiện */}
                  <col style={{ width: '88px' }} /> {/* L: Tỷ lệ hoàn thành */}
                  <col style={{ width: '76px' }} /> {/* M: Điểm số */}
                  <col style={{ width: '78px' }} /> {/* N: Tổng điểm */}
                  <col style={{ width: '90px' }} /> {/* O: Kết quả */}
                  {showFeedbackCols && (
                    <>
                      <col style={{ width: '210px' }} /> {/* P: Thành tích */}
                      <col style={{ width: '190px' }} /> {/* Q: Khó khăn */}
                      <col style={{ width: '200px' }} /> {/* R: Kế hoạch cải tiến */}
                      <col style={{ width: '185px' }} /> {/* S: Đề xuất/Kiến nghị */}
                      <col style={{ width: '145px' }} /> {/* T: Ghi chú */}
                    </>
                  )}
                </colgroup>

                <thead>
                  <tr>
                    <th rowSpan={2} style={{ ...thRow1Style, borderLeft: '1px solid #6B7280', height: '72px' }}>
                      STT
                    </th>
                    <th rowSpan={2} style={{ ...thRow1Style, height: '72px' }}>
                      Họ và Tên
                    </th>
                    <th rowSpan={2} style={{ ...thRow1Style, height: '72px' }}>
                      Nhóm
                    </th>
                    <th rowSpan={2} style={{ ...thRow1Style, height: '72px' }}>
                      Nhóm / Vị trí
                    </th>
                    <th rowSpan={2} style={{ ...thRow1Style, height: '72px' }}>
                      Mã KPI
                    </th>
                    <th colSpan={10} style={thRow1Style}>
                      Nhóm A: KPI chiến lược (100%) — KPI&apos;s tháng {String(monthNum).padStart(2, '0')}/{yearNum}
                    </th>
                    {showFeedbackCols && (
                      <>
                        <th colSpan={4} style={thRow1Style}>
                          Phản hồi
                        </th>
                        <th rowSpan={2} style={{ ...thRow1Style, height: '72px' }}>
                          Ghi chú
                        </th>
                      </>
                    )}
                  </tr>
                  <tr>
                    <th style={thRow2Style}>Chỉ số đánh giá</th>
                    <th style={thRow2Style}>Trọng số</th>
                    <th style={thRow2Style}>Điểm</th>
                    <th style={thRow2Style}>Phép đối chiếu</th>
                    <th style={thRow2Style}>Mục tiêu tháng</th>
                    <th style={thRow2Style}>Kết quả thực hiện</th>
                    <th style={thRow2Style}>Tỷ lệ hoàn thành</th>
                    <th style={thRow2Style}>Điểm số</th>
                    <th style={thRow2Style}>Tổng điểm</th>
                    <th style={thRow2Style}>Kết quả</th>
                    {showFeedbackCols && (
                      <>
                        <th style={thRow2Style}>Thành tích nổi bật trong tháng</th>
                        <th style={thRow2Style}>Những tồn tại/Khó khăn chưa hoàn thành</th>
                        <th style={thRow2Style}>Kế hoạch hành động cải tiến tháng tiếp theo</th>
                        <th style={thRow2Style}>Đề xuất/Kiến nghị với Ban Giám đốc</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showFeedbackCols ? 20 : 15}
                        style={{
                          ...tdBaseStyle,
                          padding: '32px',
                          textAlign: 'center',
                          color: '#6B7280',
                          fontSize: '0.95rem'
                        }}
                      >
                        Không tìm thấy nhân sự nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, empIdx) => {
                      const activeForThisEmp =
                        activeCell && String(activeCell.empId) === String(emp.employee_id) ? activeCell : null;
                      return (
                        <EmployeeKPIGroup
                          key={emp.employee_id}
                          emp={emp}
                          empIdx={empIdx}
                          showFeedbackCols={showFeedbackCols}
                          activeCellForEmp={activeForThisEmp}
                          onActivateCell={handleActivateCell}
                          onCommitCell={handleCommitCell}
                          onCancelCell={handleCancelCell}
                          onRequestResetRow={setConfirmResetModal}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── MODAL XÁC NHẬN KHÔI PHỤC TỰ ĐỘNG ── */}
        {confirmResetModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              zIndex: 10050,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setConfirmResetModal(null)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '22px 24px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)',
                border: '1px solid #EADCC9'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 8px 0', color: '#4A2E1B', fontSize: '1.02rem', fontWeight: '800' }}>
                {confirmResetModal.type === 'ALL'
                  ? `Khôi phục dữ liệu KPI tự động Tháng ${monthNum}/${yearNum}?`
                  : `Khôi phục chỉ tiêu ${confirmResetModal.kpiCode}?`}
              </h3>
              <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5 }}>
                {confirmResetModal.type === 'ALL'
                  ? 'Toàn bộ các ô chỉnh sửa thủ công trong bảng tạm (kpi_employee_custom_results) của tháng này sẽ được xóa để tính toán lại tự động 100% từ dữ liệu gốc trong CSDL.'
                  : `Xóa giá trị điều chỉnh thủ công của mục "${confirmResetModal.content}" để quay về kết quả tính tự động từ CSDL gốc.`}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmResetModal(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeResetCustomResults}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Đang khôi phục...' : 'Đồng ý khôi phục'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPIMasterSheetModal;

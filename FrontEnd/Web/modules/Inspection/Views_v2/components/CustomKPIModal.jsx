import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';

const MAIN_CATEGORY_OPTIONS = ['Vanity', 'Furniture', 'Khác'];

const DEFAULT_FORMULAS = {
  claim_rate: 'Tổng tiền phạt / tổng doanh thu * 100',
  fpy_rate: '(Tổng cont final đạt + cont Final fail (được xử lý trong 24h)) / Tổng số cont được final * 100',
  efficiency: 'Tổng điểm KPI (cả team) / (Thành viên team) * 100',
  capa_rate: '(Số báo cáo HĐKP hoàn thành trong 5 ngày) / Tổng số báo cáo HĐKP * 100',
  training_rate: 'Tổng số QC được đào tạo / Tổng QC cần đào tạo * 100',
  leave_rate: 'Tổng số ngày nghỉ / Tổng ngày công chuẩn * 100'
};

const DEFAULT_PRODUCT_LINES = {
  Vanity: ['Vanity', 'ADV', 'ADVANCE', 'BEZ', 'EYC', 'FOL', 'TPH'],
  Furniture: ['Furniture', 'APT', 'ATL', 'ATLAS', 'COV', 'HOR', 'MBC', 'TIN'],
  Khác: ['Khác']
};

// Trích xuất số thuần túy (VD: "99.0%" -> "99.0", "0.3%" -> "0.3")
const parsePureNumber = (str) => {
  if (str === null || str === undefined) return '';
  const s = String(str);
  const match = s.match(/\d+(\.\d+)?/);
  return match ? match[0] : '';
};

// Trích xuất chiều (▲/▼) và con số từ chuỗi chênh lệch (VD: "▼ 0.1%" -> { dir: '▼', num: '0.1' })
const parseChangeDetail = (str) => {
  if (!str) return { dir: '▼', num: '' };
  const s = String(str);
  const dir = s.includes('▲') ? '▲' : '▼';
  const match = s.match(/\d+(\.\d+)?/);
  const num = match ? match[0] : '';
  return { dir, num };
};

// Hàm tự động bóc tách các biến đặt tên theo công thức nhập trong textarea
const parseFormulaVariables = (formulaStr) => {
  if (!formulaStr || typeof formulaStr !== 'string') {
    return { type: 'div', varA: 'Tử số', varB: '', varC: 'Mẫu số' };
  }

  const str = formulaStr.trim();

  // Khớp mẫu (A + B) / C * 100 hoặc (A + B) / C
  const matchSumDiv = str.match(/^\s*\(\s*(.*?)\s*\+\s*(.*?)\s*\)\s*\/\s*(.*?)(?:\s*\*.*|\s*$)/i);
  if (matchSumDiv) {
    return {
      type: 'sum_div',
      varA: matchSumDiv[1].trim() || 'Biến A',
      varB: matchSumDiv[2].trim() || 'Biến B',
      varC: matchSumDiv[3].trim() || 'Mẫu số'
    };
  }

  // Khớp mẫu A / B * 100 hoặc A / B
  const matchDiv = str.match(/^\s*(.*?)\s*\/\s*(.*?)(?:\s*\*.*|\s*$)/i);
  if (matchDiv) {
    return {
      type: 'div',
      varA: matchDiv[1].trim() || 'Tử số',
      varB: '',
      varC: matchDiv[2].trim() || 'Mẫu số'
    };
  }

  return { type: 'div', varA: 'Tử số', varB: '', varC: 'Mẫu số' };
};

// Tự động tính chênh lệch dựa trên giá trị hiện tại so với kỳ trước trong history
const autoCalculateDiff = (currentValStr, prevValStr) => {
  if (currentValStr === '' || currentValStr === null || currentValStr === undefined) return null;
  if (prevValStr === '' || prevValStr === null || prevValStr === undefined) return null;

  const currentNum = parseFloat(currentValStr);
  const prevNum = parseFloat(prevValStr);

  if (isNaN(currentNum) || isNaN(prevNum)) return null;

  const diff = currentNum - prevNum;
  const absDiff = Math.abs(diff).toFixed(1);
  const dir = diff >= 0 ? '▲' : '▼';

  return { dir, num: absDiff };
};

/**
 * CustomKPIModal
 * Popup modal tùy chỉnh dữ liệu cho từng thẻ KPI trong 6 ô Quality Overview Dashboard (Section 1)
 */
export const CustomKPIModal = ({ isOpen, onClose, kpiItem, onSaveSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    targetText: '',
    formulaText: '',
    vanityMainCat: 'Vanity',
    vanityLabel: 'Vanity',
    vanityValNum: '',
    vanityChangeDir: '▼',
    vanityChangeNum: '',
    furnitureMainCat: 'Furniture',
    furnitureLabel: 'Furniture',
    furnitureValNum: '',
    furnitureChangeDir: '▼',
    furnitureChangeNum: '',
    scoreAvg: '',
    targetMonth: ''
  });
  const [historyList, setHistoryList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeLineTab, setActiveLineTab] = useState('line1');

  // Trạng thái chỉnh sửa lịch sử qua Popup riêng biệt
  const [editingHistRow, setEditingHistRow] = useState(null);
  const [savingHist, setSavingHist] = useState(false);
  const [viewingHistDetail, setViewingHistDetail] = useState(null);

  // Tìm Dòng hàng chính tương ứng (Vanity hoặc Furniture) từ tên danh mục/nhãn
  const getCategoryMainName = (label, fallback = 'Vanity') => {
    if (!label) return fallback;
    const s = String(label).trim();
    if (s.toLowerCase() === 'vanity' || DEFAULT_PRODUCT_LINES.Vanity.map(x => x.toLowerCase()).includes(s.toLowerCase())) {
      return 'Vanity';
    }
    if (s.toLowerCase() === 'furniture' || DEFAULT_PRODUCT_LINES.Furniture.map(x => x.toLowerCase()).includes(s.toLowerCase())) {
      return 'Furniture';
    }
    for (const cat of categories) {
      if (cat.name && cat.name.toLowerCase() === s.toLowerCase()) {
        return cat.main_category || fallback;
      }
    }
    return fallback;
  };

  // Lọc danh sách Dòng hàng phụ thuộc vào Dòng hàng chính được chọn
  const getSubCategoriesForMain = (mainCatName) => {
    if (!mainCatName) return [];
    const fromApi = categories
      .filter(c => (c.main_category || '').toLowerCase() === mainCatName.toLowerCase())
      .map(c => c.name);

    const defaults = DEFAULT_PRODUCT_LINES[mainCatName] || [];
    const merged = Array.from(new Set([...fromApi, ...defaults]));
    return merged;
  };

  // Kích hoạt Modal Popup xác nhận xóa bản ghi lịch sử chuẩn giao diện dự án
  const handlePromptDeleteHistory = (histItem, index) => {
    const label = histItem.month || histItem.created_at || `Lần ${index + 1}`;
    setDeletingHistItem({ item: histItem, index, label });
  };

  // Thực thi thao tác xóa bản ghi lịch sử sau khi người dùng bấm Đồng ý trên Modal dự án
  const executeDeleteHistory = async () => {
    if (!deletingHistItem) return;
    const { item, index, label } = deletingHistItem;
    setDeletingLoading(true);

    const updated = historyList.filter((h, i) => {
      if (item.id && h.id) return h.id !== item.id;
      return i !== index;
    });
    setHistoryList(updated);

    try {
      const kKey = kpiItem.kpiKey || (
        kpiItem.id === 1 ? 'claim_rate' :
        kpiItem.id === 2 ? 'fpy_rate' :
        kpiItem.id === 3 ? 'efficiency' :
        kpiItem.id === 4 ? 'capa_rate' :
        kpiItem.id === 5 ? 'training_rate' : 'leave_rate'
      );
      await api.put(`/inspections/kpi-targets/${kKey}`, {
        ...formData,
        history_json: updated
      });
      setSuccessMessage(`Đã xóa bản ghi lịch sử "${label}" thành công!`);
      setTimeout(() => setSuccessMessage(''), 2200);
      if (onSaveSuccess) onSaveSuccess();
    } catch (e) {
      console.error('Lỗi khi xóa dòng lịch sử:', e);
      setError('Lỗi khi xóa dòng lịch sử: ' + (e.message || ''));
    } finally {
      setDeletingLoading(false);
      setDeletingHistItem(null);
    }
  };

  const handleStartEditHistory = (row, originalIndex) => {
    const vChange = parseChangeDetail(row.vanity_change);
    const fChange = parseChangeDetail(row.furniture_change);

    const vLabel = row.vanity_label || formData.vanityLabel || 'Vanity';
    const fLabel = row.furniture_label || formData.furnitureLabel || 'Furniture';

    // Xác định Dòng hàng chính chuẩn: Vanity hoặc Furniture
    const vMainCat = getCategoryMainName(vLabel, formData.vanityMainCat || 'Vanity');
    const fMainCat = getCategoryMainName(fLabel, formData.furnitureMainCat || 'Furniture');

    const vSubs = getSubCategoriesForMain(vMainCat);
    const fSubs = getSubCategoriesForMain(fMainCat);

    // Parse an toàn line_values (hỗ trợ cả JSON string lẫn object)
    let lineVals = {};
    if (typeof row.line_values === 'string') {
      try { lineVals = JSON.parse(row.line_values); } catch (e) { lineVals = {}; }
    } else if (row.line_values && typeof row.line_values === 'object') {
      lineVals = JSON.parse(JSON.stringify(row.line_values));
    }

    const pureVVal = parsePureNumber(row.vanity_val);
    const pureFVal = parsePureNumber(row.furniture_val);

    // Kiểm tra xem lineVals đã có dòng con nào thuộc Vanity chưa
    const hasVanityInLines = Object.keys(lineVals).some(k => vSubs.includes(k));
    // Nếu chưa có, đưa dòng có sẵn số liệu (vLabel) vào danh sách dòng con
    if (!hasVanityInLines && (pureVVal !== '' || vLabel !== 'Vanity')) {
      lineVals[vLabel] = {
        a: '', b: '', c: '',
        valNum: pureVVal || '',
        changeDir: vChange.dir || '▼',
        changeNum: vChange.num || ''
      };
    }

    // Kiểm tra xem lineVals đã có dòng con nào thuộc Furniture chưa
    const hasFurnitureInLines = Object.keys(lineVals).some(k => fSubs.includes(k));
    // Nếu chưa có, đưa dòng có sẵn số liệu (fLabel) vào danh sách dòng con
    if (!hasFurnitureInLines && (pureFVal !== '' || fLabel !== 'Furniture')) {
      lineVals[fLabel] = {
        a: '', b: '', c: '',
        valNum: pureFVal || '',
        changeDir: fChange.dir || '▼',
        changeNum: fChange.num || ''
      };
    }

    // Kế thừa các dòng con từ bản ghi lịch sử gần nhất từng có cấu hình dòng con nếu có
    const priorWithLines = historyList.slice().reverse().find(h => {
      if (!h.line_values) return false;
      const lv = typeof h.line_values === 'string' ? JSON.parse(h.line_values || '{}') : h.line_values;
      return lv && typeof lv === 'object' && Object.keys(lv).length > 0;
    });
    if (priorWithLines && priorWithLines.line_values) {
      let pLines = priorWithLines.line_values;
      if (typeof pLines === 'string') {
        try { pLines = JSON.parse(pLines); } catch (e) { pLines = {}; }
      }
      Object.keys(pLines).forEach(k => {
        if (!lineVals[k]) {
          lineVals[k] = { a: '', b: '', c: '', valNum: '', changeDir: '▼', changeNum: '' };
        }
      });
    }

    const existingKeys = Object.keys(lineVals);
    const activeV = existingKeys.filter(k => vSubs.includes(k));
    const activeF = existingKeys.filter(k => fSubs.includes(k));
    existingKeys.forEach(k => {
      if (!activeV.includes(k) && !activeF.includes(k)) {
        const catMain = getCategoryMainName(k, '');
        if (catMain === 'Furniture') {
          activeF.push(k);
        } else {
          activeV.push(k);
        }
      }
    });

    setEditingHistRow({
      ...row,
      _originalIndex: originalIndex,
      month: row.month || '',
      vanity_main_cat: vMainCat,
      vanity_label: vLabel,
      vanity_val_num: pureVVal,
      vanity_change_dir: vChange.dir || '▼',
      vanity_change_num: vChange.num,
      furniture_main_cat: fMainCat,
      furniture_label: fLabel,
      furniture_val_num: pureFVal,
      furniture_change_dir: fChange.dir || '▼',
      furniture_change_num: fChange.num,
      score_avg: row.score_avg !== null && row.score_avg !== undefined ? row.score_avg : '',
      line_values: lineVals,
      activeLineTab: 'line1',
      activeVanityLines: activeV,
      activeFurnitureLines: activeF
    });
  };

  const handleEditHistFieldChange = (field, value) => {
    setEditingHistRow(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  // Helper tính lại tổng hợp của 2 Dòng hàng chính khi thay đổi số liệu các dòng con trong Popup Sửa
  const recalcEditRowAggregates = (rowObj) => {
    let totVanA = 0, totVanC = 0;
    const vanVals = [];
    (rowObj.activeVanityLines || []).forEach(name => {
      const d = rowObj.line_values?.[name];
      if (d) {
        const a = parseFloat(d.a), b = parseFloat(d.b), c = parseFloat(d.c), v = parseFloat(d.valNum);
        if (!isNaN(a) && !isNaN(c) && c !== 0) {
          totVanA += a + (isNaN(b) ? 0 : b);
          totVanC += c;
        } else if (!isNaN(v)) {
          vanVals.push(v);
        }
      }
    });

    let aggVan = null;
    if (totVanC > 0) {
      aggVan = ((totVanA / totVanC) * 100).toFixed(1);
    } else if (vanVals.length > 0) {
      aggVan = (vanVals.reduce((acc, x) => acc + x, 0) / vanVals.length).toFixed(1);
    }

    let totFurA = 0, totFurC = 0;
    const furVals = [];
    (rowObj.activeFurnitureLines || []).forEach(name => {
      const d = rowObj.line_values?.[name];
      if (d) {
        const a = parseFloat(d.a), b = parseFloat(d.b), c = parseFloat(d.c), v = parseFloat(d.valNum);
        if (!isNaN(a) && !isNaN(c) && c !== 0) {
          totFurA += a + (isNaN(b) ? 0 : b);
          totFurC += c;
        } else if (!isNaN(v)) {
          furVals.push(v);
        }
      }
    });

    let aggFur = null;
    if (totFurC > 0) {
      aggFur = ((totFurA / totFurC) * 100).toFixed(1);
    } else if (furVals.length > 0) {
      aggFur = (furVals.reduce((acc, x) => acc + x, 0) / furVals.length).toFixed(1);
    }

    const next = { ...rowObj };
    const origIdx = rowObj._originalIndex;
    const priorHist = origIdx > 0 ? historyList[origIdx - 1] : null;

    if (aggVan !== null) {
      next.vanity_val_num = aggVan;
      const prevVStr = parsePureNumber(priorHist?.vanity_val);
      const calcV = autoCalculateDiff(aggVan, prevVStr);
      if (calcV) { next.vanity_change_dir = calcV.dir; next.vanity_change_num = calcV.num; }
    }
    if (aggFur !== null) {
      next.furniture_val_num = aggFur;
      const prevFStr = parsePureNumber(priorHist?.furniture_val);
      const calcF = autoCalculateDiff(aggFur, prevFStr);
      if (calcF) { next.furniture_change_dir = calcF.dir; next.furniture_change_num = calcF.num; }
    }
    return next;
  };

  const handleAddEditSubLine = (tabKey, lineName) => {
    if (!lineName) return;
    setEditingHistRow(prev => {
      if (!prev) return null;
      const isVanity = tabKey === 'vanity';
      const activeKey = isVanity ? 'activeVanityLines' : 'activeFurnitureLines';
      const curActive = prev[activeKey] || [];
      if (curActive.includes(lineName)) return prev;

      const nextActive = [...curActive, lineName];
      const nextLineValues = { ...(prev.line_values || {}) };
      if (!nextLineValues[lineName]) {
        nextLineValues[lineName] = { a: '', b: '', c: '', valNum: '', changeDir: '▼', changeNum: '' };
      }
      return {
        ...prev,
        [activeKey]: nextActive,
        line_values: nextLineValues
      };
    });
  };

  const handleRemoveEditSubLine = (tabKey, lineName) => {
    setEditingHistRow(prev => {
      if (!prev) return null;
      const isVanity = tabKey === 'vanity';
      const activeKey = isVanity ? 'activeVanityLines' : 'activeFurnitureLines';
      const nextActive = (prev[activeKey] || []).filter(l => l !== lineName);
      const nextLineValues = { ...(prev.line_values || {}) };
      delete nextLineValues[lineName];

      const nextRow = {
        ...prev,
        [activeKey]: nextActive,
        line_values: nextLineValues
      };
      return recalcEditRowAggregates(nextRow);
    });
  };

  const handleEditHistLineInputChange = (tabKey, lineName, field, value, formulaType = 'div') => {
    setEditingHistRow(prev => {
      if (!prev) return null;
      const current = prev.line_values?.[lineName] || { valNum: '', changeDir: '▼', changeNum: '', a: '', b: '', c: '' };
      const nextLine = { ...current, [field]: value };

      if (field === 'a' || field === 'b' || field === 'c') {
        const a = parseFloat(field === 'a' ? value : nextLine.a);
        const b = parseFloat(field === 'b' ? value : nextLine.b);
        const c = parseFloat(field === 'c' ? value : nextLine.c);

        let res = null;
        if (formulaType === 'sum_div') {
          if (!isNaN(a) && !isNaN(c) && c !== 0) {
            const sum = a + (isNaN(b) ? 0 : b);
            res = ((sum / c) * 100).toFixed(1);
          }
        } else {
          if (!isNaN(a) && !isNaN(c) && c !== 0) {
            res = ((a / c) * 100).toFixed(1);
          }
        }

        if (res !== null) {
          nextLine.valNum = res;
          const origIdx = prev._originalIndex;
          const priorHist = origIdx > 0 ? historyList[origIdx - 1] : null;
          const prevStr = tabKey === 'vanity'
            ? parsePureNumber(priorHist?.line_values?.[lineName]?.valNum || priorHist?.vanity_val)
            : parsePureNumber(priorHist?.line_values?.[lineName]?.valNum || priorHist?.furniture_val);

          const calculatedDiff = autoCalculateDiff(res, prevStr);
          if (calculatedDiff) {
            nextLine.changeDir = calculatedDiff.dir;
            nextLine.changeNum = calculatedDiff.num;
          }
        }
      }

      const nextLineValues = { ...(prev.line_values || {}), [lineName]: nextLine };
      const nextRow = {
        ...prev,
        line_values: nextLineValues
      };
      return recalcEditRowAggregates(nextRow);
    });
  };

  const handleRecalcFromEditSubLines = () => {
    setEditingHistRow(prev => prev ? recalcEditRowAggregates(prev) : null);
  };

  const handleSaveEditHistory = async () => {
    if (!editingHistRow) return;
    setSavingHist(true);

    const formatNum = (val) => {
      if (val === '' || val === null || val === undefined) return '';
      const n = parseFloat(val);
      return isNaN(n) ? '' : `${n.toFixed(1)}%`;
    };

    const formatChange = (dir, num) => {
      if (num === '' || num === null || num === undefined) return '';
      const n = parseFloat(num);
      return isNaN(n) ? '' : `${dir || '▼'} ${n.toFixed(1)}%`;
    };

    const cleanedLineValues = {};
    [...(editingHistRow.activeVanityLines || []), ...(editingHistRow.activeFurnitureLines || [])].forEach(lineName => {
      const d = editingHistRow.line_values?.[lineName];
      if (d && (d.valNum !== '' || d.a !== '' || d.c !== '')) {
        cleanedLineValues[lineName] = d;
      }
    });

    const updatedRow = {
      ...editingHistRow,
      month: editingHistRow.month?.trim() || '',
      vanity_label: editingHistRow.vanity_label || formData.vanityLabel || 'Vanity',
      vanity_val: formatNum(editingHistRow.vanity_val_num),
      vanity_change: formatChange(editingHistRow.vanity_change_dir, editingHistRow.vanity_change_num),
      furniture_label: editingHistRow.furniture_label || formData.furnitureLabel || 'Furniture',
      furniture_val: formatNum(editingHistRow.furniture_val_num),
      furniture_change: formatChange(editingHistRow.furniture_change_dir, editingHistRow.furniture_change_num),
      score_avg: editingHistRow.score_avg !== '' && !isNaN(parseFloat(editingHistRow.score_avg)) ? parseFloat(editingHistRow.score_avg) : null,
      line_values: cleanedLineValues
    };

    delete updatedRow.vanity_main_cat;
    delete updatedRow.furniture_main_cat;
    delete updatedRow.vanity_val_num;
    delete updatedRow.vanity_change_dir;
    delete updatedRow.vanity_change_num;
    delete updatedRow.furniture_val_num;
    delete updatedRow.furniture_change_dir;
    delete updatedRow.furniture_change_num;
    delete updatedRow._originalIndex;
    delete updatedRow.activeLineTab;
    delete updatedRow.activeVanityLines;
    delete updatedRow.activeFurnitureLines;

    const updatedList = historyList.map((h, i) => {
      if (editingHistRow.id && h.id && h.id === editingHistRow.id) return updatedRow;
      if (editingHistRow._originalIndex !== undefined && i === editingHistRow._originalIndex) return updatedRow;
      return h;
    });

    setHistoryList(updatedList);
    setEditingHistRow(null);

    try {
      const kKey = kpiItem.kpiKey || (
        kpiItem.id === 1 ? 'claim_rate' :
        kpiItem.id === 2 ? 'fpy_rate' :
        kpiItem.id === 3 ? 'efficiency' :
        kpiItem.id === 4 ? 'capa_rate' :
        kpiItem.id === 5 ? 'training_rate' : 'leave_rate'
      );
      await api.put(`/inspections/kpi-targets/${kKey}`, {
        ...formData,
        history_json: updatedList
      });
      setSuccessMessage(`Đã cập nhật bản ghi lịch sử "${updatedRow.month}" thành công!`);
      setTimeout(() => setSuccessMessage(''), 2500);
      if (onSaveSuccess) onSaveSuccess();
    } catch (e) {
      console.error('Lỗi khi cập nhật lịch sử:', e);
      setError('Lỗi khi lưu cập nhật lịch sử: ' + (e.message || ''));
    } finally {
      setSavingHist(false);
    }
  };

  // Trạng thái bộ máy tính số liệu riêng cho từng Dòng hàng (Tab 1 & Tab 2)
  const [calcLine1, setCalcLine1] = useState({ a: '', b: '', c: '' });
  const [calcLine2, setCalcLine2] = useState({ a: '', b: '', c: '' });
  
  // Lưu trữ thông số tính toán cho từng dòng hàng cụ thể trong từng Tab Dòng hàng chính
  const [lineValues, setLineValues] = useState({});

  // Trạng thái danh sách Dòng hàng con đang hiển thị ở từng Tab (mặc định lấy theo tháng trước)
  const [activeVanityLines, setActiveVanityLines] = useState([]);
  const [activeFurnitureLines, setActiveFurnitureLines] = useState([]);
  const [missingCategoryReminder, setMissingCategoryReminder] = useState('');

  // Trạng thái hiển thị modal xác nhận và thông báo thành công
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingHistItem, setDeletingHistItem] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Hàm xoá sạch form nhập liệu sau khi lưu thành công
  const resetFormInputs = () => {
    setLineValues({});
    setFormData(prev => ({
      ...prev,
      vanityValNum: '',
      vanityChangeNum: '',
      furnitureValNum: '',
      furnitureChangeNum: '',
      scoreAvg: ''
    }));
    setCalcLine1({ a: '', b: '', c: '' });
    setCalcLine2({ a: '', b: '', c: '' });
  };

  const handleAddSubLine = (tabKey, lineName) => {
    if (!lineName) return;
    if (tabKey === 'vanity') {
      if (!activeVanityLines.includes(lineName)) {
        setActiveVanityLines(prev => [...prev, lineName]);
      }
    } else {
      if (!activeFurnitureLines.includes(lineName)) {
        setActiveFurnitureLines(prev => [...prev, lineName]);
      }
    }
  };

  const handleRemoveSubLine = (tabKey, lineName) => {
    if (tabKey === 'vanity') {
      setActiveVanityLines(prev => prev.filter(l => l !== lineName));
    } else {
      setActiveFurnitureLines(prev => prev.filter(l => l !== lineName));
    }
    setLineValues(prev => {
      const next = { ...prev };
      delete next[lineName];
      recalculateAggregates(next);
      return next;
    });
  };

  const recalculateAggregates = (updatedLineMap) => {
    let totVanA = 0, totVanC = 0;
    const vanVals = [];
    activeVanityLines.forEach(name => {
      const d = updatedLineMap[name];
      if (d) {
        const a = parseFloat(d.a), b = parseFloat(d.b), c = parseFloat(d.c), v = parseFloat(d.valNum);
        if (!isNaN(a) && !isNaN(c) && c !== 0) {
          totVanA += a + (isNaN(b) ? 0 : b);
          totVanC += c;
        } else if (!isNaN(v)) {
          vanVals.push(v);
        }
      }
    });

    let aggVan = null;
    if (totVanC > 0) {
      aggVan = ((totVanA / totVanC) * 100).toFixed(1);
    } else if (vanVals.length > 0) {
      aggVan = (vanVals.reduce((acc, x) => acc + x, 0) / vanVals.length).toFixed(1);
    }

    let totFurA = 0, totFurC = 0;
    const furVals = [];
    activeFurnitureLines.forEach(name => {
      const d = updatedLineMap[name];
      if (d) {
        const a = parseFloat(d.a), b = parseFloat(d.b), c = parseFloat(d.c), v = parseFloat(d.valNum);
        if (!isNaN(a) && !isNaN(c) && c !== 0) {
          totFurA += a + (isNaN(b) ? 0 : b);
          totFurC += c;
        } else if (!isNaN(v)) {
          furVals.push(v);
        }
      }
    });

    let aggFur = null;
    if (totFurC > 0) {
      aggFur = ((totFurA / totFurC) * 100).toFixed(1);
    } else if (furVals.length > 0) {
      aggFur = (furVals.reduce((acc, x) => acc + x, 0) / furVals.length).toFixed(1);
    }

    const lastHist = historyList.length > 0 ? historyList[historyList.length - 1] : null;

    setFormData(prev => {
      const next = { ...prev };
      next.vanityLabel = prev.vanityMainCat || 'Vanity';
      next.furnitureLabel = prev.furnitureMainCat || 'Furniture';

      if (aggVan !== null) {
        next.vanityValNum = aggVan;
        const prevVStr = parsePureNumber(lastHist?.vanity_val || kpiItem?.vanityVal);
        const calcV = autoCalculateDiff(aggVan, prevVStr);
        if (calcV) { next.vanityChangeDir = calcV.dir; next.vanityChangeNum = calcV.num; }
      } else {
        next.vanityValNum = '';
        next.vanityChangeNum = '';
      }

      if (aggFur !== null) {
        next.furnitureValNum = aggFur;
        const prevFStr = parsePureNumber(lastHist?.furniture_val || kpiItem?.furnitureVal);
        const calcF = autoCalculateDiff(aggFur, prevFStr);
        if (calcF) { next.furnitureChangeDir = calcF.dir; next.furnitureChangeNum = calcF.num; }
      } else {
        next.furnitureValNum = '';
        next.furnitureChangeNum = '';
      }

      return next;
    });
  };

  const handleLineInputChange = (tabKey, lineName, field, value, formulaType = 'div') => {
    setLineValues((prev) => {
      const current = prev[lineName] || { valNum: '', changeDir: '▼', changeNum: '', a: '', b: '', c: '' };
      const nextLine = { ...current, [field]: value };

      // Nếu nhập Tử số / Mẫu số -> Tự động tính % & Chênh lệch cho dòng hàng này
      if (field === 'a' || field === 'b' || field === 'c') {
        const a = parseFloat(field === 'a' ? value : nextLine.a);
        const b = parseFloat(field === 'b' ? value : nextLine.b);
        const c = parseFloat(field === 'c' ? value : nextLine.c);

        let res = null;
        if (formulaType === 'sum_div') {
          if (!isNaN(a) && !isNaN(c) && c !== 0) {
            const sum = a + (isNaN(b) ? 0 : b);
            res = ((sum / c) * 100).toFixed(1);
          }
        } else {
          if (!isNaN(a) && !isNaN(c) && c !== 0) {
            res = ((a / c) * 100).toFixed(1);
          }
        }

        if (res !== null) {
          nextLine.valNum = res;
          const lastHist = historyList.length > 0 ? historyList[historyList.length - 1] : null;
          const prevStr = tabKey === 'vanity' 
            ? parsePureNumber(lastHist?.vanity_val || kpiItem?.vanityVal)
            : parsePureNumber(lastHist?.furniture_val || kpiItem?.furnitureVal);

          const calculatedDiff = autoCalculateDiff(res, prevStr);
          if (calculatedDiff) {
            nextLine.changeDir = calculatedDiff.dir;
            nextLine.changeNum = calculatedDiff.num;
          }
        }
      }

      const updatedMap = { ...prev, [lineName]: nextLine };
      recalculateAggregates(updatedMap);
      return updatedMap;
    });
  };



  const updateCalcLine1 = (newValA, newValB, newValC, formulaType) => {
    setCalcLine1({ a: newValA, b: newValB, c: newValC });

    const a = parseFloat(newValA);
    const b = parseFloat(newValB);
    const c = parseFloat(newValC);

    let res = null;
    if (formulaType === 'sum_div') {
      if (!isNaN(a) && !isNaN(c) && c !== 0) {
        const sum = a + (isNaN(b) ? 0 : b);
        res = ((sum / c) * 100).toFixed(1);
      }
    } else {
      if (!isNaN(a) && !isNaN(c) && c !== 0) {
        res = ((a / c) * 100).toFixed(1);
      }
    }

    if (res !== null) {
      setFormData(prev => {
        const next = { ...prev, vanityValNum: res };
        const lastHist = historyList.length > 0 ? historyList[historyList.length - 1] : null;
        const prevVStr = parsePureNumber(lastHist?.vanity_val || kpiItem?.vanityVal);
        const calcV = autoCalculateDiff(res, prevVStr);
        if (calcV) { next.vanityChangeDir = calcV.dir; next.vanityChangeNum = calcV.num; }
        return next;
      });
    }
  };

  const updateCalcLine2 = (newValA, newValB, newValC, formulaType) => {
    setCalcLine2({ a: newValA, b: newValB, c: newValC });

    const a = parseFloat(newValA);
    const b = parseFloat(newValB);
    const c = parseFloat(newValC);

    let res = null;
    if (formulaType === 'sum_div') {
      if (!isNaN(a) && !isNaN(c) && c !== 0) {
        const sum = a + (isNaN(b) ? 0 : b);
        res = ((sum / c) * 100).toFixed(1);
      }
    } else {
      if (!isNaN(a) && !isNaN(c) && c !== 0) {
        res = ((a / c) * 100).toFixed(1);
      }
    }

    if (res !== null) {
      setFormData(prev => {
        const next = { ...prev, furnitureValNum: res };
        const lastHist = historyList.length > 0 ? historyList[historyList.length - 1] : null;
        const prevFStr = parsePureNumber(lastHist?.furniture_val || kpiItem?.furnitureVal);
        const calcF = autoCalculateDiff(res, prevFStr);
        if (calcF) { next.furnitureChangeDir = calcF.dir; next.furnitureChangeNum = calcF.num; }
        return next;
      });
    }
  };

  // Tải danh mục Master Categories từ backend để phân loại Dòng hàng chính -> Dòng hàng
  useEffect(() => {
    if (isOpen) {
      api.get('/master-categories/')
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          setCategories(list);
        })
        .catch(err => console.error('[CustomKPIModal] Fetch categories error:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (kpiItem && isOpen) {
      const vValNum = parsePureNumber(kpiItem.vanityVal);
      const vChange = parseChangeDetail(kpiItem.vanityChange);

      const fValNum = parsePureNumber(kpiItem.furnitureVal);
      const fChange = parseChangeDetail(kpiItem.furnitureChange);

      const kKey = kpiItem.kpiKey || (
        kpiItem.id === 1 ? 'claim_rate' :
        kpiItem.id === 2 ? 'fpy_rate' :
        kpiItem.id === 3 ? 'efficiency' :
        kpiItem.id === 4 ? 'capa_rate' :
        kpiItem.id === 5 ? 'training_rate' : 'leave_rate'
      );
      const defaultForm = DEFAULT_FORMULAS[kKey] || '';

      const currentMonth = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

      // Khi mở Modal: luôn tạo Form tính toán mới sạch sẽ (empty) để sẵn sàng nhập liệu cho kỳ mới
      setCalcLine1({ a: '', b: '', c: '' });
      setCalcLine2({ a: '', b: '', c: '' });
      setLineValues({});

      setFormData({
        title: kpiItem.title || '',
        targetText: kpiItem.targetText || '',
        formulaText: kpiItem.formulaText || kpiItem.formula_text || defaultForm,
        vanityMainCat: kpiItem.vanityMainCat || (DEFAULT_PRODUCT_LINES.Furniture.includes(kpiItem.vanityLabel) ? 'Furniture' : 'Vanity'),
        vanityLabel: kpiItem.vanityLabel || 'Vanity',
        vanityValNum: '',
        vanityChangeDir: '▼',
        vanityChangeNum: '',
        furnitureMainCat: kpiItem.furnitureMainCat || (DEFAULT_PRODUCT_LINES.Vanity.includes(kpiItem.furnitureLabel) ? 'Vanity' : 'Furniture'),
        furnitureLabel: kpiItem.furnitureLabel || 'Furniture',
        furnitureValNum: '',
        furnitureChangeDir: '▼',
        furnitureChangeNum: '',
        scoreAvg: '',
        targetMonth: currentMonth
      });

      // Gán lịch sử ban đầu nếu có sẵn trong kpiItem (chỉ dùng hiển thị bảng lịch sử bên dưới)
      let initialHist = [];
      const rawHist = kpiItem.history_json || kpiItem.history;
      if (rawHist) {
        if (Array.isArray(rawHist)) {
          initialHist = rawHist;
        } else if (typeof rawHist === 'string') {
          try { initialHist = JSON.parse(rawHist); } catch (e) { initialHist = []; }
        }
      }
      setHistoryList(initialHist);
      setError('');

      // Truy vấn API /inspections/kpi-targets để lấy lịch sử mới nhất từ CSDL cho bảng danh sách bên dưới
      api.get('/inspections/kpi-targets')
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          const targetObj = list.find(t => t.kpi_key === kKey);
          if (targetObj) {
            let freshHist = [];
            if (targetObj.history_json) {
              if (Array.isArray(targetObj.history_json)) {
                freshHist = targetObj.history_json;
              } else if (typeof targetObj.history_json === 'string') {
                try { freshHist = JSON.parse(targetObj.history_json); } catch (e) { freshHist = []; }
              }
            }
            setHistoryList(freshHist);

            // Tự động khởi tạo danh sách dòng hàng active cho form Thêm mới từ bản ghi gần nhất có dòng hàng hoặc mặc định
            const latestHistWithLines = freshHist.slice().reverse().find(h => {
              if (!h.line_values) return false;
              const lv = typeof h.line_values === 'string' ? JSON.parse(h.line_values || '{}') : h.line_values;
              return lv && typeof lv === 'object' && Object.keys(lv).length > 0;
            });
            if (latestHistWithLines && latestHistWithLines.line_values) {
              let lVals = latestHistWithLines.line_values;
              if (typeof lVals === 'string') {
                try { lVals = JSON.parse(lVals); } catch (e) { lVals = {}; }
              }
              const lKeys = Object.keys(lVals);
              const vSubList = getSubCategoriesForMain(formData.vanityMainCat || 'Vanity');
              const fSubList = getSubCategoriesForMain(formData.furnitureMainCat || 'Furniture');
              const vActive = lKeys.filter(k => vSubList.includes(k));
              const fActive = lKeys.filter(k => fSubList.includes(k));
              if (vActive.length > 0) setActiveVanityLines(vActive);
              if (fActive.length > 0) setActiveFurnitureLines(fActive);
            } else {
              const defaultV = formData.vanityLabel || 'Vanity';
              const defaultF = formData.furnitureLabel || 'Furniture';
              setActiveVanityLines(prev => prev.length === 0 ? [defaultV] : prev);
              setActiveFurnitureLines(prev => prev.length === 0 ? [defaultF] : prev);
            }

            if (targetObj.formula_text) {
              setFormData(prev => ({ ...prev, formulaText: targetObj.formula_text }));
            }
          }
        })
        .catch(err => console.error('[CustomKPIModal] Fetch latest kpi targets error:', err));
    }
  }, [kpiItem, isOpen]);

  if (!isOpen || !kpiItem) return null;

  const vanitySubOptions = getSubCategoriesForMain(formData.vanityMainCat);
  const furnitureSubOptions = getSubCategoriesForMain(formData.furnitureMainCat);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // Khi nhập Giá trị Dòng 1, tự động tính Chênh lệch Dòng 1 so với kỳ trước
      if (name === 'vanityValNum') {
        const lastHist = historyList.length > 0 ? historyList[historyList.length - 1] : null;
        const prevValStr = parsePureNumber(lastHist?.vanity_val || kpiItem?.vanityVal);
        const calculated = autoCalculateDiff(value, prevValStr);
        if (calculated) {
          next.vanityChangeDir = calculated.dir;
          next.vanityChangeNum = calculated.num;
        }
      }

      // Khi nhập Giá trị Dòng 2, tự động tính Chênh lệch Dòng 2 so với kỳ trước
      if (name === 'furnitureValNum') {
        const lastHist = historyList.length > 0 ? historyList[historyList.length - 1] : null;
        const prevValStr = parsePureNumber(lastHist?.furniture_val || kpiItem?.furnitureVal);
        const calculated = autoCalculateDiff(value, prevValStr);
        if (calculated) {
          next.furnitureChangeDir = calculated.dir;
          next.furnitureChangeNum = calculated.num;
        }
      }

      // Khi thay đổi Dòng hàng chính 1, tự động chọn dòng hàng 1 hợp lệ
      if (name === 'vanityMainCat') {
        const subs = getSubCategoriesForMain(value);
        if (subs.length > 0 && !subs.includes(prev.vanityLabel)) {
          next.vanityLabel = subs[0];
        }
      }

      // Khi thay đổi Dòng hàng chính 2, tự động chọn dòng hàng 2 hợp lệ
      if (name === 'furnitureMainCat') {
        const subs = getSubCategoriesForMain(value);
        if (subs.length > 0 && !subs.includes(prev.furnitureLabel)) {
          next.furnitureLabel = subs[0];
        }
      }

      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // RÀNG BUỘC VALIDATE SỐ LIỆU: Phải > 0 và <= 100
    if (formData.vanityValNum !== '') {
      const val = parseFloat(formData.vanityValNum);
      if (isNaN(val) || val <= 0 || val > 100) {
        setError(`Giá trị ${formData.vanityLabel || 'Dòng 1'} phải lớn hơn 0 và nhỏ hơn hoặc bằng 100%`);
        return;
      }
    }

    if (formData.furnitureValNum !== '') {
      const val = parseFloat(formData.furnitureValNum);
      if (isNaN(val) || val <= 0 || val > 100) {
        setError(`Giá trị ${formData.furnitureLabel || 'Dòng 2'} phải lớn hơn 0 và nhỏ hơn hoặc bằng 100%`);
        return;
      }
    }

    if (formData.scoreAvg !== '') {
      const score = parseFloat(formData.scoreAvg);
      if (isNaN(score) || score < 0 || score > 100) {
        setError('Điểm đánh giá Radar phải nằm trong khoảng từ 0 đến 100%');
        return;
      }
    }

    // Kiểm tra xem Dòng Vanity và Dòng Furniture có dữ liệu tính toán nào chưa
    const hasVanityData = activeVanityLines.some(name => {
      const d = lineValues[name];
      return d && (d.a !== '' || d.valNum !== '');
    });
    const hasFurnitureData = activeFurnitureLines.some(name => {
      const d = lineValues[name];
      return d && (d.a !== '' || d.valNum !== '');
    });

    let reminder = '';
    if (!hasVanityData && !hasFurnitureData) {
      reminder = 'Cả Dòng hàng chính Vanity và Furniture đều chưa được nhập số liệu tính toán.';
    } else if (!hasVanityData) {
      reminder = `Dòng hàng chính "${formData.vanityMainCat || 'Vanity'}" chưa được nhập số liệu tính toán nào.`;
    } else if (!hasFurnitureData) {
      reminder = `Dòng hàng chính "${formData.furnitureMainCat || 'Furniture'}" chưa được nhập số liệu tính toán nào.`;
    }
    setMissingCategoryReminder(reminder);

    // Mở Modal Xác Nhận Lưu
    setShowConfirmSave(true);
  };

  const executeSave = async () => {
    setSaving(true);
    setError('');

    try {
      const kpiKey = kpiItem.kpiKey || (
        kpiItem.id === 1 ? 'claim_rate' :
        kpiItem.id === 2 ? 'fpy_rate' :
        kpiItem.id === 3 ? 'efficiency' :
        kpiItem.id === 4 ? 'capa_rate' :
        kpiItem.id === 5 ? 'training_rate' : 'leave_rate'
      );

      const formatDecimal = (valStr) => {
        if (valStr === '' || valStr === null || valStr === undefined) return '';
        const parsed = parseFloat(valStr);
        return isNaN(parsed) ? '' : parsed.toFixed(1);
      };

      const formattedVanityVal = formData.vanityValNum !== '' ? `${formatDecimal(formData.vanityValNum)}%` : '';
      const formattedVanityChange = formData.vanityChangeNum !== '' ? `${formData.vanityChangeDir} ${formatDecimal(formData.vanityChangeNum)}%` : '';

      const formattedFurnitureVal = formData.furnitureValNum !== '' ? `${formatDecimal(formData.furnitureValNum)}%` : '';
      const formattedFurnitureChange = formData.furnitureChangeNum !== '' ? `${formData.furnitureChangeDir} ${formatDecimal(formData.furnitureChangeNum)}%` : '';

      // Lọc sạch line_values chỉ lưu các dòng active và có dữ liệu
      const cleanedLineValues = {};
      [...activeVanityLines, ...activeFurnitureLines].forEach(lineName => {
        if (lineValues[lineName]) {
          cleanedLineValues[lineName] = lineValues[lineName];
        }
      });

      const payload = {
        title: formData.title,
        target_text: formData.targetText,
        formula_text: formData.formulaText,
        month: formData.targetMonth,
        vanity_label: formData.vanityLabel,
        vanity_val: formattedVanityVal,
        vanity_change: formattedVanityChange,
        furniture_label: formData.furnitureLabel,
        furniture_val: formattedFurnitureVal,
        furniture_change: formattedFurnitureChange,
        score_avg: formData.scoreAvg !== '' ? parseFloat(formData.scoreAvg) : null,
        line_values: cleanedLineValues
      };

      const res = await api.put(`/inspections/kpi-targets/${kpiKey}`, payload);
      if (res && (res.success || res.data)) {
        setShowConfirmSave(false);
        setSuccessMessage(`Lưu cập nhật chỉ số KPI "${formData.title}" thành công!`);

        // Xóa sạch dữ liệu form nhập liệu sau khi lưu
        resetFormInputs();

        if (onSaveSuccess) onSaveSuccess(res.data);

        // Tự động đóng Modal sau 1.2 giây để người dùng kịp đọc thông báo thành công
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1200);
      } else {
        setShowConfirmSave(false);
        setError(res?.detail || 'Không thể lưu cấu hình KPI');
      }
    } catch (err) {
      console.error('[CustomKPIModal] Error saving KPI target:', err);
      setShowConfirmSave(false);
      setError(err?.response?.data?.detail || err?.message || 'Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(30, 24, 18, 0.55)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        backgroundColor: '#FFFDFC',
        borderRadius: '14px',
        width: '860px',
        maxWidth: '96vw',
        maxHeight: '92vh',
        border: '1px solid #E4DDD5',
        boxShadow: '0 12px 36px rgba(91, 57, 36, 0.22)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#5B3924',
          color: '#FFFDFC',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', letterSpacing: '0.2px' }}>
              Tùy chỉnh Chỉ số KPI: {kpiItem.title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFDFC',
              fontSize: '1.3rem',
              cursor: 'pointer',
              opacity: 0.85,
              padding: '0 4px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              backgroundColor: '#FAF5F0',
              color: '#70452D',
              border: '1px solid #D5C9BD',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '700'
            }}>
              {error}
            </div>
          )}

          {/* Tên chỉ số KPI & Kỳ đánh giá */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#5B3924', marginBottom: '4px' }}>
                Tên chỉ số KPI *
              </label>
              <input 
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="VD: Tỷ lệ Claim KH"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D5C9BD',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#5B3924', marginBottom: '4px' }}>
                Kỳ/Tháng tính toán
              </label>
              <input 
                type="text"
                name="targetMonth"
                value={formData.targetMonth}
                onChange={handleChange}
                placeholder="VD: Tháng 09/2026"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D5C9BD',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Mục tiêu Target */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#5B3924', marginBottom: '4px' }}>
              Mục tiêu năm 2026 (Target)
            </label>
            <input 
              type="text"
              name="targetText"
              value={formData.targetText}
              onChange={handleChange}
              placeholder="VD: < 0.50% hoặc >= 98%"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D5C9BD',
                fontSize: '0.85rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô NHẬP CÔNG THỨC TÍNH (Phương pháp đo lường) */}
          <div style={{ backgroundColor: '#F4EFEA', padding: '10px 12px', borderRadius: '8px', border: '1px solid #DFD5CB' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#5B3924', marginBottom: '4px' }}>
              Phương pháp đo lường (Công thức tính)
            </label>
            <textarea 
              name="formulaText"
              value={formData.formulaText}
              onChange={handleChange}
              placeholder="VD: (Tổng cont final đạt + cont Final fail (xử lý 24h)) / Tổng số cont final * 100"
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #C59B73',
                fontSize: '0.82rem',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                resize: 'vertical',
                color: '#2D1A12',
                fontWeight: '600'
              }}
            />
          </div>

          {/* TAB CHỌN DÒNG HÀNG CHÍNH */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', borderBottom: '2px solid #DFD5CB' }}>
              <button
                type="button"
                onClick={() => setActiveLineTab('line1')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: activeLineTab === 'line1' ? '1px solid #DFD5CB' : '1px solid #EAE3DC',
                  borderBottom: activeLineTab === 'line1' ? '3px solid #70452D' : '1px solid transparent',
                  backgroundColor: activeLineTab === 'line1' ? '#FFFFFF' : '#F7F3EE',
                  color: activeLineTab === 'line1' ? '#5B3924' : '#8C6547',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: activeLineTab === 'line1' ? '0 -2px 6px rgba(91, 57, 36, 0.05)' : 'none'
                }}
              >
                <span>Dòng hàng chính: {formData.vanityMainCat || 'Vanity'}</span>
                <span style={{
                  fontSize: '0.7rem',
                  backgroundColor: activeLineTab === 'line1' ? '#EFE8E1' : '#ECE5DE',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  color: activeLineTab === 'line1' ? '#5B3924' : '#8C6547',
                  border: activeLineTab === 'line1' ? '1px solid #DFD5CB' : '1px solid transparent',
                  fontWeight: '700'
                }}>
                  ({activeVanityLines.length} Dòng hàng)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLineTab('line2')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: activeLineTab === 'line2' ? '1px solid #DFD5CB' : '1px solid #EAE3DC',
                  borderBottom: activeLineTab === 'line2' ? '3px solid #70452D' : '1px solid transparent',
                  backgroundColor: activeLineTab === 'line2' ? '#FFFFFF' : '#F7F3EE',
                  color: activeLineTab === 'line2' ? '#5B3924' : '#8C6547',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: activeLineTab === 'line2' ? '0 -2px 6px rgba(91, 57, 36, 0.05)' : 'none'
                }}
              >
                <span>Dòng hàng chính: {formData.furnitureMainCat || 'Furniture'}</span>
                <span style={{
                  fontSize: '0.7rem',
                  backgroundColor: activeLineTab === 'line2' ? '#EFE8E1' : '#ECE5DE',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  color: activeLineTab === 'line2' ? '#5B3924' : '#8C6547',
                  border: activeLineTab === 'line2' ? '1px solid #DFD5CB' : '1px solid transparent',
                  fontWeight: '700'
                }}>
                  ({activeFurnitureLines.length} Dòng hàng)
                </span>
              </button>
            </div>

            {/* CONTENT TAB 1: VANITY */}
            {activeLineTab === 'line1' && (
              <div style={{ backgroundColor: '#FAF7F4', padding: '10px 12px', borderRadius: '10px', border: '1px solid #DFD5CB', maxHeight: '340px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#5B3924', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Dòng hàng thuộc {formData.vanityMainCat || 'Vanity'} ({activeVanityLines.length}/{vanitySubOptions.length}):</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {vanitySubOptions.filter(l => !activeVanityLines.includes(l)).length > 0 && (
                      <select
                        onChange={(e) => {
                          handleAddSubLine('vanity', e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #C59B73',
                          backgroundColor: '#F5EFEA',
                          color: '#5B3924',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="" disabled>Thêm dòng hàng...</option>
                        {vanitySubOptions.filter(l => !activeVanityLines.includes(l)).map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    )}
                    <span style={{ fontSize: '0.65rem', color: '#70452D', backgroundColor: '#EFE8E1', border: '1px solid #DFD5CB', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      Dòng k nhập sẽ tự bỏ qua
                    </span>
                  </div>
                </div>

                {activeVanityLines.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#8C6547', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    Chưa chọn dòng hàng nào. Chọn dòng hàng ở menu <strong>Thêm dòng hàng</strong> phía trên để nhập số liệu.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeVanityLines.map((lineName) => {
                      const lineData = lineValues[lineName] || { valNum: '', changeDir: '▼', changeNum: '', a: '', b: '', c: '' };
                      const parsedForm = parseFormulaVariables(formData.formulaText);
                      const a = parseFloat(lineData.a);
                      const b = parseFloat(lineData.b);
                      const c = parseFloat(lineData.c);

                      let calcResultText = '--- %';
                      if (parsedForm.type === 'sum_div') {
                        if (!isNaN(a) && !isNaN(c) && c !== 0) {
                          const sum = a + (isNaN(b) ? 0 : b);
                          calcResultText = `${((sum / c) * 100).toFixed(1)}%`;
                        }
                      } else {
                        if (!isNaN(a) && !isNaN(c) && c !== 0) {
                          calcResultText = `${((a / c) * 100).toFixed(1)}%`;
                        }
                      }

                      const isFilled = lineData.valNum !== '' || lineData.a !== '' || lineData.c !== '';

                      return (
                        <div
                          key={lineName}
                          style={{
                            backgroundColor: isFilled ? '#FFFFFF' : '#FAF7F4',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: isFilled ? '1.5px solid #8C6547' : '1px solid #EAE3DC',
                            boxShadow: isFilled ? '0 1px 4px rgba(91, 57, 36, 0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 105px 135px 28px', gap: '6px', alignItems: 'center' }}>
                            {/* Tên Dòng hàng */}
                            <div>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 6px 4px 8px',
                                backgroundColor: isFilled ? '#F5EFEA' : '#FFF',
                                color: '#5B3924',
                                border: isFilled ? '1px solid #C59B73' : '1px solid #D5C9BD',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: '800',
                                width: '100%',
                                textAlign: 'left',
                                boxSizing: 'border-box'
                              }}>
                                {lineName}
                              </span>
                            </div>

                            {/* Bộ nhập Tử số / Mẫu số */}
                            <div style={{ backgroundColor: '#FFFDFC', padding: '3px 6px', borderRadius: '6px', border: '1px solid #D5C9BD' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <input
                                  type="number"
                                  step="any"
                                  value={lineData.a}
                                  onChange={(e) => handleLineInputChange('vanity', lineName, 'a', e.target.value, parsedForm.type)}
                                  placeholder={parsedForm.varA || 'Tử số'}
                                  title={parsedForm.varA}
                                  style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                />
                                {parsedForm.type === 'sum_div' && (
                                  <>
                                    <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>+</span>
                                    <input
                                      type="number"
                                      step="any"
                                      value={lineData.b}
                                      onChange={(e) => handleLineInputChange('vanity', lineName, 'b', e.target.value, 'sum_div')}
                                      placeholder={parsedForm.varB || 'Biến B'}
                                      title={parsedForm.varB}
                                      style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                    />
                                  </>
                                )}
                                <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>/</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={lineData.c}
                                  onChange={(e) => handleLineInputChange('vanity', lineName, 'c', e.target.value, parsedForm.type)}
                                  placeholder={parsedForm.varC || 'Mẫu số'}
                                  title={parsedForm.varC}
                                  style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>=</span>
                                <div style={{ padding: '2px 4px', backgroundColor: '#F5EFEA', border: '1px solid #C59B73', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#5B3924', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
                                  {calcResultText}
                                </div>
                              </div>
                            </div>

                            {/* Giá trị % */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                value={lineData.valNum}
                                onChange={(e) => handleLineInputChange('vanity', lineName, 'valNum', e.target.value)}
                                placeholder="Giá trị"
                                style={{
                                  width: '100%',
                                  padding: '5px 18px 5px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #D5C9BD',
                                  fontSize: '0.78rem',
                                  fontWeight: '700',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <span style={{ position: 'absolute', right: '4px', fontSize: '0.72rem', fontWeight: '800', color: '#70452D' }}>%</span>
                            </div>

                            {/* Chênh lệch % */}
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <select
                                value={lineData.changeDir}
                                onChange={(e) => handleLineInputChange('vanity', lineName, 'changeDir', e.target.value)}
                                style={{
                                  padding: '5px 2px',
                                  borderRadius: '6px',
                                  border: '1px solid #D5C9BD',
                                  fontSize: '0.78rem',
                                  fontWeight: '800',
                                  color: lineData.changeDir === '▲' ? '#3F7D58' : '#8C5332',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="▲">▲</option>
                                <option value="▼">▼</option>
                              </select>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  max="100"
                                  value={lineData.changeNum}
                                  onChange={(e) => handleLineInputChange('vanity', lineName, 'changeNum', e.target.value)}
                                  placeholder="Lệch"
                                  style={{
                                    width: '100%',
                                    padding: '5px 16px 5px 4px',
                                    borderRadius: '6px',
                                    border: '1px solid #D5C9BD',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    boxSizing: 'border-box'
                                  }}
                                />
                                <span style={{ position: 'absolute', right: '3px', fontSize: '0.7rem', fontWeight: '800', color: '#70452D' }}>%</span>
                              </div>
                            </div>

                            {/* Nút Xóa Dòng */}
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubLine('vanity', lineName)}
                                title="Xóa dòng này"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#8C6547',
                                  fontSize: '1rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  lineHeight: 1,
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#5B3924'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#8C6547'}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CONTENT TAB 2: FURNITURE */}
            {activeLineTab === 'line2' && (
              <div style={{ backgroundColor: '#FAF7F4', padding: '10px 12px', borderRadius: '10px', border: '1px solid #DFD5CB', maxHeight: '340px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#5B3924', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Dòng hàng thuộc {formData.furnitureMainCat || 'Furniture'} ({activeFurnitureLines.length}/{furnitureSubOptions.length}):</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {furnitureSubOptions.filter(l => !activeFurnitureLines.includes(l)).length > 0 && (
                      <select
                        onChange={(e) => {
                          handleAddSubLine('furniture', e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #C59B73',
                          backgroundColor: '#F5EFEA',
                          color: '#5B3924',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="" disabled>Thêm dòng hàng...</option>
                        {furnitureSubOptions.filter(l => !activeFurnitureLines.includes(l)).map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    )}
                    <span style={{ fontSize: '0.65rem', color: '#70452D', backgroundColor: '#EFE8E1', border: '1px solid #DFD5CB', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      Dòng k nhập sẽ tự bỏ qua
                    </span>
                  </div>
                </div>

                {activeFurnitureLines.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#8C6547', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    Chưa chọn dòng hàng nào. Chọn dòng hàng ở menu <strong>Thêm dòng hàng</strong> phía trên để nhập số liệu.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeFurnitureLines.map((lineName) => {
                      const lineData = lineValues[lineName] || { valNum: '', changeDir: '▼', changeNum: '', a: '', b: '', c: '' };
                      const parsedForm = parseFormulaVariables(formData.formulaText);
                      const a = parseFloat(lineData.a);
                      const b = parseFloat(lineData.b);
                      const c = parseFloat(lineData.c);

                      let calcResultText = '--- %';
                      if (parsedForm.type === 'sum_div') {
                        if (!isNaN(a) && !isNaN(c) && c !== 0) {
                          const sum = a + (isNaN(b) ? 0 : b);
                          calcResultText = `${((sum / c) * 100).toFixed(1)}%`;
                        }
                      } else {
                        if (!isNaN(a) && !isNaN(c) && c !== 0) {
                          calcResultText = `${((a / c) * 100).toFixed(1)}%`;
                        }
                      }

                      const isFilled = lineData.valNum !== '' || lineData.a !== '' || lineData.c !== '';

                      return (
                        <div
                          key={lineName}
                          style={{
                            backgroundColor: isFilled ? '#FFFFFF' : '#FAF7F4',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: isFilled ? '1.5px solid #8C6547' : '1px solid #EAE3DC',
                            boxShadow: isFilled ? '0 1px 4px rgba(91, 57, 36, 0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 105px 135px 28px', gap: '6px', alignItems: 'center' }}>
                            {/* Tên Dòng hàng */}
                            <div>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 6px 4px 8px',
                                backgroundColor: isFilled ? '#F5EFEA' : '#FFF',
                                color: '#5B3924',
                                border: isFilled ? '1px solid #C59B73' : '1px solid #D5C9BD',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: '800',
                                width: '100%',
                                textAlign: 'left',
                                boxSizing: 'border-box'
                              }}>
                                {lineName}
                              </span>
                            </div>

                            {/* Bộ nhập Tử số / Mẫu số */}
                            <div style={{ backgroundColor: '#FFFDFC', padding: '3px 6px', borderRadius: '6px', border: '1px solid #D5C9BD' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <input
                                  type="number"
                                  step="any"
                                  value={lineData.a}
                                  onChange={(e) => handleLineInputChange('furniture', lineName, 'a', e.target.value, parsedForm.type)}
                                  placeholder={parsedForm.varA || 'Tử số'}
                                  title={parsedForm.varA}
                                  style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                />
                                {parsedForm.type === 'sum_div' && (
                                  <>
                                    <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>+</span>
                                    <input
                                      type="number"
                                      step="any"
                                      value={lineData.b}
                                      onChange={(e) => handleLineInputChange('furniture', lineName, 'b', e.target.value, 'sum_div')}
                                      placeholder={parsedForm.varB || 'Biến B'}
                                      title={parsedForm.varB}
                                      style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                    />
                                  </>
                                )}
                                <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>/</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={lineData.c}
                                  onChange={(e) => handleLineInputChange('furniture', lineName, 'c', e.target.value, parsedForm.type)}
                                  placeholder={parsedForm.varC || 'Mẫu số'}
                                  title={parsedForm.varC}
                                  style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>=</span>
                                <div style={{ padding: '2px 4px', backgroundColor: '#F5EFEA', border: '1px solid #C59B73', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#5B3924', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
                                  {calcResultText}
                                </div>
                              </div>
                            </div>

                            {/* Giá trị % */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                value={lineData.valNum}
                                onChange={(e) => handleLineInputChange('furniture', lineName, 'valNum', e.target.value)}
                                placeholder="Giá trị"
                                style={{
                                  width: '100%',
                                  padding: '5px 18px 5px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #D5C9BD',
                                  fontSize: '0.78rem',
                                  fontWeight: '700',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <span style={{ position: 'absolute', right: '4px', fontSize: '0.72rem', fontWeight: '800', color: '#70452D' }}>%</span>
                            </div>

                            {/* Chênh lệch % */}
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <select
                                value={lineData.changeDir}
                                onChange={(e) => handleLineInputChange('furniture', lineName, 'changeDir', e.target.value)}
                                style={{
                                  padding: '5px 2px',
                                  borderRadius: '6px',
                                  border: '1px solid #D5C9BD',
                                  fontSize: '0.78rem',
                                  fontWeight: '800',
                                  color: lineData.changeDir === '▲' ? '#3F7D58' : '#8C5332',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="▲">▲</option>
                                <option value="▼">▼</option>
                              </select>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  max="100"
                                  value={lineData.changeNum}
                                  onChange={(e) => handleLineInputChange('furniture', lineName, 'changeNum', e.target.value)}
                                  placeholder="Lệch"
                                  style={{
                                    width: '100%',
                                    padding: '5px 16px 5px 4px',
                                    borderRadius: '6px',
                                    border: '1px solid #D5C9BD',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    boxSizing: 'border-box'
                                  }}
                                />
                                <span style={{ position: 'absolute', right: '3px', fontSize: '0.7rem', fontWeight: '800', color: '#70452D' }}>%</span>
                              </div>
                            </div>

                            {/* Nút Xóa Dòng */}
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubLine('furniture', lineName)}
                                title="Xóa dòng này"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#8C6547',
                                  fontSize: '1rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  lineHeight: 1,
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#5B3924'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#8C6547'}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Điểm đánh giá (Score) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#5B3924', marginBottom: '4px' }}>
              Điểm đánh giá Radar (%)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="number"
                step="0.1"
                min="0"
                max="100"
                name="scoreAvg"
                value={formData.scoreAvg}
                onChange={handleChange}
                placeholder="VD: 95.0"
                style={{
                  width: '100%',
                  padding: '8px 28px 8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D5C9BD',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', right: '12px', fontSize: '0.85rem', fontWeight: '800', color: '#5B3924' }}>%</span>
            </div>
          </div>

          {/* BẢNG LỊCH SỬ CÁC LẦN THÊM / CẬP NHẬT QUA CÁC THÁNG */}
          <div style={{ marginTop: '8px', border: '1px solid #E4DDD5', borderRadius: '8px', padding: '10px', backgroundColor: '#FAF8F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: '800', color: '#5B3924', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Lịch sử cập nhật & biến động qua từng tháng
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#70452D', fontWeight: '600' }}>
                ({historyList.length} lượt lưu)
              </span>
            </div>

            {historyList.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#8C6547', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                Chưa có lịch sử cập nhật nào được ghi nhận.
              </div>
            ) : (
              <div style={{ maxHeight: '160px', overflowY: 'auto', borderRadius: '6px', border: '1px solid #DFD5CB' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', backgroundColor: '#FFFFFF' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FAF6F0', color: '#5B3924', borderBottom: '1px solid #EAE3DC' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '800' }}>Thời gian/Kỳ</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '800' }}>{formData.vanityLabel || 'Dòng 1'}</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '800' }}>{formData.furnitureLabel || 'Dòng 2'}</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '800' }}>Radar</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '800', width: '90px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.slice().reverse().map((h, idx) => {
                      const realIndex = historyList.length - 1 - idx;
                      return (
                        <tr 
                          key={h.id || idx} 
                          onClick={() => setViewingHistDetail(h)}
                          title="Bấm vào để xem chi tiết từng dòng hàng của tháng này"
                          style={{ 
                            borderBottom: '1px solid #EAE3DC', 
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F5EFEA';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ padding: '6px 8px', fontWeight: '700', color: '#5B3924' }}>
                            {h.month || h.created_at || `Lần ${historyList.length - idx}`}
                          </td>
                          <td style={{ padding: '6px 8px', color: '#332219', fontWeight: '700' }}>
                            {h.vanity_val} <span style={{ fontSize: '0.7rem', color: h.vanity_change?.includes('▲') ? '#3F7D58' : '#8C5332' }}>{h.vanity_change}</span>
                          </td>
                          <td style={{ padding: '6px 8px', color: '#332219', fontWeight: '700' }}>
                            {h.furniture_val} <span style={{ fontSize: '0.7rem', color: h.furniture_change?.includes('▲') ? '#3F7D58' : '#8C5332' }}>{h.furniture_change}</span>
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '800', color: '#5B3924' }}>
                            {h.score_avg ?? '---'}%
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setViewingHistDetail(h)}
                              style={{ border: '1px solid #D5C9BD', background: '#F5EFEA', color: '#5B3924', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', marginRight: '4px' }}
                              title="Xem chi tiết từng dòng hàng của tháng này"
                            >
                              Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditHistory(h, realIndex)}
                              style={{ border: '1px solid #C4B2A2', background: '#EFE8E1', color: '#70452D', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', marginRight: '4px' }}
                              title="Mở popup chỉnh sửa số liệu bản ghi này"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteHistory(h, realIndex)}
                              style={{ border: '1px solid #D5C9BD', background: '#F7F4F0', color: '#70452D', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700' }}
                              title="Xóa bản ghi lịch sử này"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '10px',
            paddingTop: '12px',
            borderTop: '1px solid #E4DDD5'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #D5C9BD',
                backgroundColor: '#F7F4F0',
                color: '#5B3924',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#5B3924',
                color: '#FFFDFC',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(91, 57, 36, 0.25)'
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>

      {/* POPUP CHI TIẾT SỐ LIỆU TỪNG DÒNG HÀNG CỦA THÁNG ĐƯỢC CHỌN */}
      {viewingHistDetail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(20, 15, 10, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            backgroundColor: '#FFFDFC',
            borderRadius: '14px',
            width: '680px',
            maxWidth: '92vw',
            maxHeight: '85vh',
            border: '2px solid #5B3924',
            boxShadow: '0 16px 40px rgba(91, 57, 36, 0.3)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ backgroundColor: '#5B3924', color: '#FFFDFC', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Chi tiết số liệu từng dòng hàng - {viewingHistDetail.month}</span>
              </h4>
              <button onClick={() => setViewingHistDetail(null)} style={{ background: 'none', border: 'none', color: '#FFFDFC', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Content */}
            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Metric Overview cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#FAF7F4', border: '1px solid #DFD5CB', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#70452D' }}>Dòng {viewingHistDetail.vanity_label || 'Vanity'}</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#5B3924' }}>{viewingHistDetail.vanity_val || '---'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: viewingHistDetail.vanity_change?.includes('▲') ? '#3F7D58' : '#8C5332' }}>{viewingHistDetail.vanity_change || ''}</div>
                </div>
                <div style={{ backgroundColor: '#FAF7F4', border: '1px solid #DFD5CB', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#70452D' }}>Dòng {viewingHistDetail.furniture_label || 'Furniture'}</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#5B3924' }}>{viewingHistDetail.furniture_val || '---'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: viewingHistDetail.furniture_change?.includes('▲') ? '#3F7D58' : '#8C5332' }}>{viewingHistDetail.furniture_change || ''}</div>
                </div>
                <div style={{ backgroundColor: '#FAF7F4', border: '1px solid #DFD5CB', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#70452D' }}>Đánh giá Radar</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#5B3924' }}>{viewingHistDetail.score_avg ?? '---'}%</div>
                </div>
              </div>

              {/* Breakdown table of sub-lines */}
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: '800', color: '#5B3924' }}>
                  Chi tiết thông số tính toán từng Dòng hàng nhỏ:
                </h5>

                {viewingHistDetail.line_values && Object.keys(viewingHistDetail.line_values).length > 0 ? (
                  <div style={{ borderRadius: '8px', border: '1px solid #DFD5CB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F7F4F0', color: '#5B3924', borderBottom: '1px solid #DFD5CB' }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '800' }}>Tên Dòng hàng</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '800' }}>Tử số / Mẫu số</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800' }}>Giá trị %</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800' }}>Biến động %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(viewingHistDetail.line_values).map(([lineName, lData], idx) => {
                          const hasVal = lData.valNum !== '' || lData.a !== '';
                          return (
                            <tr key={lineName} style={{ borderBottom: '1px solid #EAE3DC', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF7F4' }}>
                              <td style={{ padding: '6px 10px', fontWeight: '800', color: '#5B3924' }}>
                                {lineName}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', color: '#70452D' }}>
                                {lData.a !== '' ? `${lData.a} / ${lData.c}` : '---'}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: hasVal ? '#5B3924' : '#8C6547' }}>
                                {lData.valNum !== '' ? `${lData.valNum}%` : '---'}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: lData.changeDir === '▲' ? '#3F7D58' : '#8C5332' }}>
                                {lData.changeNum !== '' ? `${lData.changeDir} ${lData.changeNum}%` : '---'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#70452D', backgroundColor: '#FFFDFC', borderRadius: '8px', border: '1px dashed #D5C9BD', fontSize: '0.78rem' }}>
                    Bản ghi lịch sử này lưu kết quả tổng hợp của {viewingHistDetail.month}.
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '12px 18px', backgroundColor: '#FAF7F4', borderTop: '1px solid #DFD5CB', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setViewingHistDetail(null)}
                style={{ padding: '7px 18px', backgroundColor: '#F5EFEA', color: '#5B3924', border: '1px solid #D5C9BD', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP CHỈNH SỬA SỐ LIỆU LỊCH SỬ */}
      {editingHistRow && (() => {
        const vMainCat = editingHistRow.vanity_main_cat || getCategoryMainName(editingHistRow.vanity_label || formData.vanityLabel || formData.vanityMainCat, 'Vanity');
        const fMainCat = editingHistRow.furniture_main_cat || getCategoryMainName(editingHistRow.furniture_label || formData.furnitureLabel || formData.furnitureMainCat, 'Furniture');
        const editVanitySubs = getSubCategoriesForMain(vMainCat);
        const editFurnitureSubs = getSubCategoriesForMain(fMainCat);
        const activeVLines = editingHistRow.activeVanityLines || [];
        const activeFLines = editingHistRow.activeFurnitureLines || [];
        const parsedForm = parseFormulaVariables(formData.formulaText);

        return (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(20, 15, 10, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.15s ease'
          }}>
            <div style={{
              backgroundColor: '#FFFDFC',
              borderRadius: '14px',
              width: '800px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              border: '2px solid #5B3924',
              boxShadow: '0 16px 40px rgba(91, 57, 36, 0.35)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{ backgroundColor: '#5B3924', color: '#FFFDFC', padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Chỉnh sửa Bản ghi Lịch sử: {editingHistRow.month || ''}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingHistRow(null)}
                  style={{ background: 'none', border: 'none', color: '#FFFDFC', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Kỳ / Tháng ghi nhận */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#5B3924', marginBottom: '4px' }}>
                    Kỳ / Tháng ghi nhận *
                  </label>
                  <input
                    type="text"
                    value={editingHistRow.month || ''}
                    onChange={(e) => handleEditHistFieldChange('month', e.target.value)}
                    placeholder="VD: Tháng 09/2026"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D5C9BD',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Grid 2 Card Dòng Hàng Chính (Vanity & Furniture) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Dòng hàng chính 1 */}
                  <div style={{ backgroundColor: '#FAF7F4', border: '1px solid #DFD5CB', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#5B3924', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{vMainCat === (editingHistRow.vanity_label || 'Vanity') ? `Dòng hàng: ${vMainCat}` : `Dòng hàng: ${editingHistRow.vanity_label || 'Vanity'} (${vMainCat})`}</span>
                      <span style={{ fontSize: '0.7rem', color: '#70452D', backgroundColor: '#EFE8E1', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        {activeVLines.length} dòng con
                      </span>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#70452D', marginBottom: '3px' }}>
                        Giá trị (%)
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={editingHistRow.vanity_val_num ?? ''}
                          onChange={(e) => handleEditHistFieldChange('vanity_val_num', e.target.value)}
                          placeholder="VD: 8.3"
                          style={{
                            width: '100%',
                            padding: '7px 24px 7px 8px',
                            borderRadius: '6px',
                            border: '1px solid #C59B73',
                            fontSize: '0.84rem',
                            fontWeight: '700',
                            boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '8px', fontSize: '0.78rem', fontWeight: '800', color: '#70452D' }}>%</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#70452D', marginBottom: '3px' }}>
                        Biến động so với kỳ trước
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <select
                          value={editingHistRow.vanity_change_dir || '▼'}
                          onChange={(e) => handleEditHistFieldChange('vanity_change_dir', e.target.value)}
                          style={{
                            padding: '6px 6px',
                            borderRadius: '6px',
                            border: '1px solid #D5C9BD',
                            fontSize: '0.82rem',
                            fontWeight: '800',
                            color: editingHistRow.vanity_change_dir === '▲' ? '#3F7D58' : '#8C5332',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="▲">▲ Tăng</option>
                          <option value="▼">▼ Giảm</option>
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            value={editingHistRow.vanity_change_num ?? ''}
                            onChange={(e) => handleEditHistFieldChange('vanity_change_num', e.target.value)}
                            placeholder="Lệch"
                            style={{
                              width: '100%',
                              padding: '6px 20px 6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #D5C9BD',
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{ position: 'absolute', right: '6px', fontSize: '0.74rem', fontWeight: '800', color: '#70452D' }}>%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dòng hàng chính 2 */}
                  <div style={{ backgroundColor: '#FAF7F4', border: '1px solid #DFD5CB', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#5B3924', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{fMainCat === (editingHistRow.furniture_label || 'Furniture') ? `Dòng hàng: ${fMainCat}` : `Dòng hàng: ${editingHistRow.furniture_label || 'Furniture'} (${fMainCat})`}</span>
                      <span style={{ fontSize: '0.7rem', color: '#70452D', backgroundColor: '#EFE8E1', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        {activeFLines.length} dòng con
                      </span>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#70452D', marginBottom: '3px' }}>
                        Giá trị (%)
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={editingHistRow.furniture_val_num ?? ''}
                          onChange={(e) => handleEditHistFieldChange('furniture_val_num', e.target.value)}
                          placeholder="VD: 8.3"
                          style={{
                            width: '100%',
                            padding: '7px 24px 7px 8px',
                            borderRadius: '6px',
                            border: '1px solid #C59B73',
                            fontSize: '0.84rem',
                            fontWeight: '700',
                            boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '8px', fontSize: '0.78rem', fontWeight: '800', color: '#70452D' }}>%</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#70452D', marginBottom: '3px' }}>
                        Biến động so với kỳ trước
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <select
                          value={editingHistRow.furniture_change_dir || '▼'}
                          onChange={(e) => handleEditHistFieldChange('furniture_change_dir', e.target.value)}
                          style={{
                            padding: '6px 6px',
                            borderRadius: '6px',
                            border: '1px solid #D5C9BD',
                            fontSize: '0.82rem',
                            fontWeight: '800',
                            color: editingHistRow.furniture_change_dir === '▲' ? '#3F7D58' : '#8C5332',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="▲">▲ Tăng</option>
                          <option value="▼">▼ Giảm</option>
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            value={editingHistRow.furniture_change_num ?? ''}
                            onChange={(e) => handleEditHistFieldChange('furniture_change_num', e.target.value)}
                            placeholder="Lệch"
                            style={{
                              width: '100%',
                              padding: '6px 20px 6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #D5C9BD',
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{ position: 'absolute', right: '6px', fontSize: '0.74rem', fontWeight: '800', color: '#70452D' }}>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TABS DÒNG HÀNG CON: NHƯ FORM THÊM MỚI */}
                <div style={{ marginTop: '2px' }}>
                  {/* Tab Navigation */}
                  <div style={{ display: 'flex', borderBottom: '2px solid #D5C9BD', gap: '4px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleEditHistFieldChange('activeLineTab', 'line1')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: (editingHistRow.activeLineTab || 'line1') === 'line1' ? '1px solid #DFD5CB' : '1px solid #EAE3DC',
                        borderBottom: (editingHistRow.activeLineTab || 'line1') === 'line1' ? '3px solid #70452D' : '1px solid transparent',
                        backgroundColor: (editingHistRow.activeLineTab || 'line1') === 'line1' ? '#FFFFFF' : '#F7F3EE',
                        color: (editingHistRow.activeLineTab || 'line1') === 'line1' ? '#5B3924' : '#8C6547',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                        boxShadow: (editingHistRow.activeLineTab || 'line1') === 'line1' ? '0 -2px 6px rgba(91, 57, 36, 0.05)' : 'none'
                      }}
                    >
                      <span>Dòng hàng chính: {vMainCat}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        backgroundColor: (editingHistRow.activeLineTab || 'line1') === 'line1' ? '#EFE8E1' : '#ECE5DE',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        color: (editingHistRow.activeLineTab || 'line1') === 'line1' ? '#5B3924' : '#8C6547',
                        border: (editingHistRow.activeLineTab || 'line1') === 'line1' ? '1px solid #DFD5CB' : '1px solid transparent',
                        fontWeight: '700'
                      }}>
                        ({activeVLines.length} Dòng hàng)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditHistFieldChange('activeLineTab', 'line2')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: (editingHistRow.activeLineTab || 'line1') === 'line2' ? '1px solid #DFD5CB' : '1px solid #EAE3DC',
                        borderBottom: (editingHistRow.activeLineTab || 'line1') === 'line2' ? '3px solid #70452D' : '1px solid transparent',
                        backgroundColor: (editingHistRow.activeLineTab || 'line1') === 'line2' ? '#FFFFFF' : '#F7F3EE',
                        color: (editingHistRow.activeLineTab || 'line1') === 'line2' ? '#5B3924' : '#8C6547',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                        boxShadow: (editingHistRow.activeLineTab || 'line1') === 'line2' ? '0 -2px 6px rgba(91, 57, 36, 0.05)' : 'none'
                      }}
                    >
                      <span>Dòng hàng chính: {fMainCat}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        backgroundColor: (editingHistRow.activeLineTab || 'line1') === 'line2' ? '#EFE8E1' : '#ECE5DE',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        color: (editingHistRow.activeLineTab || 'line1') === 'line2' ? '#5B3924' : '#8C6547',
                        border: (editingHistRow.activeLineTab || 'line1') === 'line2' ? '1px solid #DFD5CB' : '1px solid transparent',
                        fontWeight: '700'
                      }}>
                        ({activeFLines.length} Dòng hàng)
                      </span>
                    </button>
                  </div>

                  {/* CONTENT TAB 1: VANITY SUB-LINES */}
                  {(editingHistRow.activeLineTab || 'line1') === 'line1' && (
                    <div style={{ backgroundColor: '#FAF7F4', padding: '10px 12px', borderRadius: '10px', border: '1px solid #DFD5CB', maxHeight: '300px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#5B3924', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Dòng hàng thuộc {vMainCat} ({activeVLines.length}/{editVanitySubs.length}):</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {editVanitySubs.filter(l => !activeVLines.includes(l)).length > 0 && (
                            <select
                              onChange={(e) => {
                                handleAddEditSubLine('vanity', e.target.value);
                                e.target.value = '';
                              }}
                              defaultValue=""
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #C59B73',
                                backgroundColor: '#F5EFEA',
                                color: '#5B3924',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="" disabled>Thêm dòng hàng...</option>
                              {editVanitySubs.filter(l => !activeVLines.includes(l)).map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                          )}
                          <span style={{ fontSize: '0.65rem', color: '#70452D', backgroundColor: '#EFE8E1', border: '1px solid #DFD5CB', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            Dòng k nhập sẽ tự bỏ qua
                          </span>
                        </div>
                      </div>

                      {activeVLines.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#8C6547', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          Chưa chọn dòng hàng nào. Chọn dòng hàng ở menu <strong>Thêm dòng hàng</strong> phía trên để nhập số liệu.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {activeVLines.map((lineName) => {
                            const lineData = editingHistRow.line_values?.[lineName] || { valNum: '', changeDir: '▼', changeNum: '', a: '', b: '', c: '' };
                            const a = parseFloat(lineData.a);
                            const b = parseFloat(lineData.b);
                            const c = parseFloat(lineData.c);

                            let calcResultText = '--- %';
                            if (parsedForm.type === 'sum_div') {
                              if (!isNaN(a) && !isNaN(c) && c !== 0) {
                                const sum = a + (isNaN(b) ? 0 : b);
                                calcResultText = `${((sum / c) * 100).toFixed(1)}%`;
                              }
                            } else {
                              if (!isNaN(a) && !isNaN(c) && c !== 0) {
                                calcResultText = `${((a / c) * 100).toFixed(1)}%`;
                              }
                            }

                            const isFilled = lineData.valNum !== '' || lineData.a !== '' || lineData.c !== '';

                            return (
                              <div
                                key={lineName}
                                style={{
                                  backgroundColor: isFilled ? '#FFFFFF' : '#FAF7F4',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: isFilled ? '1.5px solid #8C6547' : '1px solid #EAE3DC',
                                  boxShadow: isFilled ? '0 1px 4px rgba(91, 57, 36, 0.08)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 105px 135px 28px', gap: '6px', alignItems: 'center' }}>
                                  {/* Tên Dòng hàng */}
                                  <div>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 6px 4px 8px',
                                      backgroundColor: isFilled ? '#F5EFEA' : '#FFF',
                                      color: '#5B3924',
                                      border: isFilled ? '1px solid #C59B73' : '1px solid #D5C9BD',
                                      borderRadius: '6px',
                                      fontSize: '0.78rem',
                                      fontWeight: '800',
                                      width: '100%',
                                      textAlign: 'left',
                                      boxSizing: 'border-box'
                                    }}>
                                      {lineName}
                                    </span>
                                  </div>

                                  {/* Bộ nhập Tử số / Mẫu số */}
                                  <div style={{ backgroundColor: '#FFFDFC', padding: '3px 6px', borderRadius: '6px', border: '1px solid #D5C9BD' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <input
                                        type="number"
                                        step="any"
                                        value={lineData.a ?? ''}
                                        onChange={(e) => handleEditHistLineInputChange('vanity', lineName, 'a', e.target.value, parsedForm.type)}
                                        placeholder={parsedForm.varA || 'Tử số'}
                                        title={parsedForm.varA}
                                        style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                      />
                                      {parsedForm.type === 'sum_div' && (
                                        <>
                                          <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>+</span>
                                          <input
                                            type="number"
                                            step="any"
                                            value={lineData.b ?? ''}
                                            onChange={(e) => handleEditHistLineInputChange('vanity', lineName, 'b', e.target.value, 'sum_div')}
                                            placeholder={parsedForm.varB || 'Biến B'}
                                            title={parsedForm.varB}
                                            style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                          />
                                        </>
                                      )}
                                      <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>/</span>
                                      <input
                                        type="number"
                                        step="any"
                                        value={lineData.c ?? ''}
                                        onChange={(e) => handleEditHistLineInputChange('vanity', lineName, 'c', e.target.value, parsedForm.type)}
                                        placeholder={parsedForm.varC || 'Mẫu số'}
                                        title={parsedForm.varC}
                                        style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                      />
                                      <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>=</span>
                                      <div style={{ padding: '2px 4px', backgroundColor: '#F5EFEA', border: '1px solid #C59B73', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#5B3924', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
                                        {calcResultText}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Giá trị % */}
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      max="100"
                                      value={lineData.valNum ?? ''}
                                      onChange={(e) => handleEditHistLineInputChange('vanity', lineName, 'valNum', e.target.value)}
                                      placeholder="Giá trị"
                                      style={{
                                        width: '100%',
                                        padding: '5px 18px 5px 6px',
                                        borderRadius: '6px',
                                        border: '1px solid #D5C9BD',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                    <span style={{ position: 'absolute', right: '4px', fontSize: '0.72rem', fontWeight: '800', color: '#70452D' }}>%</span>
                                  </div>

                                  {/* Chênh lệch % */}
                                  <div style={{ display: 'flex', gap: '2px' }}>
                                    <select
                                      value={lineData.changeDir || '▼'}
                                      onChange={(e) => handleEditHistLineInputChange('vanity', lineName, 'changeDir', e.target.value)}
                                      style={{
                                        padding: '5px 2px',
                                        borderRadius: '6px',
                                        border: '1px solid #D5C9BD',
                                        fontSize: '0.78rem',
                                        fontWeight: '800',
                                        color: lineData.changeDir === '▲' ? '#3F7D58' : '#8C5332',
                                        backgroundColor: '#FFFFFF',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="▲">▲</option>
                                      <option value="▼">▼</option>
                                    </select>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        max="100"
                                        value={lineData.changeNum ?? ''}
                                        onChange={(e) => handleEditHistLineInputChange('vanity', lineName, 'changeNum', e.target.value)}
                                        placeholder="Lệch"
                                        style={{
                                          width: '100%',
                                          padding: '5px 16px 5px 4px',
                                          borderRadius: '6px',
                                          border: '1px solid #D5C9BD',
                                          fontSize: '0.78rem',
                                          fontWeight: '700',
                                          boxSizing: 'border-box'
                                        }}
                                      />
                                      <span style={{ position: 'absolute', right: '3px', fontSize: '0.7rem', fontWeight: '800', color: '#70452D' }}>%</span>
                                    </div>
                                  </div>

                                  {/* Nút Xóa Dòng */}
                                  <div style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditSubLine('vanity', lineName)}
                                      title="Xóa dòng này"
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#8C6547',
                                        fontSize: '1rem',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        lineHeight: 1,
                                        transition: 'color 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.color = '#5B3924'}
                                      onMouseLeave={(e) => e.currentTarget.style.color = '#8C6547'}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CONTENT TAB 2: FURNITURE SUB-LINES */}
                  {(editingHistRow.activeLineTab || 'line1') === 'line2' && (
                    <div style={{ backgroundColor: '#FAF7F4', padding: '10px 12px', borderRadius: '10px', border: '1px solid #DFD5CB', maxHeight: '300px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#5B3924', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Dòng hàng thuộc {fMainCat} ({activeFLines.length}/{editFurnitureSubs.length}):</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {editFurnitureSubs.filter(l => !activeFLines.includes(l)).length > 0 && (
                            <select
                              onChange={(e) => {
                                handleAddEditSubLine('furniture', e.target.value);
                                e.target.value = '';
                              }}
                              defaultValue=""
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #C59B73',
                                backgroundColor: '#F5EFEA',
                                color: '#5B3924',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="" disabled>Thêm dòng hàng...</option>
                              {editFurnitureSubs.filter(l => !activeFLines.includes(l)).map(l => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                          )}
                          <span style={{ fontSize: '0.65rem', color: '#70452D', backgroundColor: '#EFE8E1', border: '1px solid #DFD5CB', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            Dòng k nhập sẽ tự bỏ qua
                          </span>
                        </div>
                      </div>

                      {activeFLines.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#8C6547', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          Chưa chọn dòng hàng nào. Chọn dòng hàng ở menu <strong>Thêm dòng hàng</strong> phía trên để nhập số liệu.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {activeFLines.map((lineName) => {
                            const lineData = editingHistRow.line_values?.[lineName] || { valNum: '', changeDir: '▼', changeNum: '', a: '', b: '', c: '' };
                            const a = parseFloat(lineData.a);
                            const b = parseFloat(lineData.b);
                            const c = parseFloat(lineData.c);

                            let calcResultText = '--- %';
                            if (parsedForm.type === 'sum_div') {
                              if (!isNaN(a) && !isNaN(c) && c !== 0) {
                                const sum = a + (isNaN(b) ? 0 : b);
                                calcResultText = `${((sum / c) * 100).toFixed(1)}%`;
                              }
                            } else {
                              if (!isNaN(a) && !isNaN(c) && c !== 0) {
                                calcResultText = `${((a / c) * 100).toFixed(1)}%`;
                              }
                            }

                            const isFilled = lineData.valNum !== '' || lineData.a !== '' || lineData.c !== '';

                            return (
                              <div
                                key={lineName}
                                style={{
                                  backgroundColor: isFilled ? '#FFFFFF' : '#FAF7F4',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: isFilled ? '1.5px solid #8C6547' : '1px solid #EAE3DC',
                                  boxShadow: isFilled ? '0 1px 4px rgba(91, 57, 36, 0.08)' : 'none',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 105px 135px 28px', gap: '6px', alignItems: 'center' }}>
                                  {/* Tên Dòng hàng */}
                                  <div>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 6px 4px 8px',
                                      backgroundColor: isFilled ? '#F5EFEA' : '#FFF',
                                      color: '#5B3924',
                                      border: isFilled ? '1px solid #C59B73' : '1px solid #D5C9BD',
                                      borderRadius: '6px',
                                      fontSize: '0.78rem',
                                      fontWeight: '800',
                                      width: '100%',
                                      textAlign: 'left',
                                      boxSizing: 'border-box'
                                    }}>
                                      {lineName}
                                    </span>
                                  </div>

                                  {/* Bộ nhập Tử số / Mẫu số */}
                                  <div style={{ backgroundColor: '#FFFDFC', padding: '3px 6px', borderRadius: '6px', border: '1px solid #D5C9BD' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <input
                                        type="number"
                                        step="any"
                                        value={lineData.a ?? ''}
                                        onChange={(e) => handleEditHistLineInputChange('furniture', lineName, 'a', e.target.value, parsedForm.type)}
                                        placeholder={parsedForm.varA || 'Tử số'}
                                        title={parsedForm.varA}
                                        style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                      />
                                      {parsedForm.type === 'sum_div' && (
                                        <>
                                          <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>+</span>
                                          <input
                                            type="number"
                                            step="any"
                                            value={lineData.b ?? ''}
                                            onChange={(e) => handleEditHistLineInputChange('furniture', lineName, 'b', e.target.value, 'sum_div')}
                                            placeholder={parsedForm.varB || 'Biến B'}
                                            title={parsedForm.varB}
                                            style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                          />
                                        </>
                                      )}
                                      <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>/</span>
                                      <input
                                        type="number"
                                        step="any"
                                        value={lineData.c ?? ''}
                                        onChange={(e) => handleEditHistLineInputChange('furniture', lineName, 'c', e.target.value, parsedForm.type)}
                                        placeholder={parsedForm.varC || 'Mẫu số'}
                                        title={parsedForm.varC}
                                        style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C59B73', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                      />
                                      <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>=</span>
                                      <div style={{ padding: '2px 4px', backgroundColor: '#F5EFEA', border: '1px solid #C59B73', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#5B3924', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
                                        {calcResultText}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Giá trị % */}
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      max="100"
                                      value={lineData.valNum ?? ''}
                                      onChange={(e) => handleEditHistLineInputChange('furniture', lineName, 'valNum', e.target.value)}
                                      placeholder="Giá trị"
                                      style={{
                                        width: '100%',
                                        padding: '5px 18px 5px 6px',
                                        borderRadius: '6px',
                                        border: '1px solid #D5C9BD',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                    <span style={{ position: 'absolute', right: '4px', fontSize: '0.72rem', fontWeight: '800', color: '#70452D' }}>%</span>
                                  </div>

                                  {/* Chênh lệch % */}
                                  <div style={{ display: 'flex', gap: '2px' }}>
                                    <select
                                      value={lineData.changeDir || '▼'}
                                      onChange={(e) => handleEditHistLineInputChange('furniture', lineName, 'changeDir', e.target.value)}
                                      style={{
                                        padding: '5px 2px',
                                        borderRadius: '6px',
                                        border: '1px solid #D5C9BD',
                                        fontSize: '0.78rem',
                                        fontWeight: '800',
                                        color: lineData.changeDir === '▲' ? '#3F7D58' : '#8C5332',
                                        backgroundColor: '#FFFFFF',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="▲">▲</option>
                                      <option value="▼">▼</option>
                                    </select>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        max="100"
                                        value={lineData.changeNum ?? ''}
                                        onChange={(e) => handleEditHistLineInputChange('furniture', lineName, 'changeNum', e.target.value)}
                                        placeholder="Lệch"
                                        style={{
                                          width: '100%',
                                          padding: '5px 16px 5px 4px',
                                          borderRadius: '6px',
                                          border: '1px solid #D5C9BD',
                                          fontSize: '0.78rem',
                                          fontWeight: '700',
                                          boxSizing: 'border-box'
                                        }}
                                      />
                                      <span style={{ position: 'absolute', right: '3px', fontSize: '0.7rem', fontWeight: '800', color: '#70452D' }}>%</span>
                                    </div>
                                  </div>

                                  {/* Nút Xóa Dòng */}
                                  <div style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditSubLine('furniture', lineName)}
                                      title="Xóa dòng này"
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#8C6547',
                                        fontSize: '1rem',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        lineHeight: 1,
                                        transition: 'color 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.color = '#5B3924'}
                                      onMouseLeave={(e) => e.currentTarget.style.color = '#8C6547'}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Điểm đánh giá Radar */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#5B3924', marginBottom: '4px' }}>
                    Điểm đánh giá Radar (%)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editingHistRow.score_avg !== null && editingHistRow.score_avg !== undefined ? editingHistRow.score_avg : ''}
                      onChange={(e) => handleEditHistFieldChange('score_avg', e.target.value)}
                      placeholder="VD: 95.0"
                      style={{
                        width: '100%',
                        padding: '8px 28px 8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #D5C9BD',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', fontSize: '0.85rem', fontWeight: '800', color: '#5B3924' }}>%</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ padding: '12px 20px', backgroundColor: '#FAF7F4', borderTop: '1px solid #DFD5CB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingHistRow(null)}
                  disabled={savingHist}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#F7F4F0',
                    color: '#5B3924',
                    border: '1px solid #D5C9BD',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditHistory}
                  disabled={savingHist}
                  style={{
                    padding: '8px 22px',
                    backgroundColor: '#5B3924',
                    color: '#FFFDFC',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    cursor: savingHist ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(91, 57, 36, 0.25)'
                  }}
                >
                  {savingHist ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL XÁC NHẬN LƯU DỮ LIỆU */}
      {showConfirmSave && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(20, 15, 10, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10001,
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            backgroundColor: '#FFFDFC',
            borderRadius: '14px',
            width: '460px',
            maxWidth: '90vw',
            border: '2px solid #5B3924',
            boxShadow: '0 16px 40px rgba(91, 57, 36, 0.35)',
            padding: '22px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: '800', color: '#5B3924' }}>
              Xác nhận lưu cập nhật KPI
            </h4>

            {missingCategoryReminder && (
              <div style={{
                backgroundColor: '#FAF5F0',
                border: '1.5px solid #D5C9BD',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '14px',
                color: '#70452D',
                fontSize: '0.82rem',
                fontWeight: '700',
                textAlign: 'left',
                lineHeight: '1.4'
              }}>
                <strong>Nhắc nhở dữ liệu:</strong> {missingCategoryReminder}
              </div>
            )}

            <p style={{ fontSize: '0.86rem', color: '#70452D', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn lưu các số liệu đã nhập cho <strong>{formData.targetMonth}</strong> thuộc chỉ số <strong>"{formData.title}"</strong> không?
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                disabled={saving}
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: '1px solid #D5C9BD',
                  backgroundColor: '#F7F4F0',
                  color: '#5B3924',
                  fontWeight: '700',
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                {missingCategoryReminder ? 'Quay lại bổ sung' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={saving}
                style={{
                  padding: '9px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: missingCategoryReminder ? '#8C6547' : '#5B3924',
                  color: '#FFFDFC',
                  fontWeight: '800',
                  fontSize: '0.84rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 3px 8px rgba(91, 57, 36, 0.3)'
                }}
              >
                {saving ? 'Đang lưu...' : (missingCategoryReminder ? 'Vẫn lưu (Bỏ qua)' : 'Đồng ý lưu')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA BẢN GHI LỊCH SỬ - GIAO DIỆN CHUẨN DỰ ÁN */}
      {deletingHistItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(20, 15, 10, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10002,
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            backgroundColor: '#FFFDFC',
            borderRadius: '14px',
            width: '450px',
            maxWidth: '92vw',
            border: '2px solid #5B3924',
            boxShadow: '0 18px 45px rgba(91, 57, 36, 0.35)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleUp 0.18s ease'
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: '#5B3924',
              color: '#FFFDFC',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span>Xác nhận xóa bản ghi lịch sử</span>
              </h4>
              <button
                type="button"
                onClick={() => !deletingLoading && setDeletingHistItem(null)}
                disabled={deletingLoading}
                style={{ background: 'none', border: 'none', color: '#FFFDFC', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 22px', textAlign: 'center' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#F5EFEA',
                border: '2px solid #D5C9BD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
                fontSize: '1.5rem',
                color: '#70452D'
              }}>
                🗑️
              </div>

              <p style={{ fontSize: '0.88rem', color: '#5B3924', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                Bạn có chắc chắn muốn xóa bản ghi lịch sử:
              </p>
              <div style={{
                backgroundColor: '#F5EFEA',
                border: '1px solid #DFD5CB',
                padding: '8px 12px',
                borderRadius: '8px',
                fontWeight: '800',
                color: '#70452D',
                fontSize: '0.92rem',
                marginBottom: '12px'
              }}>
                "{deletingHistItem.label}"
              </div>
              <p style={{ fontSize: '0.78rem', color: '#8C6547', margin: 0, fontStyle: 'italic' }}>
                Lưu ý: Thao tác này sẽ xóa vĩnh viễn bản ghi và không thể hoàn tác!
              </p>
            </div>

            {/* Footer Buttons */}
            <div style={{
              backgroundColor: '#FAF7F4',
              borderTop: '1px solid #DFD5CB',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setDeletingHistItem(null)}
                disabled={deletingLoading}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid #D5C9BD',
                  backgroundColor: '#F7F4F0',
                  color: '#5B3924',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={executeDeleteHistory}
                disabled={deletingLoading}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#5B3924',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: deletingLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(91, 57, 36, 0.25)'
                }}
              >
                {deletingLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THÔNG BÁO LƯU THÀNH CÔNG */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#5B3924',
          color: '#FFFDFC',
          border: '1px solid #C59B73',
          padding: '14px 22px',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(91, 57, 36, 0.35)',
          zIndex: 10002,
          fontWeight: '800',
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.2s ease'
        }}>
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};

export default CustomKPIModal;

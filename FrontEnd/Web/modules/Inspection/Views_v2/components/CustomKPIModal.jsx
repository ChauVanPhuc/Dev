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

  // Trạng thái chỉnh sửa trực tiếp lịch sử
  const [editingHistId, setEditingHistId] = useState(null);
  const [editingHistRow, setEditingHistRow] = useState(null);
  const [viewingHistDetail, setViewingHistDetail] = useState(null);

  const handleDeleteHistory = async (histId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi lịch sử này không?')) return;
    const updated = historyList.filter(h => h.id !== histId);
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
      if (onSaveSuccess) onSaveSuccess();
    } catch (e) {
      console.error('Lỗi khi xóa dòng lịch sử:', e);
    }
  };

  const handleStartEditHistory = (row) => {
    setEditingHistId(row.id);
    setEditingHistRow({ ...row });
  };

  const handleSaveEditHistory = async () => {
    if (!editingHistRow) return;
    const updated = historyList.map(h => h.id === editingHistRow.id ? editingHistRow : h);
    setHistoryList(updated);
    setEditingHistId(null);
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
        history_json: updated
      });
      if (onSaveSuccess) onSaveSuccess();
    } catch (e) {
      console.error('Lỗi khi cập nhật lịch sử:', e);
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

            if (targetObj.formula_text) {
              setFormData(prev => ({ ...prev, formulaText: targetObj.formula_text }));
            }
          }
        })
        .catch(err => console.error('[CustomKPIModal] Fetch latest kpi targets error:', err));
    }
  }, [kpiItem, isOpen]);

  if (!isOpen || !kpiItem) return null;

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
              backgroundColor: '#FDF2F2',
              color: '#B94A3D',
              border: '1px solid #F8D7DA',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '600'
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
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', borderBottom: '2px solid #EAE3DC' }}>
              <button
                type="button"
                onClick={() => setActiveLineTab('line1')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #EAE3DC',
                  borderBottom: activeLineTab === 'line1' ? '3px solid #6D28D9' : '1px solid transparent',
                  backgroundColor: activeLineTab === 'line1' ? '#EDE9FE' : '#FAF7F4',
                  color: activeLineTab === 'line1' ? '#5B21B6' : '#70452D',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Dòng hàng chính: {formData.vanityMainCat || 'Vanity'}</span>
                <span style={{ fontSize: '0.7rem', backgroundColor: activeLineTab === 'line1' ? '#DDD6FE' : '#EAE3DC', padding: '1px 6px', borderRadius: '4px', color: '#4C1D95' }}>
                  ({activeVanityLines.length} Dòng hàng)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLineTab('line2')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #EAE3DC',
                  borderBottom: activeLineTab === 'line2' ? '3px solid #D97706' : '1px solid transparent',
                  backgroundColor: activeLineTab === 'line2' ? '#FEF3C7' : '#FAF7F4',
                  color: activeLineTab === 'line2' ? '#92400E' : '#70452D',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Dòng hàng chính: {formData.furnitureMainCat || 'Furniture'}</span>
                <span style={{ fontSize: '0.7rem', backgroundColor: activeLineTab === 'line2' ? '#FDE68A' : '#EAE3DC', padding: '1px 6px', borderRadius: '4px', color: '#78350F' }}>
                  ({activeFurnitureLines.length} Dòng hàng)
                </span>
              </button>
            </div>

            {/* CONTENT TAB 1: VANITY */}
            {activeLineTab === 'line1' && (
              <div style={{ backgroundColor: '#FAF7F4', padding: '10px 12px', borderRadius: '10px', border: '1px solid #DDD6FE', maxHeight: '340px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#5B21B6', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                          border: '1px solid #C4B5FD',
                          backgroundColor: '#EDE9FE',
                          color: '#5B21B6',
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
                    <span style={{ fontSize: '0.65rem', color: '#6D28D9', backgroundColor: '#EDE9FE', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      Dòng k nhập sẽ tự bỏ qua
                    </span>
                  </div>
                </div>

                {activeVanityLines.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#6D28D9', fontSize: '0.8rem', fontStyle: 'italic' }}>
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
                            border: isFilled ? '1.5px solid #6D28D9' : '1px solid #EAE3DC',
                            boxShadow: isFilled ? '0 1px 4px rgba(109, 40, 217, 0.1)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 105px 135px 28px', gap: '6px', alignItems: 'center' }}>
                            {/* Tên Dòng hàng */}
                            <div>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 6px 4px 8px',
                                backgroundColor: isFilled ? '#EDE9FE' : '#FFF',
                                color: isFilled ? '#5B21B6' : '#70452D',
                                border: isFilled ? '1px solid #C4B5FD' : '1px solid #D5C9BD',
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
                                <div style={{ padding: '2px 4px', backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#B45309', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
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
                                  color: lineData.changeDir === '▲' ? '#3F7D58' : '#B94A3D',
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
                                  color: '#DC2626',
                                  fontSize: '1rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  lineHeight: 1
                                }}
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
              <div style={{ backgroundColor: '#FAF5EE', padding: '10px 12px', borderRadius: '10px', border: '1px solid #FDE68A', maxHeight: '340px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#92400E', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                          border: '1px solid #FCD34D',
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
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
                    <span style={{ fontSize: '0.65rem', color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      Dòng k nhập sẽ tự bỏ qua
                    </span>
                  </div>
                </div>

                {activeFurnitureLines.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#92400E', fontSize: '0.8rem', fontStyle: 'italic' }}>
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
                            backgroundColor: isFilled ? '#FFFFFF' : '#FAF5EE',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: isFilled ? '1.5px solid #D97706' : '1px solid #FDE68A',
                            boxShadow: isFilled ? '0 1px 4px rgba(217, 119, 6, 0.1)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 105px 135px 28px', gap: '6px', alignItems: 'center' }}>
                            {/* Tên Dòng hàng */}
                            <div>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 6px 4px 8px',
                                backgroundColor: isFilled ? '#FEF3C7' : '#FFF',
                                color: isFilled ? '#92400E' : '#C58A4B',
                                border: isFilled ? '1px solid #FCD34D' : '1px solid #D5C9BD',
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
                                  style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C58A4B', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
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
                                      style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C58A4B', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
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
                                  style={{ width: '100%', minWidth: '35px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #C58A4B', fontSize: '0.78rem', fontWeight: '700', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontWeight: '800', color: '#70452D', fontSize: '0.75rem' }}>=</span>
                                <div style={{ padding: '2px 4px', backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#B45309', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
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
                              <span style={{ position: 'absolute', right: '4px', fontSize: '0.72rem', fontWeight: '800', color: '#C58A4B' }}>%</span>
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
                                  color: lineData.changeDir === '▲' ? '#3F7D58' : '#B94A3D',
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
                                <span style={{ position: 'absolute', right: '3px', fontSize: '0.7rem', fontWeight: '800', color: '#C58A4B' }}>%</span>
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
                                  color: '#DC2626',
                                  fontSize: '1rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  lineHeight: 1
                                }}
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
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                Chưa có lịch sử cập nhật nào được ghi nhận.
              </div>
            ) : (
              <div style={{ maxHeight: '160px', overflowY: 'auto', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
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
                      const isEditing = editingHistId === h.id;
                      return (
                        <tr 
                          key={h.id || idx} 
                          onClick={() => {
                            if (!isEditing) setViewingHistDetail(h);
                          }}
                          title={!isEditing ? "Bấm vào để xem chi tiết từng dòng hàng của tháng này" : ""}
                          style={{ 
                            borderBottom: '1px solid #F3F4F6', 
                            backgroundColor: isEditing ? '#FEFCE8' : 'transparent',
                            cursor: isEditing ? 'default' : 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isEditing) e.currentTarget.style.backgroundColor = '#FEF9F5';
                          }}
                          onMouseLeave={(e) => {
                            if (!isEditing) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {isEditing ? (
                            <>
                              <td style={{ padding: '4px 6px' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingHistRow?.month || ''}
                                  onChange={(e) => setEditingHistRow(prev => ({ ...prev, month: e.target.value }))}
                                  style={{ width: '100%', padding: '2px 4px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #F59E0B' }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingHistRow?.vanity_val || ''}
                                  onChange={(e) => setEditingHistRow(prev => ({ ...prev, vanity_val: e.target.value }))}
                                  placeholder="VD: 8.3%"
                                  style={{ width: '100%', padding: '2px 4px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #F59E0B' }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingHistRow?.furniture_val || ''}
                                  onChange={(e) => setEditingHistRow(prev => ({ ...prev, furniture_val: e.target.value }))}
                                  placeholder="VD: 8.3%"
                                  style={{ width: '100%', padding: '2px 4px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #F59E0B' }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  step="any"
                                  value={editingHistRow?.score_avg ?? ''}
                                  onChange={(e) => setEditingHistRow(prev => ({ ...prev, score_avg: e.target.value ? parseFloat(e.target.value) : '' }))}
                                  placeholder="95"
                                  style={{ width: '100%', padding: '2px 4px', fontSize: '0.72rem', borderRadius: '3px', border: '1px solid #F59E0B', textAlign: 'center' }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={handleSaveEditHistory}
                                  style={{ border: 'none', background: 'none', color: '#16A34A', cursor: 'pointer', fontWeight: '800', marginRight: '4px', fontSize: '0.85rem' }}
                                  title="Lưu sửa dòng lịch sử này"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingHistId(null)}
                                  style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}
                                  title="Hủy"
                                >
                                  ✕
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '6px 8px', fontWeight: '700', color: '#374151' }}>
                                {h.month || h.created_at || `Lần ${historyList.length - idx}`}
                              </td>
                              <td style={{ padding: '6px 8px', color: '#6D28D9', fontWeight: '700' }}>
                                {h.vanity_val} <span style={{ fontSize: '0.7rem', color: h.vanity_change?.includes('▲') ? '#15803D' : '#B94A3D' }}>{h.vanity_change}</span>
                              </td>
                              <td style={{ padding: '6px 8px', color: '#D97706', fontWeight: '700' }}>
                                {h.furniture_val} <span style={{ fontSize: '0.7rem', color: h.furniture_change?.includes('▲') ? '#15803D' : '#B94A3D' }}>{h.furniture_change}</span>
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '800', color: '#5B3924' }}>
                                {h.score_avg ?? '---'}%
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setViewingHistDetail(h)}
                                  style={{ border: 'none', background: '#EDE9FE', color: '#6D28D9', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', marginRight: '4px' }}
                                  title="Xem chi tiết từng dòng hàng của tháng này"
                                >
                                  Xem
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditHistory(h)}
                                  style={{ border: 'none', background: '#DBEAFE', color: '#1D4ED8', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', marginRight: '4px' }}
                                  title="Sửa bản ghi lịch sử này"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHistory(h.id)}
                                  style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700' }}
                                  title="Xóa bản ghi lịch sử này"
                                >
                                  Xóa
                                </button>
                              </td>
                            </>
                          )}
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
            border: '2px solid #6D28D9',
            boxShadow: '0 16px 40px rgba(91, 57, 36, 0.3)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ backgroundColor: '#6D28D9', color: '#FFF', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Chi tiết số liệu từng dòng hàng - {viewingHistDetail.month}</span>
              </h4>
              <button onClick={() => setViewingHistDetail(null)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Content */}
            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Metric Overview cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#EDE9FE', border: '1px solid #C4B5FD', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#5B21B6' }}>Dòng {viewingHistDetail.vanity_label || 'Vanity'}</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#6D28D9' }}>{viewingHistDetail.vanity_val || '---'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: viewingHistDetail.vanity_change?.includes('▲') ? '#15803D' : '#B94A3D' }}>{viewingHistDetail.vanity_change || ''}</div>
                </div>
                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#92400E' }}>Dòng {viewingHistDetail.furniture_label || 'Furniture'}</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#D97706' }}>{viewingHistDetail.furniture_val || '---'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: '700', color: viewingHistDetail.furniture_change?.includes('▲') ? '#15803D' : '#B94A3D' }}>{viewingHistDetail.furniture_change || ''}</div>
                </div>
                <div style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151' }}>Đánh giá Radar</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#111827' }}>{viewingHistDetail.score_avg ?? '---'}%</div>
                </div>
              </div>

              {/* Breakdown table of sub-lines */}
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: '800', color: '#5B3924' }}>
                  Chi tiết thông số tính toán từng Dòng hàng nhỏ:
                </h5>

                {viewingHistDetail.line_values && Object.keys(viewingHistDetail.line_values).length > 0 ? (
                  <div style={{ borderRadius: '8px', border: '1px solid #EAE3DC', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F7F4F0', color: '#5B3924', borderBottom: '1px solid #EAE3DC' }}>
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
                            <tr key={lineName} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF7F4' }}>
                              <td style={{ padding: '6px 10px', fontWeight: '800', color: '#4C1D95' }}>
                                {lineName}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center', color: '#70452D' }}>
                                {lData.a !== '' ? `${lData.a} / ${lData.c}` : '---'}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: hasVal ? '#6D28D9' : '#9CA3AF' }}>
                                {lData.valNum !== '' ? `${lData.valNum}%` : '---'}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: lData.changeDir === '▲' ? '#15803D' : '#B94A3D' }}>
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
            <div style={{ padding: '12px 18px', backgroundColor: '#FAF7F4', borderTop: '1px solid #EAE3DC', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setViewingHistDetail(null)}
                style={{ padding: '7px 14px', backgroundColor: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: '800', color: missingCategoryReminder ? '#B91C1C' : '#5B3924' }}>
              Xác nhận lưu cập nhật KPI
            </h4>

            {missingCategoryReminder && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '14px',
                color: '#991B1B',
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
                  backgroundColor: missingCategoryReminder ? '#D97706' : '#16A34A',
                  color: '#FFF',
                  fontWeight: '800',
                  fontSize: '0.84rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: missingCategoryReminder ? '0 3px 8px rgba(217, 119, 6, 0.35)' : '0 3px 8px rgba(22, 163, 74, 0.35)'
                }}
              >
                {saving ? 'Đang lưu...' : (missingCategoryReminder ? 'Vẫn lưu (Bỏ qua)' : 'Đồng ý lưu')}
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
          backgroundColor: '#16A34A',
          color: '#FFFFFF',
          padding: '14px 22px',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          zIndex: 10002,
          fontWeight: '800',
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.2s ease'
        }}>
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};

export default CustomKPIModal;

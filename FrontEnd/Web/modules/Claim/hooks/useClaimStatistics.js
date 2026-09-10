import { useState, useEffect, useMemo } from 'react';
import claimService from '../services/claim.service';
import { calculateTotalPenalty, getMonthYear } from '../utils/claimHelpers';

export const useClaimStatistics = (claims = [], cabinetPrices = [], showModal) => {
  // Monthly trends analytics modal state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [analyticsViewTab, setAnalyticsViewTab] = useState('chart'); // 'chart' or 'table'

  // Customer penalty per month state (persisted to localStorage)
  const [customerPenalties, setCustomerPenalties] = useState(() => {
    try {
      const saved = localStorage.getItem('smartflow_customer_penalties');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Customer penalty PDF files per month state (persisted to localStorage)
  const [customerPenaltyFiles, setCustomerPenaltyFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('smartflow_customer_penalty_files');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('smartflow_customer_penalties', JSON.stringify(customerPenalties));
    } catch (e) {
      console.error('Error saving customerPenalties:', e);
    }
  }, [customerPenalties]);

  useEffect(() => {
    try {
      localStorage.setItem('smartflow_customer_penalty_files', JSON.stringify(customerPenaltyFiles));
    } catch (e) {
      console.error('Error saving customerPenaltyFiles:', e);
    }
  }, [customerPenaltyFiles]);

  const [editingMonthData, setEditingMonthData] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parsingMonthTarget, setParsingMonthTarget] = useState(null);

  // Single Month PDF Upload (from modal)
  const handleSingleMonthPdfUpload = async (e, targetMonth) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
    if (invalidFiles.length > 0) {
      if (showModal) showModal('Lỗi', 'Tất cả các tệp phải có định dạng PDF.', 'error');
      e.target.value = '';
      return;
    }

    setIsParsingPdf(true);
    setParsingMonthTarget(targetMonth);

    try {
      let totalAmountForMonth = 0;
      let successCount = 0;
      let lastUploadedFile = null;

      if (files.length === 1) {
        const formData = new FormData();
        formData.append('file', files[0]);
        const res = await claimService.parseCreditNote(formData);
        if (res.success) {
          totalAmountForMonth = res.total_amount;
          successCount = 1;
          lastUploadedFile = {
            fileName: res.filename || files[0].name,
            fileUrl: res.file_url || `/static/uploads/customer_penalty_pdfs/${res.saved_filename}`
          };
        }
      } else {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await claimService.parseCreditNotes(formData);
        if (res.results && res.results.length > 0) {
          res.results.forEach(r => {
            if (r.success) {
              totalAmountForMonth += (r.total_amount || 0);
              successCount++;
              lastUploadedFile = {
                fileName: r.filename,
                fileUrl: r.file_url
              };
            }
          });
        }
      }

      setIsParsingPdf(false);
      setParsingMonthTarget(null);

      if (successCount === 0) {
        if (showModal) {
          showModal(
            'Lỗi đọc tệp',
            'Không thể trích xuất thông tin hoặc tổng tiền phạt từ các tệp PDF đã chọn. Vui lòng kiểm tra lại cấu trúc file.',
            'error'
          );
        }
        return;
      }

      setCustomerPenalties(prev => ({
        ...prev,
        [targetMonth]: totalAmountForMonth
      }));

      if (lastUploadedFile) {
        setCustomerPenaltyFiles(prev => ({
          ...prev,
          [targetMonth]: lastUploadedFile
        }));
      }

      if (editingMonthData && editingMonthData.month === targetMonth) {
        setEditValue(totalAmountForMonth);
      }

      if (showModal) {
        showModal(
          'Đọc thành công',
          `Đã trích xuất và cập nhật số tiền $${totalAmountForMonth.toLocaleString()} từ ${successCount} tệp PDF cho tháng ${targetMonth}!`,
          'success'
        );
      }
    } catch (err) {
      setIsParsingPdf(false);
      setParsingMonthTarget(null);
      const errMsg = err.response?.data?.detail || err.message || 'Lỗi khi đọc file PDF.';
      if (showModal) showModal('Lỗi đọc tệp', errMsg, 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleCreditNotePdfChange = (e) => {
    handleSingleMonthPdfUpload(e, editingMonthData?.month);
  };

  // Batch PDF Upload (Multiple PDFs from header button)
  const handleBatchPdfUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
    if (invalidFiles.length > 0) {
      if (showModal) showModal('Lỗi', 'Tất cả các tệp phải có định dạng PDF.', 'error');
      e.target.value = '';
      return;
    }

    setIsParsingPdf(true);
    setParsingMonthTarget(null);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await claimService.parseCreditNotes(formData);
      setIsParsingPdf(false);

      if (!res.results || res.results.length === 0) {
        if (showModal) showModal('Lỗi', 'Không có kết quả phân tích từ các tệp PDF đã chọn.', 'error');
        return;
      }

      const newPenalties = { ...customerPenalties };
      const newFiles = { ...customerPenaltyFiles };
      const updatedMonths = new Map();
      let successCount = 0;
      let failCount = 0;

      res.results.forEach(item => {
        if (item.success && item.month && item.month !== 'N/A') {
          successCount++;
          const current = updatedMonths.get(item.month) || 0;
          updatedMonths.set(item.month, current + item.total_amount);
          newFiles[item.month] = {
            fileName: item.filename,
            fileUrl: item.file_url
          };
        } else {
          failCount++;
        }
      });

      updatedMonths.forEach((amt, m) => {
        newPenalties[m] = amt;
      });

      setCustomerPenalties(newPenalties);
      setCustomerPenaltyFiles(newFiles);

      const summaryList = Array.from(updatedMonths.entries())
        .map(([m, amt]) => `• Tháng ${m}: $${amt.toLocaleString()}`)
        .join('\n');

      if (successCount > 0) {
        if (showModal) {
          showModal(
            'Tải lên hoàn tất',
            `Đã phân tích thành công ${successCount}/${files.length} tệp PDF:\n\n${summaryList}${failCount > 0 ? `\n(${failCount} tệp không đọc được thông tin tháng)` : ''}`,
            'success'
          );
        }
      } else {
        if (showModal) {
          showModal(
            'Lỗi đọc tệp',
            'Không thể trích xuất thông tin tháng từ các tệp PDF đã chọn. Vui lòng kiểm tra lại cấu trúc file.',
            'error'
          );
        }
      }
    } catch (err) {
      setIsParsingPdf(false);
      const errMsg = err.response?.data?.detail || err.message || 'Lỗi khi đọc file PDF.';
      if (showModal) showModal('Lỗi đọc tệp', errMsg, 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Aggregated analytics data per month
  const analyticsData = useMemo(() => {
    const groups = {};

    claims.forEach(c => {
      const my = getMonthYear(c);
      if (my === 'Khác') return;

      if (!groups[my]) {
        groups[my] = {
          month: my,
          count: 0,
          totalAmount: 0,
          claims: []
        };
      }

      groups[my].count += 1;
      const penaltyVal = calculateTotalPenalty(c, undefined, cabinetPrices);
      groups[my].totalAmount += penaltyVal;
      groups[my].claims.push(c);
    });

    const list = Object.values(groups);
    list.sort((a, b) => {
      const [mA, yA] = a.month.split('-').map(Number);
      const [mB, yB] = b.month.split('-').map(Number);
      if (yA !== yB) return yA - yB;
      return mA - mB;
    });

    return list;
  }, [claims, cabinetPrices]);

  const totalCountAll = useMemo(() => {
    return analyticsData.reduce((acc, curr) => acc + curr.count, 0);
  }, [analyticsData]);

  const totalG7AmountAll = useMemo(() => {
    return analyticsData.reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [analyticsData]);

  const totalCustomerAmountAll = useMemo(() => {
    return analyticsData.reduce((acc, curr) => {
      const p = customerPenalties[curr.month];
      return acc + (p !== undefined ? p : 0);
    }, 0);
  }, [analyticsData, customerPenalties]);

  return {
    isAnalyticsOpen,
    setIsAnalyticsOpen,
    analyticsViewTab,
    setAnalyticsViewTab,
    customerPenalties,
    setCustomerPenalties,
    customerPenaltyFiles,
    setCustomerPenaltyFiles,
    editingMonthData,
    setEditingMonthData,
    editValue,
    setEditValue,
    isParsingPdf,
    parsingMonthTarget,
    analyticsData,
    totalCountAll,
    totalG7AmountAll,
    totalCustomerAmountAll,
    handleSingleMonthPdfUpload,
    handleCreditNotePdfChange,
    handleBatchPdfUpload
  };
};

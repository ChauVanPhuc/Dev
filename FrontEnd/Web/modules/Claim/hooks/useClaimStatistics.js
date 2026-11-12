import { useState, useEffect, useMemo } from 'react';
import claimService from '../services/claim.service';
import { calculateTotalPenalty, getMonthYear } from '../utils/claimHelpers';

export const useClaimStatistics = (claims = [], cabinetPrices = [], showModal, fetchClaims) => {
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
      const serialized = JSON.stringify(customerPenalties);
      localStorage.setItem('smartflow_customer_penalties', serialized);
      localStorage.setItem('claim_customer_penalties', serialized);
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

  // Credit Note Preview Modal States
  const [creditNotePreviewData, setCreditNotePreviewData] = useState(null);
  const [isCreditNotePreviewOpen, setIsCreditNotePreviewOpen] = useState(false);
  const [isConfirmingCreditNote, setIsConfirmingCreditNote] = useState(false);

  // Sync penalties from custom events (e.g. from standard PDF import)
  useEffect(() => {
    const syncPenalties = () => {
      try {
        const saved = localStorage.getItem('smartflow_customer_penalties');
        if (saved) setCustomerPenalties(JSON.parse(saved));
        const savedFiles = localStorage.getItem('smartflow_customer_penalty_files');
        if (savedFiles) setCustomerPenaltyFiles(JSON.parse(savedFiles));
      } catch (e) {
        console.error('Error syncing penalties:', e);
      }
    };
    window.addEventListener('claim-penalties-updated', syncPenalties);
    return () => window.removeEventListener('claim-penalties-updated', syncPenalties);
  }, []);

  const handleConfirmCreditNoteImport = async (dataToImport) => {
    const payload = dataToImport || creditNotePreviewData;
    if (!payload) return;

    setIsConfirmingCreditNote(true);
    try {
      await claimService.confirmCreditNoteImport({
        credit_note_no: payload.credit_note_no,
        factory: payload.factory || 'VINA G7',
        date_issued: payload.date_issued,
        period: payload.period || payload.month,
        total_amount: payload.total_amount,
        currency: payload.currency || 'USD',
        saved_filename: payload.saved_filename,
        file_url: payload.file_url,
        claims: payload.claims || []
      });

      const m = payload.period || payload.month;
      if (m && payload.total_amount !== undefined) {
        setCustomerPenalties(prev => ({
          ...prev,
          [m]: payload.total_amount
        }));
      }

      if (m && (payload.saved_filename || payload.filename)) {
        setCustomerPenaltyFiles(prev => ({
          ...prev,
          [m]: {
            fileName: payload.filename || payload.saved_filename,
            fileUrl: payload.file_url || `/static/uploads/customer_penalty_pdfs/${payload.saved_filename}`
          }
        }));
      }

      if (editingMonthData && editingMonthData.month === m) {
        setEditValue(payload.total_amount.toString());
      }

      if (fetchClaims) {
        await fetchClaims();
      }
      window.dispatchEvent(new CustomEvent('claim-list-refresh'));

      setIsCreditNotePreviewOpen(false);
      setCreditNotePreviewData(null);

      if (showModal) {
        showModal(
          'Nhập dữ liệu thành công',
          `Đã đối chiếu ${payload.claims?.length || 0} mục từ Credit Note ${payload.credit_note_no || ''} và cập nhật tiền phạt $${payload.total_amount?.toLocaleString()} cho tháng ${m}!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Lỗi lưu Credit Note:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Lỗi khi lưu dữ liệu Credit Note.';
      if (showModal) showModal('Lỗi lưu dữ liệu', errMsg, 'error');
    } finally {
      setIsConfirmingCreditNote(false);
    }
  };

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

          // If credit note contains extracted claims, open preview modal for user confirmation
          if (res.claims && res.claims.length > 0) {
            setIsParsingPdf(false);
            setParsingMonthTarget(null);
            setCreditNotePreviewData(res);
            setIsCreditNotePreviewOpen(true);
            return;
          }
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

      // If single file uploaded and has claims table, open preview modal
      if (res.results.length === 1 && res.results[0].success && res.results[0].claims && res.results[0].claims.length > 0) {
        setCreditNotePreviewData(res.results[0]);
        setIsCreditNotePreviewOpen(true);
        return;
      }

      const newPenalties = { ...customerPenalties };
      const newFiles = { ...customerPenaltyFiles };
      const updatedMonths = new Map();
      let successCount = 0;
      let failCount = 0;

      for (const item of res.results) {
        if (item.success && item.month && item.month !== 'N/A') {
          successCount++;
          const current = updatedMonths.get(item.month) || 0;
          updatedMonths.set(item.month, current + (Number(item.total_amount) || 0));
          newFiles[item.month] = {
            fileName: item.filename,
            fileUrl: item.file_url
          };

          if (item.claims && item.claims.length > 0) {
            try {
              await claimService.confirmCreditNoteImport({
                credit_note_no: item.credit_note_no,
                factory: item.factory || 'VINA G7',
                date_issued: item.date_issued,
                period: item.period || item.month,
                total_amount: item.total_amount,
                currency: item.currency || 'USD',
                saved_filename: item.saved_filename,
                file_url: item.file_url,
                claims: item.claims || []
              });
            } catch (linkErr) {
              console.error('Error auto-linking credit note:', linkErr);
            }
          }
        } else {
          failCount++;
        }
      }

      updatedMonths.forEach((amt, m) => {
        newPenalties[m] = amt;
      });

      setCustomerPenalties(newPenalties);
      setCustomerPenaltyFiles(newFiles);

      if (fetchClaims) {
        await fetchClaims();
      }
      window.dispatchEvent(new CustomEvent('claim-list-refresh'));

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

  // Pre-build O(1) cabinet price map to eliminate O(N*M) lookups
  const cabinetPriceMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(cabinetPrices)) {
      for (let i = 0; i < cabinetPrices.length; i++) {
        const item = cabinetPrices[i];
        if (!item) continue;
        const price = item.sale_price || 0;
        if (item.cabinet_code) {
          map.set(String(item.cabinet_code).trim().toLowerCase(), price);
        }
        if (item.cabinet_name) {
          map.set(String(item.cabinet_name).trim().toLowerCase(), price);
        }
      }
    }
    return map;
  }, [cabinetPrices]);

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
      const penaltyVal = calculateTotalPenalty(c, undefined, cabinetPriceMap);
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
  }, [claims, cabinetPriceMap]);

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

  const totalOverallAmountAll = useMemo(() => {
    return totalG7AmountAll + totalCustomerAmountAll;
  }, [totalG7AmountAll, totalCustomerAmountAll]);

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
    totalOverallAmountAll,
    handleSingleMonthPdfUpload,
    handleCreditNotePdfChange,
    handleBatchPdfUpload,
    creditNotePreviewData,
    setCreditNotePreviewData,
    isCreditNotePreviewOpen,
    setIsCreditNotePreviewOpen,
    isConfirmingCreditNote,
    handleConfirmCreditNoteImport
  };
};

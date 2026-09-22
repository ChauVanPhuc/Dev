import React, { useState, useEffect, useRef } from 'react';
import claimService from '../services/claim.service';
import {
  normalizePenaltyValue,
  extractMultiplierFromPenalty,
  calculateTotalPenalty,
  formatPenaltyValue,
  getFullImagePath,
  resolveG7ErrorCode,
  resolveG7ErrorName
} from '../utils/claimHelpers';

export const useClaimForm = ({
  claims = [],
  setClaims,
  defectCatalog = [],
  g7DefectTypes = [],
  cabinetPrices = [],
  setLoading,
  showModal,
  setQuickSearch,
  setAppliedFilters,
  setPreviewImage
}) => {
  const addImageInputRef = useRef(null);
  const editImageInputRef = useRef(null);

  // Active detail modal state
  const [activeDetailClaim, setActiveDetailClaim] = useState(null);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'edit', 'add'

  // Exception navigation state
  const [exceptionNavMode, setExceptionNavMode] = useState(false);
  const [exceptionNavClaims, setExceptionNavClaims] = useState([]);

  // State form thêm mới Claim
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDongHang, setAddDongHang] = useState('Atlas');
  const [addLoaiClaim, setAddLoaiClaim] = useState('Khách nhắc nhở');
  const [addMaThamChieu, setAddMaThamChieu] = useState('');
  const [addTenSanPham, setAddTenSanPham] = useState('');
  const [addMucPhat, setAddMucPhat] = useState('Nhắc nhở');
  const [addGiaTriPhat, setAddGiaTriPhat] = useState('');
  const [addHeSoPhat, setAddHeSoPhat] = useState(2);
  const [addMaLoi, setAddMaLoi] = useState('');
  const [addTenLoiKH, setAddTenLoiKH] = useState('');
  const [addMaLoiCty, setAddMaLoiCty] = useState('');
  const [addTenLoiG7, setAddTenLoiG7] = useState('');
  const [showAddG7CodeSuggestions, setShowAddG7CodeSuggestions] = useState(false);
  const [showAddG7NameSuggestions, setShowAddG7NameSuggestions] = useState(false);
  const [addLpn, setAddLpn] = useState('');
  const [addMaCont, setAddMaCont] = useState('');
  const [addNgayXuat, setAddNgayXuat] = useState('');
  const [addTrangThaiXuLy, setAddTrangThaiXuLy] = useState('Mới');
  const [addLinkCapa, setAddLinkCapa] = useState('');
  const [addGhiChu, setAddGhiChu] = useState('');
  const [addImages, setAddImages] = useState([]);
  const [addImageCaptions, setAddImageCaptions] = useState([]);
  const [addModalError, setAddModalError] = useState('');
  const [editingAddImageIndex, setEditingAddImageIndex] = useState(null);
  const [showAddSuggestions, setShowAddSuggestions] = useState(false);
  const [showAddDefectSuggestions, setShowAddDefectSuggestions] = useState(false);
  const [showAddTenLoiKHSuggestions, setShowAddTenLoiKHSuggestions] = useState(false);

  // Modal 1: Process / Detail Claim state variables
  const [processDongHang, setProcessDongHang] = useState('');
  const [processLoaiClaim, setProcessLoaiClaim] = useState('');
  const [processMaThamChieu, setProcessMaThamChieu] = useState('');
  const [processTenSanPham, setProcessTenSanPham] = useState('');
  const [processMucPhat, setProcessMucPhat] = useState('');
  const [processGiaTriPhat, setProcessGiaTriPhat] = useState('');
  const [processHeSoPhat, setProcessHeSoPhat] = useState(1);
  const [processMaLoi, setProcessMaLoi] = useState('');
  const [processTenLoiKH, setProcessTenLoiKH] = useState('');
  const [processMaLoiCty, setProcessMaLoiCty] = useState('');
  const [processTenLoiG7, setProcessTenLoiG7] = useState('');
  const [showProcessDefectCodeSuggestions, setShowProcessDefectCodeSuggestions] = useState(false);
  const [showProcessTenLoiKHSuggestions, setShowProcessTenLoiKHSuggestions] = useState(false);
  const [showProcessG7CodeSuggestions, setShowProcessG7CodeSuggestions] = useState(false);
  const [showProcessG7NameSuggestions, setShowProcessG7NameSuggestions] = useState(false);
  const [processLpn, setProcessLpn] = useState('');
  const [processMaCont, setProcessMaCont] = useState('');
  const [processNgayXuat, setProcessNgayXuat] = useState('');
  const [processTrangThaiXuLy, setProcessTrangThaiXuLy] = useState('Mới');
  const [processLinkCapa, setProcessLinkCapa] = useState('');
  const [processGhiChu, setProcessGhiChu] = useState('');
  const [processImages, setProcessImages] = useState([]);
  const [processImageCaptions, setProcessImageCaptions] = useState([]);
  const [editingProcessImageIndex, setEditingProcessImageIndex] = useState(null);

  // Auto populate Process Claim Form when activeDetailClaim changes
  useEffect(() => {
    if (activeDetailClaim) {
      setProcessDongHang(activeDetailClaim.line || activeDetailClaim.dong_hang || 'AD2');
      setProcessLoaiClaim(activeDetailClaim.claim_type || activeDetailClaim.loai_claim || 'Claim Thường');
      setProcessMaThamChieu(activeDetailClaim.claim_code || activeDetailClaim.ma_tham_chieu || '');
      setProcessTenSanPham(activeDetailClaim.product_name || activeDetailClaim.sku || '');
      setProcessMucPhat(activeDetailClaim.penalty || activeDetailClaim.action || 'Không có');
      setProcessGiaTriPhat(activeDetailClaim.penalty || activeDetailClaim.action || '$0');

      const rawPenalty = activeDetailClaim.penalty || activeDetailClaim.action || '';
      const initMult = activeDetailClaim.penalty_multiplier !== undefined
        ? activeDetailClaim.penalty_multiplier
        : extractMultiplierFromPenalty(rawPenalty);
      setProcessHeSoPhat(initMult);
      const custCode = activeDetailClaim.order_code || activeDetailClaim.defect_code || '';
      const resolvedG7Code = activeDetailClaim.company_error_code || resolveG7ErrorCode(custCode, defectCatalog) || '';
      const resolvedG7Name = activeDetailClaim.company_error_name || resolveG7ErrorName(resolvedG7Code, custCode, g7DefectTypes, defectCatalog) || '';
      setProcessMaLoi(custCode);
      setProcessMaLoiCty(resolvedG7Code);
      setProcessTenLoiG7(resolvedG7Name);
      setProcessLpn(activeDetailClaim.lpn || '');
      setProcessMaCont(activeDetailClaim.cont || activeDetailClaim.container_no || '');
      setProcessImages(activeDetailClaim.image_paths || []);
      setProcessImageCaptions(activeDetailClaim.image_captions || []);

      let formattedDate = '';
      const rawPeriod = activeDetailClaim.date || activeDetailClaim.period || '';
      if (rawPeriod) {
        const parts = rawPeriod.split(/[-/]/);
        if (parts.length === 2) {
          formattedDate = `${parts[0].padStart(2, '0')}/${parts[1]}`;
        } else {
          formattedDate = rawPeriod;
        }
      }
      setProcessNgayXuat(formattedDate);
      setProcessTrangThaiXuLy(activeDetailClaim.status === 'Đã xử lý' || activeDetailClaim.status === 'Chấp nhận' ? 'Đã xử lý' : activeDetailClaim.status === 'Đang xem xét' ? 'Đang xem xét' : 'Mới');
      setProcessLinkCapa(activeDetailClaim.capa_link || activeDetailClaim.link_capa || '');
      setProcessTenLoiKH(activeDetailClaim.claim_description || activeDetailClaim.description || '');
      setProcessGhiChu(activeDetailClaim.note || activeDetailClaim.ghi_chu || '');
    }
  }, [activeDetailClaim, defectCatalog, g7DefectTypes]);

  // Defect Mapping Helpers
  const mapCustomerDefectsToCompany = (custCode) => {
    return resolveG7ErrorCode(custCode, defectCatalog);
  };

  const mapCustomerDefectsToG7Name = (custCode, g7Code) => {
    return resolveG7ErrorName(g7Code, custCode, g7DefectTypes, defectCatalog);
  };

  const handleSelectDefectCode = (code, isProcess = false) => {
    const cleanCode = (code || '').trim().toLowerCase();
    const match = (defectCatalog || []).find(d => 
      (d.code || d.client_defect_code || d.defect_code || '').trim().toLowerCase() === cleanCode
    );
    const claimMatch = (claims || []).find(c => 
      (c.order_code || c.defect_code || '').trim().toLowerCase() === cleanCode && 
      (c.claim_description || c.description)
    );
    const defectName = (match && (match.name || match.name_en)) || (claimMatch && (claimMatch.claim_description || claimMatch.description)) || '';
    const g7Code = (match && match.g7_code) || resolveG7ErrorCode(code, defectCatalog);
    const g7Name = resolveG7ErrorName(g7Code, code, g7DefectTypes, defectCatalog);

    if (isProcess) {
      setProcessMaLoi(code);
      if (defectName) setProcessTenLoiKH(defectName);
      if (g7Code) setProcessMaLoiCty(g7Code);
      if (g7Name) setProcessTenLoiG7(g7Name);
      setShowProcessDefectCodeSuggestions(false);
    } else {
      setAddMaLoi(code);
      if (defectName) setAddTenLoiKH(defectName);
      if (g7Code) setAddMaLoiCty(g7Code);
      if (g7Name) setAddTenLoiG7(g7Name);
      setShowAddDefectSuggestions(false);
    }
  };

  const handleSelectCustomerDefectName = (name, isProcess = false) => {
    const cleanName = (name || '').trim().toLowerCase();
    const match = (defectCatalog || []).find(d => 
      (d.name || '').trim().toLowerCase() === cleanName || 
      (d.name_en || '').trim().toLowerCase() === cleanName
    );
    const claimMatch = (claims || []).find(c => 
      (c.claim_description || c.description || '').trim().toLowerCase() === cleanName
    );
    const matchedCode = (match && (match.code || match.client_defect_code || match.defect_code)) || 
                        (claimMatch && (claimMatch.order_code || claimMatch.defect_code)) || '';
    const g7Code = (match && match.g7_code) || (matchedCode ? resolveG7ErrorCode(matchedCode, defectCatalog) : '');
    const g7Name = resolveG7ErrorName(g7Code, matchedCode, g7DefectTypes, defectCatalog);

    if (isProcess) {
      setProcessTenLoiKH(name);
      if (matchedCode) setProcessMaLoi(matchedCode);
      if (g7Code) setProcessMaLoiCty(g7Code);
      if (g7Name) setProcessTenLoiG7(g7Name);
      setShowProcessTenLoiKHSuggestions(false);
    } else {
      setAddTenLoiKH(name);
      if (matchedCode) setAddMaLoi(matchedCode);
      if (g7Code) setAddMaLoiCty(g7Code);
      if (g7Name) setAddTenLoiG7(g7Name);
      setShowAddTenLoiKHSuggestions(false);
    }
  };

  const handleSelectG7Code = (code, isProcess = false) => {
    const name = resolveG7ErrorName(code, null, g7DefectTypes, defectCatalog);
    const clientMatch = (defectCatalog || []).find(cd => (cd.g7_code || '').trim().toLowerCase() === (code || '').trim().toLowerCase());
    if (isProcess) {
      setProcessMaLoiCty(code);
      if (name) setProcessTenLoiG7(name);
      if (clientMatch && !processMaLoi) {
        setProcessMaLoi(clientMatch.code || clientMatch.client_defect_code || clientMatch.defect_code || '');
        if (clientMatch.name || clientMatch.name_en) setProcessTenLoiKH(clientMatch.name || clientMatch.name_en);
      }
      setShowProcessG7CodeSuggestions(false);
    } else {
      setAddMaLoiCty(code);
      if (name) setAddTenLoiG7(name);
      if (clientMatch && !addMaLoi) {
        setAddMaLoi(clientMatch.code || clientMatch.client_defect_code || clientMatch.defect_code || '');
        if (clientMatch.name || clientMatch.name_en) setAddTenLoiKH(clientMatch.name || clientMatch.name_en);
      }
      setShowAddG7CodeSuggestions(false);
    }
  };

  const handleSelectG7Name = (name, isProcess = false) => {
    const match = (g7DefectTypes || []).find(gt => (gt.name || gt.short_description || '') === name);
    const g7Code = match ? match.code : '';
    const clientMatch = g7Code ? (defectCatalog || []).find(cd => (cd.g7_code || '').trim().toLowerCase() === g7Code.trim().toLowerCase()) : null;
    if (isProcess) {
      setProcessTenLoiG7(name);
      if (g7Code) setProcessMaLoiCty(g7Code);
      if (clientMatch && !processMaLoi) {
        setProcessMaLoi(clientMatch.code || clientMatch.client_defect_code || clientMatch.defect_code || '');
        if (clientMatch.name || clientMatch.name_en) setProcessTenLoiKH(clientMatch.name || clientMatch.name_en);
      }
      setShowProcessG7NameSuggestions(false);
    } else {
      setAddTenLoiG7(name);
      if (g7Code) setAddMaLoiCty(g7Code);
      if (clientMatch && !addMaLoi) {
        setAddMaLoi(clientMatch.code || clientMatch.client_defect_code || clientMatch.defect_code || '');
        if (clientMatch.name || clientMatch.name_en) setAddTenLoiKH(clientMatch.name || clientMatch.name_en);
      }
      setShowAddG7NameSuggestions(false);
    }
  };

  // Penalty preview calculations
  const getProcessTotalPenaltyPreview = () => {
    const mockClaim = {
      penalty: processGiaTriPhat,
      product_name: processTenSanPham || activeDetailClaim?.product_name || activeDetailClaim?.sku
    };
    return calculateTotalPenalty(mockClaim, processHeSoPhat, cabinetPrices);
  };

  const getAddTotalPenaltyPreview = () => {
    const mockClaim = {
      penalty: addGiaTriPhat,
      product_name: addTenSanPham
    };
    return calculateTotalPenalty(mockClaim, addHeSoPhat, cabinetPrices);
  };

  // Image upload helpers
  const handleEditAddImageClick = (index) => {
    setEditingAddImageIndex(index);
    if (addImageInputRef.current) addImageInputRef.current.click();
  };

  const handleAddImageClick = () => {
    setEditingAddImageIndex(null);
    if (addImageInputRef.current) addImageInputRef.current.click();
  };

  const handleAddImageFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      setLoading(true);
      for (const file of files) {
        const res = await claimService.uploadImage(file);
        if (res && res.path) {
          if (editingAddImageIndex !== null) {
            setAddImages(prev => {
              const updated = [...prev];
              updated[editingAddImageIndex] = res.path;
              return updated;
            });
            setEditingAddImageIndex(null);
          } else {
            setAddImages(prev => [...prev, res.path]);
            setAddImageCaptions(prev => [...prev, file.name]);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải ảnh:', err);
      showModal('Lỗi', 'Không thể tải ảnh lên hệ thống.', 'error');
    } finally {
      setLoading(false);
      if (addImageInputRef.current) addImageInputRef.current.value = '';
    }
  };

  const handleDeleteAddImageClick = (index) => {
    setAddImages(prev => prev.filter((_, idx) => idx !== index));
    setAddImageCaptions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleEditProcessImageClick = (index) => {
    setEditingProcessImageIndex(index);
    if (editImageInputRef.current) editImageInputRef.current.click();
  };

  const handleProcessAddImageClick = () => {
    setEditingProcessImageIndex(null);
    if (editImageInputRef.current) editImageInputRef.current.click();
  };

  const handleProcessImageFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      setLoading(true);
      for (const file of files) {
        const res = await claimService.uploadImage(file);
        if (res && res.path) {
          if (editingProcessImageIndex !== null) {
            setProcessImages(prev => {
              const updated = [...prev];
              updated[editingProcessImageIndex] = res.path;
              return updated;
            });
            setEditingProcessImageIndex(null);
          } else {
            setProcessImages(prev => [...prev, res.path]);
            setProcessImageCaptions(prev => [...prev, file.name]);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải ảnh:', err);
      showModal('Lỗi', 'Không thể tải ảnh lên hệ thống.', 'error');
    } finally {
      setLoading(false);
      if (editImageInputRef.current) editImageInputRef.current.value = '';
    }
  };

  const handleDeleteProcessImageClick = (index) => {
    setProcessImages(prev => prev.filter((_, idx) => idx !== index));
    setProcessImageCaptions(prev => prev.filter((_, idx) => idx !== index));
  };

  // Open add new claim modal
  const handleOpenAddNewClaim = () => {
    setAddDongHang('Atlas');
    setAddLoaiClaim('Khách nhắc nhở');
    setAddMaThamChieu('');
    setAddTenSanPham('');
    setAddMucPhat('Nhắc nhở');
    setAddGiaTriPhat('');
    setAddHeSoPhat(2);
    setAddMaLoi('');
    setAddTenLoiKH('');
    setAddMaLoiCty('');
    setAddTenLoiG7('');
    setAddLpn('');
    setAddMaCont('');

    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    setAddNgayXuat(formattedToday);

    setAddTrangThaiXuLy('Mới');
    setAddLinkCapa('');
    setAddGhiChu('');
    setAddImages([]);
    setAddImageCaptions([]);
    setAddModalError('');
    setIsAddModalOpen(true);
  };

  // Save new claim
  const handleSaveNewClaim = async () => {
    const missingFields = [];
    if (!addTenSanPham || !addTenSanPham.trim()) {
      missingFields.push("Tên sản phẩm");
    }
    if (!addMaThamChieu || !addMaThamChieu.trim()) {
      missingFields.push("Mã tham chiếu");
    }
    if (!addNgayXuat || !addNgayXuat.trim()) {
      missingFields.push("Thời gian (Ngày xuất)");
    }
    if (!addImages || addImages.length === 0) {
      missingFields.push("Hình ảnh minh chứng");
    }

    if (missingFields.length > 0) {
      setAddModalError(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}. Yêu cầu nhập đầy đủ trước khi lưu.`);
      return;
    }
    setAddModalError('');

    try {
      setLoading(true);
      let backendStatus = 'Received';
      if (addTrangThaiXuLy === 'Đang xem xét') {
        backendStatus = 'Processing';
      } else if (addTrangThaiXuLy === 'Đã xử lý') {
        backendStatus = 'Resolved';
      }

      const claimData = {
        claim_code: addMaThamChieu,
        customer_name: addDongHang,
        product_name: addTenSanPham,
        order_code: addMaLoi,
        company_error_code: addMaLoiCty,
        company_error_name: addTenLoiG7,
        description: addTenLoiKH || addGhiChu || '',
        severity: addMucPhat === 'Hủy đơn' ? 'High' : addMucPhat === 'Phạt tiền' ? 'Medium' : 'Low',
        status: backendStatus
      };

      const result = await claimService.createClaim(claimData);

      if (result && result.id) {
        const newClaim = {
          id: result.id,
          product_name: result.product_name,
          claim_code: result.claim_code,
          order_code: result.order_code,
          company_error_code: result.company_error_code,
          company_error_name: result.company_error_name || addTenLoiG7,
          penalty: normalizePenaltyValue(addGiaTriPhat || '$0'),
          lpn: addLpn,
          cont: addMaCont,
          date: addNgayXuat ? (() => {
            const parts = addNgayXuat.split('-');
            if (parts.length === 3) return `${parts[1]}-${parts[0]}`;
            return '06-2026';
          })() : (() => {
            const d = new Date();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${mm}-${yyyy}`;
          })(),
          status: result.status === 'Resolved' ? 'Đã xử lý' : result.status === 'Processing' ? 'Đang xem xét' : 'Mới',
          claim_description: result.description,
          capa_link: addLinkCapa,
          image_paths: addImages,
          image_captions: addImageCaptions,
          customer_name: result.customer_name || addDongHang,
          severity: result.severity || (addMucPhat === 'Hủy đơn' ? 'High' : addMucPhat === 'Phạt tiền' ? 'Medium' : 'Low')
        };

        if (setQuickSearch) setQuickSearch('');
        if (setAppliedFilters) setAppliedFilters({
          time: { year: '', month: '', startDate: '', endDate: '', showAllTime: true },
          claim: { status: '', sku: '', companyErrorCode: '', companyErrorName: '', claimItem: '', defectCode: '' },
          transport: { container: '', lpn: '', penalty: '', penaltyTotal: '' }
        });

        setClaims(prev => [newClaim, ...prev]);
        setIsAddModalOpen(false);

        const successMessage = (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <p style={{ marginBottom: '14px', fontWeight: '500', color: '#2D1A12' }}>
                Thêm mới khiếu nại khách hàng thành công!
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', border: '1.5px solid #EADCC9' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', width: '35%', color: '#7B5233' }}>Tên sản phẩm</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.product_name}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Mã tham chiếu</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.claim_code}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Mã lỗi KH</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.order_code || 'N/A'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Mã lỗi G7</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.company_error_code || 'N/A'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Giá trị phạt</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12', fontWeight: '500' }}>{newClaim.penalty}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Tổng tiền phạt</td>
                    <td style={{ padding: '8px 12px', color: '#B91C1C', fontWeight: '600' }}>{formatPenaltyValue(calculateTotalPenalty(newClaim, undefined, cabinetPrices))}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Container</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.cont || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {newClaim.image_paths && newClaim.image_paths.length > 0 && (
              <div style={{ width: '130px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#7B5233' }}>Ảnh minh chứng:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {newClaim.image_paths.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={getFullImagePath(imgUrl)}
                      alt={`Minh chứng ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '75px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid #EADCC9',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'zoom-in'
                      }}
                      onClick={() => setPreviewImage(getFullImagePath(imgUrl))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

        showModal('Thành công', successMessage, 'success');
      } else {
        showModal('Thất bại', 'Không thể lưu khiếu nại mới vào cơ sở dữ liệu.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi lưu khiếu nại:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Lỗi không xác định khi lưu khiếu nại.';
      showModal('Thất bại', `Lỗi: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save process / updated claim
  const handleSaveProcessClaim = async () => {
    if (!processTenSanPham.trim()) {
      showModal('Cảnh báo', 'Vui lòng nhập Tên sản phẩm.', 'warning');
      return;
    }
    if (!processMaThamChieu.trim()) {
      showModal('Cảnh báo', 'Vui lòng nhập Mã tham chiếu.', 'warning');
      return;
    }
    if (!processMaLoi.trim()) {
      showModal('Cảnh báo', 'Vui lòng nhập Mã lỗi.', 'warning');
      return;
    }

    try {
      setLoading(true);
      let backendStatus = 'Received';
      if (processTrangThaiXuLy === 'Đang xem xét') {
        backendStatus = 'Processing';
      } else if (processTrangThaiXuLy === 'Đã xử lý') {
        backendStatus = 'Resolved';
      }

      const claimData = {
        claim_code: processMaThamChieu,
        customer_name: processDongHang,
        product_name: processTenSanPham,
        order_code: processMaLoi,
        company_error_code: processMaLoiCty,
        company_error_name: processTenLoiG7,
        description: processTenLoiKH || '',
        severity: processMucPhat === 'Hủy đơn' ? 'High' : processMucPhat === 'Phạt tiền' ? 'Medium' : 'Low',
        status: backendStatus,
        action: processGiaTriPhat,
        lpn: processLpn,
        container_no: processMaCont,
        image_paths: processImages,
        image_captions: processImageCaptions
      };

      const result = await claimService.updateClaim(activeDetailClaim.id, claimData);

      if (result && result.id) {
        setClaims(prev => prev.map(c => c.id === activeDetailClaim.id ? {
          ...c,
          product_name: result.product_name,
          claim_code: result.claim_code,
          order_code: result.order_code,
          company_error_code: result.company_error_code,
          company_error_name: result.company_error_name || processTenLoiG7,
          penalty: normalizePenaltyValue(processGiaTriPhat),
          lpn: processLpn,
          cont: processMaCont,
          status: (result.status === 'Resolved' || result.status === 'Đã xử lý') ? 'Đã xử lý' : (result.status === 'Processing' || result.status === 'Đang xem xét') ? 'Đang xem xét' : 'Mới',
          claim_description: result.description,
          capa_link: processLinkCapa,
          image_paths: processImages,
          image_captions: processImageCaptions,
          customer_name: result.customer_name || processDongHang,
          severity: result.severity || (processMucPhat === 'Hủy đơn' ? 'High' : processMucPhat === 'Phạt tiền' ? 'Medium' : 'Low')
        } : c));
        setActiveDetailClaim(null);
        setExceptionNavMode(false);
        setExceptionNavClaims([]);
        showModal('Thành công', `Cập nhật thành công sản phẩm ${processTenSanPham}!`, 'success');
      } else {
        showModal('Thất bại', 'Không thể cập nhật khiếu nại. Vui lòng thử lại.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật khiếu nại:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Lỗi không xác định khi cập nhật khiếu nại.';
      showModal('Thất bại', `Lỗi: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Navigations in process modal
  const handlePrevClaim = () => {
    const list = exceptionNavMode ? exceptionNavClaims : claims;
    if (!list || list.length === 0 || !activeDetailClaim) return;
    const currIdx = list.findIndex(c => c.id === activeDetailClaim.id);
    if (currIdx > 0) {
      setActiveDetailClaim(list[currIdx - 1]);
    }
  };

  const handleNextClaim = () => {
    const list = exceptionNavMode ? exceptionNavClaims : claims;
    if (!list || list.length === 0 || !activeDetailClaim) return;
    const currIdx = list.findIndex(c => c.id === activeDetailClaim.id);
    if (currIdx >= 0 && currIdx < list.length - 1) {
      setActiveDetailClaim(list[currIdx + 1]);
    }
  };

  return {
    addImageInputRef,
    editImageInputRef,
    activeDetailClaim,
    setActiveDetailClaim,
    modalMode,
    setModalMode,
    exceptionNavMode,
    setExceptionNavMode,
    exceptionNavClaims,
    setExceptionNavClaims,

    // Add modal
    isAddModalOpen,
    setIsAddModalOpen,
    addDongHang, setAddDongHang,
    addLoaiClaim, setAddLoaiClaim,
    addMaThamChieu, setAddMaThamChieu,
    addTenSanPham, setAddTenSanPham,
    addMucPhat, setAddMucPhat,
    addGiaTriPhat, setAddGiaTriPhat,
    addHeSoPhat, setAddHeSoPhat,
    addMaLoi, setAddMaLoi,
    addTenLoiKH, setAddTenLoiKH,
    addMaLoiCty, setAddMaLoiCty,
    addTenLoiG7, setAddTenLoiG7,
    showAddG7CodeSuggestions, setShowAddG7CodeSuggestions,
    showAddG7NameSuggestions, setShowAddG7NameSuggestions,
    addLpn, setAddLpn,
    addMaCont, setAddMaCont,
    addNgayXuat, setAddNgayXuat,
    addTrangThaiXuLy, setAddTrangThaiXuLy,
    addLinkCapa, setAddLinkCapa,
    addGhiChu, setAddGhiChu,
    addImages, setAddImages,
    addImageCaptions, setAddImageCaptions,
    addModalError, setAddModalError,
    showAddSuggestions, setShowAddSuggestions,
    showAddDefectSuggestions, setShowAddDefectSuggestions,
    showAddTenLoiKHSuggestions, setShowAddTenLoiKHSuggestions,
    handleOpenAddNewClaim,
    handleSaveNewClaim,
    getAddTotalPenaltyPreview,
    handleAddImageClick,
    handleEditAddImageClick,
    handleAddImageFileChange,
    handleDeleteAddImageClick,

    // Process modal
    processDongHang, setProcessDongHang,
    processLoaiClaim, setProcessLoaiClaim,
    processMaThamChieu, setProcessMaThamChieu,
    processTenSanPham, setProcessTenSanPham,
    processMucPhat, setProcessMucPhat,
    processGiaTriPhat, setProcessGiaTriPhat,
    processHeSoPhat, setProcessHeSoPhat,
    processMaLoi, setProcessMaLoi,
    processTenLoiKH, setProcessTenLoiKH,
    processMaLoiCty, setProcessMaLoiCty,
    processTenLoiG7, setProcessTenLoiG7,
    showProcessDefectCodeSuggestions, setShowProcessDefectCodeSuggestions,
    showProcessTenLoiKHSuggestions, setShowProcessTenLoiKHSuggestions,
    showProcessG7CodeSuggestions, setShowProcessG7CodeSuggestions,
    showProcessG7NameSuggestions, setShowProcessG7NameSuggestions,
    processLpn, setProcessLpn,
    processMaCont, setProcessMaCont,
    processNgayXuat, setProcessNgayXuat,
    processTrangThaiXuLy, setProcessTrangThaiXuLy,
    processLinkCapa, setProcessLinkCapa,
    processGhiChu, setProcessGhiChu,
    processImages, setProcessImages,
    processImageCaptions, setProcessImageCaptions,
    handleSaveProcessClaim,
    getProcessTotalPenaltyPreview,
    handleProcessAddImageClick,
    handleEditProcessImageClick,
    handleProcessImageFileChange,
    handleDeleteProcessImageClick,
    handlePrevClaim,
    handleNextClaim,

    // Mapping & Selection
    mapCustomerDefectsToCompany,
    mapCustomerDefectsToG7Name,
    handleSelectDefectCode,
    handleSelectCustomerDefectName,
    handleSelectG7Code,
    handleSelectG7Name
  };
};

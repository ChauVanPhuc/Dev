import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, FileSpreadsheet, Printer, X, Image as ImageIcon, CheckCircle, CheckCircle2, User, Calendar, Info, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { getInspectionTypeLabel } from './hooks/useInspectionReports';
import '@styles/components.css';

/**
 * Trích xuất danh sách các lỗi / hạng mục không đạt từ data_json hoặc thông tin phiếu
 */
const extractDefects = (item) => {
  if (!item) return [];
  let parsed = {};
  try {
    parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
  } catch (e) {}

  let rawList = parsed.defects || parsed.errors || parsed.defect_list || parsed.defectsList || item.defects || [];
  const defects = [];

  if (Array.isArray(rawList) && rawList.length > 0) {
    rawList.forEach((d, idx) => {
      if (typeof d === 'string') {
        defects.push({
          id: idx,
          name: d,
          quantity: 1,
          severity: 'Không đạt',
          note: ''
        });
      } else if (typeof d === 'object' && d !== null) {
        defects.push({
          id: d.defectId || d.id || idx,
          name: d.defect_name || d.name || d.code || `Lỗi #${idx + 1}`,
          code: d.code || d.defect_code || '',
          quantity: d.quantity || d.qty || d.count || 1,
          severity: d.isHeavy ? 'Lỗi nặng (Major)' : (d.isCTQ ? 'Lỗi chí mạng (CTQ)' : (d.severity || 'Lỗi kiểm tra')),
          isCTQ: !!d.isCTQ,
          isHeavy: !!d.isHeavy,
          note: d.note || d.description || '',
          images: d.images || []
        });
      }
    });
  }

  // Check steps for failed steps
  if (parsed.steps) {
    Object.entries(parsed.steps).forEach(([stepName, val]) => {
      if (val && (val.result === 'fail' || val.result === 'Lỗi' || val.status === 'FAIL')) {
        if (!defects.some(d => d.name.toLowerCase().includes(stepName.toLowerCase()))) {
          defects.push({
            id: `step_${stepName}`,
            name: stepName,
            quantity: 1,
            severity: 'Không đạt tiêu chuẩn',
            note: val.value ? `Giá trị đo: ${val.value}` : (val.note || ''),
            isFailedStep: true
          });
        }
      }
    });
  }

  // Check samples for failed samples
  if (Array.isArray(parsed.samples)) {
    parsed.samples.forEach((s, idx) => {
      if (s.result === 'fail' || s.visual === 'fail' || s.function === 'fail') {
        let reasons = [];
        if (s.visual === 'fail') reasons.push('Lỗi ngoại quan');
        if (s.function === 'fail') reasons.push('Lỗi chức năng');
        if (s.moisture?.result === 'fail') reasons.push('Lỗi độ ẩm');
        if (s.size?.result === 'fail') reasons.push('Lỗi kích thước');
        const failText = reasons.length > 0 ? reasons.join(', ') : 'Không đạt yêu cầu';
        
        defects.push({
          id: `sample_${idx}`,
          name: `Mẫu #${s.stt || idx + 1}: ${failText}`,
          quantity: 1,
          severity: 'Mẫu không đạt',
          note: s.note || ''
        });
      }
    });
  }

  // Fallback: extract listed defects from text notes if no structured defects found but record is failed
  const noteText = item.notes || item.note || parsed.note || '';
  const isFailedRecord = (item.conclusion === 'fail' || item.result === 'KHÔNG ĐẠT' || item.result === 'Lỗi' || item.result === 'fail');

  if (defects.length === 0 && isFailedRecord) {
    if (noteText) {
      const matchParen = noteText.match(/\((.*?)\)/);
      if (matchParen && matchParen[1]) {
        const errorItems = matchParen[1].split(/,|và|&/).map(s => s.trim()).filter(Boolean);
        errorItems.forEach((errName, idx) => {
          defects.push({
            id: `note_extracted_${idx}`,
            name: errName.charAt(0).toUpperCase() + errName.slice(1),
            quantity: 'Ghi nhận trong phiếu',
            severity: 'Lỗi phát hiện',
            note: noteText
          });
        });
      } else {
        defects.push({
          id: `note_general`,
          name: 'Phát hiện lỗi không đạt quy cách / tiêu chuẩn',
          quantity: item.error_qty || 1,
          severity: 'Không đạt',
          note: noteText
        });
      }
    }
  }

  return defects;
};

const InspectionDetailView = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};

  // Cấu hình động mã màn hình, tên màn hình từ Database
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/reports/detail/:type/:id');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [title, subtitle, screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [actualType, setActualType] = useState(type);

  // Lấy thông tin tài khoản hiện tại
  const currentUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      let res;
      if (type === 'stage') {
        res = await api.get(`/inspections/stage/${id}`);
        setActualType('stage');
      } else if (type === 'input') {
        try {
          res = await api.get(`/inspections/input/${id}`);
          setActualType('input');
        } catch (err) {
          // Fallback to stage inspection if not found in InputInspection table
          if (err.response?.status === 404 || err.status === 404) {
            res = await api.get(`/inspections/stage/${id}`);
            setActualType('stage');
          } else {
            throw err;
          }
        }
      }
      if (res) {
        setItem(res);
      }
    } catch (error) {
      console.error('Error fetching inspection detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [type, id]);

  const handleConfirm = async () => {
    if (!item) return;
    setConfirming(true);
    try {
      const res = await api.post(`/inspections/confirm/${actualType}/${id}`, {
        confirmed_by: currentUser.id
      });
      if (res) {
        setItem(prev => ({
          ...prev,
          is_confirmed: true,
          confirmed_at: res.confirmed_at,
          confirmed_by: res.confirmed_by
        }));
        alert("Xác nhận kết quả phiếu kiểm tra thành công!");
      }
    } catch (error) {
      console.error('Error confirming inspection:', error);
      alert("Gặp lỗi khi xác nhận phiếu: " + (error.response?.data?.detail || error.message));
    } finally {
      setConfirming(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const clean = path.replace(/^\/+/, '');
    const { hostname } = window.location;
    const isDev = window.location.port === '1222' || window.location.port === '1333' || window.location.port === '5173' || window.location.port === '3000' || window.location.port === '5174';
    const base = isDev ? `http://${hostname}:1111` : window.location.origin;
    return `${base}/${clean}`;
  };

  // Trích xuất toàn bộ ảnh minh chứng của phiếu kiểm tra công đoạn
  const getStageImages = (stageItem) => {
    if (!stageItem) return [];
    const list = [];
    let parsedData = {};
    try {
      parsedData = typeof stageItem.data_json === 'string' ? JSON.parse(stageItem.data_json || '{}') : (stageItem.data_json || {});
    } catch (e) {}

    if (parsedData.steps) {
      Object.values(parsedData.steps).forEach(st => {
        if (st.photo) list.push(st.photo);
      });
    }
    if (Array.isArray(parsedData.detailsList)) {
      parsedData.detailsList.forEach(det => {
        if (det.image) list.push(det.image);
      });
    }
    if (Array.isArray(parsedData.samples)) {
      parsedData.samples.forEach(s => {
        if (s.moisture?.photo) list.push(s.moisture.photo);
        if (s.size?.photo) list.push(s.size.photo);
      });
    }
    if (Array.isArray(parsedData.checklist_results)) {
      parsedData.checklist_results.forEach(res => {
        if (Array.isArray(res.images)) list.push(...res.images);
        if (Array.isArray(res.steps)) {
          res.steps.forEach(st => {
            if (Array.isArray(st.images)) list.push(...st.images);
          });
        }
      });
    }
    
    // Thêm các ảnh tổng hợp từ images_json
    let generalImages = [];
    try {
      const parsedImages = typeof stageItem.images_json === 'string' ? JSON.parse(stageItem.images_json || '{}') : (stageItem.images_json || {});
      Object.values(parsedImages).forEach(val => {
        if (Array.isArray(val)) generalImages.push(...val);
        else if (typeof val === 'string') generalImages.push(val);
      });
    } catch (e) {}

    const allImages = Array.from(new Set([...list, ...generalImages, stageItem.image_path_1, stageItem.image_path_2, stageItem.image_path_3])).filter(Boolean);
    return allImages;
  };

  // In / Xuất PDF lẻ
  const handlePrintPDF = () => {
    if (!item) return;
    const isInput = type === 'input';
    const typeLabel = isInput ? 'Kiểm Tra Đầu Vào (IQC)' : getInspectionTypeLabel(item.inspection_type);
    const dateVal = isInput ? item.inspected_at : item.inspection_date;
    
    let detailsHtml = '';
    const imagesList = isInput ? [item.image_path_1, item.image_path_2, item.image_path_3].filter(Boolean) : getStageImages(item);
    
    if (isInput) {
      detailsHtml = `
        <div style="margin-top:15px; font-weight:bold; color:#7B5233;">Thông số đo kích thước:</div>
        <table style="width:100%; border-collapse:collapse; margin-top:8px;">
          <thead>
            <tr style="background:#7B5233; color:#fff;">
              <th style="padding:8px; border:1px solid #ddd;">Chiều dài (mm)</th>
              <th style="padding:8px; border:1px solid #ddd;">Chiều rộng (mm)</th>
              <th style="padding:8px; border:1px solid #ddd;">Chiều dày (mm)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.measured_length != null ? item.measured_length : '---'}</td>
              <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.measured_width != null ? item.measured_width : '---'}</td>
              <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.measured_height != null ? item.measured_height : '---'}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      let parsed = {};
      try {
        parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
      } catch (e) {}

      if (parsed.steps) {
        detailsHtml = `
          <div style="margin-top:15px; font-weight:bold; color:#7B5233;">Các bước quy trình kiểm tra:</div>
          <table style="width:100%; border-collapse:collapse; margin-top:8px;">
            <thead>
              <tr style="background:#7B5233; color:#fff;">
                <th style="padding:8px; border:1px solid #ddd;">Hạng mục kiểm tra</th>
                <th style="padding:8px; border:1px solid #ddd;">Giá trị đo được</th>
                <th style="padding:8px; border:1px solid #ddd; text-align:center;">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(parsed.steps).map(([k, val]) => `
                <tr>
                  <td style="padding:8px; border:1px solid #ddd;">${k}</td>
                  <td style="padding:8px; border:1px solid #ddd;">${val.value || 'N/A'}</td>
                  <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:bold; color:${val.result === 'pass' ? '#16a34a' : '#dc2626'}">${val.result === 'pass' ? 'Đạt' : 'Lỗi'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    const printDefects = extractDefects(item);
    let defectsPdfHtml = '';
    if (printDefects.length > 0) {
      defectsPdfHtml = `
        <div style="margin-top:15px; font-weight:bold; color:#dc2626; font-size:14px;">DANH SÁCH LỖI / HẠNG MỤC PHÁT HIỆN KHÔNG ĐẠT:</div>
        <table style="width:100%; border-collapse:collapse; margin-top:8px;">
          <thead>
            <tr style="background:#fee2e2; color:#991b1b;">
              <th style="padding:8px; border:1px solid #fca5a5; width:40px; text-align:center;">STT</th>
              <th style="padding:8px; border:1px solid #fca5a5; text-align:left;">Tên loại lỗi / Hạng mục vi phạm</th>
              <th style="padding:8px; border:1px solid #fca5a5; text-align:center;">Số lượng</th>
              <th style="padding:8px; border:1px solid #fca5a5; text-align:center;">Mức độ</th>
              <th style="padding:8px; border:1px solid #fca5a5; text-align:left;">Ghi chú / Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            ${printDefects.map((d, i) => `
              <tr>
                <td style="padding:8px; border:1px solid #fca5a5; text-align:center; font-weight:bold;">${i + 1}</td>
                <td style="padding:8px; border:1px solid #fca5a5; font-weight:bold; color:#991b1b;">${d.name}</td>
                <td style="padding:8px; border:1px solid #fca5a5; text-align:center; font-weight:bold;">${d.quantity}</td>
                <td style="padding:8px; border:1px solid #fca5a5; text-align:center;"><span style="color:${d.isCTQ || d.isHeavy ? '#dc2626' : '#d97706'}; font-weight:bold;">${d.severity}</span></td>
                <td style="padding:8px; border:1px solid #fca5a5;">${d.note || item.notes || item.note || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const imagesHtml = imagesList.length > 0 ? `
      <div style="margin-top:20px;">
        <div style="font-weight:bold; color:#7B5233; margin-bottom:10px; font-size:14px;">HÌNH ẢNH MINH CHỨNG:</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${imagesList.map(img => `<img src="${getImageUrl(img)}" style="width:140px; height:100px; object-fit:cover; border-radius:6px; border:1px solid #ddd;" />`).join('')}
        </div>
      </div>
    ` : '';

    const printWin = window.open('', '_blank');
    if (!printWin) return alert('Vui lòng cho phép bật cửa sổ popup để in PDF!');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Kiểm Tra QC - #${item.ticket_code || 'DA' + String(item.id).padStart(3, '0')}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7B5233; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #7B5233; text-transform: uppercase; }
          .sub { font-size: 13px; color: #64748b; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #faf6f0; padding: 15px; border-radius: 8px; border: 1px solid #eadcc9; margin-bottom: 20px; }
          .info-item { font-size: 14px; }
          .info-item label { color: #78350f; font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
          .sig-box { width: 45%; }
          .sig-title { font-weight: bold; font-size: 14px; margin-bottom: 60px; }
          .confirm-status { margin-top: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #7B5233; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ In / Xuất PDF
          </button>
        </div>
        <div class="header">
          <div>
            <div class="title">G7 SMARTFLOW ERP</div>
            <div class="sub">HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG SẢN XUẤT</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: bold; color: #7B5233;">PHIẾU KIỂM TRA CHẤT LƯỢNG</div>
            <div style="font-size: 12px; color: #64748b;">Mã phiếu: ${item.ticket_code || 'DA' + String(item.id).padStart(3, '0')} | Ngày: ${new Date(dateVal).toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item"><label>Loại kiểm tra:</label> ${typeLabel}</div>
          <div class="info-item"><label>QC Thực Hiện:</label> ${isInput ? (item.inspector_name || 'N/A') : (item.inspector_name || 'N/A')}</div>
          ${isInput ? `
            <div class="info-item"><label>Tên linh kiện:</label> ${item.part_name || 'N/A'}</div>
            <div class="info-item"><label>Quy cách:</label> ${item.specification || 'N/A'}</div>
            <div class="info-item"><label>Container/PO:</label> ${item.cont_name || 'N/A'}</div>
            <div class="info-item"><label>Kết luận:</label> <span style="font-weight:bold; color:${item.result === 'Đạt' ? '#16a34a':'#dc2626'}">${item.result || 'N/A'}</span></div>
          ` : `
            <div class="info-item"><label>Mã PO (Lệnh SX):</label> ${item.batch_no || 'N/A'}</div>
            <div class="info-item"><label>Mã Sản Phẩm:</label> ${item.product_sku || 'N/A'}</div>
            <div class="info-item"><label>Kết Luận:</label> <span style="font-weight:bold; color:${item.conclusion === 'pass' ? '#16a34a':'#dc2626'}">${item.conclusion === 'pass' ? 'ĐẠT' : 'LỖI'}</span></div>
          `}
        </div>

        ${item.is_confirmed ? `
          <div class="confirm-status">
            ✓ ĐÃ XÁC NHẬN KẾT QUẢ KIỂM TRA CHẤT LƯỢNG (Xác nhận lúc: ${new Date(item.confirmed_at).toLocaleString('vi-VN')})
          </div>
        ` : ''}

        ${item.notes || item.note ? `<div style="background:#fffbeb; padding:10px; border-radius:6px; border:1px solid #fef3c7; margin:15px 0; font-size:13px; color:#92400e;"><b>Ghi chú:</b> ${item.notes || item.note}</div>` : ''}

        ${defectsPdfHtml}
        ${detailsHtml}
        ${imagesHtml}

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">NGƯỜI LẬP PHIẾU (QC)</div>
            <div>${item.inspector_name || 'Ký tên'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">TRƯỞNG BỘ PHẬN QUẢN LÝ CHẤT LƯỢNG</div>
            <div>Ký tên & Đóng dấu</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  if (loading) {
    return (
      <div style={{ padding: '6rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div className="spinner"></div>
          <span style={{ color: '#8D6E63', fontWeight: 600 }}>Đang tải thông tin chi tiết phiếu kiểm tra...</span>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: '6rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
        <h3 style={{ color: '#EF4444' }}>Không tìm thấy phiếu kiểm tra!</h3>
        <button 
          onClick={() => navigate(-1)} 
          style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Quay lại trang trước
        </button>
      </div>
    );
  }

  const isInput = type === 'input';
  const isPass = isInput ? item.result === 'Đạt' : item.conclusion === 'pass';
  const dateVal = isInput ? item.inspected_at : item.inspection_date;
  const imagesList = isInput ? [item.image_path_1, item.image_path_2, item.image_path_3].filter(Boolean) : getStageImages(item);
  const defectsList = extractDefects(item);

  return (
    <div className="quality-records-container" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      
      {/* FLOATING ACTION BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9', boxShadow: '0 4px 15px rgba(123, 82, 51, 0.05)', flexWrap: 'wrap', gap: '12px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #EADCC9', background: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', color: '#7B5233', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <ChevronLeft size={18} /> Quay lại
        </button>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={handlePrintPDF}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0284C7', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <Printer size={16} /> In PDF
          </button>
          
          {/* NÚT XÁC NHẬN PHIẾU */}
          {!item.is_confirmed ? (
            <button 
              onClick={handleConfirm}
              disabled={confirming}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: '#7B5233', color: '#fff', padding: '8px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: confirming ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)' }}
            >
              <CheckCircle size={16} /> {confirming ? "Đang xác nhận..." : "Xác nhận kết quả"}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> Đã xác nhận
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION METADATA IF CONFIRMED */}
      {item.is_confirmed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', color: '#065F46' }}>
          <Info size={18} />
          <div>
            Hồ sơ kiểm tra này đã được <strong>Xác nhận hợp lệ</strong> vào lúc <strong>{new Date(item.confirmed_at).toLocaleString('vi-VN')}</strong>.
          </div>
        </div>
      )}

      {/* MAIN CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        
        {/* CARD 1: GENERAL INFORMATION */}
        <div className="card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#7B5233', margin: '0 0 16px 0', borderBottom: '2px solid #FAF6F0', paddingBottom: '10px' }}>
            Thông tin chung phiếu kiểm tra
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Loại kiểm tra:</span>
                <span style={{ fontWeight: '700', color: '#2D1A12' }}>{isInput ? 'Kiểm tra đầu vào (IQC)' : getInspectionTypeLabel(item.inspection_type)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>QC thực hiện:</span>
                <span style={{ fontWeight: '700', color: '#2D1A12' }}>
                  <User size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#8D6E63' }} />
                  {item.inspector_name || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Ngày thực hiện:</span>
                <span style={{ fontWeight: '700', color: '#2D1A12' }}>
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#8D6E63' }} />
                  {new Date(dateVal).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isInput ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Tên chi tiết / Linh kiện:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>{item.part_name || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Quy cách:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>{item.specification || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Container / PO:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>{item.cont_name || 'N/A'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Mã PO / Batch:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>{item.batch_no || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Mã sản phẩm / Công đoạn:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>{item.product_sku || 'N/A'}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Kết luận chung:</span>
                <span style={{
                  backgroundColor: isPass ? '#ECFDF5' : '#FEF2F2',
                  color: isPass ? '#10B981' : '#EF4444',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '0.8rem',
                  border: isPass ? '1px solid #A7F3D0' : '1px solid #FCA5A5'
                }}>
                  {isPass ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Notes */}
          {(item.notes || item.note) && (
            <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '12px', border: '1px solid #EADCC9', fontSize: '0.85rem', marginTop: '16px' }}>
              <strong style={{ color: '#7B5233', display: 'block', marginBottom: '4px' }}>Ghi chú kiểm tra:</strong>
              <span style={{ color: '#2D1A12' }}>{item.notes || item.note}</span>
            </div>
          )}
        </div>

        {/* CARD DEFECTS BREAKDOWN (DANH SÁCH CÁC LỖI PHÁT HIỆN KHÔNG ĐẠT) */}
        {defectsList.length > 0 && (
          <div className="card" style={{ padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '2px solid #FCA5A5', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px 0', borderBottom: '2px solid #FEE2E2', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#991B1B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                <AlertTriangle size={22} color="#DC2626" /> Danh sách các lỗi phát hiện / Hạng mục không đạt ({defectsList.length} lỗi)
              </h3>
              <span style={{ backgroundColor: '#DC2626', color: '#FFFFFF', padding: '4px 12px', borderRadius: '20px', fontWeight: '800', fontSize: '0.8rem' }}>
                CẢNH BÁO LỖI CHẤT LƯỢNG
              </span>
            </div>

            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #FECACA' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                    <th style={{ width: '50px', textAlign: 'center', padding: '10px' }}>STT</th>
                    <th style={{ padding: '10px' }}>Tên loại lỗi / Hạng mục không đạt</th>
                    <th style={{ width: '130px', textAlign: 'center', padding: '10px' }}>Số lượng</th>
                    <th style={{ width: '160px', textAlign: 'center', padding: '10px' }}>Mức độ / Phân loại</th>
                    <th style={{ padding: '10px' }}>Ghi chú / Chi tiết phát hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {defectsList.map((d, index) => (
                    <tr key={d.id || index} style={{ borderBottom: '1px solid #FEE2E2' }}>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#991B1B' }}>{index + 1}</td>
                      <td style={{ fontWeight: '800', color: '#DC2626', fontSize: '0.95rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={16} color="#DC2626" />
                          <span>{d.name}</span>
                          {d.code && <span style={{ fontSize: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', padding: '1px 6px', borderRadius: '4px' }}>[{d.code}]</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '800', color: '#1E293B' }}>
                        {d.quantity}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontWeight: '800',
                          fontSize: '0.75rem',
                          backgroundColor: d.isCTQ ? '#7F1D1D' : (d.isHeavy ? '#FEE2E2' : '#FEF3C7'),
                          color: d.isCTQ ? '#FFFFFF' : (d.isHeavy ? '#991B1B' : '#92400E'),
                          border: d.isCTQ ? 'none' : (d.isHeavy ? '1px solid #FCA5A5' : '1px solid #FDE68A')
                        }}>
                          {d.severity}
                        </span>
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.9rem' }}>
                        {d.note || item.notes || item.note || 'Đã ghi nhận trong phiếu kiểm tra'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CARD 2: MEASUREMENTS OR DETAILED RESULTS */}
        <div className="card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#7B5233', margin: '0 0 16px 0', borderBottom: '2px solid #FAF6F0', paddingBottom: '10px' }}>
            {isInput ? "Kết quả đo kích thước chi tiết (mm)" : "Chi tiết các hạng mục kiểm tra"}
          </h3>
          
          {isInput ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
              <div style={{ background: '#FAF6F0', padding: '14px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU DÀI</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_length != null ? `${item.measured_length} mm` : '---'}</div>
              </div>
              <div style={{ background: '#FAF6F0', padding: '14px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU RỘNG</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_width != null ? `${item.measured_width} mm` : '---'}</div>
              </div>
              <div style={{ background: '#FAF6F0', padding: '14px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU DÀY</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_height != null ? `${item.measured_height} mm` : '---'}</div>
              </div>
            </div>
          ) : (
            (() => {
              let parsed = {};
              try {
                parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
              } catch (e) {}

              if (parsed.steps) {
                return (
                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Hạng mục kiểm tra</th>
                          <th>Giá trị đo được</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Kết luận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(parsed.steps).map(([k, val]) => (
                          <tr key={k}>
                            <td style={{ fontWeight: '600' }}>{k}</td>
                            <td>{val.value || 'N/A'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge ${val.result === 'pass' ? 'pass' : 'fail'}`}>
                                {val.result === 'pass' ? 'Đạt' : 'Lỗi'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              
              if (Array.isArray(parsed.samples)) {
                return (
                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Mẫu kiểm tra</th>
                          <th>Kết quả đo độ ẩm / kích thước</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Kết luận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.samples.map((s, idx) => {
                          const mVal = s.moisture?.values ? s.moisture.values.map(v => `${v}%`).join(', ') : '';
                          const szVal = s.size?.thickness ? `${s.size.thickness}x${s.size.width}x${s.size.length}mm` : '';
                          const samplePass = s.result === 'pass';
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: '700' }}>Mẫu #{s.stt || idx + 1}</td>
                              <td>
                                {mVal && <div>Độ ẩm: <strong>{mVal}</strong></div>}
                                {szVal && <div>Kích thước: <strong>{szVal}</strong></div>}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`status-badge ${samplePass ? 'pass' : 'fail'}`}>
                                  {samplePass ? 'Đạt' : 'Lỗi'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return <p style={{ color: '#6B7280', fontStyle: 'italic' }}>Không có thêm chi tiết thông số.</p>;
            })()
          )}
        </div>

        {/* CARD 3: EVIDENCE GALLERY */}
        {imagesList.length > 0 && (
          <div className="card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#7B5233', margin: '0 0 16px 0', borderBottom: '2px solid #FAF6F0', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={18} /> Thư viện hình ảnh minh chứng ({imagesList.length} ảnh)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
              {imagesList.map((img, index) => (
                <div 
                  key={index}
                  style={{
                    aspectRatio: '4/3',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #EADCC9',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => setLightboxImage(img)}
                >
                  <img 
                    src={getImageUrl(img)} 
                    alt="Evidence" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LIGHTBOX / FULL IMAGE PREVIEW */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyCenter: 'center', cursor: 'zoom-out' }}
        >
          <img 
            src={getImageUrl(lightboxImage)} 
            alt="Full Preview"
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', objectFit: 'contain', margin: 'auto' }}
          />
          <button 
            onClick={() => setLightboxImage(null)}
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={24} />
          </button>
        </div>
      )}

    </div>
  );
};

export default InspectionDetailView;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Activity,
  Layers,
  CheckCircle2,
  AlertOctagon,
  Share2,
  Download,
  ExternalLink,
  X,
  CheckSquare,
  Settings,
  BookOpen,
  Layout,
  ListOrdered,
  PenTool,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { API_ROOT } from '@webShared/Services/api.service';
import FlowchartTable from '@modules/ISO/Views/Process/FlowchartTable';
import { formatVietnameseDateTime, formatVietnameseDate } from '../utils/isoDateUtils';
import isoSignatureService from '@modules/ISOSignature/services/isoSignature.service';
import { DocumentBottomSignatures } from '@modules/ISO/components/DocumentBottomSignatures';

/**
 * Modal hiển thị thu nhỏ đồng bộ 100% theo các Tab của "Quy trình nghiệp vụ" và "Quản lý mẫu tài liệu".
 * - Quy trình nghiệp vụ gồm 3 Tab: "Nội dung Quy trình", "Hướng dẫn thực hiện", "Tài liệu liên quan".
 * - Lưu đồ được nhúng trực tiếp trong đề mục Lưu trình của Tab "Nội dung Quy trình" dưới dạng SVG Flowchart chuẩn ISO.
 */
export const ApprovalDetailModal = ({
  show,
  detail,
  loading = false,
  onClose,
  onApprove,
  onReject,
  onForward
}) => {
  const navigate = useNavigate();

  // Xác định loại hồ sơ: 'process' (Quy trình nghiệp vụ) hay 'document' (Quản lý mẫu)
  const isProcess = detail?.item_type === 'process';

  // Tab active:
  // - Cho process (3 tab chuẩn như Quy trình nghiệp vụ): 'content' | 'instructions' | 'templates'
  // - Cho document (3 tab chuẩn như Quản lý mẫu): 'preview' | 'config' | 'templates'
  const [activeTab, setActiveTab] = useState(isProcess ? 'content' : 'preview');
  
  // Đề mục đang chọn trong cột Mục lục (TOC) của Quy trình nghiệp vụ
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);

  // Tùy chọn chuyển đổi nhanh giữa xem dạng Bảng Lưu đồ SVG và xem Văn bản khi ở mục Lưu trình
  const [forceFlowchartView, setForceFlowchartView] = useState(false);

  // Tự động reset tab khi mở hồ sơ mới
  useEffect(() => {
    if (detail) {
      setActiveTab(detail.item_type === 'process' ? 'content' : 'preview');
      setSelectedSectionIdx(0);
      setForceFlowchartView(false);
    }
  }, [detail]);

  // Tải danh sách chữ ký ISO từ Quản lý chữ ký
  const [signaturesList, setSignaturesList] = useState([]);

  useEffect(() => {
    if (show) {
      isoSignatureService.getSignatures().then((res) => {
        if (Array.isArray(res)) setSignaturesList(res);
      }).catch(err => console.error('Lỗi tải danh sách chữ ký ISO:', err));
    }
  }, [show]);

  // Phân tích vai trò và liên kết mẫu chữ ký tương ứng
  const authorSig = useMemo(() => {
    if (!signaturesList.length) return null;
    const authorName = detail?.issuer || detail?.owner || detail?.editor || '';
    return signaturesList.find(s => s.full_name === authorName || s.user_code === authorName) ||
           signaturesList.find(s => s.department === detail?.department) ||
           signaturesList.find(s => s.user_code === 'QA_ADMIN') ||
           signaturesList[0];
  }, [signaturesList, detail]);

  const deptSig = useMemo(() => {
    if (!signaturesList.length) return null;
    const approverName = (detail?.approver || '').trim();
    if (approverName) {
      const match = signaturesList.find(s => s.full_name?.toLowerCase().includes(approverName.toLowerCase()) || approverName.toLowerCase().includes(s.full_name?.toLowerCase()));
      if (match) return match;
    }
    return signaturesList.find(s => s.position?.toLowerCase().includes('trưởng phòng') && s.department === detail?.department) ||
           signaturesList.find(s => s.position?.toLowerCase().includes('trưởng phòng')) ||
           signaturesList.find(s => s.user_code === 'TP_QLCL') ||
           signaturesList[0];
  }, [signaturesList, detail]);

  const bgdSig = useMemo(() => {
    if (!signaturesList.length) return null;
    const approverBgdName = (detail?.approver_bgd || '').trim();
    if (approverBgdName) {
      const match = signaturesList.find(s => s.full_name?.toLowerCase().includes(approverBgdName.toLowerCase()) || approverBgdName.toLowerCase().includes(s.full_name?.toLowerCase()));
      if (match) return match;
    }
    return signaturesList.find(s => s.department === 'BGD' || s.position?.toLowerCase().includes('giám đốc') || s.user_code === 'BGD_CEO') ||
           signaturesList[1] || signaturesList[0];
  }, [signaturesList, detail]);

  const isCompanyLevel = detail?.document_level !== 'Cấp phòng';
  const statusLower = (detail?.status || '').toLowerCase().trim();

  // Cấp 2: Trưởng phòng đã duyệt
  const isDeptSigned = statusLower.includes('trưởng phòng đã duyệt') ||
                       statusLower.includes('chờ bgđ') ||
                       statusLower.includes('bgđ đã duyệt') ||
                       statusLower.includes('hiệu lực') ||
                       statusLower.includes('đã duyệt');
  const isDeptPending = !isDeptSigned && (statusLower.includes('chờ') || statusLower.includes('dự thảo') || statusLower.includes('nháp'));

  // Cấp 3: Ban Giám Đốc đã duyệt
  const isBgdSigned = isCompanyLevel && (
    statusLower.includes('bgđ đã duyệt') ||
    statusLower.includes('ban giám đốc đã duyệt') ||
    statusLower.includes('hiệu lực') ||
    (statusLower.includes('đã duyệt') && !statusLower.includes('trưởng phòng'))
  );
  const isBgdPending = isCompanyLevel && statusLower.includes('chờ bgđ');

  const deptLog = detail?.approval_logs?.find(l => l.role?.includes('Trưởng phòng') || l.action === 'APPROVE_DEPT');
  const bgdLog = detail?.approval_logs?.find(l => l.role?.includes('Ban Giám Đốc') || l.role?.includes('BGD'));
  const deptSignDate = deptLog?.created_at || detail?.updated_at || detail?.issue_date;
  const bgdSignDate = bgdLog?.created_at || detail?.updated_at || detail?.issue_date;
  const authorSignDate = detail?.issue_date || detail?.created_at;

  // Chuẩn hóa danh sách các bước sang định dạng chuẩn của FlowchartTable SVG
  const flowchartSteps = useMemo(() => {
    if (!detail?.steps || detail.steps.length === 0) return [];
    const total = detail.steps.length;
    return detail.steps.map((st, idx) => {
      let nodeType = st.node_type;
      if (!nodeType) {
        if (idx === 0 || idx === total - 1) {
          nodeType = 'terminal';
        } else if (
          (st.name || '').toLowerCase().includes('kiểm tra') ||
          (st.name || '').toLowerCase().includes('quyết định') ||
          (st.name || '').toLowerCase().includes('đánh giá')
        ) {
          nodeType = 'decision';
        } else {
          nodeType = 'task';
        }
      }
      return {
        ...st,
        step_number: st.step_number || idx + 1,
        name: st.name || `Bước ${idx + 1}`,
        assignee_role: st.assignee_role || 'QC/SX',
        node_type: nodeType,
        has_branch: nodeType === 'decision',
        fail_path: st.fail_path || (nodeType === 'decision' ? [
          { name: 'Xử lý không phù hợp (NC)', assignee_role: st.assignee_role, edge_label: 'Không đạt' }
        ] : [])
      };
    });
  }, [detail?.steps]);

  // Lọc sạch các sections nghiệp vụ, loại trừ hoàn toàn các key hệ thống __metadata_...
  const cleanSections = useMemo(() => {
    if (!detail) return [];
    let list = [];
    if (Array.isArray(detail.sections)) {
      list = detail.sections.filter(s => s && s.section_name && !s.section_name.startsWith('__'));
    } else if (typeof detail.sections === 'object' && detail.sections !== null) {
      list = Object.entries(detail.sections)
        .filter(([k]) => !k.startsWith('__'))
        .map(([k, v]) => ({ section_name: k, content_html: typeof v === 'string' ? v : (v?.content_html || '') }));
    }

    // Nếu là Quy trình nghiệp vụ và chưa có mục Lưu trình trong sections, tự động thêm đề mục "Lưu trình thực hiện"
    if (isProcess) {
      const hasFlowchartSec = list.some(s => {
        const n = (s.section_name || '').toLowerCase();
        return n.includes('lưu trình') || n.includes('lưu đồ') || n.includes('sơ đồ') || n.includes('quy trình');
      });
      if (!hasFlowchartSec) {
        list.push({
          section_name: 'Lưu trình thực hiện',
          content_html: '',
          is_flowchart: true
        });
      }
    }
    return list;
  }, [detail, isProcess]);

  const sections = cleanSections;
  const steps = detail?.steps || [];
  const currentSection = sections[selectedSectionIdx] || sections[0] || null;

  // Kiểm tra xem đề mục hiện tại có phải là mục Lưu trình / Lưu đồ không (gọi Hook TRƯỚC return null)
  const isCurrentSectionFlowchart = useMemo(() => {
    if (!currentSection) return false;
    if (currentSection.is_flowchart) return true;
    const name = (currentSection.section_name || '').toLowerCase();
    return name.includes('lưu trình') || name.includes('lưu đồ') || name.includes('sơ đồ') || name.includes('quy trình thực hiện');
  }, [currentSection]);

  if (!show) return null;

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('từ chối') || s.includes('rejected')) {
      return <span className="iso-badge iso-badge-rejected"><AlertOctagon size={13} /> {status}</span>;
    }
    if (s.includes('chờ bgđ') || s.includes('cho bgd')) {
      return (
        <span className="iso-badge" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
          <span className="iso-pulse-dot" style={{ backgroundColor: '#6D28D9' }} /> {status}
        </span>
      );
    }
    if (s.includes('chờ')) {
      return <span className="iso-badge iso-badge-pending"><span className="iso-pulse-dot" /> {status}</span>;
    }
    if (s.includes('đã duyệt') || s.includes('hiệu lực') || s.includes('approved')) {
      return <span className="iso-badge iso-badge-approved"><CheckCircle2 size={13} /> {status}</span>;
    }
    return <span className="iso-badge iso-badge-draft">{status || 'Dự thảo'}</span>;
  };

  // Mở màn hình đầy đủ trong module gốc
  const handleOpenFullModule = () => {
    if (!detail) return;
    onClose();
    if (isProcess) {
      navigate(`/admin/iso-processes/edit/${detail.id}`);
    } else {
      navigate(`/admin/iso-documents/edit/${detail.id}`);
    }
  };

  // Lấy link tệp đính kèm
  const getFileDownloadUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const cleanRoot = API_ROOT ? API_ROOT.replace(/\/$/, '') : '';
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${cleanRoot}${cleanPath}`;
  };

  return (
    <div className="iso-modal-backdrop" onClick={onClose}>
      <div className="iso-modal-content iso-modal-xl" onClick={(e) => e.stopPropagation()}>
        {/* 1. Header Modal */}
        <div className="iso-modal-header" style={{ padding: '12px 20px' }}>
          <div className="iso-modal-title">
            {isProcess ? <Layers size={22} color="#7B5233" /> : <FileText size={22} color="#7B5233" />}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2D1A12' }}>
                  {detail?.name || 'Chi tiết hồ sơ ISO'}
                </span>
                {detail && getStatusBadge(detail.status)}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#8D6E63', marginTop: '2px' }}>
                Mã số: <b>{detail?.code}</b> &bull; Phân loại: <b>{detail?.item_type_label}</b> &bull; Phòng ban: <b>{detail?.department}</b>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Nút Mở toàn màn hình theo module tương ứng */}
            {detail && (
              <button
                type="button"
                className="iso-btn iso-btn-outline"
                onClick={handleOpenFullModule}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#1E40AF',
                  borderColor: '#BFDBFE',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '6px'
                }}
                title={isProcess ? 'Mở toàn màn hình trong Quy trình nghiệp vụ' : 'Mở toàn màn hình trong Quản lý mẫu tài liệu'}
              >
                <ExternalLink size={14} />
                <span>{isProcess ? 'Mở trong Quy trình nghiệp vụ' : 'Mở trong Quản lý mẫu'}</span>
              </button>
            )}

            <button
              type="button"
              className="iso-modal-close-btn"
              onClick={onClose}
              title="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 2. Body Modal */}
        <div className="iso-modal-body" style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div className="iso-empty-state">
              <div className="iso-pulse-dot" style={{ width: '14px', height: '14px' }} />
              <div style={{ fontWeight: 600 }}>Đang tải thông tin chi tiết hồ sơ...</div>
            </div>
          ) : !detail ? (
            <div className="iso-empty-state">
              <AlertOctagon size={36} color="#DC2626" />
              <p className="iso-empty-title">Không tìm thấy thông tin hồ sơ</p>
            </div>
          ) : (
            <>
              {/* Thẻ tóm tắt siêu dữ liệu (Compact Top Card) */}
              <div className="iso-detail-meta-grid" style={{ marginBottom: '12px', padding: '10px 14px', gap: '8px 12px' }}>
                <div>
                  <div className="iso-meta-item-label">Mã văn bản</div>
                  <div className="iso-meta-item-value" style={{ color: '#7B5233', fontSize: '0.85rem' }}>{detail.code || '---'}</div>
                </div>
                <div>
                  <div className="iso-meta-item-label">Phiên bản / Lần ban hành</div>
                  <div className="iso-meta-item-value" style={{ fontSize: '0.85rem' }}>Version {detail.version || '01'}</div>
                </div>
                <div>
                  <div className="iso-meta-item-label">Cấp quản lý</div>
                  <div className="iso-meta-item-value" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7B5233' }}>
                    {detail.document_level || 'Cấp công ty'}
                  </div>
                </div>
                <div>
                  <div className="iso-meta-item-label">Phòng ban áp dụng</div>
                  <div className="iso-meta-item-value">
                    <span className="iso-dept-badge" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>{detail.department || 'CHUNG'}</span>
                  </div>
                </div>
                <div>
                  <div className="iso-meta-item-label">Người đề xuất / Soạn thảo</div>
                  <div className="iso-meta-item-value" style={{ fontSize: '0.85rem' }}>{detail.issuer || detail.owner || detail.editor || 'Chưa cập nhật'}</div>
                </div>
                <div>
                  <div className="iso-meta-item-label">Quy định trình ký duyệt</div>
                  <div className="iso-meta-item-value" style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                    {detail.document_level === 'Cấp phòng' 
                      ? 'Cấp phòng' 
                      : 'Cấp công ty'}
                  </div>
                </div>
                <div>
                  <div className="iso-meta-item-label">Ngày đề xuất / Ban hành</div>
                  <div className="iso-meta-item-value" style={{ fontSize: '0.85rem' }}>{formatVietnameseDate(detail.issue_date || detail.created_at)}</div>
                </div>
                <div>
                  <div className="iso-meta-item-label">{isProcess ? 'Mẫu ISO tham chiếu' : 'Thư mục / Loại'}</div>
                  <div className="iso-meta-item-value" style={{ fontSize: '0.82rem', color: isProcess && detail.template_code ? '#1D4ED8' : '#374151' }}>
                    {isProcess
                      ? (detail.template_code ? `${detail.template_code} (${detail.template_name || ''})` : 'Tài liệu độc lập')
                      : (detail.doc_type || detail.folder || 'Tài liệu chuẩn')}
                  </div>
                </div>
              </div>

              {/* KHỐI HỒ SƠ CHỮ KÝ PHÊ DUYỆT 3 CẤP (NGƯỜI LÀM - TRƯỞNG PHÒNG - BAN GIÁM ĐỐC) */}
              <div style={{
                background: '#FAF6F0',
                border: '1px solid #EADCC9',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '14px',
                boxShadow: '0 1px 3px rgba(123, 82, 51, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #EADCC9',
                  paddingBottom: '6px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#7B5233', textTransform: 'uppercase' }}>
                    <PenTool size={14} color="#7B5233" />
                    Chữ ký phê duyệt hồ sơ ({isCompanyLevel ? 'Cấp công ty (Trưởng phòng & Ban Giám Đốc duyệt)' : 'Cấp phòng (Trưởng phòng duyệt)'})
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#8D6E63' }}>
                    Tự động áp dụng chữ ký & loại sử dụng (Tay / Điện tử CA) từ Quản lý Chữ ký
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isCompanyLevel ? 'repeat(3, 1fr)' : '1fr 1fr',
                  gap: '10px'
                }}>
                  {/* Ô 1: Người làm / Soạn thảo */}
                  <div style={{
                    border: '1px solid #BBF7D0',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '120px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '4px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                        1. NGƯỜI LẬP / SOẠN THẢO
                      </span>
                      <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={10} /> ĐÃ KÝ XÁC NHẬN
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0' }}>
                      {authorSig?.signature_type === 'DIGITAL' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: '#FAF6F0', border: '1px solid #7B5233', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#7B5233', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ShieldCheck size={15} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
                            <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#7B5233' }}>KÝ ĐIỆN TỬ (PKI CA)</div>
                            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{authorSig.full_name}</div>
                            <div style={{ fontSize: '0.62rem', color: '#6B7280' }}>{authorSig.digital_cert_provider?.split(' ')[0] || 'CA'} • {authorSig.digital_serial_no?.substring(0, 10) || ''}</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', width: '100%' }}>
                          <img
                            src={authorSig?.signature_data || authorSig?.image_path}
                            alt={authorSig?.full_name || 'Người soạn thảo'}
                            style={{ maxHeight: '45px', maxWidth: '170px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '4px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.72rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1F2937' }}>{authorSig?.full_name || detail.issuer || 'Người soạn thảo'}</div>
                        <div style={{ color: '#6B7280', fontSize: '0.67rem' }}>{authorSig?.position || 'Người biên soạn'}</div>
                      </div>
                      <div style={{ textAlign: 'right', color: '#8D6E63', fontSize: '0.66rem' }}>
                        {formatVietnameseDateTime(authorSignDate)}
                      </div>
                    </div>
                  </div>

                  {/* Ô 2: Trưởng phòng duyệt (Cấp 1) */}
                  <div style={{
                    border: isDeptSigned ? '1px solid #BBF7D0' : isDeptPending ? '1.5px dashed #F59E0B' : '1px dashed #CBD5E1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    backgroundColor: isDeptSigned ? '#FFFFFF' : isDeptPending ? '#FFFBEB' : '#F9FAFB',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '120px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '4px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isDeptSigned ? '#166534' : isDeptPending ? '#B45309' : '#64748B', textTransform: 'uppercase' }}>
                        2. TRƯỞNG PHÒNG DUYỆT {isCompanyLevel ? '(CẤP 1)' : ''}
                      </span>
                      {isDeptSigned ? (
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={10} /> ĐÃ DUYỆT
                        </span>
                      ) : isDeptPending ? (
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={10} /> CHỜ DUYỆT
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                          Chưa duyệt
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0' }}>
                      {isDeptSigned && deptSig ? (
                        deptSig?.signature_type === 'DIGITAL' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: '#FAF6F0', border: '1px solid #7B5233', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#7B5233', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <ShieldCheck size={15} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
                              <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#7B5233' }}>KÝ ĐIỆN TỬ (PKI CA)</div>
                              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deptSig.full_name}</div>
                              <div style={{ fontSize: '0.62rem', color: '#6B7280' }}>{deptSig.digital_cert_provider?.split(' ')[0] || 'CA'} • {deptSig.digital_serial_no?.substring(0, 10) || ''}</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', width: '100%' }}>
                            <img
                              src={deptSig?.signature_data || deptSig?.image_path}
                              alt={deptSig?.full_name || 'Trưởng phòng'}
                              style={{ maxHeight: '45px', maxWidth: '170px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                            />
                          </div>
                        )
                      ) : isDeptPending ? (
                        <div style={{ textAlign: 'center', color: '#B45309', fontSize: '0.74rem' }}>
                          <Clock size={16} style={{ margin: '0 auto 2px auto', display: 'block', opacity: 0.6 }} />
                          Chờ Trưởng phòng ký duyệt
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.72rem' }}>
                          Chưa ký duyệt
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '4px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.72rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1F2937' }}>{detail.approver || deptSig?.full_name || (detail.department ? `Trưởng phòng ${detail.department}` : 'Trưởng phòng')}</div>
                        <div style={{ color: '#6B7280', fontSize: '0.67rem' }}>{deptSig?.position || 'Trưởng phòng'}</div>
                      </div>
                      <div style={{ textAlign: 'right', color: '#8D6E63', fontSize: '0.66rem' }}>
                        {isDeptSigned ? formatVietnameseDateTime(deptSignDate) : ''}
                      </div>
                    </div>
                  </div>

                  {/* Ô 3: Ban Giám Đốc (Cấp 2 - nếu quy trình 2 cấp: Cấp công ty) */}
                  {isCompanyLevel && (
                    <div style={{
                      border: isBgdSigned ? '1px solid #BBF7D0' : isBgdPending ? '1.5px dashed #F59E0B' : '1px dashed #CBD5E1',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      backgroundColor: isBgdSigned ? '#FFFFFF' : isBgdPending ? '#FFFBEB' : '#F9FAFB',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '120px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '4px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isBgdSigned ? '#166534' : isBgdPending ? '#B45309' : '#64748B', textTransform: 'uppercase' }}>
                          3. BAN GIÁM ĐỐC PHÊ DUYỆT (CẤP 2)
                        </span>
                        {isBgdSigned ? (
                          <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={10} /> ĐÃ PHÊ DUYỆT
                          </span>
                        ) : isBgdPending ? (
                          <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} /> CHỜ BGĐ DUYỆT
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                            Chưa tới lượt
                          </span>
                        )}
                      </div>

                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0' }}>
                        {isBgdSigned && bgdSig ? (
                          bgdSig?.signature_type === 'DIGITAL' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: '#FAF6F0', border: '1px solid #7B5233', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#7B5233', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ShieldCheck size={15} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
                                <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#7B5233' }}>KÝ ĐIỆN TỬ (PKI CA)</div>
                                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bgdSig.full_name}</div>
                                <div style={{ fontSize: '0.62rem', color: '#6B7280' }}>{bgdSig.digital_cert_provider?.split(' ')[0] || 'CA'} • {bgdSig.digital_serial_no?.substring(0, 10) || ''}</div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', width: '100%' }}>
                              <img
                                src={bgdSig?.signature_data || bgdSig?.image_path}
                                alt={bgdSig?.full_name || 'Ban Giám Đốc'}
                                style={{ maxHeight: '45px', maxWidth: '170px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                              />
                            </div>
                          )
                        ) : isBgdPending ? (
                          <div style={{ textAlign: 'center', color: '#B45309', fontSize: '0.74rem' }}>
                            <Clock size={16} style={{ margin: '0 auto 2px auto', display: 'block', opacity: 0.6 }} />
                            Chờ Ban Giám Đốc ký duyệt ban hành
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.72rem' }}>
                            Chờ cấp phòng duyệt trước
                          </div>
                        )}
                      </div>

                      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '4px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.72rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1F2937' }}>{detail.approver_bgd || bgdSig?.full_name || 'Ban Giám Đốc'}</div>
                          <div style={{ color: '#6B7280', fontSize: '0.67rem' }}>{bgdSig?.position || 'Tổng Giám Đốc'}</div>
                        </div>
                        <div style={{ textAlign: 'right', color: '#8D6E63', fontSize: '0.66rem' }}>
                          {isBgdSigned ? formatVietnameseDateTime(bgdSignDate) : ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Navigation Tabs đồng bộ hoàn toàn theo 2 module: ĐÚNG 3 TAB CHUẨN */}
              <div className="iso-detail-tabs" style={{ marginBottom: '12px' }}>
                {isProcess ? (
                  /* TABS CHO QUY TRÌNH NGHIỆP VỤ: ĐÚNG 3 TAB CHUẨN NHƯ ISOPROCESSEDITORVIEW */
                  <>
                    <button
                      type="button"
                      className={`iso-detail-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                      onClick={() => setActiveTab('content')}
                    >
                      <FileText size={15} />
                      Nội dung Quy trình
                    </button>
                    <button
                      type="button"
                      className={`iso-detail-tab-btn ${activeTab === 'instructions' ? 'active' : ''}`}
                      onClick={() => setActiveTab('instructions')}
                    >
                      <Activity size={15} />
                      Hướng dẫn thực hiện
                    </button>
                    <button
                      type="button"
                      className={`iso-detail-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
                      onClick={() => setActiveTab('templates')}
                    >
                      <Layers size={15} />
                      Tài liệu liên quan
                    </button>
                  </>
                ) : (
                  /* TABS CHO QUẢN LÝ MẪU TÀI LIỆU: ĐÚNG 3 TAB CHUẨN NHƯ ISOFORMEDITORVIEW */
                  <>
                    <button
                      type="button"
                      className={`iso-detail-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                      onClick={() => setActiveTab('preview')}
                    >
                      <BookOpen size={15} />
                      Xem mẫu
                    </button>
                    <button
                      type="button"
                      className={`iso-detail-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
                      onClick={() => setActiveTab('config')}
                    >
                      <Settings size={15} />
                      Cấu hình đề mục mẫu
                    </button>
                    <button
                      type="button"
                      className={`iso-detail-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
                      onClick={() => setActiveTab('templates')}
                    >
                      <Layers size={15} />
                      Tài liệu liên quan
                    </button>
                  </>
                )}
              </div>

              {/* 4. VÙNG NỘI DUNG THEO TAB */}

              {/* ===== TAB QUY TRÌNH 1: NỘI DUNG QUY TRÌNH (BỐ CỤC 2 CỘT MỤC LỤC + LƯU ĐỒ SVG CHUẨN ISO) ===== */}
              {isProcess && activeTab === 'content' && (
                <div className="iso-process-2col-layout" style={{ flex: 1 }}>
                  {/* Cột trái: Mục lục (TOC) */}
                  <div className="iso-toc-panel">
                    <div className="iso-toc-header">
                      <span>Mục lục quy trình</span>
                      <span style={{ fontSize: '0.7rem', color: '#7B5233', fontWeight: 700 }}>
                        {sections.length} mục
                      </span>
                    </div>

                    {sections.length === 0 ? (
                      <div style={{ padding: '16px 8px', fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center' }}>
                        Chưa có đề mục
                      </div>
                    ) : (
                      sections.map((sec, idx) => {
                        const isSelected = selectedSectionIdx === idx;
                        const isFlowchartSec = (sec.section_name || '').toLowerCase().includes('lưu trình') ||
                                               (sec.section_name || '').toLowerCase().includes('lưu đồ') ||
                                               (sec.section_name || '').toLowerCase().includes('sơ đồ');

                        return (
                          <div
                            key={idx}
                            className={`iso-toc-item ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedSectionIdx(idx);
                              setForceFlowchartView(isFlowchartSec);
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {idx + 1}. {sec.section_name}
                            </span>
                            {isFlowchartSec && (
                              <span style={{
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: isSelected ? '#7B5233' : '#E2E8F0',
                                color: isSelected ? '#FFFFFF' : '#475569',
                                fontWeight: 700
                              }}>
                                Sơ đồ
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Cột phải: Nội dung chi tiết của đề mục đang chọn */}
                  <div className="iso-content-panel">
                    {currentSection ? (
                      <div>
                        {/* Tiêu đề đề mục + Nút chuyển chế độ xem Lưu đồ / Văn bản */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '2px solid #EADCC9',
                          paddingBottom: '10px',
                          marginBottom: '16px',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#7B5233' }}>
                            {selectedSectionIdx + 1}. {currentSection.section_name}
                          </h3>

                          {flowchartSteps.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setForceFlowchartView(false)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  border: '1px solid #7B5233',
                                  backgroundColor: !forceFlowchartView ? '#7B5233' : '#FFFFFF',
                                  color: !forceFlowchartView ? '#FFFFFF' : '#7B5233'
                                }}
                              >
                                Văn bản
                              </button>
                              <button
                                type="button"
                                onClick={() => setForceFlowchartView(true)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  border: '1px solid #7B5233',
                                  backgroundColor: forceFlowchartView ? '#7B5233' : '#FFFFFF',
                                  color: forceFlowchartView ? '#FFFFFF' : '#7B5233',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <ListOrdered size={13} />
                                Lưu đồ ({flowchartSteps.length} bước)
                              </button>
                            </div>
                          )}
                        </div>

                        {/* HIỂN THỊ BẢNG LƯU ĐỒ SVG CHUẨN ISO (Khi mục là Lưu trình hoặc khi bật chế độ xem Lưu đồ) */}
                        {(forceFlowchartView || isCurrentSectionFlowchart) && flowchartSteps.length > 0 && (
                          <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase', marginBottom: '8px' }}>
                              Bảng Lưu đồ quy trình chuẩn ISO ({flowchartSteps.length} bước):
                            </div>
                            <div style={{
                              overflowX: 'auto',
                              overflowY: 'auto',
                              maxHeight: '440px',
                              background: '#FFFFFF',
                              border: '1px solid #000000',
                              padding: '12px',
                              display: 'flex',
                              justifyContent: 'center',
                              borderRadius: '4px'
                            }}>
                              <FlowchartTable steps={flowchartSteps} />
                            </div>
                          </div>
                        )}

                        {/* Nội dung Rich HTML của đề mục */}
                        {(!forceFlowchartView || !isCurrentSectionFlowchart) && (
                          <div
                            className="iso-section-body"
                            style={{ padding: 0 }}
                            dangerouslySetInnerHTML={{
                              __html: currentSection.content_html || '<i style="color:#9CA3AF">Không có nội dung chi tiết cho đề mục này.</i>'
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="iso-empty-state">
                        <FileText size={32} color="#CBD5E1" />
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Chọn một đề mục bên trái để xem nội dung.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== TAB QUY TRÌNH 2: HƯỚNG DẪN THỰC HIỆN & CHECKLIST QC ===== */}
              {isProcess && activeTab === 'instructions' && (
                <div style={{ overflowY: 'auto', maxHeight: '520px', paddingRight: '4px' }}>
                  {steps.length === 0 ? (
                    <div className="iso-empty-state">
                      <Activity size={36} color="#CBD5E1" />
                      <p className="iso-empty-title">Chưa có hướng dẫn thực hiện</p>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        Quy trình chưa được phân rã hướng dẫn thao tác chi tiết hoặc checklist kiểm tra chất lượng.
                      </p>
                    </div>
                  ) : (
                    steps.map((st, idx) => {
                      let checklist = [];
                      try {
                        if (st.checklist_json) {
                          checklist = typeof st.checklist_json === 'string'
                            ? JSON.parse(st.checklist_json)
                            : st.checklist_json;
                        }
                      } catch (e) {
                        checklist = [];
                      }

                      return (
                        <div key={idx} className="iso-step-card">
                          <div className="iso-step-header">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="iso-step-number">{st.step_number || idx + 1}</span>
                              <div>
                                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#2D1A12' }}>
                                  {st.name}
                                </span>
                                {st.assignee_role && (
                                  <div style={{ fontSize: '0.78rem', color: '#7B5233', fontWeight: 600 }}>
                                    Trách nhiệm thực hiện: {st.assignee_role}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '14px' }}>
                            {st.instructions && (
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8D6E63', textTransform: 'uppercase' }}>
                                  Hướng dẫn thao tác / Yêu cầu kỹ thuật:
                                </div>
                                {/* Khắc phục lỗi hiển thị text thô: Parse Rich HTML bằng dangerouslySetInnerHTML */}
                                <div
                                  style={{ fontSize: '0.85rem', color: '#374151', marginTop: '4px', lineHeight: '1.6' }}
                                  dangerouslySetInnerHTML={{ __html: st.instructions }}
                                />
                              </div>
                            )}

                            {checklist && checklist.length > 0 && (
                              <div className="iso-qc-box">
                                <div className="iso-qc-title">
                                  <CheckSquare size={14} />
                                  Checklist kiểm soát chất lượng (QC Checklist)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {checklist.map((item, cIdx) => (
                                    <div key={cIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem' }}>
                                      <input type="checkbox" readOnly checked={false} style={{ marginTop: '3px' }} />
                                      <span style={{ color: '#166534', fontWeight: 500 }}>
                                        {typeof item === 'string' ? item : (item.task || item.item || JSON.stringify(item))}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ===== TAB QUY TRÌNH 3: TÀI LIỆU LIÊN QUAN (MẪU ISO & TỆP ĐÍNH KÈM) ===== */}
              {isProcess && activeTab === 'templates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '520px' }}>
                  {/* Thẻ khuôn mẫu ISO tham chiếu */}
                  <div style={{ padding: '16px', background: '#FAF6F0', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Layers size={22} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8D6E63', textTransform: 'uppercase' }}>
                            Khuôn mẫu ISO tham chiếu
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#7B5233', marginTop: '2px' }}>
                            {detail.template_code ? `${detail.template_code} - ${detail.template_name || ''}` : 'Quy trình soạn thảo độc lập (Không kế thừa mẫu)'}
                          </div>
                          <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', color: '#4B5563', lineHeight: '1.5' }}>
                            {detail.template_code
                              ? 'Quy trình thực tế này được kế thừa và ban hành dựa trên khung tài liệu mẫu chuẩn hóa của hệ thống ISO.'
                              : 'Quy trình được biên soạn riêng không gắn với mã mẫu tài liệu nào.'}
                          </p>
                        </div>
                      </div>

                      {detail.template_code && (
                        <button
                          type="button"
                          className="iso-btn iso-btn-outline"
                          onClick={() => navigate('/admin/iso-documents')}
                          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        >
                          <ExternalLink size={14} />
                          Mở Quản lý mẫu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tệp tin đính kèm gốc (nếu có) */}
                  {detail.file_path && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: '#FFFFFF',
                      border: '1px solid #EADCC9',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <FileText size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#2D1A12', fontSize: '0.92rem' }}>
                            {detail.file_path.split('/').pop().split('\\').pop()}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                            Tệp tài liệu đính kèm hệ thống
                          </div>
                        </div>
                      </div>

                      <a
                        href={getFileDownloadUrl(detail.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="iso-btn iso-btn-primary"
                        download
                      >
                        <Download size={15} />
                        Tải tệp đính kèm
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ===== TAB QUẢN LÝ MẪU 1: XEM MẪU (A4 PREVIEW CHUẨN ISO) ===== */}
              {!isProcess && activeTab === 'preview' && (
                <div className="iso-a4-preview-wrapper">
                  <div className="iso-a4-page">
                    <div className="iso-a4-cover-box">
                      {/* Tiêu đề công ty */}
                      <table className="iso-a4-table" style={{ marginBottom: '16px' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '28%', textAlign: 'center', verticalAlign: 'middle', padding: '10px' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0F2C59' }}>PHU TAI</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#E0115F' }}>VINAG7 JSC</div>
                            </td>
                            <td style={{ width: '72%', textAlign: 'center', verticalAlign: 'middle', padding: '10px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                              CÔNG TY CỔ PHẦN VINA G7
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Tên biểu mẫu / tài liệu */}
                      <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
                          {detail.name || 'TÊN TÀI LIỆU MẪU'}
                        </h2>
                      </div>

                      {/* Bảng thông tin meta */}
                      <table className="iso-a4-table" style={{ width: '80%', margin: '0 auto 20px auto' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '40%', fontWeight: 'bold' }}>Mã hiệu:</td>
                            <td style={{ width: '60%' }}>{detail.code || detail.symbol || '---'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>Lần ban hành:</td>
                            <td>Version {detail.version || '01'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>Ngày ban hành:</td>
                            <td>{detail.issue_date || '---'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>Bộ phận áp dụng:</td>
                            <td>{detail.department || detail.folder || 'CHUNG'}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Bảng trách nhiệm ký duyệt */}
                      <table className="iso-a4-table">
                        <thead>
                          <tr style={{ backgroundColor: '#F9FAFB' }}>
                            <th style={{ width: '25%' }}>TRÁCH NHIỆM</th>
                            <th style={{ width: '25%' }}>HỌ TÊN</th>
                            <th style={{ width: '25%' }}>CHỨC VỤ</th>
                            <th style={{ width: '25%' }}>KÝ TÊN</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 'bold', textAlign: 'center' }}>Biên soạn</td>
                            <td>{detail.issuer || '---'}</td>
                            <td>Người soạn thảo</td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
                              {authorSig?.signature_type === 'DIGITAL' ? (
                                <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: 700 }}>
                                  [KÝ SỐ PKI: {authorSig.full_name}]
                                </span>
                              ) : (
                                <img
                                  src={authorSig?.signature_data || authorSig?.image_path}
                                  alt="Chữ ký người soạn"
                                  style={{ maxHeight: '34px', maxWidth: '120px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                                />
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                              {detail.document_level === 'Cấp phòng' ? 'Phê duyệt cấp phòng' : 'Kiểm tra / Duyệt cấp phòng'}
                            </td>
                            <td>{isDeptSigned ? (detail.approver || deptSig?.full_name || (detail.department ? `Trưởng phòng ${detail.department}` : 'Trưởng phòng')) : '---'}</td>
                            <td>Trưởng bộ phận</td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
                              {isDeptSigned ? (
                                deptSig?.signature_type === 'DIGITAL' ? (
                                  <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: 700 }}>
                                    [KÝ SỐ PKI: {deptSig.full_name}]
                                  </span>
                                ) : (
                                  <img
                                    src={deptSig?.signature_data || deptSig?.image_path}
                                    alt="Chữ ký Trưởng phòng"
                                    style={{ maxHeight: '34px', maxWidth: '120px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                                  />
                                )
                              ) : (
                                <span style={{ color: '#D97706', fontWeight: 600, fontSize: '0.78rem' }}>CHỜ DUYỆT</span>
                              )}
                            </td>
                          </tr>
                          {detail.document_level !== 'Cấp phòng' && (
                            <tr>
                              <td style={{ fontWeight: 'bold', textAlign: 'center' }}>Phê duyệt cấp công ty</td>
                              <td style={{ fontWeight: 'bold', color: '#7B5233' }}>{isBgdSigned ? (detail.approver_bgd || bgdSig?.full_name || 'Ban Giám Đốc') : '---'}</td>
                              <td>Ban Giám Đốc (BGĐ)</td>
                              <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
                                {isBgdSigned ? (
                                  bgdSig?.signature_type === 'DIGITAL' ? (
                                    <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: 700 }}>
                                      [KÝ SỐ PKI: {bgdSig.full_name}]
                                    </span>
                                  ) : (
                                    <img
                                      src={bgdSig?.signature_data || bgdSig?.image_path}
                                      alt="Chữ ký Ban Giám Đốc"
                                      style={{ maxHeight: '34px', maxWidth: '120px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                                    />
                                  )
                                ) : (
                                  <span style={{ color: '#D97706', fontWeight: 600, fontSize: '0.78rem' }}>CHỜ DUYỆT</span>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Danh mục các phần nội dung của tài liệu mẫu */}
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '14px' }}>
                        NỘI DUNG TÀI LIỆU
                      </div>
                      {sections.map((sec, sIdx) => (
                        <div key={sIdx} style={{ marginBottom: '16px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>
                            {sIdx + 1}. {sec.section_name}
                          </div>
                          <div
                            style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#374151' }}
                            dangerouslySetInnerHTML={{ __html: sec.content_html || '<i style="color:#9CA3AF">[Nội dung biểu mẫu]</i>' }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Bảng chữ ký phê duyệt cuối tài liệu theo hàng ngang, căn đều */}
                    <div style={{ marginTop: '30px' }}>
                      <DocumentBottomSignatures
                        documentLevel={detail.document_level || 'Cấp phòng'}
                        author={detail.issuer || ''}
                        approver={detail.approver || ''}
                        approverBgd={detail.approver_bgd || ''}
                        department={detail.department || ''}
                        status={detail.status || ''}
                        issueDate={detail.issue_date || detail.approval_date || ''}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== TAB QUẢN LÝ MẪU 2: CẤU HÌNH ĐỀ MỤC MẪU ===== */}
              {!isProcess && activeTab === 'config' && (
                <div style={{ overflowY: 'auto', maxHeight: '520px' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Danh sách các đề mục cấu hình trong Mẫu ISO và định dạng hiển thị tương ứng (Văn bản hoặc Lưu trình):
                  </p>
                  <table className="iso-table" style={{ border: '1px solid #EADCC9', borderRadius: '8px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '220px' }}>DANH MỤC ĐỀ MỤC</th>
                        <th>NỘI DUNG / GỢI Ý</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>ĐỊNH DẠNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((sec, sIdx) => {
                        const plainText = (sec.content_html || '').replace(new RegExp('<[^>]*>', 'g'), '').replace(/&nbsp;/g, ' ');
                        const match = plainText.match(/\[([^\]]*)\]/);
                        const bracketValue = match ? match[1] : plainText.slice(0, 100);

                        const isFlow = (sec.section_name || '').toLowerCase().includes('lưu trình') ||
                                       (sec.section_name || '').toLowerCase().includes('lưu đồ');

                        return (
                          <tr key={sIdx}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>{sIdx + 1}</td>
                            <td style={{ fontWeight: 'bold', color: '#2D1A12' }}>{sec.section_name}</td>
                            <td style={{ color: '#4B5563', fontSize: '0.82rem' }}>
                              {bracketValue ? `[${bracketValue}]` : '(Không có gợi ý trong ngoặc)'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                backgroundColor: isFlow ? '#FAF0E6' : '#EFF6FF',
                                color: isFlow ? '#7B5233' : '#1D4ED8',
                                border: `1px solid ${isFlow ? '#EADCC9' : '#BFDBFE'}`
                              }}>
                                {isFlow ? 'Lưu trình' : 'Văn bản'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ===== TAB QUẢN LÝ MẪU 3: TÀI LIỆU LIÊN QUAN ===== */}
              {!isProcess && activeTab === 'templates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '520px' }}>
                  {detail.file_path ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: '#FFFFFF',
                      border: '1px solid #EADCC9',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <FileText size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#2D1A12', fontSize: '0.92rem' }}>
                            {detail.file_path.split('/').pop().split('\\').pop()}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                            Tệp tài liệu mẫu nguyên bản đính kèm
                          </div>
                        </div>
                      </div>

                      <a
                        href={getFileDownloadUrl(detail.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="iso-btn iso-btn-primary"
                        download
                      >
                        <Download size={15} />
                        Tải tệp đính kèm
                      </a>
                    </div>
                  ) : (
                    <div className="iso-empty-state">
                      <Layers size={36} color="#CBD5E1" />
                      <p className="iso-empty-title">Không có tệp đính kèm ngoài</p>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        Tài liệu mẫu này được khởi tạo và lưu trữ trực tiếp trên hệ thống số hóa.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 5. Footer Action Bar (Chỉ giữ lại các nút ra quyết định duyệt thẩm quyền) */}
        <div className="iso-modal-footer">
          {onForward && (
            <button
              type="button"
              className="iso-btn iso-btn-outline"
              onClick={() => onForward(detail)}
              title="Chuyển hồ sơ cho cấp hoặc người khác thẩm định"
            >
              <Share2 size={15} />
              Chuyển cấp duyệt
            </button>
          )}

          {onReject && (
            <button
              type="button"
              className="iso-btn iso-btn-danger"
              onClick={() => onReject(detail)}
              title="Từ chối phê duyệt và yêu cầu đơn vị soạn thảo sửa đổi"
            >
              <AlertOctagon size={15} />
              Từ chối / Yêu cầu sửa đổi
            </button>
          )}

          {onApprove && (
            <button
              type="button"
              className="iso-btn iso-btn-success"
              onClick={() => onApprove(detail)}
              title="Phê duyệt ban hành hồ sơ"
            >
              <CheckCircle2 size={15} />
              Phê duyệt ban hành
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetailModal;

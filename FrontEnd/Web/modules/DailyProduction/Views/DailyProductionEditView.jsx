import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { dailyProductionService } from '../Services/dailyProduction.service';
import DailyProductionBuilderModal from './DailyProductionBuilderModal';
import '../styles/dailyProduction.css';

/**
 * Trang độc lập Tạo mới / Chi tiết / Chỉnh sửa bảng "Hôm nay sản xuất gì"
 * Routes:
 *  - /admin/daily-production/create
 *  - /admin/daily-production/edit/:id
 *  - /admin/daily-production/:id
 */
const DailyProductionEditView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = outletContext;
  const { toast } = useToast();

  // 1. Khai báo TẤT CẢ Hooks ở đầu Component (Tuân thủ AGENTS.md)
  const isEditMode = Boolean(id);
  const navState = location.state || {};
  const initialBatchFromState =
    isEditMode && navState.editingBatch && String(navState.editingBatch.id) === String(id)
      ? navState.editingBatch
      : null;

  const [metadata, setMetadata] = useState(
    navState.metadata || {
      factories: [],
      stages: [],
      sections: [],
      plans: [],
      colors: []
    }
  );
  const [editingBatch, setEditingBatch] = useState(initialBatchFromState);
  const [loadingBatch, setLoadingBatch] = useState(isEditMode && !initialBatchFromState);
  const [loadError, setLoadError] = useState('');
  const savedBatchIdRef = useRef(null);

  const { screenCode } = useScreenMetadataCached('/admin/daily-production');

  useEffect(() => {
    const pageTitle = isEditMode
      ? editingBatch?.batch_code
        ? `Chỉnh sửa bảng SX (${editingBatch.batch_code})`
        : 'Chỉnh sửa bảng SX hôm nay'
      : 'Thiết lập gộp Cont & SX hôm nay';
    const pageSubtitle = isEditMode
      ? 'Chỉnh sửa gộp Cont & Custom chi tiết hiển thị sản xuất trong ngày'
      : 'Gộp Cont tùy chọn từ CSDL & Custom chi tiết hiển thị sản xuất trong ngày';

    if (setCustomTitle) setCustomTitle(pageTitle);
    if (setCustomSubtitle) setCustomSubtitle(pageSubtitle);
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'SX03.1');
    if (setHeaderExtra) setHeaderExtra(null);

    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [
    isEditMode,
    editingBatch?.batch_code,
    screenCode,
    setCustomTitle,
    setCustomSubtitle,
    setCustomScreenCode,
    setHeaderExtra
  ]);

  // Tải danh mục động từ CSDL
  const fetchMetadata = useCallback(async () => {
    try {
      const meta = await dailyProductionService.getMetadata();
      if (meta && typeof meta === 'object') {
        setMetadata({
          factories: meta.factories || [],
          stages: meta.stages || [],
          sections: meta.sections || [],
          plans: meta.plans || [],
          colors: meta.colors || []
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục động từ CSDL:', err);
    }
  }, []);

  // Tải chi tiết bảng sản xuất khi truy cập trực tiếp / refresh trang edit hoặc detail
  const fetchBatchDetail = useCallback(async () => {
    if (!isEditMode || !id) return;
    setLoadingBatch(true);
    setLoadError('');
    try {
      const detail = await dailyProductionService.getBatchDetail(id, { only_visible: false });
      if (!detail || !detail.id) {
        setLoadError('Không tìm thấy bảng sản xuất ngày này trong cơ sở dữ liệu.');
        return;
      }
      setEditingBatch(detail);
    } catch (err) {
      console.error('Lỗi khi tải chi tiết bảng sản xuất ngày:', err);
      const msg = err?.response?.data?.detail || 'Không thể tải thông tin bảng sản xuất ngày.';
      setLoadError(msg);
      toast?.error(msg);
    } finally {
      setLoadingBatch(false);
    }
  }, [isEditMode, id, toast]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    if (!isEditMode) {
      setEditingBatch(null);
      setLoadingBatch(false);
      setLoadError('');
      return;
    }
    if (!initialBatchFromState) {
      fetchBatchDetail();
    }
  }, [isEditMode, initialBatchFromState, fetchBatchDetail]);

  const handleBackToList = useCallback(() => {
    const targetBatchId = savedBatchIdRef.current || (id ? Number(id) : undefined);
    navigate('/admin/daily-production', {
      state: targetBatchId ? { selectedBatchId: targetBatchId } : undefined
    });
  }, [navigate, id]);

  const handleSaved = useCallback((savedBatch) => {
    if (savedBatch && savedBatch.id) {
      savedBatchIdRef.current = savedBatch.id;
    }
  }, []);

  if (loadingBatch) {
    return (
      <div className="daily-prod-page">
        <div className="factory-sheet-card" style={{ padding: 60, textAlign: 'center', color: '#7B5233', fontWeight: 700 }}>
          Đang tải chi tiết bảng "Hôm nay sản xuất gì" từ CSDL...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="daily-prod-page">
        <div className="factory-sheet-card" style={{ padding: 60, textAlign: 'center' }}>
          <AlertCircle size={44} color="#DC2626" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#2D1A12' }}>
            {loadError}
          </h3>
          <button
            type="button"
            className="daily-btn-outline"
            style={{ marginTop: 14 }}
            onClick={() => navigate('/admin/daily-production')}
          >
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-prod-page builder-active">
      <DailyProductionBuilderModal
        isOpen={true}
        onClose={handleBackToList}
        onSaved={handleSaved}
        initialDate={navState.initialDate || new Date().toISOString().slice(0, 10)}
        initialFactory={navState.initialFactory || 'ALL'}
        editingBatch={editingBatch}
        metadata={metadata}
      />
    </div>
  );
};

export default DailyProductionEditView;


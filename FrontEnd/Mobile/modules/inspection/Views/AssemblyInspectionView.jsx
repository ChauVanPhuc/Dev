import React, { useState } from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import PassFailSelector from '@mobile/Shared/Views/components/ui/PassFailSelector';
import { ClipboardCheck, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AssemblyInspectionView = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    poCode: '',
    inspector: 'Người kiểm tra',
    conclusion: 'pass',
    notes: '',
    items: {
      lienKet: 'pass',
      phuKien: 'pass',
      kichThuoc: 'pass'
    }
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const handleResultChange = (key, val) => {
    setFormData(prev => ({
      ...prev,
      items: { ...prev.items, [key]: val }
    }));
  };

  const handleSave = () => {
    setIsConfirmOpen(false);
    setIsSuccessOpen(true);
  };

  return (
    <Layout>
      <div style={{ backgroundColor: 'var(--bg-cream)', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB25 | Kiểm tra lắp ráp" />

        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid #e8e1d5', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#faf4ee', padding: '12px', borderRadius: '12px', border: '1px solid #f0ede8', color: '#5d3b32' }}>
            <ClipboardCheck size={24} />
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Thực hiện kiểm tra kết cấu lắp ráp, độ vững chãi và độ khớp của các phụ kiện liên kết.</span>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '6px' }}>Mã đơn hàng / Lô sản xuất:</label>
            <input
              type="text"
              value={formData.poCode}
              onChange={(e) => setFormData(prev => ({ ...prev, poCode: e.target.value }))}
              placeholder="Nhập mã đơn hàng..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
          </div>

          {/* Checklist items */}
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e' }}>1. Mối ghép, góc ghép khít</span>
              <PassFailSelector value={formData.items.lienKet} onChange={(val) => handleResultChange('lienKet', val)} variant="button" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e' }}>2. Lắp ráp đủ phụ kiện (tay nắm, bản lề...)</span>
              <PassFailSelector value={formData.items.phuKien} onChange={(val) => handleResultChange('phuKien', val)} variant="button" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e' }}>3. Độ phẳng, độ vuông góc của khung tủ</span>
              <PassFailSelector value={formData.items.kichThuoc} onChange={(val) => handleResultChange('kichThuoc', val)} variant="button" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '6px' }}>Ghi chú kiểm tra:</label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Nhập ghi chú chi tiết..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'none' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="responsive-fixed-footer" style={{ backgroundColor: '#FAF6F0', padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid #e8e1d5', zIndex: 100 }}>
          <button
            onClick={() => setIsConfirmOpen(true)}
            style={{ flex: 1, backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <Check size={18} /> Xác nhận
          </button>
          <button
            onClick={() => navigate('/inspection-daily-assembly')}
            style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Hủy
          </button>
        </div>

        <ConfirmModal
          isOpen={isConfirmOpen}
          title="Xác nhận lưu"
          message="Bạn có chắc chắn muốn lưu phiếu kiểm tra lắp ráp này không?"
          onConfirm={handleSave}
          onCancel={() => setIsConfirmOpen(false)}
        />

        <MessageModal
          isOpen={isSuccessOpen}
          type="success"
          title="Thành công"
          message="Đã lưu phiếu kiểm tra lắp ráp thành công!"
          onConfirm={() => {
            setIsSuccessOpen(false);
            navigate('/inspection-daily-assembly');
          }}
        />
      </div>
    </Layout>
  );
};

export default AssemblyInspectionView;

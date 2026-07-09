import React from 'react';
import { Package, Image as ImageIcon } from 'lucide-react';
import { API_ROOT } from '@shared/services/api';
import NgrokImage from '@mobile/Shared/Views/components/media/NgrokImage';
import FormInput from '@mobile/Shared/Views/components/form/FormInput';
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect';

const HandoverTab = ({ 
  delivery, 
  totalHandover, 
  totalReceived, 
  setTotalReceived, 
  noteVal, 
  canConfirm, 
  API_URL 
}) => {
  return (
    <>
      {/* Khối Thông tin giao */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>Thông tin giao</h3>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <FormInput label="Công đoạn giao" value={delivery?.delivery_stage || ''} readOnly={true} />
          </div>
          <div style={{ flex: 1 }}>
            <FormInput label="Công đoạn nhận" value={delivery?.receiving_stage || ''} readOnly={true} />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <FormSelect 
            label="Tên chi tiết" 
            value={delivery?.part_name || ''} 
            options={[{ label: delivery?.part_name, value: delivery?.part_name }]} 
            readOnly={true} 
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <FormInput
              label="Tổng giao"
              value={totalHandover}
              readOnly={true}
              inputStyle={{ backgroundColor: '#f8fafc', color: '#94a3b8', textAlign: 'center' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FormInput
              label="Số lượng thực nhận"
              type="number"
              value={totalReceived}
              onChange={e => {
                let val = parseFloat(e.target.value) || 0;
                const total = parseFloat(totalHandover) || 0;
                const maxAllowed = Math.max(0, total) * 2;

                if (val < 0) val = 0;
                if (val > maxAllowed) val = maxAllowed;

                setTotalReceived(val.toString());
              }}
              readOnly={!canConfirm}
              inputStyle={{
                textAlign: 'center',
                fontWeight: '800',
                color: '#4e342e',
                borderColor: canConfirm ? '#4e342e' : '#cbd5e1',
                backgroundColor: canConfirm ? '#fff' : '#f8fafc'
              }}
            />
          </div>
        </div>

        {delivery?.residual && delivery.residual > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <FormInput
              label="Số lượng dư"
              value={`${totalHandover} giao, ${delivery.residual} dư`}
              readOnly={true}
              inputStyle={{ backgroundColor: '#fef3c7', color: '#d97706', textAlign: 'center', fontWeight: '700' }}
            />
          </div>
        )}

        <div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>Ghi chú</div>
          </div>
          <textarea 
            rows="3" 
            readOnly={true} 
            value={noteVal} 
            style={{ 
              width: '100%', padding: '10px 12px', borderRadius: '8px', 
              border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#64748b', 
              resize: 'none', backgroundColor: '#f8fafc' 
            }} 
          />
      </div>
    </div>

    {/* Khối Chi tiết phân bổ theo đơn hàng */}
      {delivery?.details && delivery.details.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '15px', marginTop: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>Phân bổ đơn hàng</h3>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#64748b', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>Mã đơn hàng</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontWeight: '800', borderBottom: '1px solid #e2e8f0' }}>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {delivery.details.map((detail, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === delivery.details.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', color: '#1e293b', fontWeight: '600' }}>{detail.order_code || 'Chung'}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#4e342e', fontWeight: '800' }}>{detail.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
            * Hệ thống tự động phân bổ linh kiện vào các đơn hàng đang chờ trong kế hoạch.
          </p>
        </div>
      )}

      {/* Khối Ảnh bàn giao */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>Ảnh bàn giao</h3>
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          {delivery?.images?.map((img, idx) => (
            <div key={idx} style={{ flex: 1, aspectRatio: '4/3', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <NgrokImage 
                src={img.image_path.startsWith('http') ? img.image_path : `${API_ROOT}${img.image_path.startsWith('/') ? img.image_path.substring(1) : img.image_path}`} 
                alt="delivery" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          ))}
          {Array.from({ length: Math.max(0, 3 - (delivery?.images?.length || 0)) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ flex: 1, aspectRatio: '4/3', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
              <ImageIcon size={24} color="#e2e8f0" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default HandoverTab;

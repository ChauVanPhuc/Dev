import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { Sliders, Edit2, Save, X, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert, Calculator } from 'lucide-react';
import '@styles/components.css';

export default function QCSamplingConfigView({ isEmbedded = true }) {
  const { toast } = useToast();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [sampleRateDesc, setSampleRateDesc] = useState('');
  const [sampleSize, setSampleSize] = useState(0);
  const [majorAc, setMajorAc] = useState(0);
  const [majorRe, setMajorRe] = useState(1);
  const [minorAc, setMinorAc] = useState(0);
  const [minorRe, setMinorRe] = useState(1);

  // Calculator test state
  const [testLotSize, setTestLotSize] = useState(250);
  const [calcResult, setCalcResult] = useState(null);

  // Load Rules Data
  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inspections/qc-sampling/rules');
      const data = Array.isArray(res) ? res : (res?.data || []);
      setRules(data);
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể tải danh sách quy tắc lấy mẫu AQL!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // Run calculator test
  useEffect(() => {
    const n = Number(testLotSize);
    if (!n || n <= 0) {
      setCalcResult(null);
      return;
    }
    const matched = rules.find(r => r.min_lot_size <= n && (r.max_lot_size === null || r.max_lot_size >= n));
    setCalcResult(matched || null);
  }, [testLotSize, rules]);

  // Open Edit Modal
  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setSampleRateDesc(rule.sample_rate_desc || '');
    setSampleSize(rule.sample_size || 0);
    setMajorAc(rule.major_ac || 0);
    setMajorRe(rule.major_re || 1);
    setMinorAc(rule.minor_ac || 0);
    setMinorRe(rule.minor_re || 1);
    setIsModalOpen(true);
  };

  // Handle Save
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!editingRule) return;

    setSaving(true);
    try {
      const payload = {
        sample_rate_desc: sampleRateDesc,
        sample_size: parseInt(sampleSize),
        major_ac: parseInt(majorAc),
        major_re: parseInt(majorRe),
        minor_ac: parseInt(minorAc),
        minor_re: parseInt(minorRe)
      };

      await api.put(`/inspections/qc-sampling/rules/${editingRule.id}`, payload);
      toast('success', `Đã cập nhật quy tắc lấy mẫu cho lô (${editingRule.min_lot_size} - ${editingRule.max_lot_size || 'trên'}) thành công!`);
      setIsModalOpen(false);
      loadRules();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Cập nhật mốc lấy mẫu thất bại!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: isEmbedded ? '20px' : '24px', backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#2D1A12', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="#7B5233" />
            Cấu hình Quy tắc Lấy mẫu QC (AQL Standard)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#656d76' }}>
            Thiết lập khoảng quy mô lô hàng (Lot size N), cỡ mẫu cần lấy (Sample size n) và ngưỡng chấp nhận / bác bỏ lỗi (Ac / Re).
          </p>
        </div>
        <button
          onClick={loadRules}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: '#FAF6F0',
            border: '1px solid #7B5233',
            color: '#7B5233',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Quick Interactive Calculator Tool */}
      <div style={{
        backgroundColor: '#FAF8F6',
        border: '1px dashed #D6C7B2',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7B5233', fontWeight: 700, fontSize: '0.88rem' }}>
          <Calculator size={18} />
          <span>Thử nghiệm Công thức:</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.82rem', color: '#4B5563', fontWeight: 600 }}>Nhập số lượng lô (N):</label>
          <input
            type="number"
            value={testLotSize}
            onChange={(e) => setTestLotSize(e.target.value)}
            style={{
              width: '100px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontWeight: 'bold',
              textAlign: 'center',
              fontSize: '0.9rem'
            }}
          />
        </div>
        {calcResult ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.83rem', color: '#1F2937' }}>
            <span>➡️ Cỡ mẫu ($n$): <strong style={{ color: '#7B5233', fontSize: '0.95rem' }}>{calcResult.sample_size}</strong> ({calcResult.sample_rate_desc})</span>
            <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
              Lỗi Nặng: Ac ≤ {calcResult.major_ac} | Re ≥ {calcResult.major_re}
            </span>
            <span style={{ backgroundColor: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
              Lỗi Nhẹ: Ac ≤ {calcResult.minor_ac} | Re ≥ {calcResult.minor_re}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Vui lòng nhập SL hợp lệ để thử nghiệm...</span>
        )}
      </div>

      {/* Main Table */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF', textAlign: 'left', fontWeight: 'bold' }}>
              <th style={{ padding: '12px 14px', width: '50px' }}>STT</th>
              <th style={{ padding: '12px 14px' }}>Quy mô lô hàng (N)</th>
              <th style={{ padding: '12px 14px' }}>Tỷ lệ lấy mẫu</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Cỡ mẫu cần lấy (n)</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Lỗi Nặng (Ac / Re)</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Lỗi Nhẹ (Ac / Re)</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', width: '100px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>
                  Đang tải danh sách quy tắc lấy mẫu...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>
                  Chưa có dữ liệu cấu hình quy tắc lấy mẫu.
                </td>
              </tr>
            ) : (
              rules.map((rule, idx) => (
                <tr
                  key={rule.id}
                  style={{
                    borderBottom: '1px solid #F3F4F6',
                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F6',
                    transition: 'background-color 0.15s'
                  }}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#6B7280' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '700', color: '#1F2937' }}>
                    {rule.max_lot_size ? `${rule.min_lot_size} – ${rule.max_lot_size} sản phẩm` : `Trên ${rule.min_lot_size - 1} sản phẩm`}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#4B5563' }}>
                    <span style={{ backgroundColor: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem' }}>
                      {rule.sample_rate_desc || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#7B5233' }}>
                      {rule.sample_size}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginLeft: '4px' }}>mẫu</span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                      Ac: {rule.major_ac} | Re: {rule.major_re}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#E0E7FF', color: '#3730A3', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem' }}>
                      Ac: {rule.minor_ac} | Re: {rule.minor_re}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenEdit(rule)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        color: '#2563EB',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        transition: 'all 0.2s'
                      }}
                      title="Chỉnh sửa quy tắc lấy mẫu"
                    >
                      <Edit2 size={13} />
                      <span>Sửa</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingRule && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '480px',
            maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} />
                Chỉnh sửa Mốc Lấy mẫu ({editingRule.min_lot_size} - {editingRule.max_lot_size || 'trên'})
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Mô tả Tỷ lệ Lấy mẫu
                </label>
                <input
                  type="text"
                  value={sampleRateDesc}
                  onChange={(e) => setSampleRateDesc(e.target.value)}
                  placeholder="Ví dụ: 10%, 6% - 7%, Cố định"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.85rem'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Cỡ Mẫu Cần Kiểm ($n$)
                </label>
                <input
                  type="number"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(e.target.value)}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#7B5233'
                  }}
                  required
                />
              </div>

              {/* Major defects thresholds */}
              <div style={{
                backgroundColor: '#FEF3C7',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '14px',
                border: '1px solid #FDE68A'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#92400E', marginBottom: '8px' }}>
                  Ngưỡng Lỗi Nặng (Major Defects)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78350F' }}>Chấp nhận (Ac ≤)</label>
                    <input
                      type="number"
                      value={majorAc}
                      onChange={(e) => setMajorAc(e.target.value)}
                      min="0"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FCD34D', fontWeight: 'bold' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78350F' }}>Bác bỏ (Re ≥)</label>
                    <input
                      type="number"
                      value={majorRe}
                      onChange={(e) => setMajorRe(e.target.value)}
                      min="1"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FCD34D', fontWeight: 'bold' }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Minor defects thresholds */}
              <div style={{
                backgroundColor: '#E0E7FF',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                border: '1px solid #C7D2FE'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#3730A3', marginBottom: '8px' }}>
                  Ngưỡng Lỗi Nhẹ (Minor Defects)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#312E81' }}>Chấp nhận (Ac ≤)</label>
                    <input
                      type="number"
                      value={minorAc}
                      onChange={(e) => setMinorAc(e.target.value)}
                      min="0"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #A5B4FC', fontWeight: 'bold' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#312E81' }}>Bác bỏ (Re ≥)</label>
                    <input
                      type="number"
                      value={minorRe}
                      onChange={(e) => setMinorRe(e.target.value)}
                      min="1"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #A5B4FC', fontWeight: 'bold' }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontWeight: 600,
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
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#7B5233',
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={15} />
                  <span>{saving ? 'Đang lưu...' : 'Lưu cập nhật'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

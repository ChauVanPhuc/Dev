import React, { useState, useEffect } from 'react';
import {
  X, Plus, Edit3, Trash2, Check, Sliders, ShieldCheck,
  AlertTriangle, CheckCircle2, RotateCcw, HelpCircle, Layers,
  FileCheck, Sparkles, MoveVertical, Palette
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const PRESET_COLORS = [
  { color: '#0284C7', bg: '#F0F9FF', name: 'Xanh dương' },
  { color: '#D97706', bg: '#FFFBEB', name: 'Cam đất' },
  { color: '#7C3AED', bg: '#F5F3FF', name: 'Tím' },
  { color: '#059669', bg: '#ECFDF5', name: 'Xanh lá' },
  { color: '#E11D48', bg: '#FFF1F2', name: 'Đỏ hồng' },
  { color: '#F97316', bg: '#FFF7ED', name: 'Cam tươi' },
  { color: '#7B5233', bg: '#FAF6F0', name: 'Nâu gỗ' },
  { color: '#4F46E5', bg: '#EEF2FF', name: 'Chàm' },
];

const InspectionFormTypeModal = ({ isOpen, onClose, onUpdated }) => {
  const { toast } = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    short_name: '',
    description: '',
    route_path: '',
    color: '#0284C7',
    bg_color: '#F0F9FF',
    display_order: 1,
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
      setIsCreating(false);
      setEditingItem(null);
    }
  }, [isOpen]);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inspection-form-types?include_inactive=true');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setTypes(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách loại phiếu:', err);
      toast({ title: 'Lỗi', description: 'Không thể tải danh mục loại phiếu kiểm tra', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      short_name: '',
      description: '',
      route_path: '/production_v2/inspection/first-sample',
      color: '#0284C7',
      bg_color: '#F0F9FF',
      display_order: types.length + 1,
      is_active: true
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (item) => {
    setIsCreating(false);
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      short_name: item.short_name || '',
      description: item.description || '',
      route_path: item.route_path || '',
      color: item.color || '#0284C7',
      bg_color: item.bg_color || '#F0F9FF',
      display_order: item.display_order ?? 0,
      is_active: item.is_active ?? true
    });
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingItem(null);
  };

  const handleSelectColor = (preset) => {
    setFormData(prev => ({
      ...prev,
      color: preset.color,
      bg_color: preset.bg
    }));
  };

  const handleToggleActive = async (item) => {
    const nextStatus = !item.is_active;
    try {
      await api.put(`/inspection-form-types/${item.id}`, { is_active: nextStatus });
      setTypes(prev => prev.map(t => t.id === item.id ? { ...t, is_active: nextStatus } : t));
      toast({
        title: 'Thành công',
        description: `Đã ${nextStatus ? 'kích hoạt' : 'tạm ẩn'} loại phiếu "${item.name}"`,
        type: 'success'
      });
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái:', err);
      toast({ title: 'Thất bại', description: 'Không thể cập nhật trạng thái', type: 'error' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập tên loại phiếu', type: 'warning' });
      return;
    }
    if (isCreating && !formData.code?.trim()) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập mã loại phiếu', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const payload = {
          code: formData.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          name: formData.name.trim(),
          short_name: formData.short_name?.trim() || formData.name.trim(),
          description: formData.description?.trim() || '',
          route_path: formData.route_path?.trim() || '/production_v2/inspection/first-sample',
          color: formData.color,
          bg_color: formData.bg_color,
          display_order: Number(formData.display_order) || 0,
          is_active: Boolean(formData.is_active)
        };
        await api.post('/inspection-form-types', payload);
        toast({ title: 'Thành công', description: 'Đã tạo mới loại phiếu kiểm tra', type: 'success' });
      } else if (editingItem) {
        const payload = {
          name: formData.name.trim(),
          short_name: formData.short_name?.trim() || formData.name.trim(),
          description: formData.description?.trim() || '',
          route_path: formData.route_path?.trim() || '',
          color: formData.color,
          bg_color: formData.bg_color,
          display_order: Number(formData.display_order) || 0,
          is_active: Boolean(formData.is_active)
        };
        await api.put(`/inspection-form-types/${editingItem.id}`, payload);
        toast({ title: 'Thành công', description: 'Đã cập nhật loại phiếu kiểm tra', type: 'success' });
      }

      await fetchTypes();
      handleCancelForm();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Lỗi khi lưu loại phiếu:', err);
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi lưu';
      toast({ title: 'Thất bại', description: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (item.is_system) {
      toast({
        title: 'Bảo vệ hệ thống',
        description: 'Không thể xóa loại phiếu mặc định hệ thống. Bạn có thể chọn tắt kích hoạt.',
        type: 'warning'
      });
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa loại phiếu "${item.name}" không?`)) {
      return;
    }

    try {
      await api.delete(`/inspection-form-types/${item.id}`);
      setTypes(prev => prev.filter(t => t.id !== item.id));
      toast({ title: 'Thành công', description: 'Đã xóa loại phiếu kiểm tra', type: 'success' });
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Lỗi xóa loại phiếu:', err);
      toast({ title: 'Thất bại', description: 'Không thể xóa loại phiếu này', type: 'error' });
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 20,
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          width: '100%',
          maxWidth: 960,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FAF8F5'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#7B5233',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sliders size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
                  Cấu hình danh mục loại phiếu kiểm tra (Custom)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748B' }}>
                  Quản lý danh sách cách kiểm tra hiển thị trên Mobile dropdown và Web Admin
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isCreating && !editingItem && (
              <button
                onClick={handleOpenCreate}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)'
                }}
              >
                <Plus size={16} /> Thêm loại phiếu mới
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFF',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Create or Edit Form Panel */}
          {(isCreating || editingItem) && (
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 14,
              border: '1px solid #CBD5E1',
              padding: 20,
              marginBottom: 24,
              animation: 'slideDown 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color="#7B5233" />
                  {isCreating ? 'Thêm loại phiếu kiểm tra mới' : `Chỉnh sửa: ${editingItem.name}`}
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 13 }}
                >
                  Đóng form
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
                  {/* Code */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Mã định danh (Code) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      disabled={!isCreating}
                      placeholder="VD: patrol, special_qc"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        backgroundColor: isCreating ? '#FFF' : '#F1F5F9',
                        color: isCreating ? '#0F172A' : '#64748B',
                        fontFamily: 'monospace'
                      }}
                      required
                    />
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      {isCreating ? 'Mã duy nhất, viết thường, không dấu (VD: first_sample)' : 'Mã hệ thống cố định'}
                    </span>
                  </div>

                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Tên loại phiếu hiển thị <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Kiểm tra mẫu lần đầu"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        backgroundColor: '#FFF'
                      }}
                      required
                    />
                  </div>

                  {/* Short Name / Badge */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Tên rút gọn (Badge nhãn)
                    </label>
                    <input
                      type="text"
                      value={formData.short_name}
                      onChange={e => setFormData({ ...formData, short_name: e.target.value })}
                      placeholder="VD: Mẫu lần đầu, Thông số"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        backgroundColor: '#FFF'
                      }}
                    />
                  </div>

                  {/* Route path */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Đường dẫn Route Mobile
                    </label>
                    <input
                      type="text"
                      value={formData.route_path}
                      onChange={e => setFormData({ ...formData, route_path: e.target.value })}
                      placeholder="/production_v2/inspection/..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        backgroundColor: '#FFF',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  {/* Display Order */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={e => setFormData({ ...formData, display_order: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13,
                        backgroundColor: '#FFF'
                      }}
                    />
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Trạng thái sử dụng
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: '#059669' }}
                      />
                      <span style={{ color: formData.is_active ? '#059669' : '#64748B' }}>
                        {formData.is_active ? 'Đang kích hoạt (Hiển thị trên Mobile)' : 'Tạm ẩn'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Color Palette Picker */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Màu sắc nhận diện (Badge Color)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {PRESET_COLORS.map(p => (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => handleSelectColor(p)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: formData.color === p.color ? `2px solid ${p.color}` : '1px solid #E2E8F0',
                          backgroundColor: p.bg,
                          color: p.color,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: p.color }} />
                        {p.name}
                        {formData.color === p.color && <Check size={12} />}
                      </button>
                    ))}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                      <input
                        type="color"
                        value={formData.color}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{formData.color}</span>
                    </div>

                    {/* Live Badge Preview */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748B' }}>Xem trước nhãn:</span>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        backgroundColor: formData.bg_color || '#F0F9FF',
                        color: formData.color || '#0284C7',
                        border: `1px solid ${formData.color}33`,
                        fontSize: 12,
                        fontWeight: 700
                      }}>
                        {formData.short_name || formData.name || 'Tên nhãn'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Mô tả mục đích sử dụng
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả phạm vi áp dụng của loại phiếu này..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      backgroundColor: '#FFF'
                    }}
                  />
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#FFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: '#7B5233',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#FFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 4px rgba(123, 82, 51, 0.25)'
                    }}
                  >
                    {saving ? 'Đang lưu...' : (isCreating ? 'Tạo loại phiếu' : 'Lưu thay đổi')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Types Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              Đang tải danh mục loại phiếu...
            </div>
          ) : (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <th style={{ padding: '12px 16px', width: 60, textAlign: 'center' }}>Thứ tự</th>
                    <th style={{ padding: '12px 16px' }}>Tên loại phiếu / Nhãn</th>
                    <th style={{ padding: '12px 16px' }}>Mã Code</th>
                    <th style={{ padding: '12px 16px' }}>Mô tả & Route Mobile</th>
                    <th style={{ padding: '12px 16px', width: 110, textAlign: 'center' }}>Hệ thống</th>
                    <th style={{ padding: '12px 16px', width: 120, textAlign: 'center' }}>Kích hoạt</th>
                    <th style={{ padding: '12px 16px', width: 100, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: idx < types.length - 1 ? '1px solid #F1F5F9' : 'none',
                        backgroundColor: item.is_active ? '#FFFFFF' : '#FAFAFA',
                        opacity: item.is_active ? 1 : 0.65
                      }}
                    >
                      {/* Order */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#64748B' }}>
                        {item.display_order ?? idx + 1}
                      </td>

                      {/* Name & Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: 14,
                              fontSize: 12,
                              fontWeight: 700,
                              color: item.color || '#0284C7',
                              backgroundColor: item.bg_color || '#F0F9FF',
                              border: `1px solid ${item.color || '#0284C7'}33`,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.short_name || item.name}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 13.5 }}>
                              {item.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td style={{ padding: '14px 16px' }}>
                        <code style={{
                          backgroundColor: '#F1F5F9',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#0F172A'
                        }}>
                          {item.code}
                        </code>
                      </td>

                      {/* Description & Route */}
                      <td style={{ padding: '14px 16px', maxWidth: 260 }}>
                        <div style={{ color: '#475569', fontSize: 12.5, marginBottom: 2 }}>
                          {item.description || '—'}
                        </div>
                        {item.route_path && (
                          <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
                            {item.route_path}
                          </div>
                        )}
                      </td>

                      {/* System Flag */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {item.is_system ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <ShieldCheck size={12} color="#0284C7" /> Gốc
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: '#FEF3C7',
                            color: '#92400E'
                          }}>
                            Custom
                          </span>
                        )}
                      </td>

                      {/* Toggle Active */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 14,
                            border: 'none',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: item.is_active ? '#DCFCE7' : '#F1F5F9',
                            color: item.is_active ? '#15803D' : '#64748B',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Bấm để chuyển đổi trạng thái"
                        >
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: item.is_active ? '#16A34A' : '#94A3B8'
                          }} />
                          {item.is_active ? 'Kích hoạt' : 'Tạm ẩn'}
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Chỉnh sửa thông tin"
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFF',
                              color: '#0284C7',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                          {!item.is_system && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              title="Xóa loại phiếu custom này"
                              style={{
                                padding: 6,
                                borderRadius: 6,
                                border: '1px solid #FEE2E2',
                                backgroundColor: '#FFF5F5',
                                color: '#EF4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F8FAFC'
        }}>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>
            Tổng số: <strong>{types.length}</strong> loại phiếu ({types.filter(t => t.is_active).length} đang kích hoạt)
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#FFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InspectionFormTypeModal;

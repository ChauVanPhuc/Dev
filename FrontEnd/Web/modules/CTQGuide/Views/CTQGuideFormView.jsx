import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Save, Sparkles, AlertTriangle, Search, Check, Layers, AlertCircle, Info } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

const THEME = {
  primary: '#7B5233',
  hover: '#5D3B32',
  bgLight: '#FAF6F0',
  borderLight: '#EADCC9',
  pageBg: '#FAF8F6'
};

const DEFAULT_STAGES = [
  "Định hình 1",
  "Định hình ván",
  "Lắp ráp, chà nhám",
  "Sơn hoàn thiện",
  "Sơn Pallet",
  "Sơn treo",
  "Đóng gói thành phẩm",
  "Kiểm tra đầu vào (IQC)"
];

const CTQGuideFormView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;

  // Form State
  const [form, setForm] = useState({
    code: '',
    stage: '',
    defect_id: '',
    defect_code: '',
    name: '',
    doc_type: 'CTQ',
    description: '',
    is_active: true
  });

  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Lỗi cần chú ý (CTQ)');
    if (setCustomSubtitle) setCustomSubtitle('Khởi tạo mới');
    return () => {
      if (setCustomTitle) setCustomTitle(null);
      if (setCustomSubtitle) setCustomSubtitle(null);
    };
  }, [setCustomTitle, setCustomSubtitle]);

  // Dropdown Data
  const [stages, setStages] = useState([]);
  const [defects, setDefects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Defect Search / Filter
  const [defectSearch, setDefectSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Sinh mã tự động G7.CL.CTQ.xxx
  const generateUniqueCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await api.get('/inspection-guides/next-code?doc_type=CTQ');
      if (res?.code) {
        setForm(prev => ({ ...prev, code: res.code }));
        return;
      }
      throw new Error('Không lấy được mã từ server');
    } catch (err) {
      setForm(prev => ({ ...prev, code: 'G7.CL.CTQ.001' }));
    } finally {
      setGeneratingCode(false);
    }
  };

  // Tải danh sách Công đoạn & Danh sách Lỗi từ hệ thống
  useEffect(() => {
    generateUniqueCode();

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [stagesRes, defectsRes] = await Promise.allSettled([
          api.get('/stages/').catch(() => api.get('/stages')),
          api.get('/inspections/defect-types?include_inactive=false')
        ]);

        // Xử lý danh sách Công đoạn
        if (stagesRes.status === 'fulfilled' && stagesRes.value) {
          const rawStages = Array.isArray(stagesRes.value) ? stagesRes.value : (stagesRes.value?.items || []);
          const stageNames = rawStages.map(s => s.name || s.stage_name || s).filter(Boolean);
          const combinedStages = Array.from(new Set([...stageNames, ...DEFAULT_STAGES]));
          setStages(combinedStages);
        } else {
          setStages(DEFAULT_STAGES);
        }

        // Xử lý danh sách Lỗi
        if (defectsRes.status === 'fulfilled' && defectsRes.value) {
          const rawDefects = Array.isArray(defectsRes.value) ? defectsRes.value : (defectsRes.value?.items || []);
          setDefects(rawDefects);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu công đoạn và lỗi:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Lọc danh sách lỗi theo từ khóa và nhóm
  const filteredDefects = useMemo(() => {
    return defects.filter(d => {
      const query = defectSearch.toLowerCase().trim();
      const matchQuery = !query ||
        (d.name && d.name.toLowerCase().includes(query)) ||
        (d.code && d.code.toLowerCase().includes(query)) ||
        (d.description && d.description.toLowerCase().includes(query));

      const matchCategory = selectedCategory === 'all' || d.category === selectedCategory;

      return matchQuery && matchCategory;
    });
  }, [defects, defectSearch, selectedCategory]);

  // Xử lý khi người dùng chọn 1 lỗi từ danh mục lỗi
  const handleSelectDefect = (defect) => {
    const displayName = defect.code ? `[${defect.code}] ${defect.name}` : defect.name;
    const defaultDesc = defect.description
      ? `Lỗi ${defect.name}: ${defect.description}`
      : `Tiêu chuẩn kiểm soát và phòng ngừa lỗi: ${defect.name}`;

    // Tự động gợi ý công đoạn nếu lỗi có stage định sẵn
    let suggestedStage = form.stage;
    if (!suggestedStage && defect.stage) {
      try {
        const parsed = typeof defect.stage === 'string' && defect.stage.startsWith('[') ? JSON.parse(defect.stage) : [defect.stage];
        if (Array.isArray(parsed) && parsed.length > 0) {
          suggestedStage = parsed[0];
        }
      } catch (e) {
        suggestedStage = defect.stage;
      }
    }

    setForm(prev => ({
      ...prev,
      defect_id: defect.id,
      defect_code: defect.code || '',
      name: displayName,
      description: defaultDesc,
      stage: suggestedStage || prev.stage
    }));

    if (toast) toast('info', `Đã chọn lỗi: ${defect.name}`);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      if (toast) toast('warning', 'Vui lòng nhập đầy đủ Mã, Công đoạn và Lỗi cần chú ý (CTQ).');
      return;
    }

    setSaving(true);
    try {
      // Đóng gói mô tả kèm công đoạn nếu có
      let fullDescription = form.description?.trim() || '';
      if (form.stage) {
        fullDescription = `[Công đoạn: ${form.stage}] ${fullDescription}`.trim();
      }

      const created = await api.post('/inspection-guides', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        doc_type: 'CTQ',
        description: fullDescription || null
      });

      // Tự động tạo điểm lỗi đầu tiên tương ứng với lỗi đã chọn
      if (created?.id) {
        try {
          await api.post(`/inspection-guides/${created.id}/steps`, {
            step_no: 1,
            title: form.name.trim(),
            content: form.description?.trim() || 'Mô tả hiện tượng lỗi, nguyên nhân và biện pháp khắc phục phòng ngừa.'
          });
        } catch (stepErr) {
          console.warn('Lỗi tạo điểm lỗi mặc định:', stepErr);
        }
      }

      if (toast) toast('success', `Đã tạo CTQ "${form.code}" thành công! Chuyển sang phần tải ảnh mẫu đối chứng...`);
      navigate(`/admin/ctq-guides/edit/${created.id}`);
    } catch (err) {
      console.error('Lỗi tạo CTQ:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi tạo tài liệu Lỗi cần chú ý.');
      setSaving(false);
    }
  };

  return (
    <div
      className="guide-management-container"
      style={{
        padding: '32px 20px',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: THEME.pageBg,
        minHeight: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto'
      }}
    >
      <div style={{ width: '100%', maxWidth: 960, margin: '0 auto' }}>
        {/* Card Form */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: `1.5px solid ${THEME.borderLight}`,
          padding: '36px 40px',
          boxShadow: '0 12px 36px rgba(123, 82, 51, 0.08)'
        }}>
          {/* Card Header inside Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            paddingBottom: 20,
            marginBottom: 26,
            borderBottom: `1.5px solid ${THEME.borderLight}`
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: THEME.bgLight,
              border: `1px solid ${THEME.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: THEME.primary,
              flexShrink: 0
            }}>
              <AlertTriangle size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#2D1A12' }}>
                Tạo mới tài liệu Lỗi cần chú ý (CTQ)
              </h2>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 3, fontWeight: 500 }}>
                Điểm kiểm soát chất lượng trọng yếu và danh sách các lỗi nguy cơ cao cần chú ý theo công đoạn.
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Grid 2 Cột: Mã CTQ & Công đoạn */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(240px, 1.3fr)', gap: 18, marginBottom: 22 }}>
              {/* 1. Mã CTQ */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontWeight: 700, color: THEME.primary, fontSize: 12.5, textTransform: 'uppercase' }}>
                    1. Mã tài liệu * (G7.CL.CTQ.xxx)
                  </label>
                  <button
                    type="button"
                    onClick={generateUniqueCode}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: THEME.primary,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Sparkles size={13} /> {generatingCode ? 'Đang tạo...' : 'Tự sinh'}
                  </button>
                </div>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="VD: G7.CL.CTQ.001"
                  required
                  maxLength={50}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14.5,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: '#1E293B',
                    backgroundColor: THEME.bgLight,
                    textTransform: 'uppercase',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = THEME.primary; e.currentTarget.style.backgroundColor = '#FFF'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = THEME.bgLight; }}
                />
              </div>

              {/* 2. Công đoạn */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: THEME.primary, fontSize: 12.5, textTransform: 'uppercase' }}>
                  2. Công đoạn áp dụng *
                </label>
                <select
                  name="stage"
                  value={form.stage}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1E293B',
                    backgroundColor: '#FFF',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Chọn công đoạn sản xuất --</option>
                  {stages.map((stg, i) => (
                    <option key={i} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Chọn Lỗi từ danh mục lỗi hệ thống */}
            <div style={{
              marginBottom: 24,
              backgroundColor: '#FAFAFA',
              borderRadius: 14,
              border: `1.5px solid ${THEME.borderLight}`,
              padding: 18
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <label style={{ fontWeight: 800, color: THEME.primary, fontSize: 13, textTransform: 'uppercase' }}>
                    3. Chọn Lỗi từ Danh mục Lỗi kiểm tra chất lượng
                  </label>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Chọn lỗi từ danh sách có sẵn để tự động điền Tên lỗi và Tiêu chuẩn phòng ngừa.
                  </div>
                </div>

                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.primary, backgroundColor: THEME.bgLight, padding: '3px 8px', borderRadius: 6, border: `1px solid ${THEME.borderLight}` }}>
                  {defects.length} lỗi trong hệ thống
                </span>
              </div>

              {/* Bộ lọc nhanh danh mục lỗi */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Tìm nhanh theo mã lỗi (VD: PAI-01) hoặc tên lỗi..."
                    value={defectSearch}
                    onChange={e => setDefectSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 32px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                    backgroundColor: '#FFF'
                  }}
                >
                  <option value="all">Tất cả nhóm lỗi</option>
                  <option value="paint">Sơn & Bề mặt (PAI)</option>
                  <option value="structure">Kết cấu & Kỹ thuật (STR)</option>
                  <option value="visual">Ngoại quan & Đóng gói (APP)</option>
                  <option value="material">Nguyên liệu & Phôi (MAT)</option>
                </select>
              </div>

              {/* Danh sách lỗi cuộn được để chọn */}
              <div style={{
                maxHeight: 180,
                overflowY: 'auto',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                {loadingData ? (
                  <div style={{ padding: 16, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                    Đang tải danh sách lỗi...
                  </div>
                ) : filteredDefects.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    Không tìm thấy lỗi phù hợp với từ khóa.
                  </div>
                ) : (
                  filteredDefects.map(d => {
                    const isSelected = form.defect_id === d.id || (form.defect_code && form.defect_code === d.code);
                    return (
                      <div
                        key={d.id}
                        onClick={() => handleSelectDefect(d)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          backgroundColor: isSelected ? THEME.bgLight : 'transparent',
                          border: isSelected ? `1.5px solid ${THEME.primary}` : '1px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {d.code && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: THEME.bgLight,
                              border: `1px solid ${THEME.borderLight}`,
                              color: THEME.primary,
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: 11.5
                            }}>
                              {d.code}
                            </span>
                          )}
                          <span style={{ fontWeight: isSelected ? 700 : 600, color: isSelected ? THEME.primary : '#1E293B', fontSize: 13 }}>
                            {d.name}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {d.aql_class && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: d.aql_class === 'Critical' ? '#FEE2E2' : d.aql_class === 'Major' ? '#FEF3C7' : '#F1F5F9',
                              color: d.aql_class === 'Critical' ? '#DC2626' : d.aql_class === 'Major' ? '#D97706' : '#64748B'
                            }}>
                              {d.aql_class}
                            </span>
                          )}
                          {isSelected && <Check size={16} color={THEME.primary} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Field 4: Tên Lỗi CTQ (Có thể chỉnh sửa nếu cần) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: THEME.primary, fontSize: 12.5, textTransform: 'uppercase' }}>
                4. Tên Lỗi cần chú ý (CTQ) *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="VD: [PAI-01] Lỗi chảy sơn, da cam bề mặt và đọng góc chân bàn"
                required
                maxLength={250}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: '#1E293B',
                  backgroundColor: '#FFF',
                  boxSizing: 'border-box'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = THEME.primary; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
              />
            </div>

            {/* Field 5: Mô tả hiện tượng & Tiêu chuẩn phòng ngừa */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: '#64748B', fontSize: 12.5, textTransform: 'uppercase' }}>
                5. Mô tả hiện tượng lỗi, Nguyên nhân & Tiêu chuẩn xử lý phòng ngừa
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={1000}
                placeholder="VD: 1. Hiện tượng lỗi: Bề mặt sơn không phẳng...&#10;2. Nguyên nhân: Tỉ lệ pha dung môi chưa chuẩn...&#10;3. Biện pháp phòng ngừa: Căn chỉnh áp lực khí..."
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: 14,
                  lineHeight: '1.5',
                  color: '#334155',
                  backgroundColor: '#FFF',
                  boxSizing: 'border-box'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = THEME.primary; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
              />
            </div>

            {/* Field 6: Trạng thái áp dụng */}
            <div style={{
              marginBottom: 28,
              padding: '14px 18px',
              backgroundColor: THEME.bgLight,
              borderRadius: 12,
              border: `1px solid ${THEME.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E293B' }}>Trạng thái ban hành</div>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>Kích hoạt ngay tiêu chuẩn CTQ này cho công nhân và QC tại xưởng.</div>
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                color: form.is_active ? '#15803D' : '#64748B',
                padding: '6px 12px',
                backgroundColor: form.is_active ? '#DCFCE7' : '#F1F5F9',
                borderRadius: 20
              }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  style={{ accentColor: THEME.primary }}
                />
                {form.is_active ? 'Đang áp dụng' : 'Tạm ngưng'}
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate('/admin/ctq-guides')}
                style={{
                  padding: '11px 22px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={saving || generatingCode}
                style={{
                  padding: '11px 26px',
                  backgroundColor: THEME.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(123, 82, 51, 0.25)',
                  transition: 'all 0.2s',
                  opacity: saving ? 0.7 : 1
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = THEME.hover; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = THEME.primary; }}
              >
                <Save size={17} />
                {saving ? 'Đang tạo...' : 'Lưu & Sang phần Tải ảnh mẫu đối chứng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CTQGuideFormView;

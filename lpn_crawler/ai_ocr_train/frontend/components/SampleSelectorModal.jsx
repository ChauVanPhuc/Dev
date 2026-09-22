import React, { useState, useEffect } from 'react';
import { X, Search, Upload, Image as ImageIcon, Check, Filter } from 'lucide-react';

export const SampleSelectorModal = ({
  isOpen = false,
  onClose = () => {},
  onSelectSample = () => {},
  onUploadImage = () => {}
}) => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSplit, setActiveSplit] = useState('test'); // 'test' | 'hard_case' | 'all'

  useEffect(() => {
    if (isOpen) {
      fetchSamples(searchTerm, activeSplit);
    }
  }, [isOpen, activeSplit]);

  const fetchSamples = async (search = '', split = activeSplit) => {
    setLoading(true);
    try {
      let q = `?limit=30`;
      if (search) q += `&search=${encodeURIComponent(search)}`;
      if (split && split !== 'all') q += `&split_type=${encodeURIComponent(split)}`;
      
      const res = await fetch(`/api/v1/lpn-crawler/ai-ocr/samples${q}`);
      const data = await res.json();
      if (data.success && data.samples) {
        setSamples(data.samples);
      }
    } catch (e) {
      console.error('Failed to fetch samples:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      onUploadImage(base64Data, file.name);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(45, 26, 18, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '900px',
        maxWidth: '100%',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        border: '1px solid #EADCC9',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #EFE5D8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FAF6F0'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#4A2E1B' }}>
              Chọn Ảnh Mẫu Kiểm Thử (Độc Lập & Không Rò Rỉ Dữ Liệu)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#8D6E63' }}>
              Ưu tiên chọn ảnh trong <strong>Tập Test Độc Lập</strong> hoặc <strong>Hard Cases</strong> để kiểm tra khả năng đọc thực tế.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8D6E63',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar: Split Filter Buttons + Search + Upload Button */}
        <div style={{
          padding: '12px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          borderBottom: '1px solid #F3EDE2'
        }}>
          {/* Split Filters */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'test', label: 'Tập Test Độc Lập (Hold-out)', color: '#047857' },
              { id: 'hard_case', label: 'Hard Cases (Ảnh Khó)', color: '#B45309' },
              { id: 'all', label: 'Tất Cả Mẫu', color: '#4A2E1B' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveSplit(tab.id);
                  fetchSamples(searchTerm, tab.id);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${activeSplit === tab.id ? tab.color : '#D8C3AE'}`,
                  backgroundColor: activeSplit === tab.id ? tab.color : '#FFF',
                  color: activeSplit === tab.id ? '#FFF' : '#7B5233',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{
            flex: 1,
            minWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FAF6F0',
            border: '1px solid #EADCC9',
            borderRadius: '8px',
            padding: '0 10px',
            height: '36px'
          }}>
            <Search size={16} color="#8D6E63" />
            <input
              type="text"
              placeholder="Tìm theo Container, LPN, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchSamples(searchTerm, activeSplit);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                padding: '0 8px',
                fontSize: '0.8rem',
                width: '100%',
                color: '#2D1A12'
              }}
            />
          </div>

          {/* Upload Button */}
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 14px',
            height: '36px',
            backgroundColor: '#4A2E1B',
            color: '#FFF',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}>
            <Upload size={14} />
            <span>Tải Ảnh Máy Tính</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Image Grid */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '12px'
        }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#8D6E63' }}>
              Đang tải danh sách ảnh mẫu từ CSDL...
            </div>
          ) : samples.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
              Không tìm thấy ảnh mẫu phù hợp trong tập dữ liệu đã chọn.
            </div>
          ) : (
            samples.map((s) => (
              <div
                key={s.image_id}
                onClick={() => {
                  onSelectSample(s);
                  onClose();
                }}
                style={{
                  border: '1px solid #EADCC9',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: '#FAF6F0',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(74, 46, 27, 0.12)';
                  e.currentTarget.style.borderColor = '#7B5233';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#EADCC9';
                }}
              >
                <div style={{ height: '110px', backgroundColor: '#EFEBE6', position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={s.image_id ? `/api/v1/lpn-crawler/images/${s.image_id}/file` : (s.local_path ? `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(s.local_path)}` : (s.source_url || ''))}
                    alt="Sample"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      if (s.local_path && !e.target.src.includes('images/view')) {
                        e.target.src = `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(s.local_path)}`;
                      } else if (s.source_url && !e.target.src.includes(s.source_url)) {
                        e.target.src = s.source_url;
                      }
                    }}
                  />
                  {/* Split Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    backgroundColor: s.dataset_split === 'test' ? 'rgba(4, 120, 87, 0.9)' : (s.is_hard_case ? 'rgba(180, 83, 9, 0.9)' : 'rgba(0,0,0,0.65)'),
                    color: '#FFF',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.62rem',
                    fontWeight: 'bold'
                  }}>
                    {s.dataset_split === 'test' ? 'Test Set' : (s.is_hard_case ? 'Hard Case' : 'Train/Val')}
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    color: '#FFF',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    fontSize: '0.62rem'
                  }}>
                    {s.suffix_key || 'Pallet'}
                  </div>
                </div>

                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#4A2E1B' }}>
                    {s.container_number}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#7B5233' }}>
                    SKU: <strong>{s.gt_sku || '—'}</strong>
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#8D6E63' }}>
                    LPN: <strong>{s.gt_lpn || '—'}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Sliders, Play, RotateCcw, Activity, Sparkles, Cpu } from 'lucide-react';

export const PreprocessControls = ({
  config = {},
  onChange = () => {},
  onRunAnalyze = () => {},
  onResetConfig = () => {},
  onOpenBenchmark = () => {},
  loading = false,
  deviceInfo = {}
}) => {
  const handleToggle = (key) => {
    onChange({ ...config, [key]: !config[key] });
  };

  const handleSlider = (key, value) => {
    onChange({ ...config, [key]: parseFloat(value) });
  };

  const handleSelect = (key, value) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="ai-ocr-card">
      <div className="ai-ocr-card-header">
        <div className="ai-ocr-card-title">
          <Sliders size={18} color="#7B5233" />
          <span>Bộ Điều Khiển Tiền Xử Lý & AI</span>
        </div>
        {deviceInfo?.device_name && (
          <div className="ai-ocr-device-badge" title="Thiết bị tính toán GPU hiện tại">
            <Cpu size={14} />
            <span>{deviceInfo.device_name}</span>
          </div>
        )}
      </div>

      <div className="ai-control-group">
        {/* 1. Auto Crop & Auto Rotate */}
        <div className="ai-control-row">
          <span>Tự động phát hiện & Cắt vùng nhãn (ROI)</span>
          <label className="ai-switch">
            <input
              type="checkbox"
              checked={Boolean(config.auto_crop_label)}
              onChange={() => handleToggle('auto_crop_label')}
            />
            <span className="ai-switch-slider" />
          </label>
        </div>

        <div className="ai-control-row">
          <span>Tự động xoay & Nắn thẳng góc (Auto Deskew)</span>
          <label className="ai-switch">
            <input
              type="checkbox"
              checked={Boolean(config.auto_rotate)}
              onChange={() => handleToggle('auto_rotate')}
            />
            <span className="ai-switch-slider" />
          </label>
        </div>

        {/* 2. Manual Rotation Quick Buttons */}
        <div className="ai-control-row">
          <span>Xoay thủ công</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                className={`ai-btn-secondary ${config.rotate_angle === deg ? 'active' : ''}`}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: config.rotate_angle === deg ? '700' : '500',
                  backgroundColor: config.rotate_angle === deg ? '#4A2E1B' : '#FFF',
                  color: config.rotate_angle === deg ? '#FFF' : '#7B5233'
                }}
                onClick={() => onChange({ ...config, rotate_angle: deg })}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* 3. Zoom Factor */}
        <div className="ai-control-row">
          <span>Phóng to siêu phân giải (Zoom)</span>
          <div className="ai-slider-container">
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={config.zoom_factor || 1.0}
              onChange={(e) => handleSlider('zoom_factor', e.target.value)}
              className="ai-slider"
            />
            <span className="ai-slider-val">{(config.zoom_factor || 1.0).toFixed(1)}x</span>
          </div>
        </div>

        {/* 4. CLAHE Contrast */}
        <div className="ai-control-row">
          <span>Tăng tương phản thích nghi (CLAHE)</span>
          <label className="ai-switch">
            <input
              type="checkbox"
              checked={Boolean(config.enable_clahe)}
              onChange={() => handleToggle('enable_clahe')}
            />
            <span className="ai-switch-slider" />
          </label>
        </div>

        {config.enable_clahe && (
          <div className="ai-control-row" style={{ paddingLeft: '12px' }}>
            <span style={{ fontSize: '0.76rem', color: '#8D6E63' }}>CLAHE Clip Limit</span>
            <div className="ai-slider-container">
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.2"
                value={config.clahe_clip || 2.5}
                onChange={(e) => handleSlider('clahe_clip', e.target.value)}
                className="ai-slider"
              />
              <span className="ai-slider-val">{(config.clahe_clip || 2.5).toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* 5. Sharpening */}
        <div className="ai-control-row">
          <span>Làm sắc nét viền chữ (Sharpen)</span>
          <label className="ai-switch">
            <input
              type="checkbox"
              checked={Boolean(config.enable_sharpen)}
              onChange={() => handleToggle('enable_sharpen')}
            />
            <span className="ai-switch-slider" />
          </label>
        </div>

        {/* 6. Thresholding Mode */}
        <div className="ai-control-row">
          <span>Nhị phân hóa (Threshold)</span>
          <select
            value={config.threshold_mode || 'none'}
            onChange={(e) => handleSelect('threshold_mode', e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #EADCC9',
              backgroundColor: '#FAF6F0',
              fontSize: '0.76rem',
              fontWeight: '600',
              color: '#4A2E1B',
              cursor: 'pointer'
            }}
          >
            <option value="none">Tắt (Giữ ảnh mức xám)</option>
            <option value="otsu">Otsu Threshold (Tự động)</option>
            <option value="adaptive_gaussian">Adaptive Gaussian (Khử lóa)</option>
            <option value="adaptive_mean">Adaptive Mean</option>
            <option value="binary">Binary 127</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
        <button
          type="button"
          className="ai-btn-primary"
          onClick={onRunAnalyze}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? (
            <>
              <Activity size={16} className="ai-spinner" />
              <span>Đang Xử Lý GPU OCR...</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Chạy Phân Tích AI OCR</span>
            </>
          )}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            className="ai-btn-secondary"
            onClick={onResetConfig}
            style={{ justifyContent: 'center' }}
          >
            <RotateCcw size={14} />
            <span>Đặt Lại</span>
          </button>

          <button
            type="button"
            className="ai-btn-secondary"
            onClick={onOpenBenchmark}
            style={{ justifyContent: 'center', borderColor: '#7B5233', color: '#7B5233' }}
          >
            <Sparkles size={14} />
            <span>Benchmark Mẫu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

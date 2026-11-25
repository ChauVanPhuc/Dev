import React, { useState, useRef } from 'react';
import { Download, Maximize2, X, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * Executive 5-Block Infographic Poster Renderer (100% Real ERP Data, Crisp Vietnamese Typography).
 * Hỗ trợ Phóng to Fullscreen & Tải ảnh PNG 2x sắc nét gửi Zalo/Báo cáo/PowerPoint.
 */
const ChatInfographicRenderer = ({ spec }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef(null);
  const fullPosterRef = useRef(null);

  if (!spec || !spec.title) return null;

  const handleDownloadPng = async (useFull = false) => {
    const targetEl = useFull ? fullPosterRef.current : posterRef.current;
    if (!targetEl || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        backgroundColor: '#FAF7F2',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `smartflow_infographic_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[ChatInfographicRenderer] Export PNG error:', err);
    } finally {
      setExporting(false);
    }
  };

  const renderPoster = (fullMode = false) => (
    <div className={`chatbot-infographic-wrap ${fullMode ? 'is-full' : ''}`}>
      {/* Toolbar */}
      <div className="chatbot-infographic-actions" data-html2canvas-ignore="true">
        <span className="chatbot-infographic-tag">
          <Sparkles size={12} /> Infographic Điều Hành
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="chatbot-table-export-btn"
            onClick={() => handleDownloadPng(fullMode)}
            disabled={exporting}
          >
            <Download size={12} /> {exporting ? 'Đang xuất...' : 'Tải ảnh PNG (2x)'}
          </button>
          {!fullMode ? (
            <button
              type="button"
              className="chatbot-table-export-btn"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 size={12} /> Phóng to
            </button>
          ) : (
            <button
              type="button"
              className="chatbot-table-export-btn"
              onClick={() => setIsFullscreen(false)}
            >
              <X size={13} /> Đóng
            </button>
          )}
        </div>
      </div>

      {/* Printable Poster Canvas */}
      <div className="chatbot-infographic-poster" ref={fullMode ? fullPosterRef : posterRef}>
        {/* 1. Header Banner */}
        <div className="infographic-header">
          <div className="infographic-header-meta">
            <span className="infographic-badge">{spec.badge || 'BÁO CÁO ĐIỀU HÀNH'}</span>
            {spec.period && <span className="infographic-period">{spec.period}</span>}
          </div>
          <h3 className="infographic-title">{spec.title}</h3>
          {spec.subtitle && <p className="infographic-subtitle">{spec.subtitle}</p>}
        </div>

        {/* 2. KPI Stat Cards */}
        {Array.isArray(spec.kpis) && spec.kpis.length > 0 && (
          <div className="infographic-kpi-grid">
            {spec.kpis.map((kpi, idx) => (
              <div key={idx} className={`infographic-kpi-card status-${kpi.status || 'neutral'}`}>
                <div className="infographic-kpi-label">{kpi.label}</div>
                <div className="infographic-kpi-value">{kpi.value}</div>
                {kpi.subtext && <div className="infographic-kpi-sub">{kpi.subtext}</div>}
              </div>
            ))}
          </div>
        )}

        {/* 3. Ranking Progress Bars */}
        {Array.isArray(spec.ranking_items) && spec.ranking_items.length > 0 && (
          <div className="infographic-section">
            <div className="infographic-section-title">{spec.ranking_title || 'Top hạng mục nổi bật'}</div>
            <div className="infographic-ranking-list">
              {spec.ranking_items.map((item, idx) => (
                <div key={idx} className="infographic-rank-row">
                  <div className="infographic-rank-head">
                    <span className="infographic-rank-name">
                      <span className="infographic-rank-idx">#{idx + 1}</span> {item.name}
                    </span>
                    <span className="infographic-rank-val">
                      {Number(item.value).toLocaleString('vi-VN')}
                      {spec.unit ? ` ${spec.unit}` : ''}{' '}
                      <span style={{ opacity: 0.72 }}>({item.percent}%)</span>
                    </span>
                  </div>
                  <div className="infographic-rank-track">
                    <div
                      className="infographic-rank-bar"
                      style={{
                        width: `${Math.max(4, item.bar_width || 0)}%`,
                        background: idx === 0 ? '#A0301B' : idx === 1 ? '#C85A43' : idx === 2 ? '#D97706' : '#7B5233',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Two-Column Insights & Recommendations */}
        <div className="infographic-two-col">
          {Array.isArray(spec.highlights) && spec.highlights.length > 0 && (
            <div className="infographic-insight-box is-findings">
              <div className="infographic-box-title">
                <AlertTriangle size={14} /> Điểm nổi bật &amp; Nguyên nhân
              </div>
              <ul>
                {spec.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(spec.recommendations) && spec.recommendations.length > 0 && (
            <div className="infographic-insight-box is-actions">
              <div className="infographic-box-title">
                <CheckCircle2 size={14} /> Khuyến nghị hành động
              </div>
              <ul>
                {spec.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 5. Footer */}
        <div className="infographic-footer">
          <span>SMARTFLOW ERP • AI ANALYTICS</span>
          <span>Xuất lúc: {spec.generated_at || ''}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderPoster(false)}
      {isFullscreen && (
        <div className="chatbot-fullscreen-backdrop" onClick={() => setIsFullscreen(false)}>
          <div className="chatbot-fullscreen-dialog is-infographic" onClick={(e) => e.stopPropagation()}>
            {renderPoster(true)}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatInfographicRenderer;


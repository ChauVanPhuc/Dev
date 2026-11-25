import React, { useState, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Maximize2, Download, X, BarChart3, PieChart as PieIcon, TrendingUp, AlignLeft } from 'lucide-react';
import html2canvas from 'html2canvas';

const COLORS = ['#A0301B', '#C85A43', '#7B5233', '#8D6E63', '#D97706', '#059669', '#2563EB', '#7C3AED', '#0D9488', '#DB2777'];

const CustomTooltip = ({ active, payload, unit }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div
      style={{
        backgroundColor: '#2D1A12',
        color: '#EADCC9',
        padding: '8px 12px',
        border: '1px solid #7B5233',
        borderRadius: '8px',
        fontSize: '0.8rem',
        boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, color: '#FFFDF9' }}>{row.name}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '3px 0 0 0' }}>
          {p.dataKey === 'cumulative'
            ? `Tỷ lệ tích lũy: ${p.value}%`
            : `Giá trị: ${Number(p.value).toLocaleString('vi-VN')}${unit ? ` ${unit}` : ''}${
                row.percent !== undefined ? ` (${row.percent}%)` : ''
              }`}
        </p>
      ))}
    </div>
  );
};

const normalizeChartData = (rawData, chartType) => {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];
  const items = rawData
    .map((d) => ({
      name: String(d.name ?? d.label ?? '').trim(),
      value: Number(d.value ?? 0),
    }))
    .filter((d) => d.name && !Number.isNaN(d.value));

  if (chartType === 'pareto') {
    items.sort((a, b) => b.value - a.value);
  }

  const total = items.reduce((s, it) => s + it.value, 0);
  let running = 0;
  return items.map((it) => {
    running += it.value;
    return {
      ...it,
      percent: total > 0 ? Number(((it.value / total) * 100).toFixed(1)) : 0,
      cumulative: total > 0 ? Number(((running / total) * 100).toFixed(1)) : 0,
    };
  });
};

const ChatChartRenderer = ({ type = 'bar', title = 'Biểu đồ thống kê', subtitle = '', unit = '', data = [], highlights = null }) => {
  const [activeType, setActiveType] = useState(type || 'bar');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const chartCardRef = useRef(null);

  const normalized = normalizeChartData(data, activeType);
  if (normalized.length === 0) return null;

  const computedHighlights = highlights || (() => {
    const total = normalized.reduce((s, d) => s + d.value, 0);
    const sorted = [...normalized].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const top3Sum = sorted.slice(0, 3).reduce((s, d) => s + d.value, 0);
    return {
      total,
      top_name: top?.name || '',
      top_value: top?.value || 0,
      top_percent: total > 0 ? Number(((top.value / total) * 100).toFixed(1)) : 0,
      top3_percent: total > 0 ? Number(((top3Sum / total) * 100).toFixed(1)) : 0,
    };
  })();

  const handleDownloadPng = async () => {
    if (!chartCardRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartCardRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `smartflow_chart_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[ChatChartRenderer] Export PNG error:', err);
    } finally {
      setExporting(false);
    }
  };

  const renderChartBody = (heightPx) => {
    if (activeType === 'pareto') {
      return (
        <div style={{ width: '100%', height: heightPx }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={normalized} margin={{ top: 10, right: 12, left: -12, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 82, 51, 0.1)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#5D4037' }}
                angle={normalized.length > 5 ? -22 : 0}
                textAnchor={normalized.length > 5 ? 'end' : 'middle'}
                interval={0}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#5D4037' }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: '#A0301B' }} unit="%" />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
              <Bar yAxisId="left" dataKey="value" name={unit ? `Số lượng (${unit})` : 'Số lượng'} radius={[4, 4, 0, 0]}>
                {normalized.map((_, idx) => (
                  <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name="Tích lũy (%)"
                stroke="#A0301B"
                strokeWidth={2.2}
                dot={{ r: 3.5, fill: '#A0301B' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (activeType === 'horizontal_bar') {
      const dynamicHeight = Math.max(heightPx, normalized.length * 32 + 40);
      return (
        <div style={{ width: '100%', height: dynamicHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={normalized} layout="vertical" margin={{ top: 6, right: 20, left: 10, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 82, 51, 0.1)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#5D4037' }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#4E3629' }} />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Bar dataKey="value" name={unit || 'Giá trị'} radius={[0, 4, 4, 0]}>
                {normalized.map((_, idx) => (
                  <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (activeType === 'bar') {
      return (
        <div style={{ width: '100%', height: heightPx }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={normalized} margin={{ top: 10, right: 12, left: -12, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 82, 51, 0.1)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#5D4037' }}
                angle={normalized.length > 5 ? -20 : 0}
                textAnchor={normalized.length > 5 ? 'end' : 'middle'}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: '#5D4037' }} />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Bar dataKey="value" name={unit || 'Giá trị'} radius={[4, 4, 0, 0]}>
                {normalized.map((_, idx) => (
                  <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (activeType === 'line' || activeType === 'area') {
      const ChartComp = activeType === 'area' ? AreaChart : LineChart;
      return (
        <div style={{ width: '100%', height: heightPx }}>
          <ResponsiveContainer width="100%" height="100%">
            <ChartComp data={normalized} margin={{ top: 10, right: 14, left: -12, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 82, 51, 0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5D4037' }} />
              <YAxis tick={{ fontSize: 10, fill: '#5D4037' }} />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              {activeType === 'area' ? (
                <Area type="monotone" dataKey="value" name={unit || 'Giá trị'} stroke="#A0301B" fill="rgba(160, 48, 27, 0.18)" strokeWidth={2} />
              ) : (
                <Line type="monotone" dataKey="value" name={unit || 'Giá trị'} stroke="#A0301B" strokeWidth={2.2} dot={{ r: 3.5 }} />
              )}
            </ChartComp>
          </ResponsiveContainer>
        </div>
      );
    }

    if (activeType === 'pie') {
      return (
        <div style={{ width: '100%', height: heightPx + 30 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={normalized}
                cx="50%"
                cy="45%"
                innerRadius={isFullscreen ? 65 : 38}
                outerRadius={isFullscreen ? 125 : 74}
                paddingAngle={1.5}
                dataKey="value"
                stroke="#FFFDF9"
                strokeWidth={2}
              >
                {normalized.map((_, idx) => (
                  <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={7} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  const chartCard = (fullscreenMode = false) => (
    <div className={`chatbot-chart-card ${fullscreenMode ? 'is-fullscreen' : ''}`} ref={fullscreenMode ? null : chartCardRef}>
      <div className="chatbot-chart-header">
        <div>
          <h4 className="chatbot-chart-title">{title}</h4>
          {subtitle && <div className="chatbot-chart-subtitle">{subtitle}</div>}
        </div>
        <div className="chatbot-chart-toolbar" data-html2canvas-ignore="true">
          <button
            type="button"
            className={`chatbot-chart-tool-btn ${activeType === 'pareto' ? 'active' : ''}`}
            onClick={() => setActiveType('pareto')}
            title="Biểu đồ Pareto (80/20)"
          >
            <TrendingUp size={13} />
          </button>
          <button
            type="button"
            className={`chatbot-chart-tool-btn ${activeType === 'bar' ? 'active' : ''}`}
            onClick={() => setActiveType('bar')}
            title="Biểu đồ cột"
          >
            <BarChart3 size={13} />
          </button>
          <button
            type="button"
            className={`chatbot-chart-tool-btn ${activeType === 'horizontal_bar' ? 'active' : ''}`}
            onClick={() => setActiveType('horizontal_bar')}
            title="Biểu đồ cột ngang"
          >
            <AlignLeft size={13} />
          </button>
          <button
            type="button"
            className={`chatbot-chart-tool-btn ${activeType === 'pie' ? 'active' : ''}`}
            onClick={() => setActiveType('pie')}
            title="Biểu đồ tròn"
          >
            <PieIcon size={13} />
          </button>
          <button
            type="button"
            className="chatbot-chart-tool-btn"
            onClick={handleDownloadPng}
            disabled={exporting}
            title="Tải ảnh biểu đồ (PNG)"
          >
            <Download size={13} />
          </button>
          {!fullscreenMode ? (
            <button
              type="button"
              className="chatbot-chart-tool-btn"
              onClick={() => setIsFullscreen(true)}
              title="Phóng to biểu đồ"
            >
              <Maximize2 size={13} />
            </button>
          ) : (
            <button
              type="button"
              className="chatbot-chart-tool-btn"
              onClick={() => setIsFullscreen(false)}
              title="Đóng phóng to"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlights Strip */}
      <div className="chatbot-chart-kpi-strip">
        <span>
          Tổng: <strong>{Number(computedHighlights.total).toLocaleString('vi-VN')}{unit ? ` ${unit}` : ''}</strong>
        </span>
        {computedHighlights.top_name && (
          <span>
            Cao nhất: <strong>{computedHighlights.top_name}</strong> ({computedHighlights.top_percent}%)
          </span>
        )}
        {normalized.length >= 3 && (
          <span>
            Top 3 chiếm: <strong>{computedHighlights.top3_percent}%</strong>
          </span>
        )}
      </div>

      {renderChartBody(fullscreenMode ? 420 : 230)}
    </div>
  );

  return (
    <>
      {chartCard(false)}
      {isFullscreen && (
        <div className="chatbot-fullscreen-backdrop" onClick={() => setIsFullscreen(false)}>
          <div className="chatbot-fullscreen-dialog" onClick={(e) => e.stopPropagation()}>
            {chartCard(true)}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatChartRenderer;

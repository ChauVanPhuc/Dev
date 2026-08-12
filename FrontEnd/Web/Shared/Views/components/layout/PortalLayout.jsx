import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, ArrowLeft, Bell, Sparkles, Plus, Trash2, MessageSquare, Send, X, History, RotateCcw, Monitor } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import Sidebar from './Sidebar';
import BeautifulModal from '../feedback/BeautifulModal';
import ActivityFeed from '@modules/Dashboard/Views/components/ActivityFeed';
import { authService } from '@modules/Auth/Models/auth.service';
import { useScreen } from '@shared/context/ScreenContext';
import { claimService } from '@modules/Claim/services/claim.service';
import useUiStore from '@shared/store/uiStore';
import api, { API_URL } from '@webShared/Services/api.service';

const renderChartComponent = (type, title, data, key) => {
  if (!data || data.length === 0) return null;
  const colors = ['#A0301B', '#C85A43', '#7B5233', '#8D6E63', '#D97706', '#059669', '#3B82F6', '#6366F1'];

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#2D1A12',
          color: '#EADCC9',
          padding: '8px 12px',
          border: '1px solid #7B5233',
          borderRadius: '6px',
          fontSize: '0.8rem',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].payload.name}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ margin: '2px 0 0 0' }}>
              {p.name === 'cumulative' ? `Tỉ lệ tích lũy: ${p.value}%` : `Giá trị: ${p.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === 'pareto') {
    let sortedData = [...data].sort((a, b) => b.value - a.value);
    const totalSum = sortedData.reduce((sum, item) => sum + item.value, 0);
    let runningSum = 0;
    const paretoData = sortedData.map(item => {
      runningSum += item.value;
      const cumPercent = totalSum > 0 ? Math.round((runningSum / totalSum) * 100) : 0;
      return {
        name: item.name,
        value: item.value,
        cumulative: cumPercent
      };
    });

    return (
      <div key={key} style={{
        background: '#FFFFFF',
        border: '1px solid #EADCC9',
        borderRadius: '10px',
        padding: '12px',
        margin: '10px 0',
        boxShadow: '0 4px 12px rgba(45, 26, 18, 0.05)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#7B5233', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
          {title}
        </h4>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={paretoData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 82, 51, 0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7B5233' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#7B5233' }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 9, fill: '#A0301B' }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 9, paddingTop: 5 }} />
              <Bar yAxisId="left" dataKey="value" name="Số lượng lỗi" fill="#7B5233" radius={[4, 4, 0, 0]}>
                {paretoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Tỉ lệ tích lũy" stroke="#A0301B" strokeWidth={2} dot={{ r: 3, fill: '#A0301B' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div key={key} style={{
        background: '#FFFFFF',
        border: '1px solid #EADCC9',
        borderRadius: '10px',
        padding: '12px',
        margin: '10px 0',
        boxShadow: '0 4px 12px rgba(45, 26, 18, 0.05)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#7B5233', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
          {title}
        </h4>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 82, 51, 0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7B5233' }} />
              <YAxis tick={{ fontSize: 9, fill: '#7B5233' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Số lượng" fill="#7B5233" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div key={key} style={{
        background: '#FFFFFF',
        border: '1px solid #EADCC9',
        borderRadius: '10px',
        padding: '12px',
        margin: '10px 0',
        boxShadow: '0 4px 12px rgba(45, 26, 18, 0.05)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#7B5233', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
          {title}
        </h4>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(123, 82, 51, 0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7B5233' }} />
              <YAxis tick={{ fontSize: 9, fill: '#7B5233' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name="Giá trị" stroke="#A0301B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    const RADIAN = Math.PI / 180;

    const renderPremiumLabel = (props) => {
      const { cx, cy, midAngle, outerRadius, name, percent } = props;
      if (!name) return null;

      const radius = outerRadius + 18;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      const lineEnd = outerRadius + 8;
      const ex = cx + lineEnd * Math.cos(-midAngle * RADIAN);
      const ey = cy + lineEnd * Math.sin(-midAngle * RADIAN);

      const anchor = x > cx ? 'start' : 'end';
      const pctText = `${(percent * 100).toFixed(0)}%`;
      const displayName = name.length > 16 ? name.substring(0, 14) + '…' : name;

      return (
        <g>
          <line x1={ex} y1={ey} x2={x} y2={y} stroke="#BCAAA4" strokeWidth={0.8} />
          <circle cx={x} cy={y} r={1.5} fill="#8D6E63" />
          <text x={x + (x > cx ? 4 : -4)} y={y - 2} textAnchor={anchor} fill="#5D4037" fontSize={9} fontWeight={600}>
            {displayName}
          </text>
          <text x={x + (x > cx ? 4 : -4)} y={y + 9} textAnchor={anchor} fill="#A0301B" fontSize={8} fontWeight={700}>
            {pctText}
          </text>
        </g>
      );
    };

    return (
      <div key={key} style={{
        background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8F0 100%)',
        border: '1px solid #EADCC9',
        borderRadius: '12px',
        padding: '16px 12px',
        margin: '10px 0',
        boxShadow: '0 4px 16px rgba(45, 26, 18, 0.08)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h4 style={{ margin: '0 0 4px 0', color: '#6F4E37', fontSize: '0.88rem', fontWeight: '700', textAlign: 'center', letterSpacing: '0.02em' }}>
          {title}
        </h4>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={40}
                outerRadius={75}
                paddingAngle={1.5}
                labelLine={false}
                label={renderPremiumLabel}
                dataKey="value"
                stroke="#FFFDF9"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 8, paddingTop: 8, lineHeight: '16px' }}
                iconType="circle"
                iconSize={6}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
};

const renderMessageText = (text) => {
  if (!text) return null;

  const chartRegex = /<chart\s+type="([^"]+)"\s+title="([^"]+)"\s*>([\s\S]*?)<\/chart>/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = chartRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    const chartType = match[1];
    const chartTitle = match[2];
    const chartDataRaw = match[3];
    let chartData = [];
    try {
      chartData = JSON.parse(chartDataRaw.trim());
    } catch (e) {
      console.error("Failed to parse chart JSON:", e);
    }

    parts.push({
      type: 'chart',
      chartType,
      chartTitle,
      data: chartData
    });

    lastIndex = chartRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  return (
    <div>
      {parts.map((part, index) => {
        if (part.type === 'chart') {
          return renderChartComponent(part.chartType, part.chartTitle, part.data, index);
        } else {
          const hasHtml = part.content.includes('<table') || part.content.includes('<img') || part.content.includes('<div') || part.content.includes('<p');
          if (hasHtml) {
            return <div key={index} dangerouslySetInnerHTML={{ __html: part.content }} />;
          } else {
            const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            if (mdImageRegex.test(part.content)) {
              const subparts = [];
              let subLastIndex = 0;
              let subMatch;
              mdImageRegex.lastIndex = 0;

              while ((subMatch = mdImageRegex.exec(part.content)) !== null) {
                if (subMatch.index > subLastIndex) {
                  subparts.push(part.content.substring(subLastIndex, subMatch.index));
                }
                const alt = subMatch[1];
                const src = subMatch[2];
                subparts.push(
                  <div key={`img-${subMatch.index}`} className="chat-rendered-image-container" style={{ margin: '12px 0' }}>
                    <img
                      src={src}
                      alt={alt}
                      style={{
                        maxWidth: '100%',
                        borderRadius: '10px',
                        border: '1px solid rgba(160, 48, 27, 0.15)',
                        boxShadow: '0 6px 16px rgba(45, 26, 18, 0.12)',
                        display: 'block'
                      }}
                    />
                    {alt && <div style={{ fontSize: '0.76rem', color: '#8D6E63', textAlign: 'center', marginTop: '6px', fontStyle: 'italic' }}>{alt}</div>}
                  </div>
                );
                subLastIndex = mdImageRegex.lastIndex;
              }
              if (subLastIndex < part.content.length) {
                subparts.push(part.content.substring(subLastIndex));
              }
              return (
                <div key={index}>
                  {subparts.map((sp, spIdx) => {
                    if (typeof sp === 'string') {
                      return sp.split('\n').map((line, lIdx) => (
                        <div key={lIdx} style={{ marginBottom: line.trim() === '' ? '6px' : '2px' }}>{line}</div>
                      ));
                    }
                    return sp;
                  })}
                </div>
              );
            }

            return (
              <div key={index}>
                {part.content.split('\n').map((line, lIdx, arr) => (
                  <div key={lIdx} style={{ marginBottom: lIdx === arr.length - 1 ? '0px' : (line.trim() === '' ? '6px' : '2px') }}>{line}</div>
                ))}
              </div>
            );
          }
        }
      })}
    </div>
  );
};

/**
 * Layout: Khung bao quát chung (PortalLayout) cho cả hai module Admin và Manufacture.
 * Cung cấp Sidebar động, Header, Hộp thoại thông báo BeautifulModal, 
 * và tích hợp cơ chế Tải lên ngầm (Global Upload) cho Manufacture.
 */
const PortalLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getScreenInfo } = useScreen();
  const isAdmin = location.pathname.startsWith('/admin');
  const isFormOrEditView =
    location.pathname.includes('/edit') ||
    location.pathname.includes('/create') ||
    location.pathname.includes('/new') ||
    location.pathname.includes('/permission') ||
    location.pathname.includes('/detail') ||
    location.pathname.includes('/profile') ||
    location.pathname.includes('/sidebar') ||
    location.pathname.includes('/system-config') ||
    /^\/admin\/screens\/[0-9]+/.test(location.pathname) ||
    /^\/admin\/purchase-requisitions\/[^\/]+/.test(location.pathname) ||
    /^\/admin\/products\/[^\/]+/.test(location.pathname) ||
    /^\/admin\/orders\/[^\/]+/.test(location.pathname) ||
    /^\/admin\/plan\/[^\/]+/.test(location.pathname) ||
    /^\/admin\/production-orders\/[^\/]+/.test(location.pathname) ||
    /^\/admin\/quality-records\/[^\/]+/.test(location.pathname) ||
    /^\/admin\/equipment\/detail\/[^\/]+/.test(location.pathname) ||
    /^\/admin\/machines\/detail\/[^\/]+/.test(location.pathname) ||
    location.search.includes('mode=');

  const [sidebarActive, setSidebarActive] = useState(false);

  const handleBackClick = () => {
    if (typeof window.hasUnsavedChangesScreenDetail === 'function' && window.hasUnsavedChangesScreenDetail()) {
      if (typeof window.triggerScreenDetailUnsavedChangesModal === 'function') {
        window.triggerScreenDetailUnsavedChangesModal();
        return;
      }
    }
    navigate(-1);
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const [customTitle, setCustomTitle] = useState(null);
  const [customSubtitle, setCustomSubtitle] = useState(null);
  const [customScreenCode, setCustomScreenCode] = useState(null);
  const [headerExtra, setHeaderExtra] = useState(null);
  const [modalConfig, setModalConfig] = useState({ visible: false, title: '', message: '', type: 'info' });
  const [uploads, setUploads] = useState([]);
  const notificationRef = useRef(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('smartflow_sidebar_collapsed') === 'true';
  });

  const [layoutMode, setLayoutMode] = useState(() => {
    return localStorage.getItem('smartflow_layout_mode') || 'responsive';
  });
  const [scaleFactor, setScaleFactor] = useState(1);

  const toggleLayoutMode = () => {
    setLayoutMode(prev => {
      const next = prev === 'responsive' ? 'fit-to-screen' : 'responsive';
      localStorage.setItem('smartflow_layout_mode', next);
      return next;
    });
  };

  useEffect(() => {
    if (layoutMode !== 'fit-to-screen') {
      setScaleFactor(1);
      return;
    }
    const handleResize = () => {
      const standardWidth = 1920;
      const currentWidth = window.innerWidth;
      // Tránh scale trên các màn hình quá nhỏ như di động
      if (currentWidth < 993) {
        setScaleFactor(1);
        return;
      }
      setScaleFactor(currentWidth / standardWidth);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [layoutMode]);

  useEffect(() => {
    const token = authService.getToken();
    const isLoggedIn = token && token !== 'null' && token !== 'undefined' && token !== '';
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (layoutMode === 'fit-to-screen') {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [layoutMode]);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('smartflow_sidebar_collapsed', String(next));
      return next;
    });
  };

  // --- CHATBOT SYSTEM STATES ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatInputRef = useRef(null);
  const [chatContext, setChatContext] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('default');
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);

  // --- CLAIM PDF INGESTION STATES (GLOBAL BACKGROUND - ZUSTAND) ---
  const claimIngestionProgress = useUiStore(state => state.claimIngestionProgress);
  const claimSuccessSummary = useUiStore(state => state.claimSuccessSummary);
  const claimImportError = useUiStore(state => state.claimImportError);
  const setClaimIngestionProgress = useUiStore(state => state.setClaimIngestionProgress);
  const setClaimSuccessSummary = useUiStore(state => state.setClaimSuccessSummary);
  const setClaimImportError = useUiStore(state => state.setClaimImportError);

  useEffect(() => {
    const handleClaimPdfImportError = (e) => {
      setClaimImportError({
        isOpen: true,
        message: e.detail?.message || 'Lỗi không xác định.'
      });
    };

    const handleClaimPdfImport = async (e) => {
      const { files, isMultiple } = e.detail;
      if (!files || files.length === 0) return;

      if (!isMultiple) {
        // Single file
        const file = files[0];
        setClaimIngestionProgress({
          isOpen: true,
          title: 'Đang xử lý PDF...',
          progress: 10,
          statusText: 'Đang đọc cấu trúc tệp tin PDF...',
          filesCount: 1
        });

        let progressVal = 10;
        const progressInterval = setInterval(() => {
          progressVal += 5;
          if (progressVal > 95) {
            clearInterval(progressInterval);
          } else {
            let statusText = 'Đang đọc cấu trúc tệp tin PDF...';
            if (progressVal > 30 && progressVal <= 60) {
              statusText = 'Đang phân tích và trích xuất dữ liệu khiếu nại...';
            } else if (progressVal > 60 && progressVal <= 85) {
              statusText = 'Đang định vị và liên kết hình ảnh lỗi...';
            } else if (progressVal > 85) {
              statusText = 'Đang lưu trữ dữ liệu...';
            }
            setClaimIngestionProgress(prev => ({
              ...prev,
              progress: progressVal,
              statusText
            }));
          }
        }, 150);

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await claimService.importPdf(formData);
          clearInterval(progressInterval);

          const mechanismName = response.mechanism ? response.mechanism.name : 'Cơ chế 1 (Standard)';
          setClaimIngestionProgress(prev => ({
            ...prev,
            progress: 100,
            statusText: `Thành công! Đã xử lý bằng ${mechanismName}`
          }));

          setTimeout(() => {
            setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }));

            if (response.success && response.total_records > 0) {
              setClaimSuccessSummary({
                isOpen: true,
                batchId: response.batch_id,
                claimsCount: response.db_saved_count || response.total_records,
                photoCount: 0,
                warningsCount: response.parse_warnings ? response.parse_warnings.length : 0,
                warnings: response.parse_warnings || [],
                fileStats: response.file_stats || []
              });
              window.dispatchEvent(new CustomEvent('pdf-import-success-refresh', { detail: response }));
            } else if (response.success && response.total_records === 0) {
              setClaimImportError({
                isOpen: true,
                message: 'Không tìm thấy dữ liệu khiếu nại nào trong file PDF.'
              });
            } else {
              setClaimImportError({
                isOpen: true,
                message: 'Định dạng phản hồi không hợp lệ từ máy chủ.'
              });
            }
          }, 1000);

        } catch (error) {
          clearInterval(progressInterval);
          setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }));
          const errorMsg = error.response?.data?.detail || error.message || 'Lỗi kết nối máy chủ.';
          setClaimImportError({
            isOpen: true,
            message: errorMsg
          });
        }
      } else {
        // Multiple files
        setClaimIngestionProgress({
          isOpen: true,
          title: `Đang xử lý ${files.length} file PDF...`,
          progress: 5,
          statusText: `Đã phát hiện ${files.length} file PDF. Đang tải lên...`,
          filesCount: files.length
        });

        const formData = new FormData();
        files.forEach(f => {
          formData.append('files', f);
        });

        try {
          const response = await claimService.importFolderStream(formData, (event) => {
            if (event.type === 'start') {
              setClaimIngestionProgress(prev => ({
                ...prev,
                progress: 8,
                statusText: `Bắt đầu xử lý ${event.total_files} file PDF...`
              }));
            } else if (event.type === 'progress') {
              const percent = Math.min(event.percent || 0, 98);
              let statusText = '';
              if (event.status === 'processing') {
                statusText = `Đang phân tích: ${event.filename} (${event.file_index}/${event.total_files})`;
              } else if (event.status === 'done') {
                const mechanismLabel = event.mechanism ? ` [${event.mechanism.name}]` : '';
                statusText = `✓ Hoàn tất: ${event.filename}${mechanismLabel} — ${event.claims_found || 0} khiếu nại (${event.file_index}/${event.total_files})`;
              } else if (event.status === 'error') {
                statusText = `⚠ Lỗi file: ${event.filename} (${event.file_index}/${event.total_files})`;
              }
              setClaimIngestionProgress(prev => ({
                ...prev,
                progress: percent,
                statusText
              }));
            }
          });

          setClaimIngestionProgress(prev => ({
            ...prev,
            progress: 100,
            statusText: 'Hoàn tất!'
          }));

          setTimeout(() => {
            setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }));

            if (response.success && response.total_records > 0) {
              setClaimSuccessSummary({
                isOpen: true,
                batchId: response.batch_id,
                claimsCount: response.db_saved_count || response.total_records,
                photoCount: 0,
                warningsCount: response.parse_warnings ? response.parse_warnings.length : 0,
                warnings: response.parse_warnings || [],
                fileStats: response.file_stats || []
              });
              window.dispatchEvent(new CustomEvent('pdf-import-success-refresh', { detail: response }));
            } else if (response.success && response.total_records === 0) {
              setClaimImportError({
                isOpen: true,
                message: 'Không tìm thấy dữ liệu khiếu nại nào trong các file PDF đã chọn.'
              });
            } else {
              setClaimImportError({
                isOpen: true,
                message: 'Định dạng phản hồi không hợp lệ từ máy chủ hoặc thư mục rỗng.'
              });
            }
          }, 1000);

        } catch (streamError) {
          console.warn('Streaming endpoint failed, falling back to standard folder import...');
          setClaimIngestionProgress(prev => ({
            ...prev,
            progress: 10,
            statusText: `Đang xử lý ${files.length} file PDF (chế độ tiêu chuẩn)...`
          }));

          const formData2 = new FormData();
          files.forEach(f => {
            formData2.append('files', f);
          });

          let progressVal = 10;
          const progressInterval = setInterval(() => {
            progressVal += 2;
            if (progressVal > 95) {
              clearInterval(progressInterval);
            } else {
              let statusText = 'Đang tải lên các tệp PDF...';
              if (progressVal > 25 && progressVal <= 60) {
                statusText = `Đang trích xuất dữ liệu khiếu nại từ ${files.length} tệp...`;
              } else if (progressVal > 60 && progressVal <= 80) {
                statusText = 'Đang cắt và liên kết hình ảnh lỗi...';
              } else if (progressVal > 80) {
                statusText = 'Đang hoàn tất lưu trữ dữ liệu...';
              }
              setClaimIngestionProgress(prev => ({
                ...prev,
                progress: progressVal,
                statusText
              }));
            }
          }, 200);

          try {
            const response = await claimService.importFolder(formData2);
            clearInterval(progressInterval);

            setClaimIngestionProgress(prev => ({
              ...prev,
              progress: 100,
              statusText: 'Hoàn tất!'
            }));

            setTimeout(() => {
              setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }));

              if (response.success && response.total_records > 0) {
                setClaimSuccessSummary({
                  isOpen: true,
                  batchId: response.batch_id,
                  claimsCount: response.db_saved_count || response.total_records,
                  photoCount: 0,
                  warningsCount: response.parse_warnings ? response.parse_warnings.length : 0,
                  warnings: response.parse_warnings || [],
                  fileStats: response.file_stats || []
                });
                window.dispatchEvent(new CustomEvent('pdf-import-success-refresh', { detail: response }));
              } else if (response.success && response.total_records === 0) {
                setClaimImportError({
                  isOpen: true,
                  message: 'Không tìm thấy dữ liệu khiếu nại nào trong các file PDF đã chọn.'
                });
              } else {
                setClaimImportError({
                  isOpen: true,
                  message: 'Định dạng phản hồi không hợp lệ từ máy chủ hoặc thư mục rỗng.'
                });
              }
            }, 1000);

          } catch (error) {
            clearInterval(progressInterval);
            setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }));
            const errorMsg = error.response?.data?.detail || error.message || 'Lỗi kết nối máy chủ.';
            setClaimImportError({
              isOpen: true,
              message: errorMsg
            });
          }
        }
      }
    };

    window.addEventListener('start-claim-pdf-import', handleClaimPdfImport);
    window.addEventListener('start-claim-pdf-import-error', handleClaimPdfImportError);
    return () => {
      window.removeEventListener('start-claim-pdf-import', handleClaimPdfImport);
      window.removeEventListener('start-claim-pdf-import-error', handleClaimPdfImportError);
    };
  }, []);

  const chatMessagesEndRef = useRef(null);
  const chatbotDrawerRef = useRef(null);

  // Floating button dragging states (default: right 24px, bottom 100px - which is higher up)
  const [btnPosition, setBtnPosition] = useState({ right: 24, bottom: 100 });
  const isDraggingRef = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ right: 24, bottom: 100 });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    isDraggingRef.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...btnPosition };

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragStart.current.x;
      const dy = moveEvent.clientY - dragStart.current.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDraggingRef.current = true;
      }

      const newRight = Math.max(10, Math.min(window.innerWidth - 66, positionStart.current.right - dx));
      const newBottom = Math.max(10, Math.min(window.innerHeight - 66, positionStart.current.bottom - dy));

      setBtnPosition({ right: newRight, bottom: newBottom });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    isDraggingRef.current = false;
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    positionStart.current = { ...btnPosition };

    const handleTouchMove = (moveEvent) => {
      const touchMove = moveEvent.touches[0];
      const dx = touchMove.clientX - dragStart.current.x;
      const dy = touchMove.clientY - dragStart.current.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDraggingRef.current = true;
      }

      const newRight = Math.max(10, Math.min(window.innerWidth - 66, positionStart.current.right - dx));
      const newBottom = Math.max(10, Math.min(window.innerHeight - 66, positionStart.current.bottom - dy));

      setBtnPosition({ right: newRight, bottom: newBottom });
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleButtonClick = (e) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsChatOpen(prev => !prev);
  };

  // Chat panel resizing states (default: width 500px, height 750px)
  const [panelSize, setPanelSize] = useState(() => {
    try {
      const saved = localStorage.getItem('smartflow_chatbot_panel_size');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved chatbot size:', e);
    }
    return { width: 500, height: 750 };
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0 });
  const sizeStart = useRef({ width: 500, height: 750 });

  useEffect(() => {
    try {
      localStorage.setItem('smartflow_chatbot_panel_size', JSON.stringify(panelSize));
    } catch (e) {
      console.error('Failed to save chatbot size:', e);
    }
  }, [panelSize]);

  const handleResizeMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    resizeStart.current = { x: e.clientX, y: e.clientY };
    sizeStart.current = { ...panelSize };

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - resizeStart.current.x;
      const dy = moveEvent.clientY - resizeStart.current.y;

      // Dragging top-left corner: moving left (dx < 0) increases width, moving up (dy < 0) increases height
      const newWidth = Math.max(320, Math.min(window.innerWidth - 48, sizeStart.current.width - dx));
      const newHeight = Math.max(400, Math.min(window.innerHeight - 48, sizeStart.current.height - dy));

      setPanelSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeTouchStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);

    const touch = e.touches[0];
    resizeStart.current = { x: touch.clientX, y: touch.clientY };
    sizeStart.current = { ...panelSize };

    const handleTouchMove = (moveEvent) => {
      const touchMove = moveEvent.touches[0];
      const dx = touchMove.clientX - resizeStart.current.x;
      const dy = touchMove.clientY - resizeStart.current.y;

      const newWidth = Math.max(320, Math.min(window.innerWidth - 48, sizeStart.current.width - dx));
      const newHeight = Math.max(400, Math.min(window.innerHeight - 48, sizeStart.current.height - dy));

      setPanelSize({ width: newWidth, height: newHeight });
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handlePanelHeaderMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    if (e.target.closest('button')) return; // Ignore buttons

    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...btnPosition };

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragStart.current.x;
      const dy = moveEvent.clientY - dragStart.current.y;

      const newRight = Math.max(10, Math.min(window.innerWidth - 100, positionStart.current.right - dx));
      const newBottom = Math.max(10, Math.min(window.innerHeight - 100, positionStart.current.bottom - dy));

      setBtnPosition({ right: newRight, bottom: newBottom });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handlePanelHeaderTouchStart = (e) => {
    if (e.target.closest('button')) return;

    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    positionStart.current = { ...btnPosition };

    const handleTouchMove = (moveEvent) => {
      const touchMove = moveEvent.touches[0];
      const dx = touchMove.clientX - dragStart.current.x;
      const dy = touchMove.clientY - dragStart.current.y;

      const newRight = Math.max(10, Math.min(window.innerWidth - 100, positionStart.current.right - dx));
      const newBottom = Math.max(10, Math.min(window.innerHeight - 100, positionStart.current.bottom - dy));

      setBtnPosition({ right: newRight, bottom: newBottom });
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Handle query parameter ?chat=true to auto-open chatbot
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('chat') === 'true') {
      setIsChatOpen(true);
      const cleanSearch = location.search.replace(/[?&]chat=true/, '').replace(/^\?$/, '');
      navigate({ pathname: location.pathname, search: cleanSearch }, { replace: true });
    }
  }, [location.search]);

  // Dynamic welcome suggestions depending on location.pathname
  const getDefaultSuggestions = (pathname) => {
    if (pathname.includes('/admin/prices')) {
      return [
        'Bảng giá tủ đền bù ở đâu?',
        'Tủ nào đền bù đắt nhất?',
        'Báo giá chất liệu WOA',
        'So sánh giá tủ MFC và MDF'
      ];
    } else if (pathname.includes('/manufacture')) {
      return [
        'Kế hoạch sản xuất tháng này',
        'Đơn hàng nào đang sản xuất?',
        'Tỷ lệ QC đạt bao nhiêu?',
        'Danh sách lỗi gỗ tại xưởng'
      ];
    } else {
      return [
        'Tháng 2 có bao nhiêu claim?',
        'Cabinet 12 bị lỗi gì?',
        'Claim nào bị Full BC?',
        'SKU nào bị claim nhiều nhất?',
        'Có claim nào thiếu ảnh lỗi không?'
      ];
    }
  };

  const getWelcomeMessage = (pathname) => {
    const sugs = getDefaultSuggestions(pathname);
    return {
      role: 'bot',
      text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay? Tôi có thể tra cứu khiếu nại (claims), sản xuất, bàn giao, QC và KPI.',
      suggestions: sugs,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Auto-scroll chatbot window to bottom
  useEffect(() => {
    if (isChatOpen && chatMessagesEndRef.current) {
      const timer = setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, isChatLoading, isChatOpen]);

  // Click outside chatbot drawer to close it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        chatbotDrawerRef.current &&
        !chatbotDrawerRef.current.contains(e.target) &&
        !e.target.closest('.chatbot-ai-emoji-btn')
      ) {
        setIsChatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all chat sessions
  const loadSessions = async () => {
    try {
      const res = await claimService.getChatSessions();
      if (res && res.sessions) {
        setSessions(res.sessions);
      }
    } catch (err) {
      console.error('Không thể tải danh sách phiên chat:', err);
    }
  };

  // Fetch chat history for selected session
  const loadHistory = async (sessionId) => {
    setIsChatLoading(true);
    try {
      const history = await claimService.getClaimChatHistory(sessionId);
      if (history && history.length > 0) {
        const formattedMessages = history.map(h => ({
          role: h.role === 'user' ? 'user' : 'bot',
          text: h.content,
          items: h.items || [],
          suggestions: h.suggestions || [],
          time: h.created_at
            ? new Date(h.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }));
        setChatMessages(formattedMessages);
      } else {
        setChatMessages([getWelcomeMessage(location.pathname)]);
      }
    } catch (err) {
      console.error('Không thể tải lịch sử chat:', err);
      setChatMessages([getWelcomeMessage(location.pathname)]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Load history and sessions list when chat opens or session switches
  useEffect(() => {
    if (isChatOpen) {
      loadSessions();
      loadHistory(currentSessionId);
    }
  }, [isChatOpen, currentSessionId]);

  // Handle switching session
  const handleSwitchSession = (sessionId) => {
    setCurrentSessionId(sessionId);
    setShowSessionsPanel(false);
  };

  // Handle creating new session
  const handleCreateSession = () => {
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    setCurrentSessionId(newSessionId);
    setChatMessages([getWelcomeMessage(location.pathname)]);
    setChatContext({});
    setShowSessionsPanel(false);
  };

  // Handle deleting session
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await claimService.deleteChatSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId('default');
      }
      loadSessions();
    } catch (err) {
      console.error('Lỗi khi xóa phiên chat:', err);
    }
  };

  // Handle clear chat history
  const handleClearChat = async () => {
    try {
      await claimService.clearClaimChatHistory(currentSessionId);
    } catch (err) {
      console.error('Lỗi khi xóa lịch sử chat:', err);
    }
    setChatMessages([getWelcomeMessage(location.pathname)]);
    setChatContext({});
  };

  // Handle sending chat message
  const handleSendChatMessage = async (textToSend) => {
    const text = textToSend || (chatInputRef.current ? chatInputRef.current.value : '');
    if (!text || !text.trim()) return;

    if (chatInputRef.current) chatInputRef.current.value = '';

    const userMsg = {
      role: 'user',
      text: text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const historyToSend = chatMessages
        .filter(m => m.role === 'user' || m.role === 'bot')
        .slice(-6)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: (m.text || '').slice(0, 300)
        }));

      const contextWithPage = {
        ...chatContext,
        current_page: location.pathname
      };

      const response = await claimService.sendClaimChatMessage(text, contextWithPage, historyToSend, currentSessionId);

      if (response.context) {
        setChatContext(response.context);
      }

      const botMsg = {
        role: 'bot',
        text: response.answer || 'Không nhận được câu trả lời từ máy chủ.',
        items: response.items || [],
        suggestions: response.suggestions || [],
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, botMsg]);
      loadSessions();
    } catch (err) {
      console.error('Lỗi khi chat với Assistant:', err);
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
      const isNetwork = err.message && err.message.toLowerCase().includes('network');
      let errorText = 'Không thể kết nối máy chủ.';
      if (isTimeout) {
        errorText = 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.';
      } else if (isNetwork) {
        errorText = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
      } else if (err.response?.data?.detail) {
        errorText = err.response.data.detail;
      }
      const errorMsg = {
        role: 'bot',
        text: errorText,
        suggestions: ['Thử lại'],
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleViewPhoto = (item) => {
    if (location.pathname === '/admin/claims') {
      const event = new CustomEvent('claim-chat-view-photo', { detail: item });
      window.dispatchEvent(event);
    } else {
      sessionStorage.setItem('pending-chat-detail-item', JSON.stringify(item));
      navigate('/admin/claims');
    }
  };

  const handleDeleteMessage = (idx) => {
    setChatMessages(prev => prev.filter((_, i) => i !== idx));
  };


  // --- OUTSIDE CLICK FOR NOTIFICATIONS ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // --- MODAL DIALOG DISPLAY ---
  const showModal = (title, message, type = 'info') => {
    setModalConfig({ visible: true, title, message, type });
  };

  // --- GLOBAL MULTI-UPLOAD STATE HANDLERS ---
  const updateUpload = (id, delta) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...delta } : u));
  };

  const removeUpload = (id) => {
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.id !== id));
    }, 5000);
  };

  const startGlobalUpload = async (file, endpoint, onComplete) => {
    const uploadId = Date.now().toString();
    const newUpload = {
      id: uploadId,
      active: true,
      progress: 0,
      processed: 0,
      total: 0,
      fileName: file.name,
      status: 'uploading'
    };

    setUploads(prev => [...prev, newUpload]);
    await new Promise(r => setTimeout(r, 100));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const authHeaders = { 'ngrok-skip-browser-warning': 'true' };
      if (token && token !== 'null' && token !== 'undefined') {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}${endpoint.replace(/^\/+/, '')}`, {
        method: 'POST',
        body: formData,
        headers: authHeaders
      });

      if (!response.ok) throw new Error('Lỗi kết nối server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialLine = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value || new Uint8Array(), { stream: true });
        const lines = (partialLine + chunk).split('\n');
        partialLine = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.total !== undefined) updateUpload(uploadId, { total: data.total });
            if (data.processed !== undefined) {
              updateUpload(uploadId, { processed: data.processed });
              setUploads(prev => prev.map(u => {
                if (u.id === uploadId) {
                  const p = Math.round((data.processed / (u.total || 1)) * 100);
                  return { ...u, progress: p > 100 ? 100 : p };
                }
                return u;
              }));
            }
            if (data.status === 'error') {
              updateUpload(uploadId, { status: 'error' });
              showModal("Lỗi", data.message || `Lỗi khi xử lý file ${file.name}`, "error");
              removeUpload(uploadId);
              return;
            }
            if (data.status === 'completed') {
              updateUpload(uploadId, { status: 'completed', progress: 100 });
              showModal("Thành công", `Đã xử lý xong file ${file.name}`, "success");
              if (onComplete) onComplete(data);
              removeUpload(uploadId);
              return;
            }
          } catch (e) { }
        }
      }
      throw new Error('Kết nối bị đóng đột ngột trước khi nhận được trạng thái hoàn thành.');
    } catch (error) {
      console.error("Lỗi upload ngầm:", error);
      updateUpload(uploadId, { status: 'error' });
      showModal("Lỗi", `Không thể upload file ${file.name}`, "error");
      removeUpload(uploadId);
    }
  };

  // --- MEMOIZE CONTEXT TO PREVENT UNNECESSARY CHILD RE-RENDERS ---
  const outletContext = React.useMemo(() => ({
    setCustomTitle,
    setCustomSubtitle,
    setCustomScreenCode,
    setHeaderExtra,
    showModal,
    startGlobalUpload,
    activeUploads: uploads.length
  }), [uploads.length]); // Only update when upload count changes, setters are stable

  // --- PREVIEW MODE HANDLER ---
  const queryParams = new URLSearchParams(location.search);
  const isPreview = queryParams.get('preview') === 'true';

  if (isPreview) {
    return (
      <div className="preview-mode-layout" style={{ background: '#FAF6F0', minHeight: '100vh', padding: '15px' }}>
        <Outlet context={{
          setCustomTitle: () => { },
          setCustomSubtitle: () => { },
          setCustomScreenCode: () => { },
          setHeaderExtra: () => { },
          showModal,
          startGlobalUpload: () => { },
          activeUploads: 0
        }} />
      </div>
    );
  }

  // --- DYNAMIC HEADER TITLE MANAGEMENT ---
  const getPageTitles = () => {
    if (customTitle) {
      return {
        screenCode: customScreenCode || '',
        title: customTitle,
        subtitle: customSubtitle || (isAdmin ? 'ERP G7 Admin' : 'ERP G7 Manufacture')
      };
    }
    return getScreenInfo(location.pathname);
  };

  const { screenCode, title, subtitle } = getPageTitles();

  // Reset custom headers on transition
  useEffect(() => {
    setCustomTitle(null);
    setCustomSubtitle(null);
    setCustomScreenCode(null);
    setHeaderExtra(null);
  }, [location.pathname]);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const showBackButton = pathSegments.length >= 3 || location.pathname.includes('/product-details') || location.pathname.includes('/paint-colors');

  return (
    <div
      className={`admin-layout ${layoutMode === 'fit-to-screen' ? 'fit-to-screen-active' : ''}`}
      style={layoutMode === 'fit-to-screen' ? {
        transform: `scale(${scaleFactor})`,
        transformOrigin: 'top left',
        width: `${100 / scaleFactor}%`,
        maxWidth: 'none',
        height: `${100 / scaleFactor}vh`,
        minHeight: `${100 / scaleFactor}vh`,
        '--scale-factor': scaleFactor
      } : {}}
    >
      {/* Backdrop for Mobile Sidebar */}
      {sidebarActive && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarActive(false)}
        ></div>
      )}

      {/* Unified State-Aware Sidebar */}
      <Sidebar
        active={sidebarActive}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onLogout={handleLogout}
        onClose={() => setSidebarActive(false)}
        uploads={uploads}
      />

      {/* Main Content Pane */}
      <div className={`admin-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header Section */}
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="header-left">
              <button
                className="toggle-sidebar-btn"
                onClick={() => {
                  if (window.innerWidth >= 993) {
                    toggleSidebarCollapse();
                  } else {
                    setSidebarActive(!sidebarActive);
                  }
                }}
              >
                <Menu size={20} />
              </button>
              <div className="header-titles">
                <h2 className="header-page-title">{title}</h2>
                <p className="header-page-subtitle">
                  {screenCode && !subtitle?.startsWith(screenCode) && <span>{screenCode} - </span>}
                  {subtitle}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {headerExtra && <div className="header-extra-content">{headerExtra}</div>}

              {/* Back button logic */}
              {showBackButton && (
                <button
                  onClick={handleBackClick}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #7B5233',
                    color: '#7B5233',
                    padding: '7px 18px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(123, 82, 51, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#7B5233';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#7B5233';
                  }}
                >
                  <ArrowLeft size={16} /> Quay lại
                </button>
              )}

              {/* Layout Mode Settings Toggle Button */}
              <button
                className="header-layout-toggle-btn"
                onClick={toggleLayoutMode}
                title={layoutMode === 'responsive' ? "Chuyển sang chế độ Vừa màn hình (Fit to Screen)" : "Chuyển sang chế độ Co giãn (Responsive)"}
                style={{
                  background: '#FAF6F0',
                  border: '1.5px solid #EADCC9',
                  color: '#7B5233',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(123, 82, 51, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7B5233';
                  e.currentTarget.style.backgroundColor = '#FAF6F0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#EADCC9';
                }}
              >
                <Monitor size={16} />
                <span className="layout-mode-text" style={{ display: 'inline' }}>
                  {layoutMode === 'responsive' ? 'Tự co giãn' : 'Vừa màn hình'}
                </span>
              </button>

              {/* Notification dropdown (Only for Admin dashboard/pages) */}
              {isAdmin && (
                <div className="header-notification-wrapper" ref={notificationRef}>
                  <button
                    className="header-notification-bell"
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{
                      background: '#FAF6F0',
                      border: '1px solid #EADCC9',
                      color: '#7B5233',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Bell size={20} />
                    <span className="bell-badge"></span>
                  </button>

                  {showNotifications && (
                    <div className="header-notifications-dropdown">
                      <ActivityFeed />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Core dynamic content template */}
        <div className={`dashboard-content ${isFormOrEditView ? 'allow-y-scroll' : ''}`}>
          <Outlet context={outletContext} />
        </div>
      </div>

      {/* FLOATING STEP-BY-STEP PROGRESS CARD (TOP-RIGHT) */}
      {claimIngestionProgress.isOpen && (
        <div className="compact-progress-pill-container" style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 2000,
          pointerEvents: 'auto'
        }}>
          {/* Minimized Pill */}
          <div
            className="compact-progress-pill"
            onClick={() => navigate('/admin/claims')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(45, 26, 18, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #EADCC9'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#A0301B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7B5233';
            }}
          >
            <svg style={{ color: '#FFFFFF', animation: 'spin 1.5s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"></circle>
            </svg>
            <span>Đang xử lý PDF ({claimIngestionProgress.progress}%)</span>
          </div>

          {/* Hover Details Panel */}
          <div className="floating-progress-details" style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(45, 26, 18, 0.15)',
            border: '1px solid #EADCC9',
            display: 'none',
            flexDirection: 'column',
            pointerEvents: 'auto'
          }}>
            <h2 style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#2D1A12',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0
            }}>
              <svg style={{ color: '#7B5233', animation: 'spin 1.5s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"></circle>
              </svg>
              {claimIngestionProgress.title}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
              <div className={`import-step-item ${claimIngestionProgress.progress >= 10 ? (claimIngestionProgress.progress > 30 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '0.95rem', width: '18px', display: 'inline-block' }}>
                  {claimIngestionProgress.progress > 30 ? '✓' : '●'}
                </span>
                <span>Đang đọc cấu trúc PDF...</span>
              </div>

              <div className={`import-step-item ${claimIngestionProgress.progress >= 30 ? (claimIngestionProgress.progress > 65 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '0.95rem', width: '18px', display: 'inline-block' }}>
                  {claimIngestionProgress.progress > 65 ? '✓' : '●'}
                </span>
                <span>Đang trích xuất dữ liệu khiếu nại...</span>
              </div>

              <div className={`import-step-item ${claimIngestionProgress.progress >= 65 ? (claimIngestionProgress.progress > 90 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '0.95rem', width: '18px', display: 'inline-block' }}>
                  {claimIngestionProgress.progress > 90 ? '✓' : '●'}
                </span>
                <span>Đang liên kết hình ảnh minh chứng...</span>
              </div>

              <div className={`import-step-item ${claimIngestionProgress.progress >= 90 ? (claimIngestionProgress.progress === 100 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '0.95rem', width: '18px', display: 'inline-block' }}>
                  {claimIngestionProgress.progress === 100 ? '✓' : '●'}
                </span>
                <span>Đang lưu trữ dữ liệu...</span>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-bar-bg" style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#E5E7EB',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div className="progress-bar-fill" style={{
                  width: `${claimIngestionProgress.progress}%`,
                  height: '100%',
                  backgroundColor: claimIngestionProgress.progress === 100 ? '#16A34A' : '#7B5233',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease, background-color 0.3s ease'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#8D6E63', marginTop: '6px', fontWeight: '600' }}>
                <span style={{ flex: 1, wordBreak: 'break-word', paddingRight: '12px' }}>{claimIngestionProgress.statusText}</span>
                <span style={{ flexShrink: 0 }}>{claimIngestionProgress.progress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL IMPORT SUCCESS DETAILS MODAL */}
      {claimSuccessSummary.isOpen && (
        <div className="filter-modal-backdrop" style={{ zIndex: 2600 }}>
          <div className="filter-modal" style={{ maxWidth: '960px', width: '90%', maxHeight: '85vh' }}>
            <div className="filter-modal-header" style={{ borderBottom: '1px solid #E5E7EB', padding: '16px 20px', backgroundColor: '#ECFDF5' }}>
              <div className="filter-modal-title-area">
                <h3 className="filter-modal-title" style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Import PDF thành công
                </h3>
              </div>
              <button className="filter-modal-close" onClick={() => setClaimSuccessSummary(prev => ({ ...prev, isOpen: false }))}>&times;</button>
            </div>

            <div className="filter-modal-body" style={{
              display: 'grid',
              gridTemplateColumns: claimSuccessSummary.warningsCount > 0 ? '240px 1fr 1fr' : '240px 1fr',
              gridTemplateRows: claimSuccessSummary.claimsCount === 0 ? 'auto 1fr' : '1fr',
              gap: '20px',
              padding: '20px',
              backgroundColor: '#FFFFFF',
              height: '450px',
              maxHeight: 'calc(85vh - 160px)',
              overflow: 'hidden'
            }}>
              {claimSuccessSummary.claimsCount === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  backgroundColor: '#FAF6F0',
                  border: '1px solid #7B5233',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#2D1A12',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  lineHeight: '1.5',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, color: '#7B5233' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>
                    <strong>Thông báo:</strong> File PDF này không có thêm dòng khiếu nại mới nào vì toàn bộ dữ liệu đã được nhập từ trước (hệ thống tự động bỏ qua để tránh ghi đè hoặc tạo dữ liệu trùng lặp).
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                <div style={{ backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '600' }}>Mã lô (Batch ID)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#2D1A12', marginTop: '2px', wordBreak: 'break-all' }}>{claimSuccessSummary.batchId}</div>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '600' }}>Số dòng đã trích xuất</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2D1A12', marginTop: '2px' }}>{claimSuccessSummary.claimsCount}</div>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '600' }}>Ảnh minh chứng đã khớp</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2D1A12', marginTop: '2px' }}>{claimSuccessSummary.photoCount}</div>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '600' }}>Số cảnh báo lỗi cấu trúc</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#DC2626', marginTop: '2px' }}>{claimSuccessSummary.warningsCount}</div>
                </div>
              </div>

              {claimSuccessSummary.fileStats && claimSuccessSummary.fileStats.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1E293B', flexShrink: 0 }}>
                    Danh sách file PDF đã xử lý ({claimSuccessSummary.fileStats.length} file - {claimSuccessSummary.claimsCount} dòng):
                  </span>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#334155',
                    lineHeight: '1.6'
                  }}>
                    {claimSuccessSummary.fileStats.map((file, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: index < claimSuccessSummary.fileStats.length - 1 ? '1px solid #F1F5F9' : 'none', padding: '6px 0', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={file.filename}>
                          📄 {file.filename.replace(/^[a-zA-Z0-9]+_[a-zA-Z0-9]+_/, '')}
                        </span>
                        {file.mechanism && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: file.mechanism.id === 1 ? '#DBEAFE' : '#E0E7FF',
                            color: file.mechanism.id === 1 ? '#1E40AF' : '#4338CA',
                            flexShrink: 0,
                            whiteSpace: 'nowrap'
                          }}>
                            {file.mechanism.name}
                          </span>
                        )}
                        <span style={{ color: '#0F172A', fontWeight: '600', flexShrink: 0 }}>
                          {file.claims_count} dòng ({file.period || 'N/A'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.8rem', color: '#64748B' }}>
                  Không có danh sách file
                </div>
              )}

              {claimSuccessSummary.warningsCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#EA580C', flexShrink: 0 }}>
                    Danh sách cảnh báo ({claimSuccessSummary.warningsCount}):
                  </span>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: '#FFF7ED',
                    border: '1px solid #FFEDD5',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#C2410C',
                    lineHeight: '1.4'
                  }}>
                    {claimSuccessSummary.warnings.map((warn, index) => (
                      <div key={index} style={{ marginBottom: '6px', borderBottom: index < claimSuccessSummary.warnings.length - 1 ? '1px solid #FFEDD5' : 'none', paddingBottom: '4px' }}>
                        • {warn}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="filter-modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', gap: '8px', justifyContent: 'flex-end', backgroundColor: '#F9FAFB' }}>
              <button
                type="button"
                className="btn-modal-apply"
                onClick={() => setClaimSuccessSummary(prev => ({ ...prev, isOpen: false }))}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL IMPORT ERROR MODAL */}
      {claimImportError.isOpen && (
        <div className="filter-modal-backdrop" style={{ zIndex: 2600 }}>
          <div className="filter-modal" style={{ maxWidth: '450px' }}>
            <div className="filter-modal-header" style={{ borderBottom: '1px solid #E5E7EB', padding: '14px 20px', backgroundColor: '#FEF2F2' }}>
              <div className="filter-modal-title-area">
                <h3 className="filter-modal-title" style={{ color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  Lỗi Nhập PDF
                </h3>
              </div>
              <button className="filter-modal-close" onClick={() => setClaimImportError(prev => ({ ...prev, isOpen: false }))}>&times;</button>
            </div>
            <div className="filter-modal-body" style={{ display: 'block', padding: '20px', fontSize: '0.85rem', color: '#1F2937', backgroundColor: '#FFFFFF', whiteSpace: 'pre-wrap' }}>
              {claimImportError.message}
            </div>
            <div className="filter-modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F9FAFB' }}>
              <button type="button" className="btn-modal-apply" style={{ backgroundColor: '#DC2626' }} onClick={() => setClaimImportError(prev => ({ ...prev, isOpen: false }))}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global alert modal */}
      {modalConfig.visible && (
        <BeautifulModal
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
        />
      )}

      {/* Floating Chatbot Button */}
      {!isChatOpen && (
        <button
          className="chatbot-ai-emoji-btn"
          style={{ right: `${btnPosition.right}px`, bottom: `${btnPosition.bottom}px`, touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleButtonClick}
          title="Trợ lý AI"
        >
          <Sparkles size={24} style={{ pointerEvents: 'none' }} />
        </button>
      )}

      {/* Claim AI Assistant Chatbot Panel */}
      {isChatOpen && (
        <div
          className="claim-chat-panel"
          ref={chatbotDrawerRef}
          style={{
            right: `${btnPosition.right}px`,
            bottom: `${btnPosition.bottom}px`,
            maxHeight: `calc(100vh - ${btnPosition.bottom + 30}px)`,
            height: `min(${panelSize.height}px, calc(100vh - ${btnPosition.bottom + 30}px))`,
            width: showSessionsPanel ? `min(${panelSize.width + 200}px, calc(100vw - 48px))` : `min(${panelSize.width}px, calc(100vw - 48px))`,
            transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Resize Handle at Top-Left */}
          <div
            className="chat-panel-resize-handle"
            onMouseDown={handleResizeMouseDown}
            onTouchStart={handleResizeTouchStart}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '16px',
              height: '16px',
              cursor: 'nwse-resize',
              zIndex: 1010,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Kéo thả để thay đổi kích thước"
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderLeft: '2px solid rgba(234, 220, 201, 0.4)',
              borderTop: '2px solid rgba(234, 220, 201, 0.4)',
              position: 'absolute',
              top: '4px',
              left: '4px'
            }} />
          </div>
          {/* Internal Sidebar showing thread sessions list */}
          {showSessionsPanel && (
            <div className="chat-sessions-sidebar">
              <div className="chat-sessions-sidebar-header">
                <h3>Cuộc hội thoại</h3>
                <button className="new-session-btn" onClick={handleCreateSession} title="Tạo cuộc hội thoại mới">
                  <Plus size={16} />
                </button>
              </div>
              <div className="chat-sessions-list">
                {sessions.map((s) => (
                  <div
                    key={s.session_id}
                    className={`session-item ${currentSessionId === s.session_id ? 'active' : ''}`}
                    onClick={() => handleSwitchSession(s.session_id)}
                  >
                    <MessageSquare size={14} className="session-icon" />
                    <span className="session-title" title={s.session_title || 'Cuộc hội thoại'}>
                      {s.session_title || 'Cuộc hội thoại'}
                    </span>
                    {s.session_id !== 'default' && (
                      <button
                        className="session-delete-btn"
                        onClick={(e) => handleDeleteSession(s.session_id, e)}
                        title="Xóa phiên"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="claim-chat-main-area">
            <div
              className="claim-chat-header"
              style={{ cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
              onMouseDown={handlePanelHeaderMouseDown}
              onTouchStart={handlePanelHeaderTouchStart}
            >
              <span className="claim-chat-title">
                <Sparkles size={18} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#EADCC9' }} />
                Trợ lý AI SmartFlow
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className={`claim-chat-header-btn ${showSessionsPanel ? 'active' : ''}`}
                  title="Danh sách cuộc hội thoại"
                  onClick={() => setShowSessionsPanel(prev => !prev)}
                >
                  <History size={15} />
                </button>
                <button
                  className="claim-chat-header-btn"
                  title="Đặt lại kích thước mặc định"
                  onClick={() => setPanelSize({ width: 500, height: 750 })}
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  className="claim-chat-header-btn"
                  title="Xóa lịch sử chat trong phiên"
                  onClick={handleClearChat}
                >
                  <Trash2 size={15} />
                </button>
                <button className="claim-chat-close" onClick={() => setIsChatOpen(false)}>✕</button>
              </div>
            </div>

            <div className="claim-chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="chat-message-row">
                  <div className={`chat-message-bubble ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}>
                    {renderMessageText(msg.text)}

                    {/* Suggestions */}
                    {msg.role === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="chat-suggestions-container">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button key={sIdx} className="chat-suggestion-chip" onClick={() => handleSendChatMessage(sug)}>
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Rich Claim Cards */}
                    {msg.items && msg.items.filter(item => item.cabinet_no || item.claim_code).length > 0 && (
                      <div className="chat-items-list">
                        {msg.items.filter(item => item.cabinet_no || item.claim_code).map((item, iIdx) => (
                          <div key={iIdx} className="chat-item-card">
                            <div className="chat-item-header">
                              <span>Cabinet #{item.cabinet_no || 'N/A'}</span>
                              <span>{item.period || ''}</span>
                            </div>
                            <div style={{ marginTop: '2px' }}><strong>SKU:</strong> {item.sku || 'N/A'}</div>
                            <div><strong>Lỗi:</strong> {item.defect_name || item.defect_code || 'N/A'} (G7: {item.company_error_code || 'N/A'})</div>
                            {(item.status || item.severity) && (
                              <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', marginTop: '4px', marginBottom: '2px' }}>
                                {item.status && (
                                  <span className={`status-badge status-${item.status === 'Mới' ? 'new' : item.status === 'Đang xử lý' ? 'processing' : 'resolved'}`}>
                                    {item.status}
                                  </span>
                                )}
                                {item.severity && (
                                  <span className={`severity-badge severity-${item.severity.toLowerCase()}`}>
                                    {item.severity}
                                  </span>
                                )}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <span><strong>Action:</strong> {item.action || item.penalty || 'N/A'}</span>
                              <span
                                className="chat-item-photo-link"
                                onClick={() => handleViewPhoto(item)}
                                title="Xem chi tiết khiếu nại"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '3px', verticalAlign: 'middle' }}>
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                Xem chi tiết
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="chat-message-time">{msg.time}</span>
                  </div>
                  {idx > 0 && (
                    <button
                      className="chat-msg-delete-btn"
                      title="Xóa tin nhắn này"
                      onClick={() => handleDeleteMessage(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div className="chat-loading-bubble">
                  <div className="chat-loading-dot"></div>
                  <div className="chat-loading-dot"></div>
                  <div className="chat-loading-dot"></div>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            <div className="claim-chat-input-area">
              <input
                type="text"
                className="claim-chat-input"
                placeholder="Hỏi bất kỳ điều gì..."
                ref={chatInputRef}
                defaultValue=""
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendChatMessage();
                }}
              />
              <button className="claim-chat-send-btn" onClick={() => handleSendChatMessage()} disabled={isChatLoading}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles for Portal Layout structure */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .admin-layout {
          display: flex;
          height: 100vh;
          max-height: 100vh;
          background-color: #FAFAFA;
          position: relative;
          max-width: 100vw;
          overflow: hidden;
        }
        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
        }
        .dashboard-content {
          flex: 1;
          min-height: 0;
          height: calc(100vh - 60px);
          overflow-y: hidden;
          background-color: #F8FAFC;
          display: flex;
          flex-direction: column;
        }
        .dashboard-content.allow-y-scroll {
          overflow-y: auto !important;
          height: calc(100vh - 60px) !important;
        }
        .dashboard-content.allow-y-scroll > div,
        .dashboard-content.allow-y-scroll .purchase-requisition-detail-container,
        .dashboard-content.allow-y-scroll .detail-view-container,
        .dashboard-content.allow-y-scroll .product-detail-container,
        .dashboard-content.allow-y-scroll .guide-management-container,
        .dashboard-content.allow-y-scroll .user-create-container,
        .dashboard-content.allow-y-scroll .user-edit-container,
        .dashboard-content.allow-y-scroll .sidebar-management-container,
        .dashboard-content.allow-y-scroll .system-config-container {
          overflow-y: visible !important;
          height: auto !important;
          min-height: 100% !important;
          flex: none !important;
        }
        .dashboard-content:not(.allow-y-scroll) > div,
        .dashboard-content:not(.allow-y-scroll) > .mgmt-container,
        .dashboard-content:not(.allow-y-scroll) > .manufacture-plan-container,
        .dashboard-content:not(.allow-y-scroll) > .quality-records-container,
        .dashboard-content:not(.allow-y-scroll) > .guide-management-container {
          flex: 1 !important;
          height: 100% !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }
        .mgmt-main {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          min-height: 0 !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        .main-tabs,
        .defect-mgmt-tabs,
        .sticky-top-zone {
          flex-shrink: 0 !important;
        }
        .analytics-view,
        .list-view {
          flex: 1 !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .admin-list-layout,
        .defect-list-layout {
          flex: 1 !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        .sidebar-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 999;
          backdrop-filter: blur(2px);
        }
        .admin-main {
          flex: 1;
          margin-left: 0;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: relative;
        }
        @media (min-width: 993px) {
          .admin-main {
            margin-left: 260px;
            width: calc(100% - 260px);
          }
          .admin-main.sidebar-collapsed {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .admin-sidebar.collapsed {
            width: 0 !important;
            border-right: none !important;
            transform: translateX(-100%) !important;
          }
          .admin-sidebar.collapsed .sidebar-user-section {
            padding: 20px 10px !important;
            justify-content: center !important;
          }
          .admin-sidebar.collapsed .nav-text,
          .admin-sidebar.collapsed .chevron-icon,
          .admin-sidebar.collapsed .sidebar-footer,
          .admin-sidebar.collapsed .sidebar-group-children {
            display: none !important;
          }
          .admin-sidebar.collapsed .nav-link-direct,
          .admin-sidebar.collapsed .sidebar-group-header {
            justify-content: center !important;
            padding: 12px 0 !important;
          }
          .admin-sidebar.collapsed .nav-icon {
            margin-right: 0 !important;
          }
        }
        .admin-header {
          padding: 10px 24px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 900;
          height: 60px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-page-title {
          font-size: 1.25rem;
          color: #2D1A12;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .header-page-subtitle {
          font-size: 0.85rem;
          color: #8D6E63;
          margin: 2px 0 0 0;
          font-weight: 500;
        }
        .dashboard-content {
          padding: 8px 24px 0 24px;
          flex: 1;
          background-color: #F8FAFC;
          min-height: auto;
          display: flex;
          flex-direction: column;
        }
        .toggle-sidebar-btn {
          background: #FAF6F0;
          border: 1px solid #EADCC9;
          color: #7B5233;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .toggle-sidebar-btn:hover {
          background: #FAF6F0;
          color: #5D4037;
          border-color: #7B5233;
        }
        .header-notification-wrapper {
          position: relative;
        }
        .bell-badge {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 8px;
          height: 8px;
          background: #EF4444;
          border-radius: 50%;
          border: 1.5px solid #FFFFFF;
        }
        .header-notifications-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 1100;
          box-shadow: 0 10px 25px rgba(0,0,0,0.12);
          border-radius: 12px;
          overflow: hidden;
        }

        /* ── RESPONSIVE MOBILE ADJUSTMENTS ── */
        @media (max-width: 768px) {
          .admin-main {
            margin-left: 0;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
          .admin-header {
            padding: 0 16px !important;
            height: 50px !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            background-color: #FAF6F0 !important;
            border-bottom: 1px solid #EADCC9 !important;
          }
          .header-left {
            gap: 8px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }
          .header-titles {
            min-width: 0 !important;
            flex: 1 !important;
            padding: 2px 0 !important;
          }
          .header-page-title {
            font-size: 1.1rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            margin: 0 !important;
            line-height: 1.2 !important;
          }
          .header-page-subtitle {
            font-size: 0.75rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            margin: 2px 0 0 0 !important;
            line-height: 1.1 !important;
          }
          .toggle-sidebar-btn {
            display: inline-flex !important;
            flex-shrink: 0 !important;
          }
          
          /* Main container safety constraints */
          .dashboard-content {
            padding: 0 4px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            min-height: auto !important;
            margin-top: 0 !important;
            display: block !important;
            background-color: #FAF6F0 !important;
          }
        }

        /* ── GLOBAL CHATBOT FLOATING WIDGET ── */
        .chatbot-ai-emoji-btn {
          position: fixed;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A0301B, #C85A43);
          color: #FFFFFF;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(160, 48, 27, 0.35);
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
        }
        .chatbot-ai-emoji-btn:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 12px 28px rgba(160, 48, 27, 0.45);
        }
        
        /* ── CHAT DRAWER PANEL ── */
        .claim-chat-panel {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 400px;
          height: 600px;
          background: rgba(253, 251, 247, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(160, 48, 27, 0.15);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(45, 26, 18, 0.15);
          display: flex;
          overflow: hidden;
          z-index: 1000;
          font-family: 'Outfit', 'Inter', sans-serif;
          animation: slideUpFade 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .claim-chat-main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0;
        }
        
        /* Header style */
        .claim-chat-header {
          padding: 14px 18px;
          background: linear-gradient(135deg, #2D1A12, #4E3629);
          color: #EADCC9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(234, 220, 201, 0.1);
        }
        .claim-chat-title {
          font-size: 0.95rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          letter-spacing: 0.2px;
        }
        .claim-chat-header-btn {
          background: transparent;
          border: none;
          color: #EADCC9;
          opacity: 0.8;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .claim-chat-header-btn:hover, .claim-chat-header-btn.active {
          opacity: 1;
          background: rgba(234, 220, 201, 0.15);
        }
        .claim-chat-close {
          background: transparent;
          border: none;
          color: #EADCC9;
          font-size: 1.1rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .claim-chat-close:hover {
          opacity: 1;
          background: rgba(239, 68, 68, 0.2);
        }
        
        /* Sessions Sidebar */
        .chat-sessions-sidebar {
          width: 200px;
          background: #211510;
          border-right: 1px solid rgba(160, 48, 27, 0.15);
          display: flex;
          flex-direction: column;
          height: 100%;
          animation: slideRight 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideRight {
          from { width: 0; opacity: 0; }
          to { width: 200px; opacity: 1; }
        }
        .chat-sessions-sidebar-header {
          padding: 14px 12px;
          border-bottom: 1px solid rgba(234, 220, 201, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #EADCC9;
        }
        .chat-sessions-sidebar-header h3 {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .new-session-btn {
          background: rgba(160, 48, 27, 0.2);
          border: 1px solid rgba(160, 48, 27, 0.4);
          color: #EADCC9;
          padding: 4px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .new-session-btn:hover {
          background: #A0301B;
          border-color: #A0301B;
        }
        .chat-sessions-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .session-item {
          display: flex;
          align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          color: #D3C2B5;
          font-size: 0.82rem;
          gap: 8px;
          min-width: 0;
          position: relative;
        }
        .session-item:hover {
          background: rgba(234, 220, 201, 0.08);
          color: #FFFFFF;
        }
        .session-item.active {
          background: rgba(160, 48, 27, 0.25);
          color: #FFFFFF;
          font-weight: 600;
          border-left: 3px solid #A0301B;
        }
        .session-icon {
          flex-shrink: 0;
          opacity: 0.7;
        }
        .session-title {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .session-delete-btn {
          background: transparent;
          border: none;
          color: #A08070;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, color 0.2s;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .session-item:hover .session-delete-btn {
          opacity: 1;
        }
        .session-delete-btn:hover {
          color: #EF4444;
        }
        
        /* Messages container */
        .claim-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #FAF6F0;
        }
        .chat-message-row {
          display: flex;
          flex-direction: column;
          width: 100%;
          position: relative;
        }
        .chat-message-row:hover .chat-msg-delete-btn {
          opacity: 1;
        }
        .chat-message-bubble {
          max-width: 85%;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 0.88rem;
          line-height: 1.45;
          position: relative;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          word-break: break-word;
        }
        .chat-message-user {
          align-self: flex-end;
          background: linear-gradient(135deg, #7B5233, #5D4037);
          color: #FFFFFF;
          border-bottom-right-radius: 2px;
        }
        .chat-message-bot {
          align-self: flex-start;
          background: #FFFFFF;
          color: #2D1A12;
          border: 1px solid rgba(123, 82, 51, 0.08);
          border-bottom-left-radius: 2px;
        }
        .chat-message-time {
          display: block;
          font-size: 0.72rem;
          color: rgba(123, 82, 51, 0.5);
          margin-top: 6px;
          text-align: right;
        }
        .chat-message-user .chat-message-time {
          color: rgba(255, 255, 255, 0.6);
        }
        
        /* Suggestions Chips */
        .chat-suggestions-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .chat-suggestion-chip {
          background: #FAF6F0;
          border: 1px solid #EADCC9;
          color: #7B5233;
          padding: 6px 10px;
          border-radius: 16px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .chat-suggestion-chip:hover {
          background: #A0301B;
          color: #FFFFFF;
          border-color: #A0301B;
          transform: translateY(-1px);
        }
        
        /* Rich Claim Cards */
        .chat-items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .chat-item-card {
          background: #FAF6F0;
          border: 1px solid #EADCC9;
          border-radius: 8px;
          padding: 10px;
          font-size: 0.82rem;
          color: #2D1A12;
        }
        .chat-item-header {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          color: #7B5233;
          border-bottom: 1px solid rgba(123, 82, 51, 0.1);
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .chat-item-photo-link {
          color: #A0301B;
          cursor: pointer;
          font-weight: bold;
          display: flex;
          align-items: center;
          transition: transform 0.2s;
        }
        .chat-item-photo-link:hover {
          transform: scale(1.05);
          text-decoration: underline;
        }
        .status-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
        }
        .status-new {
          background: rgba(141, 110, 99, 0.15);
          color: #8D6E63;
        }
        .status-processing {
          background: rgba(217, 119, 6, 0.15);
          color: #d97706;
        }
        .status-resolved {
          background: rgba(5, 150, 105, 0.15);
          color: #059669;
        }
        .severity-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
        }
        .severity-high {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        .severity-medium {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .severity-low {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        /* Delete msg button */
        .chat-msg-delete-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          right: -24px;
          background: transparent;
          border: none;
          color: rgba(123, 82, 51, 0.4);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, color 0.2s;
          padding: 4px;
          font-size: 0.8rem;
        }
        .chat-msg-delete-btn:hover {
          color: #EF4444;
        }
        
        /* Chat Loading Bubble */
        .chat-loading-bubble {
          align-self: flex-start;
          background: #FFFFFF;
          padding: 12px 16px;
          border-radius: 12px;
          border-bottom-left-radius: 2px;
          border: 1px solid rgba(123, 82, 51, 0.08);
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .chat-loading-dot {
          width: 6px;
          height: 6px;
          background: #7B5233;
          border-radius: 50%;
          animation: chatBounce 1.4s infinite ease-in-out both;
        }
        .chat-loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .chat-loading-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes chatBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
        
        /* Input Area */
        .claim-chat-input-area {
          padding: 14px 16px;
          background: #FFFFFF;
          border-top: 1px solid rgba(123, 82, 51, 0.08);
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .claim-chat-input {
          flex: 1;
          height: 38px;
          border: 1px solid #EADCC9;
          border-radius: 20px;
          padding: 0 16px;
          font-size: 0.88rem;
          outline: none;
          color: #2D1A12;
          background: #FAF6F0;
          transition: all 0.2s;
        }
        .claim-chat-input:focus {
          border-color: #7B5233;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.15);
        }
        .claim-chat-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #A0301B;
          color: #FFFFFF;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .claim-chat-send-btn:hover:not(:disabled) {
          background: #C85A43;
          transform: scale(1.05);
        }
        .claim-chat-send-btn:disabled {
          background: #E5E7EB;
          color: #9CA3AF;
          cursor: not-allowed;
        }
        
        /* Custom scrollbar */
        .claim-chat-messages::-webkit-scrollbar, .chat-sessions-list::-webkit-scrollbar {
          width: 5px;
        }
        .claim-chat-messages::-webkit-scrollbar-track, .chat-sessions-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .claim-chat-messages::-webkit-scrollbar-thumb, .chat-sessions-list::-webkit-scrollbar-thumb {
          background: rgba(123, 82, 51, 0.2);
          border-radius: 4px;
        }
        .claim-chat-messages::-webkit-scrollbar-thumb:hover, .chat-sessions-list::-webkit-scrollbar-thumb:hover {
          background: rgba(123, 82, 51, 0.4);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .claim-chat-panel {
            width: 100vw;
            height: 100vh;
            bottom: 0;
            right: 0;
            border-radius: 0;
            border: none;
          }
          .chatbot-ai-emoji-btn {
            bottom: 16px;
            right: 16px;
          }
        }
      `}} />
    </div>
  );
};

export default PortalLayout;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  Send,
  History,
  RotateCcw,
  KeyRound,
  AlertTriangle,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  X,
} from 'lucide-react';
import chatbotService from '../services/chatbot.service';
import ChatMessageRenderer from './ChatMessageRenderer';
import ChatChartRenderer from './ChatChartRenderer';
import ChatInfographicRenderer from './ChatInfographicRenderer';
import ChatEntityCard from './ChatEntityCard';
import GeminiCookieModal from './GeminiCookieModal';
import '../styles/chatbot.css';

const getContextSuggestions = (pathname) => {
  const p = (pathname || '').toLowerCase();
  if (p.includes('/warehouse') || p.includes('/goods-receipt') || p.includes('/goods-issue')) {
    return [
      'Hôm nay có bao nhiêu phiếu nhập và xuất kho?',
      'Danh sách hàng lỗi / từ chối tại kho chưa xử lý',
      'Thống kê tổng giá trị xuất kho theo từng kho tháng này',
      'Có bao nhiêu mã vật tư đang hoạt động trong kho?',
    ];
  }
  if (p.includes('/production-orders') || p.includes('/daily-production') || p.includes('/plan')) {
    return [
      'Đơn hàng / LSX nào đang ưu tiên và chưa xong?',
      'Sản xuất hằng ngày hôm nay có bao nhiêu lô?',
      'Tiến độ các kế hoạch sản xuất tháng này',
      'Thống kê số lượng đơn hàng theo trạng thái',
    ];
  }
  if (p.includes('/quality') || p.includes('/reports') || p.includes('/capa') || p.includes('/defects')) {
    return [
      'Vẽ biểu đồ Pareto top lỗi QC tháng này',
      'Tỷ lệ lỗi QC theo từng công đoạn trong tháng',
      'Có bao nhiêu phiếu CAPA đang mở?',
      'Danh sách hướng dẫn kiểm tra (HDKT/CTQ) đang ban hành',
    ];
  }
  if (p.includes('/claims') || p.includes('/prices') || p.includes('/shipments')) {
    return [
      'Tháng này có bao nhiêu claim và tổng tiền phạt?',
      'Vẽ biểu đồ Pareto lỗi khiếu nại nhiều nhất',
      'SKU nào bị claim nhiều nhất?',
      'Container nào đang Shipped có claim?',
    ];
  }
  if (p.includes('/iso') || p.includes('/machine') || p.includes('/equipment')) {
    return [
      'Máy móc nào sắp đến hạn bảo trì trong 14 ngày tới?',
      'Hồ sơ ISO nào đang chờ phê duyệt?',
      'Có bao nhiêu lỗi phần mềm mức High chưa sửa?',
    ];
  }
  if (p.includes('/kpi') || p.includes('/hr') || p.includes('/staff')) {
    return [
      'Quân số QLCL đi làm hôm nay thế nào?',
      'Chỉ số KPI tháng này đạt bao nhiêu %?',
      'Tổng hợp khen thưởng và vi phạm trong tháng',
    ];
  }
  return [
    'Tổng quan sản xuất, kho và QC hôm nay',
    'Đơn hàng nào đang ưu tiên?',
    'Hôm nay có bao nhiêu phiếu nhập/xuất kho?',
    'Vẽ biểu đồ Pareto lỗi QC tháng này',
    'Máy móc nào sắp đến hạn bảo trì?',
  ];
};

const getWelcomeMessage = (pathname) => ({
  role: 'bot',
  text: 'Xin chào! Tôi là **Trợ lý AI SmartFlow ERP** (chế độ chỉ đọc).\n\nTôi có thể tra cứu, thống kê và vẽ biểu đồ trên toàn bộ hệ thống: **Sản xuất (LSX/KHSX), Kho vật tư, QC & CAPA, Khiếu nại (Claims), Bàn giao, Mua hàng, KPI/Nhân sự, Máy móc & Hồ sơ ISO** theo đúng phân quyền của bạn.',
  suggestions: getContextSuggestions(pathname),
  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
});

const ChatbotWidget = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // All hooks declared at the top of the component
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState('');
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('default');
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [feedbackMap, setFeedbackMap] = useState({}); // { [msgIdx]: 'up' | 'down' }

  const [btnPosition, setBtnPosition] = useState({ right: 24, bottom: 96 });
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
    return { width: 480, height: 680 };
  });
  const [isResizing, setIsResizing] = useState(false);

  const chatInputRef = useRef(null);
  const chatMessagesEndRef = useRef(null);
  const chatbotDrawerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ right: 24, bottom: 96 });
  const resizeStartRef = useRef({ x: 0, y: 0 });
  const sizeStartRef = useRef({ width: 480, height: 680 });

  // Persist panel size
  useEffect(() => {
    try {
      localStorage.setItem('smartflow_chatbot_panel_size', JSON.stringify(panelSize));
    } catch (e) {
      console.error('Failed to save chatbot size:', e);
    }
  }, [panelSize]);

  // Handle ?chat=true URL query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('chat') === 'true') {
      setIsChatOpen(true);
      const cleanSearch = location.search.replace(/[?&]chat=true/, '').replace(/^\?$/, '');
      navigate({ pathname: location.pathname, search: cleanSearch }, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isChatOpen && chatMessagesEndRef.current) {
      const t = setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [chatMessages, isChatLoading, thinkingStatus, isChatOpen]);

  // Click outside to close (ignore when Cookie Modal is open)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isCookieModalOpen) return;
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
  }, [isCookieModalOpen]);

  const loadHealth = useCallback(async () => {
    try {
      const res = await chatbotService.getHealth();
      setHealthInfo(res);
    } catch (err) {
      console.error('[ChatbotWidget] Health check failed:', err);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const list = await chatbotService.getSessions();
      setSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('[ChatbotWidget] Failed to load sessions:', err);
    }
  }, []);

  const loadHistory = useCallback(
    async (sessionId) => {
      setIsChatLoading(true);
      try {
        const history = await chatbotService.getHistory(sessionId);
        if (history && history.length > 0) {
          const formatted = history.map((h) => ({
            role: h.role === 'user' ? 'user' : 'bot',
            text: h.content,
            items: h.items || [],
            charts: h.charts || [],
            infographics: h.infographics || [],
            suggestions: h.suggestions || [],
            time: h.created_at
              ? new Date(h.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          }));
          setChatMessages(formatted);
        } else {
          setChatMessages([getWelcomeMessage(location.pathname)]);
        }
      } catch (err) {
        console.error('[ChatbotWidget] Failed to load history:', err);
        setChatMessages([getWelcomeMessage(location.pathname)]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [location.pathname]
  );

  useEffect(() => {
    if (isChatOpen) {
      loadHealth();
      loadSessions();
      loadHistory(currentSessionId);
    }
  }, [isChatOpen, currentSessionId, loadHealth, loadSessions, loadHistory]);

  // Dragging floating button
  const handleButtonMouseDown = (e) => {
    if (e.button !== 0) return;
    isDraggingRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...btnPosition };

    const onMove = (ev) => {
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDraggingRef.current = true;
      setBtnPosition({
        right: Math.max(10, Math.min(window.innerWidth - 66, posStartRef.current.right - dx)),
        bottom: Math.max(10, Math.min(window.innerHeight - 66, posStartRef.current.bottom - dy)),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleResizeMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY };
    sizeStartRef.current = { ...panelSize };

    const onMove = (ev) => {
      const dx = ev.clientX - resizeStartRef.current.x;
      const dy = ev.clientY - resizeStartRef.current.y;
      setPanelSize({
        width: Math.max(360, Math.min(window.innerWidth - 48, sizeStartRef.current.width - dx)),
        height: Math.max(440, Math.min(window.innerHeight - 48, sizeStartRef.current.height - dy)),
      });
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleCreateSession = () => {
    const newId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    setCurrentSessionId(newId);
    setChatMessages([getWelcomeMessage(location.pathname)]);
    setChatContext({});
    setFeedbackMap({});
    setShowSessionsPanel(false);
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await chatbotService.deleteSession(sessionId);
      if (currentSessionId === sessionId) setCurrentSessionId('default');
      loadSessions();
    } catch (err) {
      console.error('[ChatbotWidget] Delete session error:', err);
    }
  };

  const handleClearChat = async () => {
    try {
      await chatbotService.clearHistory(currentSessionId);
    } catch (err) {
      console.error('[ChatbotWidget] Clear history error:', err);
    }
    setChatMessages([getWelcomeMessage(location.pathname)]);
    setChatContext({});
    setFeedbackMap({});
  };

  const handleSendMessage = async (textOverride) => {
    const text = (textOverride ?? (chatInputRef.current ? chatInputRef.current.value : '')).trim();
    if (!text || isChatLoading) return;

    if (chatInputRef.current) chatInputRef.current.value = '';

    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user', text, time: nowTime };
    const botPlaceholder = { role: 'bot', text: '', items: [], suggestions: [], time: nowTime, streaming: true };

    const historyToSend = chatMessages
      .filter((m) => m.role === 'user' || m.role === 'bot')
      .slice(-8)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: (m.text || '').slice(0, 400),
      }));

    setChatMessages((prev) => [...prev, userMsg, botPlaceholder]);
    setIsChatLoading(true);
    setThinkingStatus('Đang gửi yêu cầu tới Trợ lý AI...');

    const contextWithPage = {
      ...chatContext,
      current_page: location.pathname,
    };

    try {
      let streamedText = '';
      await chatbotService.streamMessage(text, contextWithPage, historyToSend, currentSessionId, {
        onStatus: (statusMsg) => {
          setThinkingStatus(statusMsg);
        },
        onToken: (chunk) => {
          streamedText += chunk;
          setThinkingStatus('');
          setChatMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'bot') {
              next[next.length - 1] = { ...last, text: streamedText };
            }
            return next;
          });
        },
        onDone: (payload) => {
          if (payload?.context) setChatContext(payload.context);
          if (payload?.error_code === 'cookie_expired') {
            loadHealth();
          }
          setChatMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'bot') {
              next[next.length - 1] = {
                ...last,
                text: payload?.answer || streamedText || 'Không nhận được câu trả lời.',
                items: payload?.items || [],
                charts: payload?.charts || [],
                infographics: payload?.infographics || [],
                suggestions: payload?.suggestions || [],
                provider: payload?.provider,
                domains: payload?.domains,
                sql_queries: payload?.sql_queries,
                error_code: payload?.error_code,
                userQuestion: text,
                streaming: false,
              };
            }
            return next;
          });
        },
      });
      loadSessions();
    } catch (err) {
      console.error('[ChatbotWidget] Stream error:', err);
      setChatMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'bot') {
          next[next.length - 1] = {
            ...last,
            text: err.message || 'Không thể kết nối máy chủ AI.',
            suggestions: ['Thử lại'],
            streaming: false,
          };
        }
        return next;
      });
    } finally {
      setIsChatLoading(false);
      setThinkingStatus('');
    }
  };

  const handleNavigateEntity = (item) => {
    if (item.entity_type === 'claim' || item.cabinet_no || item.claim_code) {
      if (location.pathname === '/admin/claims') {
        window.dispatchEvent(new CustomEvent('claim-chat-view-photo', { detail: item }));
      } else {
        sessionStorage.setItem('pending-chat-detail-item', JSON.stringify(item));
        navigate('/admin/claims');
      }
      return;
    }
    if (item.route) {
      navigate(item.route);
      setIsChatOpen(false);
    }
  };

  const handleCopyText = (text, idx) => {
    navigator.clipboard?.writeText(text || '').then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  const handleFeedback = async (idx, rating, msg) => {
    setFeedbackMap((prev) => ({ ...prev, [idx]: rating }));
    try {
      await chatbotService.submitFeedback({
        session_id: currentSessionId,
        message_index: idx,
        rating,
        user_question: msg.userQuestion || '',
        bot_answer: (msg.text || '').slice(0, 2000),
        provider_used: msg.provider || '',
        domains_used: msg.domains || [],
        sql_queries: msg.sql_queries || [],
      });
    } catch (err) {
      console.error('[ChatbotWidget] Feedback error:', err);
    }
  };

  const isCookieExpired = Boolean(healthInfo?.cookie_expired);
  const isAdmin = Boolean(healthInfo?.is_admin);

  return (
    <>
      {!isChatOpen && (
        <button
          type="button"
          className="chatbot-ai-emoji-btn"
          style={{ right: `${btnPosition.right}px`, bottom: `${btnPosition.bottom}px`, touchAction: 'none' }}
          onMouseDown={handleButtonMouseDown}
          onClick={(e) => {
            if (isDraggingRef.current) {
              e.preventDefault();
              return;
            }
            setIsChatOpen(true);
          }}
          title="Trợ lý AI SmartFlow"
        >
          <Sparkles size={24} style={{ pointerEvents: 'none' }} />
        </button>
      )}

      {isChatOpen && (
        <div
          className="claim-chat-panel"
          ref={chatbotDrawerRef}
          style={{
            right: `${btnPosition.right}px`,
            bottom: `${btnPosition.bottom}px`,
            maxHeight: `calc(100vh - ${btnPosition.bottom + 24}px)`,
            height: `min(${panelSize.height}px, calc(100vh - ${btnPosition.bottom + 24}px))`,
            width: showSessionsPanel
              ? `min(${panelSize.width + 210}px, calc(100vw - 36px))`
              : `min(${panelSize.width}px, calc(100vw - 36px))`,
            transition: isResizing ? 'none' : 'width 0.25s ease',
          }}
        >
          {/* Resize handle top-left */}
          <div
            className="chat-panel-resize-handle"
            onMouseDown={handleResizeMouseDown}
            title="Kéo thả để thay đổi kích thước"
          />

          {/* Sessions Sidebar */}
          {showSessionsPanel && (
            <div className="chat-sessions-sidebar">
              <div className="chat-sessions-sidebar-header">
                <h3>Cuộc hội thoại</h3>
                <button type="button" className="new-session-btn" onClick={handleCreateSession} title="Tạo cuộc hội thoại mới">
                  <Plus size={15} />
                </button>
              </div>
              <div className="chat-sessions-list">
                {sessions.length === 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#8D6E63', padding: '10px', textAlign: 'center' }}>
                    Chưa có phiên trò chuyện nào.
                  </div>
                )}
                {sessions.map((s) => (
                  <div
                    key={s.session_id}
                    className={`session-item ${currentSessionId === s.session_id ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentSessionId(s.session_id);
                      setShowSessionsPanel(false);
                    }}
                  >
                    <MessageSquare size={14} className="session-icon" />
                    <span className="session-title" title={s.session_title}>
                      {s.session_title || 'Cuộc hội thoại'}
                    </span>
                    {s.session_id !== 'default' && (
                      <button
                        type="button"
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

          {/* Main Area */}
          <div className="claim-chat-main-area">
            <div className="claim-chat-header">
              <span className="claim-chat-title">
                <Sparkles size={17} style={{ marginRight: '6px', color: '#EADCC9' }} />
                Trợ lý AI SmartFlow
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isAdmin && (
                  <button
                    type="button"
                    className={`claim-chat-header-btn ${isCookieExpired ? 'is-alert' : ''}`}
                    title="Quản lý & Cập nhật Cookie Gemini Web"
                    onClick={() => setIsCookieModalOpen(true)}
                  >
                    <KeyRound size={15} />
                  </button>
                )}
                <button
                  type="button"
                  className={`claim-chat-header-btn ${showSessionsPanel ? 'active' : ''}`}
                  title="Lịch sử các cuộc hội thoại"
                  onClick={() => setShowSessionsPanel((prev) => !prev)}
                >
                  <History size={15} />
                </button>
                <button
                  type="button"
                  className="claim-chat-header-btn"
                  title="Đặt lại kích thước mặc định"
                  onClick={() => setPanelSize({ width: 480, height: 680 })}
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  className="claim-chat-header-btn"
                  title="Xóa lịch sử trong phiên hiện tại"
                  onClick={handleClearChat}
                >
                  <Trash2 size={15} />
                </button>
                <button type="button" className="claim-chat-header-btn" onClick={() => setIsChatOpen(false)} title="Đóng">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Cookie Expired Warning Banner */}
            {isCookieExpired && (
              <div className="chatbot-cookie-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    {isAdmin
                      ? 'Cookie Gemini Web đã hết hạn.'
                      : 'Phiên AI tạm gián đoạn — vui lòng báo Quản trị viên.'}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="chatbot-cookie-banner-btn"
                    onClick={() => setIsCookieModalOpen(true)}
                  >
                    Cập nhật Cookie
                  </button>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="claim-chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-message-row ${msg.role === 'user' ? 'is-user' : 'is-bot'}`}>
                  <div className={`chat-message-bubble ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}>
                    {msg.role === 'user' ? (
                      <div>{msg.text}</div>
                    ) : (
                      <>
                        {/* Structured Infographics */}
                        {msg.infographics && msg.infographics.length > 0 && (
                          <div className="chatbot-visuals-stack">
                            {msg.infographics.map((infoSpec, infoIdx) => (
                              <ChatInfographicRenderer key={`info-${infoIdx}`} spec={infoSpec} />
                            ))}
                          </div>
                        )}

                        {/* Structured Interactive Charts */}
                        {msg.charts && msg.charts.length > 0 && (
                          <div className="chatbot-visuals-stack">
                            {msg.charts.map((chartSpec, cIdx) => (
                              <ChatChartRenderer
                                key={`chart-${cIdx}`}
                                type={chartSpec.type}
                                title={chartSpec.title}
                                subtitle={chartSpec.subtitle}
                                unit={chartSpec.unit}
                                data={chartSpec.data}
                                highlights={chartSpec.highlights}
                              />
                            ))}
                          </div>
                        )}

                        <ChatMessageRenderer text={msg.text} />
                      </>
                    )}

                    {/* Entity Cards */}
                    {msg.items && msg.items.length > 0 && (
                      <div className="chat-items-list">
                        {msg.items.map((item, iIdx) => (
                          <ChatEntityCard key={iIdx} item={item} onNavigateEntity={handleNavigateEntity} />
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {msg.role === 'bot' && !msg.streaming && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="chat-suggestions-container">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            type="button"
                            key={sIdx}
                            className="chat-suggestion-chip"
                            onClick={() => handleSendMessage(sug)}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Footer: Time + Actions (Copy, Feedback) */}
                    <div className="chat-message-footer">
                      <span className="chat-message-time">{msg.time}</span>
                      {msg.role === 'bot' && !msg.streaming && idx > 0 && (
                        <div className="chat-message-actions">
                          <button
                            type="button"
                            className="chat-mini-action"
                            title="Sao chép nội dung"
                            onClick={() => handleCopyText(msg.text, idx)}
                          >
                            {copiedIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                          <button
                            type="button"
                            className={`chat-mini-action ${feedbackMap[idx] === 'up' ? 'is-active-up' : ''}`}
                            title="Câu trả lời hữu ích"
                            onClick={() => handleFeedback(idx, 'up', msg)}
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            type="button"
                            className={`chat-mini-action ${feedbackMap[idx] === 'down' ? 'is-active-down' : ''}`}
                            title="Câu trả lời chưa chính xác"
                            onClick={() => handleFeedback(idx, 'down', msg)}
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="chatbot-thinking-pill">
                  <span className="chatbot-thinking-dot" />
                  <span>{thinkingStatus || 'Đang xử lý...'}</span>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Input */}
            <div className="claim-chat-input-area">
              <input
                type="text"
                className="claim-chat-input"
                placeholder="Hỏi về Sản xuất, Kho, QC, CAPA, Claim, ISO, KPI..."
                ref={chatInputRef}
                defaultValue=""
                disabled={isChatLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                type="button"
                className="claim-chat-send-btn"
                onClick={() => handleSendMessage()}
                disabled={isChatLoading}
                title="Gửi câu hỏi"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Cookie Modal */}
      <GeminiCookieModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
        onUpdated={() => loadHealth()}
      />
    </>
  );
};

export default ChatbotWidget;


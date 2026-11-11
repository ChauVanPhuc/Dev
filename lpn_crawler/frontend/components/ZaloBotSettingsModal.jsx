import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, AlertTriangle, RefreshCw, Send, 
  Smartphone, ShieldCheck, Key, HelpCircle, 
  FileText, Activity, MessageSquare, ExternalLink, Settings, Phone
} from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';

export function ZaloBotSettingsModal({ isOpen, onClose, onShowToast }) {
  const [activeTab, setActiveTab] = useState('connection'); // 'connection', 'config', 'logs'
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Status & Config State
  const [status, setStatus] = useState({
    is_connected: false,
    is_configured: false,
    bot_name: '',
    bot_phone: '',
    default_recipient_phone: '',
    fallback_manager_phones: [],
    is_auto_send_enabled: true,
    last_connected_at: null,
    last_checked_at: null,
    today_stats: { success: 0, failed: 0, total: 0 }
  });

  const [form, setForm] = useState({
    bot_phone: '',
    bot_name: '',
    imei: '',
    session_cookies: '',
    default_recipient_phone: '',
    fallback_manager_phones_str: '',
    is_auto_send_enabled: true
  });

  // Test Message State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');

  // Logs State
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatusAndConfig();
      if (activeTab === 'logs') {
        loadLogs();
      }
    }
  }, [isOpen, activeTab]);

  const loadStatusAndConfig = async () => {
    setLoading(true);
    try {
      const [st, cfg] = await Promise.all([
        lpnCrawlerApi.getZaloStatus(),
        lpnCrawlerApi.getZaloConfig()
      ]);
      setStatus(st || {});
      if (cfg) {
        setForm({
          bot_phone: cfg.bot_phone || '',
          bot_name: cfg.bot_name || '',
          imei: cfg.imei || '',
          session_cookies: cfg.session_cookies || '',
          default_recipient_phone: cfg.default_recipient_phone || '',
          fallback_manager_phones_str: (cfg.fallback_manager_phones || []).join(', '),
          is_auto_send_enabled: cfg.is_auto_send_enabled !== false
        });
        if (cfg.default_recipient_phone && !testPhone) {
          setTestPhone(cfg.default_recipient_phone);
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Không thể tải cấu hình Zalo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (p = 1) => {
    setLogsLoading(true);
    try {
      const data = await lpnCrawlerApi.getZaloLogs({ page: p, page_size: 15 });
      setLogs(data.items || []);
      setLogsTotal(data.total || 0);
      setLogsPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const fbList = form.fallback_manager_phones_str
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await lpnCrawlerApi.updateZaloConfig({
        bot_phone: form.bot_phone,
        bot_name: form.bot_name,
        imei: form.imei,
        session_cookies: form.session_cookies,
        default_recipient_phone: form.default_recipient_phone,
        fallback_manager_phones: fbList,
        is_auto_send_enabled: form.is_auto_send_enabled
      });

      if (onShowToast) onShowToast('Lưu cấu hình Zalo Bot thành công!', 'success');
      await loadStatusAndConfig();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi khi lưu cấu hình', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await lpnCrawlerApi.testZaloConnection();
      if (res.success) {
        if (onShowToast) onShowToast(res.message || 'Kết nối Zalo Bot thành công!', 'success');
      } else {
        if (onShowToast) onShowToast(res.message || 'Kiểm tra kết nối thất bại', 'error');
      }
      await loadStatusAndConfig();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi kiểm tra kết nối', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      if (onShowToast) onShowToast('Vui lòng nhập số điện thoại nhận tin nhắn thử', 'warning');
      return;
    }
    setSendingTest(true);
    try {
      const res = await lpnCrawlerApi.sendTestZaloMessage(testPhone.trim(), testMessage.trim() || null);
      if (onShowToast) onShowToast(res.message || 'Đã gửi tin nhắn thử nghiệm thành công!', 'success');
      setTestMessage('');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi gửi tin nhắn', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-[#FAF7F2] border border-[#EADCC9]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#EADCC9]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#4A3728]">Cấu Hình Zalo Bot Thông Báo LPN</h3>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  status.is_connected 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}>
                  {status.is_connected ? '🟢 Đang kết nối' : '🔴 Chưa kết nối'}
                </span>
              </div>
              <p className="text-xs text-[#7B5233]/70">
                Tự động gửi kết quả quét LPN & AI OCR qua Zalo theo số điện thoại yêu cầu
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 pt-2 bg-stone-100 border-b border-[#EADCC9] gap-2">
          <button
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-t border-x ${
              activeTab === 'connection'
                ? 'bg-[#FAF7F2] text-[#7B5233] border-[#EADCC9] border-b-transparent shadow-sm'
                : 'text-stone-600 hover:text-stone-900 border-transparent hover:bg-stone-200/60'
            }`}
          >
            <Key className="w-4 h-4" />
            Trạng thái & Phiên Zalo (Cookie/IMEI)
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-t border-x ${
              activeTab === 'config'
                ? 'bg-[#FAF7F2] text-[#7B5233] border-[#EADCC9] border-b-transparent shadow-sm'
                : 'text-stone-600 hover:text-stone-900 border-transparent hover:bg-stone-200/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            Cấu hình Gửi tin & Test Tin Nhắn
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-t border-x ${
              activeTab === 'logs'
                ? 'bg-[#FAF7F2] text-[#7B5233] border-[#EADCC9] border-b-transparent shadow-sm'
                : 'text-stone-600 hover:text-stone-900 border-transparent hover:bg-stone-200/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            Nhật ký Gửi tin ({status.today_stats?.total || 0} hôm nay)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: PHIÊN ĐĂNG NHẬP & KẾT NỐI */}
          {activeTab === 'connection' && (
            <div className="space-y-6">
              {/* Card trạng thái Bot */}
              <div className="p-4 rounded-xl bg-white border border-[#EADCC9] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    status.is_connected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {status.bot_name ? status.bot_name.substring(0, 2).toUpperCase() : 'ZB'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#4A3728]">{status.bot_name || 'SmartFlow Zalo Bot'}</h4>
                    <p className="text-xs text-stone-500">
                      SĐT Bot: <strong className="text-stone-700">{status.bot_phone || 'Chưa đặt'}</strong>
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Lần kiểm tra gần nhất: {status.last_checked_at ? new Date(status.last_checked_at).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection || loading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#7B5233] hover:bg-[#634228] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    {testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra Kết nối'}
                  </button>
                </div>
              </div>

              {/* Hướng dẫn lấy Cookie / IMEI */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-950">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Cách lấy Cookie & IMEI từ Zalo Web (Dùng 1 lần, hoạt động liên tục 15-30 ngày):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-blue-800/90 pl-1">
                  <li>
                    Đăng nhập tài khoản Zalo Bot trên trình duyệt tại{' '}
                    <a href="https://chat.zalo.me" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-blue-950">
                      https://chat.zalo.me ↗
                    </a>
                  </li>
                  <li>
                    Dùng Extension hỗ trợ Zalo (hoặc F12 ➔ Tab <em>Application / Storage</em> ➔ <em>Cookies</em> ➔ copy toàn bộ).
                  </li>
                  <li>
                    Khuyên dùng <strong>Tiện ích Chrome Extension</strong> để đồng bộ 1-Click hoặc copy dự liệu tự động (vì có đầy đủ cookie bảo mật <code>zpw_sek</code>).
                  </li>
                  <li>Dán chuỗi Cookie và IMEI vào form dưới đây rồi bấm <strong>Lưu & Kiểm tra kết nối</strong>.</li>
                </ol>
              </div>

              {/* Form cập nhật Cookie & IMEI */}
              <form onSubmit={handleSaveConfig} className="p-5 rounded-xl bg-white border border-[#EADCC9] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Số điện thoại Bot Zalo:
                    </label>
                    <input
                      type="text"
                      value={form.bot_phone}
                      onChange={(e) => setForm({ ...form, bot_phone: e.target.value })}
                      placeholder="0888187044"
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7B5233]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tên hiển thị Bot Zalo:
                    </label>
                    <input
                      type="text"
                      value={form.bot_name}
                      onChange={(e) => setForm({ ...form, bot_name: e.target.value })}
                      placeholder="SmartFlow Zalo Bot"
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7B5233]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    IMEI định danh Zalo Web:
                  </label>
                  <input
                    type="text"
                    value={form.imei}
                    onChange={(e) => setForm({ ...form, imei: e.target.value })}
                    placeholder="Chuỗi IMEI thiết bị (VD: c3b79...)"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg font-mono focus:outline-none focus:border-[#7B5233]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Session Cookies (Hỗ trợ định dạng JSON hoặc Header string key=val; ...):
                  </label>
                  <textarea
                    rows={4}
                    value={form.session_cookies}
                    onChange={(e) => setForm({ ...form, session_cookies: e.target.value })}
                    placeholder='Dán chuỗi cookies tại đây...'
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg font-mono focus:outline-none focus:border-[#7B5233]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#7B5233] hover:bg-[#634228] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: CẤU HÌNH GỬI TIN & TEST MESSAGE */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Form cấu hình số điện thoại & tự động gửi */}
              <div className="p-5 rounded-xl bg-white border border-[#EADCC9] space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7B5233]">
                  Quy định Gửi Báo Cáo Tự Động
                </h4>

                <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200">
                  <div>
                    <span className="text-xs font-semibold text-stone-800">
                      Tự động gửi tin nhắn Zalo sau khi quét xong Container
                    </span>
                    <p className="text-[11px] text-stone-500">
                      Sau khi AI OCR bóc tách và khớp tem nhãn, hệ thống sẽ tự động gửi bảng kết quả về SĐT yêu cầu.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_auto_send_enabled}
                      onChange={(e) => setForm({ ...form, is_auto_send_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Số điện thoại nhận tin mặc định:
                    </label>
                    <input
                      type="text"
                      value={form.default_recipient_phone}
                      onChange={(e) => setForm({ ...form, default_recipient_phone: e.target.value })}
                      placeholder="0981206221"
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7B5233]"
                    />
                    <span className="text-[10px] text-stone-400">
                      Dùng khi AppSheet webhook không kèm số điện thoại người phụ trách.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      SĐT Quản lý dự phòng (Chuyển tiếp khi lỗi):
                    </label>
                    <input
                      type="text"
                      value={form.fallback_manager_phones_str}
                      onChange={(e) => setForm({ ...form, fallback_manager_phones_str: e.target.value })}
                      placeholder="0981206221, 0888187044"
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7B5233]"
                    />
                    <span className="text-[10px] text-stone-400">
                      Cách nhau bằng dấu phẩy. Nhận tin khi người yêu cầu chặn tin nhắn từ người lạ.
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={loading}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#7B5233] hover:bg-[#634228] rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </div>

              {/* Khung Test Gửi Tin Nhắn Thử Nghiệm */}
              <div className="p-5 rounded-xl bg-white border border-[#EADCC9] space-y-4">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Gửi Thử Tin Nhắn Zalo
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Số điện thoại nhận tin thử:
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                      <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="0981206221"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7B5233]"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nội dung tin nhắn thử nghiệm (Tùy chọn):
                    </label>
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Để trống sẽ gửi tin nhắn mẫu mặc định của hệ thống..."
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#7B5233]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSendTestMessage}
                    disabled={sendingTest || !testPhone.trim()}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-bounce' : ''}`} />
                    {sendingTest ? 'Đang gửi qua Zalo...' : 'Bấm Gửi Thử Ngay'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NHẬT KÝ GỬI TIN */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600">
                  Tổng cộng: <strong>{logsTotal}</strong> lượt gửi tin nhắn
                </span>
                <button
                  onClick={() => loadLogs(logsPage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#7B5233] bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
                  Làm mới
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#EADCC9] bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100/80 text-stone-600 font-semibold border-b border-[#EADCC9]">
                    <tr>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Container</th>
                      <th className="p-3">Người nhận / SĐT</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Chi tiết / Lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-stone-400">
                          Chưa có nhật ký gửi tin nhắn nào.
                        </td>
                      </tr>
                    ) : (
                      logs.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="p-3 text-stone-500 whitespace-nowrap">
                            {item.sent_at ? new Date(item.sent_at).toLocaleString('vi-VN') : 'N/A'}
                          </td>
                          <td className="p-3 font-semibold text-stone-800">
                            {item.container_number || 'Test Msg'}
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-stone-700">{item.recipient_name || 'N/A'}</div>
                            <div className="text-[11px] text-stone-400 font-mono">{item.recipient_phone}</div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              item.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'FALLBACK_SENT'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {item.status === 'SUCCESS' ? '✓ Thành công' : item.status === 'FALLBACK_SENT' ? '⚡ Chuyển tiếp' : '✕ Thất bại'}
                            </span>
                          </td>
                          <td className="p-3 text-stone-600 max-w-xs truncate" title={item.error_reason || item.message_content}>
                            {item.error_reason ? (
                              <span className="text-rose-600">{item.error_reason}</span>
                            ) : (
                              <span className="text-stone-400 italic">Đã gửi tin nhắn báo cáo</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-stone-100 border-t border-[#EADCC9]">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mã hóa bảo mật phiên & Tự động tra cứu SĐT Zalo</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

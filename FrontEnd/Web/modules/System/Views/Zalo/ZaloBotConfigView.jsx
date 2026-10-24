import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Key, Phone, Settings, RefreshCw, Send, CheckCircle, 
  AlertTriangle, ShieldCheck, HelpCircle, Plus, Trash2, Copy, Check,
  ExternalLink, UserCheck, Smartphone, Eye, EyeOff, FileText, Bell,
  Download, Zap, Sparkles
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

export default function ZaloBotConfigView({ isEmbedded = true }) {
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState('account'); // 'account' | 'recipients' | 'test' | 'logs'
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Status & Bot Details
  const [status, setStatus] = useState({
    is_connected: false,
    is_configured: false,
    bot_name: 'SmartFlow Zalo Bot',
    bot_phone: '',
    default_recipient_phone: '',
    fallback_manager_phones: [],
    is_auto_send_enabled: true,
    last_connected_at: null,
    last_checked_at: null,
    today_stats: { success: 0, failed: 0, total: 0 }
  });

  // Account Form (Gửi tin đi - IMEI, Cookies)
  const [form, setForm] = useState({
    bot_phone: '',
    bot_name: '',
    imei: '',
    session_cookies: '',
    default_recipient_phone: '',
    fallback_manager_phones: [],
    is_auto_send_enabled: true
  });

  const [showCookies, setShowCookies] = useState(false);
  const [copiedImei, setCopiedImei] = useState(false);

  // Recipient Manager States (Mục thêm SĐT người nhận)
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [newPhoneNote, setNewPhoneNote] = useState('');

  // Test Message States
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [lastTestResult, setLastTestResult] = useState(null);

  // Logs States
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);

  const handleDownloadExtension = () => {
    toast('info', 'Đang tải gói tiện ích Chrome Extension zlapi-extension.zip...');
    window.location.href = '/api/v1/lpn-crawler/zalo/download-extension';
  };

  useEffect(() => {
    loadStatusAndConfig();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'logs') {
      loadLogs(1);
    }
  }, [activeSubTab]);

  const loadStatusAndConfig = async () => {
    setLoading(true);
    try {
      const [stRes, cfgRes] = await Promise.all([
        api.get('/lpn-crawler/zalo/status'),
        api.get('/lpn-crawler/zalo/config')
      ]);

      const stData = stRes?.data || stRes || {};
      const cfgData = cfgRes?.data || cfgRes || {};

      setStatus(stData);
      setForm({
        bot_phone: cfgData.bot_phone || '',
        bot_name: cfgData.bot_name || '',
        imei: cfgData.imei || '',
        session_cookies: cfgData.session_cookies || '',
        default_recipient_phone: cfgData.default_recipient_phone || '',
        fallback_manager_phones: Array.isArray(cfgData.fallback_manager_phones) ? cfgData.fallback_manager_phones : [],
        is_auto_send_enabled: cfgData.is_auto_send_enabled !== false
      });

      if (cfgData.default_recipient_phone && !testPhone) {
        setTestPhone(cfgData.default_recipient_phone);
      }
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể tải cấu hình Zalo Bot!');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await api.get(`/lpn-crawler/zalo/logs?page=${page}&page_size=15`);
      const data = res?.data || res || {};
      setLogs(data.items || []);
      setLogsTotal(data.total || 0);
      setLogsPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Lưu cấu hình tổng thể
  const handleSaveConfig = async (overrideForm = null) => {
    setSavingConfig(true);
    const dataToSave = overrideForm || form;
    try {
      await api.post('/lpn-crawler/zalo/config', {
        bot_phone: dataToSave.bot_phone,
        bot_name: dataToSave.bot_name,
        imei: dataToSave.imei,
        session_cookies: dataToSave.session_cookies,
        default_recipient_phone: dataToSave.default_recipient_phone,
        fallback_manager_phones: dataToSave.fallback_manager_phones,
        is_auto_send_enabled: dataToSave.is_auto_send_enabled
      });
      toast('success', 'Lưu cấu hình Zalo Bot thành công!');
      await loadStatusAndConfig();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Lưu cấu hình Zalo thất bại!');
    } finally {
      setSavingConfig(false);
    }
  };

  // Kiểm tra kết nối Zalo
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await api.post('/lpn-crawler/zalo/test-connection');
      const data = res?.data || res || {};
      if (data.success) {
        toast('success', data.message || 'Kết nối tài khoản Zalo Bot thành công!');
      } else {
        toast('error', data.message || 'Kiểm tra kết nối thất bại! Vui lòng kiểm tra lại Cookies & IMEI.');
      }
      await loadStatusAndConfig();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Lỗi khi kiểm tra kết nối Zalo!');
    } finally {
      setTestingConnection(false);
    }
  };

  // Thêm SĐT nhận tin vào danh sách
  const handleAddRecipientPhone = async (e) => {
    if (e) e.preventDefault();
    const clean = newPhoneInput.trim().replace(/[^0-9+]/g, '');
    if (!clean || clean.length < 9) {
      toast('warning', 'Vui lòng nhập số điện thoại hợp lệ (từ 10 chữ số)!');
      return;
    }

    // Chuẩn hóa định dạng
    let normalized = clean;
    if (normalized.startsWith('+84')) normalized = '0' + normalized.slice(3);
    else if (normalized.startsWith('84') && normalized.length >= 11) normalized = '0' + normalized.slice(2);

    if (form.fallback_manager_phones.includes(normalized)) {
      toast('warning', `Số điện thoại ${normalized} đã có trong danh sách nhận tin!`);
      return;
    }

    const updatedList = [...form.fallback_manager_phones, normalized];
    const updatedForm = { ...form, fallback_manager_phones: updatedList };
    setForm(updatedForm);
    setNewPhoneInput('');
    setNewPhoneNote('');

    await handleSaveConfig(updatedForm);
    toast('success', `Đã thêm số điện thoại ${normalized} vào danh sách nhận tin!`);
  };

  // Xóa SĐT nhận tin khỏi danh sách
  const handleRemoveRecipientPhone = async (phoneToRemove) => {
    const updatedList = form.fallback_manager_phones.filter(p => p !== phoneToRemove);
    const updatedForm = { ...form, fallback_manager_phones: updatedList };
    setForm(updatedForm);
    await handleSaveConfig(updatedForm);
    toast('success', `Đã xóa số điện thoại ${phoneToRemove} khỏi danh sách nhận tin!`);
  };

  // Đặt làm số nhận mặc định
  const handleSetDefaultRecipient = async (phone) => {
    const updatedForm = { ...form, default_recipient_phone: phone };
    setForm(updatedForm);
    await handleSaveConfig(updatedForm);
    toast('success', `Đã đặt ${phone} làm số điện thoại nhận tin mặc định!`);
  };

  // Gửi tin nhắn thử nghiệm
  const handleSendTestMessage = async (customPhone = null) => {
    const target = customPhone || testPhone;
    if (!target || !target.trim()) {
      toast('warning', 'Vui lòng chọn hoặc nhập số điện thoại nhận tin nhắn thử nghiệm!');
      return;
    }

    setSendingTest(true);
    setLastTestResult(null);
    try {
      const res = await api.post('/lpn-crawler/zalo/test-message', {
        phone: target.trim(),
        message: testMessage.trim() || null
      });
      const data = res?.data || res || {};
      if (data.success) {
        toast('success', data.message || `Đã gửi tin nhắn Zalo thành công tới ${target}!`);
        setLastTestResult({ success: true, ...data });
        setTestMessage('');
      } else {
        toast('error', data.message || 'Gửi tin nhắn Zalo thất bại!');
        setLastTestResult({ success: false, ...data });
      }
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Lỗi khi gửi tin nhắn Zalo!');
      setLastTestResult({ success: false, message: err.response?.data?.detail || err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedImei(true);
    setTimeout(() => setCopiedImei(false), 2000);
    toast('info', 'Đã sao chép IMEI vào bộ nhớ tạm!');
  };

  return (
    <div style={{ padding: isEmbedded ? '20px' : '24px', backgroundColor: '#FFFFFF', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header Overview & Trạng Thái Bot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '20px',
        borderBottom: '1px solid #F3F4F6',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#0068FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0, 104, 255, 0.25)'
          }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#2D1A12' }}>
                Cấu Hình Zalo Bot & Danh Sách Người Nhận
              </h2>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: status.is_connected ? '#DCFCE7' : '#FEE2E2',
                color: status.is_connected ? '#15803D' : '#DC2626',
                border: `1px solid ${status.is_connected ? '#86EFAC' : '#FCA5A5'}`
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: status.is_connected ? '#16A34A' : '#DC2626'
                }}></span>
                {status.is_connected ? 'Đang kết nối (Online)' : 'Chưa kết nối (Offline)'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
              Tự động hóa thông báo báo cáo LPN, kết quả AI OCR và gửi tin nhắn cảnh báo trực tiếp về Zalo người phụ trách.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#FAF6F0',
              border: '1px solid #7B5233',
              color: '#7B5233',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: testingConnection ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} className={testingConnection ? 'animate-spin' : ''} />
            <span>{testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveConfig()}
            disabled={savingConfig || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: '#7B5233',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: savingConfig ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(123, 82, 51, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <Check size={14} />
            <span>{savingConfig ? 'Đang lưu...' : 'Lưu tất cả'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        marginTop: '20px'
      }}>
        {/* Card 1: Tài khoản Bot */}
        <div style={{
          backgroundColor: '#FAF8F6',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          padding: '14px 16px'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
            TÀI KHOẢN GỬI TIN
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#EAE0D5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7B5233',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}>
              {status.bot_name ? status.bot_name.substring(0, 2).toUpperCase() : 'ZB'}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1F2937' }}>
                {status.bot_name || 'Chưa đặt tên'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'monospace' }}>
                SĐT: {status.bot_phone || 'Chưa cài đặt'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Cài đặt tự động gửi */}
        <div style={{
          backgroundColor: '#FAF8F6',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          padding: '14px 16px'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
            CHẾ ĐỘ TỰ ĐỘNG GỬI
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: form.is_auto_send_enabled ? '#15803D' : '#DC2626' }}>
                {form.is_auto_send_enabled ? '● Tự động gửi kích hoạt' : '○ Tạm tắt gửi tự động'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
                Bắn tin ngay sau khi hoàn tất AI OCR
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_auto_send_enabled}
                onChange={(e) => {
                  const updated = { ...form, is_auto_send_enabled: e.target.checked };
                  setForm(updated);
                  handleSaveConfig(updated);
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: form.is_auto_send_enabled ? '#059669' : '#D1D5DB',
                borderRadius: '34px', transition: '0.2s'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '16px', width: '16px', left: form.is_auto_send_enabled ? '20px' : '3px', bottom: '3px',
                  backgroundColor: 'white', borderRadius: '50%', transition: '0.2s'
                }}></span>
              </span>
            </label>
          </div>
        </div>

        {/* Card 3: Thống kê gửi hôm nay */}
        <div style={{
          backgroundColor: '#FAF8F6',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          padding: '14px 16px'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
            THỐNG KÊ HÔM NAY
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D' }}>
                {status.today_stats?.success || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 600 }}>Thành công</div>
            </div>
            <div style={{ width: '1px', height: '28px', backgroundColor: '#E5E7EB' }} />
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626' }}>
                {status.today_stats?.failed || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>Thất bại</div>
            </div>
            <div style={{ width: '1px', height: '28px', backgroundColor: '#E5E7EB' }} />
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F2937' }}>
                {status.today_stats?.total || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Tổng lượt</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '2px solid #F3F4F6',
        marginTop: '24px',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'account', label: 'Tài khoản gửi tin (IMEI / Cookie)', icon: Key },
          { id: 'recipients', label: `Danh sách Người nhận (${form.fallback_manager_phones.length + (form.default_recipient_phone ? 1 : 0)})`, icon: Phone },
          { id: 'test', label: 'Thử nghiệm gửi tin nhắn', icon: Send },
          { id: 'logs', label: `Nhật ký gửi (${logsTotal})`, icon: FileText }
        ].map(t => {
          const IconComp = t.icon;
          const isSel = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.84rem',
                fontWeight: isSel ? 800 : 600,
                color: isSel ? '#7B5233' : '#6B7280',
                borderBottom: isSel ? '2px solid #7B5233' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              <IconComp size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab 1: Tài khoản gửi tin (IMEI / Cookie) */}
      {activeSubTab === 'account' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card Tiện ích Chrome Extension trích xuất tự động */}
          <div style={{
            backgroundColor: '#FAF6F0',
            border: '2px solid #EADCC9',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(123, 82, 51, 0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)'
                }}>
                  <Zap size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#4A3728' }}>
                      Tiện Ích Chrome Extension: Trích Xuất IMEI & Cookies Tự Động
                    </h3>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC'
                    }}>
                      ⚡ Hỗ trợ Đồng bộ 1-Click
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#6B7280' }}>
                    Công cụ chuyên dụng cài trực tiếp vào trình duyệt Chrome / Edge để tự động bắt mã IMEI và Cookies của Zalo Web mà không cần mở Console thủ công.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadExtension}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(123, 82, 51, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <Download size={16} />
                <span>Tải Extension (.zip)</span>
              </button>
            </div>

            {/* 3 Bước cài đặt & sử dụng nhanh */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px dashed #EADCC9'
            }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7B5233', textTransform: 'uppercase', marginBottom: '4px' }}>
                  BƯỚC 1: GIẢI NÉN FILE ZIP
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4B5563', lineHeight: '1.4' }}>
                  Bấm nút tải ở trên để nhận file <code>zlapi-extension.zip</code> và giải nén vào một thư mục trên máy tính.
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7B5233', textTransform: 'uppercase', marginBottom: '4px' }}>
                  BƯỚC 2: CÀI VÀO TRÌNH DUYỆT
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4B5563', lineHeight: '1.4' }}>
                  Mở <code>chrome://extensions</code> ➔ Bật <strong>Chế độ nhà phát triển (Developer mode)</strong> ➔ Bấm <strong>Tải tiện ích đã giải nén (Load unpacked)</strong> ➔ Chọn thư mục vừa giải nén.
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7B5233', textTransform: 'uppercase', marginBottom: '4px' }}>
                  BƯỚC 3: MỞ ZALO WEB & LẤY MÃ
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4B5563', lineHeight: '1.4' }}>
                  Vào <code>chat.zalo.me</code>, bấm icon tiện ích trên góc phải trình duyệt ➔ Bấm <strong>"⚡ Đồng bộ 1-Click"</strong> (hoặc Copy IMEI & Cookies dán vào form bên dưới).
                </div>
              </div>
            </div>
          </div>

          {/* Hướng dẫn trích xuất IMEI & Cookie thủ công (Dự phòng) */}
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '0.82rem',
            color: '#1E3A8A'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, marginBottom: '6px' }}>
              <HelpCircle size={18} color="#2563EB" />
              <span>Hướng dẫn lấy thông tin IMEI & Session Cookies từ Zalo Web (Dùng gửi tin nhắn tự động):</span>
            </div>
            <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>
                Đăng nhập tài khoản Zalo muốn dùng làm Bot gửi tin trên máy tính tại{' '}
                <a href="https://chat.zalo.me" target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'underline' }}>
                  https://chat.zalo.me ↗
                </a>.
              </li>
              <li>
                Nhấn phím <strong>F12</strong> (hoặc chuột phải chọn <em>Kiểm tra / Inspect</em>) ➔ Chọn tab <strong>Console</strong>.
              </li>
              <li>
                Gõ lệnh: <code style={{ backgroundColor: '#DBEAFE', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>document.cookie</code> rồi ấn <strong>Enter</strong> để copy toàn bộ chuỗi Cookies dán vào ô bên dưới.
              </li>
              <li>
                Vào tab <strong>Application</strong> ➔ mục <strong>Storage / Cookies / https://chat.zalo.me</strong> ➔ tìm khóa <code>imei</code> (hoặc copy IMEI định danh của trình duyệt).
              </li>
              <li>Dán IMEI và Cookie vào form bên dưới rồi ấn <strong>"Lưu & Kiểm tra kết nối"</strong>. Phiên đăng nhập sẽ duy trì ổn định từ 15 đến 30 ngày.</li>
            </ol>
          </div>

          {/* Form cấu hình tài khoản gửi */}
          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#4B5563', marginBottom: '6px' }}>
                  SỐ ĐIỆN THOẠI TÀI KHOẢN BOT ZALO *
                </label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    value={form.bot_phone}
                    onChange={(e) => setForm({ ...form, bot_phone: e.target.value })}
                    placeholder="Ví dụ: 0888187044"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#4B5563', marginBottom: '6px' }}>
                  TÊN HIỂN THỊ BOT ZALO
                </label>
                <input
                  type="text"
                  value={form.bot_name}
                  onChange={(e) => setForm({ ...form, bot_name: e.target.value })}
                  placeholder="Ví dụ: SmartFlow Zalo Bot"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* IMEI Field */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>
                  MÃ ĐỊNH DANH THIẾT BỊ (IMEI ZALO WEB) *
                </label>
                {form.imei && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(form.imei)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.72rem',
                      color: '#7B5233',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedImei ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedImei ? 'Đã chép' : 'Sao chép IMEI'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
                placeholder="Chuỗi IMEI Zalo Web (Ví dụ: c3b79f64-42b1-4b1f-9988-123456789abc)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  backgroundColor: '#FAF8F6',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                IMEI đại diện cho trình duyệt gửi tin đi, là bắt buộc đối với giao thức mã hóa Zalo API.
              </span>
            </div>

            {/* Session Cookies Field */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>
                  SESSION COOKIES (CHỨNG THỰC ĐĂNG NHẬP ZALO) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCookies(!showCookies)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.72rem',
                    color: '#7B5233',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {showCookies ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showCookies ? 'Ẩn chuỗi' : 'Hiện chuỗi'}</span>
                </button>
              </div>
              <textarea
                rows={showCookies ? 4 : 2}
                value={form.session_cookies}
                onChange={(e) => setForm({ ...form, session_cookies: e.target.value })}
                placeholder='Dán toàn bộ chuỗi document.cookie (hoặc JSON cookies) tại đây...'
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  backgroundColor: '#FAF8F6',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                Hỗ trợ chuỗi header chuẩn <code>key1=val1; key2=val2...</code> hoặc dạng JSON Object <code>{'{ "zpw_sec": "..." }'}</code>.
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !form.imei || !form.session_cookies}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #7B5233',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: (testingConnection || !form.imei || !form.session_cookies) ? 'not-allowed' : 'pointer'
                }}
              >
                {testingConnection ? 'Đang xác thực Zalo...' : 'Kiểm tra phiên kết nối'}
              </button>

              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={savingConfig}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: savingConfig ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(123, 82, 51, 0.25)'
                }}
              >
                {savingConfig ? 'Đang lưu...' : 'Lưu tài khoản Bot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Danh sách Người nhận (Mục thêm SĐT gửi cho người đó) */}
      {activeSubTab === 'recipients' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card Thêm SĐT Người Nhận Mới */}
          <div style={{
            border: '1px solid #EADCC9',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#FAF8F6'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#7B5233', textTransform: 'uppercase' }}>
              ➕ Thêm Số Điện Thoại Người Nhận Tin Nhắn Báo Cáo (Đồng Thời / Quản Lý)
            </h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: '#6B7280' }}>
              Khi Webhook tiếp nhận dữ liệu hoặc hoàn tất quét tem nhãn AI OCR, hệ thống sẽ gửi tin nhắn Zalo tới số điện thoại người phụ trách/mặc định VÀ đồng thời tự động gửi báo cáo tới toàn bộ danh sách các SĐT Quản lý / Giám sát dưới đây.
            </p>

            <form onSubmit={handleAddRecipientPhone} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 240px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#4B5563', marginBottom: '4px' }}>
                  SỐ ĐIỆN THOẠI ZALO CỦA NGƯỜI NHẬN *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    placeholder="Ví dụ: 0981206221 hoặc 0888187044"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.85rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ flex: '1 1 240px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#4B5563', marginBottom: '4px' }}>
                  GHI CHÚ / TÊN NGƯỜI NHẬN (TÙY CHỌN)
                </label>
                <input
                  type="text"
                  value={newPhoneNote}
                  onChange={(e) => setNewPhoneNote(e.target.value)}
                  placeholder="Ví dụ: Anh Phúc (Trưởng phòng QLCL) / Quản lý Kho"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.85rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!newPhoneInput.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: !newPhoneInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: !newPhoneInput.trim() ? 0.6 : 1,
                  boxShadow: '0 2px 8px rgba(123, 82, 51, 0.2)'
                }}
              >
                <Plus size={16} />
                <span>Thêm SĐT</span>
              </button>
            </form>
          </div>

          {/* SĐT Nhận Tin Mặc Định */}
          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1F2937' }}>
                📌 Số điện thoại nhận tin mặc định của hệ thống:
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                Được sử dụng khi gói tin Webhook gửi lên không chứa SĐT của người phụ trách cont.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="text"
                value={form.default_recipient_phone}
                onChange={(e) => setForm({ ...form, default_recipient_phone: e.target.value })}
                placeholder="0981206221"
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  width: '160px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#FAF6F0',
                  border: '1px solid #7B5233',
                  color: '#7B5233',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Cập nhật
              </button>
            </div>
          </div>

          {/* Danh sách các SĐT đã cấu hình */}
          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF'
          }}>
            <div style={{
              padding: '14px 20px',
              backgroundColor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151' }}>
                DANH SÁCH NHỮNG NGƯỜI SẼ NHẬN BÁO CÁO (ĐỒNG THỜI & QUẢN LÝ)
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>
                Tổng cộng: {form.fallback_manager_phones.length} số
              </span>
            </div>

            {form.fallback_manager_phones.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                Chưa có số điện thoại người nhận nào. Hãy thêm số điện thoại ở khung phía trên!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {form.fallback_manager_phones.map((phone, idx) => {
                  const isDefault = form.default_recipient_phone === phone;
                  return (
                    <div
                      key={phone}
                      style={{
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: idx < form.fallback_manager_phones.length - 1 ? '1px solid #F3F4F6' : 'none',
                        backgroundColor: '#FFFFFF',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1F2937', fontFamily: 'monospace' }}>
                              {phone}
                            </span>
                            {isDefault && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC'
                              }}>
                                ★ Người nhận chính
                              </span>
                            )}
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC'
                            }}>
                              ✓ Nhận tin đồng thời
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                            Luôn tự động nhận báo cáo khi có Container mới hoặc khi Admin bấm gửi lại Zalo.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultRecipient(phone)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: '#FFFFFF',
                              color: '#4B5563',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="Đặt làm người nhận chính"
                          >
                            Đặt làm chính
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setTestPhone(phone);
                            handleSendTestMessage(phone);
                          }}
                          disabled={sendingTest}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #059669',
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Send size={12} />
                          <span>Gửi thử Zalo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveRecipientPhone(phone)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #FCA5A5',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            cursor: 'pointer'
                          }}
                          title="Xóa SĐT khỏi danh sách"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab 3: Thử nghiệm gửi tin nhắn trực tiếp */}
      {activeSubTab === 'test' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1F2937' }}>
              Bắn Thử Tin Nhắn Tới Tài Khoản Zalo Chỉ Định
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>
              Kiểm tra tính năng tra cứu UID tự động từ số điện thoại và đảm bảo người nhận có thể nhận tin nhắn thông báo bình thường từ Bot.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#4B5563', marginBottom: '6px' }}>
                  CHỌN SỐ ĐIỆN THOẠI ĐÃ LƯU HOẶC NHẬP SỐ MỚI *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Ví dụ: 0981206221"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  {form.fallback_manager_phones.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setTestPhone(e.target.value);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.82rem',
                        backgroundColor: '#FAF8F6',
                        color: '#4B5563',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- Chọn nhanh SĐT --</option>
                      {form.default_recipient_phone && (
                        <option value={form.default_recipient_phone}>{form.default_recipient_phone} (Chính)</option>
                      )}
                      {form.fallback_manager_phones.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#4B5563', marginBottom: '6px' }}>
                  NỘI DUNG TIN NHẮN TÙY CHỌN (ĐỂ TRỐNG SẼ DÙNG BẢN TIN MẪU)
                </label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Ví dụ: Xin chào, đây là tin nhắn thử nghiệm từ SmartFlow ERP v3"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                💡 Lưu ý: Người nhận cần cho phép tin nhắn từ người lạ hoặc kết bạn trước với Zalo Bot.
              </div>

              <button
                type="button"
                onClick={() => handleSendTestMessage()}
                disabled={sendingTest || !testPhone.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: (sendingTest || !testPhone.trim()) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                }}
              >
                <Send size={15} />
                <span>{sendingTest ? 'Đang gửi tin...' : 'Gửi Thử Ngay'}</span>
              </button>
            </div>

            {/* Kết quả lần gửi gần nhất */}
            {lastTestResult && (
              <div style={{
                marginTop: '12px',
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: lastTestResult.success ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${lastTestResult.success ? '#86EFAC' : '#FCA5A5'}`,
                fontSize: '0.82rem',
                color: lastTestResult.success ? '#166534' : '#991B1B'
              }}>
                <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                  {lastTestResult.success ? '✅ Gửi thành công!' : '❌ Gửi thất bại!'}
                </div>
                <div>{lastTestResult.message}</div>
                {lastTestResult.displayName && (
                  <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                    Tài khoản nhận: <strong>{lastTestResult.displayName}</strong> (Zalo UID: {lastTestResult.userId})
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Tab 4: Nhật ký gửi tin (Logs) */}
      {activeSubTab === 'logs' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
              Tổng cộng: <strong>{logsTotal}</strong> lượt gửi tin nhắn thông báo
            </span>
            <button
              type="button"
              onClick={() => loadLogs(logsPage)}
              disabled={logsLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#4B5563',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>

          <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF8F6', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 800 }}>
                  <th style={{ padding: '12px 14px' }}>THỜI GIAN</th>
                  <th style={{ padding: '12px 14px' }}>CONTAINER</th>
                  <th style={{ padding: '12px 14px' }}>NGƯỜI NHẬN / SĐT</th>
                  <th style={{ padding: '12px 14px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 14px' }}>LÝ DO / CHI TIẾT</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#9CA3AF' }}>
                      Chưa có nhật ký gửi tin nhắn Zalo nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  logs.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {item.sent_at ? new Date(item.sent_at).toLocaleString('vi-VN') : '---'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#1F2937' }}>
                        {item.container_number || 'Test Message'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#1F2937' }}>{item.recipient_name || 'N/A'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', fontFamily: 'monospace' }}>{item.recipient_phone}</div>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: item.status === 'SUCCESS' ? '#DCFCE7' : item.status === 'FALLBACK_SENT' ? '#DBEAFE' : '#FEE2E2',
                          color: item.status === 'SUCCESS' ? '#15803D' : item.status === 'FALLBACK_SENT' ? '#1E40AF' : '#DC2626',
                          border: `1px solid ${item.status === 'SUCCESS' ? '#86EFAC' : item.status === 'FALLBACK_SENT' ? '#BFDBFE' : '#FCA5A5'}`
                        }}>
                          {item.status === 'SUCCESS' ? '✓ Thành công' : item.status === 'FALLBACK_SENT' ? '⚡ Chuyển tiếp' : '✕ Thất bại'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: item.error_reason ? '#DC2626' : '#6B7280', maxWidth: '300px' }}>
                        {item.error_reason || 'Đã gửi bản tin báo cáo thành công qua Zalo'}
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
  );
}

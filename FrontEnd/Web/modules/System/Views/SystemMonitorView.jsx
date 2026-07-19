import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext } from 'react-router-dom';
import { Activity, Database, Cpu, HardDrive, RefreshCw, Smartphone, Monitor, Users } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const SystemMonitorView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = useOutletContext();

  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/system-monitor');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000); // 3s default
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/system/monitor');
      setData(res);
    } catch (error) {
      console.error("Lỗi khi tải thông số hệ thống:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Hàm định dạng kích thước byte thành định dạng dễ đọc (GB, MB)
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Đảm bảo dọn dẹp Header Extra khi truy cập trang này và khi rời trang
  useEffect(() => {
    setHeaderExtra(null);
    return () => setHeaderExtra(null);
  }, [setHeaderExtra]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #FDF2F2', borderTopColor: '#A0301B', borderRadius: '50%', animation: 'mgmtSpin 0.8s linear infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#7B5233' }}>Đang kết nối hệ thống giám sát...</span>
      </div>
    );
  }

  const { database = {}, system = {}, active_devices = {} } = data || {};

  return (
    <div className="monitor-container">
      <style>{`
        .monitor-container {
          display: flex;
          flex-direction: column;
          gap: 25px;
          padding: 10px 0 30px;
        }
        .monitor-toolbar {
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          background-color: #fff; 
          padding: 16px 20px; 
          border-radius: 16px; 
          border: 1px solid rgba(123, 82, 51, 0.15);
          box-shadow: 0 4px 15px rgba(123, 82, 51, 0.05);
          flex-wrap: wrap;
          gap: 15px;
        }
        .monitor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .monitor-card {
          background-color: #fff;
          border-radius: 16px;
          border: 1px solid rgba(123, 82, 51, 0.12);
          padding: 24px;
          box-shadow: 0 4px 15px rgba(123, 82, 51, 0.04);
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .monitor-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(123, 82, 51, 0.1);
        }
        /* Simple, clean styling matching original design */
        .monitor-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .sql-details-card {
          background-color: #fff;
          border-radius: 16px;
          border: 1px solid rgba(123, 82, 51, 0.15);
          padding: 24px;
          box-shadow: 0 4px 15px rgba(123, 82, 51, 0.05);
        }
        .sql-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .sql-box {
          padding: 16px;
          background-color: #FAF6F0;
          border-radius: 12px;
          border: 1px solid #EADCC9;
          transition: all 0.2s ease;
        }
        .sql-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(123, 82, 51, 0.06);
        }
        .sql-title {
          font-size: 12px;
          color: #8D6E63;
          font-weight: 700;
          display: block;
          margin-bottom: 8px;
        }
        .sql-value {
          font-size: 24px;
          font-weight: 900;
        }
        .sql-version-banner {
          margin-top: 20px;
          padding: 12px 15px;
          background-color: #FFF5F5;
          border-radius: 10px;
          font-size: 13px;
          color: #7B5233;
          font-weight: 600;
          border: 1px solid rgba(160, 48, 27, 0.1);
        }
        @media (max-width: 768px) {
          .monitor-container {
            display: flex !important;
            flex-direction: column !important;
            min-height: calc(100dvh - 50px - 20px) !important;
            justify-content: space-between !important;
            gap: 10px !important;
            padding: 5px 0 10px !important;
            box-sizing: border-box !important;
          }
          .monitor-toolbar {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            padding: 10px 14px !important;
            flex-shrink: 0 !important;
          }
          .toolbar-left {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .toolbar-right {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .refresh-config {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            flex-shrink: 0 !important;
          }
          .interval-select {
            width: auto !important;
            min-width: unset !important;
            flex: 1 !important;
            max-width: 120px !important;
          }
          .reload-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
          }
          .monitor-toolbar span {
            font-size: 13px !important;
          }
          .monitor-toolbar select, .monitor-toolbar button, .monitor-toolbar label {
            font-size: 13px !important;
            padding: 6px 12px !important;
          }
          .monitor-toolbar button svg {
            width: 14px !important;
            height: 14px !important;
          }
          .monitor-grid {
            flex: 1.3 !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: 1fr 1fr 1fr !important;
            gap: 10px !important;
          }
          .monitor-card {
            padding: 12px 14px !important;
            border-radius: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100% !important;
            background-color: #ffffff !important;
            border: 1px solid rgba(123, 82, 51, 0.15) !important;
          }
          .monitor-card-header {
            margin-bottom: 5px !important;
          }
          .monitor-card .title-text {
            font-size: 11px !important;
            font-weight: 800 !important;
            letter-spacing: 0px !important;
          }
          .monitor-card .value-text {
            font-size: 20px !important;
            font-weight: 900 !important;
          }
          .monitor-card .sub-text {
            font-size: 10px !important;
            font-weight: 500 !important;
          }
          .monitor-card .footer-text {
            font-size: 10px !important;
            font-weight: 700 !important;
          }
          .monitor-card .icon-container {
            padding: 4px !important;
            border-radius: 8px !important;
          }
          .monitor-card .icon-container svg {
            width: 14px !important;
            height: 14px !important;
          }
          .monitor-card .progress-bar {
            display: block !important;
            height: 3px !important;
            margin: 4px 0 8px 0 !important;
          }
          .card-active-devices {
            grid-column: span 2 !important;
          }
          .sql-details-card {
            flex: 1.2 !important;
            padding: 12px 14px !important;
            border-radius: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100% !important;
          }
          .sql-details-card h4 {
            font-size: 14px !important;
            margin: 0 0 12px 0 !important;
            flex-shrink: 0 !important;
          }
          .sql-details-card h4 svg {
            width: 16px !important;
            height: 16px !important;
          }
          .sql-grid {
            flex: 1 !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: 1fr 1fr !important;
            gap: 10px !important;
          }
          .sql-box {
            padding: 12px 14px !important;
            border-radius: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            height: 100% !important;
          }
          .sql-title {
            font-size: 11px !important;
            margin-bottom: 4px !important;
            line-height: 1.2 !important;
          }
          .sql-value {
            font-size: 20px !important;
          }
          .sql-version-banner {
            display: none !important;
          }
        }
        
        /* Cực kỳ thu gọn cho màn hình điện thoại rất nhỏ */
        @media (max-width: 480px) {
          .monitor-container {
            gap: 8px !important;
            padding: 5px 0 5px !important;
            min-height: calc(100dvh - 50px - 10px) !important;
          }
          .monitor-toolbar {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            padding: 8px 10px !important;
          }
          .toolbar-left {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .toolbar-right {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .refresh-config {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex-shrink: 0 !important;
          }
          .interval-select {
            width: auto !important;
            min-width: unset !important;
            flex: 1 !important;
            max-width: 110px !important;
          }
          .reload-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
          }
          .monitor-toolbar span {
            font-size: 12px !important;
          }
          .monitor-toolbar select, .monitor-toolbar button, .monitor-toolbar label {
            font-size: 12px !important;
            padding: 5px 10px !important;
          }
          .monitor-grid {
            gap: 8px !important;
          }
          .monitor-card {
            padding: 8px 10px !important;
            border-radius: 10px !important;
          }
          .monitor-card-header {
            margin-bottom: 4px !important;
          }
          .monitor-card .title-text {
            font-size: 9px !important;
          }
          .monitor-card .value-text {
            font-size: 16px !important;
          }
          .monitor-card .sub-text {
            font-size: 9px !important;
          }
          .monitor-card .footer-text {
            font-size: 9px !important;
          }
          .monitor-card .icon-container {
            padding: 2px !important;
            border-radius: 6px !important;
          }
          .monitor-card .icon-container svg {
            width: 12px !important;
            height: 12px !important;
          }
          .sql-details-card {
            padding: 10px 12px !important;
            border-radius: 10px !important;
          }
          .sql-details-card h4 {
            font-size: 13px !important;
            margin-bottom: 8px !important;
          }
          .sql-grid {
            gap: 8px !important;
          }
          .sql-box {
            padding: 8px 10px !important;
            border-radius: 6px !important;
          }
          .sql-title {
            font-size: 10px !important;
            margin-bottom: 3px !important;
          }
          .sql-value {
            font-size: 18px !important;
          }
        }
      `}</style>

      {/* Control Toolbar */}
      <div className="monitor-toolbar">
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#7B5233' }}>Giám sát thời gian thực: Đang hoạt động</span>
        </div>

        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="refresh-config" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#7B5233' }}>
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: '#A0301B', cursor: 'pointer' }}
            />
            <label htmlFor="auto-refresh" style={{ cursor: 'pointer' }}>Tự động làm mới</label>
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            className="interval-select"
            style={{
              padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '13px', fontWeight: '700', backgroundColor: '#fff', color: '#334155', outline: 'none'
            }}
          >
            <option value={2000}>Mỗi 2 giây</option>
            <option value={3000}>Mỗi 3 giây</option>
            <option value={5000}>Mỗi 5 giây</option>
            <option value={10000}>Mỗi 10 giây</option>
          </select>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="reload-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              backgroundColor: '#A0301B', color: '#fff', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: 'background 0.2s'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Tải lại
          </button>
        </div>
      </div>

      {/* 5 Cards Overview */}
      <div className="monitor-grid">

        {/* Active Devices Monitoring */}
        <div className="monitor-card card-active-devices">
          <div className="monitor-card-header">
            <span className="title-text" style={{ fontSize: '14px', fontWeight: '800', color: '#8D6E63', letterSpacing: '0.5px' }}>THIẾT BỊ HOẠT ĐỘNG</span>
            <div className="icon-container" style={{ padding: '8px', backgroundColor: '#FFF5F5', borderRadius: '12px', color: '#A0301B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span className="value-text" style={{ fontSize: '36px', fontWeight: '900', color: '#2D1A12' }}>{active_devices.total ?? 0}</span>
            <span className="sub-text" style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>Online (1 phút qua)</span>
          </div>

          <div className="progress-bar" style={{ height: '8px', backgroundColor: '#F3EFEA', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#A0301B'
            }} />
          </div>

          <div className="footer-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7B5233', fontWeight: '700' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Monitor size={12} /> Web: {active_devices.web ?? 0}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Smartphone size={12} /> Mobile: {active_devices.mobile ?? 0}
            </span>
          </div>
        </div>

        {/* CPU Monitoring */}
        <div className="monitor-card card-cpu">
          <div className="monitor-card-header">
            <span className="title-text" style={{ fontSize: '14px', fontWeight: '800', color: '#8D6E63', letterSpacing: '0.5px' }}>CPU BỘ VI XỬ LÝ</span>
            <div className="icon-container" style={{ padding: '8px', backgroundColor: '#FFF5F5', borderRadius: '12px', color: '#A0301B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span className="value-text" style={{ fontSize: '36px', fontWeight: '900', color: '#2D1A12' }}>{system.cpu?.percent ?? 'N/A'}%</span>
            <span className="sub-text" style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>({system.cpu?.count} Cores)</span>
          </div>

          <div className="progress-bar" style={{ height: '8px', backgroundColor: '#F3EFEA', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
            <div style={{
              width: `${system.cpu?.percent ?? 0}%`,
              height: '100%',
              backgroundColor: (system.cpu?.percent ?? 0) > 80 ? '#EF4444' : '#A0301B',
              transition: 'width 0.5s ease'
            }} />
          </div>

          <div className="footer-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7B5233', fontWeight: '700' }}>
            <span>Backend chiếm:</span>
            <span>{system.cpu?.process_percent ?? 0}%</span>
          </div>
        </div>

        {/* RAM Monitoring */}
        <div className="monitor-card card-ram">
          <div className="monitor-card-header">
            <span className="title-text" style={{ fontSize: '14px', fontWeight: '800', color: '#8D6E63', letterSpacing: '0.5px' }}>BỘ NHỚ RAM</span>
            <div className="icon-container" style={{ padding: '8px', backgroundColor: '#FFF5F5', borderRadius: '12px', color: '#A0301B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span className="value-text" style={{ fontSize: '36px', fontWeight: '900', color: '#2D1A12' }}>{system.ram?.percent ?? 'N/A'}%</span>
            <span className="sub-text" style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>Dùng {formatBytes(system.ram?.used)}</span>
          </div>

          <div className="progress-bar" style={{ height: '8px', backgroundColor: '#F3EFEA', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
            <div style={{
              width: `${system.ram?.percent ?? 0}%`,
              height: '100%',
              backgroundColor: (system.ram?.percent ?? 0) > 85 ? '#EF4444' : '#A0301B',
              transition: 'width 0.5s ease'
            }} />
          </div>

          <div className="footer-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7B5233', fontWeight: '700' }}>
            <span>Backend (RSS):</span>
            <span>{formatBytes(system.process_ram)}</span>
          </div>
        </div>

        {/* Disk Storage */}
        <div className="monitor-card card-disk">
          <div className="monitor-card-header">
            <span className="title-text" style={{ fontSize: '14px', fontWeight: '800', color: '#8D6E63', letterSpacing: '0.5px' }}>DUNG LƯỢNG Ổ ĐĨA</span>
            <div className="icon-container" style={{ padding: '8px', backgroundColor: '#FFF5F5', borderRadius: '12px', color: '#A0301B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span className="value-text" style={{ fontSize: '36px', fontWeight: '900', color: '#2D1A12' }}>{system.disk?.percent ?? 'N/A'}%</span>
            <span className="sub-text" style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>Dùng {formatBytes(system.disk?.used)}</span>
          </div>

          <div className="progress-bar" style={{ height: '8px', backgroundColor: '#F3EFEA', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
            <div style={{
              width: `${system.disk?.percent ?? 0}%`,
              height: '100%',
              backgroundColor: (system.disk?.percent ?? 0) > 90 ? '#EF4444' : '#A0301B',
              transition: 'width 0.5s ease'
            }} />
          </div>

          <div className="footer-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7B5233', fontWeight: '700' }}>
            <span>Còn trống:</span>
            <span>{formatBytes(system.disk?.free)}</span>
          </div>
        </div>

        {/* Database Size & Connections */}
        <div className="monitor-card card-db">
          <div className="monitor-card-header">
            <span className="title-text" style={{ fontSize: '14px', fontWeight: '800', color: '#8D6E63', letterSpacing: '0.5px' }}>DUNG LƯỢNG CSDL</span>
            <div className="icon-container" style={{ padding: '8px', backgroundColor: '#FFF5F5', borderRadius: '12px', color: '#A0301B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span className="value-text" style={{ fontSize: '36px', fontWeight: '900', color: '#2D1A12' }}>{database.database_size_mb ?? 'N/A'}</span>
            <span className="sub-text" style={{ fontSize: '14px', color: '#6B7280', fontWeight: '800' }}>MB</span>
          </div>

          <div className="progress-bar" style={{ height: '8px', backgroundColor: '#F3EFEA', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#A0301B'
            }} />
          </div>

          <div className="footer-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7B5233', fontWeight: '700' }}>
            <span>Trạng thái:</span>
            <span style={{ color: database.status === 'Healthy' ? '#10B981' : '#EF4444' }}>
              ● {database.status === 'Healthy' ? 'TỐT' : 'LỖI'}
            </span>
          </div>
        </div>

      </div>

      {/* SQL Server Details */}
      <div className="sql-details-card">
        <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="#A0301B" /> THÔNG SỐ CHI TIẾT MICROSOFT SQL SERVER
        </h4>

        <div className="sql-grid">

          <div className="sql-box box-connections">
            <span className="sql-title">SỐ KẾT NỐI MẠNG ĐANG MỞ (CONNECTIONS)</span>
            <span className="sql-value" style={{ color: '#A0301B' }}>{database.active_connections ?? 'N/A'}</span>
          </div>

          <div className="sql-box box-sessions">
            <span className="sql-title">SỐ PHIÊN HOẠT ĐỘNG (SESSIONS)</span>
            <span className="sql-value" style={{ color: '#2D1A12' }}>{database.active_sessions ?? 'N/A'}</span>
          </div>

          <div className="sql-box box-limit">
            <span className="sql-title">GIỚI HẠN KẾT NỐI TỐI ĐA (LIMIT)</span>
            <span className="sql-value" style={{ color: '#2D1A12' }}>{database.max_connections ?? 32767}</span>
          </div>

          <div className="sql-box box-locks">
            <span className="sql-title">TIẾN TRÌNH KHÓA DỮ LIỆU (LOCKS)</span>
            <span className="sql-value" style={{ color: (database.active_locks ?? 0) > 5 ? '#EF4444' : '#2D1A12' }}>
              {database.active_locks ?? 0}
            </span>
          </div>

        </div>

        <div className="sql-version-banner">
          <strong>Phiên bản SQL Server đang chạy:</strong> {database.version ?? 'Không rõ'}
        </div>
      </div>

    </div>
  );
};

export default SystemMonitorView;

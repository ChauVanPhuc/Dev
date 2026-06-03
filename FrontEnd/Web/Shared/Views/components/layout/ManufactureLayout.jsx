import React, { useState } from 'react';

import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import ManufactureSidebar from './ManufactureSidebar';

import BeautifulModal from '../feedback/BeautifulModal';

import { authService } from '@modules/Auth/Models/auth.service';

import { Menu, ArrowLeft } from 'lucide-react';

import { useScreen } from '@shared/context/ScreenContext';



/**

 * Layout: Khung bao quát cho module Sản xuất (Manufacture)

 */

const ManufactureLayout = () => {

  const [sidebarActive, setSidebarActive] = useState(false);

  const [customTitle, setCustomTitle] = useState(null);

  const [customSubtitle, setCustomSubtitle] = useState(null);

  const [customScreenCode, setCustomScreenCode] = useState(null);

  const [headerExtra, setHeaderExtra] = useState(null);

  const [modalConfig, setModalConfig] = useState({ visible: false, title: '', message: '', type: 'info' });



  // --- GLOBAL MULTI-UPLOAD STATE ---

  const [uploads, setUploads] = useState([]);



  const updateUpload = (id, delta) => {

    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...delta } : u));

  };



  const removeUpload = (id) => {

    setTimeout(() => {

      setUploads(prev => prev.filter(u => u.id !== id));

    }, 5000);

  };



  const navigate = useNavigate();

  const location = useLocation();

  const { getScreenInfo } = useScreen();



  const queryParams = new URLSearchParams(location.search);

  const isPreview = queryParams.get('preview') === 'true';



  const handleLogout = () => {

    authService.logout();

    navigate('/login');

  };



  const showModal = (title, message, type = 'info') => {

    setModalConfig({ visible: true, title, message, type });

  };



  if (isPreview) {

    return (

      <div className="preview-mode-layout" style={{ background: '#f8fafc', minHeight: '100vh', padding: '15px', overflowX: 'hidden' }}>

        <Outlet context={{ 

          setCustomTitle: () => {}, 

          setCustomSubtitle: () => {}, 

          setCustomScreenCode: () => {},

          setHeaderExtra: () => {}, 

          showModal,

          startGlobalUpload: () => {},

          activeUploads: 0

        }} />

      </div>

    );

  }





  // --- GLOBAL MULTI-UPLOAD HANDLER ---

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

    

    // Ép React render giao diện trước khi bắt đầu stream

    await new Promise(r => setTimeout(r, 100));



    const formData = new FormData();

    formData.append('file', file);



    try {

      const { getBaseURL } = await import('@webShared/Services/api.service');

      const response = await fetch(`${getBaseURL()}${endpoint}`, {

        method: 'POST',

        body: formData,

        headers: { 'ngrok-skip-browser-warning': 'true' }

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

              // Tự tính %

              setUploads(prev => prev.map(u => {

                if (u.id === uploadId) {

                  const p = Math.round((data.processed / (u.total || 1)) * 100);

                  return { ...u, progress: p > 100 ? 100 : p };

                }

                return u;

              }));

            }

            if (data.status === 'completed') {

              updateUpload(uploadId, { status: 'completed', progress: 100 });

              showModal("Thành công", `Đã xử lý xong file ${file.name}`, "success");

              if (onComplete) onComplete(data);

              removeUpload(uploadId);

              return;

            }

          } catch (e) {}

        }

      }

    } catch (error) {

      console.error("Lỗi upload ngầm:", error);

      updateUpload(uploadId, { status: 'error' });

      showModal("Lỗi", `Không thể upload file ${file.name}`, "error");

      removeUpload(uploadId);

    }

  };



  // Ánh xạ tiêu đề trang

  const getPageTitles = () => {

    // Nếu có tiêu đề tùy chỉnh (từ trang con), ưu tiên sử dụng

    if (customTitle) {

      return { screenCode: customScreenCode || '', title: customTitle, subtitle: customSubtitle || 'ERP G7 Manufacture' };

    }



    return getScreenInfo(location.pathname);

  };



  const { screenCode, title, subtitle } = getPageTitles();



  // Reset tiêu đề tùy chỉnh khi chuyển trang

  React.useEffect(() => {

    setCustomTitle(null);

    setCustomSubtitle(null);

    setCustomScreenCode(null);

    setHeaderExtra(null);

  }, [location.pathname]);



  // Xóa logic đồng hồ cũ

  const pathSegments = location.pathname.split('/').filter(Boolean);

  const showBackButton = pathSegments.length >= 3;



  return (

    <div className="admin-layout">

      {/* Sidebar dành riêng cho Manufacture */}

      <ManufactureSidebar

        active={sidebarActive}

        onLogout={handleLogout}

        onClose={() => setSidebarActive(false)}

        isLocked={false} 

        showModal={showModal}

        uploads={uploads}

      />





      <div className="admin-main">

        <header className="admin-header">

          <div className="header-left">

            <button

              className="toggle-sidebar-btn"

              onClick={() => setSidebarActive(!sidebarActive)}

            >

              <Menu size={20} />

            </button>

            <div className="header-titles">

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                <h2 className="header-page-title">{title}</h2>

              </div>

              <p className="header-page-subtitle desktop-only">

                {screenCode && <span>{screenCode} · </span>}

                {subtitle}

              </p>

            </div>

          </div>



          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

            {headerExtra && <div className="header-extra-content">{headerExtra}</div>}

            

            {showBackButton && (

              <button 

                onClick={() => navigate(-1)}

                className="desktop-only"

                style={{

                  display: 'flex',

                  alignItems: 'center',

                  gap: '8px',

                  padding: '8px 20px',

                  backgroundColor: 'white',

                  border: '1.5px solid #EFEBE9',

                  borderRadius: '10px',

                  color: '#5D4037',

                  fontWeight: '800',

                  cursor: 'pointer',

                  transition: 'all 0.2s',

                  boxShadow: '0 2px 4px rgba(93, 64, 55, 0.05)',

                  fontSize: '0.95rem'

                }}

              >

                <ArrowLeft size={16} /> Quay lại

              </button>

            )}

          </div>

        </header>



        <div className="dashboard-content">

          <Outlet context={{ 

            setCustomTitle, 

            setCustomSubtitle, 

            setCustomScreenCode,

            setHeaderExtra, 

            showModal,

            startGlobalUpload,

            activeUploads: uploads.length

          }} />

        </div>

      </div>



      {/* Reuse AdminLayout styles for consistency or override if needed */}

      <style dangerouslySetInnerHTML={{

        __html: `

        .admin-layout { 

          display: flex; 

          min-height: 100vh; 

          background-color: #FAFAFA; 

          width: 100%; 

          overflow-x: hidden;

        }

        .admin-main { 

          flex: 1; 

          margin-left: 0; 

          width: 100%; 

          transition: 0.3s; 

          height: 100vh;

          display: flex;

          flex-direction: column;

          overflow-y: auto;

          overflow-x: hidden;

          position: relative;

        }

        

        @media (min-width: 993px) {

          .admin-main { 

            margin-left: 260px; 

            width: calc(100% - 260px); 

          }

          .toggle-sidebar-btn {

            display: none !important;

          }

        }

        

        .admin-header { 

          padding: 10px 20px; 

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

        .header-page-title { font-size: 1.25rem; color: #1e293b; margin: 0; font-weight: 800; letter-spacing: -0.02em; }

        .header-page-subtitle { font-size: 0.85rem; color: #64748b; margin: 2px 0 0 0; font-weight: 500; }

        

        .dashboard-content { 

          padding: 24px; 

          flex: 1; 

          background-color: #f8fafc; /* Màu nền xám nhạt hiện đại */

          min-height: calc(100vh - 60px);

        }

        

        .header-left { display: flex; align-items: center; }

        

        /* Cấu trúc chuẩn cho các Card trong Dashboard */

        .page-card {

          background: #ffffff;

          border-radius: 16px;

          border: 1px solid #e2e8f0;

          box-shadow: 0 1px 3px rgba(0,0,0,0.05);

          padding: 20px;

          margin-bottom: 24px;

        }



        @media (max-width: 768px) {

          .admin-header { padding: 8px 16px; }

          .header-page-title { font-size: 1.15rem; }

          .dashboard-content { padding: 16px; }

        }



        .toggle-sidebar-btn {

          background: #f8fafc;

          border: 1px solid #e2e8f0;

          padding: 8px;

          border-radius: 8px;

          cursor: pointer;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #64748b;

          transition: all 0.2s;

          margin-right: 15px;

        }



        .toggle-sidebar-btn:hover {

          background: #f1f5f9;

          color: #1e293b;

          border-color: #cbd5e1;

          transform: translateY(-1px);

          box-shadow: 0 2px 4px rgba(0,0,0,0.05);

        }



        .clock-icon {

          animation: pulse 2s infinite;

        }



        @keyframes pulse {

          0% { opacity: 1; }

          50% { opacity: 0.6; }

          100% { opacity: 1; }

        }

      `}} />

      <BeautifulModal 

        {...modalConfig} 

        onClose={() => setModalConfig(prev => ({ ...prev, visible: false }))} 

      />

    </div>

  );

};



export default ManufactureLayout;


import { Bell, ScanLine, Menu, UserCircle, ChevronLeft, HelpCircle } from 'lucide-react'

import useUiStore from '@shared/store/uiStore'

import useNotificationStore from '@shared/store/notificationStore' // [NEW] Import store thông báo

import useAuthStore from '@modules/auth/Models/authModel'

import QRScanner from '../media/QRScanner'
import UserProfileCard from '../user/UserProfileCard'

import { useState, useEffect, useCallback } from 'react'

import { useNavigate, useLocation } from 'react-router-dom'

import { useWebSocket } from '@shared/hooks/useWebSocket'

import apiClient from '@shared/services/api'



// Module-level global cache to avoid repetitive network requests across screens

let screensCache = null;

let activeFetchPromise = null;



const getMatchedScreen = (screensMap, path) => {

  if (!screensMap) return null;

  let matchedPath = path;



  const paths = Object.keys(screensMap);

  const found = paths.find(p => {

    if (!p.includes(':')) return p === path;

    const regexPattern = '^' + p.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';

    const regex = new RegExp(regexPattern);

    return regex.test(path);

  });



  return found ? screensMap[found] : null;

};



/**

 * PageHeader Component

 * Thanh tiêu đề phía trên dành cho các màn hình bên trong.

 */

const PageHeader = ({ title, subTitle, showBack = false, headerRef, onBackClick }) => {

  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  const toggleNotification = useUiStore((state) => state.toggleNotification)



  // [NEW] Quản lý trực tiếp trạng thái thông báo chưa đọc

  const { unreadCount, fetchUnreadCount, incrementUnreadCount } = useNotificationStore()

  const user = useAuthStore((state) => state.user)

  const setActiveStage = useAuthStore((state) => state.setActiveStage)

  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // [Realtime] Cập nhật số lượng thông báo chưa đọc ngay khi có tin mới từ WebSocket

  const handleSocketMessage = useCallback((message) => {

    if (message.type === 'SCREEN_UPDATED') {
      screensCache = null;
      activeFetchPromise = null;
      setRefreshTrigger(prev => prev + 1);
      return;
    }

    // Nếu tin nhắn báo có phiếu mới hoặc QC xong

    if (
      message.type === 'NEW_DELIVERY' ||
      message.type === 'QC_CONFIRMED' ||
      message.type === 'DELIVERY_RECEIVED' ||
      message.type === 'UPDATE_DELIVERY'
    ) {

      // Gọi fetchUnreadCount để Backend tự tính toán dựa trên quyền hạn thực tế của User

      const targetStage = user?.stage_description || user?.stage_name || ''



      // [DEBUG] Theo dõi tham số gửi lên

      const rawRole = user?.role_name || user?.role || user?.permission_description || '';
      let groupParam = rawRole;
      if (rawRole.includes('Sản xuất') || rawRole === 'SX') {
        groupParam = 'SX';
      } else if (rawRole.includes('Kiểm tra') || rawRole.includes('QC') || rawRole.includes('Chất lượng') || rawRole.includes('Quản lý') || rawRole.includes('QLCL')) {
        groupParam = 'QC';
      }



      // 1. Tăng số đếm cục bộ ngay lập tức (Instant UX)

      incrementUnreadCount();



      // 2. Đồng bộ từ server sau 0.5s và 2s

      setTimeout(() => fetchUnreadCount(user?.id, groupParam, targetStage), 500);

      setTimeout(() => fetchUnreadCount(user?.id, groupParam, targetStage), 2000);

    }

  }, [fetchUnreadCount, incrementUnreadCount, user]);



  useWebSocket(handleSocketMessage);



  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false) // [NEW] State mở Profile card trực tiếp từ header



  const navigate = useNavigate()

  const location = useLocation()



  // Dynamic screen configuration from Database

  const [dynamicScreen, setDynamicScreen] = useState(null);



  useEffect(() => {

    const loadScreens = async () => {

      try {

        if (screensCache) {

          setDynamicScreen(getMatchedScreen(screensCache, location.pathname));

          return;

        }



        if (!activeFetchPromise) {

          activeFetchPromise = apiClient.get('screens/map?platform=Mobile')

            .then(res => {

              screensCache = res.data || {};

              return screensCache;

            })

            .catch(err => {

              console.error('Failed to load mobile screens config:', err);

              return {};

            });

        }



        const cache = await activeFetchPromise;

        setDynamicScreen(getMatchedScreen(cache, location.pathname));

      } catch (err) {

        console.error('Error in loadScreens:', err);

      }

    };



    loadScreens();

  }, [location.pathname, refreshTrigger]);



  // [NEW] Kiểm tra quyền hạn (Chỉ ẩn cho Nhân Viên Sản Xuất)

  const userRoleStr = [

    user?.permission_description,

    user?.permission_name,

    user?.role_description,

    user?.role_name,

    user?.full_name,

    user?.username

  ].filter(Boolean).join(' ').toLowerCase().normalize('NFC');

  const isAdmin = userRoleStr.includes('admin');



  const [stages, setStages] = useState([])



  useEffect(() => {

    if (isAdmin) {

      apiClient.get('stages/')

        .then(response => {

          if (Array.isArray(response.data)) {

            setStages(response.data);

          }

        })

        .catch(err => {

          console.error('Lỗi khi tải danh sách công đoạn cho Admin:', err);

        });

    }

  }, [isAdmin]);



  const showStageSelect = isAdmin || (user?.stageNames && user.stageNames.length > 1);



  const dropdownStages = isAdmin

    ? [

      { name: '', description: 'Tất cả công đoạn' },

      ...stages.map(s => ({ name: s.name, description: s.description || s.name }))

    ]

    : (user?.stageNames || []).map((name, idx) => ({

      name,

      description: user?.stageDescriptions?.[idx] || name

    }));



  // Xác định các trang có kịch bản hướng dẫn người dùng

  const hasTour = [

    '/delivery-info',

    '/delivery-create',

    '/delivery-receive',

    '/inspection-daily',

    '/inspection-stage',

    '/input-inspection',

    '/logs',

    '/delivery-return',

    '/plan',

    '/kpi',

    '/awards'

  ].some(path => location.pathname.includes(path));



  const handleReplayTour = () => {

    // Phát sự kiện tùy biến để kích hoạt lại kịch bản hướng dẫn

    window.dispatchEvent(new CustomEvent('smartflow_replay_tour'));

  };



  // [NEW] Tự động cập nhật số lượng tin chưa đọc khi vào app

  useEffect(() => {

    if (user) {

      const rawRole = user.role_name || user.role || user.permission_description || '';
      let roleName = rawRole;
      if (rawRole.includes('Sản xuất') || rawRole === 'SX') {
        roleName = 'SX';
      } else if (rawRole.includes('Kiểm tra') || rawRole.includes('QC') || rawRole.includes('Chất lượng') || rawRole.includes('Quản lý') || rawRole.includes('QLCL')) {
        roleName = 'QC';
      }

      const targetStage = user.stage_description || user.stage_name || '';



      // [LOG QUAN TRỌNG] In ra console để kiểm tra





      fetchUnreadCount(user.id, roleName, targetStage);

    }

  }, [user, fetchUnreadCount]);



  const handleScanResult = async (code) => {
    setIsScannerOpen(false)

    if (!code) return;

    const trimmedCode = String(code).trim().toUpperCase();

    // Mode to route map cho phiếu kiểm tra chất lượng
    const modeRoutes = {
      first_sample: '/production_v2/inspection/first-sample',
      re_inspect: '/production_v2/inspection/re-inspect',
      parameter: '/production_v2/inspection/parameter',
      process: '/production_v2/inspection/process',
      qa: '/production_v2/inspection/qa',
      daily: '/production_v2/inspection/daily',
    };

    // 1. Xử lý mã QR Thẻ Dự Phòng / Luân Chuyển (DP- hoặc BACKUP-)
    // Điều hướng trực tiếp tới trang chuyên dụng phục vụ Thẻ dự phòng (gồm 2 tab Bàn giao & Kiểm tra)
    if (trimmedCode.startsWith('DP-') || trimmedCode.startsWith('BACKUP-')) {
      navigate(`/production_v2/backup-qr/${encodeURIComponent(trimmedCode)}`, {
        state: { backupQrCode: trimmedCode }
      });
      return;
    }

    // 2. Xử lý mã Phiếu Luân Chuyển / Bàn Giao (LC, TK-, PL-, DLV-, DEL-)
    // [ƯU TIÊN HÀNG ĐẦU] Bất kỳ mã nào bắt đầu bằng LC (ví dụ: LC10029, LC001) đều là Phiếu Luân Chuyển,
    // điều hướng ngay tới chi tiết phiếu luân chuyển (/production_v2/transfer/{id}),
    // tuyệt đối không chuyển nhầm sang phiếu kiểm tra chất lượng.
    const lcMatch = trimmedCode.match(/^LC(\d+)$/i);
    if (lcMatch) {
      const deliveryId = lcMatch[1];
      navigate(`/production_v2/transfer/${deliveryId}`, {
        state: { scannedCode: trimmedCode }
      });
      return;
    }

    if (trimmedCode.toUpperCase().startsWith('LC') || trimmedCode.startsWith('TK-') || trimmedCode.startsWith('PL-')) {
      navigate(`/production_v2/transfer/${trimmedCode}`, {
        state: { scannedCode: trimmedCode }
      });
      return;
    }

    // 3. Xử lý mã Phiếu Giao Nhận V1/V2 (DLV- hoặc DEL-)
    if (trimmedCode.startsWith('DLV-') || trimmedCode.startsWith('DEL-')) {
      const match = trimmedCode.match(/(\d+)$/);
      const cleanId = match ? match[1] : trimmedCode;
      navigate(`/production_v2/transfer/${cleanId}`);
      return;
    }

    // 4. Xử lý mã Lệnh Sản Xuất / Đơn Hàng (PO- hoặc LSX-)
    if (trimmedCode.startsWith('PO-') || trimmedCode.startsWith('LSX-')) {
      navigate(`/production/order-detail/${trimmedCode}`);
      return;
    }

    // 5. Xử lý mã Phiếu Kiểm Tra có tiền tố DA (ví dụ: DA3515) hoặc KT (ví dụ: KT110267)
    const daMatch = trimmedCode.match(/^DA(\d+)$/i) || trimmedCode.match(/^KT(\d+)$/i);
    if (daMatch) {
      const inspectId = daMatch[1];
      try {
        const res = await apiClient.get(`/inspections/${inspectId}/`);
        if (res.data && res.data.id) {
          const targetMode = res.data.mode || 're_inspect';
          const targetPath = modeRoutes[targetMode] || '/production_v2/inspection/re-inspect';
          navigate(`${targetPath}/${inspectId}`);
          return;
        }
      } catch (err) {
        // Mở trực tiếp màn hình chi tiết kiểm tra lại
        navigate(`/production_v2/inspection/re-inspect/${inspectId}`);
        return;
      }
    }

    // 6. Nếu là mã QC- hoặc INS-
    if (trimmedCode.startsWith('QC-') || trimmedCode.startsWith('INS-')) {
      navigate(`/production_v2/inspection/first-sample/${trimmedCode}`);
      return;
    }

    // 7. Tra cứu thông tin theo mã Pallet hoặc mã phiếu qua API /inspections/pallet/{code}
    // Chỉ điều hướng kiểm tra nếu thực sự có thông tin pallet hợp lệ trong DB
    try {
      const res = await apiClient.get(`/inspections/pallet/${encodeURIComponent(trimmedCode)}`);
      const data = res.data;
      if (data) {
        if (data.last_inspection && data.last_inspection.id) {
          const targetMode = data.last_inspection.mode || 're_inspect';
          const targetPath = modeRoutes[targetMode] || '/production_v2/inspection/re-inspect';
          navigate(`${targetPath}/${data.last_inspection.id}`);
          return;
        }
        if (data.palletCode && (data.inspectionCount > 0 || data.po || data.product || data.spec)) {
          // Là mã pallet đã có dữ liệu -> Mở tạo phiếu kiểm tra mới với mã pallet này
          navigate('/production_v2/inspection/re-inspect', {
            state: { palletCode: trimmedCode }
          });
          return;
        }
      }
    } catch (err) {
      // Tiếp tục các kiểm tra bên dưới
    }

    // 8. Xử lý mã số ID thuần túy (ví dụ: 3515 hoặc 123)
    const matchNumeric = trimmedCode.match(/^(\d+)$/);
    if (matchNumeric) {
      const numId = matchNumeric[1];
      try {
        const res = await apiClient.get(`/inspections/${numId}/`);
        if (res.data && res.data.id) {
          const targetMode = res.data.mode || 'first_sample';
          const targetPath = modeRoutes[targetMode] || '/production_v2/inspection/first-sample';
          navigate(`${targetPath}/${numId}`);
          return;
        }
      } catch (err) {
        navigate(`/production_v2/transfer/${numId}`);
        return;
      }
    }

    // 9. Điều hướng thông minh theo trang hiện tại, tuyệt đối không hiện popup QR modal
    if (location.pathname.includes('inspection')) {
      navigate('/production_v2/inspection/re-inspect', {
        state: { palletCode: trimmedCode }
      });
    } else {
      navigate(`/production_v2/transfer/${trimmedCode}`);
    }
  }



  return (

    <header

      ref={headerRef}

      style={{

        backgroundColor: 'var(--primary-color)',

        color: '#fff',

        padding: '6px 12px',

        display: 'flex',

        alignItems: 'center',

        justifyContent: 'space-between',

        zIndex: 50,

        position: 'sticky',

        top: 0,

        width: '100%',

        maxWidth: '100%',

        boxSizing: 'border-box',

        overflow: 'hidden',

        flexShrink: 0,

        height: showStageSelect ? '92px' : '56px'

      }}

    >

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, overflow: 'hidden' }}>

        {/* Nút điều hướng: Menu, User icon, hoặc Quay lại (Back) */}

        <button

          id="header-menu-btn"

          onClick={showBack ? (onBackClick ? onBackClick : () => navigate(-1)) : toggleSidebar}

          style={{

            background: 'none',

            border: 'none',

            color: '#fff',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            padding: '4px',

            width: '32px',

            height: '32px',

            borderRadius: '8px',

            cursor: 'pointer',

            flexShrink: 0

          }}

        >

          {showBack ? <ChevronLeft size={22} /> : <Menu size={22} />}

        </button>



        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>

          <span style={{ fontWeight: '700', fontSize: '0.9rem', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', overflow: 'hidden' }}>

            {(() => {

              const displaySub = dynamicScreen

                ? `${dynamicScreen.current_code} | ${dynamicScreen.title}`

                : subTitle;

              return displaySub && (

                <div style={{ fontSize: '0.7rem', opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>

                  {displaySub}

                </div>

              );

            })()}

          </div>

          {showStageSelect && (

            <div style={{ display: 'flex', marginTop: '4px' }}>

              <select

                value={user?.activeStageName || ''}

                onChange={(e) => {

                  const selectedName = e.target.value;

                  const selectedStage = dropdownStages.find(s => s.name === selectedName);

                  if (selectedStage) {

                    setActiveStage(selectedStage.name, selectedStage.description);

                  } else {

                    setActiveStage('', '');

                  }

                }}

                style={{

                  background: 'rgba(255, 255, 255, 0.18)',

                  border: '1px solid rgba(255, 255, 255, 0.4)',

                  color: '#fff',

                  fontSize: '0.65rem',

                  fontWeight: '700',

                  borderRadius: '8px',

                  padding: '1px 16px 1px 4px',

                  cursor: 'pointer',

                  outline: 'none',

                  flexShrink: 0,

                  maxWidth: '120px',

                  textOverflow: 'ellipsis',

                  whiteSpace: 'nowrap',

                  overflow: 'hidden',

                  appearance: 'none',

                  backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'6\' height=\'6\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")',

                  backgroundRepeat: 'no-repeat',

                  backgroundPosition: 'right 4px center',

                }}

              >

                {dropdownStages.map((stage, idx) => (

                  <option key={idx} value={stage.name} style={{ backgroundColor: '#5c3720', color: '#fff' }}>

                    {stage.description}

                  </option>

                ))}

              </select>

            </div>

          )}

        </div>

      </div>



      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

        {hasTour && (

          <button

            onClick={handleReplayTour}

            style={{

              background: 'none',

              border: 'none',

              color: '#fff',

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              padding: '4px',

              width: '32px',

              height: '32px',

              borderRadius: '8px'

            }}

            title="Hướng dẫn sử dụng"

          >

            <HelpCircle size={22} />

          </button>

        )}

        <button

          id="header-notification-btn"

          onClick={toggleNotification}

          style={{

            background: 'none',

            border: 'none',

            color: '#fff',

            position: 'relative',

            cursor: 'pointer',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            padding: '4px',

            width: '32px',

            height: '32px',

            borderRadius: '8px'

          }}

        >

          <Bell size={22} />

          {/* Notification Badge - Hiển thị số lượng tin mới */}

          {unreadCount > 0 && (

            <span

              className="notification-badge"

              style={{

                position: 'absolute',

                top: -2,

                right: -2,

                minWidth: '16px',

                height: '16px',

                backgroundColor: '#ef4444',

                color: '#fff',

                borderRadius: '50%',

                fontSize: '9px',

                fontWeight: '800',

                display: 'flex',

                alignItems: 'center',

                justifyContent: 'center',

                padding: '0',

                border: '1.5px solid var(--primary-color)',

                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'

              }}

            >

              {unreadCount > 9 ? '9+' : unreadCount}

            </span>

          )}

        </button>

        <button

          id="header-scanner-btn"

          onClick={() => setIsScannerOpen(true)}

          style={{

            background: 'none',

            border: 'none',

            color: '#fff',

            cursor: 'pointer',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            padding: '4px',

            width: '32px',

            height: '32px',

            borderRadius: '8px'

          }}

        >

          <ScanLine size={22} />

        </button>

      </div>



      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onResult={handleScanResult}
      />



      {/* [NEW] Profile Card hiển thị khi SX bấm vào icon User */}

      {showProfile && <UserProfileCard onClose={() => setShowProfile(false)} />}

    </header>

  )

}



export default PageHeader


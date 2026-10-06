import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import useAuthStore from '@modules/auth/Models/authModel';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server.browser';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Boxes,
  Package,
  CheckCircle2,
  Printer,
  ChevronDown,
  X,
  RotateCcw,
  History,
  FileText,
  Search,
  Plus,
  Trash2,
  Calendar,
  User,
  Eye,
  ArrowRight,
  Sparkles,
  Layers,
  QrCode,
  XCircle,
  MoreVertical,
  Copy,
  Edit3,
  Volume2,
  VolumeX,
  Camera,
  Barcode,
  ScanLine,
  Clock,
  ArrowLeft,
  Check,
  Zap,
  AlertTriangle
} from 'lucide-react';

// Chuẩn hóa mã quét về tiếng Anh ASCII không dấu (chuẩn như CheckPalletV1View)
const normalizeToEnglishBarcode = (raw) => {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/[ưƯừỪứỨửỬữỮựỰ]/g, 'W');
  str = str.replace(/[đĐ]/g, 'D');
  str = str
    .replace(/[àáạảãâầấậẩẫăằắặẳẵÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
    .replace(/[èéẹẻẽêềếệểễÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E')
    .replace(/[ìíịỉĩÌÍỊỈĨ]/g, 'I')
    .replace(/[òóọỏõôồốộổỗơờớợởỡÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O')
    .replace(/[ùúụủũÙÚỤỦŨ]/g, 'U')
    .replace(/[ỳýỵỷỹỲÝỴỶỸ]/g, 'Y');
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-');
  str = str.toUpperCase().replace(/[\s\r\n\t]/g, '');

  const parts = str.split('-');
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1];
    if (tail.length >= 2) {
      const ghostRegex = new RegExp('^\\d*' + tail + '(?=[A-Z0-9]+-)');
      if (ghostRegex.test(str)) {
        str = str.replace(ghostRegex, '');
      }
    }
  }
  return str;
};

// ─── CÁC LỰA CHỌN CÁCH KIỂM TRA VÀ CÔNG ĐOẠN (THEO CHỈ ĐẠO CỦA USER & HỆ THỐNG G7) ───
const INSPECT_METHODS = [
  'Kiểm tra thành phẩm',
  'Kiểm tra mẫu lần đầu',
  'Kiểm tra lại',
  'Kiểm tra thông số',
  'Kiểm tra quy trình',
  'Vấn đáp',
  'Ghi nhận lỗi hằng ngày'
];

const STAGE_OPTIONS = [
  'Đóng gói thành phẩm',
  'Chọn công đoạn',
  'Nhập Kho/Đầu Vào',
  'Tạo Phôi',
  'Định Hình',
  'Lắp Ráp',
  'Sơn',
  'Đóng Gói'
];

// ─── DỮ LIỆU MẪU PO VÀ SẢN PHẨM TỦ THÙNG (TEST DATA) ───
const SAMPLE_PO_DATA = [
  {
    poCode: 'APT-0102',
    factory: 'VINA G7',
    dateLoading: '01/10/2026',
    container: 'JXLU 4380450',
    products: [
      {
        id: 'p-42-woa',
        name: '2-42-WOA',
        mainSku: '2-42-WOA',
        boxesCount: 5,
        defaultBoxes: [
          { boxIndex: 1, sku: '2-42-WOA', name: 'Thùng 1/5' },
          { boxIndex: 2, sku: '2-42-WOA', name: 'Thùng 2/5' },
          { boxIndex: 3, sku: '2-42-WOA', name: 'Thùng 3/5' },
          { boxIndex: 4, sku: '2-42-WOA', name: 'Thùng 4/5' },
          { boxIndex: 5, sku: '42-42-WOA', name: 'Thùng 5/5' }
        ]
      },
      {
        id: 'p-60-wht',
        name: '2-60-WHT',
        mainSku: '2-60-WHT',
        boxesCount: 5,
        defaultBoxes: [
          { boxIndex: 1, sku: '2-60-WHT', name: 'Thùng 1/5' },
          { boxIndex: 2, sku: '2-60-WHT', name: 'Thùng 2/5' },
          { boxIndex: 3, sku: '2-60-WHT', name: 'Thùng 3/5' },
          { boxIndex: 4, sku: '2-60-WHT', name: 'Thùng 4/5' },
          { boxIndex: 5, sku: '2-60-WHT', name: 'Thùng 5/5' }
        ]
      },
      {
        id: 'p-72d-woa',
        name: '1-72D-WOA',
        mainSku: '1-72D-WOA',
        boxesCount: 4,
        defaultBoxes: [
          { boxIndex: 1, sku: '1-72D-WOA', name: 'Thùng 1/4' },
          { boxIndex: 2, sku: '1-72D-WOA', name: 'Thùng 2/4' },
          { boxIndex: 3, sku: '1-72D-WOA', name: 'Thùng 3/4' },
          { boxIndex: 4, sku: '1-72D-WOA', name: 'Thùng 4/4' }
        ]
      }
    ]
  },
  {
    poCode: 'APT-0103',
    factory: 'VINA G7',
    dateLoading: '01/10/2026',
    container: 'MRKU 2939500',
    products: [
      {
        id: 'p-48-san',
        name: '19-48-SAN',
        mainSku: '19-48-SAN',
        boxesCount: 3,
        defaultBoxes: [
          { boxIndex: 1, sku: '19-48-SAN', name: 'Thùng 1/3' },
          { boxIndex: 2, sku: '19-48-SAN', name: 'Thùng 2/3' },
          { boxIndex: 3, sku: '19-48-SAN', name: 'Thùng 3/3' }
        ]
      },
      {
        id: 'p-36s-blk',
        name: '1-36S-BLK',
        mainSku: '1-36S-BLK',
        boxesCount: 2,
        defaultBoxes: [
          { boxIndex: 1, sku: '1-36S-BLK', name: 'Thùng 1/2' },
          { boxIndex: 2, sku: '1-36S-BLK', name: 'Thùng 2/2' }
        ]
      }
    ]
  },
  {
    poCode: 'APT-122-36',
    factory: 'VINA G7',
    dateLoading: '30/09/2026',
    container: 'ZCSU 7206668',
    products: [
      {
        id: 'p-42-bro',
        name: '2-42-BRO',
        mainSku: '2-42-BRO',
        boxesCount: 5,
        defaultBoxes: [
          { boxIndex: 1, sku: '2-42-BRO', name: 'Thùng 1/5' },
          { boxIndex: 2, sku: '2-42-BRO', name: 'Thùng 2/5' },
          { boxIndex: 3, sku: '2-42-BRO', name: 'Thùng 3/5' },
          { boxIndex: 4, sku: '2-42-BRO', name: 'Thùng 4/5' },
          { boxIndex: 5, sku: '2-42-BRO', name: 'Thùng 5/5' }
        ]
      }
    ]
  },
  {
    poCode: 'PO-2026-88',
    factory: 'G7 SmartFlow',
    dateLoading: '01/10/2026',
    container: 'OOCU 8848555',
    products: [
      {
        id: 'p-42-woa-88',
        name: '2-42-WOA',
        mainSku: '2-42-WOA',
        boxesCount: 5,
        defaultBoxes: [
          { boxIndex: 1, sku: '2-42-WOA', name: 'Thùng 1/5' },
          { boxIndex: 2, sku: '2-42-WOA', name: 'Thùng 2/5' },
          { boxIndex: 3, sku: '2-42-WOA', name: 'Thùng 3/5' },
          { boxIndex: 4, sku: '2-42-WOA', name: 'Thùng 4/5' },
          { boxIndex: 5, sku: '42-42-WOA', name: 'Thùng 5/5' }
        ]
      }
    ]
  },
  {
    poCode: 'PO-VINA-092',
    factory: 'VINA G7',
    dateLoading: '01/10/2026',
    container: 'MEDU 4727048',
    products: [
      {
        id: 'p-60-wht-092',
        name: '2-60-WHT',
        mainSku: '2-60-WHT',
        boxesCount: 5,
        defaultBoxes: [
          { boxIndex: 1, sku: '2-60-WHT', name: 'Thùng 1/5' },
          { boxIndex: 2, sku: '2-60-WHT', name: 'Thùng 2/5' },
          { boxIndex: 3, sku: '2-60-WHT', name: 'Thùng 3/5' },
          { boxIndex: 4, sku: '2-60-WHT', name: 'Thùng 4/5' },
          { boxIndex: 5, sku: '2-60-WHT', name: 'Thùng 5/5' }
        ]
      }
    ]
  }
];

const STORAGE_KEY = 'smartflow_cabinet_box_check_history_v1';

// Tạo mã phiếu tự động theo định dạng KT086880
const generateTicketCode = () => {
  const randNum = Math.floor(100000 + Math.random() * 900000);
  return `KT${randNum}`;
};

const CheckCabinetBoxView = () => {
  const { user } = useAuthStore();
  const operatorName = user?.full_name || user?.username || 'Administrator';

  // ─── HAI Ô LỰA CHỌN TRÊN CÙNG (HÌNH 1, 2, 3) ───
  const [inspectMethod, setInspectMethod] = useState('Kiểm tra thành phẩm');
  const [showInspectMethodDropdown, setShowInspectMethodDropdown] = useState(false);

  const [stage, setStage] = useState('Đóng gói thành phẩm');
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  // ─── TAB CHÍNH: 'create' (Tạo phiếu & Kiểm tra) | 'history' (Lịch sử) ───
  const [activeTab, setActiveTab] = useState('create');

  // Mã phiếu hiện tại
  const [ticketCode, setTicketCode] = useState(() => generateTicketCode());

  // Chọn PO (mặc định chưa chọn để người dùng tự chọn)
  const [selectedPo, setSelectedPo] = useState('');
  const [showPoDropdown, setShowPoDropdown] = useState(false);
  const [poSearchText, setPoSearchText] = useState('');

  // Dropdown chọn mã SKU & Tìm kiếm/Gợi ý SKU
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [skuSearchText, setSkuSearchText] = useState('');

  // Danh sách các thùng được thêm lần lượt
  const [boxList, setBoxList] = useState([]);

  // Index của thùng đang mở menu 3 chấm dọc
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);

  // Index của thùng đang mở menu đổi SKU
  const [editingBoxIndex, setEditingBoxIndex] = useState(null);

  // Đóng menu khi người dùng chạm ra ngoài
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuIndex(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Popup xác nhận kiểm tra
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  // Modal xem trước tem in khổ 56mm
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    ticket: null,
    currentBoxIndex: 0
  });

  // Modal thông báo và xác nhận hủy
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Lịch sử kiểm tra (Mỗi thùng là 1 thẻ phiếu độc lập - tự động chuẩn hóa từ localStorage)
  const [historyList, setHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      const flattened = [];
      parsed.forEach(item => {
        if (Array.isArray(item.boxes) && item.boxes.length > 1) {
          item.boxes.forEach((b, bIdx) => {
            const boxNum = b.boxIndex || (bIdx + 1);
            flattened.push({
              ...item,
              id: `${item.ticketCode}-${boxNum}`,
              ticketCode: `${item.ticketCode}-${String(boxNum).padStart(2, '0')}`,
              parentTicketCode: item.ticketCode,
              boxIndex: boxNum,
              totalBoxes: item.boxes.length,
              boxName: b.name || `Thùng #${boxNum}/${item.boxes.length}`,
              sku: b.sku,
              mainSku: b.sku,
              productName: b.sku,
              boxes: [{ ...b, boxIndex: boxNum }],
              status: b.scanned ? 'verified' : (item.status === 'verified' ? 'verified' : 'unverified')
            });
          });
        } else {
          flattened.push({
            ...item,
            sku: item.sku || item.boxes?.[0]?.sku || item.mainSku,
            boxName: item.boxName || (item.boxIndex ? `Thùng #${item.boxIndex}/${item.totalBoxes || 1}` : 'Thùng hàng')
          });
        }
      });
      return flattened;
    } catch (e) {
      console.warn('Lỗi đọc lịch sử kiểm tra tủ thùng:', e);
      return [];
    }
  });

  // ─── CHẾ ĐỘ QUÉT KIỂM TRA PHIẾU (NHƯ KIỂM TRA PALLET V1 - KHÔNG LPN, KHÔNG PALLET ĐỨNG/TOP NÓC, CHỈ CÓ SKU) ───
  const [inspectingTicket, setInspectingTicket] = useState(null);
  const [inputMode, setInputMode] = useState('scanner'); // 'scanner' | 'camera'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualScanInput, setManualScanInput] = useState('');
  const [scanPopup, setScanPopup] = useState(null); // { type: 'success' | 'error' | 'complete', title, message, code }

  // Camera hook state (không mở sẵn, người dùng bấm mới mở)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const html5QrCodeRef = useRef(null);
  const lastCameraScannedRef = useRef('');

  // Hardware barcode scanner buffer
  const hiddenScannerInputRef = useRef(null);
  const scannerBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const lastProcessedTimeRef = useRef(0);

  // ─── HỆ THỐNG ÂM THANH BÍP & CÒI BÁO ĐỘNG (CHUẨN CHECK PALLET V1) ───
  const playSuccessBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60);
      }
    } catch (err) {
      console.warn('Không thể phát âm thanh thành công:', err);
    }
  }, [soundEnabled]);

  const playAlertSound = useCallback((repeatTimes = 3) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      for (let i = 0; i < repeatTimes; i++) {
        const startTime = ctx.currentTime + (i * 0.28);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, startTime);
        osc.frequency.exponentialRampToValueAtTime(520, startTime + 0.18);

        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 150, 300, 150, 500]);
      }
    } catch (err) {
      console.warn('Không thể phát còi báo động:', err);
    }
  }, [soundEnabled]);

  // ─── HỆ THỐNG GIỌNG NÓI TIẾNG VIỆT TEXT-TO-SPEECH (CHUẨN CHECK PALLET V1) ───
  const speakText = useCallback((text) => {
    if (!soundEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi') || (v.name && v.name.toLowerCase().includes('vietnam')));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Không thể phát giọng nói:', err);
    }
  }, [soundEnabled]);

  // Tự động tắt banner thông báo quét: 3.5s cho lỗi/hú còi, 1.3s cho đúng mã
  useEffect(() => {
    if (!scanPopup) return;
    const duration = scanPopup.type === 'error' ? 3500 : 1300;
    const timer = setTimeout(() => {
      setScanPopup(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [scanPopup]);

  // Mở màn hình quét kiểm tra cho một phiếu
  const openInspectTicket = useCallback((ticket) => {
    if (!ticket) return;
    const rawBoxes = Array.isArray(ticket.boxes) ? ticket.boxes : [];
    const normalizedBoxes = rawBoxes.map((b, idx) => ({
      ...b,
      boxIndex: b.boxIndex || (idx + 1),
      sku: b.sku || '',
      scanned: !!b.scanned,
      scannedAt: b.scannedAt || null
    }));
    setInspectingTicket({
      ...ticket,
      boxes: normalizedBoxes,
      status: ticket.status || 'unverified'
    });
    setInputMode('scanner');
    setIsCameraRunning(false);
    setManualScanInput('');
    setScanPopup(null);
  }, []);

  // Xử lý khi quét mã (kiểm tra SKU khớp danh sách thùng)
  const handleVerifyScannedCode = useCallback((rawScanned) => {
    if (!rawScanned) return;
    const cleanRaw = normalizeToEnglishBarcode(rawScanned);
    if (!cleanRaw) return;

    const norm = (s) => (s || '').toUpperCase().replace(/[\s\-_]/g, '');

    // Trích xuất mã SKU (hỗ trợ mã từ QR in tem: KT...|BOX:...|SKU:...|PO:... hoặc mã vạch SKU dán trên kiện hàng)
    let targetSku = cleanRaw;
    const skuMatch = cleanRaw.match(/SKU:([^|]+)/i);
    if (skuMatch && skuMatch[1]) {
      targetSku = skuMatch[1].trim();
    }
    const cleanCompare = norm(targetSku);

    // Nếu chưa ở trong chế độ kiểm tra mà quét trúng mã phiếu KT... hoặc quét trực tiếp mã SKU bên ngoài
    if (!inspectingTicket) {
      const scannedUpper = cleanRaw.toUpperCase();
      // 1. Khớp mã phiếu KT...
      const matched = (historyList || []).find(it =>
        it.ticketCode && (scannedUpper.includes(it.ticketCode.toUpperCase()) || it.ticketCode.toUpperCase().includes(scannedUpper))
      );
      if (matched) {
        openInspectTicket(matched);
        playSuccessBeep();
        speakText(`Đã mở phiếu ${matched.ticketCode}`);
        return;
      }

      // 2. Quét trực tiếp mã SKU bên ngoài lịch sử: tìm thẻ thùng chưa kiểm tra khớp mã
      const targetCard = (historyList || []).find(it => {
        if (it.status === 'verified') return false;
        const normCardSku = norm(it.sku || it.boxes?.[0]?.sku);
        return cleanCompare === normCardSku || cleanCompare.includes(normCardSku) || normCardSku.includes(cleanCompare);
      });

      if (targetCard) {
        const verifiedCard = {
          ...targetCard,
          status: 'verified',
          verifiedAt: new Date().toLocaleString('vi-VN'),
          boxes: (targetCard.boxes || []).map(b => ({ ...b, scanned: true, scannedAt: new Date().toLocaleTimeString('vi-VN') }))
        };
        setHistoryList(prev => {
          const nextList = (Array.isArray(prev) ? prev : []).map(c =>
            (c.id === targetCard.id || c.ticketCode === targetCard.ticketCode) ? verifiedCard : c
          );
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList)); } catch (e) {}
          return nextList;
        });
        playSuccessBeep();
        speakText(`Đúng mã, ${targetCard.sku || targetSku}. Đã kiểm tra đạt chuẩn.`);
        setScanPopup({
          type: 'complete',
          title: 'ĐÃ KIỂM TRA THÙNG HÀNG',
          message: `Phiếu [${targetCard.ticketCode}] - SKU: ${targetCard.sku} đã chuyển sang Đã kiểm tra.`,
          code: targetCard.sku
        });
        return;
      }

      // Quét không khớp phiếu nào
      playAlertSound(3);
      speakText('Sai mã sản phẩm! Không tìm thấy phiếu kiểm tra phù hợp!');
      setScanPopup({
        type: 'error',
        title: 'CẢNH BÁO SAI MÃ',
        message: `Mã [${targetSku}] không khớp với phiếu chờ kiểm tra nào trong danh sách!`,
        code: targetSku
      });
      return;
    }

    const currentBoxes = Array.isArray(inspectingTicket.boxes) ? [...inspectingTicket.boxes] : [];

    // Tìm thùng CHƯA quét có mã SKU khớp
    const matchIdx = currentBoxes.findIndex(b => {
      if (b.scanned) return false;
      const bNorm = norm(b.sku);
      return bNorm === cleanCompare || bNorm.includes(cleanCompare) || cleanCompare.includes(bNorm);
    });

    if (matchIdx !== -1) {
      // Đúng mã SKU!
      const matchedBox = currentBoxes[matchIdx];
      currentBoxes[matchIdx] = {
        ...matchedBox,
        scanned: true,
        scannedAt: new Date().toLocaleTimeString('vi-VN')
      };

      const allDone = currentBoxes.every(b => b.scanned);
      const updatedTicket = {
        ...inspectingTicket,
        boxes: currentBoxes,
        status: allDone ? 'verified' : (inspectingTicket.status || 'unverified'),
        verifiedAt: allDone ? new Date().toLocaleString('vi-VN') : inspectingTicket.verifiedAt
      };

      setInspectingTicket(updatedTicket);

      // Cập nhật lại vào lịch sử lưu trữ
      setHistoryList(prev => {
        const nextList = (Array.isArray(prev) ? prev : []).map(item =>
          item.id === updatedTicket.id || item.ticketCode === updatedTicket.ticketCode ? updatedTicket : item
        );
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
        } catch (e) {}
        return nextList;
      });

      playSuccessBeep();

      if (allDone) {
        speakText('Kiểm tra phiếu hoàn tất!');
        setScanPopup({
          type: 'complete',
          title: 'HOÀN TẤT KIỂM TRA PHIẾU!',
          message: `Đã quét đủ ${currentBoxes.length}/${currentBoxes.length} thùng hàng. Phiếu chuyển trạng thái Đã kiểm tra.`,
          code: matchedBox.sku
        });
      } else {
        speakText(`Đúng mã, ${matchedBox.sku}`);
        setScanPopup({
          type: 'success',
          title: 'ĐÚNG MÃ SKU',
          message: `Khớp thùng #${matchedBox.boxIndex || (matchIdx + 1)} (${matchedBox.sku})`,
          code: matchedBox.sku
        });
      }
    } else {
      // Không có thùng chưa quét nào khớp -> Kiểm tra xem mã này đã quét đủ trước đó hay sai hoàn toàn
      const alreadyScanned = currentBoxes.some(b => {
        const bNorm = norm(b.sku);
        return bNorm === cleanCompare || bNorm.includes(cleanCompare);
      });

      if (alreadyScanned) {
        playAlertSound(2);
        speakText('Mã này đã quét đủ rồi!');
        setScanPopup({
          type: 'error',
          title: 'MÃ ĐÃ QUÉT ĐỦ',
          message: `Mã [${targetSku}] đã quét đủ số lượng trong phiếu, không quét lại.`,
          code: targetSku
        });
      } else {
        // Sai mã hoàn toàn: Hú còi 3 lần, giọng đọc cảnh báo, rung
        playAlertSound(3);
        speakText('Sai mã sản phẩm! Mã không trùng khớp với phiếu!');
        setScanPopup({
          type: 'error',
          title: 'CẢNH BÁO SAI MÃ SẢN PHẨM!',
          message: `Mã [${targetSku}] KHÔNG thuộc danh sách thùng của phiếu kiểm tra này!`,
          code: targetSku
        });
      }
    }
  }, [inspectingTicket, historyList, openInspectTicket, playSuccessBeep, playAlertSound, speakText]);

  // Quản lý Camera bằng html5-qrcode
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Lỗi dừng camera:', err);
      } finally {
        html5QrCodeRef.current = null;
        setIsCameraActive(false);
        setTorchOn(false);
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    await stopCamera();
    try {
      const scanner = new Html5Qrcode('cabinet-camera-reader');
      html5QrCodeRef.current = scanner;
      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!decodedText) return;
          const now = Date.now();
          if (decodedText === lastCameraScannedRef.current && now - lastProcessedTimeRef.current < 1200) {
            return;
          }
          lastCameraScannedRef.current = decodedText;
          lastProcessedTimeRef.current = now;
          handleVerifyScannedCode(decodedText);
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Lỗi khởi động camera:', err);
      setIsCameraActive(false);
    }
  }, [stopCamera, handleVerifyScannedCode]);

  const toggleTorch = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } catch (err) {
        console.warn('Không thể bật/tắt đèn flash:', err);
      }
    }
  };

  useEffect(() => {
    if (inspectingTicket && inputMode === 'camera' && isCameraRunning) {
      const t = setTimeout(() => {
        startCamera();
      }, 120);
      return () => {
        clearTimeout(t);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [inspectingTicket, inputMode, isCameraRunning, startCamera, stopCamera]);

  // Luôn giữ focus ngầm cho máy quét khi đang kiểm tra
  useEffect(() => {
    if (inspectingTicket && inputMode === 'scanner') {
      const focusScanner = () => {
        if (hiddenScannerInputRef.current) {
          try {
            hiddenScannerInputRef.current.focus({ preventScroll: true });
          } catch (_) {}
        }
      };
      focusScanner();
      const interval = setInterval(focusScanner, 2000);
      window.addEventListener('click', focusScanner);
      return () => {
        clearInterval(interval);
        window.removeEventListener('click', focusScanner);
      };
    }
  }, [inspectingTicket, inputMode]);

  // Bắt tia súng quét qua sự kiện bàn phím toàn cục
  useEffect(() => {
    if (!inspectingTicket || inputMode !== 'scanner') return;

    const handleKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isManualInput = document.activeElement && document.activeElement.getAttribute('data-manual-scan') === 'true';
      if (activeTag === 'input' && !isManualInput && document.activeElement !== hiddenScannerInputRef.current) {
        return;
      }

      if (e.key === 'Enter') {
        const val = scannerBufferRef.current.trim();
        scannerBufferRef.current = '';
        if (val.length >= 2) {
          handleVerifyScannedCode(val);
        }
        return;
      }

      if (e.key && e.key.length === 1) {
        const now = Date.now();
        if (now - lastKeyTimeRef.current > 400) {
          scannerBufferRef.current = '';
        }
        lastKeyTimeRef.current = now;
        scannerBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingTicket, inputMode, handleVerifyScannedCode]);

  // Chọn PO -> Reset danh sách thùng để người dùng bắt đầu lượt mới
  const handleSelectPo = (poCode) => {
    setSelectedPo(poCode);
    setShowPoDropdown(false);
    setShowProductDropdown(false);
    setSkuSearchText('');
    setBoxList([]);
    setEditingBoxIndex(null);
  };

  // Thêm 1 thùng khi chọn mã SKU từ dropdown
  const handleAddBoxWithSku = (skuCode) => {
    setShowProductDropdown(false);
    const nextIdx = (Array.isArray(boxList) ? boxList.length : 0) + 1;
    const newBox = {
      boxIndex: nextIdx,
      sku: skuCode,
      name: `Thùng #${nextIdx}`,
      id: `${ticketCode}-B${nextIdx}`
    };
    setBoxList(prev => [...(Array.isArray(prev) ? prev : []), newBox]);
  };

  // Nhân bản thùng: Hàng 1 có mà bấm dấu [+] thì hàng 2 y hệt hàng 1
  const handleDuplicateBox = (index) => {
    const currentList = Array.isArray(boxList) ? boxList : [];
    const sourceBox = currentList[index];
    if (!sourceBox) return;

    const nextIdx = currentList.length + 1;
    const newBox = {
      boxIndex: nextIdx,
      sku: sourceBox.sku, // Y hệt hàng vừa bấm dấu [+]
      name: `Thùng #${nextIdx}`,
      id: `${ticketCode}-B${nextIdx}`
    };

    setBoxList(prev => [...(Array.isArray(prev) ? prev : []), newBox]);
  };

  // Đổi SKU của một hàng (hoặc chọn lại thùng khác)
  const handleSelectSkuForBox = (index, newSku) => {
    setBoxList(prev => {
      if (!Array.isArray(prev)) return [];
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], sku: newSku };
      }
      return next;
    });
    setEditingBoxIndex(null);
  };

  // Nút HỦY: Reset phiếu hoặc hỏi xác nhận làm mới danh sách
  const handleResetTicket = () => {
    const currentLen = Array.isArray(boxList) ? boxList.length : 0;
    if (currentLen > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Xác nhận hủy',
        message: 'Bạn có chắc chắn muốn hủy và làm mới toàn bộ danh sách các thùng đã thêm?',
        onConfirm: () => {
          const newCode = generateTicketCode();
          setTicketCode(newCode);
          setBoxList([]);
          setEditingBoxIndex(null);
        }
      });
    } else {
      const newCode = generateTicketCode();
      setTicketCode(newCode);
      setBoxList([]);
      setEditingBoxIndex(null);
    }
  };

  // Xóa thùng (cho phép xóa tự do, tự động đánh lại thứ tự)
  const handleDeleteBox = (index) => {
    setBoxList(prev => {
      if (!Array.isArray(prev)) return [];
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((b, idx) => ({
        ...b,
        boxIndex: idx + 1,
        name: `Thùng #${idx + 1}`,
        id: `${ticketCode}-B${idx + 1}`
      }));
    });
    setEditingBoxIndex(null);
  };

  // Bấm nút "Tạo tem nhãn" -> Mở popup xác nhận đọc thông tin
  const handleOpenConfirmPopup = () => {
    if (!selectedPo) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Chưa chọn PO',
        message: 'Vui lòng chọn mã PO trước khi tạo tem nhãn.'
      });
      return;
    }
    const currentLen = Array.isArray(boxList) ? boxList.length : 0;
    if (currentLen === 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Danh sách thùng trống',
        message: 'Vui lòng chọn Tên sản phẩm (SKU) để thêm ít nhất 1 thùng vào danh sách.'
      });
      return;
    }
    setShowConfirmPopup(true);
  };

  // ─── HÀM IN NHIỆT KHỔ 56MM (CHUẨN THEO ẢNH 2 - KHÔNG CÓ PALLET ĐỨNG & KHÔNG CÓ LPN) ───
  const executeThermalPrint = useCallback((ticketData) => {
    if (!ticketData) return;
    const rawBoxes = (Array.isArray(ticketData.boxes) && ticketData.boxes.length > 0)
      ? ticketData.boxes
      : (ticketData.sku ? [{ sku: ticketData.sku, boxIndex: ticketData.boxIndex || 1 }] : []);
    if (rawBoxes.length === 0) return;

    const totalBoxes = ticketData.totalBoxes || rawBoxes.length;
    const nowTimeStr = ticketData.timestamp || new Date().toLocaleString('vi-VN');

    // Tạo HTML cho từng tem in (mỗi thùng 1 tem khổ 56mm)
    const labelsHtml = rawBoxes.map((b, idx) => {
      const boxNum = b.boxIndex || (idx + 1);
      const boxUniqueId = (ticketData.ticketCode && ticketData.ticketCode.includes('-'))
        ? ticketData.ticketCode
        : `${ticketData.ticketCode || 'KT'}-${String(boxNum).padStart(2, '0')}`;
      
      const qrValue = `${ticketData.ticketCode || boxUniqueId}|BOX:${boxNum}/${totalBoxes}|SKU:${b.sku || ''}|PO:${ticketData.poCode || ''}`;

      // Tạo mã QR Code dạng SVG sắc nét bằng QRCodeSVG (100% không bị mất, không phụ thuộc DOM)
      let qrSvgMarkup = '';
      try {
        qrSvgMarkup = renderToStaticMarkup(
          <QRCodeSVG
            value={qrValue}
            size={145}
            level="M"
          />
        );
      } catch (e) {
        console.warn('Lỗi tạo QRCodeSVG:', e);
      }

      return `
        <div class="ticket-page">
          <div class="ticket-code">${boxUniqueId}</div>
          <div class="box-order">SKU: ${b.sku}</div>

          <div class="dash-line"></div>

          <div class="meta-row">
            <span>Thời gian:</span>
            <strong>${nowTimeStr}</strong>
          </div>
          <div class="meta-row">
            <span>Người kiểm:</span>
            <strong>${ticketData.inspector || operatorName}</strong>
          </div>
          <div class="meta-row">
            <span>Mã PO:</span>
            <strong>${ticketData.poCode || ''}</strong>
          </div>

          <div class="dash-line"></div>

          <div class="qr-container">
            ${qrSvgMarkup}
            <div class="qr-subtext">Quét mã QR để mở lại thông tin thùng</div>
          </div>

          <div class="dash-line"></div>
          <div class="footer-brand">G7 SmartFlow • Kiểm Tra Tủ Thùng</div>
        </div>
      `;
    }).join('');

    const fullPrintDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Phiếu Kiểm Tra Tủ Thùng - ${ticketData.ticketCode}</title>
        <style>
          @page {
            size: 56mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            width: 56mm;
            margin: 0 auto;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.3;
          }
          .ticket-page {
            width: 56mm;
            padding: 6px 5px;
            page-break-after: always;
            border-bottom: 1px dashed #ccc;
          }
          .tag-title {
            text-align: center;
            font-size: 17px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #000;
            margin-top: 2px;
          }
          .ticket-code {
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            font-family: Consolas, monospace;
            margin-top: 3px;
            color: #000;
          }
          .box-order {
            text-align: center;
            font-size: 12px;
            font-weight: 800;
            margin-top: 1px;
            color: #333;
          }
          .dash-line {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            line-height: 1.35;
          }
          .meta-row span {
            color: #333;
          }
          .meta-row strong {
            color: #000;
            font-weight: 700;
          }
          .qr-container {
            text-align: center;
            margin: 6px 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .qr-container svg, .qr-container img {
            width: 145px;
            height: 145px;
            margin: 0 auto;
            display: block;
          }
          .qr-subtext {
            font-size: 8px;
            color: #555;
            margin-top: 3px;
          }
          .sec-header {
            font-size: 11px;
            font-weight: 900;
            color: #111;
            text-transform: uppercase;
            margin: 3px 0 2px 0;
          }
          .sku-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2px 0;
          }
          .sku-code {
            font-family: Consolas, monospace;
            font-weight: 900;
            font-size: 16px;
            color: #000;
          }
            font-weight: 800;
            color: #111;
          }
          .sku-qty {
            font-weight: 800;
            color: #222;
          }
          .box-note {
            font-size: 8.5px;
            color: #666;
            font-style: italic;
          }
          .footer-brand {
            text-align: center;
            font-size: 8.5px;
            color: #777;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `;

    // 1. Nếu trên máy POS Android có cầu AndroidPrint
    if (window.AndroidPrint && window.AndroidPrint.printHtml) {
      window.AndroidPrint.printHtml(fullPrintDoc, `The_Kiem_Tra_${ticketData.ticketCode}`);
      return;
    }

    // 2. Chế độ in iframe tiêu chuẩn cho Web & Mobile
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(fullPrintDoc);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('Lỗi kích hoạt lệnh in:', e);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  }, [operatorName]);

  // Xác nhận từ popup -> Lưu lịch sử từng thùng độc lập & Kích hoạt in tem
  const handleConfirmAndPrint = () => {
    setShowConfirmPopup(false);
    const currentList = Array.isArray(boxList) ? boxList : [];
    if (currentList.length === 0) return;

    const nowStr = new Date().toLocaleString('vi-VN');
    const baseCode = ticketCode;
    const totalCount = currentList.length;

    // Tạo các bản ghi thẻ độc lập cho từng thùng (mỗi thùng là 1 phiếu riêng biệt)
    const newRecords = currentList.map((b, idx) => {
      const boxNum = b.boxIndex || (idx + 1);
      const subTicketCode = `${baseCode}-${String(boxNum).padStart(2, '0')}`;
      return {
        id: `${baseCode}-${boxNum}`,
        ticketCode: subTicketCode,
        parentTicketCode: baseCode,
        boxIndex: boxNum,
        totalBoxes: totalCount,
        boxName: b.name || `Thùng #${boxNum}/${totalCount}`,
        poCode: selectedPo,
        inspectMethod: inspectMethod,
        stage: stage,
        productName: b.sku,
        sku: b.sku,
        mainSku: b.sku,
        boxes: [{
          ...b,
          boxIndex: boxNum,
          scanned: false,
          scannedAt: null
        }],
        inspector: operatorName,
        timestamp: nowStr,
        status: 'unverified' // Mới in xong: Chưa kiểm tra
      };
    });

    // Lưu vào lịch sử (từng thẻ thùng độc lập)
    const updatedHistory = [...newRecords, ...(Array.isArray(historyList) ? historyList : [])];
    setHistoryList(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory.slice(0, 100)));
    } catch (e) {
      console.warn('Lỗi lưu lịch sử:', e);
    }

    // Kích hoạt in tem cho tất cả các thùng vừa tạo
    setTimeout(() => {
      executeThermalPrint({
        ticketCode: baseCode,
        poCode: selectedPo,
        inspector: operatorName,
        timestamp: nowStr,
        inspectMethod: inspectMethod,
        boxes: currentList
      });
    }, 200);

    // Mở modal xem trước tem thùng đầu tiên
    setPreviewModal({
      isOpen: true,
      ticket: {
        ticketCode: baseCode,
        poCode: selectedPo,
        inspector: operatorName,
        timestamp: nowStr,
        boxes: currentList
      },
      currentBoxIndex: 0
    });

    // Reset phiếu để người dùng tạo phiếu khác ngay
    const nextTicketCode = generateTicketCode();
    setTicketCode(nextTicketCode);
    setBoxList([]);
    setEditingBoxIndex(null);
    setSkuSearchText('');
  };

  // Lọc PO theo từ khóa tìm kiếm (chỉ theo mã PO)
  const filteredPoList = SAMPLE_PO_DATA.filter(p =>
    p.poCode.toLowerCase().includes(poSearchText.toLowerCase())
  );

  const poObj = SAMPLE_PO_DATA.find(p => p.poCode === selectedPo);

  // Danh sách các mã SKU có sẵn trong PO được chọn (kể cả các thùng riêng như 42-42-WOA)
  const availableSkus = poObj
    ? [
        ...new Set([
          '7-42-WHT', '7-48-WHT', '7-54-WHT', '7-60-WHT', '7-60D-WHT', '7-66-WHT', '7-66D-WHT',
          ...(poObj.products || []).flatMap(p => [
            p.mainSku,
            ...(p.defaultBoxes || []).map(b => b.sku)
          ])
        ])
      ].filter(Boolean)
    : [
        '7-42-WHT', '7-48-WHT', '7-54-WHT', '7-60-WHT', '7-60D-WHT', '7-66-WHT', '7-66D-WHT',
        '2-42-WOA', '42-42-WOA', '2-60-WHT', '1-72D-WOA'
      ];

  // Lọc và gợi ý danh sách SKU theo từ khóa người dùng nhập
  const filteredSkus = availableSkus.filter(sku =>
    sku.toLowerCase().includes(skuSearchText.trim().toLowerCase())
  );

  // Danh sách các SKU duy nhất đã chọn trong danh sách thùng
  const uniqueSelectedSkus = [...new Set((Array.isArray(boxList) ? boxList : []).map(b => b?.sku).filter(Boolean))];

  // Nhãn hiển thị ô chọn sản phẩm (tủ)
  const selectedProductLabel = useMemo(() => {
    if (uniqueSelectedSkus.length === 0) return 'Chọn sản phẩm (tủ)...';
    if (uniqueSelectedSkus.length === 1) {
      const sku = uniqueSelectedSkus[0];
      const count = (Array.isArray(boxList) ? boxList : []).filter(b => b?.sku === sku).length;
      return count > 1 ? `${sku} (${count} thùng)` : sku;
    }
    return `Đã chọn ${uniqueSelectedSkus.length} sản phẩm (${(Array.isArray(boxList) ? boxList : []).length} thùng)`;
  }, [uniqueSelectedSkus, boxList]);

  // Thao tác tích chọn/bỏ chọn SKU (chuẩn FormMultiSearchSelect như ảnh)
  const handleToggleSkuOption = (skuCode) => {
    const isChecked = uniqueSelectedSkus.includes(skuCode);
    if (isChecked) {
      // Bỏ chọn: xóa các thùng của SKU này
      setBoxList(prev => {
        const filtered = (Array.isArray(prev) ? prev : []).filter(b => b.sku !== skuCode);
        return filtered.map((b, i) => ({
          ...b,
          boxIndex: i + 1,
          name: `Thùng #${i + 1}`,
          id: `${ticketCode}-B${i + 1}`
        }));
      });
    } else {
      // Tích chọn: thêm 1 thùng với SKU này vào danh sách
      handleAddBoxWithSku(skuCode);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="G7 - Smart Flow"
        subTitle="MB31 | Kiểm Tra Tủ Thùng"
      />

      <div style={{
        backgroundColor: '#f8f5ee',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        minHeight: 0,
        padding: '14px 14px 90px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%'
      }}>

        {/* ─── NẾU ĐANG TRONG CHẾ ĐỘ QUÉT KIỂM TRA PHIẾU (NHƯ PALLET V1 - KHÔNG LPN, KHÔNG PALLET ĐỨNG/NÓC, CHỈ CÓ SKU) ─── */}
        {inspectingTicket ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '85px' }}>
            {/* Header thanh điều hướng quay lại */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAF5EE',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #EADCC9'
            }}>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsCameraRunning(false);
                  setInspectingTicket(null);
                }}
                style={{
                  border: 'none',
                  background: '#ffffff',
                  color: '#4A2C1D',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }}
              >
                <ArrowLeft size={16} />
                <span>Quay lại</span>
              </button>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '900',
                  fontFamily: 'Consolas, monospace',
                  color: '#c2410c'
                }}>
                  {inspectingTicket.ticketCode}
                </div>
                <div style={{ fontSize: '11px', color: '#78716c', fontWeight: '700' }}>
                  PO: {inspectingTicket.poCode}
                </div>
              </div>
            </div>

            {/* Thẻ tổng quan tiến độ quét phiếu */}
            {(() => {
              const boxes = Array.isArray(inspectingTicket.boxes) ? inspectingTicket.boxes : [];
              const scannedCount = boxes.filter(b => b.scanned).length;
              const totalCount = boxes.length;
              const isAllDone = totalCount > 0 && scannedCount === totalCount;
              const progressPct = totalCount > 0 ? Math.round((scannedCount / totalCount) * 100) : 0;

              return (
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '14px',
                  border: isAllDone ? '1.5px solid #86efac' : '1px solid #e8e1d5',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={18} color="#7b5233" />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#292524' }}>
                        Tiến độ kiểm tra phiếu
                      </span>
                    </div>

                    {isAllDone ? (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <CheckCircle2 size={13} color="#15803d" />
                        Đã kiểm tra ({scannedCount}/{totalCount})
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={13} color="#64748b" />
                        Chưa kiểm tra ({scannedCount}/{totalCount})
                      </span>
                    )}
                  </div>

                  {/* Thanh Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progressPct}%`,
                      height: '100%',
                      backgroundColor: isAllDone ? '#16a34a' : '#c2410c',
                      borderRadius: '6px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11.5px',
                    color: '#64748b'
                  }}>
                    <span>Đã quét: <strong style={{ color: isAllDone ? '#15803d' : '#0f172a' }}>{scannedCount}/{totalCount} thùng</strong></span>
                    <span>Tỷ lệ khớp: <strong style={{ color: isAllDone ? '#15803d' : '#0f172a' }}>{progressPct}%</strong></span>
                  </div>
                </div>
              );
            })()}

            {/* KHUNG THÔNG TIN ĐỌC MÃ / NGUỒN QUÉT (CHUẨN CHECK PALLET V1) */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #e8e1d5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  color: '#4e3629',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Barcode size={16} color="#7b5233" />
                  <span>THÔNG TIN ĐỌC MÃ / NGUỒN QUÉT</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    border: 'none',
                    background: soundEnabled ? '#e8f5e9' : '#ffebee',
                    color: soundEnabled ? '#2e7d32' : '#c62828',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title={soundEnabled ? 'Đang bật âm thanh cảnh báo' : 'Đã tắt âm thanh cảnh báo'}
                >
                  {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  <span>{soundEnabled ? 'Còi & Giọng: BẬT' : 'Còi & Giọng: TẮT'}</span>
                </button>
              </div>

              {/* Bộ chọn chế độ: Máy quét mã vs Máy ảnh */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                backgroundColor: '#f4ede2',
                padding: '4px',
                borderRadius: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('scanner');
                    stopCamera();
                    setIsCameraRunning(false);
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: inputMode === 'scanner' ? '1.5px solid #7b5233' : '1px solid transparent',
                    backgroundColor: inputMode === 'scanner' ? '#ffffff' : 'transparent',
                    color: inputMode === 'scanner' ? '#5c3a21' : '#8c786a',
                    fontWeight: '800',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: inputMode === 'scanner' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <Barcode size={16} color={inputMode === 'scanner' ? '#7b5233' : '#8c786a'} />
                  <span>Máy quét mã</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputMode('camera');
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: inputMode === 'camera' ? '1.5px solid #7b5233' : '1px solid transparent',
                    backgroundColor: inputMode === 'camera' ? '#ffffff' : 'transparent',
                    color: inputMode === 'camera' ? '#5c3a21' : '#8c786a',
                    fontWeight: '800',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: inputMode === 'camera' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <Camera size={16} color={inputMode === 'camera' ? '#7b5233' : '#8c786a'} />
                  <span>Máy ảnh</span>
                </button>
              </div>

              {/* Input ngầm nhận tia máy quét USB / không dây */}
              <input
                ref={hiddenScannerInputRef}
                type="password"
                autoComplete="new-password"
                tabIndex={-1}
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  pointerEvents: 'none',
                  zIndex: -1
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    const val = (e.target.value || scannerBufferRef.current).trim();
                    e.target.value = '';
                    scannerBufferRef.current = '';
                    if (val && val.length >= 2) {
                      handleVerifyScannedCode(val);
                    }
                  }
                }}
              />

              {/* Chế độ Camera trực tiếp (Đồng bộ chuẩn 100% với CheckPalletV1View & Ảnh 2) */}
              {inputMode === 'camera' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: '#faf7f2',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #eadcc9'
                }}>
                  {/* Header Camera: Camera quét trực tiếp + nút Mở Camera / Tắt Camera */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#4a240e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={16} color="#7b5233" />
                      Camera quét trực tiếp
                    </span>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isCameraActive && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          style={{
                            border: 'none',
                            background: torchOn ? '#fef08a' : '#ede1cf',
                            color: torchOn ? '#854d0e' : '#5c3a21',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Zap size={12} />
                          <span>{torchOn ? 'Tắt Flash' : 'Bật Flash'}</span>
                        </button>
                      )}

                      {!isCameraActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCameraRunning(true);
                            startCamera();
                          }}
                          style={{
                            backgroundColor: '#7b5233',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '5px 14px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Mở Camera
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            setIsCameraRunning(false);
                          }}
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '5px 14px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Tắt Camera
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Vùng Viewfinder hiển thị Camera chuẩn 100% Ảnh 2 */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    minHeight: isCameraActive ? '200px' : '84px',
                    backgroundColor: '#26201a',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div 
                      id="cabinet-camera-reader" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: isCameraActive ? 'block' : 'none' 
                      }} 
                    />

                    {!isCameraActive && (
                      <div style={{
                        color: '#c4b5a5',
                        fontSize: '11px',
                        textAlign: 'center',
                        padding: '16px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%'
                      }}>
                        <Camera size={26} color="#9c8777" />
                        <span style={{ fontWeight: '600' }}>Camera đang tắt. Nhấn "Mở Camera" để quét mã</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chế độ Máy quét mã: Ô nhập tay hoặc quét bằng súng */}
              {inputMode === 'scanner' && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    data-manual-scan="true"
                    value={manualScanInput}
                    onChange={(e) => setManualScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (manualScanInput.trim()) {
                          handleVerifyScannedCode(manualScanInput.trim());
                          setManualScanInput('');
                        }
                      }
                    }}
                    placeholder="Quét mã vạch hoặc nhập mã SKU..."
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #d6d3d1',
                      fontSize: '13px',
                      fontWeight: '700',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualScanInput.trim()) {
                        handleVerifyScannedCode(manualScanInput.trim());
                        setManualScanInput('');
                      }
                    }}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Kiểm tra
                  </button>
                </div>
              )}
            </div>

            {/* DANH SÁCH MÃ SKU CỦA PHIẾU CẦN ĐỐI CHIẾU (3 THÙNG RIÊNG BIỆT, QUÉT LẦN LƯỢT) */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #e8e1d5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{
                fontSize: '12.5px',
                fontWeight: '900',
                color: '#4e3629',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>DANH SÁCH THÙNG CẦN KHỚP ({inspectingTicket.boxes?.length || 0})</span>
                <span style={{ fontSize: '11px', color: '#78716c', fontWeight: '600' }}>
                  Quét lần lượt theo SKU
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(Array.isArray(inspectingTicket.boxes) ? inspectingTicket.boxes : []).map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: b.scanned ? '2px solid #22c55e' : '1.5px solid #e2e8f0',
                      backgroundColor: b.scanned ? '#f0fdf4' : '#ffffff',
                      boxShadow: b.scanned ? '0 2px 6px rgba(34, 197, 94, 0.12)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {b.scanned ? (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#dcfce7',
                          border: '1px solid #86efac',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <CheckCircle2 size={20} color="#16a34a" />
                        </div>
                      ) : (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Package size={17} color="#78716c" />
                        </div>
                      )}

                      <div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: b.scanned ? '#15803d' : '#64748b',
                          textTransform: 'uppercase'
                        }}>
                          Thùng #{b.boxIndex || (idx + 1)} / {inspectingTicket.boxes?.length}
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '900',
                          fontFamily: 'Consolas, monospace',
                          color: b.scanned ? '#15803d' : '#0f172a',
                          letterSpacing: '0.3px',
                          marginTop: '2px'
                        }}>
                          {b.sku}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {b.scanned ? (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: '#bbf7d0',
                          color: '#15803d',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Check size={12} />
                          {b.scannedAt || 'ĐÃ KHỚP'}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={12} color="#64748b" />
                          CHỜ QUÉT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2 NÚT HÀNH ĐỘNG CỐ ĐỊNH Ở DƯỚI KHÔNG CHO SCROLL BẤT CỨ HOÀN CẢNH NÀO */}
            {/* 2 NÚT HÀNH ĐỘNG CỐ ĐỊNH Ở DƯỚI KHÔNG CHO SCROLL BẤT CỨ HOÀN CẢNH NÀO (CHUẨN FORM MOBILE, KHÔNG BỊ GIÃN RA) */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '450px',
              backgroundColor: '#ffffff',
              borderTop: '1.5px solid #e8e1d5',
              padding: '10px 14px',
              display: 'flex',
              gap: '10px',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
              boxSizing: 'border-box',
              zIndex: 999
            }}>
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Làm mới quét lại?',
                    message: 'Bạn có muốn đặt lại trạng thái kiểm tra của phiếu này về chưa quét?',
                    onConfirm: () => {
                      const resetBoxes = (inspectingTicket.boxes || []).map(b => ({
                        ...b,
                        scanned: false,
                        scannedAt: null
                      }));
                      const resetTicket = {
                        ...inspectingTicket,
                        boxes: resetBoxes,
                        status: 'unverified'
                      };
                      setInspectingTicket(resetTicket);
                      setHistoryList(prev =>
                        (Array.isArray(prev) ? prev : []).map(it =>
                          it.id === resetTicket.id || it.ticketCode === resetTicket.ticketCode ? resetTicket : it
                        )
                      );
                    }
                  });
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1.5px solid #d6d3d1',
                  backgroundColor: '#ffffff',
                  color: '#57534e',
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} />
                <span>Quét lại từ đầu</span>
              </button>

              <button
                type="button"
                onClick={() => executeThermalPrint(inspectingTicket)}
                style={{
                  flex: 1.2,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(123, 82, 51, 0.3)'
                }}
              >
                <Printer size={16} />
                <span>In lại tem</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ─── TAB CHUYỂN ĐỔI: TẠO PHIẾU / LỊCH SỬ KIỂM TRA ─── */}
            <div style={{
              display: 'flex',
              gap: '6px',
              backgroundColor: '#eae3d2',
              padding: '4px',
              borderRadius: '12px'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'create' ? '#ffffff' : 'transparent',
                  color: activeTab === 'create' ? '#4b301e' : '#7c6d5e',
                  boxShadow: activeTab === 'create' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <Boxes size={15} />
                <span>Kiểm Tra Tủ Thùng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
                  color: activeTab === 'history' ? '#4b301e' : '#7c6d5e',
                  boxShadow: activeTab === 'history' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <History size={15} />
                <span>Lịch Sử Kiểm Tra ({Array.isArray(historyList) ? historyList.length : 0})</span>
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                TAB 1: TẠO PHIẾU & KIỂM TRA TỦ THÙNG
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'create' && (
              <>
            {/* ─── HÀNG 1 TRÊN CÙNG: CHỌN CÁCH KIỂM TRA & CÔNG ĐOẠN (CHUẨN ẢNH 1, 2, 3) ─── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px'
            }}>
              {/* Dropdown 1: Chọn cách kiểm tra * */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '800',
                  color: '#4a240e',
                  marginBottom: '5px'
                }}>
                  Chọn cách kiểm tra <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <div
                  onClick={() => {
                    setShowInspectMethodDropdown(!showInspectMethodDropdown);
                    setShowStageDropdown(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #a8a29e',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#1c1917',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {inspectMethod}
                  </span>
                  <ChevronDown size={17} color="#4a240e" style={{ transform: showInspectMethodDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </div>

                {/* Menu sổ xuống Cách kiểm tra */}
                {showInspectMethodDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    minWidth: '180px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d6d3d1',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '6px'
                  }}>
                    {INSPECT_METHODS.map((m) => {
                      const isSel = m === inspectMethod;
                      return (
                        <div
                          key={m}
                          onClick={() => {
                            setInspectMethod(m);
                            setShowInspectMethodDropdown(false);
                          }}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            backgroundColor: isSel ? '#fef3c7' : 'transparent',
                            color: isSel ? '#92400e' : '#1c1917',
                            fontWeight: isSel ? '800' : '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '2px'
                          }}
                        >
                          <span>{m}</span>
                          {isSel && <CheckCircle2 size={15} color="#d97706" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dropdown 2: Công đoạn * */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '800',
                  color: '#4a240e',
                  marginBottom: '5px'
                }}>
                  Công đoạn <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <div
                  onClick={() => {
                    setShowStageDropdown(!showStageDropdown);
                    setShowInspectMethodDropdown(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #a8a29e',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#1c1917',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {stage}
                  </span>
                  <ChevronDown size={17} color="#4a240e" style={{ transform: showStageDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </div>

                {/* Menu sổ xuống Công đoạn */}
                {showStageDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    minWidth: '180px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d6d3d1',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '6px'
                  }}>
                    {STAGE_OPTIONS.map((stg) => {
                      const isSel = stg === stage;
                      return (
                        <div
                          key={stg}
                          onClick={() => {
                            setStage(stg);
                            setShowStageDropdown(false);
                          }}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            backgroundColor: isSel ? '#fef3c7' : 'transparent',
                            color: isSel ? '#92400e' : '#1c1917',
                            fontWeight: isSel ? '800' : '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '2px'
                          }}
                        >
                          <span>{stg}</span>
                          {isSel && <CheckCircle2 size={15} color="#d97706" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ─── CARD 1: THÔNG TIN PHIẾU & CHỌN PO (CHUẨN ẢNH 1) ─── */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid #e8e1d5',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Header phiếu: Phiếu KT170529 | Được tạo bởi: Administrator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{
                    fontSize: '21px',
                    fontWeight: '900',
                    fontStyle: 'italic',
                    color: '#c2410c', // Màu cam nâu đậm chuẩn Hình 1
                    letterSpacing: '0.2px',
                    lineHeight: '1.2'
                  }}>
                    Phiếu: {ticketCode}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontStyle: 'italic',
                    color: '#c2410c',
                    fontWeight: '600',
                    marginTop: '3px'
                  }}>
                    Được tạo bởi: {operatorName}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetTicket}
                  style={{
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fafaf9',
                    color: '#78716c',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Tạo mã phiếu mới"
                >
                  <RotateCcw size={12} />
                  <span>Phiếu mới</span>
                </button>
              </div>

              {/* ─── MỤC 1: CHỌN PO * (CHUẨN FORM HÌNH 1) ─── */}
              <div style={{ position: 'relative' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '800',
                  color: '#1c1917',
                  marginBottom: '6px'
                }}>
                  Chọn PO <span style={{ color: '#dc2626' }}>*</span>
                </label>

                {/* Box chọn PO phong cách Hình 1 */}
                <div
                  onClick={() => setShowPoDropdown(!showPoDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #a8a29e',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <span style={{
                    fontSize: '15px',
                    fontWeight: '800',
                    color: selectedPo ? '#0f172a' : '#9ca3af',
                    fontFamily: selectedPo ? 'Consolas, monospace' : 'inherit'
                  }}>
                    {selectedPo || '— Chọn đơn hàng PO —'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedPo && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPo('');
                          setBoxList([]);
                          setEditingBoxIndex(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                        title="Xóa lựa chọn"
                      >
                        <X size={16} />
                      </span>
                    )}
                    <ChevronDown size={18} color="#64748b" style={{ transform: showPoDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </div>

                {/* Dropdown danh sách PO */}
                {showPoDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid #d6d3d1',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '6px'
                  }}>
                    {/* Ô tìm kiếm PO */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      backgroundColor: '#f5f5f4',
                      borderRadius: '8px',
                      marginBottom: '6px'
                    }}>
                      <Search size={14} color="#78716c" />
                      <input
                        type="text"
                        placeholder="Tìm mã PO..."
                        value={poSearchText}
                        onChange={(e) => setPoSearchText(e.target.value)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          width: '100%',
                          fontSize: '12px',
                          outline: 'none',
                          color: '#1c1917'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {filteredPoList.map((p) => {
                      const isSel = p.poCode === selectedPo;
                      return (
                        <div
                          key={p.poCode}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPo(p.poCode);
                          }}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            backgroundColor: isSel ? '#fef3c7' : 'transparent',
                            color: isSel ? '#92400e' : '#1c1917',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '2px',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          <div style={{ fontFamily: 'Consolas, monospace', fontWeight: '800', fontSize: '13.5px', color: isSel ? '#92400e' : '#1c1917' }}>
                            {p.poCode}
                          </div>
                          {isSel && <CheckCircle2 size={16} color="#d97706" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ─── MỤC 2: CHỌN SẢN PHẨM (TỦ) * (CHUẨN GIAO DIỆN HÌNH ẢNH USER GỬI) ─── */}
              {selectedPo && (
                <div style={{ position: 'relative' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '800',
                    color: '#1c1917',
                    marginBottom: '6px'
                  }}>
                    Sản phẩm (Tủ) <span style={{ color: '#dc2626' }}>*</span>
                  </label>

                  {/* Ô hiển thị chọn sản phẩm (tủ) */}
                  <div
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                    style={{
                      height: '42px',
                      minHeight: '42px',
                      padding: '0 12px',
                      backgroundColor: '#ffffff',
                      border: `1.5px solid ${showProductDropdown ? '#4a240e' : '#a3998e'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: showProductDropdown ? '0 0 0 2px rgba(92, 45, 14, 0.15)' : 'none',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span style={{
                      fontSize: '13px',
                      color: uniqueSelectedSkus.length > 0 ? '#1e293b' : '#94a3b8',
                      fontWeight: uniqueSelectedSkus.length > 0 ? '700' : '500',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                      minWidth: 0,
                      marginRight: '6px'
                    }}>
                      {selectedProductLabel}
                    </span>

                    <ChevronDown
                      size={16}
                      color="#64748b"
                      style={{
                        transform: showProductDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        flexShrink: 0
                      }}
                    />
                  </div>

                  {/* Dropdown Menu chuẩn y hệt hình ảnh người dùng gửi */}
                  {showProductDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.12)',
                      border: '1.5px solid #c8beb2',
                      zIndex: 9999,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: '280px',
                      boxSizing: 'border-box'
                    }}>
                      {/* Ô Input tìm kiếm bên trong dropdown */}
                      <div style={{
                        padding: '8px 10px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                      }}>
                        <Search size={14} color="#64748b" />
                        <input
                          type="text"
                          placeholder="Gõ để tìm kiếm..."
                          value={skuSearchText}
                          onChange={(e) => setSkuSearchText(e.target.value)}
                          style={{
                            flex: 1,
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: 'none',
                            fontSize: '12.5px',
                            color: '#1e293b'
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        {skuSearchText && (
                          <X
                            size={14}
                            color="#94a3b8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSkuSearchText('');
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </div>

                      {/* Danh sách Options với Checkbox bên phải chuẩn hình mẫu */}
                      <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                        {filteredSkus.length > 0 ? (
                          filteredSkus.map((skuCode, idx) => {
                            const isChecked = uniqueSelectedSkus.includes(skuCode);
                            const count = (Array.isArray(boxList) ? boxList : []).filter(b => b?.sku === skuCode).length;

                            return (
                              <div
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSkuOption(skuCode);
                                }}
                                style={{
                                  padding: '9px 10px',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  color: isChecked ? '#5c2d0e' : '#334155',
                                  backgroundColor: isChecked ? '#fdf2e9' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                  fontWeight: isChecked ? '800' : '600',
                                  borderBottom: idx < filteredSkus.length - 1 ? '1px solid #f8fafc' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px'
                                }}
                                onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                                  <span style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: isChecked ? '800' : '700',
                                    fontSize: '13.5px',
                                    color: isChecked ? '#5c2d0e' : '#1e293b'
                                  }}>
                                    {skuCode}
                                  </span>
                                  {count > 1 && (
                                    <span style={{
                                      fontSize: '10.5px',
                                      fontWeight: '800',
                                      color: '#7B5233',
                                      backgroundColor: '#f5ede2',
                                      padding: '1px 6px',
                                      borderRadius: '10px',
                                      border: '1px solid #dfcfbe'
                                    }}>
                                      x{count}
                                    </span>
                                  )}
                                </div>

                                {/* Ô Checkbox bên phải */}
                                <div style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '4px',
                                  border: `1.5px solid ${isChecked ? '#5c2d0e' : '#94a3b8'}`,
                                  backgroundColor: isChecked ? '#5c2d0e' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.1s',
                                  flexShrink: 0
                                }}>
                                  {isChecked && (
                                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                            Không tìm thấy kết quả
                          </div>
                        )}

                        {/* Gợi ý thêm mã mới nếu người dùng gõ mã tự do */}
                        {skuSearchText.trim() && !availableSkus.some(s => s.toLowerCase() === skuSearchText.trim().toLowerCase()) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              const customSku = skuSearchText.trim().toUpperCase();
                              handleAddBoxWithSku(customSku);
                              setSkuSearchText('');
                            }}
                            style={{
                              padding: '9px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: '#fef3c7',
                              border: '1.5px dashed #d97706',
                              marginTop: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Plus size={14} color="#92400e" />
                              <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#92400e' }}>
                                Thêm mã mới: <strong style={{ fontFamily: 'Consolas, monospace' }}>{skuSearchText.trim().toUpperCase()}</strong>
                              </span>
                            </div>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              border: '1.5px dashed #d97706',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Plus size={12} color="#92400e" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── CARD 2: DANH SÁCH THÙNG HÀNG & THAO TÁC DẤU [+] NHÂN BẢN / ĐỔI THÙNG ─── */}
            {selectedPo && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #e8e1d5',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #f5f5f4',
                  paddingBottom: '10px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#4e3629',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Package size={15} color="#7b5233" />
                      <span>DANH SÁCH THÙNG ({Array.isArray(boxList) ? boxList.length : 0} THÙNG)</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#78716c', marginTop: '2px' }}>
                      Bấm dấu 3 chấm (⋮) trên từng hàng để thêm, đổi hoặc xóa thùng
                    </div>
                  </div>
                </div>

                {/* Danh sách từng thùng hoặc thông báo rỗng */}
                {(!Array.isArray(boxList) || boxList.length === 0) ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    backgroundColor: '#fafaf9',
                    borderRadius: '10px',
                    border: '1.5px dashed #d6d3d1'
                  }}>
                    <Package size={28} color="#a8a29e" style={{ margin: '0 auto 6px', display: 'block' }} />
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#57534e' }}>
                      Chưa có thùng hàng nào
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#a8a29e', marginTop: '3px' }}>
                      Vui lòng chọn Tên sản phẩm (SKU) ở trên để thêm thùng đầu tiên.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {boxList.map((box, idx) => {
                      return (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #ebdccb',
                            borderRadius: '12px',
                            padding: '11px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            position: 'relative',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* Thứ tự thùng (Màu gỗ nhạt chủ đạo app) & Mã SKU */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: '#f5ede2', // Màu gỗ nhạt chủ đạo của app
                              color: '#6b4226',
                              border: '1.5px solid #dfcfbe',
                              fontSize: '13px',
                              fontWeight: '900',
                              flexShrink: 0
                            }}>
                              {box?.boxIndex || (idx + 1)}
                            </span>

                            <span style={{
                              fontFamily: 'Consolas, monospace',
                              fontSize: '15.5px',
                              fontWeight: '900',
                              color: '#1c1917',
                              letterSpacing: '0.3px'
                            }}>
                              {box?.sku}
                            </span>
                          </div>

                          {/* Nút 3 chấm dọc thao tác (Thêm giống, Đổi SKU, Xóa) */}
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuIndex(activeMenuIndex === idx ? null : idx);
                                setEditingBoxIndex(null);
                              }}
                              style={{
                                border: 'none',
                                background: activeMenuIndex === idx ? '#f5ede2' : 'transparent',
                                borderRadius: '8px',
                                padding: '6px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6b4226',
                                transition: 'background 0.15s'
                              }}
                              title="Thao tác thùng"
                            >
                              <MoreVertical size={20} />
                            </button>

                            {/* Dropdown Menu khi bấm 3 chấm */}
                            {activeMenuIndex === idx && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 4px)',
                                  right: 0,
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #ebdccb',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                  zIndex: 100,
                                  minWidth: '170px',
                                  padding: '6px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px'
                                }}
                              >
                                {/* 1. Thêm giống thùng này */}
                                <div
                                  onClick={() => {
                                    handleDuplicateBox(idx);
                                    setActiveMenuIndex(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    color: '#4a240e',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fdf8f4'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Plus size={15} color="#7B5233" />
                                  <span>Thêm giống</span>
                                </div>

                                {/* 2. Đổi sang SKU khác */}
                                <div
                                  onClick={() => {
                                    setEditingBoxIndex(idx);
                                    setActiveMenuIndex(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    color: '#4a240e',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fdf8f4'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Edit3 size={14} color="#7B5233" />
                                  <span>Đổi SKU</span>
                                </div>

                                <div style={{ height: '1px', backgroundColor: '#f1e7dc', margin: '3px 0' }} />

                                {/* 3. Xóa thùng này */}
                                <div
                                  onClick={() => {
                                    handleDeleteBox(idx);
                                    setActiveMenuIndex(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    color: '#dc2626',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Trash2 size={14} color="#dc2626" />
                                  <span>Xóa thùng</span>
                                </div>
                              </div>
                            )}

                            {/* Menu chọn SKU khác khi người dùng chọn "Đổi SKU" */}
                            {editingBoxIndex === idx && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 4px)',
                                  right: 0,
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #ebdccb',
                                  borderRadius: '12px',
                                  boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                                  zIndex: 110,
                                  minWidth: '175px',
                                  padding: '6px'
                                }}
                              >
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  color: '#7b5233',
                                  padding: '5px 8px',
                                  borderBottom: '1px solid #f3ede2',
                                  marginBottom: '4px'
                                }}>
                                  Chọn mã SKU khác:
                                </div>
                                {availableSkus.map((skuOption) => (
                                  <div
                                    key={skuOption}
                                    onClick={() => handleSelectSkuForBox(idx, skuOption)}
                                    style={{
                                      padding: '8px 10px',
                                      fontSize: '13px',
                                      fontFamily: 'Consolas, monospace',
                                      fontWeight: '800',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      backgroundColor: box.sku === skuOption ? '#fef3c7' : 'transparent',
                                      color: box.sku === skuOption ? '#92400e' : '#1c1917',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fdf8f4'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = box.sku === skuOption ? '#fef3c7' : 'transparent'}
                                  >
                                    <span>{skuOption}</span>
                                    {box.sku === skuOption && <CheckCircle2 size={14} color="#d97706" />}
                                  </div>
                                ))}
                                <div style={{
                                  borderTop: '1px solid #f3ede2',
                                  paddingTop: '4px',
                                  marginTop: '4px',
                                  textAlign: 'center'
                                }}>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBoxIndex(null)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#78716c',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      padding: '4px'
                                    }}
                                  >
                                    Đóng
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── HAI NÚT HÀNH ĐỘNG CỐ ĐỊNH DƯỚI CÙNG MÀN HÌNH ĐIỆN THOẠI (FIXED BOTTOM BAR) ─── */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '450px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              padding: '12px 16px',
              display: 'flex',
              gap: '12px',
              zIndex: 990,
              boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.06)',
              boxSizing: 'border-box',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px'
            }}>
              {/* Nút HỦY */}
              <button
                type="button"
                onClick={handleResetTicket}
                style={{
                  flex: 1,
                  height: '44px',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} />
                <span>Hủy</span>
              </button>

              {/* Nút TẠO TEM NHÃN (SỐ LƯỢNG) */}
              <button
                type="button"
                onClick={handleOpenConfirmPopup}
                disabled={!Array.isArray(boxList) || boxList.length === 0}
                style={{
                  flex: 1.8,
                  height: '44px',
                  background: (!Array.isArray(boxList) || boxList.length === 0)
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: (!Array.isArray(boxList) || boxList.length === 0) ? 'not-allowed' : 'pointer',
                  boxShadow: (!Array.isArray(boxList) || boxList.length === 0) ? 'none' : '0 4px 12px rgba(123, 82, 51, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Printer size={18} />
                <span>Tạo tem nhãn ({Array.isArray(boxList) ? boxList.length : 0})</span>
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: LỊCH SỬ CÁC LẦN KIỂM TRA & IN TEM
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(!Array.isArray(historyList) || historyList.length === 0) ? (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                padding: '30px 16px',
                textAlign: 'center',
                border: '1px solid #e8e1d5',
                color: '#78716c'
              }}>
                <Boxes size={36} color="#d6d3d1" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#444' }}>Chưa có phiếu kiểm tra nào</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Sau khi xác nhận và in tem, các phiếu sẽ được lưu tại đây.</div>
              </div>
            ) : (
              historyList.map((rec, rIdx) => {
                const boxCount = rec?.totalBoxes || rec?.boxes?.length || 1;
                const boxIdx = rec?.boxIndex || 1;
                const skuCode = rec?.sku || rec?.boxes?.[0]?.sku || '---';
                const isVerified = rec?.status === 'verified';
                const boxBadge = rec?.boxName || (boxCount > 1 ? `Thùng #${boxIdx}/${boxCount}` : `Thùng #${boxIdx}`);

                return (
                  <div
                    key={rec?.id || rec?.ticketCode || rIdx}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      padding: '14px',
                      border: isVerified ? '1.5px solid #86efac' : '1px solid #e8e1d5',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Header thẻ: Mã phiếu / Barcode & Trạng thái */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '15px',
                            fontWeight: '900',
                            color: '#c2410c',
                            fontFamily: 'Consolas, monospace',
                            letterSpacing: '0.4px'
                          }}>
                            {rec?.ticketCode}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            PO: {rec?.poCode}
                          </span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#78716c' }}>
                          {rec?.timestamp}
                        </div>
                      </div>

                      <div>
                        {isVerified ? (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            padding: '3px 9px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle2 size={12} color="#15803d" />
                            Đã kiểm tra
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            padding: '3px 9px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={12} color="#64748b" />
                            Chưa kiểm tra
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Khối SKU độc lập của phiếu / thùng */}
                    <div style={{
                      backgroundColor: isVerified ? '#f0fdf4' : '#f8fafc',
                      border: isVerified ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isVerified ? '#dcfce7' : '#f1f5f9',
                          border: isVerified ? '1px solid #86efac' : '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isVerified ? (
                            <CheckCircle2 size={18} color="#16a34a" />
                          ) : (
                            <Package size={16} color="#78716c" />
                          )}
                        </div>
                        <div>
                          <div style={{
                            fontSize: '10.5px',
                            fontWeight: '800',
                            color: isVerified ? '#15803d' : '#64748b',
                            textTransform: 'uppercase'
                          }}>
                            {boxBadge}
                          </div>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '900',
                            fontFamily: 'Consolas, monospace',
                            color: isVerified ? '#15803d' : '#0f172a',
                            letterSpacing: '0.3px',
                            marginTop: '1px'
                          }}>
                            SKU: {skuCode}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isVerified ? (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            backgroundColor: '#bbf7d0',
                            color: '#15803d',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Check size={12} />
                            {rec?.scannedAt || 'ĐÃ KHỚP'}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={11} color="#64748b" />
                            CHỜ QUÉT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Các nút hành động cho riêng phiếu / tem này */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => openInspectTicket(rec)}
                        style={{
                          border: 'none',
                          background: isVerified
                            ? '#f1f5f9'
                            : 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                          color: isVerified ? '#334155' : '#ffffff',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          boxShadow: isVerified ? 'none' : '0 2px 6px rgba(123, 82, 51, 0.25)'
                        }}
                      >
                        <ScanLine size={13} />
                        <span>{isVerified ? 'Xem lại kiểm tra' : 'Quét kiểm tra'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewModal({
                            isOpen: true,
                            ticket: rec,
                            currentBoxIndex: 0
                          });
                        }}
                        style={{
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#334155',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={13} />
                        <span>Xem tem in</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => executeThermalPrint(rec)}
                        style={{
                          border: '1px solid #16a34a',
                          backgroundColor: '#15803d',
                          color: '#ffffff',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Printer size={13} />
                        <span>In lại tem</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* ─── BANNER / POPUP THÔNG BÁO KẾT QUẢ QUÉT KIỂM TRA ─── */}
      {scanPopup && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          width: '90%',
          maxWidth: '380px',
          borderRadius: '14px',
          padding: '12px 16px',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: scanPopup.type === 'error' ? '#dc2626' : (scanPopup.type === 'complete' ? '#047857' : '#15803d'),
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ flexShrink: 0 }}>
            {scanPopup.type === 'error' ? (
              <AlertTriangle size={26} color="#ffffff" />
            ) : scanPopup.type === 'complete' ? (
              <Sparkles size={26} color="#fef08a" />
            ) : (
              <CheckCircle2 size={26} color="#ffffff" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.3px' }}>
              {scanPopup.title}
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.95, lineHeight: 1.3 }}>
              {scanPopup.message}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          POPUP XÁC NHẬN THÔNG BÁO (THEO YÊU CẦU CỦA USER)
          Người ta đọc và xem hiển thị danh sách đúng chưa, nếu đúng mới in
      ═══════════════════════════════════════════════════════════════ */}
      {showConfirmPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header Popup - Màu gỗ như title app */}
            <div style={{
              padding: '14px 16px',
              backgroundColor: '#FAF5EE',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#7B5233" />
                <span style={{ fontWeight: '900', fontSize: '14px', color: '#4A2C1D' }}>
                  XÁC NHẬN THÔNG TIN KIỂM TRA
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmPopup(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716c' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Nội dung popup: người dùng đọc và kiểm tra */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12.5px', color: '#57534e', fontWeight: '600', lineHeight: 1.4 }}>
                Kiểm tra danh sách thùng trước khi in:
              </div>

              {/* Bảng tóm tắt thông tin (đã bỏ mục Công đoạn) */}
              <div style={{
                backgroundColor: '#fafaf9',
                borderRadius: '8px',
                padding: '10px',
                border: '1px solid #e7e5e4',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#78716c' }}>Mã phiếu:</span>
                  <strong style={{ color: '#c2410c', fontStyle: 'italic', fontFamily: 'monospace' }}>{ticketCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#78716c' }}>Cách kiểm tra:</span>
                  <strong style={{ color: '#0f172a' }}>{inspectMethod}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#78716c' }}>Đơn hàng PO:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedPo}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#78716c' }}>Tổng số tem in:</span>
                  <strong style={{ color: '#7B5233', fontWeight: '800' }}>{Array.isArray(boxList) ? boxList.length : 0} tem</strong>
                </div>
              </div>

              {/* Danh sách thùng chi tiết (Đã bỏ chữ 1 cái) */}
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#1c1917', marginTop: '2px' }}>
                CHI TIẾT MÃ SKU TỪNG THÙNG THEO THỨ TỰ:
              </div>

              <div style={{
                maxHeight: '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                border: '1px solid #e7e5e4',
                borderRadius: '8px',
                padding: '6px'
              }}>
                {(Array.isArray(boxList) ? boxList : []).map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f5f5f4',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <span>
                      {b?.name || `Thùng #${b?.boxIndex || (idx + 1)}`}:
                    </span>
                    <span style={{
                      fontFamily: 'Consolas, monospace',
                      fontWeight: '800',
                      color: '#111827'
                    }}>
                      {b?.sku}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hai nút hành động: Kiểm tra lại & Xác nhận in tem */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#f5f5f4',
              display: 'flex',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowConfirmPopup(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #d6d3d1',
                  backgroundColor: '#ffffff',
                  color: '#444',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Kiểm tra lại
              </button>

              <button
                type="button"
                onClick={handleConfirmAndPrint}
                style={{
                  flex: 1.4,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(123, 82, 51, 0.25)'
                }}
              >
                <Printer size={15} />
                <span>Xác nhận in tem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL XEM TRƯỚC TEM IN KHỔ 56MM (LIVE TICKET PREVIEW)
      ═══════════════════════════════════════════════════════════════ */}
      {previewModal.isOpen && previewModal.ticket && (() => {
        const t = previewModal.ticket;
        const boxes = Array.isArray(t?.boxes) ? t.boxes : [];
        if (boxes.length === 0) return null;
        const curBox = boxes[previewModal.currentBoxIndex] || boxes[0] || {};
        const curBoxNum = curBox?.boxIndex || (previewModal.currentBoxIndex + 1);
        const curBoxId = `${t?.ticketCode || 'KT'}-${String(curBoxNum).padStart(2, '0')}`;

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '340px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              {/* Header preview */}
              <div style={{
                padding: '12px 14px',
                backgroundColor: '#FAF5EE',
                borderBottom: '1px solid #EADCC9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '13.5px', fontWeight: '900', color: '#4A2C1D' }}>
                  {curBox?.sku || t?.mainSku || 'Tủ'}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewModal({ isOpen: false, ticket: null, currentBoxIndex: 0 })}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716c' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Khung mô phỏng tờ tem in nhiệt thực tế khổ 56mm */}
              <div style={{
                padding: '16px 12px',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                {/* 1. Mã phiếu & Mã SKU (hiển thị SKU: [mã SKU]) */}
                <div style={{ fontSize: '17px', fontWeight: '900', color: '#111827', fontFamily: 'Consolas, monospace', letterSpacing: '0.5px' }}>
                  {curBoxId}
                </div>
                <div style={{ fontSize: '14.5px', fontWeight: '900', color: '#4a240e', marginTop: '2px', fontFamily: 'Consolas, monospace' }}>
                  SKU: {curBox?.sku}
                </div>

                <div style={{ width: '100%', borderTop: '1px dashed #666', margin: '6px 0' }} />

                {/* 2. Metadata thời gian, người kiểm, PO (Đã bỏ dòng Công đoạn) */}
                <div style={{ width: '100%', fontSize: '10px', display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span style={{ color: '#444' }}>Thời gian:</span>
                  <strong>{t.timestamp}</strong>
                </div>
                <div style={{ width: '100%', fontSize: '10px', display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span style={{ color: '#444' }}>Người kiểm:</span>
                  <strong>{t.inspector}</strong>
                </div>
                <div style={{ width: '100%', fontSize: '10px', display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span style={{ color: '#444' }}>Mã PO:</span>
                  <strong>{t.poCode}</strong>
                </div>

                <div style={{ width: '100%', borderTop: '1px dashed #666', margin: '6px 0' }} />

                {/* 3. Mã QR Code kích thước to, rõ ràng */}
                <div style={{ margin: '6px 0 2px 0' }}>
                  <QRCodeSVG
                    value={`${t.ticketCode}|BOX:${curBoxNum}/${boxes.length}|SKU:${curBox.sku}|PO:${t.poCode}`}
                    size={150}
                    level="M"
                  />
                  <div style={{ fontSize: '9px', color: '#555', marginTop: '4px' }}>
                    Quét mã QR để mở lại thông tin thùng
                  </div>
                </div>

                <div style={{ width: '100%', borderTop: '1px dashed #666', margin: '6px 0' }} />
                <div style={{ fontSize: '9px', color: '#777' }}>
                  G7 SmartFlow • Kiểm Tra Tủ Thùng
                </div>
              </div>

              {/* Nút chuyển tem và in */}
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#f5f5f4',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={previewModal.currentBoxIndex <= 0}
                    onClick={() => setPreviewModal(prev => ({ ...prev, currentBoxIndex: Math.max(0, prev.currentBoxIndex - 1) }))}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: previewModal.currentBoxIndex <= 0 ? '#f1f5f9' : '#ffffff',
                      color: previewModal.currentBoxIndex <= 0 ? '#94a3b8' : '#334155',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: previewModal.currentBoxIndex <= 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Trước
                  </button>

                  <button
                    type="button"
                    disabled={previewModal.currentBoxIndex >= boxes.length - 1}
                    onClick={() => setPreviewModal(prev => ({ ...prev, currentBoxIndex: Math.min(boxes.length - 1, prev.currentBoxIndex + 1) }))}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: previewModal.currentBoxIndex >= boxes.length - 1 ? '#f1f5f9' : '#ffffff',
                      color: previewModal.currentBoxIndex >= boxes.length - 1 ? '#94a3b8' : '#334155',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: previewModal.currentBoxIndex >= boxes.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Sau →
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => executeThermalPrint(t)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)'
                  }}
                >
                  <Printer size={14} />
                  <span>In lại {boxes.length} tem</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── HIDDEN QR CANVASES CHO LỆNH IN NHIỆT KHỔ 56MM ─── */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {(Array.isArray(boxList) ? boxList : []).map((b, idx) => (
          <QRCodeCanvas
            key={`box-${ticketCode}-${b?.boxIndex || idx}`}
            id={`qr-box-canvas-${ticketCode}-${b?.boxIndex || (idx + 1)}`}
            value={`${ticketCode}|BOX:${b?.boxIndex || (idx + 1)}/${boxList?.length || 1}|SKU:${b?.sku || ''}|PO:${selectedPo || ''}`}
            size={180}
            level="M"
          />
        ))}

        {(Array.isArray(historyList) ? historyList : []).map((hRec) =>
          Array.isArray(hRec?.boxes)
            ? hRec.boxes.map((b, bIdx) => (
                <QRCodeCanvas
                  key={`h-${hRec?.ticketCode || 'tk'}-${b?.boxIndex || bIdx}`}
                  id={`qr-box-canvas-${hRec?.ticketCode || 'tk'}-${b?.boxIndex || (bIdx + 1)}`}
                  value={`${hRec?.ticketCode || ''}|BOX:${b?.boxIndex || (bIdx + 1)}/${hRec?.totalBoxes || hRec?.boxes?.length || 1}|SKU:${b?.sku || ''}|PO:${hRec?.poCode || ''}`}
                  size={180}
                  level="M"
                />
              ))
            : null
        )}
      </div>

      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onConfirm={() => setMessageModal(prev => ({ ...prev, isOpen: false }))}
        onClose={() => setMessageModal(prev => ({ ...prev, isOpen: false }))}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </Layout>
  );
};

export default CheckCabinetBoxView;

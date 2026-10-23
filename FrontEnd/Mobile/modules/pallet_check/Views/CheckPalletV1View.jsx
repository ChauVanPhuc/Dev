import React, { useState, useRef, useEffect, useCallback } from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QRCodeCanvas } from 'qrcode.react';
import { PRODUCT_SKU_SET, matchCatalogSku, OPTICAL_COLOR_MAP } from '../constants/productCatalog';
import { 
  Camera, 
  RotateCcw, 
  CheckCircle2, 
  History, 
  ScanLine, 
  Barcode,
  Layers,
  Package,
  Volume2,
  VolumeX,
  Check,
  X,
  XCircle,
  AlertTriangle,
  Trash2,
  Plus,
  Zap,
  ShieldAlert,
  Save,
  Clock,
  User,
  Printer,
  QrCode
} from 'lucide-react';

/**
 * Tạo mã phiếu duy nhất cho từng tab khi lưu
 * Ví dụ: PLD-260925-1045 (Pallet đứng), PLN-260925-1046 (Pallet nóc)
 */
const generateRecordId = (prefix = 'PLD') => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
};

// Chuẩn hóa mã quét về tiếng Anh ASCII không dấu
export const normalizeToEnglishBarcode = (raw) => {
  if (!raw) return '';
  let str = String(raw).trim();

  // Đổi ư/Ư thành W
  str = str.replace(/[ưƯừỪứỨửỬữỮựỰ]/g, 'W');

  // Đổi đ/Đ thành D
  str = str.replace(/[đĐ]/g, 'D');

  // Khử dấu tiếng Việt
  str = str
    .replace(/[àáạảãâầấậẩẫăằắặẳẵÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
    .replace(/[èéẹẻẽêềếệểễÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E')
    .replace(/[ìíịỉĩÌÍỊỈĨ]/g, 'I')
    .replace(/[òóọỏõôồốộổỗơờớợởỡÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O')
    .replace(/[ùúụủũÙÚỤỦŨ]/g, 'U')
    .replace(/[ỳýỵỷỹỲÝỴỶỸ]/g, 'Y');

  // Xóa dấu tổ hợp unicode
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Chuẩn hóa gạch ngang về '-'
  str = str.replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-');

  // Viết hoa và xóa khoảng trắng
  str = str.toUpperCase().replace(/[\s\r\n\t]/g, '');

  // Khử ký tự * bao quanh (start/stop character của chuẩn Code 39: *17-2621-WHT*)
  str = str.replace(/^\*+|\*+$/g, '');

  // Khử các tiền tố nhãn thông dụng (LPN:, LPN-, SKU:, ITEM:, CODE:, MÃ:, MA:, SP:)
  str = str.replace(/^(LPN|SKU|ITEM|CODE|MA|MÃ|SP)[:\s\-_]+/i, '');

  // Khử tiền tố lặp lại từ đuôi do bộ gõ
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

  // Tự động phục hồi mã SKU có 2 dấu '-' nếu Code 39 bị mờ mất dấu '-'
  const hyphens = (str.match(/-/g) || []).length;
  if (hyphens === 1) {
    // Trường hợp 1: Nhòe '-2' thành '4' (ví dụ 174621-WHT -> 17-2621-WHT)
    const m1 = str.match(/^(\d{2})4(\d{3,4}-[A-Z0-9]+)$/);
    if (m1) {
      str = `${m1[1]}-2${m1[2]}`;
    } else {
      // Trường hợp 2: Nhòe '-' thành '7' (ví dụ 1772621-WHT -> 17-2621-WHT)
      const m2 = str.match(/^(\d{2})7(\d{4}-[A-Z0-9]+)$/);
      if (m2) {
        str = `${m2[1]}-${m2[2]}`;
      } else {
        // Trường hợp 3: Rụng mất dấu '-' giữa 2 số đầu và 4 số sau (ví dụ 172621-WHT -> 17-2621-WHT)
        const m3 = str.match(/^(\d{2})(\d{4})-([A-Z0-9]+)$/);
        if (m3) {
          str = `${m3[1]}-${m3[2]}-${m3[3]}`;
        } else {
          // Trường hợp 4: Rụng mất dấu '-' thứ 2 trước chữ màu (ví dụ 17-2621WHT -> 17-2621-WHT)
          const m4 = str.match(/^(\d{2})-(\d{4})([A-Z]{2,5})$/);
          if (m4) {
            str = `${m4[1]}-${m4[2]}-${m4[3]}`;
          }
        }
      }
    }
  } else if (hyphens === 0) {
    // Trường hợp 5: Rụng cả 2 dấu '-' nhưng -2 thành 4 (ví dụ 174621WHT -> 17-2621-WHT)
    const m0a = str.match(/^(\d{2})4(\d{3})([A-Z]{2,5})$/);
    if (m0a) {
      str = `${m0a[1]}-2${m0a[2]}-${m0a[3]}`;
    } else {
      // Trường hợp 6: Rụng cả 2 dấu '-' (ví dụ 172621WHT -> 17-2621-WHT)
      const m0b = str.match(/^(\d{2})(\d{4})([A-Z]{2,5})$/);
      if (m0b) {
        str = `${m0b[1]}-${m0b[2]}-${m0b[3]}`;
      }
    }
  }

  // Tự động phục hồi đuôi màu sơn nhòe quang học ở Code 39
  // (ví dụ 17-2621-W5T -> 17-2621-WHT, 17-2621-W5 -> 17-2621-WHT, 17-2621-8LK -> 17-2621-BLK)
  const barcodeParts = str.split('-');
  if (barcodeParts.length >= 2) {
    const rawTail = barcodeParts[barcodeParts.length - 1];
    if (OPTICAL_COLOR_MAP && OPTICAL_COLOR_MAP[rawTail]) {
      str = [...barcodeParts.slice(0, barcodeParts.length - 1), OPTICAL_COLOR_MAP[rawTail]].join('-');
    }
  }
  str = str
    .replace(/-W5T$/, '-WHT')
    .replace(/-W1T$/, '-WHT')
    .replace(/-W5$/, '-WHT')
    .replace(/-W1$/, '-WHT')
    .replace(/-8LK$/, '-BLK')
    .replace(/-6RY$/, '-GRY')
    .replace(/-E5P$/, '-ESP')
    .replace(/-W0A$/, '-WOA');

  // Khử các ký tự đặc biệt thừa ở đầu hoặc cuối mã (ngoại trừ chữ cái, số, dấu '-')
  str = str.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');

  return str;
};

// Phân loại mã quét là PALLET, LPN hay SKU theo chuẩn quy cách nhà máy G7:
// - Mã PALLET: Bắt đầu bằng PLD- hoặc PLN-
// - Mã LPN (Mã vận chuyển): Dãy số 8-14 chữ số liền (chuẩn kho hàng G7)
// - Mã SKU (Mã sản phẩm): Có trong Catalog, hoặc có 1-4 dấu '-', hoặc chuỗi mã sản phẩm
const classifyCode = (rawCode, standardSku = '') => {
  if (!rawCode) return null;
  const code = normalizeToEnglishBarcode(rawCode);
  if (!code) return null;

  // 0. Mã Pallet lịch sử
  if (code.startsWith('PLD-') || code.startsWith('PLN-')) {
    return { type: 'PALLET', code };
  }

  // 1. Mã LPN: Chuẩn mã vận chuyển là chuỗi 8-14 chữ số liền (phổ biến nhất 9-10 số)
  if (/^\d{8,14}$/.test(code)) {
    return { type: 'LPN', code };
  }

  // 2. Tra cứu đối soát Danh mục sản phẩm chuẩn của công ty:
  const matchedSku = matchCatalogSku(code, standardSku);
  if (matchedSku) {
    return { type: 'SKU', code: matchedSku };
  }

  // 3. Mã SKU theo cấu trúc chuẩn (1 đến 4 dấu '-', gồm các cụm chữ và số)
  // Ví dụ: 17-2621-WHT, APT-0102, 1-36L, 2-42-WOA-1
  if (/^[A-Z0-9]+(-[A-Z0-9]+){1,4}$/.test(code)) {
    return { type: 'SKU', code };
  }

  // 4. Mã SKU không dấu gạch ngang (dạng mã chữ và số kết hợp, độ dài >= 4)
  if (/^[A-Z0-9]{4,20}$/.test(code) && /[A-Z]/.test(code) && /\d/.test(code)) {
    return { type: 'SKU', code };
  }

  return null;
};

/**
 * So khớp mã SKU với Mã chuẩn SKU:
 * Hỗ trợ khớp chính xác, qua Catalog, hoặc biến thể quang học (ví dụ tiền tố APT-, v.v.)
 */
const isOpticalVariantOfSku = (scanned, standard) => {
  if (!scanned || !standard) return false;
  const sUpper = scanned.toUpperCase().trim();
  const stdUpper = standard.toUpperCase().trim();
  if (sUpper === stdUpper) return true;

  // Đối soát qua danh mục Master Data và bảng sửa quang học
  const matchedScanned = matchCatalogSku(sUpper, stdUpper);
  if (matchedScanned && (matchedScanned === stdUpper || matchCatalogSku(stdUpper, sUpper) === matchedScanned)) {
    return true;
  }

  // Khớp bỏ qua tiền tố APT- (ví dụ: APT-17-2621-WHT khớp 17-2621-WHT)
  const stripApt = (s) => s.replace(/^APT-?/i, '');
  if (stripApt(sUpper) === stripApt(stdUpper)) return true;

  // So khớp sau khi chuẩn hóa gạch nối
  const sNorm = sUpper.replace(/[^A-Z0-9]/g, '');
  const stdNorm = stdUpper.replace(/[^A-Z0-9]/g, '');
  if (sNorm && sNorm === stdNorm) return true;

  return false;
};

const isOpticalVariantOfLpn = (scanned, standard) => {
  if (!scanned || !standard) return false;
  if (scanned === standard) return true;
  const cleanScanned = scanned.replace(/\D/g, '');
  const cleanStandard = standard.replace(/\D/g, '');
  return cleanScanned.length >= 8 && cleanStandard.length >= 8 && cleanScanned === cleanStandard;
};

/**
 * Kiểm tra xem chuỗi quét được có phải là mã hợp lệ hay không:
 * Tận dụng toàn diện logic classifyCode để đảm bảo đồng nhất 100%
 */
const isValidBarcodeCandidate = (code, standardSku = '') => {
  if (!code) return false;
  return classifyCode(code, standardSku) !== null;
};

const CheckPalletV1View = () => {
  // ─── TAB CHÍNH: 'scan' (Kiểm tra mới) | 'history' (Lịch sử) ───
  const [activeTab, setActiveTab] = useState('scan');


  // ─── TAB PHỤ: 'standing' (Pallet đứng) | 'roof' (Top nóc) ───
  const [palletTab, setPalletTab] = useState('standing'); // 'standing' | 'roof'

  // Bật / tắt âm thanh cảnh báo
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Trạng thái ô quét mã
  const [scanInputText, setScanInputText] = useState('');
  const scanInputRef = useRef(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Hiệu ứng nháy xanh khi vừa quét mã thành công
  const [lastScannedSuccess, setLastScannedSuccess] = useState(null);

  // Dữ liệu riêng biệt cho tab PALLET ĐỨNG
  const [standingData, setStandingData] = useState({
    lpns: [],          // [{ id, code, count, firstSeen, lastSeen }]
    skus: [],          // [{ id, code, count, firstSeen, lastSeen }]
    standardLpn: null, // Mã LPN chuẩn đầu tiên
    standardSku: null, // Mã SKU chuẩn đầu tiên
    isSaved: false,
    savedKey: null,
    totalScans: 0
  });

  // Dữ liệu riêng biệt cho tab TOP NÓC
  const [roofData, setRoofData] = useState({
    lpns: [],
    skus: [],
    standardLpn: null,
    standardSku: null,
    isSaved: false,
    savedKey: null,
    totalScans: 0
  });

  // Pop-up thông báo kết quả quét: Nhận (điền xuống) hoặc Không nhận (từ chối)
  const [scanPopup, setScanPopup] = useState(null);

  // ─── HỆ THỐNG ENGINE BẮT TIA MÁY QUÉT CHUẨN CÔNG NGHIỆP ───
  const hiddenScannerInputRef = useRef(null);
  const processHandlerRef = useRef(null);
  const scannerBufferRef = useRef('');
  const scannerTimerRef = useRef(null);
  const lastKeyTimeRef = useRef(0);
  const lastProcessedCodeRef = useRef('');
  const lastProcessedTimeRef = useRef(0);

  // Lịch sử các lần lưu
  const [historyList, setHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem('g7_pallet_v1_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [saveSuccessModal, setSaveSuccessModal] = useState({ isOpen: false, record: null });

  // Modal thông báo & xác nhận
  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // ─── CAMERA SCANNER HOOK (Native BarcodeDetector GPU + Html5Qrcode Fallback) ───
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraEngine, setCameraEngine] = useState('');
  const [lastDetectedRaw, setLastDetectedRaw] = useState('');
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [isFlashAnimation, setIsFlashAnimation] = useState(false);
  const html5QrCodeRef = useRef(null);
  const isStartingCameraRef = useRef(false);
  const lastCameraScannedCodeRef = useRef('');
  const lastCameraScannedTimeRef = useRef(0);
  // Bộ lọc đồng thuận đa khung hình (Candidate Consensus Filter) - Chống 100% rác rung mờ
  const candidateScanCodeRef = useRef('');
  const candidateScanCountRef = useRef(0);
  const candidateScanTimeRef = useRef(0);
  // Bộ đệm xác nhận 2 khung hình liên tiếp trước khi báo động sai mã (chống giật/rung quang học)
  const mismatchConfirmRef = useRef(null);

  // Native GPU/NPU BarcodeDetector Refs (Siêu tốc độ phần cứng, 60 FPS, < 10ms)
  const nativeStreamRef = useRef(null);
  const nativeDetectorRef = useRef(null);
  const videoElementRef = useRef(null);
  const onScanSuccessRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const isCameraRunningRef = useRef(false);
  const audioCtxRef = useRef(null);

  // Refs đồng bộ trạng thái tươi mới nhất cho vòng lặp camera (triệt tiêu 100% stale closures)
  const palletTabRef = useRef(palletTab);
  const standingDataRef = useRef(standingData);
  const roofDataRef = useRef(roofData);
  const messageModalRef = useRef(messageModal);
  const confirmModalRef = useRef(confirmModal);

  useEffect(() => { palletTabRef.current = palletTab; }, [palletTab]);
  useEffect(() => { standingDataRef.current = standingData; }, [standingData]);
  useEffect(() => { roofDataRef.current = roofData; }, [roofData]);
  useEffect(() => { messageModalRef.current = messageModal; }, [messageModal]);
  useEffect(() => { confirmModalRef.current = confirmModal; }, [confirmModal]);

  // Tự động lưu lịch sử vào localStorage khi có thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('g7_pallet_v1_history', JSON.stringify(historyList));
    } catch (e) {
      console.warn('Không thể lưu history vào localStorage:', e);
    }
  }, [historyList]);

  // Tự động đóng pop-up thông báo quét: 1s khi thành công để quét tiếp cực nhanh; 2s khi có báo động/lỗi
  useEffect(() => {
    if (!scanPopup) return;
    const isError = scanPopup.type === 'rejected';
    const duration = isError ? 2000 : 1000;
    const timer = setTimeout(() => {
      setScanPopup(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [scanPopup]);

  // Đồng bộ ref để camera tạm ngưng quét khi đang hiển thị cảnh báo lỗi/báo động
  const scanPopupRef = useRef(null);
  useEffect(() => {
    scanPopupRef.current = scanPopup;
  }, [scanPopup]);

  // Kích hoạt nhận mã quét
  const executeScannedCode = useCallback((rawCode) => {
    // Xóa sạch buffer và input ngầm
    scannerBufferRef.current = '';
    lastKeyTimeRef.current = 0;
    if (hiddenScannerInputRef.current) {
      hiddenScannerInputRef.current.value = '';
    }
    if (scannerTimerRef.current) {
      clearTimeout(scannerTimerRef.current);
      scannerTimerRef.current = null;
    }

    // Xóa trễ để dọn ký tự sót
    setTimeout(() => {
      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
      scannerBufferRef.current = '';
    }, 40);
    setTimeout(() => {
      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
    }, 120);

    if (!rawCode) return;

    // Chuẩn hóa mã sang tiếng Anh
    const clean = normalizeToEnglishBarcode(rawCode);
    if (clean.length < 2) return;

    const now = Date.now();
    // Chống quét dội tia / đúp mã trong 350ms
    if (clean === lastProcessedCodeRef.current && now - lastProcessedTimeRef.current < 350) {
      return;
    }
    // Nếu đang hiển thị cảnh báo lỗi, chỉ chặn dội tia lặp lại trong 500ms thay vì khoá vĩnh viễn
    if (scanPopupRef.current?.type === 'rejected' && now - lastProcessedTimeRef.current < 500) {
      return;
    }
    lastProcessedCodeRef.current = clean;
    lastProcessedTimeRef.current = now;

    if (processHandlerRef.current) {
      processHandlerRef.current(clean);
    }
  }, []);


  // ─── HỆ THỐNG ÂM THANH & RUNG TÁI SỬ DỤNG AUDIOCONTEXT ───
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playSuccessBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

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
  }, [soundEnabled, getAudioContext]);

  const playAlertSound = useCallback((repeatTimes = 3) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

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
  }, [soundEnabled, getAudioContext]);

  // ─── HỆ THỐNG GIỌNG NÓI TIẾNG VIỆT (TEXT-TO-SPEECH) ───
  const speakText = useCallback((text) => {
    if (!soundEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.92; // Tốc độ chuẩn vừa phải, phát âm tròn vành rõ chữ, không bị vội
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

  // ─── LOGIC QUÉT VÀ KIỂM TRA TỰ ĐỘNG THÔNG MINH ───
  const handleProcessScannedCode = useCallback((rawText) => {
    if (!rawText) return;
    const cleanRaw = normalizeToEnglishBarcode(rawText);
    if (!cleanRaw) return;

    // ─── 0. KIỂM TRA NẾU ĐÂY LÀ MÃ QR TEM PALLET ĐÃ KIỂM TRA (VD: PLD-260925-3914, PLN-...) ───
    const scannedUpper = cleanRaw.toUpperCase().trim();
    let matchedHistory = (historyList || []).find(it => 
      it.id && (it.id.toUpperCase() === scannedUpper || scannedUpper.includes(it.id.toUpperCase()))
    );

    if (!matchedHistory) {
      try {
        const saved = localStorage.getItem('g7_pallet_v1_history');
        if (saved) {
          const list = JSON.parse(saved);
          matchedHistory = list.find(it => 
            it.id && (it.id.toUpperCase() === scannedUpper || scannedUpper.includes(it.id.toUpperCase()))
          );
        }
      } catch (e) {}
    }

    if (matchedHistory) {
      playSuccessBeep();
      speakText('Đã mở lịch sử kiểm tra');
      setSelectedHistoryItem(matchedHistory);
      setScanPopup({
        type: 'accepted',
        code: matchedHistory.id,
        category: 'PALLET',
        title: 'ĐÃ MỞ LỊCH SỬ KIỂM TRA'
      });
      return;
    }

    if (scannedUpper.startsWith('PLD-') || scannedUpper.startsWith('PLN-')) {
      playAlertSound(2);
      speakText('Không tìm thấy lịch sử');
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'KHÔNG TÌM THẤY LỊCH SỬ',
        message: `Mã phiếu [${scannedUpper}] chưa được ghi nhận trong lịch sử thiết bị!`
      });
      return;
    }

    const currentTab = palletTab; // 'standing' | 'roof'
    const tabLabel = currentTab === 'standing' ? 'Pallet đứng' : 'Top nóc';
    const targetState = currentTab === 'standing' ? standingData : roofData;
    const setTargetState = currentTab === 'standing' ? setStandingData : setRoofData;
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const classified = classifyCode(cleanRaw, targetState.standardSku);
    if (!classified) {
      // ⛔ BÁO ĐỘNG LIỀN: Không nhận diện được định dạng LPN hoặc SKU hợp lệ
      playAlertSound(3);
      speakText('Cảnh báo! Mã không hợp lệ');
      setScanPopup({
        type: 'rejected',
        code: cleanRaw,
        category: 'UNKNOWN',
        title: 'BÁO ĐỘNG — MÃ KHÔNG HỢP LỆ'
      });
      return;
    }

    const { type, code } = classified;

    // ─── 1. XỬ LÝ NẾU LÀ MÃ LPN (MÃ VẬN CHUYỂN) ───
    if (type === 'LPN') {
      const last3Digits = code && code.length >= 3 ? code.slice(-3) : code;

      if (!targetState.standardLpn) {
        setTargetState(prev => ({
          ...prev,
          isSaved: false,
          standardLpn: code,
          totalScans: prev.totalScans + 1,
          lpns: [{
            id: Date.now(),
            code: code,
            count: 1,
            firstSeen: nowStr,
            lastSeen: nowStr
          }]
        }));

        playSuccessBeep();
        speakText(`Đã quét mã vận chuyển, ${last3Digits}`);
        setScanPopup({
          type: 'accepted',
          code: code,
          category: 'LPN',
          count: 1,
          title: 'ĐÃ NHẬN MÃ VẬN CHUYỂN'
        });
        return;
      }

      if (code === targetState.standardLpn) {
        let currentCount = 1;
        setTargetState(prev => {
          const existingIdx = prev.lpns.findIndex(it => it.code === code);
          let updatedLpns = [...prev.lpns];

          if (existingIdx >= 0) {
            currentCount = updatedLpns[existingIdx].count + 1;
            updatedLpns[existingIdx] = {
              ...updatedLpns[existingIdx],
              count: currentCount,
              lastSeen: nowStr
            };
          } else {
            updatedLpns.push({
              id: Date.now(),
              code: code,
              count: 1,
              firstSeen: nowStr,
              lastSeen: nowStr
            });
          }

          return {
            ...prev,
            isSaved: false,
            totalScans: prev.totalScans + 1,
            lpns: updatedLpns
          };
        });

        playSuccessBeep();
        speakText(`Đã quét mã vận chuyển, ${last3Digits}`);
        setScanPopup({
          type: 'accepted',
          code: code,
          category: 'LPN',
          count: currentCount,
          title: 'ĐÃ GHI NHẬN MÃ VẬN CHUYỂN'
        });
      } else {
        // ⛔ BÁO ĐỘNG LIỀN: SAI MÃ VẬN CHUYỂN
        playAlertSound(3);
        speakText('Đã sai mã vận chuyển');
        setScanPopup({
          type: 'rejected',
          code: code,
          standardCode: targetState.standardLpn,
          category: 'LPN',
          title: 'BÁO ĐỘNG — SAI MÃ VẬN CHUYỂN'
        });
      }
      return;
    }

    // ─── 2. XỬ LÝ NẾU LÀ MÃ SKU (MÃ SẢN PHẨM) ───
    if (type === 'SKU') {
      if (!targetState.standardSku) {
        setTargetState(prev => ({
          ...prev,
          isSaved: false,
          standardSku: code,
          totalScans: prev.totalScans + 1,
          skus: [{
            id: Date.now(),
            code: code,
            count: 1,
            firstSeen: nowStr,
            lastSeen: nowStr
          }]
        }));

        const speechCode = code.replace(/-/g, ' ');
        playSuccessBeep();
        speakText(`Đã quét mã, ${speechCode}`);
        setScanPopup({
          type: 'accepted',
          code: code,
          category: 'SKU',
          count: 1,
          title: 'ĐÃ NHẬN MÃ SẢN PHẨM'
        });
        return;
      }

      // Tự động nhận diện nếu trùng khớp hoặc là biến thể quang học do rung mờ Code 39 (như 174621-WHT -> 17-2621-WHT)
      const isSkuMatch = (code === targetState.standardSku) || isOpticalVariantOfSku(code, targetState.standardSku);
      const effectiveSku = isSkuMatch ? targetState.standardSku : code;
      const speechCode = effectiveSku.replace(/-/g, ' ');

      if (isSkuMatch) {
        let currentCount = 1;
        setTargetState(prev => {
          const existingIdx = prev.skus.findIndex(it => it.code === effectiveSku);
          let updatedSkus = [...prev.skus];

          if (existingIdx >= 0) {
            currentCount = updatedSkus[existingIdx].count + 1;
            updatedSkus[existingIdx] = {
              ...updatedSkus[existingIdx],
              count: currentCount,
              lastSeen: nowStr
            };
          } else {
            updatedSkus.push({
              id: Date.now(),
              code: effectiveSku,
              count: 1,
              firstSeen: nowStr,
              lastSeen: nowStr
            });
          }

          return {
            ...prev,
            isSaved: false,
            totalScans: prev.totalScans + 1,
            skus: updatedSkus
          };
        });

        playSuccessBeep();
        speakText(`Đã quét mã, ${speechCode}`);
        setScanPopup({
          type: 'accepted',
          code: effectiveSku,
          category: 'SKU',
          count: currentCount,
          title: 'ĐÃ GHI NHẬN MÃ SẢN PHẨM'
        });
      } else {
        // ⛔ BÁO ĐỘNG LIỀN: SAI MÃ SẢN PHẨM
        playAlertSound(3);
        speakText('Đã quét sai mã sản phẩm');
        setScanPopup({
          type: 'rejected',
          code: code,
          standardCode: targetState.standardSku,
          category: 'SKU',
          title: 'BÁO ĐỘNG — SAI MÃ SẢN PHẨM'
        });
      }
      return;
    }
  }, [palletTab, standingData, roofData, playSuccessBeep, playAlertSound, speakText, historyList]);

  // Đồng bộ handler xử lý quét mã luôn là phiên bản mới nhất
  useEffect(() => {
    processHandlerRef.current = handleProcessScannedCode;
  });

  // Lắng nghe máy quét phần cứng
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (messageModal.isOpen || confirmModal.isOpen) return;
      // Nếu đang chủ động gõ tay vào ô text thì để sự kiện gõ tự nhiên
      if (document.activeElement === scanInputRef.current) return;

      const key = e.key;
      const keyCode = e.keyCode || e.which;

      // Phím kết thúc quét (Enter / Tab)
      if (key === 'Enter' || key === 'Tab' || keyCode === 13 || keyCode === 9) {
        if (scannerTimerRef.current) {
          clearTimeout(scannerTimerRef.current);
          scannerTimerRef.current = null;
        }

        // Lấy mã từ input ngầm hoặc buffer
        const inputVal = hiddenScannerInputRef.current ? hiddenScannerInputRef.current.value.trim() : '';
        const bufferVal = scannerBufferRef.current.trim();
        const code = inputVal || bufferVal;

        scannerBufferRef.current = '';
        lastKeyTimeRef.current = 0;
        if (hiddenScannerInputRef.current) {
          hiddenScannerInputRef.current.value = '';
          setTimeout(() => {
            if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
          }, 40);
        }

        if (code && code.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          executeScannedCode(code);
        }
        return;
      }

      // Xử lý phím Backspace
      if (key === 'Backspace' || keyCode === 8) {
        scannerBufferRef.current = scannerBufferRef.current.slice(0, -1);
        return;
      }

      // Nhận ký tự từ máy quét
      if (key && key.length === 1) {
        const now = Date.now();
        // Xóa buffer nếu cách nhau quá 400ms
        if (now - lastKeyTimeRef.current > 400) {
          scannerBufferRef.current = '';
          if (hiddenScannerInputRef.current) {
            hiddenScannerInputRef.current.value = '';
          }
        }
        lastKeyTimeRef.current = now;
        scannerBufferRef.current += key;

        // Tự kích hoạt nếu máy quét không gửi Enter (đợi 350ms để không bị cắt đuôi ký tự)
        if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
        scannerTimerRef.current = setTimeout(() => {
          const inputVal = hiddenScannerInputRef.current ? hiddenScannerInputRef.current.value.trim() : '';
          const code = (inputVal || scannerBufferRef.current).trim();
          scannerBufferRef.current = '';
          lastKeyTimeRef.current = 0;
          if (hiddenScannerInputRef.current) {
            hiddenScannerInputRef.current.value = '';
            setTimeout(() => {
              if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
            }, 40);
          }
          if (code && code.length >= 2) {
            executeScannedCode(code);
          }
        }, 350);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
    };
  }, [executeScannedCode, messageModal.isOpen, confirmModal.isOpen]);

  // ─── GIỮ FOCUS NGẦM CHO SÚNG BẮT MÃ / MÁY QUÉT POS TRÊN TAB QUÉT ───
  useEffect(() => {
    if (activeTab === 'scan') {
      const focusScanner = () => {
        if (document.activeElement === scanInputRef.current) return;
        if (hiddenScannerInputRef.current && document.activeElement !== hiddenScannerInputRef.current) {
          try {
            hiddenScannerInputRef.current.focus({ preventScroll: true });
          } catch (_) {}
        }
      };
      focusScanner();
      const interval = setInterval(focusScanner, 1500);
      window.addEventListener('click', focusScanner);
      return () => {
        clearInterval(interval);
        window.removeEventListener('click', focusScanner);
      };
    }
  }, [activeTab]);

  // ─── ĐIỀU KHIỂN CAMERA SCANNER CHUẨN HTML5-QRCODE (ĐA ĐỊNH DẠNG CODE 128, CODE 39, QR, EAN) ───
  const stopCamera = async () => {
    isCameraRunningRef.current = false;
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.warn('Lỗi khi dừng camera:', err);
      }
      try {
        await html5QrCodeRef.current.clear();
      } catch (_) {}
      html5QrCodeRef.current = null;
    }
    const container = document.getElementById('v1-camera-reader');
    if (container) {
      container.innerHTML = '';
    }
    setIsCameraActive(false);
    setTorchOn(false);
  };

  const startCamera = async () => {
    if (isStartingCameraRef.current) return;
    isStartingCameraRef.current = true;
    try {
      setCameraError(null);

      // Dọn dẹp camera cũ trước khi khởi động instance mới
      await stopCamera();

      const container = document.getElementById('v1-camera-reader');
      if (!container) throw new Error('Không tìm thấy container camera #v1-camera-reader');
      container.innerHTML = '';

      // Callback xử lý khi phát hiện mã vạch từ luồng camera
      const onScanSuccess = (decodedText) => {
        if (!decodedText) return;
        if (confirmModalRef.current?.isOpen) return;

        const now = Date.now();
        const currentTab = palletTabRef.current;
        const currentData = (currentTab === 'standing' ? standingDataRef.current : roofDataRef.current);
        const currentStdSku = currentData?.standardSku || '';
        const currentStdLpn = currentData?.standardLpn || '';

        const cleanText = normalizeToEnglishBarcode(decodedText);
        if (!cleanText) return;

        // Tự động đóng modal cảnh báo ảnh tĩnh nếu camera đã bắt được mã
        if (messageModalRef.current?.isOpen && messageModalRef.current?.title?.includes('mã')) {
          setMessageModal(prev => ({ ...prev, isOpen: false }));
        }

        const catalogMatched = matchCatalogSku(cleanText, currentStdSku);
        const resolvedText = catalogMatched || cleanText;

        setLastDetectedRaw(resolvedText);

        if (!isValidBarcodeCandidate(resolvedText, currentStdSku)) {
          return;
        }

        const classified = classifyCode(resolvedText, currentStdSku);
        if (!classified) return;

        const { type, code: normalizedCode } = classified;

        // A. MÃ PALLET QR (PLD-..., PLN-...)
        if (type === 'PALLET' || normalizedCode.startsWith('PLD-') || normalizedCode.startsWith('PLN-')) {
          if (lastCameraScannedCodeRef.current === normalizedCode && (now - lastCameraScannedTimeRef.current < 1000)) {
            return;
          }
          lastCameraScannedCodeRef.current = normalizedCode;
          lastCameraScannedTimeRef.current = now;
          executeScannedCode(normalizedCode);
          return;
        }

        // B. MÃ LPN (MÃ VẬN CHUYỂN)
        if (type === 'LPN') {
          const isLpnMatch = !currentStdLpn || normalizedCode === currentStdLpn || isOpticalVariantOfLpn(normalizedCode, currentStdLpn);
          const finalLpn = isLpnMatch ? (currentStdLpn || normalizedCode) : normalizedCode;
          // Throttling camera 600ms giữa 2 lần quét cùng mã trên camera
          if (lastCameraScannedCodeRef.current === finalLpn && (now - lastCameraScannedTimeRef.current < 600)) {
            return;
          }
          lastCameraScannedCodeRef.current = finalLpn;
          lastCameraScannedTimeRef.current = now;
          executeScannedCode(finalLpn);
          return;
        }

        // C. MÃ SKU (MÃ SẢN PHẨM)
        if (type === 'SKU') {
          const isSkuMatch = !currentStdSku ||
            normalizedCode === currentStdSku ||
            isOpticalVariantOfSku(normalizedCode, currentStdSku) ||
            (matchCatalogSku(normalizedCode, currentStdSku) === currentStdSku);

          const finalCode = isSkuMatch ? (currentStdSku || normalizedCode) : normalizedCode;
          // Throttling camera 600ms giữa 2 lần quét cùng mã trên camera
          if (lastCameraScannedCodeRef.current === finalCode && (now - lastCameraScannedTimeRef.current < 600)) {
            return;
          }
          lastCameraScannedCodeRef.current = finalCode;
          lastCameraScannedTimeRef.current = now;
          executeScannedCode(finalCode);
          return;
        }
      };

      const scanner = new Html5Qrcode('v1-camera-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.UPC_A
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        verbose: false
      });
      html5QrCodeRef.current = scanner;

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const width = Math.min(viewfinderWidth, Math.floor(viewfinderWidth * 0.90));
          const height = Math.min(viewfinderHeight, Math.floor(viewfinderHeight * 0.65));
          return { width: Math.max(width, 220), height: Math.max(height, 120) };
        },
        aspectRatio: 1.777778
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        () => {} // Bỏ qua per-frame decode miss
      );

      isCameraRunningRef.current = true;
      setIsCameraActive(true);
      setCameraEngine('⚡ Html5Qrcode Hardware-Accelerated Engine');
    } catch (err) {
      console.error('Lỗi khởi động camera:', err);
      const isPermissionErr = err?.name === 'NotAllowedError' || err?.message?.toLowerCase?.()?.includes('permission');
      setCameraError(
        isPermissionErr
          ? 'Trình duyệt chưa được cấp quyền Camera. Vui lòng cho phép quyền Camera trong cài đặt trình duyệt.'
          : (err?.message || 'Không thể mở Camera. Vui lòng bấm "Thử Lại Mở Camera" bên dưới.')
      );
      setIsCameraActive(false);
    } finally {
      isStartingCameraRef.current = false;
    }
  };

  // Tự động khởi động camera khi mở tab quét để sẵn sàng nhận mã tức thì
  useEffect(() => {
    let timer;
    if (activeTab === 'scan') {
      timer = setTimeout(() => {
        startCamera();
      }, 300);
    } else {
      stopCamera();
    }
    return () => {
      if (timer) clearTimeout(timer);
      stopCamera();
    };
  }, [activeTab]);

  const toggleTorch = async () => {
    if (!isCameraActive || !html5QrCodeRef.current) return;
    try {
      const nextTorchState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorchState }]
      });
      setTorchOn(nextTorchState);
    } catch (err) {
      console.warn('Không thể thay đổi đèn flash:', err);
      setMessageModal({
        isOpen: true,
        type: 'info',
        title: 'Thông báo đèn Flash',
        message: 'Thiết bị hoặc camera hiện tại không hỗ trợ bật/tắt đèn Flash.'
      });
    }
  };

  // ─── HÀM CHỤP ẢNH TĨNH VÀ PHÂN TÍCH MÃ TỪ FRAME VIDEO ───
  const handleSnapshotScan = async () => {
    if (!isCameraActive || isCapturingSnapshot || !html5QrCodeRef.current) return;
    setIsCapturingSnapshot(true);
    setIsFlashAnimation(true);
    setTimeout(() => setIsFlashAnimation(false), 200);

    try {
      const video = document.querySelector('#v1-camera-reader video');
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        setMessageModal({
          isOpen: true,
          type: 'warning',
          title: 'Camera chưa sẵn sàng',
          message: 'Chưa nhận được hình ảnh từ camera. Vui lòng đợi 1 giây rồi thử lại.'
        });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error('Không thể tạo file ảnh từ camera');
      const file = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' });

      try {
        const result = await html5QrCodeRef.current.scanFile(file, false);
        if (result) {
          executeScannedCode(result);
          return;
        }
      } catch (scanErr) {
        console.warn('scanFile không đọc được:', scanErr);
      }

      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Chưa đọc được mã vạch',
        message: 'Không tìm thấy mã vạch trong ảnh chụp. Vui lòng giữ camera cách thùng 20-30cm, đủ ánh sáng và vuông góc với mã rồi thử lại.'
      });
    } catch (err) {
      console.error('Lỗi khi chụp ảnh tĩnh và phân tích mã:', err);
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Lỗi chụp ảnh',
        message: 'Đã xảy ra lỗi khi phân tích ảnh: ' + (err.message || 'Lỗi không xác định')
      });
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  // ─── HÀM IN THẺ KIỂM TRA PALLET KHỔ 56MM ───
  const handlePrintThermalTicket = useCallback((record) => {
    if (!record) return;

    // Lấy QR Code dạng hình ảnh từ canvas ẩn
    let qrDataUrl = '';
    const canvas = document.getElementById(`qr-thermal-canvas-${record.id}`);
    if (canvas) {
      try {
        qrDataUrl = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('Không thể trích xuất dataUrl từ Canvas QR:', err);
      }
    }

    const skuLines = (record.skus && record.skus.length > 0)
      ? record.skus.map(s => `
          <div style="display:flex; justify-content:space-between; font-size:10.5px; padding:1.5px 0;">
            <span style="font-family:Consolas,monospace; font-weight:bold;">${s.code || s}</span>
            <span style="font-weight:bold;">${s.count || 1} cái</span>
          </div>
        `).join('')
      : '<div style="font-size:10px; font-style:italic; color:#666;">Chưa có SKU</div>';

    const lpnLines = (record.lpns && record.lpns.length > 0)
      ? record.lpns.map(l => `
          <div style="display:flex; justify-content:space-between; font-size:10.5px; padding:1.5px 0;">
            <span style="font-family:Consolas,monospace; font-weight:bold;">${l.code || l}</span>
            <span style="font-weight:bold;">${l.count || 1} cái</span>
          </div>
        `).join('')
      : '<div style="font-size:10px; font-style:italic; color:#666;">Chưa có LPN</div>';

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Thẻ kiểm tra - ${record.id}</title>
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
            padding: 6px 4px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.3;
          }
          .tag-title {
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            color: #15803d;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .pallet-id {
            text-align: center;
            font-size: 12px;
            font-weight: 800;
            color: #111;
            font-family: Consolas, monospace;
          }
          .pallet-tab {
            text-align: center;
            font-size: 10.5px;
            font-weight: 700;
            color: #444;
            margin-bottom: 4px;
          }
          .dash-line {
            border-top: 1px dashed #666;
            margin: 4px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #333;
            margin: 1.5px 0;
          }
          .qr-container {
            text-align: center;
            margin: 5px 0 3px 0;
          }
          .qr-container img {
            width: 125px;
            height: 125px;
            display: block;
            margin: 0 auto;
          }
          .qr-subtext {
            text-align: center;
            font-size: 8.5px;
            color: #555;
            margin-top: 2px;
          }
          .sec-header {
            font-size: 10px;
            font-weight: 800;
            color: #222;
            text-transform: uppercase;
            margin: 3px 0 2px 0;
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
        <div class="tag-title">ĐÃ KIỂM TRA</div>
        <div class="pallet-id">${record.id}</div>
        <div class="pallet-tab">${record.tabTitle || (record.tabType === 'roof' ? 'Top nóc' : 'Pallet đứng')}</div>

        <div class="dash-line"></div>

        <div class="meta-row">
          <span>Thời gian:</span>
          <strong>${record.timestamp || ''}</strong>
        </div>
        <div class="meta-row">
          <span>Người kiểm:</span>
          <strong>${record.inspector || 'Nguyễn A'}</strong>
        </div>

        <div class="dash-line"></div>

        <div class="qr-container">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : ''}
          <div class="qr-subtext">Quét mã QR để mở lại lịch sử kiểm tra</div>
        </div>

        <div class="dash-line"></div>

        <div class="sec-header">DANH SÁCH SKU:</div>
        ${skuLines}

        <div class="dash-line"></div>

        <div class="sec-header">DANH SÁCH LPN:</div>
        ${lpnLines}

        <div class="dash-line"></div>
        <div class="footer-brand">G7 SmartFlow • Kiểm Tra Pallet</div>
      </body>
      </html>
    `;

    // 1. Nếu trên máy POS/thiết bị cầm tay có cầu AndroidPrint
    if (window.AndroidPrint && window.AndroidPrint.printHtml) {
      window.AndroidPrint.printHtml(printHtml, `The_Kiem_Tra_${record.id}`);
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
    doc.write(printHtml);
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
  }, []);

  // ─── THAO TÁC LƯU ĐỘC LẬP TỪNG TAB ───
  const handleSaveActiveTab = () => {
    const isStanding = palletTab === 'standing';
    const currentData = isStanding ? standingData : roofData;
    const tabTitle = isStanding ? 'Pallet đứng' : 'Top nóc';
    const prefix = isStanding ? 'PLD' : 'PLN';

    if (currentData.lpns.length === 0 && currentData.skus.length === 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Chưa có dữ liệu quét',
        message: `Tab [${tabTitle}] chưa có mã tem nhãn nào được ghi nhận. Vui lòng quét ít nhất 1 mã trước khi lưu!`
      });
      return;
    }

    const recordId = generateRecordId(prefix);
    const nowStr = new Date().toLocaleString('vi-VN');

    const newRecord = {
      id: recordId,
      tabType: palletTab,
      tabTitle: tabTitle,
      standardLpn: currentData.standardLpn,
      standardSku: currentData.standardSku,
      lpns: [...currentData.lpns],
      skus: [...currentData.skus],
      totalScans: currentData.totalScans,
      timestamp: nowStr,
      source: 'Máy ảnh',
      inspector: 'Nguyễn A',
      status: 'pass'
    };

    // Lưu vào lịch sử
    setHistoryList(prev => [newRecord, ...prev]);

    // Reset form sau khi lưu để sẵn sàng quét lượt mới
    const emptyState = {
      lpns: [],
      skus: [],
      standardLpn: null,
      standardSku: null,
      isSaved: false,
      savedKey: null,
      totalScans: 0
    };

    if (isStanding) {
      setStandingData(emptyState);
    } else {
      setRoofData(emptyState);
    }

    // Xóa bộ đệm máy quét
    lastProcessedCodeRef.current = '';
    lastProcessedTimeRef.current = 0;
    scannerBufferRef.current = '';
    if (hiddenScannerInputRef.current) {
      hiddenScannerInputRef.current.value = '';
    }

    playSuccessBeep();
    // Mở popup thông báo thành công kèm nút in thẻ kiểm tra 56mm
    setSaveSuccessModal({
      isOpen: true,
      record: newRecord
    });
  };

  const handleResetActiveTab = () => {
    const tabTitle = palletTab === 'standing' ? 'Pallet đứng' : 'Top nóc';
    const currentData = palletTab === 'standing' ? standingData : roofData;
    if (currentData.lpns.length === 0 && currentData.skus.length === 0) {
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: `Hủy quét ${tabTitle}?`,
      message: `Toàn bộ dữ liệu LPN và SKU đã quét của [${tabTitle}] sẽ bị hủy. Dữ liệu của tab kia vẫn được giữ nguyên. Bạn có chắc chắn muốn hủy không?`,
      onConfirm: () => {
        if (palletTab === 'standing') {
          setStandingData({
            lpns: [],
            skus: [],
            standardLpn: null,
            standardSku: null,
            isSaved: false,
            savedKey: null,
            totalScans: 0
          });
        } else {
          setRoofData({
            lpns: [],
            skus: [],
            standardLpn: null,
            standardSku: null,
            isSaved: false,
            savedKey: null,
            totalScans: 0
          });
        }
      }
    });
  };

  const handleDeleteCodeItem = (type, code) => {
    const setTarget = palletTab === 'standing' ? setStandingData : setRoofData;
    setTarget(prev => {
      const listKey = type === 'LPN' ? 'lpns' : 'skus';
      const updatedList = prev[listKey].filter(it => it.code !== code);
      return {
        ...prev,
        [listKey]: updatedList,
        [type === 'LPN' ? 'standardLpn' : 'standardSku']: updatedList.length > 0 ? prev[type === 'LPN' ? 'standardLpn' : 'standardSku'] : null
      };
    });
  };

  const currentTabState = palletTab === 'standing' ? standingData : roofData;

  return (
    <Layout>
      <PageHeader
        title="G7 - Smart Flow"
        subTitle="MB30 | Kiểm Tra Pallet v1"
      />

      <div style={{
        backgroundColor: '#f8f5ee',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        minHeight: 0,
        padding: '12px 12px 90px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%'
      }}>

        {/* ─── TAB CHUYỂN ĐỔI: KIỂM TRA MỚI / LỊCH SỬ ─── */}
        <div style={{
          display: 'flex',
          gap: '6px',
          backgroundColor: '#eae3d2',
          padding: '4px',
          borderRadius: '12px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
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
              backgroundColor: activeTab === 'scan' ? '#ffffff' : 'transparent',
              color: activeTab === 'scan' ? '#4b301e' : '#7c6d5e',
              boxShadow: activeTab === 'scan' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <ScanLine size={15} />
            <span>Kiểm Tra Mới</span>
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
            <span>Lịch Sử ({historyList.length})</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MÀN HÌNH 1: KIỂM TRA MỚI (SCAN)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'scan' && (
          <>
            {/* ─── CARD 1: THÔNG TIN ẢNH CHỤP / NGUỒN QUÉT ─── */}
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
                  <Camera size={16} color="#7b5233" />
                  <span>THÔNG TIN ĐỌC MÃ / MÁY ẢNH</span>
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

              {/* Input ngầm nhận tia quét tự động (máy POS / súng quét) */}
              <input
                ref={hiddenScannerInputRef}
                type="password"
                inputMode="none"
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
                  if (e.key === 'Enter' || e.keyCode === 13 || e.key === 'Tab' || e.keyCode === 9) {
                    e.preventDefault();
                    const val = (e.target.value || scannerBufferRef.current).trim();
                    e.target.value = '';
                    scannerBufferRef.current = '';
                    lastKeyTimeRef.current = 0;
                    setTimeout(() => {
                      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
                    }, 40);
                    if (val && val.length >= 2) {
                      executeScannedCode(val);
                    }
                  }
                }}
                onInput={(e) => {
                  const val = e.target.value;
                  if (val && (val.includes('\n') || val.includes('\r'))) {
                    const clean = val.replace(/[\r\n]/g, '').trim();
                    e.target.value = '';
                    scannerBufferRef.current = '';
                    lastKeyTimeRef.current = 0;
                    setTimeout(() => {
                      if (hiddenScannerInputRef.current) hiddenScannerInputRef.current.value = '';
                    }, 40);
                    if (clean && clean.length >= 2) {
                      executeScannedCode(clean);
                    }
                  }
                }}
              />

              {/* ── MÁY ẢNH QUÉT TRỰC TIẾP (ĐỒNG BỘ TÔNG MÀU BE/NÂU G7) ── */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: '#faf7f2',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #eadcc9'
                }}>
                  {/* Thanh điều khiển Camera đồng bộ tone */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px'
                  }}>
                    <span style={{ fontWeight: '800', color: '#4e3629', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Camera size={14} color="#7b5233" />
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
                          onClick={startCamera}
                          style={{
                            backgroundColor: '#7b5233',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Mở Camera
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopCamera}
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Tắt Camera
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Vùng Viewfinder hiển thị Camera */}
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
                    justifyContent: 'center',
                    marginTop: '4px'
                  }}>
                    <div 
                      id="v1-camera-reader" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: isCameraActive ? 'block' : 'none' 
                      }} 
                    />
                    <style>{`
                      #v1-camera-reader {
                        border: none !important;
                      }
                      #v1-camera-reader video {
                        width: 100% !important;
                        height: 100% !important;
                        max-height: 280px !important;
                        object-fit: cover !important;
                        border-radius: 8px !important;
                      }
                      #v1-camera-reader img {
                        display: none !important;
                      }
                    `}</style>

                    {isCameraActive && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {/* Khung ngắm định vị mã vạch và tia quét laser */}
                        <div style={{
                          width: '84%',
                          height: '58%',
                          maxHeight: '135px',
                          border: '2px solid rgba(255, 255, 255, 0.45)',
                          borderRadius: '8px',
                          position: 'relative',
                          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.28)'
                        }}>
                          {/* 4 góc viền vàng Gold Design System */}
                          <div style={{ position: 'absolute', top: -2, left: -2, width: 14, height: 14, borderTop: '3px solid #d4af37', borderLeft: '3px solid #d4af37' }} />
                          <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderTop: '3px solid #d4af37', borderRight: '3px solid #d4af37' }} />
                          <div style={{ position: 'absolute', bottom: -2, left: -2, width: 14, height: 14, borderBottom: '3px solid #d4af37', borderLeft: '3px solid #d4af37' }} />
                          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderBottom: '3px solid #d4af37', borderRight: '3px solid #d4af37' }} />
                          {/* Tia quét laser đỏ */}
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: '50%',
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, #ef4444, #f87171, #ef4444, transparent)',
                            boxShadow: '0 0 6px #ef4444'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Hiệu ứng chớp màn trập khi chụp ảnh tĩnh */}
                    {isFlashAnimation && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#ffffff',
                        opacity: 0.8,
                        zIndex: 35,
                        pointerEvents: 'none',
                        transition: 'opacity 0.2s ease-out'
                      }} />
                    )}

                    {!isCameraActive && !cameraError && (
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

                    {cameraError && (
                      <div style={{
                        color: '#f87171',
                        fontSize: '11px',
                        textAlign: 'center',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>{cameraError}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCameraError(null);
                            startCamera();
                          }}
                          style={{
                            backgroundColor: '#7b5233',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '5px 14px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Thử Lại Mở Camera
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Nút chụp ảnh tĩnh đặt bên ngoài khung ngắm (to tròn, chỉ icon Camera) */}
                  {isCameraActive && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '8px 0 2px 0'
                    }}>
                      <button
                        type="button"
                        onClick={handleSnapshotScan}
                        disabled={isCapturingSnapshot}
                        title="Chụp ảnh quét mã"
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          backgroundColor: isCapturingSnapshot ? '#0369a1' : '#0284c7',
                          border: '3.5px solid #bae6fd',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.45)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          transform: isCapturingSnapshot ? 'scale(0.92)' : 'scale(1)',
                          outline: 'none',
                          padding: 0
                        }}
                      >
                        <Camera size={28} color="#ffffff" strokeWidth={2.2} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Ô NHẬP MÃ THỦ CÔNG: Chỉ mở bàn phím ảo khi người dùng chủ động chạm vào ô text này */}
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center',
                  backgroundColor: '#faf8f5',
                  padding: '6px 8px',
                  borderRadius: '10px',
                  border: '1px solid #eadcc9'
                }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      ref={scanInputRef}
                      type="text"
                      value={scanInputText}
                      onChange={(e) => setScanInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const clean = scanInputText.trim();
                          if (clean) {
                            executeScannedCode(clean);
                            setScanInputText('');
                          }
                        }
                      }}
                      placeholder="Chạm vào đây để nhập mã thủ công..."
                      style={{
                        width: '100%',
                        padding: '8px 28px 8px 10px',
                        borderRadius: '7px',
                        border: '1px solid #d5c7b7',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#2d1810',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {scanInputText && (
                      <button
                        type="button"
                        onClick={() => setScanInputText('')}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const clean = scanInputText.trim();
                      if (clean) {
                        executeScannedCode(clean);
                        setScanInputText('');
                      }
                    }}
                    style={{
                      backgroundColor: '#7b5233',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '8px 12px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Nhận mã
                  </button>
                </div>
            </div>

            {/* ─── CARD 2: HAI TAB [PALLET ĐỨNG] & [TOP NÓC] VÀ DỮ LIỆU ĐỌC ─── */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1px solid #EADCC9',
              boxShadow: '0 3px 12px rgba(123, 82, 51, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* THANH CHUYỂN ĐỔI 2 TAB: 1. PALLET ĐỨNG | 2. TOP NÓC (Chuẩn giao diện như hình tham chiếu) */}
              <div style={{
                display: 'flex',
                backgroundColor: '#FAF5EE',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #EADCC9',
                gap: '4px'
              }}>
                {/* TAB 1: PALLET ĐỨNG */}
                <button
                  type="button"
                  onClick={() => {
                    setPalletTab('standing');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    backgroundColor: palletTab === 'standing' ? '#ffffff' : 'transparent',
                    color: palletTab === 'standing' ? '#4b301e' : '#7c6d5e',
                    boxShadow: palletTab === 'standing' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Package size={15} color={palletTab === 'standing' ? '#4b301e' : '#7c6d5e'} />
                  <span>Pallet đứng</span>
                  {standingData.isSaved && (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      ✓ ĐÃ LƯU (ĐẠT)
                    </span>
                  )}
                </button>

                {/* TAB 2: TOP NÓC */}
                <button
                  type="button"
                  onClick={() => {
                    setPalletTab('roof');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    backgroundColor: palletTab === 'roof' ? '#ffffff' : 'transparent',
                    color: palletTab === 'roof' ? '#4b301e' : '#7c6d5e',
                    boxShadow: palletTab === 'roof' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Layers size={15} color={palletTab === 'roof' ? '#4b301e' : '#7c6d5e'} />
                  <span>Top nóc</span>
                  {roofData.isSaved && (
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      ✓ ĐÃ LƯU (ĐẠT)
                    </span>
                  )}
                </button>
              </div>

              {/* ─── BẢNG CHIA 2 BÊN: ĐỒNG BỘ 100% GIAO DIỆN KIỂM TRA PALLET (AI) ─── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                {/* CỘT 1: MÃ LPN (Chuẩn phong cách G7 Mobile AI) */}
                <div style={{
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  backgroundColor: '#FAF8F5',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0
                }}>
                  <div style={{
                    padding: '5px 8px',
                    backgroundColor: '#FAF8F5',
                    borderBottom: '1px solid #EADCC9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#4E3629', textTransform: 'uppercase' }}>
                      MÃ LPN
                    </span>
                    <span style={{ fontSize: '0.67rem', color: '#7B5233', fontWeight: '700', backgroundColor: '#F4ECE1', padding: '1px 5px', borderRadius: '3px' }}>
                      {currentTabState.lpns.length} mã
                    </span>
                  </div>

                  <div style={{ padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                    {currentTabState.lpns.length === 0 ? (
                      <div style={{ padding: '16px 6px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        Chưa có mã LPN
                      </div>
                    ) : (
                      currentTabState.lpns.map((itemLpn, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #EADCC9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            minWidth: 0
                          }}
                        >
                          <span style={{
                            fontFamily: 'Consolas, monospace',
                            fontSize: '0.82rem',
                            fontWeight: '800',
                            color: '#1F2937',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {itemLpn.code}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              fontSize: '0.66rem',
                              color: '#4B5563',
                              fontWeight: '700',
                              backgroundColor: '#FAF8F5',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid #E5E7EB',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {itemLpn.count || 1} cái
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDeleteCodeItem('LPN', itemLpn.code)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#9ca3af',
                                padding: '1px',
                                cursor: 'pointer'
                              }}
                              title="Xóa mã này"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CỘT 2: MÃ SKU (Chuẩn phong cách G7 Mobile AI) */}
                <div style={{
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  backgroundColor: '#FAF8F5',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0
                }}>
                  <div style={{
                    padding: '5px 8px',
                    backgroundColor: '#FAF8F5',
                    borderBottom: '1px solid #EADCC9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#4E3629', textTransform: 'uppercase' }}>
                      MÃ SKU
                    </span>
                    <span style={{ fontSize: '0.67rem', color: '#7B5233', fontWeight: '700', backgroundColor: '#F4ECE1', padding: '1px 5px', borderRadius: '3px' }}>
                      {currentTabState.skus.length} mã
                    </span>
                  </div>

                  <div style={{ padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                    {currentTabState.skus.length === 0 ? (
                      <div style={{ padding: '16px 6px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        Chưa có mã SKU
                      </div>
                    ) : (
                      currentTabState.skus.map((itemSku, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #EADCC9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            minWidth: 0
                          }}
                        >
                          <span style={{
                            fontFamily: 'Consolas, monospace',
                            fontSize: '0.82rem',
                            fontWeight: '800',
                            color: '#1F2937',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {itemSku.code}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              fontSize: '0.66rem',
                              color: '#4B5563',
                              fontWeight: '700',
                              backgroundColor: '#FAF8F5',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid #E5E7EB',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {itemSku.count || 1} cái
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDeleteCodeItem('SKU', itemSku.code)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#9ca3af',
                                padding: '1px',
                                cursor: 'pointer'
                              }}
                              title="Xóa mã này"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

          </>
        )}

        {/* ─── THANH THAO TÁC CỐ ĐỊNH Ở DƯỚI CÙNG (FIXED BOTTOM BAR) ─── */}
        {activeTab === 'scan' && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '450px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #EADCC9',
            padding: '10px 14px',
            display: 'flex',
            gap: '10px',
            boxShadow: '0 -4px 16px rgba(75, 48, 30, 0.08)',
            zIndex: 990,
            boxSizing: 'border-box'
          }}>
            {/* Nút HỦY (đồng bộ giao diện, chiều cao, kiểu chữ với nút Lưu) */}
            <button
              type="button"
              onClick={handleResetActiveTab}
              disabled={currentTabState.lpns.length === 0 && currentTabState.skus.length === 0}
              style={{
                flex: 1,
                height: '44px',
                backgroundColor: '#FAF5EE',
                color: (currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) ? '#B5A698' : '#5C3A21',
                border: (currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) ? '1.5px solid #EADCC9' : '1.5px solid #D5C7B7',
                borderRadius: '12px',
                padding: '0 12px',
                fontSize: '0.88rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: (currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <XCircle size={16} color={(currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) ? '#B5A698' : '#7B5233'} />
              <span>Hủy</span>
            </button>

            {/* Nút LƯU PALLET ĐỨNG / LƯU TOP NÓC (đồng bộ giao diện, chiều cao, kiểu chữ) */}
            <button
              type="button"
              onClick={handleSaveActiveTab}
              disabled={currentTabState.lpns.length === 0 && currentTabState.skus.length === 0}
              style={{
                flex: 1.8,
                height: '44px',
                background: (currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) 
                  ? '#E5DDD3' 
                  : (currentTabState.isSaved
                    ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)'
                    : 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)'),
                color: (currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) ? '#A39282' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0 14px',
                fontSize: '0.88rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                cursor: (currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: (currentTabState.lpns.length === 0 && currentTabState.skus.length === 0) 
                  ? 'none' 
                  : (currentTabState.isSaved 
                    ? '0 4px 12px rgba(22, 163, 74, 0.28)' 
                    : '0 4px 12px rgba(75, 48, 30, 0.25)'),
                transition: 'all 0.2s ease'
              }}
            >
              {currentTabState.isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              <span>
                {currentTabState.isSaved
                  ? (palletTab === 'standing' ? '✓ Đã Lưu Đạt Chuẩn (Pallet Đứng)' : '✓ Đã Lưu Đạt Chuẩn (Top Nóc)')
                  : (palletTab === 'standing' ? 'Lưu Pallet Đứng' : 'Lưu Top Nóc')}
              </span>
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MÀN HÌNH 2: LỊCH SỬ (HISTORY)
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#5c3a21', textTransform: 'uppercase' }}>
                Lịch sử kiểm tra ({historyList.length} lượt)
              </span>

              {historyList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Xóa toàn bộ lịch sử?',
                      message: 'Toàn bộ danh sách lịch sử kiểm tra Pallet v1 trên thiết bị này sẽ bị xóa. Bạn có chắc chắn không?',
                      onConfirm: () => {
                        setHistoryList([]);
                        localStorage.removeItem('g7_pallet_v1_history');
                      }
                    });
                  }}
                  style={{
                    border: 'none',
                    background: '#fee2e2',
                    color: '#b91c1c',
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
                  <Trash2 size={12} />
                  <span>Xóa lịch sử</span>
                </button>
              )}
            </div>

            {historyList.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#94a3b8',
                border: '1px dashed #d1c7bd',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <History size={32} color="#cbd5e1" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
                  Chưa có lượt lưu nào
                </span>
                <span style={{ fontSize: '11px' }}>
                  Khi quét mã ở tab Pallet đứng hoặc Top nóc và bấm "Lưu", phiếu kiểm tra sẽ hiển thị tại đây.
                </span>
              </div>
            ) : (
              historyList.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedHistoryItem(item)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid #e5dcce',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#2d1810', fontFamily: 'Consolas, monospace' }}>
                        {item.id}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#5c3a21' }}>
                        - {item.tabTitle || (item.tabType === 'standing' ? 'Pallet đứng' : 'Top nóc')}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      color: '#059669',
                      backgroundColor: '#d1fae5',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      ĐẠT CHUẨN
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    fontSize: '11px',
                    backgroundColor: '#f9f6f0',
                    padding: '8px',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <span style={{ color: '#64748b' }}>LPN ({item.lpns?.length || 0}): </span>
                      <strong style={{ color: '#1e3a8a' }}>{item.standardLpn || 'Không có'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>SKU ({item.skus?.length || 0}): </span>
                      <strong style={{ color: '#9a3412' }}>{item.standardSku || 'Không có'}</strong>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: '#8c7664'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {item.timestamp}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} />
                      {item.inspector || 'Nguyễn A'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>



      {/* ═══════════════════════════════════════════════════════════════
          MODAL XEM CHI TIẾT LỊCH SỬ
      ═══════════════════════════════════════════════════════════════ */}
      {selectedHistoryItem && (
        <div
          onClick={() => setSelectedHistoryItem(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 35px -10px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.1)',
              border: '1px solid #ebe5dc'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #ebdccb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#faf7f2'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: '#2d1810',
                  fontFamily: 'Consolas, monospace',
                  letterSpacing: '0.2px'
                }}>
                  {selectedHistoryItem.id}
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#5c3a21'
                }}>
                  - {selectedHistoryItem.tabTitle || (selectedHistoryItem.tabType === 'roof' ? 'Top nóc' : 'Pallet đứng')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handlePrintThermalTicket(selectedHistoryItem)}
                  style={{
                    border: '1px solid #ebdccb',
                    backgroundColor: '#ffffff',
                    color: '#15803d',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}
                  title="In thẻ kiểm tra khổ 56mm"
                >
                  <Printer size={13} color="#15803d" />
                  <span>In thẻ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedHistoryItem(null)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Thẻ meta thông tin: Thời gian & Người kiểm tra */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '9px 12px',
                backgroundColor: '#faf8f5',
                borderRadius: '8px',
                border: '1px solid #eadcc9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="#8c7664" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: '#8c7664' }}>Thời gian lưu</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#2d1810', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedHistoryItem.timestamp}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="#8c7664" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: '#8c7664' }}>Người kiểm tra</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#2d1810', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedHistoryItem.inspector || selectedHistoryItem.checkedBy || 'Nguyễn A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Cột: LPN (Trái) & SKU (Phải) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                alignItems: 'start'
              }}>
                {/* Cột LPN */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #eadcc9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderBottom: '1px solid #f0e6d9'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#4b301e' }}>
                      MÃ LPN
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: '#f6f0e6',
                      color: '#4b301e',
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}>
                      {selectedHistoryItem.lpns?.length || 0} mã
                    </span>
                  </div>

                  {(!selectedHistoryItem.lpns || selectedHistoryItem.lpns.length === 0) ? (
                    <div style={{
                      padding: '24px 8px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '11.5px',
                      fontStyle: 'italic'
                    }}>
                      Chưa có mã LPN
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px',
                      maxHeight: '240px',
                      overflowY: 'auto'
                    }}>
                      {selectedHistoryItem.lpns.map((it, i) => (
                        <div key={i} style={{
                          backgroundColor: '#faf8f5',
                          border: '1px solid #eadcc9',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{
                            fontFamily: 'Consolas, monospace',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            color: '#2d1810',
                            wordBreak: 'break-all'
                          }}>
                            {it.code}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#4b301e',
                            backgroundColor: '#f4ece1',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            flexShrink: 0
                          }}>
                            {it.count} cái
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cột SKU */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #eadcc9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderBottom: '1px solid #f0e6d9'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#4b301e' }}>
                      MÃ SKU
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: '#f6f0e6',
                      color: '#4b301e',
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}>
                      {selectedHistoryItem.skus?.length || 0} mã
                    </span>
                  </div>

                  {(!selectedHistoryItem.skus || selectedHistoryItem.skus.length === 0) ? (
                    <div style={{
                      padding: '24px 8px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '11.5px',
                      fontStyle: 'italic'
                    }}>
                      Chưa có mã SKU
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px',
                      maxHeight: '240px',
                      overflowY: 'auto'
                    }}>
                      {selectedHistoryItem.skus.map((it, i) => (
                        <div key={i} style={{
                          backgroundColor: '#faf8f5',
                          border: '1px solid #eadcc9',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{
                            fontFamily: 'Consolas, monospace',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            color: '#2d1810',
                            wordBreak: 'break-all'
                          }}>
                            {it.code}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#4b301e',
                            backgroundColor: '#f4ece1',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            flexShrink: 0
                          }}>
                            {it.count} cái
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL THÔNG BÁO LƯU THÀNH CÔNG & IN THẺ KIỂM TRA 56MM
      ═══════════════════════════════════════════════════════════════ */}
      {saveSuccessModal.isOpen && saveSuccessModal.record && (
        <div
          onClick={() => setSaveSuccessModal({ isOpen: false, record: null })}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 20px 35px -10px rgba(0,0,0,0.25)',
              border: '1px solid #ebdccb'
            }}
          >
            {/* Icon thành công */}
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              border: '2px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
              color: '#15803d'
            }}>
              <CheckCircle2 size={30} />
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#15803d', margin: '0 0 3px 0' }}>
              ĐÃ LƯU THÀNH CÔNG!
            </h3>

            <div style={{
              fontSize: '13px',
              fontWeight: '800',
              color: '#2d1810',
              fontFamily: 'Consolas, monospace',
              marginBottom: '12px'
            }}>
              {saveSuccessModal.record.id} - {saveSuccessModal.record.tabTitle}
            </div>

            {/* Mã QR Code mẫu */}
            <div style={{
              backgroundColor: '#faf8f5',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #eadcc9',
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}>
              <QRCodeCanvas
                value={saveSuccessModal.record.id}
                size={110}
                level="M"
              />
              <span style={{ fontSize: '10px', color: '#8c7664', fontStyle: 'italic' }}>
                Quét mã này để mở lại lịch sử kiểm tra
              </span>
            </div>

            {/* Thông tin tóm tắt thẻ */}
            <div style={{
              width: '100%',
              backgroundColor: '#faf8f5',
              borderRadius: '8px',
              border: '1px solid #f0e6d9',
              padding: '8px 12px',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#786555' }}>Người kiểm tra:</span>
                <strong>{saveSuccessModal.record.inspector || 'Nguyễn A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#786555' }}>Mã SKU:</span>
                <strong>
                  {saveSuccessModal.record.skus?.length > 0 
                    ? `${saveSuccessModal.record.skus.map(s => s.code).join(', ')} (${saveSuccessModal.record.skus.reduce((a,b)=>a+(b.count||1),0)} cái)`
                    : 'Chưa có'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#786555' }}>Mã LPN:</span>
                <strong>
                  {saveSuccessModal.record.lpns?.length > 0 
                    ? `${saveSuccessModal.record.lpns.map(l => l.code).join(', ')} (${saveSuccessModal.record.lpns.reduce((a,b)=>a+(b.count||1),0)} cái)`
                    : 'Chưa có'}
                </strong>
              </div>
            </div>

            {/* Các nút thao tác */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handlePrintThermalTicket(saveSuccessModal.record)}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                }}
              >
                <Printer size={16} />
                <span>IN THẺ KIỂM TRA (56MM)</span>
              </button>

              <button
                type="button"
                onClick={() => setSaveSuccessModal({ isOpen: false, record: null })}
                style={{
                  width: '100%',
                  padding: '9px',
                  backgroundColor: '#f5f0e8',
                  color: '#4b301e',
                  border: '1px solid #e5dcce',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Đóng & Tiếp tục quét
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── HIDDEN QR CANVASES CHO LỆNH IN NHIỆT ─── */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        {saveSuccessModal.record && (
          <QRCodeCanvas
            id={`qr-thermal-canvas-${saveSuccessModal.record.id}`}
            value={saveSuccessModal.record.id}
            size={180}
            level="M"
          />
        )}
        {selectedHistoryItem && (
          <QRCodeCanvas
            id={`qr-thermal-canvas-${selectedHistoryItem.id}`}
            value={selectedHistoryItem.id}
            size={180}
            level="M"
          />
        )}
      </div>

      {/* ─── POP-UP THÔNG BÁO KẾT QUẢ QUÉT ─── */}
      {scanPopup && (() => {
        const isRejected = scanPopup.type === 'rejected';

        // Bảng màu thân thiện, hiện đại: Đỏ dịu mắt khi lệch mã | Nâu be G7 khi ghi nhận thường
        const borderColor = isRejected ? '#fecaca' : '#eadcc9';
        const shadowColor = isRejected 
          ? '0 20px 45px -10px rgba(220, 38, 38, 0.22), 0 8px 16px -4px rgba(0,0,0,0.06)'
          : '0 20px 40px -10px rgba(123, 82, 51, 0.16), 0 8px 16px -4px rgba(0,0,0,0.04)';
        const headerBg = isRejected ? '#fff5f5' : '#faf6f0';
        const headerBorder = isRejected ? '#fee2e2' : '#eadcc9';
        const iconBg = isRejected ? '#fee2e2' : '#f0e5d6';
        const iconRing = isRejected ? '0 0 0 6px #fef2f2' : '0 0 0 6px #faf6f0';
        const titleColor = isRejected ? '#b91c1c' : '#4e3629';

        return (
          <div style={{
            position: 'fixed',
            ...(isRejected ? {
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 9999
            } : {
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '90%',
              maxWidth: '350px',
              pointerEvents: 'none'
            })
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '350px',
              overflow: 'hidden',
              boxShadow: shadowColor,
              border: `1.5px solid ${borderColor}`,
              animation: 'scaleUp 0.18s ease-out'
            }}>
              {/* Header nằm ngang gọn gàng: Icon/Emoji 1 bên, Tiêu đề 1 bên, nút X góc phải */}
              <div style={{
                backgroundColor: headerBg,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                borderBottom: `1px solid ${headerBorder}`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  minWidth: 0,
                  flex: 1
                }}>
                  {/* Icon/Emoji 1 bên */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isRejected ? (
                      <AlertTriangle size={17} color="#dc2626" strokeWidth={2.4} />
                    ) : (
                      <Barcode size={17} color="#7b5233" strokeWidth={2.2} />
                    )}
                  </div>

                  {/* Tiêu đề 1 bên */}
                  <span style={{
                    fontSize: '13.5px',
                    fontWeight: '800',
                    color: titleColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {scanPopup.title || (isRejected ? 'BÁO ĐỘNG — LỆCH MÃ' : 'ĐÃ GHI NHẬN MÃ')}
                  </span>
                </div>

                {/* Nút X đóng góc phải */}
                <button
                  type="button"
                  onClick={() => setScanPopup(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: isRejected ? '#ef4444' : '#a89a8c',
                    padding: '4px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Đóng"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Nội dung chi tiết: Mã vừa quét và Mã chuẩn cùng 1 dòng, không xuống hàng */}
              <div style={{ padding: '12px 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  backgroundColor: isRejected ? '#fff8f8' : '#faf8f5',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  border: isRejected ? '1px solid #fed7d7' : '1px solid #eadcc9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* Hàng 1: Mã vừa quét (Label 1 bên, mã 1 bên trên cùng 1 hàng) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '2px 0'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: isRejected ? '#7f1d1d' : '#6b482b',
                      whiteSpace: 'nowrap'
                    }}>
                      Mã vừa quét:
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, justifyContent: 'flex-end' }}>
                      <span style={{
                        fontFamily: 'Consolas, monospace',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        color: isRejected ? '#b91c1c' : '#2d1810',
                        backgroundColor: isRejected ? '#fee2e2' : '#f0e8dc',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {scanPopup.code}
                      </span>
                      {scanPopup.category && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          color: isRejected ? '#991b1b' : '#6b482b',
                          backgroundColor: isRejected ? '#fecaca' : '#e5d7c4',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {scanPopup.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hàng 2: Mã chuẩn (Nếu có lệch mã - Label 1 bên, mã chuẩn 1 bên cùng 1 hàng) */}
                  {scanPopup.standardCode && (
                    <div style={{
                      borderTop: isRejected ? '1px dashed #fecaca' : '1px dashed #eadcc9',
                      paddingTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingBottom: '2px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#6b7280',
                        whiteSpace: 'nowrap'
                      }}>
                        Mã chuẩn:
                      </span>
                      <span style={{
                        fontFamily: 'Consolas, monospace',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        color: '#1f2937',
                        backgroundColor: '#f3f4f6',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {scanPopup.standardCode}
                      </span>
                    </div>
                  )}
                </div>

                {/* Thông điệp cảnh báo ngắn gọn, thân thiện khi bị từ chối */}
                {isRejected && (
                  <div style={{
                    fontSize: '11.5px',
                    lineHeight: '1.45',
                    color: '#b91c1c',
                    fontWeight: '600',
                    textAlign: 'center',
                    padding: '0 4px'
                  }}>
                    ✕ Hệ thống từ chối và <strong>không ghi nhận</strong> mã này
                  </div>
                )}

                {/* Nút đóng / thử lại */}
                <button
                  type="button"
                  onClick={() => setScanPopup(null)}
                  style={{
                    width: '100%',
                    height: '38px',
                    background: isRejected 
                      ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                      : 'linear-gradient(135deg, #5c3a21 0%, #7b5233 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: isRejected 
                      ? '0 4px 12px rgba(220, 38, 38, 0.25)' 
                      : '0 4px 12px rgba(123, 82, 51, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isRejected ? 'Đã hiểu — Thử lại' : 'Đóng / Tiếp tục quét'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Message Modal & Confirm Modal */}
      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onConfirm={() => {
          setMessageModal(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => {
          setMessageModal(prev => ({ ...prev, isOpen: false }));
        }}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </Layout>
  );
};

export default CheckPalletV1View;

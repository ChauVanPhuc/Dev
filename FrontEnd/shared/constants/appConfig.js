/**
 * File: Config.js
 * Quản lý cấu hình tập trung cho toàn bộ ứng dụng Mobile.
 */

// Tự động lấy hostname hiện tại để làm API URL
// Khi chạy trên trình duyệt di động: hostname sẽ là IP của máy tính (ví dụ: 192.168.1.222)
// Khi chạy Native App (Capacitor): hostname sẽ là 'localhost', lúc này ta dùng IP tĩnh bên dưới.
const currentHost = window.location.hostname;

// DANH SÁCH IP MÁY CHỦ TRONG MẠNG LAN (Cập nhật IP của bạn tại đây)
// Ưu tiên 1: 192.168.1.222 (Mạng công ty/nhà)
// Ưu tiên 2: 172.20.10.2  (Mạng phát từ điện thoại)
const DEFAULT_LAN_IP = '192.168.1.222';
// const DEFAULT_LAN_IP = '172.20.10.2'; 
// Cấu hình Tunnel (nếu dùng ngrok/cloudflare)
const REMOTE_DOMAIN = 'toeless-unarchitecturally-genevie.ngrok-free.dev';

// Xác định xem đang chạy qua Tunnel hay Local/LAN
export const IS_REMOTE = currentHost.includes('ngrok') || currentHost.includes('cloudflare');

// ÉP BUỘC SỬ DỤNG IP LAN ĐỂ GỠ LỖI APK
// Xác định Host: Luôn dùng LAN_IP nếu không phải là remote tunnel
const effectiveHost = IS_REMOTE ? currentHost : DEFAULT_LAN_IP;

// Base URL cho API và Static Files
export const BASE_URL = IS_REMOTE
    ? `https://${REMOTE_DOMAIN}`
    : `http://${effectiveHost}:1111`;

export const API_URL = BASE_URL;

export default {
    BASE_URL,
    API_URL,
    IS_REMOTE
};

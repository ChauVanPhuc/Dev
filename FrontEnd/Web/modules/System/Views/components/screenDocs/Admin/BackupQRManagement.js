const doc = {
  scenarios: [
    { title: "🏷️ Quản lý thẻ QR dự phòng", description: "Cấp phát, in ấn và giải phóng thẻ QR dùng cho pallet gỗ.", steps: [
      { target: "QRList", action: "Xem danh sách QR", note: "Danh sách mã QR với trạng thái: Trống, Đang dùng và mã phiếu giao." },
      { target: "GenerateQRForm", action: "Sinh mã QR mới", note: "Nhập số lượng cần sinh. POST /api/v1/deliveries/backup-qrs." },
      { target: "PrintQRModal", action: "In thẻ QR", note: "Vẽ QR code từ API qrserver. CSS media print khổ A5." },
      { target: "UnlockQRButton", action: "Giải phóng QR kẹt", note: "POST /api/v1/deliveries/backup-qrs/{qr_id}/release. Reset về status='Trống'." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Xem Danh Sách QR", desc: "Render danh sách mã QR với trạng thái.", component: "QRList", api: "GET /api/v1/deliveries/backup-qrs", logic: "Hiển thị trạng thái QR" },
    { step: 2, title: "Sinh Mã QR Mới", desc: "Form sinh dải mã QR mới tự động, mã tăng dần.", component: "GenerateQRForm", api: "POST /api/v1/deliveries/backup-qrs", logic: "Auto-increment mã QR" },
    { step: 3, title: "In Thẻ QR", desc: "Mở modal xem trước và in thẻ QR khổ A5.", component: "PrintQRModal", api: "qrserver API", logic: "CSS media print A5" },
    { step: 4, title: "Giải Phóng QR Bị Kẹt", desc: "Mở khóa thẻ QR bị treo trạng thái 'Đang dùng' về 'Trống'.", component: "UnlockQRButton", api: "POST /api/v1/deliveries/backup-qrs/{id}/release", logic: "Reset status='Trống'" }
  ],
  connections: {
    "QRList": ["GenerateQRForm", "PrintQRModal", "UnlockQRButton"],
    "GenerateQRForm": ["API POST /deliveries/backup-qrs"],
    "PrintQRModal": ["qrserver API"],
    "UnlockQRButton": ["API POST /deliveries/backup-qrs/{id}/release"]
  },
  codeDetails: {},
  sandboxResponses: {
    "GenerateQRForm": {
      url: "POST /api/v1/deliveries/backup-qrs",
      request: { quantity: 10 },
      response: { success: true, created_count: 10, first_code: "BQR-0051", last_code: "BQR-0060" }
    }
  }
};

export default doc;

const doc = {
  scenarios: [
    { title: "🖨️ In nhiệt tem nhãn pallet", description: "Thiết kế và in nhãn tem nhiệt khổ 58mm cho thẻ pallet.", steps: [
      { target: "ThermalPrintLayout", action: "Xem trước nhãn", note: "Nhãn tem tối ưu khổ 58mm. CSS print ẩn header/footer." },
      { target: "QRCanvasRenderer", action: "Render mã QR", note: "Vẽ mã QR chứa ID phiếu giao nhận bằng qrcode.react." },
      { target: "AndroidPrintBridge", action: "Gửi lệnh in", note: "Gọi window.AndroidPrint.printHtml truyền HTML + QR Base64." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Thiết Kế Nhãn In", desc: "Layout nhãn 58mm, ẩn header/footer mặc định trình duyệt.", component: "ThermalPrintLayout", api: "None", logic: "CSS print layout 58mm" },
    { step: 2, title: "Render Mã QR", desc: "Vẽ QR code động chứa ID phiếu.", component: "QRCanvasRenderer", api: "None", logic: "QRCodeCanvas từ qrcode.react" },
    { step: 3, title: "Gửi Lệnh In Native", desc: "Cầu nối gửi HTML từ Webview sang Android native.", component: "AndroidPrintBridge", api: "window.AndroidPrint.printHtml", logic: "HTML + QR Base64 to native" }
  ],
  connections: {
    "ThermalPrintLayout": ["CSS Print Engine", "QRCanvasRenderer"],
    "QRCanvasRenderer": ["qrcode.react Canvas Drawer"],
    "AndroidPrintBridge": ["window.AndroidPrint Native SDK"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

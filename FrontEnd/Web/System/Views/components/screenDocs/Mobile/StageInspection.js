const doc = {
  scenarios: [
    { title: "🔍 Kiểm tra công đoạn sản xuất", description: "Kiểm định chất lượng bán thành phẩm theo loại phiếu (phụ kiện, bám dính, sau đóng gói).", steps: [
      { target: "POSelector", action: "Chọn đơn hàng PO", note: "Chọn PO đang chạy để lấy thông tin sản phẩm và BOM." },
      { target: "StageInspectionForm", action: "Điền biểu mẫu", note: "Biểu mẫu thay đổi theo loại phiếu kiểm tra." },
      { target: "PhotoUploader", action: "Chụp ảnh lỗi", note: "Chụp và tải ảnh lỗi lên server." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Chọn Đơn Hàng PO", desc: "Chọn PO để lấy sản phẩm và BOM.", component: "POSelector", api: "GET /api/v1/orders/active", logic: "Load PO và danh mục SP" },
    { step: 2, title: "Điền Biểu Mẫu Kiểm Tra", desc: "Biểu mẫu động theo loại phiếu.", component: "StageInspectionForm", api: "None", logic: "Dynamic form theo loại phiếu" },
    { step: 3, title: "Chụp Ảnh Lỗi", desc: "Camera chụp ảnh và upload lên server.", component: "PhotoUploader", api: "POST /api/v1/files/upload", logic: "Upload trước, lấy URL" },
    { step: 4, title: "Lưu Phiếu Kiểm Tra", desc: "Lưu phiếu kiểm tra công đoạn chi tiết.", component: "StageInspectionService", api: "POST /api/v1/inspections/stage", logic: "Lưu phiếu kèm ảnh" }
  ],
  connections: {
    "POSelector": ["API GET /orders/active", "StageInspectionForm"],
    "StageInspectionForm": ["BOM Part Selector", "StageInspectionService"],
    "PhotoUploader": ["HTML5 Canvas Compressor", "API POST /files/upload"],
    "StageInspectionService": ["API POST /inspections/stage"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

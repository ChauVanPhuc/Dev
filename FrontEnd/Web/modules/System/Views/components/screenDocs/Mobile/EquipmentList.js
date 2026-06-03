const doc = {
  scenarios: [
    { title: "🔧 Kiểm tra thiết bị đầu ca", description: "Xem danh sách thiết bị và ghi nhận kết quả tự kiểm tra.", steps: [
      { target: "EquipmentList", action: "Xem danh sách", note: "Mã thiết bị, tên máy, phân loại, trạng thái hoạt động." },
      { target: "EquipmentInspectionModal", action: "Ghi nhận kiểm tra", note: "Chọn trạng thái Bình thường / Cần thay mới, nhập mô tả lỗi, chụp ảnh." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Danh Sách Thiết Bị", desc: "Danh sách máy móc, thiết bị đo lường.", component: "EquipmentList", api: "GET /api/v1/equipments/", logic: "Mã TB, tên, trạng thái" },
    { step: 2, title: "Ghi Nhận Kiểm Tra", desc: "Modal ghi nhận kết quả tự kiểm tra thiết bị đầu ca.", component: "EquipmentInspectionModal", api: "PATCH /api/v1/equipments/{id}/status", logic: "Bình thường / Cần thay mới" }
  ],
  connections: {
    "EquipmentList": ["EquipmentInspectionModal", "EquipmentService"],
    "EquipmentInspectionModal": ["Camera", "EquipmentService"],
    "EquipmentService": ["API GET /equipments/", "API PATCH /equipments/{id}/status"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

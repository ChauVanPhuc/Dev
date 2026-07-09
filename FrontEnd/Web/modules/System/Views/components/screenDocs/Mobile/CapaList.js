const doc = {
  scenarios: [
    { title: "📋 Xem danh sách CAPA", description: "Danh sách hành động khắc phục và phòng ngừa phát sinh từ lỗi QC.", steps: [
      { target: "CapaFilter", action: "Lọc CAPA", note: "Lọc theo mức độ khẩn cấp, tổ sản xuất chịu trách nhiệm." },
      { target: "CAPAList", action: "Xem danh sách", note: "Trạng thái: Mới, Đang xử lý, Hoàn thành, Chờ duyệt." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Danh Sách CAPA", desc: "Tải danh sách CAPA từ server.", component: "CapaService", api: "GET /api/v1/capas", logic: "Danh sách CAPA" },
    { step: 2, title: "Lọc CAPA", desc: "Lọc theo mức độ khẩn cấp và tổ SX.", component: "CapaFilter", api: "None", logic: "Client filter" },
    { step: 3, title: "Hiển Thị Danh Sách", desc: "Danh sách CAPA kèm trạng thái.", component: "CAPAList", api: "None", logic: "Mới/Đang xử lý/Hoàn thành/Chờ duyệt" }
  ],
  connections: {
    "CapaFilter": ["CAPAList"],
    "CAPAList": ["CapaService"],
    "CapaService": ["API GET /capas"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

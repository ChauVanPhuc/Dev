const doc = {
  scenarios: [
    { title: "📜 Tra cứu nhật ký kiểm tra", description: "Tìm kiếm và xem lịch sử kiểm tra hàng ngày + kiểm tra công đoạn.", steps: [
      { target: "InspectionLogsFilter", action: "Tìm kiếm", note: "Tìm theo mã lô, tên người kiểm tra hoặc loại hình kiểm tra." },
      { target: "CombinedInspectionLogsList", action: "Xem danh sách", note: "Danh sách gộp từ mới nhất đến cũ nhất." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Nhật Ký", desc: "Promise.all tải song song dữ liệu daily + stage inspections.", component: "InspectionLogsService", api: "GET /inspections/daily, GET /inspections/stage", logic: "Promise.all song song" },
    { step: 2, title: "Tìm Kiếm Nhanh", desc: "Lọc không phân biệt hoa thường theo mã lô, tên người kiểm tra.", component: "InspectionLogsFilter", api: "None", logic: "Case-insensitive search" },
    { step: 3, title: "Hiển Thị Danh Sách Gộp", desc: "Gộp và sắp xếp giảm dần theo thời gian.", component: "CombinedInspectionLogsList", api: "None", logic: "Sort desc by timestamp" }
  ],
  connections: {
    "InspectionLogsFilter": ["CombinedInspectionLogsList"],
    "CombinedInspectionLogsList": ["InspectionLogsService"],
    "InspectionLogsService": ["API GET /inspections/daily", "API GET /inspections/stage"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

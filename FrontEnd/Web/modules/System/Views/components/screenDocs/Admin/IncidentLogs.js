const doc = {
  scenarios: [
    {
      title: "🔧 Giám sát và xử lý sự cố",
      description: "Xem báo cáo sự cố hư hỏng máy móc thiết bị và cập nhật trạng thái khắc phục.",
      steps: [
        { target: "IncidentTable", action: "Xem danh sách", note: "Bảng hiển thị mã thiết bị, tên máy, mô tả lỗi, mức độ nghiêm trọng, trạng thái." },
        { target: "IncidentService", action: "Cập nhật", note: "PATCH trạng thái xử lý sự cố." }
      ]
    }
  ],
  workflows: [
    { step: 1, title: "Tải Danh Sách Sự Cố", desc: "Hiển thị các báo cáo sự cố hư hỏng máy móc thiết bị.", component: "IncidentTable", api: "GET /api/v1/incidents/", logic: "Hiển thị mã TB, tên máy, mô tả lỗi" },
    { step: 2, title: "Cập Nhật Trạng Thái", desc: "Cập nhật trạng thái khắc phục sự cố.", component: "IncidentService", api: "PATCH /api/v1/incidents/{id}/status", logic: "Chuyển trạng thái xử lý" }
  ],
  connections: {
    "IncidentTable": ["IncidentService"],
    "IncidentService": ["API GET /incidents/", "API PATCH /incidents/{id}/status"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

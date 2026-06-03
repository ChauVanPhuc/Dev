const doc = {
  scenarios: [
    { title: "👥 Xem danh sách KPI nhân viên", description: "Danh sách nhân viên cấp dưới kèm tóm tắt KPI tháng.", steps: [
      { target: "KPIListFilter", action: "Lọc theo tổ", note: "Lọc tìm kiếm nhân sự theo tổ đội." },
      { target: "StaffKPIList", action: "Xem danh sách", note: "Tên NV, công đoạn, điểm KPI trung bình." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Lọc Nhân Sự", desc: "Lọc theo tổ đội.", component: "KPIListFilter", api: "None", logic: "Client filter" },
    { step: 2, title: "Hiển Thị Danh Sách", desc: "Danh sách NV kèm KPI tháng.", component: "StaffKPIList", api: "GET /api/v1/kpis/staff-list", logic: "Tên, công đoạn, điểm KPI" }
  ],
  connections: { "KPIListFilter": ["StaffKPIList"], "StaffKPIList": ["API GET /kpis/staff-list"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

const doc = {
  scenarios: [
    { title: "📈 Theo dõi KPI cá nhân", description: "Xem biểu đồ KPI tuần/tháng và danh sách đầu việc cần làm trong ngày.", steps: [
      { target: "KPIDashboards", action: "Xem biểu đồ tròn", note: "Dashboard % hoàn thành KPI tuần/tháng bằng SVG + framer-motion." },
      { target: "ChecklistTasks", action: "Xem đầu việc", note: "Danh sách đầu việc cần làm, click để chuyển hướng nhanh." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Hiển Thị Biểu Đồ Tròn KPI", desc: "Dashboard SVG biểu đồ tròn tiến độ KPI.", component: "KPIDashboards", api: "GET /api/v1/kpis/me", logic: "SVG + framer-motion animation" },
    { step: 2, title: "Vẽ Vòng Tròn Tiến Độ", desc: "Component SVG vẽ vòng tròn tiến độ động.", component: "CircularProgress", api: "None", logic: "strokeDasharray + strokeDashoffset" },
    { step: 3, title: "Danh Sách Đầu Việc", desc: "Danh sách công việc cần hoàn thành trong ngày.", component: "ChecklistTasks", api: "None", logic: "Click chuyển hướng nhanh đến màn hình tương ứng" }
  ],
  connections: {
    "KPIDashboards": ["CircularProgress"],
    "CircularProgress": ["SVG strokeDasharray"],
    "ChecklistTasks": ["Điều hướng đến các màn hình tương ứng"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

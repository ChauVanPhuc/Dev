const doc = {
  scenarios: [
    { title: "📝 Đánh giá nhân viên", description: "Tổ trưởng đánh giá và xếp loại nhân viên cấp dưới hàng tháng.", steps: [
      { target: "StaffKPITable", action: "Xem kết quả KPI", note: "So sánh mục tiêu đặt ra vs kết quả thực tế." },
      { target: "StaffEvaluationForm", action: "Xếp loại", note: "Chọn xếp loại A/B/C/D và nhập ý kiến nhận xét." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Xem Bảng KPI Nhân Viên", desc: "So sánh kết quả mục tiêu vs thực tế.", component: "StaffKPITable", api: "GET /api/v1/kpis/staff/{id}", logic: "So sánh mục tiêu/thực tế" },
    { step: 2, title: "Xếp Loại & Nhận Xét", desc: "Radio button chọn A/B/C/D và textarea nhập ý kiến.", component: "StaffEvaluationForm", api: "None", logic: "Radio + Textarea" },
    { step: 3, title: "Gửi Đánh Giá", desc: "Gửi kết quả đánh giá lên server.", component: "StaffEvaluationService", api: "POST /api/v1/kpi/staff-evaluation", logic: "Submit đánh giá" }
  ],
  connections: {
    "StaffKPITable": ["StaffEvaluationForm"],
    "StaffEvaluationForm": ["StaffEvaluationService"],
    "StaffEvaluationService": ["API POST /kpi/staff-evaluation"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

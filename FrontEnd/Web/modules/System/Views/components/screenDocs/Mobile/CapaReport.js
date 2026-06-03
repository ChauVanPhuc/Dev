const doc = {
  scenarios: [
    {
      title: "📝 Lập báo cáo khắc phục CAPA",
      description: "Thực hiện nhập nguyên nhân lỗi (5-Why) và đề xuất biện pháp khắc phục phòng ngừa.",
      steps: [
        { target: "CAPAReportForm", action: "Nhập báo cáo", note: "Phân tích 5-Why, lập kế hoạch khắc phục và gán người chịu trách nhiệm." },
        { target: "CapaSubmitButton", action: "Gửi báo cáo", note: "Nhấn nút để gửi báo cáo CAPA lên hệ thống phê duyệt." }
      ]
    }
  ],
  workflows: [
    {
      step: 1,
      title: "Phân tích lỗi (5-Why)",
      desc: "Nhập nguyên nhân gốc rễ và kế hoạch khắc phục.",
      component: "CAPAReportForm",
      api: "None",
      logic: "Biểu mẫu nhập liệu"
    },
    {
      step: 2,
      title: "Gửi báo cáo CAPA",
      desc: "Gửi báo cáo CAPA lên hệ thống phê duyệt.",
      component: "CapaSubmitButton",
      api: "POST /api/v1/capa/reports",
      logic: "Submit báo cáo"
    }
  ],
  connections: {
    "CAPAReportForm": ["CapaSubmitButton"],
    "CapaSubmitButton": ["API POST /capa/reports"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

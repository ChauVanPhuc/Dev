const doc = {
  scenarios: [
    {
      title: "🔍 Xem chi tiết và phản hồi CAPA",
      description: "Theo dõi tiến độ xử lý và xem lịch sử phản hồi, phê duyệt của hành động CAPA.",
      steps: [
        { target: "CAPADetail", action: "Xem tiến độ", note: "Xem chi tiết tiến độ xử lý, người chịu trách nhiệm và lịch sử thay đổi." },
        { target: "CAPAHistory", action: "Xem phản hồi", note: "Lịch sử phản hồi và phê duyệt CAPA." }
      ]
    }
  ],
  workflows: [
    {
      step: 1,
      title: "Tải chi tiết CAPA",
      desc: "Tải dữ liệu chi tiết hành động khắc phục CAPA.",
      component: "CAPADetail",
      api: "GET /api/v1/capas/{id}",
      logic: "Hiển thị thông tin chi tiết và tiến trình"
    },
    {
      step: 2,
      title: "Xem lịch sử thay đổi",
      desc: "Xem lịch sử phản hồi và phê duyệt từ các bên liên quan.",
      component: "CAPAHistory",
      api: "None",
      logic: "Render dòng thời gian lịch sử phản hồi"
    }
  ],
  connections: {
    "CAPADetail": ["CAPAHistory"],
    "CAPAHistory": ["API GET /capas/{id}/history"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

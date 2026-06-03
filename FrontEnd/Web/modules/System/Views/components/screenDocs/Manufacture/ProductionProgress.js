const doc = {
  scenarios: [
    { title: "📈 Giám sát tiến độ sản xuất", description: "Biểu đồ trực quan tiến độ từng tổ máy tại công đoạn.", steps: [
      { target: "ProductionProgressChart", action: "Xem biểu đồ", note: "Biểu đồ Recharts hiển thị tiến độ hoàn thành thực tế so với mục tiêu." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Hiển Thị Biểu Đồ Tiến Độ", desc: "Biểu đồ trực quan tiến độ sản xuất so với mục tiêu.", component: "ProductionProgressChart", api: "GET /api/v1/plans/{id}/progress", logic: "Recharts bar/line chart" }
  ],
  connections: { "ProductionProgressChart": ["API GET /plans/{id}/progress"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

const doc = {
  scenarios: [
    { title: "➕ Tạo kế hoạch sản xuất mới", description: "Tạo KHSX thủ công bằng cách chọn sản phẩm và nhập số lượng mục tiêu.", steps: [
      { target: "PlanCreateForm", action: "Điền biểu mẫu", note: "Chọn sản phẩm từ danh mục, nhập số lượng mục tiêu, ngày bắt đầu và kết thúc." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Nhập Thông Tin KHSX", desc: "Chọn sản phẩm, nhập số lượng và thời gian.", component: "PlanCreateForm", api: "POST /api/v1/plans/", logic: "Validate và tạo KHSX" }
  ],
  connections: { "PlanCreateForm": ["API POST /plans/"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

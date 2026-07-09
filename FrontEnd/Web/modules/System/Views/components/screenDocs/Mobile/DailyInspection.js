const doc = {
  scenarios: [
    { title: "📝 Kiểm tra lỗi hàng ngày", description: "Nhập số lượng các loại lỗi phát hiện trong ngày theo nhóm.", steps: [
      { target: "DateSelector", action: "Chọn ngày", note: "Chọn ngày kiểm định chất lượng hàng ngày." },
      { target: "DailyInspectionForm", action: "Nhập lỗi", note: "Nhập theo tab: Ngoại quan, Kết cấu, Nguyên vật liệu, Cần theo dõi." },
      { target: "HotlistToggle", action: "Bật theo dõi nóng", note: "Bật/tắt theo dõi các loại lỗi kỹ thuật quan trọng." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Chọn Ngày Kiểm Tra", desc: "Chọn ngày kiểm định chất lượng.", component: "DateSelector", api: "None", logic: "Date picker" },
    { step: 2, title: "Nhập Số Lượng Lỗi", desc: "Biểu mẫu nhập theo tab phân nhóm lỗi.", component: "DailyInspectionForm", api: "None", logic: "Tabs: Ngoại quan, Kết cấu, NVL, Theo dõi" },
    { step: 3, title: "Bật/Tắt Theo Dõi Nóng", desc: "Toggle theo dõi các loại lỗi kỹ thuật quan trọng.", component: "HotlistToggle", api: "PATCH /api/v1/inspections/defect-types/{id}/toggle-tracking", logic: "needs_tracking = True/False" },
    { step: 4, title: "Lưu Phiếu Kiểm Tra", desc: "Lưu phiếu kiểm tra lỗi hàng ngày của QC.", component: "DailyInspectionService", api: "POST /api/v1/inspections/daily", logic: "Lưu phiếu kiểm tra" }
  ],
  connections: {
    "DateSelector": ["DailyInspectionForm"],
    "DailyInspectionForm": ["Ngoại Quan/Kết Cấu Schema", "DailyInspectionService"],
    "HotlistToggle": ["API PATCH /inspections/defect-types/{id}/toggle-tracking"],
    "DailyInspectionService": ["API POST /inspections/daily"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

const doc = {
  scenarios: [
    { title: "🔍 Xem chi tiết kiểm tra chất lượng", description: "Xem hướng dẫn kỹ thuật QC, nén ảnh và lưu kết quả offline.", steps: [
      { target: "InstructionManual", action: "Xem hướng dẫn", note: "Hiển thị tiêu chuẩn kỹ thuật tương ứng hạng mục kiểm tra." },
      { target: "CompressImageCanvas", action: "Nén ảnh QC", note: "Resize 1024x1024, JPEG 70%." },
      { target: "OfflinePendingQCStore", action: "Lưu tạm offline", note: "Lưu tại RAM, đồng bộ khi có mạng." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Xem Hướng Dẫn Kỹ Thuật", desc: "Tiêu chuẩn kỹ thuật đo đạc cho QC.", component: "InstructionManual", api: "None", logic: "Hiển thị tiêu chuẩn theo hạng mục" },
    { step: 2, title: "Nén Ảnh QC", desc: "Tự động nén ảnh trên Canvas.", component: "CompressImageCanvas", api: "None", logic: "Resize 1024x1024, JPEG 70%" },
    { step: 3, title: "Lưu Offline Tạm Thời", desc: "Lưu kết quả và ảnh QC tại RAM, tránh mất dữ liệu khi mất mạng.", component: "OfflinePendingQCStore", api: "None", logic: "pendingQCStore sync" }
  ],
  connections: {
    "InstructionManual": ["QC Standard Schema"],
    "CompressImageCanvas": ["HTML5 Canvas API"],
    "OfflinePendingQCStore": ["pendingQCStore RAM"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

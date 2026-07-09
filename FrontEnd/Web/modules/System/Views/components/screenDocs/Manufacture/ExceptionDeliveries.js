const doc = {
  scenarios: [
    { title: "⚠️ Quản lý thẻ pallet ngoại lệ", description: "Xem phiếu bàn giao bất thường và thiết kế/in thẻ pallet đối chứng.", steps: [
      { target: "ExceptionDeliveriesTable", action: "Xem danh sách", note: "Phiếu lệch thừa/thiếu, lỗi QC, bị trả hàng." },
      { target: "PalletCardSpreadsheet", action: "Chỉnh sửa thẻ", note: "Excel-like FortuneSheet thiết kế thông tin thẻ pallet." },
      { target: "PalletCardPrintModal", action: "In thẻ pallet", note: "Modal xem trước bản in khổ A4 cho thẻ pallet vật lý." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Phiếu Ngoại Lệ", desc: "Danh sách phiếu bàn giao bất thường.", component: "ExceptionDeliveriesTable", api: "GET /api/v1/deliveries/exceptions", logic: "Hiển thị chỉ số lệch" },
    { step: 2, title: "Chỉnh Sửa Thẻ Pallet", desc: "Giao diện Excel-like chỉnh sửa thông tin thẻ pallet.", component: "PalletCardSpreadsheet", api: "None", logic: "FortuneSheet grid editing" },
    { step: 3, title: "In Thẻ Pallet A4", desc: "Modal xem trước và in thẻ pallet khổ dọc A4.", component: "PalletCardPrintModal", api: "None", logic: "CSS print khổ dọc A4" },
    { step: 4, title: "Lưu Cấu Hình Thẻ", desc: "Lưu cấu hình bảng tính thẻ pallet đã chỉnh sửa.", component: "ExceptionDeliveriesService", api: "POST /api/v1/pallets/save", logic: "Lưu config thẻ" }
  ],
  connections: {
    "ExceptionDeliveriesTable": ["PalletCardSpreadsheet", "PalletCardPrintModal", "ExceptionDeliveriesService"],
    "PalletCardSpreadsheet": ["PalletCardPrintModal"],
    "ExceptionDeliveriesService": ["API GET /deliveries/exceptions", "API POST /pallets/save"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

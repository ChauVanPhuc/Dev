const doc = {
  scenarios: [
    {
      title: "🔍 Kiểm tra kích thước linh kiện",
      description: "Quét mã linh kiện đầu vào và đo đạc kích thước thực tế đối chiếu tiêu chuẩn.",
      steps: [
        { target: "QRScannerNative", action: "Quét mã QR", note: "Kích hoạt camera quét mã QR trên chi tiết gỗ để nạp thông số chuẩn." },
        { target: "PartInfoBanner", action: "Xem tiêu chuẩn", note: "Hiển thị thông tin dung sai cho phép từ bản vẽ thiết kế." },
        { target: "DimensionInput", action: "Nhập số đo", note: "Nhập chiều dài/rộng/dày thực tế đo được để hệ thống so sánh." },
        { target: "SaveInspectionButton", action: "Lưu kết quả", note: "Nhấn lưu để ghi nhận kết quả QC kiểm tra." }
      ]
    }
  ],
  workflows: [
    {
      step: 1,
      title: "Nhận Diện Mã Linh Kiện",
      desc: "Quét QR dán trên ván gỗ đầu vào để tra cứu thông số kỹ thuật chuẩn.",
      component: "QRScannerNative",
      api: "Native Camera SDK",
      logic: "Truy tìm mã BOM của chi tiết gỗ"
    },
    {
      step: 2,
      title: "Xem Dung Sai Standard",
      desc: "Hiển thị tiêu chuẩn kích thước và dung sai cho phép đối với mã gỗ này.",
      component: "PartInfoBanner",
      api: "GET /api/v1/parts/specs",
      logic: "Nạp dữ liệu kỹ thuật chuẩn"
    },
    {
      step: 3,
      title: "Nhập Kích Thước Đo",
      desc: "Nhập kết quả chiều dài, rộng, dày thực tế đo bằng thước điện tử.",
      component: "DimensionInput",
      api: "None (Local)",
      logic: "Tính dung sai thực tế so với chuẩn"
    },
    {
      step: 4,
      title: "Lưu Nhật Ký Kiểm Tra",
      desc: "Lưu phiếu đánh giá gỗ đầu vào đạt hay loại để hệ thống theo dõi KPI NCC.",
      component: "SaveInspectionButton",
      api: "POST /api/v1/inspections/inbound",
      logic: "Ghi lịch sử & Cập nhật KPI NCC"
    }
  ],
  connections: {
    "DimensionInput": ["Dung Sai Standard Schema"],
    "SaveInspectionButton": ["API POST /inspections"],
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;

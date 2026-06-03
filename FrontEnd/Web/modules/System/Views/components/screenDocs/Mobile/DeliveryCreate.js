const doc = {
  scenarios: [
    { title: "📝 Tạo phiếu giao hàng mới", description: "Lập phiếu chuyển linh kiện bán thành phẩm từ công đoạn hiện tại.", steps: [
      { target: "PartSelector", action: "Chọn linh kiện", note: "Dropdown chọn chi tiết từ BOM. Gọi API kiểm tra trạng thái QC trước khi giao." },
      { target: "MoistureInput", action: "Nhập độ ẩm", note: "Nhập 3 giá trị đo độ ẩm gỗ. Tự động tính trung bình." },
      { target: "CameraCapture", action: "Chụp ảnh", note: "Chụp ảnh minh chứng. Nén qua Canvas 70% và đóng FormData." },
      { target: "SubmitDeliveryButton", action: "Gửi phiếu", note: "Đóng gói FormData và POST /api/v1/deliveries/." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Chọn Linh Kiện BOM", desc: "Chọn chi tiết linh kiện cần bàn giao và kiểm tra trạng thái QC.", component: "PartSelector", api: "GET /api/v1/inspections/plan/{plan_id}/part", logic: "Kiểm tra QC trước khi giao" },
    { step: 2, title: "Nhập Độ Ẩm Gỗ", desc: "Nhập 3 giá trị đo, hệ thống tự động tính trung bình.", component: "MoistureInput", api: "None", logic: "Tính trung bình 3 giá trị" },
    { step: 3, title: "Chụp Ảnh Minh Chứng", desc: "Camera native chụp ảnh, nén qua Canvas xuống 70%.", component: "CameraCapture", api: "Native Camera SDK", logic: "HTML Canvas nén 70%" },
    { step: 4, title: "Gửi Phiếu Bàn Giao", desc: "Đóng gói dữ liệu FormData và gửi tạo phiếu.", component: "SubmitDeliveryButton", api: "POST /api/v1/deliveries/", logic: "FormData multipart upload" }
  ],
  connections: {
    "PartSelector": ["API GET /inspections/plan/{plan_id}/part"],
    "MoistureInput": ["SubmitDeliveryButton"],
    "CameraCapture": ["HTML5 Canvas Compressor"],
    "SubmitDeliveryButton": ["API POST /deliveries/"]
  },
  codeDetails: {
    "SubmitDeliveryButton": {
      handlerName: "handleSubmitDelivery",
      params: "None",
      processing: "Thu thập dữ liệu form, đóng gói vào FormData kèm ảnh đã nén. Gửi POST /api/v1/deliveries/. Nếu thành công hiển thị thông báo và quay về.",
      codeSnippet: `const handleSubmitDelivery = async () => {
  const formData = new FormData();
  formData.append('plan_id', selectedPlan);
  formData.append('part_name', selectedPart);
  formData.append('quantity', quantity);
  formData.append('moisture', JSON.stringify(moistureValues));
  photos.forEach(p => formData.append('files', p.file));
  const res = await api.post('/deliveries/', formData);
  if (res.data.success) {
    showToast("Tạo phiếu thành công!");
    navigation.goBack();
  }
};`
    }
  },
  sandboxResponses: {
    "SubmitDeliveryButton": {
      url: "POST /api/v1/deliveries/",
      request: { plan_id: 2, part_name: "Ván cửa", quantity: 300, moisture: [11.2, 11.5, 11.0] },
      response: { success: true, delivery_id: 105, created_at: "2026-05-27T09:05:00" }
    }
  }
};

export default doc;

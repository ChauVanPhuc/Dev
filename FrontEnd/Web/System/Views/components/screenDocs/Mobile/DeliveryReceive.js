const doc = {
  scenarios: [
    {
      title: "🚚 SX nhận hàng bàn giao",
      description: "Quy trình Tổ trưởng công đoạn nhận kiểm đếm số lượng thực nhận và ký xác nhận.",
      steps: [
        { target: "QRScannerNative", action: "Quét mã QR", note: "Kích hoạt camera native để nhận diện thẻ pallet hàng." },
        { target: "PalletInfoCard", action: "Đọc thông tin", note: "Đối chiếu số lượng chi tiết thực tế trên pallet so với phiếu bàn giao." },
        { target: "QuantityConfirmInput", action: "Nhập số nhận", note: "Nhập số lượng thực tế nhận được (thường bằng số bàn giao trừ đi hao hụt thấy rõ)." },
        { target: "ConfirmReceiveButton", action: "Xác nhận nhận", note: "Nhấn nút xác nhận nhận hàng để đưa trạng thái phiếu sang Chờ QC Kiểm Tra." }
      ]
    },
    {
      title: "🔍 QC kiểm tra chất lượng",
      description: "Quy trình nhân viên QC thực hiện đo đạc, đánh giá chất lượng sản phẩm thực nhận theo 8 chỉ tiêu.",
      steps: [
        { target: "QualityChecklist", action: "Đánh giá 8 lỗi", note: "Kiểm định độ ẩm, độ cong vênh, kết cấu, kích thước... theo tiêu chuẩn chất lượng." },
        { target: "SaveQCButton", action: "Lưu kết quả QC", note: "Lưu biên bản kết quả QC đạt để chuyển trạng thái sang Hoàn thành." },
        { target: "CreateReturnSlipButton", action: "Lập phiếu trả hàng", note: "Nếu có sản phẩm lỗi, lập phiếu trả hàng lỗi chuyển ngược về tổ sản xuất giao trước đó." }
      ]
    }
  ],
  workflows: [
    {
      step: 1,
      title: "Quét Mã QR Pallet Gỗ",
      desc: "Sử dụng camera quét mã QR dán trên thẻ pallet gỗ để lấy thông tin định danh.",
      component: "QRScannerNative",
      api: "Native Camera SDK",
      logic: "Giải mã QR và trích xuất pallet_id"
    },
    {
      step: 2,
      title: "Truy Vấn Thông Tin Pallet",
      desc: "Tải dữ liệu từ máy chủ về loại gỗ, quy cách ván, số lượng gửi ban đầu.",
      component: "PalletInfoCard",
      api: "GET /api/v1/pallets/{id}",
      logic: "Hiển thị thông số pallet thực tế"
    },
    {
      step: 3,
      title: "Xác Nhận Số Nhận (SX Nhận)",
      desc: "Tổ trưởng SX nhận kiểm đếm gỗ và nhập số lượng thực tế nhận được vào ô input, giới hạn bởi số lượng gửi gốc.",
      component: "QuantityConfirmInput",
      api: "None (Client Validation)",
      logic: "Ràng buộc số nhận <= số lượng giao"
    },
    {
      step: 4,
      title: "Ký Biên Nhận Giao Hàng",
      desc: "Nhấn xác nhận để đóng giai đoạn bàn giao của Tổ SX, cập nhật trạng thái phiếu sang Chờ QC Kiểm Tra.",
      component: "ConfirmReceiveButton",
      api: "PATCH /api/v1/deliveries/{id}/confirm",
      logic: "Ghi nhận số lượng nhận & chuyển tiếp luồng sang QC"
    },
    {
      step: 5,
      title: "Kiểm Định Chất Lượng (QC Kiểm)",
      desc: "Nhân viên QC chuyển sang tab chất lượng, đánh giá sản phẩm thực tế theo 8 chỉ tiêu kiểm lỗi.",
      component: "QualityChecklist",
      api: "Validation Schema",
      logic: "Đánh giá đạt/hỏng từng chỉ tiêu để xuất biên bản QC"
    },
    {
      step: 6,
      title: "Lưu Biên Bản QC Hoàn Tất",
      desc: "Lưu kết quả kiểm tra QC lên máy chủ để cập nhật biên bản chất lượng của lô hàng, đổi trạng thái phiếu thành Hoàn thành.",
      component: "SaveQCButton",
      api: "POST /api/v1/qc/{id}",
      logic: "Lưu kết quả QC chi tiết và cập nhật kho hàng"
    },
    {
      step: 7,
      title: "Lập Phiếu Trả Hàng Lỗi",
      desc: "Trường hợp có hàng lỗi không đạt chuẩn, QC thực hiện lập phiếu trả hàng về công đoạn trước đó.",
      component: "CreateReturnSlipButton",
      api: "POST /api/v1/returns/",
      logic: "Khởi tạo phiếu trả hàng chờ SX giao xác nhận"
    }
  ],
  connections: {
    "QRScannerNative": ["PalletInfoCard", "Camera Hardware API"],
    "PalletInfoCard": ["API GET /pallets/{id}"],
    "QualityChecklist": ["8 Chỉ Tiêu QC Schema"],
    "QuantityConfirmInput": ["Validation Engine"],
    "ConfirmReceiveButton": ["API PATCH /deliveries/confirm"],
    "SaveQCButton": ["QualityChecklist", "API POST /qc/{id}"],
    "CreateReturnSlipButton": ["API POST /returns"],
  },
  codeDetails: {
    "ConfirmReceiveButton": {
      handlerName: "handleConfirmReceive",
      params: "deliveryId: number, receivedQty: number",
      processing: "Kiểm tra tính hợp lệ của số lượng nhập vào. Gọi API PATCH để cập nhật số lượng thực nhận của phiếu giao hàng. Nếu thành công, hiển thị toast thông báo và reload trang.",
      codeSnippet: `const handleConfirmReceive = async (deliveryId, receivedQty) => {
  if (receivedQty <= 0) {
    showToast("Số lượng nhận phải lớn hơn 0", "error");
    return;
  }
  setConfirmLoading(true);
  try {
    const res = await api.patch(\`/deliveries/\${deliveryId}/confirm\`, {
      received_quantity: receivedQty,
      confirmed_at: new Date().toISOString()
    });
    if (res.data.success) {
      showToast("Đã xác nhận nhận hàng thành công!");
      refreshDeliveries();
    }
  } catch (e) {
    showToast("Lỗi kết nối máy chủ: " + e.message, "error");
  } finally {
    setConfirmLoading(false);
  }
};`
    },
    "QuantityConfirmInput": {
      handlerName: "onQtyInputChange",
      params: "text: string, maxQty: number",
      processing: "Chỉ cho phép nhập ký tự số nguyên. Giới hạn số lượng nhập không được vượt quá số lượng gửi đi trên phiếu giao (maxQty) nhằm chống sai lệch tồn kho.",
      codeSnippet: `const onQtyInputChange = (text, maxQty) => {
  const numericValue = text.replace(/[^0-9]/g, '');
  const enteredQty = parseInt(numericValue, 10) || 0;
  
  if (enteredQty > maxQty) {
    setQuantity(maxQty.toString());
    setError("Số lượng nhận không được vượt quá số lượng giao!");
  } else {
    setQuantity(numericValue);
    setError("");
  }
};`
    },
    "SaveQCButton": {
      handlerName: "handleSaveQC",
      params: "None",
      processing: "Gom toàn bộ kết quả của 8 chỉ tiêu QC từ state, tạo đối tượng FormData kèm theo các file ảnh minh chứng lỗi chất lượng và gọi API POST /qc/{id} để lưu biên bản kiểm định chất lượng, đưa trạng thái phiếu về Hoàn thành.",
      codeSnippet: `const handleSaveQC = async () => {
  const formData = new FormData();
  formData.append('results_json', JSON.stringify(qcData));
  formData.append('quantity_error', qcData.scrap_qty);
  formData.append('quantity_inspection', totalInspected);
  const resp = await apiClient.post(\`/qc/\${id}\`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  if (resp.data.status === 'success') {
    showToast("Lưu biên bản QC thành công!");
  }
};`
    },
    "CreateReturnSlipButton": {
      handlerName: "handleCreateReturnSlip",
      params: "None",
      processing: "Khi QC phát hiện lỗi vượt ngưỡng hoặc muốn trả lại hàng cho công đoạn sản xuất trước, lập phiếu trả hàng lỗi (trên Tab Trả hàng) kèm hình ảnh lỗi và gửi lên POST /api/v1/returns/.",
      codeSnippet: `const handleCreateReturnSlip = async () => {
  const formData = new FormData();
  formData.append('delivery_id', id);
  formData.append('quantity', returnQty);
  formData.append('note', returnNote);
  returnPhotos.forEach(p => {
    if (p.file) formData.append('files', p.file);
  });
  await apiClient.post('/returns/', formData);
};`
    }
  },
  sandboxResponses: {
    "ConfirmReceiveButton": {
      url: "PATCH /api/v1/deliveries/104/confirm",
      request: { quantity_received: 48, qc_passed: true },
      response: { success: true, message: "Đã xác nhận nhận 48 linh kiện gỗ đạt tiêu chuẩn.", status: "CONFIRMED" }
    }
  }
};

export default doc;

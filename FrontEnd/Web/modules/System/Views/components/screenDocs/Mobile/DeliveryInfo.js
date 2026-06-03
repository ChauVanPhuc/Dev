const doc = {
  scenarios: [
    {
      title: "📋 Tra cứu kế hoạch gỗ",
      description: "Xem tiến độ gỗ ván, thanh ngang và đối chiếu số lượng kế hoạch của trạm.",
      steps: [
        { target: "PlanSelector", action: "Chọn kế hoạch", note: "Chọn kế hoạch sản xuất hiện hành tháng 5/2026." },
        { target: "DetailAccordion", action: "Mở chi tiết", note: "Nhấn mở rộng thẻ Accordion để hiển thị danh sách linh kiện chi tiết." },
        { target: "PlanTable", action: "Xem số lượng", note: "Đối chiếu số lượng thực tế gỗ đạt so với kế hoạch ban đầu." }
      ]
    },
    {
      title: "🚚 Bàn giao sản phẩm QC",
      description: "Quy trình chuyển giao sản phẩm gỗ bán thành phẩm sang khâu chà nhám.",
      steps: [
        { target: "QuickCreateButton", action: "Nhấp nút", note: "Nhấn '+ Tạo nhanh' để chuẩn bị tạo phiếu bàn giao mới." },
        { target: "DeliveryOverviewCard", action: "Xem lịch sử", note: "Chuyển sang Tab 'Bàn giao' để theo dõi các phiếu đã gửi đi." }
      ]
    },
    {
      title: "📱 Quét mã QR luân chuyển",
      description: "Sử dụng camera quét mã QR dán trên pallet gỗ hoặc thẻ dự phòng để nhận dạng nhanh.",
      steps: [
        { target: "QRScannerNative", action: "Kích hoạt quét", note: "Nhấn vào biểu tượng quét mã QR trên thanh tiêu đề để mở camera native." }
      ]
    }
  ],
  workflows: [
    {
      step: 1,
      title: "Mở Hướng Dẫn Quy Trình",
      desc: "Công nhân trạm gỗ click vào nút trợ giúp để xem chuẩn vận hành đóng gói và xếp pallet ván.",
      component: "UserGuideButton",
      api: "None (Client UI)",
      logic: "Mở Hướng Dẫn Popover"
    },
    {
      step: 2,
      title: "Chọn Kế Hoạch Sản Xuất",
      desc: "Lựa chọn kế hoạch gỗ đang chạy trong ca để nạp thông tin chỉ tiêu sản lượng.",
      component: "PlanSelector",
      api: "GET /api/v1/plans/active",
      logic: "Đồng bộ BOM & Linh kiện của kế hoạch chọn"
    },
    {
      step: 3,
      title: "Đối Chiếu BOM & Chi Tiết",
      desc: "Mở rộng bảng chi tiết linh kiện ván và thanh để kiểm đếm thực tế so với mục tiêu kế hoạch.",
      component: "PlanTable",
      api: "GET /api/v1/plans/{id}/details",
      logic: "Tính tỷ lệ đạt / không đạt tự động"
    },
    {
      step: 4,
      title: "Khởi Tạo Phiếu Bàn Giao",
      desc: "Nhấn nút tạo nhanh để bắt đầu quy trình chuyển giao linh kiện đã hoàn tất sang khâu QC kế tiếp.",
      component: "QuickCreateButton",
      api: "POST /api/v1/deliveries/create",
      logic: "Khởi tạo mã phiếu DEL-xxxxx mới"
    },
    {
      step: 5,
      title: "Quét Mã QR Nhận Nhanh / Tạo Nhanh",
      desc: "Nhấp vào nút quét mã QR trên thanh tiêu đề để quét thẻ pallet. Tự động kiểm tra trạng thái thẻ để đi tới trang tạo phiếu hoặc nhận hàng tương ứng.",
      component: "QRScannerNative",
      api: "Native Camera SDK",
      logic: "Định tuyến dựa trên mã QR quét được (Tạo phiếu mới hoặc Xác nhận nhận hàng)"
    }
  ],
  connections: {
    "UserGuideButton": ["Modal Hướng Dẫn Popover"],
    "NotificationBell": ["FCM Push Service", "WebSocketConnector"],
    "QuickCreateButton": ["Màn hình MB2.1 (Tạo phiếu)"],
    "PlanSelector": ["API GET /plans/active", "DetailAccordion"],
    "DetailAccordion": ["PlanTable"],
    "PlanTable": ["API GET /plans/details", "BOM Schema"],
    "DeliveryOverviewCard": ["API GET /deliveries", "DeliveryDetail"],
    "WebSocketConnector": ["API WebSocket /ws/stage"],
  },
  codeDetails: {
    "QRScannerNative": {
      handlerName: "onQRScanned",
      params: "qrcodeData: string",
      processing: "Nhận chuỗi giải mã từ camera native. Tách chuỗi để lấy mã pallet (ví dụ: 'PAL-104'). Gọi API truy vấn dữ liệu chi tiết của pallet trước khi chuyển sang form xác nhận nhận hàng.",
      codeSnippet: `const onQRScanned = async (qrcodeData) => {
  if (!qrcodeData) return;
  const palletId = extractPalletId(qrcodeData); 
  try {
    setScanning(false);
    const response = await api.get(\`/pallets/\${palletId}\`);
    navigation.navigate('DeliveryReceiveConfirm', { 
      palletData: response.data 
    });
  } catch (error) {
    Alert.alert("Lỗi quét mã", "Pallet không tồn tại hoặc đã giao.");
    setScanning(true);
  }
};`
    },
    "PlanSelector": {
      handlerName: "handlePlanSelect",
      params: "planId: number",
      processing: "Lưu ID kế hoạch sản xuất được chọn vào AsyncStorage để ghi nhớ phiên làm việc của công nhân. Kích hoạt gọi API đồng bộ danh mục chi tiết linh kiện tương ứng.",
      codeSnippet: `const handlePlanSelect = async (planId) => {
  setSelectedPlanId(planId);
  await AsyncStorage.setItem('selected_plan_id', planId.toString());
  // Kích hoạt load lại bảng linh kiện
  fetchPlanDetails(planId);
};`
    },
    "NotificationBell": {
      handlerName: "fetchUnreadNotifications",
      params: "userId: number",
      processing: "Lấy danh sách thông báo chất lượng và tiến độ chưa đọc của người dùng. Thiết lập lắng nghe sự kiện đẩy (FCM token) để tăng số đếm badge tức thời.",
      codeSnippet: `const fetchUnreadNotifications = async (userId) => {
  try {
    const res = await api.get(\`/notifications/unread/\${userId}\`);
    setUnreadCount(res.data.unread_count);
  } catch (error) {
    console.error("Lỗi lấy thông báo:", error);
  }
};`
    },
    "WebSocketConnector": {
      handlerName: "initializeSocket",
      params: "stageName: string",
      processing: "Khởi tạo kết nối WebSocket với máy chủ. Tự động đăng ký kênh lắng nghe sự kiện dựa trên công đoạn làm việc để đồng bộ dữ liệu giao nhận mà không cần load lại trang.",
      codeSnippet: `const initializeSocket = (stageName) => {
  const wsUrl = \`ws://\${window.location.host}/ws/stage/\${stageName}\`;
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.event === "NEW_DELIVERY") {
      playAlertSound();
      addNewDeliveryToList(data.payload);
    }
  };
  
  ws.onclose = () => {
    setTimeout(() => initializeSocket(stageName), 5000); // Auto reconnect
  };
};`
    }
  },
  sandboxResponses: {
    "QRScannerNative": {
      url: "Native Camera Scan",
      request: { mode: "continuous_scan" },
      response: { success: true, barcode: "PALLET-G7-MB2-081", parsed_data: { pallet_id: 104, item_name: "Thanh ngang G7" } }
    },
    "WebSocketConnector": {
      url: "WS /ws/stage/chuyen-phoi",
      request: { client_id: "MB_DEV_09" },
      response: [
        { time: "10:15:30", event: "CONNECT", msg: "WebSocket connected." },
        { time: "10:15:35", event: "NEW_DELIVERY", msg: "Có phiếu giao hàng mới DEL-2026-082" }
      ]
    }
  }
};

export default doc;

const doc = {
  scenarios: [
    {
      title: "📊 Giám sát chỉ số KPI hệ thống",
      description: "Xem các biểu đồ đo lường hiệu suất và tỷ lệ lỗi QC tổng hợp toàn nhà máy.",
      steps: [
        { target: "DashboardOverview", action: "Xem tổng quan", note: "Theo dõi biểu đồ sản lượng, tiến độ KHSX và hiệu suất ca." },
        { target: "KPIStatCards", action: "Kiểm tra KPI", note: "Đối chiếu tỷ lệ lỗi thực tế so với kế hoạch đề ra theo tuần/tháng." }
      ]
    }
  ],
  workflows: [
    {
      step: 1,
      title: "Tải Số Liệu Thống Kê",
      desc: "Hệ thống tự động gọi API tải số liệu sản lượng, tỷ lệ đạt QC của ngày/tuần/tháng hiện tại.",
      component: "DashboardService",
      api: "GET /api/v1/dashboard/stats",
      logic: "Tính toán KPI và tỷ lệ phần trăm chênh lệch"
    },
    {
      step: 2,
      title: "Hiển Thị Dashboard Tổng Quan",
      desc: "Render các card thống kê động sử dụng CSS Grid, hiển thị các chỉ số KPI chính.",
      component: "DashboardOverview",
      api: "None (Client Render)",
      logic: "CSS Grid layout cho card thống kê"
    },
    {
      step: 3,
      title: "Hiển Thị Thẻ KPI Chi Tiết",
      desc: "Component con nhận dữ liệu từ Dashboard để render số lượng và vẽ biểu đồ mini cho từng KPI.",
      component: "KPIStatCards",
      api: "None (Props từ Dashboard)",
      logic: "Vẽ biểu đồ mini tỷ lệ lỗi"
    }
  ],
  connections: {
    "DashboardOverview": ["KPIStatCards", "DashboardService"],
    "KPIStatCards": ["DashboardService"],
    "DashboardService": ["API GET /dashboard/stats"]
  },
  codeDetails: {
    "DashboardService": {
      handlerName: "fetchDashboardStats",
      params: "None",
      processing: "Gọi API GET /api/v1/dashboard/stats để tải toàn bộ số liệu thống kê. Cập nhật state dữ liệu tổng quan cho các component con.",
      codeSnippet: `const fetchDashboardStats = async () => {
  try {
    const res = await api.get('/dashboard/stats');
    setStats(res.data);
  } catch (error) {
    console.error("Lỗi tải dashboard:", error);
  }
};`
    }
  },
  sandboxResponses: {
    "DashboardService": {
      url: "GET /api/v1/dashboard/stats",
      request: {},
      response: { total_production: 1250, qc_pass_rate: 96.5, defect_count: 44, weekly_target: 1500 }
    }
  }
};

export default doc;

const doc = {
  scenarios: [
    { title: "📋 Quản lý kế hoạch sản xuất", description: "Xem danh sách KHSX, lọc theo trạng thái và nhập KHSX từ Excel.", steps: [
      { target: "PlanFilter", action: "Lọc trạng thái", note: "Lọc theo: Đang chạy, Chờ duyệt, Hoàn thành, Đã hủy." },
      { target: "PlanTable", action: "Xem danh sách", note: "Hiển thị Mã KHSX, Tên, Mã sản phẩm, Số lượng, Trạng thái." },
      { target: "PlanImportButton", action: "Nhập Excel", note: "Nhập dữ liệu KHSX hàng loạt từ file Excel." }
    ]},
    { title: "➕ Tạo kế hoạch mới", description: "Tạo kế hoạch sản xuất mới từ form nhập liệu.", steps: [
      { target: "AddPlanButton", action: "Mở form tạo", note: "Click nút Thêm Kế hoạch để mở modal." },
      { target: "AddPlanForm", action: "Nhập thông tin", note: "Nhập tên, năm, tháng và mô tả kế hoạch." },
      { target: "SubmitButton", action: "Lưu kế hoạch", note: "Submit form để tạo kế hoạch mới." }
    ]},
    { title: "📤 Upload file Excel", description: "Upload file Excel để import kế hoạch hàng loạt.", steps: [
      { target: "PlanImportButton", action: "Chọn file", note: "Click nút Nhập Excel để mở file picker." },
      { target: "FilePreview", action: "Xem preview", note: "Xem thông tin file đã chọn (tên, kích thước)." },
      { target: "UploadButton", action: "Upload", note: "Click Upload để gửi file lên server." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Danh Sách KHSX", desc: "Tải danh sách kế hoạch sản xuất.", component: "PlanTable", api: "GET /api/v1/plans/", logic: "Phân trang" },
    { step: 2, title: "Lọc Kế Hoạch", desc: "Lọc theo trạng thái kế hoạch.", component: "PlanFilter", api: "None", logic: "Client filter" },
    { step: 3, title: "Nhập Từ Excel", desc: "Import KHSX hàng loạt từ file Excel.", component: "PlanImportButton", api: "POST /api/v1/plans/import", logic: "FormData file upload" },
    { step: 4, title: "Tạo Kế Hoạch Mới", desc: "Tạo kế hoạch sản xuất mới từ form.", component: "AddPlanButton", api: "POST /api/v1/plans/", logic: "Form validation & API call" }
  ],
  connections: {
    "PlanTable": ["PlanFilter", "PlanService"],
    "PlanFilter": ["PlanTable"],
    "PlanImportButton": ["API POST /plans/import"],
    "AddPlanButton": ["API POST /plans/"],
    "PlanService": ["API GET /plans/"]
  },
  codeDetails: {
    "PlanImportButton": {
      handlerName: "handleFileUpload",
      params: "file: File",
      processing: "Xử lý upload file Excel lên server thông qua FormData. Hiển thị progress bar và thông báo kết quả.",
      codeSnippet: `const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post('/api/v1/plans/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      }
    });
    showNotification('success', 'Upload thành công!');
    refreshPlans();
  } catch (error) {
    showNotification('error', 'Upload thất bại');
  }
};`
    },
    "AddPlanButton": {
      handlerName: "handleCreatePlan",
      params: "planData: { name, year, month, description }",
      processing: "Validate form data và gọi API tạo kế hoạch mới. Reset form sau khi thành công.",
      codeSnippet: `const handleCreatePlan = async (planData) => {
  try {
    const response = await planService.createPlan({
      name: planData.name,
      year: parseInt(planData.year),
      month: parseInt(planData.month),
      description: planData.description
    });
    
    setAddModalOpen(false);
    resetForm();
    showNotification('success', 'Tạo kế hoạch thành công!');
    refreshPlans();
  } catch (error) {
    showNotification('error', 'Tạo kế hoạch thất bại');
  }
};`
    }
  },
  sandboxResponses: {
    "PlanImportButton": {
      url: "POST /api/v1/plans/import",
      request: { file: "File object (Excel)" },
      response: { success: true, message: "Imported 50 plans", imported_count: 50 }
    },
    "AddPlanButton": {
      url: "POST /api/v1/plans/",
      request: { name: "KHSX T6-2026", year: 2026, month: 6, description: "Kế hoạch tháng 6" },
      response: { success: true, plan_id: 123, created_at: "2026-05-29T10:00:00" }
    }
  }
};

export default doc;

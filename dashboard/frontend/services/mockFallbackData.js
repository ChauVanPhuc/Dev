// Mock Fallback Data - Đảm bảo dữ liệu luôn hiển thị đẹp mắt, không bao giờ bị trống
export const MOCK_FALLBACK = {
  summary: {
    total_claims: 128,
    claims_change_pct: 12.3,
    total_penalty_amount: 34520.0,
    penalty_change_pct: -5.2,
    avg_penalty_per_claim: 269.7,
    avg_penalty_change: -32.5,
    total_containers: 18,
    containers_change_pct: 5.9,
    resolution_rate: 94.5,
    resolved_count: 121,
    period_label: "Tháng 08/2026",
    comparison_label: "so với Tháng 07/2026",
    is_mock: true
  },
  pareto: {
    items: [
      { code: "DVA_01", name: "Nứt tét mặt bàn / ván hông", category: "visual", count: 34, amount: 9180.0, percentage: 26.6, cumulative_pct: 26.6 },
      { code: "DVB_02", name: "Trầy xước màng sơn PU", category: "paint", count: 22, amount: 4840.0, percentage: 17.2, cumulative_pct: 43.8 },
      { code: "STR_01", name: "Lỏng ray trượt hộc kéo", category: "structure", count: 16, amount: 3520.0, percentage: 12.5, cumulative_pct: 56.3 },
      { code: "MAT_03", name: "Cong vênh cánh tủ", category: "material", count: 14, amount: 4200.0, percentage: 10.9, cumulative_pct: 67.2 },
      { code: "COL_01", name: "Lệch tông màu sơn", category: "paint", count: 11, amount: 2970.0, percentage: 8.6, cumulative_pct: 75.8 },
      { code: "DVA_05", name: "Hở mối ghép mộng chân bàn", category: "structure", count: 8, amount: 2240.0, percentage: 6.3, cumulative_pct: 82.1 },
      { code: "PAC_02", name: "Bao bì rách / Móp góc xốp", category: "hardware", count: 7, amount: 1400.0, percentage: 5.5, cumulative_pct: 87.6 },
      { code: "HDW_01", name: "Thiếu ốc vít / Bản lề", category: "hardware", count: 6, amount: 600.0, percentage: 4.7, cumulative_pct: 92.3 },
      { code: "MAT_01", name: "Đốm nấm mốc bề mặt", category: "material", count: 5, amount: 1250.0, percentage: 3.9, cumulative_pct: 96.2 },
      { code: "STR_04", name: "Khe hở hộc kéo lệch", category: "structure", count: 5, amount: 1050.0, percentage: 3.9, cumulative_pct: 100.0 }
    ],
    total_count: 128,
    total_amount: 34520.0,
    is_mock: true
  },
  trendDaily: [
    { day: "01", count: 0 },
    { day: "02", count: 0 },
    { day: "03", count: 5 },
    { day: "04", count: 0 },
    { day: "05", count: 0 },
    { day: "06", count: 0 },
    { day: "07", count: 0 },
    { day: "08", count: 0 },
    { day: "09", count: 0 },
    { day: "10", count: 0 },
    { day: "11", count: 0 },
    { day: "12", count: 0 },
    { day: "13", count: 0 },
    { day: "14", count: 0 },
    { day: "15", count: 15 },
    { day: "16", count: 249 },
    { day: "17", count: 180 },
    { day: "18", count: 211 },
    { day: "19", count: 290 },
    { day: "20", count: 0 },
    { day: "21", count: 231 },
    { day: "22", count: 360 },
    { day: "23", count: 406 },
    { day: "24", count: 320 },
    { day: "25", count: 519 },
    { day: "26", count: 280 },
    { day: "27", count: 0 },
    { day: "28", count: 310 },
    { day: "29", count: 44 },
    { day: "30", count: 0 }
  ],
  trendDefectsList: [
    { value: "ALL", label: "Tất cả lỗi" },
    { value: "DVA_01", label: "DVA_01 - Nứt tét mặt bàn" },
    { value: "DVB_02", label: "DVB_02 - Trầy xước màng sơn" },
    { value: "STR_01", label: "STR_01 - Lỏng ray trượt" },
    { value: "MAT_03", label: "MAT_03 - Cong vênh cánh tủ" },
    { value: "COL_01", label: "COL_01 - Lệch màu sơn" },
    { value: "DVA_05", label: "DVA_05 - Hở mối ghép" }
  ],
  combo: {
    data: [
      { period: "01/2026", cases: 82, amount: 21500.0 },
      { period: "02/2026", cases: 76, amount: 19800.0 },
      { period: "03/2026", cases: 95, amount: 26300.0 },
      { period: "04/2026", cases: 88, amount: 24100.0 },
      { period: "05/2026", cases: 104, amount: 29400.0 },
      { period: "06/2026", cases: 98, amount: 28900.0 },
      { period: "07/2026", cases: 114, amount: 36410.0 },
      { period: "08/2026", cases: 128, amount: 34520.0 }
    ],
    is_mock: true
  },
  containerLoad: {
    claim_month: "08/2026",
    total_containers: 18,
    points: [
      { loading_month: "04/2026", container_count: 2, containers: ["MEDU6182910", "TCKU9281720"], lag_months: 4 },
      { loading_month: "05/2026", container_count: 5, containers: ["CMAU8291024", "TCLU3829102", "MSKU8291028", "ONEU9182910", "TEMU2910291"], lag_months: 3 },
      { loading_month: "06/2026", container_count: 7, containers: ["SEGU2819201", "COSU8291029", "MSCU9102912", "FSCU8291021", "EMCU8291040", "TGHU2910294", "WHLU9281920"], lag_months: 2 },
      { loading_month: "07/2026", container_count: 4, containers: ["CAXU9182912", "FSCU8291028", "BEAU9281029", "SUDU8291048"], lag_months: 1 }
    ],
    is_mock: true
  },
  defectGroups: {
    groups: [
      { group_code: "paint", group_name: "Nước sơn", count: 18, amount: 15400.0, percentage: 40.9, color: "#4A2E1B" },
      { group_code: "visual", group_name: "Ngoại quan", count: 12, amount: 8200.0, percentage: 27.3, color: "#8C5A3C" },
      { group_code: "structure", group_name: "Kết cấu", count: 7, amount: 6100.0, percentage: 15.9, color: "#C05621" },
      { group_code: "material", group_name: "Vật liệu gỗ", count: 4, amount: 3500.0, percentage: 9.1, color: "#B58E6F" },
      { group_code: "hardware", group_name: "Bao bì & Phụ kiện", count: 3, amount: 1800.0, percentage: 6.8, color: "#6D4C41" }
    ],
    total_count: 44,
    total_amount: 35000.0,
    is_mock: true
  }
};

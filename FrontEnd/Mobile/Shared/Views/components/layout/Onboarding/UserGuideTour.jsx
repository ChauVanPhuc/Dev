import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

const TOUR_STEPS = {
  '/delivery-info': [
    {
      target: '#delivery-plan-select',
      title: 'Chọn Kế Hoạch Sản Xuất',
      content: 'Lựa chọn kế hoạch sản xuất hiện tại đang chạy để theo dõi tiến độ giao nhận và danh sách các phiếu bàn giao liên quan.',
      placement: 'bottom'
    },
    {
      target: '#delivery-po-select',
      title: 'Lọc Theo Container (Cont)',
      content: 'Lọc nhanh tiến độ bàn giao của từng Container (Cont) cụ thể trong kế hoạch để kiểm tra tiến trình hoàn thành chi tiết.',
      placement: 'bottom'
    },
    {
      target: '#delivery-filter-btn',
      title: 'Bộ Lọc Trạng Thái Nâng Cao',
      content: 'Nhấn vào biểu tượng bộ lọc để mở bảng tìm kiếm nhanh theo tên linh kiện hoặc lọc phiếu theo các trạng thái (Chờ QC, Chờ nhận, Đã hoàn thành...) hoặc loại phiếu (Giao đi/Nhận về).',
      placement: 'bottom'
    },
    {
      target: '#delivery-sort-btn',
      title: 'Sắp Xếp Danh Sách',
      content: 'Thay đổi thứ tự hiển thị của linh kiện hoặc phiếu bàn giao theo thời gian (mới nhất/cũ nhất), tên chữ cái, hoặc số lượng từ cao xuống thấp.',
      placement: 'bottom'
    },
    {
      target: '#delivery-excel-btn',
      title: 'Xuất Báo Cáo Excel Danh Sách',
      content: 'Bấm biểu tượng Excel để tải xuống toàn bộ dữ liệu danh sách hiện tại theo đúng bộ lọc của bạn. Tập tin xuất ra có độ rộng cột chuẩn rõ ràng, đầy đủ thông tin.',
      placement: 'bottom'
    },
    {
      target: '#delivery-tabs',
      title: 'Chuyển Đổi Tab Kế Hoạch / Bàn Giao',
      content: 'Chuyển đổi giữa tab "Kế hoạch" (để xem bảng tổng hợp tiến độ từng chi tiết và dư thừa của từng loại linh kiện) và tab "Bàn giao" (xem danh sách các phiếu biên nhận luân chuyển thực tế).',
      placement: 'bottom'
    },
    {
      target: '#delivery-create-btn',
      title: 'Tạo Nhanh Phiếu Giao Hàng',
      content: 'Bấm nút "Tạo nhanh" để bắt đầu lập một phiếu bàn giao sản phẩm mới để chuyển sang công đoạn kế tiếp. (Tính năng dành riêng cho bộ phận Sản xuất).',
      placement: 'bottom'
    },
    {
      target: '#header-scanner-btn',
      title: 'Quét Mã QR Nhận Diện',
      content: 'Nhấn vào biểu tượng quét ở tiêu đề để mở camera quét nhanh mã QR trên Thẻ Pallet. Hệ thống sẽ tự động tìm kiếm và mở trực tiếp chi tiết phiếu bàn giao đó để xử lý.',
      placement: 'bottom'
    },
    {
      target: '#header-notification-btn',
      title: 'Thông Báo Hệ Thống Realtime',
      content: 'Nhấn vào biểu tượng chuông để xem danh sách các thông báo mới nhất về phiếu bàn giao vừa được tạo, nhận, hoặc các biên bản QC vừa hoàn thành.',
      placement: 'bottom'
    },
    {
      target: '#delivery-parts-table',
      title: 'Chi Tiết Tiến Độ Linh Kiện',
      content: 'Xem chi tiết tổng số lượng linh kiện đã sản xuất, số lượng thực tế bàn giao đạt chuẩn, và số lượng dư thừa (+dư) phát sinh so với kế hoạch BOM.',
      placement: 'top'
    },
    {
      target: '#delivery-tickets-list',
      title: 'Danh Sách Phiếu Bàn Giao & Thẻ Pallet',
      content: 'Bấm 1 lần vào phiếu để xem chi tiết tiếp nhận và QC. Nhấn đúp (Double-tap) hoặc bấm nút "Thẻ Pallet" để xem và xuất thẻ Pallet (in A5 hoặc xuất Excel đầy đủ thông tin Bàn giao, PO, QC đầu vào và QC đầu cuối).',
      placement: 'top'
    }
  ],
  '/delivery-create': [
    {
      target: '#delivery-create-tabs',
      title: 'Phân Loại Thông Tin Phiếu',
      content: 'Dễ dàng chuyển đổi giữa tab "Thông tin bàn giao" (để nhập số lượng) và tab "Thông tin chất lượng" (để xem kết quả test QC đầu vào của lô vật liệu).',
      placement: 'bottom'
    },
    {
      target: '#delivery-khsx-btn',
      title: 'Xem Kế Hoạch Sản Xuất',
      content: 'Xem bảng phân rã BOM và tiến độ hoàn thành hiện tại của tất cả các chi tiết trong kế hoạch sản xuất để đối chiếu trực tiếp.',
      placement: 'bottom'
    },
    {
      target: '#delivery-pallet-btn',
      title: 'Xem Trước Thẻ Pallet',
      content: 'Xem trước định dạng Thẻ Pallet sẽ in (bao gồm mã vạch QR, tên chi tiết, số lượng...) để kiểm tra thông tin trước khi hoàn tất.',
      placement: 'bottom'
    },
    {
      target: '#delivery-stages-group',
      title: 'Công Đoạn Giao Và Nhận',
      content: 'Hiển thị công đoạn hiện tại của bạn (bên bàn giao) và tự động xác định công đoạn kế tiếp nhận lô hàng dựa trên luồng sản xuất BOM.',
      placement: 'bottom'
    },
    {
      target: '#delivery-part-select',
      title: 'Chọn Chi Tiết Linh Kiện',
      content: 'Chọn linh kiện cần bàn giao từ danh sách cấu thành của KHSX. Hệ thống sẽ tự động điền các thông tin mặc định liên quan.',
      placement: 'bottom'
    },
    {
      target: '#delivery-spec-select',
      title: 'Chọn Quy Cách Sản Phẩm',
      content: 'Lựa chọn quy cách kích thước hoặc đặc tính của linh kiện vừa chọn để phân loại chính xác mã cấu kiện.',
      placement: 'bottom'
    },
    {
      target: '#delivery-order-select',
      title: 'Chọn Đơn Hàng Giao (Cont)',
      content: 'Chọn số hiệu Container (Cont) đích để gán số lượng giao. Hệ thống hiển thị rõ lượng sản phẩm còn thiếu để bạn kiểm soát.',
      placement: 'top'
    },
    {
      target: '#delivery-qty-input',
      title: 'Nhập Tổng Số Lượng Giao',
      content: 'Nhập số lượng thực tế xếp lên pallet bàn giao. Hãy đảm bảo số lượng này khớp với thực tế cân/đếm.',
      placement: 'top'
    },
    {
      target: '#delivery-moisture-group',
      title: 'Ghi Nhận Độ Ẩm Vật Liệu',
      content: 'Nhập dải độ ẩm (Min - Max) đo được của lô gỗ/vật liệu. Hệ thống yêu cầu độ ẩm nằm trong mức tiêu chuẩn cho phép để đảm bảo chất lượng.',
      placement: 'top'
    },
    {
      target: '#delivery-residual-input',
      title: 'Tự Động Tính Số Dư',
      content: 'Hiển thị số lượng linh kiện bàn giao dư thừa so với tổng nhu cầu còn thiếu của các Cont đã chọn. Giúp hạn chế tối đa việc sản xuất dư thừa lãng phí.',
      placement: 'top'
    },
    {
      target: '#delivery-photos-group',
      title: 'Chụp Ảnh Minh Chứng',
      content: 'Chụp ảnh thực tế pallet hàng hoặc tem nhãn (tối đa 3 ảnh) làm bằng chứng lưu kho phục vụ đối chiếu chất lượng khi nhận hàng.',
      placement: 'top'
    },
    {
      target: '#delivery-note-group',
      title: 'Ghi Chú Đính Kèm',
      content: 'Nhập các ghi chú đặc biệt về tình trạng lô hàng (ví dụ: cần bảo quản kỹ, xử lý lỗi ngoại quan...) cho bộ phận nhận lưu ý.',
      placement: 'top'
    },
    {
      target: '#delivery-submit-btn',
      title: 'Xác Nhận & Lập Phiếu',
      content: 'Bấm nút để lưu phiếu bàn giao. Hệ thống sẽ sinh mã QR độc nhất và tạo Thẻ Pallet để dán trực tiếp lên pallet hàng chuyển đi.',
      placement: 'top'
    }
  ],
  '/delivery-receive': [
    {
      target: '#receive-tabs',
      title: 'Chuyển Đổi Các Tab Nghiệp Vụ',
      content: 'Dễ dàng chuyển đổi giữa: "Thông tin bàn giao" (xem số lượng), "Thông tin chất lượng" (để QC chấm checklist lỗi) và "Trả hàng" (lập phiếu trả về nếu có lỗi hỏng).',
      placement: 'bottom'
    },
    {
      target: '#receive-handover-card',
      title: 'Nhận Bàn Giao & Xác Nhận Số Lượng',
      content: 'Đối chiếu số lượng thực tế nhận được so với số lượng bên giao gửi. Nhập số thực nhận và bấm xác nhận để đưa sản phẩm vào công đoạn của bạn.',
      placement: 'top'
    },
    {
      target: '#receive-quality-checklist',
      title: 'Đánh Giá Chất Lượng Checklist (QC)',
      content: 'QC tiến hành kiểm tra các hạng mục lỗi theo tiêu chuẩn (Ngoại quan, kích thước...). Tích chọn Đạt hoặc ghi nhận lỗi cụ thể cho từng tiêu chí.',
      placement: 'top'
    },
    {
      target: '#receive-qc-summary',
      title: 'Xác Nhận Nhận & Kết Luận Chất Lượng',
      content: 'Nhập tổng số lượng đã kiểm tra, đánh giá kết quả Đạt/Không đạt và hoàn tất phiếu nhận hàng kèm kết quả QC.',
      placement: 'top'
    }
  ],
  '/plan': [
    {
      target: '#plan-select-calendar',
      title: 'Chọn Kế Hoạch Sản Xuất',
      content: 'Chọn kế hoạch sản xuất theo tháng/năm để theo dõi tiến độ tổng thể của toàn nhà máy.',
      placement: 'bottom'
    },
    {
      target: '#plan-select-order',
      title: 'Lọc Chi Tiết Theo Container (Cont)',
      content: 'Lọc nhanh để xem tiến độ của một Container (Cont) hoặc đơn hàng PO cụ thể đang được sản xuất.',
      placement: 'bottom'
    },
    {
      target: '#plan-search-box',
      title: 'Tìm Kiếm Thông Tin',
      content: 'Nhập từ khóa tìm kiếm nhanh theo mã đơn hàng, tên khách hàng hoặc mã SKU sản phẩm.',
      placement: 'bottom'
    },
    {
      target: '#plan-filter-buttons',
      title: 'Lọc Trạng Thái & Sắp Xếp',
      content: 'Lọc danh sách các đơn hàng theo trạng thái hoàn thành (Chờ làm, Đang làm, Đã xong) và sắp xếp theo thứ tự tiến độ từ cao xuống thấp.',
      placement: 'bottom'
    },
    {
      target: '#plan-prefix-tabs',
      title: 'Lọc Nhanh Theo Tiền Tố Đơn Hàng',
      content: 'Lọc danh sách đơn hàng theo tiền tố dự án (ví dụ: APT, KVN, ...) để quản lý riêng biệt từng nhóm đơn hàng khách hàng.',
      placement: 'bottom'
    },
    {
      target: '#plan-orders-list',
      title: 'Danh Sách Đơn Hàng & Cây BOM Chi Tiết',
      content: 'Danh sách các đơn hàng và tiến độ thực hiện. Nhấp vào mỗi thẻ đơn hàng để mở rộng xem các sản phẩm. Nhấn vào từng sản phẩm để mở hộp thoại chi tiết: xem cây cấu trúc cấu thành (BOM), tiến độ từng linh kiện con, và lịch sử giao nhận chi tiết.',
      placement: 'top'
    }
  ],
  '/inspection-daily': [
    {
      target: '#daily-stage-select',
      title: 'Chọn Công Đoạn Kiểm Tra Hàng Ngày',
      content: 'Chọn công đoạn sản xuất bạn cần kiểm tra chất lượng. Hệ thống sẽ đồng bộ tổng số lượng sản xuất trong ca để đối chiếu.',
      placement: 'bottom'
    },
    {
      target: '#daily-defect-tabs',
      title: 'Phân Loại Nhóm Lỗi QC',
      content: 'Chuyển đổi linh hoạt giữa các nhóm lỗi: Ngoại quan, Kết cấu, Nguyên liệu... giúp dễ dàng tìm kiếm tiêu chí cần ghi nhận.',
      placement: 'bottom'
    },
    {
      target: '#daily-defects-list',
      title: 'Ghi Nhận Số Lượng Lỗi Phát Sinh',
      content: 'Sử dụng các nút tăng/giảm (+/-) để cập nhật nhanh số lượng sản phẩm lỗi phát sinh cho từng tiêu chí cụ thể trong ca làm việc.',
      placement: 'top'
    },
    {
      target: '#daily-submit-btn',
      title: 'Lưu Báo Cáo Chất Lượng Ca',
      content: 'Nhấn Xác nhận để gửi báo cáo lỗi chất lượng hàng ngày lên hệ thống, phục vụ thống kê tỷ lệ lỗi (PPM) và CAPA.',
      placement: 'top'
    }
  ],
  '/inspection-stage': [
    {
      target: '#stage-type-select',
      title: 'Lựa Chọn Phương Thức Kiểm Tra Công Đoạn',
      content: 'Chọn loại hình kiểm tra tương ứng: Kiểm tra đầu vào công đoạn (IQC), kiểm tra độ bám dính/lắp ráp (PQC), hoặc kiểm tra sau đóng gói (OQC).',
      placement: 'bottom'
    },
    {
      target: '#stage-form-card',
      title: 'Nhập Thông Tin Lô Hàng Cần Kiểm',
      content: 'Nhập mã đơn hàng PO, mã sản phẩm, kích thước lô và số lượng mẫu kiểm tra theo tiêu chuẩn lấy mẫu AQL.',
      placement: 'bottom'
    },
    {
      target: '#stage-results-group',
      title: 'Đánh Giá Chỉ Tiêu Chất Lượng',
      content: 'Đánh giá Đạt/Không đạt cho từng tiêu chí kiểm tra ngoại quan, kích thước và chức năng. Có thể nhập ghi chú chi tiết nếu phát hiện bất thường.',
      placement: 'top'
    },
    {
      target: '#stage-submit-btn',
      title: 'Lưu Phiếu Kiểm Tra Công Đoạn',
      content: 'Nhấn Xác nhận để hoàn tất phiếu kiểm tra công đoạn, ghi nhận lịch sử QC của lô hàng vào hệ thống.',
      placement: 'top'
    }
  ],
  '/logs': [
    {
      target: '#logs-search-filter',
      title: 'Bộ Lọc Tìm Kiếm Lịch Sử',
      content: 'Sử dụng bộ lọc để tìm kiếm các bản ghi kiểm tra chất lượng theo mã phiếu, công đoạn hoặc khoảng thời gian nhất định.',
      placement: 'bottom'
    },
    {
      target: '#logs-list-container',
      title: 'Danh Sách Lịch Sử QC',
      content: 'Hiển thị danh sách tất cả các hoạt động kiểm tra chất lượng đã thực hiện. Bạn có thể dễ dàng quản lý và rà soát.',
      placement: 'top'
    },
    {
      target: '#logs-first-item',
      title: 'Chi Tiết Bản Ghi Lịch Sử',
      content: 'Nhấn trực tiếp vào bản ghi bất kỳ để xem toàn bộ thông tin chi tiết: các chỉ tiêu đánh giá, hình ảnh đính kèm và kết luận cuối cùng.',
      placement: 'top'
    }
  ],
  '/awards': [
    {
      target: '#awards-form-card',
      title: 'Thông Tin Khen Thưởng & Kỷ Luật',
      content: 'Nhập đầy đủ thông tin về nhân sự, loại hình ghi nhận (Khen thưởng hoặc Kỷ luật), lý do cụ thể và mức điểm hoặc hình thức xử phạt.',
      placement: 'bottom'
    },
    {
      target: '#awards-evidence-card',
      title: 'Hình Ảnh Minh Chứng Thực Tế',
      content: 'Chụp ảnh hoặc đính kèm tài liệu, biên bản làm việc thực tế để làm bằng chứng xác thực cho quyết định ghi nhận.',
      placement: 'top'
    },
    {
      target: '#awards-action-buttons',
      title: 'Xác Nhận Lưu Ghi Nhận',
      content: 'Bấm nút "Xác nhận" để lưu thông tin khen thưởng/kỷ luật vào hồ sơ nhân sự, phục vụ tính điểm KPI cuối tháng.',
      placement: 'top'
    }
  ],
  '/kpi': [
    {
      target: '#kpi-stats-cards',
      title: 'Tổng Hợp Kết Quả KPI Cá Nhân',
      content: 'Xem tổng điểm hiệu suất thực tế của bạn so với mục tiêu đề ra trong tháng hiện tại.',
      placement: 'bottom'
    },
    {
      target: '#kpi-tab-switcher',
      title: 'Chuyển Đổi Các Chỉ Mục Đánh Giá',
      content: 'Chuyển đổi linh hoạt giữa: "Bảng kiểm đánh giá" (danh sách công việc) và "Chi tiết điểm số" (kết quả chấm của từng tiêu chí).',
      placement: 'bottom'
    },
    {
      target: '#kpi-checklist-table',
      title: 'Bảng Kiểm Đánh Giá Chất Lượng',
      content: 'Theo dõi chi tiết các hạng mục kiểm tra chất lượng được giao trong ca và tỷ lệ hoàn thành tương ứng.',
      placement: 'top'
    },
    {
      target: '#kpi-details-table',
      title: 'Bảng Theo Dõi Và Đánh Giá Chi Tiết',
      content: 'Hiển thị danh sách đầy đủ tất cả các lần ghi nhận lỗi và điểm phạt tương ứng phục vụ minh bạch hóa dữ liệu.',
      placement: 'top'
    }
  ],
  '/staff-evaluation': [
    {
      target: '#kpi-eval-info',
      title: 'Thông Tin Chung Nhân Sự',
      content: 'Hiển thị thông tin cơ bản của nhân sự cần đánh giá: Họ tên, công đoạn, level tay nghề hiện tại và bộ phận công tác.',
      placement: 'bottom'
    },
    {
      target: '#kpi-eval-table-container',
      title: 'Bảng Chi Tiết KPI Thực Tế',
      content: 'Bảng đối chiếu kết quả thực tế đạt được so với mục tiêu kế hoạch ban đầu (ví dụ: tuân thủ quy trình, tỷ lệ lỗi...).',
      placement: 'top'
    },
    {
      target: '#kpi-eval-rating',
      title: 'Xếp Loại Đánh Giá Tháng',
      content: 'Quản lý lựa chọn mức xếp loại phù hợp (Loại A, B, C, D) dựa trên điểm số hiệu suất thực tế đạt được.',
      placement: 'top'
    },
    {
      target: '#kpi-eval-note',
      title: 'Nhận Xét & Đề Xuất Hành Động',
      content: 'Nhập ghi chú nhận xét chi tiết của quản lý và đề xuất các hành động cụ thể (đào tạo thêm, luân chuyển...) để phát triển nhân sự.',
      placement: 'top'
    }
  ],
  '/quality-detail': [
    {
      target: '#quality-instruction-card',
      title: 'Yêu Cầu & Hướng Dẫn Kiểm Chuẩn',
      content: 'Xem chi tiết mô tả kỹ thuật, dụng cụ cần dùng và các bước thao tác chuẩn để thực hiện kiểm tra hạng mục này.',
      placement: 'bottom'
    },
    {
      target: '#quality-result-card',
      title: 'Nhập Kết Quả & Ảnh Minh Chứng',
      content: 'Chọn kết quả Đạt hoặc Không Đạt, đồng thời chụp ảnh minh chứng thực tế bằng camera (bắt buộc chụp ảnh lỗi nếu kết quả Không Đạt).',
      placement: 'top'
    },
    {
      target: '#quality-action-buttons',
      title: 'Xác Nhận Lưu Kết Quả Tạm Thời',
      content: 'Bấm Xác nhận kết quả để lưu tạm thông tin kiểm tra của tiêu chí này và quay lại màn hình chính của phiếu.',
      placement: 'top'
    }
  ],
  '/input-inspection': [
    {
      target: '#input-info-card',
      title: 'Thông Tin Lô Nguyên Liệu Đầu Vào',
      content: 'Nhập các thông tin cơ bản: Nhà cung cấp, loại gỗ/vật liệu, số lượng thực tế nhập kho và số biên bản bàn giao.',
      placement: 'bottom'
    },
    {
      target: '#input-specifications-card',
      title: 'Độ Ẩm Tiêu Chuẩn Nguyên Liệu',
      content: 'Đo và ghi nhận độ ẩm gỗ tại các tiêu điểm bề mặt. Hệ thống tự động cảnh báo nếu độ ẩm nằm ngoài khoảng cho phép.',
      placement: 'top'
    },
    {
      target: '#input-container-selection-card',
      title: 'Thông Tin Container Giao Hàng',
      content: 'Chọn số hiệu container vận chuyển tương ứng để liên kết dữ liệu kiểm tra chất lượng đầu vào với lô hàng.',
      placement: 'top'
    },
    {
      target: '#input-dims-card',
      title: 'Kích Thước & Ngoại Quan Gỗ',
      content: 'Đo kích thước thực tế (dài, rộng, dày) so với bản vẽ kỹ thuật và ghi nhận các lỗi ngoại quan nếu có.',
      placement: 'top'
    },
    {
      target: '#input-result-card',
      title: 'Kết Luận Chất Lượng Lô Hàng',
      content: 'Đánh giá tổng quan lô hàng Đạt chuẩn nhập kho hoặc Không đạt (phải lập biên bản trả hàng/xử lý lỗi).',
      placement: 'top'
    },
    {
      target: '#input-images-card',
      title: 'Ảnh Chụp Minh Chứng Lô Hàng',
      content: 'Đính kèm hình ảnh nhãn mác, biên bản giao nhận và ảnh chụp thực tế các lỗi chất lượng phát hiện.',
      placement: 'top'
    },
    {
      target: '#input-submit-btn',
      title: 'Gửi Biên Bản Kiểm Tra Đầu Vào',
      content: 'Nhấn Xác nhận để hoàn thành kiểm tra và gửi kết quả lên hệ thống quản lý kho nguyên liệu.',
      placement: 'top'
    }
  ],
  '/equipment-list': [
    {
      target: '#equipment-filters',
      title: 'Bộ Lọc Danh Sách Thiết Bị',
      content: 'Lọc nhanh thiết bị theo loại (đo lường, giá kệ...) hoặc theo trạng thái hoạt động (bình thường, cần thay mới...).',
      placement: 'bottom'
    },
    {
      target: '#equipment-table-container',
      title: 'Bảng Danh Sách Thiết Bị & Thực Hiện',
      content: 'Xem toàn bộ thiết bị đang quản lý. Bấm vào biểu tượng cây bút để cập nhật kết quả kiểm tra định kỳ cho thiết bị.',
      placement: 'top'
    },
    {
      target: '#equipment-refresh-btn',
      title: 'Đồng Bộ Dữ Liệu Thiết Bị',
      content: 'Nhấn làm mới để đồng bộ danh sách thiết bị mới nhất từ hệ thống máy chủ trung tâm.',
      placement: 'top'
    }
  ],
  '/kpi-staff': [
    {
      target: '#kpi-staff-stats',
      title: 'Thống Kê Tiến Độ Đánh Giá Nhân Sự',
      content: 'Theo dõi tổng số nhân viên đã hoàn tất đánh giá hiệu suất so với tổng số nhân viên cần đánh giá trong bộ phận.',
      placement: 'bottom'
    },
    {
      target: '#kpi-staff-search',
      title: 'Tìm Kiếm Nhân Viên Nhanh Chóng',
      content: 'Nhập họ tên nhân viên, công đoạn sản xuất hoặc mã số để tìm nhanh nhân sự cần thực hiện đánh giá.',
      placement: 'bottom'
    },
    {
      target: '#kpi-staff-table-container',
      title: 'Bảng Danh Sách Nhân Viên & Đánh Giá',
      content: 'Xem danh sách nhân sự kèm mục tiêu/thực tế KPI. Nhấp vào dòng của nhân viên để mở phiếu đánh giá chi tiết.',
      placement: 'top'
    }
  ],
  '/capa-list': [
    {
      target: '#capa-stats-summary',
      title: 'Tổng Quan Nhóm Lỗi CAPA',
      content: 'Hiển thị tổng số nhóm lỗi chất lượng đang được theo dõi hành động khắc phục phòng ngừa (CAPA).',
      placement: 'bottom'
    },
    {
      target: '#capa-search-input',
      title: 'Tìm Kiếm Nhóm Lỗi',
      content: 'Tìm nhanh nhóm lỗi CAPA theo tên lỗi hoặc theo nhân sự chịu trách nhiệm xử lý.',
      placement: 'bottom'
    },
    {
      target: '#capa-list-table',
      title: 'Danh Sách Nhóm Lỗi Chất Lượng',
      content: 'Hiển thị tên lỗi, mức độ nghiêm trọng và số lần phát sinh. Bấm vào dòng tương ứng để xem báo cáo lỗi.',
      placement: 'top'
    }
  ],
  '/capa-report': [
    {
      target: '#capa-report-images',
      title: 'Ảnh Minh Chứng Lỗi Chất Lượng',
      content: 'Xem toàn bộ hình ảnh thực tế ghi nhận tại hiện trường sản xuất khi xảy ra sự cố chất lượng.',
      placement: 'bottom'
    },
    {
      target: '#capa-report-info',
      title: 'Thông Tin Chi Tiết Lỗi & Phân Công',
      content: 'Hiển thị chi tiết mô tả lỗi, mức độ nghiêm trọng (Nặng/Nhẹ...) và người được phân công chủ trì khắc phục.',
      placement: 'top'
    },
    {
      target: '#capa-report-history',
      title: 'Lịch Sử Phát Sinh Sự Sự Cố',
      content: 'Danh sách tất cả các lần phát sinh lỗi này. Nhấp vào từng lần phát sinh để thực hiện điều tra nguyên nhân.',
      placement: 'top'
    }
  ],
  '/capa-detail': [
    {
      target: '#capa-detail-selector',
      title: 'Chọn Lần Phát Sinh Sự Cố',
      content: 'Chuyển đổi giữa các lần phát sinh lỗi khác nhau của nhóm lỗi này để cập nhật tiến độ xử lý riêng biệt.',
      placement: 'bottom'
    },
    {
      target: '#capa-detail-occ-info',
      title: 'Thông Tin Chi Tiết Lần Phát Sinh',
      content: 'Xem ngày giờ phát sinh, container bị ảnh hưởng, số lượng lỗi phát hiện và nhân viên kiểm soát tại thời điểm đó.',
      placement: 'top'
    },
    {
      target: '#capa-detail-investigation',
      title: 'Ghi Nhận Điều Tra Nguyên Nhân & CAPA',
      content: 'Nhập nguyên nhân gốc rễ và hành động khắc phục phòng ngừa chi tiết. Bấm "Lưu điều tra" hoặc "Đóng lỗi CAPA" khi hoàn tất.',
      placement: 'top'
    },
    {
      target: '#capa-detail-tracking-table',
      title: 'Bảng Theo Dõi Và Đánh Giá Hiệu Quả',
      content: 'Bảng ghi nhận lịch sử đánh giá tính hiệu quả của hành động khắc phục định kỳ để đảm bảo lỗi không tái diễn.',
      placement: 'top'
    }
  ]
};

const UserGuideTour = () => {
  const location = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [steps, setSteps] = useState([]);
  const resizeTimeout = useRef(null);

  // Lấy danh sách steps cho route hiện tại
  useEffect(() => {
    const currentPath = location.pathname;
    // Tìm kiếm khớp tương đối (ví dụ /delivery-receive/123 -> /delivery-receive)
    const matchedPath = Object.keys(TOUR_STEPS).find(path => currentPath.includes(path));
    
    if (matchedPath) {
      setSteps(TOUR_STEPS[matchedPath]);
      setCurrentStepIndex(0);
      
      // Kiểm tra trong localStorage xem đã từng xem hướng dẫn trang này chưa
      const hasSeen = localStorage.getItem(`smartflow_seen_tour_${matchedPath}`);
      if (!hasSeen) {
        // Delay nhẹ để trang render xong hoàn toàn phần DOM
        const timer = setTimeout(() => {
          setIsActive(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } else {
      setSteps([]);
      setIsActive(false);
    }
  }, [location.pathname]);

  // Lắng nghe sự kiện click nút "Hướng dẫn sử dụng" ở Header để chạy lại tour
  useEffect(() => {
    const handleReplay = () => {
      const currentPath = location.pathname;
      const matchedPath = Object.keys(TOUR_STEPS).find(path => currentPath.includes(path));
      if (matchedPath && TOUR_STEPS[matchedPath].length > 0) {
        setSteps(TOUR_STEPS[matchedPath]);
        setCurrentStepIndex(0);
        setIsActive(true);
      }
    };

    window.addEventListener('smartflow_replay_tour', handleReplay);
    return () => window.removeEventListener('smartflow_replay_tour', handleReplay);
  }, [location.pathname]);

  // Cập nhật vị trí của element được spotlight
  useEffect(() => {
    if (!isActive || steps.length === 0) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const step = steps[currentStepIndex];
      if (!step || !step.target) {
        setTargetRect(null);
        return;
      }

      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Kiểm tra xem element có hiển thị trên màn hình không
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right
          });
          // Tự động cuộn nhẹ tới element nếu nó bị khuất
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
    };

    // Chạy định vị ngay
    updatePosition();

    // Re-calculate khi cuộn hoặc resize màn hình
    const handleResizeOrScroll = () => {
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(updatePosition, 100);
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true); // True để bắt sự kiện từ các thẻ con cuộn

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
    };
  }, [isActive, currentStepIndex, steps]);

  if (!isActive || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setIsActive(false);
    // Lưu vào localStorage để không hiện lại tự động
    const currentPath = location.pathname;
    const matchedPath = Object.keys(TOUR_STEPS).find(path => currentPath.includes(path));
    if (matchedPath) {
      localStorage.setItem(`smartflow_seen_tour_${matchedPath}`, 'true');
    }
  };

  // Tính toán style cho Tooltip hướng dẫn dựa theo vị trí spotlight
  const getTooltipStyle = () => {
    const rootEl = document.getElementById('root');
    const rootRect = rootEl 
      ? rootEl.getBoundingClientRect() 
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    const cLeft = rootRect.left;
    const cWidth = rootRect.width;
    const cRight = rootRect.right;

    // Chiều rộng lý tưởng của tooltip
    const tooltipWidth = Math.min(360, cWidth - 32);

    if (!targetRect) {
      // Nếu không tìm thấy element target, hiển thị ở chính giữa khung mobile #root
      const tooltipLeft = cLeft + (cWidth - tooltipWidth) / 2;
      const tooltipTop = rootRect.top + (rootRect.height - 220) / 2;
      return {
        position: 'fixed',
        top: `${tooltipTop}px`,
        left: `${tooltipLeft}px`,
        width: `${tooltipWidth}px`,
        zIndex: 100001,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      };
    }

    const { top, left, width, height } = targetRect;
    const screenHeight = window.innerHeight;
    const spaceBelow = screenHeight - (top + height);
    const spaceAbove = top;

    // Quyết định vị trí chiều dọc (dưới hay trên target)
    let tooltipTop = 0;
    if (currentStep.placement === 'bottom' || (spaceBelow > spaceAbove && currentStep.placement !== 'top')) {
      tooltipTop = top + height + 12;
    } else {
      tooltipTop = top - 220; // Dự trù khoảng cách cho nội dung chi tiết hơn (khoảng 220px)
      if (tooltipTop < rootRect.top + 10) {
        tooltipTop = rootRect.top + 10;
      }
    }

    // Căn giữa ngang theo target nhưng giới hạn nằm trong biên của khung #root
    const targetCenterX = left + width / 2;
    const idealLeft = targetCenterX - tooltipWidth / 2;
    const tooltipLeft = Math.max(cLeft + 16, Math.min(cRight - 16 - tooltipWidth, idealLeft));

    return {
      position: 'fixed',
      top: `${tooltipTop}px`,
      left: `${tooltipLeft}px`,
      width: `${tooltipWidth}px`,
      zIndex: 100001,
      transition: 'all 0.25s ease-in-out'
    };
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, pointerEvents: 'auto' }}>
      
      {/* Lớp phủ đen spotlight */}
      {targetRect ? (
        <div 
          style={{
            position: 'fixed',
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
            border: '2.5px solid #fb923c', // Viền cam nổi bật
            zIndex: 100000,
            pointerEvents: 'none',
            transition: 'all 0.25s ease-in-out'
          }}
        >
          {/* Vòng tròn hiệu ứng sóng xung quanh */}
          <div style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '16px',
            border: '2px solid rgba(251, 146, 60, 0.4)',
            animation: 'tourPulse 1.8s infinite'
          }} />
        </div>
      ) : (
        // Lớp phủ tối mờ toàn màn hình nếu không có target
        <div 
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 100000
          }}
        />
      )}

      {/* Hộp thoại Tooltip hướng dẫn */}
      <div 
        className="tour-tooltip-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '18px 20px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          border: '1.5px solid #f3f4f6',
          ...getTooltipStyle()
        }}
      >
        {/* Header của Tooltip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb923c' }}>
            <Sparkles size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Hướng dẫn ({currentStepIndex + 1}/{totalSteps})
            </span>
          </div>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nội dung chính */}
        <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#1e293b', margin: '0 0 6px 0', lineHeight: '1.3' }}>
          {currentStep.title}
        </h3>
        <p style={{ fontSize: '0.88rem', color: '#4b5563', margin: '0 0 16px 0', lineHeight: '1.45', fontWeight: '500' }}>
          {currentStep.content}
        </p>

        {/* Footer điều hướng */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          
          {/* Dấu chấm tiến trình (Pagination dots) */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {steps.map((_, idx) => (
              <div 
                key={idx}
                style={{
                  width: idx === currentStepIndex ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: idx === currentStepIndex ? '#fb923c' : '#e5e7eb',
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>

          {/* Cụm nút bấm */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: '1px solid #e5e7eb',
                  color: '#4b5563',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={14} /> Quay lại
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#fb923c',
                border: 'none',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: '800',
                padding: '7px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(251, 146, 60, 0.2)'
              }}
            >
              {currentStepIndex === totalSteps - 1 ? 'Hoàn thành' : 'Tiếp tục'}
              {currentStepIndex < totalSteps - 1 && <ChevronRight size={14} />}
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes tourPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.08); opacity: 0; }
        }
        .tour-tooltip-card {
          animation: tourSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes tourSlideIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default UserGuideTour;

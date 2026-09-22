# Thư Mục Lưu Trọng Số Mô Hình AI OCR (Model Weights)

Thư mục này dùng để lưu trữ các file checkpoints và trọng số mô hình đã được huấn luyện hoặc tải về:
- `yolov8n_label_detector.pt`: Trọng số mô hình phát hiện vùng nhãn dán Pallet/Box.
- `trocr_finetuned/`: Trọng số mô hình Microsoft TrOCR sau khi fine-tune trên dữ liệu nội bộ.
- `svtr_paddle_finetuned/`: Trọng số mô hình nhận diện ký tự công nghiệp.

*(Giai đoạn 1: Hệ thống tự động sử dụng EasyOCR GPU và thuật toán Heuristic/Contour trước khi tiến hành fine-tuning ở Giai đoạn 2).*

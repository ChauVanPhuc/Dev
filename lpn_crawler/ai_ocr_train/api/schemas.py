# -*- coding: utf-8 -*-
"""
Pydantic Schemas for AI OCR API.
"""

from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field


class PreprocessConfigSchema(BaseModel):
    auto_crop_label: bool = Field(default=True, description="Tự động phát hiện và crop vùng nhãn")
    auto_rotate: bool = Field(default=True, description="Tự động phát hiện hướng và xoay thẳng ảnh")
    rotate_angle: float = Field(default=0.0, description="Góc xoay thủ công (0, 90, 180, 270 hoặc góc bất kỳ)")
    zoom_factor: float = Field(default=1.0, description="Hệ số phóng to siêu phân giải (1.0 đến 3.0)")
    enable_clahe: bool = Field(default=True, description="Bật tăng tương phản thích nghi CLAHE")
    clahe_clip: float = Field(default=2.5, description="Giới hạn CLAHE clip limit (1.0 đến 5.0)")
    enable_sharpen: bool = Field(default=True, description="Bật làm sắc nét ký tự")
    sharpen_strength: float = Field(default=1.2, description="Cường độ làm nét (0.5 đến 2.5)")
    enable_denoise: bool = Field(default=False, description="Bật khử nhiễu")
    denoise_method: str = Field(default="median", description="Thuật toán khử nhiễu (median, bilateral, gaussian)")
    threshold_mode: str = Field(default="none", description="Chế độ nhị phân (none, otsu, adaptive_gaussian, adaptive_mean, binary)")


class AnalyzeImageRequest(BaseModel):
    image_id: Optional[Union[int, str]] = Field(default=None, description="ID ảnh từ bảng lpn_images hoặc chuỗi định danh")
    item_id: Optional[int] = Field(default=None, description="ID của LpnItem để phân tích ảnh tương ứng")
    image_base64: Optional[str] = Field(default=None, description="Chuỗi Data URL Base64 của ảnh tải lên")
    image_path: Optional[str] = Field(default=None, description="Đường dẫn file cục bộ của ảnh")
    model_id: Optional[str] = Field(default=None, description="ID hoặc filename của checkpoint mô hình (ví dụ: 'checkpoint_hybrid_epoch15_acc99.1.pt' hoặc 'base_gpu_backbone')")
    inference_mode: Optional[str] = Field(default="hybrid", description="Chế độ nhận diện: 'hybrid' (Động cơ kép), 'base_only' (Thuần Base EasyOCR), 'custom_only' (Thuần Custom CRNN)")
    preprocess_config: Optional[PreprocessConfigSchema] = Field(default=None, description="Cấu hình tham số tiền xử lý")
    force_refresh: bool = Field(default=False, description="Bỏ qua cache và phân tích lại từ đầu")
    expected_lpn: Optional[str] = Field(default=None, description="Mã LPN kỳ vọng (CSDL Chuẩn)")
    expected_sku: Optional[str] = Field(default=None, description="Mã SKU kỳ vọng (CSDL Chuẩn)")
    package_position: Optional[str] = Field(default=None, description="Vị trí kiện hàng (ví dụ: Box 10A, Box 10, Pallet 3)")


class BenchmarkRequest(BaseModel):
    sample_count: int = Field(default=25, ge=1, le=100, description="Số lượng mẫu chạy kiểm thử")
    preprocess_config: Optional[PreprocessConfigSchema] = Field(default=None)
    split_type: Optional[str] = Field(default="test", description="Tập dữ liệu kiểm thử: test (độc lập), val, train, hard_case, all")
    model_id: Optional[str] = Field(default=None, description="Mô hình nạp chạy benchmark")


class ExportHardCasesRequest(BaseModel):
    output_dataset_name: Optional[str] = Field(default="hard_cases_finetune_v2", description="Tên tập dataset xuất ra cho vòng train kế tiếp")
    include_low_confidence: bool = Field(default=True, description="Bao gồm cả ảnh có độ tin cậy thấp <85%")


class BatchScanRequest(BaseModel):
    model_id: Optional[str] = Field(default=None, description="Tên checkpoint model để đọc ảnh (ví dụ: 'checkpoint_hybrid_epoch15_acc99.1.pt')")
    limit: int = Field(default=50, description="Số lượng ảnh tối đa cần quét (0 = toàn bộ)")
    only_unprocessed: bool = Field(default=False, description="Chỉ quét những ảnh chưa từng có kết quả AI OCR")
    container_number: Optional[str] = Field(default=None, description="Lọc theo container cụ thể nếu muốn")
    exclude_image_ids: Optional[List[int]] = Field(default=None, description="Bỏ qua các image_id đã quét trong phiên hiện tại")


class SingleItemScanRequest(BaseModel):
    item_id: int = Field(..., description="ID của LpnItem cần quét")
    model_id: Optional[str] = Field(default=None, description="Tên checkpoint model dùng để quét")
    package_position: Optional[str] = Field(default=None, description="Vị trí kiện hàng (ví dụ: Box 10A, Box 10, Pallet 3)")



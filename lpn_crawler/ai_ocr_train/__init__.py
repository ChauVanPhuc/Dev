# -*- coding: utf-8 -*-
"""
AI OCR & Training Module for LPN Crawler.
Module độc lập chuyên trách:
- Nhận diện nhãn (Label Detection & ROI Crop)
- Tự động xoay và nắn thẳng ảnh (Auto-orientation & Deskew)
- Tiền xử lý ảnh (Resize, Zoom, CLAHE, Threshold, Sharpen, Denoise)
- Giải mã Barcode (1D/2D) & Deep Learning OCR (EasyOCR GPU)
- Trích xuất LPN, SKU, Batch kèm độ tin cậy (Confidence)
- Hỗ trợ kiến trúc Dataset, Training, Evaluation và UI Lab.
"""

from .core.pipeline import AiOcrPipeline, get_default_pipeline

__all__ = ["AiOcrPipeline", "get_default_pipeline"]

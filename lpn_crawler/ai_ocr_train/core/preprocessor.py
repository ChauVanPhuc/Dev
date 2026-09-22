# -*- coding: utf-8 -*-
"""
Image Preprocessing Engine for AI OCR.
Cung cấp các kỹ thuật nâng cao chất lượng ảnh nhãn dán:
- Resize & Phóng to siêu phân giải (Super-Resolution / Bicubic Zoom)
- Xoay góc tự do & Xoay vuông góc (0, 90, 180, 270)
- Chuyển xám & Tăng tương phản thích nghi CLAHE (khử lóa màng co)
- Nhị phân hóa (Otsu / Adaptive Thresholding)
- Làm sắc nét ký tự (Sharpening / Unsharp Masking)
- Khử nhiễu (Bilateral / Median Denoise)
- Xuất chuỗi Base64 phục vụ xem trước thời gian thực trên giao diện.
"""

import base64
import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional
from PIL import Image
import io


class ImagePreprocessor:
    """Bộ tiền xử lý ảnh chuyên dụng cho nhãn hàng logistics & pallet."""

    @staticmethod
    def load_image(image_input: Any) -> Optional[np.ndarray]:
        """
        Nạp ảnh từ nhiều định dạng: file path (str), numpy array (BGR/RGB), hoặc byte buffer.
        Luôn trả về numpy ndarray dạng BGR chuẩn của OpenCV.
        """
        if image_input is None:
            return None
        if isinstance(image_input, np.ndarray):
            return image_input.copy()
        if isinstance(image_input, str):
            # Load from file path (hỗ trợ đường dẫn Unicode / tiếng Việt trên Windows và ảnh JPEG có EXIF bất thường)
            try:
                with open(image_input, "rb") as f:
                    file_bytes = np.frombuffer(f.read(), dtype=np.uint8)
                    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
                    if img is not None:
                        return img
            except Exception:
                pass

            # Fallback 1: cv2.imread
            try:
                img = cv2.imread(image_input, cv2.IMREAD_COLOR)
                if img is not None:
                    return img
            except Exception:
                pass

            # Fallback 2: PIL Image (xử lý hoàn hảo ảnh Exif, truncation, Premature JPEG)
            try:
                from PIL import Image, ImageFile
                ImageFile.LOAD_TRUNCATED_IMAGES = True
                with Image.open(image_input) as pil_im:
                    rgb = pil_im.convert("RGB")
                    return cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
            except Exception:
                pass
            return None

        if isinstance(image_input, (bytes, bytearray)):
            file_bytes = np.asarray(bytearray(image_input), dtype=np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
            if img is not None:
                return img
            try:
                from PIL import Image, ImageFile
                import io
                ImageFile.LOAD_TRUNCATED_IMAGES = True
                with Image.open(io.BytesIO(image_input)) as pil_im:
                    rgb = pil_im.convert("RGB")
                    return cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
            except Exception:
                pass
            return None
        return None

    @staticmethod
    def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
        """
        Xoay ảnh theo góc bất kỳ hoặc các góc 90, 180, 270 độ mà không bị mất góc (Expand canvas).
        """
        if angle == 0:
            return image

        # Xoay vuông góc tối ưu
        if angle in (90, -270):
            return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
        elif angle in (180, -180):
            return cv2.rotate(image, cv2.ROTATE_180)
        elif angle in (270, -90):
            return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)

        # Xoay góc lẻ tự do kèm tính lại kích thước khung hình
        (h, w) = image.shape[:2]
        (cX, cY) = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D((cX, cY), angle, 1.0)
        cos = np.abs(M[0, 0])
        sin = np.abs(M[0, 1])
        nW = int((h * sin) + (w * cos))
        nH = int((h * cos) + (w * sin))
        M[0, 2] += (nW / 2) - cX
        M[1, 2] += (nH / 2) - cY
        return cv2.warpAffine(image, M, (nW, nH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    @staticmethod
    def resize_image(image: np.ndarray, zoom_factor: float = 1.0, max_dimension: int = 2500) -> np.ndarray:
        """
        Phóng to/thu nhỏ ảnh theo zoom_factor với thuật toán nội suy Cubic sắc nét.
        Giới hạn kích thước tối đa để đảm bảo hiệu năng.
        """
        if zoom_factor <= 0 or image is None:
            return image

        h, w = image.shape[:2]
        new_w = int(w * zoom_factor)
        new_h = int(h * zoom_factor)

        # Kiểm tra giới hạn tối đa
        if max(new_w, new_h) > max_dimension:
            scale = max_dimension / float(max(new_w, new_h))
            new_w = int(new_w * scale)
            new_h = int(new_h * scale)

        if new_w == w and new_h == h:
            return image

        interp = cv2.INTER_CUBIC if zoom_factor > 1.0 else cv2.INTER_AREA
        return cv2.resize(image, (new_w, new_h), interpolation=interp)

    @staticmethod
    def to_grayscale(image: np.ndarray) -> np.ndarray:
        """Chuyển đổi sang ảnh xám 1 kênh."""
        if len(image.shape) == 2:
            return image
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    @staticmethod
    def enhance_clahe(image: np.ndarray, clip_limit: float = 2.5, tile_size: int = 8) -> np.ndarray:
        """
        Tăng cường độ tương phản thích nghi cục bộ (CLAHE).
        Đặc biệt hiệu quả cho ảnh màng co bóng sáng, vùng sáng tối không đồng đều.
        """
        gray = ImagePreprocessor.to_grayscale(image)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_size, tile_size))
        return clahe.apply(gray)

    @staticmethod
    def sharpen_image(image: np.ndarray, strength: float = 1.2) -> np.ndarray:
        """
        Làm sắc nét viền chữ bằng kỹ thuật Unsharp Masking.
        """
        if strength <= 0:
            return image

        blurred = cv2.GaussianBlur(image, (0, 0), sigmaX=3)
        sharpened = cv2.addWeighted(image, 1.0 + strength, blurred, -strength, 0)
        return sharpened

    @staticmethod
    def denoise_image(image: np.ndarray, method: str = "median", kernel_size: int = 3) -> np.ndarray:
        """
        Khử nhiễu đốm mực và hạt cát quang học.
        Hỗ trợ: 'median', 'bilateral', 'gaussian'.
        """
        if kernel_size % 2 == 0:
            kernel_size += 1

        if method == "median":
            return cv2.medianBlur(image, kernel_size)
        elif method == "bilateral":
            return cv2.bilateralFilter(image, d=9, sigmaColor=75, sigmaSpace=75)
        elif method == "gaussian":
            return cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
        return image

    @staticmethod
    def apply_threshold(image: np.ndarray, method: str = "otsu", block_size: int = 19, c_val: int = 9) -> np.ndarray:
        """
        Nhị phân hóa tách mực chữ đen trên nền nhãn trắng.
        - 'otsu': Tự động tính ngưỡng toàn cục tối ưu.
        - 'adaptive_gaussian': Ngưỡng thích nghi Gaussian cho ảnh bóng sáng.
        - 'adaptive_mean': Ngưỡng thích nghi trung bình.
        - 'binary': Ngưỡng tĩnh 127.
        """
        gray = ImagePreprocessor.to_grayscale(image)

        if block_size % 2 == 0:
            block_size += 1
        if block_size < 3:
            block_size = 3

        if method == "otsu":
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return thresh
        elif method == "adaptive_gaussian":
            return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, block_size, c_val)
        elif method == "adaptive_mean":
            return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, block_size, c_val)
        elif method == "binary":
            _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
            return thresh
        return gray

    @staticmethod
    def preprocess_pipeline(
        image: np.ndarray,
        params: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Chạy toàn bộ chuỗi tiền xử lý dựa trên tham số cấu hình.
        Trả về: (ảnh kết quả xử lý cuối cùng, dict các ảnh trung gian dạng base64 phục vụ UI)
        """
        if image is None:
            raise ValueError("Ảnh đầu vào không hợp lệ.")

        p = params or {}
        rotate_angle = float(p.get("rotate_angle", 0))
        zoom_factor = float(p.get("zoom_factor", 1.0))
        enable_clahe = bool(p.get("enable_clahe", True))
        clahe_clip = float(p.get("clahe_clip", 2.5))
        enable_sharpen = bool(p.get("enable_sharpen", True))
        sharpen_strength = float(p.get("sharpen_strength", 1.2))
        enable_denoise = bool(p.get("enable_denoise", False))
        denoise_method = str(p.get("denoise_method", "median"))
        threshold_mode = str(p.get("threshold_mode", "none"))  # none, otsu, adaptive_gaussian, adaptive_mean, binary

        current = image.copy()
        previews: Dict[str, str] = {}

        # 1. Rotate
        if rotate_angle != 0:
            current = ImagePreprocessor.rotate_image(current, rotate_angle)
        previews["rotated"] = ImagePreprocessor.to_base64(current)

        # 2. Resize / Zoom
        if zoom_factor != 1.0:
            current = ImagePreprocessor.resize_image(current, zoom_factor=zoom_factor)
        previews["resized"] = ImagePreprocessor.to_base64(current)

        # 3. Grayscale & Contrast
        if enable_clahe:
            current = ImagePreprocessor.enhance_clahe(current, clip_limit=clahe_clip)
        else:
            current = ImagePreprocessor.to_grayscale(current)
        previews["clahe_gray"] = ImagePreprocessor.to_base64(current)

        # 4. Denoise
        if enable_denoise:
            current = ImagePreprocessor.denoise_image(current, method=denoise_method)
            previews["denoised"] = ImagePreprocessor.to_base64(current)

        # 5. Sharpen
        if enable_sharpen:
            current = ImagePreprocessor.sharpen_image(current, strength=sharpen_strength)
            previews["sharpened"] = ImagePreprocessor.to_base64(current)

        # 6. Thresholding (nếu bật)
        if threshold_mode and threshold_mode != "none":
            current = ImagePreprocessor.apply_threshold(current, method=threshold_mode)
            previews["thresholded"] = ImagePreprocessor.to_base64(current)

        previews["final_processed"] = ImagePreprocessor.to_base64(current)
        return current, previews

    @staticmethod
    def to_base64(image: np.ndarray, format: str = ".jpg") -> str:
        """Chuyển numpy image sang chuỗi Data URL Base64 phục vụ render web."""
        if image is None:
            return ""
        try:
            success, buffer = cv2.imencode(format, image, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if not success:
                return ""
            b64_str = base64.b64encode(buffer).decode("utf-8")
            mime = "image/jpeg" if format.lower() in [".jpg", ".jpeg"] else "image/png"
            return f"data:{mime};base64,{b64_str}"
        except Exception:
            return ""

    @staticmethod
    def from_base64(base64_str: str) -> Optional[np.ndarray]:
        """Giải mã chuỗi Base64 Data URL thành numpy array BGR."""
        if not base64_str:
            return None
        try:
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            img_bytes = base64.b64decode(base64_str)
            return ImagePreprocessor.load_image(img_bytes)
        except Exception:
            return None

    @staticmethod
    def focus_and_zoom_roi(
        crop_image: np.ndarray,
        target_min_dim: int = 180,
        max_scale: float = 4.0,
        add_padding: bool = True
    ) -> np.ndarray:
        """
        Phóng to siêu phân giải và tăng cường nét chữ cho từng vùng nhãn nhỏ:
        - Tự động đo độ phân giải: nếu min(h, w) < target_min_dim, phóng to bằng INTER_CUBIC.
        - Tăng tương phản thích nghi CLAHE cục bộ.
        - Làm sắc nét ký tự bằng Unsharp Masking.
        - Đệm viền trắng (white border padding) để CRAFT detector không bị cắt sát chữ.
        """
        if crop_image is None or crop_image.size == 0:
            return crop_image

        h, w = crop_image.shape[:2]
        current = crop_image.copy()

        # 1. Tính hệ số zoom thích nghi
        min_dim = min(h, w)
        if min_dim < target_min_dim:
            scale = max(1.0, min(max_scale, float(target_min_dim) / float(max_dim if (max_dim := max(1, min_dim)) else 1)))
            new_w = int(w * scale)
            new_h = int(h * scale)
            current = cv2.resize(current, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

        # 2. Tăng tương phản nhẹ nhàng tự nhiên (không dùng CLAHE cục bộ quá gắt tránh làm biến dạng nét số 1 thành số 4)
        if len(current.shape) == 3:
            lab = cv2.cvtColor(current, cv2.COLOR_BGR2LAB)
            l_ch, a_ch, b_ch = cv2.split(lab)
            if np.mean(l_ch) < 110:
                clahe = cv2.createCLAHE(clipLimit=1.2, tileGridSize=(8, 8))
                l_enhanced = clahe.apply(l_ch)
                current = cv2.cvtColor(cv2.merge([l_enhanced, a_ch, b_ch]), cv2.COLOR_LAB2BGR)
        else:
            if np.mean(current) < 110:
                clahe = cv2.createCLAHE(clipLimit=1.2, tileGridSize=(8, 8))
                current = clahe.apply(current)

        # 3. Làm nét ký tự nhẹ nhàng
        blur = cv2.GaussianBlur(current, (0, 0), 1.5)
        current = cv2.addWeighted(current, 1.2, blur, -0.2, 0)

        # 4. Thêm viền trắng đệm
        if add_padding:
            pad = 20
            border_val = [255, 255, 255] if len(current.shape) == 3 else 255
            current = cv2.copyMakeBorder(current, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=border_val)

        return current


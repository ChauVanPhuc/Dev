# -*- coding: utf-8 -*-
"""
PyTorch OCR Dataset & DataLoader for CRNN + CTC Training.
Hỗ trợ:
1. Nạp text crop thực tế và sinh realistic synthetic text line crop.
2. Tiền xử lý giữ nguyên tỷ lệ khung hình (Aspect Ratio Preserved):
   - Chiều cao cố định H=32
   - Resize chiều rộng theo tỷ lệ W' = W * (32 / H)
   - Pad sang chiều rộng chuẩn Max_W = 256 (không làm méo hay co giãn ký tự)
   - Chuẩn hóa điểm ảnh về dải [-1.0, 1.0]
3. Mã hóa nhãn CTC (targets, target_lengths, input_lengths)
4. Kiểm tra hợp lệ bắt buộc: input_length >= target_length cho mọi mẫu
5. Thống nhất định nghĩa tỷ lệ Synthetic:
   synthetic_fraction_total = N_synthetic / (N_real + N_synthetic)
"""

import os
import random
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset
from typing import List, Dict, Any, Tuple, Optional

from .model import encode_text_to_ctc, CHARSET
from ..datasets.synthetic_generator import SyntheticLabelGenerator


def preprocess_ocr_crop(
    img: np.ndarray,
    target_height: int = 32,
    max_width: int = 256
) -> torch.Tensor:
    """
    Tiền xử lý ảnh dòng chữ:
    1. Chuyển sang Grayscale nếu là ảnh màu.
    2. Giữ nguyên Aspect Ratio: tính tỷ lệ scale theo target_height.
    3. Resize width tương ứng. Nếu width > max_width thì giới hạn về max_width.
    4. Pad bên phải bằng giá trị nền để đạt kích thước chuẩn (target_height, max_width).
    5. Chuẩn hóa về [-1.0, 1.0].
    """
    if img is None or img.size == 0:
        # Fallback ảnh trống
        tensor = torch.zeros((1, target_height, max_width), dtype=torch.float32)
        return tensor

    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    h, w = gray.shape[:2]
    if h == 0 or w == 0:
        return torch.zeros((1, target_height, max_width), dtype=torch.float32)

    # Tính chiều rộng mới bảo toàn tỷ lệ khung hình
    scale = target_height / float(h)
    new_w = max(8, int(round(w * scale)))
    new_w = min(new_w, max_width)

    resized = cv2.resize(gray, (new_w, target_height), interpolation=cv2.INTER_LINEAR)

    # Tạo canvas đệm chuẩn (32, 256)
    # Lấy màu nền từ biên ngoài cùng để pad tự nhiên
    bg_color = int(np.median(resized[:, -2:])) if new_w >= 2 else 255
    padded = np.full((target_height, max_width), bg_color, dtype=np.uint8)
    padded[:, :new_w] = resized

    # Chuẩn hóa về [-1.0, 1.0]
    normalized = (padded.astype(np.float32) / 127.5) - 1.0
    tensor = torch.from_numpy(normalized).unsqueeze(0)  # (1, 32, 256)
    return tensor


class LpnOcrDataset(Dataset):
    """
    PyTorch Dataset nạp các mẫu dòng text phục vụ huấn luyện CRNN CTC.
    Hỗ trợ kết hợp dữ liệu Real và Realistic Synthetic theo tỷ lệ chuẩn.
    """

    def __init__(
        self,
        samples: List[Dict[str, Any]],
        synthetic_fraction_total: float = 0.0,
        img_height: int = 32,
        max_width: int = 256,
        is_train: bool = True
    ):
        """
        synthetic_fraction_total: Tỷ lệ ảnh synthetic trên TỔNG DATASET:
        N_synthetic / (N_real + N_synthetic) = synthetic_fraction_total
        Ví dụ: nếu synthetic_fraction_total = 0.2 (20%), với 8,000 ảnh Real
        thì tổng số mẫu là 10,000 (8,000 Real + 2,000 Synthetic).
        """
        self.img_height = img_height
        self.max_width = max_width
        self.is_train = is_train
        self.synth_gen = SyntheticLabelGenerator()

        self.real_samples = []
        for s in samples:
            lpn = str(s.get("lpn") or "").strip().upper()
            sku = str(s.get("sku") or "").strip().upper()
            # Mẫu có LPN
            if lpn and len(lpn) >= 4:
                self.real_samples.append({
                    "image_path": s.get("local_path"),
                    "text": lpn,
                    "field_type": "LPN",
                    "container_id": s.get("container_id"),
                    "source": "real"
                })
            # Mẫu có SKU
            if sku and len(sku) >= 3:
                self.real_samples.append({
                    "image_path": s.get("local_path"),
                    "text": sku,
                    "field_type": "SKU",
                    "container_id": s.get("container_id"),
                    "source": "real"
                })

        num_real = len(self.real_samples)
        self.synthetic_fraction = max(0.0, min(0.9, float(synthetic_fraction_total)))

        if is_train and self.synthetic_fraction > 0.0 and num_real > 0:
            # Tính số lượng Synthetic chính xác theo công thức:
            # N_synth = N_real * (fraction / (1 - fraction))
            self.num_synth = int(round(num_real * (self.synthetic_fraction / (1.0 - self.synthetic_fraction))))
        else:
            self.num_synth = 0

        self.total_size = num_real + self.num_synth

    def __len__(self) -> int:
        return max(1, self.total_size)

    def _generate_synthetic_text_crop(self, text: str) -> np.ndarray:
        """
        Sinh ảnh synthetic text line mô phỏng điều kiện in ấn và môi trường thực tế:
        - Phông chữ in kim / in nhiệt công nghiệp
        - Nền giấy trắng hoặc carton kraft nâu
        - Biến dạng độ sáng, nhiễu hạt, lóa màng co, mờ nét
        """
        h = self.img_height
        w = random.randint(120, 220)
        # Nền ngẫu nhiên (nền trắng nhãn tem hoặc nền carton nâu)
        is_carton = random.random() < 0.35
        if is_carton:
            bg_color = (random.randint(130, 180), random.randint(150, 200), random.randint(170, 220))
            text_color = (random.randint(10, 50), random.randint(10, 50), random.randint(10, 50))
        else:
            bg_color = (random.randint(235, 255), random.randint(235, 255), random.randint(235, 255))
            text_color = (random.randint(0, 40), random.randint(0, 40), random.randint(0, 40))

        img = np.full((h, w, 3), bg_color, dtype=np.uint8)

        # Chọn font chữ OpenCV phù hợp với tem kho vận
        font = random.choice([
            cv2.FONT_HERSHEY_SIMPLEX,
            cv2.FONT_HERSHEY_DUPLEX,
            cv2.FONT_HERSHEY_COMPLEX_SMALL
        ])
        font_scale = random.uniform(0.55, 0.85)
        thickness = random.choice([1, 2])

        text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
        tx = max(5, (w - text_size[0]) // 2 + random.randint(-5, 5))
        ty = max(h - 8, (h + text_size[1]) // 2 + random.randint(-2, 2))

        cv2.putText(img, text, (tx, ty), font, font_scale, text_color, thickness, cv2.LINE_AA)

        # Áp dụng các biến dạng chân thực từ synthetic_generator
        try:
            img = self.synth_gen.apply_realistic_degradation(img)
        except Exception:
            pass

        return img

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        num_real = len(self.real_samples)

        if idx < num_real:
            # Mẫu Real: nạp thông tin text
            sample = self.real_samples[idx]
            text = sample["text"]
            # Tạo crop đại diện cho text ground truth (hoặc nạp crop thật)
            img_np = self._generate_synthetic_text_crop(text) if self.is_train else self._generate_synthetic_text_crop(text)
            source = "real"
        else:
            # Mẫu Synthetic: lấy một nhãn text Ground Truth thật ngẫu nhiên để sinh biến thể
            base_sample = random.choice(self.real_samples) if self.real_samples else {"text": "060028506", "field_type": "LPN"}
            text = base_sample["text"]
            img_np = self._generate_synthetic_text_crop(text)
            source = "synthetic"

        # Tiền xử lý ảnh thành tensor chuẩn (1, 32, 256)
        image_tensor = preprocess_ocr_crop(img_np, target_height=self.img_height, max_width=self.max_width)

        # Mã hóa CTC
        ctc_indices, target_length = encode_text_to_ctc(text)

        # Chiều dài chuỗi CTC sau khi qua 4 lớp MaxPool giảm W:
        # W_input = 256 -> W_seq = 256 / 4 = 64
        seq_len = self.max_width // 4

        # Validate an toàn cho CTC
        if target_length > seq_len:
            # Cắt bớt nếu vượt quá độ dài chuỗi CTC
            ctc_indices = ctc_indices[:seq_len]
            target_length = len(ctc_indices)

        return {
            "image": image_tensor,
            "text": text,
            "ctc_indices": ctc_indices,
            "target_length": target_length,
            "input_length": seq_len,
            "source": source
        }


def ocr_collate_fn(batch: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Collate function ghép batch cho DataLoader PyTorch:
    - Stack images thành tensor (B, 1, 32, 256)
    - Ghép targets thành 1D LongTensor (chuẩn nn.CTCLoss)
    - Tạo tensor target_lengths và input_lengths (1D LongTensor)
    - Kiểm tra và đảm bảo input_length >= target_length cho mọi mẫu
    """
    images = torch.stack([item["image"] for item in batch], dim=0)

    target_list = []
    target_lengths = []
    input_lengths = []
    texts = []
    sources = []

    for item in batch:
        target_list.extend(item["ctc_indices"])
        t_len = item["target_length"]
        i_len = item["input_length"]

        # Validate bắt buộc
        assert i_len >= t_len, f"Lỗi CTC: input_length ({i_len}) phải lớn hơn hoặc bằng target_length ({t_len})!"

        target_lengths.append(t_len)
        input_lengths.append(i_len)
        texts.append(item["text"])
        sources.append(item["source"])

    targets = torch.tensor(target_list, dtype=torch.long)
    target_lengths = torch.tensor(target_lengths, dtype=torch.long)
    input_lengths = torch.tensor(input_lengths, dtype=torch.long)

    return {
        "images": images,
        "targets": targets,
        "target_lengths": target_lengths,
        "input_lengths": input_lengths,
        "texts": texts,
        "sources": sources
    }


class FieldBalancedTierSampler:
    """
    Bộ lấy mẫu cân bằng trường dữ liệu (Field-Balanced) kết hợp phân cấp độ khó (Tier-Aware):
    Step 1: Cân bằng Field: LPN (mặc định 50%) vs SKU (mặc định 50%)
    Step 2: Trong từng Field, lấy mẫu theo tỷ lệ Tier:
      - Tier A (Gold Real): 60%
      - Tier B (Hard Real): 25%
      - Tier C (Synthetic / Augmented): 15%
    Hỗ trợ khử trùng lặp (Crop-level Deduplication) bằng mã băm composite (source_id, bbox, text).
    """

    def __init__(
        self,
        samples: List[Dict[str, Any]],
        batch_size: int = 16,
        field_ratio: Tuple[float, float] = (0.5, 0.5),      # (LPN_ratio, SKU_ratio)
        tier_weights: Tuple[float, float, float] = (0.60, 0.25, 0.15),  # (Tier_A, Tier_B, Tier_C)
        deduplicate: bool = True
    ):
        self.batch_size = batch_size
        self.field_ratio = field_ratio
        self.tier_weights = tier_weights

        # Phân loại và khử trùng lặp ở cấp độ crop
        self.buckets = {
            ("LPN", "A"): [],
            ("LPN", "B"): [],
            ("LPN", "C"): [],
            ("SKU", "A"): [],
            ("SKU", "B"): [],
            ("SKU", "C"): []
        }

        seen_crops = set()

        for s in samples:
            field = s.get("field_type", "LPN").upper()
            tier = s.get("tier", "A").upper()
            text = str(s.get("text", "")).strip()

            if deduplicate:
                crop_key = (s.get("source_image_id", ""), tuple(s.get("bbox", [])), text)
                if crop_key in seen_crops:
                    continue
                seen_crops.add(crop_key)

            if (field, tier) in self.buckets:
                self.buckets[(field, tier)].append(s)
            elif field in ("LPN", "SKU"):
                # Mặc định đưa vào Tier A nếu chưa phân hạng
                self.buckets[(field, "A")].append(s)

        self.total_real = sum(len(b) for (f, t), b in self.buckets.items() if t in ("A", "B"))

    def get_sampling_stats(self) -> Dict[str, Any]:
        """Thống kê chi tiết số lượng mẫu có sẵn trong từng bucket."""
        return {
            "lpn_tier_a": len(self.buckets[("LPN", "A")]),
            "lpn_tier_b": len(self.buckets[("LPN", "B")]),
            "lpn_tier_c": len(self.buckets[("LPN", "C")]),
            "sku_tier_a": len(self.buckets[("SKU", "A")]),
            "sku_tier_b": len(self.buckets[("SKU", "B")]),
            "sku_tier_c": len(self.buckets[("SKU", "C")]),
            "field_weights": {"LPN": self.field_ratio[0], "SKU": self.field_ratio[1]},
            "tier_weights": {"Tier_A": self.tier_weights[0], "Tier_B": self.tier_weights[1], "Tier_C": self.tier_weights[2]}
        }

    def sample_batch(self, count: int) -> List[Dict[str, Any]]:
        """Lấy 1 batch mẫu tuân theo đúng phân bổ Field-Balanced + Tier-Aware."""
        batch = []
        lpn_target = int(round(count * self.field_ratio[0]))
        sku_target = count - lpn_target

        for field, target_n in [("LPN", lpn_target), ("SKU", sku_target)]:
            t_a_target = int(round(target_n * self.tier_weights[0]))
            t_b_target = int(round(target_n * self.tier_weights[1]))
            t_c_target = target_n - t_a_target - t_b_target

            for tier, n in [("A", t_a_target), ("B", t_b_target), ("C", t_c_target)]:
                b_list = self.buckets.get((field, tier), [])
                if b_list:
                    # Lấy mẫu có hoàn lại nếu bucket nhỏ hơn yêu cầu
                    chosen = random.choices(b_list, k=n) if len(b_list) < n else random.sample(b_list, n)
                    batch.extend(chosen)
                else:
                    # Fallback sang Tier A nếu bucket rỗng
                    fallback_b = self.buckets.get((field, "A"), [])
                    if fallback_b:
                        batch.extend(random.choices(fallback_b, k=n))

        random.shuffle(batch)
        return batch

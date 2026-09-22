# -*- coding: utf-8 -*-
"""
Deep Learning CRNN + CTC Text Recognizer Model.
Kiến trúc mạng nơ-ron nhận diện ký tự công nghiệp:
CNN Backbone (Custom VGG / ResNet-style Feature Extractor)
-> Sequence Features (Map 2D spatial feature to 1D sequence)
-> Bidirectional LSTM (2 Layers, Hidden Size 256)
-> Linear Projection
-> CTC Loss Decoder

Hỗ trợ:
- state_dict(), load_state_dict()
- Mixed Precision (AMP)
- Inference greedy decoding
- Charset chuẩn: Blank (0), 0-9, A-Z, và dấu gạch nối '-'
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Tuple, Dict, Any, Optional

# Bảng ký tự công nghiệp chuẩn cho mã LPN và SKU cơ bản
CHARSET_STANDARD = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-"

# Bảng ký tự công nghiệp mở rộng: hỗ trợ quy cách thùng hàng (kích thước inch, dấu cách, mã phân cách)
CHARSET_EXTENDED = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- \"'#*~./"

# Mặc định tương thích ngược
CHARSET = CHARSET_STANDARD
CHAR2IDX = {c: i + 1 for i, c in enumerate(CHARSET)}  # 0 dành riêng cho CTC Blank Token
IDX2CHAR = {i + 1: c for i, c in enumerate(CHARSET)}
IDX2CHAR[0] = ""  # Blank token


def build_charset_maps(charset_str: str):
    """Xây dựng từ điển ánh xạ hai chiều cho một tập ký tự cụ thể."""
    c2i = {c: i + 1 for i, c in enumerate(charset_str)}
    i2c = {i + 1: c for i, c in enumerate(charset_str)}
    i2c[0] = ""
    return c2i, i2c


class BidirectionalLSTM(nn.Module):
    """Lớp LSTM 2 chiều trích xuất ngữ cảnh chuỗi ký tự."""

    def __init__(self, input_size: int, hidden_size: int, output_size: int):
        super(BidirectionalLSTM, self).__init__()
        self.rnn = nn.LSTM(input_size, hidden_size, bidirectional=True, batch_first=True)
        self.embedding = nn.Linear(hidden_size * 2, output_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        recurrent, _ = self.rnn(x)
        T, b, h = recurrent.size()
        t_rec = recurrent.contiguous().view(T * b, h)
        output = self.embedding(t_rec)
        output = output.view(T, b, -1)
        return output


class CrnnOcrModel(nn.Module):
    """
    CRNN Architecture:
    Input: (B, 1, 32, W) - Ảnh grayscale chiều cao cố định 32px
    Output: (T, B, num_classes) - Logits phân phối xác suất cho CTC Loss
    """

    def __init__(
        self,
        img_height: int = 32,
        num_channels: int = 1,
        num_classes: Optional[int] = None,
        charset: Optional[str] = None,
        hidden_size: int = 256
    ):
        super(CrnnOcrModel, self).__init__()
        self.img_height = img_height
        
        if charset is not None:
            self.charset = charset
            self.char2idx, self.idx2char = build_charset_maps(charset)
            self.num_classes = len(charset) + 1 if num_classes is None else num_classes
        else:
            if num_classes == len(CHARSET_EXTENDED) + 1:
                self.charset = CHARSET_EXTENDED
            else:
                self.charset = CHARSET_STANDARD
            self.char2idx, self.idx2char = build_charset_maps(self.charset)
            self.num_classes = len(self.charset) + 1 if num_classes is None else num_classes

        # CNN Feature Extractor (7 Conv Layers + BatchNorm + LeakyReLU + MaxPool)
        # Giảm chiều cao từ 32 -> 16 -> 8 -> 4 -> 2 -> 1
        # Giảm chiều rộng theo tỷ lệ 4x (W / 4)
        self.cnn = nn.Sequential(
            # Conv 1: 32xW -> 16x(W/2)
            nn.Conv2d(num_channels, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Conv 2: 16x(W/2) -> 8x(W/4)
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2, inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Conv 3: 8x(W/4) -> 8x(W/4)
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2, inplace=True),

            # Conv 4: 8x(W/4) -> 4x(W/4) (Chỉ giảm H, giữ W)
            nn.Conv2d(256, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2, inplace=True),
            nn.MaxPool2d(kernel_size=(2, 1), stride=(2, 1)),

            # Conv 5: 4x(W/4) -> 2x(W/4)
            nn.Conv2d(256, 512, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(512),
            nn.LeakyReLU(0.2, inplace=True),
            nn.MaxPool2d(kernel_size=(2, 1), stride=(2, 1)),

            # Conv 6: 2x(W/4) -> 1x(W/4)
            nn.Conv2d(512, 512, kernel_size=(2, 1), stride=1, padding=0),
            nn.BatchNorm2d(512),
            nn.LeakyReLU(0.2, inplace=True)
        )

        # BiLSTM Sequence Modeling (2 layers)
        self.rnn = nn.Sequential(
            BidirectionalLSTM(512, hidden_size, hidden_size),
            BidirectionalLSTM(hidden_size, hidden_size, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Input: (B, 1, 32, W)
        Output: (T, B, num_classes) - Phù hợp trực tiếp cho nn.CTCLoss
        """
        # Trích xuất đặc trưng hình ảnh: (B, C, H, W) -> (B, 512, 1, W_seq)
        conv = self.cnn(x)
        b, c, h, w = conv.size()
        assert h == 1, f"Chiều cao đặc trưng sau CNN phải bằng 1, hiện tại là {h}"

        conv = conv.squeeze(2)  # (B, 512, W_seq)
        conv = conv.permute(2, 0, 1)  # (W_seq, B, 512)

        # Trích xuất ngữ cảnh chuỗi ký tự qua BiLSTM: (W_seq, B, num_classes)
        output = self.rnn(conv)
        return output

    @torch.no_grad()
    def predict_text(self, x: torch.Tensor) -> List[Tuple[str, float]]:
        """
        Inference dự đoán chuỗi ký tự bằng CTC Greedy Decoder.
        Trả về danh sách (decoded_text, confidence_score).
        """
        self.eval()
        logits = self.forward(x)  # (T, B, num_classes)
        probs = F.softmax(logits, dim=2)  # (T, B, num_classes)
        max_probs, preds = torch.max(probs, dim=2)  # (T, B)

        preds = preds.transpose(1, 0).cpu().numpy()  # (B, T)
        max_probs = max_probs.transpose(1, 0).cpu().numpy()  # (B, T)

        results = []
        for b_idx in range(preds.shape[0]):
            pred_seq = preds[b_idx]
            prob_seq = max_probs[b_idx]

            char_list = []
            conf_list = []
            prev_idx = 0

            for idx, p in zip(pred_seq, prob_seq):
                if idx != 0 and idx != prev_idx:
                    mapper = getattr(self, "idx2char", IDX2CHAR)
                    char_list.append(mapper.get(idx, ""))
                    conf_list.append(float(p))
                prev_idx = idx

            text = "".join(char_list)
            conf = float(sum(conf_list) / len(conf_list)) if conf_list else 0.0
            results.append((text, round(conf, 4)))

        return results


def encode_text_to_ctc(text: str) -> Tuple[List[int], int]:
    """Mã hóa chuỗi text sang vector số nguyên cho CTCLoss."""
    clean_text = str(text or "").strip().upper()
    indices = [CHAR2IDX[c] for c in clean_text if c in CHAR2IDX]
    return indices, len(indices)


def decode_target_indices(indices: List[int]) -> str:
    """Giải mã trực tiếp vector target indices thành chuỗi ký tự gốc."""
    return "".join(IDX2CHAR.get(i, "") for i in indices if i != 0)


def ctc_greedy_decode(pred_indices: List[int]) -> str:
    """
    Giải mã chuỗi dự đoán thô từ CTC Greedy Output:
    - Loại bỏ Blank Token (0)
    - Gộp các ký tự liên tiếp giống nhau nếu không có Blank token ở giữa
    - Giữ lại các ký tự lặp hợp lệ (ví dụ: '00', '11', 'SS') khi có Blank token xen giữa
    """
    res = []
    prev = 0
    for idx in pred_indices:
        if idx != 0 and idx != prev:
            res.append(IDX2CHAR.get(idx, ""))
        prev = idx
    return "".join(res)


def decode_ctc_indices(indices: List[int]) -> str:
    """Alias cho ctc_greedy_decode."""
    return ctc_greedy_decode(indices)

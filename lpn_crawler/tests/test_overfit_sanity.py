# -*- coding: utf-8 -*-
"""
Small-Set Overfit Sanity Test for CRNN + CTC.
Mục tiêu:
- Chứng minh kiến trúc CRNN + CTCLoss + Greedy Decoder có khả năng MEMORIZE hoàn toàn tập nhỏ sạch (50-100 mẫu, 50% LPN, 50% SKU).
- Tắt augmentation gây biến dạng mạnh.
- Giám sát Train Loss, Train CER, Train Sequence Exact Match, Gradient L2-norm, Weight Update delta.
- Tiêu chí PASS Sanity: Train Sequence Exact Match >= 95% (kỳ vọng ~100%).
- Tuyệt đối KHÔNG dùng test_lockbox.
"""

import os
import sys
import json
import time
import math
import cv2
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

from ai_ocr_train.training.model import CrnnOcrModel, encode_text_to_ctc, ctc_greedy_decode
from ai_ocr_train.training.dataset import LpnOcrDataset

# Tập mẫu kiểm thử Overfit Sanity: 60 mẫu sạch (30 LPNs, 30 SKUs)
SANITY_LPNS = [
    f"06{random_digits:07d}"
    for random_digits in [
        28506, 11422, 99201, 33451, 88210, 44521, 66723, 10293, 84721, 55321,
        12345, 67890, 54321, 98765, 11223, 44556, 77889, 99001, 33112, 55443,
        77665, 88990, 22114, 66554, 33221, 99887, 44332, 11556, 77221, 88443
    ]
]

SANITY_SKUS = [
    "A036S-R-BC-WOA", "B012-K-WH", "SKU-9921-X", "WOOD-CAB-01", "BOX-1029-BR",
    "F-882-GR", "TBL-OAK-44", "CHAIR-BLK-02", "DESK-M-202", "P-8812-BLU",
    "A036S-R-BC-BL", "B012-K-BK", "SKU-8810-Y", "WOOD-DESK-02", "BOX-4412-WH",
    "F-102-RD", "TBL-WAL-88", "CHAIR-WHT-01", "SOFA-L-101", "P-9941-RED",
    "C045-A-GR-OAK", "D091-B-BK", "SKU-7731-Z", "METAL-FRAME-05", "BOX-9901-GY",
    "F-304-BL", "TBL-PIN-12", "CHAIR-GRY-05", "SHELF-S-301", "P-1123-BLK"
]

def render_text_crop_clean(text: str, height: int = 32, width: int = 256) -> np.ndarray:
    """Render ảnh text-line crop rõ ràng, nền trắng chữ đen không nhiễu để test model memorization."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 255
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.65
    thickness = 2
    (tw, th), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    
    # Canh giữa ảnh
    tx = max(4, (width - tw) // 2)
    ty = max(height - 6, (height + th) // 2)
    cv2.putText(img, text, (tx, ty), font, font_scale, (15, 15, 15), thickness, cv2.LINE_AA)
    return img

class SanityOverfitDataset(Dataset):
    def __init__(self, samples):
        self.samples = samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        text = self.samples[idx]
        img_bgr = render_text_crop_clean(text)
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        norm = (gray.astype(np.float32) / 127.5) - 1.0
        tensor = torch.from_numpy(norm).unsqueeze(0)  # [1, 32, 256]
        indices, t_len = encode_text_to_ctc(text)
        return {
            "image": tensor,
            "text": text,
            "ctc_indices": indices,
            "target_length": t_len,
            "input_length": 64,
            "source": "sanity"
        }

def levenshtein_dist(s1: str, s2: str) -> int:
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]

def run_overfit_sanity_test(epochs: int = 40):
    print("=" * 70)
    print("6. SMALL-SET OVERFIT SANITY TEST (CRNN + CTCLoss)")
    print("=" * 70)
    
    samples = SANITY_LPNS + SANITY_SKUS
    print(f"Số lượng mẫu sanity: {len(samples)} (30 LPNs + 30 SKUs)")
    
    from ai_ocr_train.training.dataset import ocr_collate_fn
    dataset = SanityOverfitDataset(samples)
    loader = DataLoader(dataset, batch_size=8, shuffle=True, drop_last=False, collate_fn=ocr_collate_fn)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    model = CrnnOcrModel(hidden_size=256).to(device)
    criterion = nn.CTCLoss(blank=0, zero_infinity=True)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1.8e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    print("\n--- Bắt đầu huấn luyện Overfit Sanity ---")
    start_time = time.time()

    initial_weights_norm = sum(p.norm().item() for p in model.parameters())
    best_seq_exact = 0.0

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        grad_norms = []

        for batch in loader:
            images = batch["images"].to(device)
            targets = batch["targets"].to(device)
            target_lengths = batch["target_lengths"].to(device)
            B = images.size(0)

            optimizer.zero_grad()
            logits = model(images)  # [T, B, num_classes]
            T = logits.size(0)
            input_lengths = torch.full((B,), T, dtype=torch.long, device=device)

            log_probs = logits.log_softmax(2)
            loss = criterion(log_probs, targets, input_lengths, target_lengths)
            loss.backward()

            # Measure gradient norm
            total_grad_norm = 0.0
            for p in model.parameters():
                if p.grad is not None:
                    param_norm = p.grad.data.norm(2)
                    total_grad_norm += param_norm.item() ** 2
            total_grad_norm = total_grad_norm ** 0.5
            grad_norms.append(total_grad_norm)

            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()
            total_loss += loss.item() * B

        scheduler.step()
        avg_loss = total_loss / len(samples)
        avg_grad = sum(grad_norms) / max(1, len(grad_norms))

        # Đánh giá Accuracy & CER trên toàn tập sanity
        model.eval()
        correct_seq = 0
        total_chars = 0
        edit_dist_total = 0
        sample_preds = []

        with torch.no_grad():
            for batch in loader:
                images = batch["images"].to(device)
                texts = batch["texts"]
                preds = model.predict_text(images)

                for (pred_text, conf), gt in zip(preds, texts):
                    clean_p = pred_text.strip()
                    clean_g = gt.strip()
                    if clean_p == clean_g:
                        correct_seq += 1
                    edit_dist_total += levenshtein_dist(clean_p, clean_g)
                    total_chars += len(clean_g)
                    if len(sample_preds) < 3:
                        sample_preds.append(f"Pred: '{clean_p}' vs GT: '{clean_g}'")

        seq_exact = (correct_seq / len(samples)) * 100.0
        cer = (edit_dist_total / max(1, total_chars)) * 100.0

        if seq_exact > best_seq_exact:
            best_seq_exact = seq_exact
            # Save checkpoint
            best_ckpt_dir = os.path.join(PROJECT_ROOT, "ai_ocr_train", "runs", "smoke_test_20260910_093742")
            os.makedirs(best_ckpt_dir, exist_ok=True)
            torch.save({
                "model_state_dict": model.state_dict(),
                "epoch": epoch,
                "seq_exact": seq_exact,
                "cer": cer,
                "loss": avg_loss
            }, os.path.join(best_ckpt_dir, "best.pt"))

        if epoch % 10 == 0 or epoch == epochs or seq_exact >= 95.0:
            pred_info = " | " + " ; ".join(sample_preds[:2])
            print(f"Epoch [{epoch:03d}/{epochs:03d}] | Loss: {avg_loss:.4f} | Grad: {avg_grad:.2f} | CER: {cer:.2f}% | Seq Exact: {seq_exact:.2f}%{pred_info}")

        if seq_exact >= 98.0 and avg_loss < 0.1:
            print(f"\n>>> DỪNG SỚM TẠI EPOCH {epoch}: Model đã MEMORIZE tập nhỏ thành công ({seq_exact:.2f}% Seq Exact, Loss={avg_loss:.4f})!")
            break

    elapsed = time.time() - start_time
    final_weights_norm = sum(p.norm().item() for p in model.parameters())
    weight_delta = abs(final_weights_norm - initial_weights_norm)

    print("\n" + "=" * 70)
    print("KẾT QUẢ SMALL-SET OVERFIT SANITY TEST")
    print(f"  Thời gian hoàn thành : {elapsed:.2f}s")
    print(f"  Final Train Loss     : {avg_loss:.4f}")
    print(f"  Final Train CER      : {cer:.2f}%")
    print(f"  Final Seq Exact Match: {seq_exact:.2f}%")
    print(f"  Avg Gradient Norm    : {avg_grad:.4f}")
    print(f"  Weight Update Delta  : {weight_delta:.4f}")
    print(f"  Pass Sanity Criteria : {'PASS (>=95%)' if seq_exact >= 95.0 else 'FAIL (<95%)'}")
    print("=" * 70)

    # Save results to json
    res_path = os.path.join(PROJECT_ROOT, "scratch", "overfit_sanity_results.json")
    with open(res_path, "w", encoding="utf-8") as f:
        json.dump({
            "samples_count": len(samples),
            "final_loss": avg_loss,
            "final_cer": cer,
            "final_seq_exact": seq_exact,
            "avg_grad_norm": avg_grad,
            "weight_delta": weight_delta,
            "status": "PASS" if seq_exact >= 95.0 else "FAIL"
        }, f, indent=2)

if __name__ == "__main__":
    run_overfit_sanity_test(epochs=220)

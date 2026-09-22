# -*- coding: utf-8 -*-
"""
CTC Sanity Unit Tests.
Kiểm tra tính đúng đắn tuyệt đối của cơ chế mã hóa/giải mã CTC:
1. Blank Token Index = 0.
2. Tính đối xứng Encode <-> Decode cho mã SKU phức tạp (A036S-R-BC-WOA).
3. Xử lý chính xác ký tự lặp liền kề ('00', '11', 'SS', 'OO') qua CTC Greedy Decoder.
4. Kiểm tra giới hạn input_length (64) >= target_length.
5. Kiểm tra dấu gạch nối '-' và số chữ số LPN trong charset.
"""

import sys
import os

sys.path.insert(0, r"E:\Work\SmartFlow\V2\Quanly_Claim")
sys.path.insert(0, r"E:\Work\SmartFlow\V2\Quanly_Claim\Claim\BackEnd")

from lpn_crawler.ai_ocr_train.training.model import (
    CHARSET, CHAR2IDX, IDX2CHAR,
    encode_text_to_ctc, decode_target_indices, ctc_greedy_decode
)

def run_ctc_sanity_tests():
    print("=================================================================")
    print("CHẠY CTC SANITY UNIT TESTS:")
    print("=================================================================")

    # Test 1: Blank Token Index
    assert 0 not in CHAR2IDX.values(), "Lỗi: Index 0 phải dành riêng cho Blank token!"
    assert IDX2CHAR[0] == "", "Lỗi: IDX2CHAR[0] phải là Blank (chuỗi rỗng)!"
    print("[PASS] Test 1: Blank Token Index = 0 (Thống nhất chuẩn PyTorch CTC)")

    # Test 2: Dấu '-' và số chữ số trong Charset
    assert "-" in CHARSET, "Lỗi: Dấu '-' bắt buộc phải có trong CHARSET!"
    assert all(c in CHARSET for c in "0123456789"), "Lỗi: Chữ số 0-9 phải có trong CHARSET!"
    assert all(c in CHARSET for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"), "Lỗi: Ký tự A-Z phải có trong CHARSET!"
    print(f"[PASS] Test 2: Charset chuẩn ({len(CHARSET)} ký tự): {CHARSET}")

    # Test 3: Đối xứng Encode -> Decode cho SKU phức tạp
    test_sku = "A036S-R-BC-WOA"
    indices, t_len = encode_text_to_ctc(test_sku)
    decoded_sku = decode_target_indices(indices)
    assert decoded_sku == test_sku, f"Lỗi đối xứng: {test_sku} != {decoded_sku}"
    print(f"[PASS] Test 3: SKU Encode <-> Decode đối xứng: '{test_sku}' -> {indices} -> '{decoded_sku}'")

    # Test 4: Đối xứng cho mã LPN
    test_lpn = "060028506"
    lpn_indices, l_len = encode_text_to_ctc(test_lpn)
    decoded_lpn = decode_target_indices(lpn_indices)
    assert decoded_lpn == test_lpn, f"Lỗi đối xứng LPN: {test_lpn} != {decoded_lpn}"
    print(f"[PASS] Test 4: LPN Encode <-> Decode đối xứng: '{test_lpn}' -> '{decoded_lpn}'")

    # Test 5: Xử lý ký tự lặp qua CTC Greedy Decoder ('00', '11', 'SS', 'OO')
    # Trong CTC: Nếu 2 ký tự giống nhau liên tiếp ('SS'), căn chỉnh CTC bắt buộc phải có Blank (0) ở giữa:
    # [idx('S'), idx('S')] mà không có 0 sẽ bị CTC gộp thành 'S'.
    # [idx('S'), 0, idx('S')] sẽ giải mã thành 'SS'.
    s_idx = CHAR2IDX['S']
    raw_ctc_seq_with_blank = [s_idx, s_idx, 0, s_idx, s_idx]
    decoded_double_s = ctc_greedy_decode(raw_ctc_seq_with_blank)
    assert decoded_double_s == "SS", f"Lỗi giải mã 'SS': nhận được '{decoded_double_s}'"

    zero_idx = CHAR2IDX['0']
    raw_ctc_double_zero = [zero_idx, 0, zero_idx]
    assert ctc_greedy_decode(raw_ctc_double_zero) == "00", "Lỗi giải mã '00'"

    one_idx = CHAR2IDX['1']
    raw_ctc_double_one = [one_idx, 0, one_idx]
    assert ctc_greedy_decode(raw_ctc_double_one) == "11", "Lỗi giải mã '11'"

    o_idx = CHAR2IDX['O']
    raw_ctc_double_o = [o_idx, 0, o_idx]
    assert ctc_greedy_decode(raw_ctc_double_o) == "OO", "Lỗi giải mã 'OO'"
    print("[PASS] Test 5: CTC Greedy Decoder xử lý đúng hoàn toàn ký tự lặp: '00', '11', 'SS', 'OO'")

    # Test 6: Kiểm tra giới hạn input_length (64) >= target_length
    max_supported_len = 64
    assert t_len <= max_supported_len, f"Lỗi: target_length ({t_len}) vượt quá input_length ({max_supported_len})"
    assert l_len <= max_supported_len, f"Lỗi: target_length ({l_len}) vượt quá input_length ({max_supported_len})"
    print(f"[PASS] Test 6: Giới hạn Sequence Length hợp lệ: Target {t_len} <= Input {max_supported_len}")

    print("=================================================================")
    print("==> KẾT LUẬN: TẤT CẢ CTC SANITY TESTS ĐẠT 100% [PASS]!")
    print("=================================================================")
    return True

if __name__ == "__main__":
    run_ctc_sanity_tests()

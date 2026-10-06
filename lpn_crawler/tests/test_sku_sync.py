# -*- coding: utf-8 -*-
"""
Test đồng bộ SKU giữa OCR Engine, Parser và hiển thị trực quan:
- Xử lý các biến thể: '2-42 MNB', '2-42MNB', '2-42-MNB'
- Đảm bảo không bị cắt cụt thành '2-42'
- Đồng bộ giữa nhãn vẽ bounding box và kết quả bóc tách
"""
import unittest
from lpn_crawler.ai_ocr_train.core.parser import LabelDataParser

class TestSkuSync(unittest.TestCase):

    def test_normalize_sku_variations(self):
        # Thiếu gạch nối giữa kích thước và màu
        self.assertEqual(LabelDataParser.normalize_sku("2-42 MNB"), "2-42-MNB")
        self.assertEqual(LabelDataParser.normalize_sku("2-42MNB"), "2-42-MNB")
        self.assertEqual(LabelDataParser.normalize_sku("2-42-MNB"), "2-42-MNB")
        self.assertEqual(LabelDataParser.normalize_sku("2-42 MNE"), "2-42-MNB") # OCR nhầm B thành E hoặc 8
        self.assertEqual(LabelDataParser.normalize_sku("1-72D WOA"), "1-72D-WOA")
        self.assertEqual(LabelDataParser.normalize_sku("1-72DWOA"), "1-72D-WOA")
        self.assertEqual(LabelDataParser.normalize_sku("1-60D WHT"), "1-60D-WHT")

    def test_parse_extracted_data_tem4(self):
        # Tình huống Tem #4 trong KKFU 7920082:
        # OCR đọc được 2 token: 'Yccti' và '2-42 MNB'
        tokens = [
            {"text": "Yccti", "confidence": 0.82},
            {"text": "2-42 MNB", "confidence": 0.91}
        ]
        expected = ["2-42-MNB"]
        res = LabelDataParser.parse_extracted_data(
            ocr_tokens=tokens,
            barcode_results=[],
            expected_skus=expected
        )
        self.assertEqual(res.get("sku"), "2-42-MNB", f"Expected 2-42-MNB but got {res.get('sku')}")
        self.assertNotIn("2-42", res.get("all_skus", []))

    def test_parse_extracted_data_without_expected(self):
        # Kể cả khi chưa có expected_skus, chuỗi '2-42 MNB' cũng phải ra '2-42-MNB', không được cắt thành '2-42'
        tokens = [
            {"text": "Yccti", "confidence": 0.82},
            {"text": "2-42 MNB", "confidence": 0.91}
        ]
        res = LabelDataParser.parse_extracted_data(
            ocr_tokens=tokens,
            barcode_results=[],
            expected_skus=None
        )
        self.assertEqual(res.get("sku"), "2-42-MNB", f"Expected 2-42-MNB but got {res.get('sku')}")

    def test_rejection_of_numeric_lpn_as_sku(self):
        # Đảm bảo mã LPN dạng '0600-75401' (thuần số + gạch nối) không bao giờ bị nhận nhầm làm SKU
        self.assertFalse(LabelDataParser.is_valid_sku_candidate("0600-75401"))
        self.assertFalse(LabelDataParser.is_valid_sku_candidate("2-42"))
        self.assertFalse(LabelDataParser.is_valid_sku_candidate("1-60"))
        self.assertTrue(LabelDataParser.is_valid_sku_candidate("2-42-MNB"))
        self.assertTrue(LabelDataParser.is_valid_sku_candidate("1-72D-WOA"))

    def test_sync_between_norm_and_calib(self):
        # Kiểm tra tính đồng bộ: cả '2-42MNB' và '2-42 MNB' đều chuẩn hóa thành '2-42-MNB'
        for raw in ["2-42 MNB", "2-42MNB", "2-42-MNB"]:
            norm = LabelDataParser.normalize_sku(raw)
            calib = LabelDataParser.calibrate_sku_with_expected(norm, ["2-42-MNB"])
            self.assertEqual(norm, "2-42-MNB")
            self.assertEqual(calib, "2-42-MNB")

    def test_optical_confusion_1_vs_4(self):
        # Khi CSDL là 19-48-SAN: OCR nhầm 49- hoặc 410- được hiệu chỉnh về 19-48-SAN
        self.assertEqual(LabelDataParser.calibrate_sku_with_expected("49-48-SAN", ["19-48-SAN"]), "19-48-SAN")
        self.assertEqual(LabelDataParser.calibrate_sku_with_expected("410-48-SAN", ["19-48-SAN"]), "19-48-SAN")
        # Khi CSDL thực sự là 49-48-SAN: Giữ nguyên 49-48-SAN, không được tự ý đổi thành 19-
        self.assertEqual(LabelDataParser.calibrate_sku_with_expected("49-48-SAN", ["49-48-SAN"]), "49-48-SAN")
        self.assertEqual(LabelDataParser.normalize_sku("49-48-SAN"), "49-48-SAN")

    def test_mrku_2939500_single_label_exclusivity(self):
        # Kiểm tra trường hợp MRKU 2939500 (Box 1B):
        # Tem #1: Tem SKU sản phẩm, không được bóc tách LPN rác 11410485
        tokens_tem1 = [
            {"text": "48 CENTER", "confidence": 0.95},
            {"text": "WARM white", "confidence": 0.92},
            {"text": "I1", "confidence": 0.8},
            {"text": "410.48-SAN", "confidence": 0.88},
            {"text": "6", "confidence": 0.8},
            {"text": "1", "confidence": 0.8},
            {"text": "0", "confidence": 0.8},
            {"text": "4", "confidence": 0.8}
        ]
        res1 = LabelDataParser.parse_extracted_data(
            tokens_tem1, [], expected_skus=["19-48-SAN"], expected_lpn="060078862", is_single_label=True
        )
        self.assertEqual(res1.get("sku"), "19-48-SAN")
        self.assertIsNone(res1.get("lpn"))
        self.assertEqual(res1.get("all_lpns"), [])

        # Tem #2: Tem SKU sản phẩm, không được bóc tách LPN rác 11149485
        tokens_tem2 = [
            {"text": "AE CENTER", "confidence": 0.9},
            {"text": "White", "confidence": 0.9},
            {"text": "X", "confidence": 0.8},
            {"text": "MIII", "confidence": 0.7},
            {"text": "49-48-SAN", "confidence": 0.88},
            {"text": "1", "confidence": 0.8},
            {"text": "J", "confidence": 0.7}
        ]
        res2 = LabelDataParser.parse_extracted_data(
            tokens_tem2, [], expected_skus=["19-48-SAN"], expected_lpn="060078862", is_single_label=True
        )
        self.assertEqual(res2.get("sku"), "19-48-SAN")
        self.assertIsNone(res2.get("lpn"))
        self.assertEqual(res2.get("all_lpns"), [])

        # Tem #4: Tem LPN kho, có mã vạch 060078860, không có SKU
        barcodes_tem4 = [{"data": "060078860", "type": "CODE128"}]
        res4 = LabelDataParser.parse_extracted_data(
            [], barcodes_tem4, expected_skus=["19-48-SAN"], expected_lpn="060078862", is_single_label=True
        )
        self.assertEqual(res4.get("lpn"), "060078860")
        self.assertIsNone(res4.get("sku"))
        self.assertEqual(res4.get("all_skus"), [])


if __name__ == "__main__":
    unittest.main()

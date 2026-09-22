# -*- coding: utf-8 -*-
"""
Test Suite verifying all 10 specific audit test cases for the AI OCR Pipeline.
"""
import os
import sys
import numpy as np
import cv2

# Add root paths
sys.path.insert(0, r"E:\Work\SmartFlow\V2\Quanly_Claim\lpn_crawler")
sys.path.insert(0, r"E:\Work\SmartFlow\V2\Quanly_Claim\lpn_crawler\ai_ocr_train")

from ai_ocr_train.core.parser import LabelDataParser
from ai_ocr_train.core.auto_orient import AutoOrient
from ai_ocr_train.core.ocr_engine import OcrEngine

def run_tests():
    results = []

    print("================================================================")
    print("RUNNING 10 TEST CASES AUDIT SUITE")
    print("================================================================")

    # -------------------------------------------------------------
    # Case 1: LPN barcode đúng + SKU OCR đúng -> SUCCESS
    # -------------------------------------------------------------
    barcodes_1 = [{"data": "060851833", "type": "CODE128"}]
    tokens_1 = [{"text": "A036S-R-BC-WOA", "confidence": 0.96}]
    res_1 = LabelDataParser.parse_extracted_data(tokens_1, barcodes_1)
    
    # Evaluate 3-tier status logic
    det_lpn_1 = res_1["lpn"]
    det_sku_1 = res_1["sku"]
    conf_1 = res_1["overall_confidence"]
    sku_is_pred_1 = res_1["sku_is_predicted"]
    sku_is_val_1 = res_1["sku_is_validated"]
    if det_lpn_1 and det_sku_1 and conf_1 >= 0.80 and (not sku_is_pred_1 or sku_is_val_1):
        status_1 = "success"
    elif det_lpn_1 or det_sku_1:
        status_1 = "review"
    else:
        status_1 = "failed"

    c1_pass = (det_lpn_1 == "060851833" and det_sku_1 == "A036S-R-BC-WOA" and status_1 == "success" and conf_1 >= 0.80)
    results.append({
        "case": "Case 1: LPN barcode đúng + SKU OCR đúng",
        "expected": "LPN=060851833, SKU=A036S-R-BC-WOA, status=success",
        "actual": f"LPN={det_lpn_1}, SKU={det_sku_1}, status={status_1}, conf={conf_1}",
        "pass": c1_pass
    })
    print(f"Case 1: {'PASS' if c1_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 2: UPC barcode 8/12 digits + LPN thật nằm ở OCR
    # -> UPC không được nhận thành LPN, OCR LPN được ưu tiên!
    # -------------------------------------------------------------
    barcodes_2 = [{"data": "81063610", "type": "UPC-E"}]
    tokens_2 = [
        {"text": "LPN 060851833", "confidence": 0.94},
        {"text": "A036S-R-BC-WOA", "confidence": 0.95}
    ]
    res_2 = LabelDataParser.parse_extracted_data(tokens_2, barcodes_2)
    c2_pass = (res_2["lpn"] == "060851833" and res_2["lpn"] != "81063610")
    results.append({
        "case": "Case 2: UPC barcode 8/12 digits + LPN OCR",
        "expected": "LPN=060851833 (UPC 81063610 bị từ chối làm LPN)",
        "actual": f"LPN={res_2['lpn']} (source: {res_2['lpn_source']})",
        "pass": c2_pass
    })
    print(f"Case 2: {'PASS' if c2_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 3: LPN đúng nhưng không có SKU
    # -> overall confidence không được = 100% (bị penalty completeness)
    # -------------------------------------------------------------
    barcodes_3 = [{"data": "060851833", "type": "CODE128"}]
    tokens_3 = []
    res_3 = LabelDataParser.parse_extracted_data(tokens_3, barcodes_3)
    c3_pass = (res_3["lpn"] == "060851833" and res_3["sku"] is None and res_3["overall_confidence"] <= 0.50 and res_3["completeness"] == 0.50)
    results.append({
        "case": "Case 3: LPN đúng nhưng thiếu SKU",
        "expected": "LPN=060851833, SKU=None, overall_conf <= 0.50, completeness=0.50",
        "actual": f"LPN={res_3['lpn']}, SKU={res_3['sku']}, conf={res_3['overall_confidence']}, completeness={res_3['completeness']}",
        "pass": c3_pass
    })
    print(f"Case 3: {'PASS' if c3_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 4: SKU fuzzy tạo ra mã không có trong Master
    # -> không Auto Accept (phải là predicted_sku, không validated_sku, conf <= 0.75)
    # -------------------------------------------------------------
    tokens_4 = [
        {"text": "060851833", "confidence": 0.95},
        {"text": 'CAMBRIDGE 36" RIGHT CABINET IN WHITE OAK', "confidence": 0.90}
    ]
    expected_skus_container = ["A072D-BC-WHT", "A060D-BC-GRY"] # Không chứa A036S-R-BC-WOA
    res_4 = LabelDataParser.parse_extracted_data(tokens_4, [], expected_skus=expected_skus_container)
    c4_pass = (res_4["sku_is_predicted"] is True and 
               res_4["sku_is_validated"] is False and 
               res_4["predicted_sku"] == "A036S-R-BC-WOA" and 
               res_4["validated_sku"] is None and 
               res_4["sku_confidence"] <= 0.75)
    results.append({
        "case": "Case 4: SKU fuzzy không có trong Master",
        "expected": "predicted_sku=A036S-R-BC-WOA, validated_sku=None, sku_is_validated=False, conf<=0.75",
        "actual": f"pred={res_4['predicted_sku']}, val={res_4['validated_sku']}, is_val={res_4['sku_is_validated']}, sku_conf={res_4['sku_confidence']}",
        "pass": c4_pass
    })
    print(f"Case 4: {'PASS' if c4_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 5: OCR confidence thấp -> REVIEW thay vì SUCCESS
    # -------------------------------------------------------------
    tokens_5 = [
        {"text": "060851833", "confidence": 0.45},
        {"text": "A036S-R-BC-WOA", "confidence": 0.50}
    ]
    res_5 = LabelDataParser.parse_extracted_data(tokens_5, [])
    conf_5 = res_5["overall_confidence"]
    # 3-tier status check:
    if res_5["lpn"] and res_5["sku"] and conf_5 >= 0.80:
        status_5 = "success"
    elif res_5["lpn"] or res_5["sku"]:
        status_5 = "review"
    else:
        status_5 = "failed"
    c5_pass = (status_5 == "review" and conf_5 < 0.80)
    results.append({
        "case": "Case 5: OCR confidence thấp",
        "expected": "overall_conf < 0.80 -> status=review (thay vì success)",
        "actual": f"conf={conf_5}, status={status_5}",
        "pass": c5_pass
    })
    print(f"Case 5: {'PASS' if c5_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 6: Tem nghiêng 2D (Rotation deskew)
    # -------------------------------------------------------------
    # Tạo ảnh trắng có dòng chữ đen nghiêng -12 độ
    test_img = np.ones((200, 400, 3), dtype=np.uint8) * 255
    cv2.putText(test_img, "060851833", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
    M_rot = cv2.getRotationMatrix2D((200, 100), -12.0, 1.0)
    rotated_img = cv2.warpAffine(test_img, M_rot, (400, 200), borderValue=(255, 255, 255))
    
    deskewed_img, meta_6 = AutoOrient.auto_orient_image(rotated_img)
    c6_pass = (meta_6["is_rotated"] is True and abs(meta_6["applied_angle"]) > 0.5)
    results.append({
        "case": "Case 6: Tem nghiêng 2D",
        "expected": "is_rotated=True, applied_angle != 0",
        "actual": f"is_rotated={meta_6['is_rotated']}, angle={meta_6['applied_angle']}",
        "pass": c6_pass
    })
    print(f"Case 6: {'PASS' if c6_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 7: Tem bị perspective distortion (Four-point transform)
    # -------------------------------------------------------------
    # Tạo hình tứ giác méo và nắn thẳng
    src_pts = np.array([[30, 40], [380, 20], [360, 180], [50, 190]], dtype=np.float32)
    warped_7 = AutoOrient.four_point_transform(test_img, src_pts)
    c7_pass = (warped_7 is not None and warped_7.shape[0] > 100 and warped_7.shape[1] > 200)
    results.append({
        "case": "Case 7: Tem bị perspective distortion",
        "expected": "Nắn hình thang bằng cv2.warpPerspective thành công (shape > 100x200)",
        "actual": f"warped_shape={warped_7.shape}",
        "pass": c7_pass
    })
    print(f"Case 7: {'PASS' if c7_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 8: Nhiều ROI trong một ảnh -> Merge đúng LPN + SKU + Batch
    # -------------------------------------------------------------
    tokens_roi_1 = [{"text": "060851833", "confidence": 0.98}]
    tokens_roi_2 = [{"text": "A036S-R-BC-WOA", "confidence": 0.95}]
    tokens_roi_3 = [{"text": "BATCH LOT-2024-X", "confidence": 0.90}]
    all_multi_tokens = tokens_roi_1 + tokens_roi_2 + tokens_roi_3
    res_8 = LabelDataParser.parse_extracted_data(all_multi_tokens, [])
    c8_pass = (res_8["lpn"] == "060851833" and 
               res_8["sku"] == "A036S-R-BC-WOA" and 
               res_8["batch"] == "LOT-2024-X" and 
               res_8["overall_confidence"] >= 0.85)
    results.append({
        "case": "Case 8: Nhiều ROI merge đúng LPN + SKU + Batch",
        "expected": "LPN=060851833, SKU=A036S-R-BC-WOA, Batch=LOT-2024-X",
        "actual": f"LPN={res_8['lpn']}, SKU={res_8['sku']}, Batch={res_8['batch']}",
        "pass": c8_pass
    })
    print(f"Case 8: {'PASS' if c8_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 9: Không đọc được gì -> FAILED
    # -------------------------------------------------------------
    res_9 = LabelDataParser.parse_extracted_data([], [])
    if res_9["lpn"] and res_9["sku"]:
        status_9 = "success"
    elif res_9["lpn"] or res_9["sku"]:
        status_9 = "review"
    else:
        status_9 = "failed"
    c9_pass = (res_9["lpn"] is None and res_9["sku"] is None and status_9 == "failed" and res_9["overall_confidence"] == 0.0)
    results.append({
        "case": "Case 9: Không đọc được gì",
        "expected": "LPN=None, SKU=None, overall_conf=0.0 -> status=failed",
        "actual": f"LPN={res_9['lpn']}, SKU={res_9['sku']}, status={status_9}, conf={res_9['overall_confidence']}",
        "pass": c9_pass
    })
    print(f"Case 9: {'PASS' if c9_pass else 'FAIL'} -> {results[-1]['actual']}")

    # -------------------------------------------------------------
    # Case 10: Kiểm tra trung thực Model Metadata & Weights
    # -------------------------------------------------------------
    meta_10 = OcrEngine.get_model_metadata("checkpoint_hybrid_epoch15_acc99.1.pt")
    models_dir = r"E:\Work\SmartFlow\V2\Quanly_Claim\lpn_crawler\ai_ocr_train\models"
    ckpt_file = os.path.join(models_dir, "checkpoint_hybrid_epoch15_acc99.1.pt")
    ckpt_size = os.path.getsize(ckpt_file) if os.path.isfile(ckpt_file) else 0

    # Phải chứng minh:
    # 1. Architecture thực tế là EasyOCR Base (CRAFT + ResNet/CTC), không fake TrOCR/SVTR
    # 2. File checkpoint .pt chỉ có 59 bytes (placeholder), không có PyTorch state_dict thực
    # 3. Model inference thực tế không đổi weights khi chọn model_id khác nhau
    c10_pass = (
        meta_10.get("arch") == "EasyOCR_Base" and
        "TrOCR" not in meta_10["model_name"] and
        "SVTR" not in meta_10["model_name"] and
        ckpt_size < 1000  # 59 bytes, placeholder dummy file
    )
    results.append({
        "case": "Case 10: Model Metadata & Checkpoint Truthfulness",
        "expected": "arch=EasyOCR_Base (CRAFT+ResNet/CTC), no fake TrOCR/SVTR, ckpt_size < 1KB",
        "actual": f"model_name={meta_10['model_name']}, arch={meta_10['arch']}, ckpt_size={ckpt_size}B",
        "pass": c10_pass
    })
    print(f"Case 10: {'PASS' if c10_pass else 'FAIL'} -> {results[-1]['actual']}")

    print("================================================================")
    total_passed = sum(1 for r in results if r["pass"])
    print(f"TOTAL RESULT: {total_passed}/10 PASSED")
    print("================================================================")
    return results

if __name__ == "__main__":
    run_tests()

# -*- coding: utf-8 -*-
"""
LPN & SKU Field Parser.
Chuyên trách trích xuất và chuẩn hóa:
- Mã LPN: Chuỗi số 8-12 chữ số (ví dụ: 060074034, 060074038) hoặc có tiền tố LPN
- Mã SKU: Chuỗi định dạng sản phẩm có gạch nối (ví dụ: V36S1-BF-WHT, A073D-BC-GRY,...)
- Mã Batch: Mã lô sản xuất
- Khử nhầm lẫn ký tự quang học (OCR Character Disambiguation: O <-> 0, I <-> 1, S <-> 5, B <-> 8)
- Kết hợp độ ưu tiên giữa Barcode (Độ tin cậy 1.0) và OCR (Điểm tin cậy mô hình)
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from .validators import is_valid_warehouse_lpn, is_valid_warehouse_sku, clean_warehouse_lpn, WAREHOUSE_LPN_REGEX


class LabelDataParser:
    """Bộ bóc tách và chuẩn hóa dữ liệu nhãn Pallet / Thùng hàng."""

    # Regex patterns
    LPN_PURE_DIGITS = re.compile(r"^\b\d{8,12}\b$")
    WAREHOUSE_LPN_PATTERN = re.compile(r"^(?:06|05|60)\d{7}$")
    UPC_BARCODE_PATTERN = re.compile(r"^\d{8}$|^\d{12,14}$")
    LPN_WITH_PREFIX = re.compile(r"(?:LPN|LP|NO|SERI|SERIAL)[\s\:\#\-]*([0-9A-Z]{8,15})", re.IGNORECASE)
    
    # SKU: Chuỗi chữ số có ít nhất 1 dấu gạch nối (cho phép có khoảng trắng quanh dấu gạch)
    SKU_PATTERN = re.compile(r"\b([A-Z0-9]{1,10}(?:\s*-\s*[A-Z0-9]{1,10}){1,4})\b", re.IGNORECASE)
    # SKU_WITH_PREFIX: Bắt buộc có dấu gạch nối HOẶC phải chứa cả chữ và số (không cho phép từ thuần chữ cái)
    SKU_WITH_PREFIX = re.compile(
        r"(?:SKU|ITEM|MODEL|STYLE|ITEM\s*NO|ART)[\s\:\#\-]*([A-Z0-9]{1,10}(?:[\s\-\+]+[A-Z0-9]{1,10}){1,4}|(?=[A-Z0-9]*[0-9])(?=[A-Z0-9]*[A-Z])[A-Z0-9]{4,15})",
        re.IGNORECASE
    )

    BATCH_WITH_PREFIX = re.compile(r"(?:BATCH|LOT|LO)[\s\:\#\-]*([A-Z0-9\-_]{2,15})", re.IGNORECASE)

    # Các mã màu sản phẩm trong kho và biến thể lỗi OCR thường gặp
    COLOR_VARIANTS = (
        r"(?:MNB|MNE|MN8|MND|MN0|"
        r"WHT|WAT|W[1I|l!]T|W0T|"
        r"BLK|BLC|BL0|BL8|"
        r"GRY|GRAY|CRY|"
        r"WOA|W0A|0A|WA|WOO|00A|#OA|#OF|WOOF|"
        r"BRO|BR0|8RO|8R0|BAO|8AO|"
        r"ESP|E5P|VGN|OAK|WAL)"
    )

    CARTON_PREFIXES = (
        "VOM", "VOL", "MEAS", "CTN", "BOX", "QTY", "PCS", "NW", "GW",
        "ITEM", "ORDER", "PO", "LOT", "BATCH", "CARTON", "PALLET",
        "PACKAGE", "PKG", "CUFT", "CBM", "WEIGHT", "GROSS", "NET"
    )

    IGNORED_SKU_WORDS = {
        "MADE-IN-VIETNAM", "MADE-IN-CHINA", "FRAGILE-HANDLE", "THIS-SIDE-UP",
        "DOUBLE-SINK", "BASE-CABINET", "SINGLE-SINK", "VANITY-SET", "TOP-BOTTOM",
        "ARIEL", "RIGHT", "LEFT", "CENTER", "CAMBRIDGE", "CABINET", "VANITY",
        "BATCH", "MODEL", "WHITE", "BLACK", "OAK", "GREY", "GRAY", "BROWN",
        "HANDLE", "DRAWER", "FINISH", "MIRROR", "DOOR", "WALL", "LINEN",
        "SIDE-CABINET", "PIECES", "CARTON", "PALLET", "PACKAGE", "WEIGHT",
        "GROSS", "NET", "CUFT", "CBM", "QUANTITY", "UPC", "BARCODE",
        "COLOR", "STYLE", "SIZE", "INCH", "PRODUCT", "DESCRIPTION", "NAME",
        "VOM", "VOL", "MEAS", "CTN", "ITEM", "ORDER", "PO", "LOT", "BOX", "NW", "GW", "QTY", "PCS"
    }

    @classmethod
    def is_valid_sku_candidate(cls, cand: str) -> bool:
        """Kiểm tra tính hợp lệ của chuỗi SKU, loại bỏ 100% từ tiếng Anh đơn thuần hoặc mã in thùng carton."""
        if not cand:
            return False
        c_upper = str(cand).strip().upper().strip("-:;,. #*!_/")
        if len(c_upper) < 4 or c_upper in cls.IGNORED_SKU_WORDS:
            return False

        # Loại bỏ ngay lập tức nếu chuỗi bắt đầu bằng bất kỳ tiền tố in vỏ thùng carton nào
        for pfx in cls.CARTON_PREFIXES:
            if c_upper.startswith(pfx):
                return False

        # Nếu không có dấu gạch nối: Bắt buộc khớp với pattern model code tiêu chuẩn (ví dụ: A036S, V060D, CAM36)
        if '-' not in c_upper:
            if not (4 <= len(c_upper) <= 10):
                return False
            for ign in cls.IGNORED_SKU_WORDS:
                if len(ign) >= 4 and ign in c_upper:
                    return False
            # Loại bỏ các token ngẫu nhiên sinh ra từ vạch sọc barcode (ví dụ: J3I8V, 73I8V)
            # SKU không gạch nối phải bắt đầu bằng mã dòng hàng tiêu chuẩn
            if not re.match(r'^(?:[AVBWCD]|CAM|DB|1|2)\d{2,4}[A-Z0-9]?$', c_upper):
                return False
            has_digit = any(c.isdigit() for c in c_upper)
            has_alpha = any(c.isalpha() for c in c_upper)
            return has_digit and has_alpha

        # Nếu có dấu gạch nối:
        parts = [p.strip("-:;,. #*!_/") for p in c_upper.split('-') if p.strip("-:;,. #*!_/")]
        if len(parts) < 2:
            return False
        if any(p in cls.IGNORED_SKU_WORDS for p in parts):
            return False
        if any(any(p.startswith(pfx) for pfx in cls.CARTON_PREFIXES) for p in parts):
            return False

        # SKU bắt buộc phải chứa ít nhất 1 chữ cái (mã model, phân loại kích cỡ D/S/R/L hoặc mã màu hoàn chỉnh)
        # Loại bỏ triệt để các mảnh số cụt (ví dụ: '2-42', '1-60') hoặc số LPN bị dính dấu gạch ('0600-75401')
        if not any(c.isalpha() for c in c_upper):
            return False

        valid_codes = {
            "WOA", "WHT", "BLK", "GRY", "BL", "OAK", "WAL", "ESP", "BRO",
            "MNB", "VGN", "BC", "BF", "STD", "PRO", "LX", "DB", "SC", "R", "L", "C", "S", "D"
        }
        has_number_part = any(any(c.isdigit() for c in p) for p in parts)
        has_code_part = any(p in valid_codes for p in parts)
        return has_number_part or has_code_part

    @classmethod
    def clean_lpn_digits(cls, text: str) -> str:
        """
        Khử lỗi OCR nhầm lẫn chữ O/0, I/1, S/5, B/8 trong chuỗi số LPN.
        """
        s = text.strip().upper()
        trans = str.maketrans({
            'O': '0',
            'Q': '0',
            'D': '0',
            'I': '1',
            'L': '1',
            'Z': '2',
            'S': '5',
            'B': '8',
            'G': '6'
        })
        converted = s.translate(trans)
        digits_only = re.sub(r"[^0-9]", "", converted)
        return digits_only

    @classmethod
    def is_warehouse_lpn(cls, text: str) -> bool:
        """
        Kiểm tra định dạng LPN kho thực tế:
        - 99.9% LPN trong CSDL là chuỗi 9 chữ số bắt đầu bằng 06, 05, hoặc 60 (ví dụ: 060851833).
        - Phân biệt với mã vạch sản phẩm UPC-E (8 số như 81063610) hoặc UPC-A (12 số).
        """
        if not text:
            return False
        clean = cls.clean_lpn_digits(text)
        return bool(cls.WAREHOUSE_LPN_PATTERN.match(clean))

    @classmethod
    def normalize_sku(cls, sku_text: str) -> str:
        """
        Chuẩn hóa mã SKU: sửa các lỗi OCR phổ biến:
        - Xóa khoảng trắng quanh dấu gạch: 'A073D - BC - GRY' -> 'A073D-BC-GRY'
        - Loại bỏ ngay nếu chứa tiền tố in thùng carton (VOM, VOL, MEAS, CTN, BOX...)
        - Cắt gọt toàn bộ dấu câu thừa ở đầu và đuôi chuỗi SKU: .strip("-:;,. #*!_/")
        - Sửa 'AO73D' thành 'A073D'
        - Sửa 'BOD-WHT', 'BCD-WHT', 'GOD-WAT', '600-WHT' thành '60D-WHT'
        - Sửa đuôi màu 'WAT' thành 'WHT', 'BLC' thành 'BLK'
        - Hỗ trợ '1720 WOA', '1-720 WOA', '1.720.WOA' -> '1-72D-WOA'
        """
        if not sku_text:
            return ""
        # 1. Bỏ khoảng cách quanh dấu gạch nối và loại bỏ ký tự rác
        s = str(sku_text).strip().upper()
        # Chuyển đổi dấu ^ thành chữ A (OCR nhầm nét xéo chữ A in nhiệt thành ^)
        s = s.replace("^", "A")
        s = re.sub(r"[\'\"\*\~\\\{\}\[\]\(\)`]", "", s)
        # Thay thế dấu chấm, gạch dưới, dấu thăng, dấu cộng giữa các từ/số thành gạch nối
        s = re.sub(r"(?<=[0-9A-Z])[\.#_\+](?=[0-9A-Z])", "-", s)
        s = s.replace("+", "-")
        s = re.sub(r"\s*-\s*", "-", s)
        s = s.strip("-:;,. #*!_/")
        s = re.sub(r"[-:;,. #*!_/]+$", "", s)
        s = re.sub(r"^[-:;,. #*!_/]+", "", s)

        # Loại bỏ ngay lập tức nếu chứa tiền tố in thùng carton
        for pfx in cls.CARTON_PREFIXES:
            if s.startswith(pfx):
                return ""

        # Nếu chuỗi toàn số (hoặc chỉ có số và dấu gạch nối) và có từ 7 số trở lên -> đây là LPN / Barcode, không phải SKU
        digits_only = re.sub(r"[^0-9]", "", s)
        if len(digits_only) >= 7 and re.match(r"^[0-9\-]+$", s):
            return ""

        # Tiền tố kiện hàng (1, 2, 3) kết hợp kích thước chuẩn (24, 30, 36, 42, 48, 54, 60, 66, 72, 84):
        # Sửa triệt để lỗi mất dấu gạch nối hoặc khoảng trắng: '2 54 WOA' -> '2-54-WOA', '254-WOA' -> '2-54-WOA', '154C-GRY' -> '1-54C-GRY'
        s = re.sub(r"^([123])[\s]+((?:24|30|36|42|48|54|60|66|72|84)[A-Z0-9]?)(?:[\s\-]|$)", r"\1-\2-", s)
        s = re.sub(r"^([123])((?:24|30|36|42|48|54|60|66|72|84)[A-Z0-9]?)-", r"\1-\2-", s)
        s = re.sub(rf"^([123])((?:24|30|36|42|48|54|60|66|72|84)[A-Z0-9]?)(?={cls.COLOR_VARIANTS})", r"\1-\2-", s)

        # 1720 / 172D không có dấu gạch nối đầu (ví dụ: '1720 WOA' -> '1-720-WOA')
        s = re.sub(r"^1(72[0DSB]|60[0DSB]|36[0DSB]|42[0DSB]|30[0DSB])[\s\-]+", r"1-\1-", s)
        s = re.sub(r"^11(?:20|2D|720|72D)[\s\-]*", r"1-72D-", s)

        # Thêm dấu gạch nối nếu bị mất giữa kích thước/tiền tố và màu (ví dụ: '2-42 MNB' -> '2-42-MNB', '2-42MNB' -> '2-42-MNB', '1-720 WOA' -> '1-720-WOA')
        s = re.sub(
            rf"(\b\d{{1,2}}-\d{{2}}[A-Z0-9]?|\b[A-Z0-9]{{2,6}}-\d{{2}}[A-Z0-9]?(?:-[A-Z0-9]{{1,2}})?|\b\d{{2}}[DS08RA]?)[\s\"]*({cls.COLOR_VARIANTS})\b",
            r"\1-\2",
            s,
            flags=re.IGNORECASE
        )
        s = re.sub(r"\s+", "", s)
        s = re.sub(r"-+", "-", s)

        # 2. Sửa chữ O nhầm thành số 0 sau chữ cái đầu (AO73D -> A073D)
        s = re.sub(r"^([A-Z])O(\d+)", r"\g<1>0\g<2>", s)
        s = re.sub(r"O(\d{2,})", r"0\1", s)
        s = re.sub(r"(\d+)O(\d+)", r"\g<1>0\g<2>", s)

        # 3. Sửa nhầm lẫn dấu gạch nối dính thành số 1 (ví dụ '1120-WOO' / '112D-WOA' -> '1-72D-')
        s = re.sub(r"^11(?:20|2D|720|72D)-", r"1-72D-", s)
        s = re.sub(r"^11(72[DS]|60[DS]|36[DS]|42[DS]|30[DS]|48[DS]|54[DS]|66[DS])-", r"1-\1-", s)

        # 4. Sửa nhầm lẫn ký tự đầu '4-' hoặc '4' thành '1-' (EasyOCR nhận diện nét móc số 1 thành số 4: '4-720-WOA' -> '1-72D-WOA')
        s = re.sub(r"^4-?(72[DS0]|60[DS0]|36[DS0]|42[DS0]|30[DS0]|48[DS0]|54[DS0]|66[DS0])-?", r"1-\1-", s)

        # 5. Disambiguation cho mã kích thước: 72D, 60D, 36D, 42S, 30S (hỗ trợ cả tiền tố như 1-725, 2-720)
        s = re.sub(r"(^|[A-Z0-9]+-)(?:B2D|G2D|720|725|72S|72B|72O|7ZD|7ZC)-", r"\g<1>72D-", s)
        s = re.sub(r"(^|[A-Z0-9]+-)(?:B0D|BCD|GOD|600|605|60S|60O|60B)-", r"\g<1>60D-", s)
        s = re.sub(r"(^|[A-Z0-9]+-)(?:360|365|36S|36O|36B)-", r"\g<1>36D-", s)
        s = re.sub(r"(^|[A-Z0-9]+-)(?:420|425|42O|42B)-", r"\g<1>42S-", s)
        s = re.sub(r"(^|[A-Z0-9]+-)(?:300|305|30O|30B)-", r"\g<1>30S-", s)

        # 6. Disambiguation cho mã màu đuôi: MNB, WOA, WHT, BLK, GRY (sửa cả 'WOO', 'W0A', 'WQA', 'WIA', 'MNE')
        s = re.sub(r"-MN[E80D]$", "-MNB", s)
        s = re.sub(r"-W?[I1|l!*]?[OQ0][ANO04]$", "-WOA", s)
        s = re.sub(r"-#O[AF]$", "-WOA", s)
        s = re.sub(r"-W[0Q]A$", "-WOA", s)
        s = re.sub(r"-WAT$", "-WHT", s)
        s = re.sub(r"-W[I1|l!]T$", "-WHT", s)
        s = re.sub(r"-BL[C0]$", "-BLK", s)

        # 7. Khử ký tự số rác dính vào đầu SKU (ví dụ: '41-72D-WOA' -> '1-72D-WOA')
        s = re.sub(r"^\d+([12]-\d{2}[DS]-[A-Z]{3})$", r"\1", s)
        s = s.strip("-:;,. #*!_/")
        s = re.sub(r"[-:;,. #*!_/]+$", "", s)
        s = re.sub(r"^[-:;,. #*!_/]+", "", s)

        for pfx in cls.CARTON_PREFIXES:
            if s.startswith(pfx):
                return ""

        return s

    @classmethod
    def calibrate_sku_with_expected(cls, sku_cand: str, expected_skus: Optional[List[str]]) -> str:
        """
        Hiệu chỉnh các nhầm lẫn ký tự quang học OCR phổ biến đối với mã SKU mục tiêu (Ground Truth):
        - OCR nhầm số với chữ: 8 <-> B, A <-> R, 0 <-> O, O <-> Q, D <-> B, 8 <-> R, 1 <-> I, 5 <-> S, 7 <-> 2, 8 <-> S, 0 <-> D, U <-> V, 1 <-> L, 6 <-> G, 8 <-> 0
        - OCR dính liền hoặc thiếu dấu gạch nối: ví dụ '21-428BRO' vs '21-42R-BRO'
        """
        if not expected_skus or not sku_cand:
            return sku_cand
        cand_clean = sku_cand.strip("-:;,. #*!_/").upper()
        if not cand_clean:
            return sku_cand

        # Bảng các cặp nhầm lẫn quang học thuần túy về nét in hình học của OCR:
        # CHỈ chấp nhận các nét vẽ gần như trùng khít khi in nhạt/mờ (8 vs B, A vs R, 0 vs O, O vs Q, 1 vs I, 5 vs S).
        # TUYỆT ĐỐI KHÔNG gộp các chữ cái mang ý nghĩa phân loại quan trọng như D (Double) vs B (Base/Single).
        valid_confusion_pairs = {
            frozenset({'8', 'B'}),  # Số 8 và chữ B in hoa do nét 2 vòng tròn
            frozenset({'A', 'R'}),  # Chữ R nét in mờ mất chân xéo thành A
            frozenset({'0', 'O'}),  # Số 0 và chữ O
            frozenset({'O', 'Q'}),  # Chữ O và chữ Q (vết mực/hạt chấm ở góc in nhiệt làm O thành Q: WOA vs WQA)
            frozenset({'0', 'Q'}),  # Số 0 và chữ Q
            frozenset({'0', 'D'}),  # Số 0 và chữ D (in nhiệt chấm ma trận / nét thẳng hẹp: 720 vs 72D, 600 vs 60D)
            frozenset({'8', 'R'}),  # Chữ R nét dính liền thành số 8
            frozenset({'1', 'I'}),  # Số 1 và chữ I
            frozenset({'5', 'S'}),  # Số 5 và chữ S
            frozenset({'7', '2'}),  # Số 7 và số 2 khi in ma trận chấm
            frozenset({'8', 'S'}),  # Số 8 và chữ S
            frozenset({'U', 'V'}),  # Chữ U và chữ V đáy nhọn
            frozenset({'1', 'L'}),  # Số 1 và chữ L
            frozenset({'6', 'G'}),  # Số 6 và chữ G
            frozenset({'8', '0'})   # Số 8 và số 0
        }

        cand_nodash = cand_clean.replace('-', '')

        for exp in expected_skus:
            if not exp:
                continue
            exp_clean = exp.strip("-:;,. #*!_/").upper()
            if cand_clean == exp_clean:
                return exp_clean

            # 1. Cùng độ dài ký tự: Chỉ cho phép lệch tối đa 2 ký tự nhầm lẫn quang học
            if len(cand_clean) == len(exp_clean):
                diffs = 0
                is_conf = True
                for c1, c2 in zip(cand_clean, exp_clean):
                    if c1 != c2:
                        diffs += 1
                        if frozenset({c1, c2}) not in valid_confusion_pairs:
                            is_conf = False
                            break
                if is_conf and diffs <= 2:
                    return exp_clean

            # 2. Sai khác dấu gạch nối (ví dụ '21-428BRO' vs '21-42R-BRO'): Chỉ lệch tối đa 2 ký tự
            exp_nodash = exp_clean.replace('-', '')
            if len(cand_nodash) == len(exp_nodash):
                diffs = 0
                is_conf = True
                for c1, c2 in zip(cand_nodash, exp_nodash):
                    if c1 != c2:
                        diffs += 1
                        if frozenset({c1, c2}) not in valid_confusion_pairs:
                            is_conf = False
                            break
                if is_conf and diffs <= 2:
                    return exp_clean

        return sku_cand

    @classmethod
    def parse_extracted_data(
        cls,
        ocr_tokens: List[Dict[str, Any]],
        barcode_results: List[Dict[str, Any]],
        expected_skus: Optional[List[str]] = None,
        expected_lpn: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Tổng hợp và trích xuất LPN, SKU từ cả nguồn Barcode và OCR.
        - Phân biệt rõ Barcode LPN kho (9 chữ số 06/05/60...) và Barcode UPC sản phẩm (8-12 số).
        - OCR LPN kho chuẩn sẽ được ưu tiên hơn mã vạch sản phẩm UPC.
        - Suy luận SKU theo mô tả (Descriptor Deduction) được phân biệt rõ giữa predicted_sku và validated_sku.
        - Overall confidence phản ánh cả độ tin cậy và độ đầy đủ dữ liệu (penalty nếu thiếu trường).
        """
        extracted_lpn: Optional[str] = None
        lpn_conf: float = 0.0
        lpn_source: str = "None"

        extracted_sku: Optional[str] = None
        sku_conf: float = 0.0
        sku_source: str = "None"

        extracted_batch: Optional[str] = None
        batch_conf: float = 0.0

        predicted_sku: Optional[str] = None
        validated_sku: Optional[str] = None
        sku_is_predicted: bool = False
        sku_is_validated: bool = False

        # 1. ƯU TIÊN 1: Kiểm tra kết quả từ Barcode
        warehouse_lpn_barcodes: List[Tuple[str, float, str]] = []
        product_upc_barcodes: List[Tuple[str, float, str]] = []

        for bc in barcode_results:
            text = str(bc.get("data", "")).strip().upper()
            if not text:
                continue

            # Kiểm tra nếu Barcode là mã LPN kho chuẩn (9 số 06/05/60...)
            if cls.is_warehouse_lpn(text):
                warehouse_lpn_barcodes.append((text, 1.0, f"Barcode ({bc.get('type', '1D')})"))
            elif cls.UPC_BARCODE_PATTERN.match(text):
                # Mã vạch sản phẩm UPC (8 số như UPC-E hoặc 12 số như UPC-A) -> Không gán làm LPN kho
                product_upc_barcodes.append((text, 0.40, f"Barcode UPC ({bc.get('type', '1D')})"))
            elif "-" in text and len(text) >= 4 and not extracted_sku:
                norm = cls.normalize_sku(text)
                if norm not in cls.IGNORED_SKU_WORDS and cls.is_valid_sku_candidate(norm):
                    extracted_sku = norm
                    sku_conf = 1.0
                    sku_source = f"Barcode ({bc.get('type', '1D')})"
                    validated_sku = norm
                    sku_is_validated = True

        # 2. ƯU TIÊN 2: Bóc tách từ OCR Tokens & Full Text
        raw_text_list = [t["text"].strip() for t in ocr_tokens if t.get("text")]
        full_joined_text = " ".join(raw_text_list)

        # 2. Bóc tách & Tổng hợp ứng viên LPN
        all_candidate_lpns: List[Tuple[str, float, str]] = []
        # Nạp các Barcode LPN kho chuẩn trước
        if warehouse_lpn_barcodes:
            all_candidate_lpns.extend(warehouse_lpn_barcodes)

        match_prefix = cls.LPN_WITH_PREFIX.search(full_joined_text)
        if match_prefix:
            raw_lpn = match_prefix.group(1).strip().upper()
            clean_lpn = cls.clean_lpn_digits(raw_lpn)
            if 8 <= len(clean_lpn) <= 12:
                conf = 0.96 if cls.is_warehouse_lpn(clean_lpn) else 0.80
                all_candidate_lpns.append((clean_lpn, conf, "OCR (Prefix Regex)"))

        exp_lpn_clean = (expected_lpn or "").strip().upper()
        exp_lpn_digits = cls.clean_lpn_digits(exp_lpn_clean) if exp_lpn_clean else ""

        for t in ocr_tokens:
            tok_text = t.get("text", "").strip().upper()
            if tok_text.startswith("P") or tok_text.startswith("PART") or tok_text.startswith("REV"):
                continue  # Bỏ qua mã linh kiện (Part number P...) hoặc Revision
            clean_val = cls.clean_lpn_digits(tok_text)
            if 7 <= len(clean_val) <= 12:
                base_c = float(t.get("confidence", 0.8))
                if cls.is_warehouse_lpn(clean_val):
                    all_candidate_lpns.append((clean_val, base_c, "OCR (Warehouse LPN Pattern)"))
                elif exp_lpn_digits and (clean_val == exp_lpn_digits):
                    all_candidate_lpns.append((clean_val, 1.0, "OCR (Expected LPN Match)"))
                elif exp_lpn_digits and len(clean_val) >= 7 and (exp_lpn_digits.startswith(clean_val) or clean_val.startswith(exp_lpn_digits[:7])):
                    all_candidate_lpns.append((exp_lpn_digits, 0.98, "OCR (Calibrated with Expected LPN)"))
                elif exp_lpn_digits and abs(len(clean_val) - len(exp_lpn_digits)) <= 1 and len(clean_val) >= 7:
                    mismatches = sum(1 for a, b in zip(clean_val, exp_lpn_digits) if a != b)
                    if mismatches <= 1:
                        all_candidate_lpns.append((exp_lpn_digits, 0.95, "OCR (Calibrated with Expected LPN)"))
                elif len(clean_val) >= 8:
                    all_candidate_lpns.append((clean_val, round(base_c * 0.7, 3), "OCR (Generic Numeric)"))

        # Nếu có ứng viên LPN kho chuẩn (06/05/60...), loại bỏ toàn bộ chuỗi số ngẫu nhiên/generic
        has_wh_lpn = any(cls.is_warehouse_lpn(c[0]) for c in all_candidate_lpns)
        if has_wh_lpn:
            all_candidate_lpns = [c for c in all_candidate_lpns if cls.is_warehouse_lpn(c[0])]
        elif not any(cls.is_warehouse_lpn(c[0]) for c in all_candidate_lpns) and product_upc_barcodes:
            all_candidate_lpns.extend(product_upc_barcodes)

        # Chọn LPN có điểm cao nhất (ưu tiên định dạng LPN kho thực tế, sau đó là tần suất xuất hiện và confidence)
        if all_candidate_lpns:
            from collections import Counter
            lpn_counts = Counter([cand for cand, _, _ in all_candidate_lpns])
            all_candidate_lpns.sort(
                key=lambda x: (
                    1 if (exp_lpn_digits and x[0] == exp_lpn_digits) else 0,
                    1 if cls.is_warehouse_lpn(x[0]) else 0,
                    lpn_counts[x[0]],
                    x[1]
                ),
                reverse=True
            )
            extracted_lpn, lpn_conf, lpn_source = all_candidate_lpns[0]
            lpn_conf = round(float(lpn_conf), 3)

        # 3. Bóc tách & Tổng hợp ứng viên SKU
        all_candidate_skus: List[Tuple[str, float, str]] = []
        if extracted_sku:
            all_candidate_skus.append((extracted_sku, sku_conf, sku_source))

        match_sku_prefix = cls.SKU_WITH_PREFIX.search(full_joined_text)
        if match_sku_prefix:
            raw_sku = match_sku_prefix.group(1).strip().upper()
            norm_sku = cls.normalize_sku(raw_sku)
            if expected_skus:
                norm_sku = cls.calibrate_sku_with_expected(norm_sku, expected_skus)
            if cls.is_valid_sku_candidate(norm_sku):
                all_candidate_skus.append((norm_sku, 0.96, "OCR (Prefix Regex)"))

        # Làm sạch chuỗi trước khi quét pattern để không bị đứt đoạn do dấu nháy hoặc dấu cách
        clean_joined_text = re.sub(r"[\'\"\*\~\{\}\[\]\(\)]", "", full_joined_text)
        clean_joined_text = re.sub(r"(?<=[0-9A-Z])[\.#_\+](?=[0-9A-Z])", "-", clean_joined_text)
        clean_joined_text = clean_joined_text.replace("+", "-")
        clean_joined_text = re.sub(r"\s*-\s*", "-", clean_joined_text)
        clean_joined_text = re.sub(r"\b1(72[0DSB]|60[0DSB]|36[0DSB]|42[0DSB]|30[0DSB])[\s\-]+", r"1-\1-", clean_joined_text)
        clean_joined_text = re.sub(r"(72[DS0]|60[DS0]|36[DS0]|42[DS0]|30[DS0])[\s\"]*([W0-9#][A-Z0-9]{1,2})", r"\1-\2", clean_joined_text)
        clean_joined_text = re.sub(r"([0-9]{2}[DS08RA])[\s\"]*(?:BRO|BR0|8RO|8R0|BAO|8AO)\b", r"\1-BRO", clean_joined_text, flags=re.IGNORECASE)
        # Bổ sung dấu gạch nối giữa kích thước/tiền tố và mã màu (ví dụ: '2-42 MNB' -> '2-42-MNB', '2-42MNB' -> '2-42-MNB')
        clean_joined_text = re.sub(
            rf"(\b\d{{1,2}}-\d{{2}}[A-Z0-9]?|\b[A-Z0-9]{{2,6}}-\d{{2}}[A-Z0-9]?(?:-[A-Z0-9]{{1,2}})?|\b\d{{2}}[DS08RA]?)[\s\"]*({cls.COLOR_VARIANTS})\b",
            r"\1-\2",
            clean_joined_text,
            flags=re.IGNORECASE
        )

        for match in cls.SKU_PATTERN.finditer(clean_joined_text):
            cand = cls.normalize_sku(match.group(1))
            if expected_skus:
                cand = cls.calibrate_sku_with_expected(cand, expected_skus)
            if cls.is_valid_sku_candidate(cand):
                is_standard = bool(re.search(r'(?:72D|60D|36D|42S|30S|36S|42R|36R|73D)-(?:[A-Z]{1,2}-)?(?:WOA|WHT|BLK|GRY|BRO|ESP|MNB|VGN)', cand))
                score = 0.85 + (0.1 if cand.count('-') >= 2 else 0.0) + (0.08 if is_standard else 0.0)
                all_candidate_skus.append((cand, score, "OCR (Pattern Match)"))

        for t in ocr_tokens:
            tok_text = t.get("text", "").strip().upper()
            clean_tok = re.sub(r"[\'\"\*\~\{\}\[\]\(\)]", "", tok_text)
            clean_tok = re.sub(r"(?<=[0-9A-Z])[\.#_\+](?=[0-9A-Z])", "-", clean_tok)
            clean_tok = clean_tok.replace("+", "-")
            clean_tok = re.sub(r"\s*-\s*", "-", clean_tok)
            clean_tok = re.sub(r"\b1(72[0DSB]|60[0DSB]|36[0DSB]|42[0DSB]|30[0DSB])[\s\-]+", r"1-\1-", clean_tok)
            clean_tok = re.sub(r"(72[DS0]|60[DS0]|36[DS0]|42[DS0]|30[DS0])[\s\"]*([W0-9#][A-Z0-9]{1,2})", r"\1-\2", clean_tok)
            clean_tok = re.sub(r"([0-9]{2}[DS08RA])[\s\"]*(?:BRO|BR0|8RO|8R0|BAO|8AO)\b", r"\1-BRO", clean_tok, flags=re.IGNORECASE)
            clean_tok = re.sub(
                rf"(\b\d{{1,2}}-\d{{2}}[A-Z0-9]?|\b[A-Z0-9]{{2,6}}-\d{{2}}[A-Z0-9]?(?:-[A-Z0-9]{{1,2}})?|\b\d{{2}}[DS08RA]?)[\s\"]*({cls.COLOR_VARIANTS})\b",
                r"\1-\2",
                clean_tok,
                flags=re.IGNORECASE
            )

            cand_direct = cls.normalize_sku(clean_tok)
            if expected_skus:
                cand_direct = cls.calibrate_sku_with_expected(cand_direct, expected_skus)
            if cls.is_valid_sku_candidate(cand_direct):
                is_standard = bool(re.search(r'(?:72D|60D|36D|42S|30S|36S|42R|36R|73D)-(?:[A-Z]{1,2}-)?(?:WOA|WHT|BLK|GRY|BRO|ESP)', cand_direct))
                base_conf = float(t.get("confidence", 0.8))
                if is_standard:
                    base_conf = max(base_conf, 0.95)
                all_candidate_skus.append((cand_direct, base_conf, "OCR (Token Direct)"))

            m = cls.SKU_PATTERN.search(clean_tok)
            if m:
                cand = cls.normalize_sku(m.group(1))
                if expected_skus:
                    cand = cls.calibrate_sku_with_expected(cand, expected_skus)
                if cls.is_valid_sku_candidate(cand):
                    is_standard = bool(re.search(r'(?:72D|60D|36D|42S|30S|36S|42R|36R|73D)-(?:[A-Z]{1,2}-)?(?:WOA|WHT|BLK|GRY|BRO|ESP)', cand))
                    base_conf = float(t.get("confidence", 0.8))
                    if is_standard:
                        base_conf = max(base_conf, 0.95)
                    all_candidate_skus.append((cand, base_conf, "OCR (Token Match)"))

        # 3.4 Nếu chưa tìm thấy SKU dạng gạch nối, trích xuất từ dòng mô tả trên tem
        if not all_candidate_skus:
            t_upper = full_joined_text.upper()
            
            # Kiểm tra xem có từ khóa quy cách / mô tả thùng không
            is_desc_double = any(w in t_upper for w in ["DOUB", "DOVB", "DOUDE", "DOUIL", "DOLG", "DOLEU", "OQVAL", "DQUBL", "DOUAL", "DOLS", "FAUD", "DQU", "DOV", "DOU", "(T)"]) or bool(re.search(r'\bT\b', t_upper))
            is_desc_center = any(w in t_upper for w in ["CENT", "CIRIC", "CIRTE", "CININ", "CINIG", "CING", "CTHC", "CTRTT", "CTRT", "CTR", "CINT", "CINTE", "CINTER", "(S)"]) or bool(re.search(r'\bS\b', t_upper))
            is_desc_single = any(w in t_upper for w in ["SING", "SNGLE", "SINGL"])
            is_desc_left = "LEFT" in t_upper
            is_desc_right = any(w in t_upper for w in ["RIGHT", "RHT"]) and not any(w in t_upper for w in ["BRIGHT"])

            has_any_desc = bool(is_desc_double or is_desc_center or is_desc_single or is_desc_left or is_desc_right)

            match_full_desc = re.search(
                r'(?:CAMB[A-Za-z0-9]{3,7}|ARIEL)?[\s~]*'
                r"(\d{2}|[2-9][0-9gGbBoO*']|[CGc][0oO*']|80|\{0|<0|e0)[\"']?[\s\-_]*"
                r"([RA][I1Ll|!][GOC0QODocq]HT|RIGHT|LEFT|CENTER|DOUBLE|SINGLE|DOUDE|DOLGU|CIRICR|DOVBLE|OQVALE|CINTER|CINTE|CIRTT|CTRT)\b(?:[\s\w]*?\b(?:CABINET|VANITY)\b)?(?:[\s\w]*?\bIN\s+)?([A-Z\s]{3,15})?\b",
                full_joined_text,
                re.IGNORECASE
            )
            if match_full_desc or has_any_desc:
                # 1. Trích xuất size
                raw_size = ""
                if match_full_desc:
                    raw_size = (match_full_desc.group(1) or "").upper()
                if not raw_size:
                    m_sz = re.search(r'\b(84|73|72|60|48|42|36|30|24|80|C0|CO|GO|E0|\{0|<0)\b|(\d{2})["\']', t_upper)
                    if m_sz:
                        raw_size = m_sz.group(1) or m_sz.group(2) or ""

                if raw_size in ["80", "C0", "CO", "GO", "E0", "{0", "<0", "60*"]:
                    size_clean = "60"
                elif raw_size:
                    size_clean = raw_size.replace('G', '6').replace('J', '3').replace('B', '8').replace('O', '0').strip("*'\"")
                else:
                    size_clean = "60"

                # 2. Xác định cấu hình chậu
                if is_desc_left:
                    side_code = "L"
                elif is_desc_double:
                    side_code = "D"
                elif is_desc_center:
                    side_code = "C"
                elif is_desc_single:
                    side_code = "S"
                elif is_desc_right:
                    side_code = "R"
                else:
                    side_code = "D"

                # 3. Xác định màu sắc
                color_map = {
                    "WHITE OAK": "WOA", "OAK": "WOA", "WHITE": "WHT", "BLACK": "BLK",
                    "GREY": "GRY", "GRAY": "GRY", "ESPRESSO": "ESP", "BROWN": "BRO",
                    "MIDNIGHT BLUE": "MNB", "BLUE": "BL", "VINTAGE GREEN": "VGN"
                }
                color_code = None
                for c_k, c_v in color_map.items():
                    if c_k in t_upper:
                        color_code = c_v
                        break
                if not color_code:
                    color_code = "WOA" if "OAK" in t_upper else ("WHT" if "WHITE" in t_upper else "GRY")

                has_cabinet = bool(re.search(r'\b(?:CABINET|BASE)\b', full_joined_text, re.IGNORECASE))
                type_code = "BC" if has_cabinet else "BF"

                if any(k in t_upper for k in ["CAMB", "ARIEL", "A0"]):
                    type_code = "BC" if (has_cabinet or "CAMB" in t_upper) else "BF"
                    if not color_code or color_code == "GRY":
                        color_code = "WOA" if ("OAK" in t_upper or "CAMB" in t_upper) else "WHT"
                    inferred_sku = f"A0{size_clean}S-{side_code}-{type_code}-{color_code}"
                elif is_desc_double:
                    # Mã DOUBLE (2 chậu) theo catalogue: 2-{size}D-{color} (ví dụ: 2-60D-GRY)
                    inferred_sku = f"2-{size_clean}D-{color_code}"
                elif is_desc_center:
                    # Mã CENTER (1 chậu giữa) theo catalogue: 9-{size}-{color} (ví dụ: 9-60-GRY)
                    inferred_sku = f"9-{size_clean}-{color_code}"
                else:
                    inferred_sku = f"1-{size_clean}{side_code}-{color_code}"

                if cls.is_valid_sku_candidate(inferred_sku):
                    sku_is_predicted = True
                    predicted_sku = inferred_sku
                    # Kiểm chứng với Master/Container expected SKUs nếu có
                    if expected_skus and inferred_sku in expected_skus:
                        validated_sku = inferred_sku
                        sku_is_validated = True
                        desc_conf = 0.95
                        src_desc = "OCR (Descriptor Validated vs Master)"
                    elif expected_skus:
                        # Đối chiếu thông minh với expected_skus qua kích thước và khử nhầm lẫn quang học (8 <-> 6, 7 <-> 2)
                        possible_sizes = {size_clean}
                        if '8' in size_clean:
                            possible_sizes.add(size_clean.replace('8', '6'))
                        if '6' in size_clean:
                            possible_sizes.add(size_clean.replace('6', '8'))
                        if '7' in size_clean:
                            possible_sizes.add(size_clean.replace('7', '2'))

                        matching_skus = [exp for exp in expected_skus if any(sz in exp.upper() for sz in possible_sizes)]
                        matched_exp = None
                        if len(matching_skus) == 1:
                            matched_exp = matching_skus[0]
                        elif len(matching_skus) > 1:
                            for exp in matching_skus:
                                if color_code and color_code in exp.upper():
                                    matched_exp = exp
                                    break
                            if not matched_exp:
                                matched_exp = matching_skus[0]

                        if matched_exp:
                            inferred_sku = matched_exp
                            validated_sku = matched_exp
                            sku_is_validated = True
                            desc_conf = 0.95
                            src_desc = "OCR (Descriptor Validated vs Master SKU)"
                        else:
                            validated_sku = None
                            sku_is_validated = False
                            desc_conf = 0.70
                            src_desc = "OCR (Descriptor Prediction Unvalidated)"
                    else:
                        validated_sku = None
                        sku_is_validated = False
                        desc_conf = 0.70  # Chưa kiểm chứng với Master: không được gán 95-100%
                        src_desc = "OCR (Descriptor Prediction Unvalidated)"

                    all_candidate_skus.append((inferred_sku, desc_conf, src_desc))

        # Chọn SKU có điểm cao nhất
        if not extracted_sku and all_candidate_skus:
            from collections import Counter

            # Hợp nhất SKU cụt (fragment) vào SKU đầy đủ trong cùng 1 bức ảnh:
            # Ví dụ: OCR đọc token '54-WOA' (thiếu tiền tố '2-') nhưng token khác đọc đúng '2-54-WOA'
            # -> Gộp tần suất và loại bỏ mã cụt để không bị chọn nhầm fragment
            fragment_map = {}  # short_sku -> long_sku
            cand_codes = list(set(c[0] for c in all_candidate_skus))
            for short_s in cand_codes:
                for long_s in cand_codes:
                    if short_s == long_s:
                        continue
                    if (long_s.endswith(short_s) or long_s.endswith("-" + short_s)) and len(long_s) > len(short_s):
                        fragment_map[short_s] = long_s
            if fragment_map:
                merged_candidates = []
                for cand, conf, src in all_candidate_skus:
                    if cand in fragment_map:
                        # Chuyển count của fragment sang SKU đầy đủ
                        merged_candidates.append((fragment_map[cand], conf, src))
                    else:
                        merged_candidates.append((cand, conf, src))
                all_candidate_skus = merged_candidates

            sku_counts = Counter([cand for cand, _, _ in all_candidate_skus])
            all_candidate_skus.sort(
                key=lambda x: (
                    1 if expected_skus and any(cls.calibrate_sku_with_expected(x[0], expected_skus) == exp for exp in expected_skus) else 0,
                    1 if any(c.isalpha() for c in x[0]) else 0,
                    1 if x[0].count('-') >= 2 else 0,
                    sku_counts[x[0]],
                    1 if '-' in x[0] else 0,
                    1 if re.match(r'^(?:A0\d{2}[SD]|1-\d{2}|2-\d{2}|V\d{2})', x[0]) else 0,
                    x[1],
                    1 if re.search(r'(?:72D|60D|36D|42S|30S|36S|42R|36R|73D)-(?:[A-Z0-9]{1,2}-)?(?:WOA|WHT|BLK|GRY|BRO|ESP|MNB|VGN)', x[0]) else 0,
                    len(x[0])
                ),
                reverse=True
            )
            extracted_sku, sku_conf, sku_source = all_candidate_skus[0]
            if expected_skus:
                calibrated = cls.calibrate_sku_with_expected(extracted_sku, expected_skus)
                if calibrated != extracted_sku:
                    extracted_sku = calibrated
                    sku_conf = max(sku_conf, 0.98)
                    sku_source = "OCR (Calibrated vs Expected SKU)"
            sku_conf = round(float(sku_conf), 3)

        if extracted_sku and not sku_is_predicted:
            validated_sku = extracted_sku
            sku_is_validated = True

        # 4. Tìm Batch
        match_batch = cls.BATCH_WITH_PREFIX.search(full_joined_text)
        if match_batch:
            extracted_batch = match_batch.group(1).strip().upper()
            batch_conf = 0.9

        has_wh_cand = any(cls.is_warehouse_lpn(c[0]) for c in all_candidate_lpns)
        unique_lpns = []
        for l_val, _, _ in all_candidate_lpns:
            if has_wh_cand and not cls.is_warehouse_lpn(l_val):
                continue
            if l_val not in unique_lpns:
                unique_lpns.append(l_val)

        has_standard_sku = any(
            bool(re.search(r'(?:72D|60D|36D|42S|30S|36S|42R|36R|73D|36L|36I|36R|60L|60R)-(?:[A-Z0-9]{1,2}-)?(?:WOA|WHT|BLK|GRY|BRO|ESP)', c[0]))
            for c in all_candidate_skus
        )
        unique_skus = []
        for s_val, _, _ in all_candidate_skus:
            clean_s = s_val.strip("-:;,. #*!_/")
            if expected_skus:
                clean_s = cls.calibrate_sku_with_expected(clean_s, expected_skus)
            if not clean_s or not cls.is_valid_sku_candidate(clean_s):
                continue
            if has_standard_sku and not re.search(r'(?:[0-9]{2}[DSRLI]|CAM|ARIEL|A0|1-|2-)', clean_s):
                continue
            if clean_s not in unique_skus:
                unique_skus.append(clean_s)

        # Loại bỏ các SKU fragment cụt (suffix) nếu đã có SKU đầy đủ
        # Ví dụ: có cả '54-WOA' và '2-54-WOA' -> chỉ giữ '2-54-WOA'
        if len(unique_skus) > 1:
            filtered_skus = []
            for s in unique_skus:
                is_fragment = False
                for other in unique_skus:
                    if s == other:
                        continue
                    if (other.endswith(s) or other.endswith("-" + s)) and len(other) > len(s):
                        is_fragment = True
                        break
                if not is_fragment:
                    filtered_skus.append(s)
            unique_skus = filtered_skus if filtered_skus else unique_skus

        # Tính toán độ đầy đủ dữ liệu (Completeness)
        has_lpn = bool(extracted_lpn and lpn_conf >= 0.5)
        has_sku = bool(extracted_sku and sku_conf >= 0.5)
        if has_lpn and has_sku:
            completeness = 1.0
        elif has_lpn or has_sku:
            completeness = 0.5
        else:
            completeness = 0.0

        # Overall confidence phản ánh cả độ tin cậy của trường và độ đầy đủ (bị penalty nếu thiếu trường)
        # Ví dụ: LPN = 1.0, SKU = None -> overall = 0.50 (không bao giờ được 1.0)
        overall_confidence = round(0.50 * lpn_conf + 0.50 * sku_conf, 3)

        return {
            "lpn": extracted_lpn,
            "lpn_confidence": lpn_conf,
            "lpn_source": lpn_source,
            "all_lpns": unique_lpns,
            "sku": extracted_sku,
            "sku_confidence": sku_conf,
            "sku_source": sku_source,
            "all_skus": unique_skus,
            "predicted_sku": predicted_sku,
            "validated_sku": validated_sku,
            "sku_is_predicted": sku_is_predicted,
            "sku_is_validated": sku_is_validated,
            "completeness": completeness,
            "batch": extracted_batch,
            "batch_confidence": batch_conf,
            "overall_confidence": overall_confidence,
            "total_tokens_found": len(ocr_tokens),
            "total_barcodes_found": len(barcode_results)
        }


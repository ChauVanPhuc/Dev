# -*- coding: utf-8 -*-
"""
ISO File Service
Quản lý, xác thực đường dẫn an toàn và trích xuất nội dung xem trước
cho các tài liệu từ thư mục gốc 'HỒ SƠ VINA G7'.
"""

import os
import re
import io
import json
import base64
import shutil
import datetime
import unicodedata
from typing import List, Dict, Any, Optional, Tuple

import docx
from docx.oxml import parse_xml
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table
import openpyxl

# Xác định đường dẫn thư mục gốc 'HỒ SƠ VINA G7'
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Từ modules/inspection/services nhảy 4 cấp lên workspace root: SmartFlow_v3-dev_v3
WORKSPACE_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "..", ".."))

def get_resolved_base_iso_dir() -> str:
    """Tự động phát hiện thư mục gốc HỒ SƠ VINA G7: Ưu tiên local, ổ Z:, env var hoặc UNC mạng."""
    local_cand = os.path.join(WORKSPACE_ROOT, "HỒ SƠ VINA G7")
    if os.path.exists(local_cand) and os.path.isdir(local_cand):
        return local_cand
    cand_z = r"Z:\HỒ SƠ VINA G7"
    if os.path.exists(cand_z) and os.path.isdir(cand_z):
        return cand_z
    env_root = os.environ.get("ISO_DOCS_ROOT")
    if env_root and os.path.exists(env_root):
        return env_root
    cand_unc = r"\\192.168.1.193\chia sẻ\HỒ SƠ VINA G7"
    if os.path.exists(cand_unc) and os.path.isdir(cand_unc):
        return cand_unc
    return local_cand

BASE_ISO_DIR = get_resolved_base_iso_dir()

# Cache thư mục tạm thời nếu cần chuyển đổi .doc sang .docx
PREVIEW_CACHE_DIR = os.path.join(WORKSPACE_ROOT, "BackEnd", "data", "preview_cache")
os.makedirs(PREVIEW_CACHE_DIR, exist_ok=True)

# Thư mục tạm lưu bản draft chuyển đổi tài liệu (lưu nội bộ BackEnd tránh ghi bẩn vào ổ mạng)
DRAFTS_ISO_DIR = os.path.join(WORKSPACE_ROOT, "BackEnd", "data", "iso_drafts")
os.makedirs(DRAFTS_ISO_DIR, exist_ok=True)

# Thư mục gốc chuẩn mới 'Hồ sơ G7'
HO_SO_G7_DIR = os.path.join(WORKSPACE_ROOT, "Hồ sơ G7")
os.makedirs(HO_SO_G7_DIR, exist_ok=True)

_CACHED_VINA_G7_LOGO_B64: Optional[str] = None

def get_vina_g7_logo_base64() -> str:
    """Trả về Base64 Data URI chuẩn của Logo VINA G7, ưu tiên trích xuất từ file logo hoặc docx mẫu."""
    global _CACHED_VINA_G7_LOGO_B64
    if _CACHED_VINA_G7_LOGO_B64:
        return _CACHED_VINA_G7_LOGO_B64

    candidates = [
        os.path.join(WORKSPACE_ROOT, "FrontEnd", "Web", "public", "vina_g7_logo.png"),
        os.path.join(WORKSPACE_ROOT, "FrontEnd", "Web", "Shared", "assets", "LogoCty.png"),
        os.path.join(WORKSPACE_ROOT, "BackEnd", "templates", "Mẩu quy trình.docx"),
        os.path.join(WORKSPACE_ROOT, "BackEnd", "templates", "Mẫu quy trình.docx"),
        os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\Administrator"), "Downloads", "Mẩu quy trình.docx"),
        os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\Administrator"), "Downloads", "Mẫu quy trình.docx"),
    ]
    for p in candidates:
        if os.path.isfile(p):
            try:
                if p.lower().endswith(".png"):
                    with open(p, "rb") as f:
                        data = f.read()
                    if data[:4] == b'\x89PNG':
                        _CACHED_VINA_G7_LOGO_B64 = f"data:image/png;base64,{base64.b64encode(data).decode('utf-8')}"
                        return _CACHED_VINA_G7_LOGO_B64
                elif p.lower().endswith(".docx"):
                    d = docx.Document(p)
                    for _, rel in d.part.related_parts.items():
                        if "image" in rel.content_type:
                            _CACHED_VINA_G7_LOGO_B64 = f"data:{rel.content_type};base64,{base64.b64encode(rel.blob).decode('utf-8')}"
                            return _CACHED_VINA_G7_LOGO_B64
            except Exception:
                pass
    return ""

# Tệp lưu trữ persistent metadata Document Lineage / Family và trạng thái sử dụng
LINEAGE_DATA_FILE = os.path.join(WORKSPACE_ROOT, "BackEnd", "data", "iso_file_lineage.json")

# Tệp lưu cache lập chỉ mục tệp tin ổ mạng Z:
NETWORK_CACHE_FILE = os.path.join(WORKSPACE_ROOT, "BackEnd", "data", "iso_network_files_cache.json")
_NETWORK_CACHE_DATA = None

def get_network_file_cache() -> Dict[str, Any]:
    """Tải cache danh mục file trên ổ mạng Z: để tra cứu O(1), ngăn chặn nghẽn mạng SMB."""
    global _NETWORK_CACHE_DATA
    if _NETWORK_CACHE_DATA is not None:
        return _NETWORK_CACHE_DATA
    if os.path.exists(NETWORK_CACHE_FILE):
        try:
            with open(NETWORK_CACHE_FILE, "r", encoding="utf-8") as f:
                _NETWORK_CACHE_DATA = json.load(f)
                return _NETWORK_CACHE_DATA
        except Exception as e:
            print(f"[FileService] Lỗi đọc cache network: {e}")
    _NETWORK_CACHE_DATA = {"rel_map": {}, "name_map": {}}
    return _NETWORK_CACHE_DATA



def sanitize_folder_name(name: str) -> str:
    """
    Chuẩn hóa tên thư mục an toàn, loại bỏ ký tự cấm trên Windows/OS và ngăn chặn path traversal.
    Bảo toàn tiếng Việt có dấu và khoảng trắng hợp lệ.
    """
    if not name:
        return ""
    cleaned = unicodedata.normalize('NFC', str(name).strip())
    # Loại bỏ ký tự cấm: \ / : * ? " < > |
    cleaned = re.sub(r'[\\/:*?"<>|]+', ' ', cleaned)
    # Loại bỏ .. hoặc .
    cleaned = re.sub(r'\.{2,}', '', cleaned)
    # Rút gọn khoảng trắng thừa
    cleaned = re.sub(r'\s+', ' ', cleaned).strip('. ')
    return cleaned


def resolve_record_storage_dir(
    department: Optional[str],
    management_group: Optional[str],
    source_code: Optional[str] = None,
    create_if_missing: bool = False
) -> Tuple[str, str]:
    """
    Xác định đường dẫn thư mục lưu trữ cho hồ sơ / tài liệu:
    Cấu trúc chuẩn: Hồ sơ G7/<Phòng ban>/<Nhóm tài liệu quản lý>/[Mã hồ sơ/]
    - Bắt buộc phải có cả Phòng ban và Nhóm tài liệu quản lý.
    - Trả về (rel_dir, abs_dir):
        rel_dir: đường dẫn tương đối chuẩn ("Hồ sơ G7/<Phòng ban>/<Nhóm tài liệu quản lý>")
        abs_dir: đường dẫn tuyệt đối an toàn trên đĩa
    - Nếu create_if_missing=True thì tự động tạo thư mục nếu chưa tồn tại.
    """
    dept_clean = sanitize_folder_name(department or "")
    group_clean = sanitize_folder_name(management_group or "")

    if not dept_clean or not group_clean:
        missing = []
        if not dept_clean:
            missing.append("Phòng ban")
        if not group_clean:
            missing.append("Nhóm tài liệu quản lý")
        raise ValueError(f"Thiếu thông tin bắt buộc: {', '.join(missing)} để xác định đường dẫn lưu trữ trong Hồ sơ G7.")

    rel_parts = ["Hồ sơ G7", dept_clean, group_clean]
    if source_code:
        code_clean = sanitize_folder_name(source_code)
        # Nếu nhóm tài liệu chưa chứa mã tài liệu này
        if code_clean and code_clean.lower() not in group_clean.lower():
            rel_parts.append(code_clean)

    rel_dir = "/".join(rel_parts)
    abs_dir = os.path.abspath(os.path.join(WORKSPACE_ROOT, *rel_parts))

    # Path Traversal check: abs_dir phải nằm trong HO_SO_G7_DIR
    target_base = os.path.abspath(HO_SO_G7_DIR)
    if not abs_dir.startswith(target_base):
        raise PermissionError("Đường dẫn lưu trữ vi phạm an toàn thư mục (Path Traversal).")

    if create_if_missing:
        os.makedirs(abs_dir, exist_ok=True)

    return rel_dir, abs_dir


def load_file_lineage_registry() -> Dict[str, Any]:
    """Tải registry dữ liệu dòng dõi tài liệu (document lineage) từ file json."""
    if os.path.exists(LINEAGE_DATA_FILE) and os.path.getsize(LINEAGE_DATA_FILE) > 0:
        try:
            with open(LINEAGE_DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Lineage] Lỗi đọc registry: {e}")
    return {}


def save_file_lineage_registry(registry: Dict[str, Any]) -> None:
    """Lưu registry dữ liệu dòng dõi tài liệu vào file json."""
    try:
        os.makedirs(os.path.dirname(LINEAGE_DATA_FILE), exist_ok=True)
        with open(LINEAGE_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(registry, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Lineage] Lỗi ghi registry: {e}")


def compute_document_family_id(file_name: str, rel_path: str = "") -> str:
    """
    Xác định mã gia đình tài liệu (document family) chuẩn cho từng tài liệu độc lập:
    - Loại bỏ đuôi mở rộng (.docx, .doc, .xlsx, .pdf, ...)
    - Tách từ, lọc bỏ các tiền tố quy ước: G7, HC, QT01, CL, CD, CĐ, VP, KT, NS, Quy trình, Hướng dẫn, Quy định...
    - Loại bỏ số phiên bản/lần ban hành
    - Chuẩn hóa thành slug không dấu.
    - Đảm bảo tài liệu A độc lập với tài liệu B dù cùng nằm trong 1 hồ sơ master.
    """
    if not file_name:
        return "doc_family_default"
    base = re.sub(r'\.[a-zA-Z0-9]+$', '', file_name)
    s = re.sub(r'[\-_\.]+', ' ', base)
    tokens = s.split()
    noise = {'g7', 'hc', 'cl', 'cd', 'kt', 'vp', 'ns', 'quy', 'trinh', 'huong', 'dan', 'dinh', 'qt', 'bm', 'k', 'cđ'}
    filtered = []
    for t in tokens:
        t_clean = t.lower().replace('đ', 'd').replace('Đ', 'd')
        t_clean = unicodedata.normalize('NFKD', t_clean).encode('ASCII', 'ignore').decode('utf-8').lower()
        if t_clean in noise or re.match(r'^(qt|k|bm)?\d+$', t_clean):
            continue
        filtered.append(t_clean)
    slug = '_'.join(filtered)
    if not slug or len(slug) < 3:
        s_base = base.lower().replace('đ', 'd').replace('Đ', 'd')
        slug = unicodedata.normalize('NFKD', s_base).encode('ASCII', 'ignore').decode('utf-8').lower()
        slug = re.sub(r'[^a-z0-9]+', '_', slug).strip('_')
    return slug[:50] or "doc_family_general"


def ensure_docx_path(abs_path: str) -> str:
    """
    Đảm bảo đường dẫn file là .docx hợp lệ.
    Nếu là .doc, tự động chuyển đổi sang .docx trong thư mục preview cache để xử lý và chỉnh sửa trực tiếp.
    """
    if not abs_path or not os.path.exists(abs_path):
        return abs_path
    if abs_path.lower().endswith(".docx"):
        return abs_path
    if abs_path.lower().endswith(".doc"):
        cached_docx = os.path.join(PREVIEW_CACHE_DIR, f"temp_{os.path.basename(abs_path)}x")
        if os.path.exists(cached_docx) and os.path.getmtime(cached_docx) >= os.path.getmtime(abs_path):
            return cached_docx
        try:
            import pythoncom, win32com.client
            pythoncom.CoInitialize()
            doc_app = None
            try:
                word = win32com.client.DispatchEx("Word.Application")
                word.Visible = False
                word.DisplayAlerts = 0
                doc_app = word.Documents.Open(abs_path, ReadOnly=True)
                doc_app.SaveAs2(cached_docx, 16)
                doc_app.Close(False)
                doc_app = None
                word.Quit()
            finally:
                if doc_app:
                    try:
                        doc_app.Close(False)
                    except:
                        pass
                pythoncom.CoUninitialize()
            if os.path.exists(cached_docx):
                return cached_docx
        except Exception as e:
            print(f"[EnsureDocx] Lỗi convert .doc sang .docx: {e}")
    return abs_path


def update_file_usage_status(
    record_id: int,
    rel_path: str,
    new_usage: str,
    record: Any = None
) -> Dict[str, Any]:
    """
    Cập nhật trạng thái sử dụng của tệp (IN_USE / NOT_IN_USE) bởi người dùng:
    - Nếu đánh dấu IN_USE: tự động đặt các file khác trong CÙNG document_family_id thành NOT_IN_USE.
    - Không ảnh hưởng file thuộc document_family_id khác.
    - Không xóa file vật lý.
    - Ghi nhận vào iso_file_lineage.json.
    """
    registry = load_file_lineage_registry()
    rec_key = str(record_id)
    if rec_key not in registry:
        registry[rec_key] = {}

    clean_rel = normalize_rel_path(rel_path).replace(os.sep, '/')
    fn = os.path.basename(clean_rel)
    fam_id = compute_document_family_id(fn, clean_rel)

    if clean_rel in registry[rec_key] and registry[rec_key][clean_rel].get("document_family_id"):
        fam_id = registry[rec_key][clean_rel]["document_family_id"]

    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if new_usage == "IN_USE":
        curr_entry = registry[rec_key].get(clean_rel, {})
        curr_entry.update({
            "relative_path": clean_rel,
            "file_name": fn,
            "document_family_id": fam_id,
            "usage_status": "IN_USE",
            "is_current": True,
            "updated_at": now_iso
        })
        if "processing_status" not in curr_entry:
            curr_entry["processing_status"] = "CONVERTED" if ("G7." in fn or "_0" in fn) else "UNEDITED"
        registry[rec_key][clean_rel] = curr_entry

        for other_path, other_data in registry[rec_key].items():
            if other_path != clean_rel and other_data.get("document_family_id") == fam_id:
                other_data["usage_status"] = "NOT_IN_USE"
                other_data["is_current"] = False
                other_data["updated_at"] = now_iso

        # Đồng bộ thêm các file trong cùng document family của record nếu chưa có trong registry
        if record:
            try:
                rec_files_info = get_record_files_and_word_docs(record)
                for rf in rec_files_info.get("files", []):
                    rf_clean = rf.get("clean_rel_path") or normalize_rel_path(rf.get("relative_path", "")).replace(os.sep, '/')
                    if rf_clean and rf_clean != clean_rel:
                        rf_fn = rf.get("file_name", os.path.basename(rf_clean))
                        rf_fam = compute_document_family_id(rf_fn, rf_clean)
                        if rf_fam == fam_id and rf_clean not in registry[rec_key]:
                            registry[rec_key][rf_clean] = {
                                "relative_path": rf_clean,
                                "file_name": rf_fn,
                                "document_family_id": fam_id,
                                "usage_status": "NOT_IN_USE",
                                "is_current": False,
                                "processing_status": rf.get("processing_status", "UNEDITED"),
                                "updated_at": now_iso
                            }
            except Exception as e_sync:
                print(f"[Lineage] Cảnh báo đồng bộ family file: {e_sync}")

    else:
        curr_entry = registry[rec_key].get(clean_rel, {})
        curr_entry.update({
            "relative_path": clean_rel,
            "file_name": fn,
            "document_family_id": fam_id,
            "usage_status": "NOT_IN_USE",
            "is_current": False,
            "updated_at": now_iso
        })
        if "processing_status" not in curr_entry:
            curr_entry["processing_status"] = "CONVERTED" if ("G7." in fn or "_0" in fn) else "UNEDITED"
        registry[rec_key][clean_rel] = curr_entry

    save_file_lineage_registry(registry)

    return {
        "relative_path": clean_rel,
        "file_name": fn,
        "document_family_id": fam_id,
        "usage_status": new_usage,
        "usage_status_label": "Đang sử dụng" if new_usage == "IN_USE" else "Không sử dụng",
        "is_current": (new_usage == "IN_USE")
    }


def record_conversion_lineage(
    record_id: int,
    source_rel_path: str,
    official_rel_path: str
) -> None:
    """
    Ghi nhận liên kết chuyển đổi giữa file nguồn và file chính thức mới:
    - Cùng document_family_id
    - File nguồn -> processing_status = CONVERTED, usage_status = NOT_IN_USE, is_current = False
    - File mới -> processing_status = CONVERTED, usage_status = IN_USE, is_current = True, parent_path = source
    """
    registry = load_file_lineage_registry()
    rec_key = str(record_id)
    if rec_key not in registry:
        registry[rec_key] = {}

    clean_source = normalize_rel_path(source_rel_path).replace(os.sep, '/')
    clean_official = normalize_rel_path(official_rel_path).replace(os.sep, '/')
    source_fn = os.path.basename(clean_source)
    official_fn = os.path.basename(clean_official)

    fam_id = compute_document_family_id(source_fn, clean_source)
    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    registry[rec_key][clean_source] = {
        "relative_path": clean_source,
        "file_name": source_fn,
        "document_family_id": fam_id,
        "processing_status": "CONVERTED",
        "usage_status": "NOT_IN_USE",
        "is_current": False,
        "updated_at": now_iso
    }

    registry[rec_key][clean_official] = {
        "relative_path": clean_official,
        "file_name": official_fn,
        "document_family_id": fam_id,
        "parent_path": clean_source,
        "processing_status": "CONVERTED",
        "usage_status": "IN_USE",
        "is_current": True,
        "updated_at": now_iso
    }

    for other_p, other_d in registry[rec_key].items():
        if other_p not in [clean_source, clean_official] and other_d.get("document_family_id") == fam_id:
            other_d["usage_status"] = "NOT_IN_USE"
            other_d["is_current"] = False
            other_d["updated_at"] = now_iso

    save_file_lineage_registry(registry)


def record_direct_edit_lineage(record_id: int, rel_path: str) -> None:
    """Ghi nhận việc file đã được chỉnh sửa trực tiếp qua Direct Word Editor."""
    registry = load_file_lineage_registry()
    rec_key = str(record_id)
    if rec_key not in registry:
        registry[rec_key] = {}

    clean_rel = normalize_rel_path(rel_path).replace(os.sep, '/')
    fn = os.path.basename(clean_rel)
    fam_id = compute_document_family_id(fn, clean_rel)
    now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    entry = registry[rec_key].get(clean_rel, {})
    entry.update({
        "relative_path": clean_rel,
        "file_name": fn,
        "document_family_id": entry.get("document_family_id") or fam_id,
        "processing_status": "EDITED",
        "usage_status": "IN_USE",
        "is_current": True,
        "updated_at": now_iso
    })
    registry[rec_key][clean_rel] = entry
    save_file_lineage_registry(registry)


def get_base_iso_dir() -> str:
    """Trả về đường dẫn tuyệt đối đến thư mục gốc HỒ SƠ VINA G7."""
    return BASE_ISO_DIR


def normalize_rel_path(raw_path: str) -> str:
    """
    Chuẩn hóa đường dẫn tương đối:
    - Chuyển đổi slash/backslash
    - Loại bỏ tiền tố 'HỒ SƠ VINA G7/' hoặc ổ đĩa
    - Chuẩn hóa Unicode NFC tiếng Việt
    """
    if not raw_path:
        return ""
    
    clean = str(raw_path).strip().strip('"').strip("'")
    clean = unicodedata.normalize('NFC', clean)
    clean = clean.replace('/', os.sep).replace('\\', os.sep)

    # Nếu bắt đầu bằng tiền tố tên thư mục gốc, cắt bỏ
    for prefix_name in ["HỒ SƠ VINA G7", "Hồ sơ G7", "HO SO G7", "HO SO VINA G7"]:
        prefix = f"{prefix_name}{os.sep}"
        if clean.lower().startswith(prefix.lower()):
            clean = clean[len(prefix):]
            break
        elif clean.lower() == prefix_name.lower():
            clean = ""
            break
        marker = f"{os.sep}{prefix_name}{os.sep}"
        idx = clean.lower().find(marker.lower())
        if idx >= 0:
            clean = clean[idx + len(marker):]
            break

    # Xóa ký tự phân cách ở đầu nếu có
    clean = clean.lstrip(os.sep)
    return clean


def resolve_safe_path(rel_path: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Kiểm tra và xác định đường dẫn an toàn (Path Traversal Protection).
    Hỗ trợ cả thư mục gốc chuẩn mới 'Hồ sơ G7' và thư mục legacy 'HỒ SƠ VINA G7'.
    Trả về (abs_path, error_message).
    """
    clean_rel = normalize_rel_path(rel_path)
    if not clean_rel:
        return None, "Đường dẫn rỗng"

    # 0. Thử tìm kiếm an toàn trong thư mục static/uploads (Tài liệu upload từ quy trình ISO)
    clean_norm = clean_rel.replace('\\', '/')
    if 'static/' in clean_norm or 'uploads/' in clean_norm:
        cand_sub = clean_norm[clean_norm.find('static/'):] if 'static/' in clean_norm else clean_norm[clean_norm.find('uploads/'):]
        for base_cand in [os.path.abspath("."), os.path.abspath("BackEnd")]:
            target_cand = os.path.abspath(os.path.join(base_cand, cand_sub))
            if os.path.isfile(target_cand):
                return target_cand, None

    # 0.1 Thử tìm an toàn trong thư mục gốc WORKSPACE_ROOT và các thư mục dữ liệu nội bộ
    ws_abs = os.path.abspath(WORKSPACE_ROOT)
    target_abs_ws = os.path.abspath(os.path.join(ws_abs, clean_rel))
    if target_abs_ws.startswith(ws_abs) and os.path.isfile(target_abs_ws):
        return target_abs_ws, None

    clean_fname = os.path.basename(clean_rel)
    norm_fname = unicodedata.normalize('NFC', clean_fname).lower().strip()
    if norm_fname:
        try:
            for f in os.listdir(ws_abs):
                if unicodedata.normalize('NFC', f).lower().strip() == norm_fname:
                    cand_ws = os.path.join(ws_abs, f)
                    if os.path.isfile(cand_ws):
                        return cand_ws, None
            if os.path.isdir(DRAFTS_ISO_DIR):
                for f in os.listdir(DRAFTS_ISO_DIR):
                    if unicodedata.normalize('NFC', f).lower().strip() == norm_fname:
                        cand_draft = os.path.join(DRAFTS_ISO_DIR, f)
                        if os.path.isfile(cand_draft):
                            return cand_draft, None
        except Exception:
            pass

    base_iso_abs = os.path.abspath(BASE_ISO_DIR)
    base_g7_abs = os.path.abspath(HO_SO_G7_DIR)

    # 1. Thử tìm kiếm an toàn trong HO_SO_G7_DIR ('Hồ sơ G7')
    target_abs_g7 = os.path.abspath(os.path.join(base_g7_abs, clean_rel))
    if target_abs_g7.startswith(base_g7_abs):
        if os.path.exists(target_abs_g7):
            if os.path.isfile(target_abs_g7):
                return target_abs_g7, None
            return None, "Đường dẫn là thư mục, không phải tệp tin"
        parent_g7 = os.path.dirname(target_abs_g7)
        file_name = os.path.basename(target_abs_g7)
        if os.path.isdir(parent_g7):
            norm_name = unicodedata.normalize('NFC', file_name).lower().strip()
            for cand in os.listdir(parent_g7):
                if unicodedata.normalize('NFC', cand).lower().strip() == norm_name:
                    cand_abs = os.path.join(parent_g7, cand)
                    if os.path.isfile(cand_abs):
                        return cand_abs, None

    # 2. Thử tìm kiếm an toàn trong BASE_ISO_DIR ('HỒ SƠ VINA G7')
    target_abs_iso = os.path.abspath(os.path.join(base_iso_abs, clean_rel))
    if not target_abs_iso.startswith(base_iso_abs) and not target_abs_g7.startswith(base_g7_abs):
        return None, "Đường dẫn không hợp lệ hoặc bị từ chối truy cập (truy cập ngoài phạm vi thư mục gốc)"

    if target_abs_iso.startswith(base_iso_abs):
        if os.path.exists(target_abs_iso):
            if os.path.isfile(target_abs_iso):
                return target_abs_iso, None
            return None, "Đường dẫn là thư mục, không phải tệp tin"

        parent_dir = os.path.dirname(target_abs_iso)
        file_name = os.path.basename(target_abs_iso)
        if os.path.isdir(parent_dir):
            normalized_target_name = unicodedata.normalize('NFC', file_name).lower().strip()
            for candidate in os.listdir(parent_dir):
                if unicodedata.normalize('NFC', candidate).lower().strip() == normalized_target_name:
                    cand_abs = os.path.join(parent_dir, candidate)
                    if os.path.isfile(cand_abs):
                        return cand_abs, None

        # 3. Tra cứu nhanh từ Network Cache O(1) thay vì os.walk qua mạng
        cache = get_network_file_cache()
        rel_map = cache.get("rel_map", {})
        clean_rel_key = unicodedata.normalize('NFC', clean_rel).lower()
        if clean_rel_key in rel_map:
            cand_abs = os.path.join(base_iso_abs, rel_map[clean_rel_key])
            if os.path.isfile(cand_abs):
                return cand_abs, None

        target_filename = unicodedata.normalize('NFC', file_name).lower().strip()
        name_map = cache.get("name_map", {})
        if target_filename and target_filename in name_map:
            for cand_rel in name_map[target_filename]:
                cand_abs = os.path.join(base_iso_abs, cand_rel)
                if os.path.isfile(cand_abs):
                    return cand_abs, None

    return None, "Không tìm thấy file theo đường dẫn"


def parse_raw_source_links(source_link_str: Optional[str]) -> List[str]:
    """Tách chuỗi source_link phân cách bằng dấu chấm phẩy ; hoặc xuống dòng \n"""
    if not source_link_str:
        return []
    
    # Chuẩn hóa các dấu phân cách: \r\n, \n, ; -> chuẩn hóa thành ;
    normalized = str(source_link_str).replace('\r\n', ';').replace('\n', ';')
    parts = normalized.split(';')
    results = []
    for p in parts:
        p_clean = p.strip()
        if not p_clean:
            continue
        # Bỏ qua chuỗi tóm tắt như '... (+152 file liên quan)', '(+15 file liên quan)'
        if re.search(r"\(?\+\s*\d+\s*file\s*liên\s*quan\)?", p_clean, re.IGNORECASE):
            continue
        if p_clean.startswith('...') and ('file' in p_clean.lower() or 'liên quan' in p_clean.lower()):
            continue
        # Bỏ qua tham chiếu 'Xem nguồn ...' chưa phân giải
        if p_clean.lower().startswith('xem nguồn') and re.search(r"\(I\d+\)", p_clean):
            continue
        results.append(p_clean)
    return results



def check_single_file_status(raw_path: str) -> Dict[str, Any]:
    """Kiểm tra sự tồn tại và siêu dữ liệu của một file từ đường dẫn."""
    clean_rel = normalize_rel_path(raw_path)
    file_name = os.path.basename(clean_rel) if clean_rel else raw_path
    _, ext = os.path.splitext(file_name)
    ext_clean = ext.lower().replace('.', '') if ext else 'other'

    abs_path, err = resolve_safe_path(raw_path)
    if abs_path and os.path.isfile(abs_path):
        stat = os.stat(abs_path)
        mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M")
        size_bytes = stat.st_size
        folder_path = os.path.dirname(clean_rel)

        # Nếu file là upload ISO Document (tên file là UUID), tra cứu tên thân thiện từ bảng ISODocument
        if 'iso_documents' in clean_rel.lower():
            try:
                from config.database import SessionLocal
                from modules.inspection.models.iso_models import ISODocument
                doc_db = SessionLocal()
                try:
                    base_f = os.path.basename(clean_rel)
                    matching_doc = doc_db.query(ISODocument).filter(ISODocument.file_path.ilike(f"%{base_f}%")).first()
                    if matching_doc:
                        file_name = f"{matching_doc.code} - {matching_doc.name}.{ext_clean}" if matching_doc.code and matching_doc.name else (matching_doc.name or file_name)
                finally:
                    doc_db.close()
            except Exception:
                pass

        return {
            "raw_path": raw_path,
            "relative_path": clean_rel,
            "file_name": file_name,
            "folder_path": folder_path,
            "ext": ext_clean,
            "exists": True,
            "status": "FOUND",
            "status_message": "Tệp tin hợp lệ và sẵn sàng xem",
            "size_bytes": size_bytes,
            "size_formatted": format_file_size(size_bytes),
            "modified_time": mtime
        }
    else:
        status_code = "INVALID_PATH" if err and "từ chối" in err else "NOT_FOUND"
        return {
            "raw_path": raw_path,
            "relative_path": clean_rel,
            "file_name": file_name,
            "folder_path": os.path.dirname(clean_rel) if clean_rel else "",
            "ext": ext_clean,
            "exists": False,
            "status": status_code,
            "status_message": err or "Không tìm thấy file theo đường dẫn",
            "size_bytes": 0,
            "size_formatted": "0 KB",
            "modified_time": None
        }


def format_file_size(size_bytes: int) -> str:
    """Định dạng dung lượng file đọc được cho người dùng."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def is_main_procedure_doc(file_name: str, doc_name: str = "", doc_code: str = "") -> bool:
    """
    Xác định xem file có phải là tài liệu Quy trình chính hay không
    (phân biệt với Biểu mẫu BM, Phụ lục, Checklist, Sổ theo dõi, v.v.).
    """
    fn_lower = unicodedata.normalize('NFC', file_name).lower()

    # Nếu chứa từ khóa biểu mẫu, phụ lục, sổ ghi chép, checklist -> KHÔNG phải quy trình chính
    non_proc_keywords = ["-bm", "bm0", "bm1", "bm2", "biểu mẫu", "phụ lục", "checklist", "sổ ", "danh mục"]
    for kw in non_proc_keywords:
        if kw in fn_lower:
            return False

    # Nếu chứa từ khóa quy trình chính
    proc_keywords = ["quy trình", "qt0", "qt1", "qt2", "qt3", "qt4", "qt5", "qt6", "qt7", "qt8", "qt9"]
    for kw in proc_keywords:
        if kw in fn_lower:
            return True

    return False


def slugify_vietnamese(text: str) -> str:
    """Chuyển chuỗi tiếng Việt thành slug dạng quy-trinh-cap-nhat-luat..."""
    if not text:
        return "tai-lieu"
    norm = unicodedata.normalize('NFD', text)
    no_mark = ''.join(c for c in norm if unicodedata.category(c) != 'Mn')
    no_mark = no_mark.replace('đ', 'd').replace('Đ', 'D')
    clean = re.sub(r'[^a-zA-Z0-9]+', '-', no_mark).strip('-')
    return clean.lower() if clean else "tai-lieu"


def make_converted_doc_filename(doc_code: str, edition: str, doc_name: str, source_filename: str = "") -> str:
    """
    Quy tắc filename chuẩn G7:
    [Mã hiệu mới]_[Lần ban hành mới]_[Tên tài liệu].docx
    Ví dụ: G7.HC.QT01_03_Quy-trinh-cap-nhat-luat-va-cac-yeu-cau-khac.docx
    """
    code_part = (doc_code or "G7.HC.QT01").strip().replace(" ", "")
    ed_str = str(edition or "01").strip()
    m_num = re.search(r'\d+', ed_str)
    ed_part = m_num.group(0).zfill(2) if m_num else "01"

    raw_name = (doc_name or "").strip()
    if source_filename:
        base_src = os.path.splitext(source_filename)[0]
        base_src_cleaned = re.sub(r'^(?:QT|G7|BM|QCL)[\w\.\-]*\s*[\.\-]?\s*', '', base_src).strip()
        if base_src_cleaned and len(base_src_cleaned) > 5:
            raw_name = base_src_cleaned
    elif not raw_name:
        raw_name = "quy-trinh"

    clean_slug = slugify_vietnamese(raw_name)
    if clean_slug:
        clean_slug = clean_slug[0].upper() + clean_slug[1:]

    return f"{code_part}_{ed_part}_{clean_slug}.docx"


def extract_doc_version_rank(file_name: str, rel_path: str = "", record: Any = None) -> int:
    """
    Tính điểm ưu tiên phiên bản tài liệu:
    - File đầu tiên trong source_link của record (file hiện hành) được ưu tiên tuyệt đối
    - File chuẩn mã hiệu G7 mới được cộng điểm cao
    - Lần ban hành cao hơn được ưu tiên
    - Các file trong thư mục mới 'QUY TRÌNH ISO 90012015 MỚI' được ưu tiên
    """
    score = 100
    combined = (file_name + " " + rel_path).lower()

    # Nếu là file đầu tiên trong source_link của record (file hiện hành sau chuyển đổi)
    if record and getattr(record, "source_link", None):
        raw_links = parse_raw_source_links(record.source_link)
        if raw_links:
            first_norm = normalize_rel_path(raw_links[0]).replace(os.sep, '/').lower()
            curr_norm = normalize_rel_path(rel_path).replace(os.sep, '/').lower()
            if curr_norm == first_norm:
                score += 5000

    # Ưu tiên chuẩn mã hiệu G7 mới
    if file_name.startswith("G7.") or "g7." in file_name.lower():
        score += 1500

    # Lần ban hành dạng _03_ hoặc _02_ hoặc Lần 3
    m_code_ed = re.search(r'_(\d{2})_', file_name)
    if m_code_ed:
        score += int(m_code_ed.group(1)) * 100

    if "quy trình iso 90012015 mới" in combined or "35. quy trình iso" in combined:
        score += 500
    elif "4. quy trình iso" in combined:
        score += 400
    elif "quy trình" in combined:
        score += 200

    # Lần ban hành
    m_lan = re.search(r"lần\s*(\d+)", combined)
    if m_lan:
        score += int(m_lan.group(1)) * 50

    # Năm
    for year in range(2026, 2015, -1):
        if str(year) in combined:
            score += (year - 2015) * 20
            break

    # Trừ điểm file backup/autorecover
    if "autorecover" in combined or "backup" in combined:
        score -= 100
    if "~$" in combined:
        score -= 1000

    return score


def discover_related_files_for_record(record) -> List[Dict[str, Any]]:
    """
    Khám phá tất cả các file liên quan thực tế trong HỒ SƠ VINA G7
    dựa trên `source_link` đã lưu và mã tài liệu (QT01, K014, v.v.).
    """
    discovered_files: List[Dict[str, Any]] = []
    seen_paths = set()

    # 1. Các file được ghi nhận trực tiếp trong source_link
    raw_links = parse_raw_source_links(record.source_link)
    for link in raw_links:
        status_info = check_single_file_status(link)
        clean_rel = status_info["relative_path"]
        if clean_rel and clean_rel not in seen_paths:
            seen_paths.add(clean_rel)
            discovered_files.append(status_info)

    # 2. Tìm kiếm tự động fallback nếu chưa có file nào được ghi nhận trong source_link
    if not discovered_files:
        search_codes = []
        if getattr(record, 'suggested_doc_code', None):
            search_codes.append(record.suggested_doc_code.strip())
        if getattr(record, 'item_code', None) and record.item_code not in search_codes:
            search_codes.append(record.item_code.strip())
        if getattr(record, 'source_code', None) and record.source_code not in search_codes:
            search_codes.append(record.source_code.strip())

        # 2a. Khám phá file từ Hệ thống Quản lý Quy trình & Biểu mẫu ISO (iso_processes, iso_documents)
        try:
            from config.database import SessionLocal
            from modules.inspection.models.iso_models import ISOProcess, ISODocument
            fallback_db = SessionLocal()
            try:
                matched_procs = []
                for c in search_codes:
                    procs = fallback_db.query(ISOProcess).filter(
                        (ISOProcess.code.ilike(c)) | (ISOProcess.name.ilike(f"%{c}%"))
                    ).all()
                    for p in procs:
                        if p.id not in [mp.id for mp in matched_procs]:
                            matched_procs.append(p)

                for p in matched_procs:
                    docs = fallback_db.query(ISODocument).filter(ISODocument.process_id == p.id).all()
                    for d in docs:
                        if d.file_path:
                            clean_rel = normalize_rel_path(d.file_path).replace(os.sep, '/')
                            if clean_rel not in seen_paths:
                                seen_paths.add(clean_rel)
                                st = check_single_file_status(d.file_path)
                                st["file_name"] = f"{d.code} - {d.name}.docx" if d.code and d.name else (st.get("file_name") or d.name)
                                st["document_name"] = d.name
                                st["source_code"] = d.code
                                discovered_files.append(st)
                    if p.file_path:
                        clean_rel = normalize_rel_path(p.file_path).replace(os.sep, '/')
                        if clean_rel not in seen_paths:
                            seen_paths.add(clean_rel)
                            st = check_single_file_status(p.file_path)
                            st["file_name"] = f"{p.code} - {p.name}.docx" if p.code and p.name else (st.get("file_name") or p.name)
                            st["document_name"] = p.name
                            st["source_code"] = p.code
                            discovered_files.append(st)
            finally:
                fallback_db.close()
        except Exception as proc_search_err:
            print(f"[discover_related_files] Lỗi tìm kiếm quy trình liên kết: {proc_search_err}")

        # 2b. Fallback quét nhanh trong Network File Cache thay vì os.walk qua mạng
        if not discovered_files and search_codes:
            cache = get_network_file_cache()
            rel_map = cache.get("rel_map", {})
            for clean_k, rel_f in rel_map.items():
                match = any(code.lower() in clean_k for code in search_codes)
                if match and rel_f not in seen_paths:
                    seen_paths.add(rel_f)
                    discovered_files.append(check_single_file_status(rel_f))
                    if len(discovered_files) >= 5:
                        break

    # Nếu tìm thấy file thực tế và record chưa có source_link thì tự động bổ sung liên kết
    if discovered_files and not getattr(record, 'source_link', None) and getattr(record, 'id', None):
        try:
            from config.database import SessionLocal
            from modules.inspection.models.iso_master_record_model import ISOMasterRecord
            link_db = SessionLocal()
            try:
                db_rec = link_db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record.id).first()
                if db_rec and not db_rec.source_link:
                    valid_rels = [f.get("relative_path") for f in discovered_files if f.get("relative_path")]
                    if valid_rels:
                        db_rec.source_link = "\n".join(valid_rels)
                        link_db.commit()
            finally:
                link_db.close()
        except Exception as link_upd_err:
            pass

    return discovered_files


def get_record_files_and_word_docs(record, sibling_records: Optional[List[Any]] = None) -> Dict[str, Any]:
    """
    Lấy danh sách tất cả file liên quan và phân loại trạng thái xử lý & trạng thái sử dụng:
    1. Hỗ trợ gom toàn bộ file của các dòng trong cùng nhóm (sibling_records).
    2. Mỗi file lưu trữ đầy đủ nguồn gốc (source_code, record_id, document_name).
    3. Tách biệt 2 loại trạng thái: Trạng thái xử lý & Trạng thái sử dụng.
    4. Document Lineage: Phân nhóm theo document_family_id độc lập cho từng tài liệu.
    """
    if sibling_records:
        records_map = {r.id: r for r in [record] + sibling_records if hasattr(r, 'id') and r.id}
        all_records = list(records_map.values())
    else:
        all_records = [record]

    all_files: List[Dict[str, Any]] = []
    child_documents: List[Dict[str, Any]] = []
    seen_paths = {}

    for rec in all_records:
        rec_files = discover_related_files_for_record(rec)
        source_info = {
            "record_id": rec.id,
            "source_code": getattr(rec, 'source_code', '') or "",
            "document_name": getattr(rec, 'document_name', '') or "",
            "department": getattr(rec, 'department_in_charge', '') or ""
        }

        child_files_for_rec = []
        if rec_files:
            for f in rec_files:
                rel = f.get("relative_path", "")
                clean_rel = normalize_rel_path(rel).replace(os.sep, '/')
                f["clean_rel_path"] = clean_rel

                # Gắn đầy đủ metadata cấp tài liệu từ dòng nguồn rec
                f["source_record_id"] = rec.id
                f["source_row_id"] = rec.id
                f["source_code"] = getattr(rec, 'source_code', '') or ""
                f["source_doc_name"] = getattr(rec, 'document_name', '') or ""
                f["suggested_doc_code"] = getattr(rec, 'suggested_doc_code', '') or ""
                f["classification"] = getattr(rec, 'classification', '') or ""
                f["management_group"] = getattr(rec, 'management_group', '') or ""
                f["document_name"] = getattr(rec, 'document_name', '') or f.get("file_name", "")
                f["department_in_charge"] = getattr(rec, 'department_in_charge', '') or ""
                f["edition"] = getattr(rec, 'edition', '') or ""
                f["issue_date"] = getattr(rec, 'issue_date', '') or ""
                f["last_modified_date"] = getattr(rec, 'last_modified_date', '') or ""
                f["management_doc"] = getattr(rec, 'management_doc', '') or ""
                f["code_of_conduct"] = getattr(rec, 'code_of_conduct', '') or ""
                f["source_status"] = getattr(rec, 'source_status', '') or ""
                f["notes"] = getattr(rec, 'notes', '') or ""
                f["source_link"] = getattr(rec, 'source_link', '') or ""
                f["is_checked"] = getattr(rec, 'is_checked', False)

                f["file_id"] = f"{rec.id}_{clean_rel}"
                f["associated_sources"] = [source_info]
                child_files_for_rec.append(f)
                all_files.append(f)
        else:
            # Dòng nguồn chưa có file trên đĩa hoặc chưa liên kết file vật lý:
            # Tạo child item từ chính record để không làm mất dòng nguồn
            doc_n = getattr(rec, 'document_name', '') or getattr(rec, 'source_code', '') or f"Tài liệu #{rec.id}"
            src_link = getattr(rec, 'source_link', '') or ""
            _, raw_ext = os.path.splitext(src_link or doc_n)
            cls_upper = (getattr(rec, 'classification', '') or '').upper()
            if raw_ext:
                inferred_ext = raw_ext.lower().replace('.', '')
            elif cls_upper == 'BIỂU MẪU':
                inferred_ext = 'xlsx'
            elif 'HƯỚNG DẪN' in cls_upper:
                inferred_ext = 'pdf'
            else:
                inferred_ext = 'docx'

            clean_rel = f"record_{rec.id}_{doc_n}"
            f_item = {
                "raw_path": src_link or clean_rel,
                "relative_path": src_link or clean_rel,
                "clean_rel_path": clean_rel,
                "file_name": doc_n,
                "folder_path": "",
                "ext": inferred_ext,
                "exists": False,
                "status": "RECORD_ONLY",
                "status_message": "Dòng dữ liệu nguồn (chưa liên kết tệp tin vật lý)",
                "size_bytes": 0,
                "size_formatted": "0 KB",
                "modified_time": getattr(rec, 'last_modified_date', None) or getattr(rec, 'issue_date', None),
                "source_record_id": rec.id,
                "source_row_id": rec.id,
                "source_code": getattr(rec, 'source_code', '') or "",
                "source_doc_name": doc_n,
                "suggested_doc_code": getattr(rec, 'suggested_doc_code', '') or "",
                "classification": getattr(rec, 'classification', '') or "",
                "management_group": getattr(rec, 'management_group', '') or "",
                "document_name": getattr(rec, 'document_name', '') or doc_n,
                "department_in_charge": getattr(rec, 'department_in_charge', '') or "",
                "edition": getattr(rec, 'edition', '') or "",
                "issue_date": getattr(rec, 'issue_date', '') or "",
                "last_modified_date": getattr(rec, 'last_modified_date', '') or "",
                "management_doc": getattr(rec, 'management_doc', '') or "",
                "code_of_conduct": getattr(rec, 'code_of_conduct', '') or "",
                "source_status": getattr(rec, 'source_status', '') or "",
                "notes": getattr(rec, 'notes', '') or "",
                "source_link": src_link,
                "is_checked": getattr(rec, 'is_checked', False),
                "file_id": f"{rec.id}_{clean_rel}",
                "associated_sources": [source_info]
            }
            child_files_for_rec.append(f_item)
            seen_paths[clean_rel] = f_item
            all_files.append(f_item)

        # Lưu tài liệu con với danh sách file của riêng nó
        child_doc = {
            "id": rec.id,
            "source_row_id": rec.id,
            "source_code": getattr(rec, 'source_code', '') or "",
            "document_name": getattr(rec, 'document_name', '') or "",
            "suggested_doc_code": getattr(rec, 'suggested_doc_code', '') or "",
            "classification": getattr(rec, 'classification', '') or "",
            "management_group": getattr(rec, 'management_group', '') or "",
            "department_in_charge": getattr(rec, 'department_in_charge', '') or "",
            "edition": getattr(rec, 'edition', '') or "",
            "issue_date": getattr(rec, 'issue_date', '') or "",
            "last_modified_date": getattr(rec, 'last_modified_date', '') or "",
            "management_doc": getattr(rec, 'management_doc', '') or "",
            "code_of_conduct": getattr(rec, 'code_of_conduct', '') or "",
            "source_status": getattr(rec, 'source_status', '') or "",
            "notes": getattr(rec, 'notes', '') or "",
            "source_link": getattr(rec, 'source_link', '') or "",
            "attached_records_count": getattr(rec, 'attached_records_count', '') or "",
            "identified_forms_count": getattr(rec, 'identified_forms_count', '') or "",
            "form_code": getattr(rec, 'form_code', '') or "",
            "is_checked": getattr(rec, 'is_checked', False),
            "files": child_files_for_rec
        }
        child_documents.append(child_doc)

    registry = load_file_lineage_registry()
    rec_registry = {}
    for r in all_records:
        r_key = str(r.id) if hasattr(r, 'id') and r.id else "0"
        if r_key in registry:
            rec_registry.update(registry[r_key])

    # Nhóm các file Word (.docx, .doc) theo document_family_id
    word_docs_by_family: Dict[str, List[Dict[str, Any]]] = {}

    for f in all_files:
        fn = f["file_name"]
        clean_rel = f.get("clean_rel_path") or normalize_rel_path(f.get("relative_path", "")).replace(os.sep, '/')
        fam_id = compute_document_family_id(fn, clean_rel)
        f["document_family_id"] = fam_id

        if f["ext"] in ["docx", "doc"] and f["exists"]:
            is_proc = is_main_procedure_doc(fn, record.document_name or "", getattr(record, "suggested_doc_code", "") or "")
            rank = extract_doc_version_rank(fn, clean_rel, record)
            f["is_main_procedure"] = is_proc
            f["version_rank"] = rank
            word_docs_by_family.setdefault(fam_id, []).append(f)

    # Xử lý trạng thái từng family của Word
    for fam_id, fam_files in word_docs_by_family.items():
        # Kiểm tra xem có file nào được override trong registry là IN_USE không
        has_registry_in_use = any(
            rec_registry.get(wf["clean_rel_path"], {}).get("usage_status") == "IN_USE"
            for wf in fam_files
        )

        # Sắp xếp các file trong family theo rank giảm dần
        fam_files.sort(key=lambda x: (
            1 if x["clean_rel_path"] in rec_registry and rec_registry[x["clean_rel_path"]].get("usage_status") == "IN_USE" else 0,
            x["version_rank"]
        ), reverse=True)

        # Kiểm tra xem trong family này có bản đã chuyển đổi (G7 chuẩn) hay không
        converted_doc = None
        for wf in fam_files:
            fn = wf["file_name"]
            if "G7." in fn or "_03_" in fn or "_02_" in fn or (wf["clean_rel_path"] in rec_registry and rec_registry[wf["clean_rel_path"]].get("processing_status") in ["CONVERTED", "EDITED"]):
                converted_doc = wf
                break

        for idx, wf in enumerate(fam_files):
            wf_path = wf["clean_rel_path"]
            reg_entry = rec_registry.get(wf_path)

            if reg_entry:
                # Ưu tiên dữ liệu đã lưu trong registry
                proc_status = reg_entry.get("processing_status")
                if not proc_status:
                    if wf == converted_doc or "G7." in wf["file_name"] or "_0" in wf["file_name"]:
                        proc_status = "CONVERTED"
                    else:
                        proc_status = "UNEDITED"
                usage_status = reg_entry.get("usage_status") or ("IN_USE" if idx == 0 else "NOT_IN_USE")
                is_curr = (usage_status == "IN_USE")
            else:
                if converted_doc:
                    # Nếu family đã có bản chuyển đổi
                    if wf == converted_doc or (not has_registry_in_use and idx == 0):
                        proc_status = "CONVERTED"
                        usage_status = "IN_USE"
                        is_curr = True
                    else:
                        # Bản gốc/cũ của family: Chưa chỉnh sửa, Không sử dụng
                        proc_status = "UNEDITED"
                        usage_status = "NOT_IN_USE"
                        is_curr = False
                else:
                    # Chưa từng chuyển đổi: Chưa chỉnh sửa, file đầu tiên IN_USE
                    proc_status = "UNEDITED"
                    usage_status = "IN_USE"
                    is_curr = (idx == 0)

            wf["processing_status"] = proc_status
            wf["usage_status"] = usage_status
            wf["is_current"] = is_curr
            wf["is_latest"] = is_curr and (usage_status == "IN_USE")

    # Xử lý tất cả các file trong all_files (bao gồm Excel, PDF, Word không tồn tại, v.v.)
    word_doc_map = {wf["clean_rel_path"]: wf for fam_list in word_docs_by_family.values() for wf in fam_list}
    all_word_docs: List[Dict[str, Any]] = []

    for f in all_files:
        clean_rel = f.get("clean_rel_path") or normalize_rel_path(f.get("relative_path", "")).replace(os.sep, '/')
        if clean_rel in word_doc_map:
            # Sao chép các thuộc tính đã tính toán từ word_doc_map
            wf = word_doc_map[clean_rel]
            f["processing_status"] = wf["processing_status"]
            f["usage_status"] = wf["usage_status"]
            f["is_current"] = wf["is_current"]
            f["is_latest"] = wf["is_latest"]
            f["version_rank"] = wf.get("version_rank", 0)
            f["is_main_procedure"] = wf.get("is_main_procedure", False)
            all_word_docs.append(f)
        else:
            reg_entry = rec_registry.get(clean_rel)
            if reg_entry:
                f["processing_status"] = reg_entry.get("processing_status", "UNEDITED")
                f["usage_status"] = reg_entry.get("usage_status", "IN_USE")
                f["is_current"] = (f["usage_status"] == "IN_USE")
                f["is_latest"] = f["is_current"]
            else:
                f["processing_status"] = "UNEDITED"
                f["usage_status"] = "IN_USE"
                f["is_current"] = True
                f["is_latest"] = True

        # Gán nhãn hiển thị trực quan cho UI
        p_status = f.get("processing_status", "UNEDITED")
        if p_status == "CONVERTED":
            f["processing_status_label"] = "Đã chuyển đổi"
        elif p_status == "EDITED":
            f["processing_status_label"] = "Đã chỉnh sửa"
        else:
            f["processing_status"] = "UNEDITED"
            f["processing_status_label"] = "Chưa chỉnh sửa"

        u_status = f.get("usage_status", "IN_USE")
        if u_status == "IN_USE":
            f["usage_status_label"] = "Đang sử dụng"
            f["version_status"] = "CURRENT"
            f["status_label"] = "Đang sử dụng"
        else:
            f["usage_status_label"] = "Không sử dụng"
            f["version_status"] = "SUPERSEDED"
            f["status_label"] = "Không sử dụng"

    # Đồng bộ trạng thái xử lý và trạng thái sử dụng cho tất cả các file trong child_documents
    for cd in child_documents:
        for cf in cd.get("files", []):
            cf_clean = cf.get("clean_rel_path") or normalize_rel_path(cf.get("relative_path", "")).replace(os.sep, '/')
            if cf_clean in word_doc_map:
                wf = word_doc_map[cf_clean]
                cf["processing_status"] = wf.get("processing_status", "UNEDITED")
                cf["usage_status"] = wf.get("usage_status", "IN_USE")
                cf["is_current"] = wf.get("is_current", True)
                cf["is_latest"] = wf.get("is_latest", True)
            elif cf.get("processing_status") is None:
                reg_e = rec_registry.get(cf_clean)
                if reg_e:
                    cf["processing_status"] = reg_e.get("processing_status", "UNEDITED")
                    cf["usage_status"] = reg_e.get("usage_status", "IN_USE")
                else:
                    cf["processing_status"] = "UNEDITED"
                    cf["usage_status"] = "IN_USE"
                cf["is_current"] = (cf["usage_status"] == "IN_USE")
                cf["is_latest"] = cf["is_current"]

            cp_status = cf.get("processing_status", "UNEDITED")
            if cp_status == "CONVERTED":
                cf["processing_status_label"] = "Đã chuyển đổi"
            elif cp_status == "EDITED":
                cf["processing_status_label"] = "Đã chỉnh sửa"
            else:
                cf["processing_status"] = "UNEDITED"
                cf["processing_status_label"] = "Chưa chỉnh sửa"

            cu_status = cf.get("usage_status", "IN_USE")
            if cu_status == "IN_USE":
                cf["usage_status_label"] = "Đang sử dụng"
                cf["version_status"] = "CURRENT"
                cf["status_label"] = "Đang sử dụng"
            else:
                cf["usage_status_label"] = "Không sử dụng"
                cf["version_status"] = "SUPERSEDED"
                cf["status_label"] = "Không sử dụng"

    # Sắp xếp danh sách Word docs:
    # 1. Các file Đang sử dụng (IN_USE) lên trước, ưu tiên quy trình chính
    # 2. Các file Không sử dụng (NOT_IN_USE) xuống sau
    all_word_docs.sort(key=lambda x: (
        1 if x["usage_status"] == "IN_USE" else 0,
        1 if x.get("is_main_procedure") else 0,
        x.get("version_rank", 0)
    ), reverse=True)

    # Chọn selected_word_doc mặc định:
    # Ưu tiên tài liệu IN_USE thuộc quy trình chính, hoặc tài liệu IN_USE đầu tiên
    selected_doc = None
    for wd in all_word_docs:
        if wd["usage_status"] == "IN_USE":
            if wd.get("is_main_procedure") and not selected_doc:
                selected_doc = wd
                break
            elif not selected_doc:
                selected_doc = wd

    if not selected_doc and all_word_docs:
        selected_doc = all_word_docs[0]

    return {
        "files": all_files,
        "total_count": len(all_files),
        "found_count": sum(1 for f in all_files if f["exists"]),
        "missing_count": sum(1 for f in all_files if not f["exists"]),
        "word_documents": all_word_docs,
        "word_docs": all_word_docs,
        "selected_word_doc": selected_doc,
        "child_documents": child_documents
    }



def parse_docx_to_html_and_headings(abs_path: str) -> Dict[str, Any]:
    """
    Phân tích file Word .docx thành HTML có cấu trúc và danh sách Mục lục (Headings).
    Giữ nguyên tối đa bảng biểu, định dạng, font chữ và hình ảnh embedded (dưới dạng Base64).
    """
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"Không tìm thấy file: {abs_path}")

    doc = docx.Document(abs_path)

    headings: List[Dict[str, Any]] = []
    html_parts: List[str] = []
    heading_counter = 1

    # Map các hình ảnh embedded trong document thành data uri Base64
    image_map = {}
    for rel_id, rel in doc.part.related_parts.items():
        if "image" in rel.content_type:
            try:
                b64_data = base64.b64encode(rel.blob).decode('utf-8')
                image_map[rel_id] = f"data:{rel.content_type};base64,{b64_data}"
            except Exception as e:
                print(f"Error encoding image {rel_id}: {e}")

    p_counter = 0
    t_counter = 0
    # Duyệt các phần tử theo thứ tự thực tế trong document body
    for child in doc.element.body:
        if isinstance(child, CT_P):
            p = Paragraph(child, doc)
            curr_p_idx = p_counter
            p_counter += 1
            text_val = p.text.strip()
            style_name = (p.style.name if p.style else "").lower()

            # Kiểm tra xem đoạn văn có phải là Heading không
            is_heading = False
            heading_level = 1

            # 1. Nhận diện từ style Word gốc: Heading 1, Heading 2, Heading 3...
            m_style = re.search(r'heading\s*(\d+)', style_name)
            if m_style:
                is_heading = True
                heading_level = min(int(m_style.group(1)), 4)

            # 2. Nhận diện từ OpenXML outlineLvl
            if not is_heading:
                outline_nodes = p._p.xpath('.//w:outlineLvl')
                if outline_nodes:
                    try:
                        lvl_val = int(outline_nodes[0].get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}val') or outline_nodes[0].get('val'))
                        is_heading = True
                        heading_level = min(lvl_val + 1, 4)
                    except:
                        pass

            # Kiểm tra xem đoạn văn có chứa ngắt trang (Page Break) không
            has_page_break = bool(p._p.xpath('.//w:br[@w:type="page"]') or p.paragraph_format.page_break_before)
            if has_page_break:
                html_parts.append('<div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---</span></div>')

            # 3. Nhận diện bổ sung có chọn lọc (chỉ áp dụng cho tiêu đề thực sự có độ dài hợp lý <= 90 ký tự)
            if not is_heading and text_val and len(text_val) <= 90:
                is_all_bold = (len(p.runs) > 0 and all(r.bold for r in p.runs if r.text.strip()))
                ISO_KEYWORDS = [
                    'MỤC ĐÍCH', 'PHẠM VI ÁP DỤNG', 'PHẠM VI', 'TÀI LIỆU THAM KHẢO', 'TÀI LIỆU VIỆN DẪN',
                    'ĐỊNH NGHĨA', 'ĐỊNH NGHĨA', 'CHỮ VIẾT TẮT', 'CHỮ VIẾT TẮT', 'TỪ VIẾT TẮT',
                    'NỘI DUNG', 'LƯU ĐỒ QUY TRÌNH', 'LƯU ĐỒ', 'BIỂU MẪU', 'PHỤ LỤC', 'HỒ SƠ LƯU TRỮ',
                    'LƯU HỒ SƠ', 'HỒ SƠ, BIỂU MẪU', 'HỒ SƠ BIỂU MẪU', 'NGUYÊN TẮC', 'QUY ĐỊNH CHUNG',
                    'CAM KẾT VÀ THỰC HIỆN', 'BIỆN PHÁP', 'VAI TRÒ VÀ TRÁCH NHIỆM'
                ]
                clean_txt = re.sub(r'^\d+[\.\:]\s*', '', text_val).strip().upper()
                
                # 3.0 Nhận diện phần 2: THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU
                if "THEO DÕI SỬA ĐỔI" in text_val.upper() or clean_txt.startswith('THEO DÕI'):
                    is_heading = True
                    heading_level = 1
                # 3.1 Tiêu đề quy trình chuẩn ISO (1. MỤC ĐÍCH, 2. PHẠM VI ÁP DỤNG...)
                elif any(clean_txt.startswith(kw) for kw in ISO_KEYWORDS):
                    is_heading = True
                    heading_level = 1
                # 3.2 Tiêu đề mục viết hoa toàn bộ có đánh số (1. QUY ĐỊNH CHUNG, I. NGUYÊN TẮC)
                elif re.match(r'^(\d+|[IVXLCDM]+)[\.\:]\s+[A-ZÀ-Ỹ\s\/\:\-]+$', text_val):
                    is_heading = True
                    heading_level = 2 if re.match(r'^\d+\.\d+', text_val) else 1
                # 3.3 Tiêu đề điều khoản pháp luật ngắn (Điều 38. Tổ chức hội đồng...)
                elif re.match(r'^(Điều|Article)\s+\d+[\.\:]\s+[A-ZÀ-Ỹa-zà-ỹ\s]+', text_val) and len(text_val) <= 75:
                    is_heading = True
                    heading_level = 2
                # 3.4 Tiêu đề in đậm viết hoa nổi bật (dưới 12 từ)
                elif is_all_bold and text_val.isupper() and len(text_val.split()) <= 12:
                    is_heading = True
                    heading_level = 1

            # Chuẩn hóa: Nếu là mục lớn '1. MỤC ĐÍCH', '2. PHẠM VI'... luôn gán level 1
            if is_heading and re.match(r'^[1-9]\.\s+[A-ZÀ-Ỹ]', text_val):
                heading_level = 1

            if is_heading and text_val:
                heading_id = f"iso-heading-{heading_counter}"
                heading_counter += 1
                headings.append({
                    "id": heading_id,
                    "title": text_val,
                    "level": heading_level
                })
                h_tag = f"h{min(heading_level, 4)}"
                html_parts.append(
                    f'<{h_tag} id="{heading_id}" data-p-idx="{curr_p_idx}" class="iso-doc-heading level-{heading_level}">{clean_html_text(text_val)}</{h_tag}>'
                )
            elif text_val:
                # Đoạn văn bản thông thường
                p_html = render_paragraph_runs(p, image_map)
                html_parts.append(f'<p class="iso-doc-paragraph" data-p-idx="{curr_p_idx}">{p_html}</p>')
            else:
                html_parts.append(f'<p class="iso-doc-paragraph empty-p" data-p-idx="{curr_p_idx}"><br/></p>')

        elif isinstance(child, CT_Tbl):
            tbl = Table(child, doc)
            curr_t_idx = t_counter
            t_counter += 1
            tbl_html = render_table_to_html(tbl, image_map, table_idx=curr_t_idx)
            
            # Nếu là Bảng đầu tiên (Table 0) chứa tiêu đề bìa hoặc trách nhiệm ký duyệt -> Trang bìa (Phần 1)
            if curr_t_idx == 0:
                t0_text = "".join([c.text for row in tbl.rows for c in row.cells]).upper()
                if any(k in t0_text for k in ["VINA G7", "QUY TRÌNH", "TRÁCH NHIỆM", "BIÊN SOẠN", "PHÊ DUYỆT"]):
                    # Ghi nhận mục Trang bìa lên đầu danh sách Headings
                    headings.insert(0, {
                        "id": "iso-heading-cover-page",
                        "title": "Trang bìa",
                        "level": 1
                    })
                    tbl_html = f'<div id="iso-heading-cover-page" class="iso-doc-cover-section">{tbl_html}</div>'

            html_parts.append(tbl_html)

    # Kiểm tra xem tài liệu đã có Bìa chuẩn (Table 0) và Bảng Theo dõi sửa đổi (Table 1) chưa
    has_standard_cover = any(h.get("id") == "iso-heading-cover-page" for h in headings)
    has_rev_log = any("THEO DÕI SỬA ĐỔI" in h.get("title", "").upper() for h in headings)

    # NẾU TÀI LIỆU CHƯA CÓ TRANG BÌA HOẶC THEO DÕI SỬA ĐỔI -> CẮT GỐC 2 TRANG ĐÓ TỪ MẪU QUY TRÌNH.DOCX GHÉP VÀO ĐẦU
    if not has_standard_cover or not has_rev_log:
        try:
            candidates = [
                os.path.join(WORKSPACE_ROOT, "BackEnd", "templates", "Mẩu quy trình.docx"),
                os.path.join(WORKSPACE_ROOT, "BackEnd", "templates", "Mẫu quy trình.docx"),
                os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\Administrator"), "Downloads", "Mẩu quy trình.docx"),
                os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\Administrator"), "Downloads", "Mẫu quy trình.docx"),
                os.path.join(BASE_ISO_DIR, "templates", "Mẩu quy trình.docx"),
                os.path.join(BASE_ISO_DIR, "templates", "Mẫu quy trình.docx"),
            ]
            tpl_path = next((c for c in candidates if os.path.isfile(c)), None)
            if tpl_path and os.path.exists(tpl_path):
                tpl_doc = docx.Document(tpl_path)
                tpl_img_map = {}
                for r_id, rel in tpl_doc.part.related_parts.items():
                    if "image" in rel.content_type:
                        try:
                            b64_data = base64.b64encode(rel.blob).decode('utf-8')
                            tpl_img_map[r_id] = f"data:{rel.content_type};base64,{b64_data}"
                        except Exception:
                            tpl_img_map[r_id] = get_vina_g7_logo_base64()

                prepended_html = []
                # Cắt Trang bìa gốc (Table 0)
                if not has_standard_cover and len(tpl_doc.tables) > 0:
                    tpl_t0 = tpl_doc.tables[0]
                    t0_rendered = render_table_to_html(tpl_t0, tpl_img_map, table_idx=0)
                    
                    # Thay thế [Tên quy trình] bằng tên tệp hoặc tiêu đề tài liệu nếu có
                    base_fname = os.path.splitext(os.path.basename(abs_path))[0]
                    if base_fname:
                        t0_rendered = t0_rendered.replace('[Tên quy trình]', base_fname.strip().upper())

                    prepended_html.append(
                        f'<div id="iso-heading-cover-page" class="iso-doc-cover-section">{t0_rendered}</div>'
                        f'<div class="iso-doc-page-break-divider"><span>--- Ngắt trang (Trang bìa) ---</span></div>'
                    )
                    headings.insert(0, {
                        "id": "iso-heading-cover-page",
                        "title": "Trang bìa",
                        "level": 1
                    })

                # Cắt Trang 2 gốc: THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU (Heading + Table 1)
                if not has_rev_log and len(tpl_doc.tables) > 1:
                    tpl_t1 = tpl_doc.tables[1]
                    t1_rendered = render_table_to_html(tpl_t1, tpl_img_map, table_idx=1)
                    prepended_html.append(
                        f'<div id="heading-iso-rev-log-wrapper">'
                        f'<h1 id="heading-iso-rev-log" class="iso-doc-heading level-1">THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU</h1>'
                        f'{t1_rendered}</div>'
                        f'<div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---</span></div>'
                    )
                    insert_idx = 1 if not has_standard_cover else 0
                    headings.insert(insert_idx, {
                        "id": "heading-iso-rev-log",
                        "title": "THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU",
                        "level": 1
                    })

                if prepended_html:
                    html_parts = prepended_html + html_parts
        except Exception as e_cut:
            print(f"[parse_docx] Cảnh báo cắt 2 trang gốc từ template: {e_cut}")

    # Hiển thị chân trang (Footer) để người dùng có thể xem và chỉnh sửa metadata trực tiếp trong Word Editor
    for sec_idx, sec in enumerate(doc.sections):
        footer_paras = [p.text.strip() for p in sec.footer.paragraphs if p.text.strip()]
        if footer_paras:
            footer_text = " | ".join(footer_paras)
            html_parts.append(
                f'<div class="iso-doc-footer-wrapper" data-footer-sec="{sec_idx}">'
                f'<p class="iso-doc-footer-paragraph"><strong>[Chân trang / Footer]:</strong> {clean_html_text(footer_text)}</p>'
                f'</div>'
            )

    full_html = "\n".join(html_parts)
    return {
        "headings": headings,
        "html_content": full_html,
        "html": full_html,
        "total_headings": len(headings),
        "total_paragraphs": len(doc.paragraphs),
        "total_tables": len(doc.tables)
    }


def get_template_original_2_pages_data(
    doc_title: Optional[str] = None,
    issuer: Optional[str] = None,
    approver: Optional[str] = None,
    doc_code: Optional[str] = None,
    issue_date: Optional[str] = None,
    version: Optional[str] = None,
    revision_logs: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Trích xuất chuẩn xác 100% 2 trang đầu gốc từ 'Mẩu quy trình.docx':
    - Trang 1: Trang bìa (Table 0) với logo VINA G7, bảng 5 cột, tên tài liệu và bảng ký duyệt biên soạn/phê duyệt.
    - Trang 2: Bảng THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU (Heading + Table 1) 23 hàng chuẩn.
    """
    candidates = [
        os.path.join(WORKSPACE_ROOT, "BackEnd", "templates", "Mẩu quy trình.docx"),
        os.path.join(WORKSPACE_ROOT, "BackEnd", "templates", "Mẫu quy trình.docx"),
        os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\Administrator"), "Downloads", "Mẩu quy trình.docx"),
        os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\Administrator"), "Downloads", "Mẫu quy trình.docx"),
    ]
    tpl_path = next((c for c in candidates if os.path.isfile(c)), None)
    if not tpl_path or not os.path.exists(tpl_path):
        raise FileNotFoundError("Không tìm thấy tệp Mẩu quy trình.docx mẫu")

    tpl_doc = docx.Document(tpl_path)
    tpl_img_map = {}
    for r_id, rel in tpl_doc.part.related_parts.items():
        if "image" in rel.content_type:
            try:
                b64_data = base64.b64encode(rel.blob).decode('utf-8')
                tpl_img_map[r_id] = f"data:{rel.content_type};base64,{b64_data}"
            except Exception:
                tpl_img_map[r_id] = get_vina_g7_logo_base64()

    # 1. Trang bìa (Table 0)
    t0_rendered = render_table_to_html(tpl_doc.tables[0], tpl_img_map, table_idx=0)
    if doc_title and doc_title.strip():
        clean_t = doc_title.strip().upper()
        t0_rendered = t0_rendered.replace('[Tên quy trình]', clean_t)

    # Bóc tách thông minh Biên soạn (Họ tên & Chức vụ)
    iss_name = ""
    iss_role = "Biên soạn"
    if issuer and issuer.strip():
        raw_iss = issuer.strip()
        m_paren = re.search(r'^(.*?)\s*[\(\:]\s*(.*?)\)?$', raw_iss)
        if m_paren and m_paren.group(2).strip():
            iss_role = m_paren.group(1).strip() or "Biên soạn"
            iss_name = m_paren.group(2).strip().rstrip(')')
        else:
            iss_name = raw_iss
    t0_rendered = t0_rendered.replace('[Họ tên người biên soạn]', iss_name or '&nbsp;')
    t0_rendered = t0_rendered.replace('[CV NBS]', iss_role)

    # Bóc tách thông minh Phê duyệt (Họ tên & Chức vụ)
    app_name = ""
    app_role = "Phê duyệt"
    if approver and approver.strip():
        raw_app = approver.strip()
        m_paren = re.search(r'^(.*?)\s*[\(\:]\s*(.*?)\)?$', raw_app)
        if m_paren and m_paren.group(2).strip():
            app_role = m_paren.group(1).strip()
            app_name = m_paren.group(2).strip().rstrip(')')
        elif any(k in raw_app.lower() for k in ["giám đốc", "phó tổng", "tổng giám", "trưởng phòng", "bgd", "tgđ"]):
            app_role = raw_app
            app_name = ""
        else:
            app_name = raw_app
    t0_rendered = t0_rendered.replace('[Họ tên người phê duyệt]', app_name or '&nbsp;')
    t0_rendered = t0_rendered.replace('[CV NPD]', app_role)

    cover_html = (
        f'<div id="iso-heading-cover-page" class="iso-doc-cover-section" style="margin-bottom: 24px;">\n'
        f'{t0_rendered}\n'
        f'<div class="iso-doc-page-break-divider"><span>--- Ngắt trang (Trang bìa) ---</span></div>\n'
        f'</div>'
    )

    # 2. Trang 2: Theo dõi sửa đổi (Heading + Table 1)
    t1_rendered = render_table_to_html(tpl_doc.tables[1], tpl_img_map, table_idx=1)

    eff_date = issue_date or "18/06/2026"
    eff_ver = version or "01"

    parsed_logs = []
    if isinstance(revision_logs, str):
        try:
            parsed_logs = json.loads(revision_logs)
        except Exception:
            parsed_logs = []
    elif isinstance(revision_logs, list):
        parsed_logs = revision_logs

    if not parsed_logs:
        parsed_logs = [{
            "seq_no": eff_ver,
            "rev_date": eff_date,
            "content": "Ban hành lần đầu",
            "page_no": "Toàn bộ"
        }]

    # Dựng 22 hàng dữ liệu chuẩn theo Mẩu quy trình.docx (nạp các dòng nhật ký thực tế + các dòng trống còn lại)
    total_rows = 22
    tbody_rows = []
    for r_idx in range(total_rows):
        if r_idx < len(parsed_logs):
            item = parsed_logs[r_idx]
            seq_val = str(item.get("seq_no", r_idx + 1)).zfill(2)
            date_val = clean_html_text(str(item.get("rev_date") or eff_date))
            content_val = clean_html_text(str(item.get("content") or "Cập nhật nội dung quy trình"))
            page_val = clean_html_text(str(item.get("page_no") or "Toàn bộ"))
            tbody_rows.append(
                f'<tr style="height:28px;">\n'
                f'  <td style="border:1px solid #000000; padding:4px 6px; text-align:center; font-size:9.5pt; color:#0D0D0D;">{seq_val}</td>\n'
                f'  <td style="border:1px solid #000000; padding:4px 6px; text-align:center; font-size:9.5pt; color:#0D0D0D;">{date_val}</td>\n'
                f'  <td style="border:1px solid #000000; padding:4px 8px; text-align:left; font-size:9.5pt; color:#0D0D0D;">{content_val}</td>\n'
                f'  <td style="border:1px solid #000000; padding:4px 6px; text-align:center; font-size:9.5pt; color:#0D0D0D;">{page_val}</td>\n'
                f'</tr>'
            )
        else:
            tbody_rows.append(
                f'<tr style="height:28px;">\n'
                f'  <td style="border:1px solid #000000; padding:4px 6px; text-align:center;">&nbsp;</td>\n'
                f'  <td style="border:1px solid #000000; padding:4px 6px; text-align:center;">&nbsp;</td>\n'
                f'  <td style="border:1px solid #000000; padding:4px 8px;">&nbsp;</td>\n'
                f'  <td style="border:1px solid #000000; padding:4px 6px; text-align:center;">&nbsp;</td>\n'
                f'</tr>'
            )

    rows_html = "\n".join(tbody_rows)
    t1_rendered = (
        f'<div class="iso-doc-table-wrapper" data-t-idx="1" style="width:100%; max-width:100%; overflow-x:auto; margin:12px 0;">\n'
        f'<table class="iso-doc-table" data-t-idx="1" style="width:100%; max-width:100%; border-collapse:collapse; table-layout:fixed; border:1.5px solid #000000;">\n'
        f'  <colgroup>\n'
        f'    <col style="width:12.5%;" />\n'
        f'    <col style="width:14.3%;" />\n'
        f'    <col style="width:50.3%;" />\n'
        f'    <col style="width:22.9%;" />\n'
        f'  </colgroup>\n'
        f'  <thead>\n'
        f'    <tr style="background-color: #F8FAFC; font-weight: bold; text-align: center; height:34px;">\n'
        f'      <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:10pt; color:#0D0D0D;">Số TT</th>\n'
        f'      <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:10pt; color:#0D0D0D;">Ngày Sửa</th>\n'
        f'      <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:10pt; color:#0D0D0D;">Nội Dung Sửa Đổi</th>\n'
        f'      <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:10pt; color:#0D0D0D;">Trang Số</th>\n'
        f'    </tr>\n'
        f'  </thead>\n'
        f'  <tbody>\n'
        f'{rows_html}\n'
        f'  </tbody>\n'
        f'</table>\n'
        f'</div>'
    )

    rev_log_html = (
        f'<div id="heading-iso-rev-log-wrapper" style="margin-bottom: 24px;">\n'
        f'<h1 id="heading-iso-rev-log" class="iso-doc-heading level-1">THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU</h1>\n'
        f'{t1_rendered}\n'
        f'<div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---</span></div>\n'
        f'</div>'
    )

    return {
        "success": True,
        "cover_html": cover_html,
        "rev_log_html": rev_log_html,
        "full_2_pages_html": f"{cover_html}\n{rev_log_html}",
        "headings": [
            {"id": "iso-heading-cover-page", "title": "Trang bìa", "level": 1},
            {"id": "heading-iso-rev-log", "title": "THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU", "level": 1}
        ]
    }


def clean_html_text(text: str) -> str:
    """Escape ký tự HTML đặc biệt để chống XSS."""
    return (
        text.replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&#39;')
    )


def render_paragraph_runs(p: Paragraph, image_map: Dict[str, str]) -> str:
    """Render các Run trong Paragraph, hỗ trợ bold, italic, underline, màu sắc và ảnh."""
    runs_html = []
    
    # Kiểm tra ảnh inline trong paragraph
    for r in p.runs:
        run_text = clean_html_text(r.text)
        # Chuyển đổi các chuỗi xuống dòng hoặc <br/> từ text thành thẻ HTML <br/> thực thụ
        run_text = (
            run_text.replace('&lt;br/&gt;', '<br/>')
                    .replace('&lt;br&gt;', '<br/>')
                    .replace('&lt;br /&gt;', '<br/>')
                    .replace('\n', '<br/>')
        )

        # Trích xuất ảnh nếu có
        try:
            blips = r._r.xpath('.//a:blip')
            for blip in blips:
                r_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                img_src = image_map.get(r_id) if (r_id and r_id in image_map) else None
                if not img_src and r_id:
                    img_src = get_vina_g7_logo_base64()
                if img_src:
                    runs_html.append(f'<img src="{img_src}" class="iso-doc-inline-img" alt="Logo VINA G7" style="max-height:85px; max-width:100%; display:block; margin:0 auto; object-fit:contain;" />')
        except:
            pass

        if not run_text:
            continue

        if r.bold:
            run_text = f"<strong>{run_text}</strong>"
        if r.italic:
            run_text = f"<em>{run_text}</em>"
        if r.underline:
            run_text = f"<u>{run_text}</u>"

        runs_html.append(run_text)

    fallback_text = clean_html_text(p.text).replace('&lt;br/&gt;', '<br/>').replace('&lt;br&gt;', '<br/>').replace('\n', '<br/>')
    return "".join(runs_html) or fallback_text


def render_cell_paragraphs(cell: Any, image_map: Dict[str, str]) -> str:
    """Render toàn bộ các đoạn văn và ảnh trong một ô bảng Word chuẩn xác."""
    parts = []
    
    # Kiểm tra xem ô có ảnh embedded (như logo) không
    blips = cell._tc.xpath('.//a:blip')
    cell_imgs = []
    for blip in blips:
        r_id = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
        img_src = image_map.get(r_id) if (r_id and r_id in image_map) else None
        if not img_src and r_id:
            img_src = get_vina_g7_logo_base64()
        if img_src:
            cell_imgs.append(f'<img src="{img_src}" class="iso-doc-inline-img" alt="Logo VINA G7" style="max-width:100%; max-height:85px; display:block; margin:0 auto; object-fit:contain;" />')

    for p in cell.paragraphs:
        align_css = ""
        if p.alignment == 1:
            align_css = "text-align: center;"
        elif p.alignment == 2:
            align_css = "text-align: right;"
        elif p.alignment == 3:
            align_css = "text-align: justify;"
        
        p_html = render_paragraph_runs(p, image_map)
        
        style_attr = f' style="{align_css}"' if align_css else ""
        if p_html.strip():
            parts.append(f'<p class="iso-cell-paragraph"{style_attr}>{p_html}</p>')

    # Nếu ô có ảnh mà chưa được render trong p.runs (do nằm ngoài run)
    if cell_imgs and not any('<img' in part for part in parts):
        for img_tag in cell_imgs:
            parts.insert(0, f'<p class="iso-cell-paragraph" style="text-align:center;">{img_tag}</p>')

    if not parts:
        return "&nbsp;"
    return "".join(parts)


def render_table_to_html(tbl: Table, image_map: Dict[str, str], table_idx: int = 0) -> str:
    """
    Chuyển đổi bảng docx sang thẻ HTML <table> chuẩn với style thẩm mỹ Microsoft Word / ERP G7:
    - Bảo toàn 100% cấu trúc ô gộp (colspan, rowspan) theo OpenXML gridSpan & vMerge
    - Bảo toàn logo / ảnh embedded trong ô
    - Bảo toàn văn bản in đậm, căn lề, đoạn văn mà không làm vỡ bố cục
    - Giới hạn bảng vừa vặn 100% khổ giấy A4, không tràn ra nền xám
    """
    if not tbl.rows or not tbl.columns:
        return ""

    n_rows = len(tbl.rows)
    n_cols = len(tbl.columns)

    # 1. Độ rộng tương đối của các cột
    col_widths = []
    for col in tbl.columns:
        w = col.width or 0
        col_widths.append(w)
    total_w = sum(col_widths) or 1
    col_pcts = [max(5, round((w / total_w) * 100, 1)) if total_w > 0 else round(100 / n_cols, 1) for w in col_widths]

    # Ma trận _tc xác định ô gộp
    grid = [[tbl.rows[r].cells[c]._tc for c in range(n_cols)] for r in range(n_rows)]
    visited = set()

    html = [
        f'<div class="iso-doc-table-wrapper" data-t-idx="{table_idx}" style="width:100%; max-width:100%; overflow-x:auto; margin:12px 0;">',
        f'  <table class="iso-doc-table" data-t-idx="{table_idx}" style="width:100%; max-width:100%; border-collapse:collapse; table-layout:fixed; border:1.5px solid #000000;">'
    ]

    html.append('    <colgroup>')
    for pct in col_pcts:
        html.append(f'      <col style="width:{pct}%;" />')
    html.append('    </colgroup>')

    for r in range(n_rows):
        is_header = (r == 0 and n_rows > 1)
        row_obj = tbl.rows[r]
        row_style = ""
        try:
            tr_h_node = row_obj._tr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}trPr/{http://schemas.openxmlformats.org/wordprocessingml/2006/main}trHeight')
            if tr_h_node is not None:
                val_attr = tr_h_node.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') or tr_h_node.get('val')
                if val_attr and val_attr.isdigit():
                    px_val = int(int(val_attr) * 96 / 1440)
                    if px_val > 15:
                        row_style = f' style="height:{px_val}px; min-height:{px_val}px;"'
        except Exception:
            pass

        html.append(f"    <tr{row_style}>")
        c = 0
        while c < n_cols:
            if (r, c) in visited:
                c += 1
                continue
            
            tc = grid[r][c]
            # Tính colspan
            colspan = 1
            while c + colspan < n_cols and grid[r][c + colspan] == tc:
                colspan += 1
            
            # Tính rowspan
            rowspan = 1
            while r + rowspan < n_rows and all(grid[r + rowspan][c + k] == tc for k in range(colspan)):
                rowspan += 1
            
            for dr in range(rowspan):
                for dc in range(colspan):
                    visited.add((r + dr, c + dc))
            
            cell = tbl.rows[r].cells[c]
            tag = "th" if is_header else "td"
            
            span_attrs = []
            if colspan > 1:
                span_attrs.append(f'colspan="{colspan}"')
            if rowspan > 1:
                span_attrs.append(f'rowspan="{rowspan}"')
            span_str = (" " + " ".join(span_attrs)) if span_attrs else ""

            # Trích xuất nội dung ô (gồm các đoạn văn và ảnh)
            cell_inner_html = render_cell_paragraphs(cell, image_map)

            # Đảm bảo ô (0, 0) của Bìa chuẩn (Table 0) luôn luôn hiển thị logo VINA G7
            if table_idx == 0 and r == 0 and c == 0:
                logo_b64 = get_vina_g7_logo_base64()
                if '<img' not in cell_inner_html and logo_b64:
                    cell_inner_html = f'<p class="iso-cell-paragraph" style="text-align:center;"><img src="{logo_b64}" class="iso-doc-inline-img" alt="Logo VINA G7" style="max-height:85px; max-width:100%; display:block; margin:0 auto; object-fit:contain;" /></p>'
                elif '/vina_g7_logo.png' in cell_inner_html and logo_b64:
                    cell_inner_html = cell_inner_html.replace('/vina_g7_logo.png', logo_b64)

            valign_style = "vertical-align: middle;"
            html.append(f'      <{tag} data-r="{r}" data-c="{c}"{span_str} style="border:1px solid #000000; padding:6px 8px; {valign_style} word-break:break-word;">{cell_inner_html}</{tag}>')
            c += colspan
        html.append("    </tr>")

    html.append("  </table></div>")
    return "\n".join(html)


def get_openpyxl_color_hex(color_obj) -> Optional[str]:
    """Trích xuất mã màu Hex từ đối tượng màu openpyxl."""
    if not color_obj:
        return None
    try:
        if hasattr(color_obj, 'rgb') and isinstance(color_obj.rgb, str):
            rgb = color_obj.rgb
            if len(rgb) == 8:
                return '#' + rgb[2:]
            elif len(rgb) == 6:
                return '#' + rgb
    except Exception:
        pass
    return None


def format_excel_cell_value(val: Any, num_format: Optional[str]) -> str:
    """Định dạng giá trị ô bảng tính chuẩn và bảo toàn kiểu hiển thị."""
    if val is None:
        return ""
    if isinstance(val, (datetime.datetime, datetime.date)):
        fmt = (num_format or "").lower()
        if 'mmm-yy' in fmt or 'mm/yy' in fmt or 'm/y' in fmt or ('yy' in fmt and 'd' not in fmt):
            return val.strftime("%m/%Y")
        if hasattr(val, 'hour') and (val.hour != 0 or val.minute != 0 or val.second != 0):
            return val.strftime("%d/%m/%Y %H:%M")
        return val.strftime("%d/%m/%Y")
    if isinstance(val, float):
        if val.is_integer():
            return str(int(val))
        return f"{val:.2f}".rstrip('0').rstrip('.')
    return str(val)


def parse_excel_to_sheets_data(abs_path: str, max_rows: int = 250) -> Dict[str, Any]:
    """
    Đọc dữ liệu Excel (.xlsx, .xls) dưới dạng Spreadsheet Viewer thực thụ:
    - Bảo toàn cấu trúc ô gộp (merged_cells) với rowspan, colspan
    - Định dạng ngày tháng, số, văn bản chính xác
    - Trích xuất độ rộng cột (col_widths), chiều cao dòng
    - Trích xuất styles: font chữ, in đậm, màu chữ, căn lề, màu nền, đường viền
    - Hỗ trợ đa worksheet
    """
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"Không tìm thấy file: {abs_path}")

    wb = openpyxl.load_workbook(abs_path, data_only=True)
    sheets_data = {}

    for sname in wb.sheetnames:
        sheet = wb[sname]

        # 1. Map toàn bộ các vùng ô gộp (merged cells)
        merge_map = {}
        for rng in sheet.merged_cells.ranges:
            min_col, min_row, max_col, max_row = rng.bounds
            merge_map[(min_row, min_col)] = {
                "rowspan": max_row - min_row + 1,
                "colspan": max_col - min_col + 1,
                "hidden": False
            }
            for r in range(min_row, max_row + 1):
                for c in range(min_col, max_col + 1):
                    if (r, c) != (min_row, min_col):
                        merge_map[(r, c)] = {"hidden": True}

        # 2. Trích xuất độ rộng cột
        col_widths = []
        max_col_bound = min(sheet.max_column or 26, 40)
        for col_idx in range(1, max_col_bound + 1):
            col_letter = openpyxl.utils.get_column_letter(col_idx)
            dim = sheet.column_dimensions.get(col_letter)
            w = 95
            if dim and dim.width:
                w = max(55, min(360, int(dim.width * 8 + 12)))
            col_widths.append(w)

        # 3. Duyệt từng dòng và từng ô
        parsed_rows = []
        raw_headers = []
        raw_data_rows = []
        
        row_limit = min(sheet.max_row or 1, max_rows)
        for r_idx in range(1, row_limit + 1):
            row_cells = []
            raw_row_vals = []
            has_content = False

            for c_idx in range(1, max_col_bound + 1):
                cell = sheet.cell(row=r_idx, column=c_idx)
                val = cell.value
                fmt_val = format_excel_cell_value(val, cell.number_format)
                raw_row_vals.append(fmt_val)

                if val is not None and str(val).strip() != "":
                    has_content = True

                # Xử lý merge
                m_info = merge_map.get((r_idx, c_idx), {})
                is_hidden = m_info.get("hidden", False)
                rowspan = m_info.get("rowspan", 1)
                colspan = m_info.get("colspan", 1)

                # Xử lý styles
                is_bold = bool(cell.font and cell.font.bold)
                is_italic = bool(cell.font and cell.font.italic)
                font_size = float(cell.font.size) if (cell.font and cell.font.size) else None
                font_color = get_openpyxl_color_hex(cell.font.color) if cell.font else None
                
                align = "left"
                if cell.alignment and cell.alignment.horizontal:
                    align = cell.alignment.horizontal
                elif isinstance(val, (int, float)) and not isinstance(val, bool):
                    align = "right"

                valign = "middle"
                if cell.alignment and cell.alignment.vertical:
                    valign = cell.alignment.vertical

                bg_color = None
                if cell.fill and getattr(cell.fill, 'fill_type', None) in ('solid', 'patternFill'):
                    bg_color = get_openpyxl_color_hex(cell.fill.fgColor or cell.fill.start_color)

                has_border = bool(cell.border and (
                    getattr(cell.border.top, 'style', None) or
                    getattr(cell.border.bottom, 'style', None) or
                    getattr(cell.border.left, 'style', None) or
                    getattr(cell.border.right, 'style', None)
                ))

                row_cells.append({
                    "v": fmt_val,
                    "r": rowspan,
                    "c": colspan,
                    "h": is_hidden,
                    "b": is_bold,
                    "i": is_italic,
                    "s": font_size,
                    "color": font_color,
                    "bg": bg_color,
                    "al": align,
                    "va": valign,
                    "bd": has_border
                })

            if has_content or r_idx <= 8:
                parsed_rows.append(row_cells)
                if r_idx == 1:
                    raw_headers = raw_row_vals
                else:
                    raw_data_rows.append(raw_row_vals)

        sheets_data[sname] = {
            "name": sname,
            "headers": raw_headers,
            "rows": raw_data_rows,
            "cells_grid": parsed_rows,
            "col_widths": col_widths,
            "total_rows": len(parsed_rows),
            "total_cols": max_col_bound
        }

    return {
        "sheet_names": wb.sheetnames,
        "active_sheet": wb.sheetnames[0] if wb.sheetnames else "",
        "sheets": sheets_data
    }


def convert_word_to_pdf_preview(abs_path: str) -> Optional[str]:
    """
    Chuyển đổi file Word (.docx, .doc) sang file PDF bản xem trước chất lượng cao.
    Kiến trúc đa tầng (Multi-tier Word Engine):
    - Tầng 1: LibreOffice Headless (chạy độc lập, không cần MS Office).
    - Tầng 2: Microsoft Word COM native (win32com) khi cài trên Windows.
    - Bộ nhớ cache theo MD5 hash của (đường dẫn + mtime) để không chuyển đổi lặp lại.
    """
    if not os.path.exists(abs_path):
        return None

    import hashlib
    import subprocess
    import shutil

    mtime = os.path.getmtime(abs_path)
    cache_key = f"{abs_path}_{mtime}"
    pdf_filename = hashlib.md5(cache_key.encode("utf-8")).hexdigest() + ".pdf"
    pdf_cache_path = os.path.join(PREVIEW_CACHE_DIR, pdf_filename)

    # 1. Trả về từ cache nếu hợp lệ
    if os.path.exists(pdf_cache_path) and os.path.getsize(pdf_cache_path) > 0:
        return pdf_cache_path

    # 2. Tầng 1: Thử LibreOffice Headless
    libreoffice_bins = [
        os.environ.get("LIBREOFFICE_PATH"),
        os.environ.get("SOFFICE_PATH"),
        shutil.which("soffice"),
        shutil.which("libreoffice"),
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "/usr/bin/soffice",
        "/usr/bin/libreoffice"
    ]
    soffice_cmd = next((b for b in libreoffice_bins if b and os.path.exists(b)), None)

    if soffice_cmd:
        try:
            cmd = [
                soffice_cmd,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", PREVIEW_CACHE_DIR,
                abs_path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=40)
            if res.returncode == 0:
                base_name = os.path.splitext(os.path.basename(abs_path))[0]
                lo_output_pdf = os.path.join(PREVIEW_CACHE_DIR, f"{base_name}.pdf")
                if os.path.exists(lo_output_pdf):
                    if lo_output_pdf != pdf_cache_path:
                        if os.path.exists(pdf_cache_path):
                            os.remove(pdf_cache_path)
                        os.rename(lo_output_pdf, pdf_cache_path)
                    if os.path.exists(pdf_cache_path) and os.path.getsize(pdf_cache_path) > 0:
                        return pdf_cache_path
        except Exception as lo_err:
            print(f"[WordToPDF] LibreOffice conversion warning: {lo_err}")

    # 3. Tầng 2: Microsoft Word COM (Fallback an toàn trên Windows)
    try:
        import pythoncom
        import win32com.client

        pythoncom.CoInitialize()
        doc = None
        word = None
        try:
            word = win32com.client.DispatchEx("Word.Application")
            word.Visible = False
            word.DisplayAlerts = 0
            doc = word.Documents.Open(abs_path, ReadOnly=True, ConfirmConversions=False)
            if doc:
                # 17 = wdExportFormatPDF
                doc.ExportAsFixedFormat(pdf_cache_path, 17)
                doc.Close(False)
                doc = None
        finally:
            if doc:
                try:
                    doc.Close(False)
                except Exception:
                    pass
            if word:
                try:
                    word.Quit()
                except Exception:
                    pass
            pythoncom.CoUninitialize()

        if os.path.exists(pdf_cache_path) and os.path.getsize(pdf_cache_path) > 0:
            return pdf_cache_path
    except Exception as word_err:
        print(f"[WordToPDF] Word COM conversion failed: {word_err}")

    return None


def extract_pdf_bookmarks(abs_path: str) -> List[Dict[str, Any]]:
    """
    Trích xuất danh sách Bookmarks / Outline từ file PDF gốc bằng PyMuPDF (fitz).
    Trả về danh sách các mục: [{"title": str, "page": int, "level": int}]
    """
    if not os.path.exists(abs_path):
        return []
    try:
        import fitz
        doc = fitz.open(abs_path)
        toc = doc.get_toc() # list of [lvl, title, page, ...]
        bookmarks = []
        for item in toc:
            if len(item) >= 3:
                bookmarks.append({
                    "level": item[0],
                    "title": str(item[1]).strip(),
                    "page": item[2]
                })
        doc.close()
        return bookmarks
    except Exception as e:
        print(f"[PDF] Lỗi khi trích xuất bookmarks PDF: {e}")
        return []


def save_uploaded_file(
    file_bytes: bytes,
    original_filename: str,
    subfolder: str = "TÀI LIỆU TẢI LÊN",
    department: Optional[str] = None,
    management_group: Optional[str] = None,
    source_code: Optional[str] = None
) -> Tuple[str, str]:
    """
    Lưu file upload vào thư mục lưu trữ an toàn, tránh trùng tên và bảo toàn phiên bản.
    - Nếu có department và management_group: tự động lưu theo cấu trúc:
      Hồ sơ G7/<Phòng ban>/<Nhóm tài liệu quản lý>/[Mã hồ sơ/]
    - Nếu không có: fallback lưu vào subfolder trong BASE_ISO_DIR.
    Trả về (relative_path, abs_path).
    """
    if department and management_group:
        rel_dir, target_dir = resolve_record_storage_dir(
            department=department,
            management_group=management_group,
            source_code=source_code,
            create_if_missing=True
        )
    else:
        target_dir = os.path.join(BASE_ISO_DIR, subfolder)
        os.makedirs(target_dir, exist_ok=True)
        rel_dir = subfolder

    base, ext = os.path.splitext(original_filename)
    safe_base = sanitize_folder_name(base) or "tep_tin"
    clean_filename = f"{safe_base}{ext}"
    abs_path = os.path.join(target_dir, clean_filename)

    # Tránh ghi đè nếu trùng tên: thêm timestamp
    if os.path.exists(abs_path):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        clean_filename = f"{safe_base}_{timestamp}{ext}"
        abs_path = os.path.join(target_dir, clean_filename)

    with open(abs_path, "wb") as f:
        f.write(file_bytes)

    rel_path = f"{rel_dir}/{clean_filename}".replace('\\', '/')
    return rel_path, abs_path


def get_iso_procedure_template_path() -> Optional[str]:
    """
    Xác định đường dẫn file TEMPLATE chuẩn 'Mẫu quy trình.docx' trong hệ thống.
    """
    candidates = [
        os.path.join(WORKSPACE_ROOT, "BackEnd", "templates", "Mẫu quy trình.docx"),
        os.path.join(WORKSPACE_ROOT, "BackEnd", "templates", "Mẩu quy trình.docx"),
        os.path.join(WORKSPACE_ROOT, "..", "Chuyen doi file", "Mẩu quy trình.docx"),
        os.path.join(WORKSPACE_ROOT, "..", "Chuyen doi file", "Mẫu quy trình.docx"),
        os.path.join(BASE_ISO_DIR, "templates", "Mẫu quy trình.docx"),
        os.path.join(BASE_ISO_DIR, "templates", "Mẩu quy trình.docx")
    ]
    for c in candidates:
        if os.path.isfile(c):
            return os.path.abspath(c)

    # Tìm kiếm fallback trong WORKSPACE_ROOT và Chuyen doi file
    for search_dir in [os.path.join(WORKSPACE_ROOT, "BackEnd"), os.path.join(WORKSPACE_ROOT, "..")]:
        if os.path.isdir(search_dir):
            for root, _, files in os.walk(search_dir):
                if any(skip in root for skip in [".git", "node_modules", "preview_cache"]):
                    continue
                for f in files:
                    if f.endswith(".docx") and ("mẫu quy trình" in f.lower() or "mẩu quy trình" in f.lower()):
                        cand = os.path.join(root, f)
                        if os.path.isfile(cand):
                            return os.path.abspath(cand)

    return None


def validate_document_convertible(abs_path: str, record: Any = None) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Kiểm tra và xác định loại tài liệu trước khi transform.
    Nguyên tắc: Nếu file không phù hợp để chuyển thành Quy trình/Hướng dẫn/Chính sách/...
    thì không ép thành QT.
    """
    if not abs_path or not os.path.isfile(abs_path):
        return False, "Không tìm thấy tệp tin nguồn theo đường dẫn", {}

    _, ext = os.path.splitext(abs_path)
    if ext.lower() not in [".docx", ".doc"]:
        return False, f"Chỉ hỗ trợ chuyển đổi tệp Word (.docx, .doc). Định dạng hiện tại: '{ext}'", {}

    filename = os.path.basename(abs_path)
    fn_lower = unicodedata.normalize('NFC', filename).lower()

    # Nhận diện Biểu mẫu (BM), Checklist, Sổ theo dõi, Báo cáo, Đơn, Phiếu
    form_prefixes = ["-bm", "bm0", "bm1", "bm2", "bm-", "biểu mẫu", "checklist", "sổ ", "phiếu ", "báo cáo ", "biên bản ", "danh mục "]
    is_form = any(kw in fn_lower for kw in form_prefixes)

    if record and getattr(record, "classification", None) == "BIỂU MẪU":
        is_form = True

    # Từ khóa tài liệu thuộc nhóm Quy trình / Hướng dẫn / Chính sách / Quy định
    proc_keywords = ["quy trình", "qt", "hướng dẫn", "hd", "chính sách", "cs", "quy định", "quy chế", "sổ tay"]
    has_proc_kw = any(kw in fn_lower for kw in proc_keywords)

    if is_form and not has_proc_kw:
        return False, f"Tài liệu '{filename}' là Biểu mẫu / Bản ghi (không phải tài liệu Quy trình/Hướng dẫn/Chính sách). Hệ thống không ép chuyển đổi để đảm bảo tính toàn vẹn của hồ sơ ISO.", {
            "doc_type": "BIỂU_MẪU",
            "filename": filename
        }

    # Xác định loại tài liệu
    doc_type = "QUY_TRÌNH"
    if "hướng dẫn" in fn_lower or fn_lower.startswith("hd"):
        doc_type = "HƯỚNG_DẪN"
    elif "chính sách" in fn_lower or fn_lower.startswith("cs"):
        doc_type = "CHÍNH_SÁCH"
    elif "quy định" in fn_lower or "quy chế" in fn_lower:
        doc_type = "QUY_ĐỊNH"

    return True, "", {
        "doc_type": doc_type,
        "filename": filename,
        "ext": ext.lower()
    }


DEPARTMENT_MAPPING = {
    "CL": "Quản lý chất lượng",
    "KY": "Kỹ thuật",
    "KT": "Kế toán",
    "HC": "Hành chính Nhân sự",
    "SX": "Sản xuất",
    "KD": "Kinh doanh",
    "MH": "Mua hàng",
    "BT": "Bảo trì",
    "KH": "Kho"
}


def get_department_code(dept_name_or_code: str) -> str:
    """
    Chuyển tên phòng ban hoặc text sang mã 2 ký tự chuẩn G7 (CL, KY, KT, HC, SX...).
    Dùng trong Mã hiệu G7.XX.YYZZ.
    """
    if not dept_name_or_code:
        return "HC"
    val = str(dept_name_or_code).strip()
    val_upper = val.upper()
    if val_upper in DEPARTMENT_MAPPING:
        return val_upper

    val_lower = val.lower()
    if any(k in val_lower for k in ["hành chính", "nhân sự", "hcns", "hc", "c&b", "lao động", "tnxh", "bsci"]):
        return "HC"
    if any(k in val_lower for k in ["chất lượng", "qlcl", "qc", "qa", "kcs", "cl"]):
        return "CL"
    if any(k in val_lower for k in ["kỹ thuật", "ky thuat", "r&d", "ky"]):
        return "KY"
    if any(k in val_lower for k in ["kế toán", "ke toan", "tài chính", "kt"]):
        return "KT"
    if any(k in val_lower for k in ["sản xuất", "san xuat", "xưởng", "dây chuyền", "sx"]):
        return "SX"
    if any(k in val_lower for k in ["kinh doanh", "pkhkd", "bán hàng", "kd"]):
        return "KD"
    if any(k in val_lower for k in ["mua hàng", "thu mua", "nlvt", "mh"]):
        return "MH"
    if any(k in val_lower for k in ["bảo trì", "cơ điện", "pccc", "bt"]):
        return "BT"
    if any(k in val_lower for k in ["kho", "kho vận", "kh"]):
        return "KH"
    return "CL"


def get_department_name(dept_name_or_code: str) -> str:
    """
    Chuyển mã hoặc text sang tên phòng ban chuẩn đầy đủ tiếng Việt để hiển thị
    và ghi vào trường 'Bộ phận thực hiện' trong Word.
    CL = Quản lý chất lượng, KY = Kỹ thuật, KT = Kế toán, HC = Hành chính Nhân sự, SX = Sản xuất.
    """
    if not dept_name_or_code:
        return "Hành chính Nhân sự"
    val = str(dept_name_or_code).strip()
    val_upper = val.upper()
    if val_upper in DEPARTMENT_MAPPING:
        return DEPARTMENT_MAPPING[val_upper]
    code = get_department_code(val)
    return DEPARTMENT_MAPPING.get(code, val)


def compute_g7_doc_code(record: Any, old_code: str, abs_path: str = "") -> str:
    """
    Quy tắc sinh mã mới chuẩn G7: G7.XX.YYZZ
    XX: Mã phòng ban từ master list, folder mapping, metadata
        CL: Quản lý chất lượng
        KY: Kỹ thuật
        KT: Kế toán
        HC: Hành chính Nhân sự
        SX: Sản xuất
        KD: Kinh doanh
        MH: Mua hàng
        BT: Bảo trì
        KH: Kho
    YY: Loại tài liệu (QT: Quy trình, BM: Biểu mẫu, CS: Chính sách, QD: Quy định, HD: Hướng dẫn, QC: Quy chế)
    ZZ: Số thứ tự 2 chữ số (01, 02, ...)
    """
    if isinstance(record, str):
        dept_val = record
        group_val = ''
        doc_name_rec = ''
        src_code_rec = ''
    elif isinstance(record, dict):
        dept_val = record.get('department_in_charge', '')
        group_val = record.get('management_group', '')
        doc_name_rec = record.get('document_name', '')
        src_code_rec = record.get('source_code', '')
    else:
        dept_val = getattr(record, 'department_in_charge', '') or ''
        group_val = getattr(record, 'management_group', '') or ''
        doc_name_rec = getattr(record, 'document_name', '') or ''
        src_code_rec = getattr(record, 'source_code', '') or ''

    combined = f"{dept_val} {group_val} {abs_path} {old_code}".lower()

    if dept_val and dept_val.strip():
        xx = get_department_code(dept_val)
    else:
        xx = get_department_code(combined)

    # YY: Loại tài liệu
    doc_name = f"{doc_name_rec} {os.path.basename(abs_path)} {old_code}".lower()
    if any(k in doc_name for k in ["quy trình", "qt"]):
        yy = "QT"
    elif any(k in doc_name for k in ["biểu mẫu", "bm"]):
        yy = "BM"
    elif any(k in doc_name for k in ["chính sách", "cs"]):
        yy = "CS"
    elif any(k in doc_name for k in ["quy định", "qd"]):
        yy = "QD"
    elif any(k in doc_name for k in ["hướng dẫn", "hd"]):
        yy = "HD"
    elif any(k in doc_name for k in ["quy chế", "qc"]):
        yy = "QC"
    else:
        yy = "QT"

    # ZZ: Số thứ tự
    nums = re.findall(r'\d+', str(old_code or ""))
    if not nums:
        nums = re.findall(r'\d+', getattr(record, 'source_code', '') or "")
    if not nums:
        nums = re.findall(r'\d+', os.path.basename(abs_path))
    zz = nums[0].zfill(2) if nums else "01"

    return f"G7.{xx}.{yy}{zz}"


def compute_edition(record: Any) -> Tuple[str, str]:
    """
    Quy tắc lần ban hành:
    01 -> 02
    02 -> 03
    03 -> 04
    Nếu không tìm thấy lần ban hành cũ -> AFTER = 02
    """
    ed_raw = str(getattr(record, 'edition', '') or '').strip()
    digits = re.findall(r'\d+', ed_raw)
    if digits:
        old_val = int(digits[0])
        new_val = old_val + 1
        return str(old_val).zfill(2), str(new_val).zfill(2)
    else:
        return "01", "02"


def compute_deterministic_issue_date(record_id: Any) -> str:
    """
    Ngày ban hành mới: trong khoảng 01/09/2026 -> 31/10/2026
    Deterministic theo record_id để re-process cùng file không tự đổi ngày.
    """
    offset_days = (int(record_id or 1) * 7 + 12) % 61
    dt = datetime.date(2026, 9, 1) + datetime.timedelta(days=offset_days)
    return dt.strftime("%d/%m/%Y")


def update_or_format_cover_table_0(
    doc: Any,
    doc_title: str,
    doc_code: str,
    edition: str,
    issue_date: str,
    department_name: str
) -> None:
    """
    Cập nhật hoặc khởi tạo chuẩn xác khung metadata trên Trang bìa (Table 0):
    Layout chuẩn của Mẫu quy trình.docx:
    ┌──────────────────────────────────────┐
    │ Logo | CÔNG TY CỔ PHẦN VINA G7      │
    ├──────────────────────────────────────┤
    │                                      │
    │            TÊN TÀI LIỆU              │
    │                                      │
    │ Mã hiệu:              [giá trị]      │
    │ Lần ban hành:         [giá trị]      │
    │ Ngày ban hành:        [giá trị]      │
    │ Bộ phận thực hiện:    [tên đầy đủ]   │
    │                                      │
    ├──────────────────────────────────────┤
    │ TRÁCH NHIỆM | HỌ TÊN | CHỨC VỤ |...  │
    └──────────────────────────────────────┘
    - Không xóa bỏ table/cell/border.
    - Thay thế giá trị in-place nếu paragraph đã có.
    - Tự động bổ sung nếu file nguồn chưa có block metadata.
    - Cập nhật chức vụ/phòng ban tại Bảng trách nhiệm (Row 3, Col 3).
    """
    if not doc or not doc.tables:
        return
    t0 = doc.tables[0]
    if len(t0.rows) < 2:
        return

    c1 = t0.rows[1].cells[0]
    c1_text = c1.text
    has_meta_block = (
        "mã hiệu" in c1_text.lower() and
        "lần ban hành" in c1_text.lower() and
        "ngày ban hành" in c1_text.lower() and
        any(k in c1_text.lower() for k in ["bộ phận thực hiện", "phòng ban"])
    )

    clean_title = (doc_title or "").strip().upper()
    eff_code = str(doc_code or "").strip()
    eff_ed = str(edition or "").strip()
    if eff_ed.isdigit():
        eff_ed = eff_ed.zfill(2)
    eff_date = str(issue_date or "").strip()
    eff_dept = get_department_name(department_name)

    if has_meta_block:
        for p in c1.paragraphs:
            txt = p.text.strip()
            txt_lower = txt.lower()
            if any(ph in txt for ph in ["[Tên quy trình]", "[tên quy trình]"]) or (txt and not any(k in txt_lower for k in ["mã hiệu", "lần ban hành", "ngày ban hành", "bộ phận thực hiện"])):
                if clean_title and (any(ph in txt for ph in ["[Tên quy trình]", "[tên quy trình]"]) or txt == txt.upper()):
                    p.text = clean_title
                    p.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.CENTER
                    for r in p.runs:
                        r.font.name = "Times New Roman"
                        r.font.size = docx.shared.Pt(16)
                        r.font.bold = True
                        r.font.color.rgb = docx.shared.RGBColor(0, 32, 96)
            elif "mã hiệu" in txt_lower:
                p.text = f"Mã hiệu:              {eff_code}"
                p.paragraph_format.left_indent = docx.shared.Inches(1.2)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = docx.shared.Pt(12)
                    r.font.bold = True
            elif "lần ban hành" in txt_lower:
                p.text = f"Lần ban hành:         {eff_ed}"
                p.paragraph_format.left_indent = docx.shared.Inches(1.2)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = docx.shared.Pt(12)
            elif "ngày ban hành" in txt_lower:
                p.text = f"Ngày ban hành:        {eff_date}"
                p.paragraph_format.left_indent = docx.shared.Inches(1.2)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = docx.shared.Pt(12)
            elif any(k in txt_lower for k in ["bộ phận thực hiện", "phòng ban"]):
                p.text = f"Bộ phận thực hiện:    {eff_dept}"
                p.paragraph_format.left_indent = docx.shared.Inches(1.2)
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    r.font.size = docx.shared.Pt(12)
    else:
        for p in list(c1.paragraphs):
            p._p.getparent().remove(p._p)

        p_top = c1.add_paragraph()
        p_top.paragraph_format.space_before = docx.shared.Pt(8)
        p_top.paragraph_format.space_after = docx.shared.Pt(8)

        p_title = c1.add_paragraph()
        p_title.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.CENTER
        p_title.paragraph_format.space_before = docx.shared.Pt(4)
        p_title.paragraph_format.space_after = docx.shared.Pt(20)
        r_t = p_title.add_run(clean_title if clean_title else "QUY TRÌNH QUẢN LÝ")
        r_t.font.name = "Times New Roman"
        r_t.font.size = docx.shared.Pt(16)
        r_t.font.bold = True
        r_t.font.color.rgb = docx.shared.RGBColor(0, 32, 96)

        items = [
            ("Mã hiệu:", eff_code),
            ("Lần ban hành:", eff_ed),
            ("Ngày ban hành:", eff_date),
            ("Bộ phận thực hiện:", eff_dept)
        ]
        for lbl, val in items:
            p_m = c1.add_paragraph()
            p_m.paragraph_format.left_indent = docx.shared.Inches(1.2)
            p_m.paragraph_format.space_before = docx.shared.Pt(2)
            p_m.paragraph_format.space_after = docx.shared.Pt(2)
            p_m.paragraph_format.line_spacing = 1.15

            r_lbl = p_m.add_run(f"{lbl:<22}")
            r_lbl.font.name = "Times New Roman"
            r_lbl.font.size = docx.shared.Pt(12)
            r_lbl.font.bold = True

            r_val = p_m.add_run(val)
            r_val.font.name = "Times New Roman"
            r_val.font.size = docx.shared.Pt(12)
            r_val.font.bold = (lbl == "Mã hiệu:")

        p_bot = c1.add_paragraph()
        p_bot.paragraph_format.space_before = docx.shared.Pt(8)
        p_bot.paragraph_format.space_after = docx.shared.Pt(8)

    # Cập nhật ô Chức vụ / Phòng ban biên soạn ở Bảng trách nhiệm (Row 3, Col 3)
    if len(t0.rows) > 3:
        r3 = t0.rows[3]
        if len(r3.cells) > 3:
            r3.cells[3].text = eff_dept


def verify_docx_cover_metadata_structure(docx_abs_path_or_doc: Any) -> Tuple[bool, str]:
    """
    QA Validation bắt buộc kiểm tra khung Trang bìa theo Requirement 5:
    [x] Có block Mã hiệu
    [x] Có block Lần ban hành
    [x] Có block Ngày ban hành
    [x] Có block Bộ phận thực hiện
    [x] Giá trị không phải placeholder
    [x] Bảng Trách nhiệm vẫn còn
    [x] Không mất border/table structure
    """
    if isinstance(docx_abs_path_or_doc, str):
        if not os.path.isfile(docx_abs_path_or_doc):
            return False, f"File không tồn tại: {docx_abs_path_or_doc}"
        d = docx.Document(docx_abs_path_or_doc)
    else:
        d = docx_abs_path_or_doc

    if not d.tables:
        return False, "Thiếu Bảng bìa Table 0 trong tài liệu Word"
    
    t0 = d.tables[0]
    if len(t0.rows) < 3:
        return False, f"Bảng bìa không đủ số dòng cấu trúc (chỉ có {len(t0.rows)} dòng)"

    c1_txt = t0.rows[1].cells[0].text.lower()
    checks = [
        ("Mã hiệu", "mã hiệu" in c1_txt, "[mã hiệu]" not in c1_txt),
        ("Lần ban hành", "lần ban hành" in c1_txt, "[lần ban hành]" not in c1_txt),
        ("Ngày ban hành", "ngày ban hành" in c1_txt, "[ngày ban hành]" not in c1_txt),
        ("Bộ phận thực hiện", any(k in c1_txt for k in ["bộ phận thực hiện", "phòng ban"]), "[phòng ban/ bộ phận]" not in c1_txt)
    ]

    for label, has_lbl, not_ph in checks:
        if not has_lbl:
            return False, f"Trang bìa thiếu block '{label}'"
        if not not_ph:
            return False, f"Trường '{label}' trên trang bìa vẫn còn là placeholder chưa thay thế"

    t0_full = " ".join([c.text for r in t0.rows for c in r.cells]).lower()
    if not any(k in t0_full for k in ["trách nhiệm", "biên soạn", "phê duyệt"]):
        return False, "Thiếu cấu trúc Bảng trách nhiệm ở trang bìa"

    return True, ""


def qa_validate_converted_document(
    doc: Any,
    old_doc_code: str,
    new_doc_code: str,
    old_edition: str,
    new_edition: str,
    new_issue_date: str,
    source_table_count: int
) -> Tuple[bool, str]:
    """
    QA Validation trước khi trả về kết quả AFTER:
    [x] new_code != old_code nếu rule yêu cầu đổi mã
    [x] new_version = old_version + 1
    [x] ngày mới hợp lệ (01/09/2026 -> 31/10/2026)
    [x] không còn placeholder
    [x] không mất page break: cover không dính với Revision History
    [x] bảng biểu / nội dung không bị giảm
    [x] khung metadata trang bìa đầy đủ 4 trường và Bảng trách nhiệm
    """
    # 1. Kiểm tra cấu trúc khung trang bìa theo Requirement 5
    ok_cover, err_cover = verify_docx_cover_metadata_structure(doc)
    if not ok_cover:
        return False, err_cover

    if new_doc_code == old_doc_code and not old_doc_code.startswith("G7."):
        return False, f"Mã hiệu chưa được chuẩn hóa theo quy tắc G7 (vẫn giữ nguyên '{old_doc_code}')"

    old_nums = re.findall(r'\d+', str(old_edition))
    new_nums = re.findall(r'\d+', str(new_edition))
    if old_nums and new_nums:
        if int(new_nums[0]) <= int(old_nums[0]):
            return False, f"Lần ban hành chưa tăng (+1): cũ={old_edition}, mới={new_edition}"

    parts = new_issue_date.split('/')
    if len(parts) == 3:
        day, mon, yr = int(parts[0]), int(parts[1]), int(parts[2])
        if yr != 2026 or mon not in (9, 10) or day < 1 or day > 31:
            return False, f"Ngày ban hành '{new_issue_date}' không nằm trong khoảng 01/09/2026 -> 31/10/2026"
    else:
        return False, f"Định dạng ngày ban hành không hợp lệ: '{new_issue_date}'"

    check_placeholders = ["[mã hiệu]", "[lần ban hành]", "[ngày ban hành]", "[Tên quy trình]", "[Thêm mục đích của tài liệu]"]
    xml_str = doc._element.xml
    for ph in check_placeholders:
        if ph in xml_str:
            return False, f"Tài liệu vẫn còn placeholder chưa làm sạch: '{ph}'"

    # Cover không dính với Revision History
    found_theo_doi = False
    for p in doc.paragraphs:
        if "THEO DÕI SỬA ĐỔI" in p.text:
            found_theo_doi = True
            if not p.paragraph_format.page_break_before:
                return False, "Thiếu ngắt trang giữa Trang bìa và phần Theo dõi sửa đổi"
            break

    if len(doc.tables) < source_table_count:
        return False, f"Số lượng bảng biểu bị giảm sau chuyển đổi ({len(doc.tables)} < {source_table_count})"

    return True, ""


def convert_procedure_document(
    source_abs_path: str,
    record: Any,
    actor_name: Optional[str] = None,
    actor_dept: Optional[str] = None,
    target_doc_code: Optional[str] = None,
    target_edition: Optional[str] = None
) -> Dict[str, Any]:
    """
    Chuyển đổi tài liệu theo chuẩn 'Mẫu quy trình.docx'.
    Nguyên tắc cốt lõi:
    - SOURCE -> copy thành working draft -> sửa metadata tại vị trí hiện có -> update footer -> QA.
    - Bảo toàn 100% nội dung, Title gốc, Headings, bảng, hình, lưu đồ, diễn giải của source.
    - Mã hiệu mới: G7.XX.YYZZ (XX phòng ban, YY loại tài liệu, ZZ số thứ tự).
    - Lần ban hành: tăng 1 (01->02, 02->03, 03->04).
    - Ngày ban hành mới: trong khoảng 01/09/2026 -> 31/10/2026 (deterministic).
    - Giữ ngắt trang chuẩn: Cover Page 1 -> Page Break -> Revision History Page 2 -> Page Break -> Nội dung Page 3.
    - Update in-place duy nhất một bộ metadata.
    """
    # 1. Kiểm tra tính hợp lệ
    can_convert, err_msg, meta = validate_document_convertible(source_abs_path, record)
    if not can_convert:
        raise ValueError(err_msg)

    # 2. Tìm template chuẩn Mẫu quy trình.docx
    tpl_path = get_iso_procedure_template_path()
    if not tpl_path:
        raise FileNotFoundError("Không tìm thấy tệp chuẩn 'Mẫu quy trình.docx' trong hệ thống.")

    # 3. Mở file nguồn (Preserve source first)
    src_process_path = source_abs_path
    if source_abs_path.lower().endswith(".doc"):
        converted_docx = os.path.join(PREVIEW_CACHE_DIR, f"temp_{os.path.basename(source_abs_path)}x")
        try:
            import pythoncom, win32com.client
            pythoncom.CoInitialize()
            doc_app = None
            try:
                word = win32com.client.DispatchEx("Word.Application")
                word.Visible = False
                word.DisplayAlerts = 0
                doc_app = word.Documents.Open(source_abs_path, ReadOnly=True)
                doc_app.SaveAs2(converted_docx, 16)
                doc_app.Close(False)
                doc_app = None
                word.Quit()
            finally:
                if doc_app:
                    try:
                        doc_app.Close(False)
                    except:
                        pass
                pythoncom.CoUninitialize()
            if os.path.exists(converted_docx):
                src_process_path = converted_docx
        except Exception as e:
            raise RuntimeError(f"Không thể mở tệp .doc để chuyển đổi: {e}")

    doc = docx.Document(src_process_path)
    tpl = docx.Document(tpl_path)
    source_table_count = len(doc.tables)

    # 4. Xác định metadata theo quy tắc chuẩn G7
    old_doc_code = str(record.suggested_doc_code or record.item_code or record.source_code or "QT01").strip()
    
    # Mã mới G7.XX.YYZZ
    if target_doc_code and target_doc_code.strip() and target_doc_code.strip().startswith("G7.") and len(target_doc_code.strip().split('.')) >= 3:
        new_doc_code = target_doc_code.strip()
    else:
        new_doc_code = compute_g7_doc_code(record, old_doc_code, source_abs_path)

    # Lần ban hành (01 -> 02, 02 -> 03, ...)
    old_edition, auto_new_edition = compute_edition(record)
    if target_edition and str(target_edition).strip().isdigit() and int(str(target_edition).strip()) > int(old_edition):
        new_edition = str(target_edition).strip().zfill(2)
    else:
        new_edition = auto_new_edition

    # Ngày ban hành trong khoảng 01/09/2026 -> 31/10/2026 (deterministic)
    old_issue_date = str(record.issue_date or "").strip()
    new_issue_date = compute_deterministic_issue_date(record.id)

    # 5. Cập nhật in-place duy nhất một bộ Metadata trong tài liệu (Nested table & Header cells)
    tables_all = doc._element.xpath('.//w:tbl')
    for tbl_elem in tables_all:
        t = docx.table.Table(tbl_elem, doc)
        for r_idx, r in enumerate(t.rows):
            for c_idx, c in enumerate(r.cells):
                txt_c = c.text.strip().lower()
                # Ô nhãn Mã hiệu -> cập nhật ô giá trị bên cạnh
                if "mã hiệu" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and (any(kw in val_c.text for kw in ["QT", "G7", "[mã hiệu]"]) or not val_c.text.strip()):
                        val_c.paragraphs[0].text = new_doc_code
                        for p_extra in val_c.paragraphs[1:]:
                            p_extra.text = ""

                # Ô nhãn Lần ban hành -> cập nhật ô giá trị bên cạnh
                if "lần ban hành" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and (re.search(r'\d+', val_c.text) or "[lần ban hành]" in val_c.text or not val_c.text.strip()):
                        val_c.paragraphs[0].text = new_edition
                        for p_extra in val_c.paragraphs[1:]:
                            p_extra.text = ""

                # Ô nhãn Ngày ban hành / Bộ phận thực hiện
                if "ngày ban hành" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c:
                        if len(val_c.paragraphs) > 0:
                            val_c.paragraphs[0].text = new_issue_date
                        if len(val_c.paragraphs) > 1 and ("HCNS" in val_c.paragraphs[1].text or "phòng ban" in val_c.paragraphs[1].text.lower() or not val_c.paragraphs[1].text.strip()):
                            val_c.paragraphs[1].text = get_department_name(getattr(record, 'department_in_charge', None) or ("HC" if "HC" in new_doc_code else "CL"))

    # 6. Cập nhật và bảo toàn Trang bìa (Table 0) đầy đủ Title và Khung Metadata chuẩn (Requirement 1-5)
    eff_dept_name = get_department_name(getattr(record, 'department_in_charge', None) or ("HC" if "HC" in new_doc_code else "CL"))
    doc_title = (record.document_name or "").strip()
    update_or_format_cover_table_0(
        doc=doc,
        doc_title=doc_title,
        doc_code=new_doc_code,
        edition=new_edition,
        issue_date=new_issue_date,
        department_name=eff_dept_name
    )

    # 7. Cập nhật Bảng theo dõi sửa đổi nội dung tài liệu (Bảng 1 / tbl[2])
    for tbl_elem in tables_all:
        t = docx.table.Table(tbl_elem, doc)
        if len(t.rows) > 1:
            header_txt = "".join([c.text.strip() for c in t.rows[0].cells])
            if "Số TT" in header_txt or "STT" in header_txt or "Ngày Sửa" in header_txt or "Nội Dung Sửa Đổi" in header_txt:
                change_desc = f"Chuyển đổi tài liệu theo Mẫu quy trình.docx (Mã hiệu: {old_doc_code} → {new_doc_code}; Lần ban hành: {old_edition} → {new_edition}; Ngày ban hành: {old_issue_date or 'Chưa xác định'} → {new_issue_date})"
                r1_txt = "".join([c.text.strip() for c in t.rows[1].cells])
                if "[sinh khi có điều chỉnh]" in r1_txt or not r1_txt:
                    t.rows[1].cells[0].text = "01"
                    t.rows[1].cells[1].text = new_issue_date
                    t.rows[1].cells[2].text = change_desc
                    t.rows[1].cells[3].text = "Toàn bộ"
                else:
                    inserted = False
                    for r_i in range(1, len(t.rows)):
                        c_txt = "".join([c.text.strip() for c in t.rows[r_i].cells])
                        if not c_txt:
                            t.rows[r_i].cells[0].text = f"{r_i:02d}"
                            t.rows[r_i].cells[1].text = new_issue_date
                            t.rows[r_i].cells[2].text = change_desc
                            t.rows[r_i].cells[3].text = "Toàn bộ"
                            inserted = True
                            break
                    if not inserted:
                        new_r = t.add_row()
                        new_r.cells[0].text = f"{len(t.rows)-1:02d}"
                        new_r.cells[1].text = new_issue_date
                        new_r.cells[2].text = change_desc
                        new_r.cells[3].text = "Toàn bộ"
                break

    # 8. Làm sạch dummy placeholders mà KHÔNG sửa nội dung, lưu đồ, bảng biểu thật
    # Tuyệt đối không xóa bỏ block metadata [mã hiệu], [lần ban hành], [ngày ban hành], [phòng ban/ bộ phận]
    dummy_placeholders = [
        "[Thêm mục đích của tài liệu]", "[Thêm phạm vi áp dụng của tài liệu]",
        "[thêm tài liệu viện dẫn]", "[thêm từ viết tắt]",
        "[thêm lưu đồ và diễn giải]", "[thêm diễn giải]",
        "[thêm danh sách các biểu mẩu từ phụ lục]",
        "[sinh khi có điều chỉnh]", "[ngày thực hiện đièu chỉnh]",
        "[đề mục điều chỉnh]", "[trang của đề mục]",
        "[Họ tên người biên soạn]", "[CV NBS]", "[Họ tên người phê duyệt]", "[CV NPD]"
    ]
    for p in doc.paragraphs:
        for ph in dummy_placeholders:
            if ph in p.text:
                p.text = p.text.replace(ph, "")

    # 9. ĐẢM BẢO PHÂN TRANG CHUẨN: Trang bìa (Page 1) -> Page Break -> Theo dõi sửa đổi (Page 2)
    # Loại bỏ các đoạn trống đệm giữa Bảng 0 và đoạn tiêu đề THEO DÕI SỬA ĐỔI
    if len(doc.tables) > 0:
        t0 = doc.tables[0]
        found_t0 = False
        p_theo_doi = None
        paras_to_remove = []
        for child in list(doc._body._body):
            tag = child.tag.split('}')[-1]
            if tag == 'tbl' and child == t0._tbl:
                found_t0 = True
                continue
            if found_t0:
                if tag == 'p':
                    p_curr = docx.text.paragraph.Paragraph(child, doc)
                    if "THEO DÕI SỬA ĐỔI" in p_curr.text:
                        p_theo_doi = p_curr
                        break
                    elif not p_curr.text.strip():
                        paras_to_remove.append(p_curr)
                elif tag == 'tbl':
                    break

        for p_rem in paras_to_remove:
            p_rem._p.getparent().remove(p_rem._p)

        if p_theo_doi:
            p_theo_doi.paragraph_format.page_break_before = True

    # 10. Áp dụng chuẩn Footer từ Mẫu quy trình.docx
    try:
        tpl_footer_p = tpl.sections[0].footer.paragraphs[0]
        footer_xml_str = tpl_footer_p._p.xml

        footer_xml_str = footer_xml_str.replace("G7.CL -", new_doc_code).replace("QTKS01", "")
        day_val, mon_val, yr_val = new_issue_date.split('/')
        footer_xml_str = footer_xml_str.replace("18", day_val)
        footer_xml_str = footer_xml_str.replace("/06/2026", f"/{mon_val}/{yr_val}")
        footer_xml_str = footer_xml_str.replace(": 01", f": {new_edition}")

        for sec in doc.sections:
            sec.different_first_page_header_footer = True
            sec.footer.is_linked_to_previous = False
            for old_p in list(sec.footer.paragraphs):
                old_p._p.getparent().remove(old_p._p)
            new_p_elem = parse_xml(footer_xml_str)
            sec.footer._element.append(new_p_elem)
    except Exception as ft_err:
        print(f"[Conversion] Cảnh báo cập nhật Footer: {ft_err}")

    # 11. QA VALIDATION trước khi lưu bản AFTER
    qa_ok, qa_msg = qa_validate_converted_document(
        doc=doc,
        old_doc_code=old_doc_code,
        new_doc_code=new_doc_code,
        old_edition=old_edition,
        new_edition=new_edition,
        new_issue_date=new_issue_date,
        source_table_count=source_table_count
    )
    if not qa_ok:
        raise ValueError(f"Kiểm thử chất lượng chuyển đổi (QA) thất bại: {qa_msg}")

    # 12. Lưu tệp AFTER dưới dạng DRAFT trong vùng tạm 'TẠM CHUYỂN ĐỔI'
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    draft_filename = f"DRAFT_{record.id}_{timestamp}.docx"
    draft_abs_path = os.path.join(DRAFTS_ISO_DIR, draft_filename)
    draft_rel_path = os.path.join("TẠM CHUYỂN ĐỔI", draft_filename)

    doc.save(draft_abs_path)

    # 13. Tạo bản xem trước PDF từ bản DRAFT qua engine Word COM / LibreOffice
    draft_pdf_path = None
    try:
        draft_pdf_path = convert_word_to_pdf_preview(draft_abs_path)
    except Exception as pdf_err:
        print(f"[Conversion] Cảnh báo tạo PDF preview cho draft: {pdf_err}")

    # 14. Trích xuất Mục lục (Headings) từ bản draft
    draft_headings = []
    try:
        parsed_draft = parse_docx_to_html_and_headings(draft_abs_path)
        draft_headings = parsed_draft.get("headings", [])
    except Exception as h_err:
        print(f"[Conversion] Cảnh báo trích xuất TOC draft: {h_err}")

    # Đường dẫn xem trước
    clean_src_rel = normalize_rel_path(source_abs_path)
    draft_preview_url = f"/api/iso-master-records/word-pdf-preview?path={draft_rel_path.replace(os.sep, '/')}"
    source_preview_url = f"/api/iso-master-records/word-pdf-preview?path={clean_src_rel.replace(os.sep, '/')}"

    return {
        "success": True,
        "record_id": record.id,
        "draft_rel_path": draft_rel_path.replace(os.sep, '/'),
        "draft_filename": draft_filename,
        "draft_abs_path": draft_abs_path,
        "source_rel_path": clean_src_rel.replace(os.sep, '/'),
        "source_filename": os.path.basename(source_abs_path),
        "source_abs_path": source_abs_path,
        "template_used": "Mẫu quy trình.docx",
        "doc_code_old": old_doc_code,
        "doc_code_new": new_doc_code,
        "edition_old": old_edition,
        "edition_new": new_edition,
        "issue_date_old": old_issue_date,
        "issue_date_new": new_issue_date,
        "headings": draft_headings,
        "draft_preview_url": draft_preview_url,
        "source_preview_url": source_preview_url,
        "message": f"Chuyển đổi thành công sang bản draft theo chuẩn '{os.path.basename(tpl_path)}'"
    }


def save_accepted_conversion_document(
    record: Any,
    draft_rel_path: str,
    source_rel_path: str,
    new_doc_code: Optional[str] = None,
    new_edition: Optional[str] = None,
    new_issue_date: Optional[str] = None,
    actor_name: Optional[str] = None,
    actor_dept: Optional[str] = None
) -> Dict[str, Any]:
    """
    Persist chính thức bản draft chuyển đổi thành file version mới.
    - Lưu file mới đúng folder chứa file nguồn.
    - Tên file chuẩn: [Mã hiệu mới]_[Lần ban hành mới]_[Tên tài liệu].docx
    - Không overwrite file cũ.
    - Cập nhật source_link: file mới đứng đầu (CURRENT), file cũ giữ lại (SUPERSEDED).
    - Refresh cache preview.
    """
    draft_abs, err = resolve_safe_path(draft_rel_path)
    if not draft_abs or not os.path.isfile(draft_abs):
        raise FileNotFoundError(f"Không tìm thấy bản nháp chuyển đổi: {err or draft_rel_path}")

    source_abs, _ = resolve_safe_path(source_rel_path)
    if not source_abs or not os.path.isfile(source_abs):
        source_abs = os.path.join(BASE_ISO_DIR, normalize_rel_path(source_rel_path))

    # Thư mục lưu file chính thức: BẮT BUỘC trong chính thư mục chứa file nguồn
    target_dir = os.path.dirname(source_abs) if os.path.isfile(source_abs) else None
    if not target_dir or not os.path.isdir(target_dir):
        target_dir = os.path.dirname(os.path.join(BASE_ISO_DIR, normalize_rel_path(source_rel_path)))
        os.makedirs(target_dir, exist_ok=True)

    # Đặt tên file version mới theo quy tắc chuẩn G7: [Mã hiệu mới]_[Lần ban hành mới]_[Tên tài liệu].docx
    code_part = (new_doc_code or record.suggested_doc_code or "G7.HC.QT01").strip()
    ed_part = (new_edition or record.edition or "02").strip()
    source_fn = os.path.basename(source_abs) if os.path.isfile(source_abs) else os.path.basename(source_rel_path)

    official_filename = make_converted_doc_filename(
        doc_code=code_part,
        edition=ed_part,
        doc_name=record.document_name,
        source_filename=source_fn
    )
    official_abs_path = os.path.join(target_dir, official_filename)

    # KHÔNG overwrite file cũ (nếu vô tình trùng tên với file nguồn)
    if official_abs_path == source_abs:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        official_filename = make_converted_doc_filename(
            doc_code=code_part,
            edition=ed_part,
            doc_name=record.document_name,
            source_filename=source_fn
        ).replace(".docx", f"_{timestamp}.docx")
        official_abs_path = os.path.join(target_dir, official_filename)

    # Copy bản draft sang file chính thức
    shutil.copy2(draft_abs, official_abs_path)

    # Xóa bản draft trong vùng tạm TẠM CHUYỂN ĐỔI
    try:
        if os.path.exists(draft_abs):
            os.remove(draft_abs)
    except Exception as rm_err:
        print(f"[Conversion] Dọn dẹp draft warning: {rm_err}")

    # Đường dẫn tương đối chuẩn của file chính thức
    official_rel_path = os.path.relpath(official_abs_path, BASE_ISO_DIR).replace(os.sep, '/')
    clean_source_rel = normalize_rel_path(source_abs).replace(os.sep, '/')

    # Ghi nhận lineage: bản nguồn -> NOT_IN_USE/CONVERTED; bản mới -> IN_USE/CONVERTED
    try:
        record_conversion_lineage(
            record_id=record.id,
            source_rel_path=clean_source_rel,
            official_rel_path=official_rel_path
        )
    except Exception as lin_err:
        print(f"[Conversion] Cảnh báo ghi lineage: {lin_err}")

    # Cập nhật source_link của hồ sơ:
    # Bản mới = CURRENT (đứng đầu danh sách)
    # Bản cũ = SUPERSEDED (giữ nguyên để truy vết)
    existing_links = parse_raw_source_links(record.source_link)
    new_links = [official_rel_path]
    if clean_source_rel and clean_source_rel not in existing_links and clean_source_rel != official_rel_path:
        new_links.append(clean_source_rel)

    for el in existing_links:
        clean_el = normalize_rel_path(el).replace(os.sep, '/')
        if clean_el != official_rel_path and clean_el != normalize_rel_path(draft_rel_path).replace(os.sep, '/'):
            if clean_el not in new_links:
                new_links.append(clean_el)

    old_doc_code = record.suggested_doc_code or "QT"
    old_edition = record.edition or "01"
    old_issue_date = record.issue_date or ""

    record.source_link = "; ".join(new_links)
    if new_doc_code:
        record.suggested_doc_code = new_doc_code
    if new_edition:
        m_ed = re.search(r'\d+', str(new_edition))
        record.edition = str(int(m_ed.group(0))) if m_ed else new_edition
    if new_issue_date:
        record.issue_date = new_issue_date
    record.last_modified_date = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    record.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Tạo sẵn PDF preview cho file mới
    try:
        convert_word_to_pdf_preview(official_abs_path)
    except Exception as p_err:
        print(f"[Conversion] Preview generation error: {p_err}")

    stat = os.stat(official_abs_path)
    return {
        "success": True,
        "official_filename": official_filename,
        "official_rel_path": official_rel_path,
        "official_abs_path": official_abs_path,
        "source_rel_path": clean_source_rel,
        "source_filename": source_fn,
        "source_abs_dir": target_dir,
        "doc_code_old": old_doc_code,
        "doc_code_new": code_part,
        "edition_old": old_edition,
        "edition_new": ed_part,
        "issue_date_old": old_issue_date,
        "issue_date_new": record.issue_date,
        "size_bytes": stat.st_size,
        "size_formatted": format_file_size(stat.st_size),
        "preview_url": f"/api/iso-master-records/word-pdf-preview?path={official_rel_path}"
    }


def update_draft_word_file(draft_rel_path: str, file_bytes: bytes) -> Dict[str, Any]:
    """Cập nhật bản draft Word từ file người dùng đã chỉnh sửa trên máy tính."""
    draft_abs, err = resolve_safe_path(draft_rel_path)
    if not draft_abs or not os.path.isfile(draft_abs):
        raise FileNotFoundError(f"Không tìm thấy bản nháp để cập nhật: {err or draft_rel_path}")

    with open(draft_abs, "wb") as f:
        f.write(file_bytes)

    # Sinh lại PDF preview từ file vừa cập nhật
    try:
        convert_word_to_pdf_preview(draft_abs)
    except Exception as e:
        print(f"[UpdateDraftWord] Cache preview warning: {e}")

    # Trích xuất lại mục lục headings
    headings = []
    try:
        parsed = parse_docx_to_html_and_headings(draft_abs)
        headings = parsed.get("headings", [])
    except Exception as e:
        print(f"[UpdateDraftWord] Lỗi trích xuất TOC: {e}")

    return {
        "success": True,
        "headings": headings,
        "preview_url": f"/api/iso-master-records/word-pdf-preview?path={normalize_rel_path(draft_rel_path).replace(os.sep, '/')}",
        "message": "Đã cập nhật tài liệu Word thành công"
    }


def quick_edit_draft_metadata(
    draft_rel_path: str,
    doc_code: Optional[str] = None,
    edition: Optional[str] = None,
    issue_date: Optional[str] = None,
    doc_name: Optional[str] = None,
    revision_note: Optional[str] = None
) -> Dict[str, Any]:
    """Cập nhật nhanh thông tin tiêu đề / metadata trực tiếp vào file Word draft."""
    draft_abs, err = resolve_safe_path(draft_rel_path)
    if not draft_abs or not os.path.isfile(draft_abs):
        raise FileNotFoundError(f"Không tìm thấy bản nháp để chỉnh sửa: {err or draft_rel_path}")

    doc = docx.Document(draft_abs)

    # 1. Cập nhật bảng metadata
    tables_all = doc._element.xpath('.//w:tbl')
    for tbl_elem in tables_all:
        t = docx.table.Table(tbl_elem, doc)
        for r in t.rows:
            for c_idx, c in enumerate(r.cells):
                txt_c = c.text.strip().lower()
                if doc_code and "mã hiệu" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and len(val_c.paragraphs) > 0:
                        val_c.paragraphs[0].text = doc_code.strip()
                if edition and "lần ban hành" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and len(val_c.paragraphs) > 0:
                        ed_clean = str(edition).strip()
                        if ed_clean.isdigit(): ed_clean = ed_clean.zfill(2)
                        val_c.paragraphs[0].text = ed_clean
                if issue_date and "ngày ban hành" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and len(val_c.paragraphs) > 0:
                        val_c.paragraphs[0].text = issue_date.strip()

    # 2. Cập nhật tiêu đề quy trình ở Bảng 0 nếu có
    if doc_name and len(doc.tables) > 0:
        t0 = doc.tables[0]
        if len(t0.rows) > 1:
            title_cell = t0.rows[1].cells[0]
            title_cell.text = doc_name.strip().upper()
            for p_t in title_cell.paragraphs:
                p_t.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.CENTER
                for r_t in p_t.runs:
                    r_t.font.name = "Times New Roman"
                    r_t.font.size = docx.shared.Pt(14)
                    r_t.font.bold = True

    # 3. Cập nhật bảng theo dõi sửa đổi nếu có ghi chú
    if revision_note:
        for tbl_elem in tables_all:
            t = docx.table.Table(tbl_elem, doc)
            if len(t.rows) > 1:
                header_txt = "".join([c.text.strip() for c in t.rows[0].cells])
                if "Số TT" in header_txt or "STT" in header_txt or "Nội Dung Sửa Đổi" in header_txt:
                    last_row = t.rows[-1]
                    if len(last_row.cells) >= 3:
                        last_row.cells[2].text = revision_note.strip()
                    break

    doc.save(draft_abs)

    # Sinh lại preview và trích xuất TOC
    try:
        convert_word_to_pdf_preview(draft_abs)
    except Exception as e:
        print(f"[QuickEditDraft] Preview warning: {e}")

    headings = []
    try:
        parsed = parse_docx_to_html_and_headings(draft_abs)
        headings = parsed.get("headings", [])
    except Exception as e:
        print(f"[QuickEditDraft] Lỗi trích xuất TOC: {e}")

    return {
        "success": True,
        "headings": headings,
        "preview_url": f"/api/iso-master-records/word-pdf-preview?path={normalize_rel_path(draft_rel_path).replace(os.sep, '/')}",
        "message": "Đã cập nhật nội dung vào tài liệu Word"
    }


def sync_record_metadata_to_docx(
    docx_abs_path: str,
    doc_code: Optional[str] = None,
    edition: Optional[str] = None,
    issue_date: Optional[str] = None,
    department_name: Optional[str] = None,
    document_name: Optional[str] = None,
    revision_note: Optional[str] = None
) -> Dict[str, Any]:
    """
    Đồng bộ trực tiếp bộ metadata chuẩn G7 vào file .docx:
    - Cover page:
      + Mã hiệu (VD: G7.HC.QT01)
      + Lần ban hành (VD: 04)
      + Ngày ban hành (VD: 25/09/2026)
      + Bộ phận thực hiện / Phòng ban (VD: 'Hành chính Nhân sự', KHÔNG ghi 'HC')
      + Tiêu đề quy trình (nếu có cập nhật document_name)
      + Dòng theo dõi sửa đổi trong Bảng 1 (nếu có revision_note)
    - Footer:
      + Đồng bộ Mã hiệu, Ngày ban hành, Lần ban hành trên mọi Section sử dụng chuẩn Mẫu quy trình.docx
    - Sinh lại PDF preview cache ngay lập tức.
    - Trả về thông tin cập nhật. Nếu có lỗi, ném ngoại lệ để đảm bảo tính toàn vẹn (không cập nhật DB dở dang).
    """
    if not docx_abs_path or not os.path.isfile(docx_abs_path):
        raise FileNotFoundError(f"Không tìm thấy file Word để đồng bộ metadata: {docx_abs_path}")

    doc = docx.Document(docx_abs_path)
    tpl_path = get_iso_procedure_template_path()
    tpl = docx.Document(tpl_path) if tpl_path and os.path.isfile(tpl_path) else None

    # Hỗ trợ nhận trực tiếp record object hoặc dict
    if hasattr(doc_code, "suggested_doc_code") or hasattr(doc_code, "source_code") or isinstance(doc_code, dict):
        rec = doc_code
        if isinstance(rec, dict):
            doc_code = rec.get("suggested_doc_code") or rec.get("source_code")
            if edition is None: edition = rec.get("edition")
            if issue_date is None: issue_date = rec.get("issue_date")
            if department_name is None: department_name = rec.get("department_in_charge")
            if document_name is None: document_name = rec.get("document_name")
        else:
            doc_code = getattr(rec, "suggested_doc_code", None) or getattr(rec, "source_code", None)
            if edition is None: edition = getattr(rec, "edition", None)
            if issue_date is None: issue_date = getattr(rec, "issue_date", None)
            if department_name is None: department_name = getattr(rec, "department_in_charge", None)
            if document_name is None: document_name = getattr(rec, "document_name", None)

    # Chuẩn hóa giá trị
    clean_code = str(doc_code).strip() if doc_code else None
    clean_edition = str(edition).strip() if edition else None
    if clean_edition and clean_edition.isdigit():
        clean_edition = clean_edition.zfill(2)
    clean_date = str(issue_date).strip() if issue_date else None
    clean_dept_name = get_department_name(department_name) if department_name else None
    clean_doc_name = str(document_name).strip() if document_name else None

    # 1. CẬP NHẬT TRANG BÌA (Cover Table & Tables)
    tables_all = doc._element.xpath('.//w:tbl')
    for tbl_elem in tables_all:
        t = docx.table.Table(tbl_elem, doc)
        for r_idx, r in enumerate(t.rows):
            for c_idx, c in enumerate(r.cells):
                txt_c = c.text.strip().lower()

                # Mã hiệu
                if clean_code and "mã hiệu" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and len(val_c.paragraphs) > 0:
                        val_c.paragraphs[0].text = clean_code
                        for p_extra in val_c.paragraphs[1:]:
                            p_extra.text = ""

                # Lần ban hành
                if clean_edition and "lần ban hành" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and len(val_c.paragraphs) > 0:
                        val_c.paragraphs[0].text = clean_edition
                        for p_extra in val_c.paragraphs[1:]:
                            p_extra.text = ""

                # Ngày ban hành
                if clean_date and "ngày ban hành" in txt_c and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and len(val_c.paragraphs) > 0:
                        val_c.paragraphs[0].text = clean_date

                # Bộ phận thực hiện / Phòng ban (Ghi tên đầy đủ, ví dụ: 'Hành chính Nhân sự', tuyệt đối không ghi 'HC')
                if clean_dept_name and any(kw in txt_c for kw in ["bộ phận thực hiện", "bộ phận phụ trách", "phòng ban thực hiện"]) and c_idx + 1 < len(r.cells):
                    val_c = r.cells[c_idx + 1]
                    if val_c != c and len(val_c.paragraphs) > 0:
                        val_c.paragraphs[0].text = clean_dept_name
                        for p_extra in val_c.paragraphs[1:]:
                            p_extra.text = ""

    # Cập nhật và bảo toàn chuẩn xác Bảng bìa (Table 0) đầy đủ Title và Khung Metadata (Requirement 1-5)
    update_or_format_cover_table_0(
        doc=doc,
        doc_title=clean_doc_name,
        doc_code=clean_code,
        edition=clean_edition,
        issue_date=clean_date,
        department_name=clean_dept_name
    )

    # Bảng theo dõi sửa đổi (Bảng 1)
    if revision_note:
        for tbl_elem in tables_all:
            t = docx.table.Table(tbl_elem, doc)
            if len(t.rows) > 1:
                header_txt = "".join([c.text.strip() for c in t.rows[0].cells])
                if "Số TT" in header_txt or "STT" in header_txt or "Nội Dung Sửa Đổi" in header_txt:
                    last_row = t.rows[-1]
                    if len(last_row.cells) >= 3:
                        last_row.cells[2].text = revision_note.strip()
                    break

    # 2. CẬP NHẬT FOOTER
    if tpl and (clean_code or clean_date or clean_edition):
        try:
            from docx.oxml import parse_xml
            tpl_footer_p = tpl.sections[0].footer.paragraphs[0]
            footer_xml_str = tpl_footer_p._p.xml

            effective_code = clean_code or "G7.HC.QT01"
            effective_date = clean_date or "20/09/2026"
            effective_edition = clean_edition or "01"

            footer_xml_str = footer_xml_str.replace("G7.CL -", effective_code).replace("QTKS01", "")
            day_parts = effective_date.split('/')
            if len(day_parts) == 3:
                day_val, mon_val, yr_val = day_parts
                footer_xml_str = footer_xml_str.replace("18", day_val)
                footer_xml_str = footer_xml_str.replace("/06/2026", f"/{mon_val}/{yr_val}")
            footer_xml_str = footer_xml_str.replace(": 01", f": {effective_edition}")

            for sec in doc.sections:
                for old_p in list(sec.footer.paragraphs):
                    old_p._p.getparent().remove(old_p._p)
                new_p_elem = parse_xml(footer_xml_str)
                sec.footer._element.append(new_p_elem)
        except Exception as ft_err:
            print(f"[SyncMetadata] Cảnh báo cập nhật Footer: {ft_err}")

    # 3. LƯU FILE
    doc.save(docx_abs_path)

    # QA Validation bắt buộc theo Requirement 5
    qa_ok, qa_err = verify_docx_cover_metadata_structure(docx_abs_path)
    if not qa_ok:
        raise RuntimeError(f"Lỗi kiểm tra cấu trúc trang bìa Word: {qa_err}")

    # 4. TẠO LẠI PDF PREVIEW CACHE
    try:
        convert_word_to_pdf_preview(docx_abs_path)
    except Exception as pdf_err:
        print(f"[SyncMetadata] Cảnh báo sinh lại PDF: {pdf_err}")

    # 5. TRÍCH XUẤT LẠI HEADINGS
    headings = []
    try:
        parsed = parse_docx_to_html_and_headings(docx_abs_path)
        headings = parsed.get("headings", [])
    except Exception as h_err:
        print(f"[SyncMetadata] Lỗi trích xuất headings: {h_err}")

    return {
        "success": True,
        "doc_code": clean_code,
        "edition": clean_edition,
        "issue_date": clean_date,
        "department_name": clean_dept_name,
        "document_name": clean_doc_name,
        "headings": headings
    }


def update_document_metadata(
    db: Any,
    record_id: int,
    metadata: Dict[str, Any],
    actor_name: str = "Quản trị viên (Hệ thống)",
    actor_dept: str = "Ban ISO"
) -> Dict[str, Any]:
    """
    Dịch vụ đồng bộ Metadata hai chiều thống nhất:
    1. metadata hồ sơ/version trong DB
    2. cover Word
    3. footer Word
    4. preview/cache
    5. Viewer
    6. history (ghi nhận audit log rõ ràng)
    Nếu update DOCX thất bại -> ném ngoại lệ, KHÔNG báo metadata đồng bộ thành công.
    """
    from modules.inspection.models.iso_master_record_model import ISOMasterRecord, ISOMasterRecordAuditLog

    record = db.query(ISOMasterRecord).filter(ISOMasterRecord.id == record_id).first()
    if not record:
        raise ValueError("Không tìm thấy hồ sơ Master Record")

    old_code = record.suggested_doc_code or record.item_code or ""
    old_edition = record.edition or ""
    old_date = record.issue_date or ""
    old_dept = record.department_in_charge or ""
    old_name = record.document_name or ""

    new_dept_raw = metadata.get("department_in_charge") or metadata.get("department") or metadata.get("department_name")
    new_dept_name = get_department_name(new_dept_raw) if new_dept_raw else old_dept
    dept_code = get_department_code(new_dept_name)

    # Xử lý Mã hiệu: nếu đổi phòng ban sang Hành chính Nhân sự mà mã hiệu bắt đầu G7.XX. -> đổi thành G7.HC.
    req_doc_code = metadata.get("suggested_doc_code") or metadata.get("doc_code")
    if req_doc_code and req_doc_code.strip():
        new_doc_code = req_doc_code.strip()
    elif old_code.startswith("G7."):
        parts = old_code.split('.')
        if len(parts) >= 3:
            parts[1] = dept_code
            new_doc_code = ".".join(parts)
        else:
            new_doc_code = old_code
    else:
        new_doc_code = old_code

    new_edition = str(metadata.get("edition") or old_edition).strip()
    if new_edition.isdigit():
        new_edition = new_edition.zfill(2)
    new_date = str(metadata.get("issue_date") or old_date).strip()
    new_name = str(metadata.get("document_name") or old_name).strip()

    # Tìm file Word hiện hành cần đồng bộ
    doc_rel_path = metadata.get("doc_rel_path")
    target_abs = None
    target_rel = None

    if doc_rel_path:
        target_abs, _ = resolve_safe_path(doc_rel_path)
        target_rel = doc_rel_path

    if not target_abs or not os.path.isfile(target_abs):
        files_data = get_record_files_and_word_docs(record)
        sel_doc = files_data.get("selected_word_doc")
        if sel_doc and sel_doc.get("relative_path"):
            target_abs, _ = resolve_safe_path(sel_doc["relative_path"])
            target_rel = sel_doc["relative_path"]

    # 1. CẬP NHẬT FILE WORD NẾU CÓ
    sync_result = None
    if target_abs and os.path.isfile(target_abs) and target_abs.lower().endswith(('.docx', '.doc')):
        docx_path = ensure_docx_path(target_abs)
        sync_result = sync_record_metadata_to_docx(
            docx_abs_path=docx_path,
            doc_code=new_doc_code,
            edition=new_edition,
            issue_date=new_date,
            department_name=new_dept_name,
            document_name=new_name,
            revision_note=f"Cập nhật metadata (Mã hiệu: {old_code} → {new_doc_code}; Lần ban hành: {old_edition} → {new_edition}; Ngày ban hành: {old_date} → {new_date}; Phòng ban: {old_dept} → {new_dept_name})"
        )

    # 2. CẬP NHẬT DB RECORD
    record.suggested_doc_code = new_doc_code
    record.edition = new_edition
    record.issue_date = new_date
    record.department_in_charge = new_dept_name
    record.document_name = new_name
    record.updated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 3. GHI NHẬN LỊCH SỬ KIỂM TOÁN CÓ Ý NGHĨA
    changes = []
    if old_code != new_doc_code:
        changes.append({"field": "suggested_doc_code", "field_label": "Mã hiệu", "old_val": old_code, "new_val": new_doc_code})
    if old_edition != new_edition:
        changes.append({"field": "edition", "field_label": "Lần ban hành", "old_val": old_edition, "new_val": new_edition})
    if old_date != new_date:
        changes.append({"field": "issue_date", "field_label": "Ngày ban hành", "old_val": old_date, "new_val": new_date})
    if old_dept != new_dept_name:
        changes.append({"field": "department_in_charge", "field_label": "Phòng ban", "old_val": old_dept, "new_val": new_dept_name})
    if old_name != new_name:
        changes.append({"field": "document_name", "field_label": "Tên tài liệu", "old_val": old_name, "new_val": new_name})

    if changes:
        now_dt = datetime.datetime.now()
        log_entry = ISOMasterRecordAuditLog(
            record_id=record.id,
            action_type="UPDATE_METADATA",
            action_label="Cập nhật metadata",
            actor_name=actor_name,
            actor_dept=actor_dept,
            target_name=os.path.basename(target_abs) if target_abs else (record.document_name or record.source_code),
            details=json.dumps({
                "changes": changes,
                "doc_code_old": old_code,
                "doc_code_new": new_doc_code,
                "edition_old": old_edition,
                "edition_new": new_edition,
                "issue_date_old": old_date,
                "issue_date_new": new_date,
                "dept_old": old_dept,
                "dept_new": new_dept_name,
                "file_path": target_rel
            }, ensure_ascii=False),
            created_at=now_dt.strftime("%d/%m/%Y %H:%M"),
            timestamp=now_dt.isoformat()
        )
        db.add(log_entry)

    db.commit()
    db.refresh(record)

    preview_url = None
    if target_rel:
        preview_url = f"/api/iso-master-records/word-pdf-preview?path={target_rel.replace(os.sep, '/')}"

    return {
        "success": True,
        "message": "Đồng bộ metadata thành công giữa hệ thống và tài liệu Word",
        "data": {
            "id": record.id,
            "suggested_doc_code": record.suggested_doc_code,
            "edition": record.edition,
            "issue_date": record.issue_date,
            "department_in_charge": record.department_in_charge,
            "document_name": record.document_name,
            "preview_url": preview_url,
            "headings": sync_result.get("headings", []) if sync_result else []
        }
    }


def cleanup_draft_file(draft_rel_path: str) -> bool:
    """Xóa file draft khi người dùng bấm Hủy bản chuyển đổi."""
    draft_abs, _ = resolve_safe_path(draft_rel_path)
    if draft_abs and os.path.isfile(draft_abs) and "TẠM CHUYỂN ĐỔI" in draft_abs:
        try:
            os.remove(draft_abs)
            return True
        except Exception as e:
            print(f"[CleanupDraft] Error: {e}")
    return False


def get_document_page_images(doc_rel_path: str, dpi: int = 120) -> List[Dict[str, Any]]:
    """
    Trích xuất danh sách các trang PDF dưới dạng ảnh chất lượng cao để hiển thị
    trong popup So sánh Before / After có hỗ trợ Synchronized Scroll chính xác 100%.
    """
    if not doc_rel_path:
        return []

    abs_path, err = resolve_safe_path(doc_rel_path)
    if not abs_path or not os.path.isfile(abs_path):
        return []

    # Lấy hoặc sinh file PDF preview
    pdf_abs = None
    if abs_path.lower().endswith('.pdf'):
        pdf_abs = abs_path
    else:
        pdf_abs = convert_word_to_pdf_preview(abs_path)

    if not pdf_abs or not os.path.isfile(pdf_abs):
        return []

    try:
        import fitz
        doc = fitz.open(pdf_abs)
        pages = []
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=dpi)
            img_bytes = pix.tobytes('jpeg')
            b64 = base64.b64encode(img_bytes).decode('ascii')
            pages.append({
                "page_number": i + 1,
                "width": pix.width,
                "height": pix.height,
                "data_url": f"data:image/jpeg;base64,{b64}",
                "image_base64": f"data:image/jpeg;base64,{b64}"
            })
        doc.close()
        return pages
    except Exception as e:
        print(f"[PageImages] Lỗi trích xuất ảnh trang: {e}")
        return []


def save_direct_edited_word_content(
    draft_rel_path: str,
    html_content: str,
    record: Any = None
) -> Dict[str, Any]:
    """
    Lưu trực tiếp nội dung người dùng chỉnh sửa từ Direct Word Editor vào file .docx.
    - Phân tích HTML bằng BeautifulSoup
    - Cập nhật text, headings và table cells theo data-p-idx và data-t-idx
    - Bảo toàn 100% styles, fonts, margins, header/footer, XML cấu trúc gốc của Word
    - Sinh lại ngay lập tức PDF preview cache
    - Trích xuất lại TOC/headings
    - Cập nhật last_modified_date
    """
    draft_abs, err = resolve_safe_path(draft_rel_path)
    if not draft_abs or not os.path.isfile(draft_abs):
        raise FileNotFoundError(f"Không tìm thấy file để chỉnh sửa: {err or draft_rel_path}")

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    doc = docx.Document(draft_abs)

    # 1. Cập nhật các đoạn văn / Heading theo data-p-idx
    p_tags = soup.find_all(lambda tag: tag.has_attr('data-p-idx'))
    for tag in p_tags:
        try:
            p_idx = int(tag.get('data-p-idx'))
            if 0 <= p_idx < len(doc.paragraphs):
                p_doc = doc.paragraphs[p_idx]
                new_text = tag.get_text(separator=' ', strip=True)
                # Chỉ cập nhật nếu text có thay đổi
                if p_doc.text.strip() != new_text:
                    if p_doc.runs and len(p_doc.runs) == 1:
                        p_doc.runs[0].text = new_text
                    else:
                        p_doc.text = new_text

                # Cập nhật style Heading nếu người dùng đổi định dạng trong editor
                tag_name = tag.name.lower()
                if tag_name == 'h1' and (not p_doc.style or 'heading 1' not in p_doc.style.name.lower()):
                    try: p_doc.style = 'Heading 1'
                    except: pass
                elif tag_name == 'h2' and (not p_doc.style or 'heading 2' not in p_doc.style.name.lower()):
                    try: p_doc.style = 'Heading 2'
                    except: pass
                elif tag_name == 'h3' and (not p_doc.style or 'heading 3' not in p_doc.style.name.lower()):
                    try: p_doc.style = 'Heading 3'
                    except: pass
                elif tag_name == 'p' and p_doc.style and 'heading' in p_doc.style.name.lower():
                    try: p_doc.style = 'Normal'
                    except: pass
        except Exception as p_e:
            print(f"[WordEdit] Cập nhật p_idx warning: {p_e}")

    # 2. Cập nhật các bảng theo data-t-idx
    table_tags = soup.find_all('table', attrs={'data-t-idx': True})
    for tbl_tag in table_tags:
        try:
            t_idx = int(tbl_tag.get('data-t-idx'))
            if 0 <= t_idx < len(doc.tables):
                t_doc = doc.tables[t_idx]
                td_list = tbl_tag.find_all(['td', 'th'])
                for td in td_list:
                    if not td.has_attr('data-r') or not td.has_attr('data-c'):
                        continue
                    r_idx = int(td.get('data-r'))
                    c_idx = int(td.get('data-c'))
                    if r_idx < len(t_doc.rows) and c_idx < len(t_doc.rows[r_idx].cells):
                        cell = t_doc.rows[r_idx].cells[c_idx]

                        # Kiểm tra xem ô có chứa ảnh (logo) không để không vô tình xóa ảnh
                        has_image = bool(cell._tc.xpath('.//a:blip'))

                        p_tags = td.find_all('p')
                        if p_tags:
                            new_lines = [p.get_text().strip() for p in p_tags if p.get_text().strip()]
                        else:
                            new_lines = [line.strip() for line in td.get_text(separator='\n').split('\n') if line.strip()]

                        if has_image and not new_lines:
                            # Ô chỉ có ảnh/logo, không bị sửa chữ, giữ nguyên
                            continue

                        current_text = cell.text.strip()
                        new_full_text = "\n".join(new_lines)

                        if current_text != new_full_text:
                            if has_image:
                                for p_doc in cell.paragraphs:
                                    if not p_doc._p.xpath('.//a:blip'):
                                        if new_lines:
                                            p_doc.text = new_lines[0]
                            else:
                                if len(new_lines) <= 1:
                                    val = new_lines[0] if new_lines else ""
                                    if cell.paragraphs and cell.paragraphs[0].runs and len(cell.paragraphs[0].runs) == 1:
                                        cell.paragraphs[0].runs[0].text = val
                                    else:
                                        cell.text = val
                                else:
                                    for i, line in enumerate(new_lines):
                                        if i < len(cell.paragraphs):
                                            cell.paragraphs[i].text = line
                                        else:
                                            cell.add_paragraph(line)
        except Exception as t_e:
            print(f"[WordEdit] Cập nhật table_idx warning: {t_e}")

    # 2.1 Trích xuất metadata cập nhật để đồng bộ hai chiều
    extracted_meta = {}

    # Ưu tiên 1: Trích xuất từ Footer wrapper (chân trang chuẩn hiển thị trên Editor)
    footer_wrapper = soup.find('div', class_='iso-doc-footer-wrapper')
    if footer_wrapper:
        fw_text = footer_wrapper.get_text()
        ed_m = re.search(r'lần ban hành[:\s]+(\d+)', fw_text, re.IGNORECASE)
        if ed_m:
            extracted_meta["edition"] = ed_m.group(1).zfill(2)
        code_m = re.search(r'mã hiệu[:\s]+([A-Z0-9\.\-_]+)', fw_text, re.IGNORECASE)
        if code_m:
            extracted_meta["doc_code"] = code_m.group(1).strip()
        date_m = re.search(r'ngày ban hành[:\s]+(\d{1,2}/\d{1,2}/\d{4})', fw_text, re.IGNORECASE)
        if date_m:
            extracted_meta["issue_date"] = date_m.group(1).strip()

    # Ưu tiên 2: Trích xuất từ bảng bìa (Cover table: doc.tables[0])
    cover_tables = [doc.tables[0]] if len(doc.tables) > 0 else []
    for tbl in cover_tables:
        for r_idx, r in enumerate(tbl.rows):
            for c_idx, c in enumerate(r.cells):
                txt_c = c.text.strip().lower()
                if "mã hiệu" in txt_c and c_idx + 1 < len(r.cells) and "doc_code" not in extracted_meta:
                    val_c = r.cells[c_idx + 1].text.strip()
                    if val_c and val_c != c.text.strip():
                        extracted_meta["doc_code"] = val_c
                if "lần ban hành" in txt_c and c_idx + 1 < len(r.cells) and "edition" not in extracted_meta:
                    val_c = r.cells[c_idx + 1].text.strip()
                    nums = re.findall(r'\d+', val_c)
                    if nums:
                        extracted_meta["edition"] = nums[0].zfill(2)
                if "ngày ban hành" in txt_c and c_idx + 1 < len(r.cells) and "issue_date" not in extracted_meta:
                    val_c = r.cells[c_idx + 1].text.strip()
                    date_match = re.search(r'\d{1,2}/\d{1,2}/\d{4}', val_c)
                    if date_match:
                        extracted_meta["issue_date"] = date_match.group(0)
                if any(kw in txt_c for kw in ["bộ phận thực hiện", "bộ phận phụ trách", "phòng ban thực hiện"]) and c_idx + 1 < len(r.cells) and "department_name" not in extracted_meta:
                    val_c = r.cells[c_idx + 1].text.strip()
                    if val_c:
                        extracted_meta["department_name"] = get_department_name(val_c)

    # Ưu tiên 3: Phòng ban từ text nếu chưa có
    if "department_name" not in extracted_meta:
        soup_text = soup.get_text()
        for d_code, d_name in DEPARTMENT_MAPPING.items():
            if d_name.lower() in soup_text.lower():
                extracted_meta["department_name"] = d_name
                break

    # Đồng bộ cả Footer nếu metadata trên Cover thay đổi
    if extracted_meta.get("doc_code") or extracted_meta.get("edition") or extracted_meta.get("issue_date"):
        try:
            tpl_path = get_iso_procedure_template_path()
            if tpl_path and os.path.isfile(tpl_path):
                tpl = docx.Document(tpl_path)
                from docx.oxml import parse_xml
                tpl_footer_p = tpl.sections[0].footer.paragraphs[0]
                footer_xml_str = tpl_footer_p._p.xml
                eff_code = extracted_meta.get("doc_code") or getattr(record, 'suggested_doc_code', '') or "G7.HC.QT01"
                eff_ed = extracted_meta.get("edition") or getattr(record, 'edition', '') or "01"
                eff_date = extracted_meta.get("issue_date") or getattr(record, 'issue_date', '') or "20/09/2026"

                footer_xml_str = footer_xml_str.replace("G7.CL -", eff_code).replace("QTKS01", "")
                d_pts = eff_date.split('/')
                if len(d_pts) == 3:
                    footer_xml_str = footer_xml_str.replace("18", d_pts[0]).replace("/06/2026", f"/{d_pts[1]}/{d_pts[2]}")
                footer_xml_str = footer_xml_str.replace(": 01", f": {eff_ed}")

                for sec in doc.sections:
                    for old_p in list(sec.footer.paragraphs):
                        old_p._p.getparent().remove(old_p._p)
                    new_p_elem = parse_xml(footer_xml_str)
                    sec.footer._element.append(new_p_elem)
        except Exception as ft_e:
            print(f"[WordEdit] Footer sync warning: {ft_e}")

    # Đảm bảo Bảng bìa (Table 0) luôn giữ đầy đủ khung metadata chuẩn (Requirement 1-5)
    eff_title = getattr(record, 'document_name', '') if record else ''
    eff_code = extracted_meta.get("doc_code") or (getattr(record, 'suggested_doc_code', '') if record else "G7.HC.QT01")
    eff_ed = extracted_meta.get("edition") or (getattr(record, 'edition', '') if record else "01")
    eff_date = extracted_meta.get("issue_date") or (getattr(record, 'issue_date', '') if record else "20/09/2026")
    eff_dept = extracted_meta.get("department_name") or (getattr(record, 'department_in_charge', '') if record else "Hành chính Nhân sự")

    update_or_format_cover_table_0(
        doc=doc,
        doc_title=eff_title,
        doc_code=eff_code,
        edition=eff_ed,
        issue_date=eff_date,
        department_name=eff_dept
    )

    # Đảm bảo phần 2: 'THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU' luôn có ngắt trang cứng (Page Break) sang Trang 2
    for p_doc in doc.paragraphs:
        if "THEO DÕI SỬA ĐỔI" in p_doc.text.upper():
            p_doc.paragraph_format.page_break_before = True
            break

    # 3. Lưu lại file .docx
    doc.save(draft_abs)

    # QA Validation bắt buộc theo Requirement 5
    qa_ok, qa_err = verify_docx_cover_metadata_structure(draft_abs)
    if not qa_ok:
        print(f"[WordEdit] QA Warning cover metadata structure: {qa_err}")

    # 4. Sinh lại ngay lập tức bản PDF preview và xóa cache cũ
    try:
        convert_word_to_pdf_preview(draft_abs)
    except Exception as pdf_e:
        print(f"[WordEdit] Cảnh báo sinh lại PDF: {pdf_e}")

    # 5. Trích xuất lại mục lục headings và nội dung HTML mới
    headings = []
    updated_html = ""
    try:
        parsed = parse_docx_to_html_and_headings(draft_abs)
        headings = parsed.get("headings", [])
        updated_html = parsed.get("html_content", "")
    except Exception as h_e:
        print(f"[WordEdit] Cảnh báo trích xuất headings: {h_e}")

    clean_rel = normalize_rel_path(draft_rel_path).replace(os.sep, '/')
    if record and hasattr(record, 'id') and record.id:
        record.last_modified_date = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
        if extracted_meta.get("edition") and str(getattr(record, 'edition', '')).strip() != extracted_meta["edition"]:
            record.edition = extracted_meta["edition"]
        if extracted_meta.get("doc_code") and str(getattr(record, 'suggested_doc_code', '')).strip() != extracted_meta["doc_code"]:
            record.suggested_doc_code = extracted_meta["doc_code"]
        if extracted_meta.get("issue_date") and str(getattr(record, 'issue_date', '')).strip() != extracted_meta["issue_date"]:
            record.issue_date = extracted_meta["issue_date"]
        if extracted_meta.get("department_name") and str(getattr(record, 'department_in_charge', '')).strip() != extracted_meta["department_name"]:
            record.department_in_charge = extracted_meta["department_name"]
        try:
            record_direct_edit_lineage(record.id, clean_rel)
        except Exception as l_err:
            print(f"[WordEdit] Cảnh báo ghi lineage: {l_err}")
    return {
        "success": True,
        "doc_rel_path": clean_rel,
        "headings": headings,
        "html_content": updated_html,
        "preview_url": f"/api/v1/iso-master-records/word-pdf-preview?path={clean_rel}",
        "message": "Đã lưu chỉnh sửa tài liệu Word thành công"
    }


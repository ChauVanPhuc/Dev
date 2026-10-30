"""
Tích hợp ONLYOFFICE Document Server: sửa TRỰC TIẾP file Word (.docx) gốc trong trình duyệt.

Luồng:
  1. FE gọi GET /iso-documents/onlyoffice/config?file_path=... -> nhận cấu hình editor (đã ký JWT).
  2. Document Server tải file qua GET /onlyoffice/file?path=...&sig=... (chữ ký ngắn hạn, không cần Bearer).
  3. Khi người dùng sửa/lưu, Document Server gọi POST /onlyoffice/callback?path=...&sig=...
     -> backend sao lưu bản cũ rồi GHI ĐÈ file gốc bằng bản mới. Xuất file = chính file này.

Biến môi trường (.env):
  ONLYOFFICE_URL         URL Document Server mà TRÌNH DUYỆT truy cập được, vd: http://localhost:8080
  ONLYOFFICE_JWT_SECRET  Khóa JWT khớp với Document Server (để trống nếu tắt JWT)
  ONLYOFFICE_BACKEND_URL URL backend mà DOCUMENT SERVER truy cập được, vd: http://host.docker.internal:8000
"""
import os
import shutil
import time
import hashlib
import urllib.request
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import FileResponse, JSONResponse
from jose import jwt, JWTError

from config.settings import settings, UPLOADS_DIR

router = APIRouter()

SIGN_ALGO = "HS256"
SIGN_TTL_SECONDS = 6 * 3600


def _oo_url() -> str:
    return (os.getenv("ONLYOFFICE_URL") or "").rstrip("/")


def _oo_secret() -> str:
    return os.getenv("ONLYOFFICE_JWT_SECRET") or ""


def _backend_url(request: Request) -> str:
    configured = (os.getenv("ONLYOFFICE_BACKEND_URL") or "").rstrip("/")
    if configured:
        return configured
    return str(request.base_url).rstrip("/")


def _resolve_docx_path(file_path: str) -> str:
    """Xác thực và tìm đường dẫn tuyệt đối của file Word, hỗ trợ cả path tương đối trong uploads/static/dự án."""
    if not file_path:
        raise HTTPException(status_code=400, detail="Thiếu file_path")

    normalized = file_path.replace("/", os.sep).strip()
    # Loại bỏ tiền tố slash nếu có
    if normalized.startswith(os.sep):
        normalized = normalized[1:]

    from config.settings import BACKEND_DIR, STATIC_DIR
    from modules.inspection.services.iso_file_service import BASE_ISO_DIR
    project_root = os.path.abspath(os.path.join(BACKEND_DIR, ".."))

    filename_only = os.path.basename(normalized)
    candidates = [
        os.path.abspath(normalized),
        os.path.abspath(os.path.join(BASE_ISO_DIR, normalized)),
        os.path.abspath(os.path.join(BASE_ISO_DIR, "TÀI LIỆU TẢI LÊN", normalized)),
        os.path.abspath(os.path.join(BASE_ISO_DIR, "TÀI LIỆU TẢI LÊN", filename_only)),
        os.path.abspath(os.path.join(STATIC_DIR, normalized)),
        os.path.abspath(os.path.join(UPLOADS_DIR, normalized)),
        os.path.abspath(os.path.join(UPLOADS_DIR, filename_only)),
        os.path.abspath(os.path.join(UPLOADS_DIR, "iso_documents", filename_only)),
        os.path.abspath(os.path.join(BACKEND_DIR, normalized)),
        os.path.abspath(os.path.join(project_root, normalized)),
        os.path.abspath(os.path.join(project_root, "BackEnd", "static", normalized)),
        os.path.abspath(os.path.join(project_root, "HỒ SƠ VINA G7", "TÀI LIỆU TẢI LÊN", filename_only)),
    ]

    target_path = None
    for cand in candidates:
        if os.path.isfile(cand):
            target_path = cand
            break

    if not target_path:
        # Nếu chưa tìm thấy, thử loại bỏ prefix 'uploads/' nếu có
        clean_rel = normalized
        if clean_rel.lower().startswith(f"uploads{os.sep}"):
            sub = clean_rel[len(f"uploads{os.sep}"):]
            for base in [UPLOADS_DIR, STATIC_DIR, BASE_ISO_DIR]:
                sub_cand = os.path.abspath(os.path.join(base, sub))
                if os.path.isfile(sub_cand):
                    target_path = sub_cand
                    break

    if not target_path or not os.path.isfile(target_path):
        raise HTTPException(status_code=404, detail=f"Không tìm thấy file: {file_path}")

    # Chống path traversal: đảm bảo file nằm trong thư mục gốc của project
    if os.path.commonpath([target_path, project_root]) != project_root:
        raise HTTPException(status_code=403, detail="Đường dẫn file không hợp lệ")

    return target_path


def _sign_path(abs_path: str) -> str:
    return jwt.encode(
        {"p": abs_path, "exp": int(time.time()) + SIGN_TTL_SECONDS},
        settings.SECRET_KEY,
        algorithm=SIGN_ALGO,
    )


def _verify_sig(sig: str, abs_path: str) -> None:
    try:
        data = jwt.decode(sig, settings.SECRET_KEY, algorithms=[SIGN_ALGO])
    except JWTError:
        raise HTTPException(status_code=403, detail="Chữ ký không hợp lệ hoặc đã hết hạn")
    if os.path.abspath(data.get("p", "")) != abs_path:
        raise HTTPException(status_code=403, detail="Chữ ký không khớp file")


def _ensure_docx_file(abs_path: str) -> str:
    """Nếu là .doc: tạo bản .docx cạnh file để ONLYOFFICE lưu lại đúng định dạng."""
    if abs_path.lower().endswith(".docx"):
        return abs_path
    from modules.inspection.services.iso_file_service import ensure_docx_path
    converted = ensure_docx_path(abs_path)
    if not converted.lower().endswith(".docx") or not os.path.isfile(converted):
        raise HTTPException(status_code=400, detail="Không thể chuyển .doc sang .docx (cần Microsoft Word trên máy chủ)")
    target = os.path.splitext(abs_path)[0] + ".docx"
    if not os.path.isfile(target):
        shutil.copyfile(converted, target)
    return target


@router.get("/status")
def onlyoffice_status():
    """Cho FE biết ONLYOFFICE đã được cấu hình chưa."""
    return {"enabled": bool(_oo_url()), "url": _oo_url()}


@router.get("/config")
def onlyoffice_config(request: Request, file_path: str = Query(...), mode: str = Query("edit"), user_name: str = Query("SmartFlow")):
    """Trả về cấu hình editor ONLYOFFICE để FE nhúng (kèm JWT)."""
    if not _oo_url():
        raise HTTPException(status_code=503, detail="Chưa cấu hình ONLYOFFICE_URL trong .env (xem hướng dẫn cài ONLYOFFICE Document Server).")

    abs_path = _resolve_docx_path(file_path)
    abs_path = _ensure_docx_file(abs_path)

    sig = _sign_path(abs_path)
    base = _backend_url(request)
    from urllib.parse import quote
    q = f"path={quote(abs_path, safe='')}&sig={quote(sig, safe='')}"
    mtime = os.path.getmtime(abs_path)
    key = hashlib.md5(f"{abs_path}|{mtime}".encode("utf-8")).hexdigest()

    config = {
        "documentType": "word",
        "document": {
            "fileType": "docx",
            "key": key,
            "title": os.path.basename(abs_path),
            "url": f"{base}/api/v1/iso-documents/onlyoffice/file?{q}",
            "permissions": {"edit": mode == "edit", "download": True, "print": True},
        },
        "editorConfig": {
            "mode": "edit" if mode == "edit" else "view",
            "lang": "vi",
            "callbackUrl": f"{base}/api/v1/iso-documents/onlyoffice/callback?{q}",
            "user": {"id": user_name, "name": user_name},
            "customization": {"autosave": True, "forcesave": True, "compactHeader": True},
        },
        "height": "100%",
        "width": "100%",
    }
    secret = _oo_secret()
    if secret:
        config["token"] = jwt.encode(config, secret, algorithm="HS256")

    return {
        "success": True,
        "server_url": _oo_url(),
        "file_path": abs_path.replace("\\", "/"),
        "config": config,
    }


@router.get("/file")
def onlyoffice_get_file(path: str, sig: str):
    """Document Server tải file gốc (xác thực bằng chữ ký ngắn hạn)."""
    abs_path = os.path.abspath(path)
    _verify_sig(sig, abs_path)
    if not os.path.isfile(abs_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy file")
    return FileResponse(
        abs_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=os.path.basename(abs_path),
    )


def _decode_callback_body(request_headers, body: dict) -> dict:
    """Nếu bật JWT: xác thực và lấy payload thật từ token của Document Server."""
    secret = _oo_secret()
    if not secret:
        return body
    token = body.get("token")
    if not token:
        auth = request_headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=403, detail="Thiếu JWT từ Document Server")
    try:
        data = jwt.decode(token, secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=403, detail="JWT Document Server không hợp lệ")
    return data.get("payload", data)


@router.post("/callback")
async def onlyoffice_callback(request: Request, path: str, sig: str):
    """
    Document Server báo trạng thái chỉnh sửa. status 2 (đóng, sẵn sàng lưu) và 6 (force save)
    -> tải bản mới và ghi đè file gốc (có sao lưu phiên bản cũ).
    """
    abs_path = os.path.abspath(path)
    _verify_sig(sig, abs_path)

    try:
        raw_body = await request.json()
        body = _decode_callback_body(request.headers, raw_body)
    except HTTPException:
        raise
    except Exception as e_body:
        print(f"[ONLYOFFICE] Callback body lỗi: {e_body}")
        return JSONResponse({"error": 1})

    status = body.get("status")
    if status in (2, 6):
        download_url = body.get("url")
        if not download_url:
            return JSONResponse({"error": 1})
        tmp_path = abs_path + ".saving"
        try:
            with urllib.request.urlopen(download_url, timeout=60) as resp, open(tmp_path, "wb") as out:
                shutil.copyfileobj(resp, out)
            if os.path.getsize(tmp_path) == 0:
                raise IOError("File tải về rỗng")

            # Sao lưu phiên bản trước khi ghi đè
            versions_dir = os.path.join(os.path.dirname(abs_path), "_versions")
            os.makedirs(versions_dir, exist_ok=True)
            stamp = time.strftime("%Y%m%d_%H%M%S")
            shutil.copyfile(abs_path, os.path.join(versions_dir, f"{os.path.splitext(os.path.basename(abs_path))[0]}_{stamp}.docx"))

            os.replace(tmp_path, abs_path)
            print(f"[ONLYOFFICE] Đã lưu file: {abs_path} (status={status})")
        except Exception as e_save:
            print(f"[ONLYOFFICE] Lưu file thất bại: {e_save}")
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError as e_rm:
                    print(f"[ONLYOFFICE] Không xóa được file tạm: {e_rm}")
            return JSONResponse({"error": 1})
    return JSONResponse({"error": 0})


@router.get("/pages")
def onlyoffice_render_pages(file_path: str = Query(...)):
    """Render lại ảnh trang trung thực sau khi sửa (để xem nhanh / in)."""
    abs_path = _resolve_docx_path(file_path)
    from modules.inspection.services.iso_file_service import render_document_pages
    result = render_document_pages(abs_path)
    if not result.get("success"):
        return {"success": False, "pages": [], "page_count": 0, "message": "Chưa kết xuất được ảnh trang từ tệp Word này."}
    return result

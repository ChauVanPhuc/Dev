import os
import sys
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from sqlalchemy import text

# Đảm bảo đường dẫn gốc dự án có trong sys.path để import Report như một package
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from config.database import get_db, SessionLocal
from Report.core.weekly_analyzer import WeeklyAnalyzer
from Report.core.daily_analyzer import DailyAnalyzer
from Report.exporters.image_exporter import ImageExporter
from Report.exporters.excel_exporter import ExcelExporter
from Report.exporters.word_exporter import WordExporter
from Report.report_config import settings as report_settings

router = APIRouter()

def get_available_options_db():
    """Lấy danh sách tuần và ngày thực tế từ CSDL MSSQL"""
    try:
        db = SessionLocal()
        weeks = db.execute(text(
            "SELECT DISTINCT DATEPART(iso_week, created_at) as wk, YEAR(created_at) as yr "
            "FROM input_inspections WHERE created_at IS NOT NULL "
            "ORDER BY yr DESC, wk DESC"
        )).fetchall()
        dates = db.execute(text(
            "SELECT DISTINCT CAST(created_at AS DATE) as dt "
            "FROM input_inspections WHERE created_at IS NOT NULL "
            "ORDER BY dt DESC"
        )).fetchall()
        db.close()
        
        week_list = [{"week": int(r.wk), "year": int(r.yr)} for r in weeks if r.wk is not None]
        date_list = [str(r.dt) for r in dates[:20] if r.dt is not None]
        return week_list, date_list
    except Exception as e:
        print(f"[QualityReport] Error fetching options: {e}")
        return [{"week": 43, "year": 2026}, {"week": 42, "year": 2026}], ["2026-10-22"]

def fetch_report_data(report_type: str, param: Optional[str] = None) -> Dict[str, Any]:
    """Phân tích dữ liệu báo cáo chất lượng theo tuần hoặc ngày"""
    weeks, dates = get_available_options_db()
    if report_type == "daily":
        if not param or param.lower() in ("today", "latest"):
            target_date = dates[0] if dates else None
        else:
            target_date = param
        analyzer = DailyAnalyzer(target_date)
    else:
        # Weekly
        if not param or param.lower() in ("latest", "current"):
            week_num = weeks[0]["week"] if weeks else 43
        elif param.isdigit():
            week_num = int(param)
        else:
            week_num = 43
        analyzer = WeeklyAnalyzer(week=week_num)
    return analyzer.analyze()

@router.get("/options")
def get_options():
    """Lấy danh sách các tuần và ngày có dữ liệu kiểm tra chất lượng"""
    weeks, dates = get_available_options_db()
    return {
        "success": True,
        "available_weeks": weeks,
        "available_dates": dates,
        "default_week": weeks[0] if weeks else {"week": 43, "year": 2026},
        "default_date": dates[0] if dates else "2026-10-22"
    }

@router.get("/data")
def get_report_data_api(
    type: str = Query("weekly", description="Chế độ báo cáo: weekly hoặc daily"),
    param: Optional[str] = Query(None, description="Số tuần hoặc ngày YYYY-MM-DD")
):
    """Lấy dữ liệu phân tích chỉ số KPI, Pareto lỗi, và Top lô hàng dạng JSON"""
    try:
        data = fetch_report_data(type, param)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích số liệu: {str(e)}")

@router.get("/preview-html", response_class=HTMLResponse)
def get_preview_html(
    type: str = Query("weekly", description="Chế độ báo cáo: weekly hoặc daily"),
    param: Optional[str] = Query(None, description="Số tuần hoặc ngày YYYY-MM-DD")
):
    """Trả về mã HTML hoàn chỉnh của Poster Infographic để nhúng trực tiếp vào giao diện web"""
    try:
        weeks, dates = get_available_options_db()
        if not param:
            param = str(weeks[0]["week"]) if type == "weekly" and weeks else (dates[0] if dates else "43")
        
        data = fetch_report_data(type, param)
        raw_html = ImageExporter.render_html(
            data,
            report_type=type,
            report_param=param,
            available_weeks=weeks,
            available_dates=dates
        )
        
        # Điều hướng đường dẫn tài nguyên sang endpoint static /report-assets/ để hiển thị chuẩn trong trình duyệt
        web_html = raw_html.replace('href="assets/', 'href="/report-assets/')
        web_html = web_html.replace('src="assets/', 'src="/report-assets/')
        
        # Ẩn toolbar mặc định khi nhúng vào web app vì web app đã có toolbar React chuyên nghiệp
        web_html = web_html.replace('<header class="report-toolbar', '<header class="report-toolbar" style="display: none !important;"')
        
        return HTMLResponse(content=web_html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo bản xem trước: {str(e)}")

@router.get("/export/image")
def export_infographic_image(
    type: str = Query("weekly"),
    param: Optional[str] = Query(None)
):
    """Xuất Poster Infographic thành file ảnh PNG siêu nét chất lượng cao (2x DPI)"""
    try:
        weeks, dates = get_available_options_db()
        if not param:
            param = str(weeks[0]["week"]) if type == "weekly" and weeks else (dates[0] if dates else "43")
            
        data = fetch_report_data(type, param)
        iso_code = data.get("metadata", {}).get("iso_code", "REPORT")
        filename = f"Infographic_{type}_{param}_{iso_code}.png"
        out_path = os.path.join(report_settings.OUTPUT_DIR, filename)
        
        # Nếu chưa có hoặc cần tạo mới, tiến hành chụp ảnh Playwright
        ImageExporter.export(data, out_path, report_type=type, report_param=param)
        
        return FileResponse(
            out_path,
            media_type="image/png",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất ảnh Infographic: {str(e)}")

@router.get("/export/excel")
def export_excel_report(
    type: str = Query("weekly"),
    param: Optional[str] = Query(None)
):
    """Xuất báo cáo chi tiết ra file Excel (.xlsx) gồm 6 Sheets chuẩn hóa"""
    try:
        weeks, dates = get_available_options_db()
        if not param:
            param = str(weeks[0]["week"]) if type == "weekly" and weeks else (dates[0] if dates else "43")
            
        data = fetch_report_data(type, param)
        iso_code = data.get("metadata", {}).get("iso_code", "REPORT")
        filename = f"BaoCao_ChatLuong_{type}_{param}_{iso_code}.xlsx"
        out_path = os.path.join(report_settings.OUTPUT_DIR, filename)
        
        ExcelExporter.export(data, out_path)
        
        return FileResponse(
            out_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất bảng tính Excel: {str(e)}")

@router.get("/export/word")
def export_word_report(
    type: str = Query("weekly"),
    param: Optional[str] = Query(None)
):
    """Xuất văn bản báo cáo điều hành Word (.docx) chuẩn ISO/CAPA"""
    try:
        weeks, dates = get_available_options_db()
        if not param:
            param = str(weeks[0]["week"]) if type == "weekly" and weeks else (dates[0] if dates else "43")
            
        data = fetch_report_data(type, param)
        iso_code = data.get("metadata", {}).get("iso_code", "REPORT")
        filename = f"BaoCao_ChatLuong_{type}_{param}_{iso_code}.docx"
        out_path = os.path.join(report_settings.OUTPUT_DIR, filename)
        
        WordExporter.export(data, out_path)
        
        return FileResponse(
            out_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất văn bản Word: {str(e)}")

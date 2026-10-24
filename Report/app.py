import os
import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

try:
    from report_config import settings
except ImportError:
    from Report.report_config import settings

try:
    from core.weekly_analyzer import WeeklyAnalyzer
    from core.daily_analyzer import DailyAnalyzer
    from exporters.image_exporter import ImageExporter
    from exporters.excel_exporter import ExcelExporter
    from exporters.word_exporter import WordExporter
    from core.db import get_db
except ImportError:
    from Report.core.weekly_analyzer import WeeklyAnalyzer
    from Report.core.daily_analyzer import DailyAnalyzer
    from Report.exporters.image_exporter import ImageExporter
    from Report.exporters.excel_exporter import ExcelExporter
    from Report.exporters.word_exporter import WordExporter
    from Report.core.db import get_db

app = FastAPI(
    title="SmartFlow ERP - Quality Report Tool",
    description="Standalone Quality Infographic & Report Generator (Daily/Weekly)",
    version="1.0.0"
)

from sqlalchemy import text

# Mount static assets
app.mount("/assets", StaticFiles(directory=settings.ASSETS_DIR), name="assets")

def get_available_options():
    try:
        with get_db() as db:
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
            week_list = [{"week": int(r.wk), "year": int(r.yr)} for r in weeks if r.wk is not None]
            date_list = [str(r.dt) for r in dates[:14] if r.dt is not None]
            return week_list, date_list
    except Exception as e:
        print(f"Lỗi lấy options từ DB: {e}")
        return [{"week": 42, "year": 2026}, {"week": 41, "year": 2026}], ["2026-10-15"]

def get_report_data(report_type: str, param: str):
    weeks, dates = get_available_options()
    if report_type == "daily":
        if not param or param.lower() in ("today", "latest"):
            target_date = dates[0] if dates else None
        else:
            target_date = param
        analyzer = DailyAnalyzer(target_date)
    else:
        # Weekly
        if not param or param.lower() in ("latest", "current"):
            week_num = weeks[0]["week"] if weeks else 42
        elif param.isdigit():
            week_num = int(param)
        else:
            week_num = 42
        analyzer = WeeklyAnalyzer(week=week_num)
    return analyzer.analyze()

@app.get("/", response_class=HTMLResponse)
def view_infographic(
    type: str = Query("weekly", description="Chế độ báo cáo: weekly hoặc daily"),
    param: str = Query(None, description="Số tuần (1-52) hoặc ngày (YYYY-MM-DD)")
):
    """Trang xem trước Infographic trực quan"""
    try:
        weeks, dates = get_available_options()
        # Tự động chọn giá trị mặc định nếu param chưa có
        if not param:
            param = str(weeks[0]["week"]) if type == "weekly" and weeks else (dates[0] if dates else "42")
        data = get_report_data(type, param)
        html = ImageExporter.render_html(
            data, 
            report_type=type, 
            report_param=param,
            available_weeks=weeks,
            available_dates=dates
        )
        return HTMLResponse(content=html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo báo cáo: {e}")

@app.get("/api/data")
def get_data_json(
    type: str = Query("weekly"),
    param: str = Query("42")
):
    """Lấy dữ liệu thô dạng JSON"""
    try:
        data = get_report_data(type, param)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/image")
def export_image(
    type: str = Query("weekly"),
    param: str = Query("42")
):
    """Xuất Infographic ra file ảnh PNG chất lượng cao"""
    try:
        data = get_report_data(type, param)
        filename = f"Infographic_{type}_{param}_{data['metadata']['iso_code']}.png"
        out_path = os.path.join(settings.OUTPUT_DIR, filename)
        ImageExporter.export(data, out_path, report_type=type, report_param=param)
        return FileResponse(out_path, media_type="image/png", filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất ảnh: {e}")

@app.get("/export/excel")
def export_excel(
    type: str = Query("weekly"),
    param: str = Query("42")
):
    """Xuất báo cáo bảng tính Excel (.xlsx) đa phân hệ"""
    try:
        data = get_report_data(type, param)
        filename = f"BaoCao_ChatLuong_{type}_{param}_{data['metadata']['iso_code']}.xlsx"
        out_path = os.path.join(settings.OUTPUT_DIR, filename)
        ExcelExporter.export(data, out_path)
        return FileResponse(
            out_path, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            filename=filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất Excel: {e}")

@app.get("/export/word")
def export_word(
    type: str = Query("weekly"),
    param: str = Query("42")
):
    """Xuất văn bản báo cáo Microsoft Word (.docx) chuẩn ISO"""
    try:
        data = get_report_data(type, param)
        filename = f"BaoCao_ChatLuong_{type}_{param}_{data['metadata']['iso_code']}.docx"
        out_path = os.path.join(settings.OUTPUT_DIR, filename)
        WordExporter.export(data, out_path)
        return FileResponse(
            out_path, 
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
            filename=filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất Word: {e}")

if __name__ == "__main__":
    port = int(os.getenv("REPORT_PORT", "8099"))
    print("=== KHOI CHAY SMARTFLOW QUALITY REPORT TOOL ===")
    print(f"Truy cap Dashboard: http://localhost:{port}/?type=weekly&param=42")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)

import os
import json
import jinja2
from playwright.sync_api import sync_playwright
from typing import Dict, Any
try:
    from report_config import settings
except ImportError:
    from Report.report_config import settings

class ImageExporter:
    @classmethod
    def render_html(
        cls, 
        data: Dict[str, Any], 
        report_type: str = "weekly", 
        report_param: str = "",
        available_weeks: list = None,
        available_dates: list = None
    ) -> str:
        """Render HTML from Jinja2 template and embed data"""
        template_loader = jinja2.FileSystemLoader(settings.TEMPLATES_DIR)
        template_env = jinja2.Environment(loader=template_loader)
        template = template_env.get_template("infographic.html")
        
        rendered_html = template.render(
            **data,
            data_json=json.dumps(data, ensure_ascii=False),
            report_type=report_type,
            report_param=report_param,
            available_weeks=available_weeks or [],
            available_dates=available_dates or []
        )
        return rendered_html

    @classmethod
    def export(cls, data: Dict[str, Any], output_png_path: str, report_type: str = "weekly", report_param: str = "") -> str:
        """Render HTML and capture pixel-perfect ultra HD PNG poster using Playwright"""
        os.makedirs(os.path.dirname(output_png_path), exist_ok=True)
        
        # 1. Render HTML
        html_content = cls.render_html(data, report_type=report_type, report_param=report_param)
        
        # Save temp HTML next to templates/assets so relative paths to assets/ work
        temp_html_path = os.path.join(settings.TEMPLATES_DIR, "_temp_render.html")
        with open(temp_html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        # 2. Capture screenshot with Playwright
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                # 1600x900 viewport with scale factor 2 for crisp 3200px 4K print-ready resolution
                page = browser.new_page(
                    viewport={"width": 1500, "height": 920},
                    device_scale_factor=2
                )
                page.goto(f"file:///{temp_html_path.replace(os.sep, '/')}")
                
                # Wait for Chart.js rendering animation to finish
                page.wait_for_timeout(1000)
                
                # Hide controls toolbar from screenshot
                page.evaluate("document.querySelector('.report-toolbar')?.remove()")
                
                # Screenshot the poster element exactly
                poster_elem = page.query_selector("#posterCanvas")
                if poster_elem:
                    poster_elem.screenshot(path=output_png_path)
                else:
                    page.screenshot(path=output_png_path, full_page=True)

                browser.close()
        finally:
            if os.path.exists(temp_html_path):
                os.remove(temp_html_path)

        return output_png_path

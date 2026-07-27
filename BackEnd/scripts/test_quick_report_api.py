# -*- coding: utf-8 -*-
import requests
import json

BASE_URL = "http://127.0.0.1:1111/api/v1/quick-reports"

def test_quick_reports():
    print("=" * 60)
    print("TESTING QUICK REPORT BACKEND APIS")
    print("=" * 60)

    # 1. Test POST /create
    payload = {
        "report_type": "Biên bản cuộc họp",
        "creator_name": "Nguyễn Văn A",
        "is_anonymous": False,
        "attendees": "Phúc Châu Văn (SF13), Trần Thị B",
        "related_ticket": "CAPA-01",
        "main_content": "Thống nhất kế hoạch xử lý sự cố kẹt khuôn sản xuất tại xưởng 1.",
        "solution_recommendation": "Giao bộ phận bảo trì kiểm tra và gửi báo cáo CAPA.",
        "status": "Chờ xử lý"
    }

    try:
        res = requests.post(BASE_URL + "/", json=payload)
        print(f"[POST Create Status]: {res.status_code}")
        print(f"[POST Response]: {json.dumps(res.json(), ensure_ascii=False)}")
    except Exception as e:
        print(f"[POST Error]: {e}")

    # 2. Test GET /list
    try:
        res = requests.get(BASE_URL + "/")
        print(f"\n[GET List Status]: {res.status_code}")
        print(f"[GET Response Items Count]: {len(res.json().get('items', []))}")
    except Exception as e:
        print(f"[GET Error]: {e}")

    # 3. Test POST /generate-ai
    try:
        res = requests.post(BASE_URL + "/generate-ai", json={
            "report_type": "Báo cáo vấn đề",
            "main_content": "Áp suất máy nén khí tụt bất thường lúc 10h sáng.",
            "area": "Dây chuyền sơn"
        })
        print(f"\n[POST AI Generate Status]: {res.status_code}")
        print(f"[POST AI Response]: {json.dumps(res.json(), ensure_ascii=False)}")
    except Exception as e:
        print(f"[POST AI Error]: {e}")

if __name__ == "__main__":
    test_quick_reports()

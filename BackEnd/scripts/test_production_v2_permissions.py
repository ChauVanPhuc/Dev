# -*- coding: utf-8 -*-
import requests
import json

BASE_URL = "http://127.0.0.1:1111/api/v1/production-v2"

def test_role_permissions():
    print("=" * 60)
    print("TESTING PRODUCTION V2 ROLE PERMISSIONS & FACTORY MAPPING")
    print("=" * 60)

    # 1. Test QA / Manager (Full Access)
    try:
        res = requests.get(BASE_URL + "/orders?user_role=QA_Manager")
        data = res.json()
        print(f"[QA Manager Full Access]: {data.get('is_full_access')}")
        print(f"[QA Manager Total Orders]: {data.get('total')}")
    except Exception as e:
        print(f"[QA Error]: {e}")

    # 2. Test QC NM1 (Restricted Access)
    try:
        res = requests.get(BASE_URL + "/orders?user_role=QC&user_factory=NM1")
        data = res.json()
        print(f"[QC NM1 Full Access]: {data.get('is_full_access')}")
        print(f"[QC NM1 Orders Count]: {data.get('total')}")
        categories = set(o['category'] for o in data.get('orders', []))
        print(f"[QC NM1 Visible Categories]: {categories}")
    except Exception as e:
        print(f"[QC NM1 Error]: {e}")

if __name__ == "__main__":
    test_role_permissions()

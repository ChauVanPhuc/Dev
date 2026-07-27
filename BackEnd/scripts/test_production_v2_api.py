# -*- coding: utf-8 -*-
import requests
import json

BASE_URL = "http://127.0.0.1:1111/api/v1/production-v2"

def test_production_v2_apis():
    print("=" * 60)
    print("TESTING PRODUCTION V2 BACKEND APIS")
    print("=" * 60)

    # 1. Test Dashboard CL01
    try:
        res = requests.get(BASE_URL + "/dashboard")
        print(f"[CL01 Dashboard Status]: {res.status_code}")
    except Exception as e:
        print(f"[CL01 Error]: {e}")

    # 2. Test Orders CL02
    try:
        res = requests.get(BASE_URL + "/orders")
        print(f"[CL02 Orders Status]: {res.status_code}")
        print(f"[Orders Count]: {len(res.json().get('orders', []))}")
    except Exception as e:
        print(f"[CL02 Error]: {e}")

    # 3. Test Order Detail CL03
    try:
        res = requests.get(BASE_URL + "/orders/APT007/detail")
        print(f"[CL03 Order Detail Status]: {res.status_code}")
        print(f"[Stages Count]: {len(res.json().get('stages', []))}")
    except Exception as e:
        print(f"[CL03 Error]: {e}")

    # 4. Test Plans CL04
    try:
        res = requests.get(BASE_URL + "/plans")
        print(f"[CL04 Plans Status]: {res.status_code}")
        print(f"[Plans Items Count]: {len(res.json().get('items', []))}")
    except Exception as e:
        print(f"[CL04 Error]: {e}")

    # 5. Test Transfers CL05
    try:
        res = requests.get(BASE_URL + "/transfers")
        print(f"[CL05 Transfers Status]: {res.status_code}")
        print(f"[Transfers Items Count]: {len(res.json().get('items', []))}")
    except Exception as e:
        print(f"[CL05 Error]: {e}")

if __name__ == "__main__":
    test_production_v2_apis()

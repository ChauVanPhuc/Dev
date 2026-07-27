# -*- coding: utf-8 -*-
import requests
import json

BASE_URL = "http://127.0.0.1:1111/api/v1/production-v2"

def test_po_detail():
    print("=" * 60)
    print("TESTING SPECIFIC PO DETAIL (APT-0069-01)")
    print("=" * 60)

    try:
        res = requests.get(BASE_URL + "/orders/APT-0069-01/detail")
        data = res.json()
        print(f"[PO Detail Status]: {res.status_code}")
        print(f"[PO Code Returned]: {data.get('po_code')}")
        print(f"[Available POs Count]: {len(data.get('all_pos', []))}")
        print(f"[First 5 POs]: {data.get('all_pos', [])[:5]}")
        print(f"[Stages Count]: {len(data.get('stages', []))}")
        if data.get('stages'):
            print(f"[Stage 1 Name]: {data['stages'][0]['stage_name']}")
            print(f"[Stage 1 Details]: {data['stages'][0]['details']}")
    except Exception as e:
        print(f"[Error]: {e}")

if __name__ == "__main__":
    test_po_detail()

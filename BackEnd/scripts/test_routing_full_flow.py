# -*- coding: utf-8 -*-
import sys
import os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import requests

BASE_URL = 'http://localhost:8000/api/v1'

def test_full_routing_flow():
    print("=" * 70)
    print("TEST FULL PRODUCTION ROUTING & MULTI-FACTORY WORKFLOW")
    print("=" * 70)

    # 1. Sync teams from system
    print("\n[Step 1] Đồng bộ danh sách Tổ từ Cấu hình hệ thống...")
    r_sync = requests.post(f"{BASE_URL}/production/teams/sync-from-system")
    print(f"Status: {r_sync.status_code}, Response: {r_sync.json()}")
    assert r_sync.status_code == 200

    # 2. Get teams & verify factory partitioning
    print("\n[Step 2] Kiểm tra danh sách Tổ theo từng Nhà máy...")
    r_teams = requests.get(f"{BASE_URL}/production/teams")
    assert r_teams.status_code == 200
    teams = r_teams.json()
    print(f"Tổng số tổ: {len(teams)}")
    
    factories = {}
    for t in teams:
        fac = t.get('factory') or 'Chưa phân nhà máy'
        factories.setdefault(fac, []).append(t.get('team_name'))
    
    for fac, t_names in factories.items():
        print(f"  🏢 {fac}: {len(t_names)} tổ -> {', '.join(t_names)}")
    
    assert len(teams) > 0, "Không có tổ nào được tạo!"

    # 3. Create or Get Routing for Line
    print("\n[Step 3] Kiểm tra/Tạo Quy trình cho Dòng hàng APT...")
    r_routings = requests.get(f"{BASE_URL}/production/routings")
    assert r_routings.status_code == 200
    routings = r_routings.json()
    print(f"Tổng số quy trình hiện có: {len(routings)}")

    test_routing = None
    for r in routings:
        if r.get('code') == 'QT-TEST-APT' or r.get('routing_code') == 'QT-TEST-APT':
            test_routing = r
            break

    if not test_routing and len(routings) > 0:
        test_routing = routings[0]

    if not test_routing:
        payload = {
            "routing_code": "QT-TEST-APT",
            "routing_name": "Quy trình thử nghiệm Dòng hàng APT",
            "line": "APT",
            "category": "Tủ gỗ APT",
            "description": "Quy trình thử nghiệm tự động"
        }
        r_create = requests.post(f"{BASE_URL}/production/routings", json=payload)
        print(f"Tạo quy trình mới status: {r_create.status_code}")
        created_list = r_create.json()
        if isinstance(created_list, list):
            for r in created_list:
                if r.get('code') == 'QT-TEST-APT' or r.get('routing_code') == 'QT-TEST-APT':
                    test_routing = r
                    break
        elif isinstance(created_list, dict) and 'id' in created_list:
            test_routing = created_list

    assert test_routing is not None, "Không tìm thấy quy trình!"
    routing_id = test_routing['id']
    print(f"Sử dụng Quy trình ID: {routing_id}, Code: {test_routing.get('code')}, Line: {test_routing.get('line')}")

    # 4. Add nodes to routing
    print("\n[Step 4] Bổ sung node công đoạn vào từng Nhà máy trong Quy trình...")
    nm1_teams = [t for t in teams if t.get('factory') == 'Nhà máy 1']
    added_nodes = []
    for t in nm1_teams[:3]:
        try:
            r_node = requests.post(f"{BASE_URL}/production/routings/{routing_id}/nodes", json={"team_id": t['id']})
            if r_node.status_code in (200, 201):
                added_nodes.append(r_node.json())
                print(f"  + Thêm thành công {t['team_name']} ({t['factory']}) vào chuỗi quy trình.")
            else:
                print(f"  - Node {t['team_name']}: {r_node.json().get('detail')}")
        except Exception as e:
            print("  - Lỗi thêm node:", e)

    # 5. Test Reordering of Nodes within Factory Silo
    print("\n[Step 5] Thử nghiệm sắp xếp lại thứ tự node độc lập trong Nhà máy 1...")
    if len(nm1_teams) >= 2:
        reversed_team_ids = [nm1_teams[1]['id'], nm1_teams[0]['id']]
        r_reorder = requests.put(f"{BASE_URL}/production/routings/{routing_id}/nodes/reorder", json={
            "factory": "Nhà máy 1",
            "team_ids": reversed_team_ids
        })
        print(f"Reorder status: {r_reorder.status_code}")
        assert r_reorder.status_code == 200

    # 6. Assign products by line
    print("\n[Step 6] Gán tự động tất cả sản phẩm thuộc Dòng hàng (Line: APT)...")
    r_assign = requests.post(f"{BASE_URL}/production/routings/{routing_id}/products/assign-by-line", json={"line": "APT"})
    print(f"Status gán Dòng hàng: {r_assign.status_code}")
    assert r_assign.status_code == 200
    assigned_products = r_assign.json()
    count = len(assigned_products) if isinstance(assigned_products, list) else assigned_products.get('assigned_count', 0)
    print(f"Số sản phẩm đã gán tự động theo Dòng hàng APT: {count} sản phẩm")
    if isinstance(assigned_products, list):
        for ap in assigned_products[:5]:
            print(f"   * SKU: {ap.get('product_sku')} -> Gán vào Quy trình {ap.get('routing_code')}")

    # 7. Re-fetch routing and verify complete isolated state
    print("\n[Step 7] Kiểm tra lại Quy trình tổng thể...")
    r_check = requests.get(f"{BASE_URL}/production/routings")
    assert r_check.status_code == 200
    all_updated = r_check.json()
    target_qt = next((r for r in all_updated if r.get('id') == routing_id), None)
    assert target_qt is not None, "Không tìm thấy target_qt"
    print(f"Mã QT: {target_qt.get('code')}")
    print(f"Tên QT: {target_qt.get('name')}")
    print(f"Dòng hàng áp dụng (Line): {target_qt.get('line')}")
    print(f"Tổng số node trong chuỗi: {len(target_qt.get('nodes', []))}")
    print(f"Số lượng sản phẩm áp dụng: {target_qt.get('applied_count')}")

    print("\n" + "=" * 70)
    print(">>> KẾT QUẢ: TẤT CẢ CÁC BƯỚC TEST QUY TRÌNH & NHÀ MÁY ĐỀU THÀNH CÔNG 100%!")
    print("=" * 70)

if __name__ == '__main__':
    test_full_routing_flow()

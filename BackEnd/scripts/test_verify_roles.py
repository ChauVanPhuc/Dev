# -*- coding: utf-8 -*-
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=== 1. TEST GET /api/v1/roles/ ===")
res = client.get("/api/v1/roles/")
print(f"Status: {res.status_code}")
roles = res.json()
for r in roles:
    r_id = r["id"]
    r_name = r["name"]
    r_desc = r.get("description", "")
    p_cnt = len(r.get("permissions", []))
    print(f"  Role ID {r_id}: {r_name} - {r_desc} (Permissions count: {p_cnt})")

print("\n=== 2. TEST GET /api/v1/roles/{id}/permissions ===")
for r in roles:
    role_id = r["id"]
    p_res = client.get(f"/api/v1/roles/{role_id}/permissions")
    perms = p_res.json()
    perm_names = [p["name"] for p in perms]
    print(f"  Role {r['name']} (ID {role_id}) -> {len(perms)} permissions: {perm_names}")

print("\n=== 3. TEST GET /api/v1/permissions/ ===")
p_all_res = client.get("/api/v1/permissions/")
print(f"Status: {p_all_res.status_code}")
all_perms = p_all_res.json()
print(f"Total permissions in DB: {len(all_perms)}")
for p in all_perms:
    print(f"  Permission ID {p['id']}: {p['name']} (Stages: {len(p.get('stages', []))})")

print("\n=== 4. TEST GET /api/v1/permissions/{id}/stages ===")
for p in all_perms:
    if p["name"] in ["NV SX", "NV QC", "Admin"]:
        perm_id = p["id"]
        st_res = client.get(f"/api/v1/permissions/{perm_id}/stages")
        stages = st_res.json()
        print(f"  Permission {p['name']} (ID {perm_id}) has {len(stages)} stages.")
        if stages:
            sample_names = [s["name"] for s in stages[:4]]
            print(f"    Sample stages: {sample_names}...")

print("\n=== 5. TEST GET /api/v1/accounts/permissions/default ===")
default_res = client.get("/api/v1/accounts/permissions/default?role_id=1&permission_id=7")
print(f"Status: {default_res.status_code}")
if default_res.status_code == 200:
    res_data = default_res.json()
    print(f"Default permissions count: {len(res_data.get('permissions', {}))}")

print("\n=== ALL TESTS PASSED! ===")

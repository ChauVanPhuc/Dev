import requests

payload = {
    'inspection_type': 'quy-trinh',
    'product_sku': 'G7.SX.QT01 - test',
    'inspector_name': 'qcdhmt2',
    'conclusion': 'pass',
    'data_json': '{"created_by": "qcdhmt2"}'
}

r = requests.post('http://127.0.0.1:8000/api/v1/inspections/stage', json=payload)
print("STATUS:", r.status_code)
print("RECORD:", r.json()['id'], "INSPECTOR:", r.json()['inspector_name'])

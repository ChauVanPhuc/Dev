import urllib.request
import json

url = "http://localhost:8000/api/v1/iso-documents/20/details"
try:
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode('utf-8'))
    with open("scratch/doc_20_details.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Saved ID 20 details successfully.")
except Exception as e:
    print("Error:", e)

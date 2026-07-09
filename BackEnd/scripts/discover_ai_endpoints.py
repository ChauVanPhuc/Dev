# -*- coding: utf-8 -*-
import requests
import sys

endpoints = [
    # OpenAI compatible endpoints
    "https://ai.smartflowg7.cloud/v1/chat/completions",
    "https://ai.smartflowg7.cloud/api/v1/chat/completions",
    "https://ai.smartflowg7.cloud/api/v1/openai/chat/completions",
    
    # Ollama native endpoints
    "https://ai.smartflowg7.cloud/api/chat",
    "https://ai.smartflowg7.cloud/api/generate",
    
    # Model info endpoints
    "https://ai.smartflowg7.cloud/v1/models",
    "https://ai.smartflowg7.cloud/api/v1/models",
    "https://ai.smartflowg7.cloud/api/tags",
    
    # Base URL
    "https://ai.smartflowg7.cloud/"
]

print("=" * 80)
print("ĐANG KIỂM TRA CÁC ĐƯỜNG DẪN AI LOCAL TRÊN SERVER AI.SMARTFLOWG7.CLOUD")
print("=" * 80)

for url in endpoints:
    print(f"\n[TESTING] {url}")
    try:
        # Thử gửi GET trước (nếu là endpoint thông tin)
        res_get = requests.get(url, timeout=3.0)
        print(f"  GET status: {res_get.status_code}")
        if res_get.status_code == 200:
            print(f"  GET response (first 200 chars): {res_get.text[:200]}")
    except Exception as e:
        print(f"  GET failed: {e}")
        
    try:
        # Thử gửi POST với payload trống (để xem route có tồn tại không)
        res_post = requests.post(url, json={"model": "test", "messages": []}, timeout=3.0)
        print(f"  POST status: {res_post.status_code}")
        print(f"  POST response (first 200 chars): {res_post.text[:200]}")
    except Exception as e:
        print(f"  POST failed: {e}")

print("\n" + "=" * 80)
print("HOÀN THÀNH KIỂM TRA")
print("=" * 80)

#!/usr/bin/env python3
"""Test basic API without image first."""
import requests

def test_basic():
    """Test basic text-only request."""
    url = "http://localhost:8081/v1/chat/completions"
    
    payload = {
        "model": "gemini-3.5-flash",
        "messages": [
            {"role": "user", "content": "Say 'Hello' in one word"}
        ],
        "max_tokens": 10
    }
    
    headers = {
        "Authorization": "Bearer sk-gemini",
        "Content-Type": "application/json"
    }
    
    print("\n" + "="*70)
    print("  Testing Basic API (No Image)")
    print("="*70 + "\n")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            print(f"✅ Basic API works!")
            print(f"Response: {content}\n")
            return True
        else:
            print(f"❌ Error: {response.text}\n")
            return False
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


if __name__ == "__main__":
    test_basic()

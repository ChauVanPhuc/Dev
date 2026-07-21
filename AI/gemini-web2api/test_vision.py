#!/usr/bin/env python3
"""Test script for vision/multimodal capability of gemini-web2api."""
import requests
import base64
import json
import sys
import os
from pathlib import Path


def test_vision_with_base64(image_path: str, prompt: str = "Mô tả chi tiết ảnh này"):
    """Test vision capability with base64 encoded image."""
    print(f"\n{'='*60}")
    print(f"Testing Vision with: {image_path}")
    print(f"{'='*60}\n")
    
    # Read and encode image
    if not os.path.exists(image_path):
        print(f"❌ Error: File not found: {image_path}")
        return False
    
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()
    
    # Determine mime type
    ext = Path(image_path).suffix.lower()
    mime_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
    }
    mime_type = mime_map.get(ext, 'image/jpeg')
    
    # Prepare request
    url = os.getenv("LOCAL_GEMINI_URL", "http://localhost:8081/v1/chat/completions")
    api_key = os.getenv("LOCAL_GEMINI_API_KEY", "sk-gemini")
    model = os.getenv("LOCAL_GEMINI_MODEL", "gemini-3.5-flash")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.0,
        "max_tokens": 500
    }
    
    print(f"📤 Sending request to: {url}")
    print(f"🤖 Model: {model}")
    print(f"📝 Prompt: {prompt}")
    print(f"🖼️  Image size: {len(image_data)} bytes (base64)")
    print(f"🎨 MIME type: {mime_type}\n")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            print(f"✅ Success!")
            print(f"\n{'─'*60}")
            print(f"📋 Response:")
            print(f"{'─'*60}")
            print(content)
            print(f"{'─'*60}\n")
            
            # Print usage info
            usage = data.get("usage", {})
            if usage:
                print(f"📊 Token Usage:")
                print(f"   - Prompt: {usage.get('prompt_tokens', 0)}")
                print(f"   - Completion: {usage.get('completion_tokens', 0)}")
                print(f"   - Total: {usage.get('total_tokens', 0)}\n")
            
            return True
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}\n")
            return False
            
    except requests.exceptions.Timeout:
        print(f"❌ Error: Request timeout (30s)")
        print(f"💡 Tip: Check if gemini-web2api server is running\n")
        return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Cannot connect to {url}")
        print(f"💡 Tip: Make sure gemini-web2api server is running on port 8081\n")
        return False
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def test_vision_with_url(image_url: str, prompt: str = "What is in this image?"):
    """Test vision capability with image URL."""
    print(f"\n{'='*60}")
    print(f"Testing Vision with URL: {image_url}")
    print(f"{'='*60}\n")
    
    url = os.getenv("LOCAL_GEMINI_URL", "http://localhost:8081/v1/chat/completions")
    api_key = os.getenv("LOCAL_GEMINI_API_KEY", "sk-gemini")
    model = os.getenv("LOCAL_GEMINI_MODEL", "gemini-3.5-flash")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            }
        ],
        "temperature": 0.0,
        "max_tokens": 500
    }
    
    print(f"📤 Sending request to: {url}")
    print(f"🤖 Model: {model}")
    print(f"📝 Prompt: {prompt}\n")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ Success!\n")
            print(f"Response: {content}\n")
            return True
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}\n")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def check_server_status():
    """Check if gemini-web2api server is running."""
    url = os.getenv("LOCAL_GEMINI_URL", "http://localhost:8081/v1/chat/completions")
    base_url = url.rsplit("/", 2)[0]
    
    print(f"\n{'='*60}")
    print(f"Checking Server Status")
    print(f"{'='*60}\n")
    print(f"🔍 Checking: {base_url}\n")
    
    try:
        response = requests.get(base_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Server is running!")
            print(f"   Version: {data.get('version', 'unknown')}")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Models: {', '.join(data.get('models', []))}\n")
            return True
        else:
            print(f"⚠️  Server responded with status {response.status_code}\n")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to server")
        print(f"💡 Make sure gemini-web2api is running:\n")
        print(f"   cd m:/ERP/AI/gemini-web2api")
        print(f"   python -m gemini_web2api.server\n")
        return False
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def main():
    """Main test function."""
    print("\n" + "="*60)
    print("  Gemini Web2API Vision Test Suite")
    print("="*60)
    
    # Check server status first
    if not check_server_status():
        print("⚠️  Server is not running. Please start it first.\n")
        return
    
    # Check if image path provided
    if len(sys.argv) < 2:
        print("\n📖 Usage:")
        print(f"   python {sys.argv[0]} <image_path> [prompt]\n")
        print("📝 Examples:")
        print(f"   python {sys.argv[0]} test.jpg")
        print(f"   python {sys.argv[0]} test.png \"Đọc số trên đồng hồ này\"")
        print(f"   python {sys.argv[0]} meter.jpg \"Extract the meter reading\"\n")
        
        # Try to find test images
        test_images = []
        for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            test_images.extend(Path('.').glob(f'*{ext}'))
        
        if test_images:
            print("📁 Found images in current directory:")
            for img in test_images[:5]:
                print(f"   - {img}")
            print(f"\n💡 Try: python {sys.argv[0]} {test_images[0]}\n")
        else:
            print("💡 No test images found in current directory.\n")
        
        return
    
    image_path = sys.argv[1]
    prompt = sys.argv[2] if len(sys.argv) > 2 else "Mô tả chi tiết ảnh này"
    
    # Test with base64
    success = test_vision_with_base64(image_path, prompt)
    
    if success:
        print("✅ Vision test passed!")
        print("\n💡 Your gemini-web2api is working correctly with images!\n")
    else:
        print("❌ Vision test failed!")
        print("\n🔧 Troubleshooting:")
        print("   1. Check if cookie.txt exists and is valid")
        print("   2. Check if config.json has 'cookie_file' configured")
        print("   3. Try getting fresh cookies from gemini.google.com")
        print("   4. Check server logs for detailed error messages")
        print(f"\n📚 See SETUP_VISION.md for detailed setup instructions\n")


if __name__ == "__main__":
    main()

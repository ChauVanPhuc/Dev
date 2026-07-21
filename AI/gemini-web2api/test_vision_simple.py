#!/usr/bin/env python3
"""Simple vision test with a sample image URL."""
import requests
import json

def test_vision_with_url():
    """Test vision with a public image URL."""
    
    # Use a simple test image (1x1 red pixel as base64)
    # This is just to test if the API accepts image input
    red_pixel_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    url = "http://localhost:8081/v1/chat/completions"
    
    payload = {
        "model": "gemini-3.5-flash",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "What color is this image? Just answer with the color name."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{red_pixel_base64}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.0,
        "max_tokens": 50
    }
    
    headers = {
        "Authorization": "Bearer sk-gemini",
        "Content-Type": "application/json"
    }
    
    print("\n" + "="*70)
    print("  Testing Vision Capability")
    print("="*70 + "\n")
    print("📤 Sending request to:", url)
    print("🖼️  Image: 1x1 red pixel (base64)")
    print("📝 Prompt: What color is this image?\n")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}\n")
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            print("✅ SUCCESS! Vision is working!\n")
            print("─" * 70)
            print("Response:")
            print("─" * 70)
            print(content)
            print("─" * 70 + "\n")
            
            return True
        else:
            print("❌ ERROR!")
            print("─" * 70)
            print(response.text)
            print("─" * 70 + "\n")
            
            if "Image upload failed" in response.text:
                print("💡 Troubleshooting:")
                print("   - Cookie may have expired")
                print("   - Try getting fresh cookies from gemini.google.com")
                print("   - Make sure cookie.txt exists and is valid\n")
            
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server")
        print("💡 Make sure gemini-web2api is running:")
        print("   python -m gemini_web2api.server\n")
        return False
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


if __name__ == "__main__":
    success = test_vision_with_url()
    
    if success:
        print("="*70)
        print("🎉 Vision capability is working correctly!")
        print("="*70)
        print("\n📝 You can now use vision in your application:")
        print("   - OCR for meter readings")
        print("   - Image analysis")
        print("   - Object detection")
        print("   - And more!\n")
    else:
        print("="*70)
        print("⚠️  Vision test failed")
        print("="*70)
        print("\n📚 Check the documentation:")
        print("   - SETUP_VISION.md")
        print("   - HUONG_DAN_VISION.md")
        print("   - QUICK_FIX.txt\n")

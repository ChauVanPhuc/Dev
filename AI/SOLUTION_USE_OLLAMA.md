# Giải pháp: Sử dụng Ollama cho Vision (Khuyến nghị)

## Tình hình hiện tại

✅ **Gemini Web2API hoạt động** - Text generation OK  
❌ **Vision không hoạt động** - Gemini không nhận được ảnh qua base64  
🔍 **Nguyên nhân**: Gemini Web API có hạn chế với image upload qua base64

## Giải pháp: Ollama + LLaVA (Vision Model)

### Ưu điểm:
- ✅ **Miễn phí 100%** - Chạy hoàn toàn local
- ✅ **Không cần cookies** - Không cần authentication
- ✅ **Vision hoạt động tốt** - Hỗ trợ đầy đủ multimodal
- ✅ **Dễ setup** - Chỉ 3 bước
- ✅ **OpenAI compatible** - Dùng API giống OpenAI

### Nhược điểm:
- ⚠️ Cần GPU/RAM tốt (khuyến nghị 8GB+ RAM)
- ⚠️ Model size ~4-7GB

---

## Setup Ollama (3 bước)

### Bước 1: Cài đặt Ollama

**Windows:**
```bash
# Download từ: https://ollama.ai/download
# Chạy installer và cài đặt
```

**Hoặc dùng winget:**
```bash
winget install Ollama.Ollama
```

### Bước 2: Pull Vision Model

```bash
# LLaVA - Vision model tốt nhất cho Ollama
ollama pull llava

# Hoặc dùng model nhỏ hơn (nhanh hơn, ít RAM hơn)
ollama pull llava:7b
```

### Bước 3: Cập nhật Backend Config

**File: `m:/ERP/BackEnd/.env`**

Thêm/sửa các dòng sau:

```env
# Ollama Vision API
LOCAL_GEMINI_URL=http://localhost:11434/v1/chat/completions
LOCAL_GEMINI_MODEL=llava
LOCAL_GEMINI_API_KEY=ollama
```

**Lưu ý**: Ollama chạy trên port **11434** (không phải 8081)

---

## Test Ollama Vision

### Test 1: Kiểm tra Ollama đang chạy

```bash
curl http://localhost:11434/api/tags
```

Kết quả mong đợi:
```json
{
  "models": [
    {
      "name": "llava:latest",
      "size": 4733363377,
      ...
    }
  ]
}
```

### Test 2: Test Vision với Python

```python
import requests
import base64

# Đọc ảnh
with open("test.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

# Gọi Ollama API
response = requests.post(
    "http://localhost:11434/v1/chat/completions",
    json={
        "model": "llava",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "Mô tả ảnh này"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data}"
                    }
                }
            ]
        }],
        "max_tokens": 200
    }
)

print(response.json()["choices"][0]["message"]["content"])
```

---

## So sánh: Gemini Web2API vs Ollama

| Tính năng | Gemini Web2API | Ollama + LLaVA |
|-----------|----------------|----------------|
| **Text generation** | ✅ Tốt | ✅ Tốt |
| **Vision/Image** | ❌ Không hoạt động | ✅ Hoạt động tốt |
| **Setup** | Phức tạp (cần cookies) | Đơn giản |
| **Chi phí** | Miễn phí (dùng Google) | Miễn phí (local) |
| **Tốc độ** | Nhanh (cloud) | Phụ thuộc GPU |
| **Privacy** | Gửi lên Google | 100% local |
| **Yêu cầu** | Internet + Cookies | GPU/RAM |

---

## Cấu hình Backend hiện tại

Backend của bạn đã có **fallback mechanism** trong `inspection_routes.py`:

```python
# 1. Thử Local AI trước (Ollama)
if local_ai_url:
    try:
        # Gọi local AI với ảnh
        ...
    except:
        pass

# 2. Fallback sang GitHub Models
if extracted_value is None:
    # Gọi GitHub Models API
    ...

# 3. Fallback sang OpenRouter
if extracted_value is None:
    # Gọi OpenRouter API
    ...
```

**Với Ollama**, bạn chỉ cần:
1. Cài Ollama
2. Pull llava model
3. Cập nhật `.env` với `LOCAL_GEMINI_URL=http://localhost:11434/v1/chat/completions`
4. Restart backend

→ Backend sẽ tự động dùng Ollama cho OCR!

---

## Các Vision Models khác trên Ollama

```bash
# LLaVA (khuyến nghị - tốt nhất)
ollama pull llava

# BakLLaVA (nhanh hơn, nhẹ hơn)
ollama pull bakllava

# LLaVA 13B (chất lượng cao hơn, cần nhiều RAM)
ollama pull llava:13b

# Moondream (siêu nhỏ, siêu nhanh - 1.6GB)
ollama pull moondream
```

---

## Kết luận

### Khuyến nghị: **Dùng Ollama + LLaVA**

**Lý do:**
1. ✅ Vision hoạt động chắc chắn
2. ✅ Không cần cookies phức tạp
3. ✅ 100% local, không phụ thuộc internet
4. ✅ Backend đã sẵn sàng hỗ trợ

**Các bước:**
```bash
# 1. Cài Ollama
winget install Ollama.Ollama

# 2. Pull model
ollama pull llava

# 3. Cập nhật .env
LOCAL_GEMINI_URL=http://localhost:11434/v1/chat/completions
LOCAL_GEMINI_MODEL=llava

# 4. Restart backend
# 5. Test OCR
```

---

## Alternative: Giữ cả 2

Bạn có thể giữ cả Gemini (cho text) và Ollama (cho vision):

**Backend logic:**
```python
# Nếu có ảnh → dùng Ollama
if has_image:
    url = "http://localhost:11434/v1/chat/completions"
    model = "llava"
# Nếu chỉ text → dùng Gemini
else:
    url = "http://localhost:8081/v1/chat/completions"
    model = "gemini-3.5-flash"
```

---

**Bạn muốn thử Ollama không?** Tôi có thể hướng dẫn chi tiết từng bước! 🚀

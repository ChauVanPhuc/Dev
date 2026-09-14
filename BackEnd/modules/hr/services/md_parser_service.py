# -*- coding: utf-8 -*-
import re
import json
from typing import Dict, List, Any, Optional

def parse_markdown_assessment(content: str) -> Dict[str, Any]:
    """
    Phân tích cú pháp file/văn bản Markdown (.md) thành dữ liệu bài kiểm tra và danh sách câu hỏi chuẩn hóa.
    Hỗ trợ cấu trúc tiêu đề, nhóm vị trí áp dụng, thời gian, mô tả và từng khối câu hỏi.
    """
    lines = content.splitlines()
    
    metadata: Dict[str, Any] = {
        "title": "Bài kiểm tra năng lực",
        "duration_minutes": 45,
        "category": "Quản lý chất lượng",
        "target_positions": ["QA", "QC", "Tổ trưởng"],
        "pass_percentage": 60.0,
        "shuffle_questions": True,
        "shuffle_options": True,
        "description": "",
        "instructions": "",
    }
    
    questions: List[Dict[str, Any]] = []
    warnings: List[str] = []
    
    # 1. Tách phần Header Metadata và phần Danh sách câu hỏi
    first_q_match = re.search(r'(?m)^(?:---|\#{2,4}\s*Câu|\#{2,4}\s*Question|Câu\s+\d+[\:\.\)])', content)
    if first_q_match:
        header_text = content[:first_q_match.start()]
        body_content = content[first_q_match.start():]
    else:
        header_text = content
        body_content = ""
    
    # 2. Xử lý Metadata từ Header
    for line in header_text.splitlines():
        line_clean = line.strip()
        if not line_clean:
            continue
            
        # Tiêu đề bài kiểm tra
        if line_clean.startswith('#'):
            title_match = re.sub(r'^\#+\s*(?:Tiêu đề|Title)?\s*[\:\-]?\s*', '', line_clean, flags=re.IGNORECASE)
            if title_match:
                metadata["title"] = title_match.strip()
            continue
            
        # Key - Value metadata
        kv_match = re.match(r'^[\-\*\•]?\s*([^:\-]+)[\:\=]\s*(.*)$', line_clean)
        if kv_match:
            k = kv_match.group(1).strip().lower()
            v = kv_match.group(2).strip()
            
            if "thời gian" in k or "duration" in k or "time" in k:
                num_match = re.search(r'\d+', v)
                if num_match:
                    metadata["duration_minutes"] = int(num_match.group())
            elif "danh mục" in k or "category" in k or "bộ phận" in k or "phòng ban" in k:
                metadata["category"] = v
            elif "vị trí" in k or "chức danh" in k or "position" in k:
                positions = [p.strip() for p in re.split(r'[,;\|\/]', v) if p.strip()]
                if positions:
                    metadata["target_positions"] = positions
            elif "tỷ lệ đạt" in k or "pass" in k:
                p_match = re.search(r'[\d\.]+', v)
                if p_match:
                    metadata["pass_percentage"] = float(p_match.group())
            elif "xáo trộn câu" in k or "shuffle_q" in k:
                metadata["shuffle_questions"] = v.lower() in ("true", "1", "yes", "có", "bật")
            elif "xáo trộn đáp án" in k or "shuffle_opt" in k:
                metadata["shuffle_options"] = v.lower() in ("true", "1", "yes", "có", "bật")
            elif "mô tả" in k or "description" in k:
                metadata["description"] = v
            elif "hướng dẫn" in k or "instructions" in k:
                metadata["instructions"] = v

    # 3. Phân tích từng khối câu hỏi
    raw_blocks = re.split(r'(?m)^(?:\-{3,}|\#{2,4}\s*(?:Câu|Question)\s*\d+[\:\.\-]?|Câu\s+\d+[\:\.\-])', body_content)
    
    order_idx = 1
    for block in raw_blocks:
        block_text = block.strip()
        if not block_text:
            continue
            
        q_text = ""
        q_type = "single_choice"
        options: List[Dict[str, str]] = []
        correct_answers: List[str] = []
        points = 1.0
        category_tag = ""
        explanation = ""
        
        block_lines = block_text.splitlines()
        q_text_lines = []
        parsing_options = False
        
        for bl in block_lines:
            bl_str = bl.strip()
            if not bl_str:
                continue
                
            # Kiểm tra dòng thuộc tính câu hỏi (Điểm, Chủ đề, Giải thích)
            attr_match = re.match(r'^[\*\-\•]?\s*(Điểm|Points?|Chủ đề|Category|Giải thích|Explanation|Topic)[\:\=]\s*(.*)$', bl_str, flags=re.IGNORECASE)
            if attr_match:
                attr_name = attr_match.group(1).strip().lower()
                attr_val = attr_match.group(2).strip()
                if "điểm" in attr_name or "point" in attr_name:
                    p_match = re.search(r'[\d\.]+', attr_val)
                    if p_match:
                        try:
                            points = float(p_match.group())
                        except ValueError:
                            points = 1.0
                elif "chủ đề" in attr_name or "category" in attr_name or "topic" in attr_name:
                    category_tag = attr_val
                elif "giải thích" in attr_name or "explanation" in attr_name:
                    explanation = attr_val
                continue
                
            # Kiểm tra phương án trắc nghiệm
            opt_checkbox_match = re.match(r'^[\-\*\•]?\s*\[([ xXvV])\]\s*([A-Za-z0-9]+)[\.\:\)]\s*(.*)$', bl_str)
            opt_plain_match = re.match(r'^[\-\*\•]?\s*([A-Fa-f0-9]+)[\.\:\)]\s+(.*)$', bl_str)
            
            if opt_checkbox_match:
                parsing_options = True
                is_checked = opt_checkbox_match.group(1).lower() in ('x', 'v')
                opt_id = opt_checkbox_match.group(2).strip().upper()
                opt_content = opt_checkbox_match.group(3).strip()
                
                options.append({"id": opt_id, "text": opt_content})
                if is_checked:
                    correct_answers.append(opt_id)
            elif opt_plain_match and len(opt_plain_match.group(1)) <= 2:
                parsing_options = True
                opt_id = opt_plain_match.group(1).strip().upper()
                opt_content = opt_plain_match.group(2).strip()
                
                is_correct = False
                if re.search(r'\((?:đúng|correct|chính xác|\*)\)$', opt_content, flags=re.IGNORECASE):
                    is_correct = True
                    opt_content = re.sub(r'\s*\((?:đúng|correct|chính xác|\*)\)$', '', opt_content, flags=re.IGNORECASE).strip()
                elif opt_content.endswith('*'):
                    is_correct = True
                    opt_content = opt_content.rstrip('*').strip()
                    
                options.append({"id": opt_id, "text": opt_content})
                if is_correct:
                    correct_answers.append(opt_id)
            else:
                if not parsing_options:
                    q_clean = re.sub(r'^(?:\#{2,4}\s*)?(?:Câu|Question)\s*\d+[\:\.\-]?\s*', '', bl_str, flags=re.IGNORECASE).strip()
                    if q_clean:
                        q_text_lines.append(q_clean)
        
        q_text = " ".join(q_text_lines).strip()
        if not q_text and block_lines:
            q_text = block_lines[0].strip()
            
        if not q_text:
            continue
            
        # Xác định loại câu hỏi
        if len(correct_answers) > 1:
            q_type = "multi_choice"
        elif len(options) == 0:
            q_type = "essay"
        else:
            q_type = "single_choice"
            
        if len(options) > 0 and len(correct_answers) == 0:
            correct_answers.append(options[0]["id"])
            warnings.append(f"Câu {order_idx}: Chưa đánh dấu đáp án đúng, hệ thống tạm gán phương án {options[0]['id']}.")
            
        questions.append({
            "order_index": order_idx,
            "question_type": q_type,
            "question_text": q_text,
            "category_tag": category_tag or metadata.get("category", ""),
            "options": options,
            "correct_answers": correct_answers,
            "points": points,
            "explanation": explanation
        })
        order_idx += 1

    return {
        "metadata": metadata,
        "questions": questions,
        "total_questions": len(questions),
        "warnings": warnings
    }

def generate_assessment_markdown_template() -> str:
    """Tạo mẫu file Markdown (.md) chuẩn để tải về hoặc tham khảo"""
    return """# Tiêu đề: Đánh giá Năng lực Chuyên môn QA/QC Mới
- Thời gian: 45
- Danh mục: Quản lý chất lượng
- Vị trí áp dụng: QA, QC, KCS, Tổ trưởng
- Tỷ lệ đạt: 60
- Xáo trộn câu hỏi: true
- Xáo trộn đáp án: true
- Mô tả: Bộ câu hỏi kiểm tra năng lực tiêu chuẩn CARB Phase 2, FSC, ISO và quy trình kiểm tra SOP xưởng sản xuất.

---
### Câu 1: Tiêu chuẩn CARB Phase 2 quy định mức phát thải Formaldehyde tối đa đối với ván ép HWPW là bao nhiêu?
- [x] A. 0.05 ppm
- [ ] B. 0.08 ppm
- [ ] C. 0.11 ppm
- [ ] D. 0.13 ppm
* Điểm: 2.0
* Chủ đề: Tiêu chuẩn CARB
* Giải thích: Theo quy định CARB Phase 2, giới hạn phát thải Formaldehyde cho HWPW là <= 0.05 ppm.

---
### Câu 2: Khi phát hiện sản phẩm có lỗi nghiêm trọng tại chuyền, hành động đầu tiên của QC là gì?
- [x] A. Dừng chuyền, gắn thẻ cách ly và báo cho Tổ trưởng & QA
- [ ] B. Tiếp tục làm và ghi sổ cuối ca
- [ ] C. Tự ý sửa mà không ghi chép
- [ ] D. Bỏ qua nếu lỗi nhỏ
* Điểm: 2.0
* Chủ đề: Quy trình SOP
* Giải thích: Khi gặp lỗi nghiêm trọng, phải cách ly hàng và báo cáo ngay để tránh tạo ra phế phẩm hàng loạt.

---
### Câu 3: Những chứng chỉ nào sau đây liên quan đến nguồn gốc gỗ hợp pháp và bảo vệ rừng?
- [x] A. FSC-CoC
- [x] B. PEFC
- [ ] C. ISO 9001
- [ ] D. CARB Phase 2
* Điểm: 2.0
* Chủ đề: Tiêu chuẩn FSC
* Giải thích: FSC và PEFC là hai chứng chỉ quốc tế chứng nhận nguồn gốc gỗ hợp pháp và quản lý rừng bền vững.

---
### Câu 4: Hãy nêu 3 bước xử lý cơ bản khi xảy ra khiếu nại khách hàng theo quy trình CAPA.
* Điểm: 2.0
* Chủ đề: Quy trình CAPA
* Giải thích: 1. Cách ly & khoanh vùng sản phẩm lỗi. 2. Tìm nguyên nhân gốc rễ (5-Why). 3. Đưa ra hành động khắc phục và phòng ngừa tái diễn.
"""

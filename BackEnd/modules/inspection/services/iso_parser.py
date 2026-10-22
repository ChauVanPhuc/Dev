import os
import docx
import json
import re
import unicodedata

def parse_iso_docx(file_path: str) -> dict:
    """
    Phân tích file Word (.docx) của tài liệu ISO để tự động bóc tách:
    - Thông tin bìa (Mã hiệu, Lần ban hành, Ngày ban hành, Người soạn thảo, Người duyệt)
    - Nhật ký sửa đổi tài liệu (Revision Log table)
    - Các mục nội dung lớn (Mục đích, Phạm vi, Viện dẫn, Định nghĩa)
    - Sơ đồ lưu đồ quy trình từ bảng các bước (Bước, Trách nhiệm, Lưu đồ, Biểu mẫu)
    """
    result = {
        "code": "",
        "name": "",
        "version": "01",
        "issue_date": "",
        "issuer": "",
        "approver": "",
        "revision_logs": [],
        "sections": {},
        "steps": []
    }

    if not os.path.exists(file_path):
        return result

    try:
        doc = docx.Document(file_path)
    except Exception as e:
        print(f"Error loading docx file: {e}")
        return result

    def clean_paragraph_text(p):
        text_val = unicodedata.normalize('NFC', p.text).strip()
        if not text_val:
            return ""
        is_list_paragraph = p.style.name and ("list" in p.style.name.lower() or "bullet" in p.style.name.lower())
        if is_list_paragraph:
            if not re.match(r"^[-\*\u2022\u2714\u2713\u2013\u2014\d+\.]", text_val):
                text_val = "- " + text_val
        return text_val

    # 1. Trích xuất thông tin chung và tiêu đề từ các đoạn văn bản (paragraphs)
    text_lines = []
    for p in doc.paragraphs:
        t = clean_paragraph_text(p)
        if t:
            text_lines.append(t)

    # Thử tìm tiêu đề quy trình từ các bảng trước (thường nằm ở hàng đầu/bìa của bảng đầu tiên)
    for table in doc.tables[:2]:
        for row in table.rows:
            for cell in row.cells:
                text_clean = cell.text.strip().replace('\n', ' ')
                if "QUY TRÌNH" in text_clean.upper() and len(text_clean) < 150:
                    # Loại bỏ khoảng trắng thừa
                    result["name"] = re.sub(r'\s+', ' ', text_clean)
                    break
            if result["name"]:
                break
        if result["name"]:
            break

    # Nếu không tìm thấy trong bảng, thử tìm từ các đoạn văn bản (paragraphs)
    if not result["name"]:
        for line in text_lines[:15]:
            line_upper = line.upper()
            if "QUY TRÌNH" in line_upper and len(line) < 150:
                result["name"] = line
                break

    if not result["name"]:
        result["name"] = "Quy trình kiểm soát chất lượng mới"

    # Phân tích thông tin cặp Key-Value ở bìa
    full_text = "\n".join(text_lines)
    
    # Tìm mã hiệu
    code_match = re.search(r"(?:Mã hiệu|Mã quy trình|Mã số)\s*:\s*([^\n]+)", full_text, re.IGNORECASE)
    if code_match:
        result["code"] = code_match.group(1).strip()
    else:
        # Thử tìm mã hiệu từ tên tệp (ví dụ: G7.BG.QT02...)
        base_fn = os.path.basename(file_path)
        m_code_fn = re.search(r"([A-Z0-9]+(?:\.[A-Z0-9]+)*-[A-Z0-9]+)", base_fn)
        if not m_code_fn:
            m_code_fn = re.search(r"(G7\.[A-Z0-9]+(?:\.[A-Z0-9]+)*)", base_fn, re.IGNORECASE)
        if m_code_fn:
            result["code"] = m_code_fn.group(1).strip()
    
    # Tìm lần ban hành
    ver_match = re.search(r"(?:Lần ban hành|Phiên bản)\s*:\s*([^\n]+)", full_text, re.IGNORECASE)
    if ver_match:
        result["version"] = ver_match.group(1).strip()
        
    # Tìm ngày ban hành
    date_match = re.search(r"(?:Ngày ban hành|Hiệu lực từ)\s*:\s*([^\n]+)", full_text, re.IGNORECASE)
    if date_match:
        result["issue_date"] = date_match.group(1).strip()

    # Tìm người soạn thảo (Biên soạn) và người phê duyệt từ Table 0 bìa trước (độ chính xác cao hơn)
    for table in doc.tables[:2]:
        for row in table.rows:
            if len(row.cells) >= 3:
                c0 = row.cells[0].text.strip().lower()
                c1 = row.cells[1].text.strip().lower() if len(row.cells) > 1 else ""
                
                # Check for issuer
                if "biên soạn" in c0 or "biên soạn" in c1 or "người soạn" in c0:
                    name = row.cells[2].text.strip()
                    title = row.cells[3].text.strip() if len(row.cells) > 3 else ""
                    if name:
                        result["issuer"] = f"{name} ({title})" if title else name
                
                # Check for approver (chấp nhận cả phê duyệt và phu duyệt do lỗi chính tả tài liệu)
                if "phê duyệt" in c0 or "phê duyệt" in c1 or "phu duyệt" in c0 or "phu duyệt" in c1 or "người duyệt" in c0:
                    name = row.cells[2].text.strip()
                    title = row.cells[3].text.strip() if len(row.cells) > 3 else ""
                    if name:
                        result["approver"] = f"{name} ({title})" if title else name

    # Fallback tìm từ các đoạn văn bản (paragraphs) nếu bảng chưa có
    if not result["issuer"]:
        issuer_match = re.search(r"(?:Biên soạn|Soạn thảo|Người lập)\s*\n*\s*([^\n]+)", full_text, re.IGNORECASE)
        if issuer_match:
            result["issuer"] = issuer_match.group(1).strip()

    if not result["approver"]:
        approver_match = re.search(r"(?:Phê duyệt|Người duyệt)\s*\n*\s*([^\n]+)", full_text, re.IGNORECASE)
        if approver_match:
            result["approver"] = approver_match.group(1).strip()

    # 2. Phân tích các Bảng (Tables)
    roles_list = []
    templates_list = []
    table_steps = []

    for table in doc.tables:
        if len(table.rows) < 2:
            continue
            
        # Kiểm tra tiêu đề của các cột trong hàng đầu tiên
        headers = [cell.text.strip().lower() for cell in table.rows[0].cells]
        
        # A. Kiểm tra nếu là Bảng Nhật ký sửa đổi (Revision Log)
        is_rev_table = any("sửa đổi" in h or "ngày sửa" in h or "nội dung" in h for h in headers)
        if is_rev_table:
            for row in table.rows[1:]:
                cells = [c.text.strip() for c in row.cells]
                if len(cells) >= 3:
                    # Map các cột tương ứng: STT, Ngày sửa, Nội dung sửa đổi, Trang số
                    result["revision_logs"].append({
                        "seq_no": len(result["revision_logs"]) + 1,
                        "rev_date": cells[1] if len(cells) > 1 else "",
                        "content": cells[2] if len(cells) > 2 else "",
                        "page_no": cells[3] if len(cells) > 3 else ""
                    })
            continue

        # B. Kiểm tra nếu là Bảng Danh mục biểu mẫu và hồ sơ lưu trữ (Mục 6)
        is_forms_table = any("mã hiệu" in h or "thời hạn" in h or "nơi lưu trữ" in h for h in headers) or (any("biểu mẫu" in h or "hồ sơ" in h for h in headers) and not any("lưu đồ" in h or "trách nhiệm" in h for h in headers))
        if is_forms_table:
            forms_rows = []
            for r_idx, row in enumerate(table.rows):
                cells_text = [re.sub(r'\s+', ' ', c.text.strip()) for c in row.cells]
                if r_idx == 0:
                    th_cells = "".join([f'<th style="border:1px solid #000000; padding:6px 8px; font-weight:bold; background:#F1F5F9; text-align:center; font-size:10pt; font-family:\'Times New Roman\', serif;">{c}</th>' for c in cells_text])
                    forms_rows.append(f'<tr>{th_cells}</tr>')
                else:
                    td_cells = "".join([f'<td style="border:1px solid #000000; padding:6px 8px; text-align:{"center" if idx in [0, 2, 3] else "left"}; font-size:10pt; font-family:\'Times New Roman\', serif;">{c}</td>' for idx, c in enumerate(cells_text)])
                    forms_rows.append(f'<tr>{td_cells}</tr>')
            forms_table_html = f'<table class="iso-doc-forms-table" style="width:100%; border-collapse:collapse; margin-top:8px; border:1px solid #000000; font-family:\'Times New Roman\', serif;"><tbody>{"".join(forms_rows)}</tbody></table>'
            result["forms_table_html"] = forms_table_html
            continue

        # C. Kiểm tra nếu là Bảng các bước lưu đồ (Flowchart/Process table)
        is_flow_table = any("trách nhiệm" in h or "lưu đồ" in h for h in headers)
        if is_flow_table:
            # Xác định chỉ mục các cột
            col_idx = {
                "step": -1,
                "role": -1,
                "flow": -1,
                "template": -1
            }
            for idx, h in enumerate(headers):
                if "bước" in h or "stt" in h:
                    col_idx["step"] = idx
                elif "trách nhiệm" in h:
                    col_idx["role"] = idx
                elif "lưu đồ" in h or "tên bước" in h or "nội dung" in h:
                    col_idx["flow"] = idx
                elif "biểu mẫu" in h or "tài liệu" in h or "phụ lục" in h:
                    col_idx["template"] = idx

            # Lưu trữ thông tin phân công và biểu mẫu từ bảng để đối chiếu
            for row in table.rows[1:]:
                cells = [c.text.strip() for c in row.cells]
                role = cells[col_idx["role"]] if col_idx["role"] >= 0 and col_idx["role"] < len(cells) else ""
                template = cells[col_idx["template"]] if col_idx["template"] >= 0 and col_idx["template"] < len(cells) else ""
                flow = cells[col_idx["flow"]] if col_idx["flow"] >= 0 and col_idx["flow"] < len(cells) else ""
                step_str = cells[col_idx["step"]] if col_idx["step"] >= 0 and col_idx["step"] < len(cells) else ""
                
                roles_list.append(role)
                templates_list.append(template)

                # Fallback steps đề phòng không bóc tách được bước nào từ paragraphs
                if flow:
                    step_num = len(table_steps) + 1
                    try:
                        nums = re.findall(r"\d+", step_str)
                        if nums:
                            step_num = int(nums[0])
                    except:
                        pass
                    
                    node_type = "task"
                    flow_lower = flow.lower()
                    if "tiếp nhận" in flow_lower or "bắt đầu" in flow_lower:
                        node_type = "start"
                    elif ("kiểm tra" in flow_lower and ("chất lượng" in flow_lower or "qc" in flow_lower or "đạt" in flow_lower)) or "quyết định" in flow_lower:
                        node_type = "decision"
                    elif "kết thúc" in flow_lower or "hoàn thành" in flow_lower:
                        node_type = "end"

                    table_steps.append({
                        "step_number": step_num,
                        "name": flow,
                        "assignee_role": role,
                        "instructions": f"<p style=\"font-family: 'Times New Roman', Times, serif;\">Hướng dẫn chi tiết cho bước: <strong>{flow}</strong></p><p style=\"font-family: 'Times New Roman', Times, serif;\">Trách nhiệm thực hiện: {role}. Biểu mẫu đính kèm: {template}</p>",
                        "template_files": template,
                        "node_type": node_type
                    })
            continue

    # 3. Phân tích nội dung văn bản chính (Các phần lớn từ 1 đến 5)
    current_section = None
    section_content = []

    # Bóc tách danh sách bước trực tiếp từ paragraphs trong phần diễn giải
    extracted_steps = []
    current_step = None

    for p in doc.paragraphs:
        line = clean_paragraph_text(p)
        if not line:
            continue
            
        line_lower = line.lower()
        
        # Nhận diện dòng bắt đầu bước: "Bước X: [Tên bước]" hoặc "B1: [Tên bước]"
        step_match = re.match(r"^(?:Bước|B)\s*(\d+)\s*[:.-]?\s*(.+)$", line, re.IGNORECASE)
        if step_match:
            step_num = int(step_match.group(1))
            step_name = step_match.group(2).strip()
            
            # Kiểm tra xem có đúng định dạng bước không (số thứ tự nhỏ, độ dài tiêu đề vừa phải)
            if step_num < 15 and len(step_name) < 100 and not re.match(r"^\d+\.", line):
                if current_step:
                    extracted_steps.append(current_step)
                current_step = {
                    "step_number": step_num,
                    "name": step_name,
                    "instructions_list": [],
                    "assignee_role": "", # Không gán cứng
                    "template_files": "",
                    "node_type": "task"
                }
                # QUAN TRỌNG: Vẫn đưa dòng tiêu đề bước vào section_content của Mục 5
                # để mục Diễn giải chi tiết không bị mất các tiêu đề Bước 1, Bước 2, Bước 3...
                if current_section:
                    section_content.append(line)
                continue

        # Nhận diện tiêu đề mục mới bằng cách quét các thuộc tính hình thức văn bản và từ khóa
        is_heading = False
        is_step = re.match(r'^(?:Bước|B)\s*\d+', line, re.IGNORECASE)
        is_exclude = (
            "theo dõi sửa đổi" in line_lower or 
            "diễn giải" in line_lower or 
            "lưu đồ" in line_lower or
            "(xem trang" in line_lower or 
            "xem trang sau" in line_lower or
            "[" in line or
            "]" in line or
            "✓" in line
        )
        
        is_numbered_heading = bool(re.match(r'^\s*(?:\d+|[IVXLCDM]+)\s*[\.\-\:\s]\s*([a-zA-ZÀ-ỹ\s]{3,60})', line)) and len(line) <= 80
        is_subbullet_or_sig = (
            line.startswith(('-', '*', '•')) or 
            (bool(re.match(r'^\s*\d+[\)\.]', line)) and not is_numbered_heading) or
            bool(re.match(r'^\s*[a-z][\)\.]', line)) or
            any(sig in line_lower for sig in ['tổng giám đốc', 'phó giám đốc', 'ngày ban hành', 'đồng nai, ngày'])
        )

        if not is_step and not is_exclude and not is_subbullet_or_sig and len(line) <= 80:
            # Kiểm tra xem style có phải là Heading
            style_name = p.style.name.lower() if p.style and p.style.name else ""
            if "heading" in style_name or is_numbered_heading:
                is_heading = True
            elif re.match(r'^\s*(?:\d+|[IVXLCDM]+)\s*[\.\-\:\s]\s*[a-zA-ZÀ-ỹ]', line):
                is_heading = True
            else:
                keywords = ["mục đích", "phạm vi", "tài liệu viện dẫn", "tài liệu tham khảo", 
                            "định nghĩa", "từ viết tắt", "nội dung", "biểu mẫu", "phụ lục",
                            "nguyên tắc", "vai trò và trách nhiệm", "cam kết", "biện pháp"]
                for kw in keywords:
                    if kw in line_lower and len(line) < 50:
                        is_heading = True
                        break
                if not is_heading and p.runs and all(run.bold for run in p.runs if run.text.strip()) and len(line) < 40 and not any(line.strip().endswith(x) for x in ['?', '!', ',']):
                    is_heading = True
                
        if is_heading:
            if current_section is not None:
                filtered_lines = [
                    c for c in section_content
                    if not (
                        re.search(r'ngày\s+\d+\s+tháng\s+\d+\s+năm', c.lower()) or
                        re.match(r'^(?:p\.?\s*)?(?:tổng\s+)?giám\s+đốc\b', c.lower()) or
                        c.lower().strip() in ['nguyễn hòa', 'đặng văn nam']
                    )
                ]
                content_p = "<p style=\"font-family: 'Times New Roman', Times, serif;\">" + "</p><p style=\"font-family: 'Times New Roman', Times, serif;\">".join(filtered_lines) + "</p>" if filtered_lines else ""
                if content_p.replace('<p style="font-family: \'Times New Roman\', Times, serif;">', '').replace('</p>', '').strip():
                    result["sections"][current_section] = content_p
            
            # Giữ nguyên văn tên mục của tài liệu
            current_section = line.strip()
            section_content = []
            
            if current_step:
                extracted_steps.append(current_step)
                current_step = None
        else:
            if current_section:
                section_content.append(line)
            
            # Ghi chỉ dẫn chi tiết cho bước quy trình đang duyệt
            if current_step:
                # Nếu bắt gặp đầu dòng là mục lớn hoặc chữ số phần lớn, ngắt lưu trữ bước
                is_major_section = False
                if not is_step and len(line) <= 80 and "[" not in line and "]" not in line and "✓" not in line:
                    if re.match(r'^\s*(?:\d+|[IVXLCDM]+)\s*[\.\-\:\s]\s*[a-zA-ZÀ-ỹ]', line):
                        is_major_section = True
                    else:
                        keywords = ["mục đích", "phạm vi", "tài liệu viện dẫn", "tài liệu tham khảo", 
                                    "định nghĩa", "từ viết tắt", "nội dung", "biểu mẫu", "phụ lục"]
                        for kw in keywords:
                            if kw in line_lower and len(line) < 40:
                                is_major_section = True
                                break
                if is_major_section:
                    extracted_steps.append(current_step)
                    current_step = None
                else:
                    current_step["instructions_list"].append(line)

    # Đóng gói mục cuối cùng và bước cuối cùng
    if current_section is not None:
        filtered_lines = [
            c for c in section_content
            if not (
                re.search(r'ngày\s+\d+\s+tháng\s+\d+\s+năm', c.lower()) or
                re.match(r'^(?:p\.?\s*)?(?:tổng\s+)?giám\s+đốc\b', c.lower()) or
                c.lower().strip() in ['nguyễn hòa', 'đặng văn nam']
            )
        ]
        final_p = "<p>" + "</p><p>".join(filtered_lines) + "</p>" if filtered_lines else ""
        if final_p.replace('<p>', '').replace('</p>', '').strip():
            result["sections"][current_section] = final_p
    if current_step:
        extracted_steps.append(current_step)

    # 4. Đối chiếu vai trò và biểu mẫu từ Table 2 vào các bước bóc tách được từ Paragraphs
    if extracted_steps:
        for step in extracted_steps:
            step_num = step["step_number"]
            
            table_role = ""
            table_template = ""
            if step_num <= len(roles_list):
                table_role = roles_list[step_num - 1]
                table_template = templates_list[step_num - 1]
                
            # Xác định phòng ban / vai trò chịu trách nhiệm nguyên bản từ tài liệu
            if table_role and table_role.strip():
                step["assignee_role"] = table_role.strip()
            else:
                inst_raw = "\n".join(step.get("instructions_list", []))
                m_r = re.search(r"Trách nhiệm thực hiện\s*:\s*([^\n\r<]+)", inst_raw, re.IGNORECASE)
                if m_r:
                    step["assignee_role"] = m_r.group(1).strip()
                else:
                    step["assignee_role"] = "Bộ phận phụ trách"
                    
            # Xác định biểu mẫu / hồ sơ đi kèm
            if table_template and table_template.strip():
                step["template_files"] = table_template.strip()
            else:
                inst_raw = "\n".join(step.get("instructions_list", []))
                m_t = re.search(r"Hồ sơ\s*/\s*Biểu mẫu[^:]*:\s*([^\n\r<]+)", inst_raw, re.IGNORECASE)
                if m_t:
                    step["template_files"] = m_t.group(1).strip()
                else:
                    step["template_files"] = ""
            
            # Xác định loại Node đồ họa
            name_lower = step["name"].lower()
            step["has_branch"] = False
            if "bắt đầu" in name_lower or "tiếp nhận" in name_lower:
                step["node_type"] = "start"
            elif "phê duyệt" in name_lower or "quyết định" in name_lower or ("kiểm tra" in name_lower and ("chất lượng" in name_lower or "qc" in name_lower or "đạt" in name_lower)):
                step["node_type"] = "decision"
                step["has_branch"] = True
            elif "kết thúc" in name_lower or "hoàn thành" in name_lower:
                step["node_type"] = "end"
            else:
                step["node_type"] = "task"
                
            # Tạo chuỗi HTML hướng dẫn nguyên văn từ file
            step["instructions"] = "<p>" + "</p><p>".join(step["instructions_list"]) + "</p>"
            del step["instructions_list"]
            
        result["steps"] = extracted_steps
    else:
        result["steps"] = table_steps

    # 4. Xác định tài liệu có Lưu đồ hay không (Tuyệt đối không gán cứng)
    doc_name_lower = (result.get("name") or "").lower()
    doc_code_upper = (result.get("code") or "").upper()
    is_policy_doc = (
        "CS" in doc_code_upper or 
        "chính sách" in doc_name_lower or 
        "quy chế" in doc_name_lower
    )

    # Lọc danh sách các bước hợp lệ (phải có tên rõ ràng và dài hơn 1 ký tự)
    raw_steps = result.get("steps") or table_steps
    valid_extracted_steps = [
        s for s in raw_steps
        if s and s.get("name") and len(s.get("name", "").strip()) > 1 and s.get("name", "").strip() != ":"
    ]

    has_flowchart = False
    if not is_policy_doc and (len(table_steps) >= 2 or len(valid_extracted_steps) >= 2):
        has_flowchart = True
        result["steps"] = valid_extracted_steps
    else:
        has_flowchart = False
        result["steps"] = []
        result["diagram_data"] = ""

    result["has_flowchart"] = has_flowchart

    # 5. Tạo sơ đồ Flowchart (diagram_data) nếu tài liệu thực sự có Lưu đồ
    if has_flowchart and result["steps"]:
        nodes = []
        links = []
        
        # Tạo toạ độ x, y phân bổ dọc theo luồng quy trình
        for i, step in enumerate(result["steps"]):
            node_id = f"node_{step['step_number']}"
            step["flow_node_id"] = node_id
            
            nodes.append({
                "id": node_id,
                "label": f"B{step['step_number']}: {step['name']}",
                "type": step["node_type"],
                "role": step["assignee_role"],
                "x": 250,
                "y": 80 + i * 120
            })
            
            # Nối link từ node trước sang node sau
            if i > 0:
                prev_step = result["steps"][i-1]
                is_prev_decision = prev_step["node_type"] == "decision"
                is_approval = "phê duyệt" in prev_step["name"].lower()
                
                ok_label = "Đồng ý" if is_approval else ("Đạt" if is_prev_decision else "")
                links.append({
                    "from": f"node_{prev_step['step_number']}",
                    "to": node_id,
                    "label": ok_label
                })
                
                # Nếu là khối kiểm tra/decision, thêm một nhánh rẽ phụ sang bên phải hoặc loop lại
                if is_prev_decision:
                    if is_approval and i >= 2:
                        # Nhánh Không đồng ý quay lại bước trước đó (Bước 2)
                        loop_to_node = f"node_{result['steps'][i-2]['step_number']}"
                        links.append({
                            "from": f"node_{prev_step['step_number']}",
                            "to": loop_to_node,
                            "label": "Không đồng ý"
                        })
                    else:
                        err_node_id = f"node_{prev_step['step_number']}_err"
                        nodes.append({
                            "id": err_node_id,
                            "label": "Xử lý lỗi / Trả hàng",
                            "type": "task",
                            "role": prev_step["assignee_role"],
                            "x": 480,
                            "y": 80 + (i-1) * 120
                        })
                        links.append({
                            "from": f"node_{prev_step['step_number']}",
                            "to": err_node_id,
                            "label": "Không đạt"
                        })
        
        result["diagram_data"] = json.dumps({"nodes": nodes, "links": links})

        # Trích xuất ảnh sơ đồ lưu đồ đính kèm nếu có
        try:
            pub_dir = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "FrontEnd", "Web", "public")), "flowcharts")
            os.makedirs(pub_dir, exist_ok=True)
            for r_id, rel in doc.part.rels.items():
                if "image" in rel.target_ref:
                    blob = rel.target_part.blob
                    if len(blob) > 30000:
                        safe_code = re.sub(r'[^\w\-]', '_', result["code"] or "qt02")
                        img_name = f"flowchart_{safe_code}.png"
                        with open(os.path.join(pub_dir, img_name), "wb") as f_out:
                            f_out.write(blob)
                        result["flowchart_image_url"] = f"/flowcharts/{img_name}"
                        break
        except Exception:
            pass
    
    # 5b. Bổ sung Mục 6 Bảng biểu mẫu nếu tài liệu có Bảng biểu mẫu và hồ sơ lưu trữ
    if result.get("forms_table_html"):
        sec6_found = False
        for k in list(result.get("sections", {}).keys()):
            if "biểu mẫu" in k.lower() or "hồ sơ" in k.lower():
                sec6_found = True
                if "<table" not in result["sections"][k]:
                    result["sections"][k] = (result["sections"][k] + result["forms_table_html"]).strip()
                break
        if not sec6_found:
            result.setdefault("sections", {})["6. Danh mục biểu mẫu và hồ sơ lưu trữ"] = result["forms_table_html"]

    # 6. Chỉ giữ lại các mục có nội dung thực tế từ file
    if "sections" in result:
        result["sections"] = {
            k: v for k, v in result["sections"].items()
            if v and v.replace('<p>', '').replace('</p>', '').strip()
        }

    # 7. Trích xuất thông tin Trang bìa chuẩn (Phần 1)
    result["cover_info"] = {
        "company_name": "CÔNG TY CỔ PHẦN VINA G7",
        "name": result.get("name", ""),
        "code": result.get("code", ""),
        "version": result.get("version", "01"),
        "issue_date": result.get("issue_date", ""),
        "issuer": result.get("issuer", ""),
        "approver": result.get("approver", "")
    }

    return result

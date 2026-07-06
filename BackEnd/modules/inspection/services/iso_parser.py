import os
import docx
import json
import re

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
        "sections": {
            "Mục đích": "",
            "Phạm vi áp dụng": "",
            "Tài liệu viện dẫn": "",
            "Định nghĩa và Từ viết tắt": ""
        },
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
        text_val = p.text.strip()
        if not text_val:
            return ""
        is_list_paragraph = p.style.name and ("list" in p.style.name.lower() or "bullet" in p.style.name.lower())
        if is_list_paragraph:
            if not re.match(r"^[-\*\u2022\u2714\u2713\u2013\u2014\d+\.]", text_val):
                text_val = "✔ " + text_val
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

        # B. Kiểm tra nếu là Bảng các bước lưu đồ (Flowchart/Process table)
        is_flow_table = any("trách nhiệm" in h or "lưu đồ" in h or "biểu mẫu" in h or "phụ lục" in h for h in headers)
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
                        "instructions": f"<p>Hướng dẫn chi tiết cho bước: <strong>{flow}</strong></p><p>Trách nhiệm thực hiện: {role}. Biểu mẫu đính kèm: {template}</p>",
                        "template_files": template,
                        "node_type": node_type
                    })
            continue

    # 3. Phân tích nội dung văn bản chính (Các phần lớn từ 1 đến 5)
    current_section = None
    section_content = []

    sections_keys = {
        "1. mục đích": "Mục đích",
        "1 mục đích": "Mục đích",
        "2. phạm vi": "Phạm vi áp dụng",
        "2 phạm vi": "Phạm vi áp dụng",
        "3. tài liệu": "Tài liệu viện dẫn",
        "3 tài liệu": "Tài liệu viện dẫn",
        "4. định nghĩa": "Định nghĩa và Từ viết tắt",
        "4 định nghĩa": "Định nghĩa và Từ viết tắt"
    }

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
                    "assignee_role": "Kho", # Giá trị mặc định
                    "template_files": "",
                    "node_type": "task"
                }
                continue

        # Tìm tiêu đề mục mới để ngắt lưu trữ nội dung cũ
        matched_section = None
        for key, sec_name in sections_keys.items():
            if line_lower.startswith(key):
                matched_section = sec_name
                break
                
        if matched_section:
            if current_section and section_content:
                result["sections"][current_section] = "<p>" + "</p><p>".join(section_content) + "</p>"
            current_section = matched_section
            section_content = []
            
            # Gặp tiêu đề mục lớn thì dừng bóc tách bước hiện tại
            if current_step:
                extracted_steps.append(current_step)
                current_step = None
        else:
            if current_section:
                section_content.append(line)
            
            # Ghi chỉ dẫn chi tiết cho bước quy trình đang duyệt
            if current_step:
                # Nếu bắt gặp đầu dòng là mục lớn hoặc chữ số phần lớn, ngắt lưu trữ bước
                if re.match(r"^\d+\s*[\.\:]", line) or any(line_lower.startswith(k) for k in ["mục đích", "phạm vi", "tài liệu", "định nghĩa"]):
                    extracted_steps.append(current_step)
                    current_step = None
                else:
                    current_step["instructions_list"].append(line)

    # Đóng gói mục cuối cùng và bước cuối cùng
    if current_section and section_content:
        result["sections"][current_section] = "<p>" + "</p><p>".join(section_content) + "</p>"
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
                
            role_lower = table_role.lower()
            step_name_lower = step["name"].lower()
            
            # Xác định phòng ban / vai trò chịu trách nhiệm
            role_mapped = "Kho"
            if "qc" in role_lower or "qlcl" in role_lower:
                role_mapped = "QC"
            elif "kho" in role_lower or "thủ kho" in role_lower:
                role_mapped = "Kho"
            elif "sản xuất" in role_lower or "chuyền" in role_lower or "tổ" in role_lower:
                role_mapped = "Sản xuất"
            elif "thu mua" in role_lower or "mua hàng" in role_lower:
                role_mapped = "Thu mua"
            elif "bán hàng" in role_lower or "kd" in role_lower or "kinh doanh" in role_lower:
                role_mapped = "Bán hàng"
            else:
                # Fallback dựa theo từ khóa trong tên bước
                if "qc" in step_name_lower or "kiểm tra chất lượng" in step_name_lower:
                    role_mapped = "QC"
                elif "kho" in step_name_lower or "nhập" in step_name_lower:
                    role_mapped = "Kho"
                elif "sản xuất" in step_name_lower or "chuyền" in step_name_lower:
                    role_mapped = "Sản xuất"
                elif "thu mua" in step_name_lower or "mua hàng" in step_name_lower:
                    role_mapped = "Thu mua"
                    
            step["assignee_role"] = role_mapped
            step["template_files"] = table_template.strip()
            
            # Xác định loại Node đồ họa
            name_lower = step["name"].lower()
            step["has_branch"] = False
            if "bắt đầu" in name_lower or "tiếp nhận" in name_lower:
                step["node_type"] = "start"
            elif ("kiểm tra" in name_lower and ("chất lượng" in name_lower or "qc" in name_lower or "đạt" in name_lower)) or "quyết định" in name_lower:
                step["node_type"] = "decision"
                # Kiểm tra xem hướng dẫn có chứa từ khoá xử lý hàng lỗi/trả hàng không
                inst_text = " ".join(step.get("instructions_list", [])).lower()
                if any(kw in inst_text for kw in ["không đạt", "lỗi", "trả hàng", "không phù hợp"]):
                    step["has_branch"] = True
            elif "kết thúc" in name_lower or "hoàn thành" in name_lower:
                step["node_type"] = "end"
            else:
                step["node_type"] = "task"
                
            # Tạo chuỗi HTML hướng dẫn
            step["instructions"] = "<p>" + "</p><p>".join(step["instructions_list"]) + "</p>"
            del step["instructions_list"]
            
        result["steps"] = extracted_steps
    else:
        # Fallback lấy bước từ bảng nếu Paragraphs không chứa định dạng "Bước X"
        result["steps"] = table_steps

    # 4. Tạo sơ đồ Flowchart (diagram_data) mặc định nếu có danh sách các bước
    if result["steps"]:
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
                links.append({
                    "from": f"node_{result['steps'][i-1]['step_number']}",
                    "to": node_id,
                    "label": "Đạt" if result["steps"][i-1]["node_type"] == "decision" else ""
                })
                # Nếu là khối kiểm tra/decision, thêm một nhánh rẽ phụ (lỗi/trả hàng) sang bên phải
                if result["steps"][i-1]["node_type"] == "decision":
                    # Khối rẽ nhánh báo lỗi
                    err_node_id = f"node_{result['steps'][i-1]['step_number']}_err"
                    nodes.append({
                        "id": err_node_id,
                        "label": "Xử lý lỗi / Trả hàng",
                        "type": "task",
                        "role": result["steps"][i-1]["assignee_role"],
                        "x": 480,
                        "y": 80 + (i-1) * 120
                    })
                    links.append({
                        "from": f"node_{result['steps'][i-1]['step_number']}",
                        "to": err_node_id,
                        "label": "Không đạt"
                    })
        
        result["diagram_data"] = json.dumps({"nodes": nodes, "links": links})

    return result

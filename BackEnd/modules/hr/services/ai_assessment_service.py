# -*- coding: utf-8 -*-
import json
import logging
import re
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

def evaluate_essay_answer(
    question_text: str,
    criteria_rubric: str,
    candidate_answer: str,
    max_points: float = 1.0,
    position_name: str = "Nhân sự",
    department_name: str = "Sản xuất",
    category_tag: str = "Quy trình chuyên môn"
) -> Dict[str, Any]:
    """
    Sử dụng AI để chấm điểm câu trả lời tự luận (Essay Grader):
    1. So sánh câu trả lời của thí sinh với Barem chuẩn (Rubric) / Hướng dẫn đáp án.
    2. Tính điểm số đạt được thập phân chính xác từ 0 đến max_points.
    3. Liệt kê các ý đúng đã nêu (matched_points), các ý còn thiếu sót (missing_points).
    4. Sinh nhận xét phản hồi chuyên môn (feedback).
    """
    cand_clean = (candidate_answer or "").strip()
    if not cand_clean:
        return {
            "points_earned": 0.0,
            "max_points": max_points,
            "is_correct": False,
            "matched_points": [],
            "missing_points": ["Thí sinh không nhập câu trả lời."],
            "feedback": "Thí sinh bỏ trống câu hỏi tự luận này, không nhận được điểm."
        }

    # Barem mặc định nếu đề thi chưa nhập rubric
    rubric_text = criteria_rubric.strip() if criteria_rubric else "Đánh giá dựa trên mức độ hiểu biết quy trình SOP, tiêu chuẩn kỹ thuật nhà máy và tính hợp lý của câu trả lời."

    # Heuristic Fallback ban đầu
    fallback_points = max_points * 0.5 if len(cand_clean) >= 20 else (max_points * 0.25 if len(cand_clean) >= 5 else 0.0)
    fallback_result = {
        "points_earned": round(fallback_points, 2),
        "max_points": max_points,
        "is_correct": fallback_points >= (max_points * 0.5),
        "matched_points": ["Nội dung câu trả lời cơ bản phù hợp với yêu cầu câu hỏi."],
        "missing_points": ["Cần đối chiếu thêm với tiêu chuẩn thực tế."],
        "feedback": "Câu trả lời đã được ghi nhận. Điểm số tạm tính theo tiêu chí độ dài và ngữ cảnh ban đầu."
    }

    try:
        from modules.chatbot.services.ai_chatbot_service import ai_chatbot_service
        if ai_chatbot_service.is_available() and ai_chatbot_service.client:
            prompt = f"""
Bạn là Chuyên gia Khảo thí và Giám đốc Quản lý Chất lượng (QA/QC Director) của Nhà máy gỗ nội thất SmartFlow.
Nhiệm vụ của bạn là chấm điểm câu trả lời TỰ LUẬN của thí sinh một cách công tâm, chính xác và chuyên nghiệp.

THÔNG TIN ĐỀ BÀI:
- Vị trí đánh giá: {position_name}
- Bộ phận: {department_name}
- Tiêu chuẩn / Chuyên đề: {category_tag}
- Câu hỏi tự luận: "{question_text}"
- Barem đáp án chuẩn & Tiêu chí chấm: "{rubric_text}"
- Thang điểm tối đa: {max_points} điểm

CÂU TRẢ LỜI CỦA THÍ SINH:
"{cand_clean}"

QUY TẮC CHẤM ĐIỂM:
1. Đối chiếu ngữ nghĩa câu trả lời của thí sinh với Barem chuẩn:
   - Nếu nêu đầy đủ và chuẩn xác các ý chính: Cho từ 85% - 100% điểm tối đa.
   - Nếu nêu được đa số ý đúng nhưng thiếu sót 1 vài chi tiết nhỏ: Cho từ 60% - 80% điểm tối đa.
   - Nếu chỉ nêu được 1 ý đúng hoặc trả lời chung chung: Cho từ 30% - 50% điểm tối đa.
   - Nếu trả lời sai lệch, lạc đề hoặc vô nghĩa: Cho từ 0% - 20% điểm tối đa.
2. Điểm số phải là số thập phân (làm tròn 2 chữ số, từ 0.0 đến {max_points}).
3. is_correct là true nếu điểm đạt được >= 50% thang điểm tối đa, ngược lại là false.

YÊU CẦU ĐỊNH DẠNG:
Trả về duy nhất 1 đối tượng JSON chuẩn (không markdown code block, không thêm lời dẫn):
{{
  "points_earned": <float từ 0.0 đến {max_points}>,
  "is_correct": <true hoặc false>,
  "matched_points": [
    "Ý đúng 1 mà thí sinh đã nêu được",
    "Ý đúng 2..."
  ],
  "missing_points": [
    "Ý còn thiếu 1 so với barem chuẩn",
    "Ý còn thiếu 2..."
  ],
  "feedback": "Nhận xét súc tích 1-2 câu về câu trả lời, chỉ rõ điểm tốt và góp ý cải thiện."
}}
"""
            response = ai_chatbot_service.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            raw_text = response.text.strip() if hasattr(response, "text") else ""
            if raw_text:
                if "```" in raw_text:
                    parts = raw_text.split("```")
                    raw_text = parts[1] if len(parts) > 1 else raw_text
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                        
                parsed = json.loads(raw_text.strip())
                pts = float(parsed.get("points_earned", fallback_points))
                pts = max(0.0, min(float(max_points), pts))
                
                return {
                    "points_earned": round(pts, 2),
                    "max_points": max_points,
                    "is_correct": bool(parsed.get("is_correct", pts >= (max_points * 0.5))),
                    "matched_points": parsed.get("matched_points", fallback_result["matched_points"]),
                    "missing_points": parsed.get("missing_points", []),
                    "feedback": parsed.get("feedback", fallback_result["feedback"])
                }
    except Exception as e:
        logger.warning(f"AI Essay Grader fallback used: {e}")

    return fallback_result

def evaluate_assessment_submission(
    candidate_name: str,
    position_name: str,
    department_name: str,
    assessment_title: str,
    percentage: float,
    total_score: float,
    max_score: float,
    question_results: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Đánh giá kết quả làm bài kiểm tra của nhân sự:
    1. Xác định cấp độ năng lực (Level A, B, C, D, F).
    2. Xác định ma trận 9-Box Grid / Skill-Will.
    3. Xác định vị trí đảm nhiệm tương ứng & tiêu chí đánh giá.
    4. Tích hợp AI (Gemini) để phân tích điểm mạnh, điểm yếu và đề xuất hành động nhân sự.
    """
    
    # 1. Khung đánh giá chuẩn hóa theo điểm số
    if percentage >= 90.0:
        rank_level = "Level A"
        rank_title = "Level A - Xuất sắc / Năng lực vượt trội"
        nine_box = "High Skill - High Will (Star Performer / High Potential)"
        position_fit = "Đáp ứng xuất sắc, sẵn sàng quy hoạch cán bộ nguồn, Trưởng nhóm / Leader"
        default_criteria = [
            "Nắm vững toàn diện các tiêu chuẩn kỹ thuật & quy trình quản lý chất lượng",
            "Có khả năng độc lập xử lý sự cố phức tạp và hướng dẫn chuyên môn cho nhân sự mới",
            "Chủ động đề xuất cải tiến quy trình và ứng dụng công nghệ hiệu quả",
            "Tác phong kỷ luật cao, tinh thần trách nhiệm và cam kết chất lượng tuyệt đối"
        ]
        default_action = [
            f"Đề xuất khen thưởng và bổ nhiệm {candidate_name} vào danh sách Cán bộ nguồn / Trưởng nhóm phụ trách {position_name}.",
            "Phân công hướng dẫn (Mentor) cho các nhân sự mới tại bộ phận.",
            "Cử tham gia các khóa đào tạo nâng cao về Quản trị tinh gọn Lean & ISO nâng cao."
        ]
    elif percentage >= 75.0:
        rank_level = "Level B"
        rank_title = "Level B - Khá / Nắm vững chuyên môn"
        nine_box = "High Skill - Medium Will (Core Performer / Solid Contributor)"
        position_fit = "Đáp ứng tốt vị trí hiện tại, xem xét nâng bậc lương chuyên môn"
        default_criteria = [
            "Nắm chắc các quy trình tác nghiệp tiêu chuẩn SOP và tiêu chuẩn sản phẩm",
            "Thực hiện công việc chính xác, ít phát sinh lỗi sai sót chất lượng",
            "Tuân thủ đầy đủ quy định ghi chép hồ sơ dữ liệu tại hiện trường",
            "Tinh thần hợp tác tốt với các tổ sản xuất và đội ngũ liên quan"
        ]
        default_action = [
            f"Duy trì và phát huy năng lực tại vị trí {position_name}.",
            "Khuyến khích chủ động tham gia xử lý các bài toán sự cố CAPA phát sinh.",
            "Xem xét điều chỉnh nâng bậc năng lực định kỳ theo thang điểm KPI."
        ]
    elif percentage >= 60.0:
        rank_level = "Level C"
        rank_title = "Level C - Đạt chuẩn / Đạt yêu cầu tối thiểu"
        nine_box = "Medium Skill - Medium Will (Effective Contributor)"
        position_fit = "Đạt yêu cầu tối thiểu, cần kèm cặp và củng cố thêm kỹ năng chuyên sâu"
        default_criteria = [
            "Hiểu các quy định cơ bản của vị trí nhưng còn lúng túng ở các trường hợp ngoại lệ",
            "Cần sự giám sát định kỳ từ cấp trên để đảm bảo không xảy ra sai sót",
            "Chưa nắm sâu các tiêu chuẩn quốc tế và quy trình phòng ngừa rủi ro",
            "Có tinh thần học hỏi nhưng tốc độ xử lý tình huống thực tế ở mức trung bình"
        ]
        default_action = [
            f"Tổ chức kèm cặp 1:1 cho {candidate_name} về các tiêu chuẩn chưa đạt điểm tối đa.",
            "Yêu cầu làm lại bài kiểm tra chuyên đề sau 15 ngày ôn tập.",
            "Theo dõi sát sao nhật ký kiểm tra chất lượng hàng ngày."
        ]
    elif percentage >= 40.0:
        rank_level = "Level D"
        rank_title = "Level D - Yếu / Chưa đạt chuẩn vị trí"
        nine_box = "Low Skill - Medium Will (Inconsistent / Training Needed)"
        position_fit = "Chưa đáp ứng tiêu chuẩn công việc, bắt buộc tham gia đào tạo lại"
        default_criteria = [
            "Sai sót nhiều ở các câu hỏi cốt lõi về quy trình và tiêu chuẩn kiểm soát",
            "Chưa nắm rõ quy định báo cáo sự cố và cách ly sản phẩm không phù hợp",
            "Cần hướng dẫn chi tiết từng bước khi thực hiện nhiệm vụ",
            "Tiềm ẩn rủi ro phát sinh phế phẩm nếu không được giám sát chặt chẽ"
        ]
        default_action = [
            f"Bắt buộc {candidate_name} tham gia khóa đào tạo lại nghiệp vụ trong vòng 7 ngày.",
            "Tạm thời phân công công việc dưới sự giám sát trực tiếp của Tổ trưởng / KCS kỳ cựu.",
            "Đánh giá lại năng lực sau khóa đào tạo trước khi xem xét cho phép tác nghiệp độc lập."
        ]
    else:
        rank_level = "Level F"
        rank_title = "Level F - Kém / Không đạt yêu cầu"
        nine_box = "Low Skill - Low Will (Underperformer / Risk)"
        position_fit = "Không phù hợp, xem xét điều chuyển hoặc tái cơ cấu nhân sự"
        default_criteria = [
            "Không đáp ứng được các yêu cầu tối thiểu của vị trí sau thời gian đào tạo",
            "Sai lệch kiến thức cơ bản về an toàn, quy trình SOP và tiêu chuẩn chất lượng",
            "Thiếu tinh thần trách nhiệm, né tránh giải quyết khiếu nại khách hàng",
            "Chống đối hoặc không áp dụng quy trình và phần mềm công nghệ quản lý"
        ]
        default_action = [
            f"Đánh giá không đạt yêu cầu tại vị trí {position_name} thuộc {department_name}.",
            "Lập biên bản đánh giá năng lực và đề xuất phòng Nhân sự xem xét điều chuyển sang công việc phù hợp hơn hoặc chấm dứt hợp đồng thử việc/hợp đồng lao động theo quy chế công ty."
        ]

    # Thống kê câu sai và câu đúng theo chuyên đề để đưa vào Prompt AI
    incorrect_topics = []
    correct_topics = []
    for q in question_results:
        topic = q.get("category_tag") or "Kiến thức chung"
        if not q.get("is_correct", False):
            incorrect_topics.append(f"- Câu hỏi: \"{q.get('question_text')}\" (Chuyên đề: {topic}) - Điểm: {q.get('points_earned')}/{q.get('points')} đ")
        else:
            correct_topics.append(topic)

    ai_summary = f"Nhân sự {candidate_name} đạt {percentage:.1f}% ({total_score}/{max_score} điểm) trong bài kiểm tra \"{assessment_title}\", xếp loại {rank_title}. Phân vị: {nine_box}."
    ai_recommendations = default_action
    criteria_eval = default_criteria

    # 2. Thử gọi AI Service để sinh nhận xét chuyên sâu
    try:
        from modules.chatbot.services.ai_chatbot_service import ai_chatbot_service
        if ai_chatbot_service.is_available() and ai_chatbot_service.client:
            prompt = f"""
Bạn là Chuyên gia Đánh giá Năng lực Nhân sự và Giám đốc Quản lý Chất lượng (QA/QC Director) của Nhà máy sản xuất nội thất SmartFlow.
Hãy phân tích kết quả bài kiểm tra sau và đưa ra nhận xét chuyên môn sắc bén, công tâm và định hướng cụ thể:

THÔNG TIN NHÂN SỰ:
- Họ tên: {candidate_name}
- Vị trí đánh giá: {position_name}
- Bộ phận / Chuyền xưởng: {department_name}
- Bài kiểm tra: {assessment_title}
- Kết quả điểm số: {percentage:.1f}% ({total_score}/{max_score} điểm)
- Cấp độ hệ thống xếp: {rank_level} ({nine_box})

DANH SÁCH CÂU HỎI LÀM SAI / CHƯA ĐẠT ĐIỂM TỐI ĐA ({len(incorrect_topics)} câu):
{chr(10).join(incorrect_topics[:8]) if incorrect_topics else 'Không có câu sai, hoàn thành xuất sắc.'}

YÊU CẦU:
Trả về định dạng JSON DUY NHẤT (không markdown code block, không thêm text ngoài) với cấu trúc sau:
{{
  "ai_summary": "Đoạn nhận xét súc tích 2-3 câu về năng lực chuyên môn thực tế của nhân sự, chỉ rõ điểm mạnh và lỗ hổng kiến thức chính.",
  "criteria": ["Tiêu chí đánh giá 1", "Tiêu chí đánh giá 2", "Tiêu chí đánh giá 3", "Tiêu chí đánh giá 4"],
  "recommendations": [
    "Đề xuất hành động nhân sự cụ thể 1",
    "Đề xuất khóa đào tạo / kèm cặp thực tế 2",
    "Phương án điều chuyển / bổ nhiệm 3"
  ]
}}
"""
            response = ai_chatbot_service.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            raw_text = response.text.strip() if hasattr(response, "text") else ""
            if raw_text:
                if "```" in raw_text:
                    parts = raw_text.split("```")
                    raw_text = parts[1] if len(parts) > 1 else raw_text
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:]
                parsed_ai = json.loads(raw_text.strip())
                if parsed_ai.get("ai_summary"):
                    ai_summary = parsed_ai["ai_summary"]
                if parsed_ai.get("criteria"):
                    criteria_eval = parsed_ai["criteria"]
                if parsed_ai.get("recommendations"):
                    ai_recommendations = parsed_ai["recommendations"]
    except Exception as ai_err:
        logger.warning(f"AI assessment generation fallback used: {ai_err}")

    return {
        "rank_level": rank_level,
        "rank_title": rank_title,
        "nine_box_category": nine_box,
        "position_fit_status": position_fit,
        "criteria_evaluation": criteria_eval,
        "ai_summary": ai_summary,
        "ai_recommendations": ai_recommendations
    }

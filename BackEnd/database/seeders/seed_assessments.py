# -*- coding: utf-8 -*-
import os
import sys
import json

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import SessionLocal, engine, Base
from modules.hr.models.assessment_models import (
    HRAssessment, HRAssessmentQuestion, HRAssessmentSubmission, HRAssessmentAnswer
)

def seed_assessments_data():
    """Tự động khởi tạo dữ liệu mẫu bài kiểm tra ban đầu nếu chưa có"""
    # Đảm bảo bảng đã được tạo
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        count = db.query(HRAssessment).count()
        if count == 0:
            print("[SEED] Khởi tạo dữ liệu bài kiểm tra mẫu...")
            
            # Đề thi 1: QA Chuyên môn
            quiz1 = HRAssessment(
                assessment_code="quiz_qa_pro",
                title="Bài kiểm tra chuyên môn QA (Quality Assurance)",
                description="Bộ câu hỏi đánh giá năng lực chuyên môn QA: Tiêu chuẩn CARB, FSC, EUDR, TCVN, quy trình SOP, kiểm soát chất lượng và xử lý sự cố CAPA.",
                category="Quản lý chất lượng",
                target_positions_json=json.dumps(["QA", "QC", "Tổ trưởng QLCL", "KCS"], ensure_ascii=False),
                duration_minutes=60,
                total_questions=5,
                pass_percentage=60.0,
                shuffle_questions=True,
                shuffle_options=True,
                status="active",
                instructions="Vui lòng đọc kỹ câu hỏi và chọn phương án chính xác nhất. Hết thời gian hệ thống sẽ tự động nộp bài."
            )
            db.add(quiz1)
            db.flush()
            
            q1_list = [
                {
                    "question_text": "Tiêu chuẩn CARB Phase 2 áp dụng giới hạn phát thải formaldehyde cho thị trường nào?",
                    "options": [
                        {"id": "A", "text": "Châu Âu (EU)"},
                        {"id": "B", "text": "Hoa Kỳ (US California & EPA)"},
                        {"id": "C", "text": "Nhật Bản (JIS)"},
                        {"id": "D", "text": "Úc & New Zealand"}
                    ],
                    "correct": ["B"],
                    "points": 2.0,
                    "category_tag": "Tiêu chuẩn CARB & EPA",
                    "explanation": "CARB Phase 2 là quy định kiểm soát nồng độ phát thải formaldehyde trong ván gỗ công nghiệp tại bang California và toàn Hoa Kỳ theo chuẩn EPA TSCA Title VI."
                },
                {
                    "question_text": "Chứng nhận Chuỗi hành trình sản phẩm FSC-CoC (Chain of Custody) yêu cầu điều gì quan trọng nhất?",
                    "options": [
                        {"id": "A", "text": "Kiểm soát và tách biệt rõ ràng nguồn gỗ có chứng chỉ FSC với nguồn gỗ không rõ xuất xứ ở mọi công đoạn"},
                        {"id": "B", "text": "Chỉ mua gỗ từ rừng trồng tại Việt Nam"},
                        {"id": "C", "text": "Không được sử dụng bất kỳ hóa chất keo dán nào"},
                        {"id": "D", "text": "Sản phẩm phải được sơn phủ 100% bằng sơn gốc nước"}
                    ],
                    "correct": ["A"],
                    "points": 2.0,
                    "category_tag": "Tiêu chuẩn FSC & Xuất xứ",
                    "explanation": "FSC-CoC đảm bảo tính truy xuất nguồn gốc gỗ từ rừng được quản lý bền vững qua chuỗi cung ứng tới thành phẩm."
                },
                {
                    "question_text": "Khi phát hiện một lô hàng có tỷ lệ lỗi vượt mức AQL cho phép tại công đoạn Sơn PU, hành động đầu tiên của QA là gì?",
                    "options": [
                        {"id": "A", "text": "Lập tức lập biên bản dừng chuyền, gắn thẻ cách ly lô hàng (Non-conforming Tag) và thông báo Tổ trưởng & Trưởng bộ phận"},
                        {"id": "B", "text": "Bỏ qua các sản phẩm lỗi và chỉ cho đóng gói các sản phẩm đạt"},
                        {"id": "C", "text": "Tự ý yêu cầu công nhân mài lại mà không cần lập biên bản sự cố"},
                        {"id": "D", "text": "Chờ đến cuối ca tổng kết mới báo cáo"}
                    ],
                    "correct": ["A"],
                    "points": 2.0,
                    "category_tag": "Quy trình SOP & Xử lý sự cố",
                    "explanation": "Theo quy trình kiểm soát sản phẩm không phù hợp, phải gắn thẻ cách ly và cảnh báo ngay lập tức để tránh lây lan khuyết tật sang công đoạn tiếp theo."
                },
                {
                    "question_text": "Trong phương pháp 8D và xử lý sự cố CAPA, chữ viết tắt CAPA có nghĩa là gì?",
                    "options": [
                        {"id": "A", "text": "Corrective Action & Preventive Action (Hành động khắc phục & Hành động phòng ngừa)"},
                        {"id": "B", "text": "Control Analysis & Product Assessment"},
                        {"id": "C", "text": "Company Audit & Process Approval"},
                        {"id": "D", "text": "Cost Accounting & Production Assurance"}
                    ],
                    "correct": ["A"],
                    "points": 2.0,
                    "category_tag": "CAPA & Cải tiến chất lượng",
                    "explanation": "CAPA là nguyên tắc cốt lõi của ISO 9001: tìm nguyên nhân gốc rễ để khắc phục dứt điểm và thiết lập rào chắn phòng ngừa tái diễn."
                },
                {
                    "question_text": "Độ ẩm tiêu chuẩn (Moisture Content - MC) của phôi gỗ nguyên liệu sấy trước khi đưa vào chuyền ghép/gia công tinh thường nằm trong khoảng nào đối với hàng xuất khẩu Mỹ?",
                    "options": [
                        {"id": "A", "text": "8% - 12%"},
                        {"id": "B", "text": "16% - 20%"},
                        {"id": "C", "text": "25% - 30%"},
                        {"id": "D", "text": "Dưới 4%"}
                    ],
                    "correct": ["A"],
                    "points": 2.0,
                    "category_tag": "Kỹ thuật sấy & Độ ẩm gỗ",
                    "explanation": "Độ ẩm gỗ tiêu chuẩn xuất khẩu sang thị trường Bắc Mỹ yêu cầu 8% - 12% để tránh hiện tượng co ngót, nứt toác hoặc cong vênh khi biến đổi khí hậu."
                }
            ]
            
            for idx, q in enumerate(q1_list, 1):
                q_obj = HRAssessmentQuestion(
                    assessment_id=quiz1.id,
                    question_type="single_choice",
                    question_text=q["question_text"],
                    category_tag=q["category_tag"],
                    options_json=json.dumps(q["options"], ensure_ascii=False),
                    correct_answers_json=json.dumps(q["correct"], ensure_ascii=False),
                    points=q["points"],
                    explanation=q["explanation"],
                    order_index=idx
                )
                db.add(q_obj)
                
            # Đề thi 2: Mini Test QA
            quiz2 = HRAssessment(
                assessment_code="quiz_mini_qa",
                title="Mini Test QA",
                description="Bộ đề kiểm tra gồm 2 câu hỏi trắc nghiệm chuyên môn với đáp án và trích dẫn chuẩn hóa.",
                category="Quản lý chất lượng",
                target_positions_json=json.dumps(["QA", "QC", "KCS"], ensure_ascii=False),
                duration_minutes=15,
                total_questions=2,
                pass_percentage=50.0,
                shuffle_questions=True,
                shuffle_options=True,
                status="active"
            )
            db.add(quiz2)
            db.flush()
            
            q2_list = [
                {
                    "question_text": "Quy định kiểm tra độ bám dính màng sơn (Cross-cut Adhesion Test) theo tiêu chuẩn ASTM D3359 sử dụng phương pháp nào?",
                    "options": [
                        {"id": "A", "text": "Dùng dao cắt tạo lưới ô vuông và dán kéo băng keo tiêu chuẩn"},
                        {"id": "B", "text": "Ngâm sản phẩm trong nước sôi 24 giờ"},
                        {"id": "C", "text": "Đo độ bóng bằng máy quang phổ"},
                        {"id": "D", "text": "Gõ búa cao su lên bề mặt sơn"}
                    ],
                    "correct": ["A"],
                    "points": 5.0,
                    "category_tag": "Kiểm nghiệm bề mặt",
                    "explanation": "ASTM D3359 đo độ bám dính màng sơn bằng dao cắt lưới và băng keo chuyên dụng."
                },
                {
                    "question_text": "Tiêu chuẩn EUDR của Liên minh Châu Âu quy định về vấn đề gì?",
                    "options": [
                        {"id": "A", "text": "Chống phá rừng và suy thoái rừng (EU Deforestation Regulation)"},
                        {"id": "B", "text": "Quy định về rác thải nhựa đại dương"},
                        {"id": "C", "text": "Tiêu chuẩn phòng cháy chữa cháy nhà xưởng"},
                        {"id": "D", "text": "Định mức khí thải động cơ diesel"}
                    ],
                    "correct": ["A"],
                    "points": 5.0,
                    "category_tag": "EUDR & Môi trường",
                    "explanation": "EUDR bắt buộc chứng minh sản phẩm gỗ không có nguồn gốc từ đất bị phá rừng sau ngày 31/12/2020 và có tọa độ định vị GPS."
                }
            ]
            for idx, q in enumerate(q2_list, 1):
                q_obj = HRAssessmentQuestion(
                    assessment_id=quiz2.id,
                    question_type="single_choice",
                    question_text=q["question_text"],
                    category_tag=q["category_tag"],
                    options_json=json.dumps(q["options"], ensure_ascii=False),
                    correct_answers_json=json.dumps(q["correct"], ensure_ascii=False),
                    points=q["points"],
                    explanation=q["explanation"],
                    order_index=idx
                )
                db.add(q_obj)
                
            # Đề thi 3: đánh giá a (Khớp hình ảnh mockup)
            quiz3 = HRAssessment(
                assessment_code="quiz6",
                title="đánh giá a",
                description="Bộ đề đánh giá kỹ năng chuyên môn và hiểu biết quy trình SOP thực tế tại các chuyền sản xuất.",
                category="Chung",
                target_positions_json=json.dumps(["Phòng QLCL", "Chuyền Mộc 1", "Tổ Sơn PU", "Tổ Đóng gói", "QA", "QC"], ensure_ascii=False),
                duration_minutes=45,
                total_questions=5,
                pass_percentage=60.0,
                shuffle_questions=True,
                shuffle_options=True,
                status="active"
            )
            db.add(quiz3)
            db.flush()
            
            for idx, q in enumerate(q1_list, 1):
                q_obj = HRAssessmentQuestion(
                    assessment_id=quiz3.id,
                    question_type="single_choice",
                    question_text=q["question_text"],
                    category_tag=q["category_tag"],
                    options_json=json.dumps(q["options"], ensure_ascii=False),
                    correct_answers_json=json.dumps(q["correct"], ensure_ascii=False),
                    points=q["points"],
                    explanation=q["explanation"],
                    order_index=idx
                )
                db.add(q_obj)
                
            db.commit()
            print("[SEED] Đã tạo thành công 3 bộ đề thi mẫu!")
    except Exception as e:
        db.rollback()
        print(f"[SEED] Lỗi seed dữ liệu bài kiểm tra: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_assessments_data()

